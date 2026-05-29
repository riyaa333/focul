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

PART 2 — Extract next tasks:
- Extract 2–4 specific, actionable next tasks the founder explicitly mentioned
- Tasks should be things they WILL do next, not things they already did
- Keep each task under 10 words, start with a verb (e.g. "Fix", "Build", "Write", "Deploy", "Email")
- If they didn't mention next steps, infer 1–2 logical follow-ups from what they described
- Do NOT fabricate tasks unrelated to what was said

Examples of good tasks: "Fix the login redirect bug", "Email the three investor leads", "Deploy new onboarding flow"
Examples of bad tasks: "Continue working", "Do more stuff", "Keep going"

Return ONLY valid JSON (no markdown, no explanation):
{"transcript": "cleaned transcript", "tasks": ["task 1", "task 2"]}

Raw Whisper transcript:
"${transcript}"`,
        },
      ],
    })

    const content = message.content[0]
    let result: { transcript: string; tasks: string[] } = { transcript, tasks: [] }

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
            result = { transcript, tasks: [] }
          }
        }
      }
    }

    // Sanitise: ensure tasks is always an array of strings
    if (!Array.isArray(result.tasks)) result.tasks = []
    result.tasks = result.tasks.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)

    return NextResponse.json(result)
  } catch (err) {
    console.error('Transcribe error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Processing failed' },
      { status: 500 }
    )
  }
}
