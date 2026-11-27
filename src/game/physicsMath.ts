import type { VehicleConfig, WaterDriveState, WorldLandmark } from '../types/portfolio';
import { STUNT_ARENA_RAMPS, DOUBLE_JUMP_PLATFORMS } from '../data/portfolioData';

export interface VehicleInputIntent {
  throttle: number; // -1 (reverse) to +1 (forward)
  steer: number; // -1 (right) to +1 (left)
  brake: boolean;
  handbrake?: boolean;
  boost: boolean;
  jump: boolean;
  jumpJustPressed?: boolean;
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
 * Also supports water drag/traction modifiers when driving through shallow water.
 */
export function stepPlanarDriving(
  state: {
    forwardSpeed: number;
    lateralSpeed: number;
    boostCharge: number;
    isGrounded: boolean;
    waterDragScale?: number;
    waterGripScale?: number;
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
  const wDrag = state.waterDragScale ?? 1.0;
  const wGrip = state.waterGripScale ?? 1.0;

  const handbrake = Boolean(input.handbrake);
  const wantsBoost = input.boost && input.throttle > 0.05 && boostCharge > 2 && !handbrake;
  const isBoosting = wantsBoost && state.isGrounded;

  if (wantsBoost) {
    boostCharge = Math.max(0, boostCharge - 32 * clampedDt);
  } else {
    boostCharge = Math.min(100, boostCharge + params.boostRechargeRate * clampedDt);
  }

  const maxSpeed = (isBoosting
    ? params.maxForwardSpeed * params.boostMultiplier
    : params.maxForwardSpeed) / Math.max(1, wDrag * 0.85);

  let isDrifting = false;

  if (state.isGrounded) {
    if (input.brake) {
      const sign = Math.sign(vFwd);
      const decel = params.brakeDecel * Math.max(0.65, wGrip) * clampedDt;
      if (Math.abs(vFwd) <= decel) {
        vFwd = 0;
      } else {
        vFwd -= sign * decel;
      }
    } else if (handbrake) {
      // Handbrake scrubs forward speed gently while kicking out rear lateral slip for drifting
      vFwd *= Math.exp(-1.55 * clampedDt);
      if (Math.abs(vFwd) > 5.2 && Math.abs(input.steer) > 0.15) {
        vLat += -input.steer * Math.min(11.5, Math.abs(vFwd) * 0.58) * clampedDt * 5.2;
        isDrifting = true;
      }
    } else if (Math.abs(input.throttle) > 0.01) {
      const accel =
        (input.throttle > 0
          ? params.engineAccel * (isBoosting ? 1.45 : 1.0)
          : params.engineAccel * 0.72) / Math.max(1, wDrag * 0.65);
      vFwd += input.throttle * accel * clampedDt;
    } else {
      const decay = Math.exp(-params.coastDrag * wDrag * clampedDt);
      vFwd *= decay;
      if (Math.abs(vFwd) < 0.05) vFwd = 0;
    }

    if (vFwd > maxSpeed) {
      vFwd = maxSpeed + (vFwd - maxSpeed) * Math.exp(-6 * clampedDt);
    } else if (vFwd < -params.maxReverseSpeed) {
      vFwd = -params.maxReverseSpeed;
    }

    const activeGrip = (handbrake ? params.driftGrip : params.lateralGrip) * wGrip;
    vLat *= Math.exp(-activeGrip * clampedDt);
    if (Math.abs(vLat) > 2.35 && Math.abs(vFwd) > 4.8) {
      isDrifting = true;
    }
  } else {
    vFwd *= Math.exp(-0.25 * clampedDt);
    vLat *= Math.exp(-0.4 * clampedDt);
  }

  const speedRatio = Math.min(1, Math.abs(vFwd) / 5.5);
  const reverseSign = vFwd >= -0.2 ? 1 : -1;
  const driftTurnBonus = handbrake && Math.abs(vFwd) > 5 ? 1.38 : 1.0;
  const waterSteerFactor = wGrip < 0.9 ? 0.78 : 1.0;
  const steerAuthority = (state.isGrounded ? speedRatio : speedRatio * 0.42) * waterSteerFactor;
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

// =========================================================================
// DOUBLE-JUMP STATE MACHINE (strict edge trigger + airtime limit)
// =========================================================================
export interface DoubleJumpState {
  jumpsRemaining: number;
  maxJumps: number;
  launchCooldownSec: number;
  airTimeSec: number;
}

export function createInitialDoubleJumpState(): DoubleJumpState {
  return {
    jumpsRemaining: 2,
    maxJumps: 2,
    launchCooldownSec: 0,
    airTimeSec: 0,
  };
}

export function stepDoubleJumpState(
  prev: DoubleJumpState,
  opts: {
    isGrounded: boolean;
    verticalVel: number;
    jumpJustPressed: boolean;
    isOverturned: boolean;
    inputBlocked: boolean;
    dt: number;
    baseJumpVelocity: number;
  },
): {
  next: DoubleJumpState;
  triggeredJump: 'none' | 'primary' | 'double';
  jumpVelocityY: number;
  landedImpactVel: number;
} {
  const dt = clampDt(opts.dt);
  let jumpsRemaining = prev.jumpsRemaining;
  let cooldown = Math.max(0, prev.launchCooldownSec - dt);
  let airTimeSec = prev.airTimeSec;
  let triggeredJump: 'none' | 'primary' | 'double' = 'none';
  let jumpVelocityY = 0;
  let landedImpactVel = 0;

  if (opts.isGrounded) {
    if (prev.airTimeSec > 0.18 && opts.verticalVel < -2.2) {
      landedImpactVel = Math.abs(opts.verticalVel);
    }
    const confirmedTouchdown = prev.airTimeSec > 0.18 && opts.verticalVel <= 0.5;
    airTimeSec = 0;
    if (confirmedTouchdown || (cooldown <= 0 && opts.verticalVel <= 2.2)) {
      jumpsRemaining = prev.maxJumps;
      cooldown = 0;
    }
  } else {
    airTimeSec += dt;
  }

  if (opts.jumpJustPressed && !opts.inputBlocked && !opts.isOverturned) {
    if (opts.isGrounded && jumpsRemaining >= 1) {
      triggeredJump = 'primary';
      jumpVelocityY = opts.baseJumpVelocity;
      jumpsRemaining = Math.max(1, prev.maxJumps - 1);
      cooldown = 0.16;
    } else if (!opts.isGrounded && jumpsRemaining > 0 && cooldown <= 0.04) {
      triggeredJump = 'double';
      jumpVelocityY = opts.baseJumpVelocity * 0.96;
      jumpsRemaining = 0;
      cooldown = 0.14;
    }
  }

  return {
    next: {
      jumpsRemaining,
      maxJumps: prev.maxJumps,
      launchCooldownSec: cooldown,
      airTimeSec,
    },
    triggeredJump,
    jumpVelocityY,
    landedImpactVel,
  };
}

// =========================================================================
// ARCADE DRIFT SCORING & ANTI-CHEESE VALIDATOR
// =========================================================================
export interface DriftScoreState {
  activeScore: number;
  totalBankedScore: number;
  comboMultiplier: number;
  driftDurationSec: number;
  wasDrifting: boolean;
  lastCleanBankScore: number;
}

export function createInitialDriftScoreState(): DriftScoreState {
  return {
    activeScore: 0,
    totalBankedScore: 0,
    comboMultiplier: 1.0,
    driftDurationSec: 0,
    wasDrifting: false,
    lastCleanBankScore: 0,
  };
}

export function stepDriftScoring(
  prev: DriftScoreState,
  opts: {
    forwardSpeed: number;
    lateralSpeed: number;
    isGrounded: boolean;
    isDrifting: boolean;
    crashedOrOverturned: boolean;
    dt: number;
  },
): {
  next: DriftScoreState;
  bankedNow: number;
  penalizedNow: boolean;
} {
  const dt = clampDt(opts.dt);
  const absFwd = Math.abs(opts.forwardSpeed);
  const absLat = Math.abs(opts.lateralSpeed);
  const speedMs = Math.hypot(absFwd, absLat);
  const slipAngleRad = Math.atan2(absLat, Math.max(1.0, absFwd));

  // Cancel active drift score if vehicle crashed/overturned or slowed into zero-speed donuts
  if (opts.crashedOrOverturned || (prev.wasDrifting && speedMs < 2.1)) {
    return {
      next: {
        ...prev,
        activeScore: 0,
        comboMultiplier: 1.0,
        driftDurationSec: 0,
        wasDrifting: false,
        lastCleanBankScore: 0,
      },
      bankedNow: 0,
      penalizedNow: prev.activeScore > 25,
    };
  }

  const validDrift =
    opts.isGrounded &&
    opts.isDrifting &&
    absFwd >= 4.5 &&
    absLat >= 1.9 &&
    slipAngleRad >= 0.16;

  if (validDrift) {
    const duration = prev.driftDurationSec + dt;
    const combo = Math.min(3.5, 1.0 + Math.floor(duration / 1.1) * 0.5);
    const slipQuality = Math.min(1.8, slipAngleRad / 0.45);
    const speedFactor = Math.min(1.6, speedMs / 16.0);
    const gain = 145 * slipQuality * speedFactor * combo * dt;
    return {
      next: {
        activeScore: prev.activeScore + gain,
        totalBankedScore: prev.totalBankedScore,
        comboMultiplier: combo,
        driftDurationSec: duration,
        wasDrifting: true,
        lastCleanBankScore: 0,
      },
      bankedNow: 0,
      penalizedNow: false,
    };
  }

  // Smooth exit: bank score cleanly when recovering traction at speed
  if (prev.wasDrifting && prev.activeScore >= 18) {
    const cleanBonus = absFwd >= 6.0 ? 1.15 : 1.0;
    const banked = Math.round(prev.activeScore * cleanBonus);
    return {
      next: {
        activeScore: 0,
        totalBankedScore: prev.totalBankedScore + banked,
        comboMultiplier: 1.0,
        driftDurationSec: 0,
        wasDrifting: false,
        lastCleanBankScore: banked,
      },
      bankedNow: banked,
      penalizedNow: false,
    };
  }

  return {
    next: {
      ...prev,
      activeScore: 0,
      comboMultiplier: 1.0,
      driftDurationSec: 0,
      wasDrifting: false,
    },
    bankedNow: 0,
    penalizedNow: false,
  };
}

// =========================================================================
// SHALLOW WATER HYDRODYNAMICS & WATER ENTRY/EXIT CLASSIFICATION
// =========================================================================
export interface WaterPhysicsSample {
  waterState: WaterDriveState;
  waterDepth: number;
  buoyancyAccelY: number;
  waterDragScale: number;
  waterGripScale: number;
  splashIntensity: number;
  requiresDeepRescue: boolean;
}

export function evaluateWaterPhysics(opts: {
  x: number;
  y: number;
  z: number;
  vy: number;
  speedMs: number;
  shoreDepth: number;
  waterSurfaceY: number;
  onBridge: boolean;
  prevWaterState: WaterDriveState;
}): WaterPhysicsSample {
  if (opts.onBridge || opts.shoreDepth <= 0.01) {
    const waterState: WaterDriveState =
      opts.prevWaterState === 'shallow' || opts.prevWaterState === 'entry' ? 'exit' : 'dry';
    return {
      waterState,
      waterDepth: 0,
      buoyancyAccelY: 0,
      waterDragScale: 1.0,
      waterGripScale: 1.0,
      splashIntensity: waterState === 'exit' ? Math.min(1, opts.speedMs / 10) * 0.5 : 0,
      requiresDeepRescue: false,
    };
  }

  const groundY = computeGroundHeight(opts.x, opts.z);
  const depth = Math.max(0, opts.waterSurfaceY - groundY);

  // Emerald Lagoon is deep navigable-hazardous water; South Cove & Amphibious Lagoon are shallow
  const inEmeraldLagoon = opts.z < 15 && opts.x > 14;
  if (inEmeraldLagoon && (depth > 0.92 || opts.shoreDepth > 2.2)) {
    return {
      waterState: 'deep-warning',
      waterDepth: depth,
      buoyancyAccelY: 0,
      waterDragScale: 1.65,
      waterGripScale: 0.45,
      splashIntensity: 1.0,
      requiresDeepRescue: depth > 1.05 || opts.y < opts.waterSurfaceY - 0.55,
    };
  }

  // Shallow drivable water (South Cove + Amphibious Lagoon District)
  const submergedDepth = Math.max(0, opts.waterSurfaceY + 0.14 - (opts.y - 0.48));
  const buoyancyAccelY =
    submergedDepth > 0
      ? Math.min(24, submergedDepth * 26 - opts.vy * 4.5)
      : 0;

  const isEntry = opts.prevWaterState === 'dry' || opts.prevWaterState === 'exit';
  const waterState: WaterDriveState = isEntry ? 'entry' : 'shallow';
  const dragScale = 1.0 + Math.min(0.65, depth * 0.85);
  const gripScale = Math.max(0.56, 0.86 - depth * 0.36);
  const splashIntensity = Math.min(1, (opts.speedMs / 14) * (0.45 + Math.min(0.8, depth)));

  return {
    waterState,
    waterDepth: Number(depth.toFixed(2)),
    buoyancyAccelY,
    waterDragScale: dragScale,
    waterGripScale: gripScale,
    splashIntensity,
    requiresDeepRescue: false,
  };
}

// =========================================================================
// SAFE VEHICLE RECOVERY & OVERTURN DETECTION
// =========================================================================
export function isVehicleOverturned(upY: number): boolean {
  return upY < 0.28;
}

export function computeSafeRecoveryPose(
  curX: number,
  curZ: number,
  curYaw: number,
  isBlocked: (x: number, z: number) => boolean,
  getWaterShoreDepthFn: (x: number, z: number) => number,
): { x: number; y: number; z: number; yaw: number } {
  const radii = [0, 3.0, 6.0, 9.5, 13.5];
  const angles = 8;

  for (const r of radii) {
    const steps = r === 0 ? 1 : angles;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const cx = curX + Math.cos(a) * r;
      const cz = curZ + Math.sin(a) * r;
      if (Math.abs(cx) > 154 || Math.abs(cz) > 154) continue;
      if (isBlocked(cx, cz)) continue;
      const onBridge = computeBridgeSurfaceY(cx, cz);
      const gy = computeGroundHeight(cx, cz);
      const inDeepWater = onBridge === null && getWaterShoreDepthFn(cx, cz) > 1.5 && gy < -0.95;
      if (inDeepWater) continue;
      const surfY = onBridge !== null ? Math.max(gy, onBridge) : gy;
      return { x: cx, y: surfY + 0.72, z: cz, yaw: curYaw };
    }
  }

  // Fallback safe plaza if boxed in everywhere
  return { x: 0, y: 0.72, z: 6, yaw: 0 };
}

export function speedMsToKmh(speedMs: number): number {
  return Math.round(Math.abs(speedMs) * 3.6);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export const FOREST_BROOK_BRIDGE = {
  id: 'forest-brook-bridge',
  xCenter: -104,
  z: -84,
  halfLength: 7.5,
  halfWidth: 1.95,
  deckHalfWidth: 1.82,
  baseY: 1.15,
  archRise: 0.62,
} as const;

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

  // 4. Outer perimeter scenic hills (r > 86m), cleanly masked out for flat/carved expansion districts
  const distOrigin = Math.hypot(x, z);
  if (distOrigin > 86) {
    // Flatten mask for Amphibious Lagoon District (-36, 118), Stunt & Drift Arena (106, 74), and Forest Trail Brook
    const arenaFlatMask =
      smoothstep(70, 78, x) *
      (1 - smoothstep(144, 154, x)) *
      smoothstep(32, 42, z) *
      (1 - smoothstep(128, 138, z));
    const amphFlatMask = 1 - smoothstep(21, 31, Math.hypot(x + 36, z - 118));
    const forestBenchMask =
      smoothstep(-138, -128, x) *
      (1 - smoothstep(-66, -56, x)) *
      smoothstep(-114, -104, z) *
      (1 - smoothstep(-48, -40, z));

    const suppressOuter = Math.min(1, arenaFlatMask + amphFlatMask + forestBenchMask * 0.7);
    const blend = smoothstep(86, 118, distOrigin) * (1 - suppressOuter);
    const wave =
      Math.sin(x * 0.05) * Math.cos(z * 0.05) * 3.1 +
      Math.sin((x - z) * 0.032) * 1.8 +
      3.8;
    height += Math.max(0, wave) * blend;

    // Gentle rolling woodland height inside Forest Trail District (~1.15m bench matching bridge abutments)
    if (forestBenchMask > 0.01) {
      const benchY =
        1.15 * forestBenchMask +
        Math.sin(x * 0.09) * Math.cos(z * 0.09) * 0.25 * forestBenchMask;
      height = Math.max(height, benchY);
    }
  }

  // Forest Brook stream trough strictly beneath Forest Brook Timber Bridge (x in [-109.5, -98.5], z in [-89, -79])
  if (x >= -109.5 && x <= -98.5 && z >= -89 && z <= -79) {
    const uX = 1 - smoothstep(1.5, 5.5, Math.abs(x + 104));
    const uZ = 1 - smoothstep(2.0, 5.0, Math.abs(z + 84));
    height -= 1.05 * uX * uZ;
  }

  // 5. Amphibious Lagoon shallow drivable basin centered at (-36, 118), r = 22.5m
  const distAmph = Math.hypot(x + 36, z - 118);
  if (distAmph < 24.5) {
    const basinProfile = 1 - smoothstep(16.5, 24.5, distAmph);
    // Shallow -0.68m bed -> water at -0.35m => smooth 0.33m shallow water depth!
    height = Math.min(height, -0.68 * basinProfile);
  }

  // 6. Stunt & Drift Arena sculpted launch ramps
  for (let i = 0; i < STUNT_ARENA_RAMPS.length; i++) {
    const ramp = STUNT_ARENA_RAMPS[i];
    const dx = x - ramp.x;
    const dz = z - ramp.z;
    const c = Math.cos(ramp.yaw);
    const s = Math.sin(ramp.yaw);
    const lx = dx * c - dz * s;
    const lz = dx * s + dz * c;
    const hw = ramp.width * 0.5;
    const hl = ramp.length * 0.5;
    if (Math.abs(lx) <= hw && Math.abs(lz) <= hl) {
      const t = (lz + hl) / ramp.length; // 0 at entry tail -> 1 at launch lip
      const sideBevel = 1 - smoothstep(hw - 0.35, hw, Math.abs(lx)) * 0.05;
      const rampY = ramp.height * Math.pow(t, 1.32) * sideBevel;
      height = Math.max(height, rampY);
    }
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
  halfLength: 12.5,
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

  // 3. South Cove Oasis Timber Crossing (z = 62, x in [-30.5, -5.5])
  if (
    Math.abs(z - SOUTH_COVE_BRIDGE.z) <= SOUTH_COVE_BRIDGE.halfWidth &&
    Math.abs(x - SOUTH_COVE_BRIDGE.xCenter) <= SOUTH_COVE_BRIDGE.halfLength
  ) {
    const u = Math.abs(x - SOUTH_COVE_BRIDGE.xCenter) / SOUTH_COVE_BRIDGE.halfLength;
    const y = archCurveY(u, SOUTH_COVE_BRIDGE.baseY, SOUTH_COVE_BRIDGE.archRise);
    bestY = bestY === null ? y : Math.max(bestY, y);
  }

  // 4. Forest Trail Brook Timber Bridge (z = -84, x in [-111.5, -96.5])
  if (
    Math.abs(z - FOREST_BROOK_BRIDGE.z) <= FOREST_BROOK_BRIDGE.halfWidth &&
    Math.abs(x - FOREST_BROOK_BRIDGE.xCenter) <= FOREST_BROOK_BRIDGE.halfLength
  ) {
    const u = Math.abs(x - FOREST_BROOK_BRIDGE.xCenter) / FOREST_BROOK_BRIDGE.halfLength;
    const tAcross =
      (x - (FOREST_BROOK_BRIDGE.xCenter - FOREST_BROOK_BRIDGE.halfLength)) /
      (FOREST_BROOK_BRIDGE.halfLength * 2);
    const endStart = computeGroundHeight(FOREST_BROOK_BRIDGE.xCenter - FOREST_BROOK_BRIDGE.halfLength, FOREST_BROOK_BRIDGE.z);
    const endEnd = computeGroundHeight(FOREST_BROOK_BRIDGE.xCenter + FOREST_BROOK_BRIDGE.halfLength, FOREST_BROOK_BRIDGE.z);
    const baseBlend = endStart + (endEnd - endStart) * Math.max(0, Math.min(1, tAcross)) + 0.03;
    const y = archCurveY(u, baseBlend, FOREST_BROOK_BRIDGE.archRise);
    bestY = bestY === null ? y : Math.max(bestY, y);
  }

  // 5. Elevated Double-Jump Sky Platforms
  for (let i = 0; i < DOUBLE_JUMP_PLATFORMS.length; i++) {
    const p = DOUBLE_JUMP_PLATFORMS[i];
    if (Math.abs(x - p.x) <= p.width * 0.5 && Math.abs(z - p.z) <= p.length * 0.5) {
      bestY = bestY === null ? p.y : Math.max(bestY, p.y);
    }
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
 * Generates overlapping Rapier cuboid chord segments matching the exact arch curves of bridges
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

  // 4. Forest Trail Brook Bridge (6 chord segments along X)
  const forestSteps = 6;
  const fThickness = 0.14;
  const fXMin = FOREST_BROOK_BRIDGE.xCenter - FOREST_BROOK_BRIDGE.halfLength;
  const fXMax = FOREST_BROOK_BRIDGE.xCenter + FOREST_BROOK_BRIDGE.halfLength;
  for (let i = 0; i < forestSteps; i++) {
    const x0 = fXMin + (i / forestSteps) * (fXMax - fXMin);
    const x1 = fXMin + ((i + 1) / forestSteps) * (fXMax - fXMin);
    const y0 = computeBridgeSurfaceY(x0, FOREST_BROOK_BRIDGE.z) ?? FOREST_BROOK_BRIDGE.baseY;
    const y1 = computeBridgeSurfaceY(x1, FOREST_BROOK_BRIDGE.z) ?? FOREST_BROOK_BRIDGE.baseY;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const chordLen = Math.hypot(dx, dy);
    const rollZ = Math.atan2(dy, dx);
    segments.push({
      bridgeId: FOREST_BROOK_BRIDGE.id,
      x: (x0 + x1) * 0.5,
      y: (y0 + y1) * 0.5 - fThickness,
      z: FOREST_BROOK_BRIDGE.z,
      hx: chordLen * 0.5 + 0.14,
      hy: fThickness,
      hz: FOREST_BROOK_BRIDGE.deckHalfWidth,
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
  if (Math.abs(z - SOUTH_COVE_BRIDGE.z) <= 2.4 && Math.abs(x - SOUTH_COVE_BRIDGE.xCenter) <= 13.0) {
    return 'South Cove Footbridge';
  }
  if (Math.abs(z - FOREST_BROOK_BRIDGE.z) <= 2.4 && Math.abs(x - FOREST_BROOK_BRIDGE.xCenter) <= 8.0) {
    return 'Forest Brook Timber Bridge';
  }
  {
    const tunYaw = -1.0122;
    const dx = x - -42.65;
    const dz = z - 3.41;
    const c = Math.cos(tunYaw);
    const s = Math.sin(tunYaw);
    const lx = dx * c - dz * s;
    const lz = dx * s + dz * c;
    if (Math.abs(lx) <= 5.0 && Math.abs(lz) <= 6.3) {
      return 'West Ridge Tunnel';
    }
  }
  if (x >= 72 && x <= 148 && z >= 34 && z <= 132) {
    return 'Stunt & Drift Arena';
  }
  if (Math.hypot(x + 36, z - 118) < 26) {
    return 'Amphibious Lagoon';
  }
  if (x <= -62 && z <= -46) {
    return 'Forest Trail District';
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
