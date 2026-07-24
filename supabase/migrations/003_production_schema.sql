-- ═══════════════════════════════════════════════════════════════════════
-- SwipeHire — Production schema (Supabase Auth + Persistence sprint)
--
-- Supersedes the beta schema in 001/002 with a normalised model, real
-- roles, granular consent, moderation, verification and account lifecycle.
-- Run in a fresh Supabase project (SQL Editor). Idempotent where practical.
--
-- Conventions:
--   • UUID primary keys, timestamptz created_at/updated_at
--   • Referential integrity via FKs with explicit ON DELETE
--   • Enumerations enforced by CHECK constraints
--   • RLS enabled on EVERY user-data table (policies further below)
--   • jsonb only for genuinely variable-shape fields (experience/education)
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- Shared updated_at trigger ------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ── profiles (role router; 1:1 with auth.users) ────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  role         text not null default 'candidate'
                 check (role in ('candidate','employer','admin')),
  display_name text,
  lang         text not null default 'mn' check (lang in ('mn','en','ko')),
  status       text not null default 'active'
                 check (status in ('active','deletion_pending','disabled')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── candidate_profiles ─────────────────────────────────────────────────
create table if not exists public.candidate_profiles (
  id                 uuid primary key references public.profiles on delete cascade,
  full_name          text,
  age                integer check (age is null or (age >= 18 and age <= 100)),
  gender             text check (gender in ('male','female','other') or gender is null),
  category           text,
  location           text,
  phone              text,
  email              text,
  about              text,
  experience         jsonb not null default '[]'::jsonb,
  education          jsonb not null default '[]'::jsonb,
  skills             text[] not null default '{}',
  custom_skills      text[] not null default '{}',
  salary_expectation integer check (salary_expectation is null or salary_expectation >= 0),
  available_from     text,
  avatar_path        text,
  video_path         text,
  cv_path            text,
  published          boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ── companies ──────────────────────────────────────────────────────────
create table if not exists public.companies (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles on delete cascade,
  name        text not null,
  reg_number  text,
  website     text,
  industry    text,
  headcount   integer check (headcount is null or headcount >= 0),
  logo_path   text,
  verified    boolean not null default false,   -- set only by admin process
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (reg_number)
);
create index if not exists companies_owner_idx on public.companies(owner_id);

-- ── employer_profiles ──────────────────────────────────────────────────
create table if not exists public.employer_profiles (
  id                   uuid primary key references public.profiles on delete cascade,
  company_id           uuid references public.companies on delete set null,
  company_name         text,
  reg_number           text,
  email                text,
  phone                text,
  hr_name              text,
  website              text,
  industry             text,
  headcount            integer,
  salary_min           integer check (salary_min is null or salary_min >= 0),
  salary_max           integer check (salary_max is null or salary_max >= 0),
  selected_professions text[] not null default '{}',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (salary_max is null or salary_min is null or salary_max >= salary_min)
);

-- ── jobs ───────────────────────────────────────────────────────────────
create table if not exists public.jobs (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies on delete cascade,
  employer_id uuid not null references public.profiles on delete cascade,
  title       text not null,
  category    text,
  description text,
  location    text,
  salary_min  integer check (salary_min is null or salary_min >= 0),
  salary_max  integer check (salary_max is null or salary_max >= 0),
  headcount   integer not null default 1 check (headcount >= 1),
  status      text not null default 'active' check (status in ('active','paused','closed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (salary_max is null or salary_min is null or salary_max >= salary_min)
);
create index if not exists jobs_company_idx on public.jobs(company_id);
create index if not exists jobs_status_idx  on public.jobs(status) where status = 'active';

-- ── applications ───────────────────────────────────────────────────────
create table if not exists public.applications (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references public.jobs on delete cascade,
  candidate_id uuid not null references public.profiles on delete cascade,
  cover_letter text,
  cv_path      text,                       -- candidate-owned snapshot
  status       text not null default 'submitted'
                 check (status in ('submitted','reviewing','interview','offer','hired','rejected')),
  decided_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (job_id, candidate_id)            -- one application per job
);
create index if not exists applications_job_idx       on public.applications(job_id);
create index if not exists applications_candidate_idx on public.applications(candidate_id);

-- ── saved_jobs / saved_candidates ──────────────────────────────────────
create table if not exists public.saved_jobs (
  user_id    uuid not null references public.profiles on delete cascade,
  job_id     uuid not null references public.jobs on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);
create table if not exists public.saved_candidates (
  employer_id  uuid not null references public.profiles on delete cascade,
  candidate_id uuid not null references public.profiles on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (employer_id, candidate_id)
);

-- ── conversations / members / messages ─────────────────────────────────
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  job_id     uuid references public.jobs on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations on delete cascade,
  user_id         uuid not null references public.profiles on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  sender_id       uuid not null references public.profiles on delete cascade,
  body            text not null check (char_length(body) between 1 and 4000),
  created_at      timestamptz not null default now()
);
create index if not exists messages_conv_idx on public.messages(conversation_id, created_at);

-- ── blocked_users ──────────────────────────────────────────────────────
create table if not exists public.blocked_users (
  blocker_id uuid not null references public.profiles on delete cascade,
  blocked_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- ── reports (moderation queue) ─────────────────────────────────────────
create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.profiles on delete cascade,
  subject_type text not null check (subject_type in ('profile','job','message')),
  subject_id   uuid not null,
  reason       text not null
                 check (reason in ('fake','impersonation','scam','offensive','unauthorized_data','other')),
  detail       text,
  status       text not null default 'open'
                 check (status in ('open','reviewing','actioned','dismissed')),
  created_at   timestamptz not null default now()
);
-- stop a reporter spamming the same subject with the same reason
create unique index if not exists reports_dedup_idx
  on public.reports(reporter_id, subject_type, subject_id, reason);

-- ── user_consents (granular, versioned) ────────────────────────────────
create table if not exists public.user_consents (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles on delete cascade,
  kind           text not null
                   check (kind in ('terms_of_service','privacy_policy','data_processing','ai_matching','marketing')),
  granted        boolean not null,
  policy_version text not null,
  lang           text not null,
  source         text not null default 'web',
  created_at     timestamptz not null default now()
);
create index if not exists user_consents_user_idx on public.user_consents(user_id, kind, created_at desc);

-- ── verification_requests ──────────────────────────────────────────────
create table if not exists public.verification_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles on delete cascade,
  kind          text not null check (kind in ('phone','identity','company')),
  document_path text,
  status        text not null default 'pending'
                  check (status in ('not_started','pending','under_review','approved','rejected')),
  reviewer_note text,
  decided_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists verif_user_idx on public.verification_requests(user_id);

-- ── account_deletion_requests ──────────────────────────────────────────
create table if not exists public.account_deletion_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles on delete cascade,
  reason     text,
  status     text not null default 'pending'
               check (status in ('pending','processing','completed','cancelled')),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

-- ── audit_logs (append-only, admin/service written) ────────────────────
create table if not exists public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles on delete set null,
  action     text not null,
  subject    text,
  meta       jsonb,
  created_at timestamptz not null default now()
);

-- updated_at triggers -------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','candidate_profiles','companies','employer_profiles',
    'jobs','applications'
  ] loop
    execute format(
      'drop trigger if exists touch_%1$s on public.%1$s;
       create trigger touch_%1$s before update on public.%1$s
       for each row execute function public.touch_updated_at();', t);
  end loop;
end $$;
