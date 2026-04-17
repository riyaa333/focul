'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

type Phase = 'briefing' | 'input' | 'running' | 'debrief' | 'processing' | 'accountability' | 'done'
type AccountabilityItem = { text: string; completed: boolean }

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
  const mode = (searchParams.get('mode') || 'focus') as 'focus' | 'accountability'

  const [phase, setPhase] = useState<Phase>(mode === 'accountability' ? 'input' : 'running')
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds)
  const [tasks, setTasks] = useState<string[]>([])
  const [briefingTasks, setBriefingTasks] = useState<string[]>([])
  const [transcript, setTranscript] = useState('')
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [error, setError] = useState('')
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)])
  const [entered, setEntered] = useState(false)
  const [accountabilityItems, setAccountabilityItems] = useState<AccountabilityItem[]>([])
  const [inputTask, setInputTask] = useState('')

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
          setPhase(mode === 'accountability' ? 'accountability' : 'debrief')
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

  function addAccountabilityItem() {
    if (!inputTask.trim()) return
    setAccountabilityItems(prev => [...prev, { text: inputTask.trim(), completed: false }])
    setInputTask('')
  }

  function toggleAccountabilityItem(index: number) {
    setAccountabilityItems(prev => prev.map((item, i) =>
      i === index ? { ...item, completed: !item.completed } : item
    ))
  }

  async function finishAccountability() {
    const completedTasks = accountabilityItems.filter(i => i.completed).map(i => i.text)
    const notCompleted = accountabilityItems.filter(i => !i.completed).map(i => i.text)
    const summary = [
      completedTasks.length > 0 ? `Completed: ${completedTasks.join(', ')}` : '',
      notCompleted.length > 0 ? `Not completed: ${notCompleted.join(', ')}` : '',
    ].filter(Boolean).join(' | ')
    await saveSession(summary, completedTasks)
    setTasks(completedTasks)
    setPhase('done')
  }

  function resetTimer() {
    setPhase(mode === 'accountability' ? 'input' : 'briefing')
    setSecondsLeft(totalSeconds)
    setBriefingTasks(tasks)
    setTasks([])
    setTranscript('')
    setRecordingSeconds(0)
    setError('')
    setAccountabilityItems([])
    setInputTask('')
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

        {/* INPUT (Accountability pre-timer) */}
        {phase === 'input' && (
          <div className="w-full max-w-sm">
            <p className="text-xs text-[#b0c8b4] uppercase tracking-widest mb-2 text-center">Accountability mode</p>
            <h2 className="text-2xl font-bold text-center text-[#1a3020] mb-1 tracking-tight">What will you do?</h2>
            <p className="text-sm text-[#a8c4a8] text-center mb-7">List your tasks for this session</p>

            {/* Task list */}
            <div className="space-y-2 mb-4">
              {accountabilityItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#e8f5e8] bg-white">
                  <span className="text-[#3a9e52] font-bold text-sm w-4 flex-shrink-0">{i + 1}.</span>
                  <span className="text-sm text-[#1a3020]">{item.text}</span>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="flex gap-2 mb-7">
              <input
                value={inputTask}
                onChange={e => setInputTask(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addAccountabilityItem() }}
                placeholder={accountabilityItems.length === 0 ? 'e.g. Finish the landing page copy' : 'Add another task...'}
                className="flex-1 text-sm border border-[#e0ede0] rounded-xl px-4 py-3 outline-none bg-white text-[#1a3020] placeholder-[#c0d4c0]"
                style={{ fontFamily: 'inherit' }}
                autoFocus
              />
              {inputTask.trim() && (
                <button onClick={addAccountabilityItem}
                  className="px-4 py-3 rounded-xl text-[#3a9e52] font-bold text-xl bg-[#f0f9f2] hover:bg-[#e4f5e8] transition-colors">
                  +
                </button>
              )}
            </div>

            {accountabilityItems.length > 0 && (
              <button
                onClick={() => { setSecondsLeft(totalSeconds); setPhase('running') }}
                className="w-full py-4 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #2d6aaa, #4a8fd4)', boxShadow: '0 4px 16px rgba(45,106,170,0.3)' }}
              >
                Start {durationMinutes} min session →
              </button>
            )}
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

            {(mode === 'accountability' ? accountabilityItems.length > 0 : briefingTasks.length > 0) && (
              <div className="border-t border-[#eaf5e4] pt-6">
                <p className="text-xs text-[#c0d4c0] uppercase tracking-widest mb-4">
                  {mode === 'accountability' ? 'This session' : 'Working on'}
                </p>
                <div className="space-y-2.5 text-left">
                  {mode === 'accountability'
                    ? accountabilityItems.map((item, i) => (
                        <p key={i} className="text-sm text-[#5a8060] flex items-start gap-2.5">
                          <span className="text-[#3a9e52] shrink-0 mt-0.5 font-bold">{i + 1}.</span>{item.text}
                        </p>
                      ))
                    : briefingTasks.map((task, i) => (
                        <p key={i} className="text-sm text-[#5a8060] flex items-start gap-2.5">
                          <span className="text-[#3a9e52] shrink-0 mt-0.5">→</span>{task}
                        </p>
                      ))
                  }
                </div>
              </div>
            )}
          </div>
        )}

        {/* DEBRIEF */}
        {phase === 'debrief' && (
          <div className="w-full max-w-xs text-center">
            {!recording ? (
              <>
                <p className="text-4xl mb-5">🔔</p>
                <h2 className="text-2xl font-bold text-[#1a3020] mb-2 tracking-tight">Time&apos;s up.</h2>
                <p className="text-sm text-[#a8c4a8] mb-10">What did you do. What&apos;s next.</p>
                {error && <p className="text-red-400 text-xs mb-6">{error}</p>}
                {/* Mic button */}
                <div className="flex flex-col items-center gap-6">
                  <button
                    onClick={startRecording}
                    className="relative flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                    style={{ width: 80, height: 80 }}
                  >
                    {/* Pulse ring */}
                    <span className="absolute inset-0 rounded-full bg-[#3a9e52] opacity-15" style={{ transform: 'scale(1.35)' }} />
                    {/* Button */}
                    <span className="relative flex items-center justify-center w-20 h-20 rounded-full"
                      style={{ background: 'linear-gradient(135deg, #2d8a44, #4db864)', boxShadow: '0 6px 24px rgba(58,158,82,0.35)' }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                        <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
                        <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        <line x1="8" y1="23" x2="16" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </span>
                  </button>
                  <p className="text-xs text-[#b0c8b4]">Tap to speak</p>
                </div>
              </>
            ) : (
              <>
                {/* Recording card */}
                <div className="rounded-2xl bg-white border border-[#e8f5e8] p-6 mb-5 shadow-sm">
                  {/* Recording indicator */}
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <span className="w-2 h-2 bg-[#3a9e52] rounded-full animate-pulse" />
                    <span className="text-xs font-semibold tracking-widest uppercase text-[#3a9e52]">
                      Recording — {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Mic button (active state) */}
                  <div className="flex justify-center mb-5">
                    <div className="relative flex items-center justify-center" style={{ width: 80, height: 80 }}>
                      <span className="absolute inset-0 rounded-full bg-[#3a9e52] opacity-15 animate-ping" style={{ animationDuration: '1.5s' }} />
                      <span className="relative flex items-center justify-center w-20 h-20 rounded-full"
                        style={{ background: 'linear-gradient(135deg, #2d8a44, #4db864)', boxShadow: '0 6px 24px rgba(58,158,82,0.35)' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                          <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
                          <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                          <line x1="8" y1="23" x2="16" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </span>
                    </div>
                  </div>

                  {/* Animated waveform */}
                  <div className="flex items-center justify-center gap-1 mb-5" style={{ height: 36 }}>
                    {[0.4, 0.7, 1, 0.85, 0.6, 1, 0.75, 0.5, 0.9, 0.65, 1, 0.8].map((h, i) => (
                      <span key={i} className="rounded-full bg-[#3a9e52]"
                        style={{
                          width: 3,
                          height: `${h * 100}%`,
                          opacity: 0.7 + h * 0.3,
                          animation: `wavebar 0.${8 + (i % 4)}s ease-in-out infinite alternate`,
                          animationDelay: `${i * 0.07}s`,
                        }} />
                    ))}
                  </div>

                  <p className="text-xs text-[#b0c8b4] italic">Speak naturally — AI will extract your tasks</p>
                </div>

                {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

                <button
                  onClick={stopRecording}
                  className="w-full py-4 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: '#e07070', boxShadow: '0 4px 16px rgba(224,112,112,0.3)' }}
                >
                  Done speaking
                </button>
              </>
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

        {/* ACCOUNTABILITY REVIEW */}
        {phase === 'accountability' && (
          <div className="w-full max-w-sm">
            <p className="text-4xl text-center mb-4">✅</p>
            <h2 className="text-2xl font-bold text-center text-[#1a3020] mb-1 tracking-tight">Session done.</h2>
            <p className="text-sm text-[#a8c4a8] text-center mb-8">What did you actually complete?</p>

            <div className="space-y-3 mb-8">
              {accountabilityItems.map((item, i) => (
                <button key={i} onClick={() => toggleAccountabilityItem(i)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all text-left"
                  style={{
                    background: item.completed ? '#f0f9f2' : '#fff',
                    borderColor: item.completed ? '#3a9e52' : '#e8f0e8',
                  }}>
                  <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      borderColor: item.completed ? '#3a9e52' : '#c8dcc8',
                      background: item.completed ? '#3a9e52' : 'transparent',
                    }}>
                    {item.completed && <span className="text-white text-xs font-bold">✓</span>}
                  </span>
                  <span className="text-sm text-[#1a3020] flex-1">{item.text}</span>
                </button>
              ))}
            </div>

            <div className="text-center mb-4">
              <span className="text-xs text-[#b0c8b4]">
                {accountabilityItems.filter(i => i.completed).length}/{accountabilityItems.length} completed
              </span>
            </div>

            <button
              onClick={finishAccountability}
              className="w-full py-4 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #2d6aaa, #4a8fd4)', boxShadow: '0 4px 16px rgba(45,106,170,0.3)' }}
            >
              Save & finish →
            </button>
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
