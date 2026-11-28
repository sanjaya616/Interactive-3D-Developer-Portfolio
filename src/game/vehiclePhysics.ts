import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { DOUBLE_JUMP_PLATFORMS, LAGOON_RUN_OBSTACLES } from '../data/portfolioData';
import type { DrivingAssistLevel, VehicleConfig, WaterDriveState } from '../types/portfolio';
import {
  computeBridgeSurfaceY,
  computeDrivingParamsForVehicle,
  computeEngineTorqueAndGear,
  computeGroundHeight,
  computeNearestRoadRescuePose,
  computePacejkaTyreForces,
  computeSafeRecoveryPose,
  createInitialDoubleJumpState,
  createInitialDriftScoreState,
  evaluateWaterPhysics,
  getAssistProfile,
  getBridgeColliderSegments,
  getSurfaceGripFactor,
  isVehicleOverturned,
  sampleSurfaceType,
  stepDoubleJumpState,
  stepDriftScoring,
  stepPlanarDriving,
  type DoubleJumpState,
  type DriftScoreState,
  type DrivingDynamicsParams,
  type SurfaceType,
  type VehicleInputIntent,
} from './physicsMath';
import { computeWaterShoreDepth, WATER_BASE_Y } from './waterWaveMath';
import { TERRAIN_CELLS, TERRAIN_SPAN, WORLD_HALF_SPAN } from './worldConstants';
import type { DynamicPropDef, StaticBoxColliderDef } from './worldEnvironment';

let rapierInitPromise: Promise<void> | null = null;

export async function ensureRapierReady(): Promise<void> {
  if (!rapierInitPromise) {
    rapierInitPromise = RAPIER.init();
  }
  return rapierInitPromise;
}

const _quat = new THREE.Quaternion();
const _bodyQuat = new THREE.Quaternion();
const _targetQuat = new THREE.Quaternion();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _localUp = new THREE.Vector3();
const _vel = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _upAxis = new THREE.Vector3(0, 1, 0);
const _outPos = new THREE.Vector3();
const _outQuat = new THREE.Quaternion();
const _downDir = { x: 0, y: -1, z: 0 };

const WHEEL_OFFSETS: [number, number][] = [
  [-0.95, -1.05], // FL
  [0.95, -1.05], // FR
  [-0.95, 1.05], // RL
  [0.95, 1.05], // RR
];

export interface PhysicsStepOutput {
  justLanded: boolean;
  landImpactIntensity: number;
  justJumped: boolean;
  justDoubleJumped: boolean;
  justRecovered: boolean;
  justFreed: boolean;
  justEnteredWater: boolean;
  justExitedWater: boolean;
  justRescuedDeepWater: boolean;
  driftBankedNow: number;
  driftPenalizedNow: boolean;
  collisionImpact: number;
  wheelCompressions: [number, number, number, number];
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
}

const FIXED_SUBSTEP_DT = 1 / 120;

export class RapierVehiclePhysics {
  world: RAPIER.World;
  chassisBody: RAPIER.RigidBody;
  dynamicBodies: { body: RAPIER.RigidBody; mesh: THREE.Mesh }[] = [];

  forwardSpeed = 0;
  lateralSpeed = 0;
  boostCharge = 100;
  isBoosting = false;
  isDrifting = false;
  isGrounded = true;
  isOverturned = false;
  overturnedSec = 0;
  jumpsRemaining = 2;
  airTimeSec = 0;
  driftActiveScore = 0;
  driftTotalBanked = 0;
  driftCombo = 1.0;
  waterState: WaterDriveState = 'dry';
  waterDepth = 0;
  waterSplashIntensity = 0;
  distanceDriven = 0;
  wheelCompressions: [number, number, number, number] = [0.5, 0.5, 0.5, 0.5];
  gear = 1;
  rpm = 950;
  surfaceType: SurfaceType = 'asphalt';
  boundaryDistMeters = WORLD_HALF_SPAN;
  driftHint = '';

  private dynamics: DrivingDynamicsParams;
  private assistLevel: DrivingAssistLevel = 'normal';
  private wetness = 0;
  private staticColliders: StaticBoxColliderDef[];
  private prevX = 0;
  private prevZ = 5.5;
  private prevPlanarSpeed = 0;
  private wasGrounded = true;
  private yaw = 0;
  private stuckSec = 0;
  private physAccum = 0;
  private prevRenderPos = new THREE.Vector3(0, 0.34, 5.5);
  private curRenderPos = new THREE.Vector3(0, 0.34, 5.5);
  private prevRenderQuat = new THREE.Quaternion();
  private curRenderQuat = new THREE.Quaternion();
  private doubleJumpState: DoubleJumpState = createInitialDoubleJumpState();
  private driftScoreState: DriftScoreState = createInitialDriftScoreState();

  constructor(
    staticColliders: StaticBoxColliderDef[],
    dynamicProps: DynamicPropDef[],
    initialVehicle?: VehicleConfig,
  ) {
    this.staticColliders = staticColliders;
    this.dynamics = computeDrivingParamsForVehicle(initialVehicle);
    this.world = new RAPIER.World({ x: 0, y: -19.6, z: 0 });
    this.world.timestep = FIXED_SUBSTEP_DT;

    // 1. Sculpted terrain heightfield collider synced 1:1 with TERRAIN_SPAN (360m) & TERRAIN_CELLS (180x180, 2m grid)
    const nrows = TERRAIN_CELLS;
    const ncols = TERRAIN_CELLS;
    const span = TERRAIN_SPAN;
    const heights = new Float32Array((nrows + 1) * (ncols + 1));
    for (let col = 0; col <= ncols; col++) {
      const x = -span / 2 + (col / ncols) * span;
      for (let row = 0; row <= nrows; row++) {
        const z = -span / 2 + (row / nrows) * span;
        heights[row + col * (nrows + 1)] = computeGroundHeight(x, z);
      }
    }

    const groundBody = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    const terrainCollider = RAPIER.ColliderDesc.heightfield(
      nrows,
      ncols,
      heights,
      { x: span, y: 1.0, z: span },
    )
      .setFriction(0.62)
      .setRestitution(0.05);
    this.world.createCollider(terrainCollider, groundBody);

    // 1B. Continuous fixed perimeter barrier walls at ±WORLD_HALF_SPAN (replaces silent boundary teleport)
    const wallHalf = 0.9;
    const wallSpan = WORLD_HALF_SPAN + wallHalf * 2;
    const wallOffset = WORLD_HALF_SPAN + wallHalf;
    const wallPositions: [number, number, number, number][] = [
      [0, -wallOffset, wallSpan, wallHalf], // North wall
      [0, wallOffset, wallSpan, wallHalf],  // South wall
      [-wallOffset, 0, wallHalf, wallSpan], // West wall
      [wallOffset, 0, wallHalf, wallSpan],  // East wall
    ];
    for (const [wx, wz, hx, hz] of wallPositions) {
      const wb = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(wx, 4.5, wz));
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(hx, 6.5, hz).setFriction(0.05).setRestitution(0.18),
        wb,
      );
    }

    // Arched bridge deck chord colliders
    const bridgeBody = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    const bridgeSegments = getBridgeColliderSegments();
    const bridgeEuler = new THREE.Euler(0, 0, 0, 'YXZ');
    for (const seg of bridgeSegments) {
      bridgeEuler.set(seg.pitchX, seg.yawY, seg.rollZ, 'YXZ');
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(seg.hx, seg.hy, seg.hz)
          .setTranslation(seg.x, seg.y, seg.z)
          .setRotation(new THREE.Quaternion().setFromEuler(bridgeEuler))
          .setFriction(0.65),
        bridgeBody,
      );
    }

    // Elevated Double-Jump Sky Platforms
    for (const p of DOUBLE_JUMP_PLATFORMS) {
      const pb = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(p.x, p.y - p.thickness * 0.5, p.z),
      );
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(p.width * 0.5, p.thickness * 0.5, p.length * 0.5).setFriction(0.75),
        pb,
      );
    }

    // Amphibious Lagoon Obstacle Buoys & Rocks
    for (const ob of LAGOON_RUN_OBSTACLES) {
      const gy = computeGroundHeight(ob.x, ob.z);
      const obBody = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(ob.x, gy + 0.75, ob.z),
      );
      this.world.createCollider(
        RAPIER.ColliderDesc.cylinder(0.85, ob.radius * 0.78).setRestitution(0.35),
        obBody,
      );
    }

    // 2. Static landmark building, bridge rail, tunnel & tree trunk colliders
    for (const sc of staticColliders) {
      const rbDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(sc.x, sc.y, sc.z);
      if (sc.ry) {
        rbDesc.setRotation(_quat.setFromAxisAngle(_upAxis, sc.ry));
      }
      const b = this.world.createRigidBody(rbDesc);
      const colDesc = RAPIER.ColliderDesc.cuboid(sc.hx, sc.hy, sc.hz);
      if (sc.friction !== undefined) {
        colDesc.setFriction(sc.friction);
      }
      this.world.createCollider(colDesc, b);
    }

    // 3. Dynamic crates & cones
    for (const dp of dynamicProps) {
      const rb = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(dp.x, dp.y, dp.z)
          .setLinearDamping(0.5)
          .setAngularDamping(0.8),
      );
      const col = RAPIER.ColliderDesc.cuboid(dp.hx, dp.hy, dp.hz)
        .setMass(dp.mass)
        .setRestitution(0.25)
        .setFriction(0.65);
      this.world.createCollider(col, rb);
      this.dynamicBodies.push({ body: rb, mesh: dp.mesh });
    }

    // 4. Vehicle RigidBody with full 3D rotational dynamics (tumble/rollover enabled!)
    const chassisDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 0.9, 5.5)
      .setLinearDamping(0.28)
      .setAngularDamping(3.4)
      .setCcdEnabled(true);
    this.chassisBody = this.world.createRigidBody(chassisDesc);

    const chassisCol = RAPIER.ColliderDesc.roundCuboid(0.83, 0.43, 1.58, 0.12)
      .setMass(12)
      .setFriction(0.14)
      .setRestitution(0.18);
    this.world.createCollider(chassisCol, this.chassisBody);

    this.prevX = 0;
    this.prevZ = 5.5;
  }

  updateVehicleUpgrades(config: VehicleConfig): void {
    this.dynamics = computeDrivingParamsForVehicle(config);
  }

  setAssistLevel(level: DrivingAssistLevel): void {
    this.assistLevel = level;
  }

  setWetness(wetness: number): void {
    this.wetness = THREE.MathUtils.clamp(wetness, 0, 1);
  }

  private sampleSurfaceY(x: number, z: number, currentBottomY?: number): number {
    const bridgeY = computeBridgeSurfaceY(x, z);
    const groundY = computeGroundHeight(x, z);
    if (bridgeY === null) return groundY;
    // Do not snap underneath an elevated sky platform when driving below it
    if (currentBottomY !== undefined && bridgeY > currentBottomY + 0.78) {
      return groundY;
    }
    return Math.max(groundY, bridgeY);
  }

  private isRecoveryBlocked = (x: number, z: number): boolean => {
    for (let i = 0; i < this.staticColliders.length; i++) {
      const sc = this.staticColliders[i];
      if (sc.kind === 'bridge-rail') continue;
      if (Math.abs(x - sc.x) < sc.hx + 1.4 && Math.abs(z - sc.z) < sc.hz + 1.8) {
        return true;
      }
    }
    for (let i = 0; i < LAGOON_RUN_OBSTACLES.length; i++) {
      const ob = LAGOON_RUN_OBSTACLES[i];
      if (Math.hypot(x - ob.x, z - ob.z) < ob.radius + 1.8) return true;
    }
    return false;
  };

  recoverVehicle(): { x: number; y: number; z: number; yaw: number } {
    const pos = this.chassisBody.translation();
    const pose = computeSafeRecoveryPose(
      pos.x,
      pos.z,
      this.yaw,
      this.isRecoveryBlocked,
      computeWaterShoreDepth,
    );
    this.chassisBody.setTranslation({ x: pose.x, y: pose.y, z: pose.z }, true);
    this.chassisBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.chassisBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
    _quat.setFromAxisAngle(_upAxis, pose.yaw);
    this.chassisBody.setRotation({ x: _quat.x, y: _quat.y, z: _quat.z, w: _quat.w }, true);
    this.yaw = pose.yaw;
    this.forwardSpeed = 0;
    this.lateralSpeed = 0;
    this.prevPlanarSpeed = 0;
    this.isOverturned = false;
    this.overturnedSec = 0;
    this.doubleJumpState = createInitialDoubleJumpState();
    this.jumpsRemaining = 2;
    this.driftScoreState = createInitialDriftScoreState();
    this.driftActiveScore = 0;
    this.prevX = pose.x;
    this.prevZ = pose.z;
    this.prevRenderPos.set(pose.x, pose.y - 0.56, pose.z);
    this.curRenderPos.copy(this.prevRenderPos);
    this.prevRenderQuat.copy(_quat);
    this.curRenderQuat.copy(_quat);
    this.stuckSec = 0;
    return pose;
  }

  respawn(): void {
    this.chassisBody.setTranslation({ x: 0, y: 1.1, z: 5.5 }, true);
    this.chassisBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.chassisBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
    _quat.identity();
    this.chassisBody.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    this.yaw = 0;
    this.forwardSpeed = 0;
    this.lateralSpeed = 0;
    this.prevPlanarSpeed = 0;
    this.boostCharge = 100;
    this.isBoosting = false;
    this.isDrifting = false;
    this.isOverturned = false;
    this.overturnedSec = 0;
    this.doubleJumpState = createInitialDoubleJumpState();
    this.jumpsRemaining = 2;
    this.driftScoreState = createInitialDriftScoreState();
    this.driftActiveScore = 0;
    this.waterState = 'dry';
    this.prevX = 0;
    this.prevZ = 5.5;
    this.prevRenderPos.set(0, 0.54, 5.5);
    this.curRenderPos.copy(this.prevRenderPos);
    this.prevRenderQuat.identity();
    this.curRenderQuat.identity();
    this.stuckSec = 0;
  }

  teleportTo(x: number, z: number, facingYaw = 0): void {
    const sy = this.sampleSurfaceY(x, z);
    this.chassisBody.setTranslation({ x, y: sy + 1.0, z }, true);
    this.chassisBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.chassisBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
    _quat.setFromAxisAngle(_upAxis, facingYaw);
    this.chassisBody.setRotation({ x: _quat.x, y: _quat.y, z: _quat.z, w: _quat.w }, true);
    this.yaw = facingYaw;
    this.forwardSpeed = 0;
    this.lateralSpeed = 0;
    this.prevPlanarSpeed = 0;
    this.isOverturned = false;
    this.overturnedSec = 0;
    this.doubleJumpState = createInitialDoubleJumpState();
    this.jumpsRemaining = 2;
    this.prevX = x;
    this.prevZ = z;
    this.prevRenderPos.set(x, sy + 0.44, z);
    this.curRenderPos.copy(this.prevRenderPos);
    this.prevRenderQuat.copy(_quat);
    this.curRenderQuat.copy(_quat);
    this.stuckSec = 0;
  }

  step(intent: VehicleInputIntent, dt: number): PhysicsStepOutput {
    const pos = this.chassisBody.translation();
    const linVel = this.chassisBody.linvel();
    const rot = this.chassisBody.rotation();
    _bodyQuat.set(rot.x, rot.y, rot.z, rot.w);
    _localUp.set(0, 1, 0).applyQuaternion(_bodyQuat);

    this.isOverturned = isVehicleOverturned(_localUp.y);

    const ray = new RAPIER.Ray({ x: pos.x, y: pos.y, z: pos.z }, _downDir);
    const hit = this.world.castRay(ray, 1.12, true, undefined, undefined, undefined, this.chassisBody);
    const surfY = this.sampleSurfaceY(pos.x, pos.z, pos.y - 0.56);
    this.isGrounded = (hit !== null || pos.y <= surfY + 0.96) && !this.isOverturned;

    // Evaluate water hydrodynamics before driving step so drag & traction apply naturally
    const shoreDepth = computeWaterShoreDepth(pos.x, pos.z);
    const bridgeSurf = computeBridgeSurfaceY(pos.x, pos.z);
    const onElevatedBridge = bridgeSurf !== null && pos.y - 0.56 >= bridgeSurf - 0.5;
    const prevWater = this.waterState;
    const waterSample = evaluateWaterPhysics({
      x: pos.x,
      y: pos.y,
      z: pos.z,
      vy: linVel.y,
      speedMs: Math.hypot(linVel.x, linVel.z),
      shoreDepth,
      waterSurfaceY: WATER_BASE_Y,
      onBridge: onElevatedBridge,
      prevWaterState: prevWater,
    });
    this.waterState = waterSample.waterState;
    this.waterDepth = waterSample.waterDepth;
    this.waterSplashIntensity = waterSample.splashIntensity;
    const justEnteredWater = waterSample.waterState === 'entry';
    const justExitedWater = waterSample.waterState === 'exit';

    _quat.setFromAxisAngle(_upAxis, this.yaw);
    _forward.set(0, 0, -1).applyQuaternion(_quat);
    _right.set(1, 0, 0).applyQuaternion(_quat);
    _vel.set(linVel.x, 0, linVel.z);

    const currentFwd = _vel.dot(_forward);
    const currentLat = _vel.dot(_right);

    const effectiveIntent: VehicleInputIntent = this.isOverturned
      ? { throttle: 0, steer: 0, brake: false, handbrake: false, boost: false, jump: false, jumpJustPressed: false }
      : intent;

    // Surface classification, grip & assist modifiers + Pacejka slip & 5-gear torque
    this.surfaceType = sampleSurfaceType(pos.x, pos.z, shoreDepth, onElevatedBridge);
    const gripMu = getSurfaceGripFactor(this.surfaceType, this.wetness);
    const assist = getAssistProfile(this.assistLevel);
    const engineInfo = computeEngineTorqueAndGear(
      currentFwd,
      effectiveIntent.throttle,
      this.dynamics.maxForwardSpeed,
    );
    this.gear = engineInfo.gear;
    this.rpm = engineInfo.rpm;

    const slipAngleRad = Math.atan2(currentLat, Math.max(1.2, Math.abs(currentFwd)));
    const tyreForces = computePacejkaTyreForces({
      slipAngleRad,
      normalLoadN: 11800,
      gripMu,
      handbrake: Boolean(effectiveIntent.handbrake),
    });

    const surfaceTunedParams: DrivingDynamicsParams = {
      ...this.dynamics,
      engineAccel: this.dynamics.engineAccel * engineInfo.torqueFactor * (0.72 + gripMu * 0.28),
      lateralGrip: this.dynamics.lateralGrip * gripMu * assist.lateralAssist,
      driftGrip: this.dynamics.driftGrip * (0.7 + gripMu * 0.3) * (1 - assist.spinDamping * 0.25),
      maxSteerRate: this.dynamics.maxSteerRate * assist.maxSteerScale,
    };

    const stepRes = stepPlanarDriving(
      {
        forwardSpeed: currentFwd,
        lateralSpeed: currentLat,
        boostCharge: this.boostCharge,
        isGrounded: this.isGrounded,
        waterDragScale: waterSample.waterDragScale,
        waterGripScale: waterSample.waterGripScale * Math.min(1.1, Math.max(0.55, tyreForces.longitudinalCapacityFactor + 0.3)),
      },
      effectiveIntent,
      dt,
      surfaceTunedParams,
    );

    this.forwardSpeed = stepRes.nextForwardSpeed;
    this.lateralSpeed = stepRes.nextLateralSpeed;
    this.boostCharge = stepRes.nextBoostCharge;
    this.isBoosting = stepRes.isBoosting;
    this.isDrifting = stepRes.isDrifting;
    this.driftHint =
      this.isDrifting
        ? Math.abs(this.lateralSpeed) > 6.5
          ? 'Counter-steer to hold the line'
          : 'Great drift! Tap Shift on exit'
        : '';
    if (!this.isOverturned) {
      this.yaw += stepRes.yawDelta;
    }

    // Double Jump state machine (strict edge trigger)
    const djRes = stepDoubleJumpState(this.doubleJumpState, {
      isGrounded: this.isGrounded,
      verticalVel: linVel.y,
      jumpJustPressed: Boolean(intent.jumpJustPressed ?? intent.jump),
      isOverturned: this.isOverturned,
      inputBlocked: false,
      dt,
      baseJumpVelocity: this.dynamics.jumpVelocity,
    });
    this.doubleJumpState = djRes.next;
    this.jumpsRemaining = djRes.next.jumpsRemaining;
    this.airTimeSec = djRes.next.airTimeSec;

    const justJumped = djRes.triggeredJump === 'primary';
    const justDoubleJumped = djRes.triggeredJump === 'double';
    const justLanded = !this.wasGrounded && this.isGrounded;
    this.wasGrounded = this.isGrounded;
    const landImpactIntensity = djRes.landedImpactVel > 0 ? Math.min(1, djRes.landedImpactVel / 18) : 0;

    if (justDoubleJumped && intent.throttle > 0.1) {
      this.forwardSpeed = Math.min(this.dynamics.maxForwardSpeed * 1.15, this.forwardSpeed + 1.35);
    }

    const newVx = this.isOverturned
      ? linVel.x * Math.exp(-1.4 * dt)
      : _forward.x * this.forwardSpeed + _right.x * this.lateralSpeed;
    const newVz = this.isOverturned
      ? linVel.z * Math.exp(-1.4 * dt)
      : _forward.z * this.forwardSpeed + _right.z * this.lateralSpeed;

    let newVy = linVel.y;
    if (justJumped) {
      newVy = djRes.jumpVelocityY;
    } else if (justDoubleJumped) {
      newVy = Math.max(linVel.y * 0.25, djRes.jumpVelocityY);
    } else if (waterSample.buoyancyAccelY !== 0) {
      newVy += waterSample.buoyancyAccelY * dt;
    }

    const commandedPlanarSpeed = Math.hypot(newVx, newVz);
    if (!this.isOverturned || justJumped || justDoubleJumped || waterSample.buoyancyAccelY !== 0) {
      this.chassisBody.setLinvel({ x: newVx, y: newVy, z: newVz }, true);
    }

    // Air control torque while airborne (pitch & roll/yaw) without enabling flight
    if (!this.isGrounded && !this.isOverturned) {
      const av = this.chassisBody.angvel();
      const targetLocalPitch = intent.throttle * 1.95;
      const targetLocalRoll = -intent.steer * 1.65;
      _euler.setFromQuaternion(_bodyQuat, 'YXZ');
      this.chassisBody.setAngvel(
        {
          x: THREE.MathUtils.clamp(av.x + (_forward.z * -targetLocalPitch + _right.z * targetLocalRoll) * dt * 2.5, -3.8, 3.8),
          y: THREE.MathUtils.clamp(av.y + intent.steer * 0.65 * dt, -2.5, 2.5),
          z: THREE.MathUtils.clamp(av.z + (_forward.x * targetLocalPitch - _right.x * targetLocalRoll) * dt * 2.5, -3.8, 3.8),
        },
        true,
      );
    }

    // Fixed 1/120 Hz sub-step accumulator + pose interpolation
    this.physAccum = Math.min(this.physAccum + dt, FIXED_SUBSTEP_DT * 6);
    while (this.physAccum >= FIXED_SUBSTEP_DT) {
      this.prevRenderPos.copy(this.curRenderPos);
      this.prevRenderQuat.copy(this.curRenderQuat);
      this.world.step();
      const sp = this.chassisBody.translation();
      const sr = this.chassisBody.rotation();
      this.curRenderPos.set(sp.x, sp.y - 0.56, sp.z);
      this.curRenderQuat.set(sr.x, sr.y, sr.z, sr.w);
      this.physAccum -= FIXED_SUBSTEP_DT;
    }

    const nextPos = this.chassisBody.translation();
    const postVel = this.chassisBody.linvel();
    const postRot = this.chassisBody.rotation();
    _bodyQuat.set(postRot.x, postRot.y, postRot.z, postRot.w);
    _localUp.set(0, 1, 0).applyQuaternion(_bodyQuat);

    this.boundaryDistMeters = Math.max(
      0,
      Number((WORLD_HALF_SPAN - Math.max(Math.abs(nextPos.x), Math.abs(nextPos.z))).toFixed(1)),
    );

    const actualPlanarSpeed = Math.hypot(postVel.x, postVel.z);

    // Natural collision impulse detection (organic Rapier impact response, no forced tumble kick)
    const speedDrop = this.prevPlanarSpeed - actualPlanarSpeed;
    const blockedDrop = commandedPlanarSpeed - actualPlanarSpeed;
    const collisionImpact =
      !intent.brake && (speedDrop > 4.2 || blockedDrop > 5.0)
        ? THREE.MathUtils.clamp(Math.max(speedDrop, blockedDrop) / 16, 0.15, 1)
        : 0;
    this.prevPlanarSpeed = actualPlanarSpeed;

    // Emergency deep-void fallback net (>2.2m below terrain surface)
    const minGroundY = this.sampleSurfaceY(nextPos.x, nextPos.z, nextPos.y - 0.56) + 0.56;
    if (nextPos.y < minGroundY - 2.2) {
      this.chassisBody.setTranslation({ x: nextPos.x, y: minGroundY + 0.25, z: nextPos.z }, true);
      if (postVel.y < 0) {
        this.chassisBody.setLinvel({ x: postVel.x, y: 0, z: postVel.z }, true);
      }
    }

    // Auto-stuck detection & nearest-road rescue ("Freed" after >2.0s wedged under throttle)
    let justFreed = false;
    if (
      !this.isOverturned &&
      !intent.brake &&
      Math.abs(intent.throttle) > 0.45 &&
      actualPlanarSpeed < 0.85 &&
      commandedPlanarSpeed > 3.0
    ) {
      this.stuckSec += dt;
      if (this.stuckSec >= 2.0) {
        this.stuckSec = 0;
        const rescue = computeNearestRoadRescuePose(nextPos.x, nextPos.z);
        this.teleportTo(rescue.x, rescue.z, rescue.yaw);
        justFreed = true;
      }
    } else {
      this.stuckSec = 0;
    }

    // Drift scoring update
    const driftRes = stepDriftScoring(this.driftScoreState, {
      forwardSpeed: this.forwardSpeed,
      lateralSpeed: this.lateralSpeed,
      isGrounded: this.isGrounded,
      isDrifting: this.isDrifting,
      crashedOrOverturned: this.isOverturned || collisionImpact > 0.68,
      dt,
    });
    this.driftScoreState = driftRes.next;
    this.driftActiveScore = Math.round(driftRes.next.activeScore);
    this.driftTotalBanked = driftRes.next.totalBankedScore;
    this.driftCombo = driftRes.next.comboMultiplier;

    // Auto-recovery if deep in Emerald Lagoon hazard OR overturned & stalled > 2.8s
    let justRecovered = false;
    let justRescuedDeepWater = false;

    if (waterSample.requiresDeepRescue) {
      this.recoverVehicle();
      justRecovered = true;
      justRescuedDeepWater = true;
    } else if (isVehicleOverturned(_localUp.y)) {
      this.isOverturned = true;
      if (actualPlanarSpeed < 2.6) {
        this.overturnedSec += dt;
      }
      if (this.overturnedSec >= 2.8) {
        this.recoverVehicle();
        justRecovered = true;
      }
    } else {
      this.isOverturned = false;
      this.overturnedSec = 0;
    }

    const finalPos = this.chassisBody.translation();
    const finalRot = this.chassisBody.rotation();
    _bodyQuat.set(finalRot.x, finalRot.y, finalRot.z, finalRot.w);

    this.distanceDriven += Math.hypot(finalPos.x - this.prevX, finalPos.z - this.prevZ);
    this.prevX = finalPos.x;
    this.prevZ = finalPos.z;

    // 4-Wheel Raycast Suspension Probes
    const carBottomY = finalPos.y - 0.56;
    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);
    for (let i = 0; i < 4; i++) {
      const [ox, oz] = WHEEL_OFFSETS[i];
      const wx = finalPos.x + ox * cosY + oz * sinY;
      const wz = finalPos.z - ox * sinY + oz * cosY;
      const wRay = new RAPIER.Ray({ x: wx, y: finalPos.y + 0.15, z: wz }, _downDir);
      const wHit = this.world.castRay(wRay, 1.35, true, undefined, undefined, undefined, this.chassisBody);
      const groundAtWheel = wHit ? finalPos.y + 0.15 - wHit.timeOfImpact : this.sampleSurfaceY(wx, wz, carBottomY);
      const clearance = THREE.MathUtils.clamp(carBottomY - groundAtWheel, -0.18, 0.45);
      const comp = THREE.MathUtils.clamp(1 - (clearance + 0.12) / 0.48, 0, 1);
      this.wheelCompressions[i] = THREE.MathUtils.lerp(this.wheelCompressions[i], comp, 0.35);
    }

    // Align chassis orientation cleanly when upright on ground; let Rapier own full orientation when airborne or tumbling
    if (this.isGrounded && !this.isOverturned && _localUp.y > 0.62 && collisionImpact < 0.5) {
      const frontComp = (this.wheelCompressions[0] + this.wheelCompressions[1]) * 0.5;
      const rearComp = (this.wheelCompressions[2] + this.wheelCompressions[3]) * 0.5;
      const leftComp = (this.wheelCompressions[0] + this.wheelCompressions[2]) * 0.5;
      const rightComp = (this.wheelCompressions[1] + this.wheelCompressions[3]) * 0.5;

      const aheadX = finalPos.x + _forward.x * 1.4;
      const aheadZ = finalPos.z + _forward.z * 1.4;
      const slopePitch = THREE.MathUtils.clamp(
        (this.sampleSurfaceY(aheadX, aheadZ, carBottomY) - this.sampleSurfaceY(finalPos.x, finalPos.z, carBottomY)) * 0.45,
        -0.3,
        0.3,
      );
      const suspPitch = (rearComp - frontComp) * 0.12;
      const accelPitch = THREE.MathUtils.clamp((this.forwardSpeed - currentFwd) * 0.045, -0.09, 0.09);
      const suspRoll = (leftComp - rightComp) * 0.11;

      _euler.set(slopePitch + accelPitch + suspPitch, this.yaw, suspRoll, 'YXZ');
      _targetQuat.setFromEuler(_euler);
      const alignAlpha = 1 - Math.exp(-12 * dt);
      _bodyQuat.slerp(_targetQuat, alignAlpha);
      this.chassisBody.setRotation(
        { x: _bodyQuat.x, y: _bodyQuat.y, z: _bodyQuat.z, w: _bodyQuat.w },
        true,
      );
      this.chassisBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }

    // Sync dynamic crates & cones with Rapier
    for (const db of this.dynamicBodies) {
      const t = db.body.translation();
      const r = db.body.rotation();
      db.mesh.position.set(t.x, t.y, t.z);
      db.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }

    const alpha = THREE.MathUtils.clamp(this.physAccum / FIXED_SUBSTEP_DT, 0, 1);
    if (justFreed || justRecovered) {
      _outPos.set(finalPos.x, finalPos.y - 0.56, finalPos.z);
      _outQuat.copy(_bodyQuat);
    } else {
      _outPos.lerpVectors(this.prevRenderPos, this.curRenderPos, alpha);
      _outPos.set(finalPos.x, _outPos.y * 0.35 + (finalPos.y - 0.56) * 0.65, finalPos.z);
      _outQuat.slerpQuaternions(this.prevRenderQuat, _bodyQuat, 0.75);
    }

    return {
      justLanded,
      landImpactIntensity,
      justJumped,
      justDoubleJumped,
      justRecovered,
      justFreed,
      justEnteredWater,
      justExitedWater,
      justRescuedDeepWater,
      driftBankedNow: driftRes.bankedNow,
      driftPenalizedNow: driftRes.penalizedNow,
      collisionImpact,
      wheelCompressions: this.wheelCompressions,
      position: _outPos,
      quaternion: _outQuat,
    };
  }

  getYaw(): number {
    return this.yaw;
  }

  dispose(): void {
    this.world.free();
  }
}
