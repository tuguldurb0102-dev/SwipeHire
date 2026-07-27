// Edge Function: process-account-deletion
//
// A user requests deletion from the client (row in account_deletion_requests).
// Actually erasing the auth user, storage files and personal data crosses a
// privilege boundary the browser must never hold — that happens here, with
// the service-role key, only after re-verifying the caller owns the request.
//
// Deploy:  supabase functions deploy process-account-deletion
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY

import { admin, getCaller, isAdmin, json, cors } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const caller = await getCaller(req);
  if (!caller) return json({ error: "not_authenticated" }, 401);

  let targetUserId = caller.id;
  const body = await req.json().catch(() => ({}));

  // An admin may process a specific pending request; a normal user may only
  // process their own account.
  if (body.userId && body.userId !== caller.id) {
    if (!(await isAdmin(caller.id))) return json({ error: "forbidden" }, 403);
    targetUserId = body.userId;
  }

  const db = admin();

  // The request must exist and be pending — a client cannot trigger deletion
  // without first recording the request through RLS-guarded insert.
  const { data: reqRow } = await db
    .from("account_deletion_requests")
    .select("id, status")
    .eq("user_id", targetUserId)
    .eq("status", "pending")
    .maybeSingle();
  if (!reqRow) return json({ error: "no_pending_request" }, 404);

  await db.from("account_deletion_requests")
    .update({ status: "processing" }).eq("id", reqRow.id);

  // 1. Remove the user's private storage files (owner-prefixed paths).
  for (const bucket of ["videos", "cv-pdfs", "certificates", "identity", "avatars", "company-logos"]) {
    const { data: files } = await db.storage.from(bucket).list(targetUserId);
    if (files?.length) {
      await db.storage.from(bucket).remove(files.map((f) => `${targetUserId}/${f.name}`));
    }
  }

  // 2. Anonymise records that must be retained for fraud/audit reasons
  //    instead of hard-deleting them (append-only audit trail).
  await db.from("audit_logs").insert({
    actor_id: null,
    action: "account_deleted",
    subject: targetUserId,
    meta: { requested_at: new Date().toISOString() },
  });

  // 3. Delete the auth user. ON DELETE CASCADE on profiles removes the
  //    candidate/employer profile, applications, saved items, messages,
  //    consents and verification requests.
  const { error: delErr } = await db.auth.admin.deleteUser(targetUserId);
  if (delErr) {
    await db.from("account_deletion_requests")
      .update({ status: "pending" }).eq("id", reqRow.id);
    return json({ error: "deletion_failed" }, 500);
  }

  await db.from("account_deletion_requests")
    .update({ status: "completed", processed_at: new Date().toISOString() })
    .eq("id", reqRow.id);

  return json({ ok: true, status: "completed" });
});
