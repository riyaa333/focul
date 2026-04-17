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
  const [inputMode, setInputMode] = useState<'type' | 'voice'>('voice')
  const [inputRecording, setInputRecording] = useState(false)
  const [inputRecordingSeconds, setInputRecordingSeconds] = useState(0)
  const [inputProcessing, setInputProcessing] = useState(false)

  const [waveHeights, setWaveHeights] = useState<number[]>(Array(12).fill(0.15))

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRecordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputMediaRecorderRef = useRef<MediaRecorder | null>(null)
  const inputChunksRef = useRef<Blob[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

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

      // Wire up real-time audio analyser for waveform
      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 64
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)
      analyserRef.current = analyser
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const NUM_BARS = 12
      function drawWave() {
        animFrameRef.current = requestAnimationFrame(drawWave)
        analyser.getByteFrequencyData(dataArray)
        const slice = Math.floor(dataArray.length / NUM_BARS)
        const heights = Array.from({ length: NUM_BARS }, (_, i) => {
          const val = dataArray[i * slice] / 255
          return Math.max(0.08, val)
        })
        setWaveHeights(heights)
      }
      drawWave()

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

    // Stop audio analyser
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (audioCtxRef.current) audioCtxRef.current.close()
    setWaveHeights(Array(12).fill(0.15))

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

  async function startInputRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000, channelCount: 1 }
      })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const mr = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 })
      inputChunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) inputChunksRef.current.push(e.data) }
      mr.start(250)
      inputMediaRecorderRef.current = mr
      setInputRecording(true)
      setInputRecordingSeconds(0)
      inputRecordingIntervalRef.current = setInterval(() => setInputRecordingSeconds(s => s + 1), 1000)
    } catch { setError('Could not access microphone.') }
  }

  async function stopInputRecording() {
    const mr = inputMediaRecorderRef.current
    if (!mr) return
    clearInterval(inputRecordingIntervalRef.current!)
    setInputRecording(false)
    await new Promise<void>(resolve => { mr.onstop = () => resolve(); mr.stop() })
    mr.stream.getTracks().forEach(t => t.stop())
    setInputProcessing(true)
    const ext = mr.mimeType.includes('mp4') ? 'mp4' : 'webm'
    const blob = new Blob(inputChunksRef.current, { type: mr.mimeType })
    const formData = new FormData()
    formData.append('audio', blob, `tasks.${ext}`)
    try {
      const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.tasks && data.tasks.length > 0) {
        setAccountabilityItems(prev => [...prev, ...data.tasks.map((t: string) => ({ text: t, completed: false }))])
      } else if (data.transcript) {
        // Fallback: add the whole transcript as one item
        setAccountabilityItems(prev => [...prev, { text: data.transcript, completed: false }])
      }
    } catch { setError('Could not process voice. Try typing instead.') }
    setInputProcessing(false)
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
            <p className="text-sm text-[#a8c4a8] text-center mb-6">Speak or type your tasks for this session</p>

            {/* Mode toggle */}
            <div className="flex bg-[#f0f5f0] rounded-full p-1 mb-5">
              {(['voice', 'type'] as const).map(m => (
                <button key={m} onClick={() => setInputMode(m)}
                  className="flex-1 py-2 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: inputMode === m ? '#fff' : 'transparent',
                    color: inputMode === m ? '#1a3020' : '#9ab09a',
                    boxShadow: inputMode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  }}>
                  {m === 'voice' ? '🎙 Speak' : '⌨️ Type'}
                </button>
              ))}
            </div>

            {/* Extracted task list */}
            {accountabilityItems.length > 0 && (
              <div className="space-y-2 mb-4">
                {accountabilityItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#dceadc] bg-white">
                    <span className="text-[#3a9e52] font-bold text-sm w-4 flex-shrink-0">{i + 1}.</span>
                    <span className="text-sm text-[#1a3020] flex-1">{item.text}</span>
                    <button onClick={() => setAccountabilityItems(prev => prev.filter((_, j) => j !== i))}
                      className="text-[#c0d4c0] hover:text-red-400 text-xs transition-colors">✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Voice input */}
            {inputMode === 'voice' && (
              <div className="flex flex-col items-center gap-4 mb-6">
                {inputProcessing ? (
                  <div className="text-center py-4">
                    <div className="text-2xl mb-2 animate-pulse">✦</div>
                    <p className="text-sm text-[#b0c8b4]">Extracting your tasks...</p>
                  </div>
                ) : !inputRecording ? (
                  <>
                    <button onClick={startInputRecording}
                      className="relative flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                      style={{ width: 72, height: 72 }}>
                      <span className="absolute inset-0 rounded-full bg-[#4a8fd4] opacity-15" style={{ transform: 'scale(1.35)' }} />
                      <span className="relative flex items-center justify-center w-[72px] h-[72px] rounded-full"
                        style={{ background: 'linear-gradient(135deg, #2d6aaa, #4a8fd4)', boxShadow: '0 6px 24px rgba(45,106,170,0.35)' }}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                          <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
                          <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                          <line x1="8" y1="23" x2="16" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </span>
                    </button>
                    <p className="text-xs text-[#b0c8b4]">
                      {accountabilityItems.length === 0 ? 'Tap and say your tasks' : 'Tap to add more tasks'}
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-4 w-full">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                      <span className="text-xs font-semibold tracking-widest uppercase text-blue-400">
                        Recording — {String(Math.floor(inputRecordingSeconds / 60)).padStart(2, '0')}:{String(inputRecordingSeconds % 60).padStart(2, '0')}
                      </span>
                    </div>
                    <p className="text-xs text-[#b0c8b4] italic text-center">Say your tasks naturally, e.g. &quot;Finish the API, write tests, update docs&quot;</p>
                    <button onClick={stopInputRecording}
                      className="px-8 py-3 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90"
                      style={{ background: '#e07070', boxShadow: '0 4px 16px rgba(224,112,112,0.3)' }}>
                      Done speaking
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Type input */}
            {inputMode === 'type' && (
              <div className="flex gap-2 mb-5">
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
                    className="px-4 py-3 rounded-xl text-[#4a8fd4] font-bold text-xl bg-[#eef4fb] hover:bg-[#e0ecf8] transition-colors">
                    +
                  </button>
                )}
              </div>
            )}

            {accountabilityItems.length > 0 && !inputRecording && !inputProcessing && (
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

                  {/* Live waveform — reacts to actual voice */}
                  <div className="flex items-center justify-center gap-1 mb-5" style={{ height: 36 }}>
                    {waveHeights.map((h, i) => (
                      <span key={i} className="rounded-full bg-[#3a9e52]"
                        style={{
                          width: 3,
                          height: `${h * 100}%`,
                          opacity: 0.5 + h * 0.5,
                          transition: 'height 0.08s ease-out, opacity 0.08s ease-out',
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
