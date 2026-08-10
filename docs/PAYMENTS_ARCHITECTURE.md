# SwipeHire — In-App Payments & Billing Architecture

Scope: the **mobile app** only (Job Seeker + Employer roles). This document is
the design of record for the payment/billing layer. It does **not** describe
the internal admin site or any company-wide finance dashboard — those are out
of scope for this phase and must never appear in the app.

---

## 1. Current state (audit result)

| Area | Reality today |
|---|---|
| Paywall | One generic "SwipeHire PRO" upsell (`PaywallSheet`), monthly ₮49k/249k/399k. |
| Subscribe | `onSubscribe → setSubscribed(true)` — instant unlock, **no payment, no verification**. |
| Persistence | Local React state, resets on reload. Not in DB. |
| Invoices | Hardcoded mock array (`INVOICES`). |
| Employer limits | Only a 3-swipe demo gate. No candidate-view/contact/job-post/AI/team counters. |
| Seeker per-service AI | Does not exist. |
| DB billing tables | None (17 tables, none for plans/subscriptions/payments/invoices/entitlements). |
| Payment provider | None. No QPay/adapter/payment service. |
| Supabase | Currently unreachable (project deleted). Backend half cannot be built/verified now. |

**Everything money-related in the app today is mock or faked.** The work below
replaces the faked path with a verify-gated one, and builds the real pieces
that don't need a backend now.

---

## 2. Layers

```
UI (SwipeHire.jsx)  →  src/billing (catalog + entitlements, pure)
                    →  src/payments (provider adapter + sandbox)
                    →  [FUTURE] Supabase Edge Functions  →  Postgres (billing tables)
```

- **`src/billing/catalog.js`** — user-facing plans & services (prices, limits as
  display metadata). Single source of truth for price lookups.
- **`src/billing/entitlements.js`** — pure functions deriving access/credits
  from **verified** orders only. `activeEmployerPlan`, `serviceCredits`,
  `purchaseDisplayState`.
- **`src/payments/PaymentProvider.js`** — adapter interface every backend
  implements: `createPayment / checkPaymentStatus / verifyPayment /
  cancelPayment / refundPayment / getReceipt`.
- **`src/payments/sandboxProvider.js`** — dev-only demo. Never auto-succeeds;
  status advances only via an explicit `resolve()`. Labelled "Demo / Sandbox".
- **`src/payments/index.js`** — registry. QPay/SocialPay/StorePay/card/Apple
  IAP/Play Billing declared but `connected:false`.

---

## 3. Payment flow (entitlement granted only after verified success)

1. Select plan/service → 2. Review order → 3. Show price (from catalog) →
4. Accept Terms & Privacy → 5. Choose payment method → 6. Start payment
(`createPayment`, with **idempotency key**) → 7. Verify (`verifyPayment` /
poll `checkPaymentStatus` until terminal) → 8. Success or failure →
9. Receipt → 10. **Grant entitlement only when verified `paid`.**

Clicking "Pay" never unlocks anything. Entitlement is a function of confirmed
order status (`src/billing/entitlements.js`), not of a button press.

---

## 4. Security model (enforced when Supabase is live)

- **Never trust the client price or plan/service id.** The Edge Function
  re-derives the amount from the catalog server-side (`catalogPrice`).
- **Never store payment secret keys in `VITE_*`.** Provider secrets live only
  in Edge Function env.
- **Verification is server-side only.** React never decides "paid".
- **Idempotency keys** on order creation prevent duplicate charges / duplicate
  entitlements.
- Server responsibilities: create orders, validate price, verify provider
  responses, create subscriptions, grant entitlements, create invoices, process
  refunds, log payment events.

---

## 5. App-store billing requirement (must review before production mobile pay)

Digital services sold **inside** an iOS or Android app may be required to use
**Apple In-App Purchase** or **Google Play Billing** rather than an external
processor, depending on the service type and current store policy. This affects
the job-seeker AI services and any employer plan purchased in-app.

**Do not finalize a QPay-only mobile payment architecture** without reviewing
store policy. The adapter layer is built so store billing (Apple IAP / Play
Billing) and external providers (QPay, etc.) can coexist — the registry already
reserves slots for all of them. Selecting the correct rail per platform/service
is a policy decision to make before launch. **Open launch blocker.**

---

## 6. Database design (write now, apply when Supabase returns)

Additive migration `005_billing.sql` (not applied while Supabase is down):

`plans · plan_features · subscriptions · subscription_usage · payment_orders ·
payment_transactions · invoices · job_seeker_services · job_seeker_purchases ·
entitlements · refunds · payment_events`

Status enum: `pending · processing · paid · failed · cancelled · expired ·
refunded · partially_refunded`. RLS scopes rows to the owning company/user.
No duplicate of existing tables.

---

## 7. What is real vs demo right now

| Piece | Status |
|---|---|
| Catalog (plans, services, prices) | Real data, tested. |
| Entitlement logic | Real, pure, tested. |
| Provider interface | Real contract. |
| Sandbox provider | **Demo only — not a real payment.** Clearly labelled in UI. |
| QPay/SocialPay/StorePay/card/IAP/Play | Declared, **not connected**. |
| Orders/subscriptions/invoices in DB | Designed, **not applied** (Supabase down). |
| Edge Functions | Specified, **not deployed**. |

---

## 8. Backend foundation (Step 7A — created, NOT applied)

Migration `supabase/migrations/005_billing_foundation.sql` adds the secure
backend. It has been written and statically verified (30 assertions in
`src/billing/__tests__/backend-foundation.test.js`) but **not applied** —
Supabase is not linked and there is no local DB in this environment.

### 8.1 Tables
`billing_products`, `billing_prices` (server catalog) · `employer_subscriptions`
· `subscription_usage` · `payment_orders` · `payment_transactions` ·
`job_seeker_purchases` · `entitlements` · `invoices` · `refunds` ·
`payment_events`.

### 8.2 RLS ownership model
RLS is enabled on all 11 tables with **default-deny writes** (no
INSERT/UPDATE/DELETE policies exist). Reads only:
- Catalog: public read of `active` rows.
- User-scoped (`user_id = auth.uid()`): own payment orders, job-seeker
  purchases, user entitlements, invoices, and (via parent order) transactions/
  refunds.
- Company-scoped: the caller must **own** the company. There is **no
  company_memberships table** in this schema, so access uses the existing
  `public.owns_company(uuid)` helper — the requested `owner/admin/billing_admin`
  membership roles do not exist and were not invented.
- Staff: `public.is_admin()` (from `profiles.role = 'admin'`).
- `payment_transactions.provider_payload` and `payment_events` are never
  client-readable (admin-only).

### 8.3 Service-role boundary
All sensitive writes happen through the service role (which bypasses RLS) and
four SECURITY DEFINER functions with pinned `search_path`, `PUBLIC` execute
revoked:
- `create_payment_order_request` — granted to `authenticated`.
- `consume_service_entitlement` — granted to `authenticated`.
- `grant_verified_entitlement` — **service-role only** (no `authenticated`
  grant).
- `increment_subscription_usage` — **service-role only**.

### 8.4 Price validation flow
Client sends only a product **code** + optional company + idempotency key. The
DB function looks up the active `billing_prices.amount` server-side; there is no
`p_amount` parameter anywhere. Enterprise has **no price row** and is explicitly
rejected from automated checkout.

### 8.5 Idempotency strategy
`payment_orders` has a unique index on `(user_id, provider, idempotency_key)`.
`create_payment_order_request` returns the existing order on a repeat key.
`payment_events` de-dupes provider events by `(provider, provider_event_id)`.

### 8.6 Entitlement grant flow
`grant_verified_entitlement(order)` runs only when `order.status = 'paid'`, is
idempotent via `entitlements.unique(source_type, source_id)`, and creates either
an active `employer_subscriptions` row (+ company entitlement) or a
`job_seeker_purchases` row (+ user service-credit entitlement).

### 8.7 Credit consumption flow
`consume_service_entitlement` locks the row (`for update`), verifies it is an
active, unexpired, unrevoked, user-owned credit with `consumed_quantity <
quantity`, then atomically increments and flips to `used`. Single-use is
enforced in SQL.

### 8.8 Refund / revocation flow
`refunds` records provider refund lifecycle; a refunded order should drive its
entitlement `status` to `revoked`/`refunded` (wired in a later step alongside
the refund Edge Function).

### 8.9 Provider status
Only `sandbox` is enabled in `create-payment-order`. `verify-payment` returns
`provider_not_configured` (HTTP 501) for qpay/socialpay/storepay/card/apple_iap/
play_billing and does **not** fabricate a paid status for sandbox — it grants
only when the order is already `paid` server-side.

### 8.10 Applied / verification status (updated 2026-08-10)
- Supabase project: **LINKED** to a fresh project (ref `eltwjnnoiblmpsvensas`).
- **Migration history cleanup:** the repo previously carried two incompatible
  schemas — `001_initial`/`002_tighten_rls` were an abandoned prototype (tables
  `seeker_profiles`, `skill_tests`, a `profiles` **without** `status`, …) that
  conflicted with the production schema in `003`. Applying them in sequence
  failed at `004` (`column "status" does not exist`). `001`/`002` were
  **deleted**; the base chain is now `003 → 004 → 005 (→ 006)`.
- **Migration applied remotely: YES (2026-08-10).** Remote versions:
  `003, 004, 005, 006`.
- `006_billing_grants_fix.sql`: fixes an over-grant introduced by the schema
  reset's `alter default privileges … grant … on functions to anon,
  authenticated`. Re-asserts least privilege so the service-role-only functions
  are not client-callable.
- **Live verification (SQL Editor): PASS**
  - 11 billing tables present; RLS enabled on all 11.
  - 10 products, 9 active prices; `professional` = 3,990,000; Enterprise has
    **no** price row.
  - 4 functions are `SECURITY DEFINER`.
  - Post-006 execute privileges: `create_payment_order_request` +
    `consume_service_entitlement` → authenticated only; `grant_verified_
    entitlement` + `increment_subscription_usage` → **neither anon nor
    authenticated** (service-role only). anon cannot execute any.
- Static SQL verification: **PASS** (33 assertions).
- Type generation: **DONE** → `src/billing/db-types.ts` (all 11 tables + 4
  functions present).
- Behavioural RLS-as-user tests (create order / consume once / cross-tenant
  reads): **not yet run live** — deferred to Step 7B via the Edge Functions.
- Edge Functions: **DEPLOYED (2026-08-10)** — `create-payment-order`,
  `verify-payment`, `consume-entitlement` on project `eltwjnnoiblmpsvensas`.
  Supabase auto-injects `SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY`; no secrets
  committed. Live boundary check: an unauthenticated call to
  `create-payment-order` returns HTTP 401 `{"error":"not_authenticated"}` — the
  auth guard works over HTTP and creates no order.
- Backend adapter: `src/payments/supabaseProvider.js` implements the
  `PaymentProvider` interface against the Edge Functions/RPCs. It is **opt-in**
  via `VITE_BILLING_BACKEND=supabase`; the sandbox remains the default provider,
  so the UI and existing tests are unaffected until the live path is verified
  end-to-end.
- Frontend still uses the sandbox path unchanged; no production UI wired.

### 8.11 Step 7B status
- ✅ Edge Functions deployed; unauthenticated boundary verified live.
- ✅ Flag-gated Supabase provider added + unit-tested (sandbox still default).
- ✅ **End-to-end live DB test PASSED** (2026-08-10) against the deployed
  functions, run as a real test user via a transactional SQL fixture:
  server-derived price (3,000), idempotent order, Enterprise rejected, grant
  idempotency (one entitlement per order), single-use consume (second blocked),
  negative usage rejected. The fixture creates and cleans up its own test user.
- 🐞 The live run surfaced two real bugs in 005's functions — RETURNS TABLE OUT
  variables colliding with same-named table columns (`provider`, then
  `status`/`consumed_quantity`/`quantity`). Fixed forward in `007` (qualify the
  idempotency lookup) and `008` (`#variable_conflict use_column`). Both applied;
  the E2E test then passed clean.
- ✅ **Employer + cross-tenant live test PASSED** (2026-08-10): employer-plan
  order priced server-side at 3,990,000; verified grant creates an active
  `employer_subscriptions` row; `owns_company()` (the predicate behind every
  company-scoped RLS read) is true for the owner and false for another
  employer; a non-owner is rejected from ordering for that company. Fixture
  self-cleans.
- ⏳ Remaining (Step 7C — deliberately NOT done yet): the app does not wire
  Supabase auth into the billing UI, so setting `VITE_BILLING_BACKEND=supabase`
  now would make PaymentFlow call the Edge Functions without a user session and
  get 401, breaking the sandbox demo. The flag flip must come together with
  app-level auth wiring for the billing flow — a separate step. Sandbox stays
  the default until then.

## 9. Remaining launch blockers

1. Link Supabase, apply `005_billing_foundation.sql`, deploy the three Edge
   Functions (`create-payment-order`, `verify-payment`, `consume-entitlement`).
2. Run live RLS/function tests (pgTAP) against a real DB.
3. Generate DB TypeScript types.
4. At least one real provider configured + verified server-side.
5. App-store billing (Apple IAP / Google Play) policy decision & integration.
6. Usage counters wired to `increment_subscription_usage` before enforcing any
   plan limit.
7. Real invoices/receipts replacing the mock `INVOICES`; refund→revocation
   wiring.
8. Step 7B: point the frontend adapter at the backend behind a flag, keeping
   sandbox as default until verified.
