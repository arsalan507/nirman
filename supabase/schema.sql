-- ============================================================
-- NIRMAN — Construction Expense Tracker
-- Supabase schema (run in SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROJECTS — multiple sites tracked separately
-- ============================================================
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  budget numeric(12,2) default 0,
  color text default '#FFD93D',
  status text default 'active' check (status in ('active', 'completed', 'on_hold')),
  start_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- VENDORS — auto-deduplicated by name + phone
-- ============================================================
create table if not exists vendors (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  gst_number text,
  notes text,
  created_at timestamptz default now(),
  unique (owner_id, name)
);

-- ============================================================
-- ENTRIES — the SINGLE source of truth
-- All sheets/dashboards derive from this.
-- ============================================================
create table if not exists entries (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,

  -- core (what dad fills)
  entry_date date not null default current_date,
  description text not null,
  amount numeric(12,2) not null,

  -- categorization (auto or manual)
  category text not null check (category in (
    'labor_daily', 'labor_contract',
    'material',
    'vendor_payment',
    'govt_approval',
    'equipment_rental',
    'transport',
    'utility',
    'professional_fee',
    'misc'
  )),
  subcategory text, -- e.g., "Mason", "Cement", "BBMP"

  -- labor-specific (when category is labor_*)
  worker_count int,
  daily_rate numeric(10,2),

  -- material-specific (when category is material)
  quantity numeric(10,2),
  unit text, -- bag, kg, sqft, nos, etc
  has_gst boolean default false,
  gst_rate numeric(4,2), -- 5, 12, 18, 28

  -- vendor / payment
  vendor_id uuid references vendors(id) on delete set null,
  payment_mode text not null default 'cash' check (payment_mode in (
    'cash', 'upi', 'bank_transfer', 'cheque', 'credit'
  )),
  is_credit boolean default false, -- if true, amount is owed to vendor
  bill_number text,

  -- attachments
  receipt_url text,

  -- audit
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for fast queries
create index if not exists entries_owner_date_idx on entries (owner_id, entry_date desc);
create index if not exists entries_project_idx on entries (project_id, entry_date desc);
create index if not exists entries_category_idx on entries (category);
create index if not exists entries_vendor_idx on entries (vendor_id);

-- ============================================================
-- VENDOR DUES VIEW — auto-calculated outstanding balance
-- ============================================================
create or replace view vendor_dues as
select
  v.id as vendor_id,
  v.name,
  v.phone,
  v.owner_id,
  coalesce(sum(case when e.is_credit = true then e.amount else 0 end), 0) -
  coalesce(sum(case when e.category = 'vendor_payment' then e.amount else 0 end), 0) as outstanding_balance,
  count(e.id) as entry_count,
  max(e.entry_date) as last_transaction_date
from vendors v
left join entries e on e.vendor_id = v.id
group by v.id, v.name, v.phone, v.owner_id;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — each user sees only their data
-- ============================================================
alter table projects enable row level security;
alter table vendors enable row level security;
alter table entries enable row level security;

create policy "users see own projects"
  on projects for all using (auth.uid() = owner_id);

create policy "users see own vendors"
  on vendors for all using (auth.uid() = owner_id);

create policy "users see own entries"
  on entries for all using (auth.uid() = owner_id);

-- ============================================================
-- AUTO-UPDATE updated_at trigger
-- ============================================================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at_column();

create trigger entries_updated_at
  before update on entries
  for each row execute function update_updated_at_column();

-- ============================================================
-- STORAGE BUCKET — for receipt photos
-- ============================================================
-- Run this separately in Storage section:
-- 1. Create bucket "receipts" (public: false)
-- 2. Add policy: authenticated users can insert/select their own folder
