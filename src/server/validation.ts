import crypto from 'node:crypto';
import { ALLOWED_COUNTRY_CODES } from '../data/countries.ts';
import { PADDOCK_CHECKPOINTS } from '../data/portfolioData.ts';
import type { GhostSample, VehicleChassisType } from '../types/portfolio.ts';

export const WHISPER_MAX_LENGTH = 30;
export const AUTHOR_NAME_REGEX = /^[a-zA-Z0-9 ._-]{2,24}$/;
export const MIN_LAP_SECONDS = 12.0;
export const MAX_LAP_SECONDS = 600.0;

const BLOCKED_TERMS_REGEX =
  /\b(fuck|shit|bitch|asshole|bastard|cunt|dick|porn|xxx|viagra|casino|crypto\s*airdrop|free\s*money|buy\s*followers|spammer)\b/i;
const URL_REGEX = /(https?:\/\/|www\.|\.[a-z]{2,6}\b\/|\.(com|net|org|io|gg|xyz|ru|cn|tk)\b)/i;
const CONTROL_OR_HTML_REGEX = /[<>]|[\u0000-\u001F\u007F\u200B-\u200D\uFEFF]/;
const REPEATED_CHAR_REGEX = /(.)\1{5,}/;

export interface RunTokenPayload {
  runId: string;
  uid: string | null;
  startedAtMs: number;
  maxSpeedMs: number;
}

const PLACEHOLDER_SECRETS = new Set([
  'CHANGE_ME_SERVER_SECRET',
  'MY_VERIFICATION_HMAC_SECRET',
  'YOUR_VERIFICATION_HMAC_SECRET',
]);

export interface SigningSecretResolution {
  configured: boolean;
  secret: string | null;
}

export function resolveServerSigningSecret(
  envSecret: string | undefined,
  nodeEnv: string | undefined,
): SigningSecretResolution {
  const trimmed = (envSecret || '').trim();
  const isValid = trimmed.length >= 16 && !PLACEHOLDER_SECRETS.has(trimmed);
  if (isValid) {
    return { configured: true, secret: trimmed };
  }
  if (nodeEnv === 'production') {
    return { configured: false, secret: null };
  }
  return { configured: false, secret: crypto.randomBytes(32).toString('hex') };
}

export function hmacSha256Hex(secret: string, input: string): string {
  return crypto.createHmac('sha256', secret).update(input, 'utf8').digest('hex');
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(a) || !/^[a-f0-9]{64}$/i.test(b)) return false;
  const bufA = Buffer.from(a.toLowerCase(), 'hex');
  const bufB = Buffer.from(b.toLowerCase(), 'hex');
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

export function computeMaxAllowedSpeedMs(
  chassisType: unknown,
  engineTier: unknown,
  boostTier: unknown,
): number {
  const e = engineTier === 3 ? 3 : engineTier === 2 ? 2 : 1;
  const b = boostTier === 3 ? 3 : boostTier === 2 ? 2 : 1;
  const chassisBonus = chassisType === 'rally' ? 2.5 : chassisType === 'rover' ? 1.0 : 0;
  // Base max speed (~26 m/s) + engine/boost upgrades + downhill/jump physics margin
  return 27 + (e - 1) * 3.5 + (b - 1) * 2.5 + chassisBonus;
}

export function signRunToken(payload: RunTokenPayload, secret: string): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = hmacSha256Hex(secret, `run:${encoded}`);
  return `${encoded}.${sig}`;
}

export function verifyRunToken(
  token: unknown,
  secret: string,
  nowMs: number = Date.now(),
): { valid: true; payload: RunTokenPayload } | { valid: false; reason: string } {
  if (typeof token !== 'string' || !token.includes('.')) {
    return { valid: false, reason: 'Missing or malformed race session token.' };
  }
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) {
    return { valid: false, reason: 'Malformed race session token.' };
  }
  const expectedSig = hmacSha256Hex(secret, `run:${encoded}`);
  if (!timingSafeEqualHex(sig, expectedSig)) {
    return { valid: false, reason: 'Invalid race session signature.' };
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as RunTokenPayload;
    if (
      !parsed ||
      typeof parsed.runId !== 'string' ||
      !/^[a-zA-Z0-9_-]{8,64}$/.test(parsed.runId) ||
      typeof parsed.startedAtMs !== 'number' ||
      typeof parsed.maxSpeedMs !== 'number'
    ) {
      return { valid: false, reason: 'Corrupted race session payload.' };
    }
    const ageMs = nowMs - parsed.startedAtMs;
    if (ageMs < 0 || ageMs > 15 * 60 * 1000) {
      return { valid: false, reason: 'Race session expired. Please start a fresh lap.' };
    }
    return { valid: true, payload: parsed };
  } catch {
    return { valid: false, reason: 'Unable to decode race session token.' };
  }
}

export function sanitizeDriverName(raw: unknown, fallback = 'Driver'): string {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw.replace(/[^a-zA-Z0-9 ._-]/g, '').replace(/\s+/g, ' ').trim();
  if (cleaned.length < 2) return fallback;
  return cleaned.slice(0, 24);
}

export function formatVehicleLabel(chassisType: unknown, plateText: unknown): string {
  const c: VehicleChassisType =
    chassisType === 'rover' || chassisType === 'rally' ? chassisType : 'buggy';
  const name = c === 'rover' ? 'Highland Rover' : c === 'rally' ? 'Rally Coupe' : 'Sandstone Buggy';
  const safePlate =
    typeof plateText === 'string' && plateText.trim()
      ? plateText.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase().slice(0, 8) || 'SANJAYA'
      : 'SANJAYA';
  return `${name} (${safePlate})`.slice(0, 40);
}

export interface RaceTelemetryVerificationInput {
  uid: string;
  driverName: unknown;
  chassisType: unknown;
  plateText: unknown;
  runTokenPayload: RunTokenPayload;
  ghostFrames: unknown;
  nowMs?: number;
}

export type RaceVerificationResult =
  | {
      ok: true;
      lapSeconds: number;
      driverName: string;
      vehicleType: string;
      runId: string;
      serverSig: string;
    }
  | {
      ok: false;
      error: string;
    };

export function verifyRaceTelemetry(
  input: RaceTelemetryVerificationInput,
  secret: string,
): RaceVerificationResult {
  const nowMs = input.nowMs ?? Date.now();
  const token = input.runTokenPayload;

  if (token.uid && token.uid !== input.uid) {
    return { ok: false, error: 'Race session belongs to a different player account.' };
  }

  if (!Array.isArray(input.ghostFrames) || input.ghostFrames.length < 20 || input.ghostFrames.length > 1200) {
    return { ok: false, error: 'Insufficient race telemetry samples for verification.' };
  }

  const frames: GhostSample[] = [];
  for (let i = 0; i < input.ghostFrames.length; i++) {
    const f = input.ghostFrames[i] as Partial<GhostSample> | null;
    if (
      !f ||
      typeof f.t !== 'number' ||
      typeof f.x !== 'number' ||
      typeof f.y !== 'number' ||
      typeof f.z !== 'number' ||
      typeof f.yaw !== 'number' ||
      !Number.isFinite(f.t) ||
      !Number.isFinite(f.x) ||
      !Number.isFinite(f.y) ||
      !Number.isFinite(f.z) ||
      !Number.isFinite(f.yaw)
    ) {
      return { ok: false, error: 'Invalid telemetry frame structure.' };
    }
    if (Math.abs(f.x) > 140 || Math.abs(f.z) > 140 || f.y < -10 || f.y > 60) {
      return { ok: false, error: 'Telemetry coordinates out of world bounds.' };
    }
    if (i > 0 && f.t <= frames[i - 1].t) {
      return { ok: false, error: 'Telemetry timestamps must be strictly increasing.' };
    }
    frames.push(f as GhostSample);
  }

  // Verify start and finish proximity to The Paddock gantry (-66, 18)
  const first = frames[0];
  const last = frames[frames.length - 1];
  if (Math.hypot(first.x + 66, first.z - 18) > 20) {
    return { ok: false, error: 'Lap did not start at The Paddock starting gantry.' };
  }
  if (Math.hypot(last.x + 66, last.z - 18) > 16) {
    return { ok: false, error: 'Lap did not finish at The Paddock finish gantry.' };
  }

  // Verify sequential traversal of all 4 Paddock checkpoints & physical speed limit
  let nextCpIdx = 0;
  const maxSegmentSpeed = token.maxSpeedMs * 1.48;
  for (let i = 0; i < frames.length; i++) {
    const cur = frames[i];
    if (i > 0) {
      const prev = frames[i - 1];
      const dt = cur.t - prev.t;
      const dist = Math.hypot(cur.x - prev.x, cur.z - prev.z);
      if (dt > 0 && dist / dt > maxSegmentSpeed) {
        return { ok: false, error: 'Telemetry speed exceeded physical vehicle bounds.' };
      }
    }
    if (nextCpIdx < PADDOCK_CHECKPOINTS.length) {
      const cp = PADDOCK_CHECKPOINTS[nextCpIdx];
      if (Math.hypot(cur.x - cp.x, cur.z - cp.z) <= 13.5) {
        nextCpIdx++;
      }
    }
  }

  if (nextCpIdx < PADDOCK_CHECKPOINTS.length) {
    return {
      ok: false,
      error: `All 4 Paddock sector checkpoints must be cleared in order (cleared ${nextCpIdx}/4).`,
    };
  }

  // Server-derived lap duration from verified telemetry (never trusting a raw client number)
  const lapSeconds = Number(last.t.toFixed(2));
  if (lapSeconds < MIN_LAP_SECONDS || lapSeconds > MAX_LAP_SECONDS) {
    return {
      ok: false,
      error: `Verified lap time (${lapSeconds}s) outside valid range (${MIN_LAP_SECONDS}s–${MAX_LAP_SECONDS}s).`,
    };
  }

  // Cross-check against real wall-clock time since /api/race/start (3s countdown subtracted)
  const wallElapsedSec = (nowMs - token.startedAtMs) / 1000;
  const minExpectedWallSec = Math.max(0, lapSeconds * 0.72 + 1.5);
  if (wallElapsedSec < minExpectedWallSec) {
    return {
      ok: false,
      error: 'Clock verification failed: lap completed faster than server elapsed time.',
    };
  }

  const driverName = sanitizeDriverName(input.driverName, 'Explorer');
  const vehicleType = formatVehicleLabel(input.chassisType, input.plateText);
  const serverSig = signLeaderboardRecord(
    {
      uid: input.uid,
      runId: token.runId,
      lapSeconds,
      vehicleType,
    },
    secret,
  );

  return {
    ok: true,
    lapSeconds,
    driverName,
    vehicleType,
    runId: token.runId,
    serverSig,
  };
}

export function signLeaderboardRecord(
  data: { uid: string; runId: string; lapSeconds: number; vehicleType: string },
  secret: string,
): string {
  return hmacSha256Hex(
    secret,
    `lb:${data.uid}:${data.runId}:${data.lapSeconds.toFixed(2)}:${data.vehicleType}`,
  );
}

export interface WhisperValidationInput {
  uid: string;
  authorName: unknown;
  countryCode: unknown;
  message: unknown;
}

export type WhisperValidationResult =
  | {
      ok: true;
      id: string;
      authorUid: string;
      authorName: string;
      countryCode: string;
      message: string;
      serverSig: string;
    }
  | {
      ok: false;
      error: string;
    };

export function validateAndSignWhisper(
  input: WhisperValidationInput,
  secret: string,
  nowMs: number = Date.now(),
): WhisperValidationResult {
  if (typeof input.authorName !== 'string') {
    return { ok: false, error: 'Display name is required.' };
  }
  const authorName = input.authorName.replace(/\s+/g, ' ').trim();
  if (!AUTHOR_NAME_REGEX.test(authorName)) {
    return {
      ok: false,
      error: 'Display name must be 2–24 characters (letters, numbers, spaces, . _ -).',
    };
  }
  if (BLOCKED_TERMS_REGEX.test(authorName)) {
    return { ok: false, error: 'Display name contains disallowed words.' };
  }

  if (typeof input.countryCode !== 'string' || !ALLOWED_COUNTRY_CODES.has(input.countryCode)) {
    return { ok: false, error: 'Please select a valid country flag from the list.' };
  }

  if (typeof input.message !== 'string') {
    return { ok: false, error: 'Message text is required.' };
  }
  const message = input.message.replace(/\s+/g, ' ').trim();
  if (message.length < 1 || message.length > WHISPER_MAX_LENGTH) {
    return {
      ok: false,
      error: `Message must be between 1 and ${WHISPER_MAX_LENGTH} characters.`,
    };
  }
  if (CONTROL_OR_HTML_REGEX.test(message)) {
    return { ok: false, error: 'HTML tags and control characters are not allowed.' };
  }
  if (URL_REGEX.test(message)) {
    return { ok: false, error: 'Links and domains are blocked to prevent spam.' };
  }
  if (REPEATED_CHAR_REGEX.test(message)) {
    return { ok: false, error: 'Repeated character spam is not allowed.' };
  }
  if (BLOCKED_TERMS_REGEX.test(message)) {
    return { ok: false, error: 'Message triggered the moderation filter.' };
  }

  const rand = crypto.randomBytes(3).toString('hex');
  const safeUidPart = input.uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 8) || 'user';
  const id = `w_${safeUidPart}_${nowMs.toString(36)}_${rand}`;
  const serverSig = signWhisperEntry(
    {
      id,
      authorUid: input.uid,
      countryCode: input.countryCode,
      message,
    },
    secret,
  );

  return {
    ok: true,
    id,
    authorUid: input.uid,
    authorName,
    countryCode: input.countryCode,
    message,
    serverSig,
  };
}

export function signWhisperEntry(
  data: { id: string; authorUid: string; countryCode: string; message: string },
  secret: string,
): string {
  return hmacSha256Hex(
    secret,
    `wh:${data.id}:${data.authorUid}:${data.countryCode}:${data.message}`,
  );
}

/**
 * Simple sliding-window in-memory rate limiter.
 */
export class SlidingWindowLimiter {
  private hits = new Map<string, number[]>();

  check(key: string, maxRequests: number, windowMs: number, minGapMs = 0, nowMs = Date.now()): {
    allowed: boolean;
    retryAfterSec: number;
  } {
    if (this.hits.size > 1000) {
      for (const [k, timestamps] of this.hits.entries()) {
        if (timestamps.length === 0 || nowMs - timestamps[timestamps.length - 1] >= windowMs) {
          this.hits.delete(k);
        }
        if (this.hits.size <= 750) break;
      }
      if (this.hits.size > 1000) {
        const oldestKey = this.hits.keys().next().value;
        if (oldestKey !== undefined) this.hits.delete(oldestKey);
      }
    }

    const arr = (this.hits.get(key) || []).filter((t) => nowMs - t < windowMs);
    if (arr.length > 0 && minGapMs > 0) {
      const sinceLast = nowMs - arr[arr.length - 1];
      if (sinceLast < minGapMs) {
        this.hits.set(key, arr);
        return { allowed: false, retryAfterSec: Math.ceil((minGapMs - sinceLast) / 1000) };
      }
    }
    if (arr.length >= maxRequests) {
      const oldest = arr[0];
      this.hits.set(key, arr);
      return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((windowMs - (nowMs - oldest)) / 1000)) };
    }
    arr.push(nowMs);
    this.hits.set(key, arr);
    return { allowed: true, retryAfterSec: 0 };
  }
}
