/**
 * Report & block service. Reports feed a moderation queue only admins can
 * read; blocks are enforced server-side by RLS on the messaging tables.
 */
import { requireClient } from "./supabase/client.js";
import { toServiceError } from "./supabase/errors.js";

export const REPORT_REASONS = ["fake", "impersonation", "scam", "offensive", "unauthorized_data", "other"];

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
 * File a report. `subjectType` is 'profile' | 'job' | 'message'.
 * A partial unique index in the DB stops the same reporter spamming the same
 * subject for the same reason.
 */
export async function reportEntity({ subjectType, subjectId, reason, detail }) {
  try {
    if (!REPORT_REASONS.includes(reason)) {
      const e = new Error("bad_reason"); e.code = "unknown"; e.__isServiceError = true;
      e.userMessage = { mn: "Шалтгаан сонгоно уу.", en: "Please choose a reason." };
      throw e;
    }
    const supabase = requireClient();
    const reporter = await uid();
    const { error } = await supabase.from("reports").insert({
      reporter_id: reporter,
      subject_type: subjectType,
      subject_id: subjectId,
      reason,
      detail: (detail || "").slice(0, 1000),
    });
    if (error && error.code !== "23505") throw error; // 23505 = duplicate, treat as success
    return true;
  } catch (err) {
    throw toServiceError(err);
  }
}

/** Block another user. Enforced by RLS on conversations/messages. */
export async function blockUser({ blockedUserId }) {
  try {
    const supabase = requireClient();
    const blocker = await uid();
    if (blocker === blockedUserId) {
      const e = new Error("self_block"); e.code = "unknown"; e.__isServiceError = true;
      e.userMessage = { mn: "Өөрийгөө хориглох боломжгүй.", en: "You cannot block yourself." };
      throw e;
    }
    const { error } = await supabase.from("blocked_users").upsert(
      { blocker_id: blocker, blocked_id: blockedUserId },
      { onConflict: "blocker_id,blocked_id" }
    );
    if (error) throw error;
    return true;
  } catch (err) {
    throw toServiceError(err);
  }
}

export async function unblockUser({ blockedUserId }) {
  try {
    const supabase = requireClient();
    const blocker = await uid();
    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", blocker)
      .eq("blocked_id", blockedUserId);
    if (error) throw error;
    return true;
  } catch (err) {
    throw toServiceError(err);
  }
}

export async function listMyBlocks() {
  try {
    const supabase = requireClient();
    const blocker = await uid();
    const { data, error } = await supabase
      .from("blocked_users")
      .select("blocked_id, created_at")
      .eq("blocker_id", blocker);
    if (error) throw error;
    return data || [];
  } catch (err) {
    throw toServiceError(err);
  }
}
