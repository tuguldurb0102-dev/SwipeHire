# SwipeHire — Multi-Product Architecture & Audit

Audit performed before any implementation, as required. This document is the
plan; no product code is written until the direction below is confirmed.

---

## Part 1 — Audit of the current project

### 1.1 What exists today

| Area | Reality |
|---|---|
| **Mobile app** | `SwipeHire.jsx` — a single **15,016-line** file. All screens, styles and logic live here. React 19 + Vite + Capacitor (Android). |
| **Entry** | `main.jsx` → `App` from `SwipeHire.jsx`. `index.html`, `vite.config.js` (`base: './'`, single `dist`). |
| **Service layer** | `src/services/` — 11 files (auth, profile, job, application, message, report, consent, storage, account) + `supabase/client.js`, `errors.js`. **Framework-agnostic** — no React inside. |
| **Pure logic** | `src/lib/` — `matching.js`, `uploads.js` with unit tests (41 passing). |
| **Config** | `src/config/legal.js`. |
| **Database** | `supabase/migrations/003+004` — 17 tables, RLS forced on all, roles `candidate / employer / admin`, storage buckets, triggers, RPC. |
| **Edge Functions** | account-deletion, review-verification, get-document-url, generate-candidate-summary. |
| **Design system** | CSS tokens live **inside** the `Style()` component in `SwipeHire.jsx` (dark black + orange). Not currently importable by another app. |

### 1.2 Existing employer functionality in the mobile app — **PRESERVE**

These components stay exactly as they are (verified by audit):

`CompanyVerifyWizard` · `EmployerProfilePanel` · `FinancePanel` (employer
billing only) · `AIRecruiterPanel` · `EmployerInsightsDashboard` ·
`PaywallSheet` · `ProfileDetail` · `CandidateCard` · `ContactSheet`, plus the
employer feed / swipe / save / pipeline / contact flow.

### 1.3 Reusable assets (the leverage for the new products)

- **`src/services/*`** — already framework-agnostic. The employer website and
  admin site can import these **unchanged**. This is the single biggest reuse
  win and means we do **not** duplicate data access.
- **`src/lib/matching.js`** — deterministic scoring, reusable on web.
- **Supabase project + schema** — one backend for all three products.
- **Edge Functions** — shared privileged operations.

### 1.4 What is NOT reusable as-is (needs extraction)

- The design tokens are embedded in a JSX `<style>` string, not a file another
  app can import. → extract to a shared stylesheet/package.
- All UI components are coupled to the single mobile file. The web apps will
  need their **own** components (desktop layouts differ fundamentally); they
  reuse the **services and tokens**, not the mobile screens.

---

## Part 2 — Target architecture

Three products, **one backend**, shared code via a workspace. Nothing about
the mobile app's runtime behaviour changes.

```
swipehire/                      (git root — becomes an npm workspace)
├── apps/
│   ├── mobile/                 ← the CURRENT app, moved intact
│   │   ├── SwipeHire.jsx       (unchanged)
│   │   ├── main.jsx, index.html, capacitor.config.json, android/
│   │   └── vite.config.js
│   ├── employer-web/           ← NEW — employer desktop dashboard
│   └── admin-web/              ← NEW — internal staff + Financial Center
│
├── packages/
│   ├── services/               ← MOVED from src/services (shared, unchanged API)
│   ├── core/                   ← MOVED from src/lib + src/config
│   ├── ui/                     ← EXTRACTED design tokens + shared primitives
│   └── finance/                ← NEW — revenue/cost/KPI/simulator (pure, testable)
│
├── supabase/                   ← shared: migrations, functions, tests
└── docs/
```

**Why a workspace and not three copies:** the service layer and schema are
already shared truth. Copying them would create three drifting versions of the
auth/RLS logic — the exact class of bug this project has fought. One backend,
one service layer, three front-ends.

**Migration safety:** moving the mobile app into `apps/mobile/` is a *file move*,
not a rewrite. Capacitor paths and `vite.config` update accordingly; the app
code is byte-identical. This is the one structural change and it is reversible
(the `backup/pre-live-supabase-wiring` branch + tags remain).

> If you prefer **zero movement of the mobile app**, the fallback is to add
> `apps/employer-web` and `apps/admin-web` as siblings that import services via
> relative paths, leaving the mobile app's folder untouched. Slightly messier
> imports, but the mobile app is not touched at all. **This is a decision you
> should make** — see Part 6.

---

## Part 3 — Employer Website (`apps/employer-web`)

Desktop-first, tablet/mobile responsive. Same Supabase employer account.
**Everything the mobile employer module has, plus** the professional tooling:

**Dashboards** — Executive · Recruitment · Candidate Analytics
**Sourcing** — Advanced search · AI search · filters · saved candidates ·
candidate comparison · candidate timeline · Video CV player · Talent Passport detail
**Hiring** — Pipeline · open jobs · applications · offers · hires · interview calendar
**Team** — members · activity timeline · roles/permissions
**Analytics** — AI matching stats · source analytics · time-to-hire · cost-per-hire ·
conversion funnel · recruiter productivity
**Company** — verification · settings · notifications · audit history
**Billing (employer-only)** — current plan (Starter/Professional/Business/Enterprise) ·
status · renewal · invoices · payment history · usage & remaining limits ·
upgrade/downgrade/cancel · auto-renewal · contact/job-posting/AI usage
**Export** — Excel · PDF · CSV

Reuses `packages/services` for all data; new desktop components in the shared
design language.

---

## Part 4 — Internal Admin Website (`apps/admin-web`)

Completely separate. Only SwipeHire staff. No employer or seeker can reach it —
enforced by **role + RLS**, not a frontend flag.

**Financial Center** (never in employer app or mobile):
Revenue (employer subs + seeker AI) · MRR · ARR · monthly/annual revenue ·
gross/operating/net profit · margin · burn rate · runway · cash flow · ROI ·
break-even · forecast · growth · **CAC · LTV · ARPU · LTV/CAC**.

**AI Cost Center:** provider · model · input/output tokens · cost per request /
employer / seeker · daily & monthly cost · AI revenue · AI profit.

**What-If Simulator:** live recalculation of every KPI as the finance admin
changes employer count, pricing, growth, marketing/salary/AI/cloud cost, seeker
purchases, employer mix, conversion. Built as a **pure function** in
`packages/finance` (fully unit-testable, no backend needed to prove correctness).

**Seed model** from the brief (100 employers 60/30/10, 1,000 seekers, 1 AI
purchase/mo, the listed cost lines, 30M investment) ships as the simulator's
default scenario.

**Moderation/ops** (extends existing schema): reports queue, verification
review, account-deletion processing — the Edge Functions already exist.

---

## Part 5 — Security model (roles to add)

Current DB roles: `candidate · employer · admin`. The brief requires finer
grain. Proposed **additive** migration (does not alter existing rows):

```
candidate · employer · employer_team_member ·
finance_admin · operations_admin · super_admin · founder
```

- Employer-website access requires `employer` or `employer_team_member`, scoped
  to their company by existing RLS.
- Admin-website access requires one of the staff roles; the Financial Center is
  gated to `finance_admin / super_admin / founder`.
- Role is resolved server-side (as today via `profiles.role` + SECURITY DEFINER
  helpers); **never** a frontend boolean. New RLS policies are added, existing
  ones untouched.

---

## Part 6 — Decisions needed before building

1. **Repo shape:** workspace with the mobile app moved into `apps/mobile/`
   (clean, recommended) **vs** siblings-only (mobile folder untouched, messier
   imports). This is the one choice that affects the working app's layout.
2. **Build order:** Financial Center first (self-contained, high-value, pure
   math — provable without a live backend) **vs** Employer Website first
   (needs live Supabase, which is currently blocked — the project in `.env` is
   deleted).
3. **Live Supabase:** the employer website and admin data views need a live
   project + credentials, which are **not currently available** (CLI token does
   not reach the tool shell). The **Financial Center simulator** is the one
   large piece buildable and testable **now**, with zero backend.

---

## Part 7 — Recommended phased plan

| Phase | Deliverable | Needs live Supabase? |
|---|---|---|
| 0 | This audit + workspace scaffolding decision | No |
| 1 | Extract `packages/services`, `core`, `ui`, `finance` (no behaviour change) | No |
| 2 | **`packages/finance`** — revenue/cost/KPI + What-If simulator, unit-tested | No |
| 3 | `apps/admin-web` shell + Financial Center UI on the simulator | No |
| 4 | Additive role migration + RLS for staff/team roles | Live |
| 5 | `apps/employer-web` shell + dashboards wired to `packages/services` | Live |
| 6 | Employer analytics, exports, billing views | Live |
| 7 | Admin moderation/verification wired to Edge Functions | Live |

**Highest-value, buildable-now:** Phase 2 (finance engine) — deterministic,
fully testable, and the core of the Financial Center. Recommended starting
point while live Supabase is unavailable.

---

## Guarantees

- Mobile app employer + seeker modules: **unchanged**. No feature removed,
  simplified or redesigned.
- No Job Seeker web dashboard is created (public marketing site only, later).
- One backend, one service layer, one design system across all three products.
- Nothing merged to `main` or tagged until the relevant tests actually pass.
