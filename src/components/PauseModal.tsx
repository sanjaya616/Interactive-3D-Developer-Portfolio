import React, { useEffect, useState } from 'react';
import {
  Accessibility,
  BookOpen,
  Check,
  CheckCircle2,
  Cloud,
  CloudSun,
  Crosshair,
  Flag,
  Ghost,
  Lightbulb,
  LogIn,
  LogOut,
  Music,
  Navigation,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Volume2,
  Wind,
} from 'lucide-react';
import { WEATHER_OPTIONS } from '../data/portfolioData';
import { buildMissionJournal, type MissionSectionId } from '../game/progression';
import { useAppState } from '../state/AppStateContext';
import type {
  ActiveChallengeHud,
  GameSettings,
  QualityLevel,
  WindMode,
} from '../types/portfolio';
import { AnimatedProgress } from './ui/AnimatedProgress';
import { SettingsSlider } from './ui/SettingsSlider';
import { ToggleSwitch } from './ui/ToggleSwitch';

interface PauseModalProps {
  open: boolean;
  settings: GameSettings;
  activeChallenge?: ActiveChallengeHud;
  discoveredIds?: string[];
  collectedIds?: string[];
  discoveredSecrets?: string[];
  openedProjects?: string[];
  completedChallenges?: string[];
  bestLapSeconds?: number | null;
  tourVisitedStops?: string[];
  onResume: () => void;
  onRespawn: () => void;
  onExitToTitle: () => void;
  onUpdateSettings: (partial: Partial<GameSettings>) => void;
  onOpenMenu: () => void;
  onOpenClassic: () => void;
  onSetObjective?: (landmarkId: string) => void;
  onWarpToLandmark?: (landmarkId: string) => void;
  onRestartChallenge?: () => void;
  onCancelChallenge?: () => void;
}

type PauseTab = 'world' | 'audio' | 'missions' | 'account';
type JournalFilter = 'all' | MissionSectionId;

export const PauseModal: React.FC<PauseModalProps> = ({
  open,
  settings,
  activeChallenge,
  discoveredIds = [],
  collectedIds = [],
  discoveredSecrets = [],
  openedProjects = [],
  completedChallenges = [],
  bestLapSeconds = null,
  tourVisitedStops = [],
  onResume,
  onRespawn,
  onExitToTitle,
  onUpdateSettings,
  onOpenMenu,
  onOpenClassic,
  onSetObjective,
  onWarpToLandmark,
  onRestartChallenge,
  onCancelChallenge,
}) => {
  const {
    authUser,
    authBusy,
    authError,
    cloudSyncStatus,
    playerDisplayName,
    updatePlayerDisplayName,
    signInGoogle,
    signOutAccount,
  } = useAppState();
  const [draftName, setDraftName] = useState(playerDisplayName);
  const [savedFlash, setSavedFlash] = useState(false);
  const [activeTab, setActiveTab] = useState<PauseTab>('world');
  const [journalFilter, setJournalFilter] = useState<JournalFilter>('all');

  useEffect(() => {
    setDraftName(playerDisplayName);
  }, [playerDisplayName]);

  if (!open) return null;

  const qualities: QualityLevel[] = ['low', 'medium', 'high'];

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    updatePlayerDisplayName(draftName);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1600);
  };

  const journalEntries = buildMissionJournal({
    unlockedAchievements: [],
    discoveredLandmarks: discoveredIds,
    openedProjects,
    collectedIds,
    discoveredSecrets,
    completedChallenges,
    bestLapSeconds,
    distanceDrivenMeters: 0,
    tourVisitedStops,
  });

  const completedEntries = journalEntries.filter((e) => e.completed);
  const visibleEntries =
    journalFilter === 'all'
      ? journalEntries
      : journalFilter === 'completed'
        ? completedEntries
        : journalEntries.filter((e) => e.section === journalFilter);

  const sectionLabels: { id: JournalFilter; label: string }[] = [
    { id: 'all', label: `All (${journalEntries.length})` },
    { id: 'exploration', label: 'Portfolio' },
    { id: 'challenges', label: 'Challenges' },
    { id: 'collectibles', label: 'Collectibles' },
    { id: 'secrets', label: 'Secrets' },
    { id: 'completed', label: `Done (${completedEntries.length})` },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#26211E]/55 p-3 sm:p-4 overflow-y-auto">
      <div
        className="animate-modal-pop ui-modal-panel w-full max-w-xl max-h-[90dvh] overflow-y-auto p-5 sm:p-6 my-auto"
        role="dialog"
        aria-label="Game Paused"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-[#26211E] leading-none">
              GAME PAUSED
            </h2>
            <p className="mt-1 text-xs sm:text-sm font-semibold text-[#61564E]">
              Configure atmosphere, audio mixer, mission journal, or cloud save.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-[#F5E9D4] border border-[#D9C3A3] text-[11px] font-extrabold text-[#26211E] shrink-0">
            ESC
          </span>
        </div>

        {/* Organized 4-Tab Switcher */}
        <div
          role="tablist"
          aria-label="Pause categories"
          className="mt-4 ui-segmented w-full grid grid-cols-2 sm:grid-cols-4"
        >
          {(
            [
              { id: 'world', label: 'World' },
              { id: 'audio', label: 'Audio' },
              { id: 'missions', label: 'Missions' },
              { id: 'account', label: 'Save & Touch' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="ui-tab text-center"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: World, Weather, Wind, Quality & Toggles */}
        {activeTab === 'world' && (
          <div className="mt-4 space-y-4 p-4 ui-card-sand">
            <div>
              <div className="text-xs font-extrabold text-[#26211E] flex items-center gap-2 mb-2">
                <CloudSun className="w-4 h-4 text-[#EC6D2C]" />
                <span>WEATHER &amp; TIME OF DAY</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {WEATHER_OPTIONS.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    title={w.desc}
                    onClick={() => onUpdateSettings({ weatherMode: w.id })}
                    className={`py-2 px-1 rounded-lg text-[11px] font-extrabold border cursor-pointer transition-colors ${
                      settings.weatherMode === w.id
                        ? 'bg-[#EC6D2C] text-[#FFF9F0] border-[#26211E] shadow-[0_2px_0_#26211E]'
                        : 'bg-[#FFF9F0] text-[#26211E] border-[#D9C3A3] hover:border-[#26211E]'
                    }`}
                  >
                    {w.label.split(' ')[1] || w.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-extrabold text-[#26211E] mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-[#21968B]" />
                  <span>WIND &amp; BREEZE</span>
                </span>
                <span className="text-[10px] font-bold text-[#61564E]">
                  {(settings.windMode ?? 'auto') === 'auto'
                    ? settings.weatherMode === 'rain'
                      ? 'Auto: Strong Breeze'
                      : settings.weatherMode === 'fog' || settings.weatherMode === 'night'
                        ? 'Auto: Calm Wind'
                        : 'Auto: Normal Breeze'
                    : 'Manual Override'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(
                  [
                    { id: 'auto', label: 'Weather Auto' },
                    { id: 'calm', label: 'Calm' },
                    { id: 'normal', label: 'Normal' },
                    { id: 'strong', label: 'Strong' },
                  ] as { id: WindMode; label: string }[]
                ).map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => onUpdateSettings({ windMode: w.id })}
                    className={`py-1.5 px-1 rounded-lg text-[11px] font-extrabold border cursor-pointer transition-colors ${
                      (settings.windMode ?? 'auto') === w.id
                        ? 'bg-[#21968B] text-[#FFF9F0] border-[#26211E]'
                        : 'bg-[#FFF9F0] text-[#26211E] border-[#D9C3A3] hover:border-[#26211E]'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-extrabold text-[#26211E] mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#EC6D2C]" />
                  <span>GRAPHICS QUALITY</span>
                </span>
                <span className="text-[10px] font-bold text-[#61564E]">
                  Low = Battery Saver
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {qualities.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => onUpdateSettings({ quality: q })}
                    className={`py-2 rounded-lg text-xs font-extrabold capitalize border cursor-pointer transition-colors ${
                      settings.quality === q
                        ? 'bg-[#26211E] text-[#FFF9F0] border-[#26211E]'
                        : 'bg-[#FFF9F0] text-[#26211E] border-[#D9C3A3] hover:border-[#26211E]'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <ToggleSwitch
                checked={settings.headlightsOn}
                label="Vehicle Headlights"
                description="Warm projection beams for sunset, rain & night driving"
                icon={<Lightbulb className="w-4 h-4 text-[#CC5318]" />}
                accent="amber"
                onChange={(next) => onUpdateSettings({ headlightsOn: next })}
              />
              <ToggleSwitch
                checked={settings.ghostEnabled}
                label="Race Ghost Replay"
                description="Compare against your best Paddock Circuit lap"
                icon={<Ghost className="w-4 h-4 text-[#26211E]" />}
                accent="turquoise"
                onChange={(next) => onUpdateSettings({ ghostEnabled: next })}
              />
              <ToggleSwitch
                checked={settings.reducedMotion}
                label="Reduced Motion"
                description="Minimizes camera bounce & UI transitions"
                icon={<Accessibility className="w-4 h-4 text-[#5E915E]" />}
                accent="sage"
                onChange={(next) => onUpdateSettings({ reducedMotion: next })}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Audio & Custom Sliders */}
        {activeTab === 'audio' && (
          <div className="mt-4 space-y-4 p-4 ui-card-sand">
            <div className="space-y-2">
              <ToggleSwitch
                checked={settings.audioEnabled}
                label="Master Game Audio"
                description="Synthesized engine hum, chimes & collision feedback"
                icon={<Volume2 className="w-4 h-4 text-[#21968B]" />}
                accent="turquoise"
                onChange={(next) => onUpdateSettings({ audioEnabled: next })}
              />
              <ToggleSwitch
                checked={settings.musicEnabled}
                label="Ambient Music Track"
                description="Adaptive acoustic island soundtrack"
                icon={<Music className="w-4 h-4 text-[#EC6D2C]" />}
                accent="orange"
                onChange={(next) => onUpdateSettings({ musicEnabled: next })}
              />
            </div>

            <div className="p-3.5 rounded-xl bg-[#FFF9F0] border border-[#D9C3A3] space-y-4">
              <SettingsSlider
                label="Sound FX & Engine Volume"
                ariaLabel="Sound effects volume"
                value={Math.round(settings.sfxVolume * 100)}
                min={0}
                max={100}
                unit="%"
                accent="turquoise"
                onChange={(val) => onUpdateSettings({ sfxVolume: val / 100 })}
              />
              <SettingsSlider
                label="Background Music Volume"
                ariaLabel="Background music volume"
                value={Math.round(settings.musicVolume * 100)}
                min={0}
                max={100}
                unit="%"
                accent="orange"
                onChange={(val) => onUpdateSettings({ musicVolume: val / 100 })}
              />
            </div>
          </div>
        )}

        {/* Tab 3: 5-Section Mission Journal */}
        {activeTab === 'missions' && (
          <div className="mt-4 space-y-3.5 p-4 ui-card-sand" data-testid="mission-journal">
            {activeChallenge?.id ? (
              <div className="p-3.5 rounded-xl bg-[#26211E] text-[#FFF9F0] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold tracking-wider text-[#EC6D2C]">
                    ACTIVE MISSION
                  </span>
                  {activeChallenge.timerSec !== null && (
                    <span className="text-xs font-extrabold tabular-nums text-[#E65448]">
                      {activeChallenge.timerSec.toFixed(1)}s left
                    </span>
                  )}
                </div>
                <div className="text-sm font-extrabold">{activeChallenge.title}</div>
                <p className="text-xs font-semibold text-[#F5E9D4]">
                  {activeChallenge.feedbackText || activeChallenge.objective}
                </p>
                {activeChallenge.progressTotal > 0 && (
                  <AnimatedProgress
                    value={activeChallenge.progressCurrent}
                    max={activeChallenge.progressTotal}
                    color="orange"
                    heightClass="h-2"
                    label="Progress"
                    valueText={activeChallenge.progressText}
                  />
                )}
                <div className="flex items-center gap-2 pt-1">
                  {onRestartChallenge && (
                    <button
                      type="button"
                      onClick={() => {
                        onRestartChallenge();
                        onResume();
                      }}
                      className="ui-btn ui-btn-primary px-3 py-1.5 text-xs"
                    >
                      Restart Mission
                    </button>
                  )}
                  {onCancelChallenge && (
                    <button
                      type="button"
                      onClick={onCancelChallenge}
                      className="ui-btn ui-btn-secondary px-3 py-1.5 text-xs"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[#FFF9F0] border border-[#D9C3A3] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Flag className="w-4 h-4 text-[#EC6D2C] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-[#26211E]">Mission Journal</div>
                    <div className="text-[11px] font-semibold text-[#61564E] truncate">
                      {completedEntries.length}/{journalEntries.length} objectives completed across the island.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5-Section Filter Strip */}
            <div className="flex flex-wrap gap-1.5">
              {sectionLabels.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  aria-pressed={journalFilter === sec.id}
                  onClick={() => setJournalFilter(sec.id)}
                  className="ui-filter-chip py-1! px-2.5! text-[11px]!"
                >
                  {sec.label}
                </button>
              ))}
            </div>

            {visibleEntries.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#FFF9F0] border border-[#D9C3A3] text-xs font-semibold text-[#61564E] text-center">
                No completed objectives in this filter yet — set a waypoint or warp to a destination below!
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {visibleEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-xl border ${
                      entry.completed
                        ? 'bg-[#FFF9F0] border-[#5E915E]'
                        : 'bg-[#FFF9F0] border-[#D9C3A3]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-extrabold tracking-wider text-[#61564E] uppercase">
                          {entry.section} · {entry.zoneLabel}
                        </div>
                        <div className="text-xs font-extrabold text-[#26211E] flex items-center gap-1.5 mt-0.5">
                          <span>{entry.title}</span>
                          {entry.completed && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#5E915E] shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] font-semibold text-[#61564E] mt-0.5 leading-snug">
                          {entry.description}
                        </p>
                      </div>
                      <span className="text-[11px] font-extrabold tabular-nums text-[#26211E] shrink-0">
                        {entry.current}/{entry.total}
                      </span>
                    </div>

                    <div className="mt-2">
                      <AnimatedProgress
                        value={entry.current}
                        max={entry.total}
                        color={entry.completed ? 'sage' : 'turquoise'}
                        heightClass="h-1.5"
                      />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                      <span className="font-bold text-[#CC5318] flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>{entry.rewardText}</span>
                      </span>

                      {entry.landmarkId && (
                        <div className="flex items-center gap-1.5">
                          {onSetObjective && (
                            <button
                              type="button"
                              onClick={() => {
                                onSetObjective(entry.landmarkId!);
                                onResume();
                              }}
                              className="px-2 py-0.5 rounded bg-[#F5E9D4] border border-[#CBB18D] hover:border-[#26211E] font-extrabold text-[#26211E] inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Crosshair className="w-2.5 h-2.5" />
                              <span>Waypoint</span>
                            </button>
                          )}
                          {onWarpToLandmark && (
                            <button
                              type="button"
                              onClick={() => {
                                onWarpToLandmark(entry.landmarkId!);
                                onResume();
                              }}
                              className="px-2 py-0.5 rounded bg-[#21968B] text-[#FFF9F0] font-extrabold inline-flex items-center gap-1 cursor-pointer hover:bg-[#1B7E74]"
                            >
                              <Navigation className="w-2.5 h-2.5" />
                              <span>Warp</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Touch Controls & Cloud Save Account */}
        {activeTab === 'account' && (
          <div className="mt-4 space-y-4 p-4 ui-card-sand">
            <div>
              <div className="text-xs font-extrabold text-[#26211E] mb-1.5">
                ON-SCREEN TOUCH CONTROLS
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['auto', 'always', 'off'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onUpdateSettings({ showTouchControls: mode })}
                    className={`py-2 rounded-lg text-xs font-extrabold capitalize border cursor-pointer transition-colors ${
                      settings.showTouchControls === mode
                        ? 'bg-[#26211E] text-[#FFF9F0] border-[#26211E]'
                        : 'bg-[#FFF9F0] text-[#26211E] border-[#D9C3A3] hover:border-[#26211E]'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FFF9F0] border border-[#D9C3A3] space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Cloud
                    className={`w-4 h-4 shrink-0 ${
                      authUser
                        ? cloudSyncStatus === 'error'
                          ? 'text-[#E65448]'
                          : 'text-[#21968B]'
                        : 'text-[#61564E]'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-[#26211E] truncate">
                      {authUser ? playerDisplayName : 'Guest Mode (Local Save)'}
                    </div>
                    <div className="text-[11px] font-semibold text-[#61564E]">
                      {authUser
                        ? cloudSyncStatus === 'syncing'
                          ? 'Syncing cloud save...'
                          : cloudSyncStatus === 'error'
                            ? 'Sync retry pending'
                            : 'Cloud progress synced'
                        : 'Optional Google sign-in for cloud save & standings'}
                    </div>
                  </div>
                </div>

                {authUser ? (
                  <button
                    type="button"
                    disabled={authBusy}
                    onClick={() => void signOutAccount()}
                    className="ui-btn ui-btn-outline px-2.5 py-1.5 text-[11px]"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={authBusy}
                    onClick={() => void signInGoogle()}
                    className="ui-btn ui-btn-accent px-3 py-1.5 text-[11px]"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{authBusy ? 'Signing in...' : 'Google Sign In'}</span>
                  </button>
                )}
              </div>

              {authError && !authUser && (
                <div
                  role="alert"
                  className="px-2.5 py-2 rounded-lg bg-[#E65448]/10 border border-[#E65448]/40 text-[11px] font-bold text-[#E65448]"
                >
                  {authError} Guest local save remains active.
                </div>
              )}

              {authUser && (
                <form onSubmit={handleSaveName} className="flex items-center gap-1.5 pt-1">
                  <label htmlFor="pause-display-name" className="text-[11px] font-extrabold text-[#61564E] shrink-0">
                    NAME:
                  </label>
                  <input
                    id="pause-display-name"
                    type="text"
                    maxLength={24}
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    className="ui-input py-1 px-2.5 text-xs"
                  />
                  <button
                    type="submit"
                    className="ui-btn ui-btn-dark px-2.5 py-1.5 text-[11px] shrink-0"
                  >
                    {savedFlash ? <Check className="w-3 h-3" /> : null}
                    <span>{savedFlash ? 'Saved' : 'Update'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Primary Resume & Quick Actions */}
        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full ui-btn ui-btn-primary py-3 text-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume Exploring</span>
          </button>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                onRespawn();
                onResume();
              }}
              className="ui-btn ui-btn-secondary py-2.5 text-xs border-[#26211E]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Respawn</span>
            </button>

            <button
              type="button"
              onClick={onOpenMenu}
              className="ui-btn ui-btn-secondary py-2.5 text-xs border-[#26211E]"
            >
              All Pages
            </button>

            <button
              type="button"
              onClick={onOpenClassic}
              className="ui-btn ui-btn-accent py-2.5 text-xs"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Classic</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onExitToTitle}
            className="w-full py-2 text-xs font-bold text-[#61564E] hover:text-[#26211E] cursor-pointer"
          >
            Return to Title Screen
          </button>
        </div>
      </div>
    </div>
  );
};
