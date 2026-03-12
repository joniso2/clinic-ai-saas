# Clinic AI SaaS

A **multi-tenant SaaS** for service-based businesses: clinics, salons, barbershops, and similar. It provides booking, calendar, CRM, AI-powered messaging, and client-facing sites per tenant.

## Project structure

- **`src/app/`** — Next.js App Router. Route segments like `/lulu` and `/clica` stay here for stable URLs; they delegate to site-specific code in `src/sites/`.
- **`src/sites/`** — **Client sites** (tenant-facing front ends). Each subfolder is one site:
  - **`lulu/`** — Lulu clinic (components, sections, styles, data).
  - **`clica/`** — Clica premium flow (landing, booking drawer, hero, shop). Logic and UI live here; `app/clica` only imports and re-exports.
- **`src/components/`** — Shared app components (dashboard, booking, super-admin, etc.).
- **`src/lib/`**, **`src/services/`**, **`src/app/api/`** — Shared libs, services, and API routes.
- **`infra/railway/`** — Railway config and Discord bot:
  - `railway.json`, `railway.bot.json`, `discord-bot.js`.
  - Run the bot: `npm run bot` (uses `infra/railway/discord-bot.js`; env is loaded from project root).
- **`supabase/`**
  - **`migrations/`** — Supabase migrations (do not move).
  - **`scripts/`** — Standalone SQL scripts (one-off fixes, RLS, billing, etc.).
  - **`patches/`** — Patch scripts as needed.
- **`docs/audits/`** — Audit reports and PDFs.
- **`.env.example`** — Template for env vars (copy to `.env.local`). Includes placeholders for Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), AI providers, Discord, and app URL.

## URLs

- **`/lulu`**, **`/lulu/booking`**, **`/lulu/shop`**, **`/lulu/contact`**, **`/lulu/gallery`** — Lulu client site (implemented under `src/sites/lulu`, routed via `src/app/lulu`).
- **`/clica`** — Clica client site (implemented under `src/sites/clica`, routed via `src/app/clica`).
- **`/book/[slug]`** — Dynamic booking page; uses Clica-style landing when applicable.

## Multi-tenant model

Tenants (clinics) are identified by `slug`. Each can have:

- Dashboard, settings, calendar, leads, and AI messaging.
- A public booking site (e.g. Lulu or Clica-style) or a generic `/book/[slug]` flow.

Client-site code is isolated under `src/sites/<name>` so adding or scaling tenants stays organized and consistent.

## Getting started

1. Copy `.env.example` to `.env.local` and set Supabase, AI, and Discord variables.
2. `npm install` then `npm run dev`.
3. Run the Discord bot (optional): `npm run bot` (from repo root; loads `.env.local` from project root).

## Database

- Apply migrations via Supabase CLI or dashboard.
- One-off or fix scripts live in `supabase/scripts/` and are run manually as needed.
