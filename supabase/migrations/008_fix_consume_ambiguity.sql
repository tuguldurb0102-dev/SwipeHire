-- ============================================================================
-- 008_fix_consume_ambiguity.sql
-- Same class of bug as 007, in consume_service_entitlement. Its
-- `RETURNS TABLE (... status, consumed_quantity, quantity)` clause puts OUT
-- variables in scope whose names match columns of public.entitlements, so the
-- UPDATE ... SET / CASE / RETURNING referenced ambiguous identifiers
-- (ERROR 42702: column reference "status" is ambiguous).
--
-- Fix with `#variable_conflict use_column` so unqualified identifiers inside
-- SQL resolve to the table columns. All PL/pgSQL locals here are v_/p_ prefixed,
-- so none are meant to be bare identifiers — the pragma is safe and behaviour is
-- otherwise identical to 005.
-- ============================================================================

create or replace function public.consume_service_entitlement(p_entitlement_id uuid)
returns table (entitlement_id uuid, status text, consumed_quantity integer, quantity integer)
language plpgsql volatile security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_row public.entitlements;
begin
  if v_uid is null then raise exception 'authentication required'; end if;

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

revoke all on function public.consume_service_entitlement(uuid) from public, anon;
grant execute on function public.consume_service_entitlement(uuid) to authenticated;
