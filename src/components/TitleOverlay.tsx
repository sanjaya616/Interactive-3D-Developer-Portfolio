import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Cloud, Compass, LogIn, LogOut, Menu, Play, Volume2, VolumeX } from 'lucide-react';
import { useAppState } from '../state/AppStateContext';

interface TitleOverlayProps {
  onStart: () => void;
  onOpenMenu: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  onStart,
  onOpenMenu,
  audioEnabled,
  onToggleAudio,
}) => {
  const { authUser, authBusy, playerDisplayName, cloudSyncStatus, signInGoogle, signOutAccount } =
    useAppState();

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-4 sm:p-8 overflow-y-auto">
      {/* Top Row: Minimal Corner Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={onOpenMenu}
          className="pointer-events-auto inline-flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-[#FFF9F0]/95 border-2 border-[#26211E] text-[#26211E] text-xs sm:text-sm font-extrabold shadow-[0_3px_0_#26211E] hover:bg-[#F5E9D4] active:translate-y-0.5 transition-all cursor-pointer"
        >
          <Menu className="w-4 h-4 text-[#EC6D2C]" />
          <span>Portfolio Pages</span>
        </button>

        <div className="flex items-center gap-2 pointer-events-auto">
          {authUser ? (
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FFF9F0]/95 border-2 border-[#26211E] text-[#26211E] text-xs font-extrabold shadow-[0_3px_0_#26211E]">
              <Cloud
                className={`w-3.5 h-3.5 shrink-0 ${
                  cloudSyncStatus === 'error' ? 'text-[#E65448]' : 'text-[#21968B]'
                }`}
              />
              <span className="max-w-[110px] truncate">{playerDisplayName}</span>
              <button
                type="button"
                disabled={authBusy}
                onClick={() => void signOutAccount()}
                aria-label="Sign out"
                title="Sign out (keeps local save)"
                className="p-1 rounded-md bg-[#F5E9D4] hover:bg-[#E6D3B5] cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={authBusy}
              onClick={() => void signInGoogle()}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2.5 rounded-xl bg-[#FFF9F0]/95 border-2 border-[#26211E] text-[#26211E] text-xs sm:text-sm font-extrabold shadow-[0_3px_0_#26211E] hover:bg-[#F5E9D4] active:translate-y-0.5 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-[#21968B]" />
              <span>{authBusy ? 'Signing in...' : 'Google Sign In'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleAudio}
            aria-label={audioEnabled ? 'Mute audio' : 'Enable audio'}
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-[#FFF9F0]/95 border-2 border-[#26211E] text-[#26211E] text-xs sm:text-sm font-extrabold shadow-[0_3px_0_#26211E] hover:bg-[#F5E9D4] active:translate-y-0.5 transition-all cursor-pointer"
          >
            {audioEnabled ? (
              <Volume2 className="w-4 h-4 text-[#21968B]" />
            ) : (
              <VolumeX className="w-4 h-4 text-[#61564E]" />
            )}
            <span>{audioEnabled ? 'Sound On' : 'Sound Off'}</span>
          </button>
        </div>
      </div>

      {/* Left-Third Hero Card leaving wide negative space for the 3D live camera orbit */}
      <div className="my-auto max-w-[430px] pointer-events-auto bg-[#FFF9F0]/96 border-2 border-[#26211E] rounded-2xl p-6 sm:p-8 shadow-[0_8px_0_#26211E]">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#EC6D2C] border-2 border-[#26211E] flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5 text-[#FFF9F0]" />
          </div>
          <div>
            <div className="font-display text-2xl sm:text-3xl font-bold text-[#21968B] leading-none">
              INTERACTIVE 3D PORTFOLIO
            </div>
            <div className="text-[11px] font-bold text-[#61564E]">
              Anuradhapura, Sri Lanka · NIBM Software Engineering
            </div>
          </div>
        </div>

        <h1 className="font-display text-6xl sm:text-7xl font-bold leading-[0.94] text-[#26211E] mt-2">
          SANJAYA&apos;S WORLD
        </h1>
        <p className="mt-3 text-sm sm:text-base font-semibold text-[#61564E] leading-relaxed">
          Explore the portfolio of <strong className="text-[#26211E]">Sanjaya Lakshan</strong> behind the wheel—9 landmarks, 11 projects, interactive circuits, and readable pages.
        </p>

        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onStart}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#EC6D2C] text-[#FFF9F0] border-2 border-[#26211E] text-sm sm:text-base font-extrabold shadow-[0_4px_0_#26211E] hover:bg-[#CC5318] active:translate-y-0.5 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Exploring</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <Link
              to="/classic"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#21968B] text-[#FFF9F0] border-2 border-[#26211E] text-xs sm:text-sm font-extrabold shadow-[0_3px_0_#26211E] hover:brightness-105 transition-all"
            >
              <BookOpen className="w-4 h-4" />
              <span>Classic Mode</span>
            </Link>

            <button
              type="button"
              onClick={onOpenMenu}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#F5E9D4] text-[#26211E] border-2 border-[#26211E] text-xs sm:text-sm font-extrabold shadow-[0_3px_0_#26211E] hover:bg-[#E6D3B5] transition-colors cursor-pointer"
            >
              <span>All Pages</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Single Control Strip */}
      <div className="flex justify-center">
        <div className="bg-[#26211E]/92 text-[#FFF9F0] px-4 py-2 rounded-xl text-[11px] sm:text-xs font-semibold tracking-wide text-center">
          WASD / Touch / Gamepad Drive · Drag Rotate · Scroll Zoom · Shift Boost · Space Jump · Enter Open
        </div>
      </div>
    </div>
  );
};
