/**
 * Consent service — records granular, versioned consent decisions.
 *
 * Each consent kind is stored as its own row so required and optional
 * consents are never bundled, and optional ones (marketing) can be revoked
 * later without touching the required ones.
 */
import { requireClient } from "./supabase/client.js";
import { toServiceError } from "./supabase/errors.js";

export const CONSENT_KINDS = {
  TERMS: "terms_of_service",
  PRIVACY: "privacy_policy",
  DATA_PROCESSING: "data_processing",
  AI_MATCHING: "ai_matching",
  MARKETING: "marketing", // optional
};

export const REQUIRED_CONSENTS = [
  CONSENT_KINDS.TERMS,
  CONSENT_KINDS.PRIVACY,
  CONSENT_KINDS.DATA_PROCESSING,
  CONSENT_KINDS.AI_MATCHING,
];

export const POLICY_VERSION = "2026-01-01";

async function uid() {
  const supabase = requireClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) {
    const e = new Error("not_authenticated"); e.code = "not_authenticated"; e.__isServiceError = true;
    e.userMessage = { mn: "Нэвтэрнэ үү.", en: "Please sign in." };
    throw e;
  }
  return data.user.id;
}

/**
 * Record a batch of consent decisions with full audit context.
 * @param {{kind:string, granted:boolean}[]} decisions
 * @param {string} lang
 */
export async function recordConsents(decisions, lang = "mn") {
  try {
    const supabase = requireClient();
    const owner = await uid();
    const now = new Date().toISOString();
    const rows = decisions.map((d) => ({
      user_id: owner,
      kind: d.kind,
      granted: Boolean(d.granted),
      policy_version: POLICY_VERSION,
      lang,
      source: "web",
      created_at: now,
    }));
    const { error } = await supabase.from("user_consents").insert(rows);
    if (error) throw error;
    return true;
  } catch (err) {
    throw toServiceError(err);
  }
}

/** Latest decision per consent kind for the caller. */
export async function getMyConsents() {
  try {
    const supabase = requireClient();
    const owner = await uid();
    const { data, error } = await supabase
      .from("user_consents")
      .select("kind, granted, policy_version, lang, created_at")
      .eq("user_id", owner)
      .order("created_at", { ascending: false });
    if (error) throw error;
    // reduce to latest per kind
    const latest = {};
    for (const r of data || []) if (!(r.kind in latest)) latest[r.kind] = r;
    return latest;
  } catch (err) {
    throw toServiceError(err);
  }
}

/** True when every required consent is currently granted at this version. */
export async function hasRequiredConsents() {
  const latest = await getMyConsents();
  return REQUIRED_CONSENTS.every(
    (k) => latest[k] && latest[k].granted && latest[k].policy_version === POLICY_VERSION
  );
}

/** Revoke (or re-grant) an optional consent by writing a new decision row. */
export async function setOptionalConsent(kind, granted, lang = "mn") {
  if (REQUIRED_CONSENTS.includes(kind)) {
    const e = new Error("cannot_revoke_required"); e.code = "forbidden"; e.__isServiceError = true;
    e.userMessage = { mn: "Заавал зөвшөөрлийг цуцлах боломжгүй.", en: "Required consent cannot be revoked." };
    throw e;
  }
  return recordConsents([{ kind, granted }], lang);
}
