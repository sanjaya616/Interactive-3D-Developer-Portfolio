import { WORLD_LANDMARKS } from '../data/portfolioData';
import { computeGroundHeight } from './physicsMath';
import {
  BUILDING_FOOTPRINTS,
  DIRECTIONAL_SIGNS,
  PADDOCK_CENTER,
  WORLD_HALF_SPAN,
  distanceToRoadEdge,
} from './worldLayout';
import { computeWaterShoreDepth } from './waterWaveMath';

export type PropKind =
  | 'crate'
  | 'cone'
  | 'lamp'
  | 'sign'
  | 'boulder'
  | 'bench'
  | 'fence'
  | 'contact-kiosk';

export interface PropNormal {
  nx: number;
  ny: number;
  nz: number;
}

export interface PlacedPropSpec {
  id: string;
  kind: PropKind;
  x: number;
  y: number;
  z: number;
  yaw: number;
  normal: PropNormal;
  scale: number;
  roadClearanceMeters: number;
  nearestEntranceMeters: number;
  label?: string;
}

export interface PlacePropOptions {
  id?: string;
  yaw?: number;
  scale?: number;
  label?: string;
  minRoadClearance?: number;
  minEntranceClearance?: number;
  allowFlatNormal?: boolean;
}

export interface PlacePropResult {
  accepted: boolean;
  reason?: string;
  prop?: PlacedPropSpec;
}

export function computeGroundNormal(x: number, z: number): PropNormal {
  const eps = 0.45;
  const hL = computeGroundHeight(x - eps, z);
  const hR = computeGroundHeight(x + eps, z);
  const hD = computeGroundHeight(x, z - eps);
  const hU = computeGroundHeight(x, z + eps);
  const vx = hL - hR;
  const vy = 2 * eps;
  const vz = hD - hU;
  const len = Math.hypot(vx, vy, vz) || 1;
  return {
    nx: vx / len,
    ny: vy / len,
    nz: vz / len,
  };
}

export function minDistanceToLandmarkEntrance(x: number, z: number): {
  distance: number;
  landmarkId: string;
} {
  let best = Infinity;
  let landmarkId = '';
  for (let i = 0; i < WORLD_LANDMARKS.length; i++) {
    const lm = WORLD_LANDMARKS[i];
    const d = Math.hypot(x - lm.position.x, z - lm.position.z);
    if (d < best) {
      best = d;
      landmarkId = lm.id;
    }
  }
  return { distance: best, landmarkId };
}

/**
 * Validated single entry-point for placing grounded decorative & yard props.
 * Enforces >= 4.0m clearance from any drivable road edge, >= 6.0m from landmark entrances,
 * dry land (zero water overlap), and snaps cleanly onto ground height + surface normal.
 */
export function placeProp(
  kind: PropKind,
  x: number,
  z: number,
  opts: PlacePropOptions = {},
): PlacePropResult {
  const minRoad = opts.minRoadClearance ?? 4.0;
  const minEntrance = opts.minEntranceClearance ?? 6.0;

  if (Math.abs(x) > WORLD_HALF_SPAN - 3 || Math.abs(z) > WORLD_HALF_SPAN - 3) {
    return { accepted: false, reason: 'Outside playable perimeter' };
  }
  if (computeWaterShoreDepth(x, z) > 0.02) {
    return { accepted: false, reason: 'Inside water basin' };
  }

  const { clearanceMeters, nearestRoadName } = distanceToRoadEdge(x, z);
  if (clearanceMeters < minRoad) {
    return {
      accepted: false,
      reason: `${clearanceMeters.toFixed(2)}m < ${minRoad.toFixed(1)}m from ${nearestRoadName}`,
    };
  }

  const { distance: entranceDist, landmarkId } = minDistanceToLandmarkEntrance(x, z);
  if (entranceDist < minEntrance) {
    return {
      accepted: false,
      reason: `${entranceDist.toFixed(2)}m < ${minEntrance.toFixed(1)}m from ${landmarkId} entrance`,
    };
  }

  for (let i = 0; i < BUILDING_FOOTPRINTS.length; i++) {
    const bp = BUILDING_FOOTPRINTS[i];
    if (
      Math.abs(x - bp.buildX) < bp.colliderHx + 0.8 &&
      Math.abs(z - bp.buildZ) < bp.colliderHz + 0.8
    ) {
      return {
        accepted: false,
        reason: `Inside building footprint (${bp.landmarkId})`,
      };
    }
  }

  const y = computeGroundHeight(x, z);
  const normal = opts.allowFlatNormal ? { nx: 0, ny: 1, nz: 0 } : computeGroundNormal(x, z);

  return {
    accepted: true,
    prop: {
      id: opts.id ?? `${kind}-${x.toFixed(1)}-${z.toFixed(1)}`,
      kind,
      x,
      y,
      z,
      yaw: opts.yaw ?? 0,
      normal,
      scale: opts.scale ?? 1.0,
      roadClearanceMeters: Number(clearanceMeters.toFixed(2)),
      nearestEntranceMeters: Number(entranceDist.toFixed(2)),
      label: opts.label,
    },
  };
}

export interface CrateYardDef {
  id: string;
  title: string;
  centerX: number;
  centerZ: number;
  yaw: number;
  rows: number;
  cols: number;
  spacing: number;
}

/** Two organized, fenced sleeping cargo yards off the road behind Delivery Depot & The Workshop. */
export const CRATE_YARD_DEFS: readonly CrateYardDef[] = [
  {
    id: 'yard-delivery',
    title: 'Delivery Depot Cargo Yard',
    centerX: -54.5,
    centerZ: 56.5,
    yaw: 0.22,
    rows: 2,
    cols: 3,
    spacing: 2.1,
  },
  {
    id: 'yard-workshop',
    title: 'Workshop Hardware Yard',
    centerX: 77.5,
    centerZ: -3.5,
    yaw: -0.18,
    rows: 2,
    cols: 3,
    spacing: 2.1,
  },
] as const;

const STREET_LAMP_CANDIDATES: readonly { id: string; x: number; z: number; yaw: number }[] = [
  { id: 'lamp-plaza-ne', x: 14.5, z: -14.5, yaw: -Math.PI * 0.75 },
  { id: 'lamp-plaza-sw', x: -14.5, z: 14.5, yaw: Math.PI * 0.25 },
  { id: 'lamp-ring-nw', x: -24.5, z: -31.8, yaw: -0.6 },
  { id: 'lamp-ring-ne', x: 16.0, z: -37.2, yaw: -2.2 },
  { id: 'lamp-ring-sw', x: -13.5, z: 38.6, yaw: 0.45 },
  { id: 'lamp-ring-se', x: 15.8, z: 36.8, yaw: -0.45 },
  { id: 'lamp-bridge-s', x: 48.2, z: -6.2, yaw: Math.PI * 0.5 },
  { id: 'lamp-paddock-n', x: PADDOCK_CENTER.x + 12.0, z: PADDOCK_CENTER.z - 26.8, yaw: 0 },
  { id: 'lamp-signal-w', x: 8.6, z: 36.5, yaw: -Math.PI * 0.5 },
  { id: 'lamp-lookout-n', x: 9.2, z: -56.0, yaw: -Math.PI * 0.5 },
  { id: 'lamp-arena-w', x: 67.5, z: 58.0, yaw: Math.PI * 0.5 },
  { id: 'lamp-forest-gate', x: -55.5, z: -69.5, yaw: 0.4 },
];

const BOULDER_CANDIDATES: readonly { id: string; x: number; z: number; scale: number; yaw: number }[] = [
  { id: 'boulder-1', x: -64.0, z: -38.0, scale: 1.55, yaw: 0.4 },
  { id: 'boulder-2', x: -82.0, z: -22.0, scale: 1.75, yaw: 1.3 },
  { id: 'boulder-3', x: -18.0, z: -84.0, scale: 1.9, yaw: 2.1 },
  { id: 'boulder-4', x: 24.0, z: -88.0, scale: 1.65, yaw: 0.8 },
  { id: 'boulder-5', x: 84.0, z: -36.0, scale: 1.7, yaw: 1.9 },
  { id: 'boulder-6', x: 88.0, z: -12.0, scale: 1.45, yaw: 2.6 },
  { id: 'boulder-7', x: 64.0, z: 28.0, scale: 1.35, yaw: 0.2 },
  { id: 'boulder-8', x: -72.0, z: 68.0, scale: 1.85, yaw: 1.1 },
  { id: 'boulder-9', x: -94.0, z: 12.0, scale: 1.65, yaw: 2.4 },
  { id: 'boulder-10', x: 18.0, z: 74.0, scale: 1.4, yaw: 0.7 },
  { id: 'boulder-11', x: -116.0, z: -50.0, scale: 2.1, yaw: 1.6 },
  { id: 'boulder-12', x: 112.0, z: -66.0, scale: 2.0, yaw: 2.8 },
];

const BENCH_CANDIDATES: readonly { id: string; x: number; z: number; yaw: number }[] = [
  { id: 'bench-plaza-se', x: 15.2, z: 12.6, yaw: -Math.PI * 0.75 },
  { id: 'bench-lookout', x: -12.0, z: -72.0, yaw: Math.PI * 0.5 },
  { id: 'bench-lagoon', x: 24.0, z: -5.2, yaw: 0 },
  { id: 'bench-paddock', x: PADDOCK_CENTER.x - 10.5, z: PADDOCK_CENTER.z - 26.2, yaw: 0 },
  { id: 'bench-signal', x: -10.8, z: 51.0, yaw: Math.PI * 0.5 },
];

const CONE_CANDIDATES: readonly { id: string; x: number; z: number }[] = [
  // Paddock service yard outer shoulder (>4m from Paddock oval road edge)
  { id: 'cone-pad-1', x: PADDOCK_CENTER.x + 18.0, z: PADDOCK_CENTER.z - 21.0 },
  { id: 'cone-pad-2', x: PADDOCK_CENTER.x + 21.5, z: PADDOCK_CENTER.z - 17.5 },
  { id: 'cone-pad-3', x: PADDOCK_CENTER.x - 19.0, z: PADDOCK_CENTER.z - 20.5 },
  { id: 'cone-pad-4', x: PADDOCK_CENTER.x - 22.0, z: PADDOCK_CENTER.z - 16.5 },
  // Stunt Arena perimeter safety cones (>= 4.2m outside apron edge)
  { id: 'cone-arena-1', x: 69.5, z: 42.0 },
  { id: 'cone-arena-2', x: 69.5, z: 68.0 },
  { id: 'cone-arena-3', x: 69.5, z: 92.0 },
  { id: 'cone-arena-4', x: 146.5, z: 54.0 },
  { id: 'cone-arena-5', x: 146.5, z: 86.0 },
  // Delivery cargo apron safety cones
  { id: 'cone-dep-1', x: -58.5, z: 52.0 },
  { id: 'cone-dep-2', x: -50.5, z: 61.5 },
];

export const CONTACT_KIOSK_DEF = {
  id: 'signal-contact-kiosk',
  x: 11.2,
  z: 40.5,
  yaw: -0.35,
  label: 'CONTACT & CV KIOSK',
} as const;

export interface ManagedPropInventory {
  crates: PlacedPropSpec[];
  fences: PlacedPropSpec[];
  cones: PlacedPropSpec[];
  lamps: PlacedPropSpec[];
  signs: PlacedPropSpec[];
  boulders: PlacedPropSpec[];
  benches: PlacedPropSpec[];
  contactKiosks: PlacedPropSpec[];
  all: PlacedPropSpec[];
}

export function buildManagedProps(): ManagedPropInventory {
  const crates: PlacedPropSpec[] = [];
  const fences: PlacedPropSpec[] = [];
  const cones: PlacedPropSpec[] = [];
  const lamps: PlacedPropSpec[] = [];
  const signs: PlacedPropSpec[] = [];
  const boulders: PlacedPropSpec[] = [];
  const benches: PlacedPropSpec[] = [];
  const contactKiosks: PlacedPropSpec[] = [];

  for (const yard of CRATE_YARD_DEFS) {
    const c = Math.cos(yard.yaw);
    const s = Math.sin(yard.yaw);
    for (let r = 0; r < yard.rows; r++) {
      for (let col = 0; col < yard.cols; col++) {
        const lx = (col - (yard.cols - 1) * 0.5) * yard.spacing;
        const lz = (r - (yard.rows - 1) * 0.5) * yard.spacing;
        const wx = yard.centerX + lx * c - lz * s;
        const wz = yard.centerZ + lx * s + lz * c;
        const res = placeProp('crate', wx, wz, {
          id: `${yard.id}-crate-${r}-${col}`,
          yaw: yard.yaw,
          scale: 1.0,
          allowFlatNormal: true,
        });
        if (res.accepted && res.prop) crates.push(res.prop);
      }
    }
    const fRes = placeProp('fence', yard.centerX, yard.centerZ, {
      id: `${yard.id}-fence`,
      yaw: yard.yaw,
      scale: 1.0,
      label: yard.title,
      allowFlatNormal: true,
    });
    if (fRes.accepted && fRes.prop) fences.push(fRes.prop);
  }

  for (const cn of CONE_CANDIDATES) {
    const res = placeProp('cone', cn.x, cn.z, { id: cn.id, yaw: 0, allowFlatNormal: true });
    if (res.accepted && res.prop) cones.push(res.prop);
  }

  for (const lp of STREET_LAMP_CANDIDATES) {
    const res = placeProp('lamp', lp.x, lp.z, { id: lp.id, yaw: lp.yaw, allowFlatNormal: true });
    if (res.accepted && res.prop) lamps.push(res.prop);
  }

  for (const sd of DIRECTIONAL_SIGNS) {
    const res = placeProp('sign', sd.x, sd.z, {
      id: sd.id,
      yaw: sd.rotY,
      label: `${sd.arrow} ${sd.label}`,
      allowFlatNormal: true,
    });
    if (res.accepted && res.prop) signs.push(res.prop);
  }

  for (const b of BOULDER_CANDIDATES) {
    const res = placeProp('boulder', b.x, b.z, { id: b.id, yaw: b.yaw, scale: b.scale });
    if (res.accepted && res.prop) boulders.push(res.prop);
  }

  for (const bn of BENCH_CANDIDATES) {
    const res = placeProp('bench', bn.x, bn.z, { id: bn.id, yaw: bn.yaw, allowFlatNormal: true });
    if (res.accepted && res.prop) benches.push(res.prop);
  }

  const kioskRes = placeProp('contact-kiosk', CONTACT_KIOSK_DEF.x, CONTACT_KIOSK_DEF.z, {
    id: CONTACT_KIOSK_DEF.id,
    yaw: CONTACT_KIOSK_DEF.yaw,
    label: CONTACT_KIOSK_DEF.label,
    allowFlatNormal: true,
  });
  if (kioskRes.accepted && kioskRes.prop) contactKiosks.push(kioskRes.prop);

  const all = [
    ...crates,
    ...fences,
    ...cones,
    ...lamps,
    ...signs,
    ...boulders,
    ...benches,
    ...contactKiosks,
  ];

  return {
    crates,
    fences,
    cones,
    lamps,
    signs,
    boulders,
    benches,
    contactKiosks,
    all,
  };
}

export interface PropAuditViolation {
  id: string;
  kind: PropKind;
  x: number;
  z: number;
  reason: string;
}

export interface PropAuditReport {
  totalChecked: number;
  passedCount: number;
  violations: PropAuditViolation[];
  props: PlacedPropSpec[];
}

export function auditPlacedProps(): PropAuditReport {
  const inventory = buildManagedProps();
  const violations: PropAuditViolation[] = [];

  for (const prop of inventory.all) {
    const res = placeProp(prop.kind, prop.x, prop.z, {
      id: prop.id,
      yaw: prop.yaw,
      scale: prop.scale,
      minRoadClearance: 4.0,
      minEntranceClearance: 6.0,
    });
    if (!res.accepted) {
      violations.push({
        id: prop.id,
        kind: prop.kind,
        x: prop.x,
        z: prop.z,
        reason: res.reason ?? 'Failed clearance check',
      });
    }
  }

  return {
    totalChecked: inventory.all.length,
    passedCount: inventory.all.length - violations.length,
    violations,
    props: inventory.all,
  };
}
