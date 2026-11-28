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
import {
  PADDOCK_CENTER,
  PADDOCK_ENTRY_POS,
  PADDOCK_TRACK_DEF,
  PLAZA_RADIUS,
  RING_ROAD_DEF,
  ROAD_JUNCTION_DISCS,
  ROAD_SEGMENTS,
  WEST_RIDGE_TUNNEL_DEF,
  WORLD_HALF_SPAN,
} from './worldConstants';
import type { JunctionDiscDef, RoadSegmentDef } from './worldConstants';

export {
  PADDOCK_CENTER,
  PADDOCK_ENTRY_POS,
  PADDOCK_TRACK_DEF,
  PLAZA_RADIUS,
  RING_ROAD_DEF,
  ROAD_JUNCTION_DISCS,
  ROAD_SEGMENTS,
  WEST_RIDGE_TUNNEL_DEF,
  WORLD_HALF_SPAN,
};
export type { JunctionDiscDef, RoadSegmentDef };

export const WORLD_PLAYABLE_HALF_SPAN = WORLD_HALF_SPAN;
export const WORLD_MAP_HALF_SPAN = WORLD_HALF_SPAN + 8;

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
 * Calibrated roadside shoulders with >= 4.2m distance to every road/trail edge and >= 6m to landmark entrances.
 */
export const DIRECTIONAL_SIGNS: readonly DirectionalSignDef[] = [
  { id: 'sign-studio', x: -18.8, z: -7.6, label: 'THE STUDIO', arrow: '↖', rotY: -0.6, boundingRadius: 1.45 },
  { id: 'sign-bridge', x: 19.6, z: -6.4, label: 'LAGOON BRIDGE', arrow: '↗', rotY: 0.6, boundingRadius: 1.45 },
  { id: 'sign-lookout', x: 8.0, z: -42.6, label: 'LOOKOUT HILL', arrow: '↑', rotY: 0, boundingRadius: 1.45 },
  { id: 'sign-query-select', x: 45.8, z: -55.8, label: 'SELECT * FROM', arrow: 'VALLEY', rotY: -0.35, boundingRadius: 1.45 },
  { id: 'sign-query-join', x: 57.0, z: -64.2, label: 'JOIN SKILLS', arrow: 'ON ID', rotY: 0.4, boundingRadius: 1.45 },
  { id: 'sign-paddock', x: -42.8, z: -8.4, label: 'THE PADDOCK', arrow: '↙', rotY: -0.95, boundingRadius: 1.45 },
  { id: 'sign-cove', x: -45.6, z: 58.2, label: 'COVE BRIDGE', arrow: '→', rotY: 0.75, boundingRadius: 1.45 },
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

const BUILDING_COORDS_BY_ID: Record<string, { bx: number; bz: number; hx: number; hy: number; hz: number }> = {
  studio: { bx: -48.5, bz: -31.5, hx: 3.9, hy: 2.7, hz: 3.1 },
  projects: { bx: 46.5, bz: -45.5, hx: 4.1, hy: 2.8, hz: 3.3 },
  workshop: { bx: 73.5, bz: 9.0, hx: 3.8, hy: 2.7, hz: 3.2 },
  lookout: { bx: 0, bz: -81.0, hx: 3.6, hy: 3.4, hz: 3.0 },
  'signal-house': { bx: 11.5, bz: 47.0, hx: 3.6, hy: 2.9, hz: 3.0 },
  paddock: { bx: PADDOCK_CENTER.x - 29.5, bz: PADDOCK_CENTER.z, hx: 3.9, hy: 2.6, hz: 3.2 },
  delivery: { bx: -50.0, bz: 46.5, hx: 4.0, hy: 2.6, hz: 3.1 },
  'query-valley': { bx: 59.0, bz: -81.0, hx: 3.9, hy: 3.0, hz: 3.1 },
  'signal-workshop': { bx: 39.0, bz: 59.5, hx: 3.7, hy: 2.6, hz: 3.0 },
};

export const BUILDING_FOOTPRINTS: readonly BuildingPlacementDef[] = WORLD_LANDMARKS.map((lm) => {
  const custom = BUILDING_COORDS_BY_ID[lm.id];
  const bx = custom?.bx ?? lm.position.x;
  const bz = custom?.bz ?? lm.position.z;
  const toPadX = lm.position.x - bx;
  const toPadZ = lm.position.z - bz;
  return {
    landmarkId: lm.id,
    padX: lm.position.x,
    padZ: lm.position.z,
    buildX: bx,
    buildZ: bz,
    yaw: Math.atan2(toPadX, toPadZ),
    colliderHx: custom?.hx ?? 3.6,
    colliderHy: custom?.hy ?? 2.6,
    colliderHz: custom?.hz ?? 3.0,
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
  { id: 'paddock-entry', x: PADDOCK_ENTRY_POS.x, z: PADDOCK_ENTRY_POS.z },
  { id: 'paddock-n', x: PADDOCK_CENTER.x, z: PADDOCK_CENTER.z - 18.0 },
  { id: 'paddock-w', x: PADDOCK_CENTER.x - 18.0, z: PADDOCK_CENTER.z },
  { id: 'paddock-s', x: PADDOCK_CENTER.x, z: PADDOCK_CENTER.z + 18.0 },
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

/**
 * Samples every ROAD_SEGMENT at 1.0m intervals to verify longitudinal grade <= 0.20 m/m
 * and cross-slope <= 4 degrees.
 */
export function getRoadSegmentsMaxSlopes(): {
  id: string;
  maxLongitudinalSlope: number;
  maxLateralSlopeDeg: number;
}[] {
  const results: { id: string; maxLongitudinalSlope: number; maxLateralSlopeDeg: number }[] = [];
  for (const seg of ROAD_SEGMENTS) {
    const dx = seg.x2 - seg.x1;
    const dz = seg.z2 - seg.z1;
    const len = Math.hypot(dx, dz) || 1;
    const ux = dx / len;
    const uz = dz / len;
    const nx = -uz;
    const nz = ux;
    const hw = seg.width * 0.45;
    const steps = Math.max(2, Math.ceil(len));
    let maxLong = 0;
    let maxLatDeg = 0;
    let prevY = computeGroundHeight(seg.x1, seg.z1);
    for (let i = 1; i <= steps; i++) {
      const dist = (i / steps) * len;
      const stepDist = len / steps;
      const x = seg.x1 + ux * dist;
      const z = seg.z1 + uz * dist;
      const y = computeGroundHeight(x, z);
      const longSlope = Math.abs(y - prevY) / stepDist;
      if (longSlope > maxLong) maxLong = longSlope;
      prevY = y;

      const yL = computeGroundHeight(x + nx * hw, z + nz * hw);
      const yR = computeGroundHeight(x - nx * hw, z - nz * hw);
      const latDeg = (Math.atan2(Math.abs(yL - yR), hw * 2) * 180) / Math.PI;
      if (latDeg > maxLatDeg) maxLatDeg = latDeg;
    }
    results.push({
      id: seg.id,
      maxLongitudinalSlope: Number(maxLong.toFixed(4)),
      maxLateralSlopeDeg: Number(maxLatDeg.toFixed(2)),
    });
  }
  return results;
}

/**
 * Trims a ROAD_SEGMENT parametrically [tStart, tEnd] where it enters Plaza, Ring, Paddock, or Junction Discs
 * so coplanar road meshes never double-cover the same asphalt patch.
 */
export function getTrimmedRoadSegmentRange(seg: RoadSegmentDef): [number, number] {
  const dx = seg.x2 - seg.x1;
  const dz = seg.z2 - seg.z1;
  const len = Math.hypot(dx, dz) || 1;
  let trimStartM = 0;
  let trimEndM = 0;

  const isInsideDisc = (x: number, z: number) => {
    for (const jd of ROAD_JUNCTION_DISCS) {
      if (Math.hypot(x - jd.x, z - jd.z) <= jd.radius * 0.72) return true;
    }
    const r = Math.hypot(x, z);
    if (r <= PLAZA_RADIUS - 0.15) return true;
    if (Math.abs(r - RING_ROAD_DEF.radius) <= RING_ROAD_DEF.halfWidth - 0.15) return true;
    const distPaddock = Math.hypot(x - PADDOCK_CENTER.x, z - PADDOCK_CENTER.z);
    if (Math.abs(distPaddock - PADDOCK_CENTER.radius) <= PADDOCK_TRACK_DEF.width * 0.5 - 0.15) return true;
    return false;
  };

  while (trimStartM < len * 0.4 && isInsideDisc(seg.x1 + (dx / len) * trimStartM, seg.z1 + (dz / len) * trimStartM)) {
    trimStartM += 0.25;
  }
  while (trimEndM < len * 0.4 && isInsideDisc(seg.x2 - (dx / len) * trimEndM, seg.z2 - (dz / len) * trimEndM)) {
    trimEndM += 0.25;
  }

  return [
    Math.min(0.45, trimStartM / len),
    Math.max(0.55, 1 - trimEndM / len),
  ];
}

/**
 * Detects pairs of rendered trimmed asphalt segments that overlap in XY outside designated junction/ring/plaza discs.
 */
export function detectAsphaltOverlapsOutsideJunctions(): { segA: string; segB: string; x: number; z: number }[] {
  const asphaltSegs = ROAD_SEGMENTS.filter((s) => s.surface !== 'gravel');
  const overlaps: { segA: string; segB: string; x: number; z: number }[] = [];

  const inAllowedJunction = (x: number, z: number) => {
    for (const jd of ROAD_JUNCTION_DISCS) {
      if (Math.hypot(x - jd.x, z - jd.z) <= jd.radius + 1.2) return true;
    }
    if (Math.hypot(x, z) <= PLAZA_RADIUS + 0.8) return true;
    if (Math.abs(Math.hypot(x, z) - RING_ROAD_DEF.radius) <= RING_ROAD_DEF.halfWidth + 0.8) return true;
    if (
      Math.abs(Math.hypot(x - PADDOCK_CENTER.x, z - PADDOCK_CENTER.z) - PADDOCK_CENTER.radius) <=
      PADDOCK_TRACK_DEF.width * 0.5 + 0.8
    ) {
      return true;
    }
    return false;
  };

  for (let i = 0; i < asphaltSegs.length; i++) {
    const a = asphaltSegs[i];
    const [ta0, ta1] = getTrimmedRoadSegmentRange(a);
    const ax1 = a.x1 + (a.x2 - a.x1) * ta0;
    const az1 = a.z1 + (a.z2 - a.z1) * ta0;
    const ax2 = a.x1 + (a.x2 - a.x1) * ta1;
    const az2 = a.z1 + (a.z2 - a.z1) * ta1;
    const lenA = Math.hypot(ax2 - ax1, az2 - az1);
    const steps = Math.max(2, Math.ceil(lenA));

    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const px = ax1 + (ax2 - ax1) * t;
      const pz = az1 + (az2 - az1) * t;
      if (inAllowedJunction(px, pz)) continue;

      for (let j = i + 1; j < asphaltSegs.length; j++) {
        const b = asphaltSegs[j];
        const [tb0, tb1] = getTrimmedRoadSegmentRange(b);
        const bx1 = b.x1 + (b.x2 - b.x1) * tb0;
        const bz1 = b.z1 + (b.z2 - b.z1) * tb0;
        const bx2 = b.x1 + (b.x2 - b.x1) * tb1;
        const bz2 = b.z1 + (b.z2 - b.z1) * tb1;
        const dB = pointToSegmentDistance(px, pz, bx1, bz1, bx2, bz2);
        const pen = (a.width * 0.5 + b.width * 0.5) - dB;
        if (pen > 0.35) {
          overlaps.push({ segA: a.id, segB: b.id, x: Number(px.toFixed(1)), z: Number(pz.toFixed(1)) });
        }
      }
    }
  }
  return overlaps;
}
