/**
 * Profile service — reads and writes the caller's own profile rows.
 * RLS guarantees a user can only touch their own record; these functions
 * never accept a target user id from the UI for writes.
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

/** The caller's base profile (role router row). */
export async function getCurrentProfile() {
  try {
    const supabase = requireClient();
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, role, display_name, lang, created_at")
      .eq("id", uid)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    throw toServiceError(err);
  }
}

/** Upsert the caller's candidate profile. Only whitelisted fields. */
export async function updateCandidateProfile(fields) {
  try {
    const supabase = requireClient();
    const uid = await currentUserId();
    const row = {
      id: uid,
      full_name: fields.name || null,
      age: Number(fields.age) || null,
      gender: fields.gender || null,       // optional, never used for ranking
      category: fields.category || null,
      location: fields.location || null,
      phone: fields.phone || null,
      email: fields.email || null,
      about: fields.about || null,
      experience: fields.experience || [],
      education: fields.education || [],
      skills: fields.skills || [],
      custom_skills: fields.customSkills || [],
      salary_expectation: Number(fields.salary) || null,
      available_from: fields.availableFrom || null,
      published: Boolean(fields.published),
      updated_at: new Date().toISOString(),
    };
    if (fields.avatarPath !== undefined) row.avatar_path = fields.avatarPath || null;
    const { data, error } = await supabase
      .from("candidate_profiles")
      .upsert(row, { onConflict: "id" })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    throw toServiceError(err);
  }
}

/** Upsert the caller's employer profile. */
export async function updateEmployerProfile(fields) {
  try {
    const supabase = requireClient();
    const uid = await currentUserId();
    const row = {
      id: uid,
      company_name: fields.name || null,
      reg_number: fields.regNum || null,
      email: fields.email || null,
      phone: fields.phone || null,
      hr_name: fields.hrName || null,
      website: fields.website || null,
      industry: fields.industry || null,
      headcount: Number(fields.headcount) || null,
      salary_min: Number(fields.salaryMin) || null,
      salary_max: Number(fields.salaryMax) || null,
      selected_professions: fields.selectedProfs || [],
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("employer_profiles")
      .upsert(row, { onConflict: "id" })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    throw toServiceError(err);
  }
}

/** The caller's own candidate profile row, or null if none yet. */
export async function getCandidateProfile() {
  try {
    const supabase = requireClient();
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from("candidate_profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    throw toServiceError(err);
  }
}

/** The caller's own employer profile row, or null if none yet. */
export async function getEmployerProfile() {
  try {
    const supabase = requireClient();
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from("employer_profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    throw toServiceError(err);
  }
}

/** Published candidates visible to employers (RLS returns only safe columns). */
export async function listPublishedCandidates({ limit = 50 } = {}) {
  try {
    const supabase = requireClient();
    const { data, error } = await supabase
      .from("candidate_public_view")
      .select("*")
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (err) {
    throw toServiceError(err);
  }
}
