import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type { VersionedSaveState } from '../state/saveValidation';
import type {
  AuthUserSummary,
  GhostSample,
  LeaderboardEntry,
  VehicleConfig,
  WhisperMessage,
  WhisperReportReason,
  WhisperStatus,
} from '../types/portfolio';
import {
  auth,
  db,
  FIREBASE_ADMIN_EMAIL,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './client';

export function toAuthUserSummary(user: User | null): AuthUserSummary | null {
  if (!user) return null;
  const isAdmin =
    Boolean(user.emailVerified) &&
    user.email?.toLowerCase() === FIREBASE_ADMIN_EMAIL.toLowerCase();
  return {
    uid: user.uid,
    displayName: (user.displayName || 'Explorer').slice(0, 32),
    photoURL: user.photoURL || null,
    emailVerified: Boolean(user.emailVerified),
    isAdmin,
  };
}

export function subscribeToAuth(cb: (user: User | null) => void): () => void {
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

export async function signInWithGoogle(): Promise<User | null> {
  if (!auth) throw new Error('Firebase Auth is not configured.');
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

export async function signOutFirebase(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

async function getBearerHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const user = auth?.currentUser;
  if (user) {
    const token = await user.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function clampStringList(list: string[], max: number): string[] {
  return Array.from(new Set(list.filter((s) => typeof s === 'string' && s.length > 0 && s.length <= 80))).slice(0, max);
}

function clampCloudDisplayName(name: string): string {
  const cleaned = name.replace(/\s+/g, ' ').trim();
  return (cleaned || 'Explorer').slice(0, 32);
}

export interface CloudUserSaveDoc {
  uid: string;
  displayName: string;
  vehicle: VehicleConfig;
  settings: VersionedSaveState['settings'];
  visitedLocations: string[];
  openedProjects: string[];
  collectedIds: string[];
  discoveredSecrets: string[];
  completedChallenges: string[];
  unlockedAchievements: string[];
  bestLapSeconds: number | null;
  lastLapSeconds: number | null;
  distanceDrivenMeters: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export function mergeCloudAndLocalSave(
  local: VersionedSaveState,
  cloud: Partial<CloudUserSaveDoc> | null,
  fallbackDisplayName: string,
): VersionedSaveState {
  if (!cloud) {
    return {
      ...local,
      displayName: clampCloudDisplayName(local.displayName || fallbackDisplayName),
    };
  }

  const union = (a: string[], b: unknown, max: number) =>
    clampStringList([...a, ...(Array.isArray(b) ? b.filter((x): x is string => typeof x === 'string') : [])], max);

  const cloudBest =
    typeof cloud.bestLapSeconds === 'number' && cloud.bestLapSeconds >= 12 && cloud.bestLapSeconds <= 600
      ? cloud.bestLapSeconds
      : null;
  const bestLapSeconds =
    local.bestLapSeconds !== null && cloudBest !== null
      ? Math.min(local.bestLapSeconds, cloudBest)
      : cloudBest ?? local.bestLapSeconds;

  const cloudLast =
    typeof cloud.lastLapSeconds === 'number' && cloud.lastLapSeconds >= 5 && cloud.lastLapSeconds <= 600
      ? cloud.lastLapSeconds
      : null;

  return {
    ...local,
    displayName: clampCloudDisplayName(
      typeof cloud.displayName === 'string' && cloud.displayName.trim()
        ? cloud.displayName
        : local.displayName || fallbackDisplayName,
    ),
    vehicle: cloud.vehicle ? { ...local.vehicle, ...cloud.vehicle } : local.vehicle,
    settings: cloud.settings
      ? {
          ...local.settings,
          ...cloud.settings,
          // Keep audio off by default on reload unless user explicitly toggled it in-session
          audioEnabled: local.settings.audioEnabled,
        }
      : local.settings,
    visitedLocations: union(local.visitedLocations, cloud.visitedLocations, 20),
    openedProjects: union(local.openedProjects, cloud.openedProjects, 30),
    collectedIds: union(local.collectedIds, cloud.collectedIds, 40),
    discoveredSecrets: union(local.discoveredSecrets, cloud.discoveredSecrets, 20),
    completedChallenges: union(local.completedChallenges, cloud.completedChallenges, 20),
    unlockedAchievements: union(local.unlockedAchievements, cloud.unlockedAchievements, 20),
    bestLapSeconds,
    lastLapSeconds: cloudLast ?? local.lastLapSeconds,
    distanceDrivenMeters: Math.max(
      local.distanceDrivenMeters,
      typeof cloud.distanceDrivenMeters === 'number' ? cloud.distanceDrivenMeters : 0,
    ),
  };
}

export async function loadCloudUserSave(uid: string): Promise<CloudUserSaveDoc | null> {
  if (!db) return null;
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as CloudUserSaveDoc) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveCloudUserSave(
  uid: string,
  state: VersionedSaveState,
  existsAlready: boolean,
): Promise<void> {
  if (!db) return;
  const path = `users/${uid}`;
  const validBest =
    state.bestLapSeconds !== null && state.bestLapSeconds >= 12 && state.bestLapSeconds <= 600
      ? Number(state.bestLapSeconds.toFixed(2))
      : null;
  const validLast =
    state.lastLapSeconds !== null && state.lastLapSeconds >= 5 && state.lastLapSeconds <= 600
      ? Number(state.lastLapSeconds.toFixed(2))
      : null;

  const basePayload = {
    uid,
    displayName: clampCloudDisplayName(state.displayName || 'Explorer'),
    vehicle: {
      chassisType: state.vehicle.chassisType,
      paintColor: state.vehicle.paintColor.slice(0, 16),
      accentColor: state.vehicle.accentColor.slice(0, 16),
      skinId: state.vehicle.skinId.slice(0, 32),
      wheelStyle: state.vehicle.wheelStyle,
      accessory: state.vehicle.accessory,
      headlightEffect: state.vehicle.headlightEffect,
      plateText: (state.vehicle.plateText || 'SANJAYA').slice(0, 8).toUpperCase(),
      engineTier: state.vehicle.engineTier,
      suspensionTier: state.vehicle.suspensionTier,
      boostTier: state.vehicle.boostTier,
    },
    settings: {
      quality: state.settings.quality,
      weatherMode: state.settings.weatherMode,
      audioEnabled: state.settings.audioEnabled,
      musicEnabled: state.settings.musicEnabled,
      sfxVolume: state.settings.sfxVolume,
      musicVolume: state.settings.musicVolume,
      cameraMode: state.settings.cameraMode,
      showTouchControls: state.settings.showTouchControls,
      ghostEnabled: state.settings.ghostEnabled,
      headlightsOn: state.settings.headlightsOn,
      reducedMotion: state.settings.reducedMotion,
    },
    visitedLocations: clampStringList(state.visitedLocations, 20),
    openedProjects: clampStringList(state.openedProjects, 30),
    collectedIds: clampStringList(state.collectedIds, 40),
    discoveredSecrets: clampStringList(state.discoveredSecrets, 20),
    completedChallenges: clampStringList(state.completedChallenges, 20),
    unlockedAchievements: clampStringList(state.unlockedAchievements, 20),
    bestLapSeconds: validBest,
    lastLapSeconds: validLast,
    distanceDrivenMeters: Math.max(0, Math.min(100_000_000, Math.round(state.distanceDrivenMeters))),
  };

  try {
    if (existsAlready) {
      await updateDoc(doc(db, 'users', uid), {
        ...basePayload,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'users', uid), {
        ...basePayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, existsAlready ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

// --- Global Verified Leaderboard ---

export async function startVerifiedRaceSession(vehicle: VehicleConfig): Promise<{
  runId: string;
  runToken: string;
} | null> {
  try {
    const headers = await getBearerHeaders();
    const res = await fetch('/api/race/start', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        chassisType: vehicle.chassisType,
        engineTier: vehicle.engineTier,
        boostTier: vehicle.boostTier,
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as { runId: string; runToken: string };
  } catch {
    return null;
  }
}

export async function verifyAndPublishLap(
  runToken: string,
  ghostFrames: GhostSample[],
  vehicle: VehicleConfig,
  driverName: string,
): Promise<{
  published: boolean;
  updatedExisting: boolean;
  entry?: LeaderboardEntry;
  reason?: string;
}> {
  const user = auth?.currentUser;
  if (!db || !user) {
    return { published: false, updatedExisting: false, reason: 'Sign in with Google to submit global records.' };
  }

  const headers = await getBearerHeaders();
  const res = await fetch('/api/race/verify', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      runToken,
      ghostFrames,
      driverName,
      chassisType: vehicle.chassisType,
      plateText: vehicle.plateText,
    }),
  });

  const data = (await res.json()) as {
    verified?: boolean;
    error?: string;
    record?: {
      uid: string;
      driverName: string;
      vehicleType: string;
      lapSeconds: number;
      runId: string;
      serverSig: string;
      status: 'verified';
    };
  };

  if (!res.ok || !data.verified || !data.record) {
    return { published: false, updatedExisting: false, reason: data.error || 'Lap verification failed.' };
  }

  const rec = data.record;
  const path = `leaderboard/${user.uid}`;
  let existingLap: number | null = null;
  try {
    const existingSnap = await getDoc(doc(db, 'leaderboard', user.uid));
    if (existingSnap.exists()) {
      existingLap = (existingSnap.data() as { lapSeconds?: number }).lapSeconds ?? null;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (existingLap !== null && rec.lapSeconds >= existingLap) {
    return {
      published: false,
      updatedExisting: false,
      reason: `Verified ${rec.lapSeconds.toFixed(2)}s did not beat your global PB (${existingLap.toFixed(2)}s).`,
    };
  }

  try {
    if (existingLap !== null) {
      await updateDoc(doc(db, 'leaderboard', user.uid), {
        driverName: rec.driverName,
        vehicleType: rec.vehicleType,
        lapSeconds: rec.lapSeconds,
        runId: rec.runId,
        serverSig: rec.serverSig,
        achievedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'leaderboard', user.uid), {
        uid: user.uid,
        driverName: rec.driverName,
        vehicleType: rec.vehicleType,
        lapSeconds: rec.lapSeconds,
        runId: rec.runId,
        serverSig: rec.serverSig,
        status: 'verified',
        achievedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, existingLap !== null ? OperationType.UPDATE : OperationType.CREATE, path);
  }

  return {
    published: true,
    updatedExisting: existingLap !== null,
    entry: {
      id: user.uid,
      uid: user.uid,
      driver: rec.driverName,
      vehicle: rec.vehicleType,
      lapSeconds: rec.lapSeconds,
      recordedAt: new Date().toISOString().slice(0, 10),
      runId: rec.runId,
      serverVerified: true,
      isPlayer: true,
    },
  };
}

function formatFsDate(ts: unknown): string {
  if (ts instanceof Timestamp) {
    return ts.toDate().toISOString().slice(0, 10);
  }
  if (ts && typeof (ts as { toDate?: () => Date }).toDate === 'function') {
    return (ts as { toDate: () => Date }).toDate().toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

function fsTimestampMs(ts: unknown): number {
  if (ts instanceof Timestamp) return ts.toMillis();
  if (ts && typeof (ts as { toMillis?: () => number }).toMillis === 'function') {
    return (ts as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

export async function fetchGlobalLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!db) return [];
  const path = 'leaderboard';
  try {
    const q = query(
      collection(db, 'leaderboard'),
      where('status', '==', 'verified'),
      limit(100),
    );
    const snap = await getDocs(q);
    const rawDocs = snap.docs.map((d) => ({
      docId: d.id,
      ...(d.data() as {
        uid: string;
        driverName: string;
        vehicleType: string;
        lapSeconds: number;
        runId: string;
        serverSig: string;
        achievedAt: unknown;
      }),
    }));

    // Check active server HMAC signatures when server is in same session
    let sigMatches = new Set<string>();
    try {
      const checkRes = await fetch('/api/leaderboard/check-signatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: rawDocs.map((r) => ({
            uid: r.uid,
            runId: r.runId,
            lapSeconds: r.lapSeconds,
            vehicleType: r.vehicleType,
            serverSig: r.serverSig,
          })),
        }),
      });
      if (checkRes.ok) {
        const json = (await checkRes.json()) as { verifiedRunIds?: string[] };
        sigMatches = new Set(json.verifiedRunIds || []);
      }
    } catch {
      // Non-fatal; Firestore rules already required 64-hex serverSig
    }

    const currentUid = auth?.currentUser?.uid;
    return rawDocs
      .map((r) => ({
        id: r.docId,
        uid: r.uid,
        driver: r.driverName,
        vehicle: r.vehicleType,
        lapSeconds: r.lapSeconds,
        recordedAt: formatFsDate(r.achievedAt),
        runId: r.runId,
        serverVerified: sigMatches.has(r.runId) || /^[a-f0-9]{64}$/.test(r.serverSig),
        isPlayer: Boolean(currentUid && r.uid === currentUid),
      }))
      .sort((a, b) => a.lapSeconds - b.lapSeconds);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// --- Moderated Whispers Guestbook ---

function docToWhisper(id: string, d: Record<string, unknown>): WhisperMessage {
  return {
    id,
    authorUid: String(d.authorUid || ''),
    author: String(d.authorName || 'Visitor'),
    countryCode: String(d.countryCode || 'GL'),
    message: String(d.message || ''),
    status: (d.status as WhisperStatus) || 'published',
    reportCount: typeof d.reportCount === 'number' ? d.reportCount : 0,
    createdAt: formatFsDate(d.createdAt),
    createdAtMs: fsTimestampMs(d.createdAt),
    serverVerified: /^[a-f0-9]{64}$/.test(String(d.serverSig || '')),
  };
}

export function subscribePublishedWhispers(
  onMessages: (items: WhisperMessage[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  if (!db) {
    onMessages([]);
    return () => {};
  }
  const path = 'whispers';
  const q = query(collection(db, 'whispers'), where('status', '==', 'published'), limit(100));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => docToWhisper(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
      onMessages(list);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );
}

export async function fetchModerationWhispers(): Promise<WhisperMessage[]> {
  if (!db) return [];
  const path = 'whispers';
  try {
    const q = query(
      collection(db, 'whispers'),
      where('status', 'in', ['flagged', 'removed', 'published']),
      limit(100),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => docToWhisper(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function submitVerifiedWhisper(
  authorName: string,
  countryCode: string,
  message: string,
): Promise<WhisperMessage> {
  const user = auth?.currentUser;
  if (!db || !user) {
    throw new Error('Please sign in with Google to publish a Whisper.');
  }

  const headers = await getBearerHeaders();
  const res = await fetch('/api/whispers/prepare', {
    method: 'POST',
    headers,
    body: JSON.stringify({ authorName, countryCode, message }),
  });

  const data = (await res.json()) as {
    approved?: boolean;
    error?: string;
    payload?: {
      id: string;
      authorUid: string;
      authorName: string;
      countryCode: string;
      message: string;
      status: 'published';
      reportCount: number;
      serverSig: string;
    };
  };

  if (!res.ok || !data.approved || !data.payload) {
    throw new Error(data.error || 'Whisper message rejected by moderation filter.');
  }

  const p = data.payload;
  const path = `whispers/${p.id}`;
  try {
    await setDoc(doc(db, 'whispers', p.id), {
      ...p,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return {
    id: p.id,
    authorUid: p.authorUid,
    author: p.authorName,
    countryCode: p.countryCode,
    message: p.message,
    status: 'published',
    reportCount: 0,
    createdAt: new Date().toISOString().slice(0, 10),
    createdAtMs: Date.now(),
    serverVerified: true,
  };
}

export async function reportWhisperMessage(
  whisper: WhisperMessage,
  reason: WhisperReportReason,
): Promise<void> {
  const user = auth?.currentUser;
  if (!db || !user) {
    throw new Error('Please sign in with Google to report a message.');
  }
  const path = `whispers/${whisper.id}/reports/${user.uid}`;
  const batch = writeBatch(db);
  const reportRef = doc(db, 'whispers', whisper.id, 'reports', user.uid);
  const whisperRef = doc(db, 'whispers', whisper.id);
  const nextCount = whisper.reportCount + 1;
  const nextStatus: WhisperStatus = nextCount >= 3 ? 'flagged' : whisper.status;

  batch.set(reportRef, {
    whisperId: whisper.id,
    reporterUid: user.uid,
    reason,
    createdAt: serverTimestamp(),
  });
  batch.update(whisperRef, {
    reportCount: nextCount,
    status: nextStatus,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function moderateWhisperStatus(
  whisperId: string,
  nextStatus: WhisperStatus,
): Promise<void> {
  if (!db) return;
  const path = `whispers/${whisperId}`;
  try {
    await updateDoc(doc(db, 'whispers', whisperId), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteWhisperEntry(whisperId: string): Promise<void> {
  if (!db) return;
  const path = `whispers/${whisperId}`;
  try {
    await deleteDoc(doc(db, 'whispers', whisperId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
