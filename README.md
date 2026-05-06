# Nirman - Construction Expense Tracker

Mobile-first PWA for Indian construction sites. Voice input in Hindi, Kannada, and English. Track every rupee, every vendor, every site.

**Live:** [nirman-drab.vercel.app](https://nirman-drab.vercel.app)

## Why

Residential construction in India runs on cash, WhatsApp, and memory. Nirman replaces all three with a single app that a non-tech person can use at a dusty construction site with patchy internet.

Built for my father and brother managing two sites in Bengaluru.

## Features

- **Voice input** - Say "do hazaar cement Ramesh ko" and it auto-fills amount, category, vendor
- **3 languages** - Hindi, Kannada, English (code-mixed) via [Sarvam.ai](https://sarvam.ai)
- **Vendor ledger** - Outstanding dues per vendor, calculated in real-time
- **Multi-site** - Track multiple projects with separate budgets
- **Team access** - Admin + team roles with organization-based isolation
- **WhatsApp share** - Formatted invoices and reports, one tap
- **Dashboard** - Budget vs actual, category breakdown, payment mode split
- **Custom categories** - Add/hide categories for your workflow
- **Slide-to-delete** - No accidental deletions
- **PWA** - Install from browser, works offline, no app store

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Database | Supabase (Postgres + RLS + Auth) |
| Voice AI | Sarvam.ai (saarika:v2.5) |
| State | Zustand (persisted) |
| Forms | react-hook-form + Zod |
| Charts | Recharts |
| Styling | Tailwind CSS v4 |
| Deploy | Vercel |

## Quick Start

```bash
git clone https://github.com/arsalan507/nirman.git
cd nirman
npm install
cp .env.example .env.local
# Fill: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SARVAM_API_KEY
npm run dev
```

### Supabase Setup

1. Create project at [supabase.com](https://supabase.com) (Mumbai region)
2. Run `supabase/schema.sql` in SQL Editor
3. Run `supabase/migration-001-fixes.sql`
4. Run `supabase/migration-002-multi-tenancy.sql`
5. Run `supabase/migration-003-fix-rls.sql`
6. Auth -> Providers -> Email -> Turn OFF "Confirm email"
7. Copy Project URL + anon key to `.env.local`

### Sarvam.ai (Voice)

1. Sign up at [platform.sarvam.ai](https://platform.sarvam.ai)
2. Generate API key (free tier works)
3. Add to `.env.local` as `SARVAM_API_KEY`

## Architecture

```
entries (single source of truth)
  |
  +-- projects (multi-site budgets)
  +-- vendors (auto-deduplicated, dues tracking)
  +-- organizations (multi-tenant isolation)
  +-- profiles (admin/team roles)
```

Row Level Security ensures each organization only sees their own data. No API middleware — the database enforces isolation.

## Bengaluru-Specific

- Labor types: Mason, Helper, Carpenter, Electrician, Plumber, Painter, Tile Layer, Bar Bender, Welder
- Materials: OPC/PPC Cement, TMT Steel, M-Sand, River Sand, Aggregate, Bricks, Blocks, Tiles
- Approvals: BBMP Plan Sanction, BDA, BESCOM, BWSSB, Khata Transfer, OC
- Payment modes: Cash, UPI, Bank Transfer, Cheque, Credit

## Other Projects

- [KineticXHub](https://kineticxhub.com) - Performance marketing for local businesses
- [WhatsApp Outreach](https://github.com/arsalan507/kxh-outreach) - B2B outreach automation

## License

MIT

---

Built by [Arsalan Ahmed](https://github.com/arsalan507) at [KineticXHub](https://kineticxhub.com)
