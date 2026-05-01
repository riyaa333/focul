import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const REF_BOOST = 5

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref') ?? ''
  if (!ref || ref.length > 16) {
    return NextResponse.json({ error: 'invalid ref' }, { status: 400 })
  }

  let sb
  try {
    sb = supabaseServer()
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }

  const { data, error } = await sb
    .from('waitlist')
    .select('email, ref_code, position')
    .eq('ref_code', ref)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const { count: referrals } = await sb
    .from('waitlist')
    .select('*', { count: 'exact', head: true })
    .eq('referred_by', ref)

  const referralCount = referrals ?? 0
  const effectivePosition = Math.max(1, data.position - REF_BOOST * referralCount)

  return NextResponse.json({
    email: data.email,
    ref_code: data.ref_code,
    position: effectivePosition,
    raw_position: data.position,
    referrals: referralCount,
  })
}
