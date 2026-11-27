import { INITIAL_LEADERBOARD, INITIAL_WHISPERS } from '../data/portfolioData';
import type {
  ChallengeBests,
  GameSettings,
  GhostSample,
  LeaderboardEntry,
  VehicleConfig,
  VehicleRimStyle,
  WhisperMessage,
} from '../types/portfolio';

export const SAVE_VERSION = 3;

export interface VersionedSaveState {
  version: number;
  displayName: string;
  settings: GameSettings;
  vehicle: VehicleConfig;
  visitedLocations: string[];
  openedProjects: string[];
  collectedIds: string[];
  discoveredSecrets: string[];
  completedChallenges: string[];
  unlockedAchievements: string[];
  bestLapSeconds: number | null;
  lastLapSeconds: number | null;
  bestLapGhost: GhostSample[];
  leaderboard: LeaderboardEntry[];
  whispers: WhisperMessage[];
  distanceDrivenMeters: number;
  challengeBests: ChallengeBests;
}

export const DEFAULT_CHALLENGE_BESTS: ChallengeBests = {
  bestDriftScore: 0,
  bestStuntScore: 0,
  bestLagoonRunSeconds: null,
  bestDoubleJumpSeconds: null,
  bestParkingScore: 0,
  bestForestTrailSeconds: null,
};

export const DEFAULT_SETTINGS: GameSettings = {
  quality: 'high',
  weatherMode: 'sunny',
  windMode: 'auto',
  audioEnabled: false,
  musicEnabled: true,
  sfxVolume: 0.8,
  musicVolume: 0.45,
  cameraMode: 'chase',
  showTouchControls: 'auto',
  ghostEnabled: true,
  headlightsOn: true,
  reducedMotion: false,
};

export const DEFAULT_VEHICLE: VehicleConfig = {
  chassisType: 'buggy',
  paintColor: '#F27D3B',
  accentColor: '#2BA89C',
  skinId: 'terracotta',
  wheelStyle: 'all-terrain',
  rimStyle: 'classic-5spoke',
  accessory: 'spare-tire',
  headlightEffect: 'warm-halogen',
  plateText: 'SANJAYA',
  engineTier: 1,
  suspensionTier: 1,
  boostTier: 1,
};

export function createInitialSaveState(): VersionedSaveState {
  return {
    version: SAVE_VERSION,
    displayName: 'Explorer',
    settings: { ...DEFAULT_SETTINGS },
    vehicle: { ...DEFAULT_VEHICLE },
    visitedLocations: [],
    openedProjects: [],
    collectedIds: [],
    discoveredSecrets: [],
    completedChallenges: [],
    unlockedAchievements: [],
    bestLapSeconds: null,
    lastLapSeconds: null,
    bestLapGhost: [],
    leaderboard: [...INITIAL_LEADERBOARD],
    whispers: [...INITIAL_WHISPERS],
    distanceDrivenMeters: 0,
    challengeBests: { ...DEFAULT_CHALLENGE_BESTS },
  };
}

function asStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return Array.from(new Set(val.filter((item): item is string => typeof item === 'string' && item.length > 0)));
}

function sanitizeTier(val: unknown): 1 | 2 | 3 {
  if (val === 2 || val === 3) return val;
  return 1;
}

function sanitizeRimStyle(val: unknown): VehicleRimStyle {
  if (val === 'classic-5spoke' || val === 'offroad-beadlock' || val === 'aero-mesh' || val === 'turbo-fan') {
    return val;
  }
  return 'classic-5spoke';
}

function sanitizeScoreInt(val: unknown): number {
  if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
    return Math.min(1_000_000, Math.round(val));
  }
  return 0;
}

function sanitizePositiveSec(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val) && val > 0 && val <= 3600) {
    return Number(val.toFixed(2));
  }
  return null;
}

function sanitizeGhost(val: unknown): GhostSample[] {
  if (!Array.isArray(val)) return [];
  const out: GhostSample[] = [];
  for (const item of val) {
    if (
      item &&
      typeof item === 'object' &&
      typeof (item as GhostSample).t === 'number' &&
      typeof (item as GhostSample).x === 'number' &&
      typeof (item as GhostSample).y === 'number' &&
      typeof (item as GhostSample).z === 'number' &&
      typeof (item as GhostSample).yaw === 'number' &&
      Number.isFinite((item as GhostSample).t) &&
      Number.isFinite((item as GhostSample).x) &&
      Number.isFinite((item as GhostSample).z)
    ) {
      out.push(item as GhostSample);
    }
    if (out.length >= 1200) break;
  }
  return out;
}

function sanitizeLeaderboard(val: unknown): LeaderboardEntry[] {
  if (!Array.isArray(val)) return [];
  return val
    .filter(
      (e): e is LeaderboardEntry =>
        Boolean(e) &&
        typeof e === 'object' &&
        typeof (e as LeaderboardEntry).id === 'string' &&
        typeof (e as LeaderboardEntry).driver === 'string' &&
        typeof (e as LeaderboardEntry).lapSeconds === 'number' &&
        Number.isFinite((e as LeaderboardEntry).lapSeconds),
    )
    .slice(0, 15);
}

/**
 * Safely parses and validates any JSON string into a normalized VersionedSaveState.
 * Never throws on malformed, missing, outdated, or partial data.
 */
export function parseVersionedSave(raw: string | null | undefined): VersionedSaveState {
  const base = createInitialSaveState();
  if (!raw || typeof raw !== 'string') return base;

  try {
    const parsed = JSON.parse(raw) as Partial<VersionedSaveState> | null;
    if (!parsed || typeof parsed !== 'object') return base;

    const rawSettings = (parsed.settings && typeof parsed.settings === 'object'
      ? parsed.settings
      : {}) as Partial<GameSettings>;
    const validQuality =
      rawSettings.quality === 'low' || rawSettings.quality === 'medium' || rawSettings.quality === 'high'
        ? rawSettings.quality
        : base.settings.quality;
    const validWeather =
      rawSettings.weatherMode === 'sunny' ||
      rawSettings.weatherMode === 'sunset' ||
      rawSettings.weatherMode === 'night' ||
      rawSettings.weatherMode === 'rain' ||
      rawSettings.weatherMode === 'fog'
        ? rawSettings.weatherMode
        : base.settings.weatherMode;
    const validWind =
      rawSettings.windMode === 'auto' ||
      rawSettings.windMode === 'calm' ||
      rawSettings.windMode === 'normal' ||
      rawSettings.windMode === 'strong'
        ? rawSettings.windMode
        : base.settings.windMode;
    const validCamera =
      rawSettings.cameraMode === 'chase' ||
      rawSettings.cameraMode === 'close' ||
      rawSettings.cameraMode === 'far' ||
      rawSettings.cameraMode === 'topdown' ||
      rawSettings.cameraMode === 'orbit'
        ? rawSettings.cameraMode
        : base.settings.cameraMode;
    const validTouch =
      rawSettings.showTouchControls === 'auto' ||
      rawSettings.showTouchControls === 'always' ||
      rawSettings.showTouchControls === 'off'
        ? rawSettings.showTouchControls
        : base.settings.showTouchControls;

    const rawVehicle = (parsed.vehicle && typeof parsed.vehicle === 'object'
      ? parsed.vehicle
      : {}) as Partial<VehicleConfig>;

    const validChassis =
      rawVehicle.chassisType === 'buggy' || rawVehicle.chassisType === 'rover' || rawVehicle.chassisType === 'rally'
        ? rawVehicle.chassisType
        : base.vehicle.chassisType;
    const validWheel =
      rawVehicle.wheelStyle === 'all-terrain' || rawVehicle.wheelStyle === 'sport' || rawVehicle.wheelStyle === 'dune'
        ? rawVehicle.wheelStyle
        : base.vehicle.wheelStyle;
    const validAcc =
      rawVehicle.accessory === 'none' ||
      rawVehicle.accessory === 'spare-tire' ||
      rawVehicle.accessory === 'roof-lights' ||
      rawVehicle.accessory === 'cargo-box' ||
      rawVehicle.accessory === 'spoiler' ||
      rawVehicle.accessory === 'trail-expedition-rack'
        ? rawVehicle.accessory
        : base.vehicle.accessory;
    const validHl =
      rawVehicle.headlightEffect === 'warm-halogen' ||
      rawVehicle.headlightEffect === 'cool-led' ||
      rawVehicle.headlightEffect === 'amber-rally'
        ? rawVehicle.headlightEffect
        : base.vehicle.headlightEffect;

    const rawBests = (parsed.challengeBests && typeof parsed.challengeBests === 'object'
      ? parsed.challengeBests
      : {}) as Partial<ChallengeBests>;

    const clampVol = (v: unknown, fallback: number): number =>
      typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;

    return {
      version: SAVE_VERSION,
      displayName:
        typeof parsed.displayName === 'string' && parsed.displayName.trim()
          ? parsed.displayName.trim().slice(0, 32)
          : base.displayName,
      settings: {
        quality: validQuality,
        weatherMode: validWeather,
        windMode: validWind,
        audioEnabled: typeof rawSettings.audioEnabled === 'boolean' ? rawSettings.audioEnabled : base.settings.audioEnabled,
        musicEnabled: typeof rawSettings.musicEnabled === 'boolean' ? rawSettings.musicEnabled : base.settings.musicEnabled,
        sfxVolume: clampVol(rawSettings.sfxVolume, base.settings.sfxVolume),
        musicVolume: clampVol(rawSettings.musicVolume, base.settings.musicVolume),
        cameraMode: validCamera,
        showTouchControls: validTouch,
        ghostEnabled: typeof rawSettings.ghostEnabled === 'boolean' ? rawSettings.ghostEnabled : base.settings.ghostEnabled,
        headlightsOn: typeof rawSettings.headlightsOn === 'boolean' ? rawSettings.headlightsOn : base.settings.headlightsOn,
        reducedMotion: typeof rawSettings.reducedMotion === 'boolean' ? rawSettings.reducedMotion : base.settings.reducedMotion,
      },
      vehicle: {
        chassisType: validChassis,
        paintColor: typeof rawVehicle.paintColor === 'string' && rawVehicle.paintColor.startsWith('#') ? rawVehicle.paintColor : base.vehicle.paintColor,
        accentColor: typeof rawVehicle.accentColor === 'string' && rawVehicle.accentColor.startsWith('#') ? rawVehicle.accentColor : base.vehicle.accentColor,
        skinId: typeof rawVehicle.skinId === 'string' ? rawVehicle.skinId : base.vehicle.skinId,
        wheelStyle: validWheel,
        rimStyle: sanitizeRimStyle(rawVehicle.rimStyle),
        accessory: validAcc,
        headlightEffect: validHl,
        plateText: typeof rawVehicle.plateText === 'string' && rawVehicle.plateText.trim() ? rawVehicle.plateText.slice(0, 8).toUpperCase() : base.vehicle.plateText,
        engineTier: sanitizeTier(rawVehicle.engineTier),
        suspensionTier: sanitizeTier(rawVehicle.suspensionTier),
        boostTier: sanitizeTier(rawVehicle.boostTier),
      },
      visitedLocations: asStringArray(parsed.visitedLocations),
      openedProjects: asStringArray(parsed.openedProjects),
      collectedIds: asStringArray(parsed.collectedIds),
      discoveredSecrets: asStringArray(parsed.discoveredSecrets),
      completedChallenges: asStringArray(parsed.completedChallenges),
      unlockedAchievements: asStringArray(parsed.unlockedAchievements),
      bestLapSeconds:
        typeof parsed.bestLapSeconds === 'number' && Number.isFinite(parsed.bestLapSeconds) && parsed.bestLapSeconds > 0
          ? parsed.bestLapSeconds
          : null,
      lastLapSeconds:
        typeof parsed.lastLapSeconds === 'number' && Number.isFinite(parsed.lastLapSeconds) && parsed.lastLapSeconds > 0
          ? parsed.lastLapSeconds
          : null,
      bestLapGhost: sanitizeGhost(parsed.bestLapGhost),
      leaderboard: sanitizeLeaderboard(parsed.leaderboard),
      whispers: [],
      distanceDrivenMeters:
        typeof parsed.distanceDrivenMeters === 'number' && Number.isFinite(parsed.distanceDrivenMeters)
          ? Math.max(0, Math.round(parsed.distanceDrivenMeters))
          : 0,
      challengeBests: {
        bestDriftScore: sanitizeScoreInt(rawBests.bestDriftScore),
        bestStuntScore: sanitizeScoreInt(rawBests.bestStuntScore),
        bestLagoonRunSeconds: sanitizePositiveSec(rawBests.bestLagoonRunSeconds),
        bestDoubleJumpSeconds: sanitizePositiveSec(rawBests.bestDoubleJumpSeconds),
        bestParkingScore: sanitizeScoreInt(rawBests.bestParkingScore),
        bestForestTrailSeconds: sanitizePositiveSec(rawBests.bestForestTrailSeconds),
      },
    };
  } catch {
    return base;
  }
}
