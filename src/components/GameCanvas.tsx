import React, { useEffect, useRef } from 'react';
import type { DevPerfStats, SceneManager } from '../game/sceneManager';
import type {
  GameHudSnapshot,
  GamePhase,
  GameSettings,
  GhostSample,
  VehicleConfig,
  WorldLandmark,
} from '../types/portfolio';

interface GameCanvasProps {
  phase: GamePhase;
  panelOpen: boolean;
  settings: GameSettings;
  vehicleConfig: VehicleConfig;
  discoveredLandmarks: string[];
  collectedIds: string[];
  discoveredSecrets: string[];
  bestLapSeconds: number | null;
  lastLapSeconds: number | null;
  bestLapGhost: GhostSample[];
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
  onCollectiblePicked: (id: string, label: string, found: number, total: number) => void;
  onToast: (message: string) => void;
  onRaceLapCompleted: (lapSeconds: number, ghostFrames: GhostSample[]) => void;
  onDevTelemetry?: (stats: DevPerfStats) => void;
  managerRef: React.MutableRefObject<SceneManager | null>;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  phase,
  panelOpen,
  settings,
  vehicleConfig,
  discoveredLandmarks,
  collectedIds,
  discoveredSecrets,
  bestLapSeconds,
  lastLapSeconds,
  bestLapGhost,
  onReady,
  onHudUpdate,
  onLandmarkDiscovered,
  onSecretDiscovered,
  onInteractLandmark,
  onToggleMap,
  onTogglePause,
  onTogglePhotoMode,
  onToggleHeadlights,
  onCycleCamera,
  onStartFromTitle,
  onAchievementTrigger,
  onChallengeCompleted,
  onCollectiblePicked,
  onToast,
  onRaceLapCompleted,
  onDevTelemetry,
  managerRef,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const callbacksRef = useRef({
    onReady,
    onHudUpdate,
    onLandmarkDiscovered,
    onSecretDiscovered,
    onInteractLandmark,
    onToggleMap,
    onTogglePause,
    onTogglePhotoMode,
    onToggleHeadlights,
    onCycleCamera,
    onStartFromTitle,
    onAchievementTrigger,
    onChallengeCompleted,
    onCollectiblePicked,
    onToast,
    onRaceLapCompleted,
    onDevTelemetry,
  });

  callbacksRef.current = {
    onReady,
    onHudUpdate,
    onLandmarkDiscovered,
    onSecretDiscovered,
    onInteractLandmark,
    onToggleMap,
    onTogglePause,
    onTogglePhotoMode,
    onToggleHeadlights,
    onCycleCamera,
    onStartFromTitle,
    onAchievementTrigger,
    onChallengeCompleted,
    onCollectiblePicked,
    onToast,
    onRaceLapCompleted,
    onDevTelemetry,
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let cancelled = false;
    let instance: SceneManager | null = null;

    import('../game/sceneManager').then(({ SceneManager: SM }) => {
      if (cancelled) return;
      instance = new SM(
        container,
        settings,
        vehicleConfig,
        discoveredLandmarks,
        collectedIds,
        discoveredSecrets,
        bestLapSeconds,
        lastLapSeconds,
        bestLapGhost,
        {
          onReady: () => callbacksRef.current.onReady(),
          onHudUpdate: (s) => callbacksRef.current.onHudUpdate(s),
          onLandmarkDiscovered: (lm) => callbacksRef.current.onLandmarkDiscovered(lm),
          onSecretDiscovered: (id, title) => callbacksRef.current.onSecretDiscovered(id, title),
          onInteractLandmark: (lm) => callbacksRef.current.onInteractLandmark(lm),
          onToggleMap: () => callbacksRef.current.onToggleMap(),
          onTogglePause: () => callbacksRef.current.onTogglePause(),
          onTogglePhotoMode: () => callbacksRef.current.onTogglePhotoMode(),
          onToggleHeadlights: () => callbacksRef.current.onToggleHeadlights(),
          onCycleCamera: () => callbacksRef.current.onCycleCamera(),
          onStartFromTitle: () => callbacksRef.current.onStartFromTitle(),
          onAchievementTrigger: (id) => callbacksRef.current.onAchievementTrigger(id),
          onChallengeCompleted: (cid) => callbacksRef.current.onChallengeCompleted(cid),
          onCollectiblePicked: (id, label, found, total) =>
            callbacksRef.current.onCollectiblePicked(id, label, found, total),
          onToast: (msg) => callbacksRef.current.onToast(msg),
          onRaceLapCompleted: (lapSeconds, ghostFrames) =>
            callbacksRef.current.onRaceLapCompleted(lapSeconds, ghostFrames),
          onDevTelemetry: import.meta.env.DEV
            ? (stats) => callbacksRef.current.onDevTelemetry?.(stats)
            : undefined,
        },
      );
      managerRef.current = instance;
      instance.setPanelOpen(panelOpen);
    });

    return () => {
      cancelled = true;
      managerRef.current = null;
      instance?.dispose();
    };
    // Mount WebGL canvas once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    managerRef.current?.setPhase(phase);
  }, [phase, managerRef]);

  useEffect(() => {
    managerRef.current?.setPanelOpen(panelOpen);
  }, [panelOpen, managerRef]);

  useEffect(() => {
    managerRef.current?.updateSettings(settings);
  }, [settings, managerRef]);

  useEffect(() => {
    managerRef.current?.updateVehicleConfig(vehicleConfig);
  }, [vehicleConfig, managerRef]);

  useEffect(() => {
    managerRef.current?.syncSavedRaceData(bestLapSeconds, lastLapSeconds, bestLapGhost);
  }, [bestLapSeconds, lastLapSeconds, bestLapGhost, managerRef]);

  return (
    <div
      ref={mountRef}
      data-testid="world-canvas-container"
      className="fixed inset-0 z-0 w-full h-full overflow-hidden bg-[#F7DCB8] touch-none overscroll-none"
    />
  );
};
