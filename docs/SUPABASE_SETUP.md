# Supabase Setup

Step-by-step from an empty Supabase account to a running SwipeHire dev environment.

> **Current status:** the project referenced in `.env`
> (`cgicuqvgcwxtkctusteb.supabase.co`) **no longer resolves** — it has been
> deleted or was never provisioned. You must create a new project and follow
> these steps before auth or persistence will work.

---

## 1. Create the project

1. Go to <https://supabase.com/dashboard> and sign in.
2. **New project** → choose your organisation.
3. Name: `swipehire` (or `swipehire-dev` / `swipehire-prod` per environment).
4. Database password: generate a strong one and store it in a password
   manager. You need it for `psql` and migrations; it is **not** the anon key.
5. Region: choose the closest to Mongolia — `Southeast Asia (Singapore)` is
   normally the lowest latency option available.
6. Wait for provisioning (~2 minutes).

## 2. Get the URL and anon key

**Settings → API**

| Field | Where it goes |
|---|---|
| Project URL | `VITE_SUPABASE_URL` |
| `anon` / `public` key | `VITE_SUPABASE_ANON_KEY` |
| `service_role` key | **Never** in the frontend or this repo. Edge Function secrets only. |

The anon key is designed to be public — RLS is what protects your data. The
service-role key bypasses RLS entirely; treat it like a database password.

## 3. Run the migrations

**SQL Editor → New query**, then run each file in order and confirm success
before moving on:

```
supabase/migrations/003_production_schema.sql     -- tables, constraints, indexes
supabase/migrations/004_rls_and_triggers.sql      -- RLS, roles, trigger, storage
```

> `001_initial.sql` and `002_tighten_rls.sql` are the superseded beta schema.
> On a fresh project run **only 003 and 004**.

Verify:

```sql
-- every table should report rowsecurity = true
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

## 4. Storage buckets

Migration 004 creates all six buckets with size and MIME limits. Confirm in
**Storage** that these exist and that `public` matches:

| Bucket | Public | Limit | Purpose |
|---|---|---|---|
| `avatars` | ✅ | 5 MB | Profile photos |
| `company-logos` | ✅ | 5 MB | Employer logos |
| `videos` | ❌ | 50 MB | Video CVs |
| `cv-pdfs` | ❌ | 10 MB | CV documents |
| `certificates` | ❌ | 10 MB | Certificates |
| `identity` | ❌ | 10 MB | ID / verification documents |

Private buckets must stay private. Identity documents must never be served
from a public URL — the app requests a short-lived signed URL instead.

## 5. Redirect URLs

**Authentication → URL Configuration**

- **Site URL:** `http://localhost:5173` for development.
- **Redirect URLs** — add every origin you will use:
  ```
  http://localhost:5173/**
  https://<your-production-domain>/**
  mn.swipehire.app://**          # Capacitor deep link for the Android app
  ```

Without these, email confirmation and password reset links fail with
"requested path is invalid".

## 6. Email verification

**Authentication → Providers → Email**

- Enable **Email**.
- **Confirm email:** ON for production.
  For local development you may turn it off to iterate faster — but turn it
  back on before any real users exist.
- **Authentication → Email Templates** → translate *Confirm signup* and
  *Reset password* into Mongolian.

The default Supabase SMTP is rate-limited and not for production. Configure
your own SMTP under **Project Settings → Auth → SMTP** before launch.

## 7. Password reset URL

In the *Reset password* template, point the action link at the route that
handles recovery:

```
{{ .SiteURL }}/reset-password
```

Supabase delivers a recovery session; the app calls
`updatePassword()` from `auth.service.js` while that session is active.

## 8. Local environment

```bash
cp .env.example .env
```

Fill in:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

`.env` is gitignored. Never commit real values.

## 9. Start the dev server

```bash
npm install
npm run dev
```

If the variables are missing the console prints a clear warning and auth
stays disabled rather than crashing the UI.

## 10. Create a test user

1. Open the app, choose **Ажил хайгч**, tick both consent boxes, sign up.
2. Confirm the email (or disable confirmation in step 6 while developing).
3. Check **Authentication → Users** for the new user and **Table Editor →
   profiles** for the row created by the `on_auth_user_created` trigger.
4. Confirm the role is `candidate` or `employer` — **never** `admin`. The
   trigger whitelists roles, so a client claiming `admin` is downgraded.

To create an admin, promote an existing user manually from the SQL editor
(service-role context):

```sql
update public.profiles set role = 'admin' where id = '<user-uuid>';
```

## 11. Run the RLS attack tests

```bash
psql "postgresql://postgres:<db-password>@db.<project-ref>.supabase.co:5432/postgres" \
  -f supabase/tests/rls_attack_tests.sql
```

Expect ten `PASS` notices. Any `FAIL` is a security regression — fix the
corresponding policy in `004_rls_and_triggers.sql` before releasing.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `Non-existent domain` | Project deleted or wrong project ref |
| `Invalid API key` | Using service-role where anon is expected, or a stale key |
| `requested path is invalid` | Redirect URL not registered (step 5) |
| Email never arrives | Default SMTP rate limit — configure your own |
| `new row violates row-level security` | Working as intended: the policy refused the write |
