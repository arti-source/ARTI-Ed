'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'

interface Subscription {
  id: string
  status: string
  current_period_end: string
  subscription_plans: {
    name: string
    plan_type: string
    price_monthly: number
  }
}

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [teamCount, setTeamCount] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      // Check authentication
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth')
        return
      }

      setCurrentUser(session.user)
      await loadDashboardData(session.user.id)
    }

    init()
  }, [router])

  const loadDashboardData = async (userId: string) => {
    try {
      // Get user's subscription
      const { data: subscriptionData, error: subError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans (
            name,
            plan_type,
            price_monthly
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      if (subError && subError.code !== 'PGRST116') {
        throw subError
      }

      if (!subscriptionData) {
        // No active subscription - redirect to plans
        router.push('/plans')
        return
      }

      setSubscription(subscriptionData as Subscription)
      
      // If team plan, load team info
      if (subscriptionData.subscription_plans.plan_type === 'team') {
        await loadTeamInfo(subscriptionData.id)
      }

      setLoading(false)
    } catch (err) {
      setError('Kunne ikke laste dashboard data: ' + (err as Error).message)
      setLoading(false)
    }
  }

  const loadTeamInfo = async (subscriptionId: string) => {
    try {
      const { data: teamMembers } = await supabase
        .from('team_memberships')
        .select('*')
        .eq('subscription_id', subscriptionId)

      setTeamCount(teamMembers?.length || 1)
    } catch (error) {
      console.error('Could not load team info:', error)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const showAlert = (message: string) => {
    alert(message)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl">Laster dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-500/80 text-white p-4 rounded-lg">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="text-2xl font-bold">🎓 ARTI Ed</div>
          <div className="flex items-center gap-4">
            <span>{currentUser?.user_metadata?.full_name || currentUser?.email}</span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
            >
              Logg ut
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            Velkommen til ditt dashboard!
          </h1>
          <p className="text-xl opacity-90">Her har du oversikt over kurs og abonnement</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Subscription Info */}
          <div className="bg-yellow-400/20 border border-yellow-400/50 p-6 rounded-xl backdrop-blur-md">
            <div className="flex items-center gap-2 text-2xl font-bold mb-4">
              ⭐ Ditt abonnement
            </div>
            {subscription && (
              <div className="space-y-2">
                <p><strong>{subscription.subscription_plans.name} Plan</strong></p>
                <p>Kr {subscription.subscription_plans.price_monthly}/måned</p>
                <p>Status: <strong className="text-green-400">Aktiv</strong></p>
                <p>Neste faktura: {new Date(subscription.current_period_end).toLocaleDateString('no-NO')}</p>
                <button
                  onClick={() => showAlert('Faktureringsinnstillinger kommer snart!')}
                  className="mt-4 px-6 py-2 bg-white/30 hover:bg-white/40 text-white rounded-lg transition-colors"
                >
                  Administrer abonnement
                </button>
              </div>
            )}
          </div>

          {/* Courses */}
          <div className="bg-white/10 p-6 rounded-xl backdrop-blur-md border border-white/20">
            <div className="flex items-center gap-2 text-2xl font-bold mb-4">
              📚 Tilgjengelige kurs
            </div>
            <div className="space-y-3 mb-6">
              {[
                'AI Fundamentals',
                'Machine Learning Basics', 
                'Data Science Workshop',
                'Advanced AI Techniques'
              ].map((course, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-white/10 rounded-lg">
                  <span>{course}</span>
                  <span className="px-3 py-1 bg-green-500/80 text-white text-sm rounded-full">
                    Tilgjengelig
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => showAlert('Kursfunksjonalitet kommer snart!')}
              className="px-6 py-2 bg-white/30 hover:bg-white/40 text-white rounded-lg transition-colors"
            >
              Start læring →
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Progress */}
          <div className="bg-white/10 p-6 rounded-xl backdrop-blur-md border border-white/20">
            <div className="flex items-center gap-2 text-2xl font-bold mb-4">
              📊 Din fremgang
            </div>
            <div className="space-y-2 mb-6">
              <p>Kurs fullført: <strong>0/4</strong></p>
              <p>Totale timer: <strong>0t</strong></p>
              <p>Denne måneden: <strong>0t</strong></p>
            </div>
            <button
              onClick={() => showAlert('Fremdriftsrapporter kommer snart!')}
              className="px-6 py-2 bg-white/30 hover:bg-white/40 text-white rounded-lg transition-colors"
            >
              Se detaljert rapport
            </button>
          </div>

          {/* Team Admin (only for team plans) */}
          {subscription?.subscription_plans.plan_type === 'team' && (
            <div className="bg-white/10 p-6 rounded-xl backdrop-blur-md border border-white/20">
              <div className="flex items-center gap-2 text-2xl font-bold mb-4">
                👥 Team administrasjon
              </div>
              <div className="space-y-2 mb-6">
                <p>Du er admin for dette teamet</p>
                <p>Team medlemmer: <strong>{teamCount}</strong></p>
              </div>
              <button
                onClick={() => showAlert('Team administrasjon kommer snart!')}
                className="px-6 py-2 bg-white/30 hover:bg-white/40 text-white rounded-lg transition-colors"
              >
                Administrer team
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}