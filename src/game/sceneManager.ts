import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  SECRET_LOCATIONS,
  WORLD_COLLECTIBLES,
  WORLD_LANDMARKS,
} from '../data/portfolioData';
import type {
  ActiveChallengeId,
  GameHudSnapshot,
  GamePhase,
  GameSettings,
  GhostSample,
  VehicleConfig,
  WorldLandmark,
} from '../types/portfolio';
import { soundEngine } from './audio';
import { CameraRig } from './cameraRig';
import { ChallengeManager, type ChallengeTickEffects } from './challengeController';
import { GameControls } from './controls';
import {
  clampDt,
  findNearestLandmark,
  getZoneName,
  speedMsToKmh,
} from './physicsMath';
import { createVehicleRig, type VehicleRig } from './vehicleModel';
import { ensureRapierReady, RapierVehiclePhysics } from './vehiclePhysics';
import { buildWorldEnvironment, type WorldBuildResult } from './worldEnvironment';

export interface DevPerfStats {
  fps: number;
  frameMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  quality: GameSettings['quality'];
  isSoftwareGl: boolean;
}

const _yAxis = new THREE.Vector3(0, 1, 0);
const _tmpVec2 = new THREE.Vector2();

export interface SceneManagerCallbacks {
  onReady: () => void;
  onHudUpdate: (snapshot: GameHudSnapshot) => void;
  onLandmarkDiscovered: (landmark: WorldLandmark) => void;
  onSecretDiscovered: (secretId: string, title: string) => void;
  onInteractLandmark: (landmark: WorldLandmark) => void;
  onToggleMap: () => void;
  onTogglePause: () => void;
  onTogglePhotoMode: () => void;
  onToggleHeadlights: () => void;
  onCycleCamera: () => void;
  onStartFromTitle: () => void;
  onAchievementTrigger: (id: string) => void;
  onChallengeCompleted: (challengeId: string) => void;
  onCollectiblePicked?: (id: string, label: string, found: number, total: number) => void;
  onToast?: (message: string) => void;
  onRaceLapCompleted?: (lapSeconds: number, ghostFrames: GhostSample[]) => void;
  onDevTelemetry?: (stats: DevPerfStats) => void;
}

function detectSoftwareGl(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class SceneManager {
  private container: HTMLElement;
  private callbacks: SceneManagerCallbacks;
  private settings: GameSettings;
  private phase: GamePhase = 'loading';
  private panelOpen = false;

  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private envRenderTarget: THREE.WebGLRenderTarget | null = null;
  private cameraRig: CameraRig | null = null;
  private vehicleRig: VehicleRig | null = null;
  private ghostRig: VehicleRig | null = null;
  private worldEnv: WorldBuildResult | null = null;
  private physics: RapierVehiclePhysics | null = null;
  private challengeMgr = new ChallengeManager();
  public controls: GameControls;

  private isSoftwareGl = false;
  private frameId = 0;
  private disposed = false;
  private lastTime = performance.now();
  private elapsed = 0;
  private lastHudPush = 0;
  private currentNearest: WorldLandmark | null = null;
  private discoveredSet = new Set<string>();
  private discoveredSecretSet = new Set<string>();
  private collectedSet = new Set<string>();

  // Pointer drag / wheel for Orbit & Photo Mode camera
  private isDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  // Pooled dust particle ring buffer (48 instances)
  private dustMesh: THREE.InstancedMesh | null = null;
  private dustParticles: {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    life: number;
    maxLife: number;
  }[] = [];
  private dustCursor = 0;
  private dustDummy = new THREE.Object3D();
  private dustNeedsClear = false;
  private dustAnyActive = false;

  // DEV-only performance monitor accumulators
  private devAccumMs = 0;
  private devFrames = 0;

  // Pooled tire skid mark ring buffer (96 instances)
  private skidMesh: THREE.InstancedMesh | null = null;
  private skidCursor = 0;
  private skidDummy = new THREE.Object3D();
  private skidDistAccum = 0;

  constructor(
    container: HTMLElement,
    initialSettings: GameSettings,
    initialVehicle: VehicleConfig,
    discoveredIds: string[],
    collectedIds: string[],
    discoveredSecrets: string[],
    bestLapSeconds: number | null,
    lastLapSeconds: number | null,
    bestLapGhost: GhostSample[],
    callbacks: SceneManagerCallbacks,
  ) {
    this.container = container;
    this.settings = initialSettings;
    this.callbacks = callbacks;
    discoveredIds.forEach((id) => this.discoveredSet.add(id));
    collectedIds.forEach((id) => this.collectedSet.add(id));
    discoveredSecrets.forEach((id) => this.discoveredSecretSet.add(id));
    this.challengeMgr.setSavedRaceData(bestLapSeconds, lastLapSeconds, bestLapGhost);

    this.controls = new GameControls({
      onInteract: () => {
        if (!this.panelOpen && this.currentNearest) {
          soundEngine.playClick();
          this.callbacks.onInteractLandmark(this.currentNearest);
        }
      },
      onToggleMap: () => {
        soundEngine.playClick();
        this.callbacks.onToggleMap();
      },
      onRespawn: () => {
        if (!this.panelOpen) this.respawnVehicle();
      },
      onHorn: () => {
        if (!this.panelOpen) {
          soundEngine.playHorn();
          this.cameraRig?.addTrauma(0.15);
        }
      },
      onToggleHeadlights: () => {
        if (!this.panelOpen) {
          soundEngine.playClick();
          this.callbacks.onToggleHeadlights();
        }
      },
      onTogglePhotoMode: () => {
        if (!this.panelOpen) {
          soundEngine.playClick();
          this.callbacks.onTogglePhotoMode();
        }
      },
      onTogglePause: () => {
        this.callbacks.onTogglePause();
      },
      onCycleCamera: () => {
        this.callbacks.onCycleCamera();
      },
      onStartFromTitle: () => {
        this.callbacks.onStartFromTitle();
      },
    });

    this.init(initialVehicle);
  }

  private async init(initialVehicle: VehicleConfig): Promise<void> {
    await ensureRapierReady();
    if (this.disposed) return;

    this.isSoftwareGl = detectSoftwareGl();

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && this.settings.quality !== 'low',
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;
    this.applyQualityToRenderer(renderer);

    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    this.container.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    this.envRenderTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = this.envRenderTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const cameraRig = new CameraRig(width / height);
    cameraRig.setReducedMotion(this.settings.reducedMotion);
    cameraRig.setFarPlane(
      this.settings.quality === 'low' ? 210 : this.settings.quality === 'medium' ? 275 : 340,
    );
    this.cameraRig = cameraRig;

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const worldEnv = buildWorldEnvironment(scene, maxAniso);
    for (const col of worldEnv.collectibles) {
      if (this.collectedSet.has(col.id)) {
        col.collected = true;
        col.mesh.visible = false;
      }
    }
    worldEnv.applyWeatherMode(this.settings.weatherMode, true);
    worldEnv.setWindMode(this.settings.windMode ?? 'auto');
    worldEnv.setPerformanceProfile(
      this.settings.quality,
      this.settings.reducedMotion,
      this.isSoftwareGl,
    );
    this.worldEnv = worldEnv;

    cameraRig.setColliders(worldEnv.staticColliders);

    const vehicleRig = createVehicleRig(initialVehicle);
    vehicleRig.root.position.set(0, 0, 5.5);
    const ambientDark = this.settings.weatherMode === 'night' || this.settings.weatherMode === 'sunset';
    vehicleRig.setReducedMotion(this.settings.reducedMotion);
    vehicleRig.setHeadlightsOn(this.settings.headlightsOn, ambientDark);
    scene.add(vehicleRig.root);
    this.vehicleRig = vehicleRig;

    // Translucent Ghost Vehicle for Paddock Replay
    const ghostRig = createVehicleRig(initialVehicle);
    ghostRig.setReducedMotion(this.settings.reducedMotion);
    ghostRig.setGhostMode(true);
    ghostRig.root.visible = false;
    scene.add(ghostRig.root);
    this.ghostRig = ghostRig;

    const physics = new RapierVehiclePhysics(
      worldEnv.staticColliders,
      worldEnv.dynamicProps,
      initialVehicle,
    );
    this.physics = physics;

    // Pooled dust particles (48 instances)
    const dustGeo = new THREE.DodecahedronGeometry(0.24, 0);
    const dustMat = new THREE.MeshStandardMaterial({ color: 0xf4e6ce, roughness: 0.95 });
    const dustMesh = new THREE.InstancedMesh(dustGeo, dustMat, 48);
    dustMesh.frustumCulled = false;
    for (let i = 0; i < 48; i++) {
      this.dustParticles.push({ x: 0, y: -50, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0.5 });
      this.dustDummy.position.set(0, -50, 0);
      this.dustDummy.scale.setScalar(0);
      this.dustDummy.updateMatrix();
      dustMesh.setMatrixAt(i, this.dustDummy.matrix);
    }
    dustMesh.instanceMatrix.needsUpdate = true;
    dustMesh.visible = !this.settings.reducedMotion && this.settings.quality !== 'low';
    scene.add(dustMesh);
    this.dustMesh = dustMesh;

    // Pooled tire skid marks (96 instances)
    const skidGeo = new THREE.PlaneGeometry(0.32, 0.72);
    skidGeo.rotateX(-Math.PI / 2);
    const skidMat = new THREE.MeshBasicMaterial({
      color: 0x221f1d,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    });
    const skidMesh = new THREE.InstancedMesh(skidGeo, skidMat, 96);
    skidMesh.frustumCulled = false;
    for (let i = 0; i < 96; i++) {
      this.skidDummy.position.set(0, -50, 0);
      this.skidDummy.scale.setScalar(0);
      this.skidDummy.updateMatrix();
      skidMesh.setMatrixAt(i, this.skidDummy.matrix);
    }
    skidMesh.instanceMatrix.needsUpdate = true;
    scene.add(skidMesh);
    this.skidMesh = skidMesh;

    if (!this.isSoftwareGl) {
      renderer.compile(scene, cameraRig.camera);
    }

    this.controls.attach();
    renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    renderer.domElement.addEventListener('wheel', this.handleWheel, { passive: false });
    window.addEventListener('resize', this.handleResize);

    this.cameraRig.updateTitleFlyover(0);
    renderer.render(scene, cameraRig.camera);

    this.callbacks.onReady();
    this.lastTime = performance.now();
    this.tick();
  }

  private handlePointerDown = (e: PointerEvent): void => {
    this.isDragging = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.isDragging || !this.cameraRig) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    if (this.phase === 'photomode') {
      this.cameraRig.orbitPhotoCamera(-dx * 0.006, dy * 0.006);
    } else if (this.phase === 'playing' && this.settings.cameraMode !== 'topdown') {
      this.cameraRig.adjustOrbit(-dx * 0.006, dy * 0.005);
    }
  };

  private handlePointerUp = (): void => {
    this.isDragging = false;
  };

  private handleWheel = (e: WheelEvent): void => {
    if (!this.cameraRig) return;
    if (this.phase === 'photomode') {
      e.preventDefault();
      this.cameraRig.zoomPhotoCamera(e.deltaY * 0.012);
    } else if (this.phase === 'playing') {
      e.preventDefault();
      this.cameraRig.adjustZoom(e.deltaY * 0.0008);
    }
  };

  private applyQualityToRenderer(renderer: THREE.WebGLRenderer): void {
    this.cameraRig?.setFarPlane(
      this.settings.quality === 'low' ? 210 : this.settings.quality === 'medium' ? 275 : 340,
    );
    if (this.isSoftwareGl) {
      renderer.setPixelRatio(1);
      renderer.shadowMap.enabled = false;
      return;
    }
    const maxRatio =
      this.settings.quality === 'high' ? 2 : this.settings.quality === 'medium' ? 1.5 : 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxRatio));
    renderer.shadowMap.enabled = this.settings.quality !== 'low';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  setPhase(nextPhase: GamePhase): void {
    const prev = this.phase;
    this.phase = nextPhase;
    if (nextPhase === 'photomode' && this.vehicleRig && this.cameraRig) {
      this.cameraRig.enterPhotoMode(this.vehicleRig.root.position);
      this.controls.clearAll();
    } else if (prev !== 'playing' && nextPhase === 'playing' && this.vehicleRig && this.cameraRig) {
      this.cameraRig.snapToVehicle(
        this.vehicleRig.root.position,
        this.vehicleRig.root.quaternion,
      );
      this.controls.clearAll();
    }
  }

  setPanelOpen(open: boolean): void {
    this.panelOpen = open;
    if (open) this.controls.clearAll();
  }

  setPhotoFov(fov: number): void {
    this.cameraRig?.setPhotoFov(fov);
  }

  zoomPhoto(delta: number): void {
    this.cameraRig?.zoomPhotoCamera(delta);
  }

  captureScreenshot(): string {
    if (!this.renderer || !this.scene || !this.cameraRig) {
      throw new Error('3D viewport is not initialized.');
    }
    this.renderer.render(this.scene, this.cameraRig.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  setSecurityGateOpen(open: boolean): void {
    this.worldEnv?.setSecurityGateOpen(open);
  }

  setWaypointTarget(landmarkId: string | null): void {
    this.worldEnv?.setWaypointTarget(landmarkId);
  }

  syncSavedRaceData(best: number | null, last: number | null, ghost: GhostSample[]): void {
    this.challengeMgr.setSavedRaceData(best, last, ghost);
  }

  startChallenge(id: Exclude<ActiveChallengeId, null>): void {
    const fx = this.challengeMgr.startChallenge(id);
    this.applyChallengeEffects(fx);
    this.pushHudSnapshot();
  }

  restartActiveChallenge(): void {
    const fx = this.challengeMgr.restartActiveChallenge();
    this.applyChallengeEffects(fx);
    this.pushHudSnapshot();
  }

  cancelActiveChallenge(): void {
    const fx = this.challengeMgr.cancelChallenge();
    this.applyChallengeEffects(fx);
    this.pushHudSnapshot();
  }

  startPaddockRace(): void {
    if (this.physics && this.vehicleRig && this.cameraRig) {
      // Position at Paddock start gantry facing North along the oval circuit
      const sx = -66;
      const sz = 18;
      const yaw = Math.PI * 0.5;
      this.physics.teleportTo(sx, sz, yaw);
      this.vehicleRig.root.position.set(sx, 0, sz);
      this.vehicleRig.root.quaternion.setFromAxisAngle(_yAxis, yaw);
      this.cameraRig.snapToVehicle(this.vehicleRig.root.position, this.vehicleRig.root.quaternion);
      this.renderer?.render(this.scene!, this.cameraRig.camera);
    }
    const fx = this.challengeMgr.startRace(this.settings.ghostEnabled);
    this.applyChallengeEffects(fx);
    this.pushHudSnapshot();
  }

  stopPaddockRace(): void {
    const fx = this.challengeMgr.stopRace();
    this.applyChallengeEffects(fx);
    if (this.ghostRig) this.ghostRig.root.visible = false;
    this.pushHudSnapshot();
  }

  dismissRaceResults(): void {
    this.challengeMgr.dismissRaceResults();
    this.pushHudSnapshot();
  }

  updateSettings(next: GameSettings): void {
    this.settings = next;
    if (this.renderer) {
      this.applyQualityToRenderer(this.renderer);
    }
    this.cameraRig?.setReducedMotion(next.reducedMotion);
    this.vehicleRig?.setReducedMotion(next.reducedMotion);
    this.ghostRig?.setReducedMotion(next.reducedMotion);
    if (this.dustMesh) {
      this.dustMesh.visible = !next.reducedMotion && next.quality !== 'low';
    }
    this.worldEnv?.applyWeatherMode(next.weatherMode, false);
    this.worldEnv?.setWindMode(next.windMode ?? 'auto');
    this.worldEnv?.setPerformanceProfile(
      next.quality,
      next.reducedMotion,
      this.isSoftwareGl,
    );
    const ambientDark = next.weatherMode === 'night' || next.weatherMode === 'sunset';
    this.vehicleRig?.setHeadlightsOn(next.headlightsOn, ambientDark);
    if (this.renderer && this.scene && this.cameraRig) {
      this.renderer.render(this.scene, this.cameraRig.camera);
    }
  }

  updateVehicleConfig(config: VehicleConfig): void {
    this.vehicleRig?.applyConfig(config);
    this.physics?.updateVehicleUpgrades(config);
    if (this.renderer && this.scene && this.cameraRig) {
      this.renderer.render(this.scene, this.cameraRig.camera);
    }
  }

  respawnVehicle(): void {
    this.physics?.respawn();
    if (this.vehicleRig && this.cameraRig) {
      this.vehicleRig.root.position.set(0, 0, 5.5);
      this.vehicleRig.root.quaternion.identity();
      this.cameraRig.snapToVehicle(
        this.vehicleRig.root.position,
        this.vehicleRig.root.quaternion,
      );
      this.renderer?.render(this.scene!, this.cameraRig.camera);
    }
    soundEngine.playClick();
  }

  teleportToLandmark(landmark: WorldLandmark): void {
    if (!this.physics || !this.vehicleRig || !this.cameraRig) return;
    _tmpVec2.set(-landmark.position.x, -landmark.position.z).normalize();
    const spawnX = landmark.position.x + _tmpVec2.x * 3.0;
    const spawnZ = landmark.position.z + _tmpVec2.y * 3.0;
    const yaw = Math.atan2(_tmpVec2.x, _tmpVec2.y);
    this.physics.teleportTo(spawnX, spawnZ, yaw);
    this.vehicleRig.root.position.set(spawnX, landmark.position.y ?? 0, spawnZ);
    this.vehicleRig.root.quaternion.setFromAxisAngle(_yAxis, yaw);
    this.cameraRig.snapToVehicle(
      this.vehicleRig.root.position,
      this.vehicleRig.root.quaternion,
    );
    this.renderer?.render(this.scene!, this.cameraRig.camera);
    this.currentNearest = landmark;
    this.worldEnv?.triggerDiscoveryPulse(landmark.position.x, landmark.position.z, landmark.color);
    if (!this.discoveredSet.has(landmark.id)) {
      this.discoveredSet.add(landmark.id);
      this.callbacks.onLandmarkDiscovered(landmark);
    }
    this.pushHudSnapshot();
  }

  private applyChallengeEffects(fx: ChallengeTickEffects): void {
    if (fx.playClick) soundEngine.playClick();
    if (fx.playChime) soundEngine.playChime();
    if (fx.playBeep) soundEngine.playCountdownBeep(false);
    if (fx.playGo) soundEngine.playCountdownBeep(true);
    if (fx.securityGateOpen !== undefined) this.worldEnv?.setSecurityGateOpen(fx.securityGateOpen);
    if (fx.rfidCardCollected !== undefined) this.worldEnv?.setRfidCardCollected(fx.rfidCardCollected);
    if (fx.deliveryTargetId !== undefined) this.worldEnv?.setDeliveryTarget(fx.deliveryTargetId);
    if (fx.sqlNextIdx !== undefined) this.worldEnv?.setSqlProgress(fx.sqlNextIdx);
    if (fx.paddockNextIdx !== undefined) this.worldEnv?.setPaddockCheckpoint(fx.paddockNextIdx);
    if (fx.timeTrialNextIdx !== undefined) this.worldEnv?.setTimeTrialProgress(fx.timeTrialNextIdx);
    if (fx.bugHuntFoundIds !== undefined) this.worldEnv?.setBugHuntState(fx.bugHuntFoundIds);
    if (fx.memoryHighlightPadId !== undefined) this.worldEnv?.setMemoryPadHighlight(fx.memoryHighlightPadId);
    if (fx.treasureFoundIds !== undefined) this.worldEnv?.setTreasureState(fx.treasureFoundIds);
    if (fx.unlockAchievementId) this.callbacks.onAchievementTrigger(fx.unlockAchievementId);
    if (fx.completeChallengeId) this.callbacks.onChallengeCompleted(fx.completeChallengeId);
    if (fx.toastMessage) this.callbacks.onToast?.(fx.toastMessage);
    if (fx.raceFinished) {
      this.callbacks.onRaceLapCompleted?.(fx.raceFinished.lapSeconds, fx.raceFinished.ghostFrames);
    }
  }

  private pushHudSnapshot(): void {
    if (!this.physics || !this.vehicleRig) return;
    const pos = this.vehicleRig.root.position;
    const speedKmh = speedMsToKmh(this.physics.forwardSpeed);

    let orbsFound = 0;
    let totalOrbs = 0;
    let tokensFound = 0;
    let totalTokens = 0;
    let fragmentsFound = 0;
    let totalFragments = 0;
    let secretsFound = 0;
    let totalSecrets = 0;

    for (let i = 0; i < WORLD_COLLECTIBLES.length; i++) {
      const c = WORLD_COLLECTIBLES[i];
      const collected = this.collectedSet.has(c.id);
      if (c.kind === 'orb') {
        totalOrbs++;
        if (collected) orbsFound++;
      } else if (c.kind === 'token') {
        totalTokens++;
        if (collected) tokensFound++;
      } else if (c.kind === 'fragment') {
        totalFragments++;
        if (collected) fragmentsFound++;
      } else if (c.kind === 'secret') {
        totalSecrets++;
        if (collected) secretsFound++;
      }
    }

    this.callbacks.onHudUpdate({
      speedKmh,
      boostCharge: Math.round(this.physics.boostCharge),
      isBoosting: this.physics.isBoosting,
      isDrifting: this.physics.isDrifting,
      isGrounded: this.physics.isGrounded,
      headlightsOn: this.settings.headlightsOn,
      zoneName: getZoneName(pos.x, pos.z, WORLD_LANDMARKS),
      nearestLandmark: this.currentNearest,
      playerX: pos.x,
      playerY: pos.y,
      playerZ: pos.z,
      headingRad: this.physics.getYaw(),
      distanceDrivenMeters: this.physics.distanceDriven,
      orbsFound,
      totalOrbs,
      tokensFound,
      totalTokens,
      fragmentsFound,
      totalFragments,
      secretsFound,
      totalSecrets,
      activeChallenge: this.challengeMgr.getActiveChallengeHud(),
      race: this.challengeMgr.getRaceHudState(this.settings.ghostEnabled),
    });
  }

  private spawnDust(x: number, y: number, z: number, intensity = 1): void {
    if (this.settings.reducedMotion || this.settings.quality === 'low') return;
    const p = this.dustParticles[this.dustCursor];
    this.dustCursor = (this.dustCursor + 1) % this.dustParticles.length;
    p.x = x + (Math.random() - 0.5) * 1.1;
    p.y = y + 0.18;
    p.z = z + (Math.random() - 0.5) * 1.1;
    p.vx = (Math.random() - 0.5) * 1.8 * intensity;
    p.vy = (0.9 + Math.random() * 1.2) * intensity;
    p.vz = (Math.random() - 0.5) * 1.8 * intensity;
    p.maxLife = 0.45 + Math.random() * 0.25;
    p.life = p.maxLife;
    this.dustAnyActive = true;
  }

  private laySkidMarks(pos: THREE.Vector3, yaw: number): void {
    if (!this.skidMesh) return;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    for (const side of [-0.92, 0.92]) {
      const idx = this.skidCursor;
      this.skidCursor = (this.skidCursor + 1) % 96;
      const wx = pos.x + side * cosY + 1.05 * sinY;
      const wz = pos.z - side * sinY + 1.05 * cosY;
      this.skidDummy.position.set(wx, pos.y + 0.04, wz);
      this.skidDummy.rotation.set(0, yaw, 0);
      this.skidDummy.scale.setScalar(1);
      this.skidDummy.updateMatrix();
      this.skidMesh.setMatrixAt(idx, this.skidDummy.matrix);
    }
    this.skidMesh.instanceMatrix.needsUpdate = true;
  }

  private updateDust(dt: number): void {
    if (!this.dustMesh) return;
    if (!this.dustAnyActive && !this.dustNeedsClear) return;

    let anyAlive = false;
    for (let i = 0; i < this.dustParticles.length; i++) {
      const p = this.dustParticles[i];
      if (p.life > 0) {
        anyAlive = true;
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        const t = Math.max(0, p.life / p.maxLife);
        this.dustDummy.position.set(p.x, p.y, p.z);
        this.dustDummy.scale.setScalar(t * 1.15);
      } else {
        this.dustDummy.position.set(0, -50, 0);
        this.dustDummy.scale.setScalar(0);
      }
      this.dustDummy.updateMatrix();
      this.dustMesh.setMatrixAt(i, this.dustDummy.matrix);
    }
    this.dustMesh.instanceMatrix.needsUpdate = true;
    this.dustNeedsClear = this.dustAnyActive && !anyAlive;
    this.dustAnyActive = anyAlive;
  }

  private handleResize = (): void => {
    if (!this.renderer || !this.cameraRig) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.cameraRig.camera.aspect = w / h;
    this.cameraRig.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.scene) {
      this.renderer.render(this.scene, this.cameraRig.camera);
    }
  };

  private afterDraw(cb: () => void): void {
    if (!this.renderer) return;
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 45);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = (): void => {
    if (this.disposed || !this.renderer || !this.scene || !this.cameraRig) return;

    const now = performance.now();
    const rawFrameDt = Math.min(0.25, Math.max(0.001, (now - this.lastTime) / 1000));
    const dt = clampDt(rawFrameDt);
    this.lastTime = now;

    if (this.phase === 'photomode') {
      this.worldEnv?.updateEnvironment(this.elapsed, rawFrameDt);
      const move = this.controls.getPhotoMoveIntent();
      this.cameraRig.panPhotoCamera(move.forward, move.right, move.up, dt);
      this.cameraRig.updatePhotoMode(dt);
      soundEngine.updateEngine(0, false, false, false, 0, false, this.settings.weatherMode);
      this.renderer.render(this.scene, this.cameraRig.camera);
      if (this.isSoftwareGl) {
        this.afterDraw(this.tick);
      } else {
        this.frameId = requestAnimationFrame(this.tick);
      }
      return;
    }

    this.elapsed += dt;
    this.worldEnv?.updateEnvironment(this.elapsed, rawFrameDt);

    if (this.phase === 'title') {
      this.controls.pollMenuGamepad();
      this.cameraRig.updateTitleFlyover(dt);
      soundEngine.updateEngine(0, false, false, false, 0, false, this.settings.weatherMode);
    } else if (this.phase === 'playing' && this.physics && this.vehicleRig) {
      const rawIntent = this.controls.consumeDrivingIntent();
      const locked = this.panelOpen || this.challengeMgr.isThrottleLocked();
      const intent = locked
        ? { throttle: 0, steer: 0, brake: true, handbrake: false, boost: false, jump: false }
        : rawIntent;

      const gpLook = this.controls.getGamepadCameraLook();
      if (!locked && (gpLook.yawDelta !== 0 || gpLook.pitchDelta !== 0)) {
        this.cameraRig.adjustOrbit(gpLook.yawDelta, gpLook.pitchDelta);
      }

      const simOut = this.physics.step(intent, dt);

      this.vehicleRig.root.position.copy(simOut.position);
      this.vehicleRig.root.quaternion.copy(simOut.quaternion);
      this.vehicleRig.updateVisuals(
        this.physics.forwardSpeed,
        intent.steer,
        this.physics.isBoosting,
        dt,
        simOut.wheelCompressions,
        this.physics.isDrifting,
      );

      if (simOut.justJumped) {
        soundEngine.playJump();
      }
      if (simOut.justLanded) {
        this.cameraRig.addTrauma(0.28);
      }
      if (simOut.collisionImpact > 0.15) {
        this.cameraRig.addTrauma(simOut.collisionImpact * 0.45);
        soundEngine.playImpact(simOut.collisionImpact);
        if (this.settings.quality !== 'low') {
          this.spawnDust(simOut.position.x, simOut.position.y + 0.3, simOut.position.z, 1.4);
        }
      }

      const speedKmh = speedMsToKmh(this.physics.forwardSpeed);
      if (!this.settings.reducedMotion && this.settings.quality !== 'low') {
        const dustRate = this.physics.isBoosting ? 0.65 : 0.25;
        if (
          !locked &&
          speedKmh > 6 &&
          this.physics.isGrounded &&
          (this.physics.isDrifting || Math.random() < dustRate)
        ) {
          this.spawnDust(simOut.position.x, simOut.position.y, simOut.position.z);
        }
      }

      if (!locked && this.physics.isDrifting && this.physics.isGrounded && speedKmh > 12) {
        this.skidDistAccum += Math.abs(this.physics.forwardSpeed) * dt;
        if (this.skidDistAccum >= 0.45) {
          this.skidDistAccum = 0;
          this.laySkidMarks(simOut.position, this.physics.getYaw());
        }
      }

      if (!locked && speedKmh > 4 && this.physics.distanceDriven > 3.5) {
        this.callbacks.onAchievementTrigger('first-drive');
      }

      soundEngine.updateEngine(
        speedKmh,
        this.physics.isBoosting,
        !locked,
        this.physics.isDrifting,
        intent.throttle,
        intent.brake,
        this.settings.weatherMode,
      );
      this.cameraRig.updateGameplay(
        simOut.position,
        simOut.quaternion,
        this.physics.forwardSpeed,
        this.physics.isBoosting,
        this.settings.cameraMode,
        dt,
      );

      // Collectibles detection (Orbs, Tokens, Fragments, Secret Relics)
      if (this.worldEnv && this.collectedSet.size < this.worldEnv.collectibles.length) {
        for (const col of this.worldEnv.collectibles) {
          if (col.collected) continue;
          const dx = simOut.position.x - col.x;
          const dz = simOut.position.z - col.z;
          if (dx * dx + dz * dz < 7.84 && Math.abs(simOut.position.y - col.y) < 3.4) {
            col.collected = true;
            col.mesh.visible = false;
            this.collectedSet.add(col.id);
            soundEngine.playCollect();
            this.callbacks.onCollectiblePicked?.(
              col.id,
              col.label,
              this.collectedSet.size,
              this.worldEnv.collectibles.length,
            );
          }
        }
      }

      // Secret Locations discovery
      if (this.discoveredSecretSet.size < SECRET_LOCATIONS.length) {
        for (const sec of SECRET_LOCATIONS) {
          if (this.discoveredSecretSet.has(sec.id)) continue;
          const dx = simOut.position.x - sec.x;
          const dz = simOut.position.z - sec.z;
          if (dx * dx + dz * dz <= sec.radius * sec.radius) {
            this.discoveredSecretSet.add(sec.id);
            soundEngine.playChime();
            this.worldEnv?.triggerDiscoveryPulse(sec.x, sec.z, '#5E915E');
            this.callbacks.onSecretDiscovered(sec.id, sec.title);
          }
        }
      }

      // Challenges & Paddock Race update
      const cFx = this.challengeMgr.tick(simOut.position.x, simOut.position.z, dt);
      this.applyChallengeEffects(cFx);

      // Ghost Vehicle Playback
      const ghostPose = this.challengeMgr.sampleGhostPose(
        dt,
        simOut.position.x,
        simOut.position.y,
        simOut.position.z,
        this.physics.getYaw(),
      );
      if (this.ghostRig) {
        if (this.settings.ghostEnabled && ghostPose) {
          this.ghostRig.root.visible = true;
          this.ghostRig.root.position.set(ghostPose.x, ghostPose.y, ghostPose.z);
          this.ghostRig.root.quaternion.setFromAxisAngle(_yAxis, ghostPose.yaw);
          this.ghostRig.updateVisuals(18, 0, false, dt);
        } else {
          this.ghostRig.root.visible = false;
        }
      }

      // Landmark proximity check
      const { landmark } = findNearestLandmark(
        simOut.position.x,
        simOut.position.z,
        WORLD_LANDMARKS,
      );
      this.currentNearest = landmark;
      if (landmark && !this.discoveredSet.has(landmark.id)) {
        this.discoveredSet.add(landmark.id);
        soundEngine.playChime();
        this.worldEnv?.triggerDiscoveryPulse(landmark.position.x, landmark.position.z, landmark.color);
        this.callbacks.onLandmarkDiscovered(landmark);
      }

      if (now - this.lastHudPush >= 90) {
        this.lastHudPush = now;
        this.pushHudSnapshot();
      }
    } else {
      this.controls.pollMenuGamepad();
      soundEngine.updateEngine(0, false, false, false, 0, false, this.settings.weatherMode);
    }

    this.updateDust(dt);
    this.renderer.render(this.scene, this.cameraRig.camera);

    if (import.meta.env.DEV && this.callbacks.onDevTelemetry) {
      this.devAccumMs += rawFrameDt * 1000;
      this.devFrames++;
      if (this.devAccumMs >= 350) {
        const avgMs = this.devAccumMs / this.devFrames;
        const info = this.renderer.info;
        this.callbacks.onDevTelemetry({
          fps: Math.round(1000 / Math.max(1, avgMs)),
          frameMs: Number(avgMs.toFixed(1)),
          drawCalls: info.render.calls,
          triangles: info.render.triangles,
          geometries: info.memory.geometries,
          textures: info.memory.textures,
          quality: this.settings.quality,
          isSoftwareGl: this.isSoftwareGl,
        });
        this.devAccumMs = 0;
        this.devFrames = 0;
      }
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    if (this.renderer) {
      this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
      this.renderer.domElement.removeEventListener('wheel', this.handleWheel);
    }
    this.controls.detach();
    soundEngine.updateEngine(0, false, false, false);

    this.vehicleRig?.dispose();
    this.ghostRig?.dispose();
    this.worldEnv?.dispose();
    this.physics?.dispose();
    if (this.scene) {
      this.scene.environment = null;
    }
    this.envRenderTarget?.dispose();
    this.envRenderTarget = null;
    if (this.dustMesh) {
      this.dustMesh.geometry.dispose();
      (this.dustMesh.material as THREE.Material).dispose();
    }
    if (this.skidMesh) {
      this.skidMesh.geometry.dispose();
      (this.skidMesh.material as THREE.Material).dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
  }
}
