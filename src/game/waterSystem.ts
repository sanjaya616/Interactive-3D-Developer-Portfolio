import * as THREE from 'three';
import type { QualityLevel, WeatherMode } from '../types/portfolio';
import {
  AMPHIBIOUS_LAGOON_BOUNDS,
  EMERALD_LAGOON_BOUNDS,
  MOORED_BOAT_ANCHOR,
  SOUTH_COVE_BOUNDS,
  WATER_BASE_Y,
  WATER_WAVE_OCTAVES,
  computeFloatingBoatPose,
  getWeatherWaveScale,
  type FloatingBodyPose,
  type WaterSurfaceSample,
} from './waterWaveMath';

export interface WaterSystem {
  waterMat: THREE.MeshPhysicalMaterial;
  lagoonMesh: THREE.Mesh;
  coveMesh: THREE.Mesh;
  amphibiousMesh: THREE.Mesh;
  applyWeather: (mode: WeatherMode) => void;
  applyQuality: (quality: QualityLevel) => void;
  setVehicleWake: (x: number, z: number, speedMs: number, inWater: boolean) => void;
  update: (motionTime: number, boatMesh: THREE.Object3D | null) => void;
}

/**
 * Builds a multi-ring concentric polar disc oriented with +Y up on the XZ plane
 * so interior wave vertices displace smoothly across South Cove (unlike CircleGeometry).
 */
export function createSubdividedDiscGeometry(
  radius: number,
  angularSegments = 56,
  radialRings = 18,
): THREE.BufferGeometry {
  const positions: number[] = [0, 0, 0];
  const normals: number[] = [0, 1, 0];
  const uvs: number[] = [0.5, 0.5];
  const indices: number[] = [];

  const ringStride = angularSegments + 1;
  for (let r = 1; r <= radialRings; r++) {
    const dist = (r / radialRings) * radius;
    for (let a = 0; a <= angularSegments; a++) {
      const theta = (a / angularSegments) * Math.PI * 2;
      const x = Math.cos(theta) * dist;
      const z = Math.sin(theta) * dist;
      positions.push(x, 0, z);
      normals.push(0, 1, 0);
      uvs.push(0.5 + (0.5 * x) / radius, 0.5 + (0.5 * z) / radius);
    }
  }

  // Inner fan triangles (winding yields +Y upward normal)
  const firstRingStart = 1;
  for (let a = 0; a < angularSegments; a++) {
    indices.push(0, firstRingStart + a + 1, firstRingStart + a);
  }

  // Concentric quad rings
  for (let r = 1; r < radialRings; r++) {
    const innerStart = 1 + (r - 1) * ringStride;
    const outerStart = 1 + r * ringStride;
    for (let a = 0; a < angularSegments; a++) {
      const iCurr = innerStart + a;
      const iNext = innerStart + a + 1;
      const oCurr = outerStart + a;
      const oNext = outerStart + a + 1;
      indices.push(iCurr, iNext, oNext);
      indices.push(iCurr, oNext, oCurr);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}

const WEATHER_PALETTES: Record<
  WeatherMode,
  {
    baseHex: string;
    shallowHex: string;
    deepHex: string;
    foamHex: string;
    highlightHex: string;
    deepOpacity: number;
    rainStrength: number;
    highlightBoost: number;
    fogDamp: number;
    baseRoughness: number;
    envIntensity: number;
  }
> = {
  clear: {
    baseHex: '#189A94',
    shallowHex: '#2ACEBE',
    deepHex: '#0C6A78',
    foamHex: '#FFFBF2',
    highlightHex: '#FFF4B8',
    deepOpacity: 0.94,
    rainStrength: 0.0,
    highlightBoost: 0.25,
    fogDamp: 0.0,
    baseRoughness: 0.14,
    envIntensity: 0.48,
  },
  sunny: {
    baseHex: '#17948D',
    shallowHex: '#27C2B4',
    deepHex: '#0D6673',
    foamHex: '#FFF9EF',
    highlightHex: '#FFEFA8',
    deepOpacity: 0.94,
    rainStrength: 0.0,
    highlightBoost: 0.22,
    fogDamp: 0.0,
    baseRoughness: 0.15,
    envIntensity: 0.45,
  },
  sunset: {
    baseHex: '#1E7B7D',
    shallowHex: '#33A49C',
    deepHex: '#114456',
    foamHex: '#FFE6CD',
    highlightHex: '#FFA157',
    deepOpacity: 0.94,
    rainStrength: 0.0,
    highlightBoost: 0.3,
    fogDamp: 0.08,
    baseRoughness: 0.16,
    envIntensity: 0.48,
  },
  night: {
    baseHex: '#144D64',
    shallowHex: '#1E6078',
    deepHex: '#0A203A',
    foamHex: '#B6D0EA',
    highlightHex: '#8CB2FF',
    deepOpacity: 0.95,
    rainStrength: 0.0,
    highlightBoost: 0.2,
    fogDamp: 0.06,
    baseRoughness: 0.17,
    envIntensity: 0.42,
  },
  rain: {
    baseHex: '#1A6368',
    shallowHex: '#29797C',
    deepHex: '#103D4A',
    foamHex: '#DCEAF0',
    highlightHex: '#C2D8E6',
    deepOpacity: 0.95,
    rainStrength: 1.0,
    highlightBoost: 0.16,
    fogDamp: 0.18,
    baseRoughness: 0.22,
    envIntensity: 0.36,
  },
  storm: {
    baseHex: '#154B54',
    shallowHex: '#226168',
    deepHex: '#0B2836',
    foamHex: '#C9DAE4',
    highlightHex: '#A7C3D6',
    deepOpacity: 0.96,
    rainStrength: 1.0,
    highlightBoost: 0.14,
    fogDamp: 0.28,
    baseRoughness: 0.26,
    envIntensity: 0.3,
  },
  fog: {
    baseHex: '#2A7E78',
    shallowHex: '#489F96',
    deepHex: '#1E6160',
    foamHex: '#F3ECE0',
    highlightHex: '#F2E2CA',
    deepOpacity: 0.9,
    rainStrength: 0.0,
    highlightBoost: 0.1,
    fogDamp: 0.42,
    baseRoughness: 0.2,
    envIntensity: 0.32,
  },
};

export function createWaterSystem(
  scene: THREE.Scene,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
): WaterSystem {
  let currentWeather: WeatherMode = 'sunny';
  let currentQuality: QualityLevel = 'high';

  const waterUniforms = {
    uTime: { value: 0 },
    uQuality: { value: 2 },
    uWaveScale: { value: 1.0 },
    uRainStrength: { value: 0.0 },
    uHighlightBoost: { value: 0.22 },
    uFogDamp: { value: 0.0 },
    uBaseRoughness: { value: 0.15 },
    uDeepOpacity: { value: 0.94 },
    uShallowColor: { value: new THREE.Color(WEATHER_PALETTES.sunny.shallowHex) },
    uDeepColor: { value: new THREE.Color(WEATHER_PALETTES.sunny.deepHex) },
    uFoamColor: { value: new THREE.Color(WEATHER_PALETTES.sunny.foamHex) },
    uHighlightColor: { value: new THREE.Color(WEATHER_PALETTES.sunny.highlightHex) },
    uVehicleWake: { value: new THREE.Vector4(0, 0, 0, 0) }, // xz, speedIntensity, inWaterActive
  };

  const w0 = WATER_WAVE_OCTAVES[0];
  const w1 = WATER_WAVE_OCTAVES[1];
  const w2 = WATER_WAVE_OCTAVES[2];
  const w3 = WATER_WAVE_OCTAVES[3];

  const waterMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(WEATHER_PALETTES.sunny.baseHex),
    roughness: 0.15,
    metalness: 0.05,
    clearcoat: 0.42,
    clearcoatRoughness: 0.14,
    envMapIntensity: 0.45,
    transparent: true,
    opacity: 0.94,
    depthWrite: false,
  });

  waterMat.customProgramCacheKey = () => 'sanjaya-stylized-water-v2';

  const glslShoreDepthFn = `
    float swEvalShoreDepth(vec2 xz) {
      if (xz.y < 15.0) {
        vec2 c = vec2(${EMERALD_LAGOON_BOUNDS.centerX.toFixed(2)}, ${EMERALD_LAGOON_BOUNDS.centerZ.toFixed(2)});
        float r = ${EMERALD_LAGOON_BOUNDS.cornerRadius.toFixed(2)};
        vec2 b = vec2(${(EMERALD_LAGOON_BOUNDS.halfX - EMERALD_LAGOON_BOUNDS.cornerRadius).toFixed(2)}, ${(EMERALD_LAGOON_BOUNDS.halfZ - EMERALD_LAGOON_BOUNDS.cornerRadius).toFixed(2)});
        vec2 q = abs(xz - c) - b;
        float sdf = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
        return max(0.0, -sdf);
      }
      vec2 coveCenter = vec2(${SOUTH_COVE_BOUNDS.centerX.toFixed(2)}, ${SOUTH_COVE_BOUNDS.centerZ.toFixed(2)});
      float coveD = max(0.0, ${SOUTH_COVE_BOUNDS.radius.toFixed(2)} - length(xz - coveCenter));
      vec2 amphCenter = vec2(${AMPHIBIOUS_LAGOON_BOUNDS.centerX.toFixed(2)}, ${AMPHIBIOUS_LAGOON_BOUNDS.centerZ.toFixed(2)});
      float amphD = max(0.0, ${AMPHIBIOUS_LAGOON_BOUNDS.radius.toFixed(2)} - length(xz - amphCenter));
      return max(coveD, amphD);
    }
  `;

  const glslWaveHelper = `
    float swAddWave(vec2 xz, vec2 dir, float freq, float speed, float amp, float time, inout float dhdx, inout float dhdz) {
      float phase = dot(xz, dir) * freq + time * speed;
      float s = sin(phase);
      float c = cos(phase);
      dhdx += c * amp * freq * dir.x;
      dhdz += c * amp * freq * dir.y;
      return s * amp;
    }

    float swEvalWaves(vec2 xz, float time, float quality, float ampScale, out float dhdx, out float dhdz) {
      dhdx = 0.0;
      dhdz = 0.0;
      float h = 0.0;
      h += swAddWave(xz, vec2(${w0.dirX.toFixed(4)}, ${w0.dirZ.toFixed(4)}), ${w0.freq.toFixed(4)}, ${w0.speed.toFixed(4)}, ${(w0.amp).toFixed(4)} * ampScale, time, dhdx, dhdz);
      h += swAddWave(xz, vec2(${w1.dirX.toFixed(4)}, ${w1.dirZ.toFixed(4)}), ${w1.freq.toFixed(4)}, ${w1.speed.toFixed(4)}, ${(w1.amp).toFixed(4)} * ampScale, time, dhdx, dhdz);
      if (quality > 0.5) {
        h += swAddWave(xz, vec2(${w2.dirX.toFixed(4)}, ${w2.dirZ.toFixed(4)}), ${w2.freq.toFixed(4)}, ${w2.speed.toFixed(4)}, ${(w2.amp).toFixed(4)} * ampScale, time, dhdx, dhdz);
      }
      if (quality > 1.5) {
        h += swAddWave(xz, vec2(${w3.dirX.toFixed(4)}, ${w3.dirZ.toFixed(4)}), ${w3.freq.toFixed(4)}, ${w3.speed.toFixed(4)}, ${(w3.amp).toFixed(4)} * ampScale, time, dhdx, dhdz);
      }
      return h;
    }
  `;

  waterMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, waterUniforms);

    shader.vertexShader = `
      uniform float uTime;
      uniform float uQuality;
      uniform float uWaveScale;
      varying vec3 vWaterWorldPos;
      varying float vWaveCrest;
      varying vec3 vWaterViewRight;
      varying vec3 vWaterViewForward;
      ${glslShoreDepthFn}
      ${glslWaveHelper}
    \n${shader.vertexShader}`
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
         vec2 swWorldXZ = (modelMatrix * vec4(position, 1.0)).xz;
         float swShoreD = swEvalShoreDepth(swWorldXZ);
         float swCoastalDamp = 0.22 + 0.78 * smoothstep(0.0, 1.8, swShoreD);
         float swDhDx = 0.0;
         float swDhDz = 0.0;
         float swDisp = swEvalWaves(swWorldXZ, uTime, uQuality, uWaveScale * swCoastalDamp, swDhDx, swDhDz);
         objectNormal = normalize(vec3(-swDhDx, 1.0, -swDhDz));
        `,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         transformed.y += swDisp;
         vWaterWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
         vWaveCrest = clamp(swDisp / max(0.02, 0.13 * uWaveScale), -1.0, 1.0);
         vWaterViewRight = normalize((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
         vWaterViewForward = normalize((modelViewMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz);
        `,
      );

    shader.fragmentShader = `
      uniform float uTime;
      uniform float uQuality;
      uniform float uRainStrength;
      uniform float uHighlightBoost;
      uniform float uFogDamp;
      uniform float uBaseRoughness;
      uniform float uDeepOpacity;
      uniform vec3 uShallowColor;
      uniform vec3 uDeepColor;
      uniform vec3 uFoamColor;
      uniform vec3 uHighlightColor;
      uniform vec4 uVehicleWake;
      varying vec3 vWaterWorldPos;
      varying float vWaveCrest;
      varying vec3 vWaterViewRight;
      varying vec3 vWaterViewForward;
      ${glslShoreDepthFn}

      float swHash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float swNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        float a = swHash(i);
        float b = swHash(i + vec2(1.0, 0.0));
        float c = swHash(i + vec2(0.0, 1.0));
        float d = swHash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }

      float swPierRipple(vec2 xz, vec2 pierXZ, float radiusScale, float time) {
        float d = length(xz - pierXZ);
        if (d > 2.35 * radiusScale) return 0.0;
        float ring = sin(d * 10.5 - time * 4.2) * 0.5 + 0.5;
        float fade = (1.0 - smoothstep(0.28 * radiusScale, 2.35 * radiusScale, d));
        float collar = smoothstep(0.62 * radiusScale, 0.22 * radiusScale, d);
        return max(ring * fade * 0.55, collar * 0.68);
      }

      float swObstacleRipples(vec2 xz, float time) {
        float acc = 0.0;
        if (xz.y < 0.0 && xz.x > 34.0 && xz.x < 64.0) {
          // Six bridge stone piers (x: 37.2, 42.8; z: -26, -22, -18)
          if (xz.x < 46.0) {
            acc = max(acc, swPierRipple(xz, vec2(37.2, -26.0), 1.0, time));
            acc = max(acc, swPierRipple(xz, vec2(42.8, -26.0), 1.0, time));
            acc = max(acc, swPierRipple(xz, vec2(37.2, -22.0), 1.0, time));
            acc = max(acc, swPierRipple(xz, vec2(42.8, -22.0), 1.0, time));
            acc = max(acc, swPierRipple(xz, vec2(37.2, -18.0), 1.0, time));
            acc = max(acc, swPierRipple(xz, vec2(42.8, -18.0), 1.0, time));
          }
          // Jetty pilings (x: 54.9, 57.1; z: -14.2, -16.5, -18.8) & boat wake (60.0, -20.5)
          if (xz.x > 52.0) {
            acc = max(acc, swPierRipple(xz, vec2(54.9, -14.2), 0.75, time));
            acc = max(acc, swPierRipple(xz, vec2(57.1, -14.2), 0.75, time));
            acc = max(acc, swPierRipple(xz, vec2(54.9, -16.5), 0.75, time));
            acc = max(acc, swPierRipple(xz, vec2(57.1, -16.5), 0.75, time));
            acc = max(acc, swPierRipple(xz, vec2(54.9, -18.8), 0.75, time));
            acc = max(acc, swPierRipple(xz, vec2(57.1, -18.8), 0.75, time));
            vec2 boatDelta = (xz - vec2(${MOORED_BOAT_ANCHOR.x.toFixed(2)}, ${MOORED_BOAT_ANCHOR.z.toFixed(2)})) * vec2(1.0, 0.62);
            float boatDist = length(boatDelta);
            if (boatDist < 3.4) {
              float bWave = sin(boatDist * 8.5 - time * 3.4) * 0.5 + 0.5;
              float bFade = 1.0 - smoothstep(0.65, 3.4, boatDist);
              float bCollar = smoothstep(1.15, 0.7, boatDist);
              acc = max(acc, max(bWave * bFade * 0.62, bCollar * 0.72));
            }
          }
        }
        return acc;
      }

      float swRainRipples(vec2 xz, float time) {
        vec2 uv = xz * 1.35;
        vec2 cell = floor(uv);
        vec2 local = fract(uv);
        float h = swHash(cell);
        vec2 offset = vec2(swHash(cell + 13.7), swHash(cell + 29.3)) * 0.5 + 0.25;
        float cycle = fract(time * 1.45 + h * 6.283);
        float dist = length(local - offset);
        float ring = exp(-abs(dist - cycle * 0.45) * 28.0) * (1.0 - cycle);
        return clamp(ring * 1.35, 0.0, 1.0);
      }
    \n${shader.fragmentShader}`
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         vec2 swXZ = vWaterWorldPos.xz;
         float swDepth = swEvalShoreDepth(swXZ);
         float swDepthBlend = smoothstep(0.0, 4.2, swDepth);
         vec3 swBaseCol = mix(uShallowColor, uDeepColor, swDepthBlend);

         // Subsurface wave-crest lift
         float swCrestLift = smoothstep(0.05, 0.9, vWaveCrest);
         swBaseCol = mix(swBaseCol, uShallowColor * 1.18, swCrestLift * (1.0 - uFogDamp * 0.55) * 0.34);

         // Broken organic coastal foam (never a uniform continuous ring)
         float swN1 = swNoise(swXZ * 0.72 + vec2(uTime * 0.14, -uTime * 0.09));
         float swN2 = uQuality > 0.5 ? swNoise(swXZ * 1.95 - vec2(uTime * 0.22, uTime * 0.18)) : 0.6;
         float swShoreMask = smoothstep(1.05, 0.02, swDepth);
         float swSwash = sin(swDepth * 4.5 - uTime * 2.1 + swN1 * 4.4) * 0.5 + 0.5;
         float swLace = smoothstep(0.42, 0.8, swN1 * 0.56 + swN2 * 0.44);
         float swEdgeFoam = smoothstep(0.24, 0.0, swDepth) * (0.35 + 0.65 * swN2);
         float swShoreFoam = max(swShoreMask * swSwash * swLace * 0.82, swEdgeFoam * 0.56);

         // Subtle whitecaps on brisk waves
         float swWhitecap = uQuality > 0.5
           ? smoothstep(0.62, 0.96, vWaveCrest) * smoothstep(0.45, 0.82, swN2) * (0.2 + uRainStrength * 0.36)
           : 0.0;

         // Localized pier, piling, boat wake, rain rings & live vehicle wake ripples
         float swObstacles = uQuality > 0.5 ? swObstacleRipples(swXZ, uTime) : 0.0;
         float swRainRings = (uRainStrength > 0.01 && uQuality > 0.5) ? swRainRipples(swXZ, uTime) * uRainStrength : 0.0;
         float swVehWake = 0.0;
         if (uVehicleWake.w > 0.05) {
           float vDist = length(swXZ - uVehicleWake.xy);
           if (vDist < 5.5) {
             float vWave = sin(vDist * 7.2 - uTime * 7.5) * 0.5 + 0.5;
             float vFade = 1.0 - smoothstep(0.6, 5.5, vDist);
             float vCore = smoothstep(1.6, 0.5, vDist);
             swVehWake = max(vWave * vFade * 0.8, vCore * 0.72) * uVehicleWake.z * uVehicleWake.w;
           }
         }

         float swTotalFoam = clamp(swShoreFoam + swWhitecap + swObstacles * 0.54 + swRainRings * 0.38 + swVehWake, 0.0, 0.92);
         diffuseColor.rgb = mix(swBaseCol, uFoamColor, swTotalFoam);
         diffuseColor.a = clamp(mix(0.64, uDeepOpacity, smoothstep(0.0, 2.2, swDepth)) + swTotalFoam * 0.2, 0.58, 0.97);
        `,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
         if (uQuality > 0.5) {
           vec2 swMicroUV1 = vWaterWorldPos.xz * 1.45 + vec2(uTime * 0.42, uTime * 0.28);
           vec2 swMicroUV2 = vWaterWorldPos.xz * 2.6 - vec2(uTime * 0.35, -uTime * 0.52);
           float swMx = cos(swMicroUV1.x * 2.3 + swMicroUV1.y) * 0.055 + sin(swMicroUV2.x * 3.1) * 0.035;
           float swMz = sin(swMicroUV1.y * 2.5 - swMicroUV1.x) * 0.055 + cos(swMicroUV2.y * 2.9) * 0.035;
           normal = normalize(normal + vWaterViewRight * swMx + vWaterViewForward * swMz);
         }
        `,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
         roughnessFactor = mix(uBaseRoughness, 0.68, clamp(swTotalFoam, 0.0, 1.0));
        `,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         vec3 swViewDir = normalize(vViewPosition);
         float swFresnel = min(0.32, pow(1.0 - max(dot(normal, swViewDir), 0.0), 3.4) * 0.45);
         float swSparkleNoise = uQuality > 0.5
           ? swNoise(vWaterWorldPos.xz * 2.4 + vec2(uTime * 0.75, -uTime * 0.55))
           : 0.5;
         float swSparkle = smoothstep(0.7, 0.96, swSparkleNoise) * (0.42 + 0.58 * max(0.0, vWaveCrest));
         float swShimmerAmt = (swFresnel + swSparkle * 0.65) * uHighlightBoost * (1.0 - uFogDamp * 0.65);
         totalEmissiveRadiance += uHighlightColor * swShimmerAmt;
        `,
      );
  };

  materials.push(waterMat);

  // Smoothly subdivided Emerald Lagoon plane (~0.53m x 0.40m grid spacing)
  const lagoonGeo = new THREE.PlaneGeometry(60, 17, 112, 42);
  lagoonGeo.rotateX(-Math.PI / 2);
  geometries.push(lagoonGeo);

  const lagoonMesh = new THREE.Mesh(lagoonGeo, waterMat);
  lagoonMesh.position.set(EMERALD_LAGOON_BOUNDS.centerX, WATER_BASE_Y, EMERALD_LAGOON_BOUNDS.centerZ);
  lagoonMesh.receiveShadow = true;
  lagoonMesh.renderOrder = 1;
  scene.add(lagoonMesh);

  // Smooth concentric polar disc for South Cove (fixes single-ring flat CircleGeometry)
  const coveGeo = createSubdividedDiscGeometry(12.4, 56, 18);
  geometries.push(coveGeo);

  const coveMesh = new THREE.Mesh(coveGeo, waterMat);
  coveMesh.position.set(SOUTH_COVE_BOUNDS.centerX, WATER_BASE_Y, SOUTH_COVE_BOUNDS.centerZ);
  coveMesh.receiveShadow = true;
  coveMesh.renderOrder = 1;
  scene.add(coveMesh);

  // Shallow Amphibious Lagoon disc at (-36, 118), r = 22.4m
  const amphGeo = createSubdividedDiscGeometry(22.4, 64, 22);
  geometries.push(amphGeo);

  const amphibiousMesh = new THREE.Mesh(amphGeo, waterMat);
  amphibiousMesh.position.set(AMPHIBIOUS_LAGOON_BOUNDS.centerX, WATER_BASE_Y, AMPHIBIOUS_LAGOON_BOUNDS.centerZ);
  amphibiousMesh.receiveShadow = true;
  amphibiousMesh.renderOrder = 1;
  scene.add(amphibiousMesh);

  const applyWeather = (mode: WeatherMode) => {
    currentWeather = mode;
    const p = WEATHER_PALETTES[mode] ?? WEATHER_PALETTES.sunny;
    waterMat.color.set(p.baseHex);
    waterMat.roughness = p.baseRoughness;
    waterMat.opacity = p.deepOpacity;
    waterMat.envMapIntensity = p.envIntensity;

    waterUniforms.uWaveScale.value = getWeatherWaveScale(mode);
    waterUniforms.uRainStrength.value = p.rainStrength;
    waterUniforms.uHighlightBoost.value = p.highlightBoost;
    waterUniforms.uFogDamp.value = p.fogDamp;
    waterUniforms.uBaseRoughness.value = p.baseRoughness;
    waterUniforms.uDeepOpacity.value = p.deepOpacity;
    waterUniforms.uShallowColor.value.set(p.shallowHex);
    waterUniforms.uDeepColor.value.set(p.deepHex);
    waterUniforms.uFoamColor.value.set(p.foamHex);
    waterUniforms.uHighlightColor.value.set(p.highlightHex);
  };

  const applyQuality = (quality: QualityLevel) => {
    currentQuality = quality;
    waterUniforms.uQuality.value = quality === 'low' ? 0 : quality === 'medium' ? 1 : 2;
  };

  // Pre-allocated scratch objects for zero-GC updates
  const waveSampleScratch: WaterSurfaceSample = {
    worldY: WATER_BASE_Y,
    displacement: 0,
    dhdx: 0,
    dhdz: 0,
    shoreDepth: 0,
  };
  const boatPoseScratch: FloatingBodyPose = {
    y: WATER_BASE_Y,
    pitchX: 0,
    rollZ: 0,
    yawOffset: 0,
  };

  const update = (motionTime: number, boatMesh: THREE.Object3D | null) => {
    waterUniforms.uTime.value = motionTime;

    if (boatMesh) {
      computeFloatingBoatPose(
        MOORED_BOAT_ANCHOR.x,
        MOORED_BOAT_ANCHOR.z,
        MOORED_BOAT_ANCHOR.baseYaw,
        MOORED_BOAT_ANCHOR.draftOffset,
        motionTime,
        currentWeather,
        currentQuality,
        waveSampleScratch,
        boatPoseScratch,
      );
      if (boatMesh.rotation.order !== 'YXZ') {
        boatMesh.rotation.order = 'YXZ';
      }
      boatMesh.position.y = boatPoseScratch.y;
      boatMesh.rotation.x = boatPoseScratch.pitchX;
      boatMesh.rotation.y = MOORED_BOAT_ANCHOR.baseYaw + boatPoseScratch.yawOffset;
      boatMesh.rotation.z = boatPoseScratch.rollZ;
    }
  };

  const setVehicleWake = (x: number, z: number, speedMs: number, inWater: boolean) => {
    waterUniforms.uVehicleWake.value.x = x;
    waterUniforms.uVehicleWake.value.y = z;
    waterUniforms.uVehicleWake.value.z = Math.min(1.25, 0.35 + speedMs * 0.08);
    waterUniforms.uVehicleWake.value.w = inWater ? 1.0 : Math.max(0, waterUniforms.uVehicleWake.value.w * 0.88);
  };

  return {
    waterMat,
    lagoonMesh,
    coveMesh,
    amphibiousMesh,
    applyWeather,
    applyQuality,
    setVehicleWake,
    update,
  };
}
