import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import type { Subscription, UseSubscriptionResult, User } from '@/types/dashboard'

/**
 * Custom hook for managing user subscription data
 * Handles both direct subscriptions and team-based subscriptions
 * with proper error handling and caching
 */
export function useSubscription(user: User | null): UseSubscriptionResult {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscription = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('🔄 Fetching subscription for user:', user.id)

      // Strategy: Try to find subscription through team membership first,
      // then fall back to direct subscription lookup
      
      // Step 1: Check if user is part of a team
      const { data: teamMembership, error: teamError } = await supabase
        .from('team_memberships')
        .select('subscription_id, role, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle() // Use maybeSingle instead of single to avoid errors

      let subscriptionId: string | null = null

      if (teamMembership && !teamError) {
        // User is part of a team - use team's subscription
        subscriptionId = teamMembership.subscription_id
        console.log('✅ Found team subscription:', subscriptionId)
      } else {
        // Step 2: Look for direct subscription
        const { data: directSub, error: directError } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle()

        if (directSub && !directError) {
          subscriptionId = directSub.id
          console.log('✅ Found direct subscription:', subscriptionId)
        }
      }

      if (!subscriptionId) {
        console.log('ℹ️ No active subscription found for user')
        setSubscription(null)
        setIsLoading(false)
        return
      }

      // Step 3: Fetch full subscription details
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
        .eq('id', subscriptionId)
        .eq('status', 'active')
        .single()

      if (subError) {
        throw new Error(`Failed to fetch subscription details: ${subError.message}`)
      }

      if (!subscriptionData) {
        throw new Error('Subscription not found or inactive')
      }

      console.log('✅ Subscription loaded successfully:', subscriptionData.subscription_plans.plan_type)
      setSubscription(subscriptionData as Subscription)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load subscription'
      console.error('❌ Subscription fetch error:', errorMessage)
      setError(errorMessage)
      setSubscription(null)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // Fetch subscription when user changes
  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  const refetch = useCallback(async () => {
    await fetchSubscription()
  }, [fetchSubscription])

  return {
    subscription,
    isLoading,
    error,
    refetch
  }
}