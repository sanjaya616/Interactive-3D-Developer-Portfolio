import * as THREE from 'three';
import type { WeatherMode } from '../types/portfolio';
import {
  MAIN_LAGOON_BRIDGE,
  RING_LAGOON_VIADUCT,
  SOUTH_COVE_BRIDGE,
  computeBridgeSurfaceY,
  computeGroundHeight,
} from './physicsMath';
import type { ProceduralTextureSet } from './proceduralTextures';
import type { StaticBoxColliderDef } from './worldEnvironment';

export interface BridgesAndRoadsBuild {
  updateLighting: (weather: WeatherMode, motionTime: number, nightGlowOverride?: number) => void;
  setWetness: (wetness: number) => void;
}

function createDirectionalBoardTexture(label: string, arrow = '→'): THREE.CanvasTexture {
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
  ctx.strokeStyle = '#FFF3DC';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#FFF9F0';
  ctx.font = 'bold 24px Nunito, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${label} ${arrow}`, 128, 64, 218);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds a terrain-conforming horizontal ribbon mesh between two XZ points with proportional UV tiling
 * so striped asphalt and gravel paths follow slopes smoothly with zero buried or floating ends.
 */
function buildTerrainRibbonGeometry(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  width: number,
  yOffset: number,
  uvTileMeters = 7.5,
): THREE.BufferGeometry {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.hypot(dx, dz) || 1;
  const steps = Math.max(4, Math.ceil(len / 2.2));
  const nx = -dz / len;
  const nz = dx / len;
  const hw = width * 0.5;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = x1 + dx * t;
    const cz = z1 + dz * t;
    const lx = cx + nx * hw;
    const lz = cz + nz * hw;
    const rx = cx - nx * hw;
    const rz = cz - nz * hw;

    const ly = computeGroundHeight(lx, lz) + yOffset;
    const ry = computeGroundHeight(rx, rz) + yOffset;
    const vCoord = (t * len) / uvTileMeters;

    positions.push(lx, ly, lz, rx, ry, rz);
    uvs.push(0, vCoord, 1, vCoord);

    if (i < steps) {
      const base = i * 2;
      indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds raised beveled curb ribbons flanking the left and right edges of a road segment.
 */
function buildRoadEdgeCurbGeometry(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  roadWidth: number,
  curbWidth = 0.28,
  curbHeight = 0.1,
): THREE.BufferGeometry {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.hypot(dx, dz) || 1;
  const steps = Math.max(3, Math.ceil(len / 2.6));
  const nx = -dz / len;
  const nz = dx / len;
  const innerOff = roadWidth * 0.5 - 0.02;
  const outerOff = innerOff + curbWidth;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const appendStrip = (sideSign: 1 | -1) => {
    const vStart = positions.length / 3;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const cx = x1 + dx * t;
      const cz = z1 + dz * t;
      const ix = cx + nx * sideSign * innerOff;
      const iz = cz + nz * sideSign * innerOff;
      const ox = cx + nx * sideSign * outerOff;
      const oz = cz + nz * sideSign * outerOff;

      const gyI = computeGroundHeight(ix, iz);
      const gyO = computeGroundHeight(ox, oz);
      const topY = Math.max(gyI, gyO) + curbHeight;
      const botY = Math.min(gyI, gyO) - 0.06;
      const vCoord = (t * len) / 3.0;

      // 4 vertices per cross-section: outer-bot, outer-top, inner-top, inner-bot
      positions.push(
        ox, botY, oz,
        ox, topY, oz,
        ix, topY, iz,
        ix, botY + 0.02, iz,
      );
      uvs.push(0, vCoord, 0.35, vCoord, 0.7, vCoord, 1, vCoord);

      if (i < steps) {
        const a = vStart + i * 4;
        const b = a + 4;
        // Top cap + outer face + inner face
        if (sideSign > 0) {
          indices.push(a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
          indices.push(a + 0, b + 0, a + 1, a + 1, b + 0, b + 1);
          indices.push(a + 2, b + 2, a + 3, a + 3, b + 2, b + 3);
        } else {
          indices.push(a + 2, b + 2, a + 1, a + 1, b + 2, b + 1);
          indices.push(a + 1, b + 1, a + 0, a + 0, b + 1, b + 0);
          indices.push(a + 3, b + 3, a + 2, a + 2, b + 3, b + 2);
        }
      }
    }
  };

  appendStrip(1);
  appendStrip(-1);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Helper for creating a multi-part warm architectural lantern atop a post or bracket.
 */
function createArchitecturalLantern(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  geometries: THREE.BufferGeometry[],
  shared: {
    baseGeo: THREE.BufferGeometry;
    globeGeo: THREE.BufferGeometry;
    capGeo: THREE.BufferGeometry;
    ribGeo: THREE.BufferGeometry;
  },
  ironMat: THREE.Material,
  lanternMat: THREE.Material,
  scale = 1.0,
): void {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.scale.setScalar(scale);

  const collar = new THREE.Mesh(shared.baseGeo, ironMat);
  collar.position.y = 0.08;
  const globe = new THREE.Mesh(shared.globeGeo, lanternMat);
  globe.position.y = 0.32;
  const cap = new THREE.Mesh(shared.capGeo, ironMat);
  cap.position.y = 0.58;

  for (let r = 0; r < 4; r++) {
    const a = (r * Math.PI) / 2 + Math.PI / 4;
    const rib = new THREE.Mesh(shared.ribGeo, ironMat);
    rib.position.set(Math.cos(a) * 0.17, 0.32, Math.sin(a) * 0.17);
    grp.add(rib);
  }

  grp.add(collar, globe, cap);
  parent.add(grp);
  void geometries;
}

export function buildBridgesAndRoadNetwork(
  scene: THREE.Scene,
  procTex: ProceduralTextureSet,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  textures: THREE.Texture[],
  staticColliders: StaticBoxColliderDef[],
  sharedMats: {
    lanternMat: THREE.MeshStandardMaterial;
    roofDarkMat: THREE.MeshStandardMaterial;
    creamMat: THREE.MeshStandardMaterial;
    terracottaMat: THREE.MeshStandardMaterial;
  },
  isNearRoadOrBuilding: (x: number, z: number) => boolean,
): BridgesAndRoadsBuild {
  const { lanternMat, roofDarkMat, creamMat, terracottaMat } = sharedMats;

  // Upgraded weathered timber, dressed sandstone masonry & road materials
  const roadMat = new THREE.MeshStandardMaterial({
    map: procTex.asphaltAlbedo,
    bumpMap: procTex.asphaltBump,
    bumpScale: 0.045,
    roughness: 0.85,
    metalness: 0.04,
  });
  const solidRoadMat = new THREE.MeshStandardMaterial({
    color: 0x4b4440,
    bumpMap: procTex.asphaltBump,
    bumpScale: 0.045,
    roughness: 0.85,
    metalness: 0.04,
  });
  const gravelMat = new THREE.MeshStandardMaterial({
    color: 0xa2886a,
    bumpMap: procTex.sandBump,
    bumpScale: 0.12,
    roughness: 0.94,
    metalness: 0.01,
  });
  const plazaTopMat = new THREE.MeshStandardMaterial({
    map: procTex.plazaMedallion,
    bumpMap: procTex.stoneMasonryBump,
    bumpScale: 0.05,
    roughness: 0.78,
  });
  const masonryMat = new THREE.MeshStandardMaterial({
    map: procTex.stoneMasonryAlbedo,
    bumpMap: procTex.stoneMasonryBump,
    bumpScale: 0.11,
    roughness: 0.89,
    metalness: 0.02,
  });
  const curbStoneMat = new THREE.MeshStandardMaterial({
    color: 0xe3cfad,
    bumpMap: procTex.stoneMasonryBump,
    bumpScale: 0.06,
    roughness: 0.84,
    metalness: 0.02,
  });
  const timberLightMat = new THREE.MeshStandardMaterial({
    map: procTex.woodPlankAlbedo,
    bumpMap: procTex.woodPlankBump,
    bumpScale: 0.08,
    color: 0xffe8d2,
    roughness: 0.87,
    metalness: 0.02,
  });
  const timberWarmMat = new THREE.MeshStandardMaterial({
    map: procTex.woodPlankAlbedo,
    bumpMap: procTex.woodPlankBump,
    bumpScale: 0.08,
    color: 0xe4c2a2,
    roughness: 0.88,
    metalness: 0.02,
  });
  const timberDarkMat = new THREE.MeshStandardMaterial({
    map: procTex.woodPlankAlbedo,
    bumpMap: procTex.woodPlankBump,
    bumpScale: 0.08,
    color: 0xc29874,
    roughness: 0.89,
    metalness: 0.03,
  });
  const timberSubDeckMat = new THREE.MeshStandardMaterial({
    color: 0x5c402c,
    bumpMap: procTex.woodPlankBump,
    bumpScale: 0.06,
    roughness: 0.91,
    metalness: 0.02,
  });
  const handrailTerracottaMat = new THREE.MeshStandardMaterial({
    color: 0xd96b34,
    roughness: 0.68,
    metalness: 0.06,
  });
  const stripeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf7efe2 });
  const stripeAmberMat = new THREE.MeshBasicMaterial({ color: 0xffe4a8 });
  const roadArrowMat = new THREE.MeshStandardMaterial({
    map: procTex.roadArrowDecal,
    transparent: true,
    roughness: 0.75,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  materials.push(
    roadMat,
    solidRoadMat,
    gravelMat,
    plazaTopMat,
    masonryMat,
    curbStoneMat,
    timberLightMat,
    timberWarmMat,
    timberDarkMat,
    timberSubDeckMat,
    handrailTerracottaMat,
    stripeWhiteMat,
    stripeAmberMat,
    roadArrowMat,
  );

  // Shared lantern sub-parts
  const sharedLantern = {
    baseGeo: new THREE.CylinderGeometry(0.16, 0.2, 0.14, 8),
    globeGeo: new THREE.SphereGeometry(0.18, 10, 8),
    capGeo: new THREE.ConeGeometry(0.24, 0.22, 4),
    ribGeo: new THREE.BoxGeometry(0.035, 0.34, 0.035),
  };
  sharedLantern.capGeo.rotateY(Math.PI / 4);
  geometries.push(
    sharedLantern.baseGeo,
    sharedLantern.globeGeo,
    sharedLantern.capGeo,
    sharedLantern.ribGeo,
  );

  // =========================================================================
  // 1. STARTING PLAZA MEDALLION & SUNLIT RING ROAD (cut cleanly at Lagoon Viaduct)
  // =========================================================================
  const plazaBaseGeo = new THREE.CylinderGeometry(13.65, 14.35, 0.15, 48);
  const plazaCurbRingGeo = new THREE.TorusGeometry(13.65, 0.16, 6, 48);
  plazaCurbRingGeo.rotateX(Math.PI / 2);
  const plazaMedallionGeo = new THREE.CircleGeometry(13.15, 48);
  plazaMedallionGeo.rotateX(-Math.PI / 2);

  // Note: RingGeometry(rIn, rOut, segs, phiSegs, thetaStart, thetaLen) after rotateX(-PI/2)
  // maps canvas phi -> world atan2(z, x) = -phi. Viaduct covers atan2 in [-1.08, -0.40] => phi in [0.40, 1.08].
  const ringThetaStart = -RING_LAGOON_VIADUCT.angEnd; // 0.40 ->Wait: skip [0.40, 1.08], so draw [1.08 .. 2*PI + 0.40]
  const ringSkipStart = -RING_LAGOON_VIADUCT.angEnd; // 0.40
  const ringSkipEnd = -RING_LAGOON_VIADUCT.angStart; // 1.08
  const ringThetaLen = Math.PI * 2 - (ringSkipEnd - ringSkipStart);
  const ringDrawStart = ringSkipEnd;
  void ringThetaStart;

  const innerRingRoadGeo = new THREE.RingGeometry(31.4, 36.6, 72, 1, ringDrawStart, ringThetaLen);
  innerRingRoadGeo.rotateX(-Math.PI / 2);
  const innerRingLineGeo = new THREE.RingGeometry(33.9, 34.14, 72, 1, ringDrawStart, ringThetaLen);
  innerRingLineGeo.rotateX(-Math.PI / 2);
  const innerCurbOutGeo = new THREE.RingGeometry(36.48, 36.88, 72, 1, ringDrawStart, ringThetaLen);
  innerCurbOutGeo.rotateX(-Math.PI / 2);
  const innerCurbInGeo = new THREE.RingGeometry(31.12, 31.52, 72, 1, ringDrawStart, ringThetaLen);
  innerCurbInGeo.rotateX(-Math.PI / 2);

  geometries.push(
    plazaBaseGeo,
    plazaCurbRingGeo,
    plazaMedallionGeo,
    innerRingRoadGeo,
    innerRingLineGeo,
    innerCurbOutGeo,
    innerCurbInGeo,
  );

  const plazaMesh = new THREE.Mesh(plazaBaseGeo, curbStoneMat);
  plazaMesh.position.set(0, 0.015, 0);
  plazaMesh.receiveShadow = true;
  const plazaRim = new THREE.Mesh(plazaCurbRingGeo, masonryMat);
  plazaRim.position.set(0, 0.075, 0);
  const plazaTop = new THREE.Mesh(plazaMedallionGeo, plazaTopMat);
  plazaTop.position.set(0, 0.095, 0);
  plazaTop.receiveShadow = true;

  const innerRingRoad = new THREE.Mesh(innerRingRoadGeo, solidRoadMat);
  innerRingRoad.position.set(0, 0.025, 0);
  innerRingRoad.receiveShadow = true;
  const innerRingLine = new THREE.Mesh(innerRingLineGeo, stripeAmberMat);
  innerRingLine.position.set(0, 0.036, 0);
  const ringCurbOut = new THREE.Mesh(innerCurbOutGeo, curbStoneMat);
  ringCurbOut.position.set(0, 0.038, 0);
  const ringCurbIn = new THREE.Mesh(innerCurbInGeo, curbStoneMat);
  ringCurbIn.position.set(0, 0.038, 0);

  scene.add(plazaMesh, plazaRim, plazaTop, innerRingRoad, innerRingLine, ringCurbOut, ringCurbIn);

  // =========================================================================
  // 2. TERRAIN-CONFORMING SPOKE ROADS, JUNCTION APRONS & TRAILS
  // =========================================================================
  const asphaltSpokes: [number, number, number, number, number, boolean][] = [
    // [x1, z1, x2, z2, width, addCurbs] — endpoints stop cleanly at plaza & landmark pad rims
    [0, -13.4, 0, -37.2, 4.9, true],
    [0, 13.4, 0, 41.2, 4.9, true],
    [-9.5, -9.5, -32.2, -30.4, 4.8, true],
    [-34, -2, -61.2, 15.4, 4.8, true],
    [-34, 24, -37.0, 43.2, 4.8, true],
    [33, 14, 59.0, 8.8, 4.8, true],
    [28, 22, 41.4, 43.5, 4.8, true],
    [40, -32.4, 37.3, -39.4, 4.9, true],
    [39.8, -46.8, 48, -69.0, 4.8, true],
    [31, 4, 40, -11.6, 4.9, true],
  ];

  for (const [x1, z1, x2, z2, width, addCurbs] of asphaltSpokes) {
    const ribbonGeo = buildTerrainRibbonGeometry(x1, z1, x2, z2, width, 0.035, 7.6);
    geometries.push(ribbonGeo);
    const roadMesh = new THREE.Mesh(ribbonGeo, roadMat);
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);

    if (addCurbs) {
      const curbGeo = buildRoadEdgeCurbGeometry(x1, z1, x2, z2, width, 0.25, 0.085);
      geometries.push(curbGeo);
      const curbMesh = new THREE.Mesh(curbGeo, curbStoneMat);
      curbMesh.receiveShadow = true;
      scene.add(curbMesh);
    }
  }

  // Smooth intersection asphalt fillet discs at spoke-to-ring & hub junctions
  const junctionDiscGeo = new THREE.CylinderGeometry(3.2, 3.35, 0.06, 20);
  geometries.push(junctionDiscGeo);
  const junctionCoords: [number, number, number][] = [
    [0, -34, 1.05],
    [0, 34, 1.0],
    [-25, -23.5, 0.95],
    [-34, -2, 0.95],
    [-34, 24, 0.95],
    [33, 14, 0.95],
    [28, 22, 0.95],
    [31, 4, 0.95],
  ];
  for (const [jx, jz, jScale] of junctionCoords) {
    const gy = computeGroundHeight(jx, jz);
    const jDisc = new THREE.Mesh(junctionDiscGeo, solidRoadMat);
    jDisc.position.set(jx, gy + 0.015, jz);
    jDisc.scale.set(jScale, 1, jScale);
    jDisc.receiveShadow = true;
    scene.add(jDisc);
  }

  // Lookout Hill Sloped Ramp Road + Side Curbs & Safety Guard Barriers
  const hillRibbonGeo = buildTerrainRibbonGeometry(0, -36.5, 0, -64.5, 5.6, 0.045, 7.2);
  const hillCurbGeo = buildRoadEdgeCurbGeometry(0, -36.5, 0, -64.5, 5.6, 0.3, 0.11);
  geometries.push(hillRibbonGeo, hillCurbGeo);
  const hillRoad = new THREE.Mesh(hillRibbonGeo, roadMat);
  hillRoad.receiveShadow = true;
  const hillCurbs = new THREE.Mesh(hillCurbGeo, curbStoneMat);
  hillCurbs.receiveShadow = true;
  scene.add(hillRoad, hillCurbs);

  const guardPostGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.85, 8);
  const guardRailSegGeo = new THREE.BoxGeometry(0.12, 0.13, 2.75);
  geometries.push(guardPostGeo, guardRailSegGeo);
  for (const sideX of [-3.15, 3.15]) {
    for (let z = -39; z >= -59; z -= 2.5) {
      const gy = computeGroundHeight(sideX, z);
      const post = new THREE.Mesh(guardPostGeo, timberDarkMat);
      post.position.set(sideX, gy + 0.42, z);
      post.castShadow = true;
      scene.add(post);
      if (z > -59) {
        const nextGy = computeGroundHeight(sideX, z - 2.5);
        const rail = new THREE.Mesh(guardRailSegGeo, handrailTerracottaMat);
        rail.position.set(sideX, (gy + nextGy) * 0.5 + 0.66, z - 1.25);
        rail.rotation.x = Math.atan2(nextGy - gy, 2.5);
        rail.castShadow = true;
        scene.add(rail);
      }
    }
    const midGy = computeGroundHeight(sideX, -49);
    staticColliders.push({
      x: sideX + (sideX < 0 ? -0.15 : 0.15),
      y: midGy + 0.65,
      z: -49,
      hx: 0.22,
      hy: 2.8,
      hz: 10.2,
      ignoreCamera: true,
      friction: 0.04,
    });
  }

  // Hidden Pine Trail (Terrain-conforming gravel ribbon with timber trail stakes)
  const hiddenTrailPoints: [number, number][] = [
    [-34, -38],
    [-28, -50],
    [-22, -58],
    [-13, -66],
    [-6, -70],
  ];
  const trailStakeGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.55, 6);
  geometries.push(trailStakeGeo);
  for (let i = 0; i < hiddenTrailPoints.length - 1; i++) {
    const [x1, z1] = hiddenTrailPoints[i];
    const [x2, z2] = hiddenTrailPoints[i + 1];
    const trailGeo = buildTerrainRibbonGeometry(x1, z1, x2, z2, 3.15, 0.045, 5.5);
    geometries.push(trailGeo);
    const trailMesh = new THREE.Mesh(trailGeo, gravelMat);
    trailMesh.receiveShadow = true;
    scene.add(trailMesh);

    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    const stake = new THREE.Mesh(trailStakeGeo, timberDarkMat);
    const sx = (x1 + x2) * 0.5 + nx * 1.75;
    const sz = (z1 + z2) * 0.5 + nz * 1.75;
    stake.position.set(sx, computeGroundHeight(sx, sz) + 0.24, sz);
    scene.add(stake);
  }

  // South Cove Gravel Trails connecting Delivery Depot (-38, 48) <-> Bridge <-> Signal House (0, 46)
  const southCoveTrailSegs: [number, number, number, number][] = [
    [-38, 48, -34, 56],
    [-34, 56, -29.4, 62],
    [-6.6, 62, -3, 55],
    [-3, 55, 0, 46],
  ];
  for (const [x1, z1, x2, z2] of southCoveTrailSegs) {
    const covGeo = buildTerrainRibbonGeometry(x1, z1, x2, z2, 3.25, 0.04, 5.2);
    geometries.push(covGeo);
    const covMesh = new THREE.Mesh(covGeo, gravelMat);
    covMesh.receiveShadow = true;
    scene.add(covMesh);
  }

  // Pavement Directional Arrows along key roads (strictly on dry ground asphalt)
  const arrowGeo = new THREE.PlaneGeometry(1.75, 3.3);
  arrowGeo.rotateX(-Math.PI / 2);
  geometries.push(arrowGeo);
  const roadArrows: { x: number; z: number; yaw: number }[] = [
    { x: 0, z: -18, yaw: 0 }, // Toward Lookout Hill
    { x: 0, z: -42, yaw: 0 }, // Up Lookout Hill Ramp
    { x: 0, z: 22, yaw: Math.PI }, // Toward Signal House
    { x: 40, z: -8.5, yaw: 0 }, // Main Bridge South entry north-bound
    { x: 40, z: -35.5, yaw: Math.PI }, // Main Bridge North entry south-bound
    { x: 13.8, z: -31.1, yaw: -1.2 }, // NW Ring Viaduct North-West approach
    { x: 32.1, z: -10.8, yaw: 0.35 }, // NW Ring Viaduct South-East approach
    { x: -45, z: 5, yaw: 0.98 }, // Toward The Paddock
  ];
  for (const arr of roadArrows) {
    const gy = computeGroundHeight(arr.x, arr.z);
    const m = new THREE.Mesh(arrowGeo, roadArrowMat);
    m.position.set(arr.x, gy + 0.055, arr.z);
    m.rotation.y = arr.yaw;
    scene.add(m);
  }

  // =========================================================================
  // 3. THE PADDOCK OVAL RACING CIRCUIT & START/FINISH GANTRY (-66, 18)
  // =========================================================================
  const paddockRingGeo = new THREE.RingGeometry(15.4, 20.6, 60);
  paddockRingGeo.rotateX(-Math.PI / 2);
  const paddockCenterLineGeo = new THREE.RingGeometry(17.9, 18.14, 60);
  paddockCenterLineGeo.rotateX(-Math.PI / 2);
  const paddockCurbInGeo = new THREE.RingGeometry(15.1, 15.45, 60);
  paddockCurbInGeo.rotateX(-Math.PI / 2);
  const paddockCurbOutGeo = new THREE.RingGeometry(20.55, 20.92, 60);
  paddockCurbOutGeo.rotateX(-Math.PI / 2);
  const paddockStartStripGeo = new THREE.PlaneGeometry(5.1, 2.5);
  paddockStartStripGeo.rotateX(-Math.PI / 2);
  geometries.push(
    paddockRingGeo,
    paddockCenterLineGeo,
    paddockCurbInGeo,
    paddockCurbOutGeo,
    paddockStartStripGeo,
  );

  const paddockRing = new THREE.Mesh(paddockRingGeo, solidRoadMat);
  paddockRing.position.set(-66, 0.024, 18);
  paddockRing.receiveShadow = true;
  const paddockCenterLine = new THREE.Mesh(paddockCenterLineGeo, stripeAmberMat);
  paddockCenterLine.position.set(-66, 0.034, 18);
  const paddockCurbIn = new THREE.Mesh(paddockCurbInGeo, curbStoneMat);
  paddockCurbIn.position.set(-66, 0.03, 18);
  const paddockCurbOut = new THREE.Mesh(paddockCurbOutGeo, curbStoneMat);
  paddockCurbOut.position.set(-66, 0.03, 18);
  const stripMat = new THREE.MeshStandardMaterial({ map: procTex.checkeredStrip, roughness: 0.72 });
  materials.push(stripMat);
  const startStrip = new THREE.Mesh(paddockStartStripGeo, stripMat);
  startStrip.position.set(-66, 0.04, 0);
  scene.add(paddockRing, paddockCenterLine, paddockCurbIn, paddockCurbOut, startStrip);

  // Alternating Red & Cream Apex Curb Blocks on Paddock Corners
  const curbBlockGeo = new THREE.BoxGeometry(0.95, 0.16, 1.35);
  geometries.push(curbBlockGeo);
  const curbRedMat = new THREE.MeshStandardMaterial({ color: 0xe65448, roughness: 0.65 });
  materials.push(curbRedMat);
  for (let i = 0; i < 20; i++) {
    const ang = (i / 20) * Math.PI * 2;
    const cx = -66 + Math.cos(ang) * 21.15;
    const cz = 18 + Math.sin(ang) * 21.15;
    const cb = new THREE.Mesh(curbBlockGeo, i % 2 === 0 ? curbRedMat : creamMat);
    cb.position.set(cx, 0.08, cz);
    cb.rotation.y = -ang;
    cb.receiveShadow = true;
    scene.add(cb);
  }

  // Start / Finish Overhead Gantry Arch at (-66, 0) outside the oval track width
  const gantryPillarGeo = new THREE.BoxGeometry(0.45, 4.4, 0.45);
  const gantryCrossGeo = new THREE.BoxGeometry(7.2, 0.65, 0.42);
  const gantryBannerGeo = new THREE.PlaneGeometry(5.6, 0.56);
  geometries.push(gantryPillarGeo, gantryCrossGeo, gantryBannerGeo);
  const gantryGroup = new THREE.Group();
  gantryGroup.position.set(-66, 0, 0);
  const gLeft = new THREE.Mesh(gantryPillarGeo, roofDarkMat);
  gLeft.position.set(-3.35, 2.2, 0);
  gLeft.castShadow = true;
  const gRight = new THREE.Mesh(gantryPillarGeo, roofDarkMat);
  gRight.position.set(3.35, 2.2, 0);
  gRight.castShadow = true;
  const gBar = new THREE.Mesh(gantryCrossGeo, terracottaMat);
  gBar.position.set(0, 4.25, 0);
  gBar.castShadow = true;
  const gFrontFace = new THREE.Mesh(gantryBannerGeo, stripMat);
  gFrontFace.position.set(0, 4.25, 0.22);
  const gBackFace = new THREE.Mesh(gantryBannerGeo, stripMat);
  gBackFace.position.set(0, 4.25, -0.22);
  gBackFace.rotation.y = Math.PI;
  gantryGroup.add(gLeft, gRight, gBar, gFrontFace, gBackFace);
  scene.add(gantryGroup);

  // =========================================================================
  // 4. BRIDGE 1: MAIN EMERALD LAGOON ARCHED BRIDGE (x = 40, z in [-32.5, -11.5])
  // =========================================================================
  const mainBridge = new THREE.Group();
  const timberPool = [timberLightMat, timberWarmMat, timberDarkMat];

  // 4A. Sub-deck continuous arched structural timber tray + outer side fascia beams
  const mainSubSteps = 28;
  const zMin = MAIN_LAGOON_BRIDGE.zCenter - MAIN_LAGOON_BRIDGE.halfLength;
  const zMax = MAIN_LAGOON_BRIDGE.zCenter + MAIN_LAGOON_BRIDGE.halfLength;
  const subSpanLen = (zMax - zMin) / mainSubSteps;

  const mainSubSlabGeo = new THREE.BoxGeometry(MAIN_LAGOON_BRIDGE.deckHalfWidth * 2, 0.16, subSpanLen + 0.16);
  const mainFasciaGeo = new THREE.BoxGeometry(0.32, 0.56, subSpanLen + 0.16);
  const mainUnderRibGeo = new THREE.BoxGeometry(0.24, 0.28, subSpanLen + 0.12);
  const mainWheelGuardGeo = new THREE.BoxGeometry(0.24, 0.15, subSpanLen + 0.14);
  geometries.push(mainSubSlabGeo, mainFasciaGeo, mainUnderRibGeo, mainWheelGuardGeo);

  for (let i = 0; i < mainSubSteps; i++) {
    const z0 = zMin + i * subSpanLen;
    const z1 = z0 + subSpanLen;
    const zm = (z0 + z1) * 0.5;
    const y0 = computeBridgeSurfaceY(MAIN_LAGOON_BRIDGE.x, z0) ?? MAIN_LAGOON_BRIDGE.baseY;
    const y1 = computeBridgeSurfaceY(MAIN_LAGOON_BRIDGE.x, z1) ?? MAIN_LAGOON_BRIDGE.baseY;
    const ym = (y0 + y1) * 0.5;
    const pitchX = -Math.atan2(y1 - y0, z1 - z0);

    const sub = new THREE.Mesh(mainSubSlabGeo, timberSubDeckMat);
    sub.position.set(MAIN_LAGOON_BRIDGE.x, ym - 0.13, zm);
    sub.rotation.x = pitchX;
    sub.castShadow = true;
    sub.receiveShadow = true;
    mainBridge.add(sub);

    for (const sideX of [MAIN_LAGOON_BRIDGE.x - 3.5, MAIN_LAGOON_BRIDGE.x + 3.5]) {
      const fascia = new THREE.Mesh(mainFasciaGeo, masonryMat);
      fascia.position.set(sideX, ym - 0.18, zm);
      fascia.rotation.x = pitchX;
      fascia.castShadow = true;
      fascia.receiveShadow = true;
      mainBridge.add(fascia);

      const rib = new THREE.Mesh(mainUnderRibGeo, timberDarkMat);
      rib.position.set(sideX + (sideX < 40 ? 0.28 : -0.28), ym - 0.48, zm);
      rib.rotation.x = pitchX;
      mainBridge.add(rib);

      const guard = new THREE.Mesh(mainWheelGuardGeo, timberDarkMat);
      guard.position.set(sideX + (sideX < 40 ? 0.22 : -0.22), ym + 0.07, zm);
      guard.rotation.x = pitchX;
      guard.receiveShadow = true;
      mainBridge.add(guard);
    }
  }

  // 4B. 42 Individual Decorative Chamfered Timber Deck Planks
  const mainPlankCount = 42;
  const mainPlankGeo = new THREE.BoxGeometry(6.7, 0.08, 0.42);
  geometries.push(mainPlankGeo);
  for (let i = 0; i < mainPlankCount; i++) {
    const t = (i + 0.5) / mainPlankCount;
    const pz = zMin + t * (zMax - zMin);
    const yL = computeBridgeSurfaceY(MAIN_LAGOON_BRIDGE.x, pz - 0.2) ?? MAIN_LAGOON_BRIDGE.baseY;
    const yR = computeBridgeSurfaceY(MAIN_LAGOON_BRIDGE.x, pz + 0.2) ?? MAIN_LAGOON_BRIDGE.baseY;
    const py = computeBridgeSurfaceY(MAIN_LAGOON_BRIDGE.x, pz) ?? MAIN_LAGOON_BRIDGE.baseY;
    const plank = new THREE.Mesh(mainPlankGeo, timberPool[i % timberPool.length]);
    plank.position.set(MAIN_LAGOON_BRIDGE.x + ((i % 3) - 1) * 0.015, py - 0.036, pz);
    plank.rotation.x = -Math.atan2(yR - yL, 0.4);
    plank.receiveShadow = true;
    plank.castShadow = true;
    mainBridge.add(plank);
  }

  // 4C. Stone Masonry Piers + Pointed Cutwaters anchored deep in lagoon bed
  const pierShaftGeo = new THREE.BoxGeometry(1.1, 3.0, 1.85);
  const pierCapGeo = new THREE.BoxGeometry(1.36, 0.26, 2.2);
  const cutwaterGeo = new THREE.CylinderGeometry(0.45, 0.62, 2.2, 4);
  cutwaterGeo.rotateY(Math.PI / 4);
  geometries.push(pierShaftGeo, pierCapGeo, cutwaterGeo);

  for (const pierZ of [-26.6, -17.4]) {
    const deckY = computeBridgeSurfaceY(MAIN_LAGOON_BRIDGE.x, pierZ) ?? 0.65;
    for (const pierX of [36.85, 43.15]) {
      const pier = new THREE.Mesh(pierShaftGeo, masonryMat);
      pier.position.set(pierX, deckY - 1.75, pierZ);
      pier.castShadow = true;
      pier.receiveShadow = true;
      const cap = new THREE.Mesh(pierCapGeo, curbStoneMat);
      cap.position.set(pierX, deckY - 0.34, pierZ);
      mainBridge.add(pier, cap);
    }
    // Upstream / downstream cutwater prow noses on pier centerline
    for (const cwX of [36.15, 43.85]) {
      const cw = new THREE.Mesh(cutwaterGeo, masonryMat);
      cw.position.set(cwX, -0.7, pierZ);
      cw.scale.set(0.85, 1.0, 0.72);
      mainBridge.add(cw);
    }
  }

  // 4D. Curved Guardrails, Vertical Balusters & Entrance Pillars + Flared Wingwalls
  const mainBalusterGeo = new THREE.BoxGeometry(0.11, 0.92, 0.11);
  const mainRailSegGeo = new THREE.BoxGeometry(0.16, 0.13, 1.38);
  const mainMidRailGeo = new THREE.BoxGeometry(0.1, 0.09, 1.38);
  const mainPillarGeo = new THREE.BoxGeometry(0.62, 1.95, 0.62);
  const mainPillarCapGeo = new THREE.BoxGeometry(0.76, 0.22, 0.76);
  const wingwallGeo = new THREE.BoxGeometry(0.42, 0.92, 2.6);
  geometries.push(
    mainBalusterGeo,
    mainRailSegGeo,
    mainMidRailGeo,
    mainPillarGeo,
    mainPillarCapGeo,
    wingwallGeo,
  );

  const mainRailSteps = 16;
  const railStepZ = (zMax - zMin) / mainRailSteps;
  for (const sideX of [36.48, 43.52]) {
    for (let i = 0; i <= mainRailSteps; i++) {
      const pz = zMin + i * railStepZ;
      const py = computeBridgeSurfaceY(MAIN_LAGOON_BRIDGE.x, pz) ?? MAIN_LAGOON_BRIDGE.baseY;
      if (i > 0 && i < mainRailSteps) {
        const bal = new THREE.Mesh(mainBalusterGeo, i % 2 === 0 ? masonryMat : timberDarkMat);
        bal.position.set(sideX, py + 0.46, pz);
        bal.castShadow = true;
        mainBridge.add(bal);
      }
      if (i < mainRailSteps) {
        const nz = zMin + (i + 1) * railStepZ;
        const ny = computeBridgeSurfaceY(MAIN_LAGOON_BRIDGE.x, nz) ?? MAIN_LAGOON_BRIDGE.baseY;
        const pitch = -Math.atan2(ny - py, railStepZ);
        const midY = (py + ny) * 0.5;
        const midZ = (pz + nz) * 0.5;

        const topRail = new THREE.Mesh(mainRailSegGeo, handrailTerracottaMat);
        topRail.position.set(sideX, midY + 0.92, midZ);
        topRail.rotation.x = pitch;
        topRail.castShadow = true;
        const midRail = new THREE.Mesh(mainMidRailGeo, roofDarkMat);
        midRail.position.set(sideX, midY + 0.5, midZ);
        midRail.rotation.x = pitch;
        mainBridge.add(topRail, midRail);
      }
    }
  }

  // 4 Entrance Pillars + Flared Wingwalls + 6 Ornate Bridge Lanterns
  for (const endSign of [-1, 1] as const) {
    const endZ = MAIN_LAGOON_BRIDGE.zCenter + endSign * (MAIN_LAGOON_BRIDGE.halfLength - 0.15);
    const endY = computeBridgeSurfaceY(MAIN_LAGOON_BRIDGE.x, endZ) ?? MAIN_LAGOON_BRIDGE.baseY;
    for (const xSign of [-1, 1] as const) {
      const px = MAIN_LAGOON_BRIDGE.x + xSign * 3.55;
      const pillar = new THREE.Mesh(mainPillarGeo, masonryMat);
      pillar.position.set(px, endY + 0.7, endZ);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      const cap = new THREE.Mesh(mainPillarCapGeo, curbStoneMat);
      cap.position.set(px, endY + 1.72, endZ);
      mainBridge.add(pillar, cap);

      createArchitecturalLantern(
        mainBridge,
        px,
        endY + 1.83,
        endZ,
        geometries,
        sharedLantern,
        roofDarkMat,
        lanternMat,
        1.08,
      );

      // Flared stone entrance wingwall guiding vehicles smoothly onto deck
      const wing = new THREE.Mesh(wingwallGeo, masonryMat);
      wing.position.set(px + xSign * 0.52, endY + 0.2, endZ + endSign * 1.15);
      wing.rotation.y = endSign * xSign * 0.42;
      wing.castShadow = true;
      wing.receiveShadow = true;
      mainBridge.add(wing);
    }
  }

  // Crown post lanterns at z = -22
  const mainCrownY = computeBridgeSurfaceY(MAIN_LAGOON_BRIDGE.x, -22) ?? 1.28;
  for (const px of [36.48, 43.52]) {
    const crownCap = new THREE.Mesh(mainPillarCapGeo, curbStoneMat);
    crownCap.scale.set(0.56, 0.75, 0.56);
    crownCap.position.set(px, mainCrownY + 1.02, -22);
    mainBridge.add(crownCap);
    createArchitecturalLantern(
      mainBridge,
      px,
      mainCrownY + 1.1,
      -22,
      geometries,
      sharedLantern,
      roofDarkMat,
      lanternMat,
      1.05,
    );
  }
  scene.add(mainBridge);

  // Smooth rail colliders (6.6m clear lane inside, ignoreCamera so camera glides across bridge!)
  staticColliders.push(
    {
      x: 36.32,
      y: 1.15,
      z: MAIN_LAGOON_BRIDGE.zCenter,
      hx: 0.28,
      hy: 1.15,
      hz: MAIN_LAGOON_BRIDGE.halfLength,
      ignoreCamera: true,
      friction: 0.04,
    },
    {
      x: 43.68,
      y: 1.15,
      z: MAIN_LAGOON_BRIDGE.zCenter,
      hx: 0.28,
      hy: 1.15,
      hz: MAIN_LAGOON_BRIDGE.halfLength,
      ignoreCamera: true,
      friction: 0.04,
    },
  );

  // =========================================================================
  // 5. BRIDGE 2: NW LAGOON CURVED RING VIADUCT (r = 34, ang in [-1.08, -0.40])
  // =========================================================================
  const viaductGroup = new THREE.Group();
  const { radius: vRad, angStart: vA0, angEnd: vA1, deckHalfWidth: vHalfW } = RING_LAGOON_VIADUCT;
  const vSteps = 26;
  const vArcStep = ((vA1 - vA0) / vSteps) * vRad;

  const vSubGeo = new THREE.BoxGeometry(vHalfW * 2, 0.14, vArcStep + 0.2);
  const vFasciaGeo = new THREE.BoxGeometry(0.28, 0.44, vArcStep + 0.22);
  const vPlankGeo = new THREE.BoxGeometry(vHalfW * 1.94, 0.075, 0.52);
  const vRailGeo = new THREE.BoxGeometry(0.14, 0.11, vArcStep * 2 + 0.18);
  const vBalusterGeo = new THREE.BoxGeometry(0.1, 0.78, 0.1);
  const vPierGeo = new THREE.BoxGeometry(0.85, 2.7, 1.35);
  const vPillarGeo = new THREE.BoxGeometry(0.52, 1.5, 0.52);
  const vPillarCapGeo = new THREE.BoxGeometry(0.64, 0.18, 0.64);
  geometries.push(
    vSubGeo,
    vFasciaGeo,
    vPlankGeo,
    vRailGeo,
    vBalusterGeo,
    vPierGeo,
    vPillarGeo,
    vPillarCapGeo,
  );

  for (let i = 0; i < vSteps; i++) {
    const a0 = vA0 + (i / vSteps) * (vA1 - vA0);
    const a1 = vA0 + ((i + 1) / vSteps) * (vA1 - vA0);
    const am = (a0 + a1) * 0.5;
    const x0 = Math.cos(a0) * vRad;
    const z0 = Math.sin(a0) * vRad;
    const x1 = Math.cos(a1) * vRad;
    const z1 = Math.sin(a1) * vRad;
    const xm = Math.cos(am) * vRad;
    const zm = Math.sin(am) * vRad;
    const y0 = computeBridgeSurfaceY(x0, z0) ?? RING_LAGOON_VIADUCT.baseY;
    const y1 = computeBridgeSurfaceY(x1, z1) ?? RING_LAGOON_VIADUCT.baseY;
    const ym = (y0 + y1) * 0.5;
    const horizLen = Math.hypot(x1 - x0, z1 - z0);
    const yawY = Math.atan2(x1 - x0, z1 - z0);
    const pitchX = -Math.atan2(y1 - y0, horizLen);

    const sub = new THREE.Mesh(vSubGeo, timberSubDeckMat);
    sub.position.set(xm, ym - 0.12, zm);
    sub.rotation.order = 'YXZ';
    sub.rotation.set(pitchX, yawY, 0);
    sub.castShadow = true;
    sub.receiveShadow = true;
    viaductGroup.add(sub);

    const plank = new THREE.Mesh(vPlankGeo, timberPool[i % timberPool.length]);
    plank.position.set(xm, ym - 0.036, zm);
    plank.rotation.order = 'YXZ';
    plank.rotation.set(pitchX, yawY, 0);
    plank.receiveShadow = true;
    plank.castShadow = true;
    viaductGroup.add(plank);

    for (const rOff of [-(vHalfW + 0.06), vHalfW + 0.06]) {
      const fx = Math.cos(am) * (vRad + rOff);
      const fz = Math.sin(am) * (vRad + rOff);
      const fascia = new THREE.Mesh(vFasciaGeo, masonryMat);
      fascia.position.set(fx, ym - 0.16, fz);
      fascia.rotation.order = 'YXZ';
      fascia.rotation.set(pitchX, yawY, 0);
      fascia.castShadow = true;
      viaductGroup.add(fascia);
    }

    // Railings every 2 steps + balusters
    if (i % 2 === 0) {
      const aNext = vA0 + (Math.min(vSteps, i + 2) / vSteps) * (vA1 - vA0);
      const xN = Math.cos(aNext) * vRad;
      const zN = Math.sin(aNext) * vRad;
      const yN = computeBridgeSurfaceY(xN, zN) ?? RING_LAGOON_VIADUCT.baseY;
      const rYaw = Math.atan2(xN - x0, zN - z0);
      const rPitch = -Math.atan2(yN - y0, Math.hypot(xN - x0, zN - z0));

      for (const rOff of [-2.74, 2.74]) {
        const bx = Math.cos(a0) * (vRad + rOff);
        const bz = Math.sin(a0) * (vRad + rOff);
        if (i > 0) {
          const bal = new THREE.Mesh(vBalusterGeo, masonryMat);
          bal.position.set(bx, y0 + 0.38, bz);
          bal.castShadow = true;
          viaductGroup.add(bal);
        }
        const rx = Math.cos((a0 + aNext) * 0.5) * (vRad + rOff);
        const rz = Math.sin((a0 + aNext) * 0.5) * (vRad + rOff);
        const rail = new THREE.Mesh(vRailGeo, handrailTerracottaMat);
        rail.position.set(rx, (y0 + yN) * 0.5 + 0.78, rz);
        rail.rotation.order = 'YXZ';
        rail.rotation.set(rPitch, rYaw, 0);
        rail.castShadow = true;
        viaductGroup.add(rail);
      }
    }
  }

  // Stone viaduct piers under water span + entry pillars with lanterns
  for (const pierAng of [-0.88, -0.6]) {
    const py =
      computeBridgeSurfaceY(Math.cos(pierAng) * vRad, Math.sin(pierAng) * vRad) ?? 0.55;
    for (const rOff of [-2.45, 2.45]) {
      const pier = new THREE.Mesh(vPierGeo, masonryMat);
      pier.position.set(Math.cos(pierAng) * (vRad + rOff), py - 1.55, Math.sin(pierAng) * (vRad + rOff));
      pier.rotation.y = -pierAng;
      pier.castShadow = true;
      viaductGroup.add(pier);
    }
  }

  for (const endAng of [vA0, vA1]) {
    const endY =
      computeBridgeSurfaceY(Math.cos(endAng) * vRad, Math.sin(endAng) * vRad) ??
      RING_LAGOON_VIADUCT.baseY;
    for (const rOff of [-2.76, 2.76]) {
      const px = Math.cos(endAng) * (vRad + rOff);
      const pz = Math.sin(endAng) * (vRad + rOff);
      const pillar = new THREE.Mesh(vPillarGeo, masonryMat);
      pillar.position.set(px, endY + 0.58, pz);
      pillar.rotation.y = -endAng;
      pillar.castShadow = true;
      const cap = new THREE.Mesh(vPillarCapGeo, curbStoneMat);
      cap.position.set(px, endY + 1.38, pz);
      cap.rotation.y = -endAng;
      viaductGroup.add(pillar, cap);
      createArchitecturalLantern(
        viaductGroup,
        px,
        endY + 1.46,
        pz,
        geometries,
        sharedLantern,
        roofDarkMat,
        lanternMat,
        0.92,
      );
    }
  }
  scene.add(viaductGroup);

  // Oriented smooth inner & outer guardrail colliders along curved viaduct
  const vColSteps = 6;
  for (let i = 0; i < vColSteps; i++) {
    const a0 = vA0 + (i / vColSteps) * (vA1 - vA0);
    const a1 = vA0 + ((i + 1) / vColSteps) * (vA1 - vA0);
    const am = (a0 + a1) * 0.5;
    const tangentYaw = Math.atan2(
      Math.cos(a1) - Math.cos(a0),
      Math.sin(a1) - Math.sin(a0),
    );
    for (const rOff of [-2.95, 2.95]) {
      const segLen = ((a1 - a0) * (vRad + rOff)) * 0.52;
      staticColliders.push({
        x: Math.cos(am) * (vRad + rOff),
        y: 1.0,
        z: Math.sin(am) * (vRad + rOff),
        hx: 0.24,
        hy: 1.05,
        hz: segLen,
        ry: tangentYaw,
        ignoreCamera: true,
        friction: 0.04,
      });
    }
  }

  // =========================================================================
  // 6. BRIDGE 3: SOUTH COVE OASIS TIMBER FOOTBRIDGE (z = 62, x in [-29.5, -6.5])
  // =========================================================================
  const coveBridge = new THREE.Group();
  const cXMin = SOUTH_COVE_BRIDGE.xCenter - SOUTH_COVE_BRIDGE.halfLength;
  const cXMax = SOUTH_COVE_BRIDGE.xCenter + SOUTH_COVE_BRIDGE.halfLength;
  const cSteps = 28;
  const cSpanLen = (cXMax - cXMin) / cSteps;

  const cSubGeo = new THREE.BoxGeometry(cSpanLen + 0.14, 0.12, SOUTH_COVE_BRIDGE.deckHalfWidth * 2);
  const cStringerGeo = new THREE.BoxGeometry(cSpanLen + 0.14, 0.24, 0.18);
  const cPlankGeo = new THREE.BoxGeometry(0.56, 0.07, SOUTH_COVE_BRIDGE.deckHalfWidth * 1.92);
  const cPostGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.92, 8);
  const cRailGeo = new THREE.BoxGeometry(1.48, 0.09, 0.11);
  const cPilingGeo = new THREE.CylinderGeometry(0.14, 0.17, 2.35, 8);
  const cEndPostGeo = new THREE.BoxGeometry(0.38, 1.35, 0.38);
  geometries.push(
    cSubGeo,
    cStringerGeo,
    cPlankGeo,
    cPostGeo,
    cRailGeo,
    cPilingGeo,
    cEndPostGeo,
  );

  for (let i = 0; i < cSteps; i++) {
    const x0 = cXMin + i * cSpanLen;
    const x1 = x0 + cSpanLen;
    const xm = (x0 + x1) * 0.5;
    const y0 = computeBridgeSurfaceY(x0, SOUTH_COVE_BRIDGE.z) ?? SOUTH_COVE_BRIDGE.baseY;
    const y1 = computeBridgeSurfaceY(x1, SOUTH_COVE_BRIDGE.z) ?? SOUTH_COVE_BRIDGE.baseY;
    const ym = (y0 + y1) * 0.5;
    const rollZ = Math.atan2(y1 - y0, x1 - x0);

    const sub = new THREE.Mesh(cSubGeo, timberSubDeckMat);
    sub.position.set(xm, ym - 0.11, SOUTH_COVE_BRIDGE.z);
    sub.rotation.z = rollZ;
    sub.castShadow = true;
    sub.receiveShadow = true;
    coveBridge.add(sub);

    const plank = new THREE.Mesh(cPlankGeo, timberPool[i % timberPool.length]);
    plank.position.set(xm, ym - 0.032, SOUTH_COVE_BRIDGE.z);
    plank.rotation.z = rollZ;
    plank.receiveShadow = true;
    plank.castShadow = true;
    coveBridge.add(plank);

    for (const sideZ of [SOUTH_COVE_BRIDGE.z - 1.66, SOUTH_COVE_BRIDGE.z + 1.66]) {
      const str = new THREE.Mesh(cStringerGeo, timberDarkMat);
      str.position.set(xm, ym - 0.2, sideZ);
      str.rotation.z = rollZ;
      str.castShadow = true;
      coveBridge.add(str);
    }
  }

  // Timber trestle pilings anchored into cove floor
  for (const px of [-24.5, -20.2, -15.8, -11.5]) {
    const deckY = computeBridgeSurfaceY(px, SOUTH_COVE_BRIDGE.z) ?? 0.5;
    for (const pz of [SOUTH_COVE_BRIDGE.z - 1.52, SOUTH_COVE_BRIDGE.z + 1.52]) {
      const pile = new THREE.Mesh(cPilingGeo, timberDarkMat);
      pile.position.set(px, deckY - 1.28, pz);
      pile.castShadow = true;
      coveBridge.add(pile);
    }
  }

  // Footbridge posts, wooden railings & 4 warm lanterns
  const cRailSteps = 16;
  const cRailSpan = (cXMax - cXMin) / cRailSteps;
  for (const sideZ of [SOUTH_COVE_BRIDGE.z - 1.68, SOUTH_COVE_BRIDGE.z + 1.68]) {
    for (let i = 0; i <= cRailSteps; i++) {
      const px = cXMin + i * cRailSpan;
      const py = computeBridgeSurfaceY(px, SOUTH_COVE_BRIDGE.z) ?? SOUTH_COVE_BRIDGE.baseY;
      if (i > 0 && i < cRailSteps) {
        const post = new THREE.Mesh(cPostGeo, timberDarkMat);
        post.position.set(px, py + 0.44, sideZ);
        post.castShadow = true;
        coveBridge.add(post);
      }
      if (i < cRailSteps) {
        const nx = px + cRailSpan;
        const ny = computeBridgeSurfaceY(nx, SOUTH_COVE_BRIDGE.z) ?? SOUTH_COVE_BRIDGE.baseY;
        const rail = new THREE.Mesh(cRailGeo, timberWarmMat);
        rail.position.set((px + nx) * 0.5, (py + ny) * 0.5 + 0.84, sideZ);
        rail.rotation.z = Math.atan2(ny - py, cRailSpan);
        rail.castShadow = true;
        coveBridge.add(rail);
      }
    }
  }

  for (const endX of [cXMin + 0.15, cXMax - 0.15]) {
    const endY = computeBridgeSurfaceY(endX, SOUTH_COVE_BRIDGE.z) ?? SOUTH_COVE_BRIDGE.baseY;
    for (const sideZ of [SOUTH_COVE_BRIDGE.z - 1.72, SOUTH_COVE_BRIDGE.z + 1.72]) {
      const ep = new THREE.Mesh(cEndPostGeo, masonryMat);
      ep.position.set(endX, endY + 0.58, sideZ);
      ep.castShadow = true;
      coveBridge.add(ep);
      createArchitecturalLantern(
        coveBridge,
        endX,
        endY + 1.24,
        sideZ,
        geometries,
        sharedLantern,
        roofDarkMat,
        lanternMat,
        0.82,
      );
    }
  }
  scene.add(coveBridge);

  staticColliders.push(
    {
      x: SOUTH_COVE_BRIDGE.xCenter,
      y: 0.9,
      z: SOUTH_COVE_BRIDGE.z - 1.92,
      hx: SOUTH_COVE_BRIDGE.halfLength,
      hy: 0.95,
      hz: 0.24,
      ignoreCamera: true,
      friction: 0.04,
    },
    {
      x: SOUTH_COVE_BRIDGE.xCenter,
      y: 0.9,
      z: SOUTH_COVE_BRIDGE.z + 1.92,
      hx: SOUTH_COVE_BRIDGE.halfLength,
      hy: 0.95,
      hz: 0.24,
      ignoreCamera: true,
      friction: 0.04,
    },
  );

  // =========================================================================
  // 7. EAST LAGOON PLANKED TIMBER JETTY (x = 56, z = -16.5)
  // =========================================================================
  const jettyGroup = new THREE.Group();
  const jettyStringerGeo = new THREE.BoxGeometry(0.18, 0.18, 6.5);
  const jettyPlankGeo = new THREE.BoxGeometry(2.65, 0.075, 0.36);
  const jettyPilingGeo = new THREE.CylinderGeometry(0.15, 0.18, 2.2, 8);
  const jettyStepGeo = new THREE.BoxGeometry(2.8, 0.28, 1.1);
  geometries.push(jettyStringerGeo, jettyPlankGeo, jettyPilingGeo, jettyStepGeo);

  const shoreStep = new THREE.Mesh(jettyStepGeo, masonryMat);
  shoreStep.position.set(56, 0.06, -13.1);
  shoreStep.receiveShadow = true;
  jettyGroup.add(shoreStep);

  for (const sx of [55.05, 56.95]) {
    const str = new THREE.Mesh(jettyStringerGeo, timberSubDeckMat);
    str.position.set(sx, 0.14, -16.5);
    str.castShadow = true;
    jettyGroup.add(str);
  }
  for (let i = 0; i < 15; i++) {
    const jz = -13.5 - i * 0.42;
    const pl = new THREE.Mesh(jettyPlankGeo, timberPool[i % timberPool.length]);
    pl.position.set(56, 0.25, jz);
    pl.castShadow = true;
    pl.receiveShadow = true;
    jettyGroup.add(pl);
  }
  for (const jz of [-14.0, -16.5, -19.2]) {
    for (const jx of [54.82, 57.18]) {
      const pile = new THREE.Mesh(jettyPilingGeo, timberDarkMat);
      pile.position.set(jx, -0.35, jz);
      pile.castShadow = true;
      jettyGroup.add(pile);
    }
  }
  // Jetty pier lantern at the water edge
  createArchitecturalLantern(
    jettyGroup,
    54.82,
    0.72,
    -19.2,
    geometries,
    sharedLantern,
    roofDarkMat,
    lanternMat,
    0.88,
  );
  scene.add(jettyGroup);

  // =========================================================================
  // 8. DIRECTIONAL ROAD SIGNS & SQL VALLEY SIGNS
  // =========================================================================
  const signDefs = [
    { x: -12, z: -14, label: 'THE STUDIO', arrow: '↖', rotY: -0.6 },
    { x: 14, z: -14, label: 'LAGOON BRIDGE', arrow: '↗', rotY: 0.6 },
    { x: 0, z: -36, label: 'LOOKOUT HILL', arrow: '↑', rotY: 0 },
    { x: 42, z: -60, label: 'SELECT * FROM', arrow: 'VALLEY', rotY: -0.3 },
    { x: 53, z: -66, label: 'JOIN SKILLS', arrow: 'ON ID', rotY: 0.4 },
    { x: -45, z: 8, label: 'THE PADDOCK', arrow: '↙', rotY: -0.9 },
    { x: -31, z: 59, label: 'COVE BRIDGE', arrow: '→', rotY: 0.65 },
  ];
  const rPostGeo = new THREE.CylinderGeometry(0.1, 0.12, 2.3, 8);
  const rPlinthGeo = new THREE.CylinderGeometry(0.2, 0.24, 0.24, 8);
  const rFrameGeo = new THREE.BoxGeometry(2.74, 1.32, 0.1);
  const rBoardGeo = new THREE.BoxGeometry(2.58, 1.18, 0.14);
  geometries.push(rPostGeo, rPlinthGeo, rFrameGeo, rBoardGeo);

  for (const sd of signDefs) {
    const gy = computeGroundHeight(sd.x, sd.z);
    const rTex = createDirectionalBoardTexture(sd.label, sd.arrow);
    textures.push(rTex);
    const rMat = new THREE.MeshBasicMaterial({ map: rTex, toneMapped: false });
    materials.push(rMat);

    const signGrp = new THREE.Group();
    signGrp.position.set(sd.x, gy, sd.z);
    const plinth = new THREE.Mesh(rPlinthGeo, masonryMat);
    plinth.position.y = 0.12;
    const post = new THREE.Mesh(rPostGeo, roofDarkMat);
    post.position.y = 1.15;
    post.castShadow = true;
    const frame = new THREE.Mesh(rFrameGeo, timberDarkMat);
    frame.position.y = 2.32;
    frame.rotation.y = sd.rotY;
    const board = new THREE.Mesh(rBoardGeo, rMat);
    board.position.y = 2.32;
    board.rotation.y = sd.rotY;
    signGrp.add(plinth, post, frame, board);
    scene.add(signGrp);
  }

  // =========================================================================
  // 9. RING ROAD & BRIDGE CORRIDOR STREET LANTERNS
  // =========================================================================
  const lampPlinthGeo = new THREE.CylinderGeometry(0.24, 0.3, 0.45, 8);
  const lampPoleGeo = new THREE.CylinderGeometry(0.08, 0.13, 4.1, 8);
  const lampArmGeo = new THREE.BoxGeometry(0.88, 0.1, 0.1);
  const lampHoodGeo = new THREE.ConeGeometry(0.36, 0.24, 6);
  const lampHeadGeo = new THREE.SphereGeometry(0.26, 10, 8);
  geometries.push(lampPlinthGeo, lampPoleGeo, lampArmGeo, lampHoodGeo, lampHeadGeo);

  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.18;
    const lx = Math.cos(a) * 38;
    const lz = Math.sin(a) * 38;
    if (isNearRoadOrBuilding(lx, lz)) continue;
    const gy = computeGroundHeight(lx, lz);
    const plinth = new THREE.Mesh(lampPlinthGeo, masonryMat);
    plinth.position.set(lx, gy + 0.22, lz);
    const pole = new THREE.Mesh(lampPoleGeo, roofDarkMat);
    pole.position.set(lx, gy + 2.25, lz);
    pole.castShadow = true;
    const arm = new THREE.Mesh(lampArmGeo, roofDarkMat);
    arm.position.set(lx - Math.cos(a) * 0.36, gy + 4.3, lz - Math.sin(a) * 0.36);
    arm.rotation.y = -a;
    const hx = lx - Math.cos(a) * 0.7;
    const hz = lz - Math.sin(a) * 0.7;
    const hood = new THREE.Mesh(lampHoodGeo, roofDarkMat);
    hood.position.set(hx, gy + 4.24, hz);
    const bulb = new THREE.Mesh(lampHeadGeo, lanternMat);
    bulb.position.set(hx, gy + 4.08, hz);
    scene.add(plinth, pole, arm, hood, bulb);
  }

  // =========================================================================
  // 10. THREE WARM UNSHADOWED BRIDGE POINT LIGHTS (atmospheric dusk/night glow)
  // =========================================================================
  const mainBridgeLight = new THREE.PointLight(0xffb866, 0.65, 28, 1.6);
  mainBridgeLight.position.set(MAIN_LAGOON_BRIDGE.x, 3.6, MAIN_LAGOON_BRIDGE.zCenter);

  const viaductMidAng = (RING_LAGOON_VIADUCT.angStart + RING_LAGOON_VIADUCT.angEnd) * 0.5;
  const viaductLight = new THREE.PointLight(0xffb866, 0.55, 24, 1.6);
  viaductLight.position.set(
    Math.cos(viaductMidAng) * RING_LAGOON_VIADUCT.radius,
    3.1,
    Math.sin(viaductMidAng) * RING_LAGOON_VIADUCT.radius,
  );

  const coveBridgeLight = new THREE.PointLight(0xffb866, 0.55, 22, 1.6);
  coveBridgeLight.position.set(SOUTH_COVE_BRIDGE.xCenter, 2.75, SOUTH_COVE_BRIDGE.z);

  scene.add(mainBridgeLight, viaductLight, coveBridgeLight);

  const updateLighting = (
    weather: WeatherMode,
    motionTime: number,
    nightGlowOverride?: number,
  ) => {
    const targetGlow =
      nightGlowOverride ??
      (weather === 'night'
        ? 1.0
        : weather === 'sunset'
          ? 0.56
          : weather === 'rain' || weather === 'fog'
            ? 0.34
            : 0.0);
    const baseIntensity = 0.55 + targetGlow * 2.35;
    const flicker = Math.sin(motionTime * 2.2) * (0.08 + targetGlow * 0.1);
    mainBridgeLight.intensity = baseIntensity + flicker;
    viaductLight.intensity = baseIntensity * 0.85 + flicker * 0.8;
    coveBridgeLight.intensity = baseIntensity * 0.82 - flicker * 0.6;
  };

  const setWetness = (wetness: number) => {
    const w = THREE.MathUtils.clamp(wetness, 0, 1);
    roadMat.roughness = THREE.MathUtils.lerp(0.85, 0.28, w);
    roadMat.envMapIntensity = THREE.MathUtils.lerp(0.65, 1.4, w);
    solidRoadMat.roughness = THREE.MathUtils.lerp(0.85, 0.28, w);
    solidRoadMat.envMapIntensity = THREE.MathUtils.lerp(0.65, 1.4, w);
    curbStoneMat.roughness = THREE.MathUtils.lerp(0.84, 0.42, w);
    curbStoneMat.envMapIntensity = THREE.MathUtils.lerp(0.6, 1.15, w);
    timberLightMat.roughness = THREE.MathUtils.lerp(0.87, 0.44, w);
    timberWarmMat.roughness = THREE.MathUtils.lerp(0.88, 0.45, w);
    timberDarkMat.roughness = THREE.MathUtils.lerp(0.89, 0.48, w);
  };

  return { updateLighting, setWetness };
}
