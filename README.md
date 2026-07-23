# SwipeHire

**Монголын анхны видео CV платформ** — swipe-based recruitment connecting blue-collar job seekers with employers.

Job seekers record a 30-second video CV and build a verified *Talent Passport*. Employers swipe through candidates, shortlist, and move them through a hiring pipeline — assisted by AI matching and screening.

> **Status:** Beta (pre-launch). Not yet production-hardened — see [Pre-launch requirements](#pre-launch-requirements).

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Folder structure](#folder-structure)
- [Build instructions](#build-instructions)
- [Deployment](#deployment)
- [Branching & versioning](#branching--versioning)
- [Pre-launch requirements](#pre-launch-requirements)

---

## Features

### Job seeker
- 9-step guided profile wizard (personal info, experience, education, skills, video CV, certificates, salary, skill test)
- **Video CV** — record in-app or upload
- **Talent Passport** — verification score across phone, ID, skills, certificates, experience and bio
- Skill assessment with scored levels
- AI Career Coach — personalised guidance on profile and market positioning
- Job feed with swipe-to-apply
- Offers inbox

### Employer
- Company registration with trust levels (basic → verified → trusted → enterprise)
- Candidate feed with video CVs and AI match scores
- Save, note and move candidates through pipeline stages
- CV download (uploaded PDF, or generated from profile)
- **AI Recruiter** — natural-language candidate search
- Workplace insights dashboard
- Company profile with logo, details and hiring needs

### Platform
- Trilingual: Mongolian · English · Korean
- Dark-first design system with brand tokens
- Android app via Capacitor (adaptive icons, splash, hardware back handling)
- PWA manifest and maskable icons

---

## Tech stack

| Layer | Technology |
|---|---|
| UI | React 19 |
| Build | Vite 8 |
| Icons | lucide-react |
| Mobile shell | Capacitor 8 (Android) |
| Backend (planned) | Supabase — Postgres, Auth, Storage, Row-Level Security |
| AI (planned) | Gemini via Supabase Edge Function |
| Persistence (current) | Browser `localStorage` |

> **Note:** the app currently persists to `localStorage` only. Supabase client and schema exist under `src/` and `supabase/` but are **not yet wired into the UI**. Server-side persistence and authentication are required before public launch.

---

## Local setup

**Prerequisites**

- Node.js 18+ and npm
- Android Studio (only for building the Android app) — bundles the required JDK

```bash
git clone <repository-url>
cd SwipeHire
npm install
cp .env.example .env    # then fill in your own values
npm run dev
```

The dev server prints a local and a LAN URL. Use the LAN URL to test on a phone on the same Wi-Fi.

---

## Environment variables

Copy `.env.example` to `.env` and populate. **Never commit `.env`.**

| Variable | Scope | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Supabase anon/publishable key — safe to ship to clients |
| `GEMINI_API_KEY` | **Server only** | Set exclusively in Supabase Edge Function secrets. Must never appear in frontend code, `.env` files shipped to clients, or this repository. |

Any variable prefixed `VITE_` is **embedded into the client bundle and publicly readable**. Never place a secret behind a `VITE_` prefix.

---

## Folder structure

```
SwipeHire/
├── SwipeHire.jsx           # Application — all components, styles and logic
├── main.jsx                # React entry point
├── index.html              # HTML shell (favicon, manifest, theme colour)
├── vite.config.js          # Vite config (relative base, LAN host)
├── capacitor.config.json   # Capacitor app id, splash, plugins
│
├── src/
│   └── supabase.js         # Supabase client + data-access helpers (not yet wired)
│
├── supabase/
│   └── migrations/         # SQL schema, RLS policies, storage bucket notes
│
├── public/                 # Static assets served as-is
│   ├── logo.png            # Brand mark
│   ├── mascot.png          # AI assistant character
│   ├── icon-*.png          # PWA / store icons
│   ├── favicon.*
│   ├── manifest.json
│   ├── brand-icons/        # Feature icon set (PNG + SVG)
│   └── ios/                # iOS AppIcon sizes
│
├── android/                # Capacitor Android project
│   └── app/src/main/res/   # Launcher icons, adaptive icon, splash
│
├── brand-assets/           # Source brand material
└── android-assets/         # Android asset staging
```

`SwipeHire.jsx` is intentionally a single file. Component extraction is planned but deferred to keep the beta iteration loop fast.

---

## Build instructions

### Web

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally
```

### Android

```bash
npm run android:sync   # build web assets and copy into the Android project
npm run android:open   # open in Android Studio
```

Or build an APK directly:

```bash
cd android
./gradlew assembleDebug          # debug APK
./gradlew bundleRelease          # release AAB for Google Play
```

Outputs:
- Debug APK — `android/app/build/outputs/apk/debug/app-debug.apk`
- Release AAB — `android/app/build/outputs/bundle/release/app-release.aab`

**Release signing.** Google Play requires a signed AAB. Generate a keystore, reference it from `android/keystore.properties`, and keep both **out of Git** (already ignored). Losing the keystore permanently prevents you from updating the app.

---

## Deployment

### Web / PWA

`npm run build` produces a static `dist/` directory deployable to any static host (Vercel, Netlify, Cloudflare Pages, S3 + CDN). Set the environment variables in the host's dashboard — not in the repository.

### Google Play

1. Register a Google Play Developer account (one-time fee).
2. Build and sign a release AAB.
3. Prepare store listing: 512×512 icon, 1024×500 feature graphic, screenshots, descriptions.
4. **Publish a privacy policy at a public URL** and complete the Data Safety form — mandatory, as the app collects personal data.
5. Release through Internal testing → Closed testing → Production.

### Supabase

Apply the schema before enabling server-side features:

```bash
# Supabase Dashboard → SQL Editor → run supabase/migrations/001_initial.sql
```

Then create the storage buckets (`videos`, `certificates`, `cv-pdfs`) as **private**, and apply the per-bucket policies documented in the migration file.

---

## Branching & versioning

| Branch | Purpose |
|---|---|
| `main` | Stable, releasable code |
| `develop` | Active development; merges into `main` via pull request |

Tags mark releases — `v0.1-prelaunch` is the first tagged milestone.

Commit messages describe **why** a change was made, not just what changed.

---

## Pre-launch requirements

The following must be resolved before a public launch:

- [ ] **Server-side auth & persistence** — data currently lives only in `localStorage`; it is lost when app data is cleared and is never shared between devices
- [ ] **Privacy Policy & Terms of Service** at public URLs — required by both app stores
- [ ] **Consent flow** for collecting personal data, video, and identity documents
- [ ] **Account deletion & data export** — required by Google Play and GDPR
- [ ] **Data retention policy** for video CVs, CVs and ID documents
- [ ] **AI transparency disclosure** for match scoring and ranking
- [ ] **Content moderation & reporting** for user-generated content
- [ ] Supabase **RLS verified** on every table and storage bucket

---

## Licence

Proprietary — all rights reserved. Not licensed for redistribution.
