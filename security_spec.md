# Sanjaya's World — Security Specification & Dirty Dozen Payloads

## 1. Data Invariants

1. **Identity Integrity (`users/{uid}`)**: Only the authenticated, email-verified owner (`request.auth.uid == uid`) may read, create, update, or delete their cloud save document. Listing `/users` is strictly denied, and no unnecessary PII (email, phone, address) is stored.
2. **Leaderboard Fairness (`leaderboard/{uid}`)**:
   - Each player holds at most one document keyed by their verified `uid` (preventing duplicate leaderboard entries).
   - `lapSeconds` is bounded to physically valid range (`12.0 <= lapSeconds <= 600.0`), requires a 64-hex `serverSig` HMAC issued by the Express telemetry verification server, and updates only succeed when improving the player's previous record (`incoming().lapSeconds < existing().lapSeconds`) with a minimum 5-second cooldown.
3. **Guestbook Constraints (`whispers/{whisperId}`)**:
   - Every message is strictly bounded (`1 <= message.size() <= 30`), uses an allowlisted `countryCode`, starts with `status == 'published'` and `reportCount == 0`, and carries a 64-hex `serverSig` spam/rate-limit approval hash.
   - Public list queries are restricted by rule evaluation to `resource.data.status == 'published'`.
4. **Atomic Single-Vote Reporting (`whispers/{whisperId}/reports/{reporterUid}`)**:
   - Reporting a Whisper requires an atomic batch creating `/whispers/{whisperId}/reports/{request.auth.uid}` alongside incrementing `reportCount` by exactly `1` (guarded by `existsAfter()`). A user cannot report the same message twice or fabricate arbitrary report counts.
5. **Moderation Privilege Isolation**:
   - Only a verified administrator (`email == 'sanjayalasnan327@gmail.com' && email_verified == true` or `/admins/{uid}` entry) can moderate `status` (`flagged`/`removed`/`published`) or inspect hidden/flagged items.
6. **Temporal Integrity**: All `createdAt`, `updatedAt`, and `achievedAt` fields must equal `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Target Collection | Attack Vector | Expected Result |
|---|-------------------|---------------|-----------------|
| 1 | `/users/other-uid` | Cross-user cloud save read or write (`auth.uid != uid`) | `PERMISSION_DENIED` |
| 2 | `/users/{uid}` | Unverified email token (`email_verified == false`) attempting write | `PERMISSION_DENIED` |
| 3 | `/users/{uid}` | Shadow field injection (`{ isAdmin: true }` or `{ email: 'x@y.com' }`) | `PERMISSION_DENIED` |
| 4 | `/users` | Collection list query scraping other users' profiles | `PERMISSION_DENIED` |
| 5 | `/leaderboard/{uid}` | Manipulated impossible lap time (`lapSeconds: 1.25`) | `PERMISSION_DENIED` |
| 6 | `/leaderboard/{uid}` | Missing/invalid server HMAC signature (`serverSig: 'fake'`) | `PERMISSION_DENIED` |
| 7 | `/leaderboard/{uid}` | Regression overwrite (`incoming().lapSeconds >= existing().lapSeconds`) | `PERMISSION_DENIED` |
| 8 | `/whispers/{id}` | Oversized message exceeding 30 chars (`"A".repeat(31)`) | `PERMISSION_DENIED` |
| 9 | `/whispers/{id}` | Initial creation with tampered state (`status: 'removed'` or `reportCount: 5`) | `PERMISSION_DENIED` |
| 10 | `/whispers/{id}` | Unlisted country code (`countryCode: 'ZZ'`) | `PERMISSION_DENIED` |
| 11 | `/whispers/{id}` | Orphaned `reportCount` increment without atomic `/reports/{uid}` doc (`existsAfter` check) | `PERMISSION_DENIED` |
| 12 | `/whispers/{id}` | Non-admin user attempting moderation (`status: 'removed'`) or unverified email admin spoof | `PERMISSION_DENIED` |
