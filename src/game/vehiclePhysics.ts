import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import {
  computeBridgeSurfaceY,
  computeDrivingParamsForVehicle,
  computeGroundHeight,
  getBridgeColliderSegments,
  stepPlanarDriving,
  type DrivingDynamicsParams,
  type VehicleInputIntent,
} from './physicsMath';
import type { VehicleConfig } from '../types/portfolio';
import type { DynamicPropDef, StaticBoxColliderDef } from './worldEnvironment';

let rapierInitPromise: Promise<void> | null = null;

export async function ensureRapierReady(): Promise<void> {
  if (!rapierInitPromise) {
    rapierInitPromise = RAPIER.init();
  }
  return rapierInitPromise;
}

const _quat = new THREE.Quaternion();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _vel = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

const WHEEL_OFFSETS: [number, number][] = [
  [-0.95, -1.05], // FL
  [0.95, -1.05], // FR
  [-0.95, 1.05], // RL
  [0.95, 1.05], // RR
];

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
  distanceDriven = 0;
  wheelCompressions: [number, number, number, number] = [0.5, 0.5, 0.5, 0.5];

  private dynamics: DrivingDynamicsParams;
  private prevX = 0;
  private prevZ = 5.5;
  private prevPlanarSpeed = 0;
  private wasGrounded = true;
  private yaw = 0;

  constructor(
    staticColliders: StaticBoxColliderDef[],
    dynamicProps: DynamicPropDef[],
    initialVehicle?: VehicleConfig,
  ) {
    this.dynamics = computeDrivingParamsForVehicle(initialVehicle);
    this.world = new RAPIER.World({ x: 0, y: -19.6, z: 0 });

    // 1. Sculpted terrain heightfield collider spanning 240m x 240m
    const nrows = 96;
    const ncols = 96;
    const span = 240;
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

    // Arched bridge deck chord colliders (Main Emerald Lagoon, NW Ring Viaduct, South Cove Footbridge)
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

    // 2. Static landmark building, bridge rail, tunnel & tree trunk colliders
    const staticAxisY = new THREE.Vector3(0, 1, 0);
    for (const sc of staticColliders) {
      const rbDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(sc.x, sc.y, sc.z);
      if (sc.ry) {
        rbDesc.setRotation(new THREE.Quaternion().setFromAxisAngle(staticAxisY, sc.ry));
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

    // 4. Vehicle RigidBody spawned on open starting plaza facing -Z
    const chassisDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 0.9, 5.5)
      .setLinearDamping(0.35)
      .setAngularDamping(2.8)
      .lockRotations();
    this.chassisBody = this.world.createRigidBody(chassisDesc);

    const chassisCol = RAPIER.ColliderDesc.cuboid(0.95, 0.55, 1.7)
      .setMass(12)
      .setFriction(0.08)
      .setRestitution(0.18);
    this.world.createCollider(chassisCol, this.chassisBody);

    this.prevX = 0;
    this.prevZ = 5.5;
  }

  updateVehicleUpgrades(config: VehicleConfig): void {
    this.dynamics = computeDrivingParamsForVehicle(config);
  }

  private sampleSurfaceY(x: number, z: number): number {
    const bridgeY = computeBridgeSurfaceY(x, z);
    const groundY = computeGroundHeight(x, z);
    return bridgeY !== null ? Math.max(groundY, bridgeY) : groundY;
  }

  respawn(): void {
    this.chassisBody.setTranslation({ x: 0, y: 1.1, z: 5.5 }, true);
    this.chassisBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.chassisBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.yaw = 0;
    this.forwardSpeed = 0;
    this.lateralSpeed = 0;
    this.prevPlanarSpeed = 0;
    this.boostCharge = 100;
    this.isBoosting = false;
    this.isDrifting = false;
    this.prevX = 0;
    this.prevZ = 5.5;
  }

  teleportTo(x: number, z: number, facingYaw = 0): void {
    const sy = this.sampleSurfaceY(x, z);
    this.chassisBody.setTranslation({ x, y: sy + 1.0, z }, true);
    this.chassisBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.yaw = facingYaw;
    this.forwardSpeed = 0;
    this.lateralSpeed = 0;
    this.prevPlanarSpeed = 0;
    this.prevX = x;
    this.prevZ = z;
  }

  step(
    intent: VehicleInputIntent,
    dt: number,
  ): {
    justLanded: boolean;
    justJumped: boolean;
    collisionImpact: number;
    wheelCompressions: [number, number, number, number];
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
  } {
    const pos = this.chassisBody.translation();
    const linVel = this.chassisBody.linvel();

    const ray = new RAPIER.Ray({ x: pos.x, y: pos.y, z: pos.z }, { x: 0, y: -1, z: 0 });
    const hit = this.world.castRay(ray, 1.1, true, undefined, undefined, undefined, this.chassisBody);
    const surfY = this.sampleSurfaceY(pos.x, pos.z);
    this.isGrounded = hit !== null || pos.y <= surfY + 0.96;

    const justLanded = !this.wasGrounded && this.isGrounded;
    this.wasGrounded = this.isGrounded;

    _quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    _forward.set(0, 0, -1).applyQuaternion(_quat);
    _right.set(1, 0, 0).applyQuaternion(_quat);
    _vel.set(linVel.x, 0, linVel.z);

    const currentFwd = _vel.dot(_forward);
    const currentLat = _vel.dot(_right);

    const stepRes = stepPlanarDriving(
      {
        forwardSpeed: currentFwd,
        lateralSpeed: currentLat,
        boostCharge: this.boostCharge,
        isGrounded: this.isGrounded,
      },
      intent,
      dt,
      this.dynamics,
    );

    this.forwardSpeed = stepRes.nextForwardSpeed;
    this.lateralSpeed = stepRes.nextLateralSpeed;
    this.boostCharge = stepRes.nextBoostCharge;
    this.isBoosting = stepRes.isBoosting;
    this.isDrifting = stepRes.isDrifting;
    this.yaw += stepRes.yawDelta;

    const newVx = _forward.x * this.forwardSpeed + _right.x * this.lateralSpeed;
    const newVz = _forward.z * this.forwardSpeed + _right.z * this.lateralSpeed;
    let newVy = linVel.y;

    const justJumped = stepRes.jumpImpulse > 0;
    if (justJumped) {
      newVy = stepRes.jumpImpulse;
    }

    const commandedPlanarSpeed = Math.hypot(newVx, newVz);
    this.chassisBody.setLinvel({ x: newVx, y: newVy, z: newVz }, true);

    // Keep vehicle inside the 115m outer valley boundary cleanly
    if (Math.abs(pos.x) > 115 || Math.abs(pos.z) > 115) {
      const clampedX = THREE.MathUtils.clamp(pos.x, -114, 114);
      const clampedZ = THREE.MathUtils.clamp(pos.z, -114, 114);
      this.chassisBody.setTranslation({ x: clampedX, y: pos.y, z: clampedZ }, true);
    }

    this.world.timestep = Math.min(dt, 0.033);
    this.world.step();

    const nextPos = this.chassisBody.translation();
    const postVel = this.chassisBody.linvel();
    const actualPlanarSpeed = Math.hypot(postVel.x, postVel.z);

    // Detect physics collision impulses from sudden uncommanded velocity loss
    const speedDrop = this.prevPlanarSpeed - actualPlanarSpeed;
    const blockedDrop = commandedPlanarSpeed - actualPlanarSpeed;
    const collisionImpact =
      !intent.brake && (speedDrop > 4.2 || blockedDrop > 5.0)
        ? THREE.MathUtils.clamp(Math.max(speedDrop, blockedDrop) / 16, 0.15, 1)
        : 0;
    this.prevPlanarSpeed = actualPlanarSpeed;

    // Respect terrain & bridge deck height cleanly
    const minGroundY = this.sampleSurfaceY(nextPos.x, nextPos.z) + 0.56;
    if (nextPos.y < minGroundY) {
      this.chassisBody.setTranslation({ x: nextPos.x, y: minGroundY, z: nextPos.z }, true);
      if (this.chassisBody.linvel().y < 0) {
        const v = this.chassisBody.linvel();
        this.chassisBody.setLinvel({ x: v.x, y: 0, z: v.z }, true);
      }
    }

    const finalPos = this.chassisBody.translation();
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
      const wRay = new RAPIER.Ray({ x: wx, y: finalPos.y + 0.15, z: wz }, { x: 0, y: -1, z: 0 });
      const wHit = this.world.castRay(wRay, 1.35, true, undefined, undefined, undefined, this.chassisBody);
      const groundAtWheel = wHit ? finalPos.y + 0.15 - wHit.timeOfImpact : this.sampleSurfaceY(wx, wz);
      const clearance = THREE.MathUtils.clamp(carBottomY - groundAtWheel, -0.18, 0.45);
      // 1.0 = full compression, 0.0 = full extension
      const comp = THREE.MathUtils.clamp(1 - (clearance + 0.12) / 0.48, 0, 1);
      this.wheelCompressions[i] = THREE.MathUtils.lerp(this.wheelCompressions[i], comp, 0.35);
    }

    // Dynamic chassis pitch & roll driven by terrain slope, acceleration, suspension & drift
    const frontComp = (this.wheelCompressions[0] + this.wheelCompressions[1]) * 0.5;
    const rearComp = (this.wheelCompressions[2] + this.wheelCompressions[3]) * 0.5;
    const leftComp = (this.wheelCompressions[0] + this.wheelCompressions[2]) * 0.5;
    const rightComp = (this.wheelCompressions[1] + this.wheelCompressions[3]) * 0.5;

    const aheadX = finalPos.x + _forward.x * 1.4;
    const aheadZ = finalPos.z + _forward.z * 1.4;
    const slopePitch = this.isGrounded
      ? THREE.MathUtils.clamp(
          (this.sampleSurfaceY(aheadX, aheadZ) - this.sampleSurfaceY(finalPos.x, finalPos.z)) * 0.45,
          -0.26,
          0.26,
        )
      : 0;
    const suspPitch = (rearComp - frontComp) * 0.12;
    const accelPitch = this.isGrounded
      ? THREE.MathUtils.clamp((this.forwardSpeed - currentFwd) * 0.045, -0.09, 0.09)
      : THREE.MathUtils.clamp(linVel.y * 0.035, -0.22, 0.22);
    const suspRoll = (leftComp - rightComp) * 0.11;

    _euler.set(slopePitch + accelPitch + suspPitch, this.yaw, suspRoll, 'YXZ');
    _quat.setFromEuler(_euler);

    // Sync dynamic crates & cones with Rapier
    for (const db of this.dynamicBodies) {
      const t = db.body.translation();
      const r = db.body.rotation();
      db.mesh.position.set(t.x, t.y, t.z);
      db.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }

    return {
      justLanded,
      justJumped,
      collisionImpact,
      wheelCompressions: [
        this.wheelCompressions[0],
        this.wheelCompressions[1],
        this.wheelCompressions[2],
        this.wheelCompressions[3],
      ],
      position: new THREE.Vector3(finalPos.x, finalPos.y - 0.56, finalPos.z),
      quaternion: _quat.clone(),
    };
  }

  getYaw(): number {
    return this.yaw;
  }

  dispose(): void {
    this.world.free();
  }
}
