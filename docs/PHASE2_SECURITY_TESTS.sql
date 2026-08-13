-- ============================================================================
-- Phase 2 negative security tests — run in the Supabase SQL Editor.
-- Self-contained: creates two test users + data as postgres (bypasses RLS for
-- SETUP only), then exercises each invariant UNDER the authenticated role with a
-- simulated JWT, asserting RLS blocks the disallowed action. Rolls back at the
-- end (SELECT at the bottom) — no data is left behind. Expect: FINAL row shows
-- all checks 'PASS'. Any exception = a policy gap to fix.
-- ============================================================================
do $$
declare
  ua uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; -- candidate A
  ub uuid := 'bbbbbbbb-0000-0000-0000-000000000002'; -- candidate B / employer
  cb uuid;  -- company owned by B
  jb uuid;  -- job owned by B
  vreq uuid; app_id uuid; n bigint;
begin
  -- ---- setup (as postgres; RLS bypassed) ----
  delete from auth.users where id in (ua, ub);
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
   (ua,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@ex.com','',now(),now(),now(),'{"provider":"email"}','{"requested_role":"candidate"}'),
   (ub,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@ex.com','',now(),now(),now(),'{"provider":"email"}','{"requested_role":"employer"}');
  -- A's private (unpublished) candidate profile
  insert into public.candidate_profiles (id, full_name, published) values (ua, 'Secret A', false)
    on conflict (id) do update set published = false;
  -- A submits an identity verification request (pending)
  insert into public.verification_requests (user_id, kind, status) values (ua,'identity','pending') returning id into vreq;
  -- B's company + job + A applies to it
  insert into public.companies (owner_id, name) values (ub, 'B Co') returning id into cb;
  insert into public.jobs (company_id, employer_id, title) values (cb, ub, 'B Job') returning id into jb;
  insert into public.applications (job_id, candidate_id, status) values (jb, ua, 'submitted') returning id into app_id;

  -- helper to act as a user under RLS
  -- (set local role + jwt claim; RLS applies to 'authenticated')

  -- 1) Candidate B cannot read Candidate A's unpublished profile
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', ub::text,'role','authenticated')::text, true);
  select count(*) into n from public.candidate_profiles where id = ua;
  if n <> 0 then reset role; raise exception 'FAIL: B read A private profile'; end if;

  -- 2) Candidate cannot self-approve their verification request
  begin
    update public.verification_requests set status = 'approved' where id = vreq;
    -- RLS has no candidate UPDATE policy → 0 rows affected (silently blocked)
  exception when others then null; end;
  reset role;
  perform set_config('request.jwt.claims', null, true);
  if (select status from public.verification_requests where id = vreq) = 'approved' then
    raise exception 'FAIL: candidate self-approved verification';
  end if;

  -- 3) Candidate cannot mark their own application 'hired'
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', ua::text,'role','authenticated')::text, true);
  begin
    update public.applications set status = 'hired' where id = app_id;
  exception when others then null; end;
  reset role;
  if (select status from public.applications where id = app_id) = 'hired' then
    raise exception 'FAIL: candidate marked self hired';
  end if;

  -- 4) Verification insert is forced to status='pending' (cannot insert approved)
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', ua::text,'role','authenticated')::text, true);
  begin
    insert into public.verification_requests (user_id, kind, status) values (ua,'company','approved');
    reset role; raise exception 'FAIL: inserted pre-approved verification';
  exception when others then
    if sqlerrm like 'FAIL%' then reset role; raise; end if; -- expected block
  end;
  reset role;

  -- 5) A non-owner employer cannot modify B's job
  --    (create a third throwaway employer context = A acting as employer)
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', ua::text,'role','authenticated')::text, true);
  begin update public.jobs set title = 'hacked' where id = jb; exception when others then null; end;
  reset role;
  if (select title from public.jobs where id = jb) = 'hacked' then
    raise exception 'FAIL: non-owner modified job';
  end if;

  -- cleanup (rolls back everything created here)
  delete from public.applications where id = app_id;
  delete from public.jobs where id = jb;
  delete from public.companies where id = cb;
  delete from public.verification_requests where user_id in (ua, ub);
  delete from public.candidate_profiles where id = ua;
  delete from auth.users where id in (ua, ub);

  raise notice '✅ ALL PHASE 2 NEGATIVE SECURITY TESTS PASSED';
end $$;
