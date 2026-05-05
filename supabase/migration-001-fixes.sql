-- ============================================================
-- MIGRATION 001 — Critical fixes from audit (2026-05-05)
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Remove category CHECK constraint (allow custom categories)
ALTER TABLE entries DROP CONSTRAINT IF EXISTS entries_category_check;

-- 2. Add NOT NULL to owner_id columns (prevent orphan rows)
ALTER TABLE projects ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE vendors ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE entries ALTER COLUMN owner_id SET NOT NULL;

-- 3. Fix vendor_dues view — add security invoker so RLS applies
DROP VIEW IF EXISTS vendor_dues;
CREATE VIEW vendor_dues WITH (security_invoker = true) AS
SELECT
  v.id AS vendor_id,
  v.name,
  v.phone,
  v.owner_id,
  COALESCE(SUM(CASE WHEN e.is_credit = true THEN e.amount ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN e.category = 'vendor_payment' THEN e.amount ELSE 0 END), 0) AS outstanding_balance,
  COUNT(e.id) AS entry_count,
  MAX(e.entry_date) AS last_transaction_date
FROM vendors v
LEFT JOIN entries e ON e.vendor_id = v.id
GROUP BY v.id, v.name, v.phone, v.owner_id;

-- 4. Add amount > 0 check
ALTER TABLE entries ADD CONSTRAINT entries_amount_positive CHECK (amount > 0);
