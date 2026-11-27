import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Compass,
  Crosshair,
  Flag,
  Flame,
  Navigation,
  Sparkles,
  Timer,
  Trophy,
  Waves,
  Wrench,
  X,
} from 'lucide-react';
import { MISSION_CATALOG } from '../data/portfolioData';
import type {
  ChallengeBests,
  MissionCatalogItem,
  MissionCategoryGroup,
} from '../types/portfolio';

interface MissionSelectorModalProps {
  open: boolean;
  completedChallenges: string[];
  bestLapSeconds: number | null;
  challengeBests: ChallengeBests;
  onClose: () => void;
  onStartMission: (item: MissionCatalogItem) => void;
  onRouteMission: (item: MissionCatalogItem) => void;
}

type FilterCategory = 'ALL' | MissionCategoryGroup;

const CATEGORY_TABS: { id: FilterCategory; label: string }[] = [
  { id: 'ALL', label: 'All (15)' },
  { id: 'EXPLORATION', label: 'Exploration' },
  { id: 'RACING', label: 'Racing' },
  { id: 'STUNTS', label: 'Stunts' },
  { id: 'WATER', label: 'Water' },
  { id: 'TECHNOLOGY', label: 'Tech Labs' },
];

function getPersonalBestLabel(
  item: MissionCatalogItem,
  bestLapSeconds: number | null,
  bests: ChallengeBests,
): string | null {
  if (item.id === 'race') {
    return bestLapSeconds !== null ? `${bestLapSeconds.toFixed(2)}s PB` : null;
  }
  switch (item.challengeId) {
    case 'drift-master':
      return bests.bestDriftScore > 0 ? `${bests.bestDriftScore.toLocaleString()} pts` : null;
    case 'stunt-master':
      return bests.bestStuntScore > 0 ? `${bests.bestStuntScore.toLocaleString()} pts` : null;
    case 'precision-parking':
      return bests.bestParkingScore > 0 ? `${bests.bestParkingScore} pts` : null;
    case 'lagoon-run':
      return bests.bestLagoonRunSeconds !== null ? `${bests.bestLagoonRunSeconds.toFixed(2)}s` : null;
    case 'double-jump-trial':
      return bests.bestDoubleJumpSeconds !== null ? `${bests.bestDoubleJumpSeconds.toFixed(2)}s` : null;
    case 'forest-trail':
      return bests.bestForestTrailSeconds !== null ? `${bests.bestForestTrailSeconds.toFixed(2)}s` : null;
    default:
      return null;
  }
}

function renderCategoryIcon(cat: MissionCategoryGroup) {
  const cls = 'w-3.5 h-3.5';
  switch (cat) {
    case 'EXPLORATION':
      return <Compass className={cls} />;
    case 'RACING':
      return <Flag className={cls} />;
    case 'STUNTS':
      return <Flame className={cls} />;
    case 'WATER':
      return <Waves className={cls} />;
    case 'TECHNOLOGY':
      return <Wrench className={cls} />;
  }
}

export const MissionSelectorModal: React.FC<MissionSelectorModalProps> = ({
  open,
  completedChallenges,
  bestLapSeconds,
  challengeBests,
  onClose,
  onStartMission,
  onRouteMission,
}) => {
  const [filter, setFilter] = useState<FilterCategory>('ALL');

  const visibleMissions = useMemo(() => {
    if (filter === 'ALL') return MISSION_CATALOG;
    return MISSION_CATALOG.filter((m) => m.category === filter);
  }, [filter]);

  if (!open) return null;

  const clearedCount = MISSION_CATALOG.filter((m) => {
    const key = m.challengeId ?? m.id;
    return completedChallenges.includes(key);
  }).length;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#26211E]/55 p-2 sm:p-4 overflow-y-auto">
      <div
        data-testid="mission-selector-modal"
        role="dialog"
        aria-label="Missions & Challenges"
        className="animate-modal-pop ui-modal-panel w-full max-w-5xl max-h-[92dvh] flex flex-col overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-[#F5E9D4] border-b border-[#D9C3A3] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#FFF9F0] border border-[#CBB18D] flex items-center justify-center shrink-0">
              <Flag className="w-5 h-5 text-[#EC6D2C]" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#26211E] leading-none">
                ISLAND MISSIONS &amp; CHALLENGES
              </h2>
              <p className="text-xs font-bold text-[#61564E] mt-0.5 tabular-nums">
                {clearedCount}/{MISSION_CATALOG.length} cleared · Warp &amp; launch directly or set GPS route
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close missions modal"
            className="ui-btn ui-btn-outline w-9 h-9 p-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="px-4 sm:px-6 py-3 border-b border-[#E6D3B5] bg-[#FFF9F0] flex flex-wrap items-center gap-2 shrink-0">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={filter === tab.id}
              onClick={() => setFilter(tab.id)}
              className="ui-filter-chip text-xs"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mission Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleMissions.map((item) => {
              const key = item.challengeId ?? item.id;
              const isCleared = completedChallenges.includes(key);
              const pbLabel = getPersonalBestLabel(item, bestLapSeconds, challengeBests);

              const difficultyCls =
                item.difficulty === 'Pro'
                  ? 'bg-[#E65448]/15 text-[#C4453B] border-[#E65448]/40'
                  : item.difficulty === 'Normal'
                    ? 'bg-[#EC6D2C]/15 text-[#CC5318] border-[#EC6D2C]/40'
                    : 'bg-[#5E915E]/15 text-[#427042] border-[#5E915E]/40';

              return (
                <div
                  key={item.id}
                  data-testid={`mission-card-${item.id}`}
                  className={`p-4 rounded-2xl border-[1.5px] flex flex-col justify-between gap-3 transition-colors ${
                    isCleared
                      ? 'bg-[#F5E9D4]/75 border-[#5E915E]'
                      : 'bg-[#FFF9F0] border-[#CBB18D]'
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider text-[#21968B]">
                        {renderCategoryIcon(item.category)}
                        <span>{item.category}</span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        {pbLabel && (
                          <span className="px-2 py-0.5 rounded-md bg-[#26211E] text-[#FFE08A] text-[10px] font-extrabold tabular-nums inline-flex items-center gap-1">
                            {item.personalBestUnit === 'seconds' ? (
                              <Timer className="w-3 h-3" />
                            ) : (
                              <Trophy className="w-3 h-3" />
                            )}
                            <span>PB {pbLabel}</span>
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${difficultyCls}`}
                        >
                          {item.difficulty}
                        </span>
                        {isCleared && (
                          <CheckCircle2
                            aria-label="Completed"
                            className="w-4 h-4 text-[#5E915E]"
                          />
                        )}
                      </div>
                    </div>

                    <h3 className="font-display text-3xl font-bold text-[#26211E] leading-none mt-1.5">
                      {item.title}
                    </h3>
                    <p className="text-xs font-semibold text-[#61564E] mt-1.5 leading-relaxed">
                      {item.objective}
                    </p>

                    <div className="mt-2.5 space-y-1 text-[11px] font-bold text-[#61564E]">
                      <div>
                        <span className="text-[#26211E]">Start:</span> {item.startLocationLabel}
                      </div>
                      <div>
                        <span className="text-[#26211E]">Controls:</span> {item.controlsHint}
                      </div>
                      <div className="text-[#CC5318] flex items-center gap-1">
                        <Sparkles className="w-3 h-3 shrink-0" />
                        <span>{item.rewardSummary}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-[#E6D3B5] flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      data-testid={`mission-start-${item.id}`}
                      onClick={() => onStartMission(item)}
                      className="flex-1 ui-btn ui-btn-primary py-2 px-3 text-xs"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Warp &amp; Start</span>
                    </button>
                    <button
                      type="button"
                      data-testid={`mission-route-${item.id}`}
                      onClick={() => onRouteMission(item)}
                      className="ui-btn ui-btn-secondary py-2 px-3 text-xs border-[#26211E]"
                    >
                      <Crosshair className="w-3.5 h-3.5 text-[#21968B]" />
                      <span>GPS Route</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
