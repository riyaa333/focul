import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 })
    }

    // --- Step 1: Transcribe with Groq Whisper large-v3 ---
    const groqForm = new FormData()
    groqForm.append('file', audioFile, audioFile.name || 'debrief.webm')
    groqForm.append('model', 'whisper-large-v3')
    // verbose_json gives us word-level segments + confidence to filter noise
    groqForm.append('response_format', 'verbose_json')
    groqForm.append('language', 'en')
    // temperature 0 = deterministic, no random guesses on uncertain words
    groqForm.append('temperature', '0')
    // Prompt primes Whisper with domain vocabulary so it picks right words
    groqForm.append('prompt', 'Founder productivity debrief. Technical terms: sprint, MVP, API, deployment, Supabase, Vercel, GitHub, landing page, onboarding, churn, MRR, ARR, CAC, LTV, YC, pitch deck, investor, co-founder, product-market fit, user research, A/B test, conversion rate, retention, waitlist, Figma, TypeScript, Next.js, Electron.')

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

    // Filter out low-confidence segments and segments with no speech
    // verbose_json gives us segments with avg_logprob (confidence score)
    let transcript = ''
    if (groqData.segments && groqData.segments.length > 0) {
      transcript = groqData.segments
        .filter((seg: { avg_logprob: number; no_speech_prob: number; text: string }) => {
          // avg_logprob > -1.0 = decent confidence (Whisper's internal scoring)
          // no_speech_prob < 0.5 = actual speech detected, not silence/noise
          return seg.avg_logprob > -1.0 && seg.no_speech_prob < 0.5
        })
        .map((seg: { text: string }) => seg.text.trim())
        .join(' ')
        .trim()
    } else {
      // Fallback to raw text if no segments
      transcript = groqData.text || ''
    }

    if (!transcript?.trim()) {
      return NextResponse.json({ transcript: '', tasks: [] })
    }

    // --- Step 2: Claude cleans transcript + extracts tasks ---
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: `You are processing a voice memo from a founder's work session debrief. The transcript below came from Whisper speech-to-text and may have errors.

Your job:
1. Fix any speech-to-text errors using startup/founder context clues. Common mistakes: "spring" → "sprint", "landing" → "landing page", "API" misheard, names of tools misheard (Supabase, Vercel, Figma, etc.), numbers misheard
2. Remove filler words (um, uh, like, you know) and false starts
3. Extract 2-4 concrete next action tasks — specific, actionable, under 10 words each
4. Tasks should be things the person explicitly said they will do next, not summaries of what they did

Return ONLY valid JSON, no markdown fences:
{"transcript": "cleaned transcript here", "tasks": ["task 1", "task 2", "task 3"]}

Raw transcript: "${transcript}"`,
        },
      ],
    })

    const content = message.content[0]
    let result: { transcript: string; tasks: string[] } = { transcript, tasks: [] }

    if (content.type === 'text') {
      try {
        result = JSON.parse(content.text)
      } catch {
        const cleaned = content.text.replace(/```json?|```/g, '').trim()
        try {
          result = JSON.parse(cleaned)
        } catch {
          // If JSON parsing fails entirely, return raw transcript
          result = { transcript, tasks: [] }
        }
      }
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('Transcribe error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Processing failed' },
      { status: 500 }
    )
  }
}
