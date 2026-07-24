/**
 * Account service — verification requests, data export and account deletion.
 *
 * Verification and deletion both cross a privilege boundary a browser must not
 * hold: a user can *request* verification or deletion, but only a privileged
 * server process (Edge Function with the service-role key) may approve a
 * verification or actually erase the auth user. These functions therefore
 * create request rows; they never grant status or delete auth.users directly.
 */
import { requireClient } from "./supabase/client.js";
import { toServiceError } from "./supabase/errors.js";

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

export const VERIFICATION_KINDS = ["phone", "identity", "company"];

/** Create a verification request. Status starts at 'pending'; the user can
 *  never set it to 'approved'. */
export async function createVerificationRequest({ kind, documentPath }) {
  try {
    if (!VERIFICATION_KINDS.includes(kind)) {
      const e = new Error("bad_kind"); e.code = "unknown"; e.__isServiceError = true;
      e.userMessage = { mn: "Буруу төрөл.", en: "Invalid verification type." };
      throw e;
    }
    const supabase = requireClient();
    const owner = await uid();
    const { data, error } = await supabase
      .from("verification_requests")
      .insert({ user_id: owner, kind, document_path: documentPath || null, status: "pending" })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    throw toServiceError(err);
  }
}

export async function getMyVerificationStatus() {
  try {
    const supabase = requireClient();
    const owner = await uid();
    const { data, error } = await supabase
      .from("verification_requests")
      .select("kind, status, created_at, decided_at")
      .eq("user_id", owner)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    throw toServiceError(err);
  }
}

/**
 * Request account deletion. Records the request, signs the user out, and
 * leaves the account in a deletion-pending state. Actual erasure of auth.users
 * and storage is done by a scheduled Edge Function running with elevated
 * privileges — never from the client.
 */
export async function requestAccountDeletion({ reason } = {}) {
  try {
    const supabase = requireClient();
    const owner = await uid();
    const { error } = await supabase
      .from("account_deletion_requests")
      .insert({ user_id: owner, reason: (reason || "").slice(0, 500), status: "pending" });
    if (error) throw error;
    await supabase.auth.signOut();
    return true;
  } catch (err) {
    throw toServiceError(err);
  }
}

/**
 * Export everything stored about the caller. Pulls only the caller's own rows
 * (RLS enforces this) plus their consent history. Never includes other users'
 * private data.
 */
export async function exportMyData() {
  try {
    const supabase = requireClient();
    const owner = await uid();
    const tables = [
      ["profile", "profiles", "id"],
      ["candidate_profile", "candidate_profiles", "id"],
      ["employer_profile", "employer_profiles", "id"],
      ["applications", "applications", "candidate_id"],
      ["saved_jobs", "saved_jobs", "user_id"],
      ["saved_candidates", "saved_candidates", "employer_id"],
      ["consents", "user_consents", "user_id"],
      ["verification_requests", "verification_requests", "user_id"],
      ["my_reports", "reports", "reporter_id"],
      ["my_blocks", "blocked_users", "blocker_id"],
    ];
    const out = { exportedAt: new Date().toISOString(), userId: owner };
    for (const [key, table, col] of tables) {
      const { data } = await supabase.from(table).select("*").eq(col, owner);
      out[key] = data || [];
    }
    // Own messages only.
    const { data: msgs } = await supabase.from("messages").select("*").eq("sender_id", owner);
    out.my_messages = msgs || [];
    return out;
  } catch (err) {
    throw toServiceError(err);
  }
}
