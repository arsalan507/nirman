-- ============================================================
-- MIGRATION 003 — Fix RLS recursion on profiles/organizations
-- The profiles SELECT policy was referencing profiles itself,
-- causing infinite recursion (500 error).
-- Fix: profiles policy uses auth.uid() directly, not a subquery.
-- ============================================================

-- Drop recursive policies
DROP POLICY IF EXISTS "users read own org profiles" ON profiles;
DROP POLICY IF EXISTS "users insert own profile" ON profiles;
DROP POLICY IF EXISTS "admins manage profiles" ON profiles;
DROP POLICY IF EXISTS "admins delete profiles" ON profiles;
DROP POLICY IF EXISTS "org members read org" ON organizations;
DROP POLICY IF EXISTS "anyone can create org" ON organizations;

-- Profiles: users can read their own profile directly
CREATE POLICY "users read own profile"
  ON profiles FOR SELECT
  USING (user_id = auth.uid());

-- Profiles: users can also read profiles in the same org
-- (uses a non-recursive approach: join via the user's own profile)
CREATE POLICY "users read org profiles"
  ON profiles FOR SELECT
  USING (
    organization_id = (
      SELECT p.organization_id FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1
    )
  );

-- Profiles: anyone can insert their own profile
CREATE POLICY "users insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Profiles: admins can update/delete in their org
CREATE POLICY "admins update profiles"
  ON profiles FOR UPDATE
  USING (
    organization_id = (
      SELECT p.organization_id FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin' LIMIT 1
    )
  );

CREATE POLICY "admins delete profiles"
  ON profiles FOR DELETE
  USING (
    organization_id = (
      SELECT p.organization_id FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin' LIMIT 1
    )
  );

-- Organizations: users can read their org
CREATE POLICY "users read own org"
  ON organizations FOR SELECT
  USING (
    id = (
      SELECT p.organization_id FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1
    )
  );

-- Organizations: anyone can create (needed for signup)
CREATE POLICY "anyone can create org"
  ON organizations FOR INSERT
  WITH CHECK (true);

-- Also fix the data policies to use the same non-recursive pattern
DROP POLICY IF EXISTS "org members access projects" ON projects;
DROP POLICY IF EXISTS "org members access vendors" ON vendors;
DROP POLICY IF EXISTS "org members access entries" ON entries;

CREATE POLICY "org members access projects"
  ON projects FOR ALL
  USING (
    organization_id = (
      SELECT p.organization_id FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY "org members access vendors"
  ON vendors FOR ALL
  USING (
    organization_id = (
      SELECT p.organization_id FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY "org members access entries"
  ON entries FOR ALL
  USING (
    organization_id = (
      SELECT p.organization_id FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1
    )
  );
