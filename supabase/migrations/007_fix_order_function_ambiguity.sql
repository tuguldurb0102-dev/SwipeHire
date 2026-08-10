-- ============================================================================
-- 007_fix_order_function_ambiguity.sql
-- Fix: create_payment_order_request (from 005) has a `RETURNS TABLE (...
-- provider text)` clause, which puts an OUT variable named `provider` in scope.
-- The idempotency lookup referenced the unqualified column `provider`, which
-- Postgres could not disambiguate from that OUT variable
-- (ERROR 42702: column reference "provider" is ambiguous), so the function
-- errored whenever a duplicate idempotency key was checked.
--
-- Recreate the function with the idempotency SELECT's columns table-qualified
-- (alias `po`). Behaviour is otherwise identical to 005.
-- ============================================================================

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

  if v_prod.code = 'enterprise' then
    raise exception 'enterprise plans require manual sales, not automated checkout';
  end if;

  select * into v_price from public.billing_prices
   where product_id = v_prod.id and active limit 1;
  if not found then raise exception 'no active price for product: %', p_product_code; end if;
  if v_price.amount is null then
    raise exception 'custom-priced product cannot be auto-ordered: %', p_product_code;
  end if;

  if v_prod.kind = 'employer_plan' then
    if p_company_id is null then raise exception 'company_id required for employer plan'; end if;
    if not public.owns_company(p_company_id) then
      raise exception 'not authorized for company %', p_company_id;
    end if;
  else
    p_company_id := null;
  end if;

  -- Idempotency: return the existing order for this purchaser+provider+key.
  -- Columns are table-qualified (po.) to avoid colliding with the RETURNS TABLE
  -- OUT variables of the same name (e.g. `provider`).
  select po.* into v_existing from public.payment_orders po
   where po.user_id = v_uid
     and po.provider = p_provider
     and po.idempotency_key = p_idempotency_key
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

-- Re-assert least-privilege grants (kept consistent with 006).
revoke all on function public.create_payment_order_request(text, text, uuid, text) from public, anon;
grant execute on function public.create_payment_order_request(text, text, uuid, text) to authenticated;
