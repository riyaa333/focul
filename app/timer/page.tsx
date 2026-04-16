'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

type Phase = 'briefing' | 'running' | 'debrief' | 'processing' | 'done'

const QUOTES = [
  "The secret of getting ahead is getting started.",
  "Focus on being productive instead of busy.",
  "One thing at a time. That's enough.",
  "Do the hard thing first.",
  "Progress, not perfection.",
  "Ship it. Iterate. Repeat.",
  "Clarity comes from action, not thought.",
  "The work is the way.",
  "Small steps. Big momentum.",
  "Execution eats strategy for breakfast.",
  "Build something people want, one sprint at a time.",
  "The best time to start was yesterday. The next best time is now.",
  "Momentum is a choice.",
  "Done is better than perfect.",
  "Make it work. Make it right. Make it fast.",
  "Every expert was once a beginner who kept going.",
  "Your future self will thank you for this sprint.",
  "Less talk. More ship.",
  "Constraints breed creativity.",
  "Stay in the zone.",
]

function TimerContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const durationMinutes = parseInt(searchParams.get('duration') || '15')
  const totalSeconds = searchParams.get('seconds')
    ? parseInt(searchParams.get('seconds')!)
    : durationMinutes * 60

  const [phase, setPhase] = useState<Phase>('running')
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds)
  const [tasks, setTasks] = useState<string[]>([])
  const [briefingTasks, setBriefingTasks] = useState<string[]>([])
  const [transcript, setTranscript] = useState('')
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [error, setError] = useState('')
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)])
  const [entered, setEntered] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  function playAlarm() {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      // Three rising tones — pleasant bell chime
      ;[523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = freq
        const t = ctx.currentTime + i * 0.22
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.35, t + 0.04)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.6)
        osc.start(t)
        osc.stop(t + 1.6)
      })
    } catch { /* audio unavailable */ }
  }

  useEffect(() => {
    // Trigger entrance animation on mount
    const raf = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    async function loadBriefing() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('sessions')
        .select('tasks')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (data?.tasks) setBriefingTasks(data.tasks)
    }
    loadBriefing()
  }, [router])

  useEffect(() => {
    if (phase !== 'running') return

    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current!)
          playAlarm()
          setPhase('debrief')
          return 0
        }
        return s - 1
      })
    }, 1000)

    return () => clearInterval(intervalRef.current!)
  }, [phase])

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const progress = 1 - secondsLeft / totalSeconds

  async function startRecording() {
    setError('')
    try {
      // Request highest quality audio for better transcription
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
          channelCount: 1,
        }
      })

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'

      // Higher bitrate = better transcription accuracy
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      })
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.start(250)
      mediaRecorderRef.current = mediaRecorder
      setRecording(true)
      setRecordingSeconds(0)

      recordingIntervalRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1)
      }, 1000)
    } catch {
      setError('Could not access microphone. Check permissions.')
    }
  }

  async function stopRecording() {
    const mr = mediaRecorderRef.current
    if (!mr) return

    clearInterval(recordingIntervalRef.current!)
    setRecording(false)

    await new Promise<void>(resolve => {
      mr.onstop = () => resolve()
      mr.stop()
    })

    mr.stream.getTracks().forEach(t => t.stop())
    setPhase('processing')

    const ext = mr.mimeType.includes('mp4') ? 'mp4' : 'webm'
    const blob = new Blob(chunksRef.current, { type: mr.mimeType })
    const formData = new FormData()
    formData.append('audio', blob, `debrief.${ext}`)

    try {
      const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
      setTranscript(data.transcript || '')
      setTasks(data.tasks || [])
      await saveSession(data.transcript || '', data.tasks || [])
      setPhase('done')
    } catch (err) {
      setError(`Failed: ${err instanceof Error ? err.message : 'Try again'}`)
      setPhase('debrief')
    }
  }

  async function saveSession(t: string, tasks: string[]) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: session } = await supabase.from('sessions').insert({
      user_id: user.id,
      duration_minutes: durationMinutes,
      transcript: t,
      tasks,
    }).select().single()

    // Auto-add extracted tasks to the todo list
    if (tasks.length > 0) {
      await supabase.from('todos').insert(
        tasks.map(text => ({
          user_id: user.id,
          text,
          completed: false,
          source_session_id: session?.id ?? null,
        }))
      )
    }
  }

  function resetTimer() {
    setPhase('briefing')
    setSecondsLeft(totalSeconds)
    setBriefingTasks(tasks)
    setTasks([])
    setTranscript('')
    setRecordingSeconds(0)
    setError('')
  }

  return (
    <div className="min-h-screen bg-[#f9fdf6] flex flex-col" style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      opacity: entered ? 1 : 0,
      transform: entered ? 'scale(1)' : 'scale(0.96)',
      transition: 'opacity 0.45s cubic-bezier(0.4,0,0.2,1), transform 0.45s cubic-bezier(0.4,0,0.2,1)',
      willChange: 'opacity, transform',
    }}>

      {/* Nav */}
      <nav className="flex items-center px-10 py-5">
        <button onClick={() => {
          setEntered(false)
          setTimeout(() => router.push('/dashboard'), 380)
        }} className="text-xs text-[#b0c8b4] hover:text-[#1a3020] transition-colors">
          ← back
        </button>
      </nav>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">

        {/* BRIEFING */}
        {phase === 'briefing' && (
          <div className="w-full max-w-sm text-center">
            {briefingTasks.length > 0 ? (
              <>
                <p className="text-xs text-[#b0c8b4] uppercase tracking-widest mb-8">From your last session</p>
                <div className="text-left space-y-3 mb-12">
                  {briefingTasks.map((t, i) => (
                    <p key={i} className="text-sm text-[#4a7055] flex items-start gap-3">
                      <span className="text-[#3a9e52] shrink-0 mt-0.5">→</span>{t}
                    </p>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-3xl font-semibold text-[#1a3020] mb-2 tracking-tight">Ready.</p>
                <p className="text-sm text-[#b0c8b4] mb-12">Your first session. Let&apos;s go.</p>
              </>
            )}
            <button
              onClick={() => { setSecondsLeft(totalSeconds); setPhase('running') }}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #2d8a44, #4db864)', boxShadow: '0 4px 16px rgba(58,158,82,0.3)' }}
            >
              Start {durationMinutes} min session →
            </button>
          </div>
        )}

        {/* RUNNING */}
        {phase === 'running' && (
          <div className="text-center select-none w-full max-w-sm">
            <div className="font-black leading-none tabular-nums mb-4"
              style={{ fontSize: 'clamp(72px, 18vw, 112px)', letterSpacing: '-6px' }}>
              <span className="text-[#1a3020]">{String(minutes).padStart(2, '0')}</span>
              <span className="text-[#d0e8d0]">:{String(seconds).padStart(2, '0')}</span>
            </div>

            <div className="w-48 mx-auto mb-3">
              <div className="h-0.5 bg-[#e8f5e8] rounded-full overflow-hidden">
                <div className="h-full bg-[#3a9e52] rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
            <p className="text-xs text-[#c0d4c0] tracking-widest uppercase mb-4">focusing</p>
            <p className="text-xs text-[#b0c8b4] italic mb-10 max-w-[240px] mx-auto leading-relaxed">&ldquo;{quote}&rdquo;</p>

            {briefingTasks.length > 0 && (
              <div className="border-t border-[#eaf5e4] pt-6">
                <p className="text-xs text-[#c0d4c0] uppercase tracking-widest mb-4">Working on</p>
                <div className="space-y-2.5 text-left">
                  {briefingTasks.map((task, i) => (
                    <p key={i} className="text-sm text-[#5a8060] flex items-start gap-2.5">
                      <span className="text-[#3a9e52] shrink-0 mt-0.5">→</span>{task}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* DEBRIEF */}
        {phase === 'debrief' && (
          <div className="w-full max-w-sm text-center">
            <p className="text-3xl mb-6">🔔</p>
            <h2 className="text-2xl font-semibold text-[#1a3020] mb-2 tracking-tight">Time&apos;s up.</h2>
            <p className="text-sm text-[#a8c4a8] mb-8">What did you do. What&apos;s next.</p>

            {error && <p className="text-red-400 text-xs mb-6">{error}</p>}

            {!recording ? (
              <button
                onClick={startRecording}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #2d8a44, #4db864)', boxShadow: '0 4px 16px rgba(58,158,82,0.3)' }}
              >
                Start speaking →
              </button>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-[#1a3020] tabular-nums">
                    {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}
                  </span>
                </div>
                <button
                  onClick={stopRecording}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold text-white bg-red-400 hover:bg-red-500 transition-colors"
                >
                  Done speaking
                </button>
              </div>
            )}
          </div>
        )}

        {/* PROCESSING */}
        {phase === 'processing' && (
          <div className="text-center">
            <div className="text-3xl mb-6 animate-pulse">✦</div>
            <p className="text-base font-medium text-[#1a3020]">Extracting your tasks...</p>
            <p className="text-xs text-[#b0c8b4] mt-2">Just a moment</p>
          </div>
        )}

        {/* DONE */}
        {phase === 'done' && (
          <div className="w-full max-w-sm text-center">
            <p className="text-xs text-[#b0c8b4] uppercase tracking-widest mb-8">Next session starts with</p>
            <div className="text-left space-y-3 mb-10">
              {tasks.length > 0 ? tasks.map((task, i) => (
                <p key={i} className="text-sm text-[#4a7055] flex items-start gap-3">
                  <span className="text-[#3a9e52] shrink-0 font-semibold">{i + 1}.</span>{task}
                </p>
              )) : (
                <p className="text-sm text-[#b0c8b4] text-center">No tasks extracted. Try again next time.</p>
              )}
            </div>
            {transcript && (
              <details className="text-left mb-8">
                <summary className="text-xs text-[#b0c8b4] cursor-pointer">View transcript</summary>
                <p className="text-xs text-[#a8c4a8] mt-2 leading-relaxed">{transcript}</p>
              </details>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={resetTimer}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #2d8a44, #4db864)', boxShadow: '0 4px 16px rgba(58,158,82,0.25)' }}
              >
                Next session →
              </button>
              <button
                onClick={() => {
                  setEntered(false)
                  setTimeout(() => router.push('/dashboard'), 380)
                }}
                className="px-6 py-3 rounded-full text-sm text-[#b0c8b4] hover:text-[#1a3020] transition-colors"
              >
                Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TimerPage() {
  return (
    <Suspense>
      <TimerContent />
    </Suspense>
  )
}
