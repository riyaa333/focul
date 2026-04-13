'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

type Phase = 'briefing' | 'running' | 'debrief' | 'processing' | 'done'

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
}
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance
    webkitSpeechRecognition: new () => SpeechRecognitionInstance
  }
}

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
  const [liveTranscript, setLiveTranscript] = useState('')
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [error, setError] = useState('')

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalTranscriptRef = useRef('')

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
  const circumference = 2 * Math.PI * 90

  function startRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Speech recognition not supported. Use Chrome or Edge.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    finalTranscriptRef.current = ''

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += text + ' '
        } else {
          interim += text
        }
      }
      finalTranscriptRef.current += final
      setLiveTranscript(finalTranscriptRef.current + interim)
    }

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech') {
        setError(`Mic error: ${event.error}`)
      }
    }

    recognition.start()
    recognitionRef.current = recognition
    setRecording(true)
    setLiveTranscript('')

    recordingIntervalRef.current = setInterval(() => {
      setRecordingSeconds(s => s + 1)
    }, 1000)
  }

  async function stopRecording() {
    recognitionRef.current?.stop()
    clearInterval(recordingIntervalRef.current!)
    setRecording(false)
    setPhase('processing')

    const finalText = finalTranscriptRef.current.trim() || liveTranscript.trim()
    setTranscript(finalText)
    await extractTasks(finalText)
  }

  async function extractTasks(text: string) {
    try {
      const res = await fetch('/api/extract-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || `API error ${res.status}`)
      }
      setTasks(data.tasks || [])
      await saveSession(text, data.tasks || [])
      setPhase('done')
    } catch (err) {
      setError(`Task extraction failed: ${err instanceof Error ? err.message : 'Check your Anthropic API key.'}`)
      setPhase('debrief')
    }
  }

  async function saveSession(transcript: string, tasks: string[]) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('sessions').insert({
      user_id: user.id,
      duration_minutes: durationMinutes,
      transcript,
      tasks,
    })
  }

  function resetTimer() {
    setPhase('briefing')
    setSecondsLeft(totalSeconds)
    setBriefingTasks(tasks)
    setTasks([])
    setTranscript('')
    setLiveTranscript('')
    setRecordingSeconds(0)
    setError('')
  }

  return (
    <div className="min-h-screen bg-[#f9fdf6] flex flex-col" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Nav */}
      <nav className="flex items-center px-10 py-5">
        <button onClick={() => router.push('/dashboard')} className="text-xs text-[#b0c8b4] hover:text-[#1a3020] transition-colors">
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
            {/* Timer */}
            <div className="flex items-center gap-3 justify-center mb-3">
              <span className="tabular-nums font-black text-[#1a3020] tracking-tight leading-none"
                style={{ fontSize: 'clamp(72px, 16vw, 120px)', letterSpacing: '-2px' }}>
                {String(minutes).padStart(2, '0')}
              </span>
              <span className="font-black text-[#a8c4a8] leading-none" style={{ fontSize: 'clamp(36px, 7vw, 60px)', marginBottom: '4px' }}>:</span>
              <span className="tabular-nums font-black text-[#1a3020] tracking-tight leading-none"
                style={{ fontSize: 'clamp(72px, 16vw, 120px)', letterSpacing: '-2px' }}>
                {String(seconds).padStart(2, '0')}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-48 mx-auto mb-2">
              <div className="h-0.5 bg-[#eaf5e4] rounded-full overflow-hidden">
                <div className="h-full bg-[#3a9e52] rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
            <p className="text-xs text-[#c0d4c0] tracking-widest uppercase mb-10">focusing</p>

            {/* Tasks */}
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
            <p className="text-sm text-[#a8c4a8] mb-10">What did you do. What&apos;s next.</p>

            {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

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
                {liveTranscript && (
                  <p className="text-xs text-[#8aaa8a] leading-relaxed max-h-24 overflow-y-auto text-left">
                    {liveTranscript}
                  </p>
                )}
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
                onClick={() => router.push('/dashboard')}
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
