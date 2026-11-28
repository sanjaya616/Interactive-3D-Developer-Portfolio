import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, CheckCircle2, Clock, Compass, Lock, Paintbrush, Sparkles } from 'lucide-react';
import { PortfolioLayout } from '../components/PortfolioLayout';
import { AnimatedProgress } from '../components/ui/AnimatedProgress';
import {
  ACHIEVEMENTS_LIST,
  EXPLORER_REWARDS,
  PORTFOLIO_PROJECTS,
  SECRET_LOCATIONS,
  WORLD_COLLECTIBLES,
  WORLD_LANDMARKS,
} from '../data/portfolioData';
import { computeExplorerRank, getAllAchievementsProgress } from '../game/progression';
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
    completedChallenges,
    challengeBests,
    bestLapSeconds,
    distanceDrivenMeters,
  } = useAppState();

  const [itemFilter, setItemFilter] = useState<'all' | CollectibleKind>('all');

  const totalPoints = ACHIEVEMENTS_LIST.reduce(
    (sum, a) => (unlockedAchievements.includes(a.id) ? sum + a.points : sum),
    0,
  );
  const maxPoints = ACHIEVEMENTS_LIST.reduce((sum, a) => sum + a.points, 0);

  const progressInput = {
    unlockedAchievements,
    discoveredLandmarks,
    openedProjects,
    collectedIds,
    discoveredSecrets,
    completedChallenges,
    bestLapSeconds,
    distanceDrivenMeters,
  };
  const explorerRank = computeExplorerRank(progressInput);
  const progressItems = getAllAchievementsProgress(progressInput);

  const progressMap = new Map(progressItems.map((p) => [p.achievementId, p]));
  const unlockedList = ACHIEVEMENTS_LIST.filter(
    (a) => progressMap.get(a.id)?.status === 'unlocked',
  );
  const inProgressList = ACHIEVEMENTS_LIST.filter(
    (a) => progressMap.get(a.id)?.status === 'in-progress',
  );
  const lockedList = ACHIEVEMENTS_LIST.filter(
    (a) => progressMap.get(a.id)?.status === 'locked',
  );

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
      subtitle="Live Exploration Progress · 10 Core Achievements, Garage Skins, Orbs & Secrets"
    >
      {/* Explorer Rank Progress Banner */}
      <div className="ui-card-featured p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-extrabold tracking-wider text-[#21968B]">
            EXPLORER RANK · LEVEL {explorerRank.level}
          </div>
          <h2 className="font-display text-4xl font-bold text-[#26211E] leading-none mt-1">
            {explorerRank.rankTitle.toUpperCase()}
          </h2>
          <p className="text-xs font-semibold text-[#61564E] mt-1">
            {explorerRank.nextRankTitle
              ? `Next Rank: ${explorerRank.nextRankTitle} at ${explorerRank.nextLevelXp.toLocaleString()} XP`
              : 'Maximum Explorer Rank Achieved'}
          </p>
        </div>
        <div className="w-full sm:w-64 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-extrabold text-[#26211E] tabular-nums">
            <span>{explorerRank.xp.toLocaleString()} XP</span>
            <span>{explorerRank.pct}%</span>
          </div>
          <AnimatedProgress
            value={explorerRank.xp - explorerRank.currentLevelXp}
            max={Math.max(1, explorerRank.nextLevelXp - explorerRank.currentLevelXp)}
            color="turquoise"
            heightClass="h-2.5"
          />
        </div>
      </div>

      {/* Top Progress Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="ui-card-sand p-5">
          <div className="text-xs font-extrabold tracking-wide text-[#61564E]">ACHIEVEMENTS</div>
          <div className="text-3xl font-extrabold tabular-nums text-[#26211E] mt-1 mb-2.5">
            {unlockedAchievements.length} / {ACHIEVEMENTS_LIST.length}
          </div>
          <AnimatedProgress
            value={unlockedAchievements.length}
            max={ACHIEVEMENTS_LIST.length}
            color="sage"
          />
        </div>

        <div className="ui-card-sand p-5">
          <div className="text-xs font-extrabold tracking-wide text-[#61564E]">EXPLORER SCORE</div>
          <div className="text-3xl font-extrabold tabular-nums text-[#EC6D2C] mt-1 mb-2.5">
            {totalPoints} / {maxPoints}
          </div>
          <AnimatedProgress value={totalPoints} max={maxPoints} color="orange" />
        </div>

        <div className="ui-card-sand p-5">
          <div className="text-xs font-extrabold tracking-wide text-[#61564E]">DESTINATIONS</div>
          <div className="text-3xl font-extrabold tabular-nums text-[#21968B] mt-1 mb-2.5">
            {discoveredLandmarks.length} / {WORLD_LANDMARKS.length}
          </div>
          <AnimatedProgress
            value={discoveredLandmarks.length}
            max={WORLD_LANDMARKS.length}
            color="turquoise"
          />
        </div>

        <div className="ui-card-sand p-5">
          <div className="text-xs font-extrabold tracking-wide text-[#61564E]">PROJECTS OPENED</div>
          <div className="text-3xl font-extrabold tabular-nums text-[#E65448] mt-1 mb-2.5">
            {openedProjects.length} / {PORTFOLIO_PROJECTS.length}
          </div>
          <AnimatedProgress
            value={openedProjects.length}
            max={PORTFOLIO_PROJECTS.length}
            color="coral"
          />
        </div>

        <div className="ui-card-sand p-5">
          <div className="text-xs font-extrabold tracking-wide text-[#61564E]">COLLECTIBLES</div>
          <div className="text-3xl font-extrabold tabular-nums text-[#CC5318] mt-1 mb-2.5">
            {collectedIds.length} / {WORLD_COLLECTIBLES.length}
          </div>
          <AnimatedProgress
            value={collectedIds.length}
            max={WORLD_COLLECTIBLES.length}
            color="amber"
          />
        </div>
      </div>

      {/* Collectible Breakdown Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <div className="ui-card p-3.5">
          <div className="text-[11px] font-extrabold tracking-wide text-[#21968B]">SKILL ORBS</div>
          <div className="text-xl font-extrabold tabular-nums text-[#26211E]">
            {collectedOrbs.length} / {orbTotal}
          </div>
        </div>
        <div className="ui-card p-3.5">
          <div className="text-[11px] font-extrabold tracking-wide text-[#CC5318]">HIDDEN TOKENS</div>
          <div className="text-xl font-extrabold tabular-nums text-[#26211E]">
            {collectedTokens.length} / {tokenTotal}
          </div>
        </div>
        <div className="ui-card p-3.5">
          <div className="text-[11px] font-extrabold tracking-wide text-[#E65448]">FRAGMENTS</div>
          <div className="text-xl font-extrabold tabular-nums text-[#26211E]">
            {collectedFragments.length} / {fragTotal}
          </div>
        </div>
        <div className="ui-card p-3.5">
          <div className="text-[11px] font-extrabold tracking-wide text-[#5E915E]">
            SECRETS ({discoveredSecrets.length}/{SECRET_LOCATIONS.length})
          </div>
          <div className="text-xl font-extrabold tabular-nums text-[#26211E]">
            {collectedSecrets.length} / {secTotal}
          </div>
        </div>
      </div>

      {/* Personal Driving, Stunt & District Records */}
      <section className="mb-8">
        <div className="text-xs font-extrabold tracking-wider text-[#21968B] mb-2">
          PERSONAL CHALLENGE &amp; STUNT RECORDS
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="ui-card-sand p-3.5">
            <div className="text-[10px] font-extrabold text-[#61564E]">PADDOCK LAP PB</div>
            <div className="text-lg font-extrabold tabular-nums text-[#26211E] mt-0.5">
              {bestLapSeconds !== null ? `${bestLapSeconds.toFixed(2)}s` : '—'}
            </div>
          </div>
          <div className="ui-card-sand p-3.5">
            <div className="text-[10px] font-extrabold text-[#61564E]">BEST DRIFT</div>
            <div className="text-lg font-extrabold tabular-nums text-[#EC6D2C] mt-0.5">
              {challengeBests.bestDriftScore > 0 ? `${challengeBests.bestDriftScore.toLocaleString()} pts` : '—'}
            </div>
          </div>
          <div className="ui-card-sand p-3.5">
            <div className="text-[10px] font-extrabold text-[#61564E]">BEST STUNT</div>
            <div className="text-lg font-extrabold tabular-nums text-[#E65448] mt-0.5">
              {challengeBests.bestStuntScore > 0 ? `${challengeBests.bestStuntScore.toLocaleString()} pts` : '—'}
            </div>
          </div>
          <div className="ui-card-sand p-3.5">
            <div className="text-[10px] font-extrabold text-[#61564E]">LAGOON RUN</div>
            <div className="text-lg font-extrabold tabular-nums text-[#21968B] mt-0.5">
              {challengeBests.bestLagoonRunSeconds !== null ? `${challengeBests.bestLagoonRunSeconds.toFixed(2)}s` : '—'}
            </div>
          </div>
          <div className="ui-card-sand p-3.5">
            <div className="text-[10px] font-extrabold text-[#61564E]">SKY TRIAL</div>
            <div className="text-lg font-extrabold tabular-nums text-[#CC5318] mt-0.5">
              {challengeBests.bestDoubleJumpSeconds !== null ? `${challengeBests.bestDoubleJumpSeconds.toFixed(2)}s` : '—'}
            </div>
          </div>
          <div className="ui-card-sand p-3.5">
            <div className="text-[10px] font-extrabold text-[#61564E]">FOREST TRAIL</div>
            <div className="text-lg font-extrabold tabular-nums text-[#5E915E] mt-0.5">
              {challengeBests.bestForestTrailSeconds !== null ? `${challengeBests.bestForestTrailSeconds.toFixed(2)}s` : '—'}
            </div>
          </div>
        </div>
      </section>

      {/* Milestone Rewards */}
      <section className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-[#EC6D2C]">
            <Award className="w-4 h-4" />
            <span>EXPLORER MILESTONE REWARDS</span>
          </div>
          <Link
            to="/garage"
            className="text-xs font-extrabold text-[#21968B] hover:underline inline-flex items-center gap-1"
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>Equip Unlocked Skins in Garage</span>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {EXPLORER_REWARDS.map((reward) => {
            const earned = totalPoints >= reward.requiredScore;
            return (
              <div
                key={reward.id}
                className={earned ? 'ui-card-featured p-5' : 'ui-card-sand p-5 opacity-85'}
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

      {/* Achievement States: Unlocked, In Progress, Locked */}
      <div className="space-y-8 mb-10">
        {/* Unlocked */}
        <section>
          <div className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-[#5E915E] mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>COMPLETED BADGES</span>
          </div>
          <h2 className="font-display text-4xl font-bold text-[#26211E] mb-3">
            UNLOCKED ({unlockedList.length})
          </h2>
          {unlockedList.length === 0 ? (
            <div className="ui-card-sand p-6 text-sm font-semibold text-[#61564E]">
              No achievements unlocked yet. Drive in the 3D world, visit destinations, open projects, or beat challenges to earn badges.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unlockedList.map((ach) => {
                const prog = progressMap.get(ach.id)!;
                return (
                  <div
                    key={ach.id}
                    className="ui-card-featured border-[#5E915E]! p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold text-[#5E915E]">
                          UNLOCKED · {ach.category} · <span className="tabular-nums">{ach.points} pts</span>
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
                    <AnimatedProgress
                      value={prog.current}
                      max={prog.total}
                      color="sage"
                      heightClass="h-2"
                      label="Completed"
                      valueText={prog.progressLabel}
                    />
                    {prog.rewardLabel && (
                      <Link
                        to="/garage"
                        className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#21968B] hover:underline"
                      >
                        <Paintbrush className="w-3.5 h-3.5" />
                        <span>{prog.rewardLabel} · Equip in Garage</span>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* In Progress */}
        {inProgressList.length > 0 && (
          <section>
            <div className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-[#EC6D2C] mb-1">
              <Clock className="w-4 h-4" />
              <span>ACTIVE TRACKING</span>
            </div>
            <h2 className="font-display text-4xl font-bold text-[#26211E] mb-3">
              IN PROGRESS ({inProgressList.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inProgressList.map((ach) => {
                const prog = progressMap.get(ach.id)!;
                return (
                  <div
                    key={ach.id}
                    className="ui-card p-5 border-[#EC6D2C]/65! space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold text-[#CC5318]">
                          IN PROGRESS · {ach.category} · <span className="tabular-nums">{ach.points} pts</span>
                        </div>
                        <h3 className="font-display text-3xl font-bold text-[#26211E] mt-1">
                          {ach.title}
                        </h3>
                        <p className="text-sm font-semibold text-[#61564E] mt-1">
                          {ach.description}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#FFE08A] border border-[#CBB18D] text-[11px] font-extrabold text-[#26211E] tabular-nums shrink-0">
                        {prog.pct}%
                      </span>
                    </div>
                    <AnimatedProgress
                      value={prog.current}
                      max={prog.total}
                      color="orange"
                      heightClass="h-2"
                      label="Progress"
                      valueText={prog.progressLabel}
                    />
                    {prog.rewardLabel && (
                      <div className="text-xs font-bold text-[#61564E] flex items-center gap-1.5">
                        <Paintbrush className="w-3.5 h-3.5 text-[#EC6D2C]" />
                        <span>Reward: {prog.rewardLabel}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Locked */}
        <section>
          <div className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-[#61564E] mb-1">
            <Lock className="w-4 h-4" />
            <span>NOT YET STARTED</span>
          </div>
          <h2 className="font-display text-4xl font-bold text-[#26211E] mb-3">
            LOCKED ({lockedList.length})
          </h2>
          {lockedList.length === 0 && inProgressList.length === 0 ? (
            <div className="ui-card-featured p-6 text-sm font-extrabold text-[#5E915E]">
              Every achievement has been unlocked — COMPLETE EXPLORER achieved!
            </div>
          ) : lockedList.length === 0 ? (
            <div className="ui-card-sand p-5 text-sm font-semibold text-[#61564E]">
              All remaining achievements are already in progress above!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lockedList.map((ach) => {
                const prog = progressMap.get(ach.id)!;
                return (
                  <div
                    key={ach.id}
                    className="ui-card-sand p-5 opacity-85 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold text-[#61564E]">
                          LOCKED · {ach.category} · <span className="tabular-nums">{ach.points} pts</span>
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
                    <div className="text-[11px] font-bold text-[#61564E] flex flex-wrap items-center justify-between gap-2 pt-1 border-t ui-divider">
                      <span className="tabular-nums">{prog.progressLabel}</span>
                      {prog.rewardLabel && <span>{prog.rewardLabel}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Collectible Checklist with Category Filter */}
      <section className="ui-card p-6">
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
                aria-pressed={itemFilter === k}
                onClick={() => setItemFilter(k)}
                className="ui-filter-chip capitalize"
              >
                {k === 'all' ? 'All' : `${k}s`}
              </button>
            ))}
            <Link
              to="/?autostart=1"
              className="ui-btn ui-btn-primary px-4 py-2 text-xs"
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
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition-colors ${
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
    </PortfolioLayout>
  );
};
