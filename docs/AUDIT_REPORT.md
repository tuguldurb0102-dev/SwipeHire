# SwipeHire — Supabase Foundation Sprint · Audit Report

Date: sprint completion · Branch merged: `develop` → `main` · Tag: `v0.2-supabase-foundation`

> **Honesty statement.** No step was run against a live Supabase project. The
> project in `.env` (`cgicuqvgcwxtkctusteb.supabase.co`) **no longer resolves**
> (DNS: non-existent domain), so authentication, RLS and storage could not be
> verified against a live server. Everything marked "verified" below was
> verified locally (build, unit tests, secret scans). Everything requiring a
> database is marked **Requires real Supabase credentials**.

---

## What was delivered

### Service layer (`src/services/`)
`supabase/client.js` (the only `createClient`), `supabase/errors.js`, and
`auth`, `profile`, `job`, `application`, `message`, `report`, `consent`,
`storage`, `account` services. UI never imports Supabase directly — verified
by `git grep`.

### Database (`supabase/migrations/`)
- `003_production_schema.sql` — 17 tables, UUID PKs, FKs with explicit delete
  behaviour, check constraints on every enum, indexes, `updated_at` triggers.
- `004_rls_and_triggers.sql` — RLS enabled and **forced** on all 17 tables,
  role helpers (SECURITY DEFINER), signup trigger, `start_conversation` RPC,
  6 storage buckets with owner-scoped policies.
- `supabase/tests/rls_attack_tests.sql` — 10 attack scenarios.

### Code fixes verified locally
- AI payload minimised — name/age/location/salary removed; unit-checked.
- 18+ age gate across UI, privacy policy, terms; browser-verified.
- CV bytes no longer written to localStorage.
- Match scoring and upload validation extracted to `src/lib/` with 41 tests.

---

## Tables created (17)

profiles · candidate_profiles · employer_profiles · companies · jobs ·
applications · saved_jobs · saved_candidates · conversations ·
conversation_members · messages · blocked_users · reports · user_consents ·
verification_requests · account_deletion_requests · audit_logs

## Storage buckets (6)

avatars (public) · company-logos (public) · videos (private) ·
cv-pdfs (private) · certificates (private) · identity (private)

## RLS policies

~40 policies across all tables plus 18 storage-object policies. Escalation
paths explicitly closed: self-promotion to admin, self-approved verification,
cross-company job edits, candidate editing the decision, employer editing
candidate content, reading a non-member conversation, reading the moderation
queue, downloading another user's private files.

---

## Results

| Check | Result |
|---|---|
| Build (`npm run build`) | ✅ pass |
| Unit tests (`npm test`) | ✅ **41 passed / 41** |
| Dependency audit (`npm audit`) | ✅ **0 vulnerabilities** |
| Secret scan (service-role / tokens / keys) | ✅ none in tracked code |
| Direct Supabase in UI | ✅ none (`createClient` in 1 file) |
| Lint | ⚠️ no linter configured (not set up this sprint) |
| Type check | ⚠️ project is JS, no TypeScript |
| RLS live verification | ❌ **Requires real Supabase credentials** |
| Auth against live server | ❌ **Requires real Supabase credentials** |
| Storage upload live | ❌ **Requires real Supabase credentials** |

---

## Remaining production blockers

1. **Create a live Supabase project**, run migrations 003+004, run the RLS
   attack tests, confirm 10 PASS. (docs/SUPABASE_SETUP.md)
2. **Wire the UI to the services.** The service layer and migrations exist,
   but `SwipeHire.jsx` still persists to localStorage. Replacing each
   persistence point with the matching service is the next sprint.
3. **Edge Functions** for privileged actions: verification approval, account
   deletion (auth.users erasure + storage cleanup), signed-URL issuance for
   private documents.
4. **Email/SMTP** configured; confirmation + reset templates in Mongolian.
5. **Lint/type tooling** — add ESLint; consider TypeScript or JSDoc types.

## Remaining legal blockers

1. Privacy policy and terms are **templates** — a Mongolian-qualified lawyer
   must review and the `[bracketed]` fields must be completed.
2. Identity verification requires a real provider + contract.
3. Data-retention automation (the `purge_inactive_seekers` function exists but
   must be scheduled).

## External dependencies

Supabase (Postgres, Auth, Storage, Edge Functions) · a Gemini key in Edge
Function secrets for AI summaries · an SMTP provider · a legal reviewer · an
identity-verification provider.

## Environment variables

`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (frontend). `GEMINI_API_KEY`
and the service-role key live only in Edge Function secrets — never frontend.
