import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 })
    }

    // --- Step 1: Transcribe with Groq Whisper (free, fast) ---
    const groqForm = new FormData()
    groqForm.append('file', audioFile, audioFile.name || 'debrief.webm')
    groqForm.append('model', 'whisper-large-v3')
    groqForm.append('response_format', 'json')
    groqForm.append('language', 'en')
    groqForm.append('prompt', 'Founder debrief. Topics: product, startup, investors, MVP, sprint, users, revenue, growth, landing page, onboarding, feedback, metrics, API, deployment, design, marketing, sales, fundraising, pitch deck, YC, demo.')

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: groqForm,
    })

    if (!groqRes.ok) {
      const err = await groqRes.text()
      throw new Error(`Transcription failed: ${err}`)
    }

    const { text: transcript } = await groqRes.json()

    if (!transcript?.trim()) {
      return NextResponse.json({ transcript: '', tasks: [] })
    }

    // --- Step 2: Claude corrects transcript + extracts tasks in one shot ---
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `This is a raw voice transcription from a founder's work debrief. It may contain speech-to-text errors — for example "spring" instead of "sprint", "landing" instead of "landing page", proper nouns misheard, etc.

1. Fix any transcription errors using startup/founder context
2. Extract 2-3 concrete next action tasks (under 10 words each)

Return ONLY valid JSON, no markdown:
{"transcript": "corrected transcript here", "tasks": ["task 1", "task 2", "task 3"]}

Raw transcription: "${transcript}"`,
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
        result = JSON.parse(cleaned)
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
