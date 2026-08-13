/**
 * Job service. Employers manage jobs for their own company only; candidates
 * read active jobs. Ownership is enforced by RLS, not by these functions.
 */
import { requireClient } from "./supabase/client.js";
import { toServiceError } from "./supabase/errors.js";

export async function listActiveJobs({ category, limit = 50 } = {}) {
  try {
    const supabase = requireClient();
    let q = supabase.from("jobs").select("*").eq("status", "active").order("created_at", { ascending: false }).limit(limit);
    if (category) q = q.eq("category", category);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  } catch (err) {
    throw toServiceError(err);
  }
}

/** The caller's own jobs (any status). RLS restricts to the employer's rows. */
export async function listMyJobs() {
  try {
    const supabase = requireClient();
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("employer_id", u.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    throw toServiceError(err);
  }
}

export async function createJob(job) {
  try {
    const supabase = requireClient();
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("jobs")
      .insert({
        employer_id: u.user.id,
        company_id: job.companyId,
        title: job.title,
        category: job.category,
        description: job.description || null,
        location: job.location || null,
        salary_min: Number(job.salaryMin) || null,
        salary_max: Number(job.salaryMax) || null,
        headcount: Number(job.headcount) || 1,
        status: "active",
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    throw toServiceError(err);
  }
}

export async function updateJob(jobId, patch) {
  try {
    const supabase = requireClient();
    const { data, error } = await supabase
      .from("jobs")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", jobId) // RLS additionally restricts to own company
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    throw toServiceError(err);
  }
}

export async function saveJob(jobId) {
  try {
    const supabase = requireClient();
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("saved_jobs")
      .upsert({ user_id: u.user.id, job_id: jobId }, { onConflict: "user_id,job_id" });
    if (error) throw error;
    return true;
  } catch (err) {
    throw toServiceError(err);
  }
}
