import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import type { TeamInvitation, UseInvitationsResult, User, Subscription } from '@/types/dashboard'

/**
 * Custom hook for managing team invitations
 * Handles CRUD operations for invitations with proper error handling
 */
export function useInvitations(
  user: User | null,
  subscription: Subscription | null,
  isTeamAdmin: boolean
): UseInvitationsResult {
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInvitations = useCallback(async () => {
    // Only load invitations for team admins
    if (!user?.id || !subscription?.id || !isTeamAdmin || subscription.subscription_plans.plan_type !== 'team') {
      setInvitations([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('🔄 Fetching invitations for subscription:', subscription.id)

      const { data: invitationsData, error: invitationsError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('subscription_id', subscription.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (invitationsError) {
        throw new Error(`Failed to fetch invitations: ${invitationsError.message}`)
      }

      const pendingInvitations = (invitationsData || []) as TeamInvitation[]
      console.log('✅ Invitations loaded:', pendingInvitations.length)
      
      setInvitations(pendingInvitations)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load invitations'
      console.error('❌ Invitations fetch error:', errorMessage)
      setError(errorMessage)
      setInvitations([])
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, subscription?.id, isTeamAdmin, subscription?.subscription_plans.plan_type])

  // Fetch invitations when dependencies change
  useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations])

  const sendInvitation = useCallback(async (email: string): Promise<boolean> => {
    if (!user?.id || !subscription?.id || !isTeamAdmin) {
      setError('Not authorized to send invitations')
      return false
    }

    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address')
      return false
    }

    setError(null)

    try {
      console.log('🔄 Sending invitation to:', email)

      const { data, error: insertError } = await supabase
        .from('team_invitations')
        .insert([
          {
            subscription_id: subscription.id,
            invited_email: email,
            invited_by: user.id,
            status: 'pending'
          }
        ])
        .select()

      if (insertError) {
        throw new Error(`Failed to send invitation: ${insertError.message}`)
      }

      if (!data || data.length === 0) {
        throw new Error('Invitation was not created')
      }

      console.log('✅ Invitation sent successfully:', data[0].id)
      
      // Refresh invitations to show the new one
      await fetchInvitations()
      
      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send invitation'
      console.error('❌ Send invitation error:', errorMessage)
      setError(errorMessage)
      return false
    }
  }, [user?.id, subscription?.id, isTeamAdmin, fetchInvitations])

  const refetch = useCallback(async () => {
    await fetchInvitations()
  }, [fetchInvitations])

  return {
    invitations,
    isLoading,
    error,
    sendInvitation,
    refetch
  }
}