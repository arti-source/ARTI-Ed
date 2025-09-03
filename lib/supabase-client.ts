import { createClient } from '@supabase/supabase-js'

// Get environment variables with fallbacks for client-side
function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // Debug logging
  console.log('Supabase client config check:', {
    urlExists: !!url,
    keyExists: !!key,
    urlValue: url ? url.substring(0, 30) + '...' : 'undefined',
    keyValue: key ? key.substring(0, 20) + '...' : 'undefined',
    nodeEnv: process.env.NODE_ENV
  })

  // Use hardcoded values as fallback (these are public keys, safe to commit)
  return {
    url: url || 'https://gfhcsypawnqiokdkduaz.supabase.co',
    key: key || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmaGNzeXBhd25xaW9rZGtkdWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MDI3NzMsImV4cCI6MjA3MjQ3ODc3M30.DjNG0BokHWg6eme7Mli2Hs1p8cusaNbJGQ9K5STNJkQ'
  }
}

// Get configuration
const { url: supabaseUrl, key: supabaseAnonKey } = getSupabaseConfig()

// Validate configuration
if (!supabaseUrl || supabaseUrl === 'undefined' || supabaseUrl.trim() === '') {
  throw new Error('Invalid Supabase URL configuration')
}

if (!supabaseAnonKey || supabaseAnonKey === 'undefined' || supabaseAnonKey.trim() === '') {
  throw new Error('Invalid Supabase anon key configuration')
}

// Client-side Supabase client - safe for browser use
export const supabase = createClient(supabaseUrl, supabaseAnonKey)