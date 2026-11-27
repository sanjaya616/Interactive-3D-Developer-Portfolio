import type { QualityLevel, WeatherMode } from '../types/portfolio';

export const WATER_BASE_Y = -0.35;

export const EMERALD_LAGOON_BOUNDS = {
  centerX: 45,
  centerZ: -22,
  halfX: 29.0,
  halfZ: 8.0,
  cornerRadius: 3.2,
  maxDepthMeters: 7.5,
} as const;

export const SOUTH_COVE_BOUNDS = {
  centerX: -18,
  centerZ: 66,
  radius: 12.35,
} as const;

export const AMPHIBIOUS_LAGOON_BOUNDS = {
  centerX: -36,
  centerZ: 118,
  radius: 22.0,
} as const;

export const MOORED_BOAT_ANCHOR = {
  x: 60,
  z: -20.5,
  baseYaw: 0.4,
  draftOffset: 0.08,
} as const;

export interface WaveOctave {
  dirX: number;
  dirZ: number;
  freq: number;
  speed: number;
  amp: number;
}

export const WATER_WAVE_OCTAVES: readonly WaveOctave[] = [
  { dirX: 0.86, dirZ: 0.51, freq: 0.36, speed: 1.65, amp: 0.062 },
  { dirX: -0.55, dirZ: 0.835, freq: 0.58, speed: 2.15, amp: 0.038 },
  { dirX: 0.34, dirZ: -0.94, freq: 0.95, speed: 2.75, amp: 0.022 },
  { dirX: -0.92, dirZ: -0.39, freq: 1.55, speed: 3.45, amp: 0.011 },
] as const;

export function getWeatherWaveScale(weather: WeatherMode): number {
  switch (weather) {
    case 'rain':
      return 1.24;
    case 'sunset':
      return 0.92;
    case 'night':
      return 0.82;
    case 'fog':
      return 0.72;
    default:
      return 1.0;
  }
}

export function getQualityOctaveCount(quality: QualityLevel): number {
  if (quality === 'low') return 2;
  if (quality === 'medium') return 3;
  return 4;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * Signed distance inside water shoreline (in meters; 0 at shoreline edge, >0 offshore).
 * Matches the analytical SDF inside the GLSL water shader.
 */
export function computeWaterShoreDepth(x: number, z: number): number {
  if (z < 15) {
    const qx = Math.abs(x - EMERALD_LAGOON_BOUNDS.centerX) - (EMERALD_LAGOON_BOUNDS.halfX - EMERALD_LAGOON_BOUNDS.cornerRadius);
    const qz = Math.abs(z - EMERALD_LAGOON_BOUNDS.centerZ) - (EMERALD_LAGOON_BOUNDS.halfZ - EMERALD_LAGOON_BOUNDS.cornerRadius);
    const outDist = Math.hypot(Math.max(qx, 0), Math.max(qz, 0));
    const inDist = Math.min(Math.max(qx, qz), 0);
    const sdf = outDist + inDist - EMERALD_LAGOON_BOUNDS.cornerRadius;
    return Math.max(0, -sdf);
  }
  const distCove = Math.hypot(x - SOUTH_COVE_BOUNDS.centerX, z - SOUTH_COVE_BOUNDS.centerZ);
  const coveShore = Math.max(0, SOUTH_COVE_BOUNDS.radius - distCove);
  const distAmph = Math.hypot(x - AMPHIBIOUS_LAGOON_BOUNDS.centerX, z - AMPHIBIOUS_LAGOON_BOUNDS.centerZ);
  const amphShore = Math.max(0, AMPHIBIOUS_LAGOON_BOUNDS.radius - distAmph);
  return Math.max(coveShore, amphShore);
}

export interface WaterSurfaceSample {
  worldY: number;
  displacement: number;
  dhdx: number;
  dhdz: number;
  shoreDepth: number;
}

/**
 * Evaluates the exact same multi-directional wave height and surface slope as the GLSL vertex shader.
 * Optionally reuses `out` to guarantee zero heap allocations inside frame loops.
 */
export function sampleWaterSurface(
  x: number,
  z: number,
  time: number,
  weather: WeatherMode = 'sunny',
  quality: QualityLevel = 'high',
  out?: WaterSurfaceSample,
): WaterSurfaceSample {
  const target: WaterSurfaceSample = out ?? {
    worldY: WATER_BASE_Y,
    displacement: 0,
    dhdx: 0,
    dhdz: 0,
    shoreDepth: 0,
  };

  const shoreDepth = computeWaterShoreDepth(x, z);
  const coastalDamp = 0.22 + 0.78 * smoothstep(0, 1.8, shoreDepth);
  const ampScale = getWeatherWaveScale(weather) * coastalDamp;
  const octaves = getQualityOctaveCount(quality);

  let h = 0;
  let dhdx = 0;
  let dhdz = 0;

  for (let i = 0; i < octaves; i++) {
    const w = WATER_WAVE_OCTAVES[i];
    const phase = (x * w.dirX + z * w.dirZ) * w.freq + time * w.speed;
    const amp = w.amp * ampScale;
    const s = Math.sin(phase);
    const c = Math.cos(phase);
    h += s * amp;
    dhdx += c * amp * w.freq * w.dirX;
    dhdz += c * amp * w.freq * w.dirZ;
  }

  target.displacement = h;
  target.worldY = WATER_BASE_Y + h;
  target.dhdx = dhdx;
  target.dhdz = dhdz;
  target.shoreDepth = shoreDepth;
  return target;
}

export interface FloatingBodyPose {
  y: number;
  pitchX: number;
  rollZ: number;
  yawOffset: number;
}

/**
 * Computes synchronized floating boat Y height and hull tilt along a yawed heading
 * from the underlying wave heightfield gradients.
 */
export function computeFloatingBoatPose(
  x: number,
  z: number,
  baseYaw: number,
  draftOffset: number,
  time: number,
  weather: WeatherMode,
  quality: QualityLevel,
  sampleScratch?: WaterSurfaceSample,
  out?: FloatingBodyPose,
): FloatingBodyPose {
  const sample = sampleWaterSurface(x, z, time, weather, quality, sampleScratch);
  const target: FloatingBodyPose = out ?? {
    y: WATER_BASE_Y,
    pitchX: 0,
    rollZ: 0,
    yawOffset: 0,
  };

  const yawOffset = Math.sin(time * 0.55) * 0.035;
  const yaw = baseYaw + yawOffset;
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);

  // Project world wave gradient onto boat local right (+X) and aft (+Z) axes
  const slopeLocalX = sample.dhdx * cosY - sample.dhdz * sinY;
  const slopeLocalZ = sample.dhdx * sinY + sample.dhdz * cosY;

  target.y = sample.worldY + draftOffset;
  target.pitchX = -Math.atan(slopeLocalZ) * 0.85;
  target.rollZ = Math.atan(slopeLocalX) * 0.85;
  target.yawOffset = yawOffset;
  return target;
}
