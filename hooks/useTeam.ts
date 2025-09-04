import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import type { TeamMembership, UseTeamResult, User, Subscription } from '@/types/dashboard'

/**
 * Custom hook for managing team membership data
 * Handles team member detection, admin role checking, and member list
 */
export function useTeam(
  user: User | null, 
  subscription: Subscription | null
): UseTeamResult {
  const [teamMembership, setTeamMembership] = useState<TeamMembership | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMembership[]>([])
  const [isTeamAdmin, setIsTeamAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTeamData = useCallback(async () => {
    // Only fetch team data for team subscriptions
    if (!user?.id || !subscription?.id || subscription.subscription_plans.plan_type !== 'team') {
      setTeamMembership(null)
      setTeamMembers([])
      setIsTeamAdmin(false)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('🔄 Fetching team data for subscription:', subscription.id)

      // Fetch all team members for this subscription
      const { data: membersData, error: membersError } = await supabase
        .from('team_memberships')
        .select(`
          id,
          subscription_id,
          user_id,
          role,
          status,
          created_at,
          updated_at,
          user_profiles (
            id,
            full_name,
            created_at
          )
        `)
        .eq('subscription_id', subscription.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true })

      if (membersError) {
        throw new Error(`Failed to fetch team members: ${membersError.message}`)
      }

      // Transform the data to match our interface
      const members: TeamMembership[] = (membersData || []).map(member => ({
        ...member,
        user_profiles: member.user_profiles && member.user_profiles.length > 0 
          ? member.user_profiles[0] 
          : undefined
      }))
      console.log('✅ Team members loaded:', members.length)

      // Find current user's membership
      const currentUserMembership = members.find(member => member.user_id === user.id)
      
      if (!currentUserMembership) {
        console.log('⚠️ Current user not found in team membership')
        setTeamMembership(null)
        setIsTeamAdmin(false)
      } else {
        console.log('✅ Current user membership:', currentUserMembership.role)
        setTeamMembership(currentUserMembership)
        setIsTeamAdmin(currentUserMembership.role === 'admin')
      }

      setTeamMembers(members)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load team data'
      console.error('❌ Team fetch error:', errorMessage)
      setError(errorMessage)
      setTeamMembership(null)
      setTeamMembers([])
      setIsTeamAdmin(false)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, subscription?.id, subscription?.subscription_plans.plan_type])

  // Fetch team data when dependencies change
  useEffect(() => {
    fetchTeamData()
  }, [fetchTeamData])

  const refetch = useCallback(async () => {
    await fetchTeamData()
  }, [fetchTeamData])

  return {
    teamMembership,
    teamMembers,
    isTeamAdmin,
    isLoading,
    error,
    refetch
  }
}