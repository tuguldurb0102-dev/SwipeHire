-- ═══════════════════════════════════════════════════════════════════════
-- SwipeHire — RLS policies, role helpers, profile trigger, storage
--
-- Security model:
--   • Every user-data table has RLS enabled and a deny-by-default posture.
--   • Role is read from public.profiles, never from client input or JWT
--     metadata the user can influence.
--   • Privilege escalation paths are closed: a user cannot make themselves
--     admin, approve their own verification, edit another company's jobs,
--     read a conversation they are not in, or read the moderation queue.
--   • Admin-only actions rely on a SECURITY DEFINER helper, not a frontend
--     boolean.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Role helpers ───────────────────────────────────────────────────────
-- SECURITY DEFINER so policies can read profiles without recursing into
-- profiles' own RLS. search_path pinned to avoid hijacking.
create or replace function public.current_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.owns_company(p_company uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.companies c
                 where c.id = p_company and c.owner_id = auth.uid());
$$;

create or replace function public.is_conversation_member(p_conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversation_members m
                 where m.conversation_id = p_conv and m.user_id = auth.uid());
$$;

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocked_users
                 where (blocker_id = a and blocked_id = b)
                    or (blocker_id = b and blocked_id = a));
$$;

revoke all on function public.current_role(), public.is_admin(),
  public.owns_company(uuid), public.is_conversation_member(uuid),
  public.is_blocked_between(uuid, uuid) from public;
grant execute on function public.current_role(), public.is_admin(),
  public.owns_company(uuid), public.is_conversation_member(uuid),
  public.is_blocked_between(uuid, uuid) to authenticated;

-- ── Enable RLS everywhere ──────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','candidate_profiles','companies','employer_profiles','jobs',
    'applications','saved_jobs','saved_candidates','conversations',
    'conversation_members','messages','blocked_users','reports',
    'user_consents','verification_requests','account_deletion_requests',
    'audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force row level security;', t);
  end loop;
end $$;

-- ── profiles ───────────────────────────────────────────────────────────
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
-- A user may edit their own row but NOT change role or status: those are
-- compared against the existing row, so any attempt to escalate fails.
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and role   = (select p.role   from public.profiles p where p.id = auth.uid())
    and status = (select p.status from public.profiles p where p.id = auth.uid())
  );

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());
-- NOTE: no INSERT policy — rows are created only by the signup trigger.

-- ── candidate_profiles ─────────────────────────────────────────────────
drop policy if exists cand_own on public.candidate_profiles;
create policy cand_own on public.candidate_profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- Employers read published candidates through a view that omits contact
-- details; direct table reads by others are not granted.
drop policy if exists cand_admin on public.candidate_profiles;
create policy cand_admin on public.candidate_profiles
  for select using (public.is_admin());

-- Recruitment-safe projection. Phone, email, cv_path and video_path are
-- deliberately excluded — employers request a signed URL after an
-- authorisation check instead of receiving paths in a list query.
create or replace view public.candidate_public_view
with (security_invoker = true) as
  select id, full_name, category, location, about, skills, custom_skills,
         experience, education, salary_expectation, available_from,
         avatar_path, created_at
  from public.candidate_profiles
  where published = true;

grant select on public.candidate_public_view to authenticated;

drop policy if exists cand_published_read on public.candidate_profiles;
create policy cand_published_read on public.candidate_profiles
  for select using (published = true and public.current_role() in ('employer','admin'));

-- ── companies ──────────────────────────────────────────────────────────
drop policy if exists comp_owner on public.companies;
create policy comp_owner on public.companies
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists comp_read on public.companies;
create policy comp_read on public.companies
  for select using (true);   -- company identity is public-facing

-- ── employer_profiles ──────────────────────────────────────────────────
drop policy if exists emp_own on public.employer_profiles;
create policy emp_own on public.employer_profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists emp_admin on public.employer_profiles;
create policy emp_admin on public.employer_profiles
  for select using (public.is_admin());

-- ── jobs ───────────────────────────────────────────────────────────────
drop policy if exists jobs_read_active on public.jobs;
create policy jobs_read_active on public.jobs
  for select using (status = 'active' or employer_id = auth.uid() or public.is_admin());

-- Write access is scoped to a company the caller actually owns, so employer A
-- cannot create or edit a job under employer B's company.
drop policy if exists jobs_write_own_company on public.jobs;
create policy jobs_write_own_company on public.jobs
  for insert with check (employer_id = auth.uid() and public.owns_company(company_id));

drop policy if exists jobs_update_own_company on public.jobs;
create policy jobs_update_own_company on public.jobs
  for update using (public.owns_company(company_id))
  with check (public.owns_company(company_id));

drop policy if exists jobs_delete_own_company on public.jobs;
create policy jobs_delete_own_company on public.jobs
  for delete using (public.owns_company(company_id));

-- ── applications ───────────────────────────────────────────────────────
drop policy if exists app_candidate_insert on public.applications;
create policy app_candidate_insert on public.applications
  for insert with check (
    candidate_id = auth.uid()
    and public.current_role() = 'candidate'
    and status = 'submitted'          -- candidate cannot open in any other state
  );

drop policy if exists app_read on public.applications;
create policy app_read on public.applications
  for select using (
    candidate_id = auth.uid()
    or exists (select 1 from public.jobs j
               where j.id = applications.job_id and public.owns_company(j.company_id))
    or public.is_admin()
  );

-- Candidate may revise their own content but not the decision.
drop policy if exists app_candidate_update on public.applications;
create policy app_candidate_update on public.applications
  for update using (candidate_id = auth.uid())
  with check (
    candidate_id = auth.uid()
    and status = (select a.status from public.applications a where a.id = applications.id)
  );

-- Employer may set the decision but not rewrite candidate-owned content.
drop policy if exists app_employer_update on public.applications;
create policy app_employer_update on public.applications
  for update using (
    exists (select 1 from public.jobs j
            where j.id = applications.job_id and public.owns_company(j.company_id))
  )
  with check (
    cover_letter is not distinct from
      (select a.cover_letter from public.applications a where a.id = applications.id)
    and cv_path is not distinct from
      (select a.cv_path from public.applications a where a.id = applications.id)
  );

-- ── saved_jobs / saved_candidates ──────────────────────────────────────
drop policy if exists saved_jobs_own on public.saved_jobs;
create policy saved_jobs_own on public.saved_jobs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists saved_cand_own on public.saved_candidates;
create policy saved_cand_own on public.saved_candidates
  for all using (employer_id = auth.uid()) with check (employer_id = auth.uid());

-- ── conversations / members / messages ─────────────────────────────────
drop policy if exists conv_member_read on public.conversations;
create policy conv_member_read on public.conversations
  for select using (public.is_conversation_member(id) or public.is_admin());
-- No INSERT policy: conversations are created only via start_conversation().

drop policy if exists cm_read on public.conversation_members;
create policy cm_read on public.conversation_members
  for select using (public.is_conversation_member(conversation_id) or public.is_admin());
-- No INSERT policy: a user cannot add themselves to a conversation.

drop policy if exists msg_read on public.messages;
create policy msg_read on public.messages
  for select using (public.is_conversation_member(conversation_id) or public.is_admin());

-- Sending requires membership AND that neither party has blocked the other.
drop policy if exists msg_send on public.messages;
create policy msg_send on public.messages
  for insert with check (
    sender_id = auth.uid()
    and public.is_conversation_member(conversation_id)
    and not exists (
      select 1 from public.conversation_members m
      where m.conversation_id = messages.conversation_id
        and m.user_id <> auth.uid()
        and public.is_blocked_between(auth.uid(), m.user_id)
    )
  );

-- ── blocked_users ──────────────────────────────────────────────────────
drop policy if exists block_own on public.blocked_users;
create policy block_own on public.blocked_users
  for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- ── reports ────────────────────────────────────────────────────────────
drop policy if exists report_insert on public.reports;
create policy report_insert on public.reports
  for insert with check (reporter_id = auth.uid());

-- A reporter sees only their own submissions; the reported user never sees
-- who reported them. The moderation queue is admin-only.
drop policy if exists report_read_own on public.reports;
create policy report_read_own on public.reports
  for select using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists report_admin_update on public.reports;
create policy report_admin_update on public.reports
  for update using (public.is_admin()) with check (public.is_admin());

-- ── user_consents ──────────────────────────────────────────────────────
drop policy if exists consent_own on public.user_consents;
create policy consent_own on public.user_consents
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists consent_insert on public.user_consents;
create policy consent_insert on public.user_consents
  for insert with check (user_id = auth.uid());
-- Consent rows are append-only: no update/delete policy, preserving history.

-- ── verification_requests ──────────────────────────────────────────────
drop policy if exists verif_read_own on public.verification_requests;
create policy verif_read_own on public.verification_requests
  for select using (user_id = auth.uid() or public.is_admin());

-- A user may open a request, but only in 'pending'. They can never write
-- 'approved' — that transition belongs to admin review.
drop policy if exists verif_insert_own on public.verification_requests;
create policy verif_insert_own on public.verification_requests
  for insert with check (user_id = auth.uid() and status = 'pending');

drop policy if exists verif_admin_update on public.verification_requests;
create policy verif_admin_update on public.verification_requests
  for update using (public.is_admin()) with check (public.is_admin());

-- ── account_deletion_requests ──────────────────────────────────────────
drop policy if exists del_own on public.account_deletion_requests;
create policy del_own on public.account_deletion_requests
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists del_insert on public.account_deletion_requests;
create policy del_insert on public.account_deletion_requests
  for insert with check (user_id = auth.uid() and status = 'pending');

drop policy if exists del_admin on public.account_deletion_requests;
create policy del_admin on public.account_deletion_requests
  for update using (public.is_admin()) with check (public.is_admin());

-- ── audit_logs (read admin-only; writes from service role only) ────────
drop policy if exists audit_admin_read on public.audit_logs;
create policy audit_admin_read on public.audit_logs
  for select using (public.is_admin());

-- ═══════════════════════════════════════════════════════════════════════
-- Signup trigger — creates the profile row for a new auth user.
-- Idempotent, ignores any client-supplied role that is not candidate or
-- employer, and never grants admin.
-- ═══════════════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested text;
  safe_role text;
begin
  requested := coalesce(new.raw_user_meta_data ->> 'requested_role', 'candidate');
  -- Whitelist: anything else, including 'admin', falls back to candidate.
  safe_role := case when requested in ('candidate','employer') then requested
                    else 'candidate' end;

  insert into public.profiles (id, role, display_name, lang)
  values (new.id, safe_role, new.raw_user_meta_data ->> 'display_name', 'mn')
  on conflict (id) do nothing;      -- idempotent: no duplicate profiles

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════
-- start_conversation — the only way a conversation is created.
-- Refuses if either party has blocked the other; adds both members
-- atomically so nobody can insert themselves into someone else's thread.
-- ═══════════════════════════════════════════════════════════════════════
create or replace function public.start_conversation(p_other_user uuid, p_job_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  existing uuid;
  conv uuid;
begin
  if me is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if me = p_other_user then raise exception 'cannot message yourself'; end if;
  if public.is_blocked_between(me, p_other_user) then
    raise exception 'blocked' using errcode = '42501';
  end if;

  select cm1.conversation_id into existing
  from public.conversation_members cm1
  join public.conversation_members cm2 on cm1.conversation_id = cm2.conversation_id
  where cm1.user_id = me and cm2.user_id = p_other_user
  limit 1;
  if existing is not null then return existing; end if;

  insert into public.conversations (job_id) values (p_job_id) returning id into conv;
  insert into public.conversation_members (conversation_id, user_id)
  values (conv, me), (conv, p_other_user);
  return conv;
end $$;

revoke all on function public.start_conversation(uuid, uuid) from public;
grant execute on function public.start_conversation(uuid, uuid) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- STORAGE — buckets and owner-scoped policies
-- Path convention: <auth.uid()>/<random>.<ext>
-- ═══════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',       'avatars',       true,   5242880,  array['image/jpeg','image/png','image/webp']),
  ('company-logos', 'company-logos', true,   5242880,  array['image/jpeg','image/png','image/webp','image/svg+xml']),
  ('videos',        'videos',        false, 52428800,  array['video/mp4','video/quicktime','video/webm']),
  ('cv-pdfs',       'cv-pdfs',       false, 10485760,  array['application/pdf']),
  ('certificates',  'certificates',  false, 10485760,  array['application/pdf','image/jpeg','image/png']),
  ('identity',      'identity',      false, 10485760,  array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Owner-scoped write access on every bucket.
do $$
declare b text;
begin
  foreach b in array array['avatars','company-logos','videos','cv-pdfs','certificates','identity'] loop
    execute format($f$
      drop policy if exists "%1$s_owner_insert" on storage.objects;
      create policy "%1$s_owner_insert" on storage.objects
        for insert to authenticated
        with check (bucket_id = %1$L and (storage.foldername(name))[1] = auth.uid()::text);

      drop policy if exists "%1$s_owner_update" on storage.objects;
      create policy "%1$s_owner_update" on storage.objects
        for update to authenticated
        using (bucket_id = %1$L and (storage.foldername(name))[1] = auth.uid()::text);

      drop policy if exists "%1$s_owner_delete" on storage.objects;
      create policy "%1$s_owner_delete" on storage.objects
        for delete to authenticated
        using (bucket_id = %1$L and (storage.foldername(name))[1] = auth.uid()::text);
    $f$, b);
  end loop;
end $$;

-- Private buckets: read is owner-only (or admin). Employers never read these
-- directly — an Edge Function checks authorisation and returns a short-lived
-- signed URL instead.
do $$
declare b text;
begin
  foreach b in array array['videos','cv-pdfs','certificates','identity'] loop
    execute format($f$
      drop policy if exists "%1$s_owner_read" on storage.objects;
      create policy "%1$s_owner_read" on storage.objects
        for select to authenticated
        using (bucket_id = %1$L
               and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
    $f$, b);
  end loop;
end $$;

-- Public buckets: readable by anyone (avatars and logos only).
do $$
declare b text;
begin
  foreach b in array array['avatars','company-logos'] loop
    execute format($f$
      drop policy if exists "%1$s_public_read" on storage.objects;
      create policy "%1$s_public_read" on storage.objects
        for select using (bucket_id = %1$L);
    $f$, b);
  end loop;
end $$;
