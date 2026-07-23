import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession:    true,
        autoRefreshToken:  true,
        detectSessionInUrl: false,
      },
    })
  : null;

// ── Retry wrapper (3 attempts, exponential back-off) ──────
async function withRetry(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fn();
      if (res?.error) throw res.error;
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 600 * (i + 1)));
    }
  }
}

// ── Role router ───────────────────────────────────────────

export async function upsertProfile(userId, role) {
  if (!supabase) return null;
  return withRetry(() =>
    supabase.from('profiles').upsert(
      { id: userId, role },
      { onConflict: 'id' }
    )
  );
}

// ── Seeker profile ────────────────────────────────────────

export async function saveSeekerProfile(userId, form, meta = {}) {
  if (!supabase) return null;
  return withRetry(() =>
    supabase.from('seeker_profiles').upsert({
      id:             userId,
      name:           form.name            || '',
      age:            Number(form.age)     || null,
      gender:         form.gender          || '',
      category:       form.category        || '',
      location:       form.location        || '',
      phone:          form.phone           || '',
      email:          form.email           || '',
      about:          form.about           || '',
      experience:     form.experience      || [],
      education:      form.education       || [],
      skills:         form.skills          || [],
      custom_skills:  form.customSkills    || [],
      video_mode:     form.videoMode       || '',
      certs:          form.certs           || [],
      salary:         Number(form.salary)  || null,
      available_from: form.availableFrom   || '',
      published:      meta.published       ?? false,
      updated_at:     new Date().toISOString(),
    }, { onConflict: 'id' })
  );
}

export async function loadSeekerProfile(userId) {
  if (!supabase) return null;
  try {
    const { data, error } = await withRetry(() =>
      supabase.from('seeker_profiles')
        .select('*, seeker_verification(*), skill_tests(*)')
        .eq('id', userId)
        .maybeSingle()
    );
    return error ? null : data;
  } catch { return null; }
}

export async function saveSeekerVerification(userId, verified) {
  if (!supabase) return null;
  return withRetry(() =>
    supabase.from('seeker_verification').upsert({
      seeker_id:      userId,
      phone_verified: !!verified.phone,
      id_verified:    !!verified.id,
      skill_verified: !!verified.skill,
      updated_at:     new Date().toISOString(),
    }, { onConflict: 'seeker_id' })
  );
}

export async function saveSkillTest(userId, score, level, completed) {
  if (!supabase) return null;
  return withRetry(() =>
    supabase.from('skill_tests').upsert({
      seeker_id:    userId,
      score,
      level,
      completed:    !!completed,
      completed_at: completed ? new Date().toISOString() : null,
    }, { onConflict: 'seeker_id' })
  );
}

// ── Employer profile ──────────────────────────────────────

export async function saveEmployerProfile(userId, data) {
  if (!supabase) return null;
  return withRetry(() =>
    supabase.from('employer_profiles').upsert({
      id:             userId,
      company_name:   data.name          || data.company_name  || '',
      reg_num:        data.regNum        || data.reg_num        || '',
      email:          data.email         || '',
      phone:          data.phone         || '',
      hr_name:        data.hrName        || data.hr_name        || '',
      website:        data.website       || '',
      linkedin:       data.linkedin      || '',
      founder_name:   data.founderName   || data.founder_name   || '',
      industry:       data.industry      || '',
      country_code:   data.country?.code || data.country_code   || '',
      verify_path:    data.verifyPath    || data.verify_path    || '',
      trust_level:    data.trustLevel    || data.trust_level    || 'basic',
      submitted:      true,
      admin_verified: data.adminVerified || data.admin_verified || false,
      selected_profs: data.selectedProfs || data.selected_profs || [],
      salary_min:     Number(data.salaryMin  || data.salary_min)  || null,
      salary_max:     Number(data.salaryMax  || data.salary_max)  || null,
      headcount:      Number(data.headcount) || null,
      updated_at:     new Date().toISOString(),
    }, { onConflict: 'id' })
  );
}

export async function loadEmployerProfile(userId) {
  if (!supabase) return null;
  try {
    const { data, error } = await withRetry(() =>
      supabase.from('employer_profiles').select('*').eq('id', userId).maybeSingle()
    );
    return error ? null : data;
  } catch { return null; }
}

// ── Employer pipeline (stages + notes) ───────────────────

export async function savePipelineEntry(userId, candidateId, stage, note) {
  if (!supabase) return null;
  return withRetry(() =>
    supabase.from('employer_pipeline').upsert({
      employer_id:  userId,
      candidate_id: String(candidateId),
      stage:        stage || 'saved',
      note:         note  || '',
      updated_at:   new Date().toISOString(),
    }, { onConflict: 'employer_id,candidate_id' })
  );
}

export async function loadPipeline(userId) {
  if (!supabase) return [];
  try {
    const { data, error } = await withRetry(() =>
      supabase.from('employer_pipeline').select('*').eq('employer_id', userId)
    );
    return error ? [] : (data || []);
  } catch { return []; }
}

// ── Employer saved candidates ─────────────────────────────

export async function saveSavedCandidate(userId, candidateId) {
  if (!supabase) return null;
  return withRetry(() =>
    supabase.from('employer_saved_candidates').upsert(
      { employer_id: userId, candidate_id: String(candidateId) },
      { onConflict: 'employer_id,candidate_id' }
    )
  );
}

export async function removeSavedCandidate(userId, candidateId) {
  if (!supabase) return null;
  return withRetry(() =>
    supabase.from('employer_saved_candidates')
      .delete()
      .eq('employer_id',  userId)
      .eq('candidate_id', String(candidateId))
  );
}

export async function loadSavedCandidates(userId) {
  if (!supabase) return [];
  try {
    const { data, error } = await withRetry(() =>
      supabase.from('employer_saved_candidates')
        .select('candidate_id')
        .eq('employer_id', userId)
    );
    return error ? [] : (data || []).map(r => r.candidate_id);
  } catch { return []; }
}

// ── Feed: published real seekers ──────────────────────────

export async function loadPublishedSeekers() {
  if (!supabase) return [];
  try {
    const { data, error } = await withRetry(() =>
      supabase.from('seeker_profiles')
        .select('*, seeker_verification(*), skill_tests(*)')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(200)
    );
    if (error) return [];
    return (data || []).map(seekerRowToCandidate);
  } catch { return []; }
}

function seekerRowToCandidate(row) {
  const v = row.seeker_verification?.[0] || {};
  const t = row.skill_tests?.[0]         || {};
  return {
    id:            row.id,
    name:          row.name            || 'Нэргүй',
    age:           row.age             || 25,
    gender:        row.gender          || '',
    category:      row.category        || '',
    location:      row.location        || '',
    years:         (row.experience || []).length || 0,
    salary:        row.salary          || 0,
    available:     true,
    availableFrom: row.available_from  || 'Шууд',
    phone:         row.phone           || '',
    email:         row.email           || '',
    about:         row.about           || '',
    pitch:         row.about           || '',
    skills:        row.skills          || [],
    certs:         row.certs           || [],
    experience:    row.experience      || [],
    education:     row.education       || [],
    verified: {
      phone: !!v.phone_verified,
      id:    !!v.id_verified,
      skill: !!v.skill_verified,
    },
    skillTestScore: t.score  ?? null,
    skillTestLevel: t.level  || '',
    transcript:     row.about || '',
    ai: {
      resume:    row.about             || '',
      coreSkill: row.skills?.[0]       || '—',
      level:     'Дунд',
      bestFit:   row.category          || '—',
      strengths: (row.skills || []).slice(0, 3),
    },
    isLive: true,
  };
}
