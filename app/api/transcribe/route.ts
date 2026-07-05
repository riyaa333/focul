import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File
    // Session context: task names/project names the user was working on this session.
    // Injected by the frontend so Whisper and Claude know the relevant vocabulary.
    const sessionContext = (formData.get('context') as string | null) || ''

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 })
    }

    // ─── Step 1: Transcribe with Groq Whisper large-v3 ───────────────────────
    const groqForm = new FormData()
    groqForm.append('file', audioFile, audioFile.name || 'debrief.webm')
    groqForm.append('model', 'whisper-large-v3')
    groqForm.append('response_format', 'verbose_json')
    groqForm.append('language', 'en')
    // temperature 0 = fully deterministic — no hallucinated "guesses" on unclear audio
    groqForm.append('temperature', '0')
    // Priming prompt: Whisper uses this to bias its vocabulary predictions before
    // it even starts transcribing. Wispr Flow's personal dictionary works the same way —
    // user-specific vocabulary gets injected here so ASR picks the right words first time.
    //
    // IMPORTANT: Groq Whisper caps `prompt` at 224 tokens ≈ 896 characters. Keep the
    // static base lean so there's room for the per-session context. We cap defensively
    // at MAX_PROMPT_CHARS below and trim sessionContext (not the static base) if the
    // total would overflow — the static vocab matters most for transcription quality.
    const MAX_PROMPT_CHARS = 870

    // Core domain vocabulary: brand names + acronyms that Whisper mishears most often.
    // We dropped the long "common founder phrases" block — Whisper is already great at
    // common English; biasing toward "I worked on" doesn't measurably improve quality
    // and just eats prompt budget.
    const STATIC_PROMPT =
      'Founder work session voice debrief. Technical vocabulary: ' +
      'Supabase, Vercel, GitHub, Next.js, TypeScript, React, Tailwind, Electron, ' +
      'Stripe, Figma, Linear, Notion, Slack, ChatGPT, Claude, Cursor, Raycast. ' +
      'Startup terms: PR, MVP, API, REST, endpoint, sprint, deployment, onboarding, ' +
      'waitlist, dashboard, roadmap, backlog, churn, retention, conversion, A/B test. ' +
      'Fundraising: MRR, ARR, CAC, LTV, runway, burn rate, seed round, Series A, ' +
      'Y Combinator, pitch deck, product-market fit, PMF, go-to-market, GTM. ' +
      'App name: Focul.'

    const ctxPrefix = ' This session the founder was working on: '
    const ctxSuffix = '.'
    const ctxBudget = MAX_PROMPT_CHARS - STATIC_PROMPT.length - ctxPrefix.length - ctxSuffix.length

    let trimmedContext = ''
    if (sessionContext && ctxBudget > 20) {
      trimmedContext = sessionContext.length <= ctxBudget
        ? sessionContext
        : sessionContext.slice(0, ctxBudget - 1).trimEnd() + '…'
    }

    const whisperPrompt =
      STATIC_PROMPT + (trimmedContext ? ctxPrefix + trimmedContext + ctxSuffix : '')

    // Belt-and-braces: defensive final cap even if the math above is ever off by one
    groqForm.append('prompt', whisperPrompt.slice(0, MAX_PROMPT_CHARS))

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: groqForm,
    })

    if (!groqRes.ok) {
      const err = await groqRes.text()
      throw new Error(`Transcription failed: ${err}`)
    }

    const groqData = await groqRes.json()

    // Filter out low-confidence and silence segments.
    // avg_logprob: Whisper's internal log-probability confidence. Closer to 0 = more confident.
    //   > -0.8  keeps only well-recognised speech (stricter than the old -1.0)
    // no_speech_prob: probability the segment is silence/noise, not speech.
    //   < 0.4  rejects segments that are mostly background noise
    let transcript = ''
    if (groqData.segments && groqData.segments.length > 0) {
      transcript = groqData.segments
        .filter((seg: { avg_logprob: number; no_speech_prob: number; text: string }) =>
          seg.avg_logprob > -0.8 && seg.no_speech_prob < 0.4
        )
        .map((seg: { text: string }) => seg.text.trim())
        .join(' ')
        .trim()

      // If strict filtering removed everything, fall back to looser threshold
      if (!transcript) {
        transcript = groqData.segments
          .filter((seg: { avg_logprob: number; no_speech_prob: number }) =>
            seg.avg_logprob > -1.2 && seg.no_speech_prob < 0.6
          )
          .map((seg: { text: string }) => seg.text.trim())
          .join(' ')
          .trim()
      }
    }

    // Final fallback to raw text
    if (!transcript) {
      transcript = groqData.text || ''
    }

    if (!transcript?.trim()) {
      return NextResponse.json({ transcript: '', tasks: [] })
    }

    // ─── Step 2: Claude Sonnet cleans transcript + extracts tasks ─────────────
    // Using Sonnet (not Haiku) — the cleanup step needs real language understanding
    // to correctly infer misheard words from context.
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 800,
      system:
        'You are an expert assistant processing voice memos from startup founders. ' +
        'You understand startup terminology, technical vocabulary, and how founders speak. ' +
        'Your corrections must be grounded in what was actually said — never invent tasks or content.',
      messages: [
        {
          role: 'user',
          content: `A founder just finished a work session and recorded a voice debrief. The audio was transcribed by Whisper and may contain speech-to-text errors.
${sessionContext ? `\nThis session they were working on: "${sessionContext}". Use this to correct any misheard project names, technical terms, or task names in the transcript.\n` : ''}
Your job has two parts:

PART 1 — Fix the transcript:
- Correct misheard words using context (e.g. "spring" → "sprint", "supa base" → "Supabase", "next JS" → "Next.js", "ver cell" → "Vercel", "fig ma" → "Figma")
- Fix proper nouns for tools: Supabase, Vercel, GitHub, Figma, Linear, Notion, Stripe, TypeScript, Next.js, Tailwind, Electron
- Remove filler words: um, uh, like, you know, sort of, kind of, right, so yeah
- Remove false starts and repeated phrases (e.g. "I worked on I worked on the" → "I worked on the")
- Keep the meaning and tone exactly — don't paraphrase or add information
- If a word is unclear but could make sense in context, use your best judgement

PART 2 — Extract next tasks (extract at the OUTCOME level, not the sentence level):

A "task" is ONE OUTCOME the founder cares about — not one sentence they said.
Founders pause mid-thought, restart, and describe sub-steps as if they were
separate tasks. They aren't. Your job is to identify the underlying outcomes
and merge sub-steps under them.

If two adjacent statements are steps toward the same outcome, merge them into
ONE task at the outcome level. Pauses or filler in speech are NOT boundaries
between ideas.

Heuristic: would the founder feel "done with this thing" after checking off
just one of the steps? If no, it's not a real task on its own — merge it
into the parent outcome.

Rules:
- Output 2–3 tasks (4 max, only if they genuinely described 4 different outcomes)
- Each task names the OUTCOME, not a single step
- Start with a verb, under 10 words
- Things they already finished go in 'wins' (Part 3), NOT in 'tasks'
- Don't fabricate. If they didn't mention next steps, infer 1–2 logical follow-ups
  from what they described
- Split into separate tasks only when they explicitly signal it ("two things",
  "and then a separate thing", "different project"), otherwise prefer merging

Examples:

Founder says: "Fix up the Focul app, screen record it tonight, then upload to
LinkedIn, and write the post."
GOOD: ["Fix up the Focul app", "Ship the LinkedIn post"]
BAD:  ["Fix the app", "Record screen", "Upload to LinkedIn", "Write the post"]
(the last three are sub-steps of one outcome — "Ship the LinkedIn post")

Founder says: "I need to email Stripe about the webhook retry, and separately
review Sarah's PR before EOD."
GOOD: ["Email Stripe re: webhook retry", "Review Sarah's PR"]
(two genuinely different outcomes — "separately" is the signal)

Founder says: "I want to redo the onboarding flow — pick the copy, design the
screens, build it, and ship it by Friday."
GOOD: ["Ship the new onboarding flow by Friday"]
BAD:  ["Pick copy", "Design screens", "Build onboarding", "Ship onboarding"]
(one outcome, four sub-steps)

Other examples of bad tasks: "Continue working", "Do more stuff", "Keep going"

PART 3 — Extract wins (what they actually finished this session):

A "win" is ONE thing the founder explicitly said they FINISHED during this
session. Past-tense, concrete, under 8 words.

Rules:
- Past-tense verb: "Shipped X", "Fixed Y", "Emailed Z", "Reviewed W", "Drafted V"
- Must be a concrete outcome, not vague effort. "Fixed the auth bug" is a win;
  "worked on auth" is NOT — that's effort without an outcome
- Don't fabricate. If they said "I worked on" without describing what got
  done, that's not a win, return []
- Wins are NOT the same as tasks. Wins = past (what got done). Tasks = future
  (what's next)
- Output 0–4 wins. Empty array is fine if they only talked about future work

Examples:

Founder says: "I shipped the webhook retry and emailed Stripe. Still need to
review Sarah's PR before EOD."
GOOD wins:  ["Shipped the webhook retry", "Emailed Stripe"]
GOOD tasks: ["Review Sarah's PR"]

Founder says: "I just worked on the onboarding flow."
GOOD wins:  []  (no outcome described — "worked on" is effort, not a win)
GOOD tasks: ["Ship the onboarding flow"]  (logical inferred next step)

Founder says: "Fixed the Focul timer, redesigned the debrief screen, and need
to record the LinkedIn demo tonight."
GOOD wins:  ["Fixed the Focul timer", "Redesigned the debrief screen"]
GOOD tasks: ["Ship the LinkedIn demo"]

Return ONLY valid JSON (no markdown, no explanation):
{"transcript": "cleaned transcript", "wins": ["win 1", "win 2"], "tasks": ["task 1", "task 2"]}

Raw Whisper transcript:
"${transcript}"`,
        },
      ],
    })

    const content = message.content[0]
    let result: { transcript: string; tasks: string[]; wins: string[] } = { transcript, tasks: [], wins: [] }

    if (content.type === 'text') {
      // Strip any accidental markdown fences
      const cleaned = content.text.replace(/```json?\n?|```/g, '').trim()
      try {
        result = JSON.parse(cleaned)
      } catch {
        // JSON parse failed — try to extract JSON substring
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            result = JSON.parse(jsonMatch[0])
          } catch {
            // All parsing failed — return raw transcript, no tasks lost
            result = { transcript, tasks: [], wins: [] }
          }
        }
      }
    }

    // Sanitise: every array field is always an array of non-empty strings
    if (!Array.isArray(result.tasks)) result.tasks = []
    if (!Array.isArray(result.wins))  result.wins  = []
    result.tasks = result.tasks.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    result.wins  = result.wins .filter((w): w is string => typeof w === 'string' && w.trim().length > 0)

    // ─── Step 3: Fable reflection — a warm one-liner the founder sees ────────
    // Wrapped in its own try so a Fable failure never breaks the debrief.
    let reflection = ''
    try {
      const fable = await anthropic.messages.create({
        model: 'claude-fable-5',
        max_tokens: 120,
        system:
          "You are the voice of Focul, a focus timer for founders. Your job is a single warm sentence that reflects on the session the founder just finished. " +
          "Tone: quiet, dry, human — a friend who respects them. Never saccharine, never generic, never lecture. Never use exclamation marks. " +
          "You are speaking TO them (\"you shipped…\"), not about them.",
        messages: [
          {
            role: 'user',
            content:
              `The founder just finished a work session and recorded a voice debrief.\n\n` +
              (result.wins.length ? `What they got done:\n${result.wins.map(w => `- ${w}`).join('\n')}\n\n` : `They didn't call out specific wins.\n\n`) +
              (result.tasks.length ? `What's next:\n${result.tasks.map(t => `- ${t}`).join('\n')}\n\n` : '') +
              `Debrief transcript:\n"${result.transcript || transcript}"\n\n` +
              `Write ONE sentence (two max, prefer one) reflecting on this session. Examples of the exact tone:\n` +
              `- "Solid session — you shipped the tricky part and the rest is momentum."\n` +
              `- "You bailed the leaks. Now go build."\n` +
              `- "You mapped the terrain. Tomorrow's session is where the miles happen."\n` +
              `- "That was the hardest part. The rest wants to be shipped."\n\n` +
              `Return ONLY the sentence. No quotes, no attribution, no analysis.`,
          },
        ],
      })
      const fableContent = fable.content[0]
      if (fableContent.type === 'text') {
        reflection = fableContent.text.trim().replace(/^["']|["']$/g, '').trim()
      }
    } catch (err) {
      console.warn('Fable reflection failed (non-fatal):', err instanceof Error ? err.message : err)
    }

    return NextResponse.json({ ...result, reflection })
  } catch (err) {
    console.error('Transcribe error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Processing failed' },
      { status: 500 }
    )
  }
}
