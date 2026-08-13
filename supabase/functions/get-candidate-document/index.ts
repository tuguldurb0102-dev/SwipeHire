// Edge Function: get-candidate-document
//
// Returns a short-lived signed URL for a candidate's private CV or Video CV —
// but only to someone allowed to see it. Employers never learn the storage
// path (candidate_public_view deliberately omits it); they pass a candidate id
// and a kind, and the server resolves the path and checks the relationship.
//
// Allowed if: the candidate has published their profile, OR the candidate has
// applied to one of the caller's jobs. Otherwise 403.
//
// Deploy:  supabase functions deploy get-candidate-document
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY (auto-injected)

import { admin, getCaller, isAdmin, json, cors } from "../_shared/auth.ts";

const BUCKET = { cv: "cv-pdfs", video: "videos" } as const;
const EXPIRY = { cv: 300, video: 600 } as const; // seconds

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const caller = await getCaller(req);
  if (!caller) return json({ error: "not_authenticated" }, 401);

  const { candidate_id, kind } = await req.json().catch(() => ({}));
  if (!candidate_id || !(kind in BUCKET)) {
    return json({ error: "bad_request", detail: "candidate_id and kind (cv|video) required" }, 400);
  }

  const db = admin();

  // Resolve the path + published flag server-side (never trust the client).
  const col = kind === "cv" ? "cv_path" : "video_path";
  const { data: prof, error: perr } = await db
    .from("candidate_profiles")
    .select(`${col}, published`)
    .eq("id", candidate_id)
    .maybeSingle();
  if (perr || !prof) return json({ error: "not_found" }, 404);
  const path = (prof as Record<string, unknown>)[col] as string | null;
  if (!path) return json({ error: "no_document" }, 404);

  // Authorisation: self, admin, published, or applied-to-my-job.
  let allowed = candidate_id === caller.id || (prof as { published?: boolean }).published === true;
  if (!allowed) allowed = await isAdmin(caller.id);
  if (!allowed) {
    const { data: rel } = await db
      .from("applications")
      .select("id, jobs!inner(employer_id)")
      .eq("candidate_id", candidate_id)
      .eq("jobs.employer_id", caller.id)
      .limit(1);
    allowed = !!(rel && rel.length);
  }
  if (!allowed) return json({ error: "forbidden" }, 403);

  const { data: signed, error: serr } = await db.storage
    .from(BUCKET[kind as keyof typeof BUCKET])
    .createSignedUrl(path, EXPIRY[kind as keyof typeof EXPIRY]);
  if (serr || !signed) return json({ error: "sign_failed", detail: serr?.message }, 400);

  return json({ url: signed.signedUrl, expires_in: EXPIRY[kind as keyof typeof EXPIRY] });
});
