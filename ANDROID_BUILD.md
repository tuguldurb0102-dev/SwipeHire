# SwipeHire — Android Closed Beta APK Build Guide

## Prerequisites

Install these before proceeding:

| Tool | Version | Download |
|------|---------|----------|
| Android Studio | Ladybug 2024.2+ | https://developer.android.com/studio |
| JDK | 17 (bundled with Android Studio) | included |
| Node.js | 18+ | already installed |

---

## One-time Setup (already done ✅)

```bash
# Capacitor installed and Android project created
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "SwipeHire" "mn.swipehire.app" --web-dir dist
npx cap add android
```

---

## Every-release Workflow

```bash
# 1. Build the web app
npm run build

# 2. Sync web assets into Android project
npx cap sync android

# 3. Open in Android Studio to build APK
npx cap open android
```

---

## Generating the APK in Android Studio

1. Open `android/` folder in Android Studio (done by `npx cap open android`)
2. Wait for Gradle sync to complete (~2 min first time)
3. **Debug APK** (for internal testing):
   - Menu → Build → Build Bundle(s) / APK(s) → Build APK(s)
   - Output: `android/app/build/outputs/apk/debug/app-debug.apk`
4. **Release APK** (for Google Play / closed beta):
   - Menu → Build → Generate Signed Bundle / APK
   - Choose APK → create or use existing keystore
   - Select `release` build variant
   - Output: `android/app/build/outputs/apk/release/app-release.apk`

---

## Closed Beta via Google Play

1. Go to [Google Play Console](https://play.google.com/console)
2. Create app → App name: `SwipeHire` · Package: `mn.swipehire.app`
3. Testing → Internal testing → Create release → Upload APK
4. Add tester emails → Share internal test link

---

## App Icon Replacement

Replace the placeholder icons with production art:

```
Source file: android-assets/icon-source.svg  (1024×1024)

Generate PNGs at these sizes and copy to:
  48×48   → android/app/src/main/res/mipmap-mdpi/ic_launcher.png
  72×72   → android/app/src/main/res/mipmap-hdpi/ic_launcher.png
  96×96   → android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
  144×144 → android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
  192×192 → android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
```

**Fast tool:** https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html
Upload `icon-source.svg` → download → extract into `res/mipmap-*/`

---

## Splash Screen Replacement

```
Source file: android-assets/splash-source.svg  (2732×2732)

Copy to all density folders:
  android/app/src/main/res/drawable/splash.png         (recommended: 2732×2732)
  android/app/src/main/res/drawable-port-*/splash.png
  android/app/src/main/res/drawable-land-*/splash.png

Background color: #0d0c0a (set in capacitor.config.json)
```

---

## Permissions Declared

| Permission | Reason |
|-----------|--------|
| `INTERNET` | All API calls, video streaming |
| `CAMERA` | Video CV recording |
| `RECORD_AUDIO` | Video CV audio |
| `READ_MEDIA_VIDEO` / `READ_MEDIA_IMAGES` | Upload CV/portfolio files |
| `READ/WRITE_EXTERNAL_STORAGE` | Android ≤ 12 file access |
| `POST_NOTIFICATIONS` | New match & message alerts |
| `ACCESS_NETWORK_STATE` | Offline detection |
| `VIBRATE` | Notification haptic feedback |

All declared in: `android/app/src/main/AndroidManifest.xml`

---

## Android Closed Beta Checklist

- [x] App name: SwipeHire
- [x] Package ID: mn.swipehire.app
- [x] Web build: ✓ dist/ generated (548 kB, gzip 147 kB)
- [x] Capacitor sync: ✓ web assets in android/app/src/main/assets/public/
- [x] AndroidManifest.xml: camera, audio, notification permissions added
- [x] capacitor.config.json: splash, notifications, androidScheme configured
- [x] vite.config.js: base './' set for Capacitor asset paths
- [x] 360px mobile layout: topbar, tabbar responsive fixes applied
- [x] Icon source SVG: android-assets/icon-source.svg (replace with production art)
- [x] Splash source SVG: android-assets/splash-source.svg (replace with production art)
- [ ] Replace placeholder icons with production PNG icons
- [ ] Replace placeholder splash with production splash PNG
- [ ] Create signing keystore (for release APK)
- [ ] Upload to Google Play Internal Testing
- [ ] Add beta tester emails

---

## Minimum Android Version

Capacitor 8 targets:
- **minSdkVersion**: 23 (Android 6.0 — covers 96% of Mongolian Android devices)
- **targetSdkVersion**: 35 (Android 15)

Set in: `android/app/build.gradle`
