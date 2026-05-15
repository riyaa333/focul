import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type SessionInput = {
  transcript?: string | null
  tasks?: string[] | null
  duration_minutes?: number | null
  created_at?: string | null
}

type TodoInput = {
  text: string
  completed: boolean
}

type CoachState = 'pattern' | 'flow' | 'empty'

type CoachResponse = {
  state: CoachState
  tag: string
  message: string
  suggestion: string
  suggested_minutes: number
}

function emptyResponse(): CoachResponse {
  return {
    state: 'empty',
    tag: 'Warming up',
    message: "I'll start suggesting what to focus on after a couple of sessions. For now, pick whatever's biggest on your mind.",
    suggestion: 'Tell me what you\'re working on',
    suggested_minutes: 25,
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sessions, todos } = (await req.json()) as {
      sessions?: SessionInput[]
      todos?: TodoInput[]
    }

    const recent = (sessions || []).slice(0, 5)
    if (recent.length === 0) {
      return NextResponse.json(emptyResponse())
    }

    const openTodos = (todos || []).filter(t => !t.completed).map(t => t.text)

    const sessionSummary = recent.map((s, i) => {
      const when = s.created_at ? new Date(s.created_at).toISOString().slice(0, 16).replace('T', ' ') : 'unknown'
      const tasks = (s.tasks || []).join(' | ') || '(no tasks extracted)'
      const excerpt = (s.transcript || '').slice(0, 400)
      return `Session ${i + 1} (${when}, ${s.duration_minutes ?? '?'}min)\n  tasks: ${tasks}\n  debrief: ${excerpt}`
    }).join('\n\n')

    const prompt = `You are Focul's Focus Coach. Analyse a founder's recent focus sessions and suggest what they should work on next. Tone: calm, founder-to-founder, never naggy.

Pick ONE of these states:
- "pattern": same unfinished thing keeps coming up across sessions (highest priority signal)
- "flow": last session sounded productive, ended mid-task — protect momentum
- "empty": not enough signal to suggest anything specific

Then return STRICT JSON, no markdown, no prose, matching this shape exactly:
{"state":"pattern|flow|empty","tag":"Pattern|In flow|Warming up","message":"<one short sentence to the user>","suggestion":"<short task name, under 10 words>","suggested_minutes":<15|25|45>}

Rules:
- "message" speaks directly to the user ("You've mentioned ..." or "You crushed the last sprint on ...")
- "suggestion" is the concrete task to put on the timer
- 15min for quick wins, 25min default, 45min for deep work
- If state is "empty", suggestion can be generic encouragement

Recent sessions (newest first):
${sessionSummary}

Open todos: ${openTodos.length > 0 ? openTodos.join(' | ') : '(none)'}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json(emptyResponse())
    }

    const cleaned = content.text.replace(/```json?|```/g, '').trim()
    const parsed = JSON.parse(cleaned) as CoachResponse

    if (!['pattern', 'flow', 'empty'].includes(parsed.state)) parsed.state = 'pattern'
    if (![15, 25, 45].includes(parsed.suggested_minutes)) parsed.suggested_minutes = 25

    return NextResponse.json(parsed)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('coach error:', msg)
    return NextResponse.json(emptyResponse())
  }
}
