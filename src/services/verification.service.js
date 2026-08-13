/**
 * Verification service — a user submits evidence for phone / identity / company
 * verification. The row is created with status 'pending'; approval is an
 * admin/server action (RLS: users insert own pending rows, only admins update).
 * A verified result is never set by the client.
 */
import { requireClient } from "./supabase/client.js";
import { toServiceError } from "./supabase/errors.js";
import { uploadFile } from "./storage.service.js";

async function currentUserId() {
  const supabase = requireClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    const e = new Error("not_authenticated"); e.code = "not_authenticated"; e.__isServiceError = true;
    throw e;
  }
  return data.user.id;
}

/** The caller's own verification requests. */
export async function getMyVerifications() {
  try {
    const supabase = requireClient();
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from("verification_requests")
      .select("id, kind, status, document_path, reviewer_note, created_at, decided_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    throw toServiceError(err);
  }
}

/**
 * Submit a verification request. Optionally uploads a document (to the private
 * `identity` bucket) first, then records a pending request. Never sets verified.
 * @param {{ kind: 'phone'|'identity'|'company', file?: File }} args
 */
export async function submitVerification({ kind, file }) {
  try {
    const supabase = requireClient();
    const uid = await currentUserId();
    let documentPath = null;
    if (file) {
      const { path } = await uploadFile({ bucket: "identity", file });
      documentPath = path;
    }
    const { data, error } = await supabase
      .from("verification_requests")
      .insert({ user_id: uid, kind, document_path: documentPath, status: "pending" })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    throw toServiceError(err);
  }
}
