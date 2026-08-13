# SwipeHire — Phase 1 Production Readiness Audit (STEP 0)

Audit of the repository as it stands (no code changed in this step). Much of the
production path was wired earlier this cycle; this map reflects the real state.

Legend: ✅ EXISTS & WORKS · 🟡 EXISTS BUT PARTIAL · 🧪 MOCK/DEMO · ❌ MISSING · 🔒 SECURITY/TRUST RISK

---

## Implementation map

### Auth
- ✅ Real signup / login / logout / session persistence / refresh (Supabase, `auth.service`).
- ✅ AuthGate gates the app when configured; role derived from `profiles.role` (not frontend state).
- ✅ Dual-mode: demo (no env) keeps role-select; configured requires a real session.
- 🟡 Email confirmation is a Supabase project setting (user-controlled). No MFA (not required Phase 1).

### Database (28 tables, migrations 003–008 applied)
- ✅ profiles, candidate_profiles, employer_profiles, companies, jobs, applications,
  saved_candidates, saved_jobs, conversations, conversation_members, messages,
  verification_requests, user_consents, reports, audit_logs, account_deletion_requests.
- ✅ Billing: billing_products/prices, employer_subscriptions, subscription_usage,
  payment_orders/transactions, entitlements, invoices, refunds, payment_events, job_seeker_purchases.
- 🟡 candidate experience/education/skills/certificates = JSONB columns on candidate_profiles
  (equivalent to the suggested separate tables; not duplicated — acceptable Phase 1).
- ❌ MISSING: `notifications`, `company_members` (team), `offers`, `usage_events`.

### RLS / Security
- ✅ RLS enabled on every table; default-deny writes on billing; SECURITY DEFINER functions
  hardened (pinned search_path, PUBLIC revoked, service-role-only where needed — verified live).
- ✅ No service-role key or secret in client code. `VITE_*` = only public values (URL, anon key,
  legal config, billing flag).
- ✅ Candidate/employer/tenant isolation verified live (owns_company gate; cross-tenant SQL test passed).
- 🔒 **Employer verification is client-set** (`setEmpVerified(true)` in CompanyVerifyWizard) — gates UI
  only, NOT server-enforced. `verification_requests` exists but is not the source of truth.
- 🔒 **Legacy seeker PRO** flips `subscribed=true` in the client (demo unlock). UI-only, but a
  client-granted unlock path that should be quarantined/removed for production.

### Storage
- ✅ Buckets defined with per-user folder RLS (avatars public; cv-pdfs/videos/certificates/identity private).
- ✅ Candidate avatar → public URL in feed; CV + video → private buckets; paths persisted.
- 🟡 Employer viewing candidate CV/video via **signed URL not wired** (`get-document-url` edge fn exists).
- 🟡 Upload validation: `checkUpload`/service validate type/size; duration validation for video not enforced.

### Jobs
- ✅ Employer posts real jobs (company auto-ensured); seeker feed loads real active jobs; server timestamps; limits.
- 🟡 Status field supports active/paused/closed but UI only creates `active` (no draft/publish/close UI).

### Applications
- ✅ Seeker right-swipe creates an application; `unique(job_id, candidate_id)` prevents duplicates.
- ✅ Employer ApplicantsPanel lists applicants and advances status (submitted→…→hired/rejected).
- 🟡 A **second, localStorage pipeline** (`swipehire_stages`) still drives the employer feed's stage UI,
  separate from the real `applications.status`. Two sources of truth.

### Messaging
- ✅ conversations/members/messages with RLS; `start_conversation` RPC; ChatPanel (list + thread + send + 4s poll).
- 🟡 No unread state, no realtime subscription (polling only), no per-conversation participant name (profile RLS).

### Billing
- ✅ Sandbox provider (never auto-succeeds; verify-gated); backend foundation (orders/entitlements/verify/grant,
  service-role only) live-tested; adapter flag-gated (sandbox default).
- 🧪 **No production payment provider** — nothing can actually be purchased; sandbox clearly labelled.
- 🔒 Legacy seeker `subscribed` client-unlock (see RLS/Security).

### Notifications
- ❌ MISSING entirely (no table, no UI).

### localStorage authoritative usage
- Harmless: `swipehire_lang`, `swipehire_theme`, `swipehire_role` (demo fallback).
- 🟡 Dual (synced to DB when configured): `swipehire_seeker`(+meta), `swipehire_emp`, `swipehire_saved`.
- 🔒 localStorage-only authoritative: `swipehire_stages` (pipeline), `swipehire_notes` (employer notes),
  `swipehire_reports`. These should move to / read from the DB for production.

### Tests
- ✅ 140 unit tests (services, billing, payments, finance, lib). Static SQL security assertions (33).
- 🟡 No automated RLS/integration tests in CI (RLS verified via manual SQL E2E, which passed).

### Android / Build
- ✅ Release signing config (keystore.properties, gitignored); Play launch guide + privacy policy.
- 🟡 Not built to AAB / tested on device in this environment (no Android SDK/keystore here).

---

## Production readiness scores (current)
| Area | Score | Why not higher |
|---|---|---|
| Authentication | 8/10 | Solid; email-confirm config + protected flows are user-side; no MFA. |
| Database | 8/10 | Strong schema; missing notifications/company_members/offers/usage_events. |
| RLS / Security | 7/10 | Excellent isolation, but client-set verification + legacy client subscribe. |
| Storage | 7/10 | Uploads work; employer signed-URL viewing + duration validation missing. |
| Jobs | 7/10 | Real; no draft/close UI. |
| Applications | 6/10 | Real apply + status flow; duplicate localStorage pipeline. |
| Messaging | 7/10 | Real + RLS; no unread/realtime. |
| Billing | 5/10 | Correct + safe, but no live provider (nothing purchasable). |
| Notifications | 0/10 | Not implemented. |
| Android | 5/10 | Configured; not built/tested on device here. |
| **Overall** | **~64/100** | Core hiring loop real & secure; gaps in notifications, verification enforcement, billing provider, pipeline unification. |

---

## Independent work I can do now (no external credentials)
1. `notifications` table + RLS + in-app notification read/create (STEP 8).
2. **Server-enforce employer verification**: stop trusting client `empVerified`; drive UI from
   `verification_requests`/`companies.verified` (admin-set). Quarantine the client `setEmpVerified(true)`.
3. Unify the pipeline: employer stages read/write `applications.status` (remove localStorage duplication)
   and saved → `saved_candidates`.
4. Wire employer CV/video viewing via `get-document-url` signed URLs.
5. Additive migration for `company_members` (team) + `offers` + `notifications` + `usage_events`.
6. Draft/publish/close job UI on the existing `jobs.status`.
7. More tests (RLS-shaped assertions, entitlement, pipeline).

## Blocked — requires external credentials / your decision
- **Payment provider** (QPay/SocialPay/card) → real billing. App-store billing policy.
- **SMS** (phone verification), **Email** (transactional), **Push** (FCM/APNs) providers.
- **Identity/company registry** verification data source.
- **AI provider** (Phase 3) — out of Phase 1 scope.
- Android AAB build + Play Console (account, keystore) — your machine.

## Manual actions for you
- Supabase Auth: set email-confirmation policy + auth redirect URLs for production.
- Provide (later) payment/SMS/email/push provider credentials when ready.
- Perform Play Console account + keystore steps (guide in docs/PLAY_STORE_LAUNCH.md).
