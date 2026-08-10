# Billing Backend Deployment (Step 7A → live)

Exact steps to apply the billing foundation once Supabase is reachable. **No
secrets belong in this file or in the repo.** Everything below is run by an
operator with the project's credentials.

> **Status (updated 2026-08-10): APPLIED.** Linked to project
> `eltwjnnoiblmpsvensas`. Remote migrations `003, 004, 005, 006` applied and
> live-verified. Types generated to `src/billing/db-types.ts`. Edge Functions
> scaffolded but **not deployed**; no real provider connected.
>
> **History note:** prototype migrations `001_initial` / `002_tighten_rls`
> conflicted with the production schema (`003`) — a `profiles` table without a
> `status` column caused `004` to fail. They were removed; base chain is now
> `003 → 004 → 005 → 006`. On a fresh/empty project the remote public schema was
> wiped (`drop schema public cascade; create schema public; …`) and the clean
> chain pushed. `006` corrects a function over-grant caused by the reset's
> default privileges.

---

## 1. Prerequisites
- Supabase CLI (`supabase --version` → 2.110.0 confirmed).
- Docker Desktop running (only for local testing via `supabase start`).
- The project ref and a personal access token (kept out of the repo).

## 2. Log in
```bash
supabase login   # opens browser, or: supabase login --token <PAT>  (never commit the PAT)
```

## 3. Link the project
```bash
supabase link --project-ref <PROJECT_REF>
```
This writes `supabase/.temp/` (git-ignored). Do not commit it.

## 4. Local migration test (recommended before remote)
```bash
supabase start                      # spins up local Postgres + services
supabase db reset                   # applies ALL migrations incl. 005 to local
supabase db lint                    # static + connected lint
# optional: run pgTAP / SQL assertions here against the local DB
supabase stop
```
`db reset` is destructive **to the local DB only**. Never run it against remote.

## 5. Deploy the migration remotely
```bash
supabase db push                    # applies pending migrations to the linked project
```
- `005_billing_foundation.sql` is **additive** (new tables/functions/seed) and
  wrapped in a single `begin; … commit;`. It creates no destructive DDL against
  existing tables.
- Re-runnable: tables use `create table if not exists`; seeds use
  `on conflict do nothing`; policies use `drop policy if exists` then `create`.

## 6. Generate TypeScript types
```bash
supabase gen types typescript --linked > src/billing/db-types.ts
```
Do not hand-write this file. Commit the generated output separately.

## 7. Edge Function secrets (never committed)
```bash
supabase secrets set SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=...
# ALLOWED_ORIGIN optional (defaults to *)
# Real provider secrets (QPay/etc.) are added ONLY when that provider is enabled.
```
`SUPABASE_SERVICE_ROLE_KEY` is server-only — never a `VITE_` variable, never in
the client bundle.

## 8. Deploy Edge Functions
```bash
supabase functions deploy create-payment-order
supabase functions deploy verify-payment
supabase functions deploy consume-entitlement
```
All three authenticate the caller from their JWT and call the SECURITY DEFINER
DB functions. Real providers return `provider_not_configured` until enabled.

## 9. Post-deployment verification
- `select code, kind from billing_products order by kind, code;` → 10 rows.
- `select p.code, pr.amount from billing_prices pr join billing_products p on p.id=pr.product_id;`
  → 9 rows (no `enterprise`).
- As a normal user: `select * from payment_orders;` returns only own rows;
  attempting `insert into payment_orders …` is **denied** by RLS.
- Call `create-payment-order` with a valid product code → an order in `created`
  status with the server price; a client-sent amount has no effect.
- Confirm `grant_verified_entitlement` / `increment_subscription_usage` are NOT
  callable by an `authenticated` role (only service role).

## 10. Rollback considerations
- The migration is additive; to remove it, apply a **new** down-migration
  dropping the billing objects (do not delete an applied migration file).
  Example objects to drop (reverse dependency order): the four functions, then
  `payment_events, refunds, invoices, entitlements, job_seeker_purchases,
  payment_transactions, payment_orders, subscription_usage,
  employer_subscriptions, billing_prices, billing_products`.
- Never drop tables that already hold real financial records without an export
  first — financial/audit rows are meant to be retained.
- Edge Functions can be removed with `supabase functions delete <name>`.

## 11. Guardrails
- No service-role key, provider secret, or PAT in git or in docs.
- Frontend stays on the sandbox path until Step 7B verification passes.
- Do not enable a real provider until its secrets and server-side verification
  are configured and tested.
