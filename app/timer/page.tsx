'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

type Phase = 'briefing' | 'input' | 'running' | 'debrief' | 'processing' | 'accountability' | 'done'
type AccountabilityItem = { text: string; completed: boolean }

// All quotes verified — source noted inline so any of them can be audited.
// If you add one, please cite the speech / book / essay it's from. If it can't
// be sourced, leave it out: misattributed quotes erode trust.
const QUOTES = [
  // Steve Jobs — Stanford Commencement Address, June 12 2005
  { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Stay hungry, stay foolish.", author: "Steve Jobs" }, // Jobs credits this to the Whole Earth Catalog's final issue

  // Reid Hoffman — said in multiple interviews; canonical version of his "embarrassed by your v1" line (≈2010)
  { text: "If you are not embarrassed by the first version of your product, you've launched too late.", author: "Reid Hoffman" },

  // Sheryl Sandberg — popularised at Facebook; appears in Lean In (2013)
  { text: "Done is better than perfect.", author: "Sheryl Sandberg" },

  // John Doerr — recurring line, included in Measure What Matters (2018)
  { text: "Ideas are easy. Execution is everything.", author: "John Doerr" },

  // Tim Ferriss — The 4-Hour Workweek (2007)
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },

  // Scott Belsky — Making Ideas Happen (2010)
  { text: "It's not about ideas. It's about making ideas happen.", author: "Scott Belsky" },

  // Jack Dorsey — recurring line in Twitter / Square talks circa 2009-2012
  { text: "Make every detail perfect, and limit the number of details to perfect.", author: "Jack Dorsey" },

  // Tony Hsieh — Delivering Happiness (2010)
  { text: "Chase the vision, not the money. The money will end up following you.", author: "Tony Hsieh" },

  // Gary Vaynerchuk — repeatedly on his podcast and in keynotes
  { text: "The best marketing strategy ever: care.", author: "Gary Vaynerchuk" },

  // Mark Zuckerberg — Y Combinator Startup School interview, 2011
  { text: "The biggest risk is not taking any risk.", author: "Mark Zuckerberg" },

  // Paul Graham — "Do Things That Don't Scale" (essay, 2013)
  { text: "It's better to make a few users very happy than a lot of users semi-happy.", author: "Paul Graham" },

  // Sam Altman — "Startup Playbook" (2015), YC's founding principle
  { text: "Make something people love.", author: "Sam Altman" },

  // Brian Chesky — Airbnb's "100 people who love you" lesson, often re-stated by Paul Graham too
  { text: "Build something 100 people love, not something a million people kind of like.", author: "Brian Chesky" },

  // Alan Kay — Xerox PARC, ≈1971
  { text: "The best way to predict the future is to invent it.", author: "Alan Kay" },

  // Linus Torvalds — Linux kernel mailing list, August 2000
  { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },

  // Donald Knuth — "Structured Programming with go to Statements" (ACM Computing Surveys, 1974)
  { text: "Premature optimization is the root of all evil.", author: "Donald Knuth" },

  // Richard Feynman — written on his Caltech blackboard at the time of his death (1988)
  { text: "What I cannot create, I do not understand.", author: "Richard Feynman" },

  // Marc Andreessen — "Why Software Is Eating the World" (Wall Street Journal, August 20 2011)
  { text: "Software is eating the world.", author: "Marc Andreessen" },

  // Drew Houston — Dropbox founder, repeated in interviews including his MIT commencement (2013)
  { text: "Don't worry about failure; you only have to be right once.", author: "Drew Houston" },

  // Peter Thiel — "Competition is for losers" (Wall Street Journal essay + Zero to One, 2014)
  { text: "Competition is for losers.", author: "Peter Thiel" },

  // Steve Jobs — Apple keynote / repeatedly across the late '90s
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
]

function TimerContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const durationMinutes = parseInt(searchParams.get('duration') || '15')
  const totalSeconds = searchParams.get('seconds')
    ? parseInt(searchParams.get('seconds')!)
    : durationMinutes * 60
  const mode = (searchParams.get('mode') || 'focus') as 'focus' | 'accountability'
  const variant = (searchParams.get('v') || '').toLowerCase() as '' | 'a' | 'b' | 'c'

  const [phase, setPhase] = useState<Phase>(mode === 'accountability' ? 'input' : 'running')
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds)
  const [tasks, setTasks] = useState<string[]>([])
  const [wins, setWins]   = useState<string[]>([])
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

  const phaseRef = useRef(phase)
  const recordingRef = useRef(recording)
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { recordingRef.current = recording }, [recording])

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

  // ── Electron global shortcut (Cmd+Shift+Space) ──
  // Registers once. Uses refs so it always reads current phase/recording state.
  useEffect(() => {
    const focul = (window as unknown as { focul?: { onStartRecording: (cb: () => void) => void; offStartRecording: () => void } }).focul
    if (!focul?.onStartRecording) return
    focul.onStartRecording(() => {
      if (phaseRef.current === 'debrief') {
        if (!recordingRef.current) startRecording()
        else stopRecording()
      }
    })
    return () => focul.offStartRecording?.()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard shortcut: Space to start/stop recording ─────────────────────
  // Tap to start, tap to stop. Guards:
  //   1. `e.repeat` — browsers fire keydown ~30Hz while a key is held. Without
  //      this guard, a normal 100ms Space tap fires 2-3 keydowns, the second
  //      flips recording right back off, audio is empty, processing sees
  //      nothing. This was the auto-skip-to-extracting bug.
  //   2. tag check — don't hijack Space while user is typing in a field.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      if (e.repeat) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault() // stop page scroll

      if (phase === 'debrief') {
        if (!recording) startRecording()
        else stopRecording()
      }
      if (phase === 'input' && inputMode === 'voice') {
        if (!inputRecording && !inputProcessing) startInputRecording()
        else if (inputRecording) stopInputRecording()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [phase, recording, inputRecording, inputProcessing, inputMode])

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

      if (data?.tasks && data.tasks.length > 0) {
        setBriefingTasks(data.tasks)
      } else if (mode !== 'accountability') {
        // No previous tasks — skip briefing, go straight in
        setPhase('running')
      }
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
      const drawWave = () => {
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

    // Give the AI context about what the user was working on this session.
    // Wispr Flow injects app context into transcription — we inject task context.
    // This lets Whisper bias toward relevant vocabulary and lets Claude
    // correct errors using actual project names/terms the user was working on.
    const sessionContext = [
      ...(mode === 'accountability' ? accountabilityItems.map(i => i.text) : []),
      ...briefingTasks,
    ].filter(Boolean)
    if (sessionContext.length > 0) {
      formData.append('context', sessionContext.join(', '))
    }

    try {
      const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
      setTranscript(data.transcript || '')
      setTasks(data.tasks || [])
      setWins(data.wins || [])
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
    // Inject any already-typed tasks as context for this voice recording
    if (accountabilityItems.length > 0) {
      formData.append('context', accountabilityItems.map(i => i.text).join(', '))
    }
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
    setWins([])
    setTranscript('')
    setRecordingSeconds(0)
    setError('')
    setAccountabilityItems([])
    setInputTask('')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{
      fontFamily: "'General Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      background: phase === 'running'
        ? '#0E1F14'  /* dark deep-forest while the clock runs — matches the dashboard hero */
        : (phase === 'debrief' || phase === 'done')
          ? 'linear-gradient(180deg, #f5f6ed 0%, #f1f3e8 100%)'
          : '#F7F5EF',
      opacity: entered ? 1 : 0,
      transform: entered ? 'scale(1)' : 'scale(0.96)',
      transition: 'opacity 0.45s cubic-bezier(0.4,0,0.2,1), transform 0.45s cubic-bezier(0.4,0,0.2,1), background 0.6s ease',
      willChange: 'opacity, transform',
    }}>

      {/* Nav */}
      <nav className="flex items-center px-10 py-5">
        <button onClick={() => {
          setEntered(false)
          setTimeout(() => router.push('/dashboard'), 380)
        }} className="text-xs font-medium hover:opacity-100 transition-opacity tracking-wide"
          style={{ color: phase === 'running' ? '#5F7D66' : '#8A8678', opacity: 1 }}>
          ← Dashboard
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
              style={{ background: '#3D6B47', boxShadow: '0 4px 16px rgba(61,107,71,0.25)' }}
            >
              Start {durationMinutes} min session →
            </button>
          </div>
        )}

        {/* INPUT (Accountability pre-timer) */}
        {phase === 'input' && (
          <div className="w-full max-w-md bg-white border border-[#E8E4DA] rounded-md px-10 py-12"
            style={{ fontFamily: "'General Sans', -apple-system, BlinkMacSystemFont, sans-serif" }}>
            <p className="text-[11px] font-semibold text-center uppercase text-[#7BA177] mb-3" style={{ letterSpacing: '0.18em' }}>
              Accountability sprint
            </p>
            <h2 className="text-2xl font-semibold text-center text-[#1F3A24] mb-2 tracking-tight">What&apos;s the plan?</h2>
            <p className="text-sm text-[#8A8678] text-center mb-7">Set your tasks before the clock starts.</p>

            {/* Mode toggle */}
            <div className="flex bg-[#F2EFE7] p-[3px] mb-5" style={{ borderRadius: 7 }}>
              {(['voice', 'type'] as const).map(m => (
                <button key={m} onClick={() => setInputMode(m)}
                  className="flex-1 py-2 text-xs font-semibold transition-all"
                  style={{
                    borderRadius: 5,
                    background: inputMode === m ? '#fff' : 'transparent',
                    color: inputMode === m ? '#1F3A24' : '#8A8678',
                    boxShadow: inputMode === m ? '0 1px 3px rgba(31,58,36,0.08)' : 'none',
                  }}>
                  {m === 'voice' ? 'Speak' : 'Type'}
                </button>
              ))}
            </div>

            {/* Extracted task list */}
            {accountabilityItems.length > 0 && (
              <div className="space-y-2 mb-4">
                {accountabilityItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-md border border-[#E8E4DA] bg-[#FAF9F4]">
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
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#3D6B47]"
                          style={{ animation: 'wavebar 0.7s ease-in-out infinite alternate', animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                    <p className="text-sm text-[#b0c8b4]">Extracting tasks...</p>
                  </div>
                ) : !inputRecording ? (
                  <>
                    <button onClick={startInputRecording}
                      className="relative flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                      style={{ width: 72, height: 72 }}>
                      <span className="absolute inset-0 rounded-full bg-[#3D6B47] opacity-15" style={{ transform: 'scale(1.35)' }} />
                      <span className="relative flex items-center justify-center w-[72px] h-[72px] rounded-full"
                        style={{ background: '#3D6B47', boxShadow: '0 6px 24px rgba(61,107,71,0.30)' }}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                          <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
                          <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                          <line x1="8" y1="23" x2="16" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </span>
                    </button>
                    <p className="text-xs text-[#b0c8b4]">
                      {accountabilityItems.length === 0 ? 'Tap or press' : 'Tap or press'}{' '}
                      <kbd style={{ background: '#e8f5e8', border: '1px solid #c8dcc8', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontFamily: 'inherit', color: '#5a8060' }}>Space</kbd>
                      {accountabilityItems.length === 0 ? ' to say your tasks' : ' to add more'}
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-4 w-full">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-[#3D6B47] rounded-full animate-pulse" />
                      <span className="text-xs font-semibold tracking-widest uppercase text-[#3D6B47]">
                        {String(Math.floor(inputRecordingSeconds / 60)).padStart(2, '0')}:{String(inputRecordingSeconds % 60).padStart(2, '0')}
                      </span>
                    </div>
                    <p className="text-xs text-[#b0c8b4] text-center">Say your tasks naturally...</p>
                    <button onClick={stopInputRecording}
                      className="px-8 py-3.5 rounded-md text-sm font-semibold text-white transition-all hover:opacity-90"
                      style={{ background: '#3D6B47', boxShadow: '0 4px 16px rgba(61,107,71,0.25)' }}>
                      Stop recording
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
                  className="flex-1 text-sm border border-[#E8E4DA] rounded-md px-4 py-3 outline-none bg-white text-[#1F3A24] placeholder-[#B5B09C]"
                  style={{ fontFamily: 'inherit' }}
                  autoFocus
                />
                {inputTask.trim() && (
                  <button onClick={addAccountabilityItem}
                    className="px-4 py-3 rounded-md text-[#3D6B47] font-bold text-xl bg-[#EFF4E8] hover:bg-[#E2EDD8] transition-colors">
                    +
                  </button>
                )}
              </div>
            )}

            {accountabilityItems.length > 0 && !inputRecording && !inputProcessing && (
              <button
                onClick={() => { setSecondsLeft(totalSeconds); setPhase('running') }}
                className="w-full py-4 rounded-md text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: '#3D6B47', boxShadow: '0 4px 16px rgba(61,107,71,0.25)' }}
              >
                Start {durationMinutes} min session →
              </button>
            )}
          </div>
        )}

        {/* RUNNING — editorial: timer + quote, warm and considered */}
        {phase === 'running' && variant === '' && (
          <div className="text-center select-none" style={{ width: '100%', maxWidth: 560, paddingBottom: 40 }}>

            {/* Accountability cue — names the contract you made before the clock started */}
            {mode === 'accountability' && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#16301e', border: '1px solid #27402e', borderRadius: 5,
                padding: '6px 14px', marginBottom: 36,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7BA177' }} />
                <span style={{
                  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.16em', color: '#C5D9B8',
                }}>
                  Accountability sprint{accountabilityItems.length > 0 ? ` · ${accountabilityItems.length} task${accountabilityItems.length > 1 ? 's' : ''}` : ''}
                </span>
              </div>
            )}

            {/* Timer — medium weight, warm muted ink */}
            <div style={{
              fontVariantNumeric: 'tabular-nums',
              fontSize: 'clamp(104px, 14vw, 176px)',
              fontWeight: 500,
              letterSpacing: '-0.045em',
              lineHeight: 1,
              color: '#F7F5EF',
              display: 'inline-flex', alignItems: 'baseline', gap: 6,
            }}>
              <span>{String(minutes).padStart(2, '0')}</span>
              <span style={{ opacity: 0.4, fontWeight: 300, color: '#7BA177' }}>:</span>
              <span style={{ color: '#7BA177' }}>{String(seconds).padStart(2, '0')}</span>
            </div>

            {/* Faint hairline separator — anchors the eye without shouting */}
            <div aria-hidden="true" style={{
              margin: '52px auto 36px',
              width: 36, height: 1,
              background: 'rgba(123,161,119,0.35)',
            }} />

            {/* Accountability: show the committed tasks where the quote would be —
                the contract stays on screen for the whole sprint */}
            {mode === 'accountability' && accountabilityItems.length > 0 ? (
              <div style={{ maxWidth: 380, margin: '0 auto', textAlign: 'left' }}>
                <p style={{
                  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.16em', color: '#5F7D66', marginBottom: 14, textAlign: 'center',
                }}>
                  You committed to
                </p>
                {accountabilityItems.map((item, i) => (
                  <p key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    fontSize: 14, lineHeight: 1.5, color: '#A8C2AD',
                    padding: '7px 0',
                    borderBottom: i < accountabilityItems.length - 1 ? '1px solid rgba(123,161,119,0.15)' : 'none',
                  }}>
                    <span style={{ color: '#7BA177', flexShrink: 0, fontWeight: 600 }}>{i + 1}.</span>
                    {item.text}
                  </p>
                ))}
              </div>
            ) : (
              <>
                {/* Quote — treated like a book epigraph */}
                <p style={{
                  fontFamily: '"Inter Tight", Georgia, "Times New Roman", serif',
                  fontStyle: 'italic',
                  fontWeight: 500,
                  fontSize: 'clamp(15px, 1.4vw, 18px)',
                  lineHeight: 1.55,
                  color: '#8FAE96',
                  maxWidth: 420,
                  margin: '0 auto',
                  letterSpacing: '0',
                }}>
                  &ldquo;{quote.text}&rdquo;
                </p>

                {/* Attribution — small, tracked, quiet */}
                <p style={{
                  marginTop: 18,
                  fontSize: 11,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em',
                  color: '#5F7D66',
                }}>
                  — {quote.author}
                </p>
              </>
            )}
          </div>
        )}


        {/* DEBRIEF — editorial calm, matching the timer page */}
        {phase === 'debrief' && (
          <div className="text-center select-none" style={{ width: '100%', maxWidth: 480, paddingBottom: 40 }}>
            {!recording ? (
              <>
                <h2 style={{
                  fontSize: 'clamp(28px, 3.4vw, 38px)',
                  fontWeight: 500,
                  letterSpacing: '-0.025em',
                  lineHeight: 1.15,
                  color: '#2a3a2c',
                  marginBottom: 14,
                }}>
                  What did you get done?
                </h2>
                <p style={{
                  fontFamily: '"Inter Tight", Georgia, "Times New Roman", serif',
                  fontStyle: 'italic',
                  fontWeight: 500,
                  fontSize: 15,
                  color: '#5e6f5e',
                  marginBottom: 56,
                  lineHeight: 1.5,
                }}>
                  Speak for about thirty seconds. The rest takes care of itself.
                </p>

                {error && (
                  <p style={{ fontSize: 13, color: '#b85a3c', marginBottom: 24 }}>{error}</p>
                )}

                {/* Mic — calmer, no aggressive halo */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
                  <button
                    onClick={startRecording}
                    aria-label="Start recording"
                    style={{
                      position: 'relative',
                      width: 84, height: 84, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #4a9b5d, #6fb87f)',
                      border: 'none', cursor: 'pointer',
                      boxShadow: '0 8px 28px rgba(74,155,93,0.22), 0 2px 6px rgba(74,155,93,0.10)',
                      display: 'grid', placeItems: 'center',
                      transition: 'transform 0.2s cubic-bezier(0.4,0,0.2,1), box-shadow 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(74,155,93,0.28), 0 2px 6px rgba(74,155,93,0.12)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 28px rgba(74,155,93,0.22), 0 2px 6px rgba(74,155,93,0.10)' }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                      <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round"/>
                      <line x1="12" y1="19" x2="12" y2="23" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="8" y1="23" x2="16" y2="23" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>

                  <p style={{ fontSize: 12, color: '#a39d8e', letterSpacing: '0.02em' }}>
                    Tap or press{' '}
                    <kbd style={{
                      fontFamily: 'inherit', fontWeight: 600, fontSize: 11,
                      background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(94,111,94,0.20)',
                      borderRadius: 5, padding: '2px 8px', color: '#5e6f5e',
                      boxShadow: '0 1px 0 rgba(94,111,94,0.10)',
                    }}>Space</kbd>
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Recording status — quiet pill, no harsh card */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  marginBottom: 44,
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#b85a3c',
                    animation: 'recPulse 1.4s ease-in-out infinite',
                  }} />
                  <span style={{
                    fontFamily: 'ui-monospace, "Fragment Mono", monospace',
                    fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase',
                    color: '#5e6f5e', fontVariantNumeric: 'tabular-nums',
                  }}>
                    Recording · {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}
                  </span>
                </div>

                {/* Equalizer — calmer green */}
                <div style={{
                  display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4,
                  height: 56, marginBottom: 56,
                }}>
                  {waveHeights.map((h, i) => (
                    <span key={i} style={{
                      display: 'block', width: 4, borderRadius: 3,
                      background: '#4a9b5d',
                      height: `${Math.max(h * 100, 8)}%`,
                      opacity: 0.5 + h * 0.45,
                      transition: 'height 0.08s ease-out',
                    }} />
                  ))}
                </div>

                {error && (
                  <p style={{ fontSize: 13, color: '#b85a3c', marginBottom: 20 }}>{error}</p>
                )}

                {/* Done button — calmer green */}
                <button
                  onClick={stopRecording}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '12px 28px', borderRadius: 999,
                    background: '#2a3a2c', color: '#fff',
                    fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
                    border: 'none', cursor: 'pointer',
                    boxShadow: '0 6px 18px rgba(42,58,44,0.18)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 22px rgba(42,58,44,0.22)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 6px 18px rgba(42,58,44,0.18)' }}
                >
                  Done talking
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                </button>

                <p style={{ fontSize: 12, color: '#a39d8e', marginTop: 18 }}>
                  or press{' '}
                  <kbd style={{
                    fontFamily: 'inherit', fontWeight: 600, fontSize: 11,
                    background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(94,111,94,0.20)',
                    borderRadius: 5, padding: '2px 8px', color: '#5e6f5e',
                    boxShadow: '0 1px 0 rgba(94,111,94,0.10)',
                  }}>Space</kbd>{' '}
                  to stop
                </p>

                <style jsx>{`
                  @keyframes recPulse {
                    0%, 100% { opacity: 1;    transform: scale(1); }
                    50%      { opacity: 0.45; transform: scale(0.85); }
                  }
                `}</style>
              </>
            )}
          </div>
        )}

        {/* PROCESSING */}
        {phase === 'processing' && (
          <div className="text-center">
            <div className="flex justify-center gap-1.5 mb-6">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#3a9e52]"
                  style={{ animation: 'wavebar 0.7s ease-in-out infinite alternate', animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <p className="text-sm font-medium text-[#1a3020]">Extracting your tasks...</p>
          </div>
        )}

        {/* ACCOUNTABILITY REVIEW */}
        {phase === 'accountability' && (
          <div className="w-full max-w-sm">
            <h2 className="text-2xl font-bold text-center text-[#1a3020] mb-2 tracking-tight">Session done.</h2>
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
              className="w-full py-4 rounded-md text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: '#3D6B47', boxShadow: '0 4px 16px rgba(61,107,71,0.25)' }}
            >
              Save & finish →
            </button>
          </div>
        )}

        {/* DONE — editorial recap: what you did + what's next */}
        {phase === 'done' && (
          <div className="select-none" style={{ width: '100%', maxWidth: 560, paddingBottom: 40 }}>

            {/* Eyebrow */}
            <p style={{
              fontFamily: 'ui-monospace, "Fragment Mono", monospace',
              fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
              color: '#a39d8e', marginBottom: 14, textAlign: 'center',
            }}>
              Session closed
            </p>

            {/* Heading */}
            <h2 style={{
              fontSize: 'clamp(28px, 3.4vw, 38px)',
              fontWeight: 500,
              letterSpacing: '-0.025em',
              lineHeight: 1.15,
              color: '#2a3a2c',
              marginBottom: 44,
              textAlign: 'center',
            }}>
              Here&rsquo;s what Focul heard.
            </h2>

            {wins.length === 0 && tasks.length === 0 ? (
              <p style={{
                fontFamily: '"Inter Tight", Georgia, "Times New Roman", serif',
                fontStyle: 'italic', fontWeight: 500, fontSize: 16,
                color: '#5e6f5e', textAlign: 'center', lineHeight: 1.5,
                maxWidth: 420, margin: '0 auto 44px',
              }}>
                Quiet session. Next time, speak for a few more seconds so Focul can capture what you did.
              </p>
            ) : (
              <>
                {/* What you did */}
                {wins.length > 0 && (
                  <section style={{ marginBottom: 36 }}>
                    <h3 style={{
                      fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
                      color: '#5e6f5e', fontWeight: 600, marginBottom: 18,
                      textAlign: 'center', fontFamily: 'ui-monospace, "Fragment Mono", monospace',
                    }}>
                      What you did
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {wins.map((w, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 14,
                          padding: '14px 0',
                          borderBottom: i < wins.length - 1 ? '1px solid rgba(94,111,94,0.12)' : 'none',
                        }}>
                          <span aria-hidden="true" style={{
                            width: 22, height: 22, borderRadius: '50%',
                            background: '#3a9e52', flexShrink: 0,
                            display: 'grid', placeItems: 'center', color: '#fff',
                            marginTop: 2,
                          }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </span>
                          <span style={{ fontSize: 16, color: '#2a3a2c', lineHeight: 1.5, flex: 1 }}>{w}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* What's next */}
                {tasks.length > 0 && (
                  <section style={{ marginBottom: 44 }}>
                    <h3 style={{
                      fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
                      color: '#5e6f5e', fontWeight: 600, marginBottom: 18,
                      textAlign: 'center', fontFamily: 'ui-monospace, "Fragment Mono", monospace',
                    }}>
                      What&rsquo;s next
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {tasks.map((t, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 14,
                          padding: '14px 0',
                          borderBottom: i < tasks.length - 1 ? '1px solid rgba(94,111,94,0.12)' : 'none',
                        }}>
                          <span aria-hidden="true" style={{
                            width: 22, height: 22, borderRadius: '50%',
                            background: 'transparent', border: '1.5px solid rgba(94,111,94,0.40)',
                            flexShrink: 0, display: 'grid', placeItems: 'center',
                            color: '#5e6f5e', fontSize: 13, fontWeight: 600,
                            marginTop: 2,
                          }}>
                            →
                          </span>
                          <span style={{ fontSize: 16, color: '#2a3a2c', lineHeight: 1.5, flex: 1 }}>{t}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginTop: 12 }}>
              <button
                onClick={resetTimer}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 32px', borderRadius: 999,
                  background: '#2a3a2c', color: '#fff',
                  fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
                  border: 'none', cursor: 'pointer',
                  boxShadow: '0 6px 18px rgba(42,58,44,0.18)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 22px rgba(42,58,44,0.22)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 6px 18px rgba(42,58,44,0.18)' }}
              >
                Start next session
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M5 12h14M13 5l7 7-7 7"/>
                </svg>
              </button>
              <button
                onClick={() => { setEntered(false); setTimeout(() => router.push('/dashboard'), 380) }}
                style={{
                  fontSize: 12, color: '#a39d8e', background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '6px 14px', fontFamily: 'inherit',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#2a3a2c' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#a39d8e' }}
              >
                ← Back to dashboard
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
