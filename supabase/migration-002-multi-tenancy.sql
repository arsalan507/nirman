-- ============================================================
-- MIGRATION 002 — Multi-tenancy + Roles
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 2. Profiles (user → org + role mapping)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  phone text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'team')),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id),
  UNIQUE (phone)
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Add organization_id to existing tables (nullable first for backfill)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- 4. Backfill: for each existing user, create org + profile + set org_id
DO $$
DECLARE
  u RECORD;
  org_id uuid;
BEGIN
  FOR u IN SELECT DISTINCT owner_id FROM projects WHERE owner_id IS NOT NULL AND organization_id IS NULL
  LOOP
    -- Create org for this user
    INSERT INTO organizations (name) VALUES ('My Construction')
    RETURNING id INTO org_id;

    -- Create profile
    INSERT INTO profiles (user_id, name, phone, role, organization_id)
    VALUES (u.owner_id, 'Admin', 'unknown', 'admin', org_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Backfill organization_id
    UPDATE projects SET organization_id = org_id WHERE owner_id = u.owner_id AND organization_id IS NULL;
    UPDATE vendors SET organization_id = org_id WHERE owner_id = u.owner_id AND organization_id IS NULL;
    UPDATE entries SET organization_id = org_id WHERE owner_id = u.owner_id AND organization_id IS NULL;
  END LOOP;
END $$;

-- 5. Make organization_id NOT NULL (after backfill)
-- Only if there are no nulls left
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM projects WHERE organization_id IS NULL) THEN
    ALTER TABLE projects ALTER COLUMN organization_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vendors WHERE organization_id IS NULL) THEN
    ALTER TABLE vendors ALTER COLUMN organization_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM entries WHERE organization_id IS NULL) THEN
    ALTER TABLE entries ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;

-- 6. Drop old RLS policies
DROP POLICY IF EXISTS "users see own projects" ON projects;
DROP POLICY IF EXISTS "users see own vendors" ON vendors;
DROP POLICY IF EXISTS "users see own entries" ON entries;

-- 7. New RLS policies — organization-based
CREATE POLICY "org members access projects"
  ON projects FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "org members access vendors"
  ON vendors FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "org members access entries"
  ON entries FOR ALL
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

-- 8. RLS on profiles and organizations
CREATE POLICY "users read own org profiles"
  ON profiles FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "users insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admins manage profiles"
  ON profiles FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "admins delete profiles"
  ON profiles FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "org members read org"
  ON organizations FOR SELECT
  USING (id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "anyone can create org"
  ON organizations FOR INSERT
  WITH CHECK (true);

-- 9. Update vendor unique constraint
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_owner_id_name_key;
-- Only add if doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendors_organization_id_name_key'
  ) THEN
    ALTER TABLE vendors ADD CONSTRAINT vendors_organization_id_name_key UNIQUE (organization_id, name);
  END IF;
END $$;

-- 10. Update vendor_dues view
DROP VIEW IF EXISTS vendor_dues;
CREATE VIEW vendor_dues WITH (security_invoker = true) AS
SELECT
  v.id AS vendor_id,
  v.name,
  v.phone,
  v.owner_id,
  v.organization_id,
  COALESCE(SUM(CASE WHEN e.is_credit = true THEN e.amount ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN e.category = 'vendor_payment' THEN e.amount ELSE 0 END), 0) AS outstanding_balance,
  COUNT(e.id) AS entry_count,
  MAX(e.entry_date) AS last_transaction_date
FROM vendors v
LEFT JOIN entries e ON e.vendor_id = v.id
GROUP BY v.id, v.name, v.phone, v.owner_id, v.organization_id;

-- 11. Index for fast org-based queries
CREATE INDEX IF NOT EXISTS projects_org_idx ON projects (organization_id);
CREATE INDEX IF NOT EXISTS vendors_org_idx ON vendors (organization_id);
CREATE INDEX IF NOT EXISTS entries_org_idx ON entries (organization_id);
CREATE INDEX IF NOT EXISTS profiles_org_idx ON profiles (organization_id);
CREATE INDEX IF NOT EXISTS profiles_user_idx ON profiles (user_id);
