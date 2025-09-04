-- Create Team Invitations Table
-- Copy and paste this entire block into Supabase SQL Editor

-- Step 1: Create the team_invitations table
CREATE TABLE team_invitations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    invited_email text NOT NULL,
    invited_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Step 2: Create indexes for better performance
CREATE INDEX idx_team_invitations_subscription_id ON team_invitations(subscription_id);
CREATE INDEX idx_team_invitations_invited_email ON team_invitations(invited_email);
CREATE INDEX idx_team_invitations_status ON team_invitations(status);
CREATE INDEX idx_team_invitations_expires_at ON team_invitations(expires_at);

-- Step 3: Enable Row Level Security
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policy - Team admins can manage invitations for their team
CREATE POLICY "Team admins can manage invitations for their team" ON team_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM team_memberships tm
            WHERE tm.subscription_id = team_invitations.subscription_id
            AND tm.user_id = auth.uid()
            AND tm.role = 'admin'
            AND tm.status = 'active'
        )
    );

-- Step 5: RLS Policy - Invited users can view their own invitations
CREATE POLICY "Invited users can view their own invitations" ON team_invitations
    FOR SELECT USING (
        invited_email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );

-- Step 6: Test the table structure
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'team_invitations' 
ORDER BY ordinal_position;

-- Step 7: Verify foreign key constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'team_invitations';