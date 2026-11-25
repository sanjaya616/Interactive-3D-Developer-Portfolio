import * as THREE from 'three';

export interface ProceduralTextureSet {
  asphaltAlbedo: THREE.CanvasTexture;
  asphaltBump: THREE.CanvasTexture;
  plazaMedallion: THREE.CanvasTexture;
  woodPlankAlbedo: THREE.CanvasTexture;
  sandBump: THREE.CanvasTexture;
  checkeredStrip: THREE.CanvasTexture;
  tireTread: THREE.CanvasTexture;
  dispose: () => void;
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  isAlbedo: boolean,
  repeatX: number,
  repeatY: number,
  maxAniso: number,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (isAlbedo) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.anisotropy = Math.min(8, Math.max(1, maxAniso));
  tex.needsUpdate = true;
  return tex;
}

export function createTireTreadTexture(maxAniso = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#221F1D';
  ctx.fillRect(0, 0, 256, 128);

  ctx.fillStyle = '#332D2A';
  for (let x = 0; x < 256; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x + 2, 10);
    ctx.lineTo(x + 14, 10);
    ctx.lineTo(x + 20, 64);
    ctx.lineTo(x + 8, 64);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + 8, 64);
    ctx.lineTo(x + 20, 64);
    ctx.lineTo(x + 14, 118);
    ctx.lineTo(x + 2, 118);
    ctx.closePath();
    ctx.fill();
  }

  // Subtle central rib
  ctx.fillStyle = '#2C2724';
  ctx.fillRect(0, 58, 256, 12);
  return finalizeTexture(canvas, true, 4, 1, maxAniso);
}

export function createWorldProceduralTextures(maxAniso = 4): ProceduralTextureSet {
  // 1. Stylized asphalt with warm charcoal grain, crisp white shoulders & dashed centerline
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 256;
  roadCanvas.height = 256;
  const rCtx = roadCanvas.getContext('2d')!;
  rCtx.fillStyle = '#4B4440';
  rCtx.fillRect(0, 0, 256, 256);

  // Subtle asphalt pebble noise
  for (let i = 0; i < 1600; i++) {
    const px = (i * 73) % 256;
    const py = (i * 137) % 256;
    rCtx.fillStyle = i % 2 === 0 ? 'rgba(255,248,238,0.045)' : 'rgba(24,20,18,0.12)';
    rCtx.fillRect(px, py, 2, 2);
  }

  // Outer edge shoulder markings (along U axis = width of road, V axis = along road)
  rCtx.fillStyle = '#F7EFE2';
  rCtx.fillRect(10, 0, 7, 256);
  rCtx.fillRect(239, 0, 7, 256);

  // Center dashed cream stripe
  rCtx.fillStyle = '#FFE4A8';
  rCtx.fillRect(124, 14, 8, 96);
  rCtx.fillRect(124, 142, 8, 96);

  const asphaltAlbedo = finalizeTexture(roadCanvas, true, 1, 3, maxAniso);

  // Matching asphalt bump map
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 128;
  bumpCanvas.height = 128;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 950; i++) {
    const px = (i * 53) % 128;
    const py = (i * 97) % 128;
    bCtx.fillStyle = i % 2 === 0 ? '#989898' : '#686868';
    bCtx.fillRect(px, py, 2, 2);
  }
  const asphaltBump = finalizeTexture(bumpCanvas, false, 2, 4, maxAniso);

  // 2. Starting Plaza Radial Cobblestone & Compass Medallion
  const plazaCanvas = document.createElement('canvas');
  plazaCanvas.width = 512;
  plazaCanvas.height = 512;
  const pCtx = plazaCanvas.getContext('2d')!;
  pCtx.fillStyle = '#F4E4C8';
  pCtx.fillRect(0, 0, 512, 512);

  // Concentric stonework rings
  for (let r = 240; r >= 48; r -= 38) {
    pCtx.beginPath();
    pCtx.arc(256, 256, r, 0, Math.PI * 2);
    pCtx.strokeStyle = r === 240 ? '#D9601E' : '#D2B995';
    pCtx.lineWidth = r === 240 ? 12 : 3;
    pCtx.stroke();
  }

  // Radial tile joints
  pCtx.strokeStyle = 'rgba(130, 102, 74, 0.25)';
  pCtx.lineWidth = 2;
  for (let a = 0; a < 16; a++) {
    const ang = (a / 16) * Math.PI * 2;
    pCtx.beginPath();
    pCtx.moveTo(256 + Math.cos(ang) * 48, 256 + Math.sin(ang) * 48);
    pCtx.lineTo(256 + Math.cos(ang) * 238, 256 + Math.sin(ang) * 238);
    pCtx.stroke();
  }

  // Central compass rose
  pCtx.fillStyle = '#EC6D2C';
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2;
    pCtx.save();
    pCtx.translate(256, 256);
    pCtx.rotate(ang);
    pCtx.beginPath();
    pCtx.moveTo(0, -108);
    pCtx.lineTo(18, -22);
    pCtx.lineTo(-18, -22);
    pCtx.closePath();
    pCtx.fillStyle = i === 0 ? '#21968B' : '#EC6D2C';
    pCtx.fill();
    pCtx.restore();
  }

  pCtx.beginPath();
  pCtx.arc(256, 256, 36, 0, Math.PI * 2);
  pCtx.fillStyle = '#26211E';
  pCtx.fill();
  pCtx.beginPath();
  pCtx.arc(256, 256, 22, 0, Math.PI * 2);
  pCtx.fillStyle = '#FFF9F0';
  pCtx.fill();

  const plazaMedallion = finalizeTexture(plazaCanvas, true, 1, 1, maxAniso);
  plazaMedallion.wrapS = THREE.ClampToEdgeWrapping;
  plazaMedallion.wrapT = THREE.ClampToEdgeWrapping;

  // 3. Timber plank texture for bridge & pier
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 256;
  woodCanvas.height = 256;
  const wCtx = woodCanvas.getContext('2d')!;
  wCtx.fillStyle = '#9D6B46';
  wCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    wCtx.fillStyle = y % 64 === 0 ? '#A6724C' : '#93623F';
    wCtx.fillRect(0, y, 256, 29);
    wCtx.fillStyle = '#5D3C25';
    wCtx.fillRect(0, y + 29, 256, 3);
    // Grain streaks
    wCtx.fillStyle = 'rgba(255, 232, 200, 0.08)';
    wCtx.fillRect((y * 5) % 160, y + 8, 92, 3);
    wCtx.fillRect((y * 9 + 40) % 150, y + 19, 76, 2);
  }
  const woodPlankAlbedo = finalizeTexture(woodCanvas, true, 2, 4, maxAniso);

  // 4. Gentle sand wind-ripple bump texture
  const sandCanvas = document.createElement('canvas');
  sandCanvas.width = 256;
  sandCanvas.height = 256;
  const sCtx = sandCanvas.getContext('2d')!;
  sCtx.fillStyle = '#808080';
  sCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) {
    const grad = sCtx.createLinearGradient(0, y, 0, y + 16);
    grad.addColorStop(0, '#727272');
    grad.addColorStop(0.5, '#8F8F8F');
    grad.addColorStop(1, '#727272');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, y, 256, 16);
  }
  const sandBump = finalizeTexture(sandCanvas, false, 18, 18, maxAniso);

  // 5. Checkered racing finish strip
  const chkCanvas = document.createElement('canvas');
  chkCanvas.width = 256;
  chkCanvas.height = 128;
  const cCtx = chkCanvas.getContext('2d')!;
  const tile = 32;
  for (let y = 0; y < 128; y += tile) {
    for (let x = 0; x < 256; x += tile) {
      const dark = ((x / tile + y / tile) & 1) === 0;
      cCtx.fillStyle = dark ? '#26211E' : '#FFF9F0';
      cCtx.fillRect(x, y, tile, tile);
    }
  }
  const checkeredStrip = finalizeTexture(chkCanvas, true, 1, 1, maxAniso);
  checkeredStrip.wrapS = THREE.ClampToEdgeWrapping;
  checkeredStrip.wrapT = THREE.ClampToEdgeWrapping;

  const tireTread = createTireTreadTexture(maxAniso);

  return {
    asphaltAlbedo,
    asphaltBump,
    plazaMedallion,
    woodPlankAlbedo,
    sandBump,
    checkeredStrip,
    tireTread,
    dispose: () => {
      asphaltAlbedo.dispose();
      asphaltBump.dispose();
      plazaMedallion.dispose();
      woodPlankAlbedo.dispose();
      sandBump.dispose();
      checkeredStrip.dispose();
      tireTread.dispose();
    },
  };
}
