-- ═══════════════════════════════════════════════════════════════════════
-- SwipeHire — RLS attack tests
--
-- Each test impersonates a real user with set_local role/claims (exactly how
-- PostgREST authenticates a request) and asserts that a hostile action is
-- REFUSED. A test that returns rows or succeeds where it should fail is a
-- security regression.
--
-- Run:  psql "$SUPABASE_DB_URL" -f supabase/tests/rls_attack_tests.sql
-- Or paste into the SQL Editor. Wrapped in a rollback so it leaves no data.
--
-- STATUS: NOT YET EXECUTED — requires a live Supabase database.
-- ═══════════════════════════════════════════════════════════════════════

begin;

-- ── Fixtures ───────────────────────────────────────────────────────────
-- Seed auth.users directly (service role context) then let the trigger or
-- explicit inserts build profiles.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'cand.a@test.mn', '{"requested_role":"candidate"}'),
  ('22222222-2222-2222-2222-222222222222', 'cand.b@test.mn', '{"requested_role":"candidate"}'),
  ('33333333-3333-3333-3333-333333333333', 'emp.a@test.mn',  '{"requested_role":"employer"}'),
  ('44444444-4444-4444-4444-444444444444', 'emp.b@test.mn',  '{"requested_role":"employer"}')
on conflict (id) do nothing;

insert into public.profiles (id, role) values
  ('11111111-1111-1111-1111-111111111111','candidate'),
  ('22222222-2222-2222-2222-222222222222','candidate'),
  ('33333333-3333-3333-3333-333333333333','employer'),
  ('44444444-4444-4444-4444-444444444444','employer')
on conflict (id) do nothing;

insert into public.candidate_profiles (id, full_name, phone, published)
values ('22222222-2222-2222-2222-222222222222','Candidate B','99009900', false)
on conflict (id) do nothing;

insert into public.companies (id, owner_id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','Company A'),
  ('bbbbbbbb-0000-0000-0000-000000000002','44444444-4444-4444-4444-444444444444','Company B')
on conflict (id) do nothing;

insert into public.jobs (id, company_id, employer_id, title) values
  ('cccccccc-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','Welder A'),
  ('dddddddd-0000-0000-0000-000000000002','bbbbbbbb-0000-0000-0000-000000000002','44444444-4444-4444-4444-444444444444','Welder B')
on conflict (id) do nothing;

insert into public.applications (id, job_id, candidate_id, cover_letter, status)
values ('eeeeeeee-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001',
        '11111111-1111-1111-1111-111111111111','my letter','submitted')
on conflict (id) do nothing;

-- Helper: authenticate as a given user for subsequent statements.
create or replace function pg_temp.login(p uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p::text, 'role','authenticated')::text, true);
end $$;

create or replace function pg_temp.expect_zero(label text, n bigint) returns void language plpgsql as $$
begin
  if n <> 0 then raise exception 'FAIL % — leaked % row(s)', label, n;
  else raise notice 'PASS %', label; end if;
end $$;

create or replace function pg_temp.expect_denied(label text) returns void language plpgsql as $$
begin raise notice 'PASS % (statement was rejected)', label; end $$;

-- ══════════════════════════════════════════════════════════════════════
-- 1. Candidate A must not read Candidate B's private profile
-- ══════════════════════════════════════════════════════════════════════
select pg_temp.login('11111111-1111-1111-1111-111111111111');
select pg_temp.expect_zero(
  '1. candidate cannot read another candidate private profile',
  (select count(*) from public.candidate_profiles
   where id = '22222222-2222-2222-2222-222222222222'));

-- ══════════════════════════════════════════════════════════════════════
-- 2. Employer A must not modify Employer B's job
-- ══════════════════════════════════════════════════════════════════════
select pg_temp.login('33333333-3333-3333-3333-333333333333');
do $$
declare n int;
begin
  update public.jobs set title = 'HIJACKED'
   where id = 'dddddddd-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  if n > 0 then raise exception 'FAIL 2 — employer edited another company job';
  else raise notice 'PASS 2. employer cannot edit another company job'; end if;
end $$;

-- ══════════════════════════════════════════════════════════════════════
-- 3. Candidate must not change the employer's decision field
-- ══════════════════════════════════════════════════════════════════════
select pg_temp.login('11111111-1111-1111-1111-111111111111');
do $$
declare n int;
begin
  update public.applications set status = 'hired'
   where id = 'eeeeeeee-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n > 0 then raise exception 'FAIL 3 — candidate changed application status';
  else raise notice 'PASS 3. candidate cannot change decision'; end if;
exception when others then
  raise notice 'PASS 3. candidate cannot change decision (rejected)';
end $$;

-- ══════════════════════════════════════════════════════════════════════
-- 4. Non-member must not read a conversation's messages
-- ══════════════════════════════════════════════════════════════════════
select pg_temp.login('33333333-3333-3333-3333-333333333333');
select public.start_conversation('11111111-1111-1111-1111-111111111111') as conv \gset
insert into public.messages (conversation_id, sender_id, body)
values (:'conv','33333333-3333-3333-3333-333333333333','private');

select pg_temp.login('44444444-4444-4444-4444-444444444444');  -- outsider
select pg_temp.expect_zero(
  '4. non-member cannot read conversation messages',
  (select count(*) from public.messages where conversation_id = :'conv'));

-- ══════════════════════════════════════════════════════════════════════
-- 5. User must not promote themselves to admin
-- ══════════════════════════════════════════════════════════════════════
select pg_temp.login('11111111-1111-1111-1111-111111111111');
do $$
begin
  update public.profiles set role = 'admin' where id = auth.uid();
  if (select role from public.profiles where id = auth.uid()) = 'admin' then
    raise exception 'FAIL 5 — user escalated to admin';
  else raise notice 'PASS 5. user cannot self-promote to admin'; end if;
exception when others then
  raise notice 'PASS 5. user cannot self-promote to admin (rejected)';
end $$;

-- ══════════════════════════════════════════════════════════════════════
-- 6. User must not approve their own verification
-- ══════════════════════════════════════════════════════════════════════
do $$
begin
  insert into public.verification_requests (user_id, kind, status)
  values (auth.uid(), 'identity', 'approved');
  raise exception 'FAIL 6 — user inserted an approved verification';
exception when others then
  raise notice 'PASS 6. user cannot self-approve verification';
end $$;

-- ══════════════════════════════════════════════════════════════════════
-- 7. Employer must not read another company's applications
-- ══════════════════════════════════════════════════════════════════════
select pg_temp.login('44444444-4444-4444-4444-444444444444');
select pg_temp.expect_zero(
  '7. employer cannot read another company applications',
  (select count(*) from public.applications
   where id = 'eeeeeeee-0000-0000-0000-000000000001'));

-- ══════════════════════════════════════════════════════════════════════
-- 8. Blocked user must not send a message
-- ══════════════════════════════════════════════════════════════════════
select pg_temp.login('11111111-1111-1111-1111-111111111111');
insert into public.blocked_users (blocker_id, blocked_id)
values ('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333')
on conflict do nothing;

select pg_temp.login('33333333-3333-3333-3333-333333333333');
do $$
begin
  insert into public.messages (conversation_id, sender_id, body)
  values (current_setting('swipehire.conv', true)::uuid, auth.uid(), 'should fail');
  raise exception 'FAIL 8 — blocked user sent a message';
exception when others then
  raise notice 'PASS 8. blocked user cannot send message';
end $$;

-- ══════════════════════════════════════════════════════════════════════
-- 9. Normal user must not read the moderation queue
-- ══════════════════════════════════════════════════════════════════════
select pg_temp.login('11111111-1111-1111-1111-111111111111');
insert into public.reports (reporter_id, subject_type, subject_id, reason)
values (auth.uid(), 'profile', '22222222-2222-2222-2222-222222222222', 'scam')
on conflict do nothing;

select pg_temp.login('22222222-2222-2222-2222-222222222222');  -- the reported user
select pg_temp.expect_zero(
  '9. reported user cannot see reports about them (nor the reporter)',
  (select count(*) from public.reports
   where subject_id = '22222222-2222-2222-2222-222222222222'));

-- ══════════════════════════════════════════════════════════════════════
-- 10. User must not read another user's private storage object
-- ══════════════════════════════════════════════════════════════════════
select pg_temp.login('11111111-1111-1111-1111-111111111111');
select pg_temp.expect_zero(
  '10. user cannot list another user private storage files',
  (select count(*) from storage.objects
   where bucket_id = 'cv-pdfs'
     and (storage.foldername(name))[1] = '22222222-2222-2222-2222-222222222222'));

rollback;

-- Expected output: ten PASS notices and no exception.
-- Any FAIL means the corresponding policy in 004_rls_and_triggers.sql
-- regressed and must be fixed before release.
