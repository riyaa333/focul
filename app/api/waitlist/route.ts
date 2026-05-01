import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  let body: { email?: string; role?: string; problem?: string; ref?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'invalid email' }, { status: 400 })
  }

  const role = (body.role ?? '').slice(0, 60) || null
  const problem = (body.problem ?? '').slice(0, 500) || null
  const referredBy = (body.ref ?? '').slice(0, 16) || null

  let sb
  try {
    sb = supabaseServer()
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }

  const existing = await sb
    .from('waitlist')
    .select('ref_code, position')
    .eq('email', email)
    .maybeSingle()

  if (existing.data) {
    return NextResponse.json({
      ref_code: existing.data.ref_code,
      position: existing.data.position,
      existing: true,
    })
  }

  const { data, error } = await sb
    .from('waitlist')
    .insert({ email, role, problem, referred_by: referredBy })
    .select('ref_code, position')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'insert failed' }, { status: 500 })
  }

  return NextResponse.json({
    ref_code: data.ref_code,
    position: data.position,
    existing: false,
  })
}
