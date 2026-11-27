import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PADDOCK_CHECKPOINTS } from './src/data/portfolioData';
import { createInitialSaveState } from './src/state/saveValidation';
import { mergeCloudAndLocalSave } from './src/firebase/services';
import {
  resolveServerSigningSecret,
  SlidingWindowLimiter,
  signLeaderboardRecord,
  signRunToken,
  timingSafeEqualHex,
  validateAndSignWhisper,
  verifyRaceTelemetry,
  verifyRunToken,
} from './src/server/validation';
import type { GhostSample } from './src/types/portfolio';

const TEST_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function buildValidPaddockFrames(): GhostSample[] {
  // Construct realistic piecewise-interpolated telemetry starting & ending at Paddock (-66, 18)
  // passing all 4 ordered sector checkpoints well within speed limits (~15 m/s) over ~18s.
  const waypoints = [
    { x: -66, z: 18 },
    ...PADDOCK_CHECKPOINTS.map((cp) => ({ x: cp.x, z: cp.z })),
    { x: -66, z: 18 },
  ];
  const frames: GhostSample[] = [];
  let t = 0;
  const speedMs = 15;
  for (let w = 0; w < waypoints.length - 1; w++) {
    const a = waypoints[w];
    const b = waypoints[w + 1];
    const dist = Math.hypot(b.x - a.x, b.z - a.z);
    const segDuration = Math.max(3.2, dist / speedMs);
    const steps = Math.max(8, Math.ceil(segDuration / 0.25));
    for (let s = 0; s < steps; s++) {
      const frac = s / steps;
      const x = a.x + (b.x - a.x) * frac;
      const z = a.z + (b.z - a.z) * frac;
      frames.push({
        t: Number(t.toFixed(3)),
        x: Number(x.toFixed(2)),
        y: 0.6,
        z: Number(z.toFixed(2)),
        yaw: 0,
      });
      t += segDuration / steps;
    }
  }
  frames.push({
    t: Number(t.toFixed(3)),
    x: -66,
    y: 0.6,
    z: 18,
    yaw: 0,
  });
  return frames;
}

test('server run token signing & verification rejects tampering and expiration', () => {
  const startedAtMs = 1_700_000_000_000;
  const token = signRunToken(
    { runId: 'run_valid_123456', uid: 'user_abc', startedAtMs, maxSpeedMs: 30 },
    TEST_SECRET,
  );

  const ok = verifyRunToken(token, TEST_SECRET, startedAtMs + 25_000);
  assert.equal(ok.valid, true);

  // Tamper signature
  const tampered = `${token.slice(0, -4)}0000`;
  assert.equal(verifyRunToken(tampered, TEST_SECRET, startedAtMs + 25_000).valid, false);

  // Wrong secret
  assert.equal(verifyRunToken(token, 'wrong-secret', startedAtMs + 25_000).valid, false);

  // Expired (>15 min)
  assert.equal(verifyRunToken(token, TEST_SECRET, startedAtMs + 16 * 60_000).valid, false);
});

test('verifyRaceTelemetry accepts authentic Paddock circuit laps and rejects cheats/manipulation', () => {
  const frames = buildValidPaddockFrames();
  const totalSec = frames[frames.length - 1].t;
  const startedAtMs = 1_700_000_000_000;
  const finishNowMs = startedAtMs + Math.ceil((totalSec + 4) * 1000);
  const payload = {
    runId: 'run_authentic_001',
    uid: 'driver_1',
    startedAtMs,
    maxSpeedMs: 28,
  };

  // Authentic telemetry succeeds & returns 64-hex HMAC signature
  const res = verifyRaceTelemetry(
    {
      uid: 'driver_1',
      driverName: 'Sanjaya Lakshan',
      chassisType: 'rally',
      plateText: 'SL-01',
      runTokenPayload: payload,
      ghostFrames: frames,
      nowMs: finishNowMs,
    },
    TEST_SECRET,
  );
  assert.equal(res.ok, true, res.ok ? undefined : res.error);
  if (res.ok) {
    assert.ok(res.lapSeconds >= 12);
    assert.match(res.serverSig, /^[a-f0-9]{64}$/);
    const expected = signLeaderboardRecord(
      { uid: 'driver_1', runId: res.runId, lapSeconds: res.lapSeconds, vehicleType: res.vehicleType },
      TEST_SECRET,
    );
    assert.equal(timingSafeEqualHex(res.serverSig, expected), true);
  }

  // Attack 1: Account mismatch
  const wrongUid = verifyRaceTelemetry(
    {
      uid: 'attacker_99',
      driverName: 'Attacker',
      chassisType: 'buggy',
      plateText: 'HACK',
      runTokenPayload: payload,
      ghostFrames: frames,
      nowMs: finishNowMs,
    },
    TEST_SECRET,
  );
  assert.equal(wrongUid.ok, false);

  // Attack 2: Speedhack / teleportation across frames
  const teleportFrames = frames.map((f, idx) =>
    idx === 10 ? { ...f, x: f.x + 80, z: f.z - 80 } : f,
  );
  const speedHack = verifyRaceTelemetry(
    {
      uid: 'driver_1',
      driverName: 'SpeedHacker',
      chassisType: 'buggy',
      plateText: 'SL',
      runTokenPayload: payload,
      ghostFrames: teleportFrames,
      nowMs: finishNowMs,
    },
    TEST_SECRET,
  );
  assert.equal(speedHack.ok, false);

  // Attack 3: Skipping checkpoints (reversing sector 2 & 3 out of order)
  const skippedFrames = frames.filter(
    (f) => Math.hypot(f.x - PADDOCK_CHECKPOINTS[1].x, f.z - PADDOCK_CHECKPOINTS[1].z) > 15,
  );
  const skipRes = verifyRaceTelemetry(
    {
      uid: 'driver_1',
      driverName: 'Cutter',
      chassisType: 'buggy',
      plateText: 'SL',
      runTokenPayload: payload,
      ghostFrames: skippedFrames,
      nowMs: finishNowMs,
    },
    TEST_SECRET,
  );
  assert.equal(skipRes.ok, false);

  // Attack 4: Out-of-bounds world coordinates
  const oobFrames = frames.map((f, idx) => (idx === 5 ? { ...f, x: 999 } : f));
  assert.equal(
    verifyRaceTelemetry(
      {
        uid: 'driver_1',
        driverName: 'Driver',
        chassisType: 'buggy',
        plateText: 'SL',
        runTokenPayload: payload,
        ghostFrames: oobFrames,
        nowMs: finishNowMs,
      },
      TEST_SECRET,
    ).ok,
    false,
  );

  // Attack 5: Wall-clock tampering (client sends fake frames faster than real server elapsed time)
  const clockTamper = verifyRaceTelemetry(
    {
      uid: 'driver_1',
      driverName: 'Driver',
      chassisType: 'buggy',
      plateText: 'SL',
      runTokenPayload: payload,
      ghostFrames: frames,
      nowMs: startedAtMs + 2000,
    },
    TEST_SECRET,
  );
  assert.equal(clockTamper.ok, false);
});

test('validateAndSignWhisper enforces 30-char ceiling, spam/URL/XSS blocking, and rate limiting', () => {
  const valid = validateAndSignWhisper(
    { uid: 'visitor_1', authorName: 'Kavindu', countryCode: 'LK', message: 'Awesome 3D world!' },
    TEST_SECRET,
  );
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.message.length <= 30, true);
    assert.match(valid.serverSig, /^[a-f0-9]{64}$/);
  }

  // Dirty Dozen checks: >30 chars
  const tooLong = validateAndSignWhisper(
    { uid: 'v1', authorName: 'Tester', countryCode: 'US', message: 'A'.repeat(31) },
    TEST_SECRET,
  );
  assert.equal(tooLong.ok, false);

  // Dirty Dozen checks: HTML/XSS
  const xss = validateAndSignWhisper(
    { uid: 'v1', authorName: 'Tester', countryCode: 'US', message: '<script>alert(1)</script>' },
    TEST_SECRET,
  );
  assert.equal(xss.ok, false);

  // URL spam link
  const linkSpam = validateAndSignWhisper(
    { uid: 'v1', authorName: 'Spammer', countryCode: 'US', message: 'Visit https://spam.io now' },
    TEST_SECRET,
  );
  assert.equal(linkSpam.ok, false);

  // Repeated character flood
  const repeatSpam = validateAndSignWhisper(
    { uid: 'v1', authorName: 'Flooder', countryCode: 'GB', message: 'aaaaaaaaaa' },
    TEST_SECRET,
  );
  assert.equal(repeatSpam.ok, false);

  // Unlisted country code
  const badCountry = validateAndSignWhisper(
    { uid: 'v1', authorName: 'Tester', countryCode: 'ZZ', message: 'Hello world' },
    TEST_SECRET,
  );
  assert.equal(badCountry.ok, false);

  // Rate limiter blocks rapid spam bursts
  const limiter = new SlidingWindowLimiter();
  assert.equal(limiter.check('uid1', 2, 60_000, 10_000, 100_000).allowed, true);
  assert.equal(limiter.check('uid1', 2, 60_000, 10_000, 102_000).allowed, false); // min gap
  assert.equal(limiter.check('uid1', 2, 60_000, 10_000, 112_000).allowed, true);
  assert.equal(limiter.check('uid1', 2, 60_000, 10_000, 125_000).allowed, false); // max window
});

test('mergeCloudAndLocalSave preserves guest progress and takes fastest lap', () => {
  const local = createInitialSaveState();
  local.unlockedAchievements = ['first-drive'];
  local.collectedIds = ['orb-react', 'token-studio'];
  local.bestLapSeconds = 24.5;
  local.distanceDrivenMeters = 1200;

  const merged = mergeCloudAndLocalSave(
    local,
    {
      uid: 'u1',
      displayName: 'Sanjaya',
      unlockedAchievements: ['world-explorer'],
      collectedIds: ['token-studio', 'frag-1'],
      bestLapSeconds: 21.8,
      distanceDrivenMeters: 900,
    },
    'Google User',
  );

  assert.equal(merged.displayName, 'Sanjaya');
  assert.deepEqual(merged.unlockedAchievements, ['first-drive', 'world-explorer']);
  assert.deepEqual(merged.collectedIds, ['orb-react', 'token-studio', 'frag-1']);
  assert.equal(merged.bestLapSeconds, 21.8);
  assert.equal(merged.distanceDrivenMeters, 1200);
});

test('firestore.rules enforces Dirty Dozen, Eight Pillars, and PII safety invariants', () => {
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf8');

  // 1. Default deny safety net
  assert.match(rules, /match \/\{document=\*\*\}[\s\S]*allow read, write: if false;/);

  // 2. Email verification required for owned & admin privileges
  assert.match(rules, /request\.auth\.token\.email_verified == true/);

  // 3. No listing of /users/{uid} & no unnecessary PII fields in UserCloudSave
  assert.match(rules, /match \/users\/\{uid\}[\s\S]*allow list: if false;/);
  assert.equal(rules.includes("'email'"), false);
  assert.equal(rules.includes("'phone'"), false);

  // 4. Leaderboard server signature, bounds, cooldown, and improvement-only updates
  assert.match(rules, /isHex64\(data\.serverSig\)/);
  assert.match(rules, /data\.lapSeconds >= 12 && data\.lapSeconds <= 600/);
  assert.match(rules, /incoming\(\)\.lapSeconds < existing\(\)\.lapSeconds/);
  assert.match(rules, /request\.time >= existing\(\)\.updatedAt \+ duration\.value\(5, 's'\)/);

  // 5. Whispers 30-char limit, country allowlist, published default, and atomic report anti-replay
  assert.match(rules, /data\.message\.size\(\) <= 30/);
  assert.match(rules, /isAllowedCountry\(data\.countryCode\)/);
  assert.match(rules, /incoming\(\)\.status == 'published'/);
  assert.match(rules, /incoming\(\)\.reportCount == 0/);
  assert.match(
    rules,
    /!exists\(\/databases\/\$\(database\)\/documents\/whispers\/\$\(whisperId\)\/reports\/\$\(request\.auth\.uid\)\)/,
  );
  assert.match(
    rules,
    /existsAfter\(\/databases\/\$\(database\)\/documents\/whispers\/\$\(whisperId\)\/reports\/\$\(request\.auth\.uid\)\)/,
  );

  // 6. Pillar 8: allow list clauses do NOT call get() or exists()
  const listMatches = [...rules.matchAll(/allow list:\s*([^;]+);/g)];
  assert.ok(listMatches.length >= 4);
  for (const m of listMatches) {
    assert.equal(/\b(get|exists|isAdmin\()\b/.test(m[1]), false, `allow list contains lookup: ${m[1]}`);
  }

  // 7. Garage vehicle accessory allowlist includes Forest Trail unlockable rack
  assert.equal(rules.includes("'trail-expedition-rack'"), true);
});

test('resolveServerSigningSecret enforces persistent non-placeholder secret in production', () => {
  const prodMissing = resolveServerSigningSecret(undefined, 'production');
  assert.equal(prodMissing.configured, false);
  assert.equal(prodMissing.secret, null);

  const prodPlaceholder = resolveServerSigningSecret('CHANGE_ME_SERVER_SECRET', 'production');
  assert.equal(prodPlaceholder.configured, false);
  assert.equal(prodPlaceholder.secret, null);

  const prodShort = resolveServerSigningSecret('short', 'production');
  assert.equal(prodShort.configured, false);
  assert.equal(prodShort.secret, null);

  const prodValid = resolveServerSigningSecret(TEST_SECRET, 'production');
  assert.equal(prodValid.configured, true);
  assert.equal(prodValid.secret, TEST_SECRET);

  const devFallback = resolveServerSigningSecret(undefined, 'development');
  assert.equal(devFallback.configured, false);
  assert.ok(devFallback.secret && devFallback.secret.length >= 32);
});

test('SlidingWindowLimiter keeps internal key map bounded under high cardinality', () => {
  const limiter = new SlidingWindowLimiter();
  const baseNow = 10_000_000;
  for (let i = 0; i < 1200; i++) {
    const res = limiter.check(`client-${i}`, 5, 60_000, 0, baseNow + i * 200);
    assert.equal(res.allowed, true);
  }
  const mapSize = (limiter as unknown as { hits: Map<string, number[]> }).hits.size;
  assert.ok(mapSize <= 1001, `expected bounded limiter size, got ${mapSize}`);
});
