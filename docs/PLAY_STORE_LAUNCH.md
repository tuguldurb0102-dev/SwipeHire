# SwipeHire — Google Play Launch Guide

Exact steps to ship the Android app. Items marked **you** must be done by the
account owner (account creation, payment, identity, keystore passwords) — I
can't do those. Everything else (build config, listing text, privacy policy) is
prepared in the repo.

App id: `mn.swipehire.app` · target SDK 36 · min SDK 24 · versionCode 1.

---

## 0. Reality check before you start
- Google's policy for **personal developer accounts created after Nov 2023**:
  you must run a **closed test with at least 12 testers for 14 continuous days**
  before you can promote to production. Plan for that ~2-week window.
- **Digital purchases** (plans, AI services) sold in-app generally must use
  **Google Play Billing**, not QPay/external. Billing is NOT wired yet — launch
  the recruitment app first, add billing behind Play Billing later, or ship
  without in-app purchases initially.
- The app must be **functional** (auth + real data are wired; billing is
  sandbox). Do not ship the sandbox payment flow as a real purchase.

## 1. Create the developer account  — **you**
- https://play.google.com/console → pay the **one-time $25** → complete identity
  verification (can take a few days).

## 2. Generate the upload keystore  — **you** (once, keep forever)
In the repo root:
```bash
keytool -genkey -v -keystore swipehire-upload.keystore -alias swipehire \
  -keyalg RSA -keysize 2048 -validity 10000
```
Store the file safely (NOT in git) and record the passwords. Then create
`android/keystore.properties` (already gitignored):
```
storeFile=../../swipehire-upload.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=swipehire
keyPassword=YOUR_KEY_PASSWORD
```
`android/app/build.gradle` already reads this file and signs release builds when
it is present. **Losing this keystore means you can't update the app** — back it
up. (Enrolling in Play App Signing is recommended; Google then holds the app
signing key and your upload key is recoverable.)

## 3. Build the release AAB
```bash
npm run build          # web assets → dist
npx cap sync android   # copy web + plugins into android/
cd android
./gradlew bundleRelease   # Windows: gradlew.bat bundleRelease
```
Output: `android/app/build/outputs/bundle/release/app-release.aab`.

> The web build has no Supabase env by default, so the packaged app would run in
> demo mode. For a REAL app, provide `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
> at build time (e.g. a local `.env`) before `npm run build`. The anon key is a
> publishable client key — safe to embed. Never embed the service-role key.

## 4. Create the app in Play Console  — **you**
- Play Console → Create app → name **SwipeHire**, language, app (not game), free.
- Upload the AAB under a testing track first (Internal testing).

## 5. Store listing (assets to prepare)
- App name, short description (≤80 chars), full description.
- Screenshots (min 2 phone; 1080p recommended), 512×512 icon, 1024×500 feature graphic.
- Category: Business / Jobs. Contact email.
- **Privacy policy URL** — required. Host `docs/PRIVACY_POLICY.md` (e.g. on the
  GitHub Pages site) and paste the URL.

## 6. Required questionnaires  — **you**
- **Data safety**: declare what you collect (email, name, phone, profile, CV,
  video, usage) and that it's encrypted in transit and used for the recruitment
  service. Supabase stores it; you don't sell it.
- **Content rating**: complete the IARC questionnaire.
- **Target audience**: 18+ (the app already gates signup at 18).
- **App access**: provide test credentials so Google can review a logged-in app
  (create a demo candidate + employer login and list them here).

## 7. Testing → Production
1. **Internal testing** → add your own email → install, smoke-test on a device.
2. **Closed testing** → add ≥12 testers → keep active **14 days**.
3. **Production** → submit for review → release (staged rollout recommended).

## 8. Pre-launch technical checklist
- [ ] `keystore.properties` present, release build signed.
- [ ] Supabase env provided at build time (real app, not demo).
- [ ] Supabase Auth: email confirmation configured (on for production).
- [ ] App tested on a real device (signup → profile → apply → contact → chat).
- [ ] Privacy policy hosted and URL ready.
- [ ] Icons/screenshots/feature graphic ready.
- [ ] Deep-link / redirect URLs (Supabase auth redirect) allow the app origin.

## Remaining product blockers before a paid launch
- Google Play Billing for in-app digital purchases (plans, AI services).
- Employer viewing of candidate CV/video via signed URLs (get-document-url).
- Push notifications backend (the plugin is configured; no server yet).
