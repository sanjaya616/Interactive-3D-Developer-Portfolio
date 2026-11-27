import * as THREE from 'three';
import type { CameraMode } from '../types/portfolio';
import { computeBridgeSurfaceY, computeGroundHeight } from './physicsMath';
import type { StaticBoxColliderDef } from './worldEnvironment';

const _desiredPos = new THREE.Vector3();
const _desiredTarget = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _rayDir = new THREE.Vector3();

export class CameraRig {
  camera: THREE.PerspectiveCamera;
  private currentPos = new THREE.Vector3(0, 10, 18);
  private currentTarget = new THREE.Vector3(0, 1, 0);
  private trauma = 0;
  private flyoverAngle = 0.4;

  // Interactive camera rotation & zoom offsets
  private orbitYaw = 0;
  private orbitPitch = 0.28;
  private zoomScale = 1.0;

  // Photo mode free camera state
  private photoFocus = new THREE.Vector3(0, 1.5, 5.5);
  private photoYaw = 0.6;
  private photoPitch = 0.25;
  private photoDist = 8.5;
  private photoFov = 50;

  private colliders: StaticBoxColliderDef[] = [];
  private reducedMotion = false;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(52, aspect, 0.3, 340);
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentTarget);
  }

  setColliders(colliders: StaticBoxColliderDef[]): void {
    this.colliders = colliders;
  }

  setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
    if (enabled) this.trauma = 0;
  }

  setFarPlane(far: number): void {
    if (Math.abs(this.camera.far - far) > 1) {
      this.camera.far = far;
      this.camera.updateProjectionMatrix();
    }
  }

  addTrauma(amount: number): void {
    if (this.reducedMotion) return;
    this.trauma = Math.min(1, this.trauma + amount);
  }

  adjustOrbit(deltaYaw: number, deltaPitch: number): void {
    this.orbitYaw += deltaYaw;
    this.orbitPitch = THREE.MathUtils.clamp(this.orbitPitch + deltaPitch, 0.08, 1.15);
  }

  adjustZoom(delta: number): void {
    this.zoomScale = THREE.MathUtils.clamp(this.zoomScale + delta, 0.65, 1.75);
  }

  resetOrbit(): void {
    this.orbitYaw = 0;
    this.orbitPitch = 0.28;
    this.zoomScale = 1.0;
  }

  enterPhotoMode(vehiclePos: THREE.Vector3): void {
    this.photoFocus.copy(vehiclePos);
    this.photoFocus.y += 1.3;
    this.photoYaw = 0.72;
    this.photoPitch = 0.24;
    this.photoDist = 8.2;
    this.photoFov = 48;
  }

  panPhotoCamera(forwardAmt: number, rightAmt: number, upAmt: number, dt: number): void {
    const speed = 16 * dt;
    _forward.set(-Math.sin(this.photoYaw), 0, -Math.cos(this.photoYaw));
    _right.set(Math.cos(this.photoYaw), 0, -Math.sin(this.photoYaw));
    this.photoFocus.addScaledVector(_forward, forwardAmt * speed);
    this.photoFocus.addScaledVector(_right, rightAmt * speed);
    this.photoFocus.y = THREE.MathUtils.clamp(
      this.photoFocus.y + upAmt * speed,
      computeGroundHeight(this.photoFocus.x, this.photoFocus.z) + 0.7,
      45,
    );
    this.photoFocus.x = THREE.MathUtils.clamp(this.photoFocus.x, -155, 155);
    this.photoFocus.z = THREE.MathUtils.clamp(this.photoFocus.z, -155, 155);
  }

  orbitPhotoCamera(deltaYaw: number, deltaPitch: number): void {
    this.photoYaw += deltaYaw;
    this.photoPitch = THREE.MathUtils.clamp(this.photoPitch + deltaPitch, -0.3, 1.35);
  }

  zoomPhotoCamera(delta: number): void {
    this.photoDist = THREE.MathUtils.clamp(this.photoDist + delta, 2.8, 36);
  }

  setPhotoFov(fov: number): void {
    this.photoFov = THREE.MathUtils.clamp(fov, 26, 85);
  }

  getPhotoSettings(): { fov: number; distance: number } {
    return { fov: this.photoFov, distance: this.photoDist };
  }

  updatePhotoMode(dt: number): void {
    const horiz = Math.cos(this.photoPitch) * this.photoDist;
    _desiredPos.set(
      this.photoFocus.x + Math.sin(this.photoYaw) * horiz,
      this.photoFocus.y + Math.sin(this.photoPitch) * this.photoDist,
      this.photoFocus.z + Math.cos(this.photoYaw) * horiz,
    );
    this.preventClipping(this.photoFocus, _desiredPos);

    const alpha = 1 - Math.exp(-12 * Math.max(dt, 0.016));
    this.currentPos.lerp(_desiredPos, alpha);
    this.currentTarget.lerp(this.photoFocus, alpha);
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentTarget);

    if (Math.abs(this.camera.fov - this.photoFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, this.photoFov, 10, Math.max(dt, 0.016));
      this.camera.updateProjectionMatrix();
    }
  }

  snapToVehicle(vehiclePos: THREE.Vector3, vehicleQuat: THREE.Quaternion): void {
    _forward.set(0, 0, -1).applyQuaternion(vehicleQuat);
    this.currentPos.copy(vehiclePos).addScaledVector(_forward, -10.5);
    this.currentPos.y += 5.4;
    this.currentTarget.copy(vehiclePos).addScaledVector(_forward, 4);
    this.currentTarget.y += 1.2;
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentTarget);
  }

  updateTitleFlyover(dt: number): void {
    const rate = this.reducedMotion ? 0.03 : 0.14;
    this.flyoverAngle += dt * rate;
    const radius = 38;
    _desiredPos.set(
      Math.cos(this.flyoverAngle) * radius,
      15 + (this.reducedMotion ? 0 : Math.sin(this.flyoverAngle * 1.5) * 2.5),
      Math.sin(this.flyoverAngle) * radius,
    );
    _desiredTarget.set(0, 2.2, -4);

    if (dt <= 0) {
      this.currentPos.copy(_desiredPos);
      this.currentTarget.copy(_desiredTarget);
    } else {
      const alpha = 1 - Math.exp(-3.5 * dt);
      this.currentPos.lerp(_desiredPos, alpha);
      this.currentTarget.lerp(_desiredTarget, alpha);
    }
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentTarget);
  }

  /**
   * Prevents the camera from clipping beneath sculpted terrain, bridge deck, or inside buildings.
   */
  private preventClipping(anchor: THREE.Vector3, desired: THREE.Vector3): void {
    // 1. Sample terrain along ray from anchor -> desired and pull in / elevate if needed
    _rayDir.subVectors(desired, anchor);
    const totalLen = _rayDir.length();
    if (totalLen > 0.1) {
      _rayDir.divideScalar(totalLen);
      let clampedLen = totalLen;

      // Check building & tunnel AABBs (skip thin trees & low bridge railings)
      for (const c of this.colliders) {
        if (c.ignoreCamera) continue;
        // Quick radial skip for distant colliders
        const dx = c.x - anchor.x;
        const dz = c.z - anchor.z;
        if (dx * dx + dz * dz > (totalLen + 8) * (totalLen + 8)) continue;
        if (c.hx < 0.7 && c.hz < 0.7) continue; // ignore thin tree trunks for smooth driving camera

        // Step along camera ray (transforming into collider local space if rotated)
        const halfX = c.hx + 0.55;
        const halfZ = c.hz + 0.55;
        const minY = c.y - c.hy - 0.2;
        const maxY = c.y + c.hy + 0.5;
        const hasRot = Boolean(c.ry && Math.abs(c.ry) > 1e-4);
        const cosR = hasRot ? Math.cos(c.ry!) : 1;
        const sinR = hasRot ? Math.sin(c.ry!) : 0;

        for (let t = 2.0; t <= clampedLen; t += 0.9) {
          const sx = anchor.x + _rayDir.x * t;
          const sy = anchor.y + _rayDir.y * t;
          const sz = anchor.z + _rayDir.z * t;
          if (sy < minY || sy > maxY) continue;
          const rdx = sx - c.x;
          const rdz = sz - c.z;
          const lx = hasRot ? rdx * cosR - rdz * sinR : rdx;
          const lz = hasRot ? rdx * sinR + rdz * cosR : rdz;
          if (Math.abs(lx) <= halfX && Math.abs(lz) <= halfZ) {
            clampedLen = Math.max(2.6, t - 0.9);
            break;
          }
        }
      }

      if (clampedLen < totalLen) {
        desired.copy(anchor).addScaledVector(_rayDir, clampedLen);
      }
    }

    // 2. Never dip below terrain or bridge height
    const surfY = Math.max(
      computeGroundHeight(desired.x, desired.z),
      computeBridgeSurfaceY(desired.x, desired.z) ?? -99,
    );
    const minCamY = surfY + 1.15;
    if (desired.y < minCamY) {
      desired.y = minCamY;
    }
  }

  updateGameplay(
    vehiclePos: THREE.Vector3,
    vehicleQuat: THREE.Quaternion,
    speedMs: number,
    isBoosting: boolean,
    mode: CameraMode,
    dt: number,
    isDrifting = false,
    vehicleYawRad?: number,
  ): void {
    if (vehicleYawRad !== undefined) {
      _forward.set(-Math.sin(vehicleYawRad), 0, -Math.cos(vehicleYawRad));
    } else {
      _forward.set(0, 0, -1).applyQuaternion(vehicleQuat).setY(0);
      if (_forward.lengthSq() < 0.02) {
        _forward.set(0, 0, -1);
      } else {
        _forward.normalize();
      }
    }

    const applyFollowOrbit = (baseDist: number, baseHeight: number, lookAhead: number) => {
      const baseYaw = Math.atan2(-_forward.x, -_forward.z);
      const totalYaw = baseYaw + this.orbitYaw;
      const pitchOffset = this.orbitPitch - 0.28;
      const horizDist = baseDist * Math.cos(pitchOffset * 0.65);
      const vertDist = Math.max(1.4, baseHeight + Math.sin(pitchOffset) * baseDist * 0.65);
      _desiredPos.set(
        vehiclePos.x + Math.sin(totalYaw) * horizDist,
        vehiclePos.y + vertDist,
        vehiclePos.z + Math.cos(totalYaw) * horizDist,
      );
      _desiredTarget.copy(vehiclePos).addScaledVector(_forward, lookAhead).addScaledVector(_up, 1.3);
    };

    if (mode === 'chase') {
      applyFollowOrbit(10.2 * this.zoomScale, 5.1 * this.zoomScale, 4.5);
    } else if (mode === 'close') {
      applyFollowOrbit(6.2 * this.zoomScale, 2.75 * this.zoomScale, 6.2);
    } else if (mode === 'far') {
      applyFollowOrbit(16.5 * this.zoomScale, 8.8 * this.zoomScale, 6.0);
    } else if (mode === 'topdown') {
      _desiredPos.set(
        vehiclePos.x,
        vehiclePos.y + 26 * this.zoomScale,
        vehiclePos.z + 11 * this.zoomScale,
      );
      _desiredTarget.copy(vehiclePos);
    } else {
      const radius = 11.5 * this.zoomScale;
      const horiz = Math.cos(this.orbitPitch) * radius;
      _desiredPos.set(
        vehiclePos.x + Math.sin(this.orbitYaw) * horiz,
        vehiclePos.y + 1.4 + Math.sin(this.orbitPitch) * radius,
        vehiclePos.z + Math.cos(this.orbitYaw) * horiz,
      );
      _desiredTarget.copy(vehiclePos).addScaledVector(_up, 1.25);
    }

    this.preventClipping(_desiredTarget, _desiredPos);

    const followRate = mode === 'close' ? 11.5 : mode === 'orbit' ? 14 : 7.8;
    const alpha = 1 - Math.exp(-followRate * dt);
    this.currentPos.lerp(_desiredPos, alpha);
    this.currentTarget.lerp(_desiredTarget, alpha);

    const targetFov =
      mode === 'topdown'
        ? 46
        : this.reducedMotion
          ? 52
          : 52 +
            Math.min(10, Math.abs(speedMs) * 0.28) +
            (isBoosting ? 5.5 : 0) +
            (isDrifting ? 2.5 : 0);
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, dt);
      this.camera.updateProjectionMatrix();
    }

    this.camera.position.copy(this.currentPos);
    if (!this.reducedMotion && this.trauma > 0.001) {
      const shake = this.trauma * this.trauma * 0.35;
      this.camera.position.x += (Math.random() * 2 - 1) * shake;
      this.camera.position.y += (Math.random() * 2 - 1) * shake;
      this.trauma = Math.max(0, this.trauma - dt * 2.4);
    }

    this.camera.lookAt(this.currentTarget);
  }
}
