import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export function supabaseServer() {
  if (!url || !url.startsWith('https://')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  }
  if (!serviceKey || serviceKey.length < 20) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Get it from Supabase project settings → API → service_role and add to .env.local + Vercel env vars.'
    )
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
