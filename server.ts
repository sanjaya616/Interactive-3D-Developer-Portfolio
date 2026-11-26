import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { GoogleGenAI, ThinkingLevel, type Content } from '@google/genai';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import {
  ASSISTANT_MODEL,
  ASSISTANT_SYSTEM_INSTRUCTION,
  classifyGeminiApiError,
  extractNavigationSuggestions,
  validateAssistantRequest,
} from './src/server/portfolioAssistant.ts';
import {
  computeMaxAllowedSpeedMs,
  resolveServerSigningSecret,
  signLeaderboardRecord,
  signRunToken,
  SlidingWindowLimiter,
  timingSafeEqualHex,
  validateAndSignWhisper,
  verifyRaceTelemetry,
  verifyRunToken,
} from './src/server/validation.ts';

const firebaseConfigPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = fs.existsSync(firebaseConfigPath)
  ? (JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8')) as { projectId?: string })
  : {};

const adminApp = firebaseConfig.projectId
  ? getApps().length
    ? getApp()
    : initializeApp({ projectId: firebaseConfig.projectId })
  : null;

const signingResolution = resolveServerSigningSecret(
  process.env.VERIFICATION_HMAC_SECRET,
  process.env.NODE_ENV,
);
if (!signingResolution.configured) {
  if (signingResolution.secret === null) {
    console.error(
      '[Security] VERIFICATION_HMAC_SECRET is missing or placeholder in production; signed race/whisper verification endpoints will return 503 until configured.',
    );
  } else {
    console.warn(
      '[Dev Security] VERIFICATION_HMAC_SECRET is not set; using an ephemeral dev runtime secret (signatures reset on restart).',
    );
  }
}

const rawGeminiApiKey = (process.env.GEMINI_API_KEY || '').trim();
const hasConfiguredGeminiKey =
  rawGeminiApiKey.length > 0 && rawGeminiApiKey !== 'MY_GEMINI_API_KEY';

const geminiAi = hasConfiguredGeminiKey
  ? new GoogleGenAI({
      apiKey: rawGeminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

const raceStartLimiter = new SlidingWindowLimiter();
const raceVerifyLimiter = new SlidingWindowLimiter();
const whisperLimiter = new SlidingWindowLimiter();
const assistantLimiter = new SlidingWindowLimiter();
const usedRunIds = new Set<string>();
const recentWhispersByUid = new Map<string, { message: string; atMs: number }>();

interface AuthedRequest extends Request {
  authUser?: DecodedIdToken;
}

async function verifyBearerToken(req: AuthedRequest): Promise<DecodedIdToken | null> {
  if (!adminApp) return null;
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  if (!token) return null;
  try {
    return await getAuth(adminApp).verifyIdToken(token);
  } catch {
    return null;
  }
}

async function requireVerifiedFirebaseUser(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const decoded = await verifyBearerToken(req);
  if (!decoded) {
    res.status(401).json({ error: 'Authentication required. Please sign in with Google.' });
    return;
  }
  if (!decoded.email_verified) {
    res.status(403).json({ error: 'Verified Google account required.' });
    return;
  }
  req.authUser = decoded;
  next();
}

function getClientKey(req: Request, suffix = ''): string {
  const ip =
    (typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : req.ip) || 'unknown';
  return suffix ? `${ip}:${suffix}` : ip;
}

function requireSigningSecret(res: Response): string | null {
  if (!signingResolution.secret) {
    res.status(503).json({
      code: 'HMAC_SECRET_MISSING',
      error:
        'Race and Whisper verification signing secret (VERIFICATION_HMAC_SECRET) is not configured for production.',
    });
    return null;
  }
  return signingResolution.secret;
}

async function startServer(): Promise<void> {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      projectId: firebaseConfig.projectId || null,
      hmacConfigured: signingResolution.configured,
    });
  });

  // 1. Issue signed race session token before a Paddock lap starts
  app.post('/api/race/start', async (req: AuthedRequest, res: Response) => {
    const signingSecret = requireSigningSecret(res);
    if (!signingSecret) return;

    const rate = raceStartLimiter.check(getClientKey(req, 'race-start'), 20, 60_000, 1500);
    if (!rate.allowed) {
      res.status(429).json({ error: `Please wait ${rate.retryAfterSec}s before restarting a race.` });
      return;
    }

    const decoded = await verifyBearerToken(req);
    const body = (req.body || {}) as {
      chassisType?: unknown;
      engineTier?: unknown;
      boostTier?: unknown;
    };

    const runId = `run_${crypto.randomBytes(10).toString('hex')}`;
    const startedAtMs = Date.now();
    const maxSpeedMs = computeMaxAllowedSpeedMs(
      body.chassisType,
      body.engineTier,
      body.boostTier,
    );
    const runToken = signRunToken(
      {
        runId,
        uid: decoded?.uid ?? null,
        startedAtMs,
        maxSpeedMs,
      },
      signingSecret,
    );

    res.json({ runId, runToken, startedAtMs });
  });

  // 2. Verify full race telemetry & ghost frames server-side; never trust client-submitted lap times
  app.post(
    '/api/race/verify',
    requireVerifiedFirebaseUser,
    (req: AuthedRequest, res: Response) => {
      const uid = req.authUser!.uid;
      const rate = raceVerifyLimiter.check(`verify:${uid}`, 8, 5 * 60_000, 5000);
      if (!rate.allowed) {
        res
          .status(429)
          .json({ error: `Submission cooldown active. Try again in ${rate.retryAfterSec}s.` });
        return;
      }

      const signingSecret = requireSigningSecret(res);
      if (!signingSecret) return;

      const body = (req.body || {}) as {
        runToken?: unknown;
        ghostFrames?: unknown;
        driverName?: unknown;
        chassisType?: unknown;
        plateText?: unknown;
      };

      const tokenCheck = verifyRunToken(body.runToken, signingSecret);
      if (tokenCheck.valid === false) {
        res.status(400).json({ error: tokenCheck.reason });
        return;
      }

      if (usedRunIds.has(tokenCheck.payload.runId)) {
        res.status(409).json({ error: 'Duplicate race submission rejected.' });
        return;
      }

      const verification = verifyRaceTelemetry(
        {
          uid,
          driverName: body.driverName ?? req.authUser?.name ?? 'Explorer',
          chassisType: body.chassisType,
          plateText: body.plateText,
          runTokenPayload: tokenCheck.payload,
          ghostFrames: body.ghostFrames,
        },
        signingSecret,
      );

      if (verification.ok === false) {
        res.status(422).json({ error: verification.error });
        return;
      }

      usedRunIds.add(verification.runId);
      if (usedRunIds.size > 5000) {
        const oldest = usedRunIds.values().next().value;
        if (oldest) usedRunIds.delete(oldest);
      }

      res.json({
        verified: true,
        record: {
          uid,
          driverName: verification.driverName,
          vehicleType: verification.vehicleType,
          lapSeconds: verification.lapSeconds,
          runId: verification.runId,
          serverSig: verification.serverSig,
          status: 'verified',
        },
      });
    },
  );

  // 3. Check which public leaderboard records carry a valid server HMAC signature
  app.post('/api/leaderboard/check-signatures', (req: Request, res: Response) => {
    const signingSecret = requireSigningSecret(res);
    if (!signingSecret) return;

    const entries = Array.isArray(req.body?.entries) ? req.body.entries.slice(0, 50) : [];
    const verifiedRunIds: string[] = [];
    for (const item of entries) {
      if (
        item &&
        typeof item.uid === 'string' &&
        typeof item.runId === 'string' &&
        typeof item.lapSeconds === 'number' &&
        typeof item.vehicleType === 'string' &&
        typeof item.serverSig === 'string'
      ) {
        const expected = signLeaderboardRecord(
          {
            uid: item.uid,
            runId: item.runId,
            lapSeconds: item.lapSeconds,
            vehicleType: item.vehicleType,
          },
          signingSecret,
        );
        if (timingSafeEqualHex(item.serverSig, expected)) {
          verifiedRunIds.push(item.runId);
        }
      }
    }
    res.json({ verifiedRunIds });
  });

  // 4. Validate, rate-limit, spam-filter, and sign a Whisper guestbook entry (max 30 chars)
  app.post(
    '/api/whispers/prepare',
    requireVerifiedFirebaseUser,
    (req: AuthedRequest, res: Response) => {
      const signingSecret = requireSigningSecret(res);
      if (!signingSecret) return;

      const uid = req.authUser!.uid;
      const rate = whisperLimiter.check(`wh:${uid}`, 5, 15 * 60_000, 20_000);
      if (!rate.allowed) {
        res.status(429).json({
          error: `Please wait ${rate.retryAfterSec}s before posting another Whisper.`,
        });
        return;
      }

      const body = (req.body || {}) as {
        authorName?: unknown;
        countryCode?: unknown;
        message?: unknown;
      };

      const check = validateAndSignWhisper(
        {
          uid,
          authorName: body.authorName,
          countryCode: body.countryCode,
          message: body.message,
        },
        signingSecret,
      );

      if (check.ok === false) {
        res.status(400).json({ error: check.error });
        return;
      }

      const nowMs = Date.now();
      if (recentWhispersByUid.size > 5000) {
        for (const [k, entry] of recentWhispersByUid.entries()) {
          if (nowMs - entry.atMs >= 15 * 60_000) recentWhispersByUid.delete(k);
          if (recentWhispersByUid.size <= 4000) break;
        }
        if (recentWhispersByUid.size > 5000) {
          const oldestUid = recentWhispersByUid.keys().next().value;
          if (oldestUid) recentWhispersByUid.delete(oldestUid);
        }
      }

      const prev = recentWhispersByUid.get(uid);
      if (prev && prev.message.toLowerCase() === check.message.toLowerCase() && nowMs - prev.atMs < 15 * 60_000) {
        res.status(429).json({ error: 'Duplicate message recently posted. Try writing something new.' });
        return;
      }
      recentWhispersByUid.set(uid, { message: check.message, atMs: nowMs });

      res.json({
        approved: true,
        payload: {
          id: check.id,
          authorUid: check.authorUid,
          authorName: check.authorName,
          countryCode: check.countryCode,
          message: check.message,
          status: 'published',
          reportCount: 0,
          serverSig: check.serverSig,
        },
      });
    },
  );

  // 5. AI Portfolio Guide status & Gemini chat endpoints (server-side only)
  app.get('/api/assistant/status', (_req: Request, res: Response) => {
    res.json({
      available: Boolean(geminiAi),
      model: ASSISTANT_MODEL,
    });
  });

  app.post('/api/assistant/chat', async (req: Request, res: Response) => {
    const parsed = validateAssistantRequest(req.body);
    if (parsed.ok === false) {
      res.status(400).json({ code: 'INVALID_REQUEST', error: parsed.error });
      return;
    }

    const rate = assistantLimiter.check(getClientKey(req, 'assistant'), 20, 60_000, 750);
    if (!rate.allowed) {
      res.status(429).json({
        code: 'AI_RATE_LIMITED',
        error: `Please wait ${rate.retryAfterSec}s before sending another question.`,
      });
      return;
    }

    if (!geminiAi) {
      res.status(503).json({
        code: 'AI_UNAVAILABLE',
        error:
          'The AI Portfolio Guide is currently offline because the Gemini API service is not configured. You can still drive the 3D world and inspect all portfolio pages.',
      });
      return;
    }

    const { message, history, currentRoute, currentZone } = parsed.data;
    const contextNote =
      currentRoute === '/'
        ? `[Visitor is currently exploring the 3D World near: ${currentZone}]`
        : `[Visitor is currently viewing portfolio page: ${currentRoute}]`;

    const contents: Content[] = [
      ...history.map((turn) => ({
        role: turn.role,
        parts: [{ text: turn.text }],
      })),
      {
        role: 'user',
        parts: [{ text: `${contextNote}\n${message}` }],
      },
    ];

    let lastError: unknown = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await geminiAi.models.generateContent({
          model: ASSISTANT_MODEL,
          contents,
          config: {
            systemInstruction: ASSISTANT_SYSTEM_INSTRUCTION,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });

        const reply = (response.text ?? '').trim();
        if (!reply) {
          throw new Error('Empty response returned from Gemini model.');
        }

        const suggestions = extractNavigationSuggestions(message, reply);
        res.json({
          reply,
          suggestions,
          model: ASSISTANT_MODEL,
        });
        return;
      } catch (err) {
        lastError = err;
        const classified = classifyGeminiApiError(err);
        console.error(
          '[Assistant Gemini Error]',
          classified.code,
          err instanceof Error ? err.message.slice(0, 240) : String(err).slice(0, 240),
        );
        if (classified.code === 'AI_KEY_INVALID' || attempt === 1) {
          res.status(classified.status).json({
            code: classified.code,
            error: classified.message,
          });
          return;
        }
        await new Promise((r) => setTimeout(r, 450));
      }
    }

    const fallbackErr = classifyGeminiApiError(lastError);
    res.status(fallbackErr.status).json({
      code: fallbackErr.code,
      error: fallbackErr.message,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Sanjaya's World server running on port ${port}`);
  });
}

startServer();
