// Edge Function: verify-payment
//
// Verifies a payment order against its provider and, ONLY on a confirmed paid
// status, grants the entitlement (idempotently) via grant_verified_entitlement.
// It never trusts a client claiming "success".
//
// Provider verification branches are structured but disabled: real gateways
// return "provider_not_configured" until credentials exist. The sandbox branch
// requires the order to already be marked paid server-side (e.g. by an
// authorised test/admin path) — this function does not invent a paid status.
//
// Deploy:  supabase functions deploy verify-payment
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY

import { admin, getCaller, json, cors } from "../_shared/auth.ts";

const REAL_PROVIDERS = new Set(["qpay", "socialpay", "storepay", "card", "apple_iap", "play_billing"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const caller = await getCaller(req);
  if (!caller) return json({ error: "not_authenticated" }, 401);

  const { order_id } = await req.json().catch(() => ({}));
  if (!order_id) return json({ error: "bad_request", detail: "order_id required" }, 400);

  const db = admin();

  // Load the order (service role) and confirm the caller owns it or its company.
  const { data: order, error: oerr } = await db
    .from("payment_orders")
    .select("id, user_id, company_id, provider, status, kind")
    .eq("id", order_id)
    .maybeSingle();
  if (oerr || !order) return json({ error: "order_not_found" }, 404);

  let authorised = order.user_id === caller.id;
  if (!authorised && order.company_id) {
    const { data: c } = await db.from("companies").select("owner_id").eq("id", order.company_id).maybeSingle();
    authorised = c?.owner_id === caller.id;
  }
  if (!authorised) return json({ error: "forbidden" }, 403);

  // Real providers: verification not implemented until credentials exist.
  if (REAL_PROVIDERS.has(order.provider)) {
    return json({ error: "provider_not_configured", provider: order.provider }, 501);
  }

  // Sandbox: we DO NOT fabricate a paid status here. Verification reflects the
  // order's real server-side status. Entitlement is granted only if paid.
  if (order.status !== "paid") {
    return json({ verified: false, status: order.status });
  }

  // Idempotent grant (safe to call repeatedly).
  const { data: entId, error: gerr } = await db.rpc("grant_verified_entitlement", { p_order_id: order_id });
  if (gerr) return json({ error: "grant_failed", detail: gerr.message }, 400);

  return json({ verified: true, status: "paid", entitlement_id: entId });
});
