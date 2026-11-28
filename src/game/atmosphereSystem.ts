import * as THREE from 'three';
import type { QualityLevel, WeatherMode } from '../types/portfolio';
import {
  WEATHER_ATMOSPHERE_PRESETS,
  generateCloudLayerConfigs,
  getShadowConfigForQuality,
} from './atmospherePresets';
import { computeGroundHeight } from './physicsMath';
import { isInsideTunnelZone } from './worldLayout';

export interface AtmosphereCallbacks {
  onWetnessUpdate?: (wetness: number) => void;
  onNightGlowUpdate?: (nightGlow: number, lighthouseOpacity: number) => void;
}

export interface AtmosphereSystem {
  applyWeatherMode: (mode: WeatherMode, immediate?: boolean) => void;
  setQualityProfile: (quality: QualityLevel, reducedMotion: boolean, isSoftwareGl: boolean) => void;
  setDayNightCycle: (enabled: boolean) => void;
  setPlayerPosition: (x: number, z: number) => void;
  update: (motionTime: number, dt: number) => void;
  getWetness: () => number;
  getNightGlow: () => number;
  getSunDirection: (out: THREE.Vector3) => THREE.Vector3;
}

interface CloudRuntime {
  grp: THREE.Group;
  layer: 'cumulus' | 'cirrus';
  baseY: number;
  vx: number;
  vz: number;
  bobPhase: number;
  bobAmp: number;
}

interface RainDropRuntime {
  x: number;
  y: number;
  z: number;
  speed: number;
  vx: number;
  vz: number;
  lenScale: number;
  thickScale: number;
}

export function createAtmosphereSystem(
  scene: THREE.Scene,
  fog: THREE.FogExp2,
  hemi: THREE.HemisphereLight,
  sun: THREE.DirectionalLight,
  coolFill: THREE.DirectionalLight,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  callbacks: AtmosphereCallbacks = {},
): AtmosphereSystem {
  const initial = WEATHER_ATMOSPHERE_PRESETS.sunny;

  // =========================================================================
  // 1. PROCEDURAL ATMOSPHERIC SKY DOME SHADER (Zenith/Mid/Horizon + Sun/Moon)
  // =========================================================================
  const skyUniforms = {
    uHorizonColor: { value: new THREE.Color(initial.skyHorizonHex) },
    uMidColor: { value: new THREE.Color(initial.skyMidHex) },
    uZenithColor: { value: new THREE.Color(initial.skyZenithHex) },
    uSunsetRoseColor: { value: new THREE.Color(initial.sunsetRoseHex) },
    uSunsetBandStrength: { value: initial.sunsetBandStrength },
    uCelestialDir: { value: new THREE.Vector3(...initial.celestialDir) },
    uCelestialColor: { value: new THREE.Color(initial.celestialColorHex) },
    uCelestialHaloColor: { value: new THREE.Color(initial.celestialHaloHex) },
    uCelestialDiscSize: { value: initial.celestialDiscSize },
    uCelestialDiscOpacity: { value: initial.celestialDiscOpacity },
    uCelestialHaloStrength: { value: initial.celestialHaloStrength },
  };

  const skyGeo = new THREE.SphereGeometry(250, 36, 24);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uHorizonColor;
      uniform vec3 uMidColor;
      uniform vec3 uZenithColor;
      uniform vec3 uSunsetRoseColor;
      uniform float uSunsetBandStrength;
      uniform vec3 uCelestialDir;
      uniform vec3 uCelestialColor;
      uniform vec3 uCelestialHaloColor;
      uniform float uCelestialDiscSize;
      uniform float uCelestialDiscOpacity;
      uniform float uCelestialHaloStrength;
      varying vec3 vWorldDir;

      void main() {
        vec3 dir = normalize(vWorldDir);
        float elev = clamp(dir.y, -0.15, 1.0);

        vec3 col;
        if (elev < 0.0) {
          col = uHorizonColor;
        } else if (elev < 0.085) {
          float t = smoothstep(0.0, 0.085, elev);
          col = mix(uHorizonColor, uMidColor, t);
        } else {
          float t = pow(smoothstep(0.085, 0.40, elev), 0.78);
          col = mix(uMidColor, uZenithColor, t);
        }

        // Soft sunset/twilight rose band just above horizon facing the celestial light
        float horizonBand = exp(-max(elev, 0.0) * 10.5);
        float sunFacing = max(dot(normalize(vec3(dir.x, 0.0, dir.z) + vec3(0.0001)), normalize(vec3(uCelestialDir.x, 0.0, uCelestialDir.z) + vec3(0.0001))), 0.0);
        float roseFactor = horizonBand * uSunsetBandStrength * (0.38 + 0.62 * sunFacing);
        col = mix(col, uSunsetRoseColor, clamp(roseFactor * 0.68, 0.0, 0.74));

        // Celestial disc + Mie scattering glow halo
        float cosTheta = max(dot(dir, normalize(uCelestialDir)), 0.0);
        float mieWide = pow(cosTheta, 5.0) * 0.32;
        float mieCore = pow(cosTheta, 28.0) * 0.68;
        float aboveHorizon = smoothstep(-0.04, 0.04, dir.y);
        col += uCelestialHaloColor * (mieWide + mieCore) * uCelestialHaloStrength * aboveHorizon;

        float discMask = smoothstep(uCelestialDiscSize - 0.0016, uCelestialDiscSize + 0.0006, cosTheta);
        col = mix(col, uCelestialColor, discMask * uCelestialDiscOpacity * aboveHorizon);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  geometries.push(skyGeo);
  materials.push(skyMat);
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  skyMesh.frustumCulled = false;
  scene.add(skyMesh);

  // =========================================================================
  // 2. TWINKLING NIGHT STARFIELD
  // =========================================================================
  const starCount = 460;
  const starPos = new Float32Array(starCount * 3);
  const starSize = new Float32Array(starCount);
  const starPhase = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    const theta = ((i * 137.508) % 360) * (Math.PI / 180) + (Math.random() - 0.5) * 0.2;
    const phi = 0.14 + Math.random() * (Math.PI * 0.435);
    const r = 224;
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi) + 2;
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    starSize[i] = 1.8 + Math.random() * 2.6;
    starPhase[i] = Math.random() * Math.PI * 2;
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSize, 1));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(starPhase, 1));

  const starUniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0 },
  };
  const starMat = new THREE.ShaderMaterial({
    uniforms: starUniforms,
    transparent: true,
    depthWrite: false,
    fog: false,
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime;
      varying float vTwinkle;
      void main() {
        vTwinkle = 0.58 + 0.42 * sin(uTime * (1.2 + mod(aPhase, 1.4)) + aPhase);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (0.85 + 0.35 * vTwinkle);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying float vTwinkle;
      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        if (d > 0.5) discard;
        float core = smoothstep(0.5, 0.08, d);
        gl_FragColor = vec4(0.95, 0.97, 1.0, core * vTwinkle * uOpacity);
      }
    `,
  });
  geometries.push(starGeo);
  materials.push(starMat);
  const starDome = new THREE.Points(starGeo, starMat);
  starDome.visible = false;
  starDome.frustumCulled = false;
  scene.add(starDome);

  // =========================================================================
  // 3. MULTI-LAYERED CLOUDS WITH VARIED DIRECTIONS & SPEEDS
  // =========================================================================
  const cloudGroup = new THREE.Group();
  const cumulusGeo = new THREE.DodecahedronGeometry(3.2, 1);
  const cirrusGeo = new THREE.DodecahedronGeometry(3.6, 1);
  cirrusGeo.scale(2.1, 0.26, 0.72);
  geometries.push(cumulusGeo, cirrusGeo);

  const cloudCumulusMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(initial.cloudCumulusHex),
    transparent: true,
    opacity: initial.cloudOpacity,
  });
  const cloudCirrusMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(initial.cloudCirrusHex),
    transparent: true,
    opacity: initial.cloudOpacity * 0.54,
  });
  materials.push(cloudCumulusMat, cloudCirrusMat);

  const cloudConfigs = generateCloudLayerConfigs();
  const clouds: CloudRuntime[] = [];

  for (const cfg of cloudConfigs) {
    const cg = new THREE.Group();
    if (cfg.layer === 'cumulus') {
      for (let p = 0; p < cfg.puffCount; p++) {
        const puff = new THREE.Mesh(cumulusGeo, cloudCumulusMat);
        const offsetX = (p - (cfg.puffCount - 1) * 0.5) * 2.85;
        const offsetY = p === 1 || p === 2 ? 0.78 : 0.05;
        const offsetZ = (p % 2 === 0 ? 1 : -1) * 0.65;
        puff.position.set(offsetX, offsetY, offsetZ);
        const pScale = p === 1 ? 1.18 : 0.78 + (p % 2) * 0.16;
        puff.scale.set(pScale * 1.15, pScale * 0.68, pScale * 0.92);
        cg.add(puff);
      }
    } else {
      for (let p = 0; p < cfg.puffCount; p++) {
        const wisp = new THREE.Mesh(cirrusGeo, cloudCirrusMat);
        wisp.position.set((p - 1) * 4.4, (p % 2) * 0.3, (p - 1) * 0.9);
        wisp.scale.setScalar(p === 1 ? 1.12 : 0.82);
        cg.add(wisp);
      }
    }
    cg.position.set(cfg.x, cfg.y, cfg.z);
    cg.rotation.y = cfg.yaw;
    cg.scale.setScalar(cfg.scale);
    cloudGroup.add(cg);
    clouds.push({
      grp: cg,
      layer: cfg.layer,
      baseY: cfg.y,
      vx: cfg.vx,
      vz: cfg.vz,
      bobPhase: cfg.bobPhase,
      bobAmp: cfg.bobAmp,
    });
  }
  scene.add(cloudGroup);

  // =========================================================================
  // 4. VARIED NATURAL WIND-SLANTED RAIN & LOCALIZED PUDDLES
  // =========================================================================
  const maxRainCount = 380;
  let activeRainCount = maxRainCount;
  const rainGeo = new THREE.CylinderGeometry(0.018, 0.032, 1.55, 5);
  const rainMat = new THREE.MeshBasicMaterial({
    color: 0xe8f5ff,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  geometries.push(rainGeo);
  materials.push(rainMat);
  const rainInst = new THREE.InstancedMesh(rainGeo, rainMat, maxRainCount);
  rainInst.visible = false;
  rainInst.frustumCulled = false;

  const rainDrops: RainDropRuntime[] = [];
  const rainDummy = new THREE.Object3D();
  for (let i = 0; i < maxRainCount; i++) {
    rainDrops.push({
      x: (Math.random() - 0.5) * 146,
      y: Math.random() * 36,
      z: (Math.random() - 0.5) * 146,
      speed: 24 + Math.random() * 14,
      vx: -3.2 - Math.random() * 1.4,
      vz: -1.1 - Math.random() * 0.8,
      lenScale: 0.7 + Math.random() * 0.95,
      thickScale: 0.75 + Math.random() * 0.6,
    });
  }
  scene.add(rainInst);

  // Subtle glistening wet puddles in flat plaza / roadside pockets during rain
  const puddleGeo = new THREE.CircleGeometry(1, 18);
  puddleGeo.rotateX(-Math.PI / 2);
  geometries.push(puddleGeo);

  const puddleMat = new THREE.MeshPhysicalMaterial({
    color: 0x3b4d5a,
    roughness: 0.06,
    metalness: 0.14,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.45,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  materials.push(puddleMat);

  const puddleDefs: { x: number; z: number; sx: number; sz: number; rot: number }[] = [
    { x: -10.5, z: 6.5, sx: 2.3, sz: 1.65, rot: 0.4 },
    { x: 11.2, z: -7.4, sx: 2.1, sz: 1.45, rot: -0.5 },
    { x: -24.5, z: 14.0, sx: 2.4, sz: 1.7, rot: 0.8 },
    { x: 26.5, z: 19.5, sx: 2.0, sz: 1.5, rot: -0.3 },
    { x: -51.0, z: 18.0, sx: 2.5, sz: 1.8, rot: 0.2 },
    { x: 39.2, z: 2.0, sx: 2.2, sz: 1.55, rot: 1.1 },
    { x: 7.5, z: 28.0, sx: 1.9, sz: 1.4, rot: -0.9 },
  ];
  const puddleGroup = new THREE.Group();
  for (const pd of puddleDefs) {
    const m = new THREE.Mesh(puddleGeo, puddleMat);
    const gy = computeGroundHeight(pd.x, pd.z);
    m.position.set(pd.x, gy + 0.048, pd.z);
    m.rotation.y = pd.rot;
    m.scale.set(pd.sx, 1, pd.sz);
    puddleGroup.add(m);
  }
  puddleGroup.visible = false;
  scene.add(puddleGroup);

  // =========================================================================
  // 4B. LAYERED FBM NOISE-DISPLACED MOUNTAIN RIDGES WITH SNOW CAPS
  // =========================================================================
  const mountainRings = [
    { radius: 196, baseHeight: 22, amplitude: 17, peakPower: 1.45, seed: 1.7, snowThreshold: 0.62, rockColor: 0x5c686e },
    { radius: 224, baseHeight: 32, amplitude: 24, peakPower: 1.35, seed: 4.9, snowThreshold: 0.56, rockColor: 0x4b5863 },
  ];
  for (const ring of mountainRings) {
    const radialSegs = 96;
    const heightSegs = 6;
    const mGeo = new THREE.CylinderGeometry(ring.radius, ring.radius + 14, 1, radialSegs, heightSegs, true);
    const pos = mGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const baseRock = new THREE.Color(ring.rockColor);
    const alpineGrass = new THREE.Color(0x4b6a50);
    const snowCol = new THREE.Color(0xf4f7fa);
    const tmpCol = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i) + 0.5; // 0..1 from skirt base to crest
      const vz = pos.getZ(i);
      const ang = Math.atan2(vz, vx);
      // Multi-octave deterministic ridge noise
      const ridge1 = Math.sin(ang * 5 + ring.seed) * 0.5 + 0.5;
      const ridge2 = Math.sin(ang * 13 - ring.seed * 1.4) * 0.5 + 0.5;
      const ridge3 = Math.cos(ang * 23 + ring.seed * 0.7) * 0.5 + 0.5;
      const ridgeNoise = Math.pow(ridge1 * 0.54 + ridge2 * 0.31 + ridge3 * 0.15, ring.peakPower);
      const crestY = ring.baseHeight + ridgeNoise * ring.amplitude;
      const outPush = (1 - vy) * 8.0 + (ridge2 - 0.5) * 4.5 * vy;
      const rScale = (ring.radius + outPush) / ring.radius;
      const worldY = -4.0 + vy * crestY;

      pos.setXYZ(i, vx * rScale, worldY, vz * rScale);

      const heightNorm = (vy * crestY - ring.baseHeight * 0.5) / (ring.amplitude + ring.baseHeight * 0.5);
      if (heightNorm > ring.snowThreshold && vy > 0.55) {
        const snowMix = THREE.MathUtils.clamp((heightNorm - ring.snowThreshold) * 3.4, 0, 1);
        tmpCol.copy(baseRock).lerp(snowCol, snowMix);
      } else {
        const mossMix = THREE.MathUtils.clamp(1 - vy * 1.6, 0, 1);
        tmpCol.copy(baseRock).lerp(alpineGrass, mossMix * 0.55);
      }
      colors[i * 3] = tmpCol.r;
      colors[i * 3 + 1] = tmpCol.g;
      colors[i * 3 + 2] = tmpCol.b;
    }
    mGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    mGeo.computeVertexNormals();
    const mMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.94,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    geometries.push(mGeo);
    materials.push(mMat);
    const mMesh = new THREE.Mesh(mGeo, mMat);
    mMesh.receiveShadow = false;
    mMesh.castShadow = false;
    scene.add(mMesh);
  }

  // =========================================================================
  // 5. SMOOTH WEATHER TRANSITION STATE + SCRATCH TARGETS (ZERO GC)
  // =========================================================================
  let targetWeather: WeatherMode = 'sunny';
  let currentQuality: QualityLevel = 'high';
  let currentReducedMotion = false;
  let currentSoftwareGl = false;
  let dayNightEnabled = false;
  let playerInsideTunnel = false;
  let tunnelDimBlend = 0;
  let stormFlash = 0;
  let nextLightningIn = 5.5;
  const _daySunPos = new THREE.Vector3();
  const _dayCelestialDir = new THREE.Vector3();

  const curState = {
    fogColor: new THREE.Color(initial.fogHex),
    fogDensity: initial.fogDensity,
    skyHorizon: new THREE.Color(initial.skyHorizonHex),
    skyMid: new THREE.Color(initial.skyMidHex),
    skyZenith: new THREE.Color(initial.skyZenithHex),
    sunsetRose: new THREE.Color(initial.sunsetRoseHex),
    sunsetBandStrength: initial.sunsetBandStrength,
    celestialDir: new THREE.Vector3(...initial.celestialDir),
    celestialColor: new THREE.Color(initial.celestialColorHex),
    celestialHaloColor: new THREE.Color(initial.celestialHaloHex),
    celestialDiscSize: initial.celestialDiscSize,
    celestialDiscOpacity: initial.celestialDiscOpacity,
    celestialHaloStrength: initial.celestialHaloStrength,
    starOpacity: initial.starOpacity,
    cloudCumulus: new THREE.Color(initial.cloudCumulusHex),
    cloudCirrus: new THREE.Color(initial.cloudCirrusHex),
    cloudOpacity: initial.cloudOpacity,
    hemiSky: new THREE.Color(initial.hemiSkyHex),
    hemiGround: new THREE.Color(initial.hemiGroundHex),
    hemiIntensity: initial.hemiIntensity,
    sunColor: new THREE.Color(initial.sunColorHex),
    sunIntensity: initial.sunIntensity,
    sunPos: new THREE.Vector3(...initial.sunPos),
    fillColor: new THREE.Color(initial.fillColorHex),
    fillIntensity: initial.fillIntensity,
    envIntensity: initial.envIntensity,
    wetness: initial.wetness,
    rainStrength: initial.rainStrength,
    nightGlow: initial.nightGlow,
    lighthouseBeamOpacity: initial.lighthouseBeamOpacity,
  };

  const targetColors = {
    fogColor: new THREE.Color(),
    skyHorizon: new THREE.Color(),
    skyMid: new THREE.Color(),
    skyZenith: new THREE.Color(),
    sunsetRose: new THREE.Color(),
    celestialDir: new THREE.Vector3(),
    celestialColor: new THREE.Color(),
    celestialHaloColor: new THREE.Color(),
    cloudCumulus: new THREE.Color(),
    cloudCirrus: new THREE.Color(),
    hemiSky: new THREE.Color(),
    hemiGround: new THREE.Color(),
    sunColor: new THREE.Color(),
    sunPos: new THREE.Vector3(),
    fillColor: new THREE.Color(),
  };

  const syncRendererFromState = () => {
    fog.color.copy(curState.fogColor);
    fog.density = curState.fogDensity;
    if (scene.background instanceof THREE.Color) {
      scene.background.copy(curState.fogColor);
    } else {
      scene.background = curState.fogColor.clone();
    }

    skyUniforms.uHorizonColor.value.copy(curState.skyHorizon);
    skyUniforms.uMidColor.value.copy(curState.skyMid);
    skyUniforms.uZenithColor.value.copy(curState.skyZenith);
    skyUniforms.uSunsetRoseColor.value.copy(curState.sunsetRose);
    skyUniforms.uSunsetBandStrength.value = curState.sunsetBandStrength;
    skyUniforms.uCelestialDir.value.copy(curState.celestialDir).normalize();
    skyUniforms.uCelestialColor.value.copy(curState.celestialColor);
    skyUniforms.uCelestialHaloColor.value.copy(curState.celestialHaloColor);
    skyUniforms.uCelestialDiscSize.value = curState.celestialDiscSize;
    skyUniforms.uCelestialDiscOpacity.value = curState.celestialDiscOpacity;
    skyUniforms.uCelestialHaloStrength.value = curState.celestialHaloStrength;

    starUniforms.uOpacity.value = curState.starOpacity;
    starDome.visible = curState.starOpacity > 0.015;

    cloudCumulusMat.color.copy(curState.cloudCumulus);
    cloudCirrusMat.color.copy(curState.cloudCirrus);
    const qualityCloudOpacityScale = currentQuality === 'low' ? 0.85 : 1.0;
    cloudCumulusMat.opacity = curState.cloudOpacity * qualityCloudOpacityScale;
    cloudCirrusMat.opacity = curState.cloudOpacity * 0.54 * qualityCloudOpacityScale;

    const insideDim = 1 - tunnelDimBlend * 0.42;
    hemi.color.copy(curState.hemiSky);
    hemi.groundColor.copy(curState.hemiGround);
    hemi.intensity = curState.hemiIntensity * insideDim;

    sun.color.copy(curState.sunColor);
    sun.intensity = (curState.sunIntensity + stormFlash * 1.15) * (1 - tunnelDimBlend * 0.55);
    sun.position.copy(curState.sunPos);

    // Calibrate normalBias dynamically for low sunset shadows vs high noon shadows
    const shadowCfg = getShadowConfigForQuality(currentQuality, currentSoftwareGl);
    const lowAngleBlend = THREE.MathUtils.clamp((45 - sun.position.y) / 24, 0, 1);
    sun.shadow.normalBias = THREE.MathUtils.lerp(
      shadowCfg.normalBias,
      shadowCfg.sunsetNormalBias,
      lowAngleBlend,
    );

    coolFill.color.copy(curState.fillColor);
    coolFill.intensity = curState.fillIntensity;
    scene.environmentIntensity = curState.envIntensity * insideDim;

    // Occlude exterior rain streaks cleanly inside the roofed West Ridge Tunnel
    const rainVisible = curState.rainStrength > 0.02 && !currentReducedMotion && tunnelDimBlend < 0.7;
    rainInst.visible = rainVisible;
    rainMat.opacity = Math.min(0.7, curState.rainStrength * 0.52) * (1 - tunnelDimBlend);

    const puddleOpacity = currentQuality === 'low' ? 0 : curState.wetness * 0.56;
    puddleGroup.visible = puddleOpacity > 0.015;
    puddleMat.opacity = puddleOpacity;

    callbacks.onWetnessUpdate?.(curState.wetness);
    callbacks.onNightGlowUpdate?.(
      Math.max(curState.nightGlow, tunnelDimBlend * 0.9),
      curState.lighthouseBeamOpacity,
    );
  };

  const applyWeatherMode = (mode: WeatherMode, immediate = false) => {
    targetWeather = mode;
    const p = WEATHER_ATMOSPHERE_PRESETS[mode] ?? WEATHER_ATMOSPHERE_PRESETS.sunny;

    if (immediate) {
      curState.fogColor.set(p.fogHex);
      curState.fogDensity = p.fogDensity;
      curState.skyHorizon.set(p.skyHorizonHex);
      curState.skyMid.set(p.skyMidHex);
      curState.skyZenith.set(p.skyZenithHex);
      curState.sunsetRose.set(p.sunsetRoseHex);
      curState.sunsetBandStrength = p.sunsetBandStrength;
      curState.celestialDir.set(...p.celestialDir);
      curState.celestialColor.set(p.celestialColorHex);
      curState.celestialHaloColor.set(p.celestialHaloHex);
      curState.celestialDiscSize = p.celestialDiscSize;
      curState.celestialDiscOpacity = p.celestialDiscOpacity;
      curState.celestialHaloStrength = p.celestialHaloStrength;
      curState.starOpacity = p.starOpacity;
      curState.cloudCumulus.set(p.cloudCumulusHex);
      curState.cloudCirrus.set(p.cloudCirrusHex);
      curState.cloudOpacity = p.cloudOpacity;
      curState.hemiSky.set(p.hemiSkyHex);
      curState.hemiGround.set(p.hemiGroundHex);
      curState.hemiIntensity = p.hemiIntensity;
      curState.sunColor.set(p.sunColorHex);
      curState.sunIntensity = p.sunIntensity;
      curState.sunPos.set(...p.sunPos);
      curState.fillColor.set(p.fillColorHex);
      curState.fillIntensity = p.fillIntensity;
      curState.envIntensity = p.envIntensity;
      curState.wetness = p.wetness;
      curState.rainStrength = p.rainStrength;
      curState.nightGlow = p.nightGlow;
      curState.lighthouseBeamOpacity = p.lighthouseBeamOpacity;
      syncRendererFromState();
    }
  };

  const setQualityProfile = (
    quality: QualityLevel,
    reducedMotion: boolean,
    isSoftwareGl: boolean,
  ) => {
    currentQuality = quality;
    currentReducedMotion = reducedMotion;
    currentSoftwareGl = isSoftwareGl;

    const shadowCfg = getShadowConfigForQuality(quality, isSoftwareGl);
    sun.castShadow = shadowCfg.enabled;
    sun.shadow.camera.left = -shadowCfg.frustumHalfExtent;
    sun.shadow.camera.right = shadowCfg.frustumHalfExtent;
    sun.shadow.camera.top = shadowCfg.frustumHalfExtent;
    sun.shadow.camera.bottom = -shadowCfg.frustumHalfExtent;
    sun.shadow.camera.near = 12;
    sun.shadow.camera.far = 215;
    sun.shadow.bias = shadowCfg.bias;
    sun.shadow.normalBias = shadowCfg.normalBias;
    sun.shadow.camera.updateProjectionMatrix();

    if (
      sun.shadow.mapSize.width !== shadowCfg.mapSize ||
      sun.shadow.mapSize.height !== shadowCfg.mapSize
    ) {
      sun.shadow.mapSize.set(shadowCfg.mapSize, shadowCfg.mapSize);
      if (sun.shadow.map) {
        sun.shadow.map.dispose();
        sun.shadow.map = null;
      }
      sun.shadow.needsUpdate = true;
    }

    activeRainCount = quality === 'low' ? 140 : maxRainCount;
    rainInst.count = activeRainCount;

    clouds.forEach((c, idx) => {
      if (quality === 'low') {
        c.grp.visible = c.layer === 'cumulus' && idx % 2 === 0;
      } else {
        c.grp.visible = true;
      }
    });

    syncRendererFromState();
  };

  const update = (motionTime: number, dt: number) => {
    const p = WEATHER_ATMOSPHERE_PRESETS[targetWeather] ?? WEATHER_ATMOSPHERE_PRESETS.sunny;

    tunnelDimBlend = THREE.MathUtils.lerp(
      tunnelDimBlend,
      playerInsideTunnel ? 1 : 0,
      1 - Math.exp(-dt * 8.0),
    );

    if (targetWeather === 'storm' && !currentReducedMotion) {
      nextLightningIn -= dt;
      if (nextLightningIn <= 0) {
        stormFlash = 1.0;
        nextLightningIn = 4.5 + ((motionTime * 3.17) % 6.0);
      }
      stormFlash = Math.max(0, stormFlash - dt * 5.2);
    } else {
      stormFlash = 0;
    }

    // Smooth liquid transition toward target weather preset (~1.0s wall-clock fade)
    const lerpAlpha = 1 - Math.exp(-dt * 4.2);
    targetColors.fogColor.set(p.fogHex);
    targetColors.skyHorizon.set(p.skyHorizonHex);
    targetColors.skyMid.set(p.skyMidHex);
    targetColors.skyZenith.set(p.skyZenithHex);
    targetColors.sunsetRose.set(p.sunsetRoseHex);
    targetColors.celestialDir.set(...p.celestialDir);
    targetColors.celestialColor.set(p.celestialColorHex);
    targetColors.celestialHaloColor.set(p.celestialHaloHex);
    targetColors.cloudCumulus.set(p.cloudCumulusHex);
    targetColors.cloudCirrus.set(p.cloudCirrusHex);
    targetColors.hemiSky.set(p.hemiSkyHex);
    targetColors.hemiGround.set(p.hemiGroundHex);
    targetColors.sunColor.set(p.sunColorHex);
    targetColors.sunPos.set(...p.sunPos);
    targetColors.fillColor.set(p.fillColorHex);

    if (dayNightEnabled && targetWeather !== 'night') {
      const cycleAng = (motionTime * 0.045) % (Math.PI * 2);
      const elev = Math.sin(cycleAng);
      const sunH = THREE.MathUtils.lerp(18, 86, Math.max(0, elev * 0.5 + 0.5));
      _daySunPos.set(Math.cos(cycleAng) * 74, sunH, Math.sin(cycleAng) * 52);
      targetColors.sunPos.copy(_daySunPos);
      _dayCelestialDir.copy(_daySunPos).normalize();
      targetColors.celestialDir.copy(_dayCelestialDir);
    }

    curState.fogColor.lerp(targetColors.fogColor, lerpAlpha);
    curState.fogDensity = THREE.MathUtils.lerp(curState.fogDensity, p.fogDensity, lerpAlpha);
    curState.skyHorizon.lerp(targetColors.skyHorizon, lerpAlpha);
    curState.skyMid.lerp(targetColors.skyMid, lerpAlpha);
    curState.skyZenith.lerp(targetColors.skyZenith, lerpAlpha);
    curState.sunsetRose.lerp(targetColors.sunsetRose, lerpAlpha);
    curState.sunsetBandStrength = THREE.MathUtils.lerp(
      curState.sunsetBandStrength,
      p.sunsetBandStrength,
      lerpAlpha,
    );
    curState.celestialDir.lerp(targetColors.celestialDir, lerpAlpha).normalize();
    curState.celestialColor.lerp(targetColors.celestialColor, lerpAlpha);
    curState.celestialHaloColor.lerp(targetColors.celestialHaloColor, lerpAlpha);
    curState.celestialDiscSize = THREE.MathUtils.lerp(
      curState.celestialDiscSize,
      p.celestialDiscSize,
      lerpAlpha,
    );
    curState.celestialDiscOpacity = THREE.MathUtils.lerp(
      curState.celestialDiscOpacity,
      p.celestialDiscOpacity,
      lerpAlpha,
    );
    curState.celestialHaloStrength = THREE.MathUtils.lerp(
      curState.celestialHaloStrength,
      p.celestialHaloStrength,
      lerpAlpha,
    );
    curState.starOpacity = THREE.MathUtils.lerp(curState.starOpacity, p.starOpacity, lerpAlpha);
    curState.cloudCumulus.lerp(targetColors.cloudCumulus, lerpAlpha);
    curState.cloudCirrus.lerp(targetColors.cloudCirrus, lerpAlpha);
    curState.cloudOpacity = THREE.MathUtils.lerp(curState.cloudOpacity, p.cloudOpacity, lerpAlpha);
    curState.hemiSky.lerp(targetColors.hemiSky, lerpAlpha);
    curState.hemiGround.lerp(targetColors.hemiGround, lerpAlpha);
    curState.hemiIntensity = THREE.MathUtils.lerp(
      curState.hemiIntensity,
      p.hemiIntensity,
      lerpAlpha,
    );
    curState.sunColor.lerp(targetColors.sunColor, lerpAlpha);
    curState.sunIntensity = THREE.MathUtils.lerp(curState.sunIntensity, p.sunIntensity, lerpAlpha);
    curState.sunPos.lerp(targetColors.sunPos, lerpAlpha);
    curState.fillColor.lerp(targetColors.fillColor, lerpAlpha);
    curState.fillIntensity = THREE.MathUtils.lerp(
      curState.fillIntensity,
      p.fillIntensity,
      lerpAlpha,
    );
    curState.envIntensity = THREE.MathUtils.lerp(
      curState.envIntensity,
      p.envIntensity,
      lerpAlpha,
    );
    curState.wetness = THREE.MathUtils.lerp(curState.wetness, p.wetness, lerpAlpha);
    curState.rainStrength = THREE.MathUtils.lerp(curState.rainStrength, p.rainStrength, lerpAlpha);
    curState.nightGlow = THREE.MathUtils.lerp(curState.nightGlow, p.nightGlow, lerpAlpha);
    curState.lighthouseBeamOpacity = THREE.MathUtils.lerp(
      curState.lighthouseBeamOpacity,
      p.lighthouseBeamOpacity,
      lerpAlpha,
    );

    syncRendererFromState();

    // Animate stars twinkle
    if (starDome.visible) {
      starUniforms.uTime.value = motionTime;
    }

    // Animate multi-layer clouds along diverse velocity vectors + gentle vertical bob
    if (!currentReducedMotion) {
      const windBoost =
        targetWeather === 'storm' ? 1.85 : targetWeather === 'rain' ? 1.35 : targetWeather === 'fog' ? 0.65 : 1.0;
      for (const c of clouds) {
        if (!c.grp.visible) continue;
        c.grp.position.x += c.vx * windBoost * dt;
        c.grp.position.z += c.vz * windBoost * dt;
        c.grp.position.y = c.baseY + Math.sin(motionTime * 0.45 + c.bobPhase) * c.bobAmp;
        if (c.grp.position.x > 148) c.grp.position.x = -148;
        if (c.grp.position.x < -148) c.grp.position.x = 148;
        if (c.grp.position.z > 130) c.grp.position.z = -130;
        if (c.grp.position.z < -130) c.grp.position.z = 130;
      }
    }

    // Animate varied wind-slanted rain drops
    if (rainInst.visible && !currentReducedMotion) {
      const stormGain = targetWeather === 'storm' ? 1.35 : 1.0;
      for (let i = 0; i < activeRainCount; i++) {
        const drop = rainDrops[i];
        drop.y -= drop.speed * stormGain * dt;
        drop.x += drop.vx * stormGain * dt;
        drop.z += drop.vz * stormGain * dt;
        if (drop.y < -1) {
          drop.y = 33 + Math.random() * 6;
          drop.x = (Math.random() - 0.5) * 146;
          drop.z = (Math.random() - 0.5) * 146;
        }
        rainDummy.position.set(drop.x, drop.y, drop.z);
        rainDummy.rotation.set(drop.vz / drop.speed, 0, -drop.vx / drop.speed);
        rainDummy.scale.set(drop.thickScale, drop.lenScale * stormGain, drop.thickScale);
        rainDummy.updateMatrix();
        rainInst.setMatrixAt(i, rainDummy.matrix);
      }
      rainInst.instanceMatrix.needsUpdate = true;
    }
  };

  return {
    applyWeatherMode,
    setQualityProfile,
    setDayNightCycle: (enabled: boolean) => {
      dayNightEnabled = enabled;
    },
    setPlayerPosition: (x: number, z: number) => {
      playerInsideTunnel = isInsideTunnelZone(x, z);
    },
    update,
    getWetness: () => curState.wetness,
    getNightGlow: () => curState.nightGlow,
    getSunDirection: (out: THREE.Vector3) => out.copy(curState.sunPos).normalize(),
  };
}
