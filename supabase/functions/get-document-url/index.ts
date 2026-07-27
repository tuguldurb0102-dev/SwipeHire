// Edge Function: get-document-url
//
// Returns a short-lived signed URL for a private document (CV, certificate,
// video CV, identity) — but only to someone authorised to see it. Employers
// never read the private buckets directly; they call this, which checks the
// relationship first, so identity documents are never exposed by a public URL.
//
// Deploy:  supabase functions deploy get-document-url
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY

import { admin, getCaller, isAdmin, json, cors } from "../_shared/auth.ts";

const EXPIRY: Record<string, number> = {
  "cv-pdfs": 300,
  certificates: 300,
  videos: 600,
  identity: 120, // most sensitive → shortest life
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const caller = await getCaller(req);
  if (!caller) return json({ error: "not_authenticated" }, 401);

  const { bucket, path } = await req.json().catch(() => ({}));
  if (!bucket || !path || !(bucket in EXPIRY)) return json({ error: "bad_request" }, 400);

  const ownerId = String(path).split("/")[0];
  const db = admin();

  let authorised = ownerId === caller.id || (await isAdmin(caller.id));

  // Identity documents are owner/admin only — never shared with employers.
  if (!authorised && bucket !== "identity") {
    // An employer may view a candidate's CV/certificate/video if that
    // candidate has applied to one of the employer's jobs, or is published.
    const { data: rel } = await db
      .from("applications")
      .select("id, jobs!inner(company_id, companies!inner(owner_id))")
      .eq("candidate_id", ownerId)
      .eq("jobs.companies.owner_id", caller.id)
      .limit(1);
    if (rel && rel.length) authorised = true;

    if (!authorised) {
      const { data: pub } = await db
        .from("candidate_profiles")
        .select("id")
        .eq("id", ownerId)
        .eq("published", true)
        .maybeSingle();
      if (pub) authorised = true;
    }
  }

  if (!authorised) return json({ error: "forbidden" }, 403);

  const { data, error } = await db.storage.from(bucket).createSignedUrl(path, EXPIRY[bucket]);
  if (error) return json({ error: "sign_failed" }, 500);

  return json({ url: data.signedUrl, expiresIn: EXPIRY[bucket] });
});
