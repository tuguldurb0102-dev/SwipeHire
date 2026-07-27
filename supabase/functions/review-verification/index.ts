// Edge Function: review-verification
//
// Admin-only. Approves or rejects a verification_requests row. A user can
// never set their own status to 'approved' (RLS blocks it); the approval
// transition lives here behind a server-side admin check.
//
// Deploy:  supabase functions deploy review-verification
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY

import { admin, getCaller, isAdmin, json, cors } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const caller = await getCaller(req);
  if (!caller) return json({ error: "not_authenticated" }, 401);
  if (!(await isAdmin(caller.id))) return json({ error: "forbidden" }, 403);

  const { requestId, decision, note } = await req.json().catch(() => ({}));
  if (!requestId || !["approved", "rejected"].includes(decision)) {
    return json({ error: "bad_request" }, 400);
  }

  const db = admin();
  const { data, error } = await db
    .from("verification_requests")
    .update({
      status: decision,
      reviewer_note: (note ?? "").slice(0, 500),
      decided_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .in("status", ["pending", "under_review"]) // cannot re-decide a closed one
    .select()
    .single();

  if (error || !data) return json({ error: "not_found_or_closed" }, 404);

  await db.from("audit_logs").insert({
    actor_id: caller.id,
    action: `verification_${decision}`,
    subject: data.user_id,
    meta: { kind: data.kind, request: requestId },
  });

  return json({ ok: true, status: decision });
});
