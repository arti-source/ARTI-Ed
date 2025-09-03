import { createClient } from '@supabase/supabase-js'

// Environment variables for client-side Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gfhcsypawnqiokdkduaz.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmaGNzeXBhd25xaW9rZGtkdWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MDI3NzMsImV4cCI6MjA3MjQ3ODc3M30.DjNG0BokHWg6eme7Mli2Hs1p8cusaNbJGQ9K5STNJkQ'

// Debug environment variables
console.log('Environment check:', {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'from env' : 'fallback',
  key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'from env' : 'fallback',
  nodeEnv: process.env.NODE_ENV
})

// Validate required environment variables
if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client (uses service role key)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  }
)