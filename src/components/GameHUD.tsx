import React from 'react';
import {
  Aperture,
  Camera,
  Crosshair,
  Flag,
  Lightbulb,
  Map as MapIcon,
  MapPin,
  Menu,
  Pause,
  RotateCcw,
  Route,
  SkipForward,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { WORLD_LANDMARKS } from '../data/portfolioData';
import {
  computeDistanceAndBearing,
  getActiveTourStop,
  TOUR_STOPS,
  type TourState,
} from '../game/guidedTour';
import type {
  CameraMode,
  GameHudSnapshot,
  WeatherMode,
  WorldLandmark,
} from '../types/portfolio';
import { MinimapHUD } from './MinimapHUD';

interface GameHUDProps {
  hud: GameHudSnapshot;
  discoveredIds: string[];
  collectedIds?: string[];
  discoveredSecrets?: string[];
  objectiveId: string | null;
  totalLandmarks: number;
  audioEnabled: boolean;
  cameraMode: CameraMode;
  weatherMode: WeatherMode;
  touchControlsVisible?: boolean;
  tourState?: TourState;
  onStartTour?: () => void;
  onSkipTourStop?: () => void;
  onEndTour?: () => void;
  onClearObjective?: () => void;
  onOpenMenu: () => void;
  onOpenMap: () => void;
  onToggleAudio: () => void;
  onToggleHeadlights: () => void;
  onEnterPhotoMode: () => void;
  onCycleCamera: () => void;
  onRespawn: () => void;
  onPause: () => void;
  onInteract: (landmark: WorldLandmark) => void;
  onRestartChallenge: () => void;
  onCancelChallenge: () => void;
  onRestartRace: () => void;
}

const CAMERA_LABELS: Record<CameraMode, string> = {
  chase: 'Chase',
  close: 'Close',
  far: 'Wide',
  topdown: 'Overhead',
  orbit: 'Orbit',
};

const WEATHER_SHORT: Record<WeatherMode, string> = {
  sunny: 'Day',
  sunset: 'Sunset',
  night: 'Night',
  rain: 'Rain',
  fog: 'Fog',
};

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  discoveredIds,
  collectedIds = [],
  discoveredSecrets = [],
  objectiveId,
  totalLandmarks,
  audioEnabled,
  cameraMode,
  weatherMode,
  touchControlsVisible = false,
  tourState,
  onStartTour,
  onSkipTourStop,
  onEndTour,
  onClearObjective,
  onOpenMenu,
  onOpenMap,
  onToggleAudio,
  onToggleHeadlights,
  onEnterPhotoMode,
  onCycleCamera,
  onRespawn,
  onPause,
  onInteract,
  onRestartChallenge,
  onCancelChallenge,
  onRestartRace,
}) => {
  const objectiveLandmark = objectiveId
    ? WORLD_LANDMARKS.find((l) => l.id === objectiveId) || null
    : null;

  const ch = hud.activeChallenge;
  const raceActive = hud.race.phase === 'countdown' || hud.race.phase === 'racing';
  const activeTour = tourState?.active ? getActiveTourStop(tourState) : null;
  const tourNav =
    activeTour?.landmark
      ? computeDistanceAndBearing(
          hud.playerX,
          hud.playerZ,
          activeTour.landmark.position.x,
          activeTour.landmark.position.z,
        )
      : null;
  const objectiveNav = objectiveLandmark
    ? computeDistanceAndBearing(
        hud.playerX,
        hud.playerZ,
        objectiveLandmark.position.x,
        objectiveLandmark.position.z,
      )
    : null;

  // Radial SVG speedometer arc progress (0..120 km/h range)
  const speedRatio = Math.min(1, Math.max(0, hud.speedKmh / 120));
  const arcLen = 113;
  const arcOffset = arcLen - arcLen * speedRatio;

  const drivingState = !hud.isGrounded
    ? { text: 'AIRBORNE', color: '#EC6D2C' }
    : hud.isBoosting
      ? { text: 'BOOSTING', color: '#E65448' }
      : hud.isDrifting
        ? { text: 'DRIFTING', color: '#E65448' }
        : hud.speedKmh > 4
          ? { text: 'CRUISING', color: '#21968B' }
          : { text: 'PARKED', color: '#61564E' };

  const chPct =
    ch.progressTotal > 0
      ? Math.max(0, Math.min(100, (ch.progressCurrent / ch.progressTotal) * 100))
      : 0;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 sm:p-5">
      {/* Top Row: Zone Cluster + Mission / Tour / Race + Quick Utilities */}
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        {/* Top-Left Location & World Telemetry */}
        <div className="flex items-center gap-2 pointer-events-auto min-w-0">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenMenu();
            }}
            aria-label="Open portfolio navigation menu"
            className="ui-hud-panel ui-btn w-11 h-11 shrink-0 p-0 text-[#26211E] hover:bg-[#F5E9D4]"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="ui-hud-panel px-3 sm:px-3.5 py-1.5 sm:py-2 flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#EC6D2C]/15 border border-[#EC6D2C]/35 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-[#EC6D2C]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-extrabold tracking-wider text-[#61564E] leading-none whitespace-nowrap">
                <span className="tabular-nums">
                  {discoveredIds.length}/{totalLandmarks} ZONES
                </span>
                <span className="hidden sm:inline-flex items-center gap-0.5 text-[#21968B] tabular-nums">
                  <Sparkles className="w-3 h-3" />
                  <span>
                    {hud.orbsFound}/{hud.totalOrbs} ORBS
                  </span>
                </span>
                <span className="hidden md:inline text-[#CC5318]">
                  {WEATHER_SHORT[weatherMode].toUpperCase()}
                </span>
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-[#26211E] leading-tight mt-0.5 truncate max-w-[112px] sm:max-w-[230px]">
                {hud.zoneName}
              </div>
            </div>
          </div>
        </div>

        {/* Top-Center Active Challenge / Race / Guided Tour / Objective Tracker */}
        <div className="hidden md:flex flex-col items-center gap-1.5 pointer-events-auto max-w-lg">
          {hud.race.phase === 'racing' && (
            <div className="ui-hud-panel-dark border-[#EC6D2C] px-4 py-2 flex items-center gap-3 text-xs font-extrabold tabular-nums">
              <Flag className="w-4 h-4 text-[#EC6D2C] shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span>LAP {hud.race.elapsedSec.toFixed(1)}s</span>
                  <span className="text-[#E6D3B5]">·</span>
                  <span className="text-[#FFE08A]">
                    CP {hud.race.checkpointIndex}/{hud.race.totalCheckpoints}
                  </span>
                  {hud.race.ghostActive && (
                    <span className="px-1.5 py-0.5 rounded bg-[#21968B]/30 text-[#7FD4DE] text-[10px]">
                      GHOST
                    </span>
                  )}
                </div>
                <div className="mt-1 w-full h-1.5 rounded-full bg-[#3F3834] overflow-hidden">
                  <div
                    className="h-full bg-[#EC6D2C] transition-[width] duration-150"
                    style={{
                      width: `${Math.min(100, (hud.race.checkpointIndex / Math.max(1, hud.race.totalCheckpoints)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onRestartRace();
                }}
                className="px-2.5 py-1 rounded-lg bg-[#EC6D2C] text-[#FFF9F0] text-[10px] hover:bg-[#CC5318] cursor-pointer shrink-0"
              >
                Restart
              </button>
            </div>
          )}

          {!raceActive && ch.id && (
            <div className="ui-hud-panel-dark border-[#EC6D2C] px-4 py-2 flex items-center gap-3 text-xs font-extrabold w-full max-w-md">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 text-[10px] text-[#EC6D2C]">
                  <span className="truncate">
                    {ch.title} · {ch.progressText}
                  </span>
                  {ch.timerSec !== null && (
                    <span className="text-[#E65448] tabular-nums shrink-0">
                      {ch.timerSec.toFixed(1)}s
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-[#FFF9F0] truncate mt-0.5">
                  {ch.feedbackText || ch.objective}
                </div>
                {ch.progressTotal > 0 && (
                  <div className="mt-1.5 w-full h-1.5 rounded-full bg-[#3F3834] overflow-hidden">
                    <div
                      className="h-full bg-[#21968B] transition-[width] duration-200"
                      style={{ width: `${chPct}%` }}
                    />
                  </div>
                )}
              </div>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onRestartChallenge();
                }}
                title="Restart Challenge"
                className="px-2.5 py-1 rounded-lg bg-[#EC6D2C] text-[#FFF9F0] text-[10px] font-extrabold hover:bg-[#CC5318] cursor-pointer shrink-0"
              >
                Restart
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onCancelChallenge();
                }}
                aria-label="Cancel Challenge"
                className="p-1.5 rounded-lg bg-[#3F3834] text-[#FFF9F0] hover:bg-[#E65448] cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {!raceActive && !ch.id && activeTour && (
            <div
              data-testid="guided-tour-banner"
              className="ui-hud-panel-dark border-[#21968B] px-3.5 py-2 flex items-center gap-3 text-xs w-full max-w-lg"
            >
              <Route className="w-4 h-4 text-[#21968B] shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 text-[10px] font-extrabold text-[#7FD4DE]">
                  <span>
                    GUIDED TOUR · STOP {activeTour.stop.stepNumber}/{TOUR_STOPS.length}
                  </span>
                  {tourNav && (
                    <span className="tabular-nums text-[#FFE08A]">
                      {tourNav.distanceMeters}m {tourNav.bearingLabel}
                    </span>
                  )}
                </div>
                <div className="text-xs font-extrabold text-[#FFF9F0] truncate">
                  {activeTour.stop.title}
                </div>
                <div className="text-[11px] font-semibold text-[#F5E9D4] line-clamp-2 leading-snug">
                  {activeTour.stop.intro}
                </div>
              </div>
              {onSkipTourStop && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSkipTourStop();
                  }}
                  title="Skip to next tour stop"
                  className="px-2.5 py-1 rounded-lg bg-[#21968B] text-[#FFF9F0] text-[10px] font-extrabold hover:bg-[#1B7E74] cursor-pointer shrink-0 inline-flex items-center gap-1"
                >
                  <SkipForward className="w-3 h-3" />
                  <span>Skip</span>
                </button>
              )}
              {onEndTour && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onEndTour();
                  }}
                  aria-label="End guided tour"
                  title="End Tour"
                  className="p-1.5 rounded-lg bg-[#3F3834] text-[#FFF9F0] hover:bg-[#E65448] cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {!raceActive && !ch.id && !activeTour && (
            <div className="flex items-center gap-2">
              {objectiveLandmark && (
                <div className="ui-hud-panel px-3 py-1.5 flex items-center gap-2 text-xs font-extrabold text-[#26211E]">
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onOpenMap();
                    }}
                    className="flex items-center gap-1.5 hover:text-[#EC6D2C] transition-colors cursor-pointer"
                  >
                    <Crosshair className="w-3.5 h-3.5 text-[#E65448] shrink-0" />
                    <span>
                      {objectiveLandmark.title}
                      {objectiveNav ? ` · ${objectiveNav.distanceMeters}m ${objectiveNav.bearingLabel}` : ''}
                    </span>
                  </button>
                  {onClearObjective && (
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onClearObjective();
                      }}
                      aria-label="Clear waypoint objective"
                      className="p-0.5 rounded hover:bg-[#E6D3B5] text-[#61564E] hover:text-[#26211E] cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {onStartTour && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onStartTour();
                  }}
                  className="ui-hud-panel px-3 py-1.5 flex items-center gap-1.5 text-xs font-extrabold text-[#21968B] hover:bg-[#F5E9D4] transition-colors cursor-pointer"
                >
                  <Route className="w-3.5 h-3.5 shrink-0" />
                  <span>{tourState?.completed ? 'Replay Tour' : 'Guided Tour'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Top-Right Utility Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto shrink-0">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenMap();
            }}
            aria-label="Open world map [M]"
            title="World Map (M)"
            className="ui-hud-panel ui-btn w-11 h-11 sm:w-auto sm:h-11 sm:px-3 text-xs text-[#26211E] hover:bg-[#F5E9D4]"
          >
            <MapIcon className="w-4 h-4 text-[#21968B]" />
            <span className="hidden sm:inline">Map</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onCycleCamera();
            }}
            aria-label={`Cycle camera angle (${CAMERA_LABELS[cameraMode]}) [C]`}
            title="Cycle Camera (C) · Drag screen in Orbit mode"
            className="hidden sm:inline-flex ui-hud-panel ui-btn h-11 px-3 text-xs text-[#26211E] hover:bg-[#F5E9D4]"
          >
            <Camera className="w-4 h-4 text-[#EC6D2C]" />
            <span>{CAMERA_LABELS[cameraMode]}</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onEnterPhotoMode();
            }}
            aria-label="Photo Mode [P]"
            title="Photo Mode (P)"
            className="hidden md:inline-flex ui-hud-panel ui-btn w-11 h-11 p-0 text-[#26211E] hover:bg-[#F5E9D4]"
          >
            <Aperture className="w-4 h-4 text-[#3E7B9E]" />
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleHeadlights();
            }}
            aria-label={hud.headlightsOn ? 'Turn headlights off [L]' : 'Turn headlights on [L]'}
            title="Headlights (L)"
            className={`hidden md:inline-flex ui-hud-panel ui-btn w-11 h-11 p-0 ${
              hud.headlightsOn
                ? 'bg-[#FFE08A]! text-[#26211E]'
                : 'text-[#61564E] hover:bg-[#F5E9D4]'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleAudio();
            }}
            aria-label={audioEnabled ? 'Mute sound' : 'Enable sound'}
            title={audioEnabled ? 'Mute Audio' : 'Enable Audio'}
            className="ui-hud-panel ui-btn w-11 h-11 p-0 text-[#26211E] hover:bg-[#F5E9D4]"
          >
            {audioEnabled ? (
              <Volume2 className="w-4 h-4 text-[#21968B]" />
            ) : (
              <VolumeX className="w-4 h-4 text-[#61564E]" />
            )}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onRespawn();
            }}
            aria-label="Respawn vehicle [R]"
            title="Respawn at Plaza (R)"
            className="hidden sm:inline-flex ui-hud-panel ui-btn w-11 h-11 p-0 text-[#26211E] hover:bg-[#F5E9D4]"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            aria-label="Pause menu [Esc]"
            title="Pause & Settings (Esc)"
            className="ui-btn ui-btn-dark w-11 h-11 p-0 shadow-[0_3px_0_#61564E]"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Compact Mobile/Tablet Challenge or Guided Tour Strip on narrow viewports */}
      {(raceActive || ch.id) && (
        <div className="md:hidden self-center pointer-events-auto ui-hud-panel-dark border-[#EC6D2C] px-3 py-1.5 text-[11px] font-extrabold max-w-[92vw] truncate">
          {hud.race.phase === 'racing'
            ? `Paddock Race · ${hud.race.elapsedSec.toFixed(1)}s · CP ${hud.race.checkpointIndex}/${hud.race.totalCheckpoints}`
            : `${ch.title}: ${ch.progressText}${ch.timerSec !== null ? ` · ${ch.timerSec.toFixed(1)}s` : ''}`}
        </div>
      )}

      {!raceActive && !ch.id && activeTour && (
        <div className="md:hidden self-center pointer-events-auto ui-hud-panel-dark border-[#21968B] px-3 py-1.5 flex items-center gap-2 text-[11px] font-extrabold max-w-[92vw]">
          <Route className="w-3.5 h-3.5 text-[#21968B] shrink-0" />
          <span className="truncate">
            Tour {activeTour.stop.stepNumber}/{TOUR_STOPS.length}: {activeTour.stop.title}
            {tourNav ? ` · ${tourNav.distanceMeters}m ${tourNav.bearingLabel}` : ''}
          </span>
          {onSkipTourStop && (
            <button
              type="button"
              tabIndex={-1}
              onClick={onSkipTourStop}
              className="px-2 py-0.5 rounded bg-[#21968B] text-[#FFF9F0] text-[10px] shrink-0 cursor-pointer"
            >
              Skip
            </button>
          )}
        </div>
      )}

      {/* Bottom Row: Instrument Speedometer Cluster + Interaction CTA + Minimap */}
      <div
        className={`flex items-end justify-between gap-4 ${
          touchControlsVisible ? 'pb-[118px] sm:pb-28' : 'pb-0'
        }`}
      >
        {/* Bottom-Left: Tactile Speedometer & Radial Gauge */}
        <div className="ui-hud-panel rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 min-w-[144px] sm:min-w-[202px]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: drivingState.color }}
                  aria-hidden="true"
                />
                <span
                  className="text-[10px] font-extrabold tracking-wider leading-none"
                  style={{ color: drivingState.color }}
                >
                  {drivingState.text}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span
                  data-testid="hud-speed"
                  className="text-2xl sm:text-3xl font-extrabold tabular-nums text-[#26211E] leading-none"
                >
                  {hud.speedKmh}
                </span>
                <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-[#61564E]">
                  KM/H
                </span>
              </div>
            </div>

            {/* Radial speed arc gauge SVG with calibration ticks */}
            <svg viewBox="0 0 88 48" className="w-14 h-8 shrink-0 hidden sm:block" aria-hidden="true">
              <path
                d="M 8 42 A 36 36 0 0 1 80 42"
                fill="none"
                stroke="#E6D3B5"
                strokeWidth="7"
                strokeLinecap="round"
              />
              <path
                d="M 8 42 A 36 36 0 0 1 80 42"
                fill="none"
                stroke={hud.isBoosting ? '#E65448' : '#EC6D2C'}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={arcLen}
                strokeDashoffset={arcOffset}
              />
              {[0.25, 0.5, 0.75].map((t) => {
                const ang = Math.PI * (1 - t);
                const x1 = 44 + Math.cos(ang) * 28;
                const y1 = 42 - Math.sin(ang) * 28;
                const x2 = 44 + Math.cos(ang) * 32;
                const y2 = 42 - Math.sin(ang) * 32;
                return (
                  <line
                    key={t}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#61564E"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    opacity="0.55"
                  />
                );
              })}
              <circle
                cx={44 - Math.cos(speedRatio * Math.PI) * 36}
                cy={42 - Math.sin(speedRatio * Math.PI) * 36}
                r="4.4"
                fill="#26211E"
                stroke="#FFF9F0"
                strokeWidth="1.5"
              />
            </svg>
          </div>

          <div className="mt-2 flex items-center justify-between text-[10px] font-extrabold text-[#61564E]">
            <span>NITRO BOOST</span>
            <span className="tabular-nums text-[#26211E]">{hud.boostCharge}%</span>
          </div>
          <div className="mt-1 ui-progress-track h-2">
            <div
              className="ui-progress-fill"
              style={{
                width: `${hud.boostCharge}%`,
                backgroundColor: hud.isBoosting ? '#E65448' : '#21968B',
              }}
            />
          </div>
        </div>

        {/* Bottom-Center: Landmark Proximity Interaction Card + Controls Strip */}
        <div className="flex flex-col items-center gap-2">
          {hud.nearestLandmark && !touchControlsVisible && (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onInteract(hud.nearestLandmark!);
              }}
              className="animate-prompt-up pointer-events-auto ui-btn ui-btn-primary px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl text-left flex items-center gap-3 max-w-sm"
            >
              <span
                className="w-3 h-3 rounded-full border border-[#FFF9F0] shrink-0"
                style={{ backgroundColor: hud.nearestLandmark.color }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-extrabold leading-tight truncate">
                  {hud.nearestLandmark.title}
                </div>
                <div className="hidden sm:block text-[11px] font-bold text-[#FFF9F0]/90 truncate">
                  {hud.nearestLandmark.subtitle}
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-[#26211E] text-[#FFF9F0] text-[10px] font-extrabold tracking-wider shrink-0">
                ENTER
              </span>
            </button>
          )}

          <div className="hidden lg:block ui-hud-panel-dark px-3.5 py-1.5 text-xs font-semibold">
            WASD Drive · Drag Rotate · Scroll Zoom · Shift Boost · Space Jump · B Brake · M Map
          </div>
        </div>

        {/* Bottom-Right: Corner Minimap (hidden when TouchControls occupy corners) */}
        {!touchControlsVisible && (
          <MinimapHUD
            playerX={hud.playerX}
            playerZ={hud.playerZ}
            headingRad={hud.headingRad}
            discoveredIds={discoveredIds}
            collectedIds={collectedIds}
            discoveredSecrets={discoveredSecrets}
            objectiveId={objectiveId}
            onOpenMap={onOpenMap}
          />
        )}
      </div>
    </div>
  );
};
