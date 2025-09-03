import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gfhcsypawnqiokdkduaz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmaGNzeXBhd25xaW9rZGtkdWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MDI3NzMsImV4cCI6MjA3MjQ3ODc3M30.DjNG0BokHWg6eme7Mli2Hs1p8cusaNbJGQ9K5STNJkQ'

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