import {
  BUG_HUNT_TARGETS,
  MEMORY_PADS,
  PADDOCK_CHECKPOINTS,
  SECRET_LOCATIONS,
  SQL_CHALLENGE_GATES,
  TIME_TRIAL_CHECKPOINTS,
  TREASURE_CHESTS,
  WORLD_COLLECTIBLES,
  WORLD_LANDMARKS,
} from '../data/portfolioData';
import {
  MAIN_LAGOON_BRIDGE,
  RING_LAGOON_VIADUCT,
  SOUTH_COVE_BRIDGE,
  computeBridgeSurfaceY,
  computeGroundHeight,
} from './physicsMath';
import {
  AMPHIBIOUS_LAGOON_BOUNDS,
  EMERALD_LAGOON_BOUNDS,
  SOUTH_COVE_BOUNDS,
  computeWaterShoreDepth,
} from './waterWaveMath';
import {
  DRIFT_CIRCUIT_CHECKPOINTS,
  FOREST_TRAIL_GATES,
  LAGOON_RUN_CHECKPOINTS,
  PRECISION_PARKING_BAYS,
  STUNT_ARENA_RAMPS,
  DOUBLE_JUMP_PLATFORMS,
} from '../data/portfolioData';
import { FOREST_BROOK_BRIDGE } from './physicsMath';

export const WORLD_PLAYABLE_HALF_SPAN = 158;
export const WORLD_MAP_HALF_SPAN = 166;

export type DistrictId =
  | 'central'
  | 'north'
  | 'west'
  | 'east'
  | 'south'
  | 'forest-trail'
  | 'amphibious-lagoon'
  | 'stunt-drift';

export interface DistrictDef {
  id: DistrictId;
  name: string;
  shortLabel: string;
  subtitle: string;
  color: string;
  tintFill: string;
  labelX: number;
  labelZ: number;
  polygon: readonly [number, number][];
}

export const WORLD_DISTRICTS: readonly DistrictDef[] = [
  {
    id: 'central',
    name: 'Central Hub',
    shortLabel: 'CENTRAL HUB',
    subtitle: 'Starting Plaza & Sunlit Ring Boulevard',
    color: '#EC6D2C',
    tintFill: 'rgba(255, 249, 240, 0.36)',
    labelX: 0,
    labelZ: 20,
    polygon: [
      [-26, -26],
      [26, -26],
      [26, 28],
      [-26, 28],
    ],
  },
  {
    id: 'north',
    name: 'North Ridge',
    shortLabel: 'NORTH RIDGE',
    subtitle: 'Lookout Hill & Query Valley',
    color: '#6A9A68',
    tintFill: 'rgba(181, 199, 142, 0.24)',
    labelX: 16,
    labelZ: -95,
    polygon: [
      [-38, -118],
      [88, -118],
      [88, -36],
      [18, -36],
      [-38, -36],
    ],
  },
  {
    id: 'west',
    name: 'Western Highlands',
    shortLabel: 'WESTERN HIGHLANDS',
    subtitle: 'The Studio, West Tunnel & Paddock Circuit',
    color: '#D9601E',
    tintFill: 'rgba(230, 159, 56, 0.16)',
    labelX: -72,
    labelZ: -16,
    polygon: [
      [-118, -46],
      [-38, -46],
      [-26, -26],
      [-26, 28],
      [-40, 34],
      [-118, 34],
    ],
  },
  {
    id: 'east',
    name: 'Eastern Shore',
    shortLabel: 'EASTERN SHORE',
    subtitle: 'Emerald Lagoon, Project Pavilion & The Workshop',
    color: '#21968B',
    tintFill: 'rgba(33, 150, 139, 0.14)',
    labelX: 84,
    labelZ: 22,
    polygon: [
      [26, -36],
      [118, -36],
      [118, 34],
      [26, 28],
    ],
  },
  {
    id: 'south',
    name: 'Southern Cove',
    shortLabel: 'SOUTHERN COVE',
    subtitle: 'Delivery Depot, Signal House & Cove Oasis',
    color: '#3E7B9E',
    tintFill: 'rgba(62, 123, 158, 0.14)',
    labelX: 12,
    labelZ: 74,
    polygon: [
      [-118, 34],
      [70, 34],
      [70, 86],
      [-118, 86],
    ],
  },
  {
    id: 'forest-trail',
    name: 'Forest Trail District',
    shortLabel: 'FOREST TRAIL',
    subtitle: 'Woodland Loop, Timber Brook Bridge & Pine Overlook',
    color: '#4F8456',
    tintFill: 'rgba(79, 132, 86, 0.22)',
    labelX: -104,
    labelZ: -96,
    polygon: [
      [-152, -132],
      [-56, -132],
      [-56, -48],
      [-152, -48],
    ],
  },
  {
    id: 'amphibious-lagoon',
    name: 'Amphibious Lagoon',
    shortLabel: 'AMPHIBIOUS LAGOON',
    subtitle: 'Shallow Pond Course, Buoys & Timber Dock',
    color: '#17948D',
    tintFill: 'rgba(23, 148, 141, 0.2)',
    labelX: -36,
    labelZ: 146,
    polygon: [
      [-74, 88],
      [0, 88],
      [0, 156],
      [-74, 156],
    ],
  },
  {
    id: 'stunt-drift',
    name: 'Stunt & Drift Arena',
    shortLabel: 'STUNT & DRIFT',
    subtitle: 'Drift Hairpins, Launch Ramps & Sky Platforms',
    color: '#E65448',
    tintFill: 'rgba(230, 84, 72, 0.16)',
    labelX: 108,
    labelZ: 132,
    polygon: [
      [72, 34],
      [152, 34],
      [152, 134],
      [72, 134],
    ],
  },
] as const;

export function getDistrictForPoint(x: number, z: number): DistrictDef {
  if (Math.hypot(x, z) <= 27) return WORLD_DISTRICTS[0];
  if (x <= -56 && z <= -48) return WORLD_DISTRICTS[5];
  if (x >= -74 && x <= 2 && z >= 88) return WORLD_DISTRICTS[6];
  if (x >= 72 && z >= 34) return WORLD_DISTRICTS[7];
  if (z < -36 && x >= -38) return WORLD_DISTRICTS[1];
  if (x < -26 && z <= 34) return WORLD_DISTRICTS[2];
  if (x >= 26 && z >= -36 && z <= 34) return WORLD_DISTRICTS[3];
  return WORLD_DISTRICTS[4];
}

export interface RoadSegmentDef {
  id: string;
  label: string;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  width: number;
  surface: 'asphalt' | 'gravel' | 'ramp';
  addCurbs: boolean;
  startNode: string;
  endNode: string;
}

export const PLAZA_RADIUS = 13.65;
export const RING_ROAD_DEF = {
  radius: 34.0,
  width: 5.2,
  halfWidth: 2.6,
  curbWidth: 0.28,
} as const;

export const PADDOCK_TRACK_DEF = {
  centerX: -66,
  centerZ: 18,
  radius: 18.0,
  innerRadius: 15.4,
  outerRadius: 20.6,
  outerCurbRadius: 20.92,
  width: 5.2,
} as const;

/**
 * West Ridge Tunnel: centered cleanly on the Paddock approach spoke between
 * Ring Road outer curb (~-37.0, -0.1) and Paddock Track outer curb (~-48.3, 6.9).
 */
const PADDOCK_SPOKE_DX = -32;
const PADDOCK_SPOKE_DZ = 20;
const PADDOCK_SPOKE_LEN = Math.hypot(PADDOCK_SPOKE_DX, PADDOCK_SPOKE_DZ);
const PADDOCK_UX = PADDOCK_SPOKE_DX / PADDOCK_SPOKE_LEN;
const PADDOCK_UZ = PADDOCK_SPOKE_DZ / PADDOCK_SPOKE_LEN;
const TUNNEL_T_FROM_RING = 10.2;

export const WEST_RIDGE_TUNNEL_DEF = {
  id: 'west-ridge-tunnel',
  name: 'West Ridge Tunnel',
  centerX: -34 + PADDOCK_UX * TUNNEL_T_FROM_RING, // ~ -42.65
  centerZ: -2 + PADDOCK_UZ * TUNNEL_T_FROM_RING, // ~ 3.41
  yaw: Math.atan2(PADDOCK_SPOKE_DX, PADDOCK_SPOKE_DZ), // ~ -1.0122 rad
  length: 10.6,
  halfLength: 5.3,
  innerHalfWidth: 4.4,
  outerHalfWidth: 5.8,
  wallHalfWidth: 1.0,
  clearHeight: 7.05,
  dirX: PADDOCK_UX,
  dirZ: PADDOCK_UZ,
} as const;

export const EAST_JETTY_DEF = {
  id: 'east-lagoon-jetty',
  x: 56,
  zStart: -13.1,
  zEnd: -19.8,
  width: 2.8,
} as const;

/**
 * Authoritative connected road & trail segments shared 1:1 by 3D mesh builders,
 * vegetation/prop placement exclusions, and the 2D WorldMap / Minimap + routing graph.
 */
export const ROAD_SEGMENTS: readonly RoadSegmentDef[] = [
  {
    id: 'spoke-north',
    label: 'North Plaza Boulevard',
    x1: 0,
    z1: -13.4,
    x2: 0,
    z2: -36.5,
    width: 4.9,
    surface: 'asphalt',
    addCurbs: true,
    startNode: 'plaza-n',
    endNode: 'ring-n',
  },
  {
    id: 'lookout-ramp',
    label: 'Lookout Hill Summit Ascent',
    x1: 0,
    z1: -36.5,
    x2: 0,
    z2: -69.0,
    width: 5.6,
    surface: 'ramp',
    addCurbs: true,
    startNode: 'ring-n',
    endNode: 'lm-lookout',
  },
  {
    id: 'spoke-south',
    label: 'Signal Boulevard',
    x1: 0,
    z1: 13.4,
    x2: 0,
    z2: 43.0,
    width: 4.9,
    surface: 'asphalt',
    addCurbs: true,
    startNode: 'plaza-s',
    endNode: 'lm-signal-house',
  },
  {
    id: 'spoke-studio',
    label: 'Studio Avenue',
    x1: -9.5,
    z1: -9.5,
    x2: -33.8,
    z2: -31.9,
    width: 4.8,
    surface: 'asphalt',
    addCurbs: true,
    startNode: 'plaza-nw',
    endNode: 'lm-studio',
  },
  {
    id: 'spoke-paddock-approach',
    label: 'West Tunnel Expressway',
    x1: -34.0,
    z1: -2.0,
    x2: -47.6,
    z2: 6.5,
    width: 4.8,
    surface: 'asphalt',
    addCurbs: true,
    startNode: 'ring-w',
    endNode: 'paddock-entry',
  },
  {
    id: 'spoke-paddock-infield',
    label: 'Paddock Pit Lane',
    x1: -47.6,
    z1: 6.5,
    x2: -61.5,
    z2: 15.2,
    width: 4.8,
    surface: 'asphalt',
    addCurbs: false,
    startNode: 'paddock-entry',
    endNode: 'lm-paddock',
  },
  {
    id: 'spoke-delivery',
    label: 'Courier Depot Road',
    x1: -21.1,
    z1: 26.7,
    x2: -36.1,
    z2: 45.6,
    width: 4.8,
    surface: 'asphalt',
    addCurbs: true,
    startNode: 'ring-sw',
    endNode: 'lm-delivery',
  },
  {
    id: 'spoke-workshop',
    label: 'Workshop Lab Way',
    x1: 33.7,
    z1: 4.2,
    x2: 60.9,
    z2: 7.6,
    width: 4.8,
    surface: 'asphalt',
    addCurbs: true,
    startNode: 'ring-e',
    endNode: 'lm-workshop',
  },
  {
    id: 'spoke-signal-workshop',
    label: 'Signal Compound Drive',
    x1: 23.0,
    z1: 25.1,
    x2: 41.9,
    z2: 45.7,
    width: 4.8,
    surface: 'asphalt',
    addCurbs: true,
    startNode: 'ring-se',
    endNode: 'lm-signal-workshop',
  },
  {
    id: 'spoke-east-bridge-south',
    label: 'Lagoon Bridge South Approach',
    x1: 33.7,
    z1: 4.2,
    x2: 40.0,
    z2: -11.55,
    width: 4.9,
    surface: 'asphalt',
    addCurbs: true,
    startNode: 'ring-e',
    endNode: 'bridge-main-s',
  },
  {
    id: 'spoke-pavilion-approach',
    label: 'Pavilion Terrace Link',
    x1: 40.0,
    z1: -32.45,
    x2: 36.0,
    z2: -40.8,
    width: 4.9,
    surface: 'asphalt',
    addCurbs: true,
    startNode: 'bridge-main-n',
    endNode: 'lm-projects',
  },
  {
    id: 'spoke-query-west-1',
    label: 'Pavilion West Bypass',
    x1: 36.0,
    z1: -40.8,
    x2: 28.5,
    z2: -49.0,
    width: 4.8,
    surface: 'asphalt',
    addCurbs: true,
    startNode: 'lm-projects',
    endNode: 'pavilion-bypass',
  },
  {
    id: 'spoke-query-west-2',
    label: 'Query Ridge Causeway',
    x1: 28.5,
    z1: -49.0,
    x2: 37.0,
    z2: -61.5,
    width: 4.8,
    surface: 'asphalt',
    addCurbs: true,
    startNode: 'pavilion-bypass',
    endNode: 'query-gate-entry',
  },
  {
    id: 'spoke-query-west-3',
    label: 'Query Valley Approach',
    x1: 37.0,
    z1: -61.5,
    x2: 46.2,
    z2: -70.6,
    width: 4.8,
    surface: 'asphalt',
    addCurbs: true,
    startNode: 'query-gate-entry',
    endNode: 'lm-query-valley',
  },
  // Hidden Pine Trail (Gravel)
  {
    id: 'trail-pine-1',
    label: 'Hidden Pine Trail',
    x1: -34.0,
    z1: -38.0,
    x2: -28.0,
    z2: -50.0,
    width: 3.15,
    surface: 'gravel',
    addCurbs: false,
    startNode: 'lm-studio',
    endNode: 'pine-1',
  },
  {
    id: 'trail-pine-2',
    label: 'Hidden Pine Trail',
    x1: -28.0,
    z1: -50.0,
    x2: -22.0,
    z2: -58.0,
    width: 3.15,
    surface: 'gravel',
    addCurbs: false,
    startNode: 'pine-1',
    endNode: 'pine-2',
  },
  {
    id: 'trail-pine-3',
    label: 'Hidden Pine Trail',
    x1: -22.0,
    z1: -58.0,
    x2: -13.0,
    z2: -66.0,
    width: 3.15,
    surface: 'gravel',
    addCurbs: false,
    startNode: 'pine-2',
    endNode: 'pine-3',
  },
  {
    id: 'trail-pine-4',
    label: 'Hidden Pine Trail',
    x1: -13.0,
    z1: -66.0,
    x2: -6.0,
    z2: -70.0,
    width: 3.15,
    surface: 'gravel',
    addCurbs: false,
    startNode: 'pine-3',
    endNode: 'lm-lookout',
  },
  // South Cove Gravel Trails connecting Delivery Depot <-> Footbridge <-> Signal House
  {
    id: 'trail-cove-w1',
    label: 'South Cove Footpath',
    x1: -38.0,
    z1: 48.0,
    x2: -34.0,
    z2: 56.0,
    width: 3.25,
    surface: 'gravel',
    addCurbs: false,
    startNode: 'lm-delivery',
    endNode: 'cove-w-bend',
  },
  {
    id: 'trail-cove-w2',
    label: 'South Cove Footpath',
    x1: -34.0,
    z1: 56.0,
    x2: -30.4,
    z2: 62.0,
    width: 3.25,
    surface: 'gravel',
    addCurbs: false,
    startNode: 'cove-w-bend',
    endNode: 'bridge-cove-w',
  },
  {
    id: 'trail-cove-e1',
    label: 'South Cove Footpath',
    x1: -5.6,
    z1: 62.0,
    x2: -2.5,
    z2: 55.0,
    width: 3.25,
    surface: 'gravel',
    addCurbs: false,
    startNode: 'bridge-cove-e',
    endNode: 'cove-e-bend',
  },
  {
    id: 'trail-cove-e2',
    label: 'South Cove Footpath',
    x1: -2.5,
    z1: 55.0,
    x2: 0.0,
    z2: 46.0,
    width: 3.25,
    surface: 'gravel',
    addCurbs: false,
    startNode: 'cove-e-bend',
    endNode: 'lm-signal-house',
  },
  // Forest Trail District Woodland Loop (from The Studio NW through Timber Brook Bridge)
  {
    id: 'trail-forest-entry',
    label: 'Forest Trail Entrance',
    x1: -36.0,
    z1: -34.0,
    x2: -64.0,
    z2: -60.0,
    width: 3.6,
    surface: 'gravel',
    addCurbs: false,
    startNode: 'lm-studio',
    endNode: 'ft-gate-1',
  },
  {
    id: 'trail-forest-w1',
    label: 'Forest Trail West Bend',
    x1: -64.0,
    z1: -60.0,
    x2: -88.0,
    z2: -76.0,
    width: 3.6,
    surface: 'gravel',
    addCurbs: false,
    startNode: 'ft-gate-1',
    endNode: 'ft-bend-w',
  },
  {
    id: 'trail-forest-w2',
    label: 'Brook Bridge East Approach',
    x1: -88.0,
    z1: -76.0,
    x2: -96.5,
    z2: -84.0,
    width: 3.6,
    surface: 'gravel',
    addCurbs: false,
    startNode: 'ft-bend-w',
    endNode: 'ft-bridge-e',
  },
  {
    id: 'trail-forest-n1',
    label: 'Brook North Woodland Path',
    x1: -111.5,
    z1: -84.0,
    x2: -120.0,
    z2: -98.0,
    width: 3.6,
    surface: 'gravel',
    addCurbs: false,
    startNode: 'ft-bridge-w',
    endNode: 'ft-north',
  },
  {
    id: 'trail-forest-n2',
    label: 'Pine Overlook Ridge Trail',
    x1: -120.0,
    z1: -98.0,
    x2: -126.0,
    z2: -68.0,
    width: 3.6,
    surface: 'gravel',
    addCurbs: false,
    startNode: 'ft-north',
    endNode: 'ft-overlook',
  },
  {
    id: 'trail-forest-return',
    label: 'Forest Loop South Return',
    x1: -126.0,
    z1: -68.0,
    x2: -64.0,
    z2: -60.0,
    width: 3.6,
    surface: 'gravel',
    addCurbs: false,
    startNode: 'ft-overlook',
    endNode: 'ft-gate-1',
  },
  // Amphibious Lagoon District Approach Road (Delivery Depot -> Lagoon Bank)
  {
    id: 'spoke-amphibious-entry',
    label: 'Amphibious Lagoon Road',
    x1: -38.0,
    z1: 48.0,
    x2: -34.0,
    z2: 94.0,
    width: 4.8,
    surface: 'asphalt',
    addCurbs: true,
    startNode: 'lm-delivery',
    endNode: 'amph-bank-n',
  },
  // Stunt & Drift Arena Boulevard (Signal Workshop -> Arena Pad + Drift Loop)
  {
    id: 'spoke-stunt-entry',
    label: 'Stunt Arena Boulevard',
    x1: 44.0,
    z1: 48.0,
    x2: 88.0,
    z2: 52.0,
    width: 5.4,
    surface: 'asphalt',
    addCurbs: true,
    startNode: 'lm-signal-workshop',
    endNode: 'stunt-entry',
  },
] as const;

export interface JunctionDiscDef {
  id: string;
  x: number;
  z: number;
  scale: number;
}

export const ROAD_JUNCTION_DISCS: readonly JunctionDiscDef[] = [
  { id: 'junc-ring-n', x: 0, z: -34, scale: 1.05 },
  { id: 'junc-ring-s', x: 0, z: 34, scale: 1.0 },
  { id: 'junc-ring-studio', x: -24.9, z: -23.1, scale: 0.95 },
  { id: 'junc-ring-w', x: -34.0, z: -2.0, scale: 0.98 },
  { id: 'junc-ring-sw', x: -21.1, z: 26.7, scale: 0.95 },
  { id: 'junc-ring-e', x: 33.7, z: 4.2, scale: 1.02 },
  { id: 'junc-ring-se', x: 23.0, z: 25.1, scale: 0.95 },
  { id: 'junc-pavilion', x: 36.0, z: -40.8, scale: 0.96 },
  { id: 'junc-pavilion-bypass', x: 28.5, z: -49.0, scale: 0.85 },
  { id: 'junc-query-entry', x: 37.0, z: -61.5, scale: 0.85 },
  { id: 'junc-paddock-entry', x: -47.6, z: 6.5, scale: 0.92 },
] as const;

export interface DirectionalSignDef {
  id: string;
  x: number;
  z: number;
  label: string;
  arrow: string;
  rotY: number;
  boundingRadius: number;
}

/**
 * Calibrated roadside shoulders with >= 4.2m distance to every road/trail centerline.
 */
export const DIRECTIONAL_SIGNS: readonly DirectionalSignDef[] = [
  { id: 'sign-studio', x: -17.8, z: -9.6, label: 'THE STUDIO', arrow: '↖', rotY: -0.6, boundingRadius: 1.45 },
  { id: 'sign-bridge', x: 18.2, z: -8.6, label: 'LAGOON BRIDGE', arrow: '↗', rotY: 0.6, boundingRadius: 1.45 },
  { id: 'sign-lookout', x: 5.8, z: -39.5, label: 'LOOKOUT HILL', arrow: '↑', rotY: 0, boundingRadius: 1.45 },
  { id: 'sign-query-select', x: 43.2, z: -57.5, label: 'SELECT * FROM', arrow: 'VALLEY', rotY: -0.35, boundingRadius: 1.45 },
  { id: 'sign-query-join', x: 55.2, z: -65.0, label: 'JOIN SKILLS', arrow: 'ON ID', rotY: 0.4, boundingRadius: 1.45 },
  { id: 'sign-paddock', x: -39.2, z: -6.4, label: 'THE PADDOCK', arrow: '↙', rotY: -0.95, boundingRadius: 1.45 },
  { id: 'sign-cove', x: -44.5, z: 61.0, label: 'COVE BRIDGE', arrow: '→', rotY: 0.75, boundingRadius: 1.45 },
] as const;

export interface BuildingPlacementDef {
  landmarkId: string;
  padX: number;
  padZ: number;
  buildX: number;
  buildZ: number;
  yaw: number;
  colliderHx: number;
  colliderHy: number;
  colliderHz: number;
}

export const BUILDING_FOOTPRINTS: readonly BuildingPlacementDef[] = WORLD_LANDMARKS.map((lm) => {
  const len = Math.hypot(-lm.position.x, -lm.position.z) || 1;
  const dirX = -lm.position.x / len;
  const dirZ = -lm.position.z / len;
  return {
    landmarkId: lm.id,
    padX: lm.position.x,
    padZ: lm.position.z,
    buildX: lm.position.x - dirX * 5.8,
    buildZ: lm.position.z - dirZ * 5.8,
    yaw: Math.atan2(dirX, dirZ),
    colliderHx: 3.6,
    colliderHy: 2.5,
    colliderHz: 2.9,
  };
});

export function pointToSegmentDistance(
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

export function pointToOrientedRectDistance(
  px: number,
  pz: number,
  cx: number,
  cz: number,
  hx: number,
  hz: number,
  yaw: number,
): number {
  const dx = px - cx;
  const dz = pz - cz;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  // Inverse rotation by yaw around +Y: x_local = dx*c - dz*s, z_local = dx*s + dz*c
  const lx = dx * c - dz * s;
  const lz = dx * s + dz * c;
  const qx = Math.max(Math.abs(lx) - hx, 0);
  const qz = Math.max(Math.abs(lz) - hz, 0);
  return Math.hypot(qx, qz);
}

/**
 * Computes minimum signed distance from point (x, z) to any drivable road, ramp, trail,
 * bridge deck, viaduct, tunnel interior lane, Starting Plaza, or Paddock track surface.
 * Values <= roadEdge represent on-road / inside-corridor locations.
 */
export function distanceToRoadEdge(x: number, z: number): {
  clearanceMeters: number;
  nearestRoadName: string;
} {
  let minEdge = Infinity;
  let nearestRoadName = 'Open Valley';

  const checkEdge = (edgeDist: number, name: string) => {
    if (edgeDist < minEdge) {
      minEdge = edgeDist;
      nearestRoadName = name;
    }
  };

  // Starting Plaza
  checkEdge(Math.hypot(x, z) - PLAZA_RADIUS, 'Starting Plaza');

  // Sunlit Ring Road
  const r = Math.hypot(x, z);
  const curbHalf = RING_ROAD_DEF.halfWidth + RING_ROAD_DEF.curbWidth;
  checkEdge(Math.abs(r - RING_ROAD_DEF.radius) - curbHalf, 'Sunlit Ring Road');

  // Paddock Oval Circuit
  const distPaddock = Math.hypot(x - PADDOCK_TRACK_DEF.centerX, z - PADDOCK_TRACK_DEF.centerZ);
  checkEdge(
    Math.abs(distPaddock - PADDOCK_TRACK_DEF.radius) - (PADDOCK_TRACK_DEF.width * 0.5 + 0.45),
    'Paddock Circuit',
  );

  // Road spokes & gravel trails
  for (let i = 0; i < ROAD_SEGMENTS.length; i++) {
    const seg = ROAD_SEGMENTS[i];
    const d = pointToSegmentDistance(x, z, seg.x1, seg.z1, seg.x2, seg.z2);
    const halfCorr = seg.width * 0.5 + (seg.addCurbs ? 0.28 : 0);
    checkEdge(d - halfCorr, seg.label);
  }

  // Main Bridge
  checkEdge(
    pointToOrientedRectDistance(
      x,
      z,
      MAIN_LAGOON_BRIDGE.x,
      MAIN_LAGOON_BRIDGE.zCenter,
      MAIN_LAGOON_BRIDGE.halfWidth,
      MAIN_LAGOON_BRIDGE.halfLength + 0.4,
      0,
    ),
    'Emerald Lagoon Bridge',
  );

  // South Cove Bridge
  checkEdge(
    pointToOrientedRectDistance(
      x,
      z,
      SOUTH_COVE_BRIDGE.xCenter,
      SOUTH_COVE_BRIDGE.z,
      SOUTH_COVE_BRIDGE.halfLength + 0.4,
      SOUTH_COVE_BRIDGE.halfWidth + 0.25,
      0,
    ),
    'South Cove Footbridge',
  );

  // Forest Brook Timber Bridge
  checkEdge(
    pointToOrientedRectDistance(
      x,
      z,
      FOREST_BROOK_BRIDGE.xCenter,
      FOREST_BROOK_BRIDGE.z,
      FOREST_BROOK_BRIDGE.halfLength + 0.4,
      FOREST_BROOK_BRIDGE.halfWidth + 0.25,
      0,
    ),
    'Forest Brook Timber Bridge',
  );

  // Stunt & Drift Arena tarmac apron
  checkEdge(
    pointToOrientedRectDistance(x, z, 108, 76, 33, 38, 0),
    'Stunt & Drift Arena',
  );

  // West Ridge Tunnel envelope
  checkEdge(
    pointToOrientedRectDistance(
      x,
      z,
      WEST_RIDGE_TUNNEL_DEF.centerX,
      WEST_RIDGE_TUNNEL_DEF.centerZ,
      WEST_RIDGE_TUNNEL_DEF.outerHalfWidth,
      WEST_RIDGE_TUNNEL_DEF.halfLength + 0.8,
      WEST_RIDGE_TUNNEL_DEF.yaw,
    ),
    WEST_RIDGE_TUNNEL_DEF.name,
  );

  return { clearanceMeters: minEdge, nearestRoadName };
}

export function isInsideTunnelZone(x: number, z: number): boolean {
  const dx = x - WEST_RIDGE_TUNNEL_DEF.centerX;
  const dz = z - WEST_RIDGE_TUNNEL_DEF.centerZ;
  const c = Math.cos(WEST_RIDGE_TUNNEL_DEF.yaw);
  const s = Math.sin(WEST_RIDGE_TUNNEL_DEF.yaw);
  const lx = dx * c - dz * s;
  const lz = dx * s + dz * c;
  return (
    Math.abs(lx) <= WEST_RIDGE_TUNNEL_DEF.innerHalfWidth + 0.6 &&
    Math.abs(lz) <= WEST_RIDGE_TUNNEL_DEF.halfLength + 1.0
  );
}

/**
 * Shared placement clearance check used by boulders, street lamps, and vegetation.
 */
export function isPointClearForProp(x: number, z: number, propRadius = 0.8): boolean {
  if (Math.hypot(x, z) > WORLD_MAP_HALF_SPAN) return false;
  const { clearanceMeters } = distanceToRoadEdge(x, z);
  if (clearanceMeters < propRadius + 0.45) return false;

  if (computeWaterShoreDepth(x, z) > 0) return false;
  if (computeBridgeSurfaceY(x, z) !== null) return false;

  // Emerald Lagoon & East Jetty buffer
  if (
    x >= EMERALD_LAGOON_BOUNDS.centerX - EMERALD_LAGOON_BOUNDS.halfX - 0.8 &&
    x <= EMERALD_LAGOON_BOUNDS.centerX + EMERALD_LAGOON_BOUNDS.halfX + 0.8 &&
    z >= EMERALD_LAGOON_BOUNDS.centerZ - EMERALD_LAGOON_BOUNDS.halfZ - 0.8 &&
    z <= EMERALD_LAGOON_BOUNDS.centerZ + EMERALD_LAGOON_BOUNDS.halfZ + 0.8
  ) {
    return false;
  }
  if (x >= 52.8 && x <= 62.6 && z >= -22.8 && z <= -12.4) return false;
  if (Math.hypot(x - SOUTH_COVE_BOUNDS.centerX, z - SOUTH_COVE_BOUNDS.centerZ) < 13.0) {
    return false;
  }
  if (Math.hypot(x - AMPHIBIOUS_LAGOON_BOUNDS.centerX, z - AMPHIBIOUS_LAGOON_BOUNDS.centerZ) < AMPHIBIOUS_LAGOON_BOUNDS.radius + 1.5) {
    return false;
  }
  if (x >= 72 && x <= 146 && z >= 36 && z <= 128) return false;

  for (const r of STUNT_ARENA_RAMPS) {
    if (Math.hypot(x - r.x, z - r.z) < 8 + propRadius) return false;
  }
  for (const p of DOUBLE_JUMP_PLATFORMS) {
    if (Math.hypot(x - p.x, z - p.z) < 7 + propRadius) return false;
  }
  for (const b of PRECISION_PARKING_BAYS) {
    if (Math.hypot(x - b.x, z - b.z) < 6 + propRadius) return false;
  }
  for (const fg of FOREST_TRAIL_GATES) {
    if (Math.hypot(x - fg.x, z - fg.z) < fg.radius + propRadius) return false;
  }
  for (const lr of LAGOON_RUN_CHECKPOINTS) {
    if (Math.hypot(x - lr.x, z - lr.z) < lr.radius + propRadius) return false;
  }
  for (const dc of DRIFT_CIRCUIT_CHECKPOINTS) {
    if (Math.hypot(x - dc.x, z - dc.z) < dc.radius + propRadius) return false;
  }

  for (const bp of BUILDING_FOOTPRINTS) {
    if (Math.hypot(x - bp.padX, z - bp.padZ) < 9.2 + propRadius) return false;
    if (Math.hypot(x - bp.buildX, z - bp.buildZ) < 7.2 + propRadius) return false;
  }

  for (const sd of DIRECTIONAL_SIGNS) {
    if (Math.hypot(x - sd.x, z - sd.z) < sd.boundingRadius + propRadius + 0.6) return false;
  }

  for (const col of WORLD_COLLECTIBLES) {
    if (Math.hypot(x - col.x, z - col.z) < 3.2 + propRadius) return false;
  }
  for (const s of SECRET_LOCATIONS) {
    if (Math.hypot(x - s.x, z - s.z) < 3.6 + propRadius) return false;
  }
  for (const g of SQL_CHALLENGE_GATES) {
    if (Math.hypot(x - g.x, z - g.z) < 4.5 + propRadius) return false;
  }
  for (const t of TIME_TRIAL_CHECKPOINTS) {
    if (Math.hypot(x - t.x, z - t.z) < 4.0 + propRadius) return false;
  }
  for (const b of BUG_HUNT_TARGETS) {
    if (Math.hypot(x - b.x, z - b.z) < 3.4 + propRadius) return false;
  }
  for (const m of MEMORY_PADS) {
    if (Math.hypot(x - m.x, z - m.z) < 4.0 + propRadius) return false;
  }
  for (const tr of TREASURE_CHESTS) {
    if (Math.hypot(x - tr.x, z - tr.z) < 3.2 + propRadius) return false;
  }
  return true;
}

// =========================================================================
// ROAD-NETWORK GRAPH & SHORTEST-PATH ROUTING (Dijkstra)
// =========================================================================
interface RouteNode {
  id: string;
  x: number;
  z: number;
}

const ROAD_GRAPH_NODES: RouteNode[] = [
  { id: 'plaza-center', x: 0, z: 0 },
  { id: 'plaza-n', x: 0, z: -13.4 },
  { id: 'plaza-s', x: 0, z: 13.4 },
  { id: 'plaza-nw', x: -9.5, z: -9.5 },
  { id: 'ring-n', x: 0, z: -34.0 },
  { id: 'ring-nw', x: -24.0, z: -24.0 },
  { id: 'ring-w', x: -34.0, z: -2.0 },
  { id: 'ring-sw', x: -21.1, z: 26.7 },
  { id: 'ring-s', x: 0, z: 34.0 },
  { id: 'ring-se', x: 23.0, z: 25.1 },
  { id: 'ring-e', x: 33.7, z: 4.2 },
  { id: 'ring-viaduct-e', x: Math.cos(-0.4) * 34, z: Math.sin(-0.4) * 34 },
  { id: 'ring-viaduct-mid', x: Math.cos(-0.74) * 34, z: Math.sin(-0.74) * 34 },
  { id: 'ring-viaduct-n', x: Math.cos(-1.08) * 34, z: Math.sin(-1.08) * 34 },
  { id: 'ring-ne-join', x: 0, z: -34.0 },
  { id: 'bridge-main-s', x: 40.0, z: -11.55 },
  { id: 'bridge-main-n', x: 40.0, z: -32.45 },
  { id: 'pavilion-bypass', x: 28.5, z: -49.0 },
  { id: 'query-gate-entry', x: 37.0, z: -61.5 },
  { id: 'paddock-entry', x: -47.6, z: 6.5 },
  { id: 'paddock-n', x: -66.0, z: 0.0 },
  { id: 'paddock-w', x: -84.0, z: 18.0 },
  { id: 'paddock-s', x: -66.0, z: 36.0 },
  { id: 'pine-1', x: -28.0, z: -50.0 },
  { id: 'pine-2', x: -22.0, z: -58.0 },
  { id: 'pine-3', x: -13.0, z: -66.0 },
  { id: 'cove-w-bend', x: -34.0, z: 56.0 },
  { id: 'bridge-cove-w', x: -30.5, z: 62.0 },
  { id: 'bridge-cove-e', x: -5.5, z: 62.0 },
  { id: 'cove-e-bend', x: -2.5, z: 55.0 },
  { id: 'ft-gate-1', x: -64.0, z: -60.0 },
  { id: 'ft-bend-w', x: -88.0, z: -76.0 },
  { id: 'ft-bridge-e', x: -96.5, z: -84.0 },
  { id: 'ft-bridge-w', x: -111.5, z: -84.0 },
  { id: 'ft-north', x: -120.0, z: -98.0 },
  { id: 'ft-overlook', x: -126.0, z: -68.0 },
  { id: 'amph-bank-n', x: -34.0, z: 94.0 },
  { id: 'stunt-entry', x: 88.0, z: 52.0 },
  ...WORLD_LANDMARKS.map((lm) => ({
    id: `lm-${lm.id}`,
    x: lm.position.x,
    z: lm.position.z,
  })),
];

const ROAD_GRAPH_EDGES: readonly [string, string][] = [
  // Plaza internal cross-connections
  ['plaza-center', 'plaza-n'],
  ['plaza-center', 'plaza-s'],
  ['plaza-center', 'plaza-nw'],
  ['plaza-n', 'plaza-s'],
  ['plaza-n', 'plaza-nw'],
  ['plaza-s', 'plaza-nw'],
  // Ring Road loop (with NW/NE Lagoon Viaduct)
  ['ring-n', 'ring-nw'],
  ['ring-nw', 'ring-w'],
  ['ring-w', 'ring-sw'],
  ['ring-sw', 'ring-s'],
  ['ring-s', 'ring-se'],
  ['ring-se', 'ring-e'],
  ['ring-e', 'ring-viaduct-e'],
  ['ring-viaduct-e', 'ring-viaduct-mid'],
  ['ring-viaduct-mid', 'ring-viaduct-n'],
  ['ring-viaduct-n', 'ring-n'],
  // Spokes & Landmarks
  ['plaza-n', 'ring-n'],
  ['ring-n', 'lm-lookout'],
  ['plaza-s', 'ring-s'],
  ['ring-s', 'lm-signal-house'],
  ['plaza-nw', 'ring-nw'],
  ['ring-nw', 'lm-studio'],
  ['ring-w', 'paddock-entry'],
  ['paddock-entry', 'lm-paddock'],
  ['paddock-entry', 'paddock-n'],
  ['paddock-n', 'paddock-w'],
  ['paddock-w', 'paddock-s'],
  ['paddock-s', 'paddock-entry'],
  ['ring-sw', 'lm-delivery'],
  ['ring-e', 'lm-workshop'],
  ['ring-se', 'lm-signal-workshop'],
  ['ring-e', 'bridge-main-s'],
  ['bridge-main-s', 'bridge-main-n'],
  ['bridge-main-n', 'lm-projects'],
  ['lm-projects', 'pavilion-bypass'],
  ['pavilion-bypass', 'query-gate-entry'],
  ['query-gate-entry', 'lm-query-valley'],
  // Trails & South Cove bridge
  ['lm-studio', 'pine-1'],
  ['pine-1', 'pine-2'],
  ['pine-2', 'pine-3'],
  ['pine-3', 'lm-lookout'],
  ['lm-delivery', 'cove-w-bend'],
  ['cove-w-bend', 'bridge-cove-w'],
  ['bridge-cove-w', 'bridge-cove-e'],
  ['bridge-cove-e', 'cove-e-bend'],
  ['cove-e-bend', 'lm-signal-house'],
  // Expansion District Links
  ['lm-studio', 'ft-gate-1'],
  ['ft-gate-1', 'ft-bend-w'],
  ['ft-bend-w', 'ft-bridge-e'],
  ['ft-bridge-e', 'ft-bridge-w'],
  ['ft-bridge-w', 'ft-north'],
  ['ft-north', 'ft-overlook'],
  ['ft-overlook', 'ft-gate-1'],
  ['lm-delivery', 'amph-bank-n'],
  ['lm-signal-workshop', 'stunt-entry'],
];

const NODE_BY_ID = new Map(ROAD_GRAPH_NODES.map((n) => [n.id, n]));
const ADJACENCY = new Map<string, { to: string; weight: number }[]>();
for (const n of ROAD_GRAPH_NODES) ADJACENCY.set(n.id, []);
for (const [a, b] of ROAD_GRAPH_EDGES) {
  const na = NODE_BY_ID.get(a);
  const nb = NODE_BY_ID.get(b);
  if (!na || !nb) continue;
  const w = Math.hypot(nb.x - na.x, nb.z - na.z);
  ADJACENCY.get(a)!.push({ to: b, weight: w });
  ADJACENCY.get(b)!.push({ to: a, weight: w });
}

export interface ComputedMapRoute {
  mode: 'road-network' | 'mixed' | 'direct';
  /** Waypoints along the road network (does not pretend off-road spurs are paved). */
  roadPoints: { x: number; z: number }[];
  /** Optional short dashed straight connector from off-road player position onto the nearest road node. */
  entryConnector: [{ x: number; z: number }, { x: number; z: number }] | null;
  totalMeters: number;
  label: string;
}

export function computeRoadNetworkRoute(
  playerX: number,
  playerZ: number,
  targetLandmarkId: string,
): ComputedMapRoute | null {
  const targetLm = WORLD_LANDMARKS.find((l) => l.id === targetLandmarkId);
  if (!targetLm) return null;
  const goalNodeId = `lm-${targetLm.id}`;
  const goalNode = NODE_BY_ID.get(goalNodeId);
  const directDist = Math.hypot(targetLm.position.x - playerX, targetLm.position.z - playerZ);

  if (!goalNode || directDist < 9) {
    return {
      mode: 'direct',
      roadPoints: [
        { x: playerX, z: playerZ },
        { x: targetLm.position.x, z: targetLm.position.z },
      ],
      entryConnector: null,
      totalMeters: Math.round(directDist),
      label: 'Direct Direction',
    };
  }

  // Pick closest road node to current player position
  let startNode = ROAD_GRAPH_NODES[0];
  let bestStartDist = Infinity;
  for (const n of ROAD_GRAPH_NODES) {
    const d = Math.hypot(n.x - playerX, n.z - playerZ);
    if (d < bestStartDist) {
      bestStartDist = d;
      startNode = n;
    }
  }

  const { clearanceMeters } = distanceToRoadEdge(playerX, playerZ);
  // If player is far off-road (>18m outside any road corridor) or closer directly than via road node, label explicitly
  if (clearanceMeters > 18 && bestStartDist > directDist * 0.72) {
    return {
      mode: 'direct',
      roadPoints: [
        { x: playerX, z: playerZ },
        { x: targetLm.position.x, z: targetLm.position.z },
      ],
      entryConnector: null,
      totalMeters: Math.round(directDist),
      label: 'Direct Direction',
    };
  }

  // Dijkstra shortest path from startNode -> goalNodeId
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const unvisited = new Set<string>();
  for (const n of ROAD_GRAPH_NODES) {
    dist.set(n.id, Infinity);
    prev.set(n.id, null);
    unvisited.add(n.id);
  }
  dist.set(startNode.id, 0);

  while (unvisited.size > 0) {
    let u: string | null = null;
    let best = Infinity;
    for (const cand of unvisited) {
      const d = dist.get(cand)!;
      if (d < best) {
        best = d;
        u = cand;
      }
    }
    if (!u || best === Infinity) break;
    if (u === goalNodeId) break;
    unvisited.delete(u);

    for (const edge of ADJACENCY.get(u)!) {
      if (!unvisited.has(edge.to)) continue;
      const alt = best + edge.weight;
      if (alt < dist.get(edge.to)!) {
        dist.set(edge.to, alt);
        prev.set(edge.to, u);
      }
    }
  }

  const totalGraphDist = dist.get(goalNodeId);
  if (totalGraphDist === undefined || !Number.isFinite(totalGraphDist)) {
    return {
      mode: 'direct',
      roadPoints: [
        { x: playerX, z: playerZ },
        { x: targetLm.position.x, z: targetLm.position.z },
      ],
      entryConnector: null,
      totalMeters: Math.round(directDist),
      label: 'Direct Direction',
    };
  }

  const chain: { x: number; z: number }[] = [];
  let curr: string | null = goalNodeId;
  while (curr) {
    const node = NODE_BY_ID.get(curr)!;
    chain.unshift({ x: node.x, z: node.z });
    curr = prev.get(curr) ?? null;
  }

  const needsEntryConnector = bestStartDist > 4.5;
  return {
    mode: needsEntryConnector ? 'mixed' : 'road-network',
    roadPoints: needsEntryConnector ? chain : [{ x: playerX, z: playerZ }, ...chain.slice(1)],
    entryConnector: needsEntryConnector
      ? [
          { x: playerX, z: playerZ },
          { x: startNode.x, z: startNode.z },
        ]
      : null,
    totalMeters: Math.round(bestStartDist + totalGraphDist),
    label: needsEntryConnector ? 'Direct to Road · Road Route' : 'Road Network Route',
  };
}

// =========================================================================
// DEV LAYOUT VALIDATION & AUDIT REPORT
// =========================================================================
export interface LayoutValidationIssue {
  severity: 'error' | 'warning';
  category: string;
  message: string;
}

export interface WorldLayoutAuditReport {
  valid: boolean;
  issues: LayoutValidationIssue[];
  signClearances: { id: string; clearanceMeters: number; nearestRoad: string }[];
  bridgeSeamChecks: { id: string; groundDiffStart: number; groundDiffEnd: number }[];
}

export function validateWorldLayout(
  dynamicCrateCoords: readonly { x: number; z: number }[] = [],
): WorldLayoutAuditReport {
  const issues: LayoutValidationIssue[] = [];
  const signClearances: WorldLayoutAuditReport['signClearances'] = [];

  for (const sd of DIRECTIONAL_SIGNS) {
    const res = distanceToRoadEdge(sd.x, sd.z);
    signClearances.push({
      id: sd.id,
      clearanceMeters: Number(res.clearanceMeters.toFixed(2)),
      nearestRoad: res.nearestRoadName,
    });
    if (res.clearanceMeters < sd.boundingRadius + 0.25) {
      issues.push({
        severity: 'error',
        category: 'sign-clearance',
        message: `Sign ${sd.id} at (${sd.x}, ${sd.z}) is only ${res.clearanceMeters.toFixed(2)}m from ${res.nearestRoadName}`,
      });
    }
  }

  for (let i = 0; i < dynamicCrateCoords.length; i++) {
    const cp = dynamicCrateCoords[i];
    const res = distanceToRoadEdge(cp.x, cp.z);
    if (res.clearanceMeters < 0.7) {
      issues.push({
        severity: 'error',
        category: 'crate-clearance',
        message: `Dynamic crate #${i} at (${cp.x}, ${cp.z}) sits in/too close to ${res.nearestRoadName} (${res.clearanceMeters.toFixed(2)}m)`,
      });
    }
  }

  // Verify Bridge endpoints match adjacent terrain smoothly
  const mainEndS = computeBridgeSurfaceY(MAIN_LAGOON_BRIDGE.x, MAIN_LAGOON_BRIDGE.zCenter + MAIN_LAGOON_BRIDGE.halfLength) ?? 0;
  const mainEndN = computeBridgeSurfaceY(MAIN_LAGOON_BRIDGE.x, MAIN_LAGOON_BRIDGE.zCenter - MAIN_LAGOON_BRIDGE.halfLength) ?? 0;
  const mainGroundS = computeGroundHeight(MAIN_LAGOON_BRIDGE.x, MAIN_LAGOON_BRIDGE.zCenter + MAIN_LAGOON_BRIDGE.halfLength);
  const mainGroundN = computeGroundHeight(MAIN_LAGOON_BRIDGE.x, MAIN_LAGOON_BRIDGE.zCenter - MAIN_LAGOON_BRIDGE.halfLength);

  const vS = {
    x: Math.cos(RING_LAGOON_VIADUCT.angEnd) * RING_LAGOON_VIADUCT.radius,
    z: Math.sin(RING_LAGOON_VIADUCT.angEnd) * RING_LAGOON_VIADUCT.radius,
  };
  const vN = {
    x: Math.cos(RING_LAGOON_VIADUCT.angStart) * RING_LAGOON_VIADUCT.radius,
    z: Math.sin(RING_LAGOON_VIADUCT.angStart) * RING_LAGOON_VIADUCT.radius,
  };
  const vEndS = computeBridgeSurfaceY(vS.x, vS.z) ?? 0;
  const vEndN = computeBridgeSurfaceY(vN.x, vN.z) ?? 0;
  const vGroundS = computeGroundHeight(vS.x, vS.z);
  const vGroundN = computeGroundHeight(vN.x, vN.z);

  const cEndW = computeBridgeSurfaceY(SOUTH_COVE_BRIDGE.xCenter - SOUTH_COVE_BRIDGE.halfLength, SOUTH_COVE_BRIDGE.z) ?? 0;
  const cEndE = computeBridgeSurfaceY(SOUTH_COVE_BRIDGE.xCenter + SOUTH_COVE_BRIDGE.halfLength, SOUTH_COVE_BRIDGE.z) ?? 0;
  const cGroundW = computeGroundHeight(SOUTH_COVE_BRIDGE.xCenter - SOUTH_COVE_BRIDGE.halfLength, SOUTH_COVE_BRIDGE.z);
  const cGroundE = computeGroundHeight(SOUTH_COVE_BRIDGE.xCenter + SOUTH_COVE_BRIDGE.halfLength, SOUTH_COVE_BRIDGE.z);

  const fbEndW = computeBridgeSurfaceY(FOREST_BROOK_BRIDGE.xCenter - FOREST_BROOK_BRIDGE.halfLength, FOREST_BROOK_BRIDGE.z) ?? 0;
  const fbEndE = computeBridgeSurfaceY(FOREST_BROOK_BRIDGE.xCenter + FOREST_BROOK_BRIDGE.halfLength, FOREST_BROOK_BRIDGE.z) ?? 0;
  const fbGroundW = computeGroundHeight(FOREST_BROOK_BRIDGE.xCenter - FOREST_BROOK_BRIDGE.halfLength, FOREST_BROOK_BRIDGE.z);
  const fbGroundE = computeGroundHeight(FOREST_BROOK_BRIDGE.xCenter + FOREST_BROOK_BRIDGE.halfLength, FOREST_BROOK_BRIDGE.z);

  const bridgeSeamChecks = [
    {
      id: MAIN_LAGOON_BRIDGE.id,
      groundDiffStart: Number(Math.abs(mainEndN - mainGroundN).toFixed(3)),
      groundDiffEnd: Number(Math.abs(mainEndS - mainGroundS).toFixed(3)),
    },
    {
      id: RING_LAGOON_VIADUCT.id,
      groundDiffStart: Number(Math.abs(vEndN - vGroundN).toFixed(3)),
      groundDiffEnd: Number(Math.abs(vEndS - vGroundS).toFixed(3)),
    },
    {
      id: SOUTH_COVE_BRIDGE.id,
      groundDiffStart: Number(Math.abs(cEndW - cGroundW).toFixed(3)),
      groundDiffEnd: Number(Math.abs(cEndE - cGroundE).toFixed(3)),
    },
    {
      id: FOREST_BROOK_BRIDGE.id,
      groundDiffStart: Number(Math.abs(fbEndW - fbGroundW).toFixed(3)),
      groundDiffEnd: Number(Math.abs(fbEndE - fbGroundE).toFixed(3)),
    },
  ];

  for (const bs of bridgeSeamChecks) {
    if (bs.groundDiffStart > 0.08 || bs.groundDiffEnd > 0.08) {
      issues.push({
        severity: 'error',
        category: 'bridge-seam',
        message: `Bridge ${bs.id} end height mismatch vs terrain (start=${bs.groundDiffStart}m, end=${bs.groundDiffEnd}m)`,
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    signClearances,
    bridgeSeamChecks,
  };
}
