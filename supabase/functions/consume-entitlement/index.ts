// Edge Function: consume-entitlement
//
// Atomically consumes one active, user-owned job-seeker service credit via the
// consume_service_entitlement DB function. The DB function enforces single-use
// and rejects expired/revoked/refunded/already-used entitlements. This does NOT
// execute any AI service — it only records credit consumption.
//
// Deploy:  supabase functions deploy consume-entitlement
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY

import { getCaller, json, cors } from "../_shared/auth.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const caller = await getCaller(req);
  if (!caller) return json({ error: "not_authenticated" }, 401);

  const { entitlement_id } = await req.json().catch(() => ({}));
  if (!entitlement_id) return json({ error: "bad_request", detail: "entitlement_id required" }, 400);

  // Run as the caller so auth.uid() inside the function is the real user.
  const asUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } }, auth: { persistSession: false } },
  );

  const { data, error } = await asUser.rpc("consume_service_entitlement", {
    p_entitlement_id: entitlement_id,
  });
  if (error) return json({ error: "consume_failed", detail: error.message }, 400);

  return json({ result: Array.isArray(data) ? data[0] : data });
});
