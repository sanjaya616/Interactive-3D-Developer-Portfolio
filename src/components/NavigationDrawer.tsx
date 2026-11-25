import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, Cloud, Compass, LogIn, LogOut, ShieldCheck, X } from 'lucide-react';
import { NAVIGATION_ROUTES } from '../data/portfolioData';
import { useAppState } from '../state/AppStateContext';

export const NavigationDrawer: React.FC = () => {
  const {
    drawerOpen,
    setDrawerOpen,
    authUser,
    authBusy,
    authError,
    cloudSyncStatus,
    playerDisplayName,
    updatePlayerDisplayName,
    signInGoogle,
    signOutAccount,
  } = useAppState();
  const navigate = useNavigate();
  const location = useLocation();
  const [draftName, setDraftName] = useState(playerDisplayName);
  const [nameSaved, setNameSaved] = useState(false);

  useEffect(() => {
    setDraftName(playerDisplayName);
  }, [playerDisplayName]);

  if (!drawerOpen) return null;

  const groups = ['World', 'Portfolio', 'Arcade', 'Guide', 'Community'];

  const handleGo = (path: string) => {
    setDrawerOpen(false);
    navigate(path);
  };

  const handleNameSave = (e: React.FormEvent) => {
    e.preventDefault();
    updatePlayerDisplayName(draftName);
    setNameSaved(true);
    window.setTimeout(() => setNameSaved(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-start bg-[#26211E]/45">
      <div
        className="w-full max-w-sm h-full bg-[#FFF9F0] border-r-2 border-[#26211E] shadow-2xl flex flex-col justify-between overflow-y-auto p-6"
        role="dialog"
        aria-label="Portfolio Navigation"
      >
        <div>
          <div className="flex items-center justify-between pb-4 border-b ui-divider">
            <div>
              <span className="font-display text-3xl font-bold text-[#26211E]">
                SANJAYA&apos;S WORLD
              </span>
              <p className="text-xs font-semibold text-[#61564E]">
                Switch between 3D exploration &amp; readable pages
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation menu"
              className="ui-btn ui-btn-secondary w-10 h-10 p-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Account & Cloud Save Card */}
          <div className="mt-4 p-3.5 ui-card-sand">
            <div className="flex items-center justify-between gap-2">
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
                  <div className="text-[11px] font-extrabold tracking-wider text-[#26211E] truncate flex items-center gap-1">
                    <span>{authUser ? playerDisplayName : 'GUEST EXPLORER'}</span>
                    {authUser?.isAdmin && (
                      <ShieldCheck className="w-3.5 h-3.5 text-[#EC6D2C] shrink-0" aria-label="Admin" />
                    )}
                  </div>
                  <div className="text-[11px] font-semibold text-[#61564E]">
                    {authUser
                      ? cloudSyncStatus === 'syncing'
                        ? 'Syncing cloud save...'
                        : cloudSyncStatus === 'error'
                          ? 'Cloud sync retrying'
                          : 'Cloud save active'
                      : 'Playing locally (no account required)'}
                  </div>
                </div>
              </div>

              {authUser ? (
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={() => void signOutAccount()}
                  className="ui-btn ui-btn-outline px-2.5 py-1.5 text-[11px] shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={() => void signInGoogle()}
                  className="ui-btn ui-btn-accent px-2.5 py-1.5 text-[11px] shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{authBusy ? '...' : 'Google'}</span>
                </button>
              )}
            </div>

            {authUser && (
              <form onSubmit={handleNameSave} className="mt-2.5 flex items-center gap-1.5">
                <label htmlFor="drawer-player-name" className="sr-only">
                  Player Display Name
                </label>
                <input
                  id="drawer-player-name"
                  type="text"
                  maxLength={24}
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Display name"
                  className="ui-input py-1.5 px-2.5 text-xs"
                />
                <button
                  type="submit"
                  aria-label="Save display name"
                  className="ui-btn ui-btn-dark px-2.5 py-1.5 text-[11px] shrink-0"
                >
                  {nameSaved ? <Check className="w-3 h-3" /> : null}
                  <span>{nameSaved ? 'Saved' : 'Save'}</span>
                </button>
              </form>
            )}

            {authError && (
              <p className="mt-1.5 text-[11px] font-extrabold text-[#E65448]">{authError}</p>
            )}
          </div>

          {location.pathname !== '/' && (
            <button
              type="button"
              onClick={() => handleGo('/')}
              className="mt-4 w-full ui-btn ui-btn-primary px-4 py-3 text-sm"
            >
              <Compass className="w-4 h-4" />
              <span>Return to 3D World</span>
            </button>
          )}

          <nav className="mt-5 space-y-5" aria-label="All routes">
            {groups.map((grp) => {
              const items = NAVIGATION_ROUTES.filter((r) => r.group === grp);
              return (
                <div key={grp}>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#61564E] mb-1.5 px-1">
                    {grp}
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {items.map((item) => {
                      const active = location.pathname === item.path;
                      return (
                        <button
                          key={item.path}
                          type="button"
                          onClick={() => handleGo(item.path)}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer flex items-center justify-between ${
                            active
                              ? 'bg-[#26211E] text-[#FFF9F0]'
                              : 'text-[#26211E] hover:bg-[#F5E9D4]'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {active && (
                              <span className="w-2 h-2 rounded-full bg-[#EC6D2C] shrink-0" aria-hidden="true" />
                            )}
                            <span>{item.label}</span>
                          </span>
                          <span className={`text-xs ${active ? 'text-[#E6D3B5]' : 'text-[#61564E]/80'}`}>
                            {item.path}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="pt-5 mt-6 border-t ui-divider text-xs font-semibold text-[#61564E]">
          Tip: Drive up to any building in the 3D world and press Enter to jump right to its page.
        </div>
      </div>

      {/* Click backdrop to close */}
      <button
        type="button"
        aria-label="Close backdrop"
        className="flex-1 cursor-default"
        onClick={() => setDrawerOpen(false)}
      />
    </div>
  );
};
