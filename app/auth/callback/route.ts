import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/plans'

  if (code) {
    try {
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(`${origin}/auth?error=Could not authenticate user`)
      }

      if (data.session) {
        console.log('User authenticated successfully:', data.user.id)
        
        // Check if user already has an active subscription
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', data.user.id)
          .eq('status', 'active')
          .single()

        if (subscription) {
          // User has active subscription - go to dashboard
          return NextResponse.redirect(`${origin}/dashboard`)
        } else {
          // New user - go to plans to select subscription
          return NextResponse.redirect(`${origin}/plans`)
        }
      }
    } catch (error) {
      console.error('Unexpected auth callback error:', error)
    }
  }

  // Something went wrong, redirect to auth page
  return NextResponse.redirect(`${origin}/auth?error=Authentication failed`)
}