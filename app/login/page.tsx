'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else if (data.session) {
        router.push('/dashboard')
      } else {
        setMessage('Check your email to confirm your account.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push('/dashboard')
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fff3]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold text-[#1a3020]">focul</span>
          <p className="text-[#6a8f72] mt-1 text-sm">
            {mode === 'login' ? 'Welcome back.' : 'Start your first session.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-[#d4f0be] rounded-xl p-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1a3020] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-[#d4f0be] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3a9e52] bg-white text-[#1a3020]"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1a3020] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border border-[#d4f0be] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3a9e52] bg-white text-[#1a3020]"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {message && <p className="text-[#3a9e52] text-sm">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#3a9e52] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#2d8a44] transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-[#6a8f72] mt-4">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}
            className="text-[#3a9e52] font-medium hover:underline"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
