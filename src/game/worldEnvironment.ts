import * as THREE from 'three';
import {
  BUG_HUNT_TARGETS,
  MEMORY_PADS,
  PADDOCK_CHECKPOINTS,
  SECRET_LOCATIONS,
  SQL_CHALLENGE_GATES,
  TIME_TRIAL_CHECKPOINTS,
  TREASURE_CHESTS,
  WORLD_COLLECTIBLES,
  WORLD_LANDMARKS,
} from '../data/portfolioData';
import type { CollectibleKind, QualityLevel, WeatherMode } from '../types/portfolio';
import { computeBridgeSurfaceY, computeGroundHeight } from './physicsMath';
import { createWorldProceduralTextures } from './proceduralTextures';

export interface StaticBoxColliderDef {
  x: number;
  y: number;
  z: number;
  hx: number;
  hy: number;
  hz: number;
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
  applyWeatherMode: (mode: WeatherMode) => void;
  setSecurityGateOpen: (open: boolean) => void;
  setRfidCardCollected: (collected: boolean) => void;
  setDeliveryTarget: (landmarkId: string | null) => void;
  setSqlProgress: (nextGateIdx: number) => void;
  setPaddockCheckpoint: (nextIdx: number) => void;
  setTimeTrialProgress: (nextIdx: number | null) => void;
  setBugHuntState: (foundIds: string[]) => void;
  setMemoryPadHighlight: (padId: number | null) => void;
  setTreasureState: (foundIds: string[]) => void;
  setPerformanceProfile: (quality: QualityLevel, reducedMotion: boolean) => void;
  updateEnvironment: (elapsed: number, dt: number) => void;
  dispose: () => void;
}

function createSandTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#E6C28C';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 1800; i++) {
    const x = (i * 79) % 256;
    const y = (i * 151) % 256;
    const r = 1 + (i % 3) * 0.7;
    ctx.fillStyle =
      i % 2 === 0 ? 'rgba(176, 128, 72, 0.24)' : 'rgba(255, 238, 206, 0.24)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(34, 34);
  return tex;
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

function createSkyDome(): {
  mesh: THREE.Mesh;
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
} {
  const geo = new THREE.SphereGeometry(245, 28, 18);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const topColor = new THREE.Color('#5BB7D4');
  const midColor = new THREE.Color('#FCE6C2');
  const botColor = new THREE.Color('#F3C290');
  const temp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = THREE.MathUtils.clamp((y + 22) / 205, 0, 1);
    if (t < 0.34) {
      temp.copy(botColor).lerp(midColor, t / 0.34);
    } else {
      temp.copy(midColor).lerp(topColor, (t - 0.34) / 0.66);
    }
    colors[i * 3] = temp.r;
    colors[i * 3 + 1] = temp.g;
    colors[i * 3 + 2] = temp.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    fog: false,
  });
  return { mesh: new THREE.Mesh(geo, mat), geo, mat };
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

function createTunnelArchGeo(): THREE.ExtrudeGeometry {
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
    depth: 16,
    bevelEnabled: true,
    bevelThickness: 0.14,
    bevelSize: 0.12,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -8);
  return geo;
}

function isNearRoadOrBuilding(x: number, z: number): boolean {
  if (Math.hypot(x, z) < 16) return true;
  const r = Math.hypot(x, z);
  if (Math.abs(r - 34) < 5.6) return true;
  if (Math.abs(x) < 8 && z < -10 && z > -76) return true;
  if (Math.abs(x) < 6 && z > 10 && z < 56) return true;
  if (Math.abs(x - 40) < 7 && z >= -48 && z <= 12) return true;
  if (Math.abs(x + 42) < 9.5 && z >= -36 && z <= 22) return true;
  if (Math.hypot(x + 66, z - 18) < 22.5) return true;
  if (x >= 14 && x <= 78 && z >= -33 && z <= -12) return true;
  if (Math.hypot(x + 18, z - 66) < 13.8) return true;
  for (const lm of WORLD_LANDMARKS) {
    if (Math.hypot(x - lm.position.x, z - lm.position.z) < 13.2) return true;
  }
  return false;
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

  const floatingSigns: { group: THREE.Group; baseY: number; phase: number }[] = [];
  const indicatorDiamonds: { mesh: THREE.Mesh; baseY: number; phase: number }[] = [];
  const techSymbols: THREE.Mesh[] = [];
  const soaringBirds: { grp: THREE.Group; cx: number; cz: number; radius: number; speed: number; alt: number; phase: number }[] = [];
  let radarDish: THREE.Group | null = null;
  let lighthouseBeam: THREE.Group | null = null;
  let mooredBoat: THREE.Group | null = null;
  let securityGateArm: THREE.Group | null = null;
  let securityGateOpen = false;
  let deliveryBeacon: THREE.Mesh | null = null;

  const windUniform = { value: 0 };

  const procTex = createWorldProceduralTextures(maxAnisotropy);

  // Sky, Starfield & Atmospheric Fog
  const fog = new THREE.FogExp2('#F6DAB4', 0.0044);
  scene.background = new THREE.Color('#F6DAB4');
  scene.fog = fog;

  const sky = createSkyDome();
  geometries.push(sky.geo);
  materials.push(sky.mat);
  scene.add(sky.mesh);

  // Starfield dome for Night weather mode
  const starCount = 400;
  const starFieldPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = 0.06 + Math.random() * Math.PI * 0.44;
    const r = 212;
    starFieldPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starFieldPos[i * 3 + 1] = r * Math.cos(phi) + 4;
    starFieldPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starFieldGeo = new THREE.BufferGeometry();
  starFieldGeo.setAttribute('position', new THREE.BufferAttribute(starFieldPos, 3));
  const starFieldMat = new THREE.PointsMaterial({
    color: 0xfff9f0,
    size: 2.3,
    fog: false,
    transparent: true,
    opacity: 0.95,
  });
  geometries.push(starFieldGeo);
  materials.push(starFieldMat);
  const starDome = new THREE.Points(starFieldGeo, starFieldMat);
  starDome.visible = false;
  scene.add(starDome);

  // Pooled Falling Rain Streaks
  const rainCount = 240;
  const rainGeo = new THREE.BoxGeometry(0.05, 1.35, 0.05);
  const rainMat = new THREE.MeshBasicMaterial({
    color: 0xc8ebff,
    transparent: true,
    opacity: 0.55,
  });
  geometries.push(rainGeo);
  materials.push(rainMat);
  const rainInst = new THREE.InstancedMesh(rainGeo, rainMat, rainCount);
  rainInst.visible = false;
  rainInst.frustumCulled = false;
  const rainDrops: { x: number; y: number; z: number; speed: number }[] = [];
  const rainDummy = new THREE.Object3D();
  for (let i = 0; i < rainCount; i++) {
    rainDrops.push({
      x: (Math.random() - 0.5) * 140,
      y: Math.random() * 34,
      z: (Math.random() - 0.5) * 140,
      speed: 26 + Math.random() * 12,
    });
  }
  scene.add(rainInst);

  // Calibrated 3-Point Warm/Cool Lighting Rig
  const hemi = new THREE.HemisphereLight('#FFF3DC', '#9C734B', 0.68);
  hemi.position.set(0, 75, 0);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight('#FFE4B8', 1.45);
  sun.position.set(58, 76, 44);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 1024;
  sun.shadow.mapSize.height = 1024;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 225;
  const d = 94;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.025;
  scene.add(sun);

  const coolFill = new THREE.DirectionalLight('#9CE4DF', 0.34);
  coolFill.position.set(-60, 32, -48);
  scene.add(coolFill);

  let currentWeather: WeatherMode = 'sunny';
  let rainActive = false;

  // 1. Sculpted 280x280 Terrain Mesh with vertex color biomes + subtle wind-ripple bump
  const sandTex = createSandTexture();
  sandTex.anisotropy = maxAnisotropy;
  textures.push(sandTex);

  const terrainGeo = new THREE.PlaneGeometry(280, 280, 120, 120);
  terrainGeo.rotateX(-Math.PI / 2);
  const tPos = terrainGeo.attributes.position;
  const tCol = new Float32Array(tPos.count * 3);
  const sandTint = new THREE.Color('#FFF4DF');
  const grassTint = new THREE.Color('#97BF78');
  const shoreTint = new THREE.Color('#DFBE90');
  const ridgeTint = new THREE.Color('#C9A57C');
  const tempCol = new THREE.Color();

  for (let i = 0; i < tPos.count; i++) {
    const x = tPos.getX(i);
    const z = tPos.getZ(i);
    const y = computeGroundHeight(x, z);
    tPos.setY(i, y);

    const radial = Math.hypot(x, z);
    if (y < -0.1) {
      tempCol.copy(shoreTint);
    } else if (radial > 110) {
      tempCol.copy(sandTint).lerp(ridgeTint, 0.65);
    } else if (y > 1.05 || (Math.sin(x * 0.075) * Math.cos(z * 0.075) > 0.25 && radial > 26)) {
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
    map: sandTex,
    bumpMap: procTex.sandBump,
    bumpScale: 0.14,
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.02,
  });
  materials.push(terrainMat);

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // Distant Low-Poly Horizon Mountain Silhouette Ring (depth & natural boundary)
  const cliffGeo = new THREE.ConeGeometry(18, 26, 6);
  const cliffMat = new THREE.MeshStandardMaterial({ color: 0xbfa084, roughness: 0.95 });
  geometries.push(cliffGeo);
  materials.push(cliffMat);
  const cliffCount = 34;
  const cliffInst = new THREE.InstancedMesh(cliffGeo, cliffMat, cliffCount);
  const dummy = new THREE.Object3D();
  const cColor = new THREE.Color();
  for (let i = 0; i < cliffCount; i++) {
    const a = (i / cliffCount) * Math.PI * 2;
    const rad = 132 + (i % 3) * 11;
    const cx = Math.cos(a) * rad;
    const cz = Math.sin(a) * rad;
    dummy.position.set(cx, 7.5 + (i % 4) * 2.2, cz);
    dummy.rotation.set(0, a + i * 0.4, 0);
    dummy.scale.set(1.1 + (i % 3) * 0.35, 0.9 + (i % 4) * 0.28, 1.0 + (i % 2) * 0.4);
    dummy.updateMatrix();
    cliffInst.setMatrixAt(i, dummy.matrix);
  }
  cliffInst.instanceMatrix.needsUpdate = true;
  cliffInst.computeBoundingSphere();
  scene.add(cliffInst);

  // 2. Animated Rippling Water + Shoreline Rim + Jetty & Boat
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x21968b,
    roughness: 0.12,
    metalness: 0.14,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
    transparent: true,
    opacity: 0.88,
  });
  waterMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniform;
    shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       transformed.y += sin(position.x * 0.45 + uTime * 2.2) * 0.065 + cos(position.z * 0.55 + uTime * 1.8) * 0.055;`,
    );
  };
  materials.push(waterMat);

  const lagoonGeo = new THREE.PlaneGeometry(60, 17, 32, 12);
  lagoonGeo.rotateX(-Math.PI / 2);
  geometries.push(lagoonGeo);
  const lagoonMesh = new THREE.Mesh(lagoonGeo, waterMat);
  lagoonMesh.position.set(45, -0.35, -22);
  scene.add(lagoonMesh);

  const coveGeo = new THREE.CircleGeometry(12.4, 32, 0, Math.PI * 2);
  coveGeo.rotateX(-Math.PI / 2);
  geometries.push(coveGeo);
  const coveMesh = new THREE.Mesh(coveGeo, waterMat);
  coveMesh.position.set(-18, -0.35, 66);
  scene.add(coveMesh);

  // 3. Starting Plaza Medallion & Striped Asphalt Road Network
  const roadMat = new THREE.MeshStandardMaterial({
    map: procTex.asphaltAlbedo,
    bumpMap: procTex.asphaltBump,
    bumpScale: 0.04,
    roughness: 0.84,
    metalness: 0.05,
  });
  const solidRoadMat = new THREE.MeshStandardMaterial({
    color: 0x4b4440,
    bumpMap: procTex.asphaltBump,
    bumpScale: 0.04,
    roughness: 0.84,
    metalness: 0.05,
  });
  const gravelMat = new THREE.MeshStandardMaterial({
    color: 0x9b8266,
    bumpMap: procTex.sandBump,
    bumpScale: 0.12,
    roughness: 0.94,
  });
  const plazaTopMat = new THREE.MeshStandardMaterial({
    map: procTex.plazaMedallion,
    roughness: 0.78,
  });
  const plazaRimMat = new THREE.MeshStandardMaterial({
    color: 0xd9c29f,
    roughness: 0.82,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    map: procTex.woodPlankAlbedo,
    roughness: 0.78,
  });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xcab08d, roughness: 0.88 });
  const roofDarkMat = new THREE.MeshStandardMaterial({ color: 0x2f2926, roughness: 0.72 });
  const creamMat = new THREE.MeshStandardMaterial({ color: 0xfff5e4, roughness: 0.76 });
  const terracottaMat = new THREE.MeshStandardMaterial({ color: 0xec6d2c, roughness: 0.45 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x56b9c7,
    roughness: 0.1,
    metalness: 0.18,
    clearcoat: 0.85,
  });
  materials.push(
    roadMat,
    solidRoadMat,
    gravelMat,
    plazaTopMat,
    plazaRimMat,
    woodMat,
    stoneMat,
    roofDarkMat,
    creamMat,
    terracottaMat,
    glassMat,
  );

  const plazaBaseGeo = new THREE.CylinderGeometry(13.6, 14.2, 0.14, 48);
  const plazaMedallionGeo = new THREE.CircleGeometry(13.1, 48);
  plazaMedallionGeo.rotateX(-Math.PI / 2);
  const innerRingRoadGeo = new THREE.RingGeometry(31.4, 36.6, 72);
  innerRingRoadGeo.rotateX(-Math.PI / 2);
  const innerRingLineGeo = new THREE.RingGeometry(33.9, 34.15, 72);
  innerRingLineGeo.rotateX(-Math.PI / 2);
  const stripeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf7efe2 });
  const stripeAmberMat = new THREE.MeshBasicMaterial({ color: 0xffe4a8 });
  materials.push(stripeWhiteMat, stripeAmberMat);
  geometries.push(plazaBaseGeo, plazaMedallionGeo, innerRingRoadGeo, innerRingLineGeo);

  const plazaMesh = new THREE.Mesh(plazaBaseGeo, plazaRimMat);
  plazaMesh.position.set(0, 0.01, 0);
  plazaMesh.receiveShadow = true;
  const plazaTop = new THREE.Mesh(plazaMedallionGeo, plazaTopMat);
  plazaTop.position.set(0, 0.085, 0);
  plazaTop.receiveShadow = true;

  const innerRingRoad = new THREE.Mesh(innerRingRoadGeo, solidRoadMat);
  innerRingRoad.position.set(0, 0.025, 0);
  innerRingRoad.receiveShadow = true;
  const innerRingLine = new THREE.Mesh(innerRingLineGeo, stripeAmberMat);
  innerRingLine.position.set(0, 0.035, 0);

  const innerCurbOutGeo = new THREE.RingGeometry(36.5, 36.8, 72);
  innerCurbOutGeo.rotateX(-Math.PI / 2);
  const innerCurbInGeo = new THREE.RingGeometry(31.2, 31.5, 72);
  innerCurbInGeo.rotateX(-Math.PI / 2);
  geometries.push(innerCurbOutGeo, innerCurbInGeo);
  const ringCurbOut = new THREE.Mesh(innerCurbOutGeo, stripeWhiteMat);
  ringCurbOut.position.set(0, 0.032, 0);
  const ringCurbIn = new THREE.Mesh(innerCurbInGeo, stripeWhiteMat);
  ringCurbIn.position.set(0, 0.032, 0);

  scene.add(plazaMesh, plazaTop, innerRingRoad, innerRingLine, ringCurbOut, ringCurbIn);

  const unitRoadGeo = new THREE.PlaneGeometry(4.8, 1);
  unitRoadGeo.rotateX(-Math.PI / 2);
  geometries.push(unitRoadGeo);

  const addFlatRoadSegment = (
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    width = 4.8,
    mat: THREE.Material = roadMat,
    yOffset = 0.03,
  ) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);
    const seg = new THREE.Mesh(unitRoadGeo, mat);
    seg.scale.set(width / 4.8, 1, len);
    seg.position.set((x1 + x2) * 0.5, yOffset, (z1 + z2) * 0.5);
    seg.rotation.y = angle;
    seg.receiveShadow = true;
    scene.add(seg);
  };

  // Spokes from Plaza to Inner Ring & All Destinations
  addFlatRoadSegment(0, 0, 0, -37);
  addFlatRoadSegment(0, 0, 0, 44);
  addFlatRoadSegment(0, 0, -34, -32);
  addFlatRoadSegment(-34, -2, -62, 16);
  addFlatRoadSegment(-34, 24, -37, 44);
  addFlatRoadSegment(33, 14, 60, 8);
  addFlatRoadSegment(28, 22, 42, 44);
  addFlatRoadSegment(40, -32, 36, -42);
  addFlatRoadSegment(38, -44, 48, -70);
  addFlatRoadSegment(31, 4, 40, -12);

  // Paddock Oval Racing Circuit around (-66, 18) with Striped Curbs & Checkered Start Grid
  const paddockRingGeo = new THREE.RingGeometry(15.4, 20.6, 56);
  paddockRingGeo.rotateX(-Math.PI / 2);
  const paddockCenterLineGeo = new THREE.RingGeometry(17.9, 18.12, 56);
  paddockCenterLineGeo.rotateX(-Math.PI / 2);
  const paddockStartStripGeo = new THREE.PlaneGeometry(5.1, 2.5);
  paddockStartStripGeo.rotateX(-Math.PI / 2);
  geometries.push(paddockRingGeo, paddockCenterLineGeo, paddockStartStripGeo);

  const paddockRing = new THREE.Mesh(paddockRingGeo, solidRoadMat);
  paddockRing.position.set(-66, 0.024, 18);
  paddockRing.receiveShadow = true;
  const paddockCenterLine = new THREE.Mesh(paddockCenterLineGeo, stripeAmberMat);
  paddockCenterLine.position.set(-66, 0.032, 18);
  const stripMat = new THREE.MeshStandardMaterial({ map: procTex.checkeredStrip, roughness: 0.7 });
  materials.push(stripMat);
  const startStrip = new THREE.Mesh(paddockStartStripGeo, stripMat);
  startStrip.position.set(-66, 0.038, 0);
  scene.add(paddockRing, paddockCenterLine, startStrip);

  // Alternating Red & Cream Apex Curb Blocks on Paddock Hairpin
  const curbBlockGeo = new THREE.BoxGeometry(0.9, 0.16, 1.3);
  geometries.push(curbBlockGeo);
  const curbRedMat = new THREE.MeshStandardMaterial({ color: 0xe65448, roughness: 0.65 });
  materials.push(curbRedMat);
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2;
    const cx = -66 + Math.cos(ang) * 21.0;
    const cz = 18 + Math.sin(ang) * 21.0;
    const cb = new THREE.Mesh(curbBlockGeo, i % 2 === 0 ? curbRedMat : creamMat);
    cb.position.set(cx, 0.08, cz);
    cb.rotation.y = -ang;
    cb.receiveShadow = true;
    scene.add(cb);
  }

  // Lookout Hill Sloped Road Ribbon
  const hillRoadGeo = new THREE.PlaneGeometry(5.6, 26, 4, 22);
  hillRoadGeo.rotateX(-Math.PI / 2);
  const hrPos = hillRoadGeo.attributes.position;
  for (let i = 0; i < hrPos.count; i++) {
    const lx = hrPos.getX(i);
    const lz = hrPos.getZ(i) - 50;
    hrPos.setY(i, computeGroundHeight(lx, lz) + 0.045);
  }
  hillRoadGeo.computeVertexNormals();
  geometries.push(hillRoadGeo);
  const hillRoad = new THREE.Mesh(hillRoadGeo, roadMat);
  hillRoad.position.set(0, 0, -50);
  hillRoad.receiveShadow = true;
  scene.add(hillRoad);

  // Hidden Pine Trail
  const hiddenTrailPoints = [
    { x: -34, z: -38 },
    { x: -28, z: -50 },
    { x: -22, z: -58 },
    { x: -13, z: -66 },
    { x: -6, z: -70 },
  ];
  for (let i = 0; i < hiddenTrailPoints.length - 1; i++) {
    const a = hiddenTrailPoints[i];
    const b = hiddenTrailPoints[i + 1];
    const midY = (computeGroundHeight(a.x, a.z) + computeGroundHeight(b.x, b.z)) * 0.5 + 0.04;
    addFlatRoadSegment(a.x, a.z, b.x, b.z, 3.0, gravelMat, midY);
  }

  // 4. Sculpted Emerald Lagoon Bridge + Waterfront Timber Jetty & Boat + Coastal Lighthouse
  const bridgeGroup = new THREE.Group();
  const deckGeo = new THREE.BoxGeometry(6.8, 0.36, 10.6);
  const rampBridgeGeo = new THREE.BoxGeometry(6.8, 0.26, 5.4);
  const railBeamGeo = new THREE.BoxGeometry(0.28, 0.22, 18.6);
  const railPostGeo = new THREE.CylinderGeometry(0.14, 0.16, 1.15, 8);
  const lampGlobeGeo = new THREE.SphereGeometry(0.24, 10, 8);
  const pierGeo = new THREE.CylinderGeometry(0.46, 0.58, 2.5, 10);
  geometries.push(deckGeo, rampBridgeGeo, railBeamGeo, railPostGeo, lampGlobeGeo, pierGeo);

  const deckMesh = new THREE.Mesh(deckGeo, woodMat);
  deckMesh.position.set(40, 0.78, -22);
  deckMesh.castShadow = true;
  deckMesh.receiveShadow = true;

  const northRamp = new THREE.Mesh(rampBridgeGeo, woodMat);
  northRamp.position.set(40, 0.42, -29.6);
  northRamp.rotation.x = 0.17;
  northRamp.receiveShadow = true;

  const southRamp = new THREE.Mesh(rampBridgeGeo, woodMat);
  southRamp.position.set(40, 0.42, -14.4);
  southRamp.rotation.x = -0.17;
  southRamp.receiveShadow = true;

  for (const rx of [36.7, 43.3]) {
    const topRail = new THREE.Mesh(railBeamGeo, terracottaMat);
    topRail.position.set(rx, 1.48, -22);
    topRail.castShadow = true;
    const midRail = new THREE.Mesh(railBeamGeo, stoneMat);
    midRail.position.set(rx, 1.05, -22);
    bridgeGroup.add(topRail, midRail);
  }

  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xfff3c4,
    emissive: 0xffb74d,
    emissiveIntensity: 1.0,
    roughness: 0.2,
  });
  materials.push(lanternMat);

  for (const pz of [-29, -25.5, -22, -18.5, -15]) {
    for (const px of [36.7, 43.3]) {
      const post = new THREE.Mesh(railPostGeo, stoneMat);
      post.position.set(px, 1.35, pz);
      post.castShadow = true;
      bridgeGroup.add(post);
      if (pz === -29 || pz === -22 || pz === -15) {
        const globe = new THREE.Mesh(lampGlobeGeo, lanternMat);
        globe.position.set(px, 2.02, pz);
        bridgeGroup.add(globe);
      }
    }
  }

  for (const pz of [-26, -22, -18]) {
    for (const px of [37.2, 42.8]) {
      const pier = new THREE.Mesh(pierGeo, stoneMat);
      pier.position.set(px, -0.35, pz);
      bridgeGroup.add(pier);
    }
  }
  bridgeGroup.add(deckMesh, northRamp, southRamp);
  scene.add(bridgeGroup);

  staticColliders.push(
    { x: 36.5, y: 1.1, z: -22, hx: 0.35, hy: 1.0, hz: 9.2 },
    { x: 43.5, y: 1.1, z: -22, hx: 0.35, hy: 1.0, hz: 9.2 },
  );

  // Waterfront Wooden Jetty & Bobbing Boat on East Lagoon (x: 56, z: -15)
  const jettyDeckGeo = new THREE.BoxGeometry(2.6, 0.22, 6.4);
  const jettyPilingGeo = new THREE.CylinderGeometry(0.14, 0.16, 1.9, 8);
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
  geometries.push(jettyDeckGeo, jettyPilingGeo, hullGeo, cabinGeo);

  const jetty = new THREE.Mesh(jettyDeckGeo, woodMat);
  jetty.position.set(56, 0.2, -16.5);
  jetty.castShadow = true;
  jetty.receiveShadow = true;
  scene.add(jetty);
  for (const jz of [-14.2, -16.5, -18.8]) {
    for (const jx of [54.9, 57.1]) {
      const piling = new THREE.Mesh(jettyPilingGeo, roofDarkMat);
      piling.position.set(jx, -0.35, jz);
      scene.add(piling);
    }
  }

  mooredBoat = new THREE.Group();
  const boatHull = new THREE.Mesh(hullGeo, creamMat);
  const boatStripe = new THREE.Mesh(hullGeo, terracottaMat);
  boatStripe.scale.set(1.03, 0.35, 1.02);
  boatStripe.position.y = 0.14;
  const boatCabin = new THREE.Mesh(cabinGeo, woodMat);
  boatCabin.position.set(0, 0.56, -0.25);
  mooredBoat.add(boatHull, boatStripe, boatCabin);
  mooredBoat.position.set(60, -0.18, -20.5);
  mooredBoat.rotation.y = 0.4;
  scene.add(mooredBoat);

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
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  materials.push(lhBeamMat);
  lighthouseBeam = new THREE.Group();
  lighthouseBeam.position.set(0, 8.25, 0);
  lighthouseBeam.add(new THREE.Mesh(lhBeamGeo, lhBeamMat));

  lhGroup.add(lh1, lh2, lh3, lhGal, lhLamp, lhRoof, lighthouseBeam);
  scene.add(lhGroup);
  staticColliders.push({ x: 73, y: lhGy + 3.5, z: -26, hx: 2.0, hy: 4.0, hz: 2.0 });

  // 5. Vaulted Arched West Ridge Tunnel at x = -42, z in [-12, 4]
  const tunnelGroup = new THREE.Group();
  const rockRidgeMat = new THREE.MeshStandardMaterial({ color: 0xb98a5e, roughness: 0.9 });
  const lampGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffe4a0,
    emissive: 0xffb84d,
    emissiveIntensity: 1.25,
  });
  materials.push(rockRidgeMat, lampGlowMat);

  const tunArchGeo = createTunnelArchGeo();
  const tunPortalRimGeo = new THREE.TorusGeometry(4.95, 0.42, 8, 18, Math.PI);
  const tunMoundGeo = new THREE.DodecahedronGeometry(4.6, 1);
  const tunLampGeo = new THREE.SphereGeometry(0.28, 10, 8);
  geometries.push(tunArchGeo, tunPortalRimGeo, tunMoundGeo, tunLampGeo);

  const tunVault = new THREE.Mesh(tunArchGeo, stoneMat);
  tunVault.position.set(-42, 0, -4);
  tunVault.castShadow = true;
  tunVault.receiveShadow = true;
  tunnelGroup.add(tunVault);

  for (const pz of [-11.9, 3.9]) {
    const portalRib = new THREE.Mesh(tunPortalRimGeo, terracottaMat);
    portalRib.position.set(-42, 2.65, pz);
    portalRib.castShadow = true;
    tunnelGroup.add(portalRib);
  }

  for (const [mx, my, mz, sx, sy, sz] of [
    [-48.8, 2.8, -4, 1.25, 1.15, 1.7],
    [-35.2, 2.8, -4, 1.25, 1.15, 1.7],
    [-42, 6.2, -4, 1.45, 0.72, 1.55],
  ]) {
    const mound = new THREE.Mesh(tunMoundGeo, rockRidgeMat);
    mound.position.set(mx, my, mz);
    mound.scale.set(sx, sy, sz);
    mound.castShadow = true;
    mound.receiveShadow = true;
    tunnelGroup.add(mound);
  }

  for (const lz of [-9, -4, 1]) {
    const lamp = new THREE.Mesh(tunLampGeo, lampGlowMat);
    lamp.position.set(-42, 6.6, lz);
    tunnelGroup.add(lamp);
  }
  scene.add(tunnelGroup);

  staticColliders.push(
    { x: -46.8, y: 2.2, z: -4, hx: 1.2, hy: 2.5, hz: 8.2 },
    { x: -37.2, y: 2.2, z: -4, hx: 1.2, hy: 2.5, hz: 8.2 },
  );

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
    { x: -4.8, y: 2.6, z: -12.8, hx: 0.5, hy: 2.6, hz: 0.5 },
    { x: 4.8, y: 2.6, z: -12.8, hx: 0.5, hy: 2.6, hz: 0.5 },
  );

  // 7. Build All 9 Bespoke Architectural Landmarks
  const parkingMat = new THREE.MeshStandardMaterial({ color: 0x453e3a, roughness: 0.88 });
  const diamondGeo = new THREE.OctahedronGeometry(0.55, 0);
  const padGeo = new THREE.RingGeometry(2.9, 3.55, 36);
  padGeo.rotateX(-Math.PI / 2);
  const parkPadGeo = new THREE.PlaneGeometry(9.6, 6.4);
  parkPadGeo.rotateX(-Math.PI / 2);
  geometries.push(diamondGeo, padGeo, parkPadGeo);
  materials.push(parkingMat);

  WORLD_LANDMARKS.forEach((lm, idx) => {
    const baseGroundY = lm.position.y ?? computeGroundHeight(lm.position.x, lm.position.z);
    const dirToOrigin = new THREE.Vector2(-lm.position.x, -lm.position.z).normalize();
    const buildX = lm.position.x - dirToOrigin.x * 5.8;
    const buildZ = lm.position.z - dirToOrigin.y * 5.8;
    const yaw = Math.atan2(dirToOrigin.x, dirToOrigin.y);

    const accentMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(lm.color),
      roughness: 0.38,
      metalness: 0.16,
    });
    materials.push(accentMat);

    // Parking apron + crisp painted border
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

    const indicator = new THREE.Mesh(diamondGeo, padMat);
    indicator.position.set(lm.position.x, baseGroundY + 3.25, lm.position.z);
    scene.add(indicator);
    indicatorDiamonds.push({ mesh: indicator, baseY: baseGroundY + 3.25, phase: idx * 0.9 });

    const grp = new THREE.Group();
    grp.position.set(buildX, baseGroundY, buildZ);
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
      win.position.set(0, 2.15, 2.22);

      const skylight = new THREE.Mesh(skylightGeo, accentMat);
      skylight.position.set(0, 4.85, -0.2);

      grp.add(hall, roof, win, skylight);
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
      const k1Scr = new THREE.Mesh(screenGeo, glassMat);
      k1Scr.position.set(-1.9, 1.55, 2.8);
      k1Scr.rotation.y = 0.25;

      const k2 = new THREE.Mesh(kioskGeo, roofDarkMat);
      k2.position.set(1.9, 1.35, 2.6);
      k2.rotation.y = -0.25;
      const k2Scr = new THREE.Mesh(screenGeo, accentMat);
      k2Scr.position.set(1.9, 1.55, 2.8);
      k2Scr.rotation.y = -0.25;

      grp.add(hall, canopy, k1, k1Scr, k2, k2Scr);
    } else if (lm.id === 'workshop') {
      // Chamfered Hexagonal Tech Lab + External Rib Buttresses + 3 Kinetic Overhead Sculptures
      const hexGeo = new THREE.CylinderGeometry(3.45, 3.75, 3.7, 6);
      const domeGeo = new THREE.SphereGeometry(2.5, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
      const ribGeo = new THREE.BoxGeometry(0.32, 3.9, 0.58);
      const ringCapGeo = new THREE.TorusGeometry(2.55, 0.16, 8, 24);
      ringCapGeo.rotateX(Math.PI / 2);
      const sym1Geo = new THREE.TorusKnotGeometry(0.44, 0.14, 40, 8);
      const sym2Geo = new THREE.OctahedronGeometry(0.58, 0);
      const sym3Geo = new THREE.DodecahedronGeometry(0.52, 0);
      geometries.push(hexGeo, domeGeo, ribGeo, ringCapGeo, sym1Geo, sym2Geo, sym3Geo);

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

      const s1 = new THREE.Mesh(sym1Geo, accentMat);
      s1.position.set(-2.4, 5.8, 0);
      const s2 = new THREE.Mesh(sym2Geo, glassMat);
      s2.position.set(0, 6.8, 0);
      const s3 = new THREE.Mesh(sym3Geo, accentMat);
      s3.position.set(2.4, 5.8, 0);
      techSymbols.push(s1, s2, s3);
      grp.add(hex, dome, ringCap, s1, s2, s3);
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

      // Decorative stacked racing tires outside pit wall
      for (let t = 0; t < 3; t++) {
        const tire = new THREE.Mesh(tireStackGeo, t % 2 === 0 ? roofDarkMat : creamMat);
        tire.position.set(-4.3, 0.62 + t * 0.32, 2.4);
        tire.castShadow = true;
        grp.add(tire);
      }
      grp.add(bay, roof, gpL, gpR, banner);
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
      vanGroup.add(vanBody);
      grp.add(wh, sawRoof, door, p1, p2, vanGroup);
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

      grp.add(booth, cap, ped, securityGateArm);
    }

    scene.add(grp);

    staticColliders.push({
      x: buildX,
      y: baseGroundY + 2.2,
      z: buildZ,
      hx: 3.6,
      hy: 2.5,
      hz: 2.9,
    });

    // Floating Destination Name Signboard
    const signGroup = new THREE.Group();
    const sTex = createSignTexture(lm.title, lm.subtitle, lm.color);
    sTex.anisotropy = maxAnisotropy;
    textures.push(sTex);
    const sGeo = new THREE.PlaneGeometry(6.2, 2.3);
    geometries.push(sGeo);
    const sMat = new THREE.MeshBasicMaterial({
      map: sTex,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    materials.push(sMat);
    const sMesh = new THREE.Mesh(sGeo, sMat);
    signGroup.add(sMesh);
    const signBaseY = baseGroundY + 7.25;
    signGroup.position.set(buildX, signBaseY, buildZ);
    signGroup.lookAt(0, signBaseY, 0);
    scene.add(signGroup);
    floatingSigns.push({ group: signGroup, baseY: signBaseY, phase: idx * 0.85 });
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

  // 8. Directional Road Signs & SQL Valley Signs
  const signDefs = [
    { x: -12, z: -14, label: 'THE STUDIO', arrow: '↖', rotY: -0.6 },
    { x: 14, z: -14, label: 'BRIDGE / SQL', arrow: '↗', rotY: 0.6 },
    { x: 0, z: -36, label: 'LOOKOUT HILL', arrow: '↑', rotY: 0 },
    { x: 42, z: -60, label: 'SELECT * FROM', arrow: 'VALLEY', rotY: -0.3 },
    { x: 53, z: -66, label: 'JOIN SKILLS', arrow: 'ON ID', rotY: 0.4 },
    { x: -45, z: 8, label: 'THE PADDOCK', arrow: '↙', rotY: -0.9 },
  ];
  const rPostGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.2, 8);
  const rBoardGeo = new THREE.BoxGeometry(2.6, 1.2, 0.14);
  geometries.push(rPostGeo, rBoardGeo);

  for (const sd of signDefs) {
    const gy = computeGroundHeight(sd.x, sd.z);
    const rTex = createRoadSignTexture(sd.label, sd.arrow);
    textures.push(rTex);
    const rMat = new THREE.MeshBasicMaterial({ map: rTex, toneMapped: false });
    materials.push(rMat);
    const post = new THREE.Mesh(rPostGeo, roofDarkMat);
    post.position.set(sd.x, gy + 1.1, sd.z);
    const board = new THREE.Mesh(rBoardGeo, rMat);
    board.position.set(sd.x, gy + 2.3, sd.z);
    board.rotation.y = sd.rotY;
    scene.add(post, board);
  }

  // 9. Street Lights along Ring Road & Plaza
  const lampPoleGeo = new THREE.CylinderGeometry(0.09, 0.14, 4.3, 8);
  const lampArmGeo = new THREE.BoxGeometry(0.8, 0.1, 0.1);
  const lampHeadGeo = new THREE.SphereGeometry(0.3, 10, 8);
  geometries.push(lampPoleGeo, lampArmGeo, lampHeadGeo);

  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.18;
    const lx = Math.cos(a) * 38;
    const lz = Math.sin(a) * 38;
    if (isNearRoadOrBuilding(lx, lz)) continue;
    const gy = computeGroundHeight(lx, lz);
    const pole = new THREE.Mesh(lampPoleGeo, roofDarkMat);
    pole.position.set(lx, gy + 2.15, lz);
    pole.castShadow = true;
    const arm = new THREE.Mesh(lampArmGeo, roofDarkMat);
    arm.position.set(lx - Math.cos(a) * 0.35, gy + 4.25, lz - Math.sin(a) * 0.35);
    arm.rotation.y = -a;
    const bulb = new THREE.Mesh(lampHeadGeo, lanternMat);
    bulb.position.set(lx - Math.cos(a) * 0.65, gy + 4.18, lz - Math.sin(a) * 0.65);
    scene.add(pole, arm, bulb);
  }

  // 10. Instanced Wind-Driven Low-Poly Pines + Coastal Broadleaf Trees
  const treeCoords: { x: number; z: number }[] = [];
  const palmCoords: { x: number; z: number }[] = [];
  for (let i = 0; i < 195; i++) {
    const angle = i * 2.39996;
    const radius = 21 + Math.sqrt(i / 195) * 89;
    const tx = Math.cos(angle) * radius;
    const tz = Math.sin(angle) * radius;
    if (!isNearRoadOrBuilding(tx, tz)) {
      if (i % 4 === 0) palmCoords.push({ x: tx, z: tz });
      else treeCoords.push({ x: tx, z: tz });
    }
  }

  const trunkGeo = new THREE.CylinderGeometry(0.28, 0.42, 2.2, 7);
  trunkGeo.translate(0, 1.1, 0);
  const foliageGeo = new THREE.ConeGeometry(1.9, 3.6, 7);
  foliageGeo.translate(0, 3.45, 0);
  const foliageTopGeo = new THREE.ConeGeometry(1.38, 2.65, 7);
  foliageTopGeo.translate(0, 5.15, 0);
  geometries.push(trunkGeo, foliageGeo, foliageTopGeo);

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x764c31, roughness: 0.9 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
  foliageMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniform;
    shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       float sway = max(0.0, position.y - 1.8) * 0.045;
       transformed.x += sin(uTime * 1.9 + position.y) * sway;`,
    );
  };
  materials.push(trunkMat, foliageMat);

  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCoords.length);
  const foliageInst = new THREE.InstancedMesh(foliageGeo, foliageMat, treeCoords.length);
  const foliageTopInst = new THREE.InstancedMesh(foliageTopGeo, foliageMat, treeCoords.length);
  trunkInst.castShadow = true;
  foliageInst.castShadow = true;
  foliageTopInst.castShadow = true;

  const paletteGreens = ['#548A53', '#497C4E', '#67995B', '#3E7049'];
  treeCoords.forEach((tc, i) => {
    const gy = computeGroundHeight(tc.x, tc.z);
    const scale = 0.85 + ((i * 37) % 30) / 100;
    dummy.position.set(tc.x, gy, tc.z);
    dummy.rotation.set(0, i * 0.7, 0);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);
    foliageInst.setMatrixAt(i, dummy.matrix);
    foliageTopInst.setMatrixAt(i, dummy.matrix);

    cColor.set(paletteGreens[i % paletteGreens.length]);
    foliageInst.setColorAt(i, cColor);
    cColor.offsetHSL(0, 0, 0.05);
    foliageTopInst.setColorAt(i, cColor);

    if (Math.hypot(tc.x, tc.z) < 88) {
      staticColliders.push({ x: tc.x, y: gy + 1.2, z: tc.z, hx: 0.55, hy: 1.5, hz: 0.55 });
    }
  });
  trunkInst.instanceMatrix.needsUpdate = true;
  foliageInst.instanceMatrix.needsUpdate = true;
  foliageTopInst.instanceMatrix.needsUpdate = true;
  if (foliageInst.instanceColor) foliageInst.instanceColor.needsUpdate = true;
  if (foliageTopInst.instanceColor) foliageTopInst.instanceColor.needsUpdate = true;
  trunkInst.computeBoundingSphere();
  foliageInst.computeBoundingSphere();
  foliageTopInst.computeBoundingSphere();
  scene.add(trunkInst, foliageInst, foliageTopInst);

  // Broadleaf / Tropical Crown Trees
  const broadTrunkGeo = new THREE.CylinderGeometry(0.24, 0.36, 3.1, 7);
  broadTrunkGeo.translate(0, 1.55, 0);
  const broadCrownGeo = new THREE.IcosahedronGeometry(1.75, 0);
  broadCrownGeo.translate(0, 4.1, 0);
  geometries.push(broadTrunkGeo, broadCrownGeo);

  const broadTrunkInst = new THREE.InstancedMesh(broadTrunkGeo, trunkMat, palmCoords.length);
  const broadCrownInst = new THREE.InstancedMesh(broadCrownGeo, foliageMat, palmCoords.length);
  broadTrunkInst.castShadow = true;
  broadCrownInst.castShadow = true;

  const broadPalette = ['#689E54', '#79AE5A', '#4C8B5C', '#8AB45E'];
  palmCoords.forEach((pc, i) => {
    const gy = computeGroundHeight(pc.x, pc.z);
    const scale = 0.88 + ((i * 23) % 28) / 100;
    dummy.position.set(pc.x, gy, pc.z);
    dummy.rotation.set(0, i * 1.3, 0);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    broadTrunkInst.setMatrixAt(i, dummy.matrix);
    broadCrownInst.setMatrixAt(i, dummy.matrix);
    cColor.set(broadPalette[i % broadPalette.length]);
    broadCrownInst.setColorAt(i, cColor);

    if (Math.hypot(pc.x, pc.z) < 88) {
      staticColliders.push({ x: pc.x, y: gy + 1.2, z: pc.z, hx: 0.55, hy: 1.5, hz: 0.55 });
    }
  });
  broadTrunkInst.instanceMatrix.needsUpdate = true;
  broadCrownInst.instanceMatrix.needsUpdate = true;
  if (broadCrownInst.instanceColor) broadCrownInst.instanceColor.needsUpdate = true;
  broadTrunkInst.computeBoundingSphere();
  broadCrownInst.computeBoundingSphere();
  scene.add(broadTrunkInst, broadCrownInst);

  // 11. Instanced Moving Grass Tufts & Wildflowers
  const grassGeo = new THREE.ConeGeometry(0.18, 0.65, 4);
  grassGeo.translate(0, 0.32, 0);
  const flowerGeo = new THREE.DodecahedronGeometry(0.22, 0);
  flowerGeo.translate(0, 0.5, 0);
  geometries.push(grassGeo, flowerGeo);

  const grassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
  grassMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniform;
    shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       transformed.x += sin(uTime * 2.8) * max(0.0, position.y) * 0.18;`,
    );
  };
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  materials.push(grassMat, flowerMat);

  const grassCoords: { x: number; z: number }[] = [];
  for (let i = 0; i < 250; i++) {
    const a = i * 2.39996 + 0.5;
    const rad = 16 + Math.sqrt(i / 250) * 78;
    const gx = Math.cos(a) * rad;
    const gz = Math.sin(a) * rad;
    if (!isNearRoadOrBuilding(gx, gz)) grassCoords.push({ x: gx, z: gz });
  }
  const grassInst = new THREE.InstancedMesh(grassGeo, grassMat, grassCoords.length);
  const flowerCount = Math.floor(grassCoords.length / 3);
  const flowerInst = new THREE.InstancedMesh(flowerGeo, flowerMat, flowerCount);
  const flowerColors = ['#EC6D2C', '#E65448', '#FFE082', '#FFF9F0'];

  grassCoords.forEach((gc, i) => {
    const gy = computeGroundHeight(gc.x, gc.z);
    dummy.position.set(gc.x, gy, gc.z);
    dummy.rotation.set(0, i * 1.1, 0);
    dummy.scale.setScalar(0.8 + (i % 4) * 0.18);
    dummy.updateMatrix();
    grassInst.setMatrixAt(i, dummy.matrix);
    cColor.set(i % 2 === 0 ? '#74A362' : '#5F8F56');
    grassInst.setColorAt(i, cColor);

    if (i < flowerCount) {
      dummy.position.set(gc.x + 0.35, gy, gc.z - 0.25);
      dummy.scale.setScalar(0.85);
      dummy.updateMatrix();
      flowerInst.setMatrixAt(i, dummy.matrix);
      cColor.set(flowerColors[i % flowerColors.length]);
      flowerInst.setColorAt(i, cColor);
    }
  });
  grassInst.instanceMatrix.needsUpdate = true;
  if (grassInst.instanceColor) grassInst.instanceColor.needsUpdate = true;
  flowerInst.instanceMatrix.needsUpdate = true;
  if (flowerInst.instanceColor) flowerInst.instanceColor.needsUpdate = true;
  grassInst.computeBoundingSphere();
  flowerInst.computeBoundingSphere();
  scene.add(grassInst, flowerInst);

  // 12. Instanced Sandstone Boulders & Shoreline Rocks
  const rockGeo = new THREE.DodecahedronGeometry(1.25, 0);
  geometries.push(rockGeo);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  materials.push(rockMat);
  const rockCoords: { x: number; z: number }[] = [];
  for (let i = 0; i < 68; i++) {
    const a = (i / 68) * Math.PI * 2 + 0.14;
    const rad = 52 + (i % 5) * 9.5;
    const rx = Math.cos(a) * rad;
    const rz = Math.sin(a) * rad;
    if (!isNearRoadOrBuilding(rx, rz)) rockCoords.push({ x: rx, z: rz });
  }
  const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rockCoords.length);
  rockInst.castShadow = true;
  rockInst.receiveShadow = true;
  rockCoords.forEach((rc, i) => {
    const gy = computeGroundHeight(rc.x, rc.z);
    const sx = 0.8 + ((i * 19) % 10) * 0.12;
    const sy = 0.65 + ((i * 13) % 8) * 0.11;
    dummy.position.set(rc.x, gy + sy * 0.45, rc.z);
    dummy.rotation.set(i * 0.3, i * 1.1, i * 0.2);
    dummy.scale.set(sx, sy, sx * 0.9);
    dummy.updateMatrix();
    rockInst.setMatrixAt(i, dummy.matrix);
    cColor.set(i % 2 === 0 ? '#D4B08C' : '#BE956E');
    rockInst.setColorAt(i, cColor);
  });
  rockInst.instanceMatrix.needsUpdate = true;
  if (rockInst.instanceColor) rockInst.instanceColor.needsUpdate = true;
  rockInst.computeBoundingSphere();
  scene.add(rockInst);

  // 13. Moving Low-Poly Clouds + Soaring Seabirds
  const cloudGroup = new THREE.Group();
  const cloudGeo = new THREE.DodecahedronGeometry(3.4, 1);
  geometries.push(cloudGeo);
  const cloudMat = new THREE.MeshBasicMaterial({
    color: 0xfffaf2,
    transparent: true,
    opacity: 0.88,
  });
  materials.push(cloudMat);
  const clouds: { grp: THREE.Group; speed: number; baseZ: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const cg = new THREE.Group();
    for (let p = 0; p < 3; p++) {
      const puff = new THREE.Mesh(cloudGeo, cloudMat);
      puff.position.set((p - 1) * 3.1, p === 1 ? 0.9 : 0, (p % 2) * 0.8);
      puff.scale.set(p === 1 ? 1.2 : 0.85, 0.68, 0.9);
      cg.add(puff);
    }
    const cx = -110 + (i / 12) * 220;
    const cz = -90 + ((i * 43) % 180);
    cg.position.set(cx, 32 + (i % 3) * 5, cz);
    cloudGroup.add(cg);
    clouds.push({ grp: cg, speed: 1.4 + (i % 4) * 0.45, baseZ: cz });
  }
  scene.add(cloudGroup);

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

  // 14. Collectibles (Orbs, Tokens, Fragments, Secret Relics)
  const orbCoreGeo = new THREE.SphereGeometry(0.55, 14, 12);
  const orbRingGeo = new THREE.TorusGeometry(0.88, 0.08, 8, 22);
  const tokenGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.18, 16);
  tokenGeo.rotateX(Math.PI / 2);
  const fragGeo = new THREE.OctahedronGeometry(0.66, 0);
  fragGeo.scale(0.8, 1.35, 0.8);
  const secretRelicGeo = new THREE.TorusKnotGeometry(0.45, 0.14, 36, 8);
  geometries.push(orbCoreGeo, orbRingGeo, tokenGeo, fragGeo, secretRelicGeo);

  const orbMat = new THREE.MeshStandardMaterial({
    color: 0x21968b,
    emissive: 0x21968b,
    emissiveIntensity: 0.72,
    roughness: 0.2,
    metalness: 0.55,
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
  materials.push(orbMat, tokenMat, fragMat, secretRelicMat);

  for (const colDef of WORLD_COLLECTIBLES) {
    const bridgeY = computeBridgeSurfaceY(colDef.x, colDef.z);
    const baseY = bridgeY ?? computeGroundHeight(colDef.x, colDef.z);
    const cg = new THREE.Group();

    if (colDef.kind === 'orb') {
      cg.add(new THREE.Mesh(orbCoreGeo, orbMat), new THREE.Mesh(orbRingGeo, tokenMat));
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

  // 15. Dynamic Physics Crates & Traffic Cones
  const crateGeo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
  const coneGeo = new THREE.ConeGeometry(0.42, 1.05, 8);
  geometries.push(crateGeo, coneGeo);
  const crateMat = new THREE.MeshStandardMaterial({ map: procTex.woodPlankAlbedo, roughness: 0.78 });
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xe65448, roughness: 0.52 });
  materials.push(crateMat, coneMat);

  const cratePositions = [
    { x: -11, y: 0.55, z: -7 },
    { x: -12.2, y: 0.55, z: -7 },
    { x: -11.6, y: 1.7, z: -7 },
    { x: 11, y: 0.55, z: -6 },
    { x: 12.2, y: 0.55, z: -6 },
    { x: 11.6, y: 1.7, z: -6 },
    { x: -34, y: 0.55, z: 43 },
    { x: -35.2, y: 0.55, z: 43 },
  ];
  for (const cp of cratePositions) {
    const m = new THREE.Mesh(crateGeo, crateMat);
    m.position.set(cp.x, cp.y, cp.z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    dynamicProps.push({
      mesh: m,
      x: cp.x,
      y: cp.y,
      z: cp.z,
      hx: 0.55,
      hy: 0.55,
      hz: 0.55,
      mass: 2.2,
    });
  }

  const conePositions = [
    { x: 6, y: 0.52, z: -13 },
    { x: -6, y: 0.52, z: -13 },
    { x: 8, y: 0.52, z: 12 },
    { x: -8, y: 0.52, z: 12 },
    { x: -58, y: 0.52, z: 18 },
    { x: -74, y: 0.52, z: 18 },
  ];
  for (const cp of conePositions) {
    const m = new THREE.Mesh(coneGeo, coneMat);
    m.position.set(cp.x, cp.y, cp.z);
    m.castShadow = true;
    scene.add(m);
    dynamicProps.push({
      mesh: m,
      x: cp.x,
      y: cp.y,
      z: cp.z,
      hx: 0.4,
      hy: 0.52,
      hz: 0.4,
      mass: 0.8,
    });
  }

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

  const skyMeshMat = sky.mat as THREE.MeshBasicMaterial;

  const applyWeatherMode = (mode: WeatherMode) => {
    currentWeather = mode;
    rainActive = mode === 'rain';
    rainInst.visible = rainActive;
    starDome.visible = mode === 'night';

    if (mode === 'sunset') {
      scene.background = new THREE.Color('#E89A6C');
      fog.color.set('#E89A6C');
      fog.density = 0.0058;
      skyMeshMat.color.set('#F2B28A');
      hemi.color.set('#FFD0A8');
      hemi.groundColor.set('#7C5238');
      hemi.intensity = 0.55;
      sun.color.set('#FF9A52');
      sun.intensity = 1.22;
      sun.position.set(-65, 28, -50);
      coolFill.intensity = 0.28;
      waterMat.color.set('#268380');
    } else if (mode === 'night') {
      scene.background = new THREE.Color('#18223C');
      fog.color.set('#18223C');
      fog.density = 0.0058;
      skyMeshMat.color.set('#223052');
      hemi.color.set('#5C78B4');
      hemi.groundColor.set('#222736');
      hemi.intensity = 0.38;
      sun.color.set('#9DB8FF');
      sun.intensity = 0.52;
      sun.position.set(-40, 64, 30);
      coolFill.intensity = 0.22;
      waterMat.color.set('#1E6776');
    } else if (mode === 'rain') {
      scene.background = new THREE.Color('#7C91A1');
      fog.color.set('#7C91A1');
      fog.density = 0.009;
      skyMeshMat.color.set('#8DA2B2');
      hemi.color.set('#C5D5E2');
      hemi.groundColor.set('#5A666E');
      hemi.intensity = 0.54;
      sun.color.set('#D2E2EE');
      sun.intensity = 0.76;
      sun.position.set(35, 60, 25);
      coolFill.intensity = 0.25;
      waterMat.color.set('#217B78');
    } else if (mode === 'fog') {
      scene.background = new THREE.Color('#DFD5C2');
      fog.color.set('#DFD5C2');
      fog.density = 0.017;
      skyMeshMat.color.set('#EDE4D4');
      hemi.color.set('#FFF4E0');
      hemi.groundColor.set('#9A856D');
      hemi.intensity = 0.64;
      sun.color.set('#FFE8C4');
      sun.intensity = 0.88;
      sun.position.set(45, 58, 30);
      coolFill.intensity = 0.25;
      waterMat.color.set('#21968B');
    } else {
      scene.background = new THREE.Color('#F6DAB4');
      fog.color.set('#F6DAB4');
      fog.density = 0.0044;
      skyMeshMat.color.set('#FFFFFF');
      hemi.color.set('#FFF3DC');
      hemi.groundColor.set('#9C734B');
      hemi.intensity = 0.68;
      sun.color.set('#FFE4B8');
      sun.intensity = 1.45;
      sun.position.set(58, 76, 44);
      coolFill.intensity = 0.34;
      waterMat.color.set('#21968B');
    }
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

  let lowQualityProfile = false;
  let reducedMotionProfile = false;

  const setPerformanceProfile = (quality: QualityLevel, reducedMotion: boolean) => {
    lowQualityProfile = quality === 'low';
    reducedMotionProfile = reducedMotion;
    motes.visible = !lowQualityProfile && !reducedMotionProfile;
    flowerInst.visible = !lowQualityProfile;
  };

  const updateEnvironment = (elapsed: number, dt: number) => {
    const motionTime = reducedMotionProfile ? 0 : elapsed;
    windUniform.value = motionTime;

    for (const fs of floatingSigns) {
      fs.group.position.y = fs.baseY + Math.sin(motionTime * 1.8 + fs.phase) * 0.22;
    }

    for (const ind of indicatorDiamonds) {
      ind.mesh.position.y = ind.baseY + Math.sin(motionTime * 2.6 + ind.phase) * 0.32;
      ind.mesh.rotation.y = motionTime * 1.7 + ind.phase;
    }

    techSymbols.forEach((sym, i) => {
      sym.rotation.y = motionTime * (1.1 + i * 0.25);
      sym.rotation.x = Math.sin(motionTime + i) * 0.4;
      sym.position.y = (i === 1 ? 6.8 : 5.8) + Math.sin(motionTime * 2.1 + i * 1.3) * 0.28;
    });

    if (radarDish) {
      radarDish.rotation.y = motionTime * 0.85;
    }

    if (lighthouseBeam) {
      lighthouseBeam.rotation.y = motionTime * 0.65;
    }

    if (mooredBoat) {
      mooredBoat.position.y = -0.18 + Math.sin(motionTime * 1.8) * 0.07;
      mooredBoat.rotation.z = Math.sin(motionTime * 1.5) * 0.05;
      mooredBoat.rotation.x = Math.cos(motionTime * 1.2) * 0.03;
    }

    for (const bird of soaringBirds) {
      const ang = motionTime * bird.speed + bird.phase;
      bird.grp.position.set(
        bird.cx + Math.cos(ang) * bird.radius,
        bird.alt + Math.sin(motionTime * 1.6 + bird.phase) * 0.8,
        bird.cz + Math.sin(ang) * bird.radius,
      );
      bird.grp.rotation.y = -ang + Math.PI / 2;
    }

    const lanternBase = currentWeather === 'night' ? 1.85 : currentWeather === 'sunset' ? 1.35 : 0.85;
    lanternMat.emissiveIntensity = lanternBase + Math.sin(motionTime * 2.2) * 0.22;

    if (securityGateArm) {
      const targetAngle = securityGateOpen ? Math.PI / 2.2 : 0;
      securityGateArm.rotation.z = THREE.MathUtils.damp(
        securityGateArm.rotation.z,
        targetAngle,
        5,
        dt,
      );
    }

    if (!reducedMotionProfile) {
      for (const c of clouds) {
        c.grp.position.x += c.speed * dt;
        if (c.grp.position.x > 125) c.grp.position.x = -125;
      }
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
        bm.mesh.rotation.x = elapsed * 3.2;
        bm.mesh.rotation.y = elapsed * 4.1;
        bm.mesh.position.y = bm.baseY + Math.sin(elapsed * 4.5 + bm.baseY) * 0.25;
      }
    }

    for (const tg of treasureGroups) {
      if (tg.group.visible) {
        tg.group.rotation.y = elapsed * 1.3;
        tg.group.position.y = tg.baseY + Math.sin(elapsed * 2.2) * 0.14;
      }
    }

    for (const ring of ttRings) {
      if (ring.visible) {
        ring.rotation.y = elapsed * 1.8;
      }
    }

    for (const sr of sqlGateRings) {
      sr.rotation.z = elapsed * 0.9;
    }

    if (deliveryBeacon && deliveryBeacon.visible) {
      deliveryBeacon.rotation.y = elapsed * 1.4;
    }

    if (rainActive) {
      for (let i = 0; i < rainCount; i++) {
        const drop = rainDrops[i];
        drop.y -= drop.speed * dt;
        drop.x -= 2.4 * dt;
        if (drop.y < -1) {
          drop.y = 32 + Math.random() * 6;
          drop.x = (Math.random() - 0.5) * 140;
          drop.z = (Math.random() - 0.5) * 140;
        }
        rainDummy.position.set(drop.x, drop.y, drop.z);
        rainDummy.rotation.set(0, 0, -0.09);
        rainDummy.updateMatrix();
        rainInst.setMatrixAt(i, rainDummy.matrix);
      }
      rainInst.instanceMatrix.needsUpdate = true;
    }

    motes.position.y = Math.sin(elapsed * 0.5) * 0.45;
  };

  const dispose = () => {
    procTex.dispose();
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  };

  return {
    staticColliders,
    dynamicProps,
    collectibles,
    applyWeatherMode,
    setSecurityGateOpen,
    setRfidCardCollected,
    setDeliveryTarget,
    setSqlProgress,
    setPaddockCheckpoint,
    setTimeTrialProgress,
    setBugHuntState,
    setMemoryPadHighlight,
    setTreasureState,
    setPerformanceProfile,
    updateEnvironment,
    dispose,
  };
}
