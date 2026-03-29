# Clinic AI SaaS

## Quick Start

```bash
npm install
npm run dev          # http://localhost:3000
```

Test login: `test2@gmail.com` / `123456789`

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4, Lucide icons
- **Database:** Supabase (PostgreSQL), migrations in `supabase/migrations/`
- **AI:** Anthropic, OpenAI, Gemini via Vercel AI SDK
- **Deploy:** Railway

## Project Structure

```
src/
├── app/              # Next.js routes (dashboard, /lulu, /clica, /book/[slug])
├── sites/            # Tenant-specific client sites (lulu, clica)
├── components/
│   ├── ui/           # Base UI (GlassSelect, KpiCard, etc.)
│   ├── dashboard/    # Dashboard components (leads, customers, settings)
│   ├── calendar/     # Calendar (WeekBoard, DayModal, NewAppointmentForm)
│   ├── billing/      # Billing documents, receipts
│   └── super-admin/  # Super-admin panels
├── services/         # Business logic (appointment.service, lead.service)
├── repositories/     # Data access layer (Supabase queries)
├── lib/              # Utilities (hebrew.ts, sms.ts, auth)
├── hooks/            # React hooks (useFocusTrap, useEscapeKey)
├── types/            # TypeScript definitions (leads, patients, appointments, billing)
└── middleware.ts     # Auth & routing
```

## Key Conventions

### RTL / Hebrew
- All dashboard UI is RTL (`dir="rtl"`)
- Use `flex-row-reverse` for horizontal layouts
- Use `text-right` for text alignment
- Use `start-*` / `end-*` instead of `left-*` / `right-*`
- Hebrew formatting utils in `src/lib/hebrew.ts`

### Styling
- Tailwind v4 with CSS variables in `globals.css`
- Dark mode via `.dark` class
- UI components: glass-like selects (`GlassSelect`), compact KPI cards on mobile
- Drawer animations: `drawer-enter` (side slide), mobile uses `translateY` slide-up

### Components
- `'use client'` for interactive components
- Props typed explicitly, no `any`
- Drawers use `fixed inset-0` with `touch-none` backdrop on iOS
- Body scroll lock: both `document.body` AND `document.documentElement` for iOS Safari

### Database
- Multi-tenant: every table has `clinic_id`
- RLS policies enforce clinic isolation
- Key tables: `leads`, `patients`, `appointments`, `clinic_services`, `billing_documents`, `payments`
- Soft delete on patients (`deleted_at`)

### Calendar
- Appointments colored by service color (set in pricing page)
- Status text colored by lead status
- `service_name` must be included in appointment repository SELECT queries
- `clinic_services.color` stores hex color for calendar display

### Pricing & Services
- `clinic_services` table with `color` field (hex string)
- Colors managed via `SERVICE_COLOR_PRESETS` in `pricing-types.ts`
- API: GET/PATCH `/api/clinic-services` includes `color` field

### Team Roles
- Generic (not medical): מנהל, עובד, מזכירה, שיווק, תומך
- Defined in `src/app/dashboard/team/team-types.ts`

## Environment Variables

Copy `.env.example` to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
DISCORD_BOT_TOKEN=
APP_URL=
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

## Common Patterns

### Adding a new field to a table
1. Add column via Supabase SQL Editor
2. Update type in `src/types/`
3. Update repository SELECT queries in `src/repositories/`
4. Update API route body parsing in `src/app/api/`

### Mobile considerations
- Bottom nav is `fixed bottom-0 z-40` with 60px height + safe area
- Drawers/modals should use `z-[60]` or higher to appear above it
- Always lock both `body` and `html` overflow for iOS
- Use `overscroll-contain` (not `overscroll-behavior-contain`) in Tailwind
- Test on iPhone viewport (430x932)

## Product Model (CRITICAL)

This is NOT a generic CRM.

The system represents a **clinic operations workflow**:

lead → appointment → patient → returning patient

Claude must always think in:

* Patients (לקוחות)
* Appointments (תורים)
* Treatments (טיפולים)
* Payments (תשלומים)
* Patient behavior (cancellations, no-shows)

NOT:

* Deals
* Pipelines
* Sales stages

---

## Data Principles (VERY IMPORTANT)

### 1. Single Identity (No Duplicates)

A person must NOT exist as both:

* lead
* patient

Without linkage.

Rules:

* Phone is the primary identifier
* Lead → Patient conversion must exist
* Avoid duplicate records at all costs

---

### 2. Derived Data (Do NOT store blindly)

These must be computed:

* next_appointment
* cancellation_risk
* outstanding_balance
* last_interaction

Only store if needed for performance.

---

### 3. Critical Missing Concepts

Claude must be aware:

* No-show tracking is required
* Cancellation behavior must be measurable
* Payment status must reflect real balance (not just total revenue)

---

## UI → Data Mapping (MANDATORY)

Every UI element must map to real data:

* "Next Appointment" → appointments query (future, nearest)
* "Cancellation Risk" → derived from cancellations + no-shows
* "Payment Status" → billing_documents + payments
* "Last Interaction" → last_visit_date or last_contact_date

No UI element should exist without a data source.

---

## When Implementing Features

Claude must:

1. Analyze existing schema first
2. Avoid creating new tables unless necessary
3. Prefer extending existing tables
4. Prevent duplication
5. Define exact queries for UI

---

## High-Risk Areas

* Appointments logic (status, scheduling, no-show)
* Payments & billing calculations
* Patient identity (duplicates between leads/patients)

Must be handled carefully.

---

## Performance Rules

* Avoid N+1 queries
* Prefer aggregated queries for dashboards
* Use JOINs for patient card data
* Consider computed fields only when needed

---

## Quality Bar

This system must feel like:

"A tool that runs a clinic daily"

NOT:

"A generic dashboard"
