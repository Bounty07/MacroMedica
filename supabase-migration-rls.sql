-- MACROMEDICA MULTI-TENANT BOOTSTRAP MIGRATION
-- Run this in your Supabase SQL Editor

-- 1. Enable RLS (Should already be enabled)
ALTER TABLE cabinets ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Clean up existing conflicting policies (if any)
DROP POLICY IF EXISTS "Users can create their own cabinet" ON cabinets;
DROP POLICY IF EXISTS "Users can view their own cabinet" ON cabinets;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- 3. CABINETS POLICIES
-- Goal: Allow a new user (Doctor) to create their cabinet
CREATE POLICY "Users can create their own cabinet" 
ON cabinets FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Users can view their own cabinet" 
ON cabinets FOR SELECT 
TO authenticated 
USING (auth.uid() = tenant_id OR id IN (SELECT cabinet_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own cabinet" 
ON cabinets FOR UPDATE 
TO authenticated 
USING (auth.uid() = tenant_id);

-- 4. PROFILES POLICIES
-- Goal: Allow a user to create their own profile record
CREATE POLICY "Users can create their own profile" 
ON profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view profiles in their cabinet" 
ON profiles FOR SELECT 
TO authenticated 
USING (
  cabinet_id IN (
    SELECT id FROM cabinets WHERE tenant_id = auth.uid()
  ) OR id = auth.uid()
);

CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- 5. STORAGE (Optional but recommended for verifications)
-- Ensure 'verifications' bucket exists and is private
-- RLS for verifications: auth.uid() = owner
