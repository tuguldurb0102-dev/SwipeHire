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

## 8. Remaining launch blockers

1. Supabase restored → apply `005_billing.sql`, deploy payment Edge Functions.
2. At least one real provider configured + verified server-side.
3. App-store billing (Apple IAP / Google Play) policy decision & integration.
4. Usage counters before any plan limit is enforced (none exist today).
5. Real invoices/receipts replacing the mock `INVOICES`.
