/**
 * Application service. A candidate applies to a job; the employer reviews.
 * RLS ensures candidates see only their own applications and employers see
 * only applications to their own company's jobs. Candidates cannot edit the
 * employer's decision fields and employers cannot edit candidate-owned
 * content (cover letter, CV snapshot).
 */
import { requireClient } from "./supabase/client.js";
import { toServiceError } from "./supabase/errors.js";

export async function applyToJob({ jobId, coverLetter, cvPath }) {
  try {
    const supabase = requireClient();
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("applications")
      .insert({
        job_id: jobId,
        candidate_id: u.user.id,
        cover_letter: (coverLetter || "").slice(0, 4000),
        cv_path: cvPath || null,
        status: "submitted", // candidate cannot set any other status
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    throw toServiceError(err);
  }
}

/** Candidate: my applications. */
export async function listMyApplications() {
  try {
    const supabase = requireClient();
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("applications")
      .select("*, jobs(title, company_id)")
      .eq("candidate_id", u.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    throw toServiceError(err);
  }
}

/** Employer: applications to a job my company owns (RLS-restricted). */
/**
 * Applications to the caller's own company jobs. RLS (app_read) already scopes
 * rows to jobs the caller's company owns, so no company filter is needed here.
 */
export async function listCompanyApplications() {
  try {
    const supabase = requireClient();
    const { data, error } = await supabase
      .from("applications")
      .select("id, job_id, candidate_id, status, cover_letter, created_at, jobs(title)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    throw toServiceError(err);
  }
}

export async function listJobApplications(jobId) {
  try {
    const supabase = requireClient();
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    throw toServiceError(err);
  }
}

/** Employer: set the decision on an application (RLS restricts to own jobs). */
export async function setApplicationStatus(applicationId, status) {
  try {
    const allowed = ["submitted", "reviewing", "interview", "offer", "hired", "rejected"];
    if (!allowed.includes(status)) {
      const e = new Error("bad_status"); e.code = "unknown"; e.__isServiceError = true;
      e.userMessage = { mn: "Буруу төлөв.", en: "Invalid status." };
      throw e;
    }
    const supabase = requireClient();
    const { data, error } = await supabase
      .from("applications")
      .update({ status, decided_at: new Date().toISOString() })
      .eq("id", applicationId)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    throw toServiceError(err);
  }
}

/** Candidate ids the caller (employer) has saved. */
export async function listSavedCandidates() {
  try {
    const supabase = requireClient();
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("saved_candidates")
      .select("candidate_id")
      .eq("employer_id", u.user.id);
    if (error) throw error;
    return (data || []).map((r) => r.candidate_id);
  } catch (err) {
    throw toServiceError(err);
  }
}

/** Remove a saved candidate. */
export async function unsaveCandidate(candidateId) {
  try {
    const supabase = requireClient();
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("saved_candidates")
      .delete()
      .eq("employer_id", u.user.id)
      .eq("candidate_id", candidateId);
    if (error) throw error;
    return true;
  } catch (err) {
    throw toServiceError(err);
  }
}

export async function saveCandidate(candidateId) {
  try {
    const supabase = requireClient();
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("saved_candidates")
      .upsert({ employer_id: u.user.id, candidate_id: candidateId }, { onConflict: "employer_id,candidate_id" });
    if (error) throw error;
    return true;
  } catch (err) {
    throw toServiceError(err);
  }
}
