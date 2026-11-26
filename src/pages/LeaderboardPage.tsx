import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Flag, LogIn, RefreshCw, ShieldCheck, Trophy } from 'lucide-react';
import { PortfolioLayout } from '../components/PortfolioLayout';
import { useAppState } from '../state/AppStateContext';

export const LeaderboardPage: React.FC = () => {
  const {
    leaderboard,
    leaderboardLoading,
    leaderboardError,
    refreshGlobalLeaderboard,
    bestLapSeconds,
    lastLapSeconds,
    authUser,
    authBusy,
    authError,
    playerDisplayName,
    signInGoogle,
  } = useAppState();

  return (
    <PortfolioLayout
      title="GLOBAL RACING LEADERBOARD"
      subtitle="The Paddock Circuit · Server-Verified Online Best Lap Standings (Zero Sample Drivers)"
    >
      {(bestLapSeconds !== null || lastLapSeconds !== null) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="ui-card p-4">
            <div className="text-xs font-extrabold tracking-wide text-[#61564E]">YOUR PERSONAL BEST LAP</div>
            <div className="text-2xl font-extrabold text-[#EC6D2C] tabular-nums mt-0.5">
              {bestLapSeconds !== null ? `${bestLapSeconds.toFixed(2)} s` : '—'}
            </div>
          </div>
          <div className="ui-card p-4">
            <div className="text-xs font-extrabold tracking-wide text-[#61564E]">LAST COMPLETED LAP</div>
            <div className="text-2xl font-extrabold text-[#26211E] tabular-nums mt-0.5">
              {lastLapSeconds !== null ? `${lastLapSeconds.toFixed(2)} s` : '—'}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-4">
          {leaderboardError && (
            <div className="ui-card border-[#E65448]! p-4 text-sm font-bold text-[#E65448]">
              Unable to load online leaderboard: {leaderboardError}
            </div>
          )}

          {leaderboardLoading ? (
            <div className="ui-card p-8 text-center text-sm font-bold text-[#61564E]">
              Loading verified global standings...
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="ui-card-sand p-8 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FFF9F0] border border-[#D9C3A3] flex items-center justify-center text-[#EC6D2C]">
                <Flag className="w-6 h-6" />
              </div>
              <h2 className="font-display text-4xl font-bold text-[#26211E] mt-3">
                NO VERIFIED GLOBAL LAPS YET
              </h2>
              <p className="mt-2 text-sm font-semibold text-[#61564E] max-w-md mx-auto leading-relaxed">
                This online leaderboard displays only real, telemetry-verified lap times from signed-in players. Drive to <strong>THE PADDOCK</strong> in the 3D world to clock the very first official record.
              </p>
              <Link
                to="/?autostart=1"
                className="ui-btn ui-btn-primary mt-5 px-5 py-2.5 text-xs"
              >
                <Compass className="w-4 h-4" />
                <span>Race at The Paddock</span>
              </Link>
            </div>
          ) : (
            <div className="ui-card overflow-hidden">
              <div className="px-5 py-3 bg-[#F5E9D4] border-b border-[#D9C3A3] flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-[#26211E]">
                  GLOBAL STANDINGS ({leaderboard.length})
                </span>
                <button
                  type="button"
                  onClick={() => void refreshGlobalLeaderboard()}
                  className="ui-btn ui-btn-outline px-3 py-1 text-[11px]"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh Standings</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F5E9D4]/55 border-b border-[#D9C3A3] text-xs font-extrabold text-[#26211E]">
                      <th className="py-3 px-4 sm:px-5">RANK</th>
                      <th className="py-3 px-4 sm:px-5">PLAYER</th>
                      <th className="py-3 px-4 sm:px-5">VEHICLE</th>
                      <th className="py-3 px-4 sm:px-5">DATE</th>
                      <th className="py-3 px-4 sm:px-5 text-right">BEST LAP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, idx) => (
                      <tr
                        key={entry.id}
                        className={`border-b border-[#E6D3B5] last:border-0 text-sm font-bold ${
                          entry.isPlayer ? 'bg-[#FFE08A]/35' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 sm:px-5 tabular-nums font-extrabold text-[#26211E]">
                          #{idx + 1}
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 text-[#26211E]">
                          <div className="flex items-center gap-1.5">
                            <span>{entry.driver}</span>
                            {entry.isPlayer && (
                              <span className="px-1.5 py-0.5 rounded bg-[#26211E] text-[#FFF9F0] text-[10px] font-extrabold">
                                YOU
                              </span>
                            )}
                            {entry.serverVerified && (
                              <ShieldCheck
                                className="w-3.5 h-3.5 text-[#21968B] shrink-0"
                                aria-label="Server-verified lap"
                              />
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 text-[#61564E] text-xs font-bold">
                          {entry.vehicle}
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 text-[#61564E] text-xs tabular-nums">
                          {entry.recordedAt}
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 text-right tabular-nums font-extrabold text-[#EC6D2C]">
                          {entry.lapSeconds.toFixed(2)} s
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <aside className="lg:col-span-4 space-y-4">
          <div className="ui-card-featured bg-[#F5E9D4]! p-6">
            <div className="flex items-center gap-2 text-[#21968B]">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-xs font-extrabold tracking-wider">ANTI-CHEAT TELEMETRY</span>
            </div>
            <h2 className="font-display text-4xl font-bold text-[#26211E] mt-1">
              HOW GLOBAL RANKING WORKS
            </h2>
            <p className="mt-2 text-xs sm:text-sm font-semibold text-[#61564E] leading-relaxed">
              Raw client lap numbers cannot be submitted directly. When you start a race at <strong>The Paddock</strong>, the server issues a signed session token, checks all 4 ordered sector checkpoints, validates physical speed bounds, and signs your personal best lap record.
            </p>

            {authUser ? (
              <div className="ui-card mt-4 p-3.5">
                <div className="text-[11px] font-extrabold text-[#21968B]">READY TO COMPETE</div>
                <div className="text-sm font-extrabold text-[#26211E] mt-0.5">
                  Driver: {playerDisplayName}
                </div>
                <p className="text-xs font-semibold text-[#61564E] mt-1">
                  Only your fastest verified lap is kept online, preventing duplicate entries.
                </p>
              </div>
            ) : (
              <div className="ui-card mt-4 p-3.5 space-y-2.5">
                <div className="text-xs font-bold text-[#26211E]">
                  Explore &amp; race as a guest anytime, or sign in with Google to publish verified times globally.
                </div>
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={() => void signInGoogle()}
                  className="ui-btn ui-btn-accent w-full py-2.5 text-xs"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{authBusy ? 'Signing in...' : 'Sign in with Google'}</span>
                </button>
                {authError && (
                  <p role="alert" className="text-[11px] font-bold text-[#E65448]">
                    {authError}
                  </p>
                )}
              </div>
            )}

            <Link
              to="/?autostart=1"
              className="ui-btn ui-btn-primary mt-4 w-full py-2.5 text-xs"
            >
              <Trophy className="w-4 h-4" />
              <span>Enter Paddock Circuit</span>
            </Link>
          </div>
        </aside>
      </div>
    </PortfolioLayout>
  );
};
