/**
 * Notification service — reads the caller's own notifications and marks them
 * read. Rows are created server-side (create_notification DEFINER + triggers on
 * applications/messages), never by the client. RLS restricts reads/updates to
 * the owner.
 */
import { requireClient } from "./supabase/client.js";
import { toServiceError } from "./supabase/errors.js";

async function currentUserId() {
  const supabase = requireClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    const e = new Error("not_authenticated"); e.code = "not_authenticated"; e.__isServiceError = true;
    throw e;
  }
  return data.user.id;
}

/** Most recent notifications for the caller. */
export async function listMyNotifications({ limit = 30 } = {}) {
  try {
    const supabase = requireClient();
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, title, body, data, read_at, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (err) {
    throw toServiceError(err);
  }
}

/** Count of unread notifications. */
export async function unreadCount() {
  try {
    const supabase = requireClient();
    const uid = await currentUserId();
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .is("read_at", null);
    if (error) throw error;
    return count || 0;
  } catch (err) {
    throw toServiceError(err);
  }
}

/** Mark one notification read. */
export async function markRead(id) {
  try {
    const supabase = requireClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .is("read_at", null);
    if (error) throw error;
  } catch (err) {
    throw toServiceError(err);
  }
}

/** Mark all the caller's notifications read. */
export async function markAllRead() {
  try {
    const supabase = requireClient();
    const uid = await currentUserId();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", uid)
      .is("read_at", null);
    if (error) throw error;
  } catch (err) {
    throw toServiceError(err);
  }
}
