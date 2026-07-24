/**
 * Messaging service. Membership and blocking are enforced by RLS and a
 * server-side trigger — a user can only read/write conversations they belong
 * to, cannot add themselves to a conversation, and cannot message someone who
 * has blocked them.
 */
import { requireClient } from "./supabase/client.js";
import { toServiceError } from "./supabase/errors.js";

/** Start (or reuse) a conversation between the caller and another user. */
export async function createConversation({ otherUserId, jobId = null }) {
  try {
    const supabase = requireClient();
    // A SECURITY DEFINER RPC creates the conversation and both membership rows
    // atomically, after checking neither party has blocked the other.
    const { data, error } = await supabase.rpc("start_conversation", {
      p_other_user: otherUserId,
      p_job_id: jobId,
    });
    if (error) throw error;
    return data; // conversation id
  } catch (err) {
    throw toServiceError(err);
  }
}

export async function listMyConversations() {
  try {
    const supabase = requireClient();
    const { data, error } = await supabase
      .from("conversations")
      .select("id, job_id, created_at, conversation_members!inner(user_id)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    throw toServiceError(err);
  }
}

export async function listMessages(conversationId) {
  try {
    const supabase = requireClient();
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    throw toServiceError(err);
  }
}

export async function sendMessage({ conversationId, body }) {
  try {
    const text = (body || "").trim();
    if (!text) {
      const e = new Error("empty"); e.code = "unknown"; e.__isServiceError = true;
      e.userMessage = { mn: "Мессеж хоосон байна.", en: "Message is empty." };
      throw e;
    }
    const supabase = requireClient();
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: u.user.id, body: text.slice(0, 4000) })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    throw toServiceError(err);
  }
}
