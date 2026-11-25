import * as THREE from 'three';

export interface ProceduralTextureSet {
  asphaltAlbedo: THREE.CanvasTexture;
  asphaltBump: THREE.CanvasTexture;
  plazaMedallion: THREE.CanvasTexture;
  woodPlankAlbedo: THREE.CanvasTexture;
  woodPlankBump: THREE.CanvasTexture;
  stoneMasonryAlbedo: THREE.CanvasTexture;
  stoneMasonryBump: THREE.CanvasTexture;
  roadArrowDecal: THREE.CanvasTexture;
  sandBump: THREE.CanvasTexture;
  barkBump: THREE.CanvasTexture;
  foliageBump: THREE.CanvasTexture;
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
  // 1. Stylized asphalt with warm charcoal grain, subtle tire-track wear, crisp shoulders & dashed centerline
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 512;
  roadCanvas.height = 512;
  const rCtx = roadCanvas.getContext('2d')!;
  rCtx.fillStyle = '#4B4440';
  rCtx.fillRect(0, 0, 512, 512);

  // Subtle worn dual-track wheel ruts for depth
  rCtx.fillStyle = 'rgba(34, 30, 28, 0.22)';
  rCtx.fillRect(104, 0, 96, 512);
  rCtx.fillRect(312, 0, 96, 512);

  // Fine asphalt pebble aggregate noise
  for (let i = 0; i < 4200; i++) {
    const px = (i * 139 + (i % 7) * 19) % 512;
    const py = (i * 251 + (i % 11) * 13) % 512;
    rCtx.fillStyle = i % 3 === 0 ? 'rgba(255,248,238,0.055)' : 'rgba(22,18,16,0.13)';
    rCtx.fillRect(px, py, 2, 2);
  }

  // Subtle paved edge shoulder lip & crisp cream edge lines
  rCtx.fillStyle = '#3B3532';
  rCtx.fillRect(0, 0, 14, 512);
  rCtx.fillRect(498, 0, 14, 512);

  rCtx.fillStyle = '#F7EFE2';
  rCtx.fillRect(18, 0, 12, 512);
  rCtx.fillRect(482, 0, 12, 512);

  // Center dashed warm amber stripe
  rCtx.fillStyle = '#FFE4A8';
  rCtx.fillRect(250, 22, 12, 196);
  rCtx.fillRect(250, 278, 12, 196);

  const asphaltAlbedo = finalizeTexture(roadCanvas, true, 1, 3, maxAniso);

  // Matching asphalt bump map
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 256;
  bumpCanvas.height = 256;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3200; i++) {
    const px = (i * 97) % 256;
    const py = (i * 193) % 256;
    bCtx.fillStyle = i % 2 === 0 ? '#9B9B9B' : '#656565';
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

  // 3. Weathered Timber Plank Albedo & Matching Micro-Relief Bump for bridges & piers
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 256;
  woodCanvas.height = 256;
  const wCtx = woodCanvas.getContext('2d')!;
  const woodTones = ['#9B6A46', '#8F603E', '#A3714C', '#865838'];

  const woodBumpCanvas = document.createElement('canvas');
  woodBumpCanvas.width = 256;
  woodBumpCanvas.height = 256;
  const wbCtx = woodBumpCanvas.getContext('2d')!;
  wbCtx.fillStyle = '#888888';
  wbCtx.fillRect(0, 0, 256, 256);

  for (let row = 0; row < 8; row++) {
    const y = row * 32;
    wCtx.fillStyle = woodTones[row % woodTones.length];
    wCtx.fillRect(0, y, 256, 29);
    wCtx.fillStyle = '#573822';
    wCtx.fillRect(0, y + 29, 256, 3);

    wbCtx.fillStyle = '#929292';
    wbCtx.fillRect(0, y, 256, 29);
    wbCtx.fillStyle = '#383838';
    wbCtx.fillRect(0, y + 29, 256, 3);

    // Timber fiber grain + subtle knots
    for (let g = 0; g < 18; g++) {
      const gx = ((row * 43 + g * 31) % 210);
      const gy = y + 3 + ((g * 7) % 23);
      const gw = 38 + ((g * 19) % 70);
      wCtx.fillStyle = g % 2 === 0 ? 'rgba(255, 232, 200, 0.08)' : 'rgba(65, 38, 20, 0.12)';
      wCtx.fillRect(gx, gy, gw, 2);
      wbCtx.fillStyle = g % 2 === 0 ? '#A2A2A2' : '#707070';
      wbCtx.fillRect(gx, gy, gw, 2);
    }

    // Iron peg / bolt recesses near ends
    for (const bx of [16, 238]) {
      wCtx.fillStyle = '#4A3628';
      wCtx.beginPath();
      wCtx.arc(bx, y + 14, 2.6, 0, Math.PI * 2);
      wCtx.fill();
      wbCtx.fillStyle = '#4A4A4A';
      wbCtx.beginPath();
      wbCtx.arc(bx, y + 14, 2.6, 0, Math.PI * 2);
      wbCtx.fill();
    }
  }
  const woodPlankAlbedo = finalizeTexture(woodCanvas, true, 1, 2, maxAniso);
  const woodPlankBump = finalizeTexture(woodBumpCanvas, false, 1, 2, maxAniso);

  // 3B. Dressed Warm Sandstone Masonry Albedo & Bump for bridge abutments, piers & curbs
  const stoneCanvas = document.createElement('canvas');
  stoneCanvas.width = 256;
  stoneCanvas.height = 256;
  const stCtx = stoneCanvas.getContext('2d')!;
  stCtx.fillStyle = '#B49572';
  stCtx.fillRect(0, 0, 256, 256);

  const stoneBumpCanvas = document.createElement('canvas');
  stoneBumpCanvas.width = 256;
  stoneBumpCanvas.height = 256;
  const stbCtx = stoneBumpCanvas.getContext('2d')!;
  stbCtx.fillStyle = '#909090';
  stbCtx.fillRect(0, 0, 256, 256);

  const blockPalette = ['#CFB48F', '#C3A782', '#D8BF9B', '#B99B76'];
  for (let row = 0; row < 4; row++) {
    const by = row * 64;
    const offset = (row % 2) * 42;
    for (let col = -1; col < 4; col++) {
      const bx = col * 85 + offset;
      stCtx.fillStyle = blockPalette[(row * 3 + col + 4) % blockPalette.length];
      stCtx.fillRect(bx + 3, by + 3, 79, 58);
      stbCtx.fillStyle = (row + col) % 2 === 0 ? '#A0A0A0' : '#8A8A8A';
      stbCtx.fillRect(bx + 3, by + 3, 79, 58);

      // Subtle weathered bevel top edge
      stCtx.fillStyle = 'rgba(255, 245, 224, 0.14)';
      stCtx.fillRect(bx + 3, by + 3, 79, 4);
      stbCtx.fillStyle = '#B4B4B4';
      stbCtx.fillRect(bx + 3, by + 3, 79, 3);
    }
    // Mortar joint
    stCtx.fillStyle = 'rgba(92, 74, 56, 0.35)';
    stCtx.fillRect(0, by, 256, 3);
    stbCtx.fillStyle = '#4E4E4E';
    stbCtx.fillRect(0, by, 256, 3);
  }
  for (let i = 0; i < 1100; i++) {
    const px = (i * 83) % 256;
    const py = (i * 157) % 256;
    stCtx.fillStyle = i % 2 === 0 ? 'rgba(255,244,225,0.06)' : 'rgba(80,60,42,0.08)';
    stCtx.fillRect(px, py, 2, 2);
  }
  const stoneMasonryAlbedo = finalizeTexture(stoneCanvas, true, 2, 2, maxAniso);
  const stoneMasonryBump = finalizeTexture(stoneBumpCanvas, false, 2, 2, maxAniso);

  // 3C. Road Pavement Directional Arrow Decal (transparent PNG-style canvas)
  const arrowCanvas = document.createElement('canvas');
  arrowCanvas.width = 128;
  arrowCanvas.height = 256;
  const arCtx = arrowCanvas.getContext('2d')!;
  arCtx.clearRect(0, 0, 128, 256);
  arCtx.fillStyle = 'rgba(247, 239, 226, 0.88)';
  arCtx.beginPath();
  arCtx.moveTo(64, 18);
  arCtx.lineTo(106, 98);
  arCtx.lineTo(80, 98);
  arCtx.lineTo(80, 236);
  arCtx.lineTo(48, 236);
  arCtx.lineTo(48, 98);
  arCtx.lineTo(22, 98);
  arCtx.closePath();
  arCtx.fill();
  const roadArrowDecal = finalizeTexture(arrowCanvas, true, 1, 1, maxAniso);
  roadArrowDecal.wrapS = THREE.ClampToEdgeWrapping;
  roadArrowDecal.wrapT = THREE.ClampToEdgeWrapping;

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

  // 6. Fibrous bark & palm trunk ring bump texture
  const barkCanvas = document.createElement('canvas');
  barkCanvas.width = 128;
  barkCanvas.height = 128;
  const bkCtx = barkCanvas.getContext('2d')!;
  bkCtx.fillStyle = '#808080';
  bkCtx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 64; i++) {
    const x = (i * 17) % 128;
    const h = 18 + (i % 5) * 14;
    const y = (i * 31) % 128;
    bkCtx.fillStyle = i % 2 === 0 ? '#656565' : '#9B9B9B';
    bkCtx.fillRect(x, y, 2, h);
  }
  for (let y = 0; y < 128; y += 16) {
    bkCtx.fillStyle = 'rgba(72, 72, 72, 0.38)';
    bkCtx.fillRect(0, y, 128, 3);
    bkCtx.fillStyle = 'rgba(175, 175, 175, 0.25)';
    bkCtx.fillRect(0, y + 3, 128, 2);
  }
  const barkBump = finalizeTexture(barkCanvas, false, 2, 4, maxAniso);

  // 7. Organic foliage & needle micro-relief bump texture
  const leafCanvas = document.createElement('canvas');
  leafCanvas.width = 128;
  leafCanvas.height = 128;
  const lCtx = leafCanvas.getContext('2d')!;
  lCtx.fillStyle = '#7E7E7E';
  lCtx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 240; i++) {
    const lx = (i * 47) % 128;
    const ly = (i * 89) % 128;
    const rx = 4 + (i % 4) * 2;
    const ry = 2 + (i % 3);
    lCtx.save();
    lCtx.translate(lx, ly);
    lCtx.rotate((i * 0.7) % Math.PI);
    lCtx.fillStyle = i % 3 === 0 ? '#A5A5A5' : i % 3 === 1 ? '#5E5E5E' : '#909090';
    lCtx.beginPath();
    lCtx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    lCtx.fill();
    lCtx.restore();
  }
  const foliageBump = finalizeTexture(leafCanvas, false, 2, 2, maxAniso);

  return {
    asphaltAlbedo,
    asphaltBump,
    plazaMedallion,
    woodPlankAlbedo,
    woodPlankBump,
    stoneMasonryAlbedo,
    stoneMasonryBump,
    roadArrowDecal,
    sandBump,
    barkBump,
    foliageBump,
    checkeredStrip,
    tireTread,
    dispose: () => {
      asphaltAlbedo.dispose();
      asphaltBump.dispose();
      plazaMedallion.dispose();
      woodPlankAlbedo.dispose();
      woodPlankBump.dispose();
      stoneMasonryAlbedo.dispose();
      stoneMasonryBump.dispose();
      roadArrowDecal.dispose();
      sandBump.dispose();
      barkBump.dispose();
      foliageBump.dispose();
      checkeredStrip.dispose();
      tireTread.dispose();
    },
  };
}
