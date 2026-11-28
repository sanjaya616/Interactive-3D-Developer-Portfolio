import * as THREE from 'three';
import { WORLD_LANDMARKS } from '../data/portfolioData';
import { computeAiRubberBandSpeed, computeGroundHeight } from './physicsMath';
import { PADDOCK_CENTER, RING_ROAD_DEF } from './worldConstants';

export interface AiTrafficFrameInput {
  dt: number;
  motionTime: number;
  playerX: number;
  playerY: number;
  playerZ: number;
  playerYaw: number;
  playerSpeedMs: number;
  raceActive: boolean;
  activeTargetX: number | null;
  activeTargetZ: number | null;
  activeTargetLabel: string | null;
  reducedMotion: boolean;
}

export interface AiTrafficSystem {
  update: (input: AiTrafficFrameInput) => {
    companionDroneText: string;
  };
  setVisible: (visible: boolean) => void;
}

interface RingCarRuntime {
  grp: THREE.Group;
  wheels: THREE.Mesh[];
  angle: number;
  laneRadius: number;
  baseSpeed: number;
  curSpeed: number;
}

interface RivalCarRuntime {
  grp: THREE.Group;
  wheels: THREE.Mesh[];
  angle: number;
  laneRadius: number;
  baseCruiseMs: number;
  curSpeed: number;
}

function buildCompactAiCarMesh(
  bodyHex: number,
  accentHex: number,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
): { grp: THREE.Group; wheels: THREE.Mesh[] } {
  const grp = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyHex,
    roughness: 0.34,
    metalness: 0.2,
  });
  const cabinMat = new THREE.MeshPhysicalMaterial({
    color: 0x1b242c,
    roughness: 0.14,
    metalness: 0.1,
    transparent: true,
    opacity: 0.78,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    roughness: 0.45,
    metalness: 0.25,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x22201e,
    roughness: 0.85,
  });
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff0b8 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xe6483d });
  materials.push(bodyMat, cabinMat, trimMat, tireMat, lightMat, tailMat);

  const hullGeo = new THREE.BoxGeometry(1.56, 0.56, 3.12);
  const cabinGeo = new THREE.BoxGeometry(1.28, 0.46, 1.54);
  const wingGeo = new THREE.BoxGeometry(1.42, 0.08, 0.32);
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.24, 12);
  wheelGeo.rotateZ(Math.PI * 0.5);
  const lampGeo = new THREE.BoxGeometry(0.32, 0.12, 0.06);
  geometries.push(hullGeo, cabinGeo, wingGeo, wheelGeo, lampGeo);

  const hull = new THREE.Mesh(hullGeo, bodyMat);
  hull.position.y = 0.46;
  hull.castShadow = true;
  hull.receiveShadow = true;
  grp.add(hull);

  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.set(0, 0.92, -0.14);
  cabin.castShadow = true;
  grp.add(cabin);

  const spoiler = new THREE.Mesh(wingGeo, trimMat);
  spoiler.position.set(0, 0.92, -1.36);
  grp.add(spoiler);

  const frontL = new THREE.Mesh(lampGeo, lightMat);
  frontL.position.set(-0.52, 0.48, 1.57);
  const frontR = new THREE.Mesh(lampGeo, lightMat);
  frontR.position.set(0.52, 0.48, 1.57);
  const rearL = new THREE.Mesh(lampGeo, tailMat);
  rearL.position.set(-0.52, 0.48, -1.57);
  const rearR = new THREE.Mesh(lampGeo, tailMat);
  rearR.position.set(0.52, 0.48, -1.57);
  grp.add(frontL, frontR, rearL, rearR);

  const wheels: THREE.Mesh[] = [];
  const wheelOffsets: [number, number][] = [
    [-0.78, 0.98],
    [0.78, 0.98],
    [-0.78, -0.98],
    [0.78, -0.98],
  ];
  for (const [wx, wz] of wheelOffsets) {
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.position.set(wx, 0.32, wz);
    w.castShadow = true;
    grp.add(w);
    wheels.push(w);
  }

  return { grp, wheels };
}

export function createAiTrafficSystem(
  scene: THREE.Scene,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
): AiTrafficSystem {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'ai-traffic-and-drone';
  scene.add(rootGroup);

  // =========================================================================
  // 1. <= 4 RING ROAD CRUISE TRAFFIC CARS (outer lane, yields gently near player)
  // =========================================================================
  const trafficConfigs = [
    { angle: 0.4, body: 0x21968b, accent: 0xfff9f0, speed: 8.6 },
    { angle: 2.0, body: 0xe69f38, accent: 0x26211e, speed: 9.1 },
    { angle: 3.6, body: 0x5e915e, accent: 0xfff9f0, speed: 8.3 },
    { angle: 5.1, body: 0x3e7b9e, accent: 0xec6d2c, speed: 9.4 },
  ];

  const trafficCars: RingCarRuntime[] = trafficConfigs.map((cfg) => {
    const { grp, wheels } = buildCompactAiCarMesh(cfg.body, cfg.accent, geometries, materials);
    rootGroup.add(grp);
    return {
      grp,
      wheels,
      angle: cfg.angle,
      laneRadius: RING_ROAD_DEF.radius + 1.15,
      baseSpeed: cfg.speed,
      curSpeed: cfg.speed,
    };
  });

  // =========================================================================
  // 2. 3 RUBBER-BANDING PADDOCK CIRCUIT RIVALS
  // =========================================================================
  const rivalConfigs = [
    { angle: 0.15, laneOffset: -1.1, body: 0xee5d52, accent: 0xffd54f, cruise: 16.8 },
    { angle: 2.25, laneOffset: 1.0, body: 0x24354f, accent: 0xee5d52, cruise: 17.6 },
    { angle: 4.35, laneOffset: 0.0, body: 0x7246a6, accent: 0xfff9f0, cruise: 16.2 },
  ];

  const rivals: RivalCarRuntime[] = rivalConfigs.map((cfg) => {
    const { grp, wheels } = buildCompactAiCarMesh(cfg.body, cfg.accent, geometries, materials);
    rootGroup.add(grp);
    return {
      grp,
      wheels,
      angle: cfg.angle,
      laneRadius: PADDOCK_CENTER.radius + cfg.laneOffset,
      baseCruiseMs: cfg.cruise,
      curSpeed: cfg.cruise,
    };
  });

  // =========================================================================
  // 3. FLOATING COMPANION GUIDE DRONE (points toward waypoint / nearest landmark)
  // =========================================================================
  const droneGrp = new THREE.Group();
  const droneBodyGeo = new THREE.OctahedronGeometry(0.36, 1);
  const droneRingGeo = new THREE.TorusGeometry(0.52, 0.05, 8, 24);
  droneRingGeo.rotateX(Math.PI * 0.5);
  const droneNoseGeo = new THREE.ConeGeometry(0.14, 0.34, 8);
  droneNoseGeo.rotateX(Math.PI * 0.5);
  geometries.push(droneBodyGeo, droneRingGeo, droneNoseGeo);

  const droneBodyMat = new THREE.MeshStandardMaterial({
    color: 0x21968b,
    emissive: 0x165e57,
    emissiveIntensity: 0.65,
    roughness: 0.25,
    metalness: 0.55,
  });
  const droneRingMat = new THREE.MeshBasicMaterial({
    color: 0xffd54f,
    transparent: true,
    opacity: 0.85,
  });
  const droneEyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  materials.push(droneBodyMat, droneRingMat, droneEyeMat);

  const droneCore = new THREE.Mesh(droneBodyGeo, droneBodyMat);
  const droneRing = new THREE.Mesh(droneRingGeo, droneRingMat);
  const droneNose = new THREE.Mesh(droneNoseGeo, droneEyeMat);
  droneNose.position.z = 0.44;
  droneGrp.add(droneCore, droneRing, droneNose);
  droneGrp.position.set(1.8, 2.2, 4.0);
  rootGroup.add(droneGrp);

  // Preallocated scratch vectors (zero per-frame heap churn)
  const _droneTargetPos = new THREE.Vector3();
  const _lookVec = new THREE.Vector3();
  let lastDroneText = 'Cruise toward any landmark sign or press M for the map';
  let droneTextCooldown = 0;

  const update = (input: AiTrafficFrameInput) => {
    const dt = Math.min(0.05, Math.max(0.001, input.dt));

    // Update Ring Road Traffic
    for (let i = 0; i < trafficCars.length; i++) {
      const car = trafficCars[i];
      const cx = Math.cos(car.angle) * car.laneRadius;
      const cz = Math.sin(car.angle) * car.laneRadius;
      const distPlayer = Math.hypot(cx - input.playerX, cz - input.playerZ);

      // Yield cleanly within 9.5m of player so player never gets boxed on viaducts
      let targetSpeed = distPlayer < 9.5 ? 0.4 : distPlayer < 16 ? car.baseSpeed * 0.45 : car.baseSpeed;
      // Maintain spacing behind next ring car
      for (let j = 0; j < trafficCars.length; j++) {
        if (i === j) continue;
        const other = trafficCars[j];
        const dAng = ((other.angle - car.angle + Math.PI * 2) % (Math.PI * 2));
        if (dAng > 0 && dAng < 0.42) {
          targetSpeed = Math.min(targetSpeed, other.curSpeed * 0.65);
        }
      }

      car.curSpeed += (targetSpeed - car.curSpeed) * Math.min(1, dt * 4.5);
      car.angle = (car.angle + (car.curSpeed * dt) / car.laneRadius) % (Math.PI * 2);

      const nx = Math.cos(car.angle) * car.laneRadius;
      const nz = Math.sin(car.angle) * car.laneRadius;
      const ny = computeGroundHeight(nx, nz);
      // Tangent heading along counter-clockwise ring road: (-sin, cos)
      const yaw = Math.atan2(-Math.sin(car.angle), Math.cos(car.angle));
      car.grp.position.set(nx, ny, nz);
      car.grp.rotation.set(0, yaw, 0);

      const spin = (car.curSpeed * dt) / 0.32;
      for (let w = 0; w < car.wheels.length; w++) {
        car.wheels[w].rotation.x += spin;
      }
    }

    // Update Paddock Rivals (active speed during race, gentle demo lap otherwise)
    const playerPaddockAngle = Math.atan2(
      input.playerZ - PADDOCK_CENTER.z,
      input.playerX - PADDOCK_CENTER.x,
    );
    const distToPaddock = Math.hypot(
      input.playerX - PADDOCK_CENTER.x,
      input.playerZ - PADDOCK_CENTER.z,
    );

    for (let i = 0; i < rivals.length; i++) {
      const rv = rivals[i];
      let targetSpeed = input.raceActive ? rv.baseCruiseMs : 11.2;
      if (input.raceActive && distToPaddock < 36) {
        let angDiff = rv.angle - playerPaddockAngle;
        while (angDiff > Math.PI) angDiff -= Math.PI * 2;
        while (angDiff < -Math.PI) angDiff += Math.PI * 2;
        const signedGapMeters = angDiff * rv.laneRadius;
        targetSpeed = computeAiRubberBandSpeed(rv.baseCruiseMs, signedGapMeters);
      }

      rv.curSpeed += (targetSpeed - rv.curSpeed) * Math.min(1, dt * 3.5);
      rv.angle = (rv.angle + (rv.curSpeed * dt) / rv.laneRadius) % (Math.PI * 2);

      const rx = PADDOCK_CENTER.x + Math.cos(rv.angle) * rv.laneRadius;
      const rz = PADDOCK_CENTER.z + Math.sin(rv.angle) * rv.laneRadius;
      const ry = computeGroundHeight(rx, rz);
      const yaw = Math.atan2(-Math.sin(rv.angle), Math.cos(rv.angle));
      rv.grp.position.set(rx, ry, rz);
      rv.grp.rotation.set(0, yaw, 0);

      const spin = (rv.curSpeed * dt) / 0.32;
      for (let w = 0; w < rv.wheels.length; w++) {
        rv.wheels[w].rotation.x += spin;
      }
    }

    // Update Companion Guide Drone smoothly beside player
    const rightX = Math.cos(input.playerYaw);
    const rightZ = -Math.sin(input.playerYaw);
    const fwdX = Math.sin(input.playerYaw);
    const fwdZ = Math.cos(input.playerYaw);
    const bob = input.reducedMotion ? 0 : Math.sin(input.motionTime * 2.8) * 0.16;

    _droneTargetPos.set(
      input.playerX + rightX * 1.9 + fwdX * 0.8,
      input.playerY + 2.15 + bob,
      input.playerZ + rightZ * 1.9 + fwdZ * 0.8,
    );
    droneGrp.position.lerp(_droneTargetPos, 1 - Math.exp(-5.5 * dt));

    if (!input.reducedMotion) {
      droneRing.rotation.z = input.motionTime * 2.1;
    }

    // Determine target POI for drone orientation and contextual guidance cue
    let goalX = input.activeTargetX;
    let goalZ = input.activeTargetZ;
    let goalLabel = input.activeTargetLabel;

    if (goalX === null || goalZ === null) {
      let nearestLm = WORLD_LANDMARKS[0];
      let bestDist = Infinity;
      for (let i = 0; i < WORLD_LANDMARKS.length; i++) {
        const lm = WORLD_LANDMARKS[i];
        const d = Math.hypot(lm.position.x - input.playerX, lm.position.z - input.playerZ);
        if (d < bestDist) {
          bestDist = d;
          nearestLm = lm;
        }
      }
      goalX = nearestLm.position.x;
      goalZ = nearestLm.position.z;
      goalLabel = `${nearestLm.zoneLabel} (${Math.round(bestDist)}m)`;
    }

    _lookVec.set(goalX, droneGrp.position.y, goalZ);
    droneGrp.lookAt(_lookVec);

    droneTextCooldown -= dt;
    if (droneTextCooldown <= 0 && goalLabel) {
      droneTextCooldown = 0.6;
      const d = Math.round(Math.hypot(goalX - input.playerX, goalZ - input.playerZ));
      lastDroneText = d < 12 ? `Arriving: ${goalLabel}` : `Guide → ${goalLabel}`;
    }

    return { companionDroneText: lastDroneText };
  };

  return {
    update,
    setVisible: (visible: boolean) => {
      rootGroup.visible = visible;
    },
  };
}
