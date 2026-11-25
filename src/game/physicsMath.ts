import type { VehicleConfig, WorldLandmark } from '../types/portfolio';

export interface VehicleInputIntent {
  throttle: number; // -1 (reverse) to +1 (forward)
  steer: number; // -1 (right) to +1 (left)
  brake: boolean;
  handbrake?: boolean;
  boost: boolean;
  jump: boolean;
}

export interface DrivingDynamicsParams {
  maxForwardSpeed: number; // m/s
  maxReverseSpeed: number; // m/s
  engineAccel: number; // m/s^2
  boostMultiplier: number;
  boostRechargeRate: number;
  brakeDecel: number; // m/s^2
  coastDrag: number;
  lateralGrip: number;
  driftGrip: number;
  maxSteerRate: number; // rad/s
  jumpVelocity: number; // m/s
}

export const DEFAULT_DRIVING_PARAMS: DrivingDynamicsParams = {
  maxForwardSpeed: 24,
  maxReverseSpeed: 10,
  engineAccel: 28,
  boostMultiplier: 1.55,
  boostRechargeRate: 15,
  brakeDecel: 36,
  coastDrag: 3.1,
  lateralGrip: 7.8,
  driftGrip: 1.45,
  maxSteerRate: 2.35,
  jumpVelocity: 8.2,
};

export function computeDrivingParamsForVehicle(
  config?: Pick<VehicleConfig, 'engineTier' | 'suspensionTier' | 'boostTier' | 'chassisType' | 'wheelStyle'>,
): DrivingDynamicsParams {
  if (!config) return DEFAULT_DRIVING_PARAMS;
  const eng = config.engineTier ?? 1;
  const susp = config.suspensionTier ?? 1;
  const bst = config.boostTier ?? 1;
  const rallyBonus = config.chassisType === 'rally' ? 1.5 : 0;
  const sportGrip = config.wheelStyle === 'sport' ? 0.9 : 0;
  const duneJump = config.wheelStyle === 'dune' ? 0.45 : 0;

  return {
    maxForwardSpeed: 24 + (eng - 1) * 3.2 + rallyBonus,
    maxReverseSpeed: 10 + (eng - 1) * 1.1,
    engineAccel: 28 + (eng - 1) * 4.5,
    boostMultiplier: 1.55 + (bst - 1) * 0.12,
    boostRechargeRate: 15 + (bst - 1) * 5,
    brakeDecel: 36 + (susp - 1) * 3,
    coastDrag: 3.1,
    lateralGrip: 7.8 + (susp - 1) * 0.8 + sportGrip,
    driftGrip: 1.45,
    maxSteerRate: 2.35 + (susp - 1) * 0.14,
    jumpVelocity: 8.2 + (susp - 1) * 0.85 + duneJump,
  };
}

export function clampDt(rawDt: number): number {
  if (!Number.isFinite(rawDt) || rawDt <= 0) return 1 / 60;
  return Math.min(rawDt, 0.05);
}

/**
 * Pure vehicle kinematics / force calculation in local car space.
 * Supports acceleration, reverse, foot braking, handbrake drifting, boost, and jump.
 */
export function stepPlanarDriving(
  state: {
    forwardSpeed: number;
    lateralSpeed: number;
    boostCharge: number;
    isGrounded: boolean;
  },
  input: VehicleInputIntent,
  dt: number,
  params: DrivingDynamicsParams = DEFAULT_DRIVING_PARAMS,
): {
  nextForwardSpeed: number;
  nextLateralSpeed: number;
  yawDelta: number;
  nextBoostCharge: number;
  isBoosting: boolean;
  isDrifting: boolean;
  jumpImpulse: number;
} {
  const clampedDt = clampDt(dt);
  let vFwd = state.forwardSpeed;
  let vLat = state.lateralSpeed;
  let boostCharge = state.boostCharge;

  const handbrake = Boolean(input.handbrake);
  const wantsBoost = input.boost && input.throttle > 0.05 && boostCharge > 2 && !handbrake;
  const isBoosting = wantsBoost && state.isGrounded;

  if (wantsBoost) {
    boostCharge = Math.max(0, boostCharge - 32 * clampedDt);
  } else {
    boostCharge = Math.min(100, boostCharge + params.boostRechargeRate * clampedDt);
  }

  const maxSpeed = isBoosting
    ? params.maxForwardSpeed * params.boostMultiplier
    : params.maxForwardSpeed;

  let isDrifting = false;

  if (state.isGrounded) {
    if (input.brake) {
      const sign = Math.sign(vFwd);
      const decel = params.brakeDecel * clampedDt;
      if (Math.abs(vFwd) <= decel) {
        vFwd = 0;
      } else {
        vFwd -= sign * decel;
      }
    } else if (handbrake) {
      // Handbrake scrubs forward speed gently while kicking out rear lateral slip for drifting
      vFwd *= Math.exp(-1.55 * clampedDt);
      if (Math.abs(vFwd) > 5.5 && Math.abs(input.steer) > 0.15) {
        vLat += -input.steer * Math.min(11, Math.abs(vFwd) * 0.55) * clampedDt * 5.2;
        isDrifting = true;
      }
    } else if (Math.abs(input.throttle) > 0.01) {
      const accel =
        input.throttle > 0
          ? params.engineAccel * (isBoosting ? 1.45 : 1.0)
          : params.engineAccel * 0.72;
      vFwd += input.throttle * accel * clampedDt;
    } else {
      const decay = Math.exp(-params.coastDrag * clampedDt);
      vFwd *= decay;
      if (Math.abs(vFwd) < 0.05) vFwd = 0;
    }

    if (vFwd > maxSpeed) {
      vFwd = maxSpeed + (vFwd - maxSpeed) * Math.exp(-6 * clampedDt);
    } else if (vFwd < -params.maxReverseSpeed) {
      vFwd = -params.maxReverseSpeed;
    }

    const activeGrip = handbrake ? params.driftGrip : params.lateralGrip;
    vLat *= Math.exp(-activeGrip * clampedDt);
    if (Math.abs(vLat) > 2.4 && Math.abs(vFwd) > 5.0) {
      isDrifting = true;
    }
  } else {
    vFwd *= Math.exp(-0.25 * clampedDt);
    vLat *= Math.exp(-0.4 * clampedDt);
  }

  const speedRatio = Math.min(1, Math.abs(vFwd) / 5.5);
  const reverseSign = vFwd >= -0.2 ? 1 : -1;
  const driftTurnBonus = handbrake && Math.abs(vFwd) > 5 ? 1.38 : 1.0;
  const steerAuthority = state.isGrounded ? speedRatio : speedRatio * 0.35;
  const yawDelta =
    input.steer * params.maxSteerRate * driftTurnBonus * steerAuthority * reverseSign * clampedDt;

  const jumpImpulse = input.jump && state.isGrounded ? params.jumpVelocity : 0;

  return {
    nextForwardSpeed: vFwd,
    nextLateralSpeed: vLat,
    yawDelta,
    nextBoostCharge: boostCharge,
    isBoosting,
    isDrifting,
    jumpImpulse,
  };
}

export function speedMsToKmh(speedMs: number): number {
  return Math.round(Math.abs(speedMs) * 3.6);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function computeGroundHeight(x: number, z: number): number {
  let height = 0;

  // 1. Lookout Hill plateau at (0, -72)
  const distHill = Math.hypot(x, z + 72);
  if (distHill < 26) {
    const hillWeight = 1 - smoothstep(13.5, 25.5, distHill);
    height = Math.max(height, 3.6 * hillWeight);
  }

  // Smooth ramp road leading up Lookout Hill (x in [-6.5, 6.5], z in [-60, -38])
  if (Math.abs(x) < 7.5 && z <= -38 && z >= -62) {
    const rampT = smoothstep(-38, -60, z);
    const sideBlend = 1 - smoothstep(4.5, 7.5, Math.abs(x));
    height = Math.max(height, 3.6 * rampT * sideBlend);
  }

  // Hidden trail gentle west slope connecting (-24, -56) up to Lookout Hill (-12, -68)
  if (x >= -26 && x <= -8 && z >= -74 && z <= -52) {
    const trailT = smoothstep(-52, -70, z) * smoothstep(-26, -12, x);
    height = Math.max(height, 3.6 * trailT * 0.9);
  }

  // 2. Emerald Lagoon channel basin (x in [16, 74], z in [-30, -14])
  if (x >= 16 && x <= 74 && z >= -30 && z <= -14) {
    const edgeX = Math.min(smoothstep(16, 21, x), 1 - smoothstep(69, 74, x));
    const edgeZ = Math.min(smoothstep(-30, -25, z), 1 - smoothstep(-19, -14, z));
    height = Math.min(height, -1.65 * edgeX * edgeZ);
  }

  // 3. South Cove pond basin around (-18, 66)
  const distCove = Math.hypot(x + 18, z - 66);
  if (distCove < 13) {
    const coveDepth = 1 - smoothstep(7, 13, distCove);
    height = Math.min(height, -1.55 * coveDepth);
  }

  // 4. Outer perimeter scenic hills (r > 86m)
  const distOrigin = Math.hypot(x, z);
  if (distOrigin > 86) {
    const blend = smoothstep(86, 118, distOrigin);
    const wave =
      Math.sin(x * 0.05) * Math.cos(z * 0.05) * 3.1 +
      Math.sin((x - z) * 0.032) * 1.8 +
      3.8;
    height += Math.max(0, wave) * blend;
  }

  return height;
}

export const MAIN_LAGOON_BRIDGE = {
  id: 'main-lagoon-bridge',
  x: 40,
  zCenter: -22,
  halfLength: 10.5,
  halfWidth: 3.65,
  deckHalfWidth: 3.45,
  baseY: 0.03,
  archRise: 1.25,
} as const;

export const RING_LAGOON_VIADUCT = {
  id: 'ring-lagoon-viaduct',
  radius: 34.0,
  halfWidth: 2.85,
  deckHalfWidth: 2.65,
  angStart: -1.08,
  angEnd: -0.40,
  baseY: 0.025,
  archRise: 0.9,
} as const;

export const SOUTH_COVE_BRIDGE = {
  id: 'south-cove-bridge',
  xCenter: -18,
  z: 62,
  halfLength: 11.5,
  halfWidth: 1.85,
  deckHalfWidth: 1.72,
  baseY: 0.03,
  archRise: 0.85,
} as const;

function archCurveY(uNorm: number, baseY: number, archRise: number): number {
  const u = Math.max(0, Math.min(1, uNorm));
  return baseY + archRise * 0.5 * (1 + Math.cos(Math.PI * u));
}

export function computeBridgeSurfaceY(x: number, z: number): number | null {
  let bestY: number | null = null;

  // 1. Main Emerald Lagoon Arched Bridge (x = 40, z in [-32.5, -11.5])
  if (
    Math.abs(x - MAIN_LAGOON_BRIDGE.x) <= MAIN_LAGOON_BRIDGE.halfWidth &&
    Math.abs(z - MAIN_LAGOON_BRIDGE.zCenter) <= MAIN_LAGOON_BRIDGE.halfLength
  ) {
    const u = Math.abs(z - MAIN_LAGOON_BRIDGE.zCenter) / MAIN_LAGOON_BRIDGE.halfLength;
    const y = archCurveY(u, MAIN_LAGOON_BRIDGE.baseY, MAIN_LAGOON_BRIDGE.archRise);
    bestY = bestY === null ? y : Math.max(bestY, y);
  }

  // 2. NW Emerald Lagoon Curved Ring Viaduct (r = 34, ang in [-1.08, -0.40])
  if (x > 10 && z < -5) {
    const r = Math.hypot(x, z);
    if (Math.abs(r - RING_LAGOON_VIADUCT.radius) <= RING_LAGOON_VIADUCT.halfWidth) {
      const ang = Math.atan2(z, x);
      if (ang >= RING_LAGOON_VIADUCT.angStart && ang <= RING_LAGOON_VIADUCT.angEnd) {
        const angMid = (RING_LAGOON_VIADUCT.angStart + RING_LAGOON_VIADUCT.angEnd) * 0.5;
        const angHalf = (RING_LAGOON_VIADUCT.angEnd - RING_LAGOON_VIADUCT.angStart) * 0.5;
        const u = Math.abs(ang - angMid) / angHalf;
        const y = archCurveY(u, RING_LAGOON_VIADUCT.baseY, RING_LAGOON_VIADUCT.archRise);
        bestY = bestY === null ? y : Math.max(bestY, y);
      }
    }
  }

  // 3. South Cove Oasis Timber Crossing (z = 62, x in [-29.5, -6.5])
  if (
    Math.abs(z - SOUTH_COVE_BRIDGE.z) <= SOUTH_COVE_BRIDGE.halfWidth &&
    Math.abs(x - SOUTH_COVE_BRIDGE.xCenter) <= SOUTH_COVE_BRIDGE.halfLength
  ) {
    const u = Math.abs(x - SOUTH_COVE_BRIDGE.xCenter) / SOUTH_COVE_BRIDGE.halfLength;
    const y = archCurveY(u, SOUTH_COVE_BRIDGE.baseY, SOUTH_COVE_BRIDGE.archRise);
    bestY = bestY === null ? y : Math.max(bestY, y);
  }

  return bestY;
}

export interface BridgeDeckColliderSegment {
  bridgeId: string;
  x: number;
  y: number;
  z: number;
  hx: number;
  hy: number;
  hz: number;
  pitchX: number;
  yawY: number;
  rollZ: number;
}

/**
 * Generates overlapping Rapier cuboid chord segments matching the exact arch curves of all 3 bridges
 * so 4-wheel raycasts and terrain transitions remain seamless with zero vertical jumps or gaps.
 */
export function getBridgeColliderSegments(): BridgeDeckColliderSegment[] {
  const segments: BridgeDeckColliderSegment[] = [];

  // 1. Main Emerald Lagoon Bridge (10 chord segments along Z)
  const mainSteps = 10;
  const mainThickness = 0.16;
  const zMin = MAIN_LAGOON_BRIDGE.zCenter - MAIN_LAGOON_BRIDGE.halfLength;
  const zMax = MAIN_LAGOON_BRIDGE.zCenter + MAIN_LAGOON_BRIDGE.halfLength;
  for (let i = 0; i < mainSteps; i++) {
    const z0 = zMin + (i / mainSteps) * (zMax - zMin);
    const z1 = zMin + ((i + 1) / mainSteps) * (zMax - zMin);
    const y0 = computeBridgeSurfaceY(MAIN_LAGOON_BRIDGE.x, z0) ?? MAIN_LAGOON_BRIDGE.baseY;
    const y1 = computeBridgeSurfaceY(MAIN_LAGOON_BRIDGE.x, z1) ?? MAIN_LAGOON_BRIDGE.baseY;
    const dz = z1 - z0;
    const dy = y1 - y0;
    const chordLen = Math.hypot(dz, dy);
    const pitchX = -Math.atan2(dy, dz);
    segments.push({
      bridgeId: MAIN_LAGOON_BRIDGE.id,
      x: MAIN_LAGOON_BRIDGE.x,
      y: (y0 + y1) * 0.5 - mainThickness,
      z: (z0 + z1) * 0.5,
      hx: MAIN_LAGOON_BRIDGE.deckHalfWidth,
      hy: mainThickness,
      hz: chordLen * 0.5 + 0.14,
      pitchX,
      yawY: 0,
      rollZ: 0,
    });
  }

  // 2. NW Ring Viaduct (10 curved chord segments along arc r = 34)
  const ringSteps = 10;
  const ringThickness = 0.15;
  const { radius, angStart, angEnd, deckHalfWidth } = RING_LAGOON_VIADUCT;
  for (let i = 0; i < ringSteps; i++) {
    const a0 = angStart + (i / ringSteps) * (angEnd - angStart);
    const a1 = angStart + ((i + 1) / ringSteps) * (angEnd - angStart);
    const x0 = Math.cos(a0) * radius;
    const z0 = Math.sin(a0) * radius;
    const x1 = Math.cos(a1) * radius;
    const z1 = Math.sin(a1) * radius;
    const y0 = computeBridgeSurfaceY(x0, z0) ?? RING_LAGOON_VIADUCT.baseY;
    const y1 = computeBridgeSurfaceY(x1, z1) ?? RING_LAGOON_VIADUCT.baseY;
    const dx = x1 - x0;
    const dz = z1 - z0;
    const dy = y1 - y0;
    const horizLen = Math.hypot(dx, dz);
    const chordLen = Math.hypot(horizLen, dy);
    const yawY = Math.atan2(dx, dz);
    const pitchX = -Math.atan2(dy, horizLen);
    segments.push({
      bridgeId: RING_LAGOON_VIADUCT.id,
      x: (x0 + x1) * 0.5,
      y: (y0 + y1) * 0.5 - ringThickness,
      z: (z0 + z1) * 0.5,
      hx: deckHalfWidth,
      hy: ringThickness,
      hz: chordLen * 0.5 + 0.18,
      pitchX,
      yawY,
      rollZ: 0,
    });
  }

  // 3. South Cove Oasis Bridge (8 chord segments along X)
  const coveSteps = 8;
  const coveThickness = 0.14;
  const xMin = SOUTH_COVE_BRIDGE.xCenter - SOUTH_COVE_BRIDGE.halfLength;
  const xMax = SOUTH_COVE_BRIDGE.xCenter + SOUTH_COVE_BRIDGE.halfLength;
  for (let i = 0; i < coveSteps; i++) {
    const x0 = xMin + (i / coveSteps) * (xMax - xMin);
    const x1 = xMin + ((i + 1) / coveSteps) * (xMax - xMin);
    const y0 = computeBridgeSurfaceY(x0, SOUTH_COVE_BRIDGE.z) ?? SOUTH_COVE_BRIDGE.baseY;
    const y1 = computeBridgeSurfaceY(x1, SOUTH_COVE_BRIDGE.z) ?? SOUTH_COVE_BRIDGE.baseY;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const chordLen = Math.hypot(dx, dy);
    const rollZ = Math.atan2(dy, dx);
    segments.push({
      bridgeId: SOUTH_COVE_BRIDGE.id,
      x: (x0 + x1) * 0.5,
      y: (y0 + y1) * 0.5 - coveThickness,
      z: SOUTH_COVE_BRIDGE.z,
      hx: chordLen * 0.5 + 0.14,
      hy: coveThickness,
      hz: SOUTH_COVE_BRIDGE.deckHalfWidth,
      pitchX: 0,
      yawY: 0,
      rollZ,
    });
  }

  return segments;
}

export function findNearestLandmark(
  x: number,
  z: number,
  landmarks: WorldLandmark[],
): { landmark: WorldLandmark | null; distance: number } {
  let nearest: WorldLandmark | null = null;
  let bestDist = Infinity;

  for (const lm of landmarks) {
    const d = Math.hypot(x - lm.position.x, z - lm.position.z);
    if (d <= lm.radius && d < bestDist) {
      bestDist = d;
      nearest = lm;
    }
  }

  return { landmark: nearest, distance: bestDist };
}

export function getZoneName(x: number, z: number, landmarks: WorldLandmark[]): string {
  const { landmark } = findNearestLandmark(x, z, landmarks);
  if (landmark) return landmark.zoneLabel;

  if (Math.abs(x - MAIN_LAGOON_BRIDGE.x) <= 4.2 && z >= -32.5 && z <= -11.5) {
    return 'Emerald Lagoon Bridge';
  }
  const r = Math.hypot(x, z);
  const ang = Math.atan2(z, x);
  if (
    x > 10 &&
    z < -5 &&
    Math.abs(r - RING_LAGOON_VIADUCT.radius) <= 3.4 &&
    ang >= RING_LAGOON_VIADUCT.angStart &&
    ang <= RING_LAGOON_VIADUCT.angEnd
  ) {
    return 'Lagoon Ring Viaduct';
  }
  if (Math.abs(z - SOUTH_COVE_BRIDGE.z) <= 2.4 && Math.abs(x - SOUTH_COVE_BRIDGE.xCenter) <= 12) {
    return 'South Cove Footbridge';
  }
  if (Math.abs(x + 42) <= 4.5 && z >= -13 && z <= 5) {
    return 'West Ridge Tunnel';
  }
  if (x >= -34 && x <= -12 && z >= -68 && z <= -46) {
    return 'Hidden Pine Trail';
  }
  if (Math.hypot(x + 18, z - 66) < 15) {
    return 'South Cove Oasis';
  }

  const dist = Math.hypot(x, z);
  if (dist < 14) return 'Starting Plaza';
  if (dist < 46) return 'Sunlit Ring Road';
  return 'Outer Valley';
}
