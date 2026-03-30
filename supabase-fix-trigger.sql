-- ============================================================
-- MACROMEDICA — FULL FIX (run this in Supabase SQL Editor)
-- ============================================================

-- STEP 1: Drop the broken auth trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- STEP 2: Drop ALL policies on cabinets (any name)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'cabinets'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON cabinets', pol.policyname);
  END LOOP;
END $$;

-- STEP 3: Drop ALL policies on profiles (any name)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
  END LOOP;
END $$;

-- STEP 4: Enable RLS
ALTER TABLE cabinets ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create simple, non-recursive policies

-- CABINETS: only check tenant_id, no subqueries to other tables
CREATE POLICY "cabinet_insert" ON cabinets FOR INSERT
TO authenticated WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "cabinet_select" ON cabinets FOR SELECT
TO authenticated USING (auth.uid() = tenant_id);

CREATE POLICY "cabinet_update" ON cabinets FOR UPDATE
TO authenticated USING (auth.uid() = tenant_id);

-- PROFILES: self-access only (no subquery to cabinets)
CREATE POLICY "profile_insert" ON profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "profile_select" ON profiles FOR SELECT
TO authenticated USING (auth.uid() = id);

CREATE POLICY "profile_update" ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id);

-- STEP 6: Verify — should show exactly 6 policies, no old ones
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('cabinets', 'profiles')
ORDER BY tablename, policyname;
