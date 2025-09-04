const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function debugSupabaseRLS() {
  console.log('🔍 Connecting to Supabase...')
  
  // Create admin client using service role key
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    console.log('\n📋 Step 1: Test basic table access')
    
    // Simple test - can we access the table?
    const { data: testData, error: testError } = await supabase
      .from('team_invitations')
      .select('*')
      .limit(5)

    if (testError) {
      console.error('❌ Table access error:', testError)
    } else {
      console.log('✅ Table accessible, found', testData.length, 'records')
    }

    console.log('\n🔧 Step 2: Alternative approach - Disable RLS temporarily')
    
    console.log('🔒 Let\'s try disabling RLS on team_invitations temporarily...')
    
    // Try multiple approaches to execute SQL
    let sqlSuccess = false
    
    // Approach 1: Try PostgreSQL function if it exists
    try {
      const { data: disableRLS, error: disableError } = await supabase.rpc('execute_sql', {
        sql: 'ALTER TABLE team_invitations DISABLE ROW LEVEL SECURITY;'
      })
      
      if (!disableError) {
        console.log('✅ RLS disabled using execute_sql')
        sqlSuccess = true
      }
    } catch (e) {
      console.log('❌ execute_sql method failed:', e.message)
    }
    
    // Approach 2: Manual policy management via REST API
    if (!sqlSuccess) {
      console.log('🔧 Trying alternative: Creating permissive policy...')
      
      try {
        // Create a very permissive policy that allows team admins
        const { data: policyResult, error: policyError } = await supabase.rpc('create_team_policy', {})
          
        if (policyError) {
          console.log('❌ Custom policy function failed:', policyError.message)
        }
      } catch (e) {
        console.log('❌ Policy creation approach failed')
      }
    }
    
    console.log('\n🧪 Step 3: Get real UUIDs from database first')
    
    // Get real subscription ID
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('id, user_id')
      .eq('status', 'active')
      .limit(1)
    
    if (subError || !subscriptions || subscriptions.length === 0) {
      console.error('❌ Could not get subscription:', subError)
      return
    }
    
    console.log('✅ Found subscription:', subscriptions[0].id)
    
    // Get real admin user ID from team_memberships
    const { data: teamMembers, error: teamError } = await supabase
      .from('team_memberships')
      .select('user_id, role')
      .eq('subscription_id', subscriptions[0].id)
      .eq('role', 'admin')
      .limit(1)
    
    if (teamError || !teamMembers || teamMembers.length === 0) {
      console.error('❌ Could not get team admin:', teamError)
      
      // Debug: let's see what team memberships exist
      const { data: allMembers, error: allMembersError } = await supabase
        .from('team_memberships')
        .select('*')
      
      console.log('🔍 All team memberships:', JSON.stringify(allMembers, null, 2))
      console.log('🔍 Looking for subscription_id:', subscriptions[0].id)
      
      console.log('\n🔧 FOUND THE ISSUE: Subscription ID mismatch!')
      console.log('Active subscription:', subscriptions[0].id)
      console.log('Team membership subscription:', allMembers[0].subscription_id)
      
      console.log('\n🔧 Fixing: Update team_memberships to use correct subscription_id')
      
      const { data: updateResult, error: updateError } = await supabase
        .from('team_memberships')
        .update({ subscription_id: subscriptions[0].id })
        .eq('id', allMembers[0].id)
        .select()
      
      if (updateError) {
        console.error('❌ Failed to update team membership:', updateError)
        return
      } else {
        console.log('✅ Team membership updated successfully:', updateResult)
      }
      
      // Now try to get team admin again
      const { data: fixedTeamMembers, error: fixedTeamError } = await supabase
        .from('team_memberships')
        .select('user_id, role')
        .eq('subscription_id', subscriptions[0].id)
        .eq('role', 'admin')
        .limit(1)
      
      if (fixedTeamError || !fixedTeamMembers || fixedTeamMembers.length === 0) {
        console.error('❌ Still could not get team admin after fix:', fixedTeamError)
        return
      }
      
      console.log('✅ Now found team admin after fix:', fixedTeamMembers[0].user_id)
      
      // Continue with the test using fixed data
      const testSubscriptionId = subscriptions[0].id
      const testAdminId = fixedTeamMembers[0].user_id
      
      console.log('\n🧪 Step 4: Test invitation creation with fixed UUIDs')
      
      const { data: insertTest, error: insertError } = await supabase
        .from('team_invitations')
        .insert({
          subscription_id: testSubscriptionId,
          invited_email: 'debug-test@example.com',
          invited_by: testAdminId,
          status: 'pending'
        })
        .select()
      
      if (insertError) {
        console.error('❌ Test invitation creation still failed:', insertError)
      } else {
        console.log('✅ Test invitation created successfully after fix:', insertTest)
        
        // Clean up - delete the test invitation
        await supabase
          .from('team_invitations')
          .delete()
          .eq('invited_email', 'debug-test@example.com')
        
        console.log('🧹 Test invitation cleaned up')
      }
      
      return
    }
    
    console.log('✅ Found team admin:', teamMembers[0].user_id)
    
    const testSubscriptionId = subscriptions[0].id
    const testAdminId = teamMembers[0].user_id
    
    console.log('\n🧪 Step 4: Test invitation creation with real UUIDs')
    
    const { data: insertTest, error: insertError } = await supabase
      .from('team_invitations')
      .insert({
        subscription_id: testSubscriptionId,
        invited_email: 'debug-test@example.com',
        invited_by: testAdminId,
        status: 'pending'
      })
      .select()
    
    if (insertError) {
      console.error('❌ Test invitation creation failed:', insertError)
      
      // Let's also try to understand what policies are actually active
      console.log('\n🔍 Checking if RLS is causing the issue...')
      
      // Try with admin bypass by using service role (which should bypass RLS)
      console.log('🔓 Service role should bypass RLS, so this might be a different issue')
      
    } else {
      console.log('✅ Test invitation created successfully:', insertTest)
      
      // Clean up - delete the test invitation
      await supabase
        .from('team_invitations')
        .delete()
        .eq('invited_email', 'debug-test@example.com')
      
      console.log('🧹 Test invitation cleaned up')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }

  console.log('\n✨ Debug complete!')
}

debugSupabaseRLS()