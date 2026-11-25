import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RotateCcw } from 'lucide-react';
import { createVehicleRig, type VehicleRig } from '../game/vehicleModel';
import type { VehicleConfig } from '../types/portfolio';

interface GaragePreview3DProps {
  config: VehicleConfig;
}

type CameraAnglePreset = 'three-quarter' | 'front' | 'rear' | 'side';

const CAMERA_PRESETS: Record<CameraAnglePreset, { yaw: number; pitch: number; label: string }> = {
  'three-quarter': { yaw: 0.68, pitch: 0.34, label: '3/4 View' },
  front: { yaw: 3.14, pitch: 0.24, label: 'Headlights' },
  rear: { yaw: 0.0, pitch: 0.26, label: 'Rear Plate' },
  side: { yaw: 1.57, pitch: 0.22, label: 'Side Profile' },
};

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

export const GaragePreview3D: React.FC<GaragePreview3DProps> = ({ config }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rigRef = useRef<VehicleRig | null>(null);
  const targetOrbitRef = useRef({ yaw: 0.68, pitch: 0.34 });
  const requestRenderRef = useRef<(() => void) | null>(null);
  const [activePreset, setActivePreset] = useState<CameraAnglePreset>('three-quarter');

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const width = container.clientWidth || 460;
    const height = container.clientHeight || 320;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: isSoftwareGl,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#F5E9D4');
    scene.fog = new THREE.Fog('#F5E9D4', 14, 34);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRenderTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envRenderTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);

    // 3-point warm/cool garage showroom lighting
    const hemi = new THREE.HemisphereLight('#FFF9F0', '#BD9468', 1.2);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight('#FFF3DC', 2.25);
    keyLight.position.set(6, 9, 6);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#9BE4DA', 0.95);
    rimLight.position.set(-6, 4, -5);
    scene.add(rimLight);

    // Showroom turntable platform
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    const floorGeo = new THREE.CircleGeometry(14, 48);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({ color: '#EDD9BA', roughness: 0.9 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.14;
    floor.receiveShadow = true;

    const padGeo = new THREE.CylinderGeometry(2.7, 2.95, 0.16, 44);
    const padMat = new THREE.MeshStandardMaterial({ color: '#2F2926', roughness: 0.48, metalness: 0.24 });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.y = -0.07;
    pad.receiveShadow = true;

    const ringGeo = new THREE.RingGeometry(2.44, 2.6, 44);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: '#EC6D2C' });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.012;

    const innerRingGeo = new THREE.RingGeometry(1.9, 1.96, 44);
    innerRingGeo.rotateX(-Math.PI / 2);
    const innerRingMat = new THREE.MeshBasicMaterial({ color: '#21968B' });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.position.y = 0.012;

    geometries.push(floorGeo, padGeo, ringGeo, innerRingGeo);
    materials.push(floorMat, padMat, ringMat, innerRingMat);
    scene.add(floor, pad, ring, innerRing);

    const rig = createVehicleRig(config);
    rig.root.position.set(0, 0, 0);
    scene.add(rig.root);
    rigRef.current = rig;

    const currentOrbit = { yaw: targetOrbitRef.current.yaw, pitch: targetOrbitRef.current.pitch };
    const radius = 5.45;
    const _lookTarget = new THREE.Vector3(0, 0.72, 0);

    const updateCamera = (dt: number): boolean => {
      currentOrbit.yaw = THREE.MathUtils.damp(currentOrbit.yaw, targetOrbitRef.current.yaw, 9, dt);
      currentOrbit.pitch = THREE.MathUtils.damp(
        currentOrbit.pitch,
        targetOrbitRef.current.pitch,
        9,
        dt,
      );
      const horiz = Math.cos(currentOrbit.pitch) * radius;
      camera.position.set(
        Math.sin(currentOrbit.yaw) * horiz,
        0.72 + Math.sin(currentOrbit.pitch) * radius,
        Math.cos(currentOrbit.yaw) * horiz,
      );
      camera.lookAt(_lookTarget);
      const remaining =
        Math.abs(currentOrbit.yaw - targetOrbitRef.current.yaw) +
        Math.abs(currentOrbit.pitch - targetOrbitRef.current.pitch);
      return remaining > 0.003;
    };

    let frameId = 0;
    let disposed = false;
    let renderBusy = false;
    let renderDirty = false;
    let lastStamp = performance.now();

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const requestRender = () => {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        const now = performance.now();
        const dt = Math.min(0.05, Math.max(0.008, (now - lastStamp) / 1000));
        lastStamp = now;

        const stillSettling = updateCamera(dt);
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty || stillSettling) {
            requestRender();
          }
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    };
    requestRenderRef.current = requestRender;

    // Initial draw
    updateCamera(0.05);
    renderer.render(scene, camera);
    requestRender();

    // Pointer drag orbit inspection
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      targetOrbitRef.current.yaw -= dx * 0.01;
      targetOrbitRef.current.pitch = THREE.MathUtils.clamp(
        targetOrbitRef.current.pitch + dy * 0.006,
        0.1,
        0.95,
      );
      requestRender();
    };
    const onPointerUp = (e: PointerEvent) => {
      dragging = false;
      if (renderer.domElement.hasPointerCapture(e.pointerId)) {
        renderer.domElement.releasePointerCapture(e.pointerId);
      }
    };
    const onResize = () => {
      const w = container.clientWidth || 460;
      const h = container.clientHeight || 320;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      requestRenderRef.current = null;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
      rig.dispose();
      scene.environment = null;
      envRenderTarget.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
    // Mount 3D showroom canvas once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    rigRef.current?.applyConfig(config);
    requestRenderRef.current?.();
  }, [config]);

  const handleSelectPreset = (preset: CameraAnglePreset) => {
    setActivePreset(preset);
    targetOrbitRef.current = {
      yaw: CAMERA_PRESETS[preset].yaw,
      pitch: CAMERA_PRESETS[preset].pitch,
    };
    requestRenderRef.current?.();
  };

  return (
    <div className="space-y-3">
      <div className="relative ui-card-featured overflow-hidden bg-[#F5E9D4] h-64 sm:h-72">
        <div
          ref={mountRef}
          data-testid="garage-3d-canvas"
          className="w-full h-full cursor-grab active:cursor-grabbing"
          aria-label="Interactive 3D vehicle customization turntable"
        />
        <div className="pointer-events-none absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-[#26211E]/90 text-[#FFF9F0] text-[11px] font-extrabold tracking-wide">
          DRAG TO ROTATE 3D VIEW
        </div>
        <button
          type="button"
          onClick={() => handleSelectPreset('three-quarter')}
          aria-label="Reset camera angle"
          className="ui-hud-panel ui-btn absolute top-2.5 right-2.5 px-2.5 py-1 text-[11px] text-[#26211E] hover:bg-[#F5E9D4]"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      <div className="ui-segmented w-full grid grid-cols-2 sm:grid-cols-4">
        {(Object.keys(CAMERA_PRESETS) as CameraAnglePreset[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activePreset === key}
            onClick={() => handleSelectPreset(key)}
            className="ui-tab text-center"
          >
            {CAMERA_PRESETS[key].label}
          </button>
        ))}
      </div>
    </div>
  );
};
