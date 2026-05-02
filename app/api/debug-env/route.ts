import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY
  return NextResponse.json({
    hasKey: typeof k === 'string' && k.length > 0,
    length: k?.length ?? 0,
    startsWithEyJ: k?.startsWith('eyJ') ?? false,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  })
}
