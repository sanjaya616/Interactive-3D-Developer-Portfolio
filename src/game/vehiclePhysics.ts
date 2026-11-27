import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { DOUBLE_JUMP_PLATFORMS, LAGOON_RUN_OBSTACLES } from '../data/portfolioData';
import type { VehicleConfig, WaterDriveState } from '../types/portfolio';
import {
  computeBridgeSurfaceY,
  computeDrivingParamsForVehicle,
  computeGroundHeight,
  computeSafeRecoveryPose,
  createInitialDoubleJumpState,
  createInitialDriftScoreState,
  evaluateWaterPhysics,
  getBridgeColliderSegments,
  isVehicleOverturned,
  stepDoubleJumpState,
  stepDriftScoring,
  stepPlanarDriving,
  type DoubleJumpState,
  type DriftScoreState,
  type DrivingDynamicsParams,
  type VehicleInputIntent,
} from './physicsMath';
import { computeWaterShoreDepth, WATER_BASE_Y } from './waterWaveMath';
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

  private dynamics: DrivingDynamicsParams;
  private staticColliders: StaticBoxColliderDef[];
  private prevX = 0;
  private prevZ = 5.5;
  private prevPlanarSpeed = 0;
  private wasGrounded = true;
  private yaw = 0;
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

    // 1. Sculpted terrain heightfield collider spanning 340m x 340m across all 8 districts
    const nrows = 128;
    const ncols = 128;
    const span = 340;
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

    const chassisCol = RAPIER.ColliderDesc.cuboid(0.95, 0.55, 1.7)
      .setMass(12)
      .setFriction(0.14)
      .setRestitution(0.2);
    this.world.createCollider(chassisCol, this.chassisBody);

    this.prevX = 0;
    this.prevZ = 5.5;
  }

  updateVehicleUpgrades(config: VehicleConfig): void {
    this.dynamics = computeDrivingParamsForVehicle(config);
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

    const stepRes = stepPlanarDriving(
      {
        forwardSpeed: currentFwd,
        lateralSpeed: currentLat,
        boostCharge: this.boostCharge,
        isGrounded: this.isGrounded,
        waterDragScale: waterSample.waterDragScale,
        waterGripScale: waterSample.waterGripScale,
      },
      effectiveIntent,
      dt,
      this.dynamics,
    );

    this.forwardSpeed = stepRes.nextForwardSpeed;
    this.lateralSpeed = stepRes.nextLateralSpeed;
    this.boostCharge = stepRes.nextBoostCharge;
    this.isBoosting = stepRes.isBoosting;
    this.isDrifting = stepRes.isDrifting;
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
      // Apply smooth air pitch/roll nudges
      this.chassisBody.setAngvel(
        {
          x: THREE.MathUtils.clamp(av.x + (_forward.z * -targetLocalPitch + _right.z * targetLocalRoll) * dt * 2.5, -3.8, 3.8),
          y: THREE.MathUtils.clamp(av.y + intent.steer * 0.65 * dt, -2.5, 2.5),
          z: THREE.MathUtils.clamp(av.z + (_forward.x * targetLocalPitch - _right.x * targetLocalRoll) * dt * 2.5, -3.8, 3.8),
        },
        true,
      );
    }

    // Clamp vehicle inside the 156m outer boundary across all 8 districts
    if (Math.abs(pos.x) > 156 || Math.abs(pos.z) > 156) {
      const clampedX = THREE.MathUtils.clamp(pos.x, -155, 155);
      const clampedZ = THREE.MathUtils.clamp(pos.z, -155, 155);
      this.chassisBody.setTranslation({ x: clampedX, y: pos.y, z: clampedZ }, true);
    }

    this.world.timestep = Math.min(dt, 0.033);
    this.world.step();

    const nextPos = this.chassisBody.translation();
    const postVel = this.chassisBody.linvel();
    const postRot = this.chassisBody.rotation();
    _bodyQuat.set(postRot.x, postRot.y, postRot.z, postRot.w);
    _localUp.set(0, 1, 0).applyQuaternion(_bodyQuat);

    const actualPlanarSpeed = Math.hypot(postVel.x, postVel.z);

    // Collision impulse detection
    const speedDrop = this.prevPlanarSpeed - actualPlanarSpeed;
    const blockedDrop = commandedPlanarSpeed - actualPlanarSpeed;
    const collisionImpact =
      !intent.brake && (speedDrop > 4.2 || blockedDrop > 5.0)
        ? THREE.MathUtils.clamp(Math.max(speedDrop, blockedDrop) / 16, 0.15, 1)
        : 0;
    this.prevPlanarSpeed = actualPlanarSpeed;

    // Hard skewed impact induces genuine rotational tumble impulse!
    if (collisionImpact > 0.55) {
      const av = this.chassisBody.angvel();
      const sideKick = (Math.abs(currentLat) > 2.5 ? Math.sign(currentLat) : 1) * collisionImpact * 2.8;
      this.chassisBody.setAngvel(
        {
          x: av.x + (_right.x * sideKick + _forward.x * collisionImpact * 1.4),
          y: av.y,
          z: av.z + (_right.z * sideKick + _forward.z * collisionImpact * 1.4),
        },
        true,
      );
    }

    // Prevent sinking below terrain/bridge deck (respecting elevated platforms)
    const minGroundY = this.sampleSurfaceY(nextPos.x, nextPos.z, nextPos.y - 0.56) + 0.56;
    if (nextPos.y < minGroundY) {
      this.chassisBody.setTranslation({ x: nextPos.x, y: minGroundY, z: nextPos.z }, true);
      if (postVel.y < 0) {
        this.chassisBody.setLinvel({ x: postVel.x, y: 0, z: postVel.z }, true);
      }
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

    _outPos.set(finalPos.x, finalPos.y - 0.56, finalPos.z);
    _outQuat.copy(_bodyQuat);

    return {
      justLanded,
      landImpactIntensity,
      justJumped,
      justDoubleJumped,
      justRecovered,
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
