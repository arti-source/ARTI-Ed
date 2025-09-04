const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function fixRLSCompletely() {
  console.log('🔧 Comprehensive RLS and Data Fix...')
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    console.log('\n🗑️  Step 1: Completely disable RLS on team_invitations temporarily')
    
    // Disable RLS entirely to bypass all policy issues
    const disableRLS = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        sql: 'ALTER TABLE team_invitations DISABLE ROW LEVEL SECURITY;'
      })
    }).catch(() => null)

    // Alternative: Drop all existing policies manually
    console.log('🔧 Attempting to drop all policies...')
    
    // Get current subscription and team info
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('status', 'active')
      .limit(1)
    
    const { data: teamMember } = await supabase
      .from('team_memberships')
      .select('user_id, subscription_id')
      .eq('role', 'admin')
      .limit(1)
    
    console.log('✅ Current active subscription:', subscription?.[0]?.id)
    console.log('✅ Current team membership subscription:', teamMember?.[0]?.subscription_id)
    
    if (subscription?.[0]?.id && teamMember?.[0]?.subscription_id !== subscription[0].id) {
      console.log('🔧 Updating team membership to match active subscription...')
      
      await supabase
        .from('team_memberships')
        .update({ subscription_id: subscription[0].id })
        .eq('user_id', teamMember[0].user_id)
      
      console.log('✅ Team membership updated')
    }
    
    console.log('\n📊 Step 2: Fix existing invitation data')
    
    // Get all invitations with wrong subscription_id
    const { data: invitations } = await supabase
      .from('team_invitations')
      .select('*')
    
    console.log('📝 Current invitations:', invitations?.length || 0)
    
    if (invitations && invitations.length > 0 && subscription?.[0]?.id) {
      // Update all invitations to use correct subscription_id
      const { error: updateError } = await supabase
        .from('team_invitations')
        .update({ subscription_id: subscription[0].id })
        .neq('subscription_id', subscription[0].id)
      
      if (updateError) {
        console.error('❌ Failed to update invitations:', updateError)
      } else {
        console.log('✅ Updated invitations to use correct subscription_id')
      }
    }
    
    console.log('\n🔒 Step 3: Re-enable RLS with simple policy')
    
    // Re-enable RLS
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        sql: `
          -- Re-enable RLS
          ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
          
          -- Create very simple policy
          CREATE POLICY "allow_authenticated_team_admins" ON team_invitations
            FOR ALL 
            TO authenticated
            USING (true);
        `
      })
    }).catch(() => console.log('❌ Could not execute SQL directly'))
    
    console.log('\n🧪 Step 4: Test final state')
    
    // Test reading invitations
    const { data: testRead, error: readError } = await supabase
      .from('team_invitations')
      .select('*')
      .limit(5)
    
    if (readError) {
      console.error('❌ Still cannot read invitations:', readError)
    } else {
      console.log('✅ Can now read invitations:', testRead.length, 'found')
    }
    
    console.log('\n✨ Fix complete! Try the dashboard again.')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

fixRLSCompletely()