import * as THREE from 'three';
import type { VehicleConfig } from '../types/portfolio';
import { createTireTreadTexture } from './proceduralTextures';

export interface VehicleRig {
  root: THREE.Group;
  chassisGroup: THREE.Group;
  frontLeftSteer: THREE.Group;
  frontRightSteer: THREE.Group;
  wheels: THREE.Mesh[];
  boostFlameLeft: THREE.Mesh;
  boostFlameRight: THREE.Mesh;
  contactShadow: THREE.Mesh;
  applyConfig: (config: VehicleConfig) => void;
  setHeadlightsOn: (on: boolean, ambientDark?: boolean) => void;
  setGhostMode: (ghost: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  triggerDoubleJumpEffect: () => void;
  updateVisuals: (
    speedMs: number,
    steerInput: number,
    isBoosting: boolean,
    dt: number,
    wheelCompressions?: [number, number, number, number],
    isDrifting?: boolean,
  ) => void;
  dispose: () => void;
}

function createPlateTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFF9F0';
  ctx.fillRect(0, 0, 256, 96);
  ctx.fillStyle = '#EC6D2C';
  ctx.fillRect(0, 0, 256, 16);
  ctx.strokeStyle = '#26211E';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 248, 88);
  ctx.fillStyle = '#26211E';
  ctx.font = 'bold 40px Nunito, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.slice(0, 8).toUpperCase(), 128, 56);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createShadowDiscTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 14, 64, 64, 62);
  grad.addColorStop(0, 'rgba(28, 20, 15, 0.58)');
  grad.addColorStop(0.55, 'rgba(28, 20, 15, 0.24)');
  grad.addColorStop(1, 'rgba(28, 20, 15, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildExtrudedBody(
  points: [number, number][],
  width = 1.48,
  bevelThickness = 0.09,
  bevelSize = 0.08,
): THREE.ExtrudeGeometry {
  const profile = new THREE.Shape();
  profile.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    profile.lineTo(points[i][0], points[i][1]);
  }
  profile.closePath();

  const geo = new THREE.ExtrudeGeometry(profile, {
    depth: width,
    bevelEnabled: true,
    bevelThickness,
    bevelSize,
    bevelSegments: 2,
  });
  geo.center();
  geo.rotateY(Math.PI / 2);
  return geo;
}

function buildFenderFlareGeo(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.56, 0);
  shape.lineTo(-0.34, 0.34);
  shape.lineTo(0.34, 0.34);
  shape.lineTo(0.56, 0);
  shape.lineTo(0.42, 0);
  shape.lineTo(0.24, 0.22);
  shape.lineTo(-0.24, 0.22);
  shape.lineTo(-0.42, 0);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.025,
    bevelSegments: 1,
  });
  geo.center();
  geo.rotateY(Math.PI / 2);
  return geo;
}

function buildTubularBullbarGeo(): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.74, 0.0, 0.08),
    new THREE.Vector3(-0.62, 0.24, -0.1),
    new THREE.Vector3(0.0, 0.28, -0.14),
    new THREE.Vector3(0.62, 0.24, -0.1),
    new THREE.Vector3(0.74, 0.0, 0.08),
  ]);
  return new THREE.TubeGeometry(curve, 16, 0.045, 8, false);
}

function buildRollcageGeo(): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.68, 0.0, 0.65),
    new THREE.Vector3(-0.6, 0.56, 0.12),
    new THREE.Vector3(0.0, 0.58, 0.08),
    new THREE.Vector3(0.6, 0.56, 0.12),
    new THREE.Vector3(0.68, 0.0, 0.65),
  ]);
  return new THREE.TubeGeometry(curve, 20, 0.045, 8, false);
}

export function createVehicleRig(initialConfig: VehicleConfig): VehicleRig {
  const root = new THREE.Group();
  const chassisGroup = new THREE.Group();
  root.add(chassisGroup);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const treadTex = createTireTreadTexture(4);
  textures.push(treadTex);

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(initialConfig.paintColor),
    roughness: 0.3,
    metalness: 0.18,
    clearcoat: 0.62,
    clearcoatRoughness: 0.2,
  });
  const accentMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(initialConfig.accentColor),
    roughness: 0.28,
    metalness: 0.24,
    clearcoat: 0.45,
    clearcoatRoughness: 0.22,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x26211e,
    roughness: 0.72,
    metalness: 0.14,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xe0d8ce,
    roughness: 0.22,
    metalness: 0.88,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x263942,
    roughness: 0.08,
    metalness: 0.15,
    clearcoat: 0.9,
    clearcoatRoughness: 0.06,
    transparent: true,
    opacity: 0.62,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: treadTex,
    roughness: 0.86,
    metalness: 0.04,
  });
  const crateMat = new THREE.MeshStandardMaterial({
    color: 0xd48549,
    roughness: 0.74,
    metalness: 0.08,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfff3b8,
    emissive: 0xffe08a,
    emissiveIntensity: 0.95,
    roughness: 0.16,
  });
  const headlightBeamMat = new THREE.MeshBasicMaterial({
    color: 0xffe08a,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xee5d52,
    emissive: 0xee5d52,
    emissiveIntensity: 0.72,
    roughness: 0.22,
  });
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x21968b,
    transparent: true,
    opacity: 0.88,
  });

  let plateTex = createPlateTexture(initialConfig.plateText);
  const plateMat = new THREE.MeshStandardMaterial({
    map: plateTex,
    color: 0xffffff,
    roughness: 0.48,
  });

  materials.push(
    bodyMat,
    accentMat,
    trimMat,
    metalMat,
    glassMat,
    tireMat,
    crateMat,
    headlightMat,
    headlightBeamMat,
    taillightMat,
    flameMat,
    plateMat,
  );

  // 1. Three selectable sculpted chassis bodies with crisp beltlines
  const buggyGeo = buildExtrudedBody([
    [-1.58, 0.2],
    [1.56, 0.2],
    [1.72, 0.48],
    [1.24, 0.72],
    [0.52, 0.84],
    [0.12, 1.38],
    [-0.92, 1.38],
    [-1.4, 0.88],
    [-1.64, 0.52],
  ]);
  const roverGeo = buildExtrudedBody(
    [
      [-1.68, 0.2],
      [1.68, 0.2],
      [1.74, 0.62],
      [1.46, 0.86],
      [0.64, 0.94],
      [0.34, 1.56],
      [-1.44, 1.56],
      [-1.68, 0.96],
      [-1.72, 0.5],
    ],
    1.54,
  );
  const rallyGeo = buildExtrudedBody(
    [
      [-1.72, 0.16],
      [1.72, 0.16],
      [1.82, 0.42],
      [1.26, 0.66],
      [0.54, 0.78],
      [0.06, 1.24],
      [-0.88, 1.22],
      [-1.62, 0.74],
      [-1.78, 0.44],
    ],
    1.52,
  );
  geometries.push(buggyGeo, roverGeo, rallyGeo);

  const buggyMesh = new THREE.Mesh(buggyGeo, bodyMat);
  buggyMesh.position.set(0, 0.85, 0);
  buggyMesh.castShadow = true;
  buggyMesh.receiveShadow = true;

  const roverMesh = new THREE.Mesh(roverGeo, bodyMat);
  roverMesh.position.set(0, 0.92, 0);
  roverMesh.castShadow = true;
  roverMesh.receiveShadow = true;

  const rallyMesh = new THREE.Mesh(rallyGeo, bodyMat);
  rallyMesh.position.set(0, 0.76, 0);
  rallyMesh.castShadow = true;
  rallyMesh.receiveShadow = true;

  chassisGroup.add(buggyMesh, roverMesh, rallyMesh);

  // 1B. Sculpted Flared Wheel Arches & Side Rocker Skirts
  const flareGeo = buildFenderFlareGeo();
  const skirtGeo = new THREE.BoxGeometry(0.14, 0.16, 1.45);
  geometries.push(flareGeo, skirtGeo);

  const flarePositions: [number, number, number][] = [
    [-0.86, 0.68, -1.05],
    [0.86, 0.68, -1.05],
    [-0.86, 0.68, 1.05],
    [0.86, 0.68, 1.05],
  ];
  for (const [fx, fy, fz] of flarePositions) {
    const flare = new THREE.Mesh(flareGeo, trimMat);
    flare.position.set(fx, fy, fz);
    flare.castShadow = true;
    chassisGroup.add(flare);
  }

  for (const sx of [-0.84, 0.84]) {
    const skirt = new THREE.Mesh(skirtGeo, trimMat);
    skirt.position.set(sx, 0.44, 0);
    chassisGroup.add(skirt);
  }

  // 2. Contoured Bumpers, Front Grille Aperture, Bullbar & Suspension Struts
  const frontLipGeo = buildExtrudedBody(
    [
      [-0.14, -0.12],
      [0.16, -0.12],
      [0.2, 0.08],
      [-0.1, 0.14],
    ],
    1.62,
    0.04,
    0.04,
  );
  const grilleGeo = new THREE.BoxGeometry(0.86, 0.22, 0.1);
  const grilleSlatsGeo = new THREE.BoxGeometry(0.76, 0.04, 0.12);
  const bullbarGeo = buildTubularBullbarGeo();
  const rollcageGeo = buildRollcageGeo();
  const strutSpringGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.44, 10);
  const rearDiffuserGeo = new THREE.BoxGeometry(1.56, 0.2, 0.22);
  geometries.push(
    frontLipGeo,
    grilleGeo,
    grilleSlatsGeo,
    bullbarGeo,
    rollcageGeo,
    strutSpringGeo,
    rearDiffuserGeo,
  );

  const frontBumper = new THREE.Mesh(frontLipGeo, trimMat);
  frontBumper.position.set(0, 0.5, -1.76);
  frontBumper.castShadow = true;

  const frontGrille = new THREE.Mesh(grilleGeo, trimMat);
  frontGrille.position.set(0, 0.72, -1.78);
  const slatUpper = new THREE.Mesh(grilleSlatsGeo, metalMat);
  slatUpper.position.set(0, 0.76, -1.79);
  const slatLower = new THREE.Mesh(grilleSlatsGeo, accentMat);
  slatLower.position.set(0, 0.68, -1.79);

  const bullbar = new THREE.Mesh(bullbarGeo, metalMat);
  bullbar.position.set(0, 0.55, -1.76);
  bullbar.castShadow = true;

  const rollcage = new THREE.Mesh(rollcageGeo, trimMat);
  rollcage.position.set(0, 0.92, 0.7);
  rollcage.castShadow = true;

  const rearBumper = new THREE.Mesh(rearDiffuserGeo, trimMat);
  rearBumper.position.set(0, 0.5, 1.7);
  rearBumper.castShadow = true;

  chassisGroup.add(
    frontBumper,
    frontGrille,
    slatUpper,
    slatLower,
    bullbar,
    rollcage,
    rearBumper,
  );

  for (const [sx, sz] of [
    [-0.78, -1.05],
    [0.78, -1.05],
    [-0.78, 1.05],
    [0.78, 1.05],
  ]) {
    const strut = new THREE.Mesh(strutSpringGeo, accentMat);
    strut.position.set(sx, 0.62, sz);
    chassisGroup.add(strut);
  }

  // 2B. Sculpted Front Splitter, Tow Hook, Rear Diffuser Fins & Suspension Wishbones
  const splitterGeo = new THREE.BoxGeometry(1.56, 0.06, 0.24);
  const finGeo = new THREE.BoxGeometry(0.05, 0.16, 0.28);
  const towHookGeo = new THREE.TorusGeometry(0.065, 0.018, 6, 12);
  const wishboneArmGeo = new THREE.BoxGeometry(0.46, 0.045, 0.09);
  const hoodScoopGeo = new THREE.BoxGeometry(0.62, 0.08, 0.42);
  const doorHandleGeo = new THREE.BoxGeometry(0.06, 0.045, 0.22);
  const doorSeamGeo = new THREE.BoxGeometry(0.02, 0.44, 0.025);
  const aPillarGeo = new THREE.BoxGeometry(0.06, 0.54, 0.06);
  const wiperGeo = new THREE.BoxGeometry(0.42, 0.024, 0.024);
  geometries.push(
    splitterGeo,
    finGeo,
    towHookGeo,
    wishboneArmGeo,
    hoodScoopGeo,
    doorHandleGeo,
    doorSeamGeo,
    aPillarGeo,
    wiperGeo,
  );

  const frontSplitter = new THREE.Mesh(splitterGeo, accentMat);
  frontSplitter.position.set(0, 0.36, -1.86);
  const towHook = new THREE.Mesh(towHookGeo, accentMat);
  towHook.position.set(0.36, 0.42, -1.89);
  towHook.rotation.x = Math.PI / 2;
  chassisGroup.add(frontSplitter, towHook);

  for (const fx of [-0.52, -0.18, 0.18, 0.52]) {
    const fin = new THREE.Mesh(finGeo, accentMat);
    fin.position.set(fx, 0.38, 1.79);
    chassisGroup.add(fin);
  }

  // Lower & Upper Suspension Wishbone A-Arms
  for (const [ax, az] of [
    [-0.64, -1.05],
    [0.64, -1.05],
    [-0.64, 1.05],
    [0.64, 1.05],
  ]) {
    const sign = Math.sign(ax);
    const armFront = new THREE.Mesh(wishboneArmGeo, trimMat);
    armFront.position.set(ax, 0.44, az - 0.07);
    armFront.rotation.y = sign * 0.24;
    armFront.rotation.z = -sign * 0.08;
    const armRear = new THREE.Mesh(wishboneArmGeo, trimMat);
    armRear.position.set(ax, 0.44, az + 0.07);
    armRear.rotation.y = -sign * 0.24;
    armRear.rotation.z = -sign * 0.08;
    chassisGroup.add(armFront, armRear);
  }

  const hoodScoop = new THREE.Mesh(hoodScoopGeo, trimMat);
  hoodScoop.position.set(0, 1.02, -0.94);
  hoodScoop.rotation.x = 0.14;
  chassisGroup.add(hoodScoop);

  // Door handles, vertical door panel seams & A-pillars
  const doorHandles: THREE.Mesh[] = [];
  const doorSeams: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const handle = new THREE.Mesh(doorHandleGeo, metalMat);
    handle.position.set(side * 0.84, 0.86, 0.35);
    const seamFront = new THREE.Mesh(doorSeamGeo, trimMat);
    seamFront.position.set(side * 0.83, 0.72, -0.45);
    const seamRear = new THREE.Mesh(doorSeamGeo, trimMat);
    seamRear.position.set(side * 0.83, 0.72, 0.58);
    doorHandles.push(handle);
    doorSeams.push(seamFront, seamRear);
    chassisGroup.add(handle, seamFront, seamRear);
  }

  // 3. Dual Racing Hood Stripes + Side Mirrors
  const stripeGeo = new THREE.BoxGeometry(0.22, 0.05, 1.16);
  const mirrorArmGeo = new THREE.BoxGeometry(0.18, 0.06, 0.08);
  const mirrorCapGeo = new THREE.BoxGeometry(0.16, 0.12, 0.14);
  geometries.push(stripeGeo, mirrorArmGeo, mirrorCapGeo);

  const stripeL = new THREE.Mesh(stripeGeo, accentMat);
  stripeL.position.set(-0.17, 0.99, -0.96);
  stripeL.rotation.x = 0.16;
  const stripeR = new THREE.Mesh(stripeGeo, accentMat);
  stripeR.position.set(0.17, 0.99, -0.96);
  stripeR.rotation.x = 0.16;
  chassisGroup.add(stripeL, stripeR);

  for (const side of [-1, 1]) {
    const mArm = new THREE.Mesh(mirrorArmGeo, trimMat);
    mArm.position.set(side * 0.84, 1.04, -0.46);
    const mCap = new THREE.Mesh(mirrorCapGeo, bodyMat);
    mCap.position.set(side * 0.94, 1.06, -0.44);
    mCap.castShadow = true;
    chassisGroup.add(mArm, mCap);
  }

  // 4. Multi-pane Angled Windshield, A-Pillars, Twin Wipers, Side Cabin Glass & Rear Glass
  const windshieldGeo = new THREE.BoxGeometry(1.32, 0.5, 0.08);
  const sideWinGeo = new THREE.BoxGeometry(0.06, 0.36, 0.88);
  const rearWinGeo = new THREE.BoxGeometry(1.24, 0.38, 0.08);
  geometries.push(windshieldGeo, sideWinGeo, rearWinGeo);

  const windshield = new THREE.Mesh(windshieldGeo, glassMat);
  windshield.position.set(0, 1.24, -0.44);
  windshield.rotation.x = -0.6;

  const aPillarL = new THREE.Mesh(aPillarGeo, trimMat);
  aPillarL.position.set(-0.68, 1.24, -0.44);
  aPillarL.rotation.x = -0.6;
  const aPillarR = new THREE.Mesh(aPillarGeo, trimMat);
  aPillarR.position.set(0.68, 1.24, -0.44);
  aPillarR.rotation.x = -0.6;

  const wiperL = new THREE.Mesh(wiperGeo, trimMat);
  wiperL.position.set(-0.28, 1.04, -0.58);
  wiperL.rotation.z = 0.18;
  const wiperR = new THREE.Mesh(wiperGeo, trimMat);
  wiperR.position.set(0.24, 1.04, -0.58);
  wiperR.rotation.z = 0.18;

  const sideWinL = new THREE.Mesh(sideWinGeo, glassMat);
  sideWinL.position.set(-0.78, 1.26, 0.28);
  const sideWinR = new THREE.Mesh(sideWinGeo, glassMat);
  sideWinR.position.set(0.78, 1.26, 0.28);

  const rearWin = new THREE.Mesh(rearWinGeo, glassMat);
  rearWin.position.set(0, 1.22, 1.04);
  rearWin.rotation.x = 0.55;

  chassisGroup.add(windshield, aPillarL, aPillarR, wiperL, wiperR, sideWinL, sideWinR, rearWin);

  // 4B. Detailed Cockpit Interior (Bucket Seats, Dashboard Console, Instrument Screen & Steering Wheel)
  const seatBackGeo = new THREE.BoxGeometry(0.4, 0.48, 0.11);
  const headrestGeo = new THREE.BoxGeometry(0.24, 0.16, 0.1);
  const dashGeo = new THREE.BoxGeometry(1.22, 0.18, 0.34);
  const dashScreenGeo = new THREE.BoxGeometry(0.28, 0.12, 0.04);
  const steerColGeo = new THREE.CylinderGeometry(0.03, 0.035, 0.28, 8);
  steerColGeo.rotateX(Math.PI * 0.32);
  const steerRimGeo = new THREE.TorusGeometry(0.145, 0.024, 8, 16);
  geometries.push(seatBackGeo, headrestGeo, dashGeo, dashScreenGeo, steerColGeo, steerRimGeo);

  for (const sx of [-0.34, 0.34]) {
    const seatBack = new THREE.Mesh(seatBackGeo, trimMat);
    seatBack.position.set(sx, 0.98, 0.34);
    seatBack.rotation.x = 0.16;
    const headrest = new THREE.Mesh(headrestGeo, accentMat);
    headrest.position.set(sx, 1.27, 0.39);
    chassisGroup.add(seatBack, headrest);
  }
  const dashMesh = new THREE.Mesh(dashGeo, trimMat);
  dashMesh.position.set(0, 0.98, -0.34);
  const dashScreen = new THREE.Mesh(dashScreenGeo, headlightMat);
  dashScreen.position.set(0.05, 1.04, -0.2);
  const steerCol = new THREE.Mesh(steerColGeo, metalMat);
  steerCol.position.set(-0.34, 0.99, -0.22);
  const cabinSteerWheel = new THREE.Group();
  cabinSteerWheel.position.set(-0.34, 1.06, -0.14);
  cabinSteerWheel.rotation.x = -0.36;
  const steerRim = new THREE.Mesh(steerRimGeo, trimMat);
  const steerHub = new THREE.Mesh(dashScreenGeo, accentMat);
  steerHub.scale.set(0.32, 0.55, 0.7);
  cabinSteerWheel.add(steerRim, steerHub);
  chassisGroup.add(dashMesh, dashScreen, steerCol, cabinSteerWheel);

  // 5. Tubular Roof Rack Rails
  const rackRailGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.02, 8);
  rackRailGeo.rotateX(Math.PI / 2);
  const rackCrossGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.18, 8);
  rackCrossGeo.rotateZ(Math.PI / 2);
  geometries.push(rackRailGeo, rackCrossGeo);
  const roofRack = new THREE.Group();
  for (const rx of [-0.56, 0.56]) {
    const rail = new THREE.Mesh(rackRailGeo, metalMat);
    rail.position.set(rx, 0, 0);
    roofRack.add(rail);
  }
  for (const rz of [-0.36, 0, 0.36]) {
    const cross = new THREE.Mesh(rackCrossGeo, trimMat);
    cross.position.set(0, -0.01, rz);
    roofRack.add(cross);
  }
  roofRack.position.set(0, 1.56, 0.32);
  chassisGroup.add(roofRack);

  // 6. Toggleable Roof & Rear Accessories
  const spareGroup = new THREE.Group();
  const spareGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 18);
  const spareHubGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.26, 12);
  geometries.push(spareGeo, spareHubGeo);
  const spareTire = new THREE.Mesh(spareGeo, tireMat);
  const spareHub = new THREE.Mesh(spareHubGeo, accentMat);
  spareTire.castShadow = true;
  spareGroup.add(spareTire, spareHub);
  spareGroup.position.set(0, 1.68, 0.42);
  chassisGroup.add(spareGroup);

  const lightBarGroup = new THREE.Group();
  const barGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.24, 10);
  barGeo.rotateZ(Math.PI / 2);
  const podHousingGeo = new THREE.CylinderGeometry(0.11, 0.09, 0.14, 12);
  podHousingGeo.rotateX(Math.PI / 2);
  const podLensGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.04, 12);
  podLensGeo.rotateX(Math.PI / 2);
  geometries.push(barGeo, podHousingGeo, podLensGeo);
  const barMesh = new THREE.Mesh(barGeo, trimMat);
  lightBarGroup.add(barMesh);
  for (const px of [-0.42, -0.14, 0.14, 0.42]) {
    const pod = new THREE.Mesh(podHousingGeo, trimMat);
    pod.position.set(px, 0.09, 0);
    const lens = new THREE.Mesh(podLensGeo, headlightMat);
    lens.position.set(px, 0.09, -0.07);
    lightBarGroup.add(pod, lens);
  }
  lightBarGroup.position.set(0, 1.62, -0.04);
  chassisGroup.add(lightBarGroup);

  const cargoGroup = new THREE.Group();
  const cargoBoxGeo = new THREE.BoxGeometry(0.88, 0.36, 0.68);
  const cargoLidGeo = new THREE.BoxGeometry(0.92, 0.08, 0.72);
  const strapGeo = new THREE.BoxGeometry(0.94, 0.42, 0.09);
  geometries.push(cargoBoxGeo, cargoLidGeo, strapGeo);
  const cargoBox = new THREE.Mesh(cargoBoxGeo, crateMat);
  cargoBox.castShadow = true;
  const cargoLid = new THREE.Mesh(cargoLidGeo, trimMat);
  cargoLid.position.y = 0.18;
  const strapA = new THREE.Mesh(strapGeo, accentMat);
  strapA.position.z = -0.18;
  const strapB = new THREE.Mesh(strapGeo, accentMat);
  strapB.position.z = 0.18;
  cargoGroup.add(cargoBox, cargoLid, strapA, strapB);
  cargoGroup.position.set(0, 1.75, 0.34);
  chassisGroup.add(cargoGroup);

  const spoilerGroup = new THREE.Group();
  const strutGeo = new THREE.BoxGeometry(0.08, 0.38, 0.16);
  const wingGeo = new THREE.BoxGeometry(1.58, 0.07, 0.34);
  const endplateGeo = new THREE.BoxGeometry(0.06, 0.22, 0.4);
  geometries.push(strutGeo, wingGeo, endplateGeo);
  const strutL = new THREE.Mesh(strutGeo, trimMat);
  strutL.position.set(-0.48, 0.18, 0);
  const strutR = new THREE.Mesh(strutGeo, trimMat);
  strutR.position.set(0.48, 0.18, 0);
  const wingBlade = new THREE.Mesh(wingGeo, accentMat);
  wingBlade.position.set(0, 0.36, 0.04);
  wingBlade.rotation.x = 0.14;
  wingBlade.castShadow = true;
  const epL = new THREE.Mesh(endplateGeo, trimMat);
  epL.position.set(-0.79, 0.34, 0.04);
  const epR = new THREE.Mesh(endplateGeo, trimMat);
  epR.position.set(0.79, 0.34, 0.04);
  spoilerGroup.add(strutL, strutR, wingBlade, epL, epR);
  spoilerGroup.position.set(0, 1.16, 1.5);
  chassisGroup.add(spoilerGroup);

  const trailRackGroup = new THREE.Group();
  const basketSideGeo = new THREE.BoxGeometry(0.06, 0.14, 1.16);
  const basketEndGeo = new THREE.BoxGeometry(1.18, 0.14, 0.06);
  const basketSlatGeo = new THREE.BoxGeometry(1.06, 0.03, 0.09);
  const recBoardGeo = new THREE.BoxGeometry(0.24, 0.05, 0.88);
  const jerryGeo = new THREE.BoxGeometry(0.28, 0.24, 0.38);
  const trailLampPodGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.12, 10);
  trailLampPodGeo.rotateX(Math.PI / 2);
  geometries.push(basketSideGeo, basketEndGeo, basketSlatGeo, recBoardGeo, jerryGeo, trailLampPodGeo);

  const recoveryMat = new THREE.MeshStandardMaterial({ color: 0xe65448, roughness: 0.48 });
  const jerryMat = new THREE.MeshStandardMaterial({ color: 0x4f8456, roughness: 0.56 });
  materials.push(recoveryMat, jerryMat);

  for (const bx of [-0.56, 0.56]) {
    const bSide = new THREE.Mesh(basketSideGeo, trimMat);
    bSide.position.set(bx, 0.06, 0);
    trailRackGroup.add(bSide);
  }
  for (const bz of [-0.55, 0.55]) {
    const bEnd = new THREE.Mesh(basketEndGeo, trimMat);
    bEnd.position.set(0, 0.06, bz);
    trailRackGroup.add(bEnd);
  }
  for (const sz of [-0.36, -0.12, 0.12, 0.36]) {
    const slat = new THREE.Mesh(basketSlatGeo, trimMat);
    slat.position.set(0, 0, sz);
    trailRackGroup.add(slat);
  }
  // Dual high-traction recovery boards on left & right rails
  for (const rx of [-0.36, 0.36]) {
    const recBoard = new THREE.Mesh(recBoardGeo, recoveryMat);
    recBoard.position.set(rx, 0.08, 0.04);
    recBoard.castShadow = true;
    trailRackGroup.add(recBoard);
  }
  // Trail expedition canister in center basket
  const trailCan = new THREE.Mesh(jerryGeo, jerryMat);
  trailCan.position.set(0, 0.13, 0.24);
  trailCan.castShadow = true;
  trailRackGroup.add(trailCan);
  // Twin front amber trail spot lamps on basket brow
  for (const lx of [-0.3, 0.3]) {
    const pod = new THREE.Mesh(trailLampPodGeo, trimMat);
    pod.position.set(lx, 0.16, -0.54);
    const lLens = new THREE.Mesh(trailLampPodGeo, headlightMat);
    lLens.scale.set(0.76, 0.76, 0.35);
    lLens.position.set(lx, 0.16, -0.59);
    trailRackGroup.add(pod, lLens);
  }
  trailRackGroup.position.set(0, 1.7, 0.22);
  chassisGroup.add(trailRackGroup);

  // 7. Twin Recessed Headlights + Bezel Housings + Projected Light Cones
  const bezelGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.09, 14);
  bezelGeo.rotateX(Math.PI / 2);
  const lightGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.11, 14);
  lightGeo.rotateX(Math.PI / 2);
  const beamGeo = new THREE.ConeGeometry(0.58, 2.9, 16, 1, true);
  beamGeo.rotateX(-Math.PI / 2);
  geometries.push(bezelGeo, lightGeo, beamGeo);

  const bzLeft = new THREE.Mesh(bezelGeo, trimMat);
  bzLeft.position.set(-0.54, 0.72, -1.78);
  const bzRight = new THREE.Mesh(bezelGeo, trimMat);
  bzRight.position.set(0.54, 0.72, -1.78);

  const hlLeft = new THREE.Mesh(lightGeo, headlightMat);
  hlLeft.position.set(-0.54, 0.72, -1.8);
  const hlRight = new THREE.Mesh(lightGeo, headlightMat);
  hlRight.position.set(0.54, 0.72, -1.8);

  const beamLeft = new THREE.Mesh(beamGeo, headlightBeamMat);
  beamLeft.position.set(-0.54, 0.68, -3.2);
  const beamRight = new THREE.Mesh(beamGeo, headlightBeamMat);
  beamRight.position.set(0.54, 0.68, -3.2);

  chassisGroup.add(bzLeft, bzRight, hlLeft, hlRight, beamLeft, beamRight);

  // 8. Recessed Taillight Clusters & License Plate
  const tailHousingGeo = new THREE.BoxGeometry(0.38, 0.16, 0.09);
  const tailGeo = new THREE.BoxGeometry(0.3, 0.1, 0.11);
  geometries.push(tailHousingGeo, tailGeo);
  const thLeft = new THREE.Mesh(tailHousingGeo, trimMat);
  thLeft.position.set(-0.56, 0.76, 1.76);
  const thRight = new THREE.Mesh(tailHousingGeo, trimMat);
  thRight.position.set(0.56, 0.76, 1.76);
  const tlLeft = new THREE.Mesh(tailGeo, taillightMat);
  tlLeft.position.set(-0.56, 0.76, 1.78);
  const tlRight = new THREE.Mesh(tailGeo, taillightMat);
  tlRight.position.set(0.56, 0.76, 1.78);
  chassisGroup.add(thLeft, thRight, tlLeft, tlRight);

  const plateGeo = new THREE.PlaneGeometry(0.58, 0.22);
  geometries.push(plateGeo);
  const plateMesh = new THREE.Mesh(plateGeo, plateMat);
  plateMesh.position.set(0, 0.74, 1.82);
  chassisGroup.add(plateMesh);

  // 9. Dual Chrome Exhausts + Animated Boost Plasma Cones
  const exhaustGeo = new THREE.CylinderGeometry(0.075, 0.085, 0.36, 12);
  exhaustGeo.rotateX(Math.PI / 2);
  const exhaustTipGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.38, 10);
  exhaustTipGeo.rotateX(Math.PI / 2);
  geometries.push(exhaustGeo, exhaustTipGeo);
  const exLeft = new THREE.Mesh(exhaustGeo, metalMat);
  exLeft.position.set(-0.38, 0.44, 1.72);
  const exLeftBore = new THREE.Mesh(exhaustTipGeo, trimMat);
  exLeftBore.position.set(-0.38, 0.44, 1.73);
  const exRight = new THREE.Mesh(exhaustGeo, metalMat);
  exRight.position.set(0.38, 0.44, 1.72);
  const exRightBore = new THREE.Mesh(exhaustTipGeo, trimMat);
  exRightBore.position.set(0.38, 0.44, 1.73);
  chassisGroup.add(exLeft, exLeftBore, exRight, exRightBore);

  const flameGeo = new THREE.ConeGeometry(0.13, 0.62, 10);
  flameGeo.rotateX(Math.PI / 2);
  geometries.push(flameGeo);
  const boostFlameLeft = new THREE.Mesh(flameGeo, flameMat);
  boostFlameLeft.position.set(-0.38, 0.44, 2.12);
  boostFlameLeft.visible = false;
  const boostFlameRight = new THREE.Mesh(flameGeo, flameMat);
  boostFlameRight.position.set(0.38, 0.44, 2.12);
  boostFlameRight.visible = false;
  chassisGroup.add(boostFlameLeft, boostFlameRight);

  // 10. Four Articulated Multi-Style Wheels + Vented Brake Rotors & Calipers
  const tireLathePoints = [
    new THREE.Vector2(0.24, -0.17),
    new THREE.Vector2(0.39, -0.17),
    new THREE.Vector2(0.425, -0.11),
    new THREE.Vector2(0.43, 0.0),
    new THREE.Vector2(0.425, 0.11),
    new THREE.Vector2(0.39, 0.17),
    new THREE.Vector2(0.24, 0.17),
  ];
  const wheelGeo = new THREE.LatheGeometry(tireLathePoints, 20);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimBarrelGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.3, 16);
  rimBarrelGeo.rotateZ(Math.PI / 2);
  const spokeClassicGeo = new THREE.BoxGeometry(0.33, 0.22, 0.048);
  const meshSpokeGeo = new THREE.BoxGeometry(0.32, 0.44, 0.028);
  const beadlockRingGeo = new THREE.TorusGeometry(0.245, 0.028, 6, 16);
  beadlockRingGeo.rotateY(Math.PI / 2);
  const turboDishGeo = new THREE.CylinderGeometry(0.23, 0.23, 0.31, 14);
  turboDishGeo.rotateZ(Math.PI / 2);
  const hubCapGeo = new THREE.CylinderGeometry(0.095, 0.095, 0.36, 12);
  hubCapGeo.rotateZ(Math.PI / 2);
  const rotorGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.04, 14);
  rotorGeo.rotateZ(Math.PI / 2);
  const caliperGeo = new THREE.BoxGeometry(0.09, 0.14, 0.1);
  geometries.push(
    wheelGeo,
    rimBarrelGeo,
    spokeClassicGeo,
    meshSpokeGeo,
    beadlockRingGeo,
    turboDishGeo,
    hubCapGeo,
    rotorGeo,
    caliperGeo,
  );

  const wheels: THREE.Mesh[] = [];
  const wheelRimSets: {
    classic: THREE.Group;
    beadlock: THREE.Group;
    mesh: THREE.Group;
    turbo: THREE.Group;
  }[] = [];

  const makeWheel = (x: number, y: number, z: number, sideSign: number): THREE.Mesh => {
    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.castShadow = true;
    tire.receiveShadow = true;
    const barrel = new THREE.Mesh(rimBarrelGeo, trimMat);
    const rotor = new THREE.Mesh(rotorGeo, metalMat);
    const caliper = new THREE.Mesh(caliperGeo, accentMat);
    caliper.position.set(-sideSign * 0.06, 0.11, -0.07);
    tire.add(barrel, rotor, caliper);

    // 1. Classic 5-spoke
    const classicGrp = new THREE.Group();
    for (let s = 0; s < 5; s++) {
      const sp = new THREE.Mesh(spokeClassicGeo, metalMat);
      const a = (s * Math.PI * 2) / 5;
      sp.rotation.x = a;
      sp.position.set(0, Math.cos(a) * 0.12, Math.sin(a) * 0.12);
      classicGrp.add(sp);
    }

    // 2. Offroad Beadlock
    const beadlockGrp = new THREE.Group();
    const bRingOuter = new THREE.Mesh(beadlockRingGeo, accentMat);
    bRingOuter.position.x = sideSign * 0.16;
    beadlockGrp.add(bRingOuter);
    for (let s = 0; s < 3; s++) {
      const sp = new THREE.Mesh(meshSpokeGeo, trimMat);
      sp.rotation.x = (s * Math.PI) / 3;
      beadlockGrp.add(sp);
    }

    // 3. Aero Mesh (10-spoke cross-lace)
    const meshGrp = new THREE.Group();
    for (let s = 0; s < 5; s++) {
      const sp = new THREE.Mesh(meshSpokeGeo, metalMat);
      sp.rotation.x = (s * Math.PI) / 5;
      meshGrp.add(sp);
    }

    // 4. Turbo-Fan
    const turboGrp = new THREE.Group();
    const dish = new THREE.Mesh(turboDishGeo, metalMat);
    const fanRing = new THREE.Mesh(beadlockRingGeo, accentMat);
    fanRing.position.x = sideSign * 0.155;
    turboGrp.add(dish, fanRing);

    tire.add(classicGrp, beadlockGrp, meshGrp, turboGrp);
    wheelRimSets.push({
      classic: classicGrp,
      beadlock: beadlockGrp,
      mesh: meshGrp,
      turbo: turboGrp,
    });

    const cap = new THREE.Mesh(hubCapGeo, accentMat);
    tire.add(cap);
    tire.position.set(x, y, z);
    wheels.push(tire);
    return tire;
  };

  const frontLeftSteer = new THREE.Group();
  frontLeftSteer.position.set(-0.96, 0.43, -1.05);
  frontLeftSteer.add(makeWheel(0, 0, 0, -1));

  const frontRightSteer = new THREE.Group();
  frontRightSteer.position.set(0.96, 0.43, -1.05);
  frontRightSteer.add(makeWheel(0, 0, 0, 1));

  const rlWheel = makeWheel(-0.96, 0.43, 1.05, -1);
  const rrWheel = makeWheel(0.96, 0.43, 1.05, 1);

  root.add(frontLeftSteer, frontRightSteer, rlWheel, rrWheel);

  // 10B. Double-Jump Shockwave Ring Effect beneath chassis
  const djRingGeo = new THREE.RingGeometry(0.65, 1.15, 24);
  djRingGeo.rotateX(-Math.PI / 2);
  geometries.push(djRingGeo);
  const djRingMat = new THREE.MeshBasicMaterial({
    color: 0x3ad6cf,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  materials.push(djRingMat);
  const djRingMesh = new THREE.Mesh(djRingGeo, djRingMat);
  djRingMesh.position.set(0, 0.25, 0);
  djRingMesh.visible = false;
  root.add(djRingMesh);
  let djRingLife = 0;

  // 11. Contact shadow disc directly under vehicle
  const shadowTex = createShadowDiscTexture();
  textures.push(shadowTex);
  const shadowGeo = new THREE.PlaneGeometry(3.3, 4.5);
  shadowGeo.rotateX(-Math.PI / 2);
  geometries.push(shadowGeo);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  materials.push(shadowMat);
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.position.set(0, 0.02, 0);
  root.add(contactShadow);

  let headlightsActive = true;
  let headlightIntensityBase = 0.95;
  let headlightBeamBaseOpacity = 0.2;
  let reducedMotionEnabled = false;

  const setReducedMotion = (enabled: boolean) => {
    reducedMotionEnabled = enabled;
  };

  const triggerDoubleJumpEffect = () => {
    if (reducedMotionEnabled) return;
    djRingLife = 1.0;
    djRingMesh.scale.setScalar(0.85);
    djRingMesh.position.y = 0.22;
    djRingMat.opacity = 0.9;
    djRingMesh.visible = true;
  };

  const setHeadlightsOn = (on: boolean, ambientDark = false) => {
    headlightsActive = on;
    beamLeft.visible = on;
    beamRight.visible = on;
    headlightMat.emissiveIntensity = on ? headlightIntensityBase * (ambientDark ? 1.65 : 1.0) : 0.1;
    headlightBeamMat.opacity = on ? headlightBeamBaseOpacity * (ambientDark ? 1.8 : 1.0) : 0;
  };

  const setGhostMode = (ghost: boolean) => {
    if (!ghost) return;
    [bodyMat, accentMat, trimMat, metalMat, tireMat].forEach((m) => {
      m.transparent = true;
      m.opacity = 0.36;
      m.emissive = new THREE.Color('#21968B');
      m.emissiveIntensity = 0.35;
    });
    contactShadow.visible = false;
    beamLeft.visible = false;
    beamRight.visible = false;
  };

  const applyConfig = (config: VehicleConfig) => {
    const chassis = config.chassisType || 'buggy';
    buggyMesh.visible = chassis === 'buggy';
    roverMesh.visible = chassis === 'rover';
    rallyMesh.visible = chassis === 'rally';

    rollcage.visible = chassis === 'buggy';
    roofRack.visible = chassis !== 'rally';
    roofRack.position.y = chassis === 'rover' ? 1.74 : 1.56;
    windshield.position.y = chassis === 'rover' ? 1.33 : chassis === 'rally' ? 1.13 : 1.24;
    aPillarL.position.y = windshield.position.y;
    aPillarR.position.y = windshield.position.y;
    wiperL.position.y = windshield.position.y - 0.19;
    wiperR.position.y = windshield.position.y - 0.19;
    sideWinL.position.y = chassis === 'rover' ? 1.34 : chassis === 'rally' ? 1.14 : 1.26;
    sideWinR.position.y = chassis === 'rover' ? 1.34 : chassis === 'rally' ? 1.14 : 1.26;
    rearWin.position.y = chassis === 'rover' ? 1.32 : chassis === 'rally' ? 1.12 : 1.22;
    stripeL.position.y = chassis === 'rally' ? 0.88 : chassis === 'rover' ? 1.06 : 0.99;
    stripeR.position.y = chassis === 'rally' ? 0.88 : chassis === 'rover' ? 1.06 : 0.99;
    hoodScoop.position.y = chassis === 'rally' ? 0.91 : chassis === 'rover' ? 1.09 : 1.02;

    bodyMat.color.set(config.paintColor);
    accentMat.color.set(config.accentColor);

    const scaleFactor =
      config.wheelStyle === 'dune' ? 1.14 : config.wheelStyle === 'sport' ? 0.93 : 1.0;
    const widthFactor =
      config.wheelStyle === 'dune' ? 1.24 : config.wheelStyle === 'sport' ? 0.96 : 1.0;
    for (const w of wheels) {
      w.scale.set(widthFactor, scaleFactor, scaleFactor);
    }

    const rimStyle = config.rimStyle || 'classic-5spoke';
    for (const rs of wheelRimSets) {
      rs.classic.visible = rimStyle === 'classic-5spoke';
      rs.beadlock.visible = rimStyle === 'offroad-beadlock';
      rs.mesh.visible = rimStyle === 'aero-mesh';
      rs.turbo.visible = rimStyle === 'turbo-fan';
    }

    const acc = config.accessory || 'spare-tire';
    spareGroup.visible = acc === 'spare-tire';
    spareGroup.position.y = chassis === 'rover' ? 1.86 : chassis === 'rally' ? 1.46 : 1.68;
    lightBarGroup.visible = acc === 'roof-lights';
    lightBarGroup.position.y = chassis === 'rover' ? 1.8 : chassis === 'rally' ? 1.4 : 1.62;
    cargoGroup.visible = acc === 'cargo-box';
    cargoGroup.position.y = chassis === 'rover' ? 1.94 : chassis === 'rally' ? 1.52 : 1.75;
    spoilerGroup.visible = acc === 'spoiler';
    spoilerGroup.position.y = chassis === 'rover' ? 1.5 : chassis === 'rally' ? 1.1 : 1.18;
    trailRackGroup.visible = acc === 'trail-expedition-rack';
    trailRackGroup.position.y = chassis === 'rover' ? 1.88 : chassis === 'rally' ? 1.48 : 1.7;

    const hl = config.headlightEffect || 'warm-halogen';
    if (hl === 'cool-led') {
      headlightMat.color.set('#D8F8FF');
      headlightMat.emissive.set('#92E9FF');
      headlightIntensityBase = 1.2;
      headlightBeamMat.color.set('#92E9FF');
      headlightBeamBaseOpacity = 0.24;
    } else if (hl === 'amber-rally') {
      headlightMat.color.set('#FFB347');
      headlightMat.emissive.set('#FF8F1F');
      headlightIntensityBase = 1.15;
      headlightBeamMat.color.set('#FF9A2E');
      headlightBeamBaseOpacity = 0.26;
    } else {
      headlightMat.color.set('#FFF3B8');
      headlightMat.emissive.set('#FFE08A');
      headlightIntensityBase = 0.95;
      headlightBeamMat.color.set('#FFE08A');
      headlightBeamBaseOpacity = 0.2;
    }
    setHeadlightsOn(headlightsActive, false);

    const nextPlateTex = createPlateTexture(config.plateText || 'SANJAYA');
    plateMat.map = nextPlateTex;
    plateMat.needsUpdate = true;
    plateTex.dispose();
    plateTex = nextPlateTex;
  };

  applyConfig(initialConfig);

  let spinAngle = 0;
  let currentSteerAngle = 0;

  const updateVisuals = (
    speedMs: number,
    steerInput: number,
    isBoosting: boolean,
    dt: number,
    wheelCompressions: [number, number, number, number] = [0.4, 0.4, 0.4, 0.4],
    isDrifting = false,
    isBraking = false,
    throttleInput = 0,
  ) => {
    const wheelRadius = 0.43;
    spinAngle -= (speedMs / wheelRadius) * dt;
    for (const w of wheels) {
      w.rotation.x = spinAngle;
    }

    const suspTravel = 0.14;
    frontLeftSteer.position.y = 0.43 + (wheelCompressions[0] - 0.4) * suspTravel;
    frontRightSteer.position.y = 0.43 + (wheelCompressions[1] - 0.4) * suspTravel;
    rlWheel.position.y = 0.43 + (wheelCompressions[2] - 0.4) * suspTravel;
    rrWheel.position.y = 0.43 + (wheelCompressions[3] - 0.4) * suspTravel;

    const avgComp =
      (wheelCompressions[0] + wheelCompressions[1] + wheelCompressions[2] + wheelCompressions[3]) *
      0.25;
    const targetChassisY = -(avgComp - 0.45) * 0.14;
    chassisGroup.position.y = THREE.MathUtils.damp(chassisGroup.position.y, targetChassisY, 14, dt);

    const targetSteer = steerInput * 0.42;
    currentSteerAngle = THREE.MathUtils.damp(currentSteerAngle, targetSteer, 12, dt);
    frontLeftSteer.rotation.y = currentSteerAngle;
    frontRightSteer.rotation.y = currentSteerAngle;
    cabinSteerWheel.rotation.z = -currentSteerAngle * 1.6;

    const driftLean = isDrifting ? -steerInput * 0.08 : 0;
    const targetRoll = -steerInput * Math.min(1, Math.abs(speedMs) / 14) * 0.06 + driftLean;
    chassisGroup.rotation.z = THREE.MathUtils.damp(chassisGroup.rotation.z, targetRoll, 10, dt);

    // Subtle squat under acceleration and dive under braking
    const targetPitch = THREE.MathUtils.clamp(
      (isBraking ? 0.042 : -throttleInput * 0.028) - (isBoosting ? 0.018 : 0),
      -0.05,
      0.05,
    );
    chassisGroup.rotation.x = THREE.MathUtils.damp(chassisGroup.rotation.x, targetPitch, 9, dt);

    // Dynamic brake / reverse light intensity
    const reversing = speedMs < -0.5;
    taillightMat.emissiveIntensity = isBraking ? 1.9 : reversing ? 1.45 : 0.72;
    taillightMat.color.setHex(reversing && !isBraking ? 0xffe8c2 : 0xee5d52);

    boostFlameLeft.visible = isBoosting;
    boostFlameRight.visible = isBoosting;
    if (isBoosting) {
      const flicker = reducedMotionEnabled ? 1.05 : 0.85 + Math.random() * 0.45;
      boostFlameLeft.scale.set(1, 1, flicker);
      boostFlameRight.scale.set(1, 1, flicker);
    }

    if (djRingLife > 0) {
      djRingLife = Math.max(0, djRingLife - dt * 2.6);
      const p = 1 - djRingLife;
      djRingMesh.scale.setScalar(0.9 + p * 2.6);
      djRingMesh.position.y = 0.22 - p * 0.35;
      djRingMat.opacity = djRingLife * 0.88;
      if (djRingLife <= 0) {
        djRingMesh.visible = false;
      }
    }
  };

  const dispose = () => {
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    plateTex.dispose();
  };

  return {
    root,
    chassisGroup,
    frontLeftSteer,
    frontRightSteer,
    wheels,
    boostFlameLeft,
    boostFlameRight,
    contactShadow,
    applyConfig,
    setHeadlightsOn,
    setGhostMode,
    setReducedMotion,
    triggerDoubleJumpEffect,
    updateVisuals,
    dispose,
  };
}
