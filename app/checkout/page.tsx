'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { createCheckoutSession } from '@/lib/actions'
import Link from 'next/link'

interface Plan {
  id: string
  name: string
  description: string
  price_monthly: number
  plan_type: string
  stripe_price_id: string
}

interface SelectedPlan {
  planId: string
  planType: string
  userId: string
}

export default function CheckoutPage() {
  const [planData, setPlanData] = useState<Plan | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [teamSize, setTeamSize] = useState(1)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
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
      
      // Get selected plan from localStorage
      const storedPlan = localStorage.getItem('selectedPlan')
      if (!storedPlan) {
        router.push('/plans')
        return
      }
      
      const selected = JSON.parse(storedPlan)
      setSelectedPlan(selected)
      await loadPlanData(selected.planId)
    }

    init()
  }, [router])

  const loadPlanData = async (planId: string) => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single()

      if (error) throw error
      setPlanData(data)
    } catch (error) {
      showMessage('Kunne ikke laste plan data: ' + (error as Error).message, true)
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (msg: string, error = false) => {
    setMessage(msg)
    setIsError(error)
  }

  const getTotalPrice = () => {
    if (!planData) return 0
    return planData.price_monthly * (planData.plan_type === 'team' ? teamSize : 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || !planData || !selectedPlan) return

    const form = e.target as HTMLFormElement
    const formData = new FormData(form)
    
    const customerName = formData.get('customerName') as string
    const customerEmail = formData.get('customerEmail') as string
    const companyName = formData.get('companyName') as string

    if (!customerName || !customerEmail) {
      showMessage('Vennligst fyll ut alle påkrevde felt', true)
      return
    }

    setProcessing(true)

    try {
      const quantity = planData.plan_type === 'team' ? teamSize : 1

      const result = await createCheckoutSession({
        priceId: planData.stripe_price_id,
        quantity,
        customerEmail,
        userId: currentUser.id,
        planId: selectedPlan.planId,
        planType: planData.plan_type,
        customerName,
        companyName
      })

      if (!result.success || !result.url) {
        throw new Error(result.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      window.location.href = result.url
    } catch (error) {
      showMessage('Checkout feilet: ' + (error as Error).message, true)
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl">Laster...</p>
      </div>
    )
  }

  if (!planData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-500/80 text-white p-4 rounded-lg">
          Plan ikke funnet
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/10 p-8 rounded-xl backdrop-blur-md shadow-xl border border-white/20 max-w-lg w-full">
        <Link
          href="/plans"
          className="inline-block mb-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors no-underline"
        >
          ← Tilbake til planer
        </Link>
        
        <h1 className="text-3xl font-bold text-center mb-8" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
          🎓 Fullfør kjøp
        </h1>
        
        <div className="bg-white/10 p-6 rounded-xl mb-6">
          <div className="text-xl font-semibold mb-2">{planData.name}</div>
          <div className="text-2xl font-bold mb-2">
            kr {getTotalPrice().toFixed(2)}/måned
            {planData.plan_type === 'team' && teamSize > 1 && (
              <span className="text-sm font-normal"> ({teamSize} x kr {planData.price_monthly.toFixed(2)})</span>
            )}
          </div>
          <div className="text-sm opacity-90">{planData.description}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {planData.plan_type === 'team' && (
            <div className="bg-white/10 p-4 rounded-xl mb-4">
              <p className="mb-4"><strong>Team Plan:</strong> Du blir admin og kan invitere team-medlemmer etter kjøp.</p>
              <div>
                <label className="block mb-2 font-medium">Antall team-medlemmer (inkludert deg)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={teamSize}
                  onChange={(e) => setTeamSize(parseInt(e.target.value) || 1)}
                  className="w-full p-3 rounded-lg bg-white/90 text-gray-800 border-none focus:ring-2 focus:ring-white/50"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block mb-2 font-medium">Fullt navn</label>
            <input
              type="text"
              name="customerName"
              defaultValue={currentUser?.user_metadata?.full_name || ''}
              required
              className="w-full p-3 rounded-lg bg-white/90 text-gray-800 border-none focus:ring-2 focus:ring-white/50"
            />
          </div>
          
          <div>
            <label className="block mb-2 font-medium">E-post</label>
            <input
              type="email"
              name="customerEmail"
              defaultValue={currentUser?.email || ''}
              required
              className="w-full p-3 rounded-lg bg-white/90 text-gray-800 border-none focus:ring-2 focus:ring-white/50"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">Bedriftsnavn (valgfri)</label>
            <input
              type="text"
              name="companyName"
              defaultValue={currentUser?.user_metadata?.company_name || ''}
              className="w-full p-3 rounded-lg bg-white/90 text-gray-800 border-none focus:ring-2 focus:ring-white/50"
            />
          </div>

          <button
            type="submit"
            disabled={processing}
            className="w-full p-4 mt-6 bg-white/30 hover:bg-white/40 disabled:bg-white/20 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-300 transform hover:-translate-y-1 disabled:transform-none"
          >
            {processing ? 'Behandler...' : 'Fortsett til betaling'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-3 rounded-lg ${isError ? 'bg-red-500/80' : 'bg-green-500/80'} text-white`}>
            {message}
          </div>
        )}
      </div>

    </div>
  )
}