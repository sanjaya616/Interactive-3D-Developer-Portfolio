import React, { useEffect, useState } from 'react';
import {
  Accessibility,
  BookOpen,
  Check,
  Cloud,
  CloudSun,
  Ghost,
  Lightbulb,
  LogIn,
  LogOut,
  Music,
  Play,
  RotateCcw,
  Sliders,
  Volume2,
  VolumeX,
  Wind,
} from 'lucide-react';
import { WEATHER_OPTIONS } from '../data/portfolioData';
import { useAppState } from '../state/AppStateContext';
import type { GameSettings, QualityLevel, WindMode } from '../types/portfolio';

interface PauseModalProps {
  open: boolean;
  settings: GameSettings;
  onResume: () => void;
  onRespawn: () => void;
  onExitToTitle: () => void;
  onUpdateSettings: (partial: Partial<GameSettings>) => void;
  onOpenMenu: () => void;
  onOpenClassic: () => void;
}

type PauseTab = 'audio' | 'world' | 'account';

export const PauseModal: React.FC<PauseModalProps> = ({
  open,
  settings,
  onResume,
  onRespawn,
  onExitToTitle,
  onUpdateSettings,
  onOpenMenu,
  onOpenClassic,
}) => {
  const {
    authUser,
    authBusy,
    cloudSyncStatus,
    playerDisplayName,
    updatePlayerDisplayName,
    signInGoogle,
    signOutAccount,
  } = useAppState();
  const [draftName, setDraftName] = useState(playerDisplayName);
  const [savedFlash, setSavedFlash] = useState(false);
  const [activeTab, setActiveTab] = useState<PauseTab>('world');

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

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#26211E]/55 p-3 sm:p-4 overflow-y-auto">
      <div
        className="animate-modal-pop w-full max-w-lg max-h-[90dvh] overflow-y-auto bg-[#FFF9F0] border-2 border-[#26211E] rounded-2xl p-5 sm:p-6 shadow-[0_8px_0_#26211E] my-auto"
        role="dialog"
        aria-label="Game Paused"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-[#26211E] leading-none">
              GAME PAUSED
            </h2>
            <p className="mt-1 text-xs sm:text-sm font-semibold text-[#61564E]">
              Configure audio, atmosphere, controls, or cloud profile.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-[#F5E9D4] border border-[#D9C3A3] text-[11px] font-extrabold text-[#26211E] shrink-0">
            ESC
          </span>
        </div>

        {/* Organized 3-Tab Switcher */}
        <div
          role="tablist"
          aria-label="Settings categories"
          className="mt-4 grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#F5E9D4] border border-[#D9C3A3]"
        >
          {(
            [
              { id: 'world', label: 'World & Display' },
              { id: 'audio', label: 'Audio Mixer' },
              { id: 'account', label: 'Controls & Save' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-2 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#26211E] text-[#FFF9F0]'
                  : 'text-[#61564E] hover:text-[#26211E]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: World, Weather, Quality & Visuals */}
        {activeTab === 'world' && (
          <div className="mt-4 space-y-4 p-4 rounded-xl bg-[#F5E9D4]/65 border border-[#D9C3A3]">
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
                        ? 'bg-[#EC6D2C] text-[#FFF9F0] border-[#26211E]'
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onUpdateSettings({ headlightsOn: !settings.headlightsOn })}
                className={`px-3 py-2 rounded-lg text-xs font-extrabold border flex items-center justify-center gap-1.5 cursor-pointer ${
                  settings.headlightsOn
                    ? 'bg-[#FFE08A] text-[#26211E] border-[#26211E]'
                    : 'bg-[#FFF9F0] text-[#26211E] border-[#D9C3A3]'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{settings.headlightsOn ? 'Lights On' : 'Lights Off'}</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ ghostEnabled: !settings.ghostEnabled })}
                className={`px-3 py-2 rounded-lg text-xs font-extrabold border flex items-center justify-center gap-1.5 cursor-pointer ${
                  settings.ghostEnabled
                    ? 'bg-[#26211E] text-[#FFF9F0] border-[#26211E]'
                    : 'bg-[#FFF9F0] text-[#26211E] border-[#D9C3A3]'
                }`}
              >
                <Ghost className="w-3.5 h-3.5" />
                <span>{settings.ghostEnabled ? 'Ghost On' : 'Ghost Off'}</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ reducedMotion: !settings.reducedMotion })}
                className={`px-3 py-2 rounded-lg text-xs font-extrabold border flex items-center justify-center gap-1.5 cursor-pointer ${
                  settings.reducedMotion
                    ? 'bg-[#5E915E] text-[#FFF9F0] border-[#26211E]'
                    : 'bg-[#FFF9F0] text-[#26211E] border-[#D9C3A3]'
                }`}
              >
                <Accessibility className="w-3.5 h-3.5" />
                <span>{settings.reducedMotion ? 'Reduced Motion' : 'Full Motion'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Audio & Independent Volume Controls */}
        {activeTab === 'audio' && (
          <div className="mt-4 space-y-4 p-4 rounded-xl bg-[#F5E9D4]/65 border border-[#D9C3A3]">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onUpdateSettings({ audioEnabled: !settings.audioEnabled })}
                className={`px-3 py-2.5 rounded-xl text-xs font-extrabold border flex items-center justify-center gap-1.5 cursor-pointer ${
                  settings.audioEnabled
                    ? 'bg-[#21968B] text-[#FFF9F0] border-[#26211E]'
                    : 'bg-[#FFF9F0] text-[#26211E] border-[#D9C3A3]'
                }`}
              >
                {settings.audioEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
                <span>{settings.audioEnabled ? 'Master Audio On' : 'Audio Muted'}</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ musicEnabled: !settings.musicEnabled })}
                className={`px-3 py-2.5 rounded-xl text-xs font-extrabold border flex items-center justify-center gap-1.5 cursor-pointer ${
                  settings.musicEnabled
                    ? 'bg-[#EC6D2C] text-[#FFF9F0] border-[#26211E]'
                    : 'bg-[#FFF9F0] text-[#26211E] border-[#D9C3A3]'
                }`}
              >
                <Music className="w-4 h-4" />
                <span>{settings.musicEnabled ? 'Music On' : 'Music Off'}</span>
              </button>
            </div>

            <div className="space-y-3 pt-1">
              <label className="block">
                <div className="flex items-center justify-between text-xs font-extrabold text-[#26211E] mb-1">
                  <span>SOUND FX &amp; ENGINE VOLUME</span>
                  <span className="tabular-nums text-[#61564E]">
                    {Math.round(settings.sfxVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(settings.sfxVolume * 100)}
                  aria-label="Sound effects volume"
                  onChange={(e) =>
                    onUpdateSettings({
                      sfxVolume: Number(e.target.value) / 100,
                    })
                  }
                  className="w-full accent-[#21968B] cursor-pointer"
                />
              </label>

              <label className="block">
                <div className="flex items-center justify-between text-xs font-extrabold text-[#26211E] mb-1">
                  <span>BACKGROUND MUSIC VOLUME</span>
                  <span className="tabular-nums text-[#61564E]">
                    {Math.round(settings.musicVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(settings.musicVolume * 100)}
                  aria-label="Background music volume"
                  onChange={(e) =>
                    onUpdateSettings({ musicVolume: Number(e.target.value) / 100 })
                  }
                  className="w-full accent-[#EC6D2C] cursor-pointer"
                />
              </label>
            </div>
          </div>
        )}

        {/* Tab 3: Touch Controls & Cloud Save Account */}
        {activeTab === 'account' && (
          <div className="mt-4 space-y-4 p-4 rounded-xl bg-[#F5E9D4]/65 border border-[#D9C3A3]">
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
                    className={`py-2 rounded-lg text-xs font-extrabold capitalize border cursor-pointer ${
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
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F5E9D4] border border-[#26211E] text-[11px] font-extrabold text-[#26211E] hover:bg-[#E6D3B5] cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={authBusy}
                    onClick={() => void signInGoogle()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#21968B] border border-[#26211E] text-[11px] font-extrabold text-[#FFF9F0] hover:opacity-90 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{authBusy ? 'Signing in...' : 'Google Sign In'}</span>
                  </button>
                )}
              </div>

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
                    className="flex-1 min-w-0 px-2.5 py-1 rounded-lg border border-[#26211E] bg-[#FFF9F0] text-xs font-bold text-[#26211E]"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded-lg bg-[#26211E] text-[#FFF9F0] text-[11px] font-extrabold hover:bg-[#EC6D2C] cursor-pointer inline-flex items-center gap-1"
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
            className="w-full py-3 rounded-xl bg-[#EC6D2C] text-[#FFF9F0] border-2 border-[#26211E] shadow-[0_3px_0_#26211E] text-sm font-extrabold flex items-center justify-center gap-2 hover:bg-[#CC5318] cursor-pointer"
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
              className="py-2.5 rounded-xl bg-[#F5E9D4] text-[#26211E] border-2 border-[#26211E] text-xs font-extrabold flex items-center justify-center gap-1 hover:bg-[#E6D3B5] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Respawn</span>
            </button>

            <button
              type="button"
              onClick={onOpenMenu}
              className="py-2.5 rounded-xl bg-[#F5E9D4] text-[#26211E] border-2 border-[#26211E] text-xs font-extrabold hover:bg-[#E6D3B5] cursor-pointer"
            >
              All Pages
            </button>

            <button
              type="button"
              onClick={onOpenClassic}
              className="py-2.5 rounded-xl bg-[#21968B] text-[#FFF9F0] border-2 border-[#26211E] text-xs font-extrabold flex items-center justify-center gap-1 hover:opacity-90 cursor-pointer"
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
