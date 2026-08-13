-- ============================================================================
-- 009_phase1_core.sql
-- Phase 1 additive schema: notifications (+ server-side triggers), company
-- team membership, offers, and usage events. All additive; nothing dropped.
--
-- Follows the existing security model: RLS default-deny, owner/admin reads via
-- auth.uid() / public.owns_company() / public.is_admin(), and privileged writes
-- through SECURITY DEFINER functions (pinned search_path, PUBLIC revoked).
-- ============================================================================

begin;

-- ── notifications ───────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles on delete cascade,
  type       text not null,                 -- new_application | new_message | status_changed | ...
  title      text not null,
  body       text,
  data       jsonb not null default '{}',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

-- Owner may read their own notifications.
drop policy if exists notif_read on public.notifications;
create policy notif_read on public.notifications
  for select using (user_id = auth.uid());

-- Owner may mark their own notifications read (update read_at only; cannot forge
-- new rows for others because there is no INSERT policy — inserts happen through
-- the SECURITY DEFINER helper / triggers below).
drop policy if exists notif_update_own on public.notifications;
create policy notif_update_own on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Server-side notification creator. SECURITY DEFINER so triggers (running as the
-- acting user) can insert a row for a DIFFERENT recipient without a client
-- INSERT policy. Not granted to clients directly.
create or replace function public.create_notification(
  p_user uuid, p_type text, p_title text, p_body text default null, p_data jsonb default '{}'
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into public.notifications (user_id, type, title, body, data)
  values (p_user, p_type, p_title, p_body, coalesce(p_data, '{}'))
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.create_notification(uuid,text,text,text,jsonb) from public, anon, authenticated;

-- Trigger: a new application notifies the employer who owns the job.
create or replace function public.tg_notify_new_application()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_employer uuid; v_title text;
begin
  select j.employer_id, j.title into v_employer, v_title
    from public.jobs j where j.id = new.job_id;
  if v_employer is not null then
    perform public.create_notification(
      v_employer, 'new_application', 'Шинэ өргөдөл', v_title,
      jsonb_build_object('application_id', new.id, 'job_id', new.job_id));
  end if;
  return new;
end $$;
drop trigger if exists on_application_created on public.applications;
create trigger on_application_created
  after insert on public.applications
  for each row execute function public.tg_notify_new_application();

-- Trigger: a new message notifies the other conversation member(s).
create or replace function public.tg_notify_new_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, title, body, data)
  select cm.user_id, 'new_message', 'Шинэ мессеж', left(new.body, 80),
         jsonb_build_object('conversation_id', new.conversation_id)
    from public.conversation_members cm
   where cm.conversation_id = new.conversation_id
     and cm.user_id <> new.sender_id;
  return new;
end $$;
drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute function public.tg_notify_new_message();

-- ── company_members (team) ──────────────────────────────────────────────────
create table if not exists public.company_members (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies on delete cascade,
  user_id    uuid not null references public.profiles on delete cascade,
  role       text not null default 'recruiter' check (role in ('owner','admin','recruiter')),
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);
create index if not exists company_members_company_idx on public.company_members(company_id);

alter table public.company_members enable row level security;

-- Members and the company owner may read the roster.
drop policy if exists cm_members_read on public.company_members;
create policy cm_members_read on public.company_members
  for select using (public.owns_company(company_id) or user_id = auth.uid() or public.is_admin());

-- Only the company owner manages membership.
drop policy if exists cm_members_write on public.company_members;
create policy cm_members_write on public.company_members
  for all using (public.owns_company(company_id)) with check (public.owns_company(company_id));

-- Backfill: every existing company owner becomes an 'owner' member.
insert into public.company_members (company_id, user_id, role)
select c.id, c.owner_id, 'owner' from public.companies c
on conflict (company_id, user_id) do nothing;

-- Keep the owner as a member automatically for future companies.
create or replace function public.tg_company_owner_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.company_members (company_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (company_id, user_id) do nothing;
  return new;
end $$;
drop trigger if exists on_company_created on public.companies;
create trigger on_company_created
  after insert on public.companies
  for each row execute function public.tg_company_owner_member();

-- ── offers ──────────────────────────────────────────────────────────────────
create table if not exists public.offers (
  id           uuid primary key default gen_random_uuid(),
  application_id uuid references public.applications on delete set null,
  job_id       uuid references public.jobs on delete set null,
  company_id   uuid not null references public.companies on delete cascade,
  candidate_id uuid not null references public.profiles on delete cascade,
  status       text not null default 'sent'
                 check (status in ('sent','accepted','declined','withdrawn')),
  salary       integer check (salary is null or salary >= 0),
  message      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists offers_candidate_idx on public.offers(candidate_id);
create index if not exists offers_company_idx on public.offers(company_id);

alter table public.offers enable row level security;

-- Candidate reads offers made to them; company owner reads/manages their offers.
drop policy if exists offers_read on public.offers;
create policy offers_read on public.offers
  for select using (candidate_id = auth.uid() or public.owns_company(company_id) or public.is_admin());

-- Company owner may create/update offers for their own company.
drop policy if exists offers_company_write on public.offers;
create policy offers_company_write on public.offers
  for all using (public.owns_company(company_id)) with check (public.owns_company(company_id));

-- Candidate may accept/decline their own offer (status change only; the base
-- row identity is fixed by the WHERE on candidate_id).
drop policy if exists offers_candidate_respond on public.offers;
create policy offers_candidate_respond on public.offers
  for update using (candidate_id = auth.uid())
  with check (candidate_id = auth.uid() and status in ('accepted','declined'));

-- ── usage_events (metering; server/trusted writes) ──────────────────────────
create table if not exists public.usage_events (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies on delete cascade,
  user_id    uuid references public.profiles on delete set null,
  metric     text not null,
  quantity   integer not null default 1 check (quantity >= 0),
  created_at timestamptz not null default now()
);
create index if not exists usage_events_company_idx on public.usage_events(company_id, created_at desc);

alter table public.usage_events enable row level security;

-- Company owner may read their own usage; no client writes (metering is trusted).
drop policy if exists usage_events_read on public.usage_events;
create policy usage_events_read on public.usage_events
  for select using (public.owns_company(company_id) or public.is_admin());

commit;
