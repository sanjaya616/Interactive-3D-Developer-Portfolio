import * as THREE from 'three';
import type { QualityLevel, WeatherMode, WindMode } from '../types/portfolio';
import type { ProceduralTextureSet } from './proceduralTextures';
import {
  generateWorldVegetationLayout,
  resolveWindProfile,
  type StaticTreeCollider,
  type VegetationPlacement,
} from './vegetationPlacement';

export interface VegetationSystemResult {
  staticColliders: StaticTreeCollider[];
  setWindProfile: (weather: WeatherMode, windMode: WindMode) => void;
  setPerformanceProfile: (quality: QualityLevel, reducedMotion: boolean) => void;
  update: (motionTime: number, dt: number) => void;
}

interface PartBufferInput {
  geo: THREE.BufferGeometry;
  swayFn: (x: number, y: number, z: number) => [number, number, number];
  partKind: number;
}

/**
 * Merges multiple primitives / custom buffers into a single non-indexed BufferGeometry
 * with unified position, normal, uv, aSwayData (vec3), and aPartKind (float) attributes.
 */
function mergeVegetationParts(parts: PartBufferInput[]): THREE.BufferGeometry {
  const nonIndexed = parts.map((p) => ({
    geo: p.geo.index ? p.geo.toNonIndexed() : p.geo,
    swayFn: p.swayFn,
    partKind: p.partKind,
  }));

  let totalVerts = 0;
  for (const item of nonIndexed) {
    totalVerts += item.geo.attributes.position.count;
  }

  const posArr = new Float32Array(totalVerts * 3);
  const normArr = new Float32Array(totalVerts * 3);
  const uvArr = new Float32Array(totalVerts * 2);
  const swayArr = new Float32Array(totalVerts * 3);
  const partArr = new Float32Array(totalVerts);

  let cursor = 0;
  for (const item of nonIndexed) {
    const pos = item.geo.attributes.position;
    let norm = item.geo.attributes.normal;
    if (!norm) {
      item.geo.computeVertexNormals();
      norm = item.geo.attributes.normal;
    }
    const uv = item.geo.attributes.uv;

    for (let i = 0; i < pos.count; i++) {
      const idx3 = (cursor + i) * 3;
      const idx2 = (cursor + i) * 2;
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      posArr[idx3] = x;
      posArr[idx3 + 1] = y;
      posArr[idx3 + 2] = z;

      normArr[idx3] = norm.getX(i);
      normArr[idx3 + 1] = norm.getY(i);
      normArr[idx3 + 2] = norm.getZ(i);

      uvArr[idx2] = uv ? uv.getX(i) : x * 0.4 + 0.5;
      uvArr[idx2 + 1] = uv ? uv.getY(i) : y * 0.4;

      const [swTrunk, swFlutter, swPhase] = item.swayFn(x, y, z);
      swayArr[idx3] = swTrunk;
      swayArr[idx3 + 1] = swFlutter;
      swayArr[idx3 + 2] = swPhase;

      partArr[cursor + i] = item.partKind;
    }
    cursor += pos.count;
    item.geo.dispose();
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(normArr, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
  out.setAttribute('aSwayData', new THREE.BufferAttribute(swayArr, 3));
  out.setAttribute('aPartKind', new THREE.BufferAttribute(partArr, 1));
  out.computeBoundingSphere();
  return out;
}

/**
 * Sculpts an organic fluted conifer cone tier with scalloped bough ridges.
 */
function createFlutedPineTier(
  baseRadius: number,
  height: number,
  yBase: number,
  radialSegments = 10,
  lobeFreq = 5,
): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(baseRadius, height, radialSegments * 2, 3);
  geo.translate(0, yBase + height * 0.5, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r > 0.04) {
      const ang = Math.atan2(z, x);
      const tH = THREE.MathUtils.clamp((y - yBase) / height, 0, 1);
      const flute = 1 + 0.16 * Math.cos(ang * lobeFreq + tH * 1.4) * (1 - tH * 0.65);
      pos.setX(i, x * flute);
      pos.setZ(i, z * flute);
      // Slight graceful bough droop at outer rim
      pos.setY(i, y - (r / baseRadius) * 0.18 * (1 - tH));
    }
  }
  geo.computeVertexNormals();
  return geo;
}

function createSculptedPineGeometry(): { trunk: THREE.BufferGeometry; canopy: THREE.BufferGeometry } {
  const trunkMain = new THREE.CylinderGeometry(0.16, 0.34, 3.2, 8);
  trunkMain.translate(0, 1.54, 0);
  const rootFlare = new THREE.CylinderGeometry(0.3, 0.46, 0.48, 7);
  rootFlare.translate(0, 0.18, 0);
  const upperSpire = new THREE.CylinderGeometry(0.06, 0.16, 2.2, 6);
  upperSpire.translate(0, 4.1, 0);

  const trunk = mergeVegetationParts([
    {
      geo: trunkMain,
      partKind: 0,
      swayFn: (_x, y) => [Math.pow(Math.max(0, y) / 6.2, 1.45), 0.02, 0],
    },
    {
      geo: rootFlare,
      partKind: 0,
      swayFn: (_x, y) => [Math.pow(Math.max(0, y) / 6.2, 1.45), 0, 0],
    },
    {
      geo: upperSpire,
      partKind: 0,
      swayFn: (_x, y) => [Math.pow(Math.max(0, y) / 6.2, 1.45), 0.05, 0],
    },
  ]);

  const tier1 = createFlutedPineTier(2.05, 2.4, 1.75, 9, 6);
  const tier2 = createFlutedPineTier(1.68, 2.15, 3.15, 9, 5);
  tier2.rotateY(0.35);
  const tier3 = createFlutedPineTier(1.24, 1.85, 4.45, 8, 5);
  tier3.rotateY(0.7);
  const tier4 = createFlutedPineTier(0.72, 1.4, 5.65, 7, 4);

  const canopy = mergeVegetationParts([
    {
      geo: tier1,
      partKind: 0,
      swayFn: (x, y, z) => [
        Math.pow(Math.max(0, y) / 6.2, 1.45),
        Math.min(1, Math.hypot(x, z) * 0.42),
        Math.atan2(z, x),
      ],
    },
    {
      geo: tier2,
      partKind: 0,
      swayFn: (x, y, z) => [
        Math.pow(Math.max(0, y) / 6.2, 1.45),
        Math.min(1, Math.hypot(x, z) * 0.48),
        Math.atan2(z, x) + 0.9,
      ],
    },
    {
      geo: tier3,
      partKind: 0,
      swayFn: (x, y, z) => [
        Math.pow(Math.max(0, y) / 6.2, 1.45),
        Math.min(1, Math.hypot(x, z) * 0.56),
        Math.atan2(z, x) + 1.8,
      ],
    },
    {
      geo: tier4,
      partKind: 0,
      swayFn: (x, y, z) => [
        Math.pow(Math.max(0, y) / 6.2, 1.45),
        Math.min(1, Math.hypot(x, z) * 0.68),
        Math.atan2(z, x) + 2.6,
      ],
    },
  ]);

  return { trunk, canopy };
}

/**
 * Builds a curved ringed coconut palm trunk ending at a precise crown hub,
 * paired with 9 individually curved, multi-leaflet tropical palm fronds.
 */
function createTropicalPalmGeometry(): { trunk: THREE.BufferGeometry; crown: THREE.BufferGeometry } {
  const segments = 12;
  const radialSegs = 8;
  const totalHeight = 5.15;
  const tipOffsetX = 0.58;
  const tipOffsetZ = 0.16;

  const evalCurve = (t: number): [number, number, number] => [
    tipOffsetX * Math.pow(t, 1.75),
    -0.06 + (totalHeight + 0.06) * t,
    tipOffsetZ * Math.sin(t * Math.PI * 0.65),
  ];

  const trunkPositions: number[] = [];
  const trunkNormals: number[] = [];
  const trunkUvs: number[] = [];
  const trunkIndices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const [cx, cy, cz] = evalCurve(t);
    // Subtle ring flare ridges every segment (palm bark rings)
    const baseR = THREE.MathUtils.lerp(0.32, 0.15, t);
    const collar = i > 0 && i < segments ? (i % 2 === 0 ? 1.09 : 0.95) : i === 0 ? 1.25 : 1.0;
    const radius = baseR * collar;

    for (let a = 0; a <= radialSegs; a++) {
      const theta = (a / radialSegs) * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      trunkPositions.push(cx + cosT * radius, cy, cz + sinT * radius);
      trunkNormals.push(cosT, 0.15, sinT);
      trunkUvs.push(a / radialSegs, t * 5.0);
    }
  }

  const ringStride = radialSegs + 1;
  for (let i = 0; i < segments; i++) {
    for (let a = 0; a < radialSegs; a++) {
      const a0 = i * ringStride + a;
      const a1 = a0 + 1;
      const b0 = (i + 1) * ringStride + a;
      const b1 = b0 + 1;
      // Counter-clockwise outward normals
      trunkIndices.push(a0, a1, b1);
      trunkIndices.push(a0, b1, b0);
    }
  }

  const trunkTube = new THREE.BufferGeometry();
  trunkTube.setAttribute('position', new THREE.Float32BufferAttribute(trunkPositions, 3));
  trunkTube.setAttribute('normal', new THREE.Float32BufferAttribute(trunkNormals, 3));
  trunkTube.setAttribute('uv', new THREE.Float32BufferAttribute(trunkUvs, 2));
  trunkTube.setIndex(trunkIndices);
  trunkTube.computeVertexNormals();

  // Three coconuts nestled right under the palm crown hub
  const [hx, hy, hz] = evalCurve(1.0);
  const coconutParts: PartBufferInput[] = [
    {
      geo: trunkTube,
      partKind: 0,
      swayFn: (_x, y) => [Math.pow(Math.max(0, y) / totalHeight, 1.65), 0.02, 0],
    },
  ];
  for (let c = 0; c < 3; c++) {
    const cAng = (c / 3) * Math.PI * 2 + 0.4;
    const nut = new THREE.IcosahedronGeometry(0.15, 1);
    nut.scale(0.95, 1.15, 0.95);
    nut.translate(hx + Math.cos(cAng) * 0.21, hy - 0.14, hz + Math.sin(cAng) * 0.21);
    coconutParts.push({
      geo: nut,
      partKind: 1,
      swayFn: () => [1.0, 0.06, cAng],
    });
  }
  const trunk = mergeVegetationParts(coconutParts);

  // Build 9 individually arched feathered palm fronds radiating cleanly from (hx, hy, hz)
  const fPos: number[] = [];
  const fNorm: number[] = [];
  const fUv: number[] = [];
  const fSway: number[] = [];
  const fPart: number[] = [];
  const fIdx: number[] = [];

  const pushTri = (
    p0: [number, number, number],
    p1: [number, number, number],
    p2: [number, number, number],
    s0: [number, number, number],
    s1: [number, number, number],
    s2: [number, number, number],
    u0: number,
    u1: number,
    u2: number,
    partVal: number,
  ) => {
    const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2];
    const vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl;
    ny /= nl;
    nz /= nl;
    if (ny < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }

    const baseIdx = fPos.length / 3;
    fPos.push(...p0, ...p1, ...p2);
    fNorm.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    fUv.push(0.5, u0, 1.0, u1, 0.0, u2);
    fSway.push(...s0, ...s1, ...s2);
    fPart.push(partVal, partVal, partVal);
    fIdx.push(baseIdx, baseIdx + 1, baseIdx + 2);
  };

  const frondConfigs: { yaw: number; len: number; archRise: number; droop: number; phase: number }[] = [];
  // 6 outer wide arching fronds
  for (let f = 0; f < 6; f++) {
    frondConfigs.push({
      yaw: (f / 6) * Math.PI * 2 + (f % 2) * 0.14,
      len: 2.35 + (f % 2) * 0.25,
      archRise: 0.56 + (f % 3) * 0.08,
      droop: 1.08 + (f % 2) * 0.18,
      phase: f * 1.15,
    });
  }
  // 3 tall inner crown fronds
  for (let f = 0; f < 3; f++) {
    frondConfigs.push({
      yaw: (f / 3) * Math.PI * 2 + 0.52,
      len: 1.75,
      archRise: 1.02,
      droop: 0.72,
      phase: 6.4 + f * 1.4,
    });
  }

  for (const fc of frondConfigs) {
    const dirX = Math.cos(fc.yaw);
    const dirZ = Math.sin(fc.yaw);
    const sideX = -dirZ;
    const sideZ = dirX;

    const evalSpine = (t: number): [number, number, number] => {
      const r = t * fc.len;
      const yArc = Math.sin(t * Math.PI * 0.62) * fc.archRise - Math.pow(t, 2.2) * fc.droop;
      return [hx + dirX * r, hy + yArc, hz + dirZ * r];
    };

    // Spine segments + layered feathered V-leaflets
    const spineSteps = 9;
    for (let s = 0; s < spineSteps; s++) {
      const t0 = s / spineSteps;
      const t1 = (s + 1) / spineSteps;
      const c0 = evalSpine(t0);
      const c1 = evalSpine(t1);
      const w0 = (1 - t0 * 0.7) * 0.065;
      const w1 = (1 - t1 * 0.7) * 0.065;

      const sway0: [number, number, number] = [1.0, Math.pow(t0, 1.35), fc.phase];
      const sway1: [number, number, number] = [1.0, Math.pow(t1, 1.35), fc.phase];

      // Tapered spine strip
      const l0: [number, number, number] = [c0[0] - sideX * w0, c0[1] - 0.015, c0[2] - sideZ * w0];
      const r0: [number, number, number] = [c0[0] + sideX * w0, c0[1] - 0.015, c0[2] + sideZ * w0];
      const l1: [number, number, number] = [c1[0] - sideX * w1, c1[1] - 0.015, c1[2] - sideZ * w1];
      const r1: [number, number, number] = [c1[0] + sideX * w1, c1[1] - 0.015, c1[2] + sideZ * w1];
      pushTri(l0, r0, r1, sway0, sway0, sway1, t0, t0, t1, 0);
      pushTri(l0, r1, l1, sway0, sway1, sway1, t0, t1, t1, 0);

      // Left & right feathered pinnate leaflets along rachis
      if (s >= 1) {
        const envelope = Math.sin(t0 * Math.PI * 0.96);
        const leafletLen = (0.34 + 0.34 * envelope) * (fc.len / 2.35);
        const leafletDroop = 0.16 + t0 * 0.24;
        const leafletForward = 0.22;
        const midX = (c0[0] + c1[0]) * 0.5;
        const midY = (c0[1] + c1[1]) * 0.5;
        const midZ = (c0[2] + c1[2]) * 0.5;
        const swayTip: [number, number, number] = [1.0, Math.min(1.15, Math.pow(t1, 1.25) + 0.14), fc.phase + s * 0.22];

        for (const sign of [-1, 1]) {
          const tip: [number, number, number] = [
            midX + sideX * sign * leafletLen + dirX * leafletForward,
            midY - leafletDroop,
            midZ + sideZ * sign * leafletLen + dirZ * leafletForward,
          ];
          if (sign > 0) {
            pushTri(c0, c1, tip, sway0, sway1, swayTip, t0, t1, t1, 0);
          } else {
            pushTri(c1, c0, tip, sway1, sway0, swayTip, t1, t0, t1, 0);
          }
        }
      }
    }
  }

  const crown = new THREE.BufferGeometry();
  crown.setAttribute('position', new THREE.Float32BufferAttribute(fPos, 3));
  crown.setAttribute('normal', new THREE.Float32BufferAttribute(fNorm, 3));
  crown.setAttribute('uv', new THREE.Float32BufferAttribute(fUv, 2));
  crown.setAttribute('aSwayData', new THREE.Float32BufferAttribute(fSway, 3));
  crown.setAttribute('aPartKind', new THREE.Float32BufferAttribute(fPart, 1));
  crown.setIndex(fIdx);
  crown.computeBoundingSphere();

  return { trunk, crown };
}

/**
 * Sculpts an organic knobby canopy cluster (not a uniform raw sphere/icosahedron).
 */
function createOrganicLobe(radius: number, cx: number, cy: number, cz: number, seed: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(radius, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const jitter = 1.0 + 0.14 * Math.sin(x * 3.1 + seed) * Math.cos(z * 2.9 - seed) + 0.08 * Math.sin(y * 3.7);
    pos.setXYZ(i, x * jitter, y * (0.84 + 0.08 * jitter), z * jitter);
  }
  geo.translate(cx, cy, cz);
  geo.computeVertexNormals();
  return geo;
}

function createBroadleafGeometry(): { trunk: THREE.BufferGeometry; canopy: THREE.BufferGeometry } {
  const mainStem = new THREE.CylinderGeometry(0.24, 0.38, 2.2, 8);
  mainStem.translate(0, 1.04, 0);

  const limb1 = new THREE.CylinderGeometry(0.11, 0.2, 1.7, 7);
  limb1.translate(0, 0.8, 0);
  limb1.rotateZ(0.46);
  limb1.translate(-0.08, 1.9, 0.05);

  const limb2 = new THREE.CylinderGeometry(0.1, 0.19, 1.65, 7);
  limb2.translate(0, 0.8, 0);
  limb2.rotateZ(-0.42);
  limb2.rotateY(0.8);
  limb2.translate(0.08, 1.92, -0.04);

  const limb3 = new THREE.CylinderGeometry(0.1, 0.18, 1.5, 6);
  limb3.translate(0, 0.72, 0);
  limb3.rotateX(0.45);
  limb3.translate(0, 1.95, 0.08);

  const trunk = mergeVegetationParts([
    { geo: mainStem, partKind: 0, swayFn: (_x, y) => [Math.pow(Math.max(0, y) / 4.8, 1.5), 0.02, 0] },
    { geo: limb1, partKind: 0, swayFn: (_x, y) => [Math.pow(Math.max(0, y) / 4.8, 1.5), 0.15, 0.8] },
    { geo: limb2, partKind: 0, swayFn: (_x, y) => [Math.pow(Math.max(0, y) / 4.8, 1.5), 0.15, 2.4] },
    { geo: limb3, partKind: 0, swayFn: (_x, y) => [Math.pow(Math.max(0, y) / 4.8, 1.5), 0.15, 4.1] },
  ]);

  const lobes: { geo: THREE.BufferGeometry; phase: number }[] = [
    { geo: createOrganicLobe(1.42, 0.0, 4.05, 0.0, 0.4), phase: 0.2 },
    { geo: createOrganicLobe(1.18, -0.95, 3.45, 0.35, 1.7), phase: 1.5 },
    { geo: createOrganicLobe(1.14, 0.92, 3.5, -0.35, 2.9), phase: 3.1 },
    { geo: createOrganicLobe(1.06, 0.12, 3.4, 0.92, 4.2), phase: 4.5 },
    { geo: createOrganicLobe(0.95, -0.22, 4.55, -0.45, 5.4), phase: 5.6 },
  ];

  const canopy = mergeVegetationParts(
    lobes.map((l) => ({
      geo: l.geo,
      partKind: 0,
      swayFn: (x, y, z) => [
        Math.pow(Math.max(0, y) / 4.8, 1.45),
        Math.min(1, Math.hypot(x, z) * 0.42),
        l.phase,
      ],
    })),
  );

  return { trunk, canopy };
}

function createDecorativeTreeGeometry(): { trunk: THREE.BufferGeometry; canopy: THREE.BufferGeometry } {
  const stem = new THREE.CylinderGeometry(0.12, 0.2, 1.75, 7);
  stem.translate(0, 0.84, 0);
  const trunk = mergeVegetationParts([
    { geo: stem, partKind: 0, swayFn: (_x, y) => [Math.pow(Math.max(0, y) / 3.4, 1.5), 0.02, 0] },
  ]);

  const lower = createOrganicLobe(0.92, 0, 2.05, 0, 1.1);
  lower.scale(1.05, 0.88, 1.05);
  const upper = createOrganicLobe(0.68, 0.08, 2.95, -0.05, 2.7);
  upper.scale(0.95, 1.08, 0.95);

  const parts: PartBufferInput[] = [
    {
      geo: lower,
      partKind: 0,
      swayFn: (x, y, z) => [Math.pow(Math.max(0, y) / 3.4, 1.45), Math.hypot(x, z) * 0.35, 0.5],
    },
    {
      geo: upper,
      partKind: 0,
      swayFn: (x, y, z) => [Math.pow(Math.max(0, y) / 3.4, 1.45), Math.hypot(x, z) * 0.5, 2.1],
    },
  ];
  // Decorative warm blossom clusters embedded across canopy tips
  for (let b = 0; b < 5; b++) {
    const a = (b / 5) * Math.PI * 2;
    const bl = new THREE.OctahedronGeometry(0.14, 0);
    bl.translate(Math.cos(a) * 0.72, 2.15 + (b % 2) * 0.65, Math.sin(a) * 0.72);
    parts.push({
      geo: bl,
      partKind: 2,
      swayFn: (x, y, z) => [Math.pow(Math.max(0, y) / 3.4, 1.45), Math.hypot(x, z) * 0.6, a],
    });
  }

  return { trunk, canopy: mergeVegetationParts(parts) };
}

function createShrubGeometry(): THREE.BufferGeometry {
  const parts: PartBufferInput[] = [
    { geo: createOrganicLobe(0.68, 0.0, 0.44, 0.0, 0.2), partKind: 0, swayFn: (_x, y) => [Math.max(0, y) * 0.95, 0.35, 0.4] },
    { geo: createOrganicLobe(0.54, 0.48, 0.34, 0.18, 1.4), partKind: 0, swayFn: (_x, y) => [Math.max(0, y) * 0.95, 0.45, 1.8] },
    { geo: createOrganicLobe(0.5, -0.45, 0.32, -0.22, 2.5), partKind: 0, swayFn: (_x, y) => [Math.max(0, y) * 0.95, 0.45, 3.2] },
    { geo: createOrganicLobe(0.45, -0.08, 0.28, 0.46, 3.8), partKind: 0, swayFn: (_x, y) => [Math.max(0, y) * 0.95, 0.42, 4.9] },
  ];
  return mergeVegetationParts(parts);
}

/**
 * Creates a tapered, curved leaf/grass blade geometry rooted at y = -0.05.
 */
function createCurvedBladeGeometry(
  baseWidth: number,
  height: number,
  leanRadius: number,
  yaw: number,
  tiltPitch = 0,
): THREE.BufferGeometry {
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const segs = 4;
  const pos: number[] = [];
  const norm: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];

  for (let s = 0; s <= segs; s++) {
    const t = s / segs;
    const y = -0.05 + (height + 0.05) * t;
    const r = leanRadius * (t * t) + Math.sin(tiltPitch) * t * height * 0.4;
    const halfW = baseWidth * 0.5 * (1 - Math.pow(t, 0.95));
    const cx = cosY * r;
    const cz = sinY * r;
    const px = -sinY * halfW;
    const pz = cosY * halfW;

    pos.push(cx - px, y, cz - pz);
    pos.push(cx + px, y, cz + pz);
    norm.push(-sinY * 0.25 + cosY * 0.2, 0.9, cosY * 0.25 + sinY * 0.2);
    norm.push(-sinY * 0.25 + cosY * 0.2, 0.9, cosY * 0.25 + sinY * 0.2);
    uv.push(0, t, 1, t);
  }

  for (let s = 0; s < segs; s++) {
    const a = s * 2;
    idx.push(a, a + 1, a + 3);
    idx.push(a, a + 3, a + 2);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function createShorelineGeometry(): THREE.BufferGeometry {
  const parts: PartBufferInput[] = [];
  for (let i = 0; i < 7; i++) {
    const yaw = (i / 7) * Math.PI * 2 + (i % 2) * 0.2;
    const h = 0.95 + (i % 3) * 0.26;
    const blade = createCurvedBladeGeometry(0.11, h, 0.28 + (i % 2) * 0.14, yaw);
    parts.push({
      geo: blade,
      partKind: 0,
      swayFn: (_x, y) => [Math.pow(Math.max(0, y) / 1.4, 1.35), Math.max(0, y) / 1.4, yaw],
    });
  }
  // Two cattail stalks with seed heads
  for (let c = 0; c < 2; c++) {
    const cx = c === 0 ? 0.1 : -0.11;
    const cz = c === 0 ? 0.08 : -0.09;
    const stalkH = c === 0 ? 1.48 : 1.28;
    const stalk = new THREE.CylinderGeometry(0.022, 0.03, stalkH, 5);
    stalk.translate(cx, stalkH * 0.5 - 0.04, cz);
    const spike = new THREE.CylinderGeometry(0.056, 0.056, 0.26, 6);
    spike.translate(cx, stalkH - 0.16, cz);

    parts.push({
      geo: stalk,
      partKind: 0,
      swayFn: (_x, y) => [Math.pow(Math.max(0, y) / 1.48, 1.4), 0.12, c * 2.1],
    });
    parts.push({
      geo: spike,
      partKind: 1,
      swayFn: (_x, y) => [Math.pow(Math.max(0, y) / 1.48, 1.4), 0.18, c * 2.1],
    });
  }
  return mergeVegetationParts(parts);
}

function createGroundFernGeometry(): THREE.BufferGeometry {
  const parts: PartBufferInput[] = [];
  for (let i = 0; i < 9; i++) {
    const yaw = (i / 9) * Math.PI * 2 + (i % 2) * 0.18;
    const inner = i % 3 === 0;
    const h = inner ? 0.54 : 0.42;
    const reach = inner ? 0.48 : 0.68;
    const frond = createCurvedBladeGeometry(0.18, h, reach, yaw, 0.35);
    parts.push({
      geo: frond,
      partKind: 0,
      swayFn: (x, y, z) => [Math.max(0, y) * 1.1, Math.min(1, Math.hypot(x, z) * 1.15), yaw],
    });
  }
  return mergeVegetationParts(parts);
}

function createGrassClumpGeometry(): THREE.BufferGeometry {
  const parts: PartBufferInput[] = [];
  const specs = [
    { yaw: 0.0, h: 0.88, lean: 0.22, w: 0.12 },
    { yaw: 0.82, h: 0.66, lean: 0.3, w: 0.1 },
    { yaw: 1.55, h: 0.78, lean: 0.26, w: 0.11 },
    { yaw: 2.35, h: 0.56, lean: 0.32, w: 0.1 },
    { yaw: 3.18, h: 0.82, lean: 0.24, w: 0.11 },
    { yaw: 4.02, h: 0.62, lean: 0.28, w: 0.1 },
    { yaw: 4.86, h: 0.74, lean: 0.22, w: 0.11 },
    { yaw: 5.58, h: 0.5, lean: 0.26, w: 0.09 },
    { yaw: 2.75, h: 0.94, lean: 0.15, w: 0.12 },
  ];
  for (const sp of specs) {
    const ox = Math.cos(sp.yaw + 0.5) * 0.12;
    const oz = Math.sin(sp.yaw + 0.5) * 0.12;
    const blade = createCurvedBladeGeometry(sp.w, sp.h, sp.lean, sp.yaw);
    blade.translate(ox, 0, oz);
    parts.push({
      geo: blade,
      partKind: 0,
      swayFn: (_x, y) => [Math.pow(Math.max(0, y) / 0.95, 1.45), Math.max(0, y) / 0.95, sp.yaw],
    });
  }
  return mergeVegetationParts(parts);
}

function createFlowerClumpGeometry(): THREE.BufferGeometry {
  const parts: PartBufferInput[] = [];
  const blooms = [
    { x: 0.0, z: 0.0, h: 0.64, leanX: 0.04, leanZ: 0.03, r: 0.16, phase: 0.2 },
    { x: 0.2, z: -0.14, h: 0.48, leanX: 0.08, leanZ: -0.05, r: 0.14, phase: 1.8 },
    { x: -0.19, z: 0.15, h: 0.54, leanX: -0.06, leanZ: 0.07, r: 0.15, phase: 3.4 },
    { x: 0.12, z: 0.2, h: 0.4, leanX: 0.05, leanZ: 0.06, r: 0.13, phase: 5.1 },
  ];

  for (const bl of blooms) {
    const stem = new THREE.CylinderGeometry(0.018, 0.028, bl.h + 0.05, 5);
    stem.translate(bl.x, (bl.h + 0.05) * 0.5 - 0.05, bl.z);
    parts.push({
      geo: stem,
      partKind: 0, // Stem keeps crisp botanical green
      swayFn: (_x, y) => [Math.pow(Math.max(0, y) / 0.66, 1.4), 0.15, bl.phase],
    });

    // Basal leaf blades
    const leaf = createCurvedBladeGeometry(0.08, 0.28, 0.18, bl.phase, 0.3);
    leaf.translate(bl.x, 0, bl.z);
    parts.push({
      geo: leaf,
      partKind: 0,
      swayFn: (_x, y) => [Math.max(0, y) * 1.1, 0.35, bl.phase],
    });

    // 5-petal blossom cup tilted naturally upward
    for (let p = 0; p < 5; p++) {
      const pa = (p / 5) * Math.PI * 2 + bl.phase * 0.3;
      const petal = new THREE.SphereGeometry(bl.r * 0.48, 5, 4);
      petal.scale(1.0, 0.36, 1.35);
      petal.rotateX(0.28);
      petal.rotateY(pa);
      petal.translate(
        bl.x + bl.leanX * 0.5 + Math.sin(pa) * bl.r * 0.58,
        bl.h + 0.01,
        bl.z + bl.leanZ * 0.5 + Math.cos(pa) * bl.r * 0.58,
      );
      parts.push({
        geo: petal,
        partKind: 1, // Petals pick up vibrant instanceColor
        swayFn: (_x, y) => [Math.pow(Math.max(0, y) / 0.66, 1.4), 0.85, bl.phase + pa],
      });
    }

    // Golden flower center disc
    const center = new THREE.SphereGeometry(bl.r * 0.32, 6, 4);
    center.scale(1, 0.55, 1);
    center.translate(bl.x + bl.leanX * 0.5, bl.h + 0.025, bl.z + bl.leanZ * 0.5);
    parts.push({
      geo: center,
      partKind: 2, // Warm golden pollen center
      swayFn: (_x, y) => [Math.pow(Math.max(0, y) / 0.66, 1.4), 0.72, bl.phase],
    });
  }

  return mergeVegetationParts(parts);
}

interface VegUniformSet {
  uWindTime: { value: number };
  uWindStrength: { value: number };
  uGustStrength: { value: number };
  uGustFreq: { value: number };
  uTrunkAmp: { value: number };
  uDetailAmp: { value: number };
  uWindDetail: { value: number };
  uWindDir: { value: THREE.Vector2 };
}

function attachVegetationWindShader(
  mat: THREE.MeshStandardMaterial,
  sharedUniforms: VegUniformSet,
  config: {
    cacheKey: string;
    trunkWeightScale: number;
    flutterWeightScale: number;
    isFlower?: boolean;
    isShoreline?: boolean;
    isDecorative?: boolean;
    isPalmCrown?: boolean;
    rootDarken?: number;
  },
): THREE.MeshDepthMaterial {
  const applyVertexPatch = (shader: THREE.WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uWindTime = sharedUniforms.uWindTime;
    shader.uniforms.uWindStrength = sharedUniforms.uWindStrength;
    shader.uniforms.uGustStrength = sharedUniforms.uGustStrength;
    shader.uniforms.uGustFreq = sharedUniforms.uGustFreq;
    shader.uniforms.uTrunkAmp = sharedUniforms.uTrunkAmp;
    shader.uniforms.uDetailAmp = sharedUniforms.uDetailAmp;
    shader.uniforms.uWindDetail = sharedUniforms.uWindDetail;
    shader.uniforms.uWindDir = sharedUniforms.uWindDir;

    shader.vertexShader = `
      attribute vec3 aSwayData;
      attribute float aPartKind;
      attribute vec4 aInstWind;
      uniform float uWindTime;
      uniform float uWindStrength;
      uniform float uGustStrength;
      uniform float uGustFreq;
      uniform float uTrunkAmp;
      uniform float uDetailAmp;
      uniform float uWindDetail;
      uniform vec2 uWindDir;
      varying float vVegPart;
      varying float vVegHeight;
      varying float vVegFlutter;
    \n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vVegPart = aPartKind;
       vVegHeight = clamp(aSwayData.x, 0.0, 1.0);
       float vegRootLock = smoothstep(0.0, 0.25, max(0.0, position.y));
       float vegBendWeight = aSwayData.x * vegRootLock;
       float vegInstAmp = aInstWind.y;

       vec2 vegWorldXZ = vec2(0.0);
       vec2 vegBasisX = vec2(1.0, 0.0);
       vec2 vegBasisZ = vec2(0.0, 1.0);
       float vegScaleX = 1.0;
       float vegScaleZ = 1.0;
       #ifdef USE_INSTANCING
         vegWorldXZ = instanceMatrix[3].xz;
         vegScaleX = max(0.25, length(instanceMatrix[0].xz));
         vegScaleZ = max(0.25, length(instanceMatrix[2].xz));
         vegBasisX = instanceMatrix[0].xz / vegScaleX;
         vegBasisZ = instanceMatrix[2].xz / vegScaleZ;
       #endif

       // Spatial traveling wind gust field across landscape
       float vegGustPhase = dot(vegWorldXZ, uWindDir) * 0.078 - uWindTime * (1.3 * uGustFreq) + aInstWind.x * 0.35;
       float vegGustWave = sin(vegGustPhase);
       if (uWindDetail > 0.5) {
         vegGustWave += 0.38 * sin(dot(vegWorldXZ, vec2(-uWindDir.y, uWindDir.x)) * 0.115 - uWindTime * 0.95 + aInstWind.x);
       }
       float vegGustFactor = 1.0 + uGustStrength * (0.48 * vegGustWave);

       // Primary trunk / stem bend (pinned at base) + static natural posture lean
       float vegTrunkOsc = sin(uWindTime * (1.35 * uGustFreq) + aInstWind.x);
       vec2 vegCrossDir = vec2(-uWindDir.y, uWindDir.x);
       vec2 vegBendXZ = (uWindDir * ((0.52 + 0.48 * vegTrunkOsc) * vegGustFactor) + vegCrossDir * (0.28 * cos(uWindTime * 1.1 + aInstWind.x)))
         * (uTrunkAmp * ${config.trunkWeightScale.toFixed(3)} * vegBendWeight * vegInstAmp * uWindStrength);

       // Secondary leaf cluster / palm frond / petal flutter
       float vegFlutOsc = uWindDetail > 0.5
         ? sin(uWindTime * (2.65 * uGustFreq) + aInstWind.x + aSwayData.z)
         : 0.0;
       vec2 vegFlutterXZ = (uWindDir * vegFlutOsc + vegCrossDir * cos(uWindTime * 2.15 + aSwayData.z * 1.7 + aInstWind.x))
         * (uDetailAmp * ${config.flutterWeightScale.toFixed(3)} * aSwayData.y * vegRootLock * vegInstAmp * vegGustFactor * uWindStrength);

       // Static natural botanical lean
       vec2 vegStaticLean = aInstWind.zw * (vegBendWeight * 0.35);

       vec2 vegTotalWorldXZ = vegBendXZ + vegFlutterXZ + vegStaticLean;
       vVegFlutter = clamp(vegFlutOsc * aSwayData.y * uWindStrength, -1.0, 1.0);

       vec2 vegLocalXZ = vec2(dot(vegTotalWorldXZ, vegBasisX) / vegScaleX, dot(vegTotalWorldXZ, vegBasisZ) / vegScaleZ);
       transformed.x += vegLocalXZ.x;
       transformed.z += vegLocalXZ.y;

       ${
         config.isPalmCrown
           ? `float vegFrondNod = sin(uWindTime * (2.2 * uGustFreq) + aInstWind.x + aSwayData.z * 1.25) * vegGustFactor * uWindStrength;
              transformed.y += vegFrondNod * aSwayData.y * 0.19 * ${config.flutterWeightScale.toFixed(2)} * vegInstAmp;`
           : ''
       }
       transformed.y -= min(0.24, dot(vegTotalWorldXZ, vegTotalWorldXZ) * 0.055 * vegRootLock);
      `,
    );
  };

  mat.customProgramCacheKey = () => config.cacheKey;
  mat.onBeforeCompile = (shader) => {
    applyVertexPatch(shader);

    shader.fragmentShader = `
      varying float vVegPart;
      varying float vVegHeight;
      varying float vVegFlutter;
    \n${shader.fragmentShader}`.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
       ${
         config.isFlower
           ? `if (vVegPart < 0.5) {
                diffuseColor.rgb = vec3(0.28, 0.54, 0.25) * mix(0.82, 1.12, vVegHeight);
              } else if (vVegPart > 1.5) {
                diffuseColor.rgb = vec3(0.98, 0.78, 0.22);
              } else {
                diffuseColor.rgb *= mix(0.92, 1.14, vVegHeight);
              }`
           : config.isShoreline
             ? `if (vVegPart > 0.5) {
                  diffuseColor.rgb = vec3(0.36, 0.21, 0.12);
                } else {
                  diffuseColor.rgb *= mix(${(config.rootDarken ?? 0.78).toFixed(2)}, 1.12, vVegHeight);
                }`
             : config.isDecorative
               ? `if (vVegPart > 1.5) {
                    diffuseColor.rgb = vec3(0.98, 0.81, 0.58);
                  } else {
                    diffuseColor.rgb *= mix(${(config.rootDarken ?? 0.84).toFixed(2)}, 1.1, vVegHeight);
                  }`
               : `if (vVegPart > 0.5) {
                    diffuseColor.rgb = vec3(0.27, 0.16, 0.09);
                  } else {
                    diffuseColor.rgb *= mix(${(config.rootDarken ?? 0.84).toFixed(2)}, 1.12, vVegHeight);
                  }`
       }
       diffuseColor.rgb *= (1.0 + vVegFlutter * 0.045);
      `,
    );
  };

  // Matching shadow-casting depth material so wind-bent trees cast synchronized shadows
  const depthMat = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    side: mat.side,
  });
  depthMat.customProgramCacheKey = () => `${config.cacheKey}-depth`;
  depthMat.onBeforeCompile = (shader) => {
    applyVertexPatch(shader);
  };

  return depthMat;
}

function populateInstancedVegetation(
  items: VegetationPlacement[],
  geo: THREE.BufferGeometry,
  mat: THREE.MeshStandardMaterial,
  depthMat: THREE.MeshDepthMaterial,
  scene: THREE.Scene,
  options: { castShadow: boolean; receiveShadow: boolean },
): THREE.InstancedMesh {
  const count = items.length;
  const inst = new THREE.InstancedMesh(geo, mat, count);
  inst.castShadow = options.castShadow;
  inst.receiveShadow = options.receiveShadow;
  inst.customDepthMaterial = depthMat;

  const windAttr = new Float32Array(count * 4);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const it = items[i];
    dummy.position.set(it.x, it.y, it.z);
    dummy.rotation.set(0, it.yaw, 0);
    dummy.scale.setScalar(it.scale);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);

    color.set(it.colorHex);
    inst.setColorAt(i, color);

    windAttr[i * 4] = it.windPhase;
    windAttr[i * 4 + 1] = it.windAmp;
    windAttr[i * 4 + 2] = it.leanX;
    windAttr[i * 4 + 3] = it.leanZ;
  }

  geo.setAttribute('aInstWind', new THREE.InstancedBufferAttribute(windAttr, 4));
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  inst.computeBoundingSphere();
  scene.add(inst);
  return inst;
}

export function createVegetationSystem(
  scene: THREE.Scene,
  procTex: ProceduralTextureSet,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
): VegetationSystemResult {
  const layout = generateWorldVegetationLayout();

  let currentWeather: WeatherMode = 'sunny';
  let currentWindMode: WindMode = 'auto';
  let currentQuality: QualityLevel = 'high';
  let currentReducedMotion = false;

  const sharedUniforms: VegUniformSet = {
    uWindTime: { value: 0 },
    uWindStrength: { value: 1.0 },
    uGustStrength: { value: 0.64 },
    uGustFreq: { value: 1.0 },
    uTrunkAmp: { value: 0.034 },
    uDetailAmp: { value: 0.088 },
    uWindDetail: { value: 2.0 },
    uWindDir: { value: new THREE.Vector2(0.82, 0.57) },
  };

  // Sculpted reusable geometries per species
  const pineGeos = createSculptedPineGeometry();
  const palmGeos = createTropicalPalmGeometry();
  const broadGeos = createBroadleafGeometry();
  const decoGeos = createDecorativeTreeGeometry();
  const shrubGeo = createShrubGeometry();
  const shorelineGeo = createShorelineGeometry();
  const fernGeo = createGroundFernGeometry();
  const grassGeo = createGrassClumpGeometry();
  const flowerGeo = createFlowerClumpGeometry();

  geometries.push(
    pineGeos.trunk,
    pineGeos.canopy,
    palmGeos.trunk,
    palmGeos.crown,
    broadGeos.trunk,
    broadGeos.canopy,
    decoGeos.trunk,
    decoGeos.canopy,
    shrubGeo,
    shorelineGeo,
    fernGeo,
    grassGeo,
    flowerGeo,
  );

  // Materials (shared cleanly per botanical finish, varied roughness/bump)
  const barkMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    bumpMap: procTex.barkBump,
    bumpScale: 0.09,
    roughness: 0.92,
    metalness: 0.02,
  });
  const pineCanopyMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    bumpMap: procTex.foliageBump,
    bumpScale: 0.08,
    roughness: 0.82,
    metalness: 0.02,
  });
  const palmCrownMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    bumpMap: procTex.foliageBump,
    bumpScale: 0.06,
    roughness: 0.68,
    metalness: 0.03,
    side: THREE.DoubleSide,
  });
  const broadleafCanopyMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    bumpMap: procTex.foliageBump,
    bumpScale: 0.09,
    roughness: 0.78,
    metalness: 0.02,
  });
  const decoCanopyMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    bumpMap: procTex.foliageBump,
    bumpScale: 0.06,
    roughness: 0.72,
    metalness: 0.03,
  });
  const shrubMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    bumpMap: procTex.foliageBump,
    bumpScale: 0.08,
    roughness: 0.84,
    metalness: 0.02,
  });
  const shorelineMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.76,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const fernMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.72,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const grassMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.82,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const flowerMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.62,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  const barkDepthMat = attachVegetationWindShader(barkMat, sharedUniforms, {
    cacheKey: 'veg-bark-v1',
    trunkWeightScale: 1.0,
    flutterWeightScale: 0.25,
    rootDarken: 0.72,
  });
  const pineCanopyDepthMat = attachVegetationWindShader(pineCanopyMat, sharedUniforms, {
    cacheKey: 'veg-pine-v1',
    trunkWeightScale: 1.0,
    flutterWeightScale: 0.75,
    rootDarken: 0.76,
  });
  const palmCrownDepthMat = attachVegetationWindShader(palmCrownMat, sharedUniforms, {
    cacheKey: 'veg-palm-v1',
    trunkWeightScale: 1.0,
    flutterWeightScale: 1.65,
    isPalmCrown: true,
    rootDarken: 0.82,
  });
  const broadCanopyDepthMat = attachVegetationWindShader(broadleafCanopyMat, sharedUniforms, {
    cacheKey: 'veg-broad-v1',
    trunkWeightScale: 1.0,
    flutterWeightScale: 0.92,
    rootDarken: 0.78,
  });
  const decoCanopyDepthMat = attachVegetationWindShader(decoCanopyMat, sharedUniforms, {
    cacheKey: 'veg-deco-v1',
    trunkWeightScale: 0.9,
    flutterWeightScale: 0.78,
    isDecorative: true,
    rootDarken: 0.84,
  });
  const shrubDepthMat = attachVegetationWindShader(shrubMat, sharedUniforms, {
    cacheKey: 'veg-shrub-v1',
    trunkWeightScale: 0.65,
    flutterWeightScale: 0.85,
    rootDarken: 0.74,
  });
  const shorelineDepthMat = attachVegetationWindShader(shorelineMat, sharedUniforms, {
    cacheKey: 'veg-shore-v1',
    trunkWeightScale: 1.4,
    flutterWeightScale: 1.35,
    isShoreline: true,
    rootDarken: 0.74,
  });
  const fernDepthMat = attachVegetationWindShader(fernMat, sharedUniforms, {
    cacheKey: 'veg-fern-v1',
    trunkWeightScale: 0.9,
    flutterWeightScale: 1.15,
    rootDarken: 0.76,
  });
  const grassDepthMat = attachVegetationWindShader(grassMat, sharedUniforms, {
    cacheKey: 'veg-grass-v1',
    trunkWeightScale: 1.55,
    flutterWeightScale: 1.35,
    rootDarken: 0.7,
  });
  const flowerDepthMat = attachVegetationWindShader(flowerMat, sharedUniforms, {
    cacheKey: 'veg-flower-v1',
    trunkWeightScale: 1.25,
    flutterWeightScale: 1.15,
    isFlower: true,
    rootDarken: 0.82,
  });

  materials.push(
    barkMat,
    pineCanopyMat,
    palmCrownMat,
    broadleafCanopyMat,
    decoCanopyMat,
    shrubMat,
    shorelineMat,
    fernMat,
    grassMat,
    flowerMat,
    barkDepthMat,
    pineCanopyDepthMat,
    palmCrownDepthMat,
    broadCanopyDepthMat,
    decoCanopyDepthMat,
    shrubDepthMat,
    shorelineDepthMat,
    fernDepthMat,
    grassDepthMat,
    flowerDepthMat,
  );

  // Give trunks natural bark color variation
  const pineTrunks = layout.pines.map((p, i) => ({
    ...p,
    colorHex: i % 2 === 0 ? '#6E4930' : '#5E3D27',
  }));
  const palmTrunks = layout.palms.map((p, i) => ({
    ...p,
    colorHex: i % 2 === 0 ? '#916B48' : '#7D5B3B',
  }));
  const broadTrunks = layout.broadleafs.map((p, i) => ({
    ...p,
    colorHex: i % 2 === 0 ? '#775338' : '#68472F',
  }));
  const decoTrunks = layout.decoratives.map((p) => ({
    ...p,
    colorHex: '#7A593E',
  }));

  const pineTrunkInst = populateInstancedVegetation(pineTrunks, pineGeos.trunk, barkMat, barkDepthMat, scene, {
    castShadow: true,
    receiveShadow: true,
  });
  const pineCanopyInst = populateInstancedVegetation(layout.pines, pineGeos.canopy, pineCanopyMat, pineCanopyDepthMat, scene, {
    castShadow: true,
    receiveShadow: true,
  });
  const palmTrunkInst = populateInstancedVegetation(palmTrunks, palmGeos.trunk, barkMat, barkDepthMat, scene, {
    castShadow: true,
    receiveShadow: true,
  });
  const palmCrownInst = populateInstancedVegetation(layout.palms, palmGeos.crown, palmCrownMat, palmCrownDepthMat, scene, {
    castShadow: true,
    receiveShadow: true,
  });
  const broadTrunkInst = populateInstancedVegetation(broadTrunks, broadGeos.trunk, barkMat, barkDepthMat, scene, {
    castShadow: true,
    receiveShadow: true,
  });
  const broadCanopyInst = populateInstancedVegetation(layout.broadleafs, broadGeos.canopy, broadleafCanopyMat, broadCanopyDepthMat, scene, {
    castShadow: true,
    receiveShadow: true,
  });
  const decoTrunkInst = populateInstancedVegetation(decoTrunks, decoGeos.trunk, barkMat, barkDepthMat, scene, {
    castShadow: true,
    receiveShadow: true,
  });
  const decoCanopyInst = populateInstancedVegetation(layout.decoratives, decoGeos.canopy, decoCanopyMat, decoCanopyDepthMat, scene, {
    castShadow: true,
    receiveShadow: true,
  });
  const shrubInst = populateInstancedVegetation(layout.shrubs, shrubGeo, shrubMat, shrubDepthMat, scene, {
    castShadow: true,
    receiveShadow: true,
  });
  const shorelineInst = populateInstancedVegetation(layout.shorelines, shorelineGeo, shorelineMat, shorelineDepthMat, scene, {
    castShadow: false,
    receiveShadow: true,
  });
  const fernInst = populateInstancedVegetation(layout.groundPlants, fernGeo, fernMat, fernDepthMat, scene, {
    castShadow: false,
    receiveShadow: true,
  });
  const grassInst = populateInstancedVegetation(layout.grass, grassGeo, grassMat, grassDepthMat, scene, {
    castShadow: false,
    receiveShadow: true,
  });
  const flowerInst = populateInstancedVegetation(layout.flowers, flowerGeo, flowerMat, flowerDepthMat, scene, {
    castShadow: false,
    receiveShadow: true,
  });

  const maxCounts = {
    pines: layout.pines.length,
    palms: layout.palms.length,
    broadleafs: layout.broadleafs.length,
    decoratives: layout.decoratives.length,
    shrubs: layout.shrubs.length,
    shorelines: layout.shorelines.length,
    ferns: layout.groundPlants.length,
    grass: layout.grass.length,
    flowers: layout.flowers.length,
  };

  let targetProfile = resolveWindProfile(currentWeather, currentWindMode);
  let windPhaseAccum = 0;

  const applyQualityScaling = () => {
    const isLow = currentQuality === 'low';
    const isMed = currentQuality === 'medium';

    sharedUniforms.uWindDetail.value = isLow ? 0 : isMed ? 1 : 2;

    const treeRatio = isLow ? 0.78 : 1.0;
    const midRatio = isLow ? 0.48 : isMed ? 0.76 : 1.0;
    const grassRatio = isLow ? 0.42 : isMed ? 0.72 : 1.0;
    const flowerRatio = isLow ? 0.3 : isMed ? 0.7 : 1.0;

    const pCount = Math.max(1, Math.round(maxCounts.pines * treeRatio));
    const plCount = Math.max(1, Math.round(maxCounts.palms * treeRatio));
    const bCount = Math.max(1, Math.round(maxCounts.broadleafs * treeRatio));
    const dCount = Math.max(1, Math.round(maxCounts.decoratives * treeRatio));

    pineTrunkInst.count = pCount;
    pineCanopyInst.count = pCount;
    palmTrunkInst.count = plCount;
    palmCrownInst.count = plCount;
    broadTrunkInst.count = bCount;
    broadCanopyInst.count = bCount;
    decoTrunkInst.count = dCount;
    decoCanopyInst.count = dCount;

    shrubInst.count = Math.max(1, Math.round(maxCounts.shrubs * midRatio));
    shorelineInst.count = Math.max(1, Math.round(maxCounts.shorelines * midRatio));
    fernInst.count = Math.max(1, Math.round(maxCounts.ferns * midRatio));
    grassInst.count = Math.max(1, Math.round(maxCounts.grass * grassRatio));
    flowerInst.count = Math.max(1, Math.round(maxCounts.flowers * flowerRatio));

    const enableTreeShadows = !isLow;
    pineTrunkInst.castShadow = enableTreeShadows;
    pineCanopyInst.castShadow = enableTreeShadows;
    palmTrunkInst.castShadow = enableTreeShadows;
    palmCrownInst.castShadow = enableTreeShadows;
    broadTrunkInst.castShadow = enableTreeShadows;
    broadCanopyInst.castShadow = enableTreeShadows;
    decoTrunkInst.castShadow = enableTreeShadows;
    decoCanopyInst.castShadow = enableTreeShadows;
    shrubInst.castShadow = enableTreeShadows && !isMed;
  };

  const setWindProfile = (weather: WeatherMode, windMode: WindMode) => {
    currentWeather = weather;
    currentWindMode = windMode;
    targetProfile = resolveWindProfile(weather, windMode);
  };

  const setPerformanceProfile = (quality: QualityLevel, reducedMotion: boolean) => {
    currentQuality = quality;
    currentReducedMotion = reducedMotion;
    applyQualityScaling();
  };

  const update = (motionTime: number, dt: number) => {
    if (currentReducedMotion) {
      sharedUniforms.uWindStrength.value = 0.0;
      return;
    }

    const safeDt = Math.min(0.05, Math.max(0, dt));
    windPhaseAccum += safeDt * targetProfile.speedMultiplier;
    sharedUniforms.uWindTime.value = windPhaseAccum;

    sharedUniforms.uWindStrength.value = THREE.MathUtils.damp(
      sharedUniforms.uWindStrength.value,
      1.0,
      5,
      safeDt,
    );
    sharedUniforms.uGustStrength.value = THREE.MathUtils.damp(
      sharedUniforms.uGustStrength.value,
      targetProfile.gustStrength,
      4,
      safeDt,
    );
    sharedUniforms.uGustFreq.value = THREE.MathUtils.damp(
      sharedUniforms.uGustFreq.value,
      targetProfile.gustFrequency,
      4,
      safeDt,
    );
    sharedUniforms.uTrunkAmp.value = THREE.MathUtils.damp(
      sharedUniforms.uTrunkAmp.value,
      targetProfile.trunkAmp,
      4,
      safeDt,
    );
    sharedUniforms.uDetailAmp.value = THREE.MathUtils.damp(
      sharedUniforms.uDetailAmp.value,
      targetProfile.canopyAmp,
      4,
      safeDt,
    );

    // Subtle slow breeze azimuth drift across the sunlit oasis
    const baseAngle = 0.61 + Math.sin(motionTime * 0.085) * 0.22;
    sharedUniforms.uWindDir.value.set(Math.cos(baseAngle), Math.sin(baseAngle));
  };

  applyQualityScaling();

  return {
    staticColliders: layout.staticColliders,
    setWindProfile,
    setPerformanceProfile,
    update,
  };
}
