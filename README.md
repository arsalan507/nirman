# Nirman — Construction Expense Tracker

Mobile-first PWA for Bengaluru builders. Single-form data entry, voice input (Hindi/Kannada/English), WhatsApp share, live dashboards. Built for Arsalan's father.

## Features

- 🎤 **Voice input** — Hindi/Kannada/English code-mixed via Sarvam.ai
- 📝 **Single source of truth** — one form auto-populates Labor, Materials, Vendors, Approvals, Misc
- 📊 **Live dashboard** — KPIs, budget vs actual, category split, payment mode breakdown
- 📱 **WhatsApp share** — daily/weekly/per-entry invoice format, one-tap
- ✏️ **Edit anytime** — tap any past entry
- 📦 **PWA + offline** — works on patchy site internet
- 🇮🇳 **Bengaluru-specific** — labor types, materials, BBMP/BDA/BESCOM/BWSSB approvals

## Tech

- Next.js 16 (App Router) + TypeScript + Tailwind v4
- Supabase (Postgres + Phone OTP Auth + Storage)
- next-pwa, @tanstack/react-query
- react-hook-form + zod
- recharts
- Sarvam.ai for voice

## Setup

### 1. Supabase
1. Create project at https://supabase.com/dashboard (Mumbai region)
2. Open SQL Editor → paste & run `supabase/schema.sql`
3. **Auth → Providers** → enable Phone (use MSG91 or Twilio for India SMS)
4. **Storage** → create bucket `receipts` (private)
5. Copy Project URL + anon key from Settings → API

### 2. Sarvam.ai
1. Sign up at https://platform.sarvam.ai/
2. Generate API key (free tier OK)

### 3. Local dev
```bash
cp .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SARVAM_API_KEY
npm run dev
```

### 4. Deploy to Vercel
```bash
gh repo create nirman --private --source=. --push
# On Vercel: import repo → set env vars → deploy
```

## Architecture

`entries` is the **single source of truth**. Every dashboard, report, and category breakdown derives from it via filters. Father fills ONE form (or speaks to it); everything else updates live.

### Schema highlights
- `projects` — multi-site tracking with budgets
- `entries` — date, description, amount, category, optional labor/material/vendor fields
- `vendors` — auto-deduplicated from entry's vendor name field
- `vendor_dues` view — auto-calculated outstanding balance per vendor

See `supabase/schema.sql` for full schema with RLS policies.

## Brand voice

Neo-brutalist: 4px black borders, hard offset shadows (`8px_8px_0_0_#000`), no gradients, no rounding. Brand colors: yellow `#FFD93D`, mint `#7FFF9F`, pink `#FF69B4`. Big touch targets, bold typography.
