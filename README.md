# TCS Tap Tracker

> Production-ready mobile attendance app built with Capacitor + vanilla JS, deployable as an Android APK.

---

## Features

| Feature | Details |
|---|---|
| **Authentication** | Associate ID + 4-digit PIN, persisted session |
| **Tap In / Out** | Large glow button with red ↔ green animation |
| **Shift Timer** | Live HH:MM:SS elapsed counter + circular progress ring toward 9 h |
| **Haptic Feedback** | `navigator.vibrate(100)` on every tap |
| **Shift Logging** | Confirmation modal → POST to Google Apps Script |
| **History** | Bottom sheet with collapsible personal swipe records |
| **Offline Resilience** | Active tap-in state persisted in `localStorage` |
| **APK CI** | GitHub Actions builds a debug APK on every push |

---

## Project Structure

```
tcs-tap-tracker/
├── www/                        # Web assets (Capacitor webDir)
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── app.js              # Entry point / boot sequence
│       ├── api.js              # Backend communication
│       ├── store.js            # localStorage persistence
│       ├── utils.js            # Shared helpers
│       ├── login.js            # Login screen controller
│       └── dashboard.js        # Dashboard controller
├── .github/
│   └── workflows/
│       └── build-apk.yml       # CI: build debug APK on push
├── capacitor.config.json
├── package.json
└── README.md
```

---

## Quick Start (Local Development)

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| Android Studio | Latest stable |
| JDK | 17 |

### 1 – Install dependencies

```bash
npm install
```

### 2 – Add Android platform

```bash
npx cap add android
```

### 3 – Sync web assets

```bash
npx cap sync android
```

### 4 – Open in Android Studio (or build directly)

```bash
# Open in Android Studio for GUI build
npx cap open android

# Or build APK from command line (Linux / macOS)
cd android && ./gradlew assembleDebug

# Windows
cd android && gradlew.bat assembleDebug
```

The APK will be at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### 5 – Run in browser (for quick testing)

```bash
npm run serve
# → http://localhost:8080
```

---

## Backend API

All requests are HTTP **POST** to:
```
https://script.google.com/macros/s/AKfycbwNuzQyg1FJt8Zwp6eKeopZgmUv50Vhhi-E_OjuCWAHszIyxo6WkyYq8q_L6XmrajIk/exec
```

| Action | Payload |
|---|---|
| `login` | `{ action, associateId, pin }` |
| `logAttendance` | `{ action, associateId, pin, date, tapIn, tapOut, totalHours }` |
| `getHistory` | `{ action, associateId, pin }` |

The GAS endpoint must return `{ "success": true, ... }` or `{ "success": false, "message": "..." }`.

---

## GitHub Actions CI

Push to `main` or `master` to automatically build a debug APK:

1. The workflow installs JDK 17, Android SDK 34, and Node 20.
2. Runs `npx cap add android` (if needed) and `npx cap sync`.
3. Builds via `./gradlew assembleDebug`.
4. Uploads the APK as a downloadable **GitHub Actions artifact** (retained 30 days).

You can also trigger a build manually from **Actions → Build Android Debug APK → Run workflow**.

---

## Capacitor Configuration

| Key | Value |
|---|---|
| `appId` | `com.tcs.taptracker` |
| `appName` | `TCS Tap Tracker` |
| `webDir` | `www` |
| `androidScheme` | `https` |

---

## Customisation

- **Shift target:** Change `SHIFT_TARGET_SECS` in `www/js/dashboard.js` (default 9 h = 32 400 s).
- **API URL:** Change `BASE_URL` in `www/js/api.js`.
- **Theme colours:** Edit CSS custom properties at the top of `www/css/styles.css`.
