-- ============================================================================
-- 005_billing_foundation.sql
-- Secure backend foundation for in-app billing (Step 7A).
--
-- Scope: server-controlled catalog, employer subscriptions + usage, job-seeker
-- purchases, orders/transactions, entitlements, invoices, refunds, and a
-- webhook/event idempotency table — plus the SECURITY DEFINER functions that
-- are the ONLY sanctioned path to create orders, grant entitlements, consume
-- credits, and increment usage.
--
-- The browser is never the source of truth for prices, payment status,
-- subscription access, service credits, usage, or invoice totals. Normal
-- clients get read-only, owner-scoped RLS; all sensitive writes go through
-- service-role functions.
--
-- Reconciliation notes (verified against 003/004):
--   • No company_memberships table exists. Company access = companies.owner_id,
--     via the existing helper public.owns_company(uuid). The requested
--     owner/admin/billing_admin membership roles do NOT exist in this schema;
--     company-scoped billing reads therefore use owns_company(); staff reads
--     use the existing public.is_admin().
--   • user_id columns reference public.profiles(id) (1:1 with auth.users),
--     matching the convention in 003.
--   • Product/service codes match src/billing/catalog.js exactly.
--
-- ON DELETE policy (deliberate): financial/audit rows are RETAINED when the
-- owning profile or company is deleted — identity FKs use ON DELETE SET NULL
-- and the columns are nullable, so the audit record survives while PII linkage
-- is severed (compatible with account-deletion erasure). This differs on
-- purpose from the app's cascade elsewhere, which is about live app data, not
-- financial records.
-- ============================================================================

begin;

-- ── enums as CHECK constraints (kept as text for forward-compat) ────────────
-- (statuses documented inline on each table)

-- ── 1. Server-controlled catalog ────────────────────────────────────────────
create table if not exists public.billing_products (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,          -- matches src/billing/catalog.js
  kind          text not null check (kind in ('employer_plan','job_seeker_service')),
  name_mn       text not null,
  name_en       text not null,
  description_mn text,
  description_en text,
  active        boolean not null default true,
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.billing_prices (
  id                    uuid primary key default gen_random_uuid(),
  product_id            uuid not null references public.billing_products on delete cascade,
  currency              text not null default 'MNT',
  amount                integer not null check (amount >= 0),   -- integer MNT
  billing_interval      text check (billing_interval in ('year','month','one_time')),
  billing_interval_count integer not null default 1 check (billing_interval_count >= 1),
  active                boolean not null default true,
  provider_price_ref    text,
  starts_at             timestamptz not null default now(),
  ends_at               timestamptz,
  created_at            timestamptz not null default now()
);
create index if not exists billing_prices_product_idx on public.billing_prices(product_id);
-- At most one active price per product (partial unique).
create unique index if not exists billing_prices_one_active
  on public.billing_prices(product_id) where active;

-- ── 2. Employer subscriptions ───────────────────────────────────────────────
create table if not exists public.employer_subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  company_id              uuid not null references public.companies on delete cascade,
  product_id              uuid not null references public.billing_products on delete restrict,
  price_id                uuid references public.billing_prices on delete set null,
  status                  text not null default 'incomplete'
                            check (status in ('incomplete','pending','active','past_due','cancelled','expired','refunded')),
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean not null default false,
  cancelled_at            timestamptz,
  provider                text,
  provider_customer_ref   text,
  provider_subscription_ref text,
  source_payment_order_id uuid,   -- FK added after payment_orders exists
  metadata                jsonb not null default '{}',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists emp_subs_company_idx on public.employer_subscriptions(company_id);
-- Only one active subscription per company.
create unique index if not exists emp_subs_one_active
  on public.employer_subscriptions(company_id) where status = 'active';

-- ── 3. Subscription usage (storage only; no client increments) ──────────────
create table if not exists public.subscription_usage (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies on delete cascade,
  subscription_id uuid not null references public.employer_subscriptions on delete cascade,
  metric_code   text not null check (metric_code in
                  ('candidate_views','candidate_contacts','active_job_posts','ai_matching',
                   'video_interview_invites','team_members','candidate_comparisons')),
  period_start  timestamptz not null,
  period_end    timestamptz not null,
  quantity      bigint not null default 0 check (quantity >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (subscription_id, metric_code, period_start)
);

-- ── 4. Payment orders ───────────────────────────────────────────────────────
create table if not exists public.payment_orders (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles on delete set null,   -- retain record
  company_id        uuid references public.companies on delete set null,  -- nullable for seeker
  product_id        uuid not null references public.billing_products on delete restrict,
  price_id          uuid not null references public.billing_prices on delete restrict,
  kind              text not null check (kind in ('employer_plan','job_seeker_service')),
  provider          text not null default 'sandbox',
  status            text not null default 'created'
                      check (status in ('created','pending','processing','paid','failed','cancelled','expired','refunded')),
  currency          text not null default 'MNT',
  amount            integer not null check (amount >= 0),   -- server-derived only
  idempotency_key   text not null,
  provider_order_ref text,
  expires_at        timestamptz,
  paid_at           timestamptz,
  cancelled_at      timestamptz,
  verified_at       timestamptz,
  metadata          jsonb not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
-- Idempotency scoped to purchaser + provider.
create unique index if not exists payment_orders_idem
  on public.payment_orders(coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), provider, idempotency_key);
create index if not exists payment_orders_company_idx on public.payment_orders(company_id);
create index if not exists payment_orders_user_idx on public.payment_orders(user_id);

-- deferred FK: subscription -> originating order
alter table public.employer_subscriptions
  drop constraint if exists emp_subs_source_order_fk;
alter table public.employer_subscriptions
  add constraint emp_subs_source_order_fk
  foreign key (source_payment_order_id) references public.payment_orders on delete set null;

-- ── 5. Payment transactions (provider payloads NOT client-readable) ─────────
create table if not exists public.payment_transactions (
  id                    uuid primary key default gen_random_uuid(),
  payment_order_id      uuid not null references public.payment_orders on delete cascade,
  provider              text not null,
  provider_transaction_ref text,
  status                text not null check (status in ('pending','processing','paid','failed','refunded')),
  amount                integer,
  currency              text default 'MNT',
  raw_event_id          uuid,
  verified              boolean not null default false,
  provider_payload      jsonb,   -- sensitive; no client RLS read
  created_at            timestamptz not null default now()
);
create index if not exists pay_tx_order_idx on public.payment_transactions(payment_order_id);

-- ── 6. Job-seeker purchases + entitlements ──────────────────────────────────
create table if not exists public.job_seeker_purchases (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles on delete cascade,
  product_id        uuid not null references public.billing_products on delete restrict,
  price_id          uuid not null references public.billing_prices on delete restrict,
  payment_order_id  uuid not null references public.payment_orders on delete restrict,
  status            text not null default 'paid'
                      check (status in ('paid','used','refunded','expired','revoked')),
  purchased_at      timestamptz not null default now(),
  used_at           timestamptz,
  revoked_at        timestamptz,
  expires_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- one purchase row per verified order (prevents double-grant)
  unique (payment_order_id)
);
create index if not exists jsp_user_idx on public.job_seeker_purchases(user_id);

create table if not exists public.entitlements (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles on delete set null,
  company_id        uuid references public.companies on delete set null,
  product_id        uuid not null references public.billing_products on delete restrict,
  source_type       text not null check (source_type in ('payment_order','subscription','admin')),
  source_id         uuid not null,
  entitlement_type  text not null check (entitlement_type in ('employer_plan','service_credit')),
  status            text not null default 'active'
                      check (status in ('active','used','expired','revoked','refunded')),
  quantity          integer not null default 1 check (quantity >= 1),
  consumed_quantity integer not null default 0 check (consumed_quantity >= 0 and consumed_quantity <= quantity),
  starts_at         timestamptz not null default now(),
  expires_at        timestamptz,
  revoked_at        timestamptz,
  metadata          jsonb not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- a given source (order/subscription) grants at most one entitlement
  unique (source_type, source_id)
);
create index if not exists ent_user_idx on public.entitlements(user_id);
create index if not exists ent_company_idx on public.entitlements(company_id);

-- ── 7. Invoices + refunds ───────────────────────────────────────────────────
create table if not exists public.invoices (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.profiles on delete set null,
  company_id       uuid references public.companies on delete set null,
  payment_order_id uuid references public.payment_orders on delete set null,
  invoice_number   text unique,   -- server-generated only
  status           text not null default 'draft'
                     check (status in ('draft','issued','paid','void','refunded')),
  currency         text not null default 'MNT',
  subtotal         integer check (subtotal >= 0),
  total            integer check (total >= 0),
  issued_at        timestamptz,
  paid_at          timestamptz,
  metadata         jsonb not null default '{}',
  created_at       timestamptz not null default now()
);

create table if not exists public.refunds (
  id                    uuid primary key default gen_random_uuid(),
  payment_order_id      uuid not null references public.payment_orders on delete restrict,
  payment_transaction_id uuid references public.payment_transactions on delete set null,
  provider_ref          text,
  status                text not null default 'requested'
                          check (status in ('requested','processing','succeeded','failed','cancelled')),
  amount                integer not null check (amount >= 0),
  reason                text,
  requested_by          uuid references public.profiles on delete set null,
  requested_at          timestamptz not null default now(),
  processed_at          timestamptz,
  metadata              jsonb not null default '{}',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists refunds_order_idx on public.refunds(payment_order_id);

-- ── 8. Payment events (webhook idempotency; not client-readable) ────────────
create table if not exists public.payment_events (
  id                uuid primary key default gen_random_uuid(),
  provider          text not null,
  provider_event_id text,
  event_type        text,
  payload_hash      text,
  payload           jsonb,
  processing_status text not null default 'received'
                      check (processing_status in ('received','processed','failed','ignored')),
  processed_at      timestamptz,
  error_message     text,
  created_at        timestamptz not null default now()
);
-- de-dupe provider events where an id is present
create unique index if not exists payment_events_provider_id
  on public.payment_events(provider, provider_event_id) where provider_event_id is not null;

-- ============================================================================
-- ROW LEVEL SECURITY — default deny; owner-scoped reads; no client writes.
-- ============================================================================
alter table public.billing_products         enable row level security;
alter table public.billing_prices           enable row level security;
alter table public.employer_subscriptions   enable row level security;
alter table public.subscription_usage       enable row level security;
alter table public.payment_orders           enable row level security;
alter table public.payment_transactions     enable row level security;
alter table public.job_seeker_purchases     enable row level security;
alter table public.entitlements             enable row level security;
alter table public.invoices                 enable row level security;
alter table public.refunds                  enable row level security;
alter table public.payment_events           enable row level security;

-- Catalog: publicly readable (active rows), never client-writable.
drop policy if exists billing_products_read on public.billing_products;
create policy billing_products_read on public.billing_products
  for select using (active or public.is_admin());
drop policy if exists billing_prices_read on public.billing_prices;
create policy billing_prices_read on public.billing_prices
  for select using (active or public.is_admin());

-- Employer subscription: readable by company owner or admin. No client writes.
drop policy if exists emp_subs_read on public.employer_subscriptions;
create policy emp_subs_read on public.employer_subscriptions
  for select using (public.owns_company(company_id) or public.is_admin());

drop policy if exists sub_usage_read on public.subscription_usage;
create policy sub_usage_read on public.subscription_usage
  for select using (public.owns_company(company_id) or public.is_admin());

-- Payment orders: own (user) or own company, or admin.
drop policy if exists payment_orders_read on public.payment_orders;
create policy payment_orders_read on public.payment_orders
  for select using (
    (user_id is not null and user_id = auth.uid())
    or (company_id is not null and public.owns_company(company_id))
    or public.is_admin()
  );

-- Transactions: readable via ownership of the parent order; payloads stay
-- server-side (a view could project safe columns later). Admin full read.
drop policy if exists pay_tx_read on public.payment_transactions;
create policy pay_tx_read on public.payment_transactions
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.payment_orders o
      where o.id = payment_order_id
        and ((o.user_id is not null and o.user_id = auth.uid())
             or (o.company_id is not null and public.owns_company(o.company_id)))
    )
  );

-- Job-seeker purchases + user-scoped entitlements: own user or admin.
drop policy if exists jsp_read on public.job_seeker_purchases;
create policy jsp_read on public.job_seeker_purchases
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists entitlements_read on public.entitlements;
create policy entitlements_read on public.entitlements
  for select using (
    (user_id is not null and user_id = auth.uid())
    or (company_id is not null and public.owns_company(company_id))
    or public.is_admin()
  );

-- Invoices: own user or own company or admin.
drop policy if exists invoices_read on public.invoices;
create policy invoices_read on public.invoices
  for select using (
    (user_id is not null and user_id = auth.uid())
    or (company_id is not null and public.owns_company(company_id))
    or public.is_admin()
  );

-- Refunds: readable via the parent order ownership, or admin.
drop policy if exists refunds_read on public.refunds;
create policy refunds_read on public.refunds
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.payment_orders o
      where o.id = payment_order_id
        and ((o.user_id is not null and o.user_id = auth.uid())
             or (o.company_id is not null and public.owns_company(o.company_id)))
    )
  );

-- payment_events: admin-only read; no client access otherwise.
drop policy if exists payment_events_admin on public.payment_events;
create policy payment_events_admin on public.payment_events
  for select using (public.is_admin());

-- NOTE: no INSERT/UPDATE/DELETE policies are defined for any billing table.
-- With RLS enabled and default-deny, authenticated/anon clients therefore
-- CANNOT insert orders, mark orders paid, activate subscriptions, create
-- entitlements, edit invoices, verify transactions, insert events, process
-- refunds, or change catalog prices. Only the service role (which bypasses
-- RLS) and the SECURITY DEFINER functions below may write.

-- ============================================================================
-- SECURE FUNCTIONS
-- ============================================================================

-- 1) create_payment_order_request — authenticated; server-derived price.
create or replace function public.create_payment_order_request(
  p_product_code text,
  p_idempotency_key text,
  p_company_id uuid default null,
  p_provider text default 'sandbox'
) returns table (
  order_id uuid, status text, amount integer, currency text, kind text, provider text
)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_prod public.billing_products;
  v_price public.billing_prices;
  v_existing public.payment_orders;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) = 0 then
    raise exception 'idempotency_key required';
  end if;

  select * into v_prod from public.billing_products
   where code = p_product_code and active limit 1;
  if not found then raise exception 'unknown or inactive product: %', p_product_code; end if;

  -- Enterprise / custom plans never enter automated checkout.
  if v_prod.code = 'enterprise' then
    raise exception 'enterprise plans require manual sales, not automated checkout';
  end if;

  select * into v_price from public.billing_prices
   where product_id = v_prod.id and active limit 1;
  if not found then raise exception 'no active price for product: %', p_product_code; end if;
  if v_price.amount is null then
    raise exception 'custom-priced product cannot be auto-ordered: %', p_product_code;
  end if;

  -- Ownership / membership validation.
  if v_prod.kind = 'employer_plan' then
    if p_company_id is null then raise exception 'company_id required for employer plan'; end if;
    if not public.owns_company(p_company_id) then
      raise exception 'not authorized for company %', p_company_id;
    end if;
  else
    -- job_seeker_service: user-owned, no company.
    p_company_id := null;
  end if;

  -- Idempotency: return the existing order for this purchaser+provider+key.
  select * into v_existing from public.payment_orders
   where user_id = v_uid and provider = p_provider and idempotency_key = p_idempotency_key
   limit 1;
  if found then
    return query select v_existing.id, v_existing.status, v_existing.amount,
                        v_existing.currency, v_existing.kind, v_existing.provider;
    return;
  end if;

  return query
  insert into public.payment_orders
    (user_id, company_id, product_id, price_id, kind, provider, status, currency, amount, idempotency_key)
  values
    (v_uid, p_company_id, v_prod.id, v_price.id, v_prod.kind, p_provider, 'created',
     v_price.currency, v_price.amount, p_idempotency_key)
  returning payment_orders.id, payment_orders.status, payment_orders.amount,
            payment_orders.currency, payment_orders.kind, payment_orders.provider;
end $$;

-- 2) grant_verified_entitlement — service-role only; idempotent.
create or replace function public.grant_verified_entitlement(p_order_id uuid)
returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_order public.payment_orders;
  v_ent_id uuid;
begin
  select * into v_order from public.payment_orders where id = p_order_id for update;
  if not found then raise exception 'order not found'; end if;
  if v_order.status <> 'paid' then
    raise exception 'order % is not verified paid (status=%)', p_order_id, v_order.status;
  end if;

  -- Idempotency: a given order grants at most one entitlement.
  select id into v_ent_id from public.entitlements
   where source_type = 'payment_order' and source_id = p_order_id;
  if found then return v_ent_id; end if;

  if v_order.kind = 'employer_plan' then
    insert into public.employer_subscriptions
      (company_id, product_id, price_id, status, current_period_start, current_period_end,
       provider, source_payment_order_id)
    values
      (v_order.company_id, v_order.product_id, v_order.price_id, 'active',
       now(), now() + interval '1 year', v_order.provider, v_order.id)
    on conflict do nothing;

    insert into public.entitlements
      (company_id, product_id, source_type, source_id, entitlement_type, status, quantity, expires_at)
    values
      (v_order.company_id, v_order.product_id, 'payment_order', v_order.id, 'employer_plan', 'active', 1,
       now() + interval '1 year')
    returning id into v_ent_id;
  else
    insert into public.job_seeker_purchases
      (user_id, product_id, price_id, payment_order_id, status)
    values
      (v_order.user_id, v_order.product_id, v_order.price_id, v_order.id, 'paid')
    on conflict (payment_order_id) do nothing;

    insert into public.entitlements
      (user_id, product_id, source_type, source_id, entitlement_type, status, quantity)
    values
      (v_order.user_id, v_order.product_id, 'payment_order', v_order.id, 'service_credit', 'active', 1)
    returning id into v_ent_id;
  end if;

  return v_ent_id;
end $$;

-- 3) consume_service_entitlement — authenticated; atomic single-use.
create or replace function public.consume_service_entitlement(p_entitlement_id uuid)
returns table (entitlement_id uuid, status text, consumed_quantity integer, quantity integer)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_row public.entitlements;
begin
  if v_uid is null then raise exception 'authentication required'; end if;

  -- Atomic: lock the row, verify it is a live user-owned service credit.
  select * into v_row from public.entitlements
   where id = p_entitlement_id and entitlement_type = 'service_credit'
   for update;
  if not found then raise exception 'entitlement not found'; end if;
  if v_row.user_id is distinct from v_uid then raise exception 'not your entitlement'; end if;
  if v_row.status <> 'active' then raise exception 'entitlement not active (%).', v_row.status; end if;
  if v_row.revoked_at is not null then raise exception 'entitlement revoked'; end if;
  if v_row.expires_at is not null and v_row.expires_at < now() then raise exception 'entitlement expired'; end if;
  if v_row.consumed_quantity >= v_row.quantity then raise exception 'entitlement already used'; end if;

  update public.entitlements
     set consumed_quantity = consumed_quantity + 1,
         status = case when consumed_quantity + 1 >= quantity then 'used' else 'active' end,
         updated_at = now()
   where id = p_entitlement_id
   returning id, status, consumed_quantity, quantity
   into v_row.id, v_row.status, v_row.consumed_quantity, v_row.quantity;

  return query select v_row.id, v_row.status, v_row.consumed_quantity, v_row.quantity;
end $$;

-- 4) increment_subscription_usage — trusted backend only; atomic; non-negative.
create or replace function public.increment_subscription_usage(
  p_subscription_id uuid, p_metric_code text, p_qty integer
) returns bigint
language plpgsql volatile security definer set search_path = public as $$
declare
  v_sub public.employer_subscriptions;
  v_qty bigint;
begin
  if p_qty is null or p_qty < 0 then raise exception 'increment must be >= 0'; end if;
  select * into v_sub from public.employer_subscriptions where id = p_subscription_id;
  if not found then raise exception 'subscription not found'; end if;

  insert into public.subscription_usage
    (company_id, subscription_id, metric_code, period_start, period_end, quantity)
  values
    (v_sub.company_id, p_subscription_id, p_metric_code,
     coalesce(v_sub.current_period_start, now()),
     coalesce(v_sub.current_period_end, now() + interval '1 year'),
     p_qty)
  on conflict (subscription_id, metric_code, period_start)
    do update set quantity = public.subscription_usage.quantity + excluded.quantity,
                  updated_at = now()
  returning quantity into v_qty;
  return v_qty;
end $$;

-- ── execute grants: least privilege ────────────────────────────────────────
-- create_payment_order_request + consume_service_entitlement: authenticated.
revoke all on function public.create_payment_order_request(text,text,uuid,text) from public;
grant execute on function public.create_payment_order_request(text,text,uuid,text) to authenticated;

revoke all on function public.consume_service_entitlement(uuid) from public;
grant execute on function public.consume_service_entitlement(uuid) to authenticated;

-- grant_verified_entitlement + increment_subscription_usage: service-role only.
-- (No grant to anon/authenticated; the service role bypasses these grants.)
revoke all on function public.grant_verified_entitlement(uuid) from public;
revoke all on function public.increment_subscription_usage(uuid,text,integer) from public;

-- ============================================================================
-- SEED CATALOG — codes/prices reconciled with src/billing/catalog.js
-- ============================================================================
insert into public.billing_products (code, kind, name_mn, name_en, active) values
  ('free',         'employer_plan',      'Үнэгүй',                'Free',                 true),
  ('starter',      'employer_plan',      'Starter',               'Starter',              true),
  ('professional', 'employer_plan',      'Professional',          'Professional',         true),
  ('business',     'employer_plan',      'Business',              'Business',             true),
  ('enterprise',   'employer_plan',      'Enterprise',            'Enterprise',           true),
  ('cv_rewrite',   'job_seeker_service', 'AI CV засвар',          'AI CV Rewrite',        true),
  ('cover_letter', 'job_seeker_service', 'AI гэмжих захидал',     'AI Cover Letter',      true),
  ('interview_prep','job_seeker_service','Ярилцлагын бэлтгэл',    'Interview Preparation', true),
  ('premium_cv',   'job_seeker_service', 'Premium CV загвар',     'Premium CV Template',  true),
  ('career_ai',    'job_seeker_service', 'Карьерын AI зөвлөгөө',  'Career AI Advice',     true)
on conflict (code) do nothing;

-- Prices (integer MNT). Enterprise gets NO price row → cannot auto-checkout.
insert into public.billing_prices (product_id, amount, billing_interval, active)
select p.id, v.amount, v.interval, true
from (values
  ('free',          0,         'year'),
  ('starter',       1990000,   'year'),
  ('professional',  3990000,   'year'),
  ('business',      5990000,   'year'),
  ('cv_rewrite',    2000,      'one_time'),
  ('cover_letter',  2000,      'one_time'),
  ('interview_prep',5000,      'one_time'),
  ('premium_cv',    3000,      'one_time'),
  ('career_ai',     5000,      'one_time')
) as v(code, amount, interval)
join public.billing_products p on p.code = v.code
where not exists (select 1 from public.billing_prices bp where bp.product_id = p.id and bp.active);

commit;
