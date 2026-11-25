import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, CheckCircle2, Compass, Lock, Sparkles } from 'lucide-react';
import { PortfolioLayout } from '../components/PortfolioLayout';
import {
  ACHIEVEMENTS_LIST,
  EXPLORER_REWARDS,
  PORTFOLIO_PROJECTS,
  SECRET_LOCATIONS,
  WORLD_COLLECTIBLES,
  WORLD_LANDMARKS,
} from '../data/portfolioData';
import { useAppState } from '../state/AppStateContext';
import type { CollectibleKind } from '../types/portfolio';

export const AchievementsPage: React.FC = () => {
  const {
    unlockedAchievements,
    discoveredLandmarks,
    openedProjects,
    collectedIds,
    collectedOrbs,
    collectedTokens,
    collectedFragments,
    collectedSecrets,
    discoveredSecrets,
  } = useAppState();

  const [itemFilter, setItemFilter] = useState<'all' | CollectibleKind>('all');

  const totalPoints = ACHIEVEMENTS_LIST.reduce(
    (sum, a) => (unlockedAchievements.includes(a.id) ? sum + a.points : sum),
    0,
  );
  const maxPoints = ACHIEVEMENTS_LIST.reduce((sum, a) => sum + a.points, 0);
  const overallPct = Math.round(
    (unlockedAchievements.length / ACHIEVEMENTS_LIST.length) * 100,
  );

  const unlockedList = ACHIEVEMENTS_LIST.filter((a) => unlockedAchievements.includes(a.id));
  const lockedList = ACHIEVEMENTS_LIST.filter((a) => !unlockedAchievements.includes(a.id));

  const orbTotal = WORLD_COLLECTIBLES.filter((c) => c.kind === 'orb').length;
  const tokenTotal = WORLD_COLLECTIBLES.filter((c) => c.kind === 'token').length;
  const fragTotal = WORLD_COLLECTIBLES.filter((c) => c.kind === 'fragment').length;
  const secTotal = WORLD_COLLECTIBLES.filter((c) => c.kind === 'secret').length;

  const visibleCollectibles =
    itemFilter === 'all'
      ? WORLD_COLLECTIBLES
      : WORLD_COLLECTIBLES.filter((c) => c.kind === itemFilter);

  return (
    <PortfolioLayout
      title="ACHIEVEMENTS & REWARDS"
      subtitle="Live Exploration Progress · 10 Core Achievements, Orbs, Tokens, Fragments & Secrets"
    >
      {/* Top Progress Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-[#F5E9D4] border-2 border-[#26211E] rounded-2xl p-5 shadow-[0_3px_0_#26211E]">
          <div className="text-xs font-extrabold tracking-wide text-[#61564E]">ACHIEVEMENTS</div>
          <div className="text-3xl font-extrabold tabular-nums text-[#26211E] mt-1">
            {unlockedAchievements.length} / {ACHIEVEMENTS_LIST.length}
          </div>
          <div className="mt-2 h-2.5 rounded-full bg-[#FFF9F0] border border-[#26211E] overflow-hidden">
            <div className="h-full bg-[#5E915E] transition-all duration-300" style={{ width: `${overallPct}%` }} />
          </div>
        </div>

        <div className="bg-[#F5E9D4] border-2 border-[#26211E] rounded-2xl p-5 shadow-[0_3px_0_#26211E]">
          <div className="text-xs font-extrabold tracking-wide text-[#61564E]">EXPLORER SCORE</div>
          <div className="text-3xl font-extrabold tabular-nums text-[#EC6D2C] mt-1">
            {totalPoints} / {maxPoints}
          </div>
          <div className="text-xs font-bold text-[#61564E] mt-1">Points earned</div>
        </div>

        <div className="bg-[#F5E9D4] border-2 border-[#26211E] rounded-2xl p-5 shadow-[0_3px_0_#26211E]">
          <div className="text-xs font-extrabold tracking-wide text-[#61564E]">DESTINATIONS</div>
          <div className="text-3xl font-extrabold tabular-nums text-[#21968B] mt-1">
            {discoveredLandmarks.length} / {WORLD_LANDMARKS.length}
          </div>
          <div className="text-xs font-bold text-[#61564E] mt-1">Zones visited</div>
        </div>

        <div className="bg-[#F5E9D4] border-2 border-[#26211E] rounded-2xl p-5 shadow-[0_3px_0_#26211E]">
          <div className="text-xs font-extrabold tracking-wide text-[#61564E]">PROJECTS OPENED</div>
          <div className="text-3xl font-extrabold tabular-nums text-[#E65448] mt-1">
            {openedProjects.length} / {PORTFOLIO_PROJECTS.length}
          </div>
          <div className="text-xs font-bold text-[#61564E] mt-1">Inspected builds</div>
        </div>

        <div className="bg-[#F5E9D4] border-2 border-[#26211E] rounded-2xl p-5 shadow-[0_3px_0_#26211E]">
          <div className="text-xs font-extrabold tracking-wide text-[#61564E]">SKILL ORBS &amp; ITEMS</div>
          <div className="text-3xl font-extrabold tabular-nums text-[#CC5318] mt-1">
            {collectedIds.length} / {WORLD_COLLECTIBLES.length}
          </div>
          <div className="text-[11px] font-bold text-[#61564E] mt-1">
            Orbs {collectedOrbs.length}/{orbTotal} · Secrets {discoveredSecrets.length}/{SECRET_LOCATIONS.length}
          </div>
        </div>
      </div>

      {/* Collectible Breakdown Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <div className="bg-[#FFF9F0] border-2 border-[#D9C3A3] rounded-xl p-3.5 shadow-[0_3px_0_#E6D3B5]">
          <div className="text-[11px] font-extrabold tracking-wide text-[#21968B]">SKILL ORBS</div>
          <div className="text-xl font-extrabold tabular-nums text-[#26211E]">
            {collectedOrbs.length} / {orbTotal}
          </div>
        </div>
        <div className="bg-[#FFF9F0] border-2 border-[#D9C3A3] rounded-xl p-3.5 shadow-[0_3px_0_#E6D3B5]">
          <div className="text-[11px] font-extrabold tracking-wide text-[#CC5318]">HIDDEN TOKENS</div>
          <div className="text-xl font-extrabold tabular-nums text-[#26211E]">
            {collectedTokens.length} / {tokenTotal}
          </div>
        </div>
        <div className="bg-[#FFF9F0] border-2 border-[#D9C3A3] rounded-xl p-3.5 shadow-[0_3px_0_#E6D3B5]">
          <div className="text-[11px] font-extrabold tracking-wide text-[#E65448]">FRAGMENTS</div>
          <div className="text-xl font-extrabold tabular-nums text-[#26211E]">
            {collectedFragments.length} / {fragTotal}
          </div>
        </div>
        <div className="bg-[#FFF9F0] border-2 border-[#D9C3A3] rounded-xl p-3.5 shadow-[0_3px_0_#E6D3B5]">
          <div className="text-[11px] font-extrabold tracking-wide text-[#5E915E]">SECRET RELICS</div>
          <div className="text-xl font-extrabold tabular-nums text-[#26211E]">
            {collectedSecrets.length} / {secTotal}
          </div>
        </div>
      </div>

      {/* Milestone Rewards */}
      <section className="mb-10">
        <div className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-[#EC6D2C] mb-2">
          <Award className="w-4 h-4" />
          <span>EXPLORER MILESTONE REWARDS</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {EXPLORER_REWARDS.map((reward) => {
            const earned = totalPoints >= reward.requiredScore;
            return (
              <div
                key={reward.id}
                className={`rounded-2xl p-5 border-2 transition-colors ${
                  earned
                    ? 'ui-card bg-[#FFF9F0] border-[#26211E]'
                    : 'bg-[#F5E9D4]/65 border-[#D9C3A3] opacity-85'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-extrabold">
                  <span className="text-[#61564E]">{reward.unlockRequirement}</span>
                  <span
                    className={`px-2 py-0.5 rounded-md border ${
                      earned
                        ? 'bg-[#5E915E] text-[#FFF9F0] border-[#26211E]'
                        : 'bg-[#FFF9F0] text-[#61564E] border-[#D9C3A3]'
                    }`}
                  >
                    {earned ? 'Earned' : 'Locked'}
                  </span>
                </div>
                <h2 className="font-display text-3xl font-bold text-[#26211E] mt-2">
                  {reward.title}
                </h2>
                <p className="text-xs font-semibold text-[#61564E] mt-1 leading-relaxed">
                  {reward.rewardDetail}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Collectible Checklist with Category Filter */}
      <section className="mb-10 ui-card bg-[#FFF9F0] rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-xs font-extrabold tracking-wider text-[#CC5318]">
              WORLD COLLECTIBLES · {collectedIds.length} OF {WORLD_COLLECTIBLES.length} FOUND
            </div>
            <h2 className="font-display text-4xl font-bold text-[#26211E]">
              ORBS, TOKENS, FRAGMENTS &amp; RELICS
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'orb', 'token', 'fragment', 'secret'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setItemFilter(k)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-extrabold capitalize transition-colors cursor-pointer ${
                  itemFilter === k
                    ? 'bg-[#26211E] text-[#FFF9F0] border-[#26211E]'
                    : 'bg-[#F5E9D4] text-[#26211E] border-[#D9C3A3] hover:border-[#26211E] hover:bg-[#E6D3B5]'
                }`}
              >
                {k === 'all' ? 'All' : `${k}s`}
              </button>
            ))}
            <Link
              to="/?autostart=1"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#EC6D2C] text-[#FFF9F0] border border-[#26211E] text-xs font-extrabold hover:bg-[#CC5318] transition-colors"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Hunt in 3D World</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {visibleCollectibles.map((item) => {
            const collected = collectedIds.includes(item.id);
            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border-2 flex items-center gap-2.5 transition-colors ${
                  collected
                    ? 'bg-[#F5E9D4] border-[#26211E]'
                    : 'bg-[#FFF9F0] border-[#D9C3A3] opacity-80'
                }`}
              >
                <Sparkles
                  className={`w-4 h-4 shrink-0 ${
                    collected ? 'text-[#21968B]' : 'text-[#61564E]'
                  }`}
                />
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-[#26211E] truncate">
                    {item.label}
                  </div>
                  <div className="text-[11px] font-bold text-[#61564E] capitalize">
                    {item.kind} · {collected ? 'Collected' : 'Uncollected'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Unlocked vs Locked Achievements */}
      <div className="space-y-8">
        <section>
          <h2 className="font-display text-4xl font-bold text-[#26211E] mb-3">
            UNLOCKED ACHIEVEMENTS ({unlockedList.length})
          </h2>
          {unlockedList.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#F5E9D4]/65 border-2 border-[#D9C3A3] text-sm font-semibold text-[#61564E]">
              No achievements unlocked yet. Drive in the 3D world, visit destinations, open projects, or beat challenges to earn badges.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unlockedList.map((ach) => (
                <div
                  key={ach.id}
                  className="ui-card ui-card-interactive rounded-2xl p-5 bg-[#FFF9F0] flex items-start justify-between gap-4"
                >
                  <div>
                    <div className="text-xs font-bold text-[#61564E]">
                      {ach.category} · <span className="tabular-nums">{ach.points} pts</span>
                    </div>
                    <h3 className="font-display text-3xl font-bold text-[#26211E] mt-1">
                      {ach.title}
                    </h3>
                    <p className="text-sm font-semibold text-[#61564E] mt-1">
                      {ach.description}
                    </p>
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-[#5E915E] shrink-0 mt-1" />
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-display text-4xl font-bold text-[#26211E] mb-3">
            LOCKED ACHIEVEMENTS ({lockedList.length})
          </h2>
          {lockedList.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#FFF9F0] border-2 border-[#26211E] text-sm font-extrabold text-[#5E915E]">
              Every achievement has been unlocked — COMPLETE EXPLORER achieved!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lockedList.map((ach) => (
                <div
                  key={ach.id}
                  className="rounded-2xl p-5 border-2 border-[#D9C3A3] bg-[#F5E9D4]/55 opacity-85 flex items-start justify-between gap-4"
                >
                  <div>
                    <div className="text-xs font-bold text-[#61564E]">
                      {ach.category} · <span className="tabular-nums">{ach.points} pts</span>
                    </div>
                    <h3 className="font-display text-3xl font-bold text-[#26211E] mt-1">
                      {ach.title}
                    </h3>
                    <p className="text-sm font-semibold text-[#61564E] mt-1">
                      {ach.description}
                    </p>
                  </div>
                  <Lock className="w-5 h-5 text-[#61564E] shrink-0 mt-1" />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </PortfolioLayout>
  );
};
