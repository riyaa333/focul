import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const revalidate = 60

export async function GET() {
  let sb
  try {
    sb = supabaseServer()
  } catch {
    return NextResponse.json({ count: 0 })
  }

  const { count } = await sb
    .from('waitlist')
    .select('*', { count: 'exact', head: true })

  return NextResponse.json({ count: count ?? 0 })
}
