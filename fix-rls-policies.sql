-- Fix RLS Policies for ARTI Ed Dashboard
-- This script addresses 406 "Not Acceptable" errors caused by missing/incorrect RLS policies

-- Enable RLS on all tables if not already enabled
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can read active subscription plans" ON subscription_plans;
DROP POLICY IF EXISTS "Users can read their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can read team memberships for their subscriptions" ON team_memberships;

-- 1. SUBSCRIPTION_PLANS table policies
-- Allow all authenticated users to read active subscription plans (these are public data)
CREATE POLICY "Authenticated users can read active subscription plans" 
ON subscription_plans FOR SELECT 
TO authenticated 
USING (is_active = true);

-- 2. SUBSCRIPTIONS table policies  
-- Allow users to read their own subscriptions
CREATE POLICY "Users can read their own subscriptions" 
ON subscriptions FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to update their own subscriptions (for status changes from webhooks)
CREATE POLICY "Users can update their own subscriptions" 
ON subscriptions FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

-- 3. TEAM_MEMBERSHIPS table policies
-- Allow users to read team memberships for subscriptions they own
CREATE POLICY "Subscription owners can read their team memberships" 
ON team_memberships FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM subscriptions s 
    WHERE s.id = team_memberships.subscription_id 
    AND s.user_id = auth.uid()
  )
);

-- Allow users to read team memberships where they are a member
CREATE POLICY "Users can read team memberships where they are members" 
ON team_memberships FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Allow subscription owners to insert/update team memberships
CREATE POLICY "Subscription owners can manage team memberships" 
ON team_memberships FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM subscriptions s 
    WHERE s.id = team_memberships.subscription_id 
    AND s.user_id = auth.uid()
  )
);

-- Debug: Check all policies are created correctly
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual
FROM pg_policies 
WHERE tablename IN ('subscriptions', 'subscription_plans', 'team_memberships')
ORDER BY tablename, policyname;