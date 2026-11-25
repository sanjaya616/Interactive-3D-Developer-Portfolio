# Firebase Backend & Security Documentation — Sanjaya's World

This document describes the Firebase Authentication, Cloud Firestore schema, security rules, and Express validation architecture integrated into **Sanjaya's World**.

---

## 1. Provisioned Firebase Project

- **Project Config**: Loaded from `/firebase-applet-config.json` (public client SDK config only; no secrets).
- **Database**: Multi-database Firestore instance identified by `firestoreDatabaseId` in `firebase-applet-config.json`, bound explicitly in `src/firebase/client.ts` via `getFirestore(app, firebaseConfig.firestoreDatabaseId)`.
- **Authentication**: Google Sign-In (`GoogleAuthProvider` with `signInWithPopup`). Exploring the 3D world, completing portfolio challenges, and saving locally remain **100% playable as a guest without an account**.

---

## 2. Firestore Schema (`firebase-blueprint.json`)

| Collection Path | Document ID | Purpose & Access Model |
| :--- | :--- | :--- |
| `/users/{uid}` | Firebase Auth `uid` | Private owner-only cloud save (`displayName`, `vehicle`, `settings`, `visitedLocations`, `openedProjects`, `collectedIds`, `discoveredSecrets`, `completedChallenges`, `unlockedAchievements`, `bestLapSeconds`, `lastLapSeconds`, `distanceDrivenMeters`). Never stores unnecessary PII (`email`, `phone`). |
| `/leaderboard/{uid}` | Firebase Auth `uid` | One verified best Paddock Circuit record per authenticated player (`uid`, `driverName`, `vehicleType`, `lapSeconds`, `runId`, `serverSig`, `status: 'verified'`, `achievedAt`, `updatedAt`). Publicly readable; client updates are only permitted when improving an existing record with a valid 64-hex `serverSig`. |
| `/whispers/{whisperId}` | Generated Whisper ID | Short visitor guestbook notes strictly capped at **30 characters** (`authorUid`, `authorName`, `countryCode`, `message`, `status`, `reportCount`, `serverSig`, `createdAt`, `updatedAt`). Public `list` queries filter to `status == 'published'`. |
| `/whispers/{whisperId}/reports/{reporterUid}` | Reporter `uid` | Unique per-user abuse report record (`spam`, `offensive`, `harassment`, `other`) paired atomically with a +1 `reportCount` increment via Firestore `writeBatch`. Auto-flags Whispers once `reportCount >= 3`. |
| `/admins/{uid}` | Admin `uid` | Trusted administrator registry (`allow list, write: if false`). Admin moderation is also authorized for verified `sanjayalasnan327@gmail.com` (`email_verified == true`). |

---

## 3. Server-Side Validation & Anti-Cheat (`server.ts`, `src/server/validation.ts`)

1. **Paddock Racing Telemetry (`/api/race/start`, `/api/race/verify`, `/api/leaderboard/check-signatures`)**:
   - Starting a Paddock race fetches a signed session token (`runToken`) containing `runId`, optional `uid`, `startedAtMs`, and server-computed `maxSpeedMs` derived from vehicle upgrades.
   - Upon finishing a lap, signed-in players send telemetry ghost samples + `runToken` with a verified Firebase ID token (`Authorization: Bearer <idToken>`, verified server-side via `firebase-admin/auth`).
   - The server verifies strictly increasing timestamps, world boundary bounds, Paddock start/finish gantry proximity, ordered traversal of all 4 Paddock sector checkpoints, physical speed bounds, real server wall-clock elapsed duration, and single-use `runId` deduplication before issuing a 64-hex `serverSig`.
2. **Whisper Moderation & Rate Limiting (`/api/whispers/prepare`)**:
   - Enforces sliding-window rate limits (cooldown + burst limit), duplicate-message blocking, `2–24` char display names, allowlisted country flags (`src/data/countries.ts`), `1–30` char message length, and HTML/URL/flood/profanity filtering before issuing a 64-hex `serverSig`.

---

## 4. Security Rules & Auditing (`firestore.rules`)

- **Default Deny**: Global `match /{document=**} { allow read, write: if false; }` safety net.
- **Email Verification**: All authenticated write & owner operations require `request.auth.token.email_verified == true`.
- **Anti-Tampering & Atomic Reporting**:
  - `leaderboard` enforces `12.0 <= lapSeconds <= 600.0`, `incoming().lapSeconds < existing().lapSeconds`, and a 5-second update cooldown.
  - `whispers` enforces `message.size() <= 30`, `reportCount == 0` and `status == 'published'` on creation, and `!exists(...) && existsAfter(...)` on atomic batch reports so no user can spam repeat reports.
- **Static Rules Lint**: Run `npx eslint firestore.rules` (configured via `eslint.config.js` with `@firebase/eslint-plugin-security-rules`) before deploying.

---

## 5. Local Development & Testing Commands

```bash
# Run Express + Vite dev server on port 3000
npm run dev

# Validate Firestore security rules with official Firebase ESLint plugin
npx eslint firestore.rules

# Run game math + server anti-cheat + Whisper + Firestore rules security tests
npx --yes tsx --test src/game/physicsMath.test.ts firestore.rules.test.ts

# Type-check & compile production build
npm run lint
npm run build
```

> **Production Note**: Configure `VERIFICATION_HMAC_SECRET` in your hosting environment secrets so HMAC signatures remain persistent across server restarts, and always review/verify `firestore.rules` in the Firebase Console before broad public launch.
