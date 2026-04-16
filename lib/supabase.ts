import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Use real placeholder URL so the client initialises without crashing.
// Actual auth calls will fail until real keys are added to .env.local.
export const supabase = createClient(
  url?.startsWith('https://') ? url : 'https://placeholder.supabase.co',
  key && key.length > 20 ? key : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'
)
