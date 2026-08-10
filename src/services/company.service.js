/**
 * Company service — the caller's own company row. Jobs and employer billing are
 * scoped to a company, and jobs.company_id is NOT NULL, so an employer needs a
 * company before they can post jobs. RLS (companies_write: owner_id = auth.uid)
 * ensures a user only ever touches their own company.
 */
import { requireClient } from "./supabase/client.js";
import { toServiceError } from "./supabase/errors.js";

async function currentUserId() {
  const supabase = requireClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    const e = new Error("not_authenticated"); e.code = "not_authenticated"; e.__isServiceError = true;
    e.userMessage = { mn: "Нэвтэрнэ үү.", en: "Please sign in." };
    throw e;
  }
  return data.user.id;
}

/** The caller's company (first one they own), or null. */
export async function getMyCompany() {
  try {
    const supabase = requireClient();
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("owner_id", uid)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    throw toServiceError(err);
  }
}

/** Return the caller's company, creating it if none exists yet. */
export async function getOrCreateCompany({ name, regNumber, website, industry, headcount } = {}) {
  try {
    const existing = await getMyCompany();
    if (existing) return existing;
    const supabase = requireClient();
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from("companies")
      .insert({
        owner_id: uid,
        name: name || "My Company",
        reg_number: regNumber || null,
        website: website || null,
        industry: industry || null,
        headcount: Number(headcount) || null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    throw toServiceError(err);
  }
}
