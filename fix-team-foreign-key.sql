-- Fix Foreign Key Relationship for Team Members
-- Copy and paste this entire block into Supabase SQL Editor

-- Step 1: Add foreign key constraint (team_memberships.user_id → user_profiles.id)
ALTER TABLE team_memberships 
ADD CONSTRAINT fk_team_memberships_user_profiles 
FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- Step 2: Test the relationship works correctly (with correct column names)
-- Note: user_profiles has full_name but NO email column
-- Email is stored in auth.users table instead
SELECT 
    tm.id,
    tm.user_id,
    tm.role,
    tm.status,
    up.full_name,
    au.email
FROM team_memberships tm
LEFT JOIN user_profiles up ON tm.user_id = up.id
LEFT JOIN auth.users au ON tm.user_id = au.id::uuid
LIMIT 5;

-- Step 3: Alternative test query (only name, no email if above fails)
SELECT 
    tm.id,
    tm.user_id,
    tm.role,
    tm.status,
    up.full_name
FROM team_memberships tm
LEFT JOIN user_profiles up ON tm.user_id = up.id
LIMIT 5;

-- Step 4: Verify foreign key constraint was created successfully
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.constraint_name = 'fk_team_memberships_user_profiles';