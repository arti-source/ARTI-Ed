// Centralized TypeScript interfaces for dashboard

export interface User {
  id: string
  email: string
  user_metadata?: {
    full_name?: string
  }
}

export interface SubscriptionPlan {
  name: string
  plan_type: 'individual' | 'team'
  price_monthly: number
}

export interface Subscription {
  id: string
  user_id: string
  status: 'active' | 'inactive' | 'cancelled'
  current_period_end: string
  created_at: string
  subscription_plans: SubscriptionPlan
}

export interface UserProfile {
  id: string
  full_name: string
  created_at: string
}

export interface TeamMembership {
  id: string
  subscription_id: string
  user_id: string
  role: 'admin' | 'member'
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
  user_profiles?: UserProfile
}

export interface TeamInvitation {
  id: string
  subscription_id: string
  invited_email: string
  invited_by: string
  status: 'pending' | 'accepted' | 'expired'
  expires_at: string
  created_at: string
}

export interface DashboardData {
  user: User
  subscription: Subscription
  teamMembership?: TeamMembership
  isTeamAdmin: boolean
  teamMembers: TeamMembership[]
  teamInvitations: TeamInvitation[]
}

// API Response types
export interface SupabaseResponse<T> {
  data: T | null
  error: {
    code: string
    message: string
    details?: string
  } | null
}

// Hook return types
export interface UseSubscriptionResult {
  subscription: Subscription | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export interface UseTeamResult {
  teamMembership: TeamMembership | null
  teamMembers: TeamMembership[]
  isTeamAdmin: boolean
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export interface UseInvitationsResult {
  invitations: TeamInvitation[]
  isLoading: boolean
  error: string | null
  sendInvitation: (email: string) => Promise<boolean>
  refetch: () => Promise<void>
}