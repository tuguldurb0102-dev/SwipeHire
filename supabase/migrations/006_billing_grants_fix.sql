-- ============================================================================
-- 006_billing_grants_fix.sql
-- Security fix for the billing functions' EXECUTE privileges.
--
-- When the public schema was reset, a broad `alter default privileges ... grant
-- all on functions to anon, authenticated` was applied. That caused every new
-- function created afterwards (including 005's billing functions) to receive an
-- EXPLICIT execute grant for anon and authenticated. 005's `revoke ... from
-- public` only removed the PUBLIC grant, so the explicit authenticated/anon
-- grants survived — over-exposing the service-role-only functions.
--
-- This migration re-asserts least privilege explicitly, and removes the unsafe
-- default so future functions are not auto-granted to client roles.
-- ============================================================================

begin;

-- Stop future public functions from being auto-granted to client roles.
alter default privileges in schema public revoke execute on functions from anon, authenticated;

-- Service-role-only: no client role may execute these.
revoke all on function public.grant_verified_entitlement(uuid) from public, anon, authenticated;
revoke all on function public.increment_subscription_usage(uuid, text, integer) from public, anon, authenticated;

-- User-callable: authenticated only (strip anon; keep authenticated).
revoke all on function public.create_payment_order_request(text, text, uuid, text) from public, anon;
grant execute on function public.create_payment_order_request(text, text, uuid, text) to authenticated;

revoke all on function public.consume_service_entitlement(uuid) from public, anon;
grant execute on function public.consume_service_entitlement(uuid) to authenticated;

commit;
