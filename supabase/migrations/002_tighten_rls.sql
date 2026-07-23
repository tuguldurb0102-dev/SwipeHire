-- ═══════════════════════════════════════════════════════════════
-- SwipeHire — RLS hardening
--
-- Fixes two over-broad grants in 001_initial.sql that let any signed-in
-- account read other people's data:
--
--   1. seeker_verification / skill_tests were readable by every
--      authenticated user, including for profiles never published.
--   2. Storage buckets granted SELECT to every authenticated user, so any
--      account could enumerate and download every candidate's CV, ID
--      document and certificates.
--
-- Run in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Verification status: owner, or only when the profile is public ──
DROP POLICY IF EXISTS "verif_read" ON public.seeker_verification;

CREATE POLICY "verif_read" ON public.seeker_verification
  FOR SELECT USING (
    auth.uid() = seeker_id
    OR EXISTS (
      SELECT 1 FROM public.seeker_profiles p
      WHERE p.id = seeker_verification.seeker_id
        AND p.published = true
    )
  );

-- ── 2. Skill test results: same restriction ───────────────────────────
DROP POLICY IF EXISTS "skill_read" ON public.skill_tests;

CREATE POLICY "skill_read" ON public.skill_tests
  FOR SELECT USING (
    auth.uid() = seeker_id
    OR EXISTS (
      SELECT 1 FROM public.seeker_profiles p
      WHERE p.id = skill_tests.seeker_id
        AND p.published = true
    )
  );

-- ── 3. Verification writes must not be self-granted ───────────────────
-- A seeker must not be able to mark themselves ID-verified. Only a
-- service-role process (admin review) may set these flags.
DROP POLICY IF EXISTS "verif_write" ON public.seeker_verification;

CREATE POLICY "verif_insert_own" ON public.seeker_verification
  FOR INSERT WITH CHECK (
    auth.uid() = seeker_id
    AND phone_verified = false
    AND id_verified    = false
    AND skill_verified = false
  );

-- Updates are intentionally NOT granted to end users.
-- Verification flags are set by a trusted server process using the
-- service-role key, which bypasses RLS.

-- ── 4. Data retention: purge profiles inactive beyond the stated period ──
-- Supports the retention commitment in the privacy policy.
CREATE OR REPLACE FUNCTION public.purge_inactive_seekers(months integer DEFAULT 24)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed integer;
BEGIN
  WITH gone AS (
    DELETE FROM public.seeker_profiles
    WHERE updated_at < now() - make_interval(months => months)
    RETURNING 1
  )
  SELECT count(*) INTO removed FROM gone;
  RETURN removed;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_inactive_seekers(integer) FROM PUBLIC;

-- ═══════════════════════════════════════════════════════════════
-- STORAGE POLICIES — apply per bucket in Dashboard → Storage → Policies
--
-- Buckets `videos`, `certificates`, `cv-pdfs` MUST be PRIVATE.
-- Files are stored under a per-user prefix: <auth.uid()>/<filename>
--
-- Replace the previous "any authenticated user can SELECT" rule with
-- owner-only access:
--
--   SELECT : (storage.foldername(name))[1] = auth.uid()::text
--   INSERT : (storage.foldername(name))[1] = auth.uid()::text
--   UPDATE : (storage.foldername(name))[1] = auth.uid()::text
--   DELETE : (storage.foldername(name))[1] = auth.uid()::text
--
-- Employers must NOT read these buckets directly. To show a CV or video
-- to an employer, an Edge Function running with the service-role key
-- should:
--   1. verify the employer is approved and the seeker profile is published,
--   2. create a short-lived signed URL (createSignedUrl, e.g. 300 seconds),
--   3. return only that URL.
--
-- This keeps every document access authorised and time-limited instead of
-- world-readable to anyone holding an account.
-- ═══════════════════════════════════════════════════════════════
