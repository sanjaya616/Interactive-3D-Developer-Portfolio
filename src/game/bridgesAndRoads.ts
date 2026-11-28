import * as THREE from 'three';
import type { WeatherMode } from '../types/portfolio';
import {
  DOUBLE_JUMP_PLATFORMS,
  PRECISION_PARKING_BAYS,
  STUNT_ARENA_RAMPS,
} from '../data/portfolioData';
import {
  FOREST_BROOK_BRIDGE,
  MAIN_LAGOON_BRIDGE,
  RING_LAGOON_VIADUCT,
  SOUTH_COVE_BRIDGE,
  computeBridgeSurfaceY,
  computeGroundHeight,
} from './physicsMath';
import {
  DIRECTIONAL_SIGNS,
  PADDOCK_CENTER,
  PADDOCK_ENTRY_POS,
  PADDOCK_TRACK_DEF,
  PLAZA_RADIUS,
  RING_ROAD_DEF,
  ROAD_JUNCTION_DISCS,
  ROAD_SEGMENTS,
  WEST_RIDGE_TUNNEL_DEF,
  getTrimmedRoadSegmentRange,
  isPointClearForProp,
} from './worldLayout';
import { ROAD_LAYER_OFFSETS } from './worldConstants';
import type { ProceduralTextureSet } from './proceduralTextures';
import type { StaticBoxColliderDef } from './worldEnvironment';

export interface BridgesAndRoadsBuild {
  updateLighting: (weather: WeatherMode, motionTime: number, nightGlowOverride?: number) => void;
  setWetness: (wetness: number) => void;
  setRoadLayerDebug: (enabled: boolean) => void;
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
 * Builds a terrain-conforming horizontal ribbon mesh between two XZ points at ~1.0m longitudinal steps
 * with proportional UV tiling so asphalt and gravel paths follow slopes smoothly with zero clipping.
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
  const steps = Math.max(4, Math.ceil(len));
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
 * Merges indexed position+uv BufferGeometries cleanly into one BufferGeometry to minimize draw calls.
 */
function mergeSimpleGeometries(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let totalVerts = 0;
  for (const g of parts) {
    totalVerts += g.attributes.position.count;
  }
  const positions = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const indices: number[] = [];

  let vertOffset = 0;
  for (const g of parts) {
    const posAttr = g.attributes.position as THREE.BufferAttribute;
    const uvAttr = g.attributes.uv as THREE.BufferAttribute | undefined;
    const count = posAttr.count;
    positions.set(posAttr.array as Float32Array, vertOffset * 3);
    if (uvAttr) {
      uvs.set(uvAttr.array as Float32Array, vertOffset * 2);
    }
    const idx = g.getIndex();
    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        indices.push(idx.getX(i) + vertOffset);
      }
    } else {
      for (let i = 0; i < count; i++) {
        indices.push(vertOffset + i);
      }
    }
    vertOffset += count;
    g.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  merged.setIndex(indices);
  merged.computeVertexNormals();
  return merged;
}

/**
 * Splits a trimmed road segment around intersections with Sunlit Ring Road or Paddock Oval
 * so ribbons stop cleanly at junctions without double-layering flat asphalt.
 */
function getNonOverlappingSubSpans(
  seg: (typeof ROAD_SEGMENTS)[number],
): { x1: number; z1: number; x2: number; z2: number }[] {
  const [t0, t1] = getTrimmedRoadSegmentRange(seg);
  const dx = seg.x2 - seg.x1;
  const dz = seg.z2 - seg.z1;
  const len = Math.hypot(dx, dz) || 1;
  const spans: { x1: number; z1: number; x2: number; z2: number }[] = [];

  const isInsideCrossRing = (t: number) => {
    const x = seg.x1 + dx * t;
    const z = seg.z1 + dz * t;
    const r = Math.hypot(x, z);
    if (Math.abs(r - RING_ROAD_DEF.radius) <= RING_ROAD_DEF.halfWidth + 0.15) return true;
    const distPad = Math.hypot(x - PADDOCK_CENTER.x, z - PADDOCK_CENTER.z);
    if (Math.abs(distPad - PADDOCK_TRACK_DEF.radius) <= PADDOCK_TRACK_DEF.width * 0.5 + 0.15) return true;
    return false;
  };

  const samples = Math.max(12, Math.ceil(len * 2));
  let spanStart: number | null = null;
  for (let i = 0; i <= samples; i++) {
    const t = t0 + (t1 - t0) * (i / samples);
    const blocked = isInsideCrossRing(t);
    if (!blocked && spanStart === null) {
      spanStart = t;
    } else if (blocked && spanStart !== null) {
      if ((t - spanStart) * len >= 1.2) {
        spans.push({
          x1: seg.x1 + dx * spanStart,
          z1: seg.z1 + dz * spanStart,
          x2: seg.x1 + dx * t,
          z2: seg.z1 + dz * t,
        });
      }
      spanStart = null;
    }
  }
  if (spanStart !== null && (t1 - spanStart) * len >= 1.2) {
    spans.push({
      x1: seg.x1 + dx * spanStart,
      z1: seg.z1 + dz * spanStart,
      x2: seg.x1 + dx * t1,
      z2: seg.z1 + dz * t1,
    });
  }
  return spans;
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
  const steps = Math.max(4, Math.ceil(len));
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
    polygonOffset: true,
    polygonOffsetFactor: ROAD_LAYER_OFFSETS.asphalt.polygonOffsetFactor,
    polygonOffsetUnits: ROAD_LAYER_OFFSETS.asphalt.polygonOffsetUnits,
  });
  const solidRoadMat = new THREE.MeshStandardMaterial({
    color: 0x4b4440,
    bumpMap: procTex.asphaltBump,
    bumpScale: 0.045,
    roughness: 0.85,
    metalness: 0.04,
    polygonOffset: true,
    polygonOffsetFactor: ROAD_LAYER_OFFSETS.junction.polygonOffsetFactor,
    polygonOffsetUnits: ROAD_LAYER_OFFSETS.junction.polygonOffsetUnits,
  });
  const gravelMat = new THREE.MeshStandardMaterial({
    color: 0xa2886a,
    bumpMap: procTex.sandBump,
    bumpScale: 0.12,
    roughness: 0.94,
    metalness: 0.01,
    polygonOffset: true,
    polygonOffsetFactor: ROAD_LAYER_OFFSETS.gravel.polygonOffsetFactor,
    polygonOffsetUnits: ROAD_LAYER_OFFSETS.gravel.polygonOffsetUnits,
  });
  const plazaTopMat = new THREE.MeshStandardMaterial({
    map: procTex.plazaMedallion,
    bumpMap: procTex.stoneMasonryBump,
    bumpScale: 0.05,
    roughness: 0.78,
    polygonOffset: true,
    polygonOffsetFactor: ROAD_LAYER_OFFSETS.asphalt.polygonOffsetFactor,
    polygonOffsetUnits: ROAD_LAYER_OFFSETS.asphalt.polygonOffsetUnits,
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
    polygonOffset: true,
    polygonOffsetFactor: ROAD_LAYER_OFFSETS.curb.polygonOffsetFactor,
    polygonOffsetUnits: ROAD_LAYER_OFFSETS.curb.polygonOffsetUnits,
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
  const stripeWhiteMat = new THREE.MeshBasicMaterial({
    color: 0xf7efe2,
    polygonOffset: true,
    polygonOffsetFactor: ROAD_LAYER_OFFSETS.markings.polygonOffsetFactor,
    polygonOffsetUnits: ROAD_LAYER_OFFSETS.markings.polygonOffsetUnits,
  });
  const stripeAmberMat = new THREE.MeshBasicMaterial({
    color: 0xffe4a8,
    polygonOffset: true,
    polygonOffsetFactor: ROAD_LAYER_OFFSETS.markings.polygonOffsetFactor,
    polygonOffsetUnits: ROAD_LAYER_OFFSETS.markings.polygonOffsetUnits,
  });
  const roadArrowMat = new THREE.MeshStandardMaterial({
    map: procTex.roadArrowDecal,
    transparent: true,
    roughness: 0.75,
    polygonOffset: true,
    polygonOffsetFactor: ROAD_LAYER_OFFSETS.decals.polygonOffsetFactor,
    polygonOffsetUnits: ROAD_LAYER_OFFSETS.decals.polygonOffsetUnits,
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

  // Layer debug toggle materials cache (F4 key)
  const debugLayerMats = new Map<string, THREE.MeshBasicMaterial>();
  for (const [layerName, cfg] of Object.entries(ROAD_LAYER_OFFSETS)) {
    const dm = new THREE.MeshBasicMaterial({
      color: cfg.debugColor,
      polygonOffset: true,
      polygonOffsetFactor: cfg.polygonOffsetFactor,
      polygonOffsetUnits: cfg.polygonOffsetUnits,
    });
    debugLayerMats.set(layerName, dm);
    materials.push(dm);
  }
  const layeredMeshes: { mesh: THREE.Mesh; layer: keyof typeof ROAD_LAYER_OFFSETS; normalMat: THREE.Material }[] = [];
  const registerLayeredMesh = (
    mesh: THREE.Mesh,
    layer: keyof typeof ROAD_LAYER_OFFSETS,
    normalMat: THREE.Material,
  ) => {
    mesh.renderOrder = ROAD_LAYER_OFFSETS[layer].renderOrder;
    layeredMeshes.push({ mesh, layer, normalMat });
  };

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
  // 1. STARTING PLAZA MEDALLION & SUNLIT RING ROAD (open curbs at intersections)
  // =========================================================================
  const plazaBaseGeo = new THREE.CylinderGeometry(PLAZA_RADIUS, PLAZA_RADIUS + 0.7, 0.12, 48);
  const plazaCurbRingGeo = new THREE.TorusGeometry(PLAZA_RADIUS, 0.14, 6, 48);
  plazaCurbRingGeo.rotateX(Math.PI / 2);
  const plazaMedallionGeo = new THREE.CircleGeometry(PLAZA_RADIUS - 0.5, 48);
  plazaMedallionGeo.rotateX(-Math.PI / 2);

  const ringSkipStart = -RING_LAGOON_VIADUCT.angEnd;
  const ringSkipEnd = -RING_LAGOON_VIADUCT.angStart;
  const ringThetaLen = Math.PI * 2 - (ringSkipEnd - ringSkipStart);
  const ringDrawStart = ringSkipEnd;

  const innerRingRoadGeo = new THREE.RingGeometry(
    RING_ROAD_DEF.radius - RING_ROAD_DEF.halfWidth,
    RING_ROAD_DEF.radius + RING_ROAD_DEF.halfWidth,
    72,
    1,
    ringDrawStart,
    ringThetaLen,
  );
  innerRingRoadGeo.rotateX(-Math.PI / 2);
  const innerRingLineGeo = new THREE.RingGeometry(33.9, 34.14, 72, 1, ringDrawStart, ringThetaLen);
  innerRingLineGeo.rotateX(-Math.PI / 2);

  // Helper to build ring curb sectors with open gaps wherever spokes enter Ring Road
  const buildSegmentedRingArc = (
    rIn: number,
    rOut: number,
    skipAnglesWorld: { ang: number; halfGap: number }[],
    alwaysSkipRange?: { start: number; end: number },
  ): THREE.BufferGeometry => {
    const segs = 120;
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    let vCount = 0;

    const isGap = (worldAng: number) => {
      if (alwaysSkipRange && worldAng >= alwaysSkipRange.start && worldAng <= alwaysSkipRange.end) return true;
      for (const gap of skipAnglesWorld) {
        const diff = Math.abs(Math.atan2(Math.sin(worldAng - gap.ang), Math.cos(worldAng - gap.ang)));
        if (diff <= gap.halfGap) return true;
      }
      return false;
    };

    for (let i = 0; i < segs; i++) {
      const a0 = -Math.PI + (i / segs) * Math.PI * 2;
      const a1 = -Math.PI + ((i + 1) / segs) * Math.PI * 2;
      const am = (a0 + a1) * 0.5;
      if (isGap(am)) continue;
      const c0 = Math.cos(a0);
      const s0 = Math.sin(a0);
      const c1 = Math.cos(a1);
      const s1 = Math.sin(a1);
      pos.push(
        c0 * rIn, 0, s0 * rIn,
        c0 * rOut, 0, s0 * rOut,
        c1 * rOut, 0, s1 * rOut,
        c1 * rIn, 0, s1 * rIn,
      );
      uv.push(0, 0, 1, 0, 1, 1, 0, 1);
      idx.push(vCount, vCount + 2, vCount + 1, vCount, vCount + 3, vCount + 2);
      vCount += 4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };

  const ringOutGaps = [
    { ang: -Math.PI / 2, halfGap: 0.11 }, // North lookout ramp
    { ang: Math.PI / 2, halfGap: 0.10 }, // South Signal blvd
    { ang: Math.atan2(-23.1, -24.9), halfGap: 0.10 }, // Studio
    { ang: Math.atan2(-2.0, -34.0), halfGap: 0.10 }, // West tunnel
    { ang: Math.atan2(26.7, -21.1), halfGap: 0.10 }, // Delivery
    { ang: Math.atan2(4.2, 33.7), halfGap: 0.11 }, // East workshop/bridge
    { ang: Math.atan2(25.1, 23.0), halfGap: 0.10 }, // Signal workshop
  ];
  const ringInGaps = [
    { ang: -Math.PI / 2, halfGap: 0.10 }, // North plaza spoke
    { ang: Math.PI / 2, halfGap: 0.10 }, // South plaza spoke
    { ang: Math.atan2(-23.1, -24.9), halfGap: 0.10 }, // Studio spoke
  ];

  const innerCurbOutGeo = buildSegmentedRingArc(36.48, 36.88, ringOutGaps, {
    start: RING_LAGOON_VIADUCT.angStart,
    end: RING_LAGOON_VIADUCT.angEnd,
  });
  const innerCurbInGeo = buildSegmentedRingArc(31.12, 31.52, ringInGaps, {
    start: RING_LAGOON_VIADUCT.angStart,
    end: RING_LAGOON_VIADUCT.angEnd,
  });

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
  plazaMesh.position.set(0, -0.02, 0);
  plazaMesh.receiveShadow = true;
  registerLayeredMesh(plazaMesh, 'curb', curbStoneMat);
  const plazaRim = new THREE.Mesh(plazaCurbRingGeo, masonryMat);
  plazaRim.position.set(0, 0.04, 0);
  const plazaTop = new THREE.Mesh(plazaMedallionGeo, plazaTopMat);
  plazaTop.position.set(0, ROAD_LAYER_OFFSETS.asphalt.yOffset + 0.022, 0);
  plazaTop.receiveShadow = true;
  registerLayeredMesh(plazaTop, 'asphalt', plazaTopMat);

  const innerRingRoad = new THREE.Mesh(innerRingRoadGeo, solidRoadMat);
  innerRingRoad.position.set(0, ROAD_LAYER_OFFSETS.junction.yOffset - 0.004, 0);
  innerRingRoad.receiveShadow = true;
  registerLayeredMesh(innerRingRoad, 'asphalt', solidRoadMat);
  const innerRingLine = new THREE.Mesh(innerRingLineGeo, stripeAmberMat);
  innerRingLine.position.set(0, ROAD_LAYER_OFFSETS.markings.yOffset, 0);
  registerLayeredMesh(innerRingLine, 'markings', stripeAmberMat);
  const ringCurbOut = new THREE.Mesh(innerCurbOutGeo, curbStoneMat);
  ringCurbOut.position.set(0, ROAD_LAYER_OFFSETS.curb.yOffset, 0);
  registerLayeredMesh(ringCurbOut, 'curb', curbStoneMat);
  const ringCurbIn = new THREE.Mesh(innerCurbInGeo, curbStoneMat);
  ringCurbIn.position.set(0, ROAD_LAYER_OFFSETS.curb.yOffset, 0);
  registerLayeredMesh(ringCurbIn, 'curb', curbStoneMat);

  scene.add(plazaMesh, plazaRim, plazaTop, innerRingRoad, innerRingLine, ringCurbOut, ringCurbIn);

  // =========================================================================
  // 2. TERRAIN-CONFORMING TRIMMED SPOKE ROADS (MERGED BY SURFACE), JUNCTION DISCS & TRAILS
  // =========================================================================
  const asphaltParts: THREE.BufferGeometry[] = [];
  const gravelParts: THREE.BufferGeometry[] = [];
  const curbParts: THREE.BufferGeometry[] = [];
  const dashGeo = new THREE.PlaneGeometry(0.18, 1.45);
  dashGeo.rotateX(-Math.PI / 2);
  geometries.push(dashGeo);
  const dashMatrices: THREE.Matrix4[] = [];
  const dummyObj = new THREE.Object3D();

  for (const seg of ROAD_SEGMENTS) {
    if (seg.surface === 'ramp') continue;
    const isGravel = seg.surface === 'gravel';
    const subSpans = getNonOverlappingSubSpans(seg);
    for (const sp of subSpans) {
      const ribbonGeo = buildTerrainRibbonGeometry(
        sp.x1,
        sp.z1,
        sp.x2,
        sp.z2,
        seg.width,
        isGravel ? ROAD_LAYER_OFFSETS.gravel.yOffset + 0.01 : ROAD_LAYER_OFFSETS.asphalt.yOffset,
        isGravel ? 5.4 : 7.6,
      );
      if (isGravel) gravelParts.push(ribbonGeo);
      else asphaltParts.push(ribbonGeo);

      if (seg.addCurbs) {
        const curbGeo = buildRoadEdgeCurbGeometry(
          sp.x1,
          sp.z1,
          sp.x2,
          sp.z2,
          seg.width,
          0.25,
          0.085,
        );
        curbParts.push(curbGeo);
      }

      // Stop dashed center markings >= 2.2m cleanly outside junctions
      if (!isGravel) {
        const sdx = sp.x2 - sp.x1;
        const sdz = sp.z2 - sp.z1;
        const slen = Math.hypot(sdx, sdz);
        if (slen > 6) {
          const yaw = Math.atan2(sdx, sdz);
          for (let dist = 2.4; dist <= slen - 2.4; dist += 3.6) {
            const px = sp.x1 + (sdx / slen) * dist;
            const pz = sp.z1 + (sdz / slen) * dist;
            dummyObj.position.set(px, computeGroundHeight(px, pz) + ROAD_LAYER_OFFSETS.markings.yOffset, pz);
            dummyObj.rotation.set(0, yaw, 0);
            dummyObj.updateMatrix();
            dashMatrices.push(dummyObj.matrix.clone());
          }
        }
      }
    }
  }

  if (gravelParts.length > 0) {
    const mergedGravel = mergeSimpleGeometries(gravelParts);
    geometries.push(mergedGravel);
    const gravelMesh = new THREE.Mesh(mergedGravel, gravelMat);
    gravelMesh.receiveShadow = true;
    registerLayeredMesh(gravelMesh, 'gravel', gravelMat);
    scene.add(gravelMesh);
  }
  if (asphaltParts.length > 0) {
    const mergedAsphalt = mergeSimpleGeometries(asphaltParts);
    geometries.push(mergedAsphalt);
    const asphaltMesh = new THREE.Mesh(mergedAsphalt, roadMat);
    asphaltMesh.receiveShadow = true;
    registerLayeredMesh(asphaltMesh, 'asphalt', roadMat);
    scene.add(asphaltMesh);
  }
  if (curbParts.length > 0) {
    const mergedCurbs = mergeSimpleGeometries(curbParts);
    geometries.push(mergedCurbs);
    const curbsMesh = new THREE.Mesh(mergedCurbs, curbStoneMat);
    curbsMesh.receiveShadow = true;
    registerLayeredMesh(curbsMesh, 'curb', curbStoneMat);
    scene.add(curbsMesh);
  }
  if (dashMatrices.length > 0) {
    const dashInst = new THREE.InstancedMesh(dashGeo, stripeAmberMat, dashMatrices.length);
    dashMatrices.forEach((m, i) => dashInst.setMatrixAt(i, m));
    dashInst.instanceMatrix.needsUpdate = true;
    dashInst.renderOrder = ROAD_LAYER_OFFSETS.markings.renderOrder;
    scene.add(dashInst);
  }

  // Smooth intersection asphalt fillet discs matching ROAD_JUNCTION_DISCS exact radii
  const junctionDiscGeo = new THREE.CylinderGeometry(1.0, 1.05, 0.03, 24);
  geometries.push(junctionDiscGeo);
  for (const jc of ROAD_JUNCTION_DISCS) {
    const gy = computeGroundHeight(jc.x, jc.z);
    const jDisc = new THREE.Mesh(junctionDiscGeo, solidRoadMat);
    jDisc.position.set(jc.x, gy + ROAD_LAYER_OFFSETS.junction.yOffset - 0.012, jc.z);
    jDisc.scale.set(jc.radius, 1, jc.radius);
    jDisc.receiveShadow = true;
    registerLayeredMesh(jDisc, 'junction', solidRoadMat);
    scene.add(jDisc);
  }

  // Lookout Hill Sloped Ramp Road + Side Curbs & Safety Guard Barriers
  const hillRampSeg = ROAD_SEGMENTS.find((s) => s.id === 'lookout-ramp');
  const hillZ1 = hillRampSeg?.z1 ?? -36.5;
  const hillZ2 = hillRampSeg?.z2 ?? -69.0;
  const hillRibbonGeo = buildTerrainRibbonGeometry(0, hillZ1, 0, hillZ2, 5.6, ROAD_LAYER_OFFSETS.asphalt.yOffset, 7.2);
  const hillCurbGeo = buildRoadEdgeCurbGeometry(0, hillZ1, 0, hillZ2, 5.6, 0.3, 0.11);
  geometries.push(hillRibbonGeo, hillCurbGeo);
  const hillRoad = new THREE.Mesh(hillRibbonGeo, roadMat);
  hillRoad.receiveShadow = true;
  registerLayeredMesh(hillRoad, 'asphalt', roadMat);
  const hillCurbs = new THREE.Mesh(hillCurbGeo, curbStoneMat);
  hillCurbs.receiveShadow = true;
  registerLayeredMesh(hillCurbs, 'curb', curbStoneMat);
  scene.add(hillRoad, hillCurbs);

  const guardPostGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.85, 8);
  const guardRailSegGeo = new THREE.BoxGeometry(0.12, 0.13, 2.75);
  geometries.push(guardPostGeo, guardRailSegGeo);
  for (const sideX of [-3.15, 3.15]) {
    for (let z = -39; z >= -62; z -= 2.5) {
      const gy = computeGroundHeight(sideX, z);
      const post = new THREE.Mesh(guardPostGeo, timberDarkMat);
      post.position.set(sideX, gy + 0.42, z);
      post.castShadow = true;
      scene.add(post);
      if (z > -62) {
        const nextGy = computeGroundHeight(sideX, z - 2.5);
        const rail = new THREE.Mesh(guardRailSegGeo, handrailTerracottaMat);
        rail.position.set(sideX, (gy + nextGy) * 0.5 + 0.66, z - 1.25);
        rail.rotation.x = Math.atan2(nextGy - gy, 2.5);
        rail.castShadow = true;
        scene.add(rail);
      }
    }
    const midGy = computeGroundHeight(sideX, -50.5);
    staticColliders.push({
      x: sideX + (sideX < 0 ? -0.15 : 0.15),
      y: midGy + 0.65,
      z: -50.5,
      hx: 0.22,
      hy: 2.8,
      hz: 11.7,
      ignoreCamera: true,
      friction: 0.04,
      kind: 'ramp-rail',
    });
  }

  // Pavement Directional Arrows along key roads (strictly on dry ground asphalt decals layer)
  const arrowGeo = new THREE.PlaneGeometry(1.75, 3.3);
  arrowGeo.rotateX(-Math.PI / 2);
  geometries.push(arrowGeo);
  const roadArrows: { x: number; z: number; yaw: number }[] = [
    { x: 0, z: -22, yaw: 0 },
    { x: 0, z: -44, yaw: 0 },
    { x: 0, z: 22, yaw: Math.PI },
    { x: 40, z: -8.5, yaw: 0 },
    { x: 40, z: -35.5, yaw: Math.PI },
    { x: 13.8, z: -31.1, yaw: -1.2 },
    { x: 32.1, z: -10.8, yaw: 0.35 },
    {
      x: -58.5,
      z: 13.3,
      yaw: Math.atan2(-WEST_RIDGE_TUNNEL_DEF.dirX, -WEST_RIDGE_TUNNEL_DEF.dirZ),
    },
  ];
  for (const arr of roadArrows) {
    const gy = computeGroundHeight(arr.x, arr.z);
    const m = new THREE.Mesh(arrowGeo, roadArrowMat);
    m.position.set(arr.x, gy + ROAD_LAYER_OFFSETS.decals.yOffset, arr.z);
    m.rotation.y = arr.yaw;
    registerLayeredMesh(m, 'decals', roadArrowMat);
    scene.add(m);
  }

  // =========================================================================
  // 3. THE PADDOCK OVAL RACING CIRCUIT & START/FINISH GANTRY (PADDOCK_CENTER)
  // =========================================================================
  const padEntryAng = Math.atan2(PADDOCK_ENTRY_POS.z - PADDOCK_CENTER.z, PADDOCK_ENTRY_POS.x - PADDOCK_CENTER.x);
  const paddockRingGeo = new THREE.RingGeometry(
    PADDOCK_TRACK_DEF.innerRadius,
    PADDOCK_TRACK_DEF.outerRadius,
    60,
  );
  paddockRingGeo.rotateX(-Math.PI / 2);
  const paddockCenterLineGeo = new THREE.RingGeometry(17.9, 18.14, 60);
  paddockCenterLineGeo.rotateX(-Math.PI / 2);
  const paddockCurbInGeo = buildSegmentedRingArc(15.1, 15.45, [{ ang: padEntryAng, halfGap: 0.16 }]);
  const paddockCurbOutGeo = buildSegmentedRingArc(20.55, 20.92, [{ ang: padEntryAng, halfGap: 0.16 }]);
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
  paddockRing.position.set(PADDOCK_CENTER.x, ROAD_LAYER_OFFSETS.asphalt.yOffset, PADDOCK_CENTER.z);
  paddockRing.receiveShadow = true;
  registerLayeredMesh(paddockRing, 'asphalt', solidRoadMat);
  const paddockCenterLine = new THREE.Mesh(paddockCenterLineGeo, stripeAmberMat);
  paddockCenterLine.position.set(PADDOCK_CENTER.x, ROAD_LAYER_OFFSETS.markings.yOffset, PADDOCK_CENTER.z);
  registerLayeredMesh(paddockCenterLine, 'markings', stripeAmberMat);
  const paddockCurbIn = new THREE.Mesh(paddockCurbInGeo, curbStoneMat);
  paddockCurbIn.position.set(PADDOCK_CENTER.x, ROAD_LAYER_OFFSETS.curb.yOffset, PADDOCK_CENTER.z);
  registerLayeredMesh(paddockCurbIn, 'curb', curbStoneMat);
  const paddockCurbOut = new THREE.Mesh(paddockCurbOutGeo, curbStoneMat);
  paddockCurbOut.position.set(PADDOCK_CENTER.x, ROAD_LAYER_OFFSETS.curb.yOffset, PADDOCK_CENTER.z);
  registerLayeredMesh(paddockCurbOut, 'curb', curbStoneMat);
  const stripMat = new THREE.MeshStandardMaterial({
    map: procTex.checkeredStrip,
    roughness: 0.72,
    polygonOffset: true,
    polygonOffsetFactor: ROAD_LAYER_OFFSETS.decals.polygonOffsetFactor,
    polygonOffsetUnits: ROAD_LAYER_OFFSETS.decals.polygonOffsetUnits,
  });
  materials.push(stripMat);
  const startStrip = new THREE.Mesh(paddockStartStripGeo, stripMat);
  startStrip.position.set(PADDOCK_CENTER.x, ROAD_LAYER_OFFSETS.decals.yOffset, PADDOCK_CENTER.z - 18);
  registerLayeredMesh(startStrip, 'decals', stripMat);
  scene.add(paddockRing, paddockCenterLine, paddockCurbIn, paddockCurbOut, startStrip);

  // Alternating Red & Cream Apex Curb Blocks on Paddock Corners (clear of Paddock entry)
  const curbBlockGeo = new THREE.BoxGeometry(0.95, 0.16, 1.35);
  geometries.push(curbBlockGeo);
  const curbRedMat = new THREE.MeshStandardMaterial({ color: 0xe65448, roughness: 0.65 });
  materials.push(curbRedMat);
  for (let i = 0; i < 20; i++) {
    const ang = (i / 20) * Math.PI * 2;
    const diff = Math.abs(Math.atan2(Math.sin(ang - padEntryAng), Math.cos(ang - padEntryAng)));
    if (diff < 0.24) continue;
    const cx = PADDOCK_CENTER.x + Math.cos(ang) * 21.15;
    const cz = PADDOCK_CENTER.z + Math.sin(ang) * 21.15;
    const cb = new THREE.Mesh(curbBlockGeo, i % 2 === 0 ? curbRedMat : creamMat);
    cb.position.set(cx, 0.08, cz);
    cb.rotation.y = -ang;
    cb.receiveShadow = true;
    scene.add(cb);
  }

  // Start / Finish Overhead Gantry Arch straddling North Paddock Curve
  const gantryPillarGeo = new THREE.BoxGeometry(0.45, 4.4, 0.45);
  const gantryCrossGeo = new THREE.BoxGeometry(0.42, 0.65, 7.2);
  const gantryBannerGeo = new THREE.PlaneGeometry(5.6, 0.56);
  geometries.push(gantryPillarGeo, gantryCrossGeo, gantryBannerGeo);
  const gantryGroup = new THREE.Group();
  gantryGroup.position.set(PADDOCK_CENTER.x, 0, PADDOCK_CENTER.z - 18);
  const gLeft = new THREE.Mesh(gantryPillarGeo, roofDarkMat);
  gLeft.position.set(0, 2.2, -3.35);
  gLeft.castShadow = true;
  const gRight = new THREE.Mesh(gantryPillarGeo, roofDarkMat);
  gRight.position.set(0, 2.2, 3.35);
  gRight.castShadow = true;
  const gBar = new THREE.Mesh(gantryCrossGeo, terracottaMat);
  gBar.position.set(0, 4.25, 0);
  gBar.castShadow = true;
  const gFrontFace = new THREE.Mesh(gantryBannerGeo, stripMat);
  gFrontFace.position.set(0.22, 4.25, 0);
  gFrontFace.rotation.y = Math.PI / 2;
  const gBackFace = new THREE.Mesh(gantryBannerGeo, stripMat);
  gBackFace.position.set(-0.22, 4.25, 0);
  gBackFace.rotation.y = -Math.PI / 2;
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
  // Flush stone abutment transition aprons at Main Bridge ends so tires glide seamlessly
  const mainApronGeo = new THREE.BoxGeometry(MAIN_LAGOON_BRIDGE.deckHalfWidth * 2, 0.08, 1.15);
  geometries.push(mainApronGeo);
  for (const az of [
    MAIN_LAGOON_BRIDGE.zCenter - MAIN_LAGOON_BRIDGE.halfLength,
    MAIN_LAGOON_BRIDGE.zCenter + MAIN_LAGOON_BRIDGE.halfLength,
  ]) {
    const apron = new THREE.Mesh(mainApronGeo, curbStoneMat);
    apron.position.set(MAIN_LAGOON_BRIDGE.x, MAIN_LAGOON_BRIDGE.baseY - 0.015, az);
    apron.receiveShadow = true;
    mainBridge.add(apron);
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
      kind: 'bridge-rail',
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
      kind: 'bridge-rail',
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
  // Flush stone abutment transition aprons at Viaduct ends
  const vApronGeo = new THREE.BoxGeometry(vHalfW * 2, 0.075, 1.05);
  geometries.push(vApronGeo);
  for (const endAng of [vA0, vA1]) {
    const endApron = new THREE.Mesh(vApronGeo, curbStoneMat);
    endApron.position.set(
      Math.cos(endAng) * vRad,
      RING_LAGOON_VIADUCT.baseY - 0.015,
      Math.sin(endAng) * vRad,
    );
    endApron.rotation.y = Math.atan2(-Math.sin(endAng), Math.cos(endAng));
    endApron.receiveShadow = true;
    viaductGroup.add(endApron);
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
        kind: 'bridge-rail',
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
  // Flush stone threshold slabs at South Cove bridge abutments
  const cApronGeo = new THREE.BoxGeometry(1.1, 0.07, SOUTH_COVE_BRIDGE.deckHalfWidth * 2);
  geometries.push(cApronGeo);
  for (const endX of [cXMin, cXMax]) {
    const apron = new THREE.Mesh(cApronGeo, curbStoneMat);
    apron.position.set(endX, SOUTH_COVE_BRIDGE.baseY - 0.015, SOUTH_COVE_BRIDGE.z);
    apron.receiveShadow = true;
    coveBridge.add(apron);
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
      kind: 'bridge-rail',
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
      kind: 'bridge-rail',
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
  // 7A. EAST COASTAL SHORELINE OVERLOOK & BOLLARD RAILINGS (x: 59..69.5, z: -12.8..-17.8)
  // =========================================================================
  const overlookGroup = new THREE.Group();
  const overlookPadGeo = new THREE.BoxGeometry(8.8, 0.16, 2.4);
  const overlookBollardGeo = new THREE.CylinderGeometry(0.11, 0.14, 0.96, 8);
  const overlookRailGeo = new THREE.CylinderGeometry(0.045, 0.045, 2.25, 6);
  overlookRailGeo.rotateZ(Math.PI / 2);
  const benchSeatGeo = new THREE.BoxGeometry(1.75, 0.1, 0.56);
  const benchLegGeo = new THREE.BoxGeometry(0.12, 0.38, 0.48);
  geometries.push(
    overlookPadGeo,
    overlookBollardGeo,
    overlookRailGeo,
    benchSeatGeo,
    benchLegGeo,
  );

  const overlookAnchorGy = computeGroundHeight(64.2, -11.9);
  const overlookPad = new THREE.Mesh(overlookPadGeo, curbStoneMat);
  overlookPad.position.set(64.2, overlookAnchorGy + 0.04, -11.9);
  overlookPad.receiveShadow = true;
  overlookGroup.add(overlookPad);

  const overlookPosts = [
    { x: 59.8, z: -12.9 },
    { x: 62.0, z: -12.9 },
    { x: 64.2, z: -12.9 },
    { x: 66.4, z: -12.9 },
    { x: 68.6, z: -13.6 },
    { x: 70.2, z: -15.2 },
  ];
  for (let i = 0; i < overlookPosts.length; i++) {
    const pt = overlookPosts[i];
    const pGy = computeGroundHeight(pt.x, pt.z);
    const post = new THREE.Mesh(overlookBollardGeo, timberDarkMat);
    post.position.set(pt.x, pGy + 0.46, pt.z);
    post.castShadow = true;
    overlookGroup.add(post);

    if (i < overlookPosts.length - 1) {
      const nxt = overlookPosts[i + 1];
      const nGy = computeGroundHeight(nxt.x, nxt.z);
      const dx = nxt.x - pt.x;
      const dz = nxt.z - pt.z;
      const dist = Math.hypot(dx, dz);
      const rail = new THREE.Mesh(overlookRailGeo, timberWarmMat);
      rail.scale.set(dist / 2.25, 1, 1);
      rail.position.set((pt.x + nxt.x) * 0.5, (pGy + nGy) * 0.5 + 0.78, (pt.z + nxt.z) * 0.5);
      rail.rotation.y = -Math.atan2(dz, dx);
      rail.castShadow = true;
      overlookGroup.add(rail);
    }
  }

  for (const bx of [61.8, 66.2]) {
    const bGy = computeGroundHeight(bx, -11.6);
    const seat = new THREE.Mesh(benchSeatGeo, timberWarmMat);
    seat.position.set(bx, bGy + 0.44, -11.6);
    seat.castShadow = true;
    seat.receiveShadow = true;
    const legL = new THREE.Mesh(benchLegGeo, masonryMat);
    legL.position.set(bx - 0.66, bGy + 0.22, -11.6);
    const legR = new THREE.Mesh(benchLegGeo, masonryMat);
    legR.position.set(bx + 0.66, bGy + 0.22, -11.6);
    overlookGroup.add(seat, legL, legR);
  }
  scene.add(overlookGroup);
  staticColliders.push({
    x: 64.2,
    y: overlookAnchorGy + 0.5,
    z: -12.9,
    hx: 4.5,
    hy: 0.7,
    hz: 0.25,
    ignoreCamera: true,
    kind: 'prop',
  });

  // =========================================================================
  // 7B. BRIDGE 4: FOREST TRAIL BROOK TIMBER BRIDGE (z = -84, x in [-111.5, -96.5])
  // =========================================================================
  const forestBridge = new THREE.Group();
  const fbXMin = FOREST_BROOK_BRIDGE.xCenter - FOREST_BROOK_BRIDGE.halfLength;
  const fbXMax = FOREST_BROOK_BRIDGE.xCenter + FOREST_BROOK_BRIDGE.halfLength;
  const fbSteps = 18;
  const fbSpanLen = (fbXMax - fbXMin) / fbSteps;

  const fbSubGeo = new THREE.BoxGeometry(fbSpanLen + 0.14, 0.12, FOREST_BROOK_BRIDGE.deckHalfWidth * 2);
  const fbStringerGeo = new THREE.BoxGeometry(fbSpanLen + 0.14, 0.24, 0.18);
  const fbPlankGeo = new THREE.BoxGeometry(0.56, 0.07, FOREST_BROOK_BRIDGE.deckHalfWidth * 1.92);
  const fbPostGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.92, 8);
  const fbRailGeo = new THREE.BoxGeometry(1.38, 0.09, 0.11);
  const fbPilingGeo = new THREE.CylinderGeometry(0.14, 0.17, 2.3, 8);
  const fbEndPostGeo = new THREE.BoxGeometry(0.38, 1.35, 0.38);
  geometries.push(
    fbSubGeo,
    fbStringerGeo,
    fbPlankGeo,
    fbPostGeo,
    fbRailGeo,
    fbPilingGeo,
    fbEndPostGeo,
  );

  for (let i = 0; i < fbSteps; i++) {
    const x0 = fbXMin + i * fbSpanLen;
    const x1 = x0 + fbSpanLen;
    const xm = (x0 + x1) * 0.5;
    const y0 = computeBridgeSurfaceY(x0, FOREST_BROOK_BRIDGE.z) ?? FOREST_BROOK_BRIDGE.baseY;
    const y1 = computeBridgeSurfaceY(x1, FOREST_BROOK_BRIDGE.z) ?? FOREST_BROOK_BRIDGE.baseY;
    const ym = (y0 + y1) * 0.5;
    const rollZ = Math.atan2(y1 - y0, x1 - x0);

    const sub = new THREE.Mesh(fbSubGeo, timberSubDeckMat);
    sub.position.set(xm, ym - 0.11, FOREST_BROOK_BRIDGE.z);
    sub.rotation.z = rollZ;
    sub.castShadow = true;
    sub.receiveShadow = true;
    forestBridge.add(sub);

    const plank = new THREE.Mesh(fbPlankGeo, timberPool[i % timberPool.length]);
    plank.position.set(xm, ym - 0.032, FOREST_BROOK_BRIDGE.z);
    plank.rotation.z = rollZ;
    plank.receiveShadow = true;
    plank.castShadow = true;
    forestBridge.add(plank);

    for (const sideZ of [FOREST_BROOK_BRIDGE.z - 1.72, FOREST_BROOK_BRIDGE.z + 1.72]) {
      const str = new THREE.Mesh(fbStringerGeo, timberDarkMat);
      str.position.set(xm, ym - 0.2, sideZ);
      str.rotation.z = rollZ;
      str.castShadow = true;
      forestBridge.add(str);
    }
  }

  for (const px of [-108.0, -104.0, -100.0]) {
    const deckY = computeBridgeSurfaceY(px, FOREST_BROOK_BRIDGE.z) ?? 1.5;
    for (const pz of [FOREST_BROOK_BRIDGE.z - 1.56, FOREST_BROOK_BRIDGE.z + 1.56]) {
      const pile = new THREE.Mesh(fbPilingGeo, timberDarkMat);
      pile.position.set(px, deckY - 1.25, pz);
      pile.castShadow = true;
      forestBridge.add(pile);
    }
  }

  const fbRailSteps = 12;
  const fbRailSpan = (fbXMax - fbXMin) / fbRailSteps;
  for (const sideZ of [FOREST_BROOK_BRIDGE.z - 1.78, FOREST_BROOK_BRIDGE.z + 1.78]) {
    for (let i = 0; i <= fbRailSteps; i++) {
      const px = fbXMin + i * fbRailSpan;
      const py = computeBridgeSurfaceY(px, FOREST_BROOK_BRIDGE.z) ?? FOREST_BROOK_BRIDGE.baseY;
      if (i > 0 && i < fbRailSteps) {
        const post = new THREE.Mesh(fbPostGeo, timberDarkMat);
        post.position.set(px, py + 0.44, sideZ);
        post.castShadow = true;
        forestBridge.add(post);
      }
      if (i < fbRailSteps) {
        const nx = px + fbRailSpan;
        const ny = computeBridgeSurfaceY(nx, FOREST_BROOK_BRIDGE.z) ?? FOREST_BROOK_BRIDGE.baseY;
        const rail = new THREE.Mesh(fbRailGeo, timberWarmMat);
        rail.position.set((px + nx) * 0.5, (py + ny) * 0.5 + 0.84, sideZ);
        rail.rotation.z = Math.atan2(ny - py, fbRailSpan);
        rail.castShadow = true;
        forestBridge.add(rail);
      }
    }
  }

  for (const endX of [fbXMin + 0.15, fbXMax - 0.15]) {
    const endY = computeBridgeSurfaceY(endX, FOREST_BROOK_BRIDGE.z) ?? FOREST_BROOK_BRIDGE.baseY;
    for (const sideZ of [FOREST_BROOK_BRIDGE.z - 1.82, FOREST_BROOK_BRIDGE.z + 1.82]) {
      const ep = new THREE.Mesh(fbEndPostGeo, masonryMat);
      ep.position.set(endX, endY + 0.58, sideZ);
      ep.castShadow = true;
      forestBridge.add(ep);
      createArchitecturalLantern(
        forestBridge,
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
  const fbApronGeo = new THREE.BoxGeometry(1.05, 0.07, FOREST_BROOK_BRIDGE.deckHalfWidth * 2);
  geometries.push(fbApronGeo);
  for (const endX of [fbXMin, fbXMax]) {
    const apronY = computeGroundHeight(endX, FOREST_BROOK_BRIDGE.z);
    const apron = new THREE.Mesh(fbApronGeo, curbStoneMat);
    apron.position.set(endX, apronY - 0.015, FOREST_BROOK_BRIDGE.z);
    apron.receiveShadow = true;
    forestBridge.add(apron);
  }
  scene.add(forestBridge);

  staticColliders.push(
    {
      x: FOREST_BROOK_BRIDGE.xCenter,
      y: 1.9,
      z: FOREST_BROOK_BRIDGE.z - 2.02,
      hx: FOREST_BROOK_BRIDGE.halfLength,
      hy: 1.0,
      hz: 0.24,
      ignoreCamera: true,
      friction: 0.04,
      kind: 'bridge-rail',
    },
    {
      x: FOREST_BROOK_BRIDGE.xCenter,
      y: 1.9,
      z: FOREST_BROOK_BRIDGE.z + 2.02,
      hx: FOREST_BROOK_BRIDGE.halfLength,
      hy: 1.0,
      hz: 0.24,
      ignoreCamera: true,
      friction: 0.04,
      kind: 'bridge-rail',
    },
  );

  // =========================================================================
  // 7C. STUNT & DRIFT ARENA TARMAC PAD, LAUNCH RAMPS, SKY PLATFORMS & PARKING BAYS
  // =========================================================================
  const arenaGroup = new THREE.Group();
  const arenaPadGeo = new THREE.PlaneGeometry(68, 78);
  arenaPadGeo.rotateX(-Math.PI / 2);
  geometries.push(arenaPadGeo);
  const arenaPad = new THREE.Mesh(arenaPadGeo, solidRoadMat);
  arenaPad.position.set(108, 0.025, 76);
  arenaPad.receiveShadow = true;
  arenaGroup.add(arenaPad);

  // Arena apex perimeter curb blocks along East/South/West border
  const arenaCurbGeo = new THREE.BoxGeometry(1.4, 0.16, 0.72);
  geometries.push(arenaCurbGeo);
  const arenaBorderPoints: { x: number; z: number; rotY: number }[] = [];
  for (let x = 76; x <= 140; x += 2.6) {
    arenaBorderPoints.push({ x, z: 37.2, rotY: 0 });
    arenaBorderPoints.push({ x, z: 114.8, rotY: 0 });
  }
  for (let z = 39; z <= 113; z += 2.6) {
    if (z < 47 || z > 57) arenaBorderPoints.push({ x: 74.2, z, rotY: Math.PI / 2 });
    arenaBorderPoints.push({ x: 141.8, z, rotY: Math.PI / 2 });
  }
  arenaBorderPoints.forEach((pt, idx) => {
    const cb = new THREE.Mesh(arenaCurbGeo, idx % 2 === 0 ? curbRedMat : creamMat);
    cb.position.set(pt.x, 0.08, pt.z);
    cb.rotation.y = pt.rotY;
    cb.receiveShadow = true;
    arenaGroup.add(cb);
  });

  // Drift hairpin dashed arc markings inside Stunt & Drift Arena
  const driftLaneGeo = new THREE.RingGeometry(15.2, 15.65, 36);
  driftLaneGeo.rotateX(-Math.PI / 2);
  geometries.push(driftLaneGeo);
  const driftRing = new THREE.Mesh(driftLaneGeo, stripeAmberMat);
  driftRing.position.set(108, 0.038, 72);
  arenaGroup.add(driftRing);

  // Sculpted 3D Launch Ramps matching physicsMath.computeGroundHeight 1:1
  const rampLipMat = new THREE.MeshStandardMaterial({
    color: 0xffb347,
    emissive: 0xec6d2c,
    emissiveIntensity: 0.28,
    roughness: 0.45,
  });
  const skyDeckMat = new THREE.MeshStandardMaterial({
    color: 0x263238,
    roughness: 0.55,
    metalness: 0.32,
  });
  const skyRimMat = new THREE.MeshStandardMaterial({
    color: 0x21968b,
    emissive: 0x27c2b4,
    emissiveIntensity: 0.45,
    roughness: 0.35,
  });
  materials.push(rampLipMat, skyDeckMat, skyRimMat);

  for (const ramp of STUNT_ARENA_RAMPS) {
    const segs = 12;
    const hw = ramp.width * 0.5;
    const hl = ramp.length * 0.5;
    const rPos: number[] = [];
    const rUvs: number[] = [];
    const rIdx: number[] = [];

    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const lz = -hl + t * ramp.length;
      const y = ramp.height * Math.pow(t, 1.32);
      rPos.push(-hw, y + 0.02, lz, hw, y + 0.02, lz);
      rUvs.push(0, t * 2, 1, t * 2);
      if (i < segs) {
        const b = i * 2;
        rIdx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
      }
    }
    const rGeo = new THREE.BufferGeometry();
    rGeo.setAttribute('position', new THREE.Float32BufferAttribute(rPos, 3));
    rGeo.setAttribute('uv', new THREE.Float32BufferAttribute(rUvs, 2));
    rGeo.setIndex(rIdx);
    rGeo.computeVertexNormals();

    // Side structural wedge walls for solid silhouette
    const sideShape = new THREE.Shape();
    sideShape.moveTo(-hl, 0);
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      sideShape.lineTo(-hl + t * ramp.length, ramp.height * Math.pow(t, 1.32));
    }
    sideShape.lineTo(hl, 0);
    sideShape.closePath();
    const sideWallGeo = new THREE.ExtrudeGeometry(sideShape, { depth: 0.24, bevelEnabled: false });
    sideWallGeo.rotateY(Math.PI / 2);

    const lipGeo = new THREE.BoxGeometry(ramp.width + 0.1, 0.16, 0.55);
    geometries.push(rGeo, sideWallGeo, lipGeo);

    const rGrp = new THREE.Group();
    rGrp.position.set(ramp.x, 0, ramp.z);
    rGrp.rotation.y = ramp.yaw;

    const topMesh = new THREE.Mesh(rGeo, roadMat);
    topMesh.castShadow = true;
    topMesh.receiveShadow = true;

    const leftWall = new THREE.Mesh(sideWallGeo, terracottaMat);
    leftWall.position.x = -hw;
    leftWall.castShadow = true;
    const rightWall = new THREE.Mesh(sideWallGeo, terracottaMat);
    rightWall.position.x = hw - 0.24;
    rightWall.castShadow = true;

    const lip = new THREE.Mesh(lipGeo, rampLipMat);
    lip.position.set(0, ramp.height - 0.06, hl - 0.25);

    rGrp.add(topMesh, leftWall, rightWall, lip);
    arenaGroup.add(rGrp);
  }

  // Elevated Double-Jump Sky Platforms + Truss Legs
  const trussLegGeo = new THREE.CylinderGeometry(0.18, 0.24, 1, 8);
  geometries.push(trussLegGeo);
  for (const plat of DOUBLE_JUMP_PLATFORMS) {
    const deckGeo = new THREE.BoxGeometry(plat.width, plat.thickness, plat.length);
    const rimGeo = new THREE.BoxGeometry(plat.width + 0.22, 0.14, plat.length + 0.22);
    geometries.push(deckGeo, rimGeo);

    const pGrp = new THREE.Group();
    pGrp.position.set(plat.x, 0, plat.z);

    const deck = new THREE.Mesh(deckGeo, skyDeckMat);
    deck.position.y = plat.y - plat.thickness * 0.5;
    deck.castShadow = true;
    deck.receiveShadow = true;

    const rim = new THREE.Mesh(rimGeo, skyRimMat);
    rim.position.y = plat.y - 0.09;
    pGrp.add(deck, rim);

    const legH = plat.y - plat.thickness;
    for (const lx of [-(plat.width * 0.42), plat.width * 0.42]) {
      for (const lz of [-(plat.length * 0.42), plat.length * 0.42]) {
        const leg = new THREE.Mesh(trussLegGeo, roofDarkMat);
        leg.scale.set(1, legH, 1);
        leg.position.set(lx, legH * 0.5, lz);
        leg.castShadow = true;
        pGrp.add(leg);
      }
    }
    arenaGroup.add(pGrp);
  }

  // Precision Parking Bay Line Markings (Bay A, Bay B, Bay C)
  for (const bay of PRECISION_PARKING_BAYS) {
    const bayGrp = new THREE.Group();
    bayGrp.position.set(bay.x, 0.04, bay.z);
    bayGrp.rotation.y = bay.targetYaw;
    const hw = bay.width * 0.5;
    const hl = bay.length * 0.5;
    const sideLineGeo = new THREE.BoxGeometry(0.16, 0.02, bay.length);
    const endLineGeo = new THREE.BoxGeometry(bay.width + 0.16, 0.02, 0.16);
    geometries.push(sideLineGeo, endLineGeo);
    const lLeft = new THREE.Mesh(sideLineGeo, stripeWhiteMat);
    lLeft.position.set(-hw, 0, 0);
    const lRight = new THREE.Mesh(sideLineGeo, stripeWhiteMat);
    lRight.position.set(hw, 0, 0);
    const lFront = new THREE.Mesh(endLineGeo, stripeAmberMat);
    lFront.position.set(0, 0, hl);
    const lBack = new THREE.Mesh(endLineGeo, stripeWhiteMat);
    lBack.position.set(0, 0, -hl);
    bayGrp.add(lLeft, lRight, lFront, lBack);
    arenaGroup.add(bayGrp);
  }

  scene.add(arenaGroup);

  // =========================================================================
  // 8. DIRECTIONAL ROAD SIGNS & SQL VALLEY SIGNS (strictly roadside clear)
  // =========================================================================
  const rPostGeo = new THREE.CylinderGeometry(0.1, 0.12, 2.3, 8);
  const rPlinthGeo = new THREE.CylinderGeometry(0.2, 0.24, 0.24, 8);
  const rFrameGeo = new THREE.BoxGeometry(2.74, 1.32, 0.1);
  const rBoardGeo = new THREE.BoxGeometry(2.58, 1.18, 0.14);
  geometries.push(rPostGeo, rPlinthGeo, rFrameGeo, rBoardGeo);

  for (const sd of DIRECTIONAL_SIGNS) {
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
    const lx = Math.cos(a) * 38.2;
    const lz = Math.sin(a) * 38.2;
    if (!isPointClearForProp(lx, lz, 0.95) || isNearRoadOrBuilding(lx, lz)) continue;
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
  // 10. POOLED BRIDGE POINT LIGHTS (atmospheric dusk/night glow without excessive light count)
  // =========================================================================
  const mainBridgeLight = new THREE.PointLight(0xffb866, 0.65, 34, 1.5);
  mainBridgeLight.position.set(MAIN_LAGOON_BRIDGE.x, 3.6, MAIN_LAGOON_BRIDGE.zCenter);

  const coveBridgeLight = new THREE.PointLight(0xffb866, 0.55, 28, 1.5);
  coveBridgeLight.position.set(SOUTH_COVE_BRIDGE.xCenter, 2.75, SOUTH_COVE_BRIDGE.z);

  scene.add(mainBridgeLight, coveBridgeLight);

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
          : weather === 'rain' || weather === 'fog' || weather === 'storm'
            ? 0.34
            : 0.0);
    const baseIntensity = 0.55 + targetGlow * 2.35;
    const flicker = Math.sin(motionTime * 2.2) * (0.08 + targetGlow * 0.1);
    mainBridgeLight.intensity = baseIntensity + flicker;
    coveBridgeLight.intensity = baseIntensity * 0.84 - flicker * 0.6;
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

  const setRoadLayerDebug = (enabled: boolean) => {
    for (const item of layeredMeshes) {
      item.mesh.material = enabled ? (debugLayerMats.get(item.layer) ?? item.normalMat) : item.normalMat;
    }
  };

  return { updateLighting, setWetness, setRoadLayerDebug };
}
