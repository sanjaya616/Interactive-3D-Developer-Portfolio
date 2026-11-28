import {
  BUG_HUNT_TARGETS,
  MEMORY_PADS,
  SECRET_LOCATIONS,
  SQL_CHALLENGE_GATES,
  TIME_TRIAL_CHECKPOINTS,
  TREASURE_CHESTS,
  WORLD_COLLECTIBLES,
  WORLD_LANDMARKS,
} from '../data/portfolioData';
import type { WeatherMode, WindMode } from '../types/portfolio';
import { computeBridgeSurfaceY, computeGroundHeight } from './physicsMath';
import {
  AMPHIBIOUS_LAGOON_BOUNDS,
  EMERALD_LAGOON_BOUNDS,
  SOUTH_COVE_BOUNDS,
  computeWaterShoreDepth,
} from './waterWaveMath';
import {
  BUILDING_FOOTPRINTS,
  DIRECTIONAL_SIGNS,
  PADDOCK_CENTER,
  ROAD_SEGMENTS,
  WEST_RIDGE_TUNNEL_DEF,
  WORLD_HALF_SPAN,
  distanceToRoadEdge,
  pointToOrientedRectDistance,
} from './worldLayout';
import { FOREST_BROOK_BRIDGE } from './physicsMath';
import {
  DRIFT_CIRCUIT_CHECKPOINTS,
  FOREST_TRAIL_GATES,
  LAGOON_RUN_CHECKPOINTS,
  PRECISION_PARKING_BAYS,
  STUNT_ARENA_RAMPS,
  DOUBLE_JUMP_PLATFORMS,
} from '../data/portfolioData';

export type VegetationSpecies =
  | 'pine'
  | 'palm'
  | 'broadleaf'
  | 'decorative'
  | 'shoreline'
  | 'shrub'
  | 'groundplant'
  | 'grass'
  | 'flower';

export interface VegetationPlacement {
  species: VegetationSpecies;
  x: number;
  y: number;
  z: number;
  scale: number;
  yaw: number;
  windPhase: number;
  windAmp: number;
  leanX: number;
  leanZ: number;
  colorHex: string;
  secondaryHex?: string;
}

export interface StaticTreeCollider {
  x: number;
  y: number;
  z: number;
  hx: number;
  hy: number;
  hz: number;
}

export interface WorldVegetationLayout {
  pines: VegetationPlacement[];
  palms: VegetationPlacement[];
  broadleafs: VegetationPlacement[];
  decoratives: VegetationPlacement[];
  shorelines: VegetationPlacement[];
  shrubs: VegetationPlacement[];
  groundPlants: VegetationPlacement[];
  grass: VegetationPlacement[];
  flowers: VegetationPlacement[];
  staticColliders: StaticTreeCollider[];
}

export interface WindBehaviorProfile {
  tier: 'calm' | 'normal' | 'strong';
  speedMultiplier: number;
  gustStrength: number;
  gustFrequency: number;
  trunkAmp: number;
  canopyAmp: number;
  frondAmp: number;
  grassAmp: number;
  flowerAmp: number;
}

export function resolveWindProfile(
  weather: WeatherMode,
  windMode: WindMode = 'auto',
): WindBehaviorProfile {
  let tier: 'calm' | 'normal' | 'strong';
  if (windMode === 'calm' || windMode === 'normal' || windMode === 'strong') {
    tier = windMode;
  } else if (weather === 'rain') {
    tier = 'strong';
  } else if (weather === 'fog' || weather === 'night') {
    tier = 'calm';
  } else {
    tier = 'normal';
  }

  if (tier === 'calm') {
    return {
      tier,
      speedMultiplier: 0.62,
      gustStrength: 0.34,
      gustFrequency: 0.78,
      trunkAmp: 0.016,
      canopyAmp: 0.042,
      frondAmp: 0.085,
      grassAmp: 0.072,
      flowerAmp: 0.056,
    };
  }
  if (tier === 'strong') {
    return {
      tier,
      speedMultiplier: 1.52,
      gustStrength: 1.0,
      gustFrequency: 1.38,
      trunkAmp: 0.062,
      canopyAmp: 0.148,
      frondAmp: 0.255,
      grassAmp: 0.235,
      flowerAmp: 0.175,
    };
  }
  return {
    tier,
    speedMultiplier: 1.0,
    gustStrength: 0.64,
    gustFrequency: 1.0,
    trunkAmp: 0.034,
    canopyAmp: 0.088,
    frondAmp: 0.16,
    grassAmp: 0.142,
    flowerAmp: 0.108,
  };
}

const ROAD_SPOKE_SEGMENTS: readonly [number, number, number, number, number][] = ROAD_SEGMENTS.map(
  (seg) => [
    seg.x1,
    seg.z1,
    seg.x2,
    seg.z2,
    seg.width * 0.5 + (seg.surface === 'gravel' ? 0.52 : 0.42),
  ],
);

const EXTRA_PROP_EXCLUSIONS: readonly [number, number, number][] = [
  // Lighthouse, RFID keycard, security gate exit, relocated dynamic crates, and calibrated directional signs
  [73, -26, 4.8],
  [54, 42, 4.2],
  [48, 55, 4.5],
  [-16.8, -4.2, 2.8],
  [16.2, -4.8, 2.8],
  [-43.8, 44.6, 2.8],
  ...DIRECTIONAL_SIGNS.map((sd): [number, number, number] => [sd.x, sd.z, sd.boundingRadius + 1.0]),
];

const LANDMARK_BUILDING_FOOTPRINTS = BUILDING_FOOTPRINTS.map((bp) => ({
  ax: bp.padX,
  az: bp.padZ,
  bx: bp.buildX,
  bz: bp.buildZ,
}));

export function distToSegment(
  px: number,
  pz: number,
  x1: number,
  z1: number,
  x2: number,
  z2: number,
): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  if (lenSq <= 1e-6) return Math.hypot(px - x1, pz - z1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / lenSq));
  return Math.hypot(px - (x1 + t * dx), pz - (z1 + t * dz));
}

export interface ClearCheckOptions {
  allowShoreline?: boolean;
  isTreeOrShrub?: boolean;
}

/**
 * Returns true if (x, z) is safe for placing vegetation with radius `extraRadius`,
 * keeping roads, plazas, bridge decks, tunnel portals, water basins, buildings,
 * collectibles, and challenge gates completely unobstructed.
 */
export function isClearForVegetation(
  x: number,
  z: number,
  extraRadius = 0.8,
  options: ClearCheckOptions = {},
): boolean {
  const distOrigin = Math.hypot(x, z);
  if (Math.abs(x) > WORLD_HALF_SPAN - 2 || Math.abs(z) > WORLD_HALF_SPAN - 2 || distOrigin < 15.0 + extraRadius) {
    return false;
  }

  // Inner Ring Road (r = 34)
  if (Math.abs(distOrigin - 34) < 3.15 + extraRadius) return false;

  // Paddock Racing Circuit & Start/Finish oval around PADDOCK_CENTER
  const distPaddock = Math.hypot(x - PADDOCK_CENTER.x, z - PADDOCK_CENTER.z);
  if (Math.abs(distPaddock - PADDOCK_CENTER.radius) < 3.35 + extraRadius) return false;
  if (options.isTreeOrShrub && distPaddock < 22.6 + extraRadius) return false;

  // Emerald Lagoon Bridge + North/South approach wingwalls + South Cove Footbridge + Forest Brook Bridge
  if (Math.abs(x - 40) < 5.0 + extraRadius && z >= -34.5 && z <= -9.5) return false;
  if (Math.abs(z - 62) < 2.6 + extraRadius && x >= -32 && x <= -4) return false;
  if (Math.abs(z - FOREST_BROOK_BRIDGE.z) < 2.6 + extraRadius && x >= -113 && x <= -95) return false;
  if (computeBridgeSurfaceY(x, z) !== null) return false;
  // Lookout Hill ramp guardrails
  if (Math.abs(x) < 3.8 + extraRadius && z >= -60.5 && z <= -37.5) return false;

  // West Ridge Vaulted Tunnel & portals (oriented along Paddock approach spoke)
  if (
    pointToOrientedRectDistance(
      x,
      z,
      WEST_RIDGE_TUNNEL_DEF.centerX,
      WEST_RIDGE_TUNNEL_DEF.centerZ,
      WEST_RIDGE_TUNNEL_DEF.outerHalfWidth + 1.1,
      WEST_RIDGE_TUNNEL_DEF.halfLength + 2.2,
      WEST_RIDGE_TUNNEL_DEF.yaw,
    ) < extraRadius
  ) {
    return false;
  }

  // Road spokes, ramp, and Hidden Pine / Forest Trail
  for (let i = 0; i < ROAD_SPOKE_SEGMENTS.length; i++) {
    const [x1, z1, x2, z2, halfW] = ROAD_SPOKE_SEGMENTS[i];
    if (distToSegment(x, z, x1, z1, x2, z2) < halfW + extraRadius) return false;
  }

  // Water basins + jetty dock + moored boat
  if (computeWaterShoreDepth(x, z) > 0) return false;
  if (
    x >= EMERALD_LAGOON_BOUNDS.centerX - EMERALD_LAGOON_BOUNDS.halfX - 0.35 &&
    x <= EMERALD_LAGOON_BOUNDS.centerX + EMERALD_LAGOON_BOUNDS.halfX + 0.35 &&
    z >= EMERALD_LAGOON_BOUNDS.centerZ - EMERALD_LAGOON_BOUNDS.halfZ - 0.35 &&
    z <= EMERALD_LAGOON_BOUNDS.centerZ + EMERALD_LAGOON_BOUNDS.halfZ + 0.35
  ) {
    return false;
  }
  if (!options.allowShoreline) {
    // Extra dry buffer around water edge for trees, shrubs, flowers, grass
    if (computeWaterShoreDepth(x + 0.65, z) > 0 || computeWaterShoreDepth(x - 0.65, z) > 0 ||
        computeWaterShoreDepth(x, z + 0.65) > 0 || computeWaterShoreDepth(x, z - 0.65) > 0) {
      return false;
    }
  }
  // Jetty timber deck & moored boat footprint
  if (x >= 52.8 && x <= 62.6 && z >= -22.8 && z <= -12.4) return false;
  // South Cove water buffer
  if (Math.hypot(x - SOUTH_COVE_BOUNDS.centerX, z - SOUTH_COVE_BOUNDS.centerZ) < 12.65 + (options.allowShoreline ? 0 : extraRadius * 0.4)) {
    return false;
  }
  // Amphibious Lagoon bank & Pond water buffer
  if (Math.hypot(x - AMPHIBIOUS_LAGOON_BOUNDS.centerX, z - AMPHIBIOUS_LAGOON_BOUNDS.centerZ) < AMPHIBIOUS_LAGOON_BOUNDS.radius + (options.allowShoreline ? 0.2 : 1.4 + extraRadius * 0.5)) {
    return false;
  }
  // Stunt & Drift Arena tarmac apron clear
  if (x >= 72 && x <= 145 && z >= 36 && z <= 128) return false;
  for (let i = 0; i < STUNT_ARENA_RAMPS.length; i++) {
    if (Math.hypot(x - STUNT_ARENA_RAMPS[i].x, z - STUNT_ARENA_RAMPS[i].z) < 7.5 + extraRadius) return false;
  }
  for (let i = 0; i < DOUBLE_JUMP_PLATFORMS.length; i++) {
    if (Math.hypot(x - DOUBLE_JUMP_PLATFORMS[i].x, z - DOUBLE_JUMP_PLATFORMS[i].z) < 6.5 + extraRadius) return false;
  }
  for (let i = 0; i < PRECISION_PARKING_BAYS.length; i++) {
    if (Math.hypot(x - PRECISION_PARKING_BAYS[i].x, z - PRECISION_PARKING_BAYS[i].z) < 5.5 + extraRadius) return false;
  }
  for (let i = 0; i < DRIFT_CIRCUIT_CHECKPOINTS.length; i++) {
    if (Math.hypot(x - DRIFT_CIRCUIT_CHECKPOINTS[i].x, z - DRIFT_CIRCUIT_CHECKPOINTS[i].z) < 7.0 + extraRadius) return false;
  }
  for (let i = 0; i < FOREST_TRAIL_GATES.length; i++) {
    if (Math.hypot(x - FOREST_TRAIL_GATES[i].x, z - FOREST_TRAIL_GATES[i].z) < 5.2 + extraRadius) return false;
  }
  for (let i = 0; i < LAGOON_RUN_CHECKPOINTS.length; i++) {
    if (Math.hypot(x - LAGOON_RUN_CHECKPOINTS[i].x, z - LAGOON_RUN_CHECKPOINTS[i].z) < 5.5 + extraRadius) return false;
  }

  // All 9 Landmark aprons + buildings
  for (let i = 0; i < LANDMARK_BUILDING_FOOTPRINTS.length; i++) {
    const fp = LANDMARK_BUILDING_FOOTPRINTS[i];
    if (Math.hypot(x - fp.ax, z - fp.az) < 9.2 + extraRadius) return false;
    if (Math.hypot(x - fp.bx, z - fp.bz) < 7.0 + extraRadius) return false;
  }

  // Collectibles, Secrets, and Challenge checkpoints
  for (let i = 0; i < WORLD_COLLECTIBLES.length; i++) {
    const c = WORLD_COLLECTIBLES[i];
    if (Math.hypot(x - c.x, z - c.z) < 3.4 + extraRadius) return false;
  }
  for (let i = 0; i < SECRET_LOCATIONS.length; i++) {
    const s = SECRET_LOCATIONS[i];
    if (Math.hypot(x - s.x, z - s.z) < 3.8 + extraRadius) return false;
  }
  for (let i = 0; i < SQL_CHALLENGE_GATES.length; i++) {
    const g = SQL_CHALLENGE_GATES[i];
    if (Math.hypot(x - g.x, z - g.z) < 4.6 + extraRadius) return false;
  }
  for (let i = 0; i < TIME_TRIAL_CHECKPOINTS.length; i++) {
    const t = TIME_TRIAL_CHECKPOINTS[i];
    if (Math.hypot(x - t.x, z - t.z) < 4.2 + extraRadius) return false;
  }
  for (let i = 0; i < BUG_HUNT_TARGETS.length; i++) {
    const b = BUG_HUNT_TARGETS[i];
    if (Math.hypot(x - b.x, z - b.z) < 3.6 + extraRadius) return false;
  }
  for (let i = 0; i < MEMORY_PADS.length; i++) {
    const m = MEMORY_PADS[i];
    if (Math.hypot(x - m.x, z - m.z) < 4.2 + extraRadius) return false;
  }
  for (let i = 0; i < TREASURE_CHESTS.length; i++) {
    const tr = TREASURE_CHESTS[i];
    if (Math.hypot(x - tr.x, z - tr.z) < 3.4 + extraRadius) return false;
  }
  for (let i = 0; i < EXTRA_PROP_EXCLUSIONS.length; i++) {
    const [px, pz, pr] = EXTRA_PROP_EXCLUSIONS[i];
    if (Math.hypot(x - px, z - pz) < pr + extraRadius) return false;
  }

  return true;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PINE_PALETTE = ['#3D6D44', '#4B7D4D', '#588C54', '#345E3E', '#4F8456'];
const PALM_PALETTE = ['#58944C', '#67A453', '#49864B', '#77AF56', '#538E56'];
const BROADLEAF_PALETTE = ['#5D924E', '#6EA356', '#4E8354', '#7DB05B', '#54894D'];
const DECORATIVE_PALETTE = ['#6AA25B', '#7EB05E', '#57905E', '#D98C45', '#E5B24C'];
const SHORELINE_PALETTE = ['#528A54', '#699953', '#457852', '#7DA45C'];
const SHRUB_PALETTE = ['#4E844B', '#5F9552', '#6DA25A', '#417347'];
const FERN_PALETTE = ['#4C884A', '#5E9B52', '#3F7648', '#6FA858'];
const GRASS_PALETTE = ['#6E9E56', '#5D8E4E', '#83AD5E', '#7CA658', '#52804A'];
const FLOWER_PALETTE = ['#EC6D2C', '#FFE082', '#FFF6E5', '#E65448', '#B68CE8', '#6CCBB8'];

export function generateWorldVegetationLayout(): WorldVegetationLayout {
  const rand = mulberry32(20261124);

  const pines: VegetationPlacement[] = [];
  const palms: VegetationPlacement[] = [];
  const broadleafs: VegetationPlacement[] = [];
  const decoratives: VegetationPlacement[] = [];
  const shorelines: VegetationPlacement[] = [];
  const shrubs: VegetationPlacement[] = [];
  const groundPlants: VegetationPlacement[] = [];
  const grass: VegetationPlacement[] = [];
  const flowers: VegetationPlacement[] = [];
  const staticColliders: StaticTreeCollider[] = [];

  const treeCenters: { x: number; z: number; minSep: number }[] = [];
  const hasTreeConflict = (x: number, z: number, sep: number): boolean => {
    for (let i = 0; i < treeCenters.length; i++) {
      const tc = treeCenters[i];
      if (Math.hypot(x - tc.x, z - tc.z) < Math.max(sep, tc.minSep)) return true;
    }
    return false;
  };

  const makeWindProps = (ampMin: number, ampSpan: number, leanMax = 0.09) => ({
    windPhase: rand() * Math.PI * 2,
    windAmp: ampMin + rand() * ampSpan,
    leanX: (rand() - 0.5) * 2 * leanMax,
    leanZ: (rand() - 0.5) * 2 * leanMax,
  });

  // ---------------------------------------------------------------------------
  // A & B & C. Primary Trees: Palms (coastal/oasis), Pines (highlands/trails),
  // Broadleafs (valleys & groves) using natural golden-angle + district zones
  // ---------------------------------------------------------------------------
  const tryPlaceTree = (
    species: 'pine' | 'palm' | 'broadleaf',
    x: number,
    z: number,
    scale: number,
    minSep: number,
  ): boolean => {
    if (!isClearForVegetation(x, z, 1.35, { isTreeOrShrub: true })) return false;
    if (hasTreeConflict(x, z, minSep)) return false;
    const gy = computeGroundHeight(x, z);
    if (gy < -0.14) return false;

    treeCenters.push({ x, z, minSep });
    const palette =
      species === 'pine'
        ? PINE_PALETTE
        : species === 'palm'
          ? PALM_PALETTE
          : BROADLEAF_PALETTE;
    const idx =
      species === 'pine'
        ? pines.length
        : species === 'palm'
          ? palms.length
          : broadleafs.length;

    const item: VegetationPlacement = {
      species,
      x,
      y: gy,
      z,
      scale,
      yaw: rand() * Math.PI * 2,
      ...makeWindProps(0.82, 0.42, species === 'palm' ? 0.14 : 0.08),
      colorHex: palette[(idx + Math.floor(rand() * palette.length)) % palette.length],
    };

    if (species === 'pine') pines.push(item);
    else if (species === 'palm') palms.push(item);
    else broadleafs.push(item);

    const roadEdge = distanceToRoadEdge(x, z);
    if (Math.hypot(x, z) < 122 && roadEdge.clearanceMeters >= 3.25) {
      staticColliders.push({
        x,
        y: gy + 1.3,
        z,
        hx: species === 'palm' ? 0.48 : 0.55,
        hy: 1.5,
        hz: species === 'palm' ? 0.48 : 0.55,
      });
    }
    return true;
  };

  // 1. Tropical Palm Oasis Groves (Emerald Lagoon shores & South Cove oasis & warm southern dunes)
  const palmClusterCenters = [
    // Emerald Lagoon north & south sunlit shores
    [22, -33.2], [29, -32.8], [49, -32.4], [58, -32.8], [67, -32.2],
    [20, -11.4], [27, -11.2], [49, -11.4], [64, -12.0], [72, -14.8],
    // South Cove Oasis palms
    [-31, 61], [-27, 75], [-16, 80.5], [-6, 73], [-8, 56], [-30, 70],
    // Warm southern & eastern dunes
    [16, 48], [26, 62], [58, 34], [64, 52], [-48, 58], [76, 18],
  ];
  for (const [cx, cz] of palmClusterCenters) {
    const count = 2;
    for (let k = 0; k < count; k++) {
      const ang = rand() * Math.PI * 2;
      const dist = k === 0 ? rand() * 1.4 : 2.8 + rand() * 2.4;
      tryPlaceTree(
        'palm',
        cx + Math.cos(ang) * dist,
        cz + Math.sin(ang) * dist,
        0.88 + rand() * 0.34,
        3.2,
      );
    }
  }

  // 2. Hidden Pine Trail, Forest Trail District & Lookout Hill Northern Pine Groves
  const pineGroves = [
    [-36, -45], [-30, -56], [-26, -64], [-18, -69], [-14, -48],
    [-19, -76], [14, -75], [20, -64], [12, -54], [-10, -86],
    [12, -88], [-48, -56], [-56, -44], [-58, -24], [-68, -36],
    // Forest Trail District groves
    [-76, -62], [-94, -64], [-116, -72], [-134, -84], [-112, -108], [-92, -98],
  ];
  for (const [cx, cz] of pineGroves) {
    const count = 3;
    for (let k = 0; k < count; k++) {
      const ang = (k / count) * Math.PI * 2 + rand() * 0.9;
      const rad = 1.6 + rand() * 4.5;
      tryPlaceTree(
        'pine',
        cx + Math.cos(ang) * rad,
        cz + Math.sin(ang) * rad,
        0.86 + rand() * 0.38,
        3.5,
      );
    }
  }

  // Amphibious Lagoon perimeter coastal palms & Stunt Arena border trees
  for (let i = 0; i < 12; i++) {
    const theta = (i / 12) * Math.PI * 2 + 0.2;
    const rad = AMPHIBIOUS_LAGOON_BOUNDS.radius + 4.2 + (i % 2) * 2.5;
    tryPlaceTree(
      'palm',
      AMPHIBIOUS_LAGOON_BOUNDS.centerX + Math.cos(theta) * rad,
      AMPHIBIOUS_LAGOON_BOUNDS.centerZ + Math.sin(theta) * rad,
      0.92 + rand() * 0.3,
      3.8,
    );
  }

  // 3. Broadleaf Groves around Studios, Query Valley ridges & central sunlit glades
  const broadGroves = [
    [-25, -24], [-48, -28], [22, -48], [52, -44], [66, -58],
    [74, -44], [62, -6], [52, 26], [24, 18], [-22, 28], [-44, 24],
    [32, 64], [-56, 48],
  ];
  for (const [cx, cz] of broadGroves) {
    const count = 2;
    for (let k = 0; k < count; k++) {
      const ang = rand() * Math.PI * 2;
      const rad = 1.2 + rand() * 3.6;
      tryPlaceTree(
        'broadleaf',
        cx + Math.cos(ang) * rad,
        cz + Math.sin(ang) * rad,
        0.86 + rand() * 0.32,
        3.6,
      );
    }
  }

  // 4. General golden-angle outer valley forest fill (pines, broadleafs, sunny coastal palms)
  for (let i = 0; i < 165; i++) {
    const angle = i * 2.399963;
    const radius = 26 + Math.sqrt(i / 165) * 86;
    const tx = Math.cos(angle) * radius;
    const tz = Math.sin(angle) * radius;
    const species: 'pine' | 'palm' | 'broadleaf' =
      tz < -22 || tx < -44
        ? i % 3 === 0
          ? 'broadleaf'
          : 'pine'
        : tz > 24 && Math.abs(tx) < 55
          ? i % 2 === 0
            ? 'palm'
            : 'broadleaf'
          : i % 4 === 0
            ? 'palm'
            : i % 2 === 0
              ? 'pine'
              : 'broadleaf';
    tryPlaceTree(species, tx, tz, 0.84 + rand() * 0.38, 3.8);
  }

  // ---------------------------------------------------------------------------
  // D. Small Decorative Trees (curated near landmarks, plaza outer rim & bridge)
  // ---------------------------------------------------------------------------
  const decoAnchors: [number, number][] = [
    [-19, -11], [19, -11], [-18, 12], [18, 12], [-22, 2], [22, -2],
    [-46, -42], [-27, -42], [27, -48], [45, -48], [60, 19], [72, 14],
    [-12, 48], [12, 48], [-32, 57], [-47, 52], [35, 56], [53, 55],
    [35, -36], [46, -12], [53, -8], [40, -82], [58, -80],
    [-14, -76], [14, -76], [-56, 3], [-54, 34], [24, -2], [-24, -14],
    [16, -24], [6, 26], [-18, 22], [29, 32], [-28, -4],
    [15, 22], [-15, -24], [22, 46], [-21, -46], [56, 5], [-56, 42],
    [25, -62], [-34, 15], [46, 28], [-44, -24],
    [-14, 18], [14, 18], [-25, 11], [25, -9], [11, 42], [-11, 42],
    [51, 20], [56, 36], [-52, 38], [60, -40], [-64, -18], [-12, 84],
    [18, 78], [14, -44],
  ];
  for (let i = 0; i < decoAnchors.length; i++) {
    const [ax, az] = decoAnchors[i];
    const x = ax + (rand() - 0.5) * 1.4;
    const z = az + (rand() - 0.5) * 1.4;
    if (!isClearForVegetation(x, z, 0.9, { isTreeOrShrub: true })) continue;
    if (hasTreeConflict(x, z, 2.3)) continue;
    const gy = computeGroundHeight(x, z);
    if (gy < -0.1) continue;

    treeCenters.push({ x, z, minSep: 2.3 });
    decoratives.push({
      species: 'decorative',
      x,
      y: gy,
      z,
      scale: 0.85 + rand() * 0.32,
      yaw: rand() * Math.PI * 2,
      ...makeWindProps(0.8, 0.35, 0.06),
      colorHex: DECORATIVE_PALETTE[i % DECORATIVE_PALETTE.length],
    });
  }

  // ---------------------------------------------------------------------------
  // E. Shoreline Vegetation (Reeds, Cattails & Coastal Sedge)
  // ---------------------------------------------------------------------------
  // Ring Emerald Lagoon outer beach edge
  for (let i = 0; i < 120; i++) {
    const t = i / 120;
    const theta = t * Math.PI * 2;
    const rx = Math.cos(theta);
    const rz = Math.sin(theta);
    // Walk radially outward from lagoon border
    const bx = EMERALD_LAGOON_BOUNDS.centerX + Math.sign(rx) * Math.min(EMERALD_LAGOON_BOUNDS.halfX + 0.55 + rand() * 1.6, Math.abs(rx) * 34);
    const bz = EMERALD_LAGOON_BOUNDS.centerZ + Math.sign(rz) * Math.min(EMERALD_LAGOON_BOUNDS.halfZ + 0.55 + rand() * 1.5, Math.abs(rz) * 10.5);
    if (!isClearForVegetation(bx, bz, 0.35, { allowShoreline: true })) continue;
    const gy = computeGroundHeight(bx, bz);
    if (gy < -0.22 || gy > 0.55) continue;
    shorelines.push({
      species: 'shoreline',
      x: bx,
      y: gy,
      z: bz,
      scale: 0.8 + rand() * 0.45,
      yaw: rand() * Math.PI * 2,
      ...makeWindProps(0.85, 0.45, 0.12),
      colorHex: SHORELINE_PALETTE[shorelines.length % SHORELINE_PALETTE.length],
    });
  }
  // Ring South Cove rim
  for (let i = 0; i < 48; i++) {
    const theta = (i / 48) * Math.PI * 2 + (rand() - 0.5) * 0.08;
    const rad = SOUTH_COVE_BOUNDS.radius + 0.45 + rand() * 1.8;
    const sx = SOUTH_COVE_BOUNDS.centerX + Math.cos(theta) * rad;
    const sz = SOUTH_COVE_BOUNDS.centerZ + Math.sin(theta) * rad;
    if (!isClearForVegetation(sx, sz, 0.35, { allowShoreline: true })) continue;
    const gy = computeGroundHeight(sx, sz);
    if (gy < -0.22 || gy > 0.6) continue;
    shorelines.push({
      species: 'shoreline',
      x: sx,
      y: gy,
      z: sz,
      scale: 0.82 + rand() * 0.44,
      yaw: rand() * Math.PI * 2,
      ...makeWindProps(0.85, 0.45, 0.12),
      colorHex: SHORELINE_PALETTE[shorelines.length % SHORELINE_PALETTE.length],
    });
  }

  // ---------------------------------------------------------------------------
  // F. Bushes & Shrubs (clustering beneath trees, corners, roadsides, hills)
  // ---------------------------------------------------------------------------
  const shrubAnchorPool: { x: number; z: number }[] = [
    ...pines.slice(0, 38).map((p) => ({ x: p.x, z: p.z })),
    ...broadleafs.slice(0, 32).map((p) => ({ x: p.x, z: p.z })),
    ...decoratives.slice(0, 22).map((p) => ({ x: p.x, z: p.z })),
  ];
  for (let i = 0; i < shrubAnchorPool.length; i++) {
    const anchor = shrubAnchorPool[i];
    const branches = 1 + (i % 2);
    for (let b = 0; b < branches; b++) {
      const ang = rand() * Math.PI * 2;
      const dist = 1.65 + rand() * 1.9;
      const sx = anchor.x + Math.cos(ang) * dist;
      const sz = anchor.z + Math.sin(ang) * dist;
      if (!isClearForVegetation(sx, sz, 0.75, { isTreeOrShrub: true })) continue;
      const gy = computeGroundHeight(sx, sz);
      if (gy < -0.14) continue;
      shrubs.push({
        species: 'shrub',
        x: sx,
        y: gy,
        z: sz,
        scale: 0.75 + rand() * 0.55,
        yaw: rand() * Math.PI * 2,
        ...makeWindProps(0.75, 0.4, 0.08),
        colorHex: SHRUB_PALETTE[shrubs.length % SHRUB_PALETTE.length],
      });
    }
  }
  // Extra roadside & bridge approach shrubs
  for (let i = 0; i < 55; i++) {
    const a = i * 2.399963 + 1.1;
    const rad = 18 + Math.sqrt(i / 55) * 68;
    const sx = Math.cos(a) * rad;
    const sz = Math.sin(a) * rad;
    if (!isClearForVegetation(sx, sz, 0.85, { isTreeOrShrub: true })) continue;
    const gy = computeGroundHeight(sx, sz);
    if (gy < -0.14) continue;
    shrubs.push({
      species: 'shrub',
      x: sx,
      y: gy,
      z: sz,
      scale: 0.72 + rand() * 0.48,
      yaw: rand() * Math.PI * 2,
      ...makeWindProps(0.75, 0.4, 0.08),
      colorHex: SHRUB_PALETTE[shrubs.length % SHRUB_PALETTE.length],
    });
  }

  // ---------------------------------------------------------------------------
  // G. Small Ground Plants & Ferns (shade beneath pines/palms/rocks & cove)
  // ---------------------------------------------------------------------------
  const fernAnchors = [
    ...pines.slice(0, 50),
    ...palms.slice(0, 32),
    ...shrubs.slice(0, 45),
  ];
  for (let i = 0; i < fernAnchors.length; i++) {
    const a = fernAnchors[i];
    const ang = rand() * Math.PI * 2;
    const dist = 1.0 + rand() * 1.65;
    const fx = a.x + Math.cos(ang) * dist;
    const fz = a.z + Math.sin(ang) * dist;
    if (!isClearForVegetation(fx, fz, 0.45)) continue;
    const gy = computeGroundHeight(fx, fz);
    if (gy < -0.14) continue;
    groundPlants.push({
      species: 'groundplant',
      x: fx,
      y: gy,
      z: fz,
      scale: 0.72 + rand() * 0.56,
      yaw: rand() * Math.PI * 2,
      ...makeWindProps(0.8, 0.45, 0.1),
      colorHex: FERN_PALETTE[groundPlants.length % FERN_PALETTE.length],
    });
  }

  // ---------------------------------------------------------------------------
  // H & I. Clustered Grass Meadows & Wildflower Patches
  // ---------------------------------------------------------------------------
  const meadowPatches: [number, number, number, number][] = [
    // [centerX, centerZ, patchRadius, count]
    [-20, -18, 8.5, 28],
    [20, -14, 7.5, 24],
    [20, 20, 8.5, 28],
    [-20, 20, 8.5, 28],
    [-16, -42, 9.5, 30],
    [16, -42, 9.5, 30],
    [-22, -62, 11.0, 36],
    [20, -66, 10.5, 32],
    [54, -54, 11.0, 32],
    [62, -32, 7.5, 22],
    [54, -8, 8.5, 26],
    [52, 24, 9.5, 28],
    [18, 48, 10.5, 32],
    [-18, 46, 9.0, 28],
    [-20, 74, 11.0, 34],
    [-46, 36, 9.5, 26],
    [-46, -24, 9.5, 28],
    [-58, -42, 11.5, 32],
    [28, -32, 6.5, 18],
    [50, -11, 6.5, 18],
  ];

  for (const [mx, mz, mRad, mCount] of meadowPatches) {
    for (let k = 0; k < mCount; k++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * mRad;
      const gx = mx + Math.cos(a) * d;
      const gz = mz + Math.sin(a) * d;
      if (!isClearForVegetation(gx, gz, 0.35)) continue;
      const gy = computeGroundHeight(gx, gz);
      if (gy < -0.14) continue;
      grass.push({
        species: 'grass',
        x: gx,
        y: gy,
        z: gz,
        scale: 0.72 + rand() * 0.68,
        yaw: rand() * Math.PI * 2,
        ...makeWindProps(0.75, 0.55, 0.22),
        colorHex: GRASS_PALETTE[grass.length % GRASS_PALETTE.length],
      });
    }
  }

  // Broad golden-angle valley grass scatter
  for (let i = 0; i < 320; i++) {
    const a = i * 2.399963 + 0.37;
    const rad = 16.5 + Math.sqrt(i / 320) * 86;
    const gx = Math.cos(a) * rad;
    const gz = Math.sin(a) * rad;
    if (!isClearForVegetation(gx, gz, 0.4)) continue;
    const gy = computeGroundHeight(gx, gz);
    if (gy < -0.14) continue;
    grass.push({
      species: 'grass',
      x: gx,
      y: gy,
      z: gz,
      scale: 0.7 + rand() * 0.7,
      yaw: rand() * Math.PI * 2,
      ...makeWindProps(0.75, 0.55, 0.22),
      colorHex: GRASS_PALETTE[grass.length % GRASS_PALETTE.length],
    });
  }

  // Wildflower clusters strictly clear of driving asphalt
  const flowerPatches: [number, number, number, number][] = [
    [-20, -18, 6.5, 18],
    [19, -15, 5.5, 16],
    [22, 19, 6.0, 16],
    [-21, 18, 6.0, 16],
    [-19, -51, 7.5, 18],
    [14, -56, 7.5, 18],
    [-19, 54, 7.0, 16],
    [-31, 63, 5.0, 14],
    [-6, 68, 5.0, 14],
    [52, 26, 7.0, 16],
    [56, -10, 5.5, 14],
    [34, -34, 5.0, 14],
    [-46, -24, 6.5, 16],
    [40, -54, 7.0, 16],
    [16, 48, 7.0, 16],
    [-14, -79, 5.5, 14],
    [14, -79, 5.5, 14],
    [66, -42, 6.0, 14],
  ];
  for (const [fxCenter, fzCenter, fRad, fCount] of flowerPatches) {
    const patchColorIdx = Math.floor(rand() * FLOWER_PALETTE.length);
    for (let k = 0; k < fCount; k++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * fRad;
      const fx = fxCenter + Math.cos(a) * d;
      const fz = fzCenter + Math.sin(a) * d;
      if (!isClearForVegetation(fx, fz, 0.55)) continue;
      const gy = computeGroundHeight(fx, fz);
      if (gy < -0.14) continue;
      const colorChoice =
        k % 3 === 0
          ? FLOWER_PALETTE[(patchColorIdx + 1) % FLOWER_PALETTE.length]
          : FLOWER_PALETTE[patchColorIdx];
      flowers.push({
        species: 'flower',
        x: fx,
        y: gy,
        z: fz,
        scale: 0.72 + rand() * 0.58,
        yaw: rand() * Math.PI * 2,
        ...makeWindProps(0.8, 0.5, 0.16),
        colorHex: colorChoice,
      });
    }
  }

  return {
    pines,
    palms,
    broadleafs,
    decoratives,
    shorelines,
    shrubs,
    groundPlants,
    grass,
    flowers,
    staticColliders,
  };
}
