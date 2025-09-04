'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { useSubscription } from '@/hooks/useSubscription'
import { useTeam } from '@/hooks/useTeam'
import { useInvitations } from '@/hooks/useInvitations'
import type { User } from '@/types/dashboard'

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const router = useRouter()

  // Custom hooks for data management
  const { subscription, isLoading: subscriptionLoading, error: subscriptionError, refetch: refetchSubscription } = useSubscription(currentUser)
  const { teamMembers, isTeamAdmin, isLoading: teamLoading, error: teamError, refetch: refetchTeam } = useTeam(currentUser, subscription)
  const { invitations: teamInvitations, isLoading: invitationsLoading, error: invitationsError, sendInvitation, refetch: refetchInvitations } = useInvitations(currentUser, subscription, isTeamAdmin)

  // Combined loading state
  const loading = authLoading || subscriptionLoading || teamLoading || invitationsLoading
  
  // Combined error state  
  const error = subscriptionError || teamError || invitationsError

  // Authentication effect
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push('/auth')
          return
        }

        setCurrentUser(session.user as User)
        console.log('✅ User authenticated:', session.user.id)
        
      } catch (err) {
        console.error('❌ Auth error:', err)
        router.push('/auth')
      } finally {
        setAuthLoading(false)
      }
    }

    initAuth()
  }, [router])

  // Redirect to plans if no subscription found
  useEffect(() => {
    if (!authLoading && !subscriptionLoading && currentUser && !subscription && !subscriptionError) {
      console.log('ℹ️ No subscription found, redirecting to plans')
      router.push('/plans')
    }
  }, [authLoading, subscriptionLoading, currentUser, subscription, subscriptionError, router])

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const showAlert = (message: string) => {
    alert(message)
  }

  const handleSendInvitation = async () => {
    if (!inviteEmail.trim()) {
      showAlert('Vennligst oppgi en gyldig e-postadresse')
      return
    }

    setInviteLoading(true)
    
    try {
      const success = await sendInvitation(inviteEmail)
      
      if (success) {
        setInviteEmail('')
        setShowInviteModal(false)
        showAlert(`Invitasjon sendt til ${inviteEmail}!`)
      } else {
        showAlert(invitationsError || 'Kunne ikke sende invitasjon')
      }
    } catch (err) {
      showAlert('Kunne ikke sende invitasjon: ' + (err as Error).message)
    } finally {
      setInviteLoading(false)
    }
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

          {/* Team Section (only for team plans) */}
          {subscription?.subscription_plans.plan_type === 'team' && (
            <div className="bg-white/10 p-6 rounded-xl backdrop-blur-md border border-white/20">
              <div className="flex items-center gap-2 text-2xl font-bold mb-4">
                👥 {isTeamAdmin ? 'Team administrasjon' : 'Team medlemskap'}
              </div>
              
              <div className="space-y-3 mb-6">
                <p>
                  {isTeamAdmin ? 'Du er admin for dette teamet' : 'Du er medlem av dette teamet'}
                </p>
                <p>Team medlemmer: <strong>{teamMembers.length}</strong></p>
                {teamInvitations.length > 0 && (
                  <p>Pending invitasjoner: <strong>{teamInvitations.length}</strong></p>
                )}
                
                {/* Team Members List */}
                {teamMembers.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-3">Aktive medlemmer:</h4>
                    <div className="space-y-2">
                      {teamMembers.map((member) => (
                        <div 
                          key={member.id} 
                          className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">
                              {member.user_profiles?.full_name || 'Ukjent navn'}
                            </p>
                            <p className="text-sm opacity-75">
                              ID: {member.user_id.substring(0, 8)}...
                            </p>
                          </div>
                          <div className="text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              member.role === 'admin' 
                                ? 'bg-yellow-500/20 text-yellow-300' 
                                : 'bg-blue-500/20 text-blue-300'
                            }`}>
                              {member.role === 'admin' ? 'Admin' : 'Medlem'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending Invitations List */}
                {teamInvitations.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-3">Pending invitasjoner:</h4>
                    <div className="space-y-2">
                      {teamInvitations.map((invitation) => (
                        <div 
                          key={invitation.id} 
                          className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg border border-orange-500/20"
                        >
                          <div>
                            <p className="font-medium">
                              {invitation.invited_email}
                            </p>
                            <p className="text-sm opacity-75">
                              Sendt: {new Date(invitation.created_at).toLocaleDateString('no-NO')}
                            </p>
                          </div>
                          <div className="text-sm">
                            <span className="px-2 py-1 rounded-full text-xs bg-orange-500/20 text-orange-300">
                              Venter
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {isTeamAdmin && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-6 py-2 bg-white/30 hover:bg-white/40 text-white rounded-lg transition-colors"
                >
                  Inviter medlem
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white/90 backdrop-blur-md p-6 rounded-xl max-w-md w-full mx-4 border border-white/20">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Inviter nytt team-medlem</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email-adresse
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="navn@firma.no"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleSendInvitation}
                  disabled={!inviteEmail || inviteLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {inviteLoading ? 'Sender...' : 'Send invitasjon'}
                </button>
                <button
                  onClick={() => {
                    setShowInviteModal(false)
                    setInviteEmail('')
                  }}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Avbryt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}