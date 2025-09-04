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

  return {
    url: url,
    key: key
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