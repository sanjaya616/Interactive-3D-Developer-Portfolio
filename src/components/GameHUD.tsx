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
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { WORLD_LANDMARKS } from '../data/portfolioData';
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
  objectiveId: string | null;
  totalLandmarks: number;
  audioEnabled: boolean;
  cameraMode: CameraMode;
  weatherMode: WeatherMode;
  touchControlsVisible?: boolean;
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
  objectiveId,
  totalLandmarks,
  audioEnabled,
  cameraMode,
  weatherMode,
  touchControlsVisible = false,
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

  // Radial SVG speedometer arc progress (0..130 km/h range)
  const speedRatio = Math.min(1, Math.max(0, hud.speedKmh / 120));
  const arcLen = 113;
  const arcOffset = arcLen - arcLen * speedRatio;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 sm:p-5">
      {/* Top Row: Zone Cluster + Mission / Race + Quick Utilities */}
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        {/* Top-Left Location & Progress Cluster */}
        <div className="flex items-center gap-2 pointer-events-auto min-w-0">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenMenu();
            }}
            aria-label="Open portfolio navigation menu"
            className="w-11 h-11 shrink-0 rounded-xl bg-[#FFF9F0]/95 border-2 border-[#26211E] shadow-[0_3px_0_#26211E] flex items-center justify-center text-[#26211E] hover:bg-[#F5E9D4] active:translate-y-0.5 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="bg-[#FFF9F0]/95 border-2 border-[#26211E] rounded-xl px-3 sm:px-3.5 py-1.5 sm:py-2 shadow-[0_3px_0_#26211E] flex items-center gap-2.5 min-w-0">
            <MapPin className="w-4 h-4 text-[#EC6D2C] shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-extrabold tracking-wider text-[#61564E] leading-none whitespace-nowrap">
                <span>
                  {discoveredIds.length}/{totalLandmarks} ZONES
                </span>
                <span className="hidden sm:inline-flex items-center gap-0.5 text-[#21968B]">
                  <Sparkles className="w-3 h-3" />
                  <span>
                    {hud.orbsFound}/{hud.totalOrbs} ORBS
                  </span>
                </span>
                <span className="hidden md:inline text-[#CC5318]">
                  {WEATHER_SHORT[weatherMode].toUpperCase()}
                </span>
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-[#26211E] leading-tight mt-0.5 truncate max-w-[125px] sm:max-w-none">
                {hud.zoneName}
              </div>
            </div>
          </div>
        </div>

        {/* Top-Center Active Challenge / Race / Objective Tracker */}
        <div className="hidden lg:flex flex-col items-center gap-1.5 pointer-events-auto">
          {hud.race.phase === 'racing' && (
            <div className="bg-[#26211E] text-[#FFF9F0] border-2 border-[#EC6D2C] rounded-xl px-4 py-1.5 shadow-[0_3px_0_#26211E] flex items-center gap-3 text-xs font-extrabold tabular-nums">
              <Flag className="w-4 h-4 text-[#EC6D2C]" />
              <span>
                {`LAP ${hud.race.elapsedSec.toFixed(1)}s · CP ${hud.race.checkpointIndex}/${hud.race.totalCheckpoints}`}
              </span>
              {hud.race.ghostActive && (
                <span className="px-1.5 py-0.5 rounded bg-[#21968B]/30 text-[#7FD4DE] text-[10px]">
                  GHOST
                </span>
              )}
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onRestartRace();
                }}
                className="px-2 py-0.5 rounded bg-[#EC6D2C] text-[#FFF9F0] text-[10px] hover:bg-[#CC5318] cursor-pointer"
              >
                Restart
              </button>
            </div>
          )}

          {!raceActive && ch.id && (
            <div className="bg-[#26211E] text-[#FFF9F0] border-2 border-[#EC6D2C] rounded-xl px-4 py-1.5 shadow-[0_3px_0_#26211E] flex items-center gap-3 text-xs font-extrabold max-w-md">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] text-[#EC6D2C]">
                  <span>{ch.title}</span>
                  <span>·</span>
                  <span>{ch.progressText}</span>
                  {ch.timerSec !== null && (
                    <span className="text-[#E65448] tabular-nums">
                      · {ch.timerSec.toFixed(1)}s
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-[#FFF9F0] truncate">
                  {ch.feedbackText || ch.objective}
                </div>
              </div>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onRestartChallenge();
                }}
                title="Restart Challenge"
                className="px-2 py-1 rounded-lg bg-[#EC6D2C] text-[#FFF9F0] text-[10px] font-extrabold hover:bg-[#CC5318] cursor-pointer shrink-0"
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
                className="p-1 rounded-lg bg-[#3F3834] text-[#FFF9F0] hover:bg-[#E65448] cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {!raceActive && !ch.id && objectiveLandmark && (
            <div className="bg-[#FFF9F0]/95 text-[#26211E] border-2 border-[#26211E] rounded-xl px-3.5 py-1.5 shadow-[0_3px_0_#26211E] flex items-center gap-2 text-xs font-extrabold">
              <Crosshair className="w-3.5 h-3.5 text-[#E65448]" />
              <span>OBJECTIVE: {objectiveLandmark.title}</span>
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
            className="w-11 h-11 sm:w-auto sm:h-11 sm:px-3 rounded-xl bg-[#FFF9F0]/95 border-2 border-[#26211E] shadow-[0_3px_0_#26211E] flex items-center justify-center gap-1.5 text-xs font-extrabold text-[#26211E] hover:bg-[#F5E9D4] active:translate-y-0.5 cursor-pointer"
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
            className="hidden sm:flex h-11 px-3 rounded-xl bg-[#FFF9F0]/95 border-2 border-[#26211E] shadow-[0_3px_0_#26211E] items-center gap-1.5 text-xs font-extrabold text-[#26211E] hover:bg-[#F5E9D4] active:translate-y-0.5 cursor-pointer"
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
            className="hidden md:flex w-11 h-11 rounded-xl bg-[#FFF9F0]/95 border-2 border-[#26211E] shadow-[0_3px_0_#26211E] items-center justify-center text-[#26211E] hover:bg-[#F5E9D4] active:translate-y-0.5 cursor-pointer"
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
            className={`hidden md:flex w-11 h-11 rounded-xl border-2 border-[#26211E] shadow-[0_3px_0_#26211E] items-center justify-center active:translate-y-0.5 cursor-pointer ${
              hud.headlightsOn
                ? 'bg-[#FFE08A] text-[#26211E]'
                : 'bg-[#FFF9F0]/95 text-[#61564E]'
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
            className="w-11 h-11 rounded-xl bg-[#FFF9F0]/95 border-2 border-[#26211E] shadow-[0_3px_0_#26211E] flex items-center justify-center text-[#26211E] hover:bg-[#F5E9D4] active:translate-y-0.5 cursor-pointer"
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
            className="hidden sm:flex w-11 h-11 rounded-xl bg-[#FFF9F0]/95 border-2 border-[#26211E] shadow-[0_3px_0_#26211E] items-center justify-center text-[#26211E] hover:bg-[#F5E9D4] active:translate-y-0.5 cursor-pointer"
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
            className="w-11 h-11 rounded-xl bg-[#26211E] border-2 border-[#26211E] shadow-[0_3px_0_#61564E] flex items-center justify-center text-[#FFF9F0] hover:bg-[#3A332F] active:translate-y-0.5 cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Row: Instrument Speedometer Cluster + Interaction CTA + Minimap */}
      <div
        className={`flex items-end justify-between gap-4 ${
          touchControlsVisible ? 'pb-[114px] sm:pb-28' : 'pb-0'
        }`}
      >
        {/* Bottom-Left: Tactile Speedometer & Radial Gauge */}
        <div className="bg-[#FFF9F0]/95 border-2 border-[#26211E] rounded-2xl px-3 py-2 sm:px-4 sm:py-3 shadow-[0_4px_0_#26211E] min-w-[132px] sm:min-w-[188px]">
          <div className="flex items-center justify-between gap-3">
            <div>
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

            {/* Radial speed arc gauge SVG */}
            <svg viewBox="0 0 88 48" className="w-13 h-7 shrink-0 hidden sm:block" aria-hidden="true">
              <path
                d="M 8 42 A 36 36 0 0 1 80 42"
                fill="none"
                stroke="#C9B393"
                strokeWidth="7.5"
                strokeLinecap="round"
              />
              <path
                d="M 8 42 A 36 36 0 0 1 80 42"
                fill="none"
                stroke={hud.isBoosting ? '#E65448' : '#EC6D2C'}
                strokeWidth="7.5"
                strokeLinecap="round"
                strokeDasharray={arcLen}
                strokeDashoffset={arcOffset}
              />
              <circle
                cx={44 - Math.cos(speedRatio * Math.PI) * 36}
                cy={42 - Math.sin(speedRatio * Math.PI) * 36}
                r="4.5"
                fill="#26211E"
              />
            </svg>
          </div>

          <div className="mt-1.5 sm:mt-2 flex items-center justify-between text-[10px] sm:text-[11px] font-extrabold text-[#61564E]">
            <span>
              {hud.isDrifting ? (
                <span className="text-[#E65448]">DRIFTING</span>
              ) : (
                'NITRO BOOST'
              )}
            </span>
            <span className="tabular-nums">{hud.boostCharge}%</span>
          </div>
          <div className="mt-1 w-full h-2 rounded-full bg-[#F5E9D4] overflow-hidden border border-[#C9B393]">
            <div
              className={`h-full transition-all duration-100 ${
                hud.isBoosting ? 'bg-[#E65448]' : 'bg-[#21968B]'
              }`}
              style={{ width: `${hud.boostCharge}%` }}
            />
          </div>
        </div>

        {/* Bottom-Center: Proximity Interaction Prompt & Quiet Hints */}
        <div className="flex flex-col items-center gap-2">
          {hud.nearestLandmark && !touchControlsVisible && (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onInteract(hud.nearestLandmark!);
              }}
              className="pointer-events-auto px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-[#EC6D2C] text-[#FFF9F0] border-2 border-[#26211E] shadow-[0_4px_0_#26211E] text-xs sm:text-sm font-extrabold hover:bg-[#CC5318] active:translate-y-0.5 cursor-pointer whitespace-nowrap"
            >
              <span className="sm:hidden">Open · {hud.nearestLandmark.title}</span>
              <span className="hidden sm:inline">
                Press ENTER · {hud.nearestLandmark.title}
              </span>
            </button>
          )}

          <div className="hidden lg:block bg-[#26211E]/90 text-[#FFF9F0] px-3.5 py-1.5 rounded-lg text-xs font-semibold">
            WASD Drive · Drag Rotate · Scroll Zoom · Shift Boost · Space Jump · B Brake · M Map
          </div>
        </div>

        {/* Bottom-Right: Corner Minimap (hidden when on-screen TouchControls occupy corners) */}
        {!touchControlsVisible && (
          <MinimapHUD
            playerX={hud.playerX}
            playerZ={hud.playerZ}
            headingRad={hud.headingRad}
            discoveredIds={discoveredIds}
            objectiveId={objectiveId}
            onOpenMap={onOpenMap}
          />
        )}
      </div>
    </div>
  );
};
