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

export function computeBridgeSurfaceY(x: number, z: number): number | null {
  if (Math.abs(x - 40) > 3.6 || z < -32 || z > -12) return null;
  if (z >= -27 && z <= -17) return 0.9;
  if (z < -27) return 0.9 * smoothstep(-32, -27, z);
  return 0.9 * (1 - smoothstep(-17, -12, z));
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

  if (Math.abs(x - 40) <= 4.2 && z >= -32 && z <= -12) {
    return 'Emerald Lagoon Bridge';
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
