// Edge Function: create-payment-order
//
// Creates a payment order for the authenticated caller. The client sends only a
// product CODE, an optional company context, and an idempotency key — NEVER an
// amount. The server resolves the price from billing_prices via the
// create_payment_order_request DB function (SECURITY DEFINER), which also
// enforces ownership/membership, blocks Enterprise, and de-dupes by
// idempotency key.
//
// This step keeps the sandbox as the only usable provider; real providers
// return a clear "provider_not_configured" error until credentials exist.
//
// Deploy:  supabase functions deploy create-payment-order
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
//          (per-provider secrets are added later, never committed)

import { admin, getCaller, json, cors } from "../_shared/auth.ts";

// Providers that are actually wired. Real gateways stay disabled here.
const ENABLED_PROVIDERS = new Set(["sandbox"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const caller = await getCaller(req);
  if (!caller) return json({ error: "not_authenticated" }, 401);

  const { product_code, company_id, idempotency_key, provider } =
    await req.json().catch(() => ({}));

  if (!product_code || !idempotency_key) {
    return json({ error: "bad_request", detail: "product_code and idempotency_key required" }, 400);
  }
  const prov = provider ?? "sandbox";
  if (!ENABLED_PROVIDERS.has(prov)) {
    return json({ error: "provider_not_configured", detail: `provider '${prov}' is not enabled` }, 501);
  }

  // The DB function runs as the caller's identity via a user-scoped client so
  // auth.uid() and owns_company() resolve correctly. We do NOT pass a user id.
  const authHeader = req.headers.get("Authorization")!;
  const userScoped = admin(); // service client; RLS bypassed, but the function
  // itself re-derives auth.uid(). To keep auth.uid() populated we call the RPC
  // through a token-scoped client instead:
  const { createClient } = await import("jsr:@supabase/supabase-js@2");
  const asUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );

  const { data, error } = await asUser.rpc("create_payment_order_request", {
    p_product_code: product_code,
    p_idempotency_key: idempotency_key,
    p_company_id: company_id ?? null,
    p_provider: prov,
  });

  if (error) return json({ error: "order_failed", detail: error.message }, 400);

  // Return only safe fields (already limited by the function's return shape).
  void userScoped;
  return json({ order: Array.isArray(data) ? data[0] : data });
});
