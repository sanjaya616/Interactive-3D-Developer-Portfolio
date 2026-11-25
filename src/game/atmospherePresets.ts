import type { QualityLevel, WeatherMode } from '../types/portfolio';

export interface WeatherAtmospherePreset {
  fogHex: string;
  fogDensity: number;
  skyHorizonHex: string;
  skyMidHex: string;
  skyZenithHex: string;
  sunsetBandStrength: number;
  sunsetRoseHex: string;
  celestialDir: [number, number, number];
  celestialColorHex: string;
  celestialHaloHex: string;
  celestialDiscSize: number;
  celestialDiscOpacity: number;
  celestialHaloStrength: number;
  starOpacity: number;
  cloudCumulusHex: string;
  cloudCirrusHex: string;
  cloudOpacity: number;
  hemiSkyHex: string;
  hemiGroundHex: string;
  hemiIntensity: number;
  sunColorHex: string;
  sunIntensity: number;
  sunPos: [number, number, number];
  fillColorHex: string;
  fillIntensity: number;
  envIntensity: number;
  wetness: number;
  rainStrength: number;
  nightGlow: number;
  lighthouseBeamOpacity: number;
}

function norm3(x: number, y: number, z: number): [number, number, number] {
  const len = Math.hypot(x, y, z) || 1;
  return [x / len, y / len, z / len];
}

export const WEATHER_ATMOSPHERE_PRESETS: Record<WeatherMode, WeatherAtmospherePreset> = {
  sunny: {
    fogHex: '#DCEAF0',
    fogDensity: 0.0036,
    skyHorizonHex: '#F3DAB8',
    skyMidHex: '#9CD4EC',
    skyZenithHex: '#3A99C8',
    sunsetBandStrength: 0.06,
    sunsetRoseHex: '#FFD4B0',
    celestialDir: norm3(48, 34, -46),
    celestialColorHex: '#FFF8DE',
    celestialHaloHex: '#FFE5AC',
    celestialDiscSize: 0.9968,
    celestialDiscOpacity: 0.94,
    celestialHaloStrength: 0.45,
    starOpacity: 0.0,
    cloudCumulusHex: '#FFFDF7',
    cloudCirrusHex: '#FFF6E8',
    cloudOpacity: 0.9,
    hemiSkyHex: '#FFF4DE',
    hemiGroundHex: '#9C734B',
    hemiIntensity: 0.72,
    sunColorHex: '#FFE4B8',
    sunIntensity: 1.48,
    sunPos: [58, 76, 44],
    fillColorHex: '#9CE4DF',
    fillIntensity: 0.34,
    envIntensity: 0.68,
    wetness: 0.0,
    rainStrength: 0.0,
    nightGlow: 0.0,
    lighthouseBeamOpacity: 0.12,
  },
  sunset: {
    fogHex: '#EE9E7A',
    fogDensity: 0.0054,
    skyHorizonHex: '#F8AE8C',
    skyMidHex: '#E67A5A',
    skyZenithHex: '#3C3E6E',
    sunsetBandStrength: 0.94,
    sunsetRoseHex: '#FA8CA4',
    celestialDir: norm3(-52, 16, -68),
    celestialColorHex: '#FFDD9E',
    celestialHaloHex: '#FF7E3E',
    celestialDiscSize: 0.9942,
    celestialDiscOpacity: 0.96,
    celestialHaloStrength: 0.84,
    starOpacity: 0.22,
    cloudCumulusHex: '#FFC9A3',
    cloudCirrusHex: '#FFAEB8',
    cloudOpacity: 0.88,
    hemiSkyHex: '#FFD2B0',
    hemiGroundHex: '#7A4E3C',
    hemiIntensity: 0.62,
    sunColorHex: '#FF9044',
    sunIntensity: 1.32,
    sunPos: [-72, 25, -44],
    fillColorHex: '#8AA0E8',
    fillIntensity: 0.32,
    envIntensity: 0.44,
    wetness: 0.0,
    rainStrength: 0.0,
    nightGlow: 0.56,
    lighthouseBeamOpacity: 0.32,
  },
  night: {
    fogHex: '#18284D',
    fogDensity: 0.0050,
    skyHorizonHex: '#1E3562',
    skyMidHex: '#122248',
    skyZenithHex: '#070F22',
    sunsetBandStrength: 0.04,
    sunsetRoseHex: '#2F487A',
    celestialDir: norm3(-32, 26, -64),
    celestialColorHex: '#F5F9FF',
    celestialHaloHex: '#84AEFF',
    celestialDiscSize: 0.9968,
    celestialDiscOpacity: 0.98,
    celestialHaloStrength: 0.52,
    starOpacity: 0.98,
    cloudCumulusHex: '#3C5382',
    cloudCirrusHex: '#4E679B',
    cloudOpacity: 0.65,
    hemiSkyHex: '#6F93D8',
    hemiGroundHex: '#263048',
    hemiIntensity: 0.64,
    sunColorHex: '#AAC8FF',
    sunIntensity: 0.88,
    sunPos: [-44, 62, 32],
    fillColorHex: '#5E8FD6',
    fillIntensity: 0.36,
    envIntensity: 0.16,
    wetness: 0.14,
    rainStrength: 0.0,
    nightGlow: 1.0,
    lighthouseBeamOpacity: 0.52,
  },
  rain: {
    fogHex: '#7C90A0',
    fogDensity: 0.0086,
    skyHorizonHex: '#8FA3B2',
    skyMidHex: '#687D8F',
    skyZenithHex: '#465A6C',
    sunsetBandStrength: 0.0,
    sunsetRoseHex: '#8FA2B0',
    celestialDir: norm3(34, 58, 26),
    celestialColorHex: '#D8E7F2',
    celestialHaloHex: '#B6CAD9',
    celestialDiscSize: 0.992,
    celestialDiscOpacity: 0.16,
    celestialHaloStrength: 0.18,
    starOpacity: 0.0,
    cloudCumulusHex: '#6E8191',
    cloudCirrusHex: '#8396A6',
    cloudOpacity: 0.95,
    hemiSkyHex: '#C2D5E4',
    hemiGroundHex: '#55626C',
    hemiIntensity: 0.64,
    sunColorHex: '#CBE0F0',
    sunIntensity: 0.78,
    sunPos: [34, 58, 26],
    fillColorHex: '#7EA5B8',
    fillIntensity: 0.28,
    envIntensity: 0.48,
    wetness: 1.0,
    rainStrength: 1.0,
    nightGlow: 0.45,
    lighthouseBeamOpacity: 0.34,
  },
  fog: {
    fogHex: '#E5DDD0',
    fogDensity: 0.0098,
    skyHorizonHex: '#EDE5D5',
    skyMidHex: '#DBD4C4',
    skyZenithHex: '#9DB4BC',
    sunsetBandStrength: 0.16,
    sunsetRoseHex: '#F3E3CA',
    celestialDir: norm3(44, 28, -50),
    celestialColorHex: '#FFF6DE',
    celestialHaloHex: '#F7E7C8',
    celestialDiscSize: 0.99,
    celestialDiscOpacity: 0.46,
    celestialHaloStrength: 0.52,
    starOpacity: 0.0,
    cloudCumulusHex: '#F4EDE0',
    cloudCirrusHex: '#EDE5D8',
    cloudOpacity: 0.8,
    hemiSkyHex: '#FFF5E4',
    hemiGroundHex: '#9E8D74',
    hemiIntensity: 0.72,
    sunColorHex: '#FFEBC8',
    sunIntensity: 0.94,
    sunPos: [48, 56, 30],
    fillColorHex: '#C4D9D4',
    fillIntensity: 0.3,
    envIntensity: 0.4,
    wetness: 0.08,
    rainStrength: 0.0,
    nightGlow: 0.32,
    lighthouseBeamOpacity: 0.36,
  },
};

export interface ShadowQualityConfig {
  enabled: boolean;
  mapSize: number;
  frustumHalfExtent: number;
  bias: number;
  normalBias: number;
  sunsetNormalBias: number;
}

export function getShadowConfigForQuality(
  quality: QualityLevel,
  isSoftwareGl: boolean,
): ShadowQualityConfig {
  if (quality === 'low' || isSoftwareGl) {
    return {
      enabled: false,
      mapSize: 512,
      frustumHalfExtent: 82,
      bias: -0.0006,
      normalBias: 0.03,
      sunsetNormalBias: 0.038,
    };
  }
  if (quality === 'medium') {
    return {
      enabled: true,
      mapSize: 1024,
      frustumHalfExtent: 88,
      bias: -0.0005,
      normalBias: 0.025,
      sunsetNormalBias: 0.034,
    };
  }
  return {
    enabled: true,
    mapSize: 2048,
    frustumHalfExtent: 90,
    bias: -0.00035,
    normalBias: 0.02,
    sunsetNormalBias: 0.028,
  };
}

export interface CloudLayerConfig {
  layer: 'cumulus' | 'cirrus';
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  scale: number;
  yaw: number;
  bobPhase: number;
  bobAmp: number;
  puffCount: number;
}

export function generateCloudLayerConfigs(): CloudLayerConfig[] {
  const configs: CloudLayerConfig[] = [];

  // 12 sculpted low/mid cumulus clusters drifting primarily West->East with gentle Z cross-winds
  for (let i = 0; i < 12; i++) {
    const t = i / 12;
    const vx = 1.15 + (i % 4) * 0.42 + ((i * 7) % 3) * 0.18;
    const vz = ((i % 3) - 1) * 0.48 + Math.sin(i * 1.9) * 0.22;
    configs.push({
      layer: 'cumulus',
      x: -135 + t * 270,
      y: 28 + (i % 4) * 3.4,
      z: -105 + ((i * 53) % 210),
      vx,
      vz,
      scale: 0.92 + (i % 3) * 0.22,
      yaw: (i * 0.65) % (Math.PI * 2),
      bobPhase: i * 0.85,
      bobAmp: 0.28 + (i % 3) * 0.08,
      puffCount: 3 + (i % 2),
    });
  }

  // 8 high-altitude windswept cirrus wisps moving on an oblique vector at faster upper-wind speeds
  for (let i = 0; i < 8; i++) {
    const t = i / 8;
    configs.push({
      layer: 'cirrus',
      x: -140 + t * 280,
      y: 46 + (i % 3) * 3.8,
      z: -115 + ((i * 71) % 230),
      vx: 2.35 + (i % 3) * 0.55,
      vz: 0.95 + (i % 2) * 0.45,
      scale: 1.25 + (i % 3) * 0.28,
      yaw: 0.38 + (i % 4) * 0.14,
      bobPhase: i * 1.15 + 0.5,
      bobAmp: 0.18,
      puffCount: 3,
    });
  }

  return configs;
}
