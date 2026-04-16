import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { transcript } = await req.json()

    if (!transcript?.trim()) {
      return NextResponse.json({ tasks: [] })
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Extract 2-3 concrete next tasks from this voice debrief. Return ONLY a JSON array of short task strings (under 10 words each). No explanation. No markdown.

Debrief: "${transcript}"`,
        },
      ],
    })

    const content = message.content[0]
    let tasks: string[] = []

    if (content.type === 'text') {
      const cleaned = content.text.replace(/```json?|```/g, '').trim()
      tasks = JSON.parse(cleaned)
    }

    return NextResponse.json({ tasks })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('extract-tasks error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
