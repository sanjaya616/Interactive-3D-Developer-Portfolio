import * as THREE from 'three';
import {
  BUG_HUNT_TARGETS,
  DRIFT_CIRCUIT_CHECKPOINTS,
  FOREST_TRAIL_GATES,
  LAGOON_RUN_CHECKPOINTS,
  LAGOON_RUN_OBSTACLES,
  MEMORY_PADS,
  PADDOCK_CHECKPOINTS,
  PORTFOLIO_PROJECTS,
  PRECISION_PARKING_BAYS,
  SECRET_LOCATIONS,
  SKILL_CATEGORIES,
  SQL_CHALLENGE_GATES,
  STUNT_AIR_CHECKPOINTS,
  TIME_TRIAL_CHECKPOINTS,
  TREASURE_CHESTS,
  WORLD_COLLECTIBLES,
  WORLD_LANDMARKS,
} from '../data/portfolioData';
import type { CollectibleKind, QualityLevel, WeatherMode, WindMode } from '../types/portfolio';
import { createAtmosphereSystem } from './atmosphereSystem';
import { createAiTrafficSystem, type AiTrafficFrameInput } from './aiTraffic';
import { computeBridgeSurfaceY, computeGroundHeight } from './physicsMath';
import { createWorldProceduralTextures } from './proceduralTextures';
import {
  CRATE_YARD_DEFS,
  auditPlacedProps,
  buildManagedProps,
} from './propPlacement';
import { buildBridgesAndRoadNetwork } from './bridgesAndRoads';
import { createVegetationSystem } from './vegetationSystem';
import { resolveWindProfile } from './vegetationPlacement';
import { createWaterSystem } from './waterSystem';
import { MOORED_BOAT_ANCHOR, WATER_BASE_Y } from './waterWaveMath';
import {
  OUTER_TERRAIN_SPAN,
  TERRAIN_CELLS,
  TERRAIN_SPAN,
  WORLD_HALF_SPAN,
} from './worldConstants';
import {
  BUILDING_FOOTPRINTS,
  WEST_RIDGE_TUNNEL_DEF,
  isPointClearForProp,
  validateWorldLayout,
} from './worldLayout';

export type StaticColliderKind =
  | 'building'
  | 'bridge-rail'
  | 'ramp-rail'
  | 'tunnel-wall'
  | 'tree'
  | 'prop';

export interface StaticBoxColliderDef {
  x: number;
  y: number;
  z: number;
  hx: number;
  hy: number;
  hz: number;
  ry?: number;
  ignoreCamera?: boolean;
  friction?: number;
  kind?: StaticColliderKind;
}

export interface DynamicPropDef {
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  hx: number;
  hy: number;
  hz: number;
  mass: number;
}

export interface CollectibleItem {
  id: string;
  kind: CollectibleKind;
  x: number;
  y: number;
  z: number;
  label: string;
  mesh: THREE.Group;
  collected: boolean;
}

export interface WorldBuildResult {
  staticColliders: StaticBoxColliderDef[];
  dynamicProps: DynamicPropDef[];
  collectibles: CollectibleItem[];
  applyWeatherMode: (mode: WeatherMode, immediate?: boolean) => void;
  setSecurityGateOpen: (open: boolean) => void;
  setRfidCardCollected: (collected: boolean) => void;
  setDeliveryTarget: (landmarkId: string | null) => void;
  setWaypointTarget: (
    landmarkId: string | null,
    colorHex?: string,
    overridePos?: { x: number; z: number },
  ) => void;
  triggerDiscoveryPulse: (x: number, z: number, colorHex?: string) => void;
  setSqlProgress: (nextGateIdx: number) => void;
  setPaddockCheckpoint: (nextIdx: number) => void;
  setTimeTrialProgress: (nextIdx: number | null) => void;
  setBugHuntState: (foundIds: string[]) => void;
  setMemoryPadHighlight: (padId: number | null) => void;
  setTreasureState: (foundIds: string[]) => void;
  setLagoonRunProgress: (nextIdx: number | null) => void;
  setDriftGateProgress: (nextIdx: number | null) => void;
  setStuntAirProgress: (foundIds: string[]) => void;
  setParkingBayProgress: (nextIdx: number | null, alignPct?: number) => void;
  setForestTrailProgress: (nextIdx: number | null) => void;
  setVehicleWake: (x: number, z: number, speedMs: number, inWater: boolean) => void;
  setPerformanceProfile: (
    quality: QualityLevel,
    reducedMotion: boolean,
    isSoftwareGl?: boolean,
  ) => void;
  setWindMode: (mode: WindMode) => void;
  setDayNightCycle: (enabled: boolean) => void;
  updateSunTarget: (px: number, pz: number) => void;
  updatePlayerContext: (px: number, py: number, pz: number, camX: number, camZ: number) => void;
  updateAiTraffic: (input: AiTrafficFrameInput) => { companionDroneText: string };
  updateGpsRoute: (points: readonly { x: number; z: number }[] | null, colorHex?: string) => void;
  setRoadLayerDebug: (enabled: boolean) => void;
  setPropAuditVisible: (visible: boolean) => void;
  setAllOrbsCollected: (collectedAll: boolean) => void;
  updateEnvironment: (elapsed: number, dt: number) => void;
  dispose: () => void;
}

function createSignTexture(
  title: string,
  subtitle: string,
  accentHex: string,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#26211E';
  ctx.fillRect(0, 0, 512, 192);

  ctx.fillStyle = '#FFF9F0';
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 172, 20);
  ctx.fill();

  ctx.lineWidth = 8;
  ctx.strokeStyle = accentHex;
  ctx.stroke();

  ctx.fillStyle = accentHex;
  ctx.fillRect(28, 26, 12, 140);

  ctx.fillStyle = '#26211E';
  ctx.font = 'bold 62px "Amatic SC", cursive, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 56, 72, 424);

  ctx.fillStyle = '#61564E';
  ctx.font = 'bold 22px Nunito, sans-serif';
  ctx.fillText(subtitle, 56, 134, 424);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRoadSignTexture(label: string, arrow = '→'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#26211E';
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#EC6D2C';
  ctx.beginPath();
  ctx.roundRect(8, 8, 240, 112, 12);
  ctx.fill();
  ctx.fillStyle = '#FFF9F0';
  ctx.font = 'bold 24px Nunito, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${label} ${arrow}`, 128, 64, 222);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCheckeredTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const size = 32;
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#26211E' : '#FFF9F0';
      ctx.fillRect(x * size, y * size, size, size);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createExtrudedProfile(
  points: [number, number][],
  depth: number,
  bevelSize = 0.06,
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i][0], points[i][1]);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevelSize > 0,
    bevelThickness: bevelSize,
    bevelSize,
    bevelSegments: 1,
  });
  geo.center();
  return geo;
}

function createTunnelArchGeo(length = WEST_RIDGE_TUNNEL_DEF.length): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-5.8, 0);
  shape.lineTo(-5.8, 2.7);
  shape.absarc(0, 2.7, 5.8, Math.PI, 0, true);
  shape.lineTo(5.8, 0);
  shape.lineTo(4.4, 0);
  shape.lineTo(4.4, 2.65);
  shape.absarc(0, 2.65, 4.4, 0, Math.PI, false);
  shape.lineTo(-4.4, 0);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: true,
    bevelThickness: 0.14,
    bevelSize: 0.12,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -length / 2);
  return geo;
}

function isNearRoadOrBuilding(x: number, z: number): boolean {
  return !isPointClearForProp(x, z, 1.5);
}

export function buildWorldEnvironment(
  scene: THREE.Scene,
  maxAnisotropy: number,
): WorldBuildResult {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const staticColliders: StaticBoxColliderDef[] = [];
  const dynamicProps: DynamicPropDef[] = [];
  const collectibles: CollectibleItem[] = [];

  const techSymbols: { mesh: THREE.Mesh; baseY: number }[] = [];
  const soaringBirds: { grp: THREE.Group; cx: number; cz: number; radius: number; speed: number; alt: number; phase: number }[] = [];
  const windFlags: {
    seg1: THREE.Mesh;
    seg2: THREE.Mesh;
    seg3: THREE.Mesh;
    phase: number;
  }[] = [];
  const butterflies: {
    grp: THREE.Group;
    wL: THREE.Mesh;
    wR: THREE.Mesh;
    cx: number;
    baseY: number;
    cz: number;
    radius: number;
    speed: number;
    phase: number;
  }[] = [];
  const swimmingFish: {
    grp: THREE.Group;
    tail: THREE.Mesh;
    cx: number;
    baseY: number;
    cz: number;
    rx: number;
    rz: number;
    speed: number;
    phase: number;
  }[] = [];
  let radarDish: THREE.Group | null = null;
  let lighthouseBeam: THREE.Group | null = null;
  let mooredBoat: THREE.Group | null = null;
  let securityGateArm: THREE.Group | null = null;
  let securityGateOpen = false;
  let deliveryBeacon: THREE.Mesh | null = null;
  let waypointBeacon: THREE.Group | null = null;
  let waypointBeamMat: THREE.MeshBasicMaterial | null = null;
  let waypointHalo: THREE.Mesh | null = null;
  const discoveryPulses: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; life: number }[] = [];

  const procTex = createWorldProceduralTextures(maxAnisotropy);

  // Atmospheric Fog + Calibrated 3-Point Warm/Cool Lighting Rig
  const fog = new THREE.FogExp2('#F6DBB8', 0.004);
  scene.background = new THREE.Color('#F6DBB8');
  scene.fog = fog;

  const hemi = new THREE.HemisphereLight('#FFF4DE', '#9C734B', 0.72);
  hemi.position.set(0, 75, 0);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight('#FFE4B8', 1.48);
  sun.position.set(58, 76, 44);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 12;
  sun.shadow.camera.far = 250;
  const d = 128;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(sun.target);

  const coolFill = new THREE.DirectionalLight('#9CE4DF', 0.34);
  coolFill.position.set(-60, 32, -48);
  scene.add(coolFill);

  let currentWeather: WeatherMode = 'sunny';
  let currentWindMode: WindMode = 'auto';
  const initialWind = resolveWindProfile(currentWeather, currentWindMode);
  let windSpeed = initialWind.speedMultiplier;
  let windGust = initialWind.gustStrength;

  // Shared wind-fluttering cloth pennant builder (3 articulated cloth segments driven by wind profile)
  const flagPoleGeo = new THREE.CylinderGeometry(0.04, 0.055, 1.55, 6);
  const flagFinialGeo = new THREE.SphereGeometry(0.08, 8, 6);
  const flagSeg1Geo = new THREE.PlaneGeometry(0.52, 0.62);
  flagSeg1Geo.translate(0.26, 0, 0);
  const flagSeg2Geo = new THREE.PlaneGeometry(0.48, 0.56);
  flagSeg2Geo.translate(0.24, 0, 0);
  const flagSeg3Geo = new THREE.PlaneGeometry(0.44, 0.44);
  flagSeg3Geo.translate(0.22, 0, 0);
  geometries.push(flagPoleGeo, flagFinialGeo, flagSeg1Geo, flagSeg2Geo, flagSeg3Geo);

  const flagPoleMat = new THREE.MeshStandardMaterial({ color: 0x2f2926, roughness: 0.6 });
  materials.push(flagPoleMat);

  const createWindFlag = (
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    colorHex: string,
    phase: number,
    scale = 1,
  ) => {
    const fMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      emissive: new THREE.Color(colorHex),
      emissiveIntensity: 0.12,
      roughness: 0.72,
      side: THREE.DoubleSide,
    });
    materials.push(fMat);
    const holder = new THREE.Group();
    holder.position.set(x, y, z);
    holder.scale.setScalar(scale);
    const pole = new THREE.Mesh(flagPoleGeo, flagPoleMat);
    pole.position.y = 0.77;
    const fin = new THREE.Mesh(flagFinialGeo, fMat);
    fin.position.y = 1.58;
    const seg1 = new THREE.Mesh(flagSeg1Geo, fMat);
    seg1.position.set(0.03, 1.24, 0);
    const seg2 = new THREE.Mesh(flagSeg2Geo, fMat);
    seg2.position.set(0.51, 0, 0);
    const seg3 = new THREE.Mesh(flagSeg3Geo, fMat);
    seg3.position.set(0.47, 0, 0);
    seg1.add(seg2);
    seg2.add(seg3);
    holder.add(pole, fin, seg1);
    parent.add(holder);
    windFlags.push({ seg1, seg2, seg3, phase });
  };

  // 1. Sculpted 360x360 High-Resolution Terrain (2m cells synced with Rapier) + Scenic Valley Skirt & Seamless Shader Biomes
  const terrainGeo = new THREE.PlaneGeometry(
    TERRAIN_SPAN,
    TERRAIN_SPAN,
    TERRAIN_CELLS,
    TERRAIN_CELLS,
  );
  terrainGeo.rotateX(-Math.PI / 2);
  const tPos = terrainGeo.attributes.position;
  const tCol = new Float32Array(tPos.count * 3);
  const sandTint = new THREE.Color('#F3DEC0');
  const grassTint = new THREE.Color('#8FB86E');
  const forestTint = new THREE.Color('#5F8F54');
  const shoreTint = new THREE.Color('#DEC196');
  const ridgeTint = new THREE.Color('#BFA07C');
  const tempCol = new THREE.Color();

  for (let i = 0; i < tPos.count; i++) {
    const x = tPos.getX(i);
    const z = tPos.getZ(i);
    const y = computeGroundHeight(x, z);
    tPos.setY(i, y);

    const radial = Math.hypot(x, z);
    if (y < -0.08) {
      tempCol.copy(shoreTint);
    } else if (x < -56 && z < -44) {
      tempCol.copy(grassTint).lerp(forestTint, 0.58);
    } else if (radial > 142) {
      tempCol.copy(sandTint).lerp(ridgeTint, 0.62);
    } else if (y > 1.0 || (Math.sin(x * 0.075) * Math.cos(z * 0.075) > 0.22 && radial > 26)) {
      tempCol.copy(sandTint).lerp(grassTint, 0.62);
    } else {
      tempCol.copy(sandTint);
    }
    tCol[i * 3] = tempCol.r;
    tCol[i * 3 + 1] = tempCol.g;
    tCol[i * 3 + 2] = tempCol.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
  terrainGeo.computeVertexNormals();
  geometries.push(terrainGeo);

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.02,
  });
  terrainMat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vTerrainWorldPos;
        varying vec3 vTerrainWorldNorm;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vTerrainWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vTerrainWorldNorm = normalize(mat3(modelMatrix) * objectNormal);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vTerrainWorldPos;
        varying vec3 vTerrainWorldNorm;
        float terrainHash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }
        float terrainNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = terrainHash21(i);
          float b = terrainHash21(i + vec2(1.0, 0.0));
          float c = terrainHash21(i + vec2(0.0, 1.0));
          float d = terrainHash21(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float nLarge = terrainNoise(vTerrainWorldPos.xz * 0.055);
        float nMed = terrainNoise(vTerrainWorldPos.xz * 0.22);
        float nFine = terrainNoise(vTerrainWorldPos.xz * 0.85);
        float fbm = nLarge * 0.56 + nMed * 0.30 + nFine * 0.14;
        float slope = 1.0 - clamp(vTerrainWorldNorm.y, 0.0, 1.0);
        float rockMask = smoothstep(0.14, 0.34, slope);
        float grassMask = smoothstep(-0.02, 0.55, vTerrainWorldPos.y) * (1.0 - rockMask);
        vec3 warmSand = vec3(0.92, 0.82, 0.67);
        vec3 lushGrass = vec3(0.45, 0.64, 0.36);
        vec3 rockCol = vec3(0.56, 0.46, 0.37);
        vec3 biomeCol = mix(warmSand, lushGrass, grassMask * clamp(fbm * 1.15, 0.0, 1.0));
        biomeCol = mix(biomeCol, rockCol, rockMask);
        diffuseColor.rgb = mix(diffuseColor.rgb, biomeCol, 0.36) * (0.92 + fbm * 0.16);`,
      );
  };
  materials.push(terrainMat);

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // Seamless Scenic Outer Valley Skirt extending from ±176m out toward the distant FBM ridges
  const outerSkirtGeo = new THREE.RingGeometry(176, OUTER_TERRAIN_SPAN * 0.72, 72, 4);
  outerSkirtGeo.rotateX(-Math.PI / 2);
  const oPos = outerSkirtGeo.attributes.position;
  const oCol = new Float32Array(oPos.count * 3);
  for (let i = 0; i < oPos.count; i++) {
    const ox = oPos.getX(i);
    const oz = oPos.getZ(i);
    const r = Math.hypot(ox, oz);
    const baseY = computeGroundHeight(ox, oz);
    const lift = Math.max(0, (r - 178) * 0.16);
    oPos.setY(i, baseY + lift);
    tempCol.copy(sandTint).lerp(ridgeTint, Math.min(1, 0.5 + (r - 176) / 140));
    oCol[i * 3] = tempCol.r;
    oCol[i * 3 + 1] = tempCol.g;
    oCol[i * 3 + 2] = tempCol.b;
  }
  outerSkirtGeo.setAttribute('color', new THREE.BufferAttribute(oCol, 3));
  outerSkirtGeo.computeVertexNormals();
  geometries.push(outerSkirtGeo);
  const outerSkirtMesh = new THREE.Mesh(outerSkirtGeo, terrainMat);
  outerSkirtMesh.receiveShadow = true;
  scene.add(outerSkirtMesh);

  // Continuous Sandstone Perimeter Parapet Wall & Marker Posts along ±WORLD_HALF_SPAN (±156m)
  const parapetMat = new THREE.MeshStandardMaterial({ color: 0xd9bf9a, roughness: 0.88 });
  const parapetCapMat = new THREE.MeshStandardMaterial({ color: 0xcc5318, roughness: 0.68 });
  materials.push(parapetMat, parapetCapMat);
  const wallLen = WORLD_HALF_SPAN * 2 + 1.6;
  const nsWallGeo = new THREE.BoxGeometry(wallLen, 1.35, 0.75);
  const ewWallGeo = new THREE.BoxGeometry(0.75, 1.35, wallLen);
  const perimPostGeo = new THREE.BoxGeometry(1.05, 1.85, 1.05);
  geometries.push(nsWallGeo, ewWallGeo, perimPostGeo);

  for (const sz of [-WORLD_HALF_SPAN, WORLD_HALF_SPAN]) {
    const w = new THREE.Mesh(nsWallGeo, parapetMat);
    w.position.set(0, 0.65, sz);
    w.receiveShadow = true;
    w.castShadow = true;
    scene.add(w);
  }
  for (const sx of [-WORLD_HALF_SPAN, WORLD_HALF_SPAN]) {
    const w = new THREE.Mesh(ewWallGeo, parapetMat);
    w.position.set(sx, 0.65, 0);
    w.receiveShadow = true;
    w.castShadow = true;
    scene.add(w);
  }
  const postCoords: [number, number][] = [];
  for (let p = -WORLD_HALF_SPAN; p <= WORLD_HALF_SPAN; p += 26) {
    postCoords.push([p, -WORLD_HALF_SPAN], [p, WORLD_HALF_SPAN]);
    if (Math.abs(p) < WORLD_HALF_SPAN) {
      postCoords.push([-WORLD_HALF_SPAN, p], [WORLD_HALF_SPAN, p]);
    }
  }
  const perimPostInst = new THREE.InstancedMesh(perimPostGeo, parapetCapMat, postCoords.length);
  const dummy = new THREE.Object3D();
  postCoords.forEach(([px, pz], i) => {
    const gy = computeGroundHeight(px, pz);
    dummy.position.set(px, gy + 0.92, pz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    perimPostInst.setMatrixAt(i, dummy.matrix);
  });
  perimPostInst.instanceMatrix.needsUpdate = true;
  scene.add(perimPostInst);

  // Dense Perimeter Pine Tree Line outside playable wall (±160m..±176m)
  const pTrunkGeo = new THREE.CylinderGeometry(0.32, 0.45, 2.8, 6);
  const pConeGeo = new THREE.ConeGeometry(2.1, 5.4, 7);
  geometries.push(pTrunkGeo, pConeGeo);
  const pTrunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4b35, roughness: 0.9 });
  const pConeMat = new THREE.MeshStandardMaterial({ color: 0x456e47, roughness: 0.85 });
  materials.push(pTrunkMat, pConeMat);
  const borderTreeCoords: { x: number; z: number; s: number }[] = [];
  for (let i = 0; i < 84; i++) {
    const t = -WORLD_HALF_SPAN - 4 + ((i % 21) / 20) * (WORLD_HALF_SPAN * 2 + 8);
    const side = Math.floor(i / 21);
    const jitter = ((i * 37) % 11) + 4;
    const x = side === 0 ? -WORLD_HALF_SPAN - jitter : side === 1 ? WORLD_HALF_SPAN + jitter : t;
    const z = side === 2 ? -WORLD_HALF_SPAN - jitter : side === 3 ? WORLD_HALF_SPAN + jitter : t;
    borderTreeCoords.push({ x, z, s: 0.9 + ((i * 13) % 5) * 0.14 });
  }
  const btTrunkInst = new THREE.InstancedMesh(pTrunkGeo, pTrunkMat, borderTreeCoords.length);
  const btConeInst = new THREE.InstancedMesh(pConeGeo, pConeMat, borderTreeCoords.length);
  borderTreeCoords.forEach((bt, i) => {
    const gy = computeGroundHeight(bt.x, bt.z);
    dummy.position.set(bt.x, gy + 1.4 * bt.s, bt.z);
    dummy.rotation.set(0, i * 0.7, 0);
    dummy.scale.setScalar(bt.s);
    dummy.updateMatrix();
    btTrunkInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(bt.x, gy + 4.4 * bt.s, bt.z);
    dummy.updateMatrix();
    btConeInst.setMatrixAt(i, dummy.matrix);
  });
  btTrunkInst.instanceMatrix.needsUpdate = true;
  btConeInst.instanceMatrix.needsUpdate = true;
  scene.add(btTrunkInst, btConeInst);

  // 2. Stylized Coastal Water System (Emerald Lagoon & South Cove)
  const waterSystem = createWaterSystem(scene, geometries, materials);

  // 3 & 4. Shared Architectural Materials, Road Network & Bridges
  const woodMat = new THREE.MeshStandardMaterial({
    map: procTex.woodPlankAlbedo,
    bumpMap: procTex.woodPlankBump,
    bumpScale: 0.07,
    roughness: 0.86,
    metalness: 0.02,
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    map: procTex.stoneMasonryAlbedo,
    bumpMap: procTex.stoneMasonryBump,
    bumpScale: 0.08,
    color: 0xf4e4cb,
    roughness: 0.89,
  });
  const roofDarkMat = new THREE.MeshStandardMaterial({ color: 0x2f2926, roughness: 0.72 });
  const creamMat = new THREE.MeshStandardMaterial({ color: 0xfff5e4, roughness: 0.76 });
  const terracottaMat = new THREE.MeshStandardMaterial({ color: 0xec6d2c, roughness: 0.45 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x56b9c7,
    roughness: 0.1,
    metalness: 0.14,
    clearcoat: 0.85,
    transparent: true,
    opacity: 0.44,
  });
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xfff3c4,
    emissive: 0xffb74d,
    emissiveIntensity: 1.0,
    roughness: 0.2,
  });
  const windowGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffe4a8,
    emissive: 0xffb954,
    emissiveIntensity: 0.12,
    roughness: 0.22,
    metalness: 0.08,
  });
  const coolScreenGlowMat = new THREE.MeshStandardMaterial({
    color: 0x7ce8e4,
    emissive: 0x3ad6cf,
    emissiveIntensity: 0.16,
    roughness: 0.18,
    metalness: 0.15,
  });
  materials.push(
    woodMat,
    stoneMat,
    roofDarkMat,
    creamMat,
    terracottaMat,
    glassMat,
    lanternMat,
    windowGlowMat,
    coolScreenGlowMat,
  );

  const roadAndBridgeSys = buildBridgesAndRoadNetwork(
    scene,
    procTex,
    geometries,
    materials,
    textures,
    staticColliders,
    {
      lanternMat,
      roofDarkMat,
      creamMat,
      terracottaMat,
    },
    isNearRoadOrBuilding,
  );

  // Bobbing Moored Boat beside East Lagoon Waterfront Jetty
  const hullGeo = createExtrudedProfile(
    [
      [-0.75, 0.35],
      [0.75, 0.35],
      [0.52, -0.25],
      [-0.52, -0.25],
    ],
    2.8,
    0.05,
  );
  const cabinGeo = new THREE.BoxGeometry(0.82, 0.52, 0.96);
  geometries.push(hullGeo, cabinGeo);

  mooredBoat = new THREE.Group();
  const boatHull = new THREE.Mesh(hullGeo, creamMat);
  const boatStripe = new THREE.Mesh(hullGeo, terracottaMat);
  boatStripe.scale.set(1.03, 0.35, 1.02);
  boatStripe.position.y = 0.14;
  const boatCabin = new THREE.Mesh(cabinGeo, woodMat);
  boatCabin.position.set(0, 0.56, -0.25);
  mooredBoat.add(boatHull, boatStripe, boatCabin);
  mooredBoat.rotation.order = 'YXZ';
  mooredBoat.position.set(
    MOORED_BOAT_ANCHOR.x,
    WATER_BASE_Y + MOORED_BOAT_ANCHOR.draftOffset,
    MOORED_BOAT_ANCHOR.z,
  );
  mooredBoat.rotation.y = MOORED_BOAT_ANCHOR.baseYaw;
  scene.add(mooredBoat);
  waterSystem.update(0, mooredBoat);

  // Coastal Jetty Pier Flagpole atop free SE piling (57.18, -19.2)
  createWindFlag(scene, 57.18, 0.72, -19.2, '#21968B', 1.4, 1.05);

  // Coastal Striped Lighthouse overlooking Lagoon (x: 73, z: -26)
  const lhBaseGeo = new THREE.CylinderGeometry(1.5, 2.2, 2.2, 12);
  const lhTierGeo = new THREE.CylinderGeometry(1.15, 1.5, 2.6, 12);
  const lhTopGeo = new THREE.CylinderGeometry(0.9, 1.15, 2.6, 12);
  const lhGalleryGeo = new THREE.CylinderGeometry(1.32, 1.22, 0.36, 12);
  const lhCapGeo = new THREE.ConeGeometry(1.15, 1.4, 12);
  const lhBeamGeo = new THREE.ConeGeometry(1.2, 8.5, 14, 1, true);
  lhBeamGeo.rotateX(Math.PI / 2);
  lhBeamGeo.translate(0, 0, 4.25);
  geometries.push(lhBaseGeo, lhTierGeo, lhTopGeo, lhGalleryGeo, lhCapGeo, lhBeamGeo);

  const lhGy = computeGroundHeight(73, -26);
  const lhGroup = new THREE.Group();
  lhGroup.position.set(73, lhGy, -26);
  const lh1 = new THREE.Mesh(lhBaseGeo, creamMat);
  lh1.position.y = 1.1;
  lh1.castShadow = true;
  const lh2 = new THREE.Mesh(lhTierGeo, terracottaMat);
  lh2.position.y = 3.5;
  lh2.castShadow = true;
  const lh3 = new THREE.Mesh(lhTopGeo, creamMat);
  lh3.position.y = 6.1;
  lh3.castShadow = true;
  const lhGal = new THREE.Mesh(lhGalleryGeo, roofDarkMat);
  lhGal.position.y = 7.55;
  const lhLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 1.1, 10), lanternMat);
  geometries.push(lhLamp.geometry);
  lhLamp.position.y = 8.25;
  const lhRoof = new THREE.Mesh(lhCapGeo, terracottaMat);
  lhRoof.position.y = 9.4;

  const lhBeamMat = new THREE.MeshBasicMaterial({
    color: 0xffe49c,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const lhCoreBeamGeo = new THREE.ConeGeometry(0.65, 11.2, 12, 1, true);
  lhCoreBeamGeo.rotateX(Math.PI / 2);
  lhCoreBeamGeo.translate(0, 0, 5.6);
  const lhHaloGeo = new THREE.SphereGeometry(1.35, 12, 10);
  geometries.push(lhCoreBeamGeo, lhHaloGeo);
  const lhHaloMat = new THREE.MeshBasicMaterial({
    color: 0xffe6a6,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
  });
  materials.push(lhBeamMat, lhHaloMat);
  lighthouseBeam = new THREE.Group();
  lighthouseBeam.position.set(0, 8.25, 0);
  lighthouseBeam.add(new THREE.Mesh(lhBeamGeo, lhBeamMat), new THREE.Mesh(lhCoreBeamGeo, lhBeamMat));
  const lhHalo = new THREE.Mesh(lhHaloGeo, lhHaloMat);
  lhHalo.position.set(0, 8.25, 0);

  lhGroup.add(lh1, lh2, lh3, lhGal, lhLamp, lhRoof, lhHalo, lighthouseBeam);
  scene.add(lhGroup);
  staticColliders.push({ x: 73, y: lhGy + 3.5, z: -26, hx: 2.0, hy: 4.0, hz: 2.0, kind: 'prop' });

  // 5. Smooth Arched Vault West Ridge Tunnel aligned with Paddock approach spoke (zero floating crag blobs)
  const tunnelGroup = new THREE.Group();
  tunnelGroup.position.set(WEST_RIDGE_TUNNEL_DEF.centerX, 0, WEST_RIDGE_TUNNEL_DEF.centerZ);
  tunnelGroup.rotation.y = WEST_RIDGE_TUNNEL_DEF.yaw;

  const lampGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffe4a0,
    emissive: 0xffb84d,
    emissiveIntensity: 1.35,
  });
  materials.push(lampGlowMat);

  const tunArchGeo = createTunnelArchGeo(WEST_RIDGE_TUNNEL_DEF.length);
  const tunPortalStoneGeo = new THREE.TorusGeometry(5.15, 0.56, 8, 20, Math.PI);
  const tunStripLampGeo = new THREE.BoxGeometry(0.45, 0.14, 3.2);
  geometries.push(tunArchGeo, tunPortalStoneGeo, tunStripLampGeo);

  const tunVault = new THREE.Mesh(tunArchGeo, stoneMat);
  tunVault.castShadow = true;
  tunVault.receiveShadow = true;
  tunnelGroup.add(tunVault);

  const portalOffsetZ = WEST_RIDGE_TUNNEL_DEF.halfLength - 0.12;
  for (const pz of [-portalOffsetZ, portalOffsetZ]) {
    const portalRib = new THREE.Mesh(tunPortalStoneGeo, creamMat);
    portalRib.position.set(0, 2.65, pz);
    portalRib.castShadow = true;
    tunnelGroup.add(portalRib);
  }

  for (const lz of [-5.8, 0, 5.8]) {
    const lamp = new THREE.Mesh(tunStripLampGeo, lampGlowMat);
    lamp.position.set(0, 6.85, lz);
    tunnelGroup.add(lamp);
  }
  scene.add(tunnelGroup);

  const tunCos = Math.cos(WEST_RIDGE_TUNNEL_DEF.yaw);
  const tunSin = Math.sin(WEST_RIDGE_TUNNEL_DEF.yaw);
  const tunWallOffset = WEST_RIDGE_TUNNEL_DEF.innerHalfWidth + 0.85;
  for (const side of [-1, 1]) {
    const lx = side * tunWallOffset;
    staticColliders.push({
      x: WEST_RIDGE_TUNNEL_DEF.centerX + lx * tunCos,
      y: 2.2,
      z: WEST_RIDGE_TUNNEL_DEF.centerZ - lx * tunSin,
      hx: 0.85,
      hy: 2.5,
      hz: WEST_RIDGE_TUNNEL_DEF.halfLength,
      ry: WEST_RIDGE_TUNNEL_DEF.yaw,
      ignoreCamera: false,
      kind: 'tunnel-wall',
    });
  }

  // 6. Welcome Portal Arch at Starting Plaza
  const postGeo = new THREE.CylinderGeometry(0.32, 0.4, 5.4, 10);
  const postCapGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.28, 10);
  const beamGeo = new THREE.BoxGeometry(10.8, 0.58, 0.68);
  geometries.push(postGeo, postCapGeo, beamGeo);

  const leftPost = new THREE.Mesh(postGeo, woodMat);
  leftPost.position.set(-4.8, 2.7, -12.8);
  leftPost.castShadow = true;
  const leftCap = new THREE.Mesh(postCapGeo, terracottaMat);
  leftCap.position.set(-4.8, 5.35, -12.8);

  const rightPost = new THREE.Mesh(postGeo, woodMat);
  rightPost.position.set(4.8, 2.7, -12.8);
  rightPost.castShadow = true;
  const rightCap = new THREE.Mesh(postCapGeo, terracottaMat);
  rightCap.position.set(4.8, 5.35, -12.8);

  const topBeam = new THREE.Mesh(beamGeo, roofDarkMat);
  topBeam.position.set(0, 5.2, -12.8);
  topBeam.castShadow = true;

  const welcomeTex = createSignTexture(
    "SANJAYA'S WORLD",
    'DRIVE TO EXPLORE 9 DESTINATIONS',
    '#EC6D2C',
  );
  welcomeTex.anisotropy = maxAnisotropy;
  textures.push(welcomeTex);
  const welcomeSignGeo = new THREE.PlaneGeometry(8.6, 2.85);
  geometries.push(welcomeSignGeo);
  const welcomeSignMat = new THREE.MeshBasicMaterial({ map: welcomeTex, toneMapped: false });
  materials.push(welcomeSignMat);
  const wFront = new THREE.Mesh(welcomeSignGeo, welcomeSignMat);
  wFront.position.set(0, 6.25, -12.42);
  const wBack = new THREE.Mesh(welcomeSignGeo, welcomeSignMat);
  wBack.position.set(0, 6.25, -13.18);
  wBack.rotation.y = Math.PI;
  scene.add(leftPost, leftCap, rightPost, rightCap, topBeam, wFront, wBack);
  staticColliders.push(
    { x: -4.8, y: 2.6, z: -12.8, hx: 0.5, hy: 2.6, hz: 0.5, kind: 'prop' },
    { x: 4.8, y: 2.6, z: -12.8, hx: 0.5, hy: 2.6, hz: 0.5, kind: 'prop' },
  );

  // 7. Build All 9 Bespoke Architectural Landmarks synced to BUILDING_FOOTPRINTS
  const parkingMat = new THREE.MeshStandardMaterial({ color: 0x453e3a, roughness: 0.88 });
  const padGeo = new THREE.RingGeometry(2.9, 3.55, 36);
  padGeo.rotateX(-Math.PI / 2);
  const parkPadGeo = new THREE.PlaneGeometry(9.6, 6.4);
  parkPadGeo.rotateX(-Math.PI / 2);
  const signPostGeo = new THREE.CylinderGeometry(0.11, 0.14, 5.2, 8);
  const signBackerGeo = new THREE.BoxGeometry(6.36, 2.46, 0.16);
  geometries.push(padGeo, parkPadGeo, signPostGeo, signBackerGeo);
  materials.push(parkingMat);

  WORLD_LANDMARKS.forEach((lm) => {
    const footprint = BUILDING_FOOTPRINTS.find((b) => b.landmarkId === lm.id);
    const baseGroundY = lm.position.y ?? computeGroundHeight(lm.position.x, lm.position.z);
    const buildGroundY = footprint
      ? computeGroundHeight(footprint.buildX, footprint.buildZ)
      : baseGroundY;
    const dirToOrigin = new THREE.Vector2(-lm.position.x, -lm.position.z).normalize();
    const buildX = footprint?.buildX ?? lm.position.x - dirToOrigin.x * 5.8;
    const buildZ = footprint?.buildZ ?? lm.position.z - dirToOrigin.y * 5.8;
    const yaw = footprint?.yaw ?? Math.atan2(dirToOrigin.x, dirToOrigin.y);

    const accentMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(lm.color),
      roughness: 0.38,
      metalness: 0.16,
    });
    materials.push(accentMat);

    // Parking apron + glowing ground pad ring (no floating diamonds)
    const parkMesh = new THREE.Mesh(parkPadGeo, parkingMat);
    parkMesh.position.set(lm.position.x, baseGroundY + 0.032, lm.position.z);
    parkMesh.rotation.y = yaw;
    parkMesh.receiveShadow = true;
    scene.add(parkMesh);

    const padMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(lm.color),
      emissive: new THREE.Color(lm.color),
      emissiveIntensity: 0.55,
      roughness: 0.3,
    });
    materials.push(padMat);
    const padMesh = new THREE.Mesh(padGeo, padMat);
    padMesh.position.set(lm.position.x, baseGroundY + 0.06, lm.position.z);
    scene.add(padMesh);

    // Zone Entrance Gateway Bollards (flanking outside 9.6m approach apron)
    const bollardGeo = new THREE.CylinderGeometry(0.22, 0.28, 1.85, 8);
    const bollardCapGeo = new THREE.SphereGeometry(0.26, 8, 8);
    geometries.push(bollardGeo, bollardCapGeo);
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    for (const sideX of [-5.2, 5.2]) {
      const bx = lm.position.x + sideX * cosY + 2.8 * sinY;
      const bz = lm.position.z - sideX * sinY + 2.8 * cosY;
      const bGy = computeGroundHeight(bx, bz);
      const post = new THREE.Mesh(bollardGeo, roofDarkMat);
      post.position.set(bx, bGy + 0.92, bz);
      post.castShadow = true;
      const bCap = new THREE.Mesh(bollardCapGeo, padMat);
      bCap.position.set(bx, bGy + 1.92, bz);
      scene.add(post, bCap);
    }

    const grp = new THREE.Group();
    grp.position.set(buildX, buildGroundY, buildZ);
    grp.rotation.y = yaw;

    // Stepped architectural plinth
    const plinthGeo = new THREE.BoxGeometry(8.0, 0.45, 6.2);
    const stepGeo = new THREE.BoxGeometry(4.4, 0.24, 1.2);
    geometries.push(plinthGeo, stepGeo);
    const plinth = new THREE.Mesh(plinthGeo, roofDarkMat);
    plinth.position.y = 0.22;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    const step = new THREE.Mesh(stepGeo, stoneMat);
    step.position.set(0, 0.12, 3.2);
    grp.add(plinth, step);

    if (lm.id === 'studio') {
      // Sculpted Modern Timber Studio with slanted cantilevered roof, glass atrium, louvers & skylight
      const wingGeo = new THREE.BoxGeometry(6.6, 3.4, 4.4);
      const pitchedRoofGeo = createExtrudedProfile(
        [
          [-3.8, 0],
          [3.8, 0.65],
          [3.8, 0.98],
          [-3.8, 0.32],
        ],
        5.8,
        0.08,
      );
      pitchedRoofGeo.rotateY(Math.PI / 2);
      const studioWinGeo = new THREE.BoxGeometry(4.8, 2.2, 0.14);
      const louverGeo = new THREE.BoxGeometry(0.14, 2.5, 0.48);
      const skylightGeo = new THREE.BoxGeometry(2.6, 0.28, 1.8);
      geometries.push(wingGeo, pitchedRoofGeo, studioWinGeo, louverGeo, skylightGeo);

      const hall = new THREE.Mesh(wingGeo, woodMat);
      hall.position.y = 2.15;
      hall.castShadow = true;
      hall.receiveShadow = true;

      const roof = new THREE.Mesh(pitchedRoofGeo, roofDarkMat);
      roof.position.set(0, 4.35, 0.15);
      roof.castShadow = true;

      const win = new THREE.Mesh(studioWinGeo, glassMat);
      win.scale.set(1, 1, 0.5);
      win.position.set(0, 2.15, 2.3);

      const innerWinGlow = new THREE.Mesh(studioWinGeo, windowGlowMat);
      innerWinGlow.scale.set(0.94, 0.86, 0.32);
      innerWinGlow.position.set(0, 2.15, 2.23);

      const skylight = new THREE.Mesh(skylightGeo, windowGlowMat);
      skylight.position.set(0, 4.85, -0.2);

      grp.add(hall, roof, innerWinGlow, win, skylight);
      for (let lx = -2.2; lx <= 2.2; lx += 1.1) {
        const louver = new THREE.Mesh(louverGeo, creamMat);
        louver.position.set(lx, 2.15, 2.45);
        louver.castShadow = true;
        grp.add(louver);
      }
    } else if (lm.id === 'projects') {
      // Exhibition Pavilion with swept vaulted canopy, glass gallery wing & angled display kiosks
      const hallGeo = new THREE.BoxGeometry(6.2, 3.4, 4.2);
      const vaultGeo = createExtrudedProfile(
        [
          [-4.4, 0],
          [-2.2, 0.85],
          [2.2, 0.85],
          [4.4, 0],
          [4.2, -0.24],
          [2.0, 0.54],
          [-2.0, 0.54],
          [-4.2, -0.24],
        ],
        6.4,
        0.06,
      );
      const pillarGeo = new THREE.CylinderGeometry(0.18, 0.22, 3.6, 10);
      const kioskGeo = new THREE.BoxGeometry(1.15, 1.9, 0.42);
      const screenGeo = new THREE.BoxGeometry(0.9, 1.15, 0.08);
      geometries.push(hallGeo, vaultGeo, pillarGeo, kioskGeo, screenGeo);

      const hall = new THREE.Mesh(hallGeo, creamMat);
      hall.position.y = 2.15;
      hall.castShadow = true;
      const canopy = new THREE.Mesh(vaultGeo, accentMat);
      canopy.position.set(0, 4.25, 0.5);
      canopy.castShadow = true;

      for (const px of [-3.4, 3.4]) {
        const pF = new THREE.Mesh(pillarGeo, roofDarkMat);
        pF.position.set(px, 2.2, 2.8);
        pF.castShadow = true;
        grp.add(pF);
      }

      const k1 = new THREE.Mesh(kioskGeo, roofDarkMat);
      k1.position.set(-1.9, 1.35, 2.6);
      k1.rotation.y = 0.25;
      const k1Scr = new THREE.Mesh(screenGeo, coolScreenGlowMat);
      k1Scr.position.set(-1.9, 1.55, 2.8);
      k1Scr.rotation.y = 0.25;

      const k2 = new THREE.Mesh(kioskGeo, roofDarkMat);
      k2.position.set(1.9, 1.35, 2.6);
      k2.rotation.y = -0.25;
      const k2Scr = new THREE.Mesh(screenGeo, windowGlowMat);
      k2Scr.position.set(1.9, 1.55, 2.8);
      k2Scr.rotation.y = -0.25;

      const pavWinGeo = new THREE.BoxGeometry(3.8, 1.55, 0.12);
      geometries.push(pavWinGeo);
      const pavWin = new THREE.Mesh(pavWinGeo, windowGlowMat);
      pavWin.position.set(0, 2.1, 2.12);

      // 11 Project Exhibition Totem Boards arranged around the Pavilion courtyard
      const totemPostGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.7, 6);
      const totemBoardGeo = new THREE.BoxGeometry(1.05, 0.78, 0.1);
      geometries.push(totemPostGeo, totemBoardGeo);
      PORTFOLIO_PROJECTS.forEach((proj, pIdx) => {
        const tAngle = -Math.PI * 0.44 + (pIdx / Math.max(1, PORTFOLIO_PROJECTS.length - 1)) * Math.PI * 0.88;
        const arcR = 5.45;
        const tx = Math.sin(tAngle) * arcR;
        const tz = 1.15 - Math.cos(tAngle) * 1.45;
        const tMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(proj.accentColor),
          emissive: new THREE.Color(proj.accentColor),
          emissiveIntensity: 0.28,
          roughness: 0.35,
        });
        materials.push(tMat);
        const post = new THREE.Mesh(totemPostGeo, roofDarkMat);
        post.position.set(tx, 0.95, tz);
        const board = new THREE.Mesh(totemBoardGeo, tMat);
        board.position.set(tx, 1.82, tz);
        board.rotation.y = -tAngle * 0.65;
        board.castShadow = true;
        grp.add(post, board);
      });

      grp.add(hall, canopy, pavWin, k1, k1Scr, k2, k2Scr);
    } else if (lm.id === 'workshop') {
      // Chamfered Hexagonal Tech Lab + External Rib Buttresses + 3 Kinetic Overhead Sculptures + 5 Category Lab Pods
      const hexGeo = new THREE.CylinderGeometry(3.45, 3.75, 3.7, 6);
      const domeGeo = new THREE.SphereGeometry(2.5, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
      const ribGeo = new THREE.BoxGeometry(0.32, 3.9, 0.58);
      const ringCapGeo = new THREE.TorusGeometry(2.55, 0.16, 8, 24);
      ringCapGeo.rotateX(Math.PI / 2);
      const sym1Geo = new THREE.TorusKnotGeometry(0.44, 0.14, 40, 8);
      const sym2Geo = new THREE.OctahedronGeometry(0.58, 0);
      const sym3Geo = new THREE.DodecahedronGeometry(0.52, 0);
      const podPedGeo = new THREE.CylinderGeometry(0.45, 0.56, 1.1, 6);
      const podOrbGeo = new THREE.OctahedronGeometry(0.34, 0);
      geometries.push(hexGeo, domeGeo, ribGeo, ringCapGeo, sym1Geo, sym2Geo, sym3Geo, podPedGeo, podOrbGeo);

      const hex = new THREE.Mesh(hexGeo, creamMat);
      hex.position.y = 2.3;
      hex.castShadow = true;
      const dome = new THREE.Mesh(domeGeo, accentMat);
      dome.position.y = 4.15;
      const ringCap = new THREE.Mesh(ringCapGeo, roofDarkMat);
      ringCap.position.y = 4.18;

      for (let r = 0; r < 6; r++) {
        const ang = (r / 6) * Math.PI * 2;
        const rib = new THREE.Mesh(ribGeo, roofDarkMat);
        rib.position.set(Math.cos(ang) * 3.45, 2.3, Math.sin(ang) * 3.45);
        rib.rotation.y = -ang;
        rib.castShadow = true;
        grp.add(rib);
      }

      const catColors = ['#EC6D2C', '#21968B', '#E65448', '#5E915E', '#D99B26'];
      SKILL_CATEGORIES.forEach((_cat, cIdx) => {
        const cAng = -Math.PI * 0.42 + (cIdx / Math.max(1, SKILL_CATEGORIES.length - 1)) * Math.PI * 0.84;
        const px = Math.sin(cAng) * 5.05;
        const pz = 2.6 + Math.cos(cAng) * 1.15;
        const podMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(catColors[cIdx % catColors.length]),
          emissive: new THREE.Color(catColors[cIdx % catColors.length]),
          emissiveIntensity: 0.45,
          roughness: 0.3,
        });
        materials.push(podMat);
        const ped = new THREE.Mesh(podPedGeo, roofDarkMat);
        ped.position.set(px, 0.72, pz);
        const capOrb = new THREE.Mesh(podOrbGeo, podMat);
        capOrb.position.set(px, 1.65, pz);
        grp.add(ped, capOrb);
      });

      const pedSymGeo = new THREE.CylinderGeometry(0.28, 0.36, 0.72, 8);
      geometries.push(pedSymGeo);
      const s1Ped = new THREE.Mesh(pedSymGeo, roofDarkMat);
      s1Ped.position.set(-2.4, 4.5, 0);
      const s1 = new THREE.Mesh(sym1Geo, accentMat);
      s1.position.set(-2.4, 5.25, 0);
      const s2Ped = new THREE.Mesh(pedSymGeo, roofDarkMat);
      s2Ped.position.set(0, 5.15, 0);
      const s2 = new THREE.Mesh(sym2Geo, coolScreenGlowMat);
      s2.position.set(0, 5.95, 0);
      const s3Ped = new THREE.Mesh(pedSymGeo, roofDarkMat);
      s3Ped.position.set(2.4, 4.5, 0);
      const s3 = new THREE.Mesh(sym3Geo, accentMat);
      s3.position.set(2.4, 5.25, 0);
      techSymbols.push(
        { mesh: s1, baseY: 5.25 },
        { mesh: s2, baseY: 5.95 },
        { mesh: s3, baseY: 5.25 },
      );
      grp.add(hex, dome, ringCap, s1Ped, s1, s2Ped, s2, s3Ped, s3);
    } else if (lm.id === 'lookout') {
      // Sculpted Sandstone Terrace + Curved Parapet + 4 Tapered Milestone Obelisks + Brass Telescope
      const archWallGeo = new THREE.CylinderGeometry(3.6, 3.8, 0.85, 16, 1, true, Math.PI * 0.65, Math.PI * 0.7);
      const obeliskGeo = new THREE.CylinderGeometry(0.24, 0.44, 2.6, 4);
      const obeliskCapGeo = new THREE.ConeGeometry(0.32, 0.45, 4);
      const scopeStandGeo = new THREE.CylinderGeometry(0.1, 0.22, 1.15, 8);
      const scopeTubeGeo = new THREE.CylinderGeometry(0.14, 0.2, 1.35, 12);
      geometries.push(archWallGeo, obeliskGeo, obeliskCapGeo, scopeStandGeo, scopeTubeGeo);

      const parapet = new THREE.Mesh(archWallGeo, stoneMat);
      parapet.position.set(0, 0.88, -0.4);

      const stand = new THREE.Mesh(scopeStandGeo, roofDarkMat);
      stand.position.set(0, 1.0, 2.1);
      const scope = new THREE.Mesh(scopeTubeGeo, accentMat);
      scope.position.set(0, 1.65, 2.1);
      scope.rotation.x = Math.PI / 3;

      for (let t = 0; t < 4; t++) {
        const ox = -2.4 + t * 1.6;
        const ob = new THREE.Mesh(obeliskGeo, t % 2 === 0 ? accentMat : stoneMat);
        ob.position.set(ox, 1.75, -1.35);
        ob.rotation.y = Math.PI / 4;
        ob.castShadow = true;
        const cap = new THREE.Mesh(obeliskCapGeo, roofDarkMat);
        cap.position.set(ox, 3.25, -1.35);
        cap.rotation.y = Math.PI / 4;
        grp.add(ob, cap);
      }
      grp.add(parapet, stand, scope);
    } else if (lm.id === 'signal-house') {
      // Octagonal Comms Station + Truss Tower + Parabolic Lathe Radar Dish + Beacon Crown
      const hubGeo = new THREE.CylinderGeometry(2.8, 3.1, 3.4, 8);
      const collarGeo = new THREE.CylinderGeometry(3.15, 3.15, 0.35, 8);
      const spireGeo = new THREE.CylinderGeometry(0.2, 0.42, 3.5, 8);
      const dishPoints = [
        new THREE.Vector2(0.02, 0.0),
        new THREE.Vector2(0.55, 0.1),
        new THREE.Vector2(1.05, 0.34),
        new THREE.Vector2(1.38, 0.68),
      ];
      const dishGeo = new THREE.LatheGeometry(dishPoints, 18);
      const feedHornGeo = new THREE.CylinderGeometry(0.06, 0.09, 0.9, 8);
      geometries.push(hubGeo, collarGeo, spireGeo, dishGeo, feedHornGeo);

      const hub = new THREE.Mesh(hubGeo, creamMat);
      hub.position.y = 2.15;
      hub.castShadow = true;
      const collar = new THREE.Mesh(collarGeo, accentMat);
      collar.position.y = 3.95;
      const spire = new THREE.Mesh(spireGeo, roofDarkMat);
      spire.position.set(0, 5.5, 0);

      radarDish = new THREE.Group();
      radarDish.position.set(0, 7.15, 0);
      const dish = new THREE.Mesh(dishGeo, accentMat);
      dish.rotation.x = Math.PI / 3;
      const feed = new THREE.Mesh(feedHornGeo, roofDarkMat);
      feed.position.set(0, 0.3, 0.48);
      feed.rotation.x = Math.PI / 3;
      radarDish.add(dish, feed);
      grp.add(hub, collar, spire, radarDish);
    } else if (lm.id === 'paddock') {
      // Racing Garage + Swept Pit Canopy + Checkered Gantry + Apex Tire Stack
      const bayGeo = new THREE.BoxGeometry(6.8, 3.3, 4.4);
      const canopyGeo = createExtrudedProfile(
        [
          [-4.0, 0],
          [4.2, 0.5],
          [4.2, 0.85],
          [-4.0, 0.28],
        ],
        5.8,
        0.05,
      );
      canopyGeo.rotateY(Math.PI / 2);
      const gantryPostGeo = new THREE.CylinderGeometry(0.24, 0.28, 4.8, 10);
      const bannerGeo = new THREE.BoxGeometry(7.6, 1.05, 0.32);
      const tireStackGeo = new THREE.TorusGeometry(0.42, 0.18, 8, 16);
      tireStackGeo.rotateX(Math.PI / 2);
      geometries.push(bayGeo, canopyGeo, gantryPostGeo, bannerGeo, tireStackGeo);

      const bay = new THREE.Mesh(bayGeo, creamMat);
      bay.position.y = 2.1;
      bay.castShadow = true;
      const roof = new THREE.Mesh(canopyGeo, accentMat);
      roof.position.set(0, 4.05, 0.4);
      roof.castShadow = true;

      const checkTex = createCheckeredTexture();
      textures.push(checkTex);
      const checkMat = new THREE.MeshBasicMaterial({ map: checkTex, toneMapped: false });
      materials.push(checkMat);

      const gpL = new THREE.Mesh(gantryPostGeo, roofDarkMat);
      gpL.position.set(-4.5, 2.4, 5.2);
      const gpR = new THREE.Mesh(gantryPostGeo, roofDarkMat);
      gpR.position.set(4.5, 2.4, 5.2);
      const banner = new THREE.Mesh(bannerGeo, checkMat);
      banner.position.set(0, 4.55, 5.2);

      // Pit garage illuminated transom strip + decorative stacked racing tires
      const pitWinGeo = new THREE.BoxGeometry(4.8, 0.72, 0.14);
      geometries.push(pitWinGeo);
      const pitWin = new THREE.Mesh(pitWinGeo, windowGlowMat);
      pitWin.position.set(0, 2.65, 2.22);

      for (let t = 0; t < 3; t++) {
        const tire = new THREE.Mesh(tireStackGeo, t % 2 === 0 ? roofDarkMat : creamMat);
        tire.position.set(-4.3, 0.62 + t * 0.32, 2.4);
        tire.castShadow = true;
        grp.add(tire);
      }
      createWindFlag(grp, -4.5, 4.78, 5.2, '#EC6D2C', 0.2, 1.05);
      createWindFlag(grp, 4.5, 4.78, 5.2, '#E65448', 1.9, 1.05);
      grp.add(bay, roof, pitWin, gpL, gpR, banner);
    } else if (lm.id === 'delivery') {
      // Courier Warehouse + Sawtooth Loading Canopy + Sculpted Delivery Van
      const whGeo = new THREE.BoxGeometry(6.8, 3.7, 4.6);
      const roofSawGeo = createExtrudedProfile(
        [
          [-3.7, 0],
          [-1.8, 0.9],
          [-1.8, 0.15],
          [0, 0.9],
          [0, 0.15],
          [1.8, 0.9],
          [1.8, 0.15],
          [3.7, 0.9],
          [3.7, 0],
        ],
        5.0,
        0.04,
      );
      const doorGeo = new THREE.BoxGeometry(2.8, 2.4, 0.18);
      const parcelGeo = new THREE.BoxGeometry(0.76, 0.72, 0.76);
      const vanBodyGeo = createExtrudedProfile(
        [
          [-1.25, 0],
          [1.25, 0],
          [1.28, 0.56],
          [0.88, 1.05],
          [-1.18, 1.08],
          [-1.25, 0.45],
        ],
        1.42,
        0.06,
      );
      vanBodyGeo.rotateY(Math.PI / 2);
      const vanWheelGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.18, 12);
      vanWheelGeo.rotateZ(Math.PI / 2);
      geometries.push(whGeo, roofSawGeo, doorGeo, parcelGeo, vanBodyGeo, vanWheelGeo);

      const wh = new THREE.Mesh(whGeo, creamMat);
      wh.position.y = 2.3;
      wh.castShadow = true;
      const sawRoof = new THREE.Mesh(roofSawGeo, accentMat);
      sawRoof.position.set(0, 4.45, 0);
      sawRoof.castShadow = true;
      const door = new THREE.Mesh(doorGeo, roofDarkMat);
      door.position.set(0, 1.65, 2.32);

      const p1 = new THREE.Mesh(parcelGeo, woodMat);
      p1.position.set(-2.5, 0.82, 2.85);
      const p2 = new THREE.Mesh(parcelGeo, woodMat);
      p2.position.set(-2.5, 1.54, 2.85);

      const vanGroup = new THREE.Group();
      vanGroup.position.set(2.9, 0.45, 2.7);
      const vanBody = new THREE.Mesh(vanBodyGeo, accentMat);
      vanBody.position.y = 0.68;
      vanBody.castShadow = true;
      for (const [wx, wz] of [
        [-0.68, -0.78],
        [0.68, -0.78],
        [-0.68, 0.78],
        [0.68, 0.78],
      ]) {
        const vw = new THREE.Mesh(vanWheelGeo, roofDarkMat);
        vw.position.set(wx, 0.26, wz);
        vanGroup.add(vw);
      }
      const whWinGeo = new THREE.BoxGeometry(3.6, 0.62, 0.14);
      geometries.push(whWinGeo);
      const whWin = new THREE.Mesh(whWinGeo, windowGlowMat);
      whWin.position.set(0, 3.28, 2.31);

      vanGroup.add(vanBody);
      grp.add(wh, sawRoof, door, whWin, p1, p2, vanGroup);
    } else if (lm.id === 'query-valley') {
      // Relational Archive Colonnade: Twin Server Monoliths + Arch Data Conduits + Tiered DB Core
      const serverGeo = new THREE.BoxGeometry(1.65, 4.9, 1.75);
      const dbRingGeo = new THREE.CylinderGeometry(1.22, 1.22, 0.65, 18);
      const conduitGeo = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-2.3, 4.2, 0),
          new THREE.Vector3(-1.1, 5.1, 0),
          new THREE.Vector3(1.1, 5.1, 0),
          new THREE.Vector3(2.3, 4.2, 0),
        ]),
        16,
        0.12,
        8,
        false,
      );
      geometries.push(serverGeo, dbRingGeo, conduitGeo);

      const srvL = new THREE.Mesh(serverGeo, roofDarkMat);
      srvL.position.set(-2.3, 2.9, 0);
      srvL.castShadow = true;
      const srvR = new THREE.Mesh(serverGeo, roofDarkMat);
      srvR.position.set(2.3, 2.9, 0);
      srvR.castShadow = true;
      const conduit = new THREE.Mesh(conduitGeo, glassMat);

      for (let tier = 0; tier < 3; tier++) {
        const disc = new THREE.Mesh(dbRingGeo, tier === 1 ? creamMat : accentMat);
        disc.position.set(0, 1.0 + tier * 0.92, 0);
        disc.castShadow = true;
        grp.add(disc);
      }
      grp.add(srvL, srvR, conduit);
    } else if (lm.id === 'signal-workshop') {
      // Guarded Security Booth + Overhanging Roof + RFID Terminal + Striped Boom Barrier Arm
      const boothGeo = new THREE.BoxGeometry(4.8, 3.2, 3.8);
      const boothCapGeo = new THREE.BoxGeometry(5.8, 0.36, 4.8);
      const pedGeo = new THREE.CylinderGeometry(0.28, 0.36, 1.5, 10);
      const armBarGeo = new THREE.BoxGeometry(4.6, 0.22, 0.22);
      armBarGeo.translate(2.1, 0, 0);
      const armStripeGeo = new THREE.BoxGeometry(0.7, 0.24, 0.24);
      geometries.push(boothGeo, boothCapGeo, pedGeo, armBarGeo, armStripeGeo);

      const booth = new THREE.Mesh(boothGeo, creamMat);
      booth.position.y = 2.05;
      booth.castShadow = true;
      const cap = new THREE.Mesh(boothCapGeo, roofDarkMat);
      cap.position.set(0, 3.78, 0.2);
      cap.castShadow = true;
      const ped = new THREE.Mesh(pedGeo, roofDarkMat);
      ped.position.set(-2.4, 1.2, 2.75);

      securityGateArm = new THREE.Group();
      securityGateArm.position.set(-2.1, 1.58, 2.75);
      const barBase = new THREE.Mesh(armBarGeo, accentMat);
      securityGateArm.add(barBase);
      for (const sx of [0.9, 2.3, 3.7]) {
        const st = new THREE.Mesh(armStripeGeo, creamMat);
        st.position.set(sx, 0, 0);
        securityGateArm.add(st);
      }

      const boothWinGeo = new THREE.BoxGeometry(3.1, 1.05, 0.14);
      geometries.push(boothWinGeo);
      const boothWin = new THREE.Mesh(boothWinGeo, windowGlowMat);
      boothWin.position.set(0, 2.2, 1.91);

      grp.add(booth, cap, boothWin, ped, securityGateArm);
    }

    scene.add(grp);

    const colliderHx = footprint?.colliderHx ?? 3.6;
    const colliderHy = footprint?.colliderHy ?? 2.6;
    const colliderHz = footprint?.colliderHz ?? 3.0;
    staticColliders.push({
      x: buildX,
      y: buildGroundY + colliderHy * 0.85,
      z: buildZ,
      hx: colliderHx,
      hy: colliderHy,
      hz: colliderHz,
      ry: yaw,
      kind: 'building',
    });

    if (import.meta.env.DEV) {
      grp.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(grp);
      const meshHx = (box.max.x - box.min.x) * 0.5;
      const meshHz = (box.max.z - box.min.z) * 0.5;
      if (Math.abs(meshHx - colliderHx) > 3.2 || Math.abs(meshHz - colliderHz) > 3.2) {
        console.warn(`[WorldBuildAudit] Building ${lm.id} Box3 vs collider divergence`, {
          meshHx: Number(meshHx.toFixed(2)),
          colliderHx,
          meshHz: Number(meshHz.toFixed(2)),
          colliderHz,
        });
      }
    }

    // Grounded Post-Mounted Destination Name Signboard (replaces floating aerial sign)
    const signGroup = new THREE.Group();
    const sTex = createSignTexture(lm.title, lm.subtitle, lm.color);
    sTex.anisotropy = maxAnisotropy;
    textures.push(sTex);
    const sGeo = new THREE.PlaneGeometry(6.1, 2.25);
    geometries.push(sGeo);
    const sMat = new THREE.MeshBasicMaterial({
      map: sTex,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    materials.push(sMat);
    const signBacker = new THREE.Mesh(signBackerGeo, roofDarkMat);
    signBacker.position.set(0, 5.2, 0);
    signBacker.castShadow = true;
    const sFront = new THREE.Mesh(sGeo, sMat);
    sFront.position.set(0, 5.2, 0.09);
    const sBack = new THREE.Mesh(sGeo, sMat);
    sBack.position.set(0, 5.2, -0.09);
    sBack.rotation.y = Math.PI;
    const postL = new THREE.Mesh(signPostGeo, woodMat);
    postL.position.set(-2.3, 2.6, 0);
    postL.castShadow = true;
    const postR = new THREE.Mesh(signPostGeo, woodMat);
    postR.position.set(2.3, 2.6, 0);
    postR.castShadow = true;
    signGroup.add(postL, postR, signBacker, sFront, sBack);
    signGroup.position.set(buildX, buildGroundY, buildZ);
    signGroup.rotation.y = yaw;
    scene.add(signGroup);
  });

  // Delivery Dropoff Beacon
  const beaconGeo = new THREE.CylinderGeometry(1.6, 1.6, 14, 16, 1, true);
  geometries.push(beaconGeo);
  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0xe69f38,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
  });
  materials.push(beaconMat);
  deliveryBeacon = new THREE.Mesh(beaconGeo, beaconMat);
  deliveryBeacon.visible = false;
  scene.add(deliveryBeacon);

  // Objective / Guided Tour Sky Beacon & Ground Ring
  waypointBeacon = new THREE.Group();
  const wpBeamGeo = new THREE.CylinderGeometry(0.55, 1.15, 22, 16, 1, true);
  const wpHaloGeo = new THREE.TorusGeometry(2.6, 0.18, 8, 28);
  wpHaloGeo.rotateX(Math.PI / 2);
  geometries.push(wpBeamGeo, wpHaloGeo);
  waypointBeamMat = new THREE.MeshBasicMaterial({
    color: 0xec6d2c,
    transparent: true,
    opacity: 0.34,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  materials.push(waypointBeamMat);
  const wpBeamMesh = new THREE.Mesh(wpBeamGeo, waypointBeamMat);
  wpBeamMesh.position.y = 11;
  waypointHalo = new THREE.Mesh(wpHaloGeo, waypointBeamMat);
  waypointHalo.position.y = 0.25;
  waypointBeacon.add(wpBeamMesh, waypointHalo);
  waypointBeacon.visible = false;
  scene.add(waypointBeacon);

  // Pooled Discovery Arrival Ring Pulses (3 rings)
  const pulseRingGeo = new THREE.RingGeometry(2.4, 3.2, 32);
  pulseRingGeo.rotateX(-Math.PI / 2);
  geometries.push(pulseRingGeo);
  for (let i = 0; i < 3; i++) {
    const pMat = new THREE.MeshBasicMaterial({
      color: 0xec6d2c,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    materials.push(pMat);
    const pMesh = new THREE.Mesh(pulseRingGeo, pMat);
    pMesh.visible = false;
    scene.add(pMesh);
    discoveryPulses.push({ mesh: pMesh, mat: pMat, life: 0 });
  }

  // 8 & 9. Signs & Street Lanterns built inside buildBridgesAndRoadNetwork

  // 10. Multi-Species Sculpted Instanced Vegetation & Coherent Shader Wind System
  const vegetationSystem = createVegetationSystem(scene, procTex, geometries, materials);
  for (const col of vegetationSystem.staticColliders) {
    staticColliders.push({ ...col, kind: 'tree' });
  }

  // 12. Validated Managed Props Inventory + Instanced Sandstone Boulders
  const managedProps = buildManagedProps();
  const rockGeo = new THREE.DodecahedronGeometry(1.25, 0);
  geometries.push(rockGeo);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  materials.push(rockMat);
  const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, Math.max(1, managedProps.boulders.length));
  rockInst.castShadow = true;
  rockInst.receiveShadow = true;
  const rockColor = new THREE.Color();
  managedProps.boulders.forEach((rc, i) => {
    const sx = rc.scale;
    const sy = rc.scale * 0.78;
    dummy.position.set(rc.x, rc.y + sy * 0.35, rc.z);
    dummy.rotation.set(i * 0.25, rc.yaw, i * 0.15);
    dummy.scale.set(sx, sy, sx * 0.92);
    dummy.updateMatrix();
    rockInst.setMatrixAt(i, dummy.matrix);
    rockColor.set(i % 2 === 0 ? '#D4B08C' : '#BE956E');
    rockInst.setColorAt(i, rockColor);
  });
  rockInst.instanceMatrix.needsUpdate = true;
  if (rockInst.instanceColor) rockInst.instanceColor.needsUpdate = true;
  rockInst.computeBoundingSphere();
  scene.add(rockInst);

  // 13. Soaring Coastal Seabirds (Clouds & Sky managed by atmosphereSystem)
  const wingLGeo = new THREE.BoxGeometry(0.95, 0.06, 0.28);
  wingLGeo.translate(-0.45, 0, 0);
  const wingRGeo = new THREE.BoxGeometry(0.95, 0.06, 0.28);
  wingRGeo.translate(0.45, 0, 0);
  geometries.push(wingLGeo, wingRGeo);
  const birdDefs = [
    { cx: 45, cz: -22, radius: 18, speed: 0.42, alt: 16, phase: 0 },
    { cx: 48, cz: -25, radius: 22, speed: 0.36, alt: 19, phase: 2.1 },
    { cx: -10, cz: 30, radius: 24, speed: 0.32, alt: 21, phase: 4.0 },
  ];
  for (const bd of birdDefs) {
    const bg = new THREE.Group();
    const wL = new THREE.Mesh(wingLGeo, creamMat);
    wL.rotation.z = 0.22;
    const wR = new THREE.Mesh(wingRGeo, creamMat);
    wR.rotation.z = -0.22;
    bg.add(wL, wR);
    scene.add(bg);
    soaringBirds.push({ grp: bg, ...bd });
  }

  // 13B. Living Meadow Butterflies & Shallow-Water Cove/Lagoon Fish
  const butterflyGroup = new THREE.Group();
  const bWingLGeo = new THREE.PlaneGeometry(0.18, 0.22);
  bWingLGeo.rotateX(-Math.PI / 2);
  bWingLGeo.translate(-0.09, 0, 0);
  const bWingRGeo = new THREE.PlaneGeometry(0.18, 0.22);
  bWingRGeo.rotateX(-Math.PI / 2);
  bWingRGeo.translate(0.09, 0, 0);
  geometries.push(bWingLGeo, bWingRGeo);

  const bfMats = ['#F5A623', '#27C2B4', '#FFF2B2'].map((hex) => {
    const m = new THREE.MeshBasicMaterial({ color: hex, side: THREE.DoubleSide });
    materials.push(m);
    return m;
  });
  const butterflySpots: [number, number][] = [
    [-20, -18],
    [-18, -16],
    [19, -15],
    [-19, -51],
    [14, -56],
    [-31, 63],
    [52, 26],
    [56, -10],
    [-64, -56],
    [-78, -68],
    [-92, -74],
    [-112, -88],
    [-124, -72],
    [34, -34],
  ];
  butterflySpots.forEach(([bx, bz], i) => {
    const gy = computeGroundHeight(bx, bz);
    const mat = bfMats[i % bfMats.length];
    const bGrp = new THREE.Group();
    const wL = new THREE.Mesh(bWingLGeo, mat);
    const wR = new THREE.Mesh(bWingRGeo, mat);
    bGrp.add(wL, wR);
    bGrp.position.set(bx, gy + 1.35, bz);
    butterflyGroup.add(bGrp);
    butterflies.push({
      grp: bGrp,
      wL,
      wR,
      cx: bx,
      baseY: gy + 1.35 + (i % 3) * 0.22,
      cz: bz,
      radius: 1.4 + (i % 3) * 0.45,
      speed: 1.05 + (i % 4) * 0.22,
      phase: i * 1.17,
    });
  });
  scene.add(butterflyGroup);

  const fishGroup = new THREE.Group();
  const fishBodyGeo = new THREE.OctahedronGeometry(0.14, 0);
  fishBodyGeo.scale(0.55, 0.72, 1.85);
  const fishTailGeo = new THREE.ConeGeometry(0.1, 0.22, 4);
  fishTailGeo.rotateX(-Math.PI / 2);
  fishTailGeo.translate(0, 0, -0.14);
  geometries.push(fishBodyGeo, fishTailGeo);

  const fishMatCoral = new THREE.MeshBasicMaterial({ color: 0xff8a5b });
  const fishMatTeal = new THREE.MeshBasicMaterial({ color: 0x3ed6c9 });
  materials.push(fishMatCoral, fishMatTeal);

  const fishPaths = [
    // South Cove crystal shallows (orbit north and south of South Cove footbridge)
    { cx: -18, cz: 60.5, rx: 3.1, rz: 1.9, speed: 0.78 },
    { cx: -16, cz: 60.8, rx: 2.5, rz: 2.1, speed: -0.68 },
    { cx: -21, cz: 71.2, rx: 3.2, rz: 2.0, speed: 0.64 },
    { cx: -14, cz: 70.6, rx: 2.4, rz: 1.8, speed: -0.74 },
    // Amphibious Lagoon wide shallow basin
    { cx: -36, cz: 118, rx: 11.5, rz: 9.2, speed: 0.34 },
    { cx: -36, cz: 118, rx: 13.8, rz: 11.0, speed: -0.29 },
    { cx: -36, cz: 118, rx: 8.4, rz: 7.4, speed: 0.42 },
    { cx: -31, cz: 114, rx: 5.2, rz: 4.1, speed: -0.52 },
    { cx: -41, cz: 122, rx: 5.6, rz: 4.5, speed: 0.48 },
    { cx: -36, cz: 109, rx: 4.4, rz: 3.2, speed: 0.56 },
    { cx: -29, cz: 123, rx: 4.2, rz: 3.5, speed: -0.5 },
    { cx: -43, cz: 113, rx: 4.0, rz: 3.4, speed: 0.54 },
  ];
  fishPaths.forEach((fp, i) => {
    const mat = i % 2 === 0 ? fishMatCoral : fishMatTeal;
    const fGrp = new THREE.Group();
    const body = new THREE.Mesh(fishBodyGeo, mat);
    const tail = new THREE.Mesh(fishTailGeo, mat);
    tail.position.z = -0.22;
    fGrp.add(body, tail);
    fGrp.position.set(fp.cx, WATER_BASE_Y - 0.16, fp.cz);
    fishGroup.add(fGrp);
    swimmingFish.push({
      grp: fGrp,
      tail,
      cx: fp.cx,
      baseY: WATER_BASE_Y - 0.16 - (i % 2) * 0.04,
      cz: fp.cz,
      rx: fp.rx,
      rz: fp.rz,
      speed: fp.speed,
      phase: i * 0.92,
    });
  });
  scene.add(fishGroup);

  // 14. Collectibles (Orbs with Soft Glow Disc & Cone, Tokens, Fragments, Secret Relics)
  const orbCoreGeo = new THREE.SphereGeometry(0.55, 14, 12);
  const orbRingGeo = new THREE.TorusGeometry(0.88, 0.08, 8, 22);
  const orbConeGeo = new THREE.ConeGeometry(1.15, 3.6, 16, 1, true);
  const orbDiscGeo = new THREE.CircleGeometry(1.35, 20);
  orbDiscGeo.rotateX(-Math.PI / 2);
  const tokenGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.18, 16);
  tokenGeo.rotateX(Math.PI / 2);
  const fragGeo = new THREE.OctahedronGeometry(0.66, 0);
  fragGeo.scale(0.8, 1.35, 0.8);
  const secretRelicGeo = new THREE.TorusKnotGeometry(0.45, 0.14, 36, 8);
  geometries.push(
    orbCoreGeo,
    orbRingGeo,
    orbConeGeo,
    orbDiscGeo,
    tokenGeo,
    fragGeo,
    secretRelicGeo,
  );

  const orbMat = new THREE.MeshStandardMaterial({
    color: 0x21968b,
    emissive: 0x21968b,
    emissiveIntensity: 0.72,
    roughness: 0.2,
    metalness: 0.55,
  });
  const orbGlowMat = new THREE.MeshBasicMaterial({
    color: 0x38e2cf,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const tokenMat = new THREE.MeshStandardMaterial({
    color: 0xffd54f,
    emissive: 0xf29f05,
    emissiveIntensity: 0.58,
    roughness: 0.25,
    metalness: 0.72,
  });
  const fragMat = new THREE.MeshStandardMaterial({
    color: 0xe65448,
    emissive: 0xd94338,
    emissiveIntensity: 0.6,
    roughness: 0.22,
    metalness: 0.55,
  });
  const secretRelicMat = new THREE.MeshStandardMaterial({
    color: 0x5e915e,
    emissive: 0xf2c94c,
    emissiveIntensity: 0.55,
    roughness: 0.25,
    metalness: 0.65,
  });
  materials.push(orbMat, orbGlowMat, tokenMat, fragMat, secretRelicMat);

  for (const colDef of WORLD_COLLECTIBLES) {
    const bridgeY = computeBridgeSurfaceY(colDef.x, colDef.z);
    const baseY = bridgeY ?? computeGroundHeight(colDef.x, colDef.z);
    const cg = new THREE.Group();

    if (colDef.kind === 'orb') {
      const cone = new THREE.Mesh(orbConeGeo, orbGlowMat);
      cone.position.y = 0.2;
      const disc = new THREE.Mesh(orbDiscGeo, orbGlowMat);
      disc.position.y = -1.32;
      cg.add(new THREE.Mesh(orbCoreGeo, orbMat), new THREE.Mesh(orbRingGeo, tokenMat), cone, disc);
    } else if (colDef.kind === 'token') {
      cg.add(new THREE.Mesh(tokenGeo, tokenMat), new THREE.Mesh(orbRingGeo, tokenMat));
    } else if (colDef.kind === 'fragment') {
      cg.add(new THREE.Mesh(fragGeo, fragMat));
    } else {
      cg.add(new THREE.Mesh(secretRelicGeo, secretRelicMat), new THREE.Mesh(orbRingGeo, tokenMat));
    }

    cg.position.set(colDef.x, baseY + 1.4, colDef.z);
    scene.add(cg);
    collectibles.push({
      id: colDef.id,
      kind: colDef.kind,
      x: colDef.x,
      y: baseY + 1.4,
      z: colDef.z,
      label: colDef.label,
      mesh: cg,
      collected: false,
    });
  }

  // All-Orbs (8/8) Golden Lookout Observatory Crown unlocked when all 8 knowledge orbs are found
  const crownGroup = new THREE.Group();
  const crownRingGeo = new THREE.TorusGeometry(1.2, 0.16, 10, 28);
  const crownCoreGeo = new THREE.OctahedronGeometry(0.75, 0);
  const crownBeamGeo = new THREE.CylinderGeometry(0.45, 1.35, 16, 16, 1, true);
  geometries.push(crownRingGeo, crownCoreGeo, crownBeamGeo);
  const crownMat = new THREE.MeshStandardMaterial({
    color: 0xffd54f,
    emissive: 0xffb300,
    emissiveIntensity: 0.9,
    metalness: 0.78,
    roughness: 0.18,
  });
  const crownBeamMat = new THREE.MeshBasicMaterial({
    color: 0xffe082,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  materials.push(crownMat, crownBeamMat);
  const cRing = new THREE.Mesh(crownRingGeo, crownMat);
  const cCore = new THREE.Mesh(crownCoreGeo, crownMat);
  const cBeam = new THREE.Mesh(crownBeamGeo, crownBeamMat);
  cBeam.position.y = 7.2;
  crownGroup.add(cRing, cCore, cBeam);
  const lookoutRoofY = computeGroundHeight(0, -81) + 4.4;
  crownGroup.position.set(0, lookoutRoofY, -81);
  crownGroup.visible = false;
  scene.add(crownGroup);

  // 14B. Interactive In-World Challenge Props
  const sqlGateRings: THREE.Mesh[] = [];
  const sqlGateMats: THREE.MeshStandardMaterial[] = [];
  const gatePostGeo = new THREE.CylinderGeometry(0.16, 0.18, 3.6, 8);
  const gateBannerGeo = new THREE.BoxGeometry(4.8, 1.05, 0.22);
  const gateRingGeo = new THREE.RingGeometry(2.6, 3.2, 24);
  gateRingGeo.rotateX(-Math.PI / 2);
  geometries.push(gatePostGeo, gateBannerGeo, gateRingGeo);

  SQL_CHALLENGE_GATES.forEach((gate, i) => {
    const gy = computeGroundHeight(gate.x, gate.z);
    const gMat = new THREE.MeshStandardMaterial({
      color: 0x3e7b9e,
      emissive: 0x3e7b9e,
      emissiveIntensity: i === 0 ? 0.7 : 0.2,
      roughness: 0.35,
    });
    materials.push(gMat);
    sqlGateMats.push(gMat);

    const gTex = createRoadSignTexture(`${i + 1}. ${gate.clause}`, 'SQL');
    textures.push(gTex);
    const gBannerMat = new THREE.MeshBasicMaterial({ map: gTex, toneMapped: false });
    materials.push(gBannerMat);

    const arch = new THREE.Group();
    const pL = new THREE.Mesh(gatePostGeo, roofDarkMat);
    pL.position.set(-2.3, 1.8, 0);
    const pR = new THREE.Mesh(gatePostGeo, roofDarkMat);
    pR.position.set(2.3, 1.8, 0);
    const ban = new THREE.Mesh(gateBannerGeo, gBannerMat);
    ban.position.set(0, 3.5, 0);
    const ring = new THREE.Mesh(gateRingGeo, gMat);
    ring.position.set(0, 0.08, 0);
    arch.add(pL, pR, ban, ring);
    arch.position.set(gate.x, gy, gate.z);
    arch.lookAt(48, gy, -70);
    scene.add(arch);
    sqlGateRings.push(ring);
  });

  // RFID Glowing Keycard Pickup near Signal Workshop (54, 42)
  const rfidCardGroup = new THREE.Group();
  const cardGeo = new THREE.BoxGeometry(1.1, 0.72, 0.08);
  const cardChipGeo = new THREE.BoxGeometry(0.24, 0.2, 0.11);
  geometries.push(cardGeo, cardChipGeo);
  const cardMat = new THREE.MeshStandardMaterial({
    color: 0x21968b,
    emissive: 0x21968b,
    emissiveIntensity: 0.75,
    roughness: 0.25,
  });
  materials.push(cardMat);
  const cardBody = new THREE.Mesh(cardGeo, cardMat);
  const cardChip = new THREE.Mesh(cardChipGeo, tokenMat);
  cardChip.position.set(-0.24, 0.05, 0);
  const cardHalo = new THREE.Mesh(gateRingGeo, cardMat);
  cardHalo.position.set(0, -1.25, 0);
  rfidCardGroup.add(cardBody, cardChip, cardHalo);
  const rfidCardGy = computeGroundHeight(54, 42);
  rfidCardGroup.position.set(54, rfidCardGy + 1.35, 42);
  scene.add(rfidCardGroup);

  // Paddock 4 Checkpoint Pylons
  const paddockGateMats: THREE.MeshStandardMaterial[] = [];
  const pylonGeo = new THREE.CylinderGeometry(0.18, 0.24, 2.8, 8);
  geometries.push(pylonGeo);
  PADDOCK_CHECKPOINTS.forEach((cp) => {
    const gy = computeGroundHeight(cp.x, cp.z);
    const cpMat = new THREE.MeshStandardMaterial({
      color: 0xcc5318,
      emissive: 0xcc5318,
      emissiveIntensity: 0.25,
      roughness: 0.35,
    });
    materials.push(cpMat);
    paddockGateMats.push(cpMat);
    const ring = new THREE.Mesh(gateRingGeo, cpMat);
    ring.position.set(cp.x, gy + 0.08, cp.z);
    const py = new THREE.Mesh(pylonGeo, cpMat);
    py.position.set(cp.x, gy + 1.4, cp.z);
    scene.add(ring, py);
  });

  // Time Trial 5 Ring Gates
  const ttRings: THREE.Mesh[] = [];
  const ttGateGeo = new THREE.TorusGeometry(2.6, 0.18, 8, 22);
  geometries.push(ttGateGeo);
  const ttMat = new THREE.MeshStandardMaterial({
    color: 0xe65448,
    emissive: 0xffc857,
    emissiveIntensity: 0.75,
  });
  materials.push(ttMat);
  TIME_TRIAL_CHECKPOINTS.forEach((cp) => {
    const by = computeBridgeSurfaceY(cp.x, cp.z) ?? computeGroundHeight(cp.x, cp.z);
    const m = new THREE.Mesh(ttGateGeo, ttMat);
    m.position.set(cp.x, by + 2.4, cp.z);
    m.visible = false;
    scene.add(m);
    ttRings.push(m);
  });

  // Workshop Bug Hunt 3 Glitch Targets
  const bugMeshes: { id: string; mesh: THREE.Mesh; baseY: number }[] = [];
  const bugGeo = new THREE.IcosahedronGeometry(0.75, 0);
  const bugMat = new THREE.MeshStandardMaterial({
    color: 0xff3b5c,
    emissive: 0xff2e55,
    emissiveIntensity: 0.85,
    roughness: 0.2,
  });
  geometries.push(bugGeo);
  materials.push(bugMat);
  BUG_HUNT_TARGETS.forEach((b) => {
    const gy = computeGroundHeight(b.x, b.z);
    const m = new THREE.Mesh(bugGeo, bugMat);
    m.position.set(b.x, gy + 1.35, b.z);
    scene.add(m);
    bugMeshes.push({ id: b.id, mesh: m, baseY: gy + 1.35 });
  });

  // Lookout Hill 4 Memory Sequence Pads + Vertical Beacons
  const memoryPadItems: { id: number; mat: THREE.MeshStandardMaterial; pillar: THREE.Mesh }[] = [];
  const memPadGeo = new THREE.CylinderGeometry(2.2, 2.4, 0.22, 16);
  const memPillarGeo = new THREE.CylinderGeometry(0.65, 0.95, 7.5, 12, 1, true);
  geometries.push(memPadGeo, memPillarGeo);
  MEMORY_PADS.forEach((pad) => {
    const gy = computeGroundHeight(pad.x, pad.z);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(pad.color),
      emissive: new THREE.Color(pad.color),
      emissiveIntensity: 0.25,
      roughness: 0.3,
    });
    materials.push(mat);
    const disc = new THREE.Mesh(memPadGeo, mat);
    disc.position.set(pad.x, gy + 0.12, pad.z);
    const pillar = new THREE.Mesh(memPillarGeo, mat);
    pillar.position.set(pad.x, gy + 3.8, pad.z);
    pillar.visible = false;
    scene.add(disc, pillar);
    memoryPadItems.push({ id: pad.id, mat, pillar });
  });

  // Treasure Hunt 4 Chest Pickups
  const treasureGroups: { id: string; group: THREE.Group; baseY: number }[] = [];
  const chestBaseGeo = new THREE.BoxGeometry(1.3, 0.78, 0.9);
  const chestLidGeo = new THREE.BoxGeometry(1.36, 0.28, 0.96);
  geometries.push(chestBaseGeo, chestLidGeo);
  TREASURE_CHESTS.forEach((tr) => {
    const gy = computeGroundHeight(tr.x, tr.z);
    const grp = new THREE.Group();
    const base = new THREE.Mesh(chestBaseGeo, woodMat);
    const lid = new THREE.Mesh(chestLidGeo, tokenMat);
    lid.position.y = 0.45;
    grp.add(base, lid);
    grp.position.set(tr.x, gy + 0.55, tr.z);
    scene.add(grp);
    treasureGroups.push({ id: tr.id, group: grp, baseY: gy + 0.55 });
  });

  // Secret Location Ground Markers
  const secretRingMat = new THREE.MeshBasicMaterial({
    color: 0x5e915e,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  });
  materials.push(secretRingMat);
  SECRET_LOCATIONS.forEach((sl) => {
    const gy = computeGroundHeight(sl.x, sl.z);
    const sr = new THREE.Mesh(gateRingGeo, secretRingMat);
    sr.position.set(sl.x, gy + 0.08, sl.z);
    sr.scale.setScalar(1.3);
    scene.add(sr);
  });

  // 14C. EXPANSION DISTRICT PROPS, BROOK, DOCK, BUOYS & CHALLENGE MARKERS
  // Forest Trail Brook crystal water strip beneath Forest Brook Timber Bridge
  const brookGeo = new THREE.PlaneGeometry(8.2, 24);
  brookGeo.rotateX(-Math.PI / 2);
  geometries.push(brookGeo);
  const brookMesh = new THREE.Mesh(brookGeo, waterSystem.waterMat);
  brookMesh.position.set(-104, 0.38, -84);
  brookMesh.renderOrder = 1;
  scene.add(brookMesh);

  // District Welcome Boards
  const districtSigns = [
    { x: -58, z: -48, rotY: 2.3, title: 'FOREST TRAIL', sub: 'Brook Bridge & Woodland Loop', accent: '#4F8456' },
    { x: -29, z: 88, rotY: 0, title: 'AMPHIBIOUS LAGOON', sub: 'Shallow Water Course & Exit Dock', accent: '#17948D' },
    { x: 78, z: 42, rotY: -0.9, title: 'STUNT & DRIFT ARENA', sub: 'Ramps · Sky Decks · Precision Bays', accent: '#E65448' },
  ];
  const dPostGeo = new THREE.CylinderGeometry(0.14, 0.16, 3.6, 8);
  const dBoardGeo = new THREE.BoxGeometry(5.6, 2.0, 0.18);
  geometries.push(dPostGeo, dBoardGeo);
  districtSigns.forEach((ds, idx) => {
    const gy = computeGroundHeight(ds.x, ds.z);
    const tex = createSignTexture(ds.title, ds.sub, ds.accent);
    textures.push(tex);
    const bMat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    materials.push(bMat);
    const grp = new THREE.Group();
    const p1 = new THREE.Mesh(dPostGeo, woodMat);
    p1.position.set(-2.2, 1.8, 0);
    const p2 = new THREE.Mesh(dPostGeo, woodMat);
    p2.position.set(2.2, 1.8, 0);
    const board = new THREE.Mesh(dBoardGeo, bMat);
    board.position.set(0, 3.2, 0);
    grp.add(p1, p2, board);
    createWindFlag(grp, 2.2, 4.18, 0, ds.accent, idx * 1.15 + 0.7, 0.95);
    grp.position.set(ds.x, gy, ds.z);
    grp.rotation.y = ds.rotY;
    scene.add(grp);
  });

  // Amphibious Lagoon Wooden Exit Dock at (-36, 140.5)
  const amphDockGeo = new THREE.BoxGeometry(5.2, 0.35, 6.4);
  geometries.push(amphDockGeo);
  const amphDock = new THREE.Mesh(amphDockGeo, woodMat);
  amphDock.position.set(-36, -0.05, 141.2);
  amphDock.rotation.x = -0.09;
  amphDock.receiveShadow = true;
  amphDock.castShadow = true;
  scene.add(amphDock);

  // Amphibious Lagoon Obstacles (striped buoys & mossy lagoon boulders)
  const buoyGeo = new THREE.CylinderGeometry(0.42, 0.62, 1.45, 10);
  const rockObsGeo = new THREE.DodecahedronGeometry(1.15, 0);
  geometries.push(buoyGeo, rockObsGeo);
  const buoyMat = new THREE.MeshStandardMaterial({ color: 0xe65448, roughness: 0.42 });
  const lagoonRockMat = new THREE.MeshStandardMaterial({ color: 0x6f746c, roughness: 0.9 });
  materials.push(buoyMat, lagoonRockMat);
  LAGOON_RUN_OBSTACLES.forEach((ob) => {
    const gy = computeGroundHeight(ob.x, ob.z);
    const isBuoy = ob.kind === 'buoy';
    const m = new THREE.Mesh(isBuoy ? buoyGeo : rockObsGeo, isBuoy ? buoyMat : lagoonRockMat);
    m.position.set(ob.x, gy + (isBuoy ? 0.72 : 0.65), ob.z);
    if (!isBuoy) {
      m.scale.set(ob.radius * 0.72, 0.78, ob.radius * 0.72);
    }
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
  });

  // Lagoon Run Checkpoints (glowing turquoise torus gates)
  const lagoonRings: THREE.Mesh[] = [];
  const lagoonGateGeo = new THREE.TorusGeometry(2.8, 0.2, 8, 22);
  geometries.push(lagoonGateGeo);
  const lagoonGateMat = new THREE.MeshStandardMaterial({
    color: 0x17948d,
    emissive: 0x27c2b4,
    emissiveIntensity: 0.85,
  });
  materials.push(lagoonGateMat);
  LAGOON_RUN_CHECKPOINTS.forEach((cp) => {
    const gy = Math.max(-0.32, computeGroundHeight(cp.x, cp.z));
    const m = new THREE.Mesh(lagoonGateGeo, lagoonGateMat);
    m.position.set(cp.x, gy + 2.3, cp.z);
    m.visible = false;
    scene.add(m);
    lagoonRings.push(m);
  });

  // Drift Master Circuit Gates
  const driftGates: { ring: THREE.Mesh; pylon: THREE.Mesh; mat: THREE.MeshStandardMaterial }[] = [];
  DRIFT_CIRCUIT_CHECKPOINTS.forEach((cp) => {
    const gy = computeGroundHeight(cp.x, cp.z);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xec6d2c,
      emissive: 0xec6d2c,
      emissiveIntensity: 0.35,
    });
    materials.push(mat);
    const ring = new THREE.Mesh(gateRingGeo, mat);
    ring.position.set(cp.x, gy + 0.08, cp.z);
    const pylon = new THREE.Mesh(pylonGeo, mat);
    pylon.position.set(cp.x, gy + 1.4, cp.z);
    ring.visible = false;
    pylon.visible = false;
    scene.add(ring, pylon);
    driftGates.push({ ring, pylon, mat });
  });

  // Stunt Master Aerial Torus Gates
  const stuntAirRings: { id: string; mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial }[] = [];
  const stuntRingGeo = new THREE.TorusGeometry(2.9, 0.22, 8, 22);
  geometries.push(stuntRingGeo);
  STUNT_AIR_CHECKPOINTS.forEach((cp) => {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffd54f,
      emissive: 0xe65448,
      emissiveIntensity: 0.85,
    });
    materials.push(mat);
    const m = new THREE.Mesh(stuntRingGeo, mat);
    m.position.set(cp.x, cp.y, cp.z);
    m.visible = false;
    scene.add(m);
    stuntAirRings.push({ id: cp.id, mesh: m, mat });
  });

  // Precision Parking Floor Highlight Beacons
  const parkingHighlights: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }[] = [];
  PRECISION_PARKING_BAYS.forEach((bay) => {
    const bayGeo = new THREE.PlaneGeometry(bay.width * 0.92, bay.length * 0.92);
    bayGeo.rotateX(-Math.PI / 2);
    geometries.push(bayGeo);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffd54f,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    materials.push(mat);
    const mesh = new THREE.Mesh(bayGeo, mat);
    mesh.position.set(bay.x, 0.055, bay.z);
    mesh.rotation.y = bay.targetYaw;
    mesh.visible = false;
    scene.add(mesh);
    parkingHighlights.push({ mesh, mat });
  });

  // Forest Trail Gate Rings
  const ftGates: THREE.Mesh[] = [];
  const ftGateGeo = new THREE.TorusGeometry(2.5, 0.18, 8, 22);
  geometries.push(ftGateGeo);
  const ftGateMat = new THREE.MeshStandardMaterial({
    color: 0x4f8456,
    emissive: 0x7bc96f,
    emissiveIntensity: 0.8,
  });
  materials.push(ftGateMat);
  FOREST_TRAIL_GATES.forEach((fg) => {
    const gy = computeBridgeSurfaceY(fg.x, fg.z) ?? computeGroundHeight(fg.x, fg.z);
    const m = new THREE.Mesh(ftGateGeo, ftGateMat);
    m.position.set(fg.x, gy + 2.2, fg.z);
    m.visible = false;
    scene.add(m);
    ftGates.push(m);
  });

  // 15. Validated Managed Props: Fenced Cargo Yards, Safety Cones, Outer Street Lamps, Benches & Contact/CV Kiosk
  const crateGeo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
  const coneGeo = new THREE.ConeGeometry(0.42, 1.05, 8);
  const fencePostGeo = new THREE.CylinderGeometry(0.11, 0.13, 1.25, 6);
  const fenceRailGeo = new THREE.BoxGeometry(7.2, 0.12, 0.1);
  const fenceSideGeo = new THREE.BoxGeometry(0.1, 0.12, 5.2);
  const benchSeatGeo = new THREE.BoxGeometry(1.9, 0.14, 0.56);
  const benchLegGeo = new THREE.BoxGeometry(0.14, 0.48, 0.5);
  const kioskBaseGeo = new THREE.BoxGeometry(1.5, 2.2, 0.72);
  const kioskScreenGeo = new THREE.PlaneGeometry(1.15, 0.85);
  const outerLampPostGeo = new THREE.CylinderGeometry(0.08, 0.12, 4.0, 8);
  const outerLampBulbGeo = new THREE.SphereGeometry(0.24, 10, 8);
  geometries.push(
    crateGeo,
    coneGeo,
    fencePostGeo,
    fenceRailGeo,
    fenceSideGeo,
    benchSeatGeo,
    benchLegGeo,
    kioskBaseGeo,
    kioskScreenGeo,
    outerLampPostGeo,
    outerLampBulbGeo,
  );
  const crateMat = new THREE.MeshStandardMaterial({ map: procTex.woodPlankAlbedo, roughness: 0.78 });
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xe65448, roughness: 0.52 });
  materials.push(crateMat, coneMat);

  for (const cp of managedProps.crates) {
    const cy = cp.y + 0.55;
    const m = new THREE.Mesh(crateGeo, crateMat);
    m.position.set(cp.x, cy, cp.z);
    m.rotation.y = cp.yaw;
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    dynamicProps.push({
      mesh: m,
      x: cp.x,
      y: cy,
      z: cp.z,
      hx: 0.55,
      hy: 0.55,
      hz: 0.55,
      mass: 2.2,
    });
  }

  for (const yard of CRATE_YARD_DEFS) {
    const gy = computeGroundHeight(yard.centerX, yard.centerZ);
    const fGrp = new THREE.Group();
    fGrp.position.set(yard.centerX, gy, yard.centerZ);
    fGrp.rotation.y = yard.yaw;
    for (const [fx, fz] of [
      [-3.55, -2.55],
      [3.55, -2.55],
      [-3.55, 2.55],
      [3.55, 2.55],
    ]) {
      const fp = new THREE.Mesh(fencePostGeo, woodMat);
      fp.position.set(fx, 0.62, fz);
      fp.castShadow = true;
      fGrp.add(fp);
    }
    for (const rZ of [-2.55, 2.55]) {
      const rail = new THREE.Mesh(fenceRailGeo, woodMat);
      rail.position.set(0, 0.92, rZ);
      fGrp.add(rail);
    }
    for (const rX of [-3.55, 3.55]) {
      const side = new THREE.Mesh(fenceSideGeo, woodMat);
      side.position.set(rX, 0.92, 0);
      fGrp.add(side);
    }
    scene.add(fGrp);
    staticColliders.push({
      x: yard.centerX,
      y: gy + 0.65,
      z: yard.centerZ,
      hx: 3.65,
      hy: 0.75,
      hz: 2.65,
      ry: yard.yaw,
      ignoreCamera: true,
      kind: 'prop',
    });
  }

  if (import.meta.env.DEV) {
    const audit = validateWorldLayout(managedProps.crates);
    const propAudit = auditPlacedProps();
    if (!audit.valid || propAudit.violations.length > 0) {
      console.warn('[WorldLayoutAudit] Layout clearance issues:', {
        issues: audit.issues,
        propViolations: propAudit.violations,
      });
    }
  }

  for (const cp of managedProps.cones) {
    const cy = cp.y + 0.52;
    const m = new THREE.Mesh(coneGeo, coneMat);
    m.position.set(cp.x, cy, cp.z);
    m.castShadow = true;
    scene.add(m);
    dynamicProps.push({
      mesh: m,
      x: cp.x,
      y: cy,
      z: cp.z,
      hx: 0.4,
      hy: 0.52,
      hz: 0.4,
      mass: 0.8,
    });
  }

  for (const bn of managedProps.benches) {
    const bGrp = new THREE.Group();
    bGrp.position.set(bn.x, bn.y, bn.z);
    bGrp.rotation.y = bn.yaw;
    const seat = new THREE.Mesh(benchSeatGeo, woodMat);
    seat.position.y = 0.52;
    seat.castShadow = true;
    const legL = new THREE.Mesh(benchLegGeo, roofDarkMat);
    legL.position.set(-0.72, 0.24, 0);
    const legR = new THREE.Mesh(benchLegGeo, roofDarkMat);
    legR.position.set(0.72, 0.24, 0);
    bGrp.add(seat, legL, legR);
    scene.add(bGrp);
  }

  for (const lp of managedProps.lamps) {
    const pole = new THREE.Mesh(outerLampPostGeo, roofDarkMat);
    pole.position.set(lp.x, lp.y + 2.0, lp.z);
    pole.castShadow = true;
    const bulb = new THREE.Mesh(outerLampBulbGeo, lanternMat);
    bulb.position.set(lp.x, lp.y + 4.05, lp.z);
    scene.add(pole, bulb);
  }

  for (const kk of managedProps.contactKiosks) {
    const kTex = createSignTexture('CONTACT & CV', 'OPEN /CONTACT · DOWNLOAD RESUME', '#21968B');
    textures.push(kTex);
    const kScreenMat = new THREE.MeshBasicMaterial({ map: kTex, toneMapped: false });
    materials.push(kScreenMat);
    const kGrp = new THREE.Group();
    kGrp.position.set(kk.x, kk.y, kk.z);
    kGrp.rotation.y = kk.yaw;
    const body = new THREE.Mesh(kioskBaseGeo, roofDarkMat);
    body.position.y = 1.1;
    body.castShadow = true;
    const scr = new THREE.Mesh(kioskScreenGeo, kScreenMat);
    scr.position.set(0, 1.45, 0.37);
    kGrp.add(body, scr);
    scene.add(kGrp);
    staticColliders.push({
      x: kk.x,
      y: kk.y + 1.1,
      z: kk.z,
      hx: 0.8,
      hy: 1.1,
      hz: 0.45,
      ry: kk.yaw,
      kind: 'prop',
    });
  }

  // F6 Prop Audit Debug Overlay (green rings >= 4m clear, red rings < 4m violation)
  const propAuditGroup = new THREE.Group();
  propAuditGroup.visible = false;
  const auditRingGeo = new THREE.RingGeometry(0.95, 1.32, 16);
  auditRingGeo.rotateX(-Math.PI / 2);
  geometries.push(auditRingGeo);
  const auditOkMat = new THREE.MeshBasicMaterial({ color: 0x4caf50, side: THREE.DoubleSide });
  const auditWarnMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
  materials.push(auditOkMat, auditWarnMat);
  for (const pr of managedProps.all) {
    const m = new THREE.Mesh(auditRingGeo, pr.roadClearanceMeters >= 4.0 ? auditOkMat : auditWarnMat);
    m.position.set(pr.x, pr.y + 0.14, pr.z);
    propAuditGroup.add(m);
  }
  scene.add(propAuditGroup);

  // Dynamic GPS Glowing Navigation Ribbon Mesh
  const gpsRibbonGeo = new THREE.BufferGeometry();
  const gpsRibbonMat = new THREE.MeshBasicMaterial({
    color: 0x21968b,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  geometries.push(gpsRibbonGeo);
  materials.push(gpsRibbonMat);
  const gpsRibbonMesh = new THREE.Mesh(gpsRibbonGeo, gpsRibbonMat);
  gpsRibbonMesh.visible = false;
  gpsRibbonMesh.renderOrder = 8;
  gpsRibbonMesh.frustumCulled = false;
  scene.add(gpsRibbonMesh);

  // AI Traffic, Paddock Circuit Rivals & Companion Guide Drone
  const aiTraffic = createAiTrafficSystem(scene, geometries, materials);

  // 16. Ambient Floating Dust / Pollen Motes
  const moteCount = 90;
  const motePos = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    motePos[i * 3] = (Math.random() - 0.5) * 150;
    motePos[i * 3 + 1] = 1.5 + Math.random() * 11;
    motePos[i * 3 + 2] = (Math.random() - 0.5) * 150;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  geometries.push(moteGeo);
  const moteMat = new THREE.PointsMaterial({
    color: 0xfff5d6,
    size: 0.35,
    transparent: true,
    opacity: 0.72,
  });
  materials.push(moteMat);
  const motes = new THREE.Points(moteGeo, moteMat);
  scene.add(motes);

  let latestMotionTime = 0;

  const atmosphereSystem = createAtmosphereSystem(
    scene,
    fog,
    hemi,
    sun,
    coolFill,
    geometries,
    materials,
    {
      onWetnessUpdate: (wetness) => {
        terrainMat.roughness = THREE.MathUtils.lerp(0.9, 0.36, wetness);
        terrainMat.envMapIntensity = THREE.MathUtils.lerp(0.38, 1.15, wetness);
        const wetTint = THREE.MathUtils.lerp(1.0, 0.82, wetness);
        terrainMat.color.setRGB(wetTint, wetTint, Math.min(1, wetTint + 0.03 * wetness));
        roadAndBridgeSys.setWetness(wetness);
      },
      onNightGlowUpdate: (nightGlow, lhOpacity) => {
        const flicker = Math.sin(latestMotionTime * 2.2) * (0.06 + nightGlow * 0.14);
        lanternMat.emissiveIntensity = 0.72 + nightGlow * 1.45 + flicker;
        lampGlowMat.emissiveIntensity = 0.85 + nightGlow * 1.25;
        windowGlowMat.emissiveIntensity = 0.1 + nightGlow * 1.55;
        coolScreenGlowMat.emissiveIntensity = 0.18 + nightGlow * 1.25;
        lhBeamMat.opacity = lhOpacity;
        lhHaloMat.opacity = 0.1 + nightGlow * 0.34;
        roadAndBridgeSys.updateLighting(currentWeather, latestMotionTime, nightGlow);
      },
    },
  );

  const applyWeatherMode = (mode: WeatherMode, immediate = false) => {
    currentWeather = mode;
    atmosphereSystem.applyWeatherMode(mode, immediate);
    waterSystem.applyWeather(mode);
    vegetationSystem.setWindProfile(mode, currentWindMode);
    const resolved = resolveWindProfile(mode, currentWindMode);
    windSpeed = resolved.speedMultiplier;
    windGust = resolved.gustStrength;
  };

  const setWindMode = (mode: WindMode) => {
    currentWindMode = mode;
    vegetationSystem.setWindProfile(currentWeather, mode);
    const resolved = resolveWindProfile(currentWeather, mode);
    windSpeed = resolved.speedMultiplier;
    windGust = resolved.gustStrength;
  };

  const setSecurityGateOpen = (open: boolean) => {
    securityGateOpen = open;
  };

  const setRfidCardCollected = (collected: boolean) => {
    rfidCardGroup.visible = !collected;
  };

  const setDeliveryTarget = (landmarkId: string | null) => {
    if (!deliveryBeacon) return;
    if (!landmarkId) {
      deliveryBeacon.visible = false;
      return;
    }
    const target = WORLD_LANDMARKS.find((l) => l.id === landmarkId);
    if (!target) {
      deliveryBeacon.visible = false;
      return;
    }
    const gy = target.position.y ?? computeGroundHeight(target.position.x, target.position.z);
    deliveryBeacon.position.set(target.position.x, gy + 7, target.position.z);
    deliveryBeacon.visible = true;
  };

  const setWaypointTarget = (
    landmarkId: string | null,
    colorHex?: string,
    overridePos?: { x: number; z: number },
  ) => {
    if (!waypointBeacon || !waypointBeamMat) return;
    if (overridePos) {
      const gy = computeBridgeSurfaceY(overridePos.x, overridePos.z) ?? computeGroundHeight(overridePos.x, overridePos.z);
      waypointBeamMat.color.set(colorHex || '#EC6D2C');
      waypointBeacon.position.set(overridePos.x, gy, overridePos.z);
      waypointBeacon.visible = true;
      return;
    }
    if (!landmarkId) {
      waypointBeacon.visible = false;
      return;
    }
    const target = WORLD_LANDMARKS.find((l) => l.id === landmarkId);
    if (!target) {
      waypointBeacon.visible = false;
      return;
    }
    const gy = target.position.y ?? computeGroundHeight(target.position.x, target.position.z);
    waypointBeamMat.color.set(colorHex || target.color);
    waypointBeacon.position.set(target.position.x, gy, target.position.z);
    waypointBeacon.visible = true;
  };

  const triggerDiscoveryPulse = (x: number, z: number, colorHex = '#EC6D2C') => {
    const slot = discoveryPulses.find((p) => p.life <= 0) || discoveryPulses[0];
    if (!slot) return;
    const gy = computeGroundHeight(x, z);
    slot.mat.color.set(colorHex);
    slot.mat.opacity = 0.88;
    slot.mesh.position.set(x, gy + 0.16, z);
    slot.mesh.scale.setScalar(1);
    slot.mesh.visible = true;
    slot.life = 1.0;
  };

  const setSqlProgress = (nextGateIdx: number) => {
    sqlGateMats.forEach((m, idx) => {
      if (idx < nextGateIdx) {
        m.color.set('#5E915E');
        m.emissive.set('#5E915E');
        m.emissiveIntensity = 0.65;
      } else if (idx === nextGateIdx) {
        m.color.set('#FFD54F');
        m.emissive.set('#EC6D2C');
        m.emissiveIntensity = 0.95;
      } else {
        m.color.set('#3E7B9E');
        m.emissive.set('#3E7B9E');
        m.emissiveIntensity = 0.2;
      }
    });
  };

  const setPaddockCheckpoint = (nextIdx: number) => {
    paddockGateMats.forEach((m, idx) => {
      if (idx < nextIdx) {
        m.color.set('#5E915E');
        m.emissive.set('#5E915E');
        m.emissiveIntensity = 0.6;
      } else if (idx === nextIdx) {
        m.color.set('#FFD54F');
        m.emissive.set('#EC6D2C');
        m.emissiveIntensity = 1.0;
      } else {
        m.color.set('#CC5318');
        m.emissive.set('#CC5318');
        m.emissiveIntensity = 0.25;
      }
    });
  };

  const setTimeTrialProgress = (nextIdx: number | null) => {
    ttRings.forEach((ring, idx) => {
      ring.visible = nextIdx !== null && idx === nextIdx;
    });
  };

  const setBugHuntState = (foundIds: string[]) => {
    bugMeshes.forEach((b) => {
      b.mesh.visible = !foundIds.includes(b.id);
    });
  };

  const setMemoryPadHighlight = (padId: number | null) => {
    memoryPadItems.forEach((item) => {
      const lit = padId === item.id;
      item.mat.emissiveIntensity = lit ? 1.45 : 0.25;
      item.pillar.visible = lit;
    });
  };

  const setTreasureState = (foundIds: string[]) => {
    treasureGroups.forEach((t) => {
      t.group.visible = !foundIds.includes(t.id);
    });
  };

  const setLagoonRunProgress = (nextIdx: number | null) => {
    lagoonRings.forEach((ring, idx) => {
      ring.visible = nextIdx !== null && idx === nextIdx;
    });
  };

  const setDriftGateProgress = (nextIdx: number | null) => {
    driftGates.forEach((dg, idx) => {
      const visible = nextIdx !== null;
      dg.ring.visible = visible;
      dg.pylon.visible = visible;
      if (nextIdx !== null) {
        if (idx === nextIdx % driftGates.length) {
          dg.mat.color.set('#FFD54F');
          dg.mat.emissive.set('#EC6D2C');
          dg.mat.emissiveIntensity = 1.1;
        } else {
          dg.mat.color.set('#3E7B9E');
          dg.mat.emissive.set('#3E7B9E');
          dg.mat.emissiveIntensity = 0.25;
        }
      }
    });
  };

  const setStuntAirProgress = (foundIds: string[]) => {
    stuntAirRings.forEach((sr) => {
      const cleared = foundIds.includes(sr.id);
      sr.mesh.visible = !cleared;
    });
  };

  const setParkingBayProgress = (nextIdx: number | null, alignPct = 0) => {
    parkingHighlights.forEach((ph, idx) => {
      ph.mesh.visible = nextIdx !== null && idx === nextIdx;
      if (ph.mesh.visible) {
        if (alignPct >= 0.85) {
          ph.mat.color.set('#4CAF50');
          ph.mat.opacity = 0.72;
        } else if (alignPct >= 0.35) {
          ph.mat.color.set('#FFD54F');
          ph.mat.opacity = 0.55;
        } else {
          ph.mat.color.set('#EC6D2C');
          ph.mat.opacity = 0.38;
        }
      }
    });
  };

  const setForestTrailProgress = (nextIdx: number | null) => {
    ftGates.forEach((ring, idx) => {
      ring.visible = nextIdx !== null && idx === nextIdx;
    });
  };

  const setVehicleWake = (x: number, z: number, speedMs: number, inWater: boolean) => {
    waterSystem.setVehicleWake(x, z, speedMs, inWater);
  };

  const _sunDirScratch = new THREE.Vector3(58, 76, 44).normalize();

  const updateSunTarget = (px: number, pz: number) => {
    const frustumWidth = Math.max(64, sun.shadow.camera.right - sun.shadow.camera.left);
    const mapSize = Math.max(512, sun.shadow.mapSize.width);
    const texelSize = frustumWidth / mapSize;
    const snappedX = Math.round(px / texelSize) * texelSize;
    const snappedZ = Math.round(pz / texelSize) * texelSize;
    sun.target.position.set(snappedX, 0, snappedZ);
    atmosphereSystem.getSunDirection(_sunDirScratch);
    sun.position.set(
      snappedX + _sunDirScratch.x * 115,
      Math.max(18, _sunDirScratch.y * 115),
      snappedZ + _sunDirScratch.z * 115,
    );
    sun.target.updateMatrixWorld();
  };

  const updatePlayerContext = (px: number, _py: number, pz: number, camX: number, camZ: number) => {
    atmosphereSystem.setPlayerPosition(px, pz);
    vegetationSystem.setCameraPosition(camX, camZ);
    updateSunTarget(px, pz);
  };

  const updateGpsRoute = (
    points: readonly { x: number; z: number }[] | null,
    colorHex = '#21968B',
  ) => {
    if (!points || points.length < 2) {
      gpsRibbonMesh.visible = false;
      return;
    }
    gpsRibbonMat.color.set(colorHex);
    const pos: number[] = [];
    const idx: number[] = [];
    const halfW = 0.52;
    let vertCursor = 0;

    for (let s = 0; s < points.length - 1; s++) {
      const a = points[s];
      const b = points[s + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      if (len < 0.4) continue;
      const steps = Math.max(2, Math.ceil(len / 2.5));
      const nx = -dz / len;
      const nz = dx / len;
      const startVert = vertCursor;

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const cx = a.x + dx * t;
        const cz = a.z + dz * t;
        const y = (computeBridgeSurfaceY(cx, cz) ?? computeGroundHeight(cx, cz)) + 0.085;
        pos.push(cx + nx * halfW, y, cz + nz * halfW, cx - nx * halfW, y, cz - nz * halfW);
        if (i < steps) {
          const base = startVert + i * 2;
          idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
        }
        vertCursor += 2;
      }
    }

    if (pos.length < 6) {
      gpsRibbonMesh.visible = false;
      return;
    }
    gpsRibbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    gpsRibbonGeo.setIndex(idx);
    gpsRibbonGeo.computeBoundingSphere();
    gpsRibbonMesh.visible = true;
  };

  const setDayNightCycle = (enabled: boolean) => {
    atmosphereSystem.setDayNightCycle(enabled);
  };

  const setRoadLayerDebug = (enabled: boolean) => {
    roadAndBridgeSys.setRoadLayerDebug(enabled);
  };

  const setPropAuditVisible = (visible: boolean) => {
    propAuditGroup.visible = visible;
  };

  const setAllOrbsCollected = (collectedAll: boolean) => {
    crownGroup.visible = collectedAll;
  };

  let lowQualityProfile = false;
  let reducedMotionProfile = false;

  const setPerformanceProfile = (
    quality: QualityLevel,
    reducedMotion: boolean,
    isSoftwareGl = false,
  ) => {
    lowQualityProfile = quality === 'low';
    reducedMotionProfile = reducedMotion;
    const hideLivingFX = lowQualityProfile || reducedMotionProfile;
    motes.visible = !hideLivingFX;
    butterflyGroup.visible = !hideLivingFX;
    fishGroup.visible = !hideLivingFX;
    aiTraffic.setVisible(!isSoftwareGl || quality !== 'low');
    waterSystem.applyQuality(quality);
    vegetationSystem.setPerformanceProfile(quality, reducedMotion);
    atmosphereSystem.setQualityProfile(quality, reducedMotion, isSoftwareGl);
  };

  const updateEnvironment = (elapsed: number, dt: number) => {
    const motionTime = reducedMotionProfile ? 0 : elapsed;
    latestMotionTime = motionTime;
    atmosphereSystem.update(motionTime, dt);
    vegetationSystem.update(motionTime, dt);

    if (crownGroup.visible) {
      crownGroup.rotation.y = motionTime * 1.4;
      cCore.rotation.x = motionTime * 1.1;
    }

    techSymbols.forEach((sym, i) => {
      sym.mesh.rotation.y = motionTime * (1.1 + i * 0.25);
      sym.mesh.rotation.x = Math.sin(motionTime + i) * 0.35;
      sym.mesh.position.y = sym.baseY + Math.sin(motionTime * 2.0 + i * 1.3) * 0.14;
    });

    if (radarDish) {
      radarDish.rotation.y = motionTime * 0.85;
    }

    if (lighthouseBeam) {
      lighthouseBeam.rotation.y = motionTime * 0.65;
    }

    waterSystem.update(motionTime, mooredBoat);

    for (const bird of soaringBirds) {
      const ang = motionTime * bird.speed + bird.phase;
      bird.grp.position.set(
        bird.cx + Math.cos(ang) * bird.radius,
        bird.alt + Math.sin(motionTime * 1.6 + bird.phase) * 0.8,
        bird.cz + Math.sin(ang) * bird.radius,
      );
      bird.grp.rotation.y = -ang + Math.PI / 2;
    }

    if (windSpeed > 0.01 && !reducedMotionProfile) {
      const waveFreq = 3.2 + windSpeed * 2.1;
      const amp = 0.14 + windSpeed * 0.12 + windGust * 0.18;
      for (const wf of windFlags) {
        const gustWave = Math.sin(motionTime * 1.15 + wf.phase) * windGust * 0.15;
        wf.seg1.rotation.y = Math.sin(motionTime * waveFreq + wf.phase) * amp + gustWave;
        wf.seg2.rotation.y = Math.sin(motionTime * waveFreq + wf.phase - 1.15) * (amp * 1.3);
        wf.seg3.rotation.y = Math.sin(motionTime * waveFreq + wf.phase - 2.3) * (amp * 1.55);
      }
    }

    if (butterflyGroup.visible) {
      for (const bf of butterflies) {
        const ang = motionTime * bf.speed + bf.phase;
        const nx = bf.cx + Math.cos(ang) * bf.radius;
        const nz = bf.cz + Math.sin(ang * 2) * (bf.radius * 0.55);
        const ny = bf.baseY + Math.sin(motionTime * 3.1 + bf.phase) * 0.28;
        bf.grp.position.set(nx, ny, nz);
        bf.grp.rotation.y = -Math.atan2(
          Math.cos(ang * 2) * bf.radius * 1.1,
          -Math.sin(ang) * bf.radius,
        );
        const flap = Math.sin(motionTime * 15 + bf.phase) * 0.78;
        bf.wL.rotation.z = flap;
        bf.wR.rotation.z = -flap;
      }
    }

    if (fishGroup.visible) {
      for (const f of swimmingFish) {
        const ang = motionTime * f.speed + f.phase;
        const nx = f.cx + Math.cos(ang) * f.rx;
        const nz = f.cz + Math.sin(ang) * f.rz;
        const vx = -Math.sin(ang) * f.rx * f.speed;
        const vz = Math.cos(ang) * f.rz * f.speed;
        f.grp.position.set(nx, f.baseY + Math.sin(motionTime * 1.8 + f.phase) * 0.03, nz);
        f.grp.rotation.y = Math.atan2(vx, vz);
        f.tail.rotation.y = Math.sin(motionTime * 9.5 + f.phase) * 0.42;
      }
    }

    if (securityGateArm) {
      const targetAngle = securityGateOpen ? Math.PI / 2.2 : 0;
      securityGateArm.rotation.z = THREE.MathUtils.damp(
        securityGateArm.rotation.z,
        targetAngle,
        5,
        dt,
      );
    }

    for (const col of collectibles) {
      if (!col.collected) {
        col.mesh.rotation.y = motionTime * 2.2;
        col.mesh.position.y = col.y + Math.sin(motionTime * 2.6 + col.x) * 0.22;
      }
    }

    if (rfidCardGroup.visible) {
      rfidCardGroup.rotation.y = motionTime * 2.4;
      rfidCardGroup.position.y = rfidCardGy + 1.35 + Math.sin(motionTime * 3) * 0.2;
    }

    for (const bm of bugMeshes) {
      if (bm.mesh.visible) {
        bm.mesh.rotation.x = motionTime * 3.2;
        bm.mesh.rotation.y = motionTime * 4.1;
        bm.mesh.position.y = bm.baseY + Math.sin(motionTime * 4.5 + bm.baseY) * 0.25;
      }
    }

    for (const tg of treasureGroups) {
      if (tg.group.visible) {
        tg.group.rotation.y = motionTime * 1.3;
        tg.group.position.y = tg.baseY + Math.sin(motionTime * 2.2) * 0.14;
      }
    }

    for (const ring of ttRings) {
      if (ring.visible) {
        ring.rotation.y = motionTime * 1.8;
      }
    }

    for (const ring of lagoonRings) {
      if (ring.visible) {
        ring.rotation.y = motionTime * 1.9;
      }
    }

    for (const sr of stuntAirRings) {
      if (sr.mesh.visible) {
        sr.mesh.rotation.y = motionTime * 1.6;
      }
    }

    for (const fg of ftGates) {
      if (fg.visible) {
        fg.rotation.y = motionTime * 1.5;
      }
    }

    for (const sr of sqlGateRings) {
      sr.rotation.z = motionTime * 0.9;
    }

    if (deliveryBeacon && deliveryBeacon.visible) {
      deliveryBeacon.rotation.y = motionTime * 1.4;
    }

    if (waypointBeacon && waypointBeacon.visible) {
      waypointBeacon.rotation.y = -motionTime * 1.1;
      if (waypointHalo) {
        const s = 1 + Math.sin(motionTime * 3.4) * 0.14;
        waypointHalo.scale.set(s, s, 1);
      }
    }

    for (const dp of discoveryPulses) {
      if (dp.life > 0) {
        dp.life = Math.max(0, dp.life - dt * 0.72);
        const progress = 1 - dp.life;
        dp.mesh.scale.setScalar(1 + progress * 3.6);
        dp.mat.opacity = dp.life * 0.85;
        if (dp.life <= 0) {
          dp.mesh.visible = false;
        }
      }
    }

    motes.position.y = Math.sin(motionTime * 0.5) * 0.45;
  };

  const dispose = () => {
    procTex.dispose();
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    if (sun.shadow.map) {
      sun.shadow.map.dispose();
      sun.shadow.map = null;
    }
  };

  return {
    staticColliders,
    dynamicProps,
    collectibles,
    applyWeatherMode,
    setSecurityGateOpen,
    setRfidCardCollected,
    setDeliveryTarget,
    setWaypointTarget,
    triggerDiscoveryPulse,
    setSqlProgress,
    setPaddockCheckpoint,
    setTimeTrialProgress,
    setBugHuntState,
    setMemoryPadHighlight,
    setTreasureState,
    setLagoonRunProgress,
    setDriftGateProgress,
    setStuntAirProgress,
    setParkingBayProgress,
    setForestTrailProgress,
    setVehicleWake,
    setPerformanceProfile,
    setWindMode,
    setDayNightCycle,
    updateSunTarget,
    updatePlayerContext,
    updateAiTraffic: aiTraffic.update,
    updateGpsRoute,
    setRoadLayerDebug,
    setPropAuditVisible,
    setAllOrbsCollected,
    updateEnvironment,
    dispose,
  };
}
