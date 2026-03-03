# Deep Questionnaire — Architecture, Security & Fundability

Answers derived from the current codebase. Gaps and risks are called out explicitly.

---

## 1. Architecture & Infrastructure

### Network latency and cold starts (Vercel ↔ Railway ↔ Supabase)

- **Current state:** No documented strategy. Frontend is Next.js on Vercel; backend API routes run on the same Vercel deployment (Next.js API routes), not on Railway. The only Railway-hosted component referenced in the repo is the **Discord bot** (`discord-bot.js`), which calls `APP_URL` (likely Vercel) for `/api/webhook/discord`. So the main path is: Discord → Railway bot → HTTP to Vercel → Supabase.
- **Gaps:** No explicit handling of Vercel serverless cold starts; no regional colocation strategy; no latency budgets or timeouts documented beyond the 25s timeout in the Discord webhook handler and 60s in the bot.

### Database migrations and schema changes (multi-tenant, zero downtime)

- **Current state:** Migrations are SQL files in `supabase/migrations/` (001–011), applied manually (e.g. “Run in Supabase SQL Editor”). No automated migration runner (e.g. Supabase CLI in CI), no blue/green or expand-contract patterns documented.
- **Risk:** Schema changes are “run when needed”; no formal process for non-breaking changes vs. breaking ones, or for rolling back.

### Railway backend ↔ Discord bot and retries

- **Current state:** The Discord bot (Node, runs on Railway) POSTs to `APP_URL/api/webhook/discord` with a 60s timeout and no retry. If Railway or the HTTP call fails, the user gets no reply from the bot (the handler returns a generic error message; the bot does not retry the request).
- **Gap:** No retry/backoff, no dead-letter queue, no way to replay failed lead ingestion.

### Backup and disaster recovery (RPO/RTO)

- **Current state:** Not defined in the codebase. Relies on Supabase’s built-in backups. No documented RPO/RTO, no runbooks, no restore tests.

### Secrets and environment variables (Vercel, Railway, Supabase)

- **Current state:** Env vars are used in code (e.g. `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `DISCORD_BOT_TOKEN`, `APP_URL`, `AGENT_API_SECRET`). No central doc or template; each platform (Vercel, Railway) is configured separately. No rotation or secret-scanning strategy in repo.

---

## 2. Data Model & Multi-Tenant Isolation

### tenant_id at JWT vs application level

- **Current state:** Tenant identity is **not** in the JWT. It is derived in application code: `getClinicIdFromSession()` / `getEffectiveClinicId()` read `clinic_users` (and optional impersonation cookie for SUPER_ADMIN) and return `clinic_id`. All clinic-scoped API routes call these and pass `clinic_id` into repositories. So enforcement is **application-level**, not JWT claims.

### Risk of cross-tenant data leakage from one bad query

- **Current state:** **Yes.** Tables with RLS: `clinic_services`, `patients`, `integration_channels`, `plans`, `discord_guilds` (with `user_can_access_clinic(clinic_id)` or role checks). **`leads` and `appointments` have no RLS** in migrations; access is only via server-side code using the **service_role** client, which bypasses RLS. A single bug (e.g. forgetting `.eq('clinic_id', clinicId)` in a repo or API) could expose or mutate another tenant’s leads/appointments.

### Soft deletes vs hard deletes; churn and data purge

- **Current state:** **Patients:** soft delete via `deleted_at`; repository filters `deleted_at` and exposes `softDeletePatient`. **Leads/appointments:** hard delete (e.g. `leadRepository.deleteLead`, `appointmentRepo.deleteAppointment`). No clinic-level “churn” flow: no purge job, no retention policy, no GDPR-style erasure procedure documented in code.

### Global vs tenant-specific resources

- **Current state:** **Global:** `plans` (RLS: authenticated can read). **Tenant-specific:** clinic_services, clinic_settings, leads, appointments, patients, integration_channels — all keyed by `clinic_id`. No shared “system-wide AI prompt templates” table; prompts are built per-request from `clinic_settings` and `clinic_services` in `lead.service` / `discord.prompt`.

### Noisy neighbor (one tenant monopolizing DB)

- **Current state:** No per-tenant limits in the app (no connection pooling per tenant, no rate limits, no query budgets). Supabase’s own pooling/limits apply at the project level only. A single very active or abusive tenant could impact others.

---

## 3. Security & Compliance

### HIPAA / GDPR / BIPA

- **Current state:** Not implemented or documented. No compliance layer in code, no BAA or DPA references, no consent or legal-base handling for PII/PHI.

### Encryption at rest and in transit

- **Current state:** In transit: TLS for all external calls (Vercel, Supabase, Discord). At rest: Supabase default (encryption at rest on Supabase side); no application-level field encryption for PHI/PII.

### Supabase tier and BAA

- **Current state:** Tier and BAA are not specified in the repo. Lower-tier Supabase is not HIPAA-compliant by default; no BAA is referenced.

### Audit log for who accessed what

- **Current state:** No immutable audit log. Super-admin UI has a **mock** audit log (`SystemUsersSection.tsx` — `MOCK_AUDIT_LOG`). Security settings mention “Audit Logging” as a feature flag but there is no real implementation for patient/lead record access.

### Discord and lead data sanitization

- **Current state:** Lead content (message text, name, phone, email, etc.) is sent from the bot to the Next.js webhook and processed by the AI; lead rows are written to Supabase. Discord channel members can see messages. There is no sanitization step that strips or redacts PII before it reaches Discord; the design assumes the Discord server is trusted and access-controlled. No doc on who has access to the server or how to lock it down.

---

## 4. Scalability & Performance

### Supabase Realtime at scale (e.g. 1,000 clinics × 5 receptionists)

- **Current state:** Dashboard subscribes to `postgres_changes` on `leads` with `filter: clinic_id=eq.${clinicId}`. No load or connection-limit testing is evident; no documented Supabase Realtime connection limits or scaling plan for thousands of concurrent clients.

### Postgres connection pooling

- **Current state:** Not configured in the app. No Supavisor/PgBouncer or pool size settings in code; reliance on Supabase’s default pooling. Max connection limit not documented.

### Webhook floods (WhatsApp / Discord spikes)

- **Current state:** Discord webhook has a 25s timeout and no queue or rate limit. No bulk/backpressure handling; a spike could overload the API or Discord rate limits with no defined mitigation.

### Caching (Next.js App Router) for tenant config

- **Current state:** Minimal. One explicit `cache: 'no-store'` for an analytics fetch; no `unstable_cache` or similar for tenant config. Each request can hit the DB for settings/services; no documented caching strategy for static tenant configuration.

---

## 5. AI Integration Depth

### Model

- **Current state:** OpenAI: `gpt-4o-mini` in `ai-client.ts` for Discord flow; `gpt-4o` in `ai-chat.ts`. Mock AI config lists GPT-4o, GPT-4o Mini, GPT-3.5 Turbo. No Anthropic or local model in code.

### Prompt injection

- **Current state:** System prompt is built in `discord.prompt.ts` and passed to the model; user content is not sanitized before inclusion in the chat. No documented guardrails or output validation to prevent a malicious lead from manipulating the AI (e.g. offering free services or leaking system prompts).

### Hallucinations and liability (e.g. booking non-existent slots)

- **Current state:** Appointment creation is driven by `appointment.service` with real availability checks and slot validation. If the AI suggests a time that doesn’t exist, the code can still reject or correct it. No explicit “AI disclaimer” or liability wording in the product; no documented policy on who is liable for booking errors.

### Lead scoring: rule-based vs ML

- **Current state:** “Lead scoring” in the repo is rule-based: priority/urgency and optional `estimated_deal_value` are derived from AI analysis (e.g. in `lead.service`) and stored. No separate ML model or ground-truth training pipeline; it’s heuristic/LLM-derived, not trained on historical conversion data.

### Token cost per converted lead

- **Current state:** Mock analytics include cost estimates (e.g. `costPer1kInput`/`costPer1kOutput` in mock AI config). No real tracking of token usage per lead or per clinic, and no unit-economics calculation (e.g. cost per converted lead) in code.

---

## 6. Product Workflow & UX

### Receptionist workflow change vs augmentation

- **Current state:** Not specified in code. UI is a dashboard (leads, calendar, customers, settings); whether it replaces or augments existing workflow is a product/UX decision, not encoded in the app.

### Offline fallback

- **Current state:** None. The app is online-only; no service worker, no offline cache of today’s appointments. If the clinic loses internet, they cannot rely on the dashboard for current data.

### Conflict resolution (e.g. walk-in vs AI booking same slot)

- **Current state:** No optimistic locking or conflict UI. Last write wins; no “slot already taken” or merge strategy when two sources book the same slot.

### Dark mode and high-contrast

- **Current state:** Dark/light theming exists (Tailwind dark mode). No explicit “high-contrast light mode” or accessibility mode for bright clinical environments.

---

## 7. Monetization & Unit Economics

### Pricing model

- **Current state:** `plans` table has `price_monthly` (e.g. 199 for Basic); `max_users`, `max_leads`, `max_ai_tokens`, `max_integrations`. Suggests a tiered SaaS model; no usage-based billing or per-booking/SMS pricing in code.

### COGS (LLM, Twilio/WhatsApp, DB)

- **Current state:** Not computed in app. WhatsApp/phone is “partially integrated”; no Twilio or similar usage tracking in the repo. LLM cost is only in mock analytics; DB cost is not broken out per clinic.

### Volume at which a clinic becomes unprofitable

- **Current state:** Not calculated; no unit-economics model in the codebase.

### Billing for SMS/WhatsApp overages

- **Current state:** Not implemented; no overage logic or billing integration.

---

## 8. Customer Acquisition

### Wedge and CAC

- **Current state:** Not in code; product and go-to-market only.

### Technical setup and onboarding

- **Current state:** Discord requires guild → clinic mapping (Super Admin or seed); WhatsApp is referenced in integration_channels but flow is not fully implemented. Onboarding is not self-serve end-to-end (e.g. no automated Discord invite + link to clinic).

---

## 9. Retention & Stickiness

### Why this CRM vs Zapier to existing EHR

- **Current state:** Not addressed in code; value prop and integration story (e.g. EHR sync) are product/positioning.

### Stickiness after month 3 / sync with core scheduler

- **Current state:** No EHR or external scheduler integration in repo. “Alongside” vs “replace” and sync strategy are not implemented; data sync would be a future design.

---

## 10. Competitive Positioning

- **Current state:** Purely strategic; no code artifacts.

---

## 11. Operational Complexity

### Telephony/SMS compliance (A2P 10DLC, etc.)

- **Current state:** Not implemented or documented; no compliance layer in code.

### Timezones and clinic hours

- **Current state:** Settings include `min_booking_notice_hours`, `max_booking_window_days`, and scheduling config. Timezone handling appears in appointment logic (e.g. ISO/offset checks in `appointment.service`). No explicit doc on DST or per-clinic timezone; likely server or clinic default.

---

## 12. Technical Debt & Maintainability

### Test coverage

- **Current state:** No test files in the repo (no Jest/Vitest specs, no `*.test.ts`). Playwright is in `package-lock.json` as a transitive dependency only; no E2E or integration tests configured. Effectively **0% automated test coverage** for application code.

### Discord bot vs production ingestion

- **Current state:** Discord is the primary ingestion path; the bot calls the Next.js webhook. There is an agent API (`AGENT_API_SECRET`, `/api/leads` POST) for server-to-server lead creation. No timeline or design in repo for replacing the Discord bot with a dedicated webhook/API pipeline.

### Data layer vs presentation

- **Current state:** Repositories (`lead.repository`, `appointment.repository`, `patient.repository`, etc.) use the Supabase admin client and expose typed functions; API routes call these and auth helpers (`getEffectiveClinicId`). UI components fetch via API or, in one place, use Supabase client for realtime. Some coupling (e.g. dashboard knowing lead shape and API contract); not a strict clean architecture, but a recognizable data layer.

---

## Summary: Top Risks for Viability, Security & Fundability

| Area | Risk |
|------|------|
| **Multi-tenant isolation** | `leads` and `appointments` have no RLS; tenant enforced only in app code. One bug → cross-tenant leak. |
| **Compliance** | No HIPAA/GDPR implementation, no BAA, no real audit log. |
| **Discord** | No retry on failure; lead data in Discord with no PII sanitization; server access not documented. |
| **Resilience** | No backup/DR definition, no RPO/RTO, no retry/queue for webhooks. |
| **Scale** | Realtime and DB pooling not load-tested; no rate limits or per-tenant caps. |
| **Tests** | No automated tests; refactors and deployments are high-risk. |
| **Cost & pricing** | No token or usage tracking, no unit-economics model or overage handling. |

This document should be updated as you add RLS, compliance, retries, tests, and cost tracking.
