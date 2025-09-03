'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function SuccessPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const init = async () => {
      // Check authentication
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth')
        return
      }

      setCurrentUser(session.user)

      // Get session ID from URL
      const sessionId = searchParams.get('session_id')
      if (!sessionId) {
        setError('Ingen session ID funnet')
        setLoading(false)
        return
      }

      await verifyPayment(session.user.id)
    }

    init()
  }, [router, searchParams])

  const verifyPayment = async (userId: string) => {
    try {
      // Wait a bit for webhook to process
      await new Promise(resolve => setTimeout(resolve, 2000))

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      if (subscription) {
        // Clear selected plan from localStorage
        localStorage.removeItem('selectedPlan')
        setLoading(false)
      } else {
        // Create a temporary subscription record
        // (In production, this would be handled by Stripe webhooks)
        await createTempSubscription(userId)
        setLoading(false)
      }
    } catch (err) {
      console.error('Payment verification error:', err)
      setError('Kunne ikke verifisere betaling')
      setLoading(false)
    }
  }

  const createTempSubscription = async (userId: string) => {
    // This is a temporary solution - in production, Stripe webhooks would handle this
    const selectedPlan = JSON.parse(localStorage.getItem('selectedPlan') || '{}')
    
    const { error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_id: selectedPlan.planId,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })

    if (error) {
      throw error
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/10 p-8 rounded-xl backdrop-blur-md shadow-xl border border-white/20 max-w-md w-full text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl">Bekrefter ditt kjøp...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white/10 p-8 rounded-xl backdrop-blur-md shadow-xl border border-white/20 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-3xl font-bold mb-4">Noe gikk galt</h1>
          <p className="mb-6">Vi kunne ikke bekrefte din betaling. Vennligst kontakt oss hvis problemet vedvarer.</p>
          <div className="space-y-3">
            <Link 
              href="/plans"
              className="block px-6 py-3 bg-white/30 hover:bg-white/40 text-white rounded-lg font-semibold transition-all no-underline"
            >
              Tilbake til planer
            </Link>
            <a 
              href="mailto:support@arti-ed.no"
              className="block px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-all no-underline"
            >
              Kontakt support
            </a>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-500/80 text-white rounded-lg">
              {error}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white/10 p-8 rounded-xl backdrop-blur-md shadow-xl border border-white/20 max-w-md w-full text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold mb-4">Takk for kjøpet!</h1>
        <p className="text-lg mb-8 opacity-90">
          Din betaling er bekreftet og kontoen din er nå aktiv. 
          Du har full tilgang til alle kurs og funksjoner.
        </p>
        
        <Link 
          href="/dashboard"
          className="inline-block px-8 py-4 bg-white/30 hover:bg-white/40 text-white font-semibold rounded-lg transition-all duration-300 transform hover:-translate-y-1 no-underline"
        >
          Gå til Dashboard →
        </Link>
      </div>
    </div>
  )
}