import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Flag, RotateCcw, Trophy, X } from 'lucide-react';
import { GameCanvas } from '../components/GameCanvas';
import { GameHUD } from '../components/GameHUD';
import { LandmarkModal } from '../components/LandmarkModal';
import { LoadingScreen } from '../components/LoadingScreen';
import { PauseModal } from '../components/PauseModal';
import { PhotoModeOverlay } from '../components/PhotoModeOverlay';
import { TitleOverlay } from '../components/TitleOverlay';
import { TouchControls } from '../components/TouchControls';
import { WorldMapModal } from '../components/WorldMapModal';
import { WORLD_COLLECTIBLES, WORLD_LANDMARKS } from '../data/portfolioData';
import type { SceneManager } from '../game/sceneManager';
import { useAppState } from '../state/AppStateContext';
import type {
  ActiveChallengeId,
  GameHudSnapshot,
  GamePhase,
  GhostSample,
  WorldLandmark,
} from '../types/portfolio';

const INITIAL_HUD: GameHudSnapshot = {
  speedKmh: 0,
  boostCharge: 100,
  isBoosting: false,
  isDrifting: false,
  isGrounded: true,
  headlightsOn: true,
  zoneName: 'Starting Plaza',
  nearestLandmark: null,
  playerX: 0,
  playerY: 0,
  playerZ: 5.5,
  headingRad: 0,
  distanceDrivenMeters: 0,
  orbsFound: 0,
  totalOrbs: WORLD_COLLECTIBLES.filter((c) => c.kind === 'orb').length,
  tokensFound: 0,
  totalTokens: WORLD_COLLECTIBLES.filter((c) => c.kind === 'token').length,
  fragmentsFound: 0,
  totalFragments: WORLD_COLLECTIBLES.filter((c) => c.kind === 'fragment').length,
  secretsFound: 0,
  totalSecrets: WORLD_COLLECTIBLES.filter((c) => c.kind === 'secret').length,
  activeChallenge: {
    id: null,
    title: '',
    objective: '',
    progressText: '',
    progressCurrent: 0,
    progressTotal: 0,
    timerSec: null,
    timeLimitSec: null,
    status: 'idle',
    rewardText: '',
  },
  race: {
    phase: 'idle',
    countdownVal: 0,
    elapsedSec: 0,
    checkpointIndex: 0,
    totalCheckpoints: 4,
    bestTimeSec: null,
    lastTimeSec: null,
    isNewBest: false,
    ghostActive: false,
  },
};

export const WorldPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoStart = searchParams.get('autostart') === '1';

  const {
    settings,
    updateSettings,
    toggleAudio,
    toggleHeadlights,
    cycleCameraMode,
    vehicleConfig,
    discoveredLandmarks,
    markLandmarkDiscovered,
    collectedIds,
    markCollectiblePicked,
    discoveredSecrets,
    markSecretDiscovered,
    completedChallenges,
    markChallengeCompleted,
    unlockAchievement,
    recentAchievement,
    clearRecentAchievement,
    bestLapSeconds,
    lastLapSeconds,
    bestLapGhost,
    beginPaddockRaceSession,
    recordRaceFinish,
    lastRaceSubmissionNote,
    drawerOpen,
    setDrawerOpen,
    assistantOpen,
    setWorldPhase,
    setTouchHudActive,
    addDistanceDriven,
    setCurrentWorldZone,
    registerWorldNavigator,
  } = useAppState();

  const [phase, setPhase] = useState<GamePhase>('loading');
  const [hud, setHud] = useState<GameHudSnapshot>(INITIAL_HUD);
  const [mapOpen, setMapOpen] = useState(false);
  const [activeLandmark, setActiveLandmark] = useState<WorldLandmark | null>(null);
  const [objectiveId, setObjectiveId] = useState<string | null>(() => {
    const firstUnvisited = WORLD_LANDMARKS.find(
      (l) => !discoveredLandmarks.includes(l.id),
    );
    return firstUnvisited ? firstUnvisited.id : null;
  });
  const [discoveryToast, setDiscoveryToast] = useState<string | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const managerRef = useRef<SceneManager | null>(null);
  const lastSyncedDistanceRef = useRef(0);
  const latestDistanceRef = useRef(0);

  useEffect(() => {
    const checkTouch = () => {
      const coarse =
        typeof window !== 'undefined' &&
        ('ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          Boolean(window.matchMedia?.('(pointer: coarse)')?.matches) ||
          window.innerWidth < 768);
      setIsTouchDevice(coarse);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  useEffect(() => {
    document.body.dataset.state = phase;
    setWorldPhase(phase);
  }, [phase, setWorldPhase]);

  useEffect(() => {
    setCurrentWorldZone(hud.zoneName);
  }, [hud.zoneName, setCurrentWorldZone]);

  useEffect(() => {
    latestDistanceRef.current = hud.distanceDrivenMeters;
    const delta = Math.floor(hud.distanceDrivenMeters - lastSyncedDistanceRef.current);
    if (delta >= 25) {
      lastSyncedDistanceRef.current += delta;
      addDistanceDriven(delta);
    }
  }, [hud.distanceDrivenMeters, addDistanceDriven]);

  useEffect(() => {
    return () => {
      const remaining = Math.floor(latestDistanceRef.current - lastSyncedDistanceRef.current);
      if (remaining >= 1) {
        lastSyncedDistanceRef.current += remaining;
        addDistanceDriven(remaining);
      }
    };
  }, [addDistanceDriven]);

  useEffect(() => {
    registerWorldNavigator((landmarkId: string) => {
      const target = WORLD_LANDMARKS.find((l) => l.id === landmarkId);
      if (!target || !managerRef.current) return false;
      setMapOpen(false);
      setActiveLandmark(null);
      setPhase('playing');
      managerRef.current.teleportToLandmark(target);
      return true;
    });
    return () => registerWorldNavigator(null);
  }, [registerWorldNavigator]);

  const panelOpen = Boolean(activeLandmark || mapOpen || drawerOpen || assistantOpen);
  const lockBodyScroll = phase === 'playing' && !panelOpen;

  useEffect(() => {
    if (lockBodyScroll) {
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.overscrollBehavior = 'none';
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';
      document.body.style.touchAction = 'none';
    } else {
      document.documentElement.style.overflow = '';
      document.documentElement.style.overscrollBehavior = '';
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.documentElement.style.overscrollBehavior = '';
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
      document.body.style.touchAction = '';
    };
  }, [lockBodyScroll]);

  useEffect(() => {
    if (!recentAchievement) return;
    const t = window.setTimeout(clearRecentAchievement, 3600);
    return () => window.clearTimeout(t);
  }, [recentAchievement, clearRecentAchievement]);

  useEffect(() => {
    if (!discoveryToast) return;
    const t = window.setTimeout(() => setDiscoveryToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [discoveryToast]);

  const handleReady = useCallback(() => {
    setPhase(autoStart ? 'playing' : 'title');
  }, [autoStart]);

  const handleStartExploring = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setPhase('playing');
  }, []);

  const handleTogglePause = useCallback(() => {
    if (mapOpen) {
      setMapOpen(false);
      return;
    }
    if (activeLandmark) {
      setActiveLandmark(null);
      return;
    }
    setPhase((prev) => {
      if (prev === 'photomode') return 'playing';
      if (prev === 'playing') return 'paused';
      if (prev === 'paused') return 'playing';
      return prev;
    });
  }, [mapOpen, activeLandmark]);

  const handleTogglePhotoMode = useCallback(() => {
    if (mapOpen || activeLandmark) return;
    setPhase((prev) => {
      if (prev === 'playing') return 'photomode';
      if (prev === 'photomode') return 'playing';
      return prev;
    });
  }, [mapOpen, activeLandmark]);

  const handleLandmarkDiscovered = useCallback(
    (lm: WorldLandmark) => {
      markLandmarkDiscovered(lm.id);
      setDiscoveryToast(`Discovered: ${lm.title}`);
      setObjectiveId((curr) => {
        if (curr !== lm.id) return curr;
        const nextUnvisited = WORLD_LANDMARKS.find(
          (cand) => cand.id !== lm.id && !discoveredLandmarks.includes(cand.id),
        );
        return nextUnvisited ? nextUnvisited.id : null;
      });
    },
    [markLandmarkDiscovered, discoveredLandmarks],
  );

  const handleSecretDiscovered = useCallback(
    (secretId: string, title: string) => {
      markSecretDiscovered(secretId);
      setDiscoveryToast(`Secret Location Found: ${title}!`);
    },
    [markSecretDiscovered],
  );

  const handleInteractLandmark = useCallback((lm: WorldLandmark) => {
    setActiveLandmark(lm);
  }, []);

  const handleDriveToLandmark = useCallback((lm: WorldLandmark) => {
    setMapOpen(false);
    setPhase('playing');
    managerRef.current?.teleportToLandmark(lm);
  }, []);

  const handleOpenRoute = useCallback(
    (route: string) => {
      setMapOpen(false);
      setActiveLandmark(null);
      navigate(route);
    },
    [navigate],
  );

  const handleCollectiblePicked = useCallback(
    (id: string, label: string, found: number, total: number) => {
      markCollectiblePicked(id);
      setDiscoveryToast(`${label} collected (${found}/${total})`);
    },
    [markCollectiblePicked],
  );

  const handleRaceLapCompleted = useCallback(
    (lapSeconds: number, ghostFrames: GhostSample[]) => {
      const { isNewBest } = recordRaceFinish(lapSeconds, ghostFrames);
      setDiscoveryToast(
        isNewBest
          ? `NEW PADDOCK RECORD: ${lapSeconds.toFixed(2)}s!`
          : `Paddock Lap Complete: ${lapSeconds.toFixed(2)}s`,
      );
    },
    [recordRaceFinish],
  );

  const handleStartChallenge = useCallback((id: Exclude<ActiveChallengeId, null>) => {
    managerRef.current?.startChallenge(id);
  }, []);

  const handleStartRace = useCallback(() => {
    beginPaddockRaceSession();
    managerRef.current?.startPaddockRace();
  }, [beginPaddockRaceSession]);

  const showTouch =
    phase === 'playing' &&
    !panelOpen &&
    (settings.showTouchControls === 'always' ||
      (settings.showTouchControls === 'auto' && isTouchDevice));

  useEffect(() => {
    setTouchHudActive(showTouch);
    return () => setTouchHudActive(false);
  }, [showTouch, setTouchHudActive]);

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden bg-[#F7DCB8] select-none touch-none overscroll-none">
      <GameCanvas
        phase={phase}
        panelOpen={panelOpen}
        settings={settings}
        vehicleConfig={vehicleConfig}
        discoveredLandmarks={discoveredLandmarks}
        collectedIds={collectedIds}
        discoveredSecrets={discoveredSecrets}
        bestLapSeconds={bestLapSeconds}
        lastLapSeconds={lastLapSeconds}
        bestLapGhost={bestLapGhost}
        onReady={handleReady}
        onHudUpdate={setHud}
        onLandmarkDiscovered={handleLandmarkDiscovered}
        onSecretDiscovered={handleSecretDiscovered}
        onInteractLandmark={handleInteractLandmark}
        onToggleMap={() => setMapOpen((o) => !o)}
        onTogglePause={handleTogglePause}
        onTogglePhotoMode={handleTogglePhotoMode}
        onToggleHeadlights={toggleHeadlights}
        onCycleCamera={cycleCameraMode}
        onStartFromTitle={handleStartExploring}
        onAchievementTrigger={unlockAchievement}
        onChallengeCompleted={markChallengeCompleted}
        onCollectiblePicked={handleCollectiblePicked}
        onToast={setDiscoveryToast}
        onRaceLapCompleted={handleRaceLapCompleted}
        managerRef={managerRef}
      />

      <LoadingScreen visible={phase === 'loading'} />

      {phase === 'title' && (
        <TitleOverlay
          onStart={handleStartExploring}
          onOpenMenu={() => setDrawerOpen(true)}
          audioEnabled={settings.audioEnabled}
          onToggleAudio={toggleAudio}
        />
      )}

      {phase === 'playing' && (
        <GameHUD
          hud={hud}
          discoveredIds={discoveredLandmarks}
          objectiveId={objectiveId}
          totalLandmarks={WORLD_LANDMARKS.length}
          audioEnabled={settings.audioEnabled}
          cameraMode={settings.cameraMode}
          weatherMode={settings.weatherMode}
          touchControlsVisible={showTouch}
          onOpenMenu={() => setDrawerOpen(true)}
          onOpenMap={() => setMapOpen(true)}
          onToggleAudio={toggleAudio}
          onToggleHeadlights={toggleHeadlights}
          onEnterPhotoMode={() => setPhase('photomode')}
          onCycleCamera={cycleCameraMode}
          onRespawn={() => managerRef.current?.respawnVehicle()}
          onPause={() => setPhase('paused')}
          onInteract={handleInteractLandmark}
          onRestartChallenge={() => managerRef.current?.restartActiveChallenge()}
          onCancelChallenge={() => managerRef.current?.cancelActiveChallenge()}
          onRestartRace={handleStartRace}
        />
      )}

      {phase === 'photomode' && (
        <PhotoModeOverlay
          onZoom={(d) => managerRef.current?.zoomPhoto(d)}
          onChangeFov={(f) => managerRef.current?.setPhotoFov(f)}
          onCapture={() => managerRef.current!.captureScreenshot()}
          onExit={() => setPhase('playing')}
        />
      )}

      {showTouch && (
        <TouchControls
          nearestLandmark={hud.nearestLandmark}
          onChange={(p) => managerRef.current?.controls.setTouchInput(p)}
          onJump={() => managerRef.current?.controls.triggerTouchJump()}
          onInteract={() => {
            if (hud.nearestLandmark) handleInteractLandmark(hud.nearestLandmark);
          }}
        />
      )}

      <WorldMapModal
        open={mapOpen}
        playerX={hud.playerX}
        playerZ={hud.playerZ}
        headingRad={hud.headingRad}
        discoveredIds={discoveredLandmarks}
        collectedIds={collectedIds}
        discoveredSecrets={discoveredSecrets}
        activeChallenge={hud.activeChallenge}
        objectiveId={objectiveId}
        onSelectObjective={setObjectiveId}
        onClose={() => setMapOpen(false)}
        onDriveTo={handleDriveToLandmark}
        onOpenRoute={handleOpenRoute}
      />

      <PauseModal
        open={phase === 'paused'}
        settings={settings}
        onResume={() => setPhase('playing')}
        onRespawn={() => managerRef.current?.respawnVehicle()}
        onExitToTitle={() => {
          managerRef.current?.respawnVehicle();
          setPhase('title');
        }}
        onUpdateSettings={updateSettings}
        onOpenMenu={() => {
          setPhase('playing');
          setDrawerOpen(true);
        }}
        onOpenClassic={() => navigate('/classic')}
      />

      <LandmarkModal
        landmark={activeLandmark}
        objectiveId={objectiveId}
        completedChallenges={completedChallenges}
        bestLapSeconds={bestLapSeconds}
        lastLapSeconds={lastLapSeconds}
        onSetObjective={setObjectiveId}
        onStartChallenge={handleStartChallenge}
        onStartRace={handleStartRace}
        onClose={() => setActiveLandmark(null)}
        onOpenPage={handleOpenRoute}
      />

      {/* Paddock Countdown Center Graphic */}
      {phase === 'playing' && hud.race.phase === 'countdown' && (
        <div className="fixed inset-0 z-30 pointer-events-none flex items-center justify-center">
          <div className="animate-modal-pop px-12 py-6 rounded-3xl bg-[#26211E]/95 border-4 border-[#EC6D2C] shadow-2xl text-center">
            <div className="text-xs font-extrabold text-[#EC6D2C] tracking-[0.2em]">
              THE PADDOCK RACE
            </div>
            <div className="font-display text-8xl font-bold text-[#FFF9F0] leading-none mt-1">
              {hud.race.countdownVal > 0 ? hud.race.countdownVal : 'GO!'}
            </div>
          </div>
        </div>
      )}

      {/* Paddock Race Finish Results Overlay */}
      {phase === 'playing' && hud.race.phase === 'finished' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#26211E]/55 p-4">
          <div
            data-testid="race-results-modal"
            className="animate-modal-pop w-full max-w-md bg-[#FFF9F0] border-2 border-[#26211E] rounded-2xl p-6 shadow-[0_8px_0_#26211E]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#CC5318]">
                <Flag className="w-4 h-4" />
                <span>PADDOCK CIRCUIT FINISH</span>
              </div>
              <button
                type="button"
                onClick={() => managerRef.current?.dismissRaceResults()}
                aria-label="Close race results"
                className="p-1.5 rounded-lg bg-[#F5E9D4] border border-[#26211E] hover:bg-[#E6D3B5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h2 className="font-display text-5xl font-bold text-[#26211E] mt-1 leading-none">
              {hud.race.isNewBest ? 'NEW BEST LAP!' : 'LAP COMPLETE'}
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-[#F5E9D4] border border-[#D9C3A3]">
                <div className="text-[11px] font-extrabold text-[#61564E]">YOUR TIME</div>
                <div className="text-2xl font-extrabold text-[#26211E] tabular-nums mt-0.5">
                  {hud.race.lastTimeSec?.toFixed(2)} s
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#F5E9D4] border border-[#D9C3A3]">
                <div className="text-[11px] font-extrabold text-[#61564E] flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-[#EC6D2C]" />
                  <span>BEST TIME</span>
                </div>
                <div className="text-2xl font-extrabold text-[#EC6D2C] tabular-nums mt-0.5">
                  {hud.race.bestTimeSec?.toFixed(2)} s
                </div>
              </div>
            </div>

            {lastRaceSubmissionNote && (
              <div className="mt-3 px-3.5 py-2 rounded-xl bg-[#F5E9D4]/60 border border-[#D9C3A3] text-xs font-bold text-[#61564E]">
                {lastRaceSubmissionNote}
              </div>
            )}

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={handleStartRace}
                className="flex-1 py-3 rounded-xl bg-[#EC6D2C] text-[#FFF9F0] border-2 border-[#26211E] shadow-[0_3px_0_#26211E] text-sm font-extrabold flex items-center justify-center gap-2 hover:bg-[#CC5318] cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Race Again</span>
              </button>
              <button
                type="button"
                onClick={() => managerRef.current?.dismissRaceResults()}
                className="px-5 py-3 rounded-xl bg-[#F5E9D4] border-2 border-[#26211E] text-sm font-extrabold hover:bg-[#E6D3B5] cursor-pointer"
              >
                Drive Free
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Achievement & Discovery Notification Toast with Trophy Emblem */}
      {(recentAchievement || discoveryToast) && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="animate-hud-toast px-4 py-2.5 rounded-2xl bg-[#26211E] text-[#FFF9F0] border-2 border-[#EC6D2C] shadow-xl flex items-center gap-3">
            {recentAchievement ? (
              <>
                <div className="w-9 h-9 rounded-xl bg-[#EC6D2C] text-[#FFF9F0] flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-extrabold text-[#EC6D2C] tracking-wider leading-none">
                    ACHIEVEMENT UNLOCKED · +{recentAchievement.points} PTS
                  </div>
                  <div className="text-sm font-extrabold mt-0.5 leading-tight">
                    {recentAchievement.title}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-xs sm:text-sm font-extrabold text-[#FFF9F0] px-1">
                {discoveryToast}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
