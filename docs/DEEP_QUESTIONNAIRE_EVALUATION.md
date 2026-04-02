# Deep Questionnaire — Architecture, Security & Fundability
## Evaluation Report: Clinic AI SaaS

This report pressure-tests the project across CTO, security-architect, and technical-investor lenses. It is based on codebase inspection and your existing `DEEP_QUESTIONNAIRE_ANSWERS.md`. Where the repo is silent, it is explicitly called out.

---

# 1. Project Understanding

## What the product is
**Clinic AI SaaS** is a **multi-tenant B2B SaaS** for service businesses (clinics, salons, barbershops). It provides:
- **Per-tenant dashboard**: leads, calendar, customers (patients), settings, integrations.
- **AI-powered lead handling**: primarily via a **Discord bot** that ingests messages, runs them through an LLM (OpenAI GPT-4o/mini), and creates/updates leads; optional Agent API for server-to-server lead creation.
- **Booking**: public booking pages (`/book/[slug]`, Lulu/Clica-style sites), OTP, slot locking, worker/service-based scheduling.
- **Super-admin**: platform management (clinics, Discord guild→clinic mapping, AI persona, plans, integrations).
- **Billing foundation**: `plans`, `billing_settings`, `billing_documents`, payments, VAT, idempotency — tiered SaaS (e.g. Basic 199, Pro 499); no Stripe/usage billing in code yet.

## Who it serves
- **Tenants**: clinic/salon owners and staff (CLINIC_ADMIN, STAFF).
- **End users of the product**: receptionists and admins using the dashboard and (indirectly) the Discord channel.
- **Consumers**: people who message the Discord server or use the booking page (leads and bookers).

## Core problem
Reduces no-show and manual back-and-forth by automating first-touch lead handling (Discord) and offering a branded booking flow; centralizes leads, calendar, and customers in one place per clinic.

## Current architecture (inferred)
- **Frontend**: Next.js 16 (App Router) on **Vercel**; dashboard, booking, super-admin, tenant-specific sites under `src/sites/`.
- **Backend**: Next.js API routes (same Vercel deployment); no separate API server.
- **Database**: Supabase (Postgres); migrations in `supabase/migrations/`, applied manually; no CI-based migration pipeline.
- **Auth**: Supabase Auth; tenant identity is **not** in the JWT — derived in app via `clinic_users` and optional impersonation cookie for SUPER_ADMIN.
- **Integrations**: Discord bot (Node, **Railway**) POSTs to `APP_URL/api/webhook/discord`; WhatsApp referenced in `integration_channels` but not fully implemented.
- **AI**: OpenAI in `ai-client.ts` / `ai-chat.ts`; prompts built from `clinic_settings` and `clinic_services`.
- **Realtime**: Dashboard subscribes to `postgres_changes` on `leads` filtered by `clinic_id` (Supabase client).

## Stage
**Late MVP / early production**: multiple tenants, Discord live, booking flow, billing tables and UI scaffolding, super-admin, but no automated tests, no RLS on `leads`, no HIPAA/GDPR layer, no runbooks or RPO/RTO.

## Assumptions
- Primary lead ingestion today is **Discord**; Agent API is for future or secondary ingestion.
- Supabase is the single source of truth; no separate data warehouse or analytics DB.
- “Clinic” is the only tenant boundary; no sub-orgs or white-label.
- Israeli market (ILS, Hebrew UI, Israel invoice thresholds in billing scripts).

---

# 2. Missing Information / Assumptions

## What is missing or unclear
- **Origin of `leads` table**: No `CREATE TABLE leads` in the migrations inspected; table is only altered (003, 005, 022, 026). Either it was created in a removed migration or in a one-off script — **cannot confirm schema or RLS history**.
- **Supabase tier and BAA**: Not in repo; unknown whether Supabase is HIPAA-eligible or if a BAA is in place.
- **Actual deployment**: Vercel project config, env per env (staging vs prod), who has service_role access.
- **Customer count and usage**: No evidence in code; growth and load assumptions are unknown.
- **Pricing and GTM**: Plans exist in DB; no evidence of pricing validation or CAC/LTV.

## What can be evaluated from the repo
- Architecture: structure, auth, tenant resolution, service_role usage, API boundaries.
- Security: RLS coverage, webhook auth, Agent API auth, impersonation, secrets usage.
- Data model: clinics, clinic_users, leads, appointments, patients, integration_channels, billing tables.
- Resilience: Discord webhook flow, idempotency (processed_messages), lack of retries/queues, backup/DR.
- Code quality: no automated tests, repositories + API routes + auth helpers, middleware CSRF exemptions.

## What needs clarification
- Whether any clinic today stores **PHI** (e.g. clinical notes) and thus triggers HIPAA/BAA requirements.
- Whether you intend to target US healthcare (HIPAA) or stay non-healthcare / non-US.
- Roadmap: Discord-first forever vs moving to a dedicated webhook/API pipeline.
- Who operates the Discord server (you vs tenant) and who has access to channel content (PII).

---

# 3. Deep Questionnaire

## A. Product & Customer Reality
1. **Who signs the contract and pays — the clinic owner, a franchise HQ, or a practice group?**
2. **Who is the daily user — receptionist, owner, or both? What is the single most painful task you replace in the first 30 days?**
3. **What do clinics use today (Excel, WhatsApp groups, another CRM, EHR module)? What is the switching cost in time and data migration?**
4. **What proof do you have that someone will pay for this (signed LOI, pilot payment, churn from a prior solution)?**
5. **Why is this a must-have now (e.g. labor shortage, no-show crisis) and not a nice-to-have?**
6. **What is the wedge: Discord community already in place, or “we’ll set up Discord for you”? If the latter, how many clinics have no Discord today?**
7. **What happens when the clinic’s EHR or main scheduler is the source of truth — do you integrate, replace, or sit alongside with no sync?**

## B. Architecture
8. **Is the architecture appropriate for the stage?** (Single Next.js app + Supabase + Discord bot is reasonable for MVP; are you overbuilding anywhere?)
9. **What is overbuilt?** (e.g. super-admin surface, billing schema, multiple site themes before one proven funnel.)
10. **What is underbuilt?** (RLS on leads/appointments, tests, retries, rate limits, connection pooling strategy.)
11. **Most fragile dependency:** If Discord changes API or rate-limits, or Supabase has an outage, what breaks first and do you have a fallback?
12. **Single points of failure:** One Supabase project, one Discord bot process, no queue — agree?
13. **Frontend/backend/DB/jobs boundary:** API routes and repositories are clear; “jobs” are ad-hoc (e.g. background webhook processing in the same process). Is that intentional for now?
14. **Multi-tenant scale:** All tenant isolation is in app code plus RLS on some tables; `leads` (and possibly appointments writes) have no RLS. Is the current design ready for 100+ clinics without a single bug leaking data?
15. **What breaks first at 10x usage?** (Supabase Realtime connections, Postgres connections, Vercel function timeout, Discord webhook flood.)

## C. Security
16. **Most likely attack surfaces:** (1) One missing `.eq('clinic_id', clinicId)` in a repo/API. (2) Agent API with stolen or leaked `AGENT_API_SECRET` (anyone can create leads for any clinic_id). (3) Super-admin impersonation cookie tampering (clinic_id in cookie). (4) Discord webhook without replay protection (beyond idempotency by message_id). Agree?
17. **Auth and authorization:** Enforced in app via `getEffectiveClinicId` / `getClinicIdFromSession` and role checks; JWT does not carry clinic_id. What if a route forgets to call `getEffectiveClinicId`?
18. **Tenant-isolation risks:** `leads` and (for writes) `appointments` rely on service_role plus application filters only. Confirm: no RLS on `leads` in any migration you have.
19. **Secrets:** In env (Vercel, Railway); no rotation or secret-scanning in repo. Where is `SUPABASE_SERVICE_ROLE_KEY` stored and who has access?
20. **Webhooks:** Discord protected by `DISCORD_WEBHOOK_SECRET` (Bearer). Is the payload verified (e.g. signature) or only “who has the secret”? Replay: idempotency by message_id — time-bounded?
21. **Input validation:** Is every API input validated (e.g. clinic_id UUID, lead body shape) before DB? Any raw SQL or dynamic filters from the client?
22. **Dangerous admin paths:** Super-admin can impersonate via cookie; Agent API can set arbitrary `clinic_id`. Are these logged and restricted to known IPs or roles?
23. **Malicious user accessing another clinic’s data:** One bug in a GET route (e.g. by-ids) or one repo method without clinic_id filter.
24. **Security logging:** No immutable audit log; mock in UI. Are 401/403 and webhook failures at least in logs and where?
25. **Compliance:** HIPAA/GDPR/BIPA — not implemented. If a clinic stores PHI, what is the plan and timeline?

## D. Data & Reliability
26. **Mission-critical data:** Leads, appointments, patients, clinic_settings. Agree?
27. **Data loss scenarios:** Supabase outage, accidental DELETE without soft-delete (e.g. leads/appointments hard delete), migration mistake. What backups and restore tests exist?
28. **Background tasks that can silently fail:** Discord webhook processing in background (no retry, no dead-letter). If the handler throws after 200, the lead may never be created and the user gets no reply.
29. **Backups, migrations, rollback:** Supabase backups only; migrations manual; no expand-contract or blue/green. Is that acceptable for current stage?
30. **Idempotency and auditability:** processed_messages for Discord; idempotency_keys for billing. Leads POST (Agent API) is not idempotent by client key — duplicate submissions create duplicate leads.
31. **Race conditions:** Two sources booking the same slot (e.g. walk-in + AI) — last write wins; no optimistic locking or conflict UI.
32. **Failure modes:** Notifications (Discord reply) can fail without retry; booking confirmation flow depends on Discord post; payments (billing) have their own failure path — are they documented?

## E. Operations & Delivery
33. **Safe deploy:** No automated tests; deploy is “push and hope” unless you run manual checks. How do you validate before production?
34. **Founder dependency:** How much of onboarding (Discord guild mapping, env, first clinic) is manual and only you can do?
35. **Observability:** Logging in webhook handler; no structured APM or error tracking in code. How do you debug production?
36. **Dev/staging/prod:** Env vars per environment; no evidence of strict branch-to-env or migration gates. Configuration drift risk?
37. **Operational burden:** Per-tenant Discord setup, potential timezone/slot issues, support for “the bot didn’t answer” — how will you scale this?

## F. Fundability
38. **Venture-backable or cash-flow business?** Product has platform potential (multi-tenant, AI, integrations) but wedge is narrow (Discord). Is the plan to raise or bootstrap to profitability?
39. **Moat:** What prevents a clinic from using Zapier + ChatGPT + a generic booking tool? Integration depth (EHR, scheduler), vertical expertise, or distribution?
40. **Market size:** How many clinics/salons in your target geography and segment; what ARPU and penetration justify VC scale?
41. **Why now:** Labor cost, no-show rates, or adoption of Discord/WhatsApp in this vertical — what is the trigger?
42. **Why this team:** Domain experience, distribution, or technical edge — what would an investor want to see?
43. **Evidence an investor would want next:** Paying pilots, retention after 3 months, NPS or “would not go back” quotes.
44. **Consultancy vs product:** If each clinic needs custom Discord setup and hand-holding, does it look like a product or a service? What would make it clearly product-led?

## G. Execution Risk
45. **Manual workflows:** Discord guild → clinic mapping, first-time setup, support. What is the plan to automate or delegate?
46. **Pretending to be automated:** Is lead handling “fully AI” or does staff still triage? Is that clear in positioning?
47. **Hardest to scale operationally:** Support, onboarding, or compliance (e.g. A2P 10DLC if you add SMS).
48. **Legal/compliance that could stop growth:** PHI without BAA; GDPR if you target EU; payment regulation if you hold funds.
49. **Underestimated complexity:** EHR/scheduler sync, multi-location per tenant, or token economics at scale.

---

# 4. Preliminary Diligence Memo

## 4.1 Architecture Verdict

**Good**
- Clear separation: App Router, API routes, repositories, auth helpers (`getEffectiveClinicId`, `requireSuperAdmin`).
- Tenant model is consistent (clinic_id everywhere); slug-based routing and sites under `src/sites/` are organized.
- Discord webhook uses idempotency (processed_messages) and optional async response to avoid proxy timeout.
- Billing schema (plans, documents, payments, idempotency_keys, audit log) is thought through for future monetization.

**Fragile**
- **Leads and appointments** depend entirely on application-level tenant checks; **no RLS on `leads`** (and for appointments, RLS is public read only; writes are service_role). One forgotten filter → cross-tenant leak.
- **Discord → Vercel → Supabase** chain: no retry, no queue; cold starts and timeouts can drop leads.
- **Realtime** at scale (e.g. 1000 clinics × several users) not validated; connection limits unknown.
- **Migrations** are manual; no automated run, no rollback story.

**Overcomplicated**
- For current stage: super-admin surface and billing tables may be ahead of proven demand; multiple site themes (Lulu, Clica) before one clear conversion path could spread focus.

**Dangerously missing**
- **RLS on `leads`** (and tenant-scoped write policy for `appointments` if you ever allow anon/authenticated writes).
- **Automated tests** (0% coverage) — refactors and new routes are high-risk.
- **Retry/backoff and dead-letter** for webhook processing.
- **Documented RPO/RTO and restore procedure.**

---

## 4.2 Security Verdict

| # | Risk | Severity | Likelihood | Mitigation |
|---|------|----------|------------|------------|
| 1 | Cross-tenant data leak (leads/appointments) — one bug in repo or API | **Critical** | Medium | Add RLS on `leads` (and tenant-scoped policies on `appointments` for writes). Audit every repo/route for `.eq('clinic_id', ...)`. |
| 2 | Agent API: stolen/leaked `AGENT_API_SECRET` → create leads for any clinic | **Critical** | Low–Medium | Restrict to server-side only; consider short-lived tokens or IP allowlist; log all Agent API calls with clinic_id. |
| 3 | Super-admin impersonation cookie tampering (clinic_id) | **High** | Low | Validate cookie value against existing clinic_ids; restrict to SUPER_ADMIN session; log impersonation. |
| 4 | No HIPAA/GDPR implementation despite PII/PHI in leads and patients | **High** | N/A (compliance) | If you target healthcare or EU: BAA, DPA, consent, access log, retention, erasure. If not, state scope clearly. |
| 5 | Discord webhook: no signature verification; only shared secret | **Medium** | Low | Add payload signature verification if Discord supports it; keep secret rotation in mind. |
| 6 | No immutable audit log for who accessed what | **Medium** | N/A | Implement real audit log (who, when, what resource) before enterprise or compliance-heavy customers. |
| 7 | Secrets in env only; no rotation or scanning | **Medium** | Low | Document rotation procedure; consider secret manager; add pre-commit or CI secret scan. |
| 8 | Realtime subscription: if anon key ever used for leads, RLS gap | **Medium** | Low | Ensure leads are only ever accessed via service_role or authenticated RLS; add RLS on leads. |
| 9 | Input validation and injection | **Medium** | Low | Validate all API inputs (UUIDs, body shape); avoid raw SQL from client. |
| 10 | Mock audit log in UI (security settings) | **Low** | N/A | Replace with real data or remove to avoid misleading customers. |

**Before real customers:** Fix #1 (RLS on leads + audit of tenant filters). Address #2 and #3 (Agent API and impersonation). Decide and document #4 (compliance scope).

**Before scale:** #4 (if in scope), #6 (audit log), #7 (secrets), plus rate limits and per-tenant caps to avoid noisy neighbor.

---

## 4.3 Fundability Verdict

**What makes this interesting**
- Multi-tenant SaaS with a clear vertical (clinics/salons); AI applied to lead handling and booking.
- Real workflow (Discord) and billing/plans in place; not just a demo.
- Technical founder who has already documented risks (DEEP_QUESTIONNAIRE_ANSWERS).

**What weakens investor confidence**
- **Security:** No RLS on leads; tenant isolation depends on discipline. One incident would kill trust.
- **Compliance:** No HIPAA/GDPR; if positioning toward healthcare or EU, gap is large.
- **Evidence:** No proof of paying customers, retention, or unit economics in the repo.
- **Wedge:** Discord-first is narrow; dependency on one channel and manual guild mapping.
- **Tests:** Zero automated tests suggests high execution risk on refactors and new features.

**Venture-scale vs service business**
- Looks **product** (multi-tenant, self-serve potential, plans, API) but **onboarding and support** today are service-heavy (Discord setup, super-admin). To look venture-scale: self-serve onboarding, clear pricing, and evidence of repeatable acquisition and retention.

**Evidence still missing**
- Paying pilots or LOIs.
- Retention (e.g. 3-month active).
- Unit economics (CAC, LTV, token cost per lead).
- Clarification: niche profitable SaaS vs venture-scale (market size, moat, team).

**Bootstrappable vs fundable**
- **Bootstrappable:** Yes, if you focus on a narrow segment and fix security; can grow on revenue.
- **Fundable:** Only if you fix critical security, clarify compliance, and show traction and path to large market. Otherwise investors will pass on security and “consultancy risk.”

---

## 4.4 Founder Reality Check

**Possibly underestimated**
- **Single bug = total loss of trust.** One cross-tenant leak would be existential. RLS is not “nice to have” for leads.
- **Operational load** of supporting each clinic (Discord, timezones, “why didn’t the bot answer”).
- **Compliance** if you say “clinics” and a customer stores PHI; investors and customers will assume healthcare rules.

**Possibly building too early**
- Multiple site themes and broad super-admin before one proven funnel and one clear wedge.
- Billing schema and plans before validated pricing and first paying cohort.

**Possibly ignoring (proximity to product)**
- “We always pass clinic_id” — until one route or one repo doesn’t. RLS is insurance.
- Discord as the main channel — what if Discord is blocked or the clinic wants WhatsApp-first?
- Tests “we’ll add later” — later rarely comes; debt compounds.

---

# 5. Risk Table

| ID | Risk | Severity | Likelihood | Impact | Owner |
|----|------|----------|------------|--------|--------|
| R1 | Cross-tenant leak (leads/appointments) | Critical | M | Existential | Engineering |
| R2 | Agent API secret abuse | Critical | L–M | Data integrity, fraud | Engineering |
| R3 | No compliance (HIPAA/GDPR) where required | High | N/A | Blockers, liability | Product/Legal |
| R4 | Webhook failures with no retry | High | M | Lost leads, bad UX | Engineering |
| R5 | No automated tests | High | H | Regressions, slow shipping | Engineering |
| R6 | Impersonation cookie abuse | High | L | Unauthorized access | Engineering |
| R7 | No backup/DR definition | Medium | L | Data loss | Ops |
| R8 | Realtime/DB scale unvalidated | Medium | M | Outages at scale | Engineering |
| R9 | No audit log | Medium | N/A | Compliance, forensics | Engineering |
| R10 | Unit economics unknown | Medium | H | Unprofitable growth | Business |

---

# 6. Fundability Assessment

- **Market:** Vertical SaaS for clinics/salons; wedge is AI + Discord/booking. TAM depends on geography and segment; not validated in repo.
- **Product:** Clear value (lead handling, booking, CRM); differentiator is AI and vertical focus; dependency on Discord and manual setup is a weakness.
- **Team:** Inferred single or small technical team; execution risk is high without tests and security hardening.
- **Traction:** No evidence in code; critical for fundraising.
- **Verdict:** **Conditional.** Fix R1–R2 and clarify R3; add traction and unit economics. Then it can be pitched as early-stage vertical SaaS. As-is, security and compliance gaps would cause most technical investors to pass or ask for remediation before a term sheet.

---

# 7. Prioritized Action Plan

## A. Must fix immediately (security, trust, data integrity, production readiness)
1. **Add RLS on `leads`** (and tenant-scoped write policies where applicable): policy so that only service_role or authenticated users with `user_can_access_clinic(clinic_id)` can read/write. Then audit every code path that touches leads.
2. **Audit all routes and repositories** that use `clinic_id`: ensure no GET/POST/PATCH/DELETE can run without a correct tenant scope (and no route uses user input as clinic_id without validation).
3. **Harden Agent API:** ensure `AGENT_API_SECRET` is not exposed to frontend; log all Agent API requests (clinic_id, source); consider IP or token allowlist for server-to-server only.
4. **Validate super-admin impersonation:** ensure cookie value is a valid clinic_id and only set when session is SUPER_ADMIN; log impersonation events.
5. **Document compliance scope:** state in writing whether you handle PHI and in which regions; if yes, plan for BAA/DPA and access controls; if no, state “not for PHI” clearly.

## B. Must answer before pitching investors
6. **Who is the payer and what is the proof?** (LOI, pilot, churn from alternative.)
7. **Market size and wedge:** How many target clinics; why Discord; what is the plan if they don’t use Discord?
8. **Unit economics:** Token cost per lead, CAC, expected LTV; when does a clinic become profitable for you?
9. **Why this team and why now:** One-pager that an investor can trust.
10. **Consultancy risk:** What makes this a product (self-serve, scalable) rather than a service (hand-holding per clinic).

## C. Must solve before scale
11. **Webhook resilience:** Retry with backoff and/or dead-letter for Discord webhook processing; consider a queue (e.g. Supabase Edge or external) for high volume.
12. **Backup and DR:** Define RPO/RTO; document restore; test once.
13. **Observability:** Structured logging, error tracking, and (if needed) APM for production debugging.
14. **Rate limits and noisy neighbor:** Per-tenant or per-IP limits on API and webhooks; document Supabase Realtime/connection limits.
15. **Real audit log:** Who accessed which resource (at least leads/patients); immutable and queryable.

## D. Nice-to-have later
16. **Automated tests:** Start with critical paths (auth, lead create, tenant isolation); then API and key flows.
17. **Migration pipeline:** Run migrations in CI; version and rollback strategy.
18. **Secrets rotation and scanning:** Procedure and tooling.
19. **EHR/scheduler integration:** If roadmap, design and scope early.
20. **Usage and cost tracking:** Token usage per clinic, for unit economics and overage billing.

---

# Scores and Verdict

| Score | Value | Notes |
|-------|--------|------|
| **Architecture (0–10)** | **6** | Clear structure and tenant model; missing RLS on leads, tests, and resilience patterns. |
| **Security readiness (0–10)** | **4** | Auth and webhook secret in place; tenant isolation is app-only on critical tables; no compliance layer; no audit log. |
| **Fundability (0–10)** | **5** | Interesting vertical and product; security and compliance gaps and lack of traction evidence would make investors pause. |

**Single-sentence blunt verdict:**  
You have a coherent multi-tenant product and an honest view of its gaps, but **until leads (and tenant-sensitive writes) are protected by RLS and compliance scope is clear, one mistake or one compliance question could kill the business** — fix tenant isolation and answer “who pays and what proof do we have” before raising or scaling.

---

*This evaluation is based on the codebase and `DEEP_QUESTIONNAIRE_ANSWERS.md` as of the review date. Update as you add RLS, tests, compliance, and traction.*
