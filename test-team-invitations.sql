-- Test Team Invitations Table
-- Copy and paste this block into Supabase SQL Editor

-- Step 1A: Find your active team subscription
SELECT 
    id as subscription_id,
    user_id,
    status
FROM subscriptions 
WHERE status = 'active'
ORDER BY created_at DESC;

-- Step 1B: Find team admin details
SELECT 
    subscription_id,
    user_id as admin_user_id,
    role,
    status
FROM team_memberships 
WHERE role = 'admin' 
AND status = 'active';

-- Step 2: Create a test invitation 
-- Update the UUIDs below with the values from Step 1A and 1B
INSERT INTO team_invitations (
    subscription_id,
    invited_email,
    invited_by,
    status
) VALUES (
    'REPLACE_WITH_SUBSCRIPTION_ID_FROM_STEP_1A',  
    'test-invite@example.com',
    'REPLACE_WITH_ADMIN_USER_ID_FROM_STEP_1B',     
    'pending'
);

-- Step 3: Verify the invitation was created
SELECT 
    ti.id,
    ti.invited_email,
    ti.status,
    ti.expires_at,
    ti.created_at,
    up.full_name as invited_by_name
FROM team_invitations ti
JOIN user_profiles up ON ti.invited_by = up.id
ORDER BY ti.created_at DESC;

-- Step 4: Test RLS - Check that admin can see their team's invitations
SELECT 
    'Admin can see team invitations' as test_name,
    COUNT(*) as invitation_count
FROM team_invitations ti
WHERE EXISTS (
    SELECT 1 FROM team_memberships tm
    WHERE tm.subscription_id = ti.subscription_id
    AND tm.role = 'admin'
    AND tm.status = 'active'
);