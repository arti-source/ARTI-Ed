'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'

interface Plan {
  id: string
  name: string
  description: string
  price_monthly: number
  plan_type: string
  features: string[]
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth')
        return
      }

      setCurrentUser(session.user)
      
      // Check if user already has an active subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .single()

      if (subscription) {
        router.push('/dashboard')
        return
      }

      await loadPlans()
    }

    checkAuth()
  }, [router])

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly')

      if (error) throw error
      setPlans(data || [])
    } catch (err) {
      setError('Kunne ikke laste planer: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const selectPlan = (planId: string, planType: string) => {
    if (!currentUser) {
      router.push('/auth')
      return
    }

    const selectedPlan = {
      planId,
      planType,
      userId: currentUser.id
    }
    
    localStorage.setItem('selectedPlan', JSON.stringify(selectedPlan))
    router.push('/checkout')
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl">Laster planer...</p>
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
    <div className="min-h-screen p-8">
      <button
        onClick={logout}
        className="absolute top-8 right-8 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
      >
        Logg ut
      </button>
      
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            🎓 Velg din ARTI Ed plan
          </h1>
          <p className="text-xl opacity-90">
            Få tilgang til alle våre kurs og læringsressurser
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => {
            const isPopular = plan.plan_type === 'team'
            const features = Array.isArray(plan.features) ? plan.features : []
            
            return (
              <div
                key={plan.id}
                className={`relative bg-white/10 p-8 rounded-xl backdrop-blur-md shadow-xl border transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${
                  isPopular ? 'border-yellow-400/50' : 'border-white/20'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-semibold">
                    Mest populær
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="text-3xl font-bold mb-2">
                    kr {plan.price_monthly.toFixed(2)}
                  </div>
                  <div className="text-sm opacity-80 mb-4">
                    {plan.plan_type === 'team' ? 'per bruker/måned' : 'per måned'}
                  </div>
                  <p className="opacity-90">{plan.description}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                  {plan.plan_type === 'team' && (
                    <>
                      <li className="flex items-start">
                        <span className="text-green-400 mr-2">✓</span>
                        <span>Admin kontroller</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-400 mr-2">✓</span>
                        <span>Fakturaer per team</span>
                      </li>
                    </>
                  )}
                </ul>

                <button
                  onClick={() => selectPlan(plan.id, plan.plan_type)}
                  className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 transform hover:-translate-y-1 ${
                    isPopular
                      ? 'bg-yellow-400 hover:bg-yellow-300 text-gray-900'
                      : 'bg-white/20 hover:bg-white/30 text-white'
                  }`}
                >
                  Velg {plan.name}
                </button>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}