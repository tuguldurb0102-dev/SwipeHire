-- ═══════════════════════════════════════════════════════
-- SwipeHire — Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════════

-- ── profiles: role router (1 row per auth user) ──────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  role       text        NOT NULL CHECK (role IN ('seeker', 'employer')),
  lang       text        NOT NULL DEFAULT 'mn',
  created_at timestamptz DEFAULT now()
);

-- ── seeker_profiles ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seeker_profiles (
  id             uuid        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name           text,
  age            integer,
  gender         text,
  category       text,
  location       text,
  phone          text,
  email          text,
  about          text,
  experience     jsonb       DEFAULT '[]'::jsonb,
  education      jsonb       DEFAULT '[]'::jsonb,
  skills         text[]      DEFAULT '{}',
  custom_skills  text[]      DEFAULT '{}',
  video_mode     text,
  certs          text[]      DEFAULT '{}',
  cv_file_url    text,
  video_file_url text,
  salary         integer,
  available_from text,
  published      boolean     DEFAULT false,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- ── seeker_verification ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seeker_verification (
  seeker_id      uuid        PRIMARY KEY REFERENCES public.seeker_profiles ON DELETE CASCADE,
  phone_verified boolean     DEFAULT false,
  id_verified    boolean     DEFAULT false,
  skill_verified boolean     DEFAULT false,
  updated_at     timestamptz DEFAULT now()
);

-- ── skill_tests ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.skill_tests (
  seeker_id    uuid        PRIMARY KEY REFERENCES public.seeker_profiles ON DELETE CASCADE,
  score        integer,
  level        text,
  completed    boolean     DEFAULT false,
  completed_at timestamptz
);

-- ── employer_profiles ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employer_profiles (
  id             uuid        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  company_name   text,
  reg_num        text,
  email          text,
  phone          text,
  hr_name        text,
  website        text,
  linkedin       text,
  founder_name   text,
  industry       text,
  country_code   text,
  verify_path    text,
  trust_level    text        DEFAULT 'basic',
  submitted      boolean     DEFAULT false,
  admin_verified boolean     DEFAULT false,
  selected_profs text[]      DEFAULT '{}',
  salary_min     integer,
  salary_max     integer,
  headcount      integer,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- ── employer_saved_candidates ────────────────────────────
-- candidate_id is text to hold both integer demo IDs ("1") and real UUIDs
CREATE TABLE IF NOT EXISTS public.employer_saved_candidates (
  employer_id  uuid        REFERENCES auth.users ON DELETE CASCADE,
  candidate_id text        NOT NULL,
  created_at   timestamptz DEFAULT now(),
  PRIMARY KEY (employer_id, candidate_id)
);

-- ── employer_pipeline (stages + notes) ───────────────────
CREATE TABLE IF NOT EXISTS public.employer_pipeline (
  employer_id  uuid        REFERENCES auth.users ON DELETE CASCADE,
  candidate_id text        NOT NULL,
  stage        text        DEFAULT 'saved',
  note         text        DEFAULT '',
  updated_at   timestamptz DEFAULT now(),
  PRIMARY KEY (employer_id, candidate_id)
);

-- ══════════════════════════════════════════════════════════
-- Row-Level Security
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seeker_profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seeker_verification       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_tests               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_saved_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_pipeline         ENABLE ROW LEVEL SECURITY;

-- profiles: own row only
CREATE POLICY "profiles_own" ON public.profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- seeker_profiles: published rows readable by any authenticated user; own row fully writable
CREATE POLICY "seeker_read"  ON public.seeker_profiles
  FOR SELECT USING (published = true OR auth.uid() = id);
CREATE POLICY "seeker_write" ON public.seeker_profiles
  FOR ALL    USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- seeker_verification: any authenticated user can read; owner writes
CREATE POLICY "verif_read"  ON public.seeker_verification
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "verif_write" ON public.seeker_verification
  FOR ALL    USING (auth.uid() = seeker_id) WITH CHECK (auth.uid() = seeker_id);

-- skill_tests: any authenticated user can read; owner writes
CREATE POLICY "skill_read"  ON public.skill_tests
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "skill_write" ON public.skill_tests
  FOR ALL    USING (auth.uid() = seeker_id) WITH CHECK (auth.uid() = seeker_id);

-- employer_profiles: own only
CREATE POLICY "emp_own" ON public.employer_profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- employer_saved_candidates: own employer_id only
CREATE POLICY "saved_own" ON public.employer_saved_candidates
  FOR ALL USING (auth.uid() = employer_id) WITH CHECK (auth.uid() = employer_id);

-- employer_pipeline: own employer_id only
CREATE POLICY "pipeline_own" ON public.employer_pipeline
  FOR ALL USING (auth.uid() = employer_id) WITH CHECK (auth.uid() = employer_id);

-- ══════════════════════════════════════════════════════════
-- Storage Buckets
-- Create these manually in Supabase Dashboard → Storage
-- ══════════════════════════════════════════════════════════
-- Bucket: "videos"       — private, 100 MB per file
-- Bucket: "certificates" — private, 10 MB per file
-- Bucket: "cv-pdfs"      — private, 5 MB per file
--
-- Storage policies (run per bucket):
--   SELECT: (auth.role() = 'authenticated')
--   INSERT: ((storage.foldername(name))[1] = auth.uid()::text)
--   UPDATE: ((storage.foldername(name))[1] = auth.uid()::text)
--   DELETE: ((storage.foldername(name))[1] = auth.uid()::text)
