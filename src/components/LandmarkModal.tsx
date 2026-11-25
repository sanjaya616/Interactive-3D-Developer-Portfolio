import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Bug,
  CheckCircle2,
  Compass,
  Crosshair,
  Database,
  Flag,
  KeyRound,
  Layers,
  Lightbulb,
  Package,
  Sparkles,
  Timer,
  X,
} from 'lucide-react';
import { DEVELOPER_PROFILE, PORTFOLIO_PROJECTS } from '../data/portfolioData';
import { getSkillCategoriesWithCounts, SKILL_ORB_LINKS } from '../game/progression';
import type { ActiveChallengeId, WorldLandmark } from '../types/portfolio';
import { ProfileAvatar } from './ProfileAvatar';

interface LandmarkModalProps {
  landmark: WorldLandmark | null;
  objectiveId: string | null;
  completedChallenges: string[];
  collectedIds?: string[];
  bestLapSeconds: number | null;
  lastLapSeconds: number | null;
  onSetObjective: (id: string | null) => void;
  onStartChallenge: (id: Exclude<ActiveChallengeId, null>) => void;
  onStartRace: () => void;
  onClose: () => void;
  onOpenPage: (route: string) => void;
}

export const LandmarkModal: React.FC<LandmarkModalProps> = ({
  landmark,
  objectiveId,
  completedChallenges,
  collectedIds = [],
  bestLapSeconds,
  lastLapSeconds,
  onSetObjective,
  onStartChallenge,
  onStartRace,
  onClose,
  onOpenPage,
}) => {
  const [selectedSlug, setSelectedSlug] = useState(PORTFOLIO_PROJECTS[0].slug);
  const [workshopTab, setWorkshopTab] = useState<'categories' | 'orbs'>('categories');

  useEffect(() => {
    if (landmark?.id === 'projects') {
      setSelectedSlug(PORTFOLIO_PROJECTS[0].slug);
    } else if (landmark?.id === 'workshop') {
      setWorkshopTab('categories');
    }
  }, [landmark?.id]);

  if (!landmark) return null;

  const isObjective = objectiveId === landmark.id;
  const challengeId =
    landmark.challengeType && landmark.challengeType !== 'race' ? landmark.challengeType : null;
  const isDone = challengeId ? completedChallenges.includes(challengeId) : false;

  const selectedProject =
    PORTFOLIO_PROJECTS.find((p) => p.slug === selectedSlug) || PORTFOLIO_PROJECTS[0];
  const skillCategories = getSkillCategoriesWithCounts();
  const orbsCollectedCount = SKILL_ORB_LINKS.filter((o) =>
    collectedIds.includes(o.orbId),
  ).length;

  const launchChallenge = (id: Exclude<ActiveChallengeId, null>) => {
    onStartChallenge(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#26211E]/55 p-3 sm:p-5 overflow-y-auto">
      <div
        className="animate-modal-pop ui-modal-panel w-full max-w-xl max-h-[90dvh] overflow-y-auto p-5 sm:p-6 my-auto"
        role="dialog"
        aria-label={landmark.title}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-extrabold tracking-wider text-[#61564E]">
              {landmark.category.toUpperCase()} · {landmark.subtitle}
            </div>
            <h2 className="font-display text-5xl font-bold text-[#26211E] leading-none mt-1">
              {landmark.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close landmark preview"
            className="ui-btn ui-btn-secondary w-9 h-9 p-0 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Character Biography Card inside THE STUDIO */}
        {landmark.id === 'studio' && (
          <div className="mt-4 p-4 ui-card-sand flex items-center gap-4">
            <ProfileAvatar size="md" />
            <div className="min-w-0">
              <div className="text-[11px] font-extrabold text-[#EC6D2C] tracking-wider">CHARACTER BIOGRAPHY CARD</div>
              <div className="text-base font-extrabold text-[#26211E]">{DEVELOPER_PROFILE.name}</div>
              <div className="text-xs font-bold text-[#61564E]">
                {DEVELOPER_PROFILE.role} · {DEVELOPER_PROFILE.institution}
              </div>
              <div className="text-xs font-semibold text-[#61564E] mt-0.5">
                {DEVELOPER_PROFILE.location} · {DEVELOPER_PROFILE.languages.join(' & ')}
              </div>
            </div>
          </div>
        )}

        {/* Interactive 11-Project Exhibition Browser inside PROJECT PAVILION */}
        {landmark.id === 'projects' && (
          <div className="mt-4 p-4 ui-card-sand space-y-3">
            <div className="flex items-center justify-between gap-2 text-xs font-extrabold text-[#26211E]">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#EC6D2C]" />
                <span>PAVILION EXHIBITION ({PORTFOLIO_PROJECTS.length} PROJECTS)</span>
              </span>
              <span className="text-[11px] font-bold text-[#61564E]">Select totem to preview</span>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {PORTFOLIO_PROJECTS.map((proj) => {
                const active = proj.slug === selectedProject.slug;
                return (
                  <button
                    key={proj.slug}
                    type="button"
                    onClick={() => setSelectedSlug(proj.slug)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold whitespace-nowrap border transition-colors cursor-pointer shrink-0 ${
                      active
                        ? 'bg-[#26211E] text-[#FFF9F0] border-[#26211E]'
                        : 'bg-[#FFF9F0] text-[#26211E] border-[#D9C3A3] hover:border-[#26211E]'
                    }`}
                  >
                    {proj.number}. {proj.title}
                  </button>
                );
              })}
            </div>

            <div className="p-3.5 rounded-xl bg-[#FFF9F0] border border-[#CBB18D] space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-extrabold">
                <span className="text-[#EC6D2C]">
                  PROJECT {selectedProject.number} · {selectedProject.category.toUpperCase()}
                </span>
                <span
                  className="px-2 py-0.5 rounded text-[#FFF9F0]"
                  style={{ backgroundColor: selectedProject.accentColor }}
                >
                  {selectedProject.status}
                </span>
              </div>
              <div className="text-sm font-extrabold text-[#26211E]">
                {selectedProject.title}
              </div>
              <p className="text-xs font-semibold text-[#61564E] leading-relaxed">
                {selectedProject.description}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-bold text-[#61564E]">
                <span className="truncate">
                  {selectedProject.technologies.slice(0, 4).join(' · ')}
                  {selectedProject.implementedFeatures.length > 0
                    ? ` · ${selectedProject.implementedFeatures.length} built`
                    : ''}
                  {selectedProject.plannedFeatures.length > 0
                    ? ` / ${selectedProject.plannedFeatures.length} planned`
                    : ''}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenPage(`/projects/${selectedProject.slug}`)}
                  className="ui-btn ui-btn-primary px-3 py-1 text-[11px] shrink-0"
                >
                  <span>Case Study</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5-Category Tech Lab & 8 Skill Orbs inside THE WORKSHOP */}
        {landmark.id === 'workshop' && (
          <div className="mt-4 p-4 ui-card-sand space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#26211E]">
                <Sparkles className="w-3.5 h-3.5 text-[#21968B]" />
                <span>WORKSHOP TECH LAB · {orbsCollectedCount}/{SKILL_ORB_LINKS.length} ORBS</span>
              </div>
              <div className="ui-segmented">
                <button
                  type="button"
                  role="tab"
                  aria-selected={workshopTab === 'categories'}
                  onClick={() => setWorkshopTab('categories')}
                  className="ui-tab py-1! px-2.5! text-[11px]!"
                >
                  5 Categories
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={workshopTab === 'orbs'}
                  onClick={() => setWorkshopTab('orbs')}
                  className="ui-tab py-1! px-2.5! text-[11px]!"
                >
                  8 Skill Orbs
                </button>
              </div>
            </div>

            {workshopTab === 'categories' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {skillCategories.map((group) => (
                  <div
                    key={group.category}
                    className="p-2.5 rounded-xl bg-[#FFF9F0] border border-[#D9C3A3]"
                  >
                    <div className="flex items-center justify-between text-xs font-extrabold text-[#26211E]">
                      <span>{group.category}</span>
                      <span className="text-[#21968B] tabular-nums">{group.skills.length}</span>
                    </div>
                    <div className="text-[11px] font-semibold text-[#61564E] mt-0.5 truncate">
                      {group.skills.slice(0, 4).map((s) => s.name).join(' · ')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                {SKILL_ORB_LINKS.map((orb) => {
                  const found = collectedIds.includes(orb.orbId);
                  return (
                    <div
                      key={orb.orbId}
                      className={`p-2 rounded-xl border text-[11px] ${
                        found
                          ? 'bg-[#FFF9F0] border-[#21968B]'
                          : 'bg-[#FFF9F0]/65 border-[#D9C3A3]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 font-extrabold text-[#26211E]">
                        <span className="truncate">{orb.techFocus}</span>
                        <span className={found ? 'text-[#5E915E]' : 'text-[#61564E]'}>
                          {found ? 'Found ✓' : 'Hidden'}
                        </span>
                      </div>
                      <div className="text-[10px] font-semibold text-[#61564E] truncate mt-0.5">
                        {found ? orb.skillNames.join(' · ') : orb.hint}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <p className="mt-3.5 text-sm sm:text-base font-semibold text-[#61564E] leading-relaxed">
          {landmark.summary}
        </p>

        {/* Interactive In-World Challenge Launchers */}
        {landmark.challengeType === 'delivery' && (
          <div className="mt-4 p-4 ui-card-sand flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#26211E]">
                <Package className="w-4 h-4 text-[#E69F38]" />
                <span>3-STOP EXPRESS DELIVERY MISSION</span>
                {isDone && <CheckCircle2 className="w-4 h-4 text-[#5E915E]" />}
              </div>
              <p className="text-xs font-semibold text-[#61564E] mt-1">
                Deliver parcels across The Studio → The Workshop → Signal House in sequence.
              </p>
              <div className="text-[11px] font-extrabold text-[#CC5318] mt-1">
                Reward: Delivery Expert Achievement + Express Amber Paint
              </div>
            </div>
            <button
              type="button"
              onClick={() => launchChallenge('delivery')}
              className="ui-btn ui-btn-accent px-3.5 py-2 text-xs shrink-0"
            >
              {isDone ? 'Replay Run' : 'Start Delivery'}
            </button>
          </div>
        )}

        {landmark.challengeType === 'sql' && (
          <div className="mt-4 p-4 ui-card-sand flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#26211E]">
                <Database className="w-4 h-4 text-[#3E7B9E]" />
                <span>QUERY VALLEY · 3D SQL CHECKPOINT CIRCUIT</span>
                {isDone && <CheckCircle2 className="w-4 h-4 text-[#5E915E]" />}
              </div>
              <p className="text-xs font-semibold text-[#61564E] mt-1">
                Drive through the 4 glowing valley gates in strict relational order: SELECT → FROM → JOIN → WHERE.
              </p>
              <div className="text-[11px] font-extrabold text-[#3E7B9E] mt-1">
                Reward: Database Master Achievement + Deep Query Blue Paint
              </div>
            </div>
            <button
              type="button"
              onClick={() => launchChallenge('sql')}
              className="ui-btn bg-[#3E7B9E] text-[#FFF9F0] border-[1.5px] border-[#26211E] shadow-[0_3px_0_#26211E] hover:opacity-95 px-3.5 py-2 text-xs shrink-0"
            >
              {isDone ? 'Replay Circuit' : 'Start SQL Run'}
            </button>
          </div>
        )}

        {landmark.challengeType === 'rfid' && (
          <div className="mt-4 p-4 ui-card-sand flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#26211E]">
                <KeyRound className="w-4 h-4 text-[#E65448]" />
                <span>SIGNAL WORKSHOP · RFID CARD &amp; GATE MISSION</span>
                {isDone && <CheckCircle2 className="w-4 h-4 text-[#5E915E]" />}
              </div>
              <p className="text-xs font-semibold text-[#61564E] mt-1">
                Collect the glowing RFID keycard nearby, scan it at the yard pad to raise the barrier arm, and drive through.
              </p>
              <div className="text-[11px] font-extrabold text-[#E65448] mt-1">
                Reward: Security Expert Achievement + Crimson Signal Paint
              </div>
            </div>
            <button
              type="button"
              onClick={() => launchChallenge('rfid')}
              className="ui-btn ui-btn-danger px-3.5 py-2 text-xs shrink-0"
            >
              {isDone ? 'Replay Mission' : 'Start Security Run'}
            </button>
          </div>
        )}

        {landmark.challengeType === 'bughunt' && (
          <div className="mt-4 p-4 ui-card-sand flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#26211E]">
                <Bug className="w-4 h-4 text-[#E65448]" />
                <span>THE WORKSHOP · BUG HUNT CHALLENGE</span>
                {isDone && <CheckCircle2 className="w-4 h-4 text-[#5E915E]" />}
              </div>
              <p className="text-xs font-semibold text-[#61564E] mt-1">
                Locate and squash all 3 red glitch targets spinning around The Workshop yard.
              </p>
              <div className="text-[11px] font-extrabold text-[#21968B] mt-1">
                Reward: Workshop Lab Challenge Badge
              </div>
            </div>
            <button
              type="button"
              onClick={() => launchChallenge('bughunt')}
              className="ui-btn ui-btn-accent px-3.5 py-2 text-xs shrink-0"
            >
              {isDone ? 'Hunt Again' : 'Start Bug Hunt'}
            </button>
          </div>
        )}

        {landmark.challengeType === 'memory' && (
          <div className="mt-4 p-4 ui-card-sand flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#26211E]">
                <Lightbulb className="w-4 h-4 text-[#5E915E]" />
                <span>LOOKOUT HILL · MEMORY SEQUENCE</span>
                {isDone && <CheckCircle2 className="w-4 h-4 text-[#5E915E]" />}
              </div>
              <p className="text-xs font-semibold text-[#61564E] mt-1">
                Watch the 4 summit beacon pads illuminate, then drive across them in matching order.
              </p>
              <div className="text-[11px] font-extrabold text-[#5E915E] mt-1">
                Reward: Lookout Summit Sequence Badge
              </div>
            </div>
            <button
              type="button"
              onClick={() => launchChallenge('memory')}
              className="ui-btn bg-[#5E915E] text-[#FFF9F0] border-[1.5px] border-[#26211E] shadow-[0_3px_0_#26211E] hover:opacity-95 px-3.5 py-2 text-xs shrink-0"
            >
              {isDone ? 'Replay Memory' : 'Start Memory'}
            </button>
          </div>
        )}

        {landmark.challengeType === 'treasure' && (
          <div className="mt-4 p-4 ui-card-sand flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#26211E]">
                <Compass className="w-4 h-4 text-[#EC6D2C]" />
                <span>4-CHEST WORLD TREASURE HUNT</span>
                {isDone && <CheckCircle2 className="w-4 h-4 text-[#5E915E]" />}
              </div>
              <p className="text-xs font-semibold text-[#61564E] mt-1">
                Track down 4 hidden treasure chests across Studio, Pine Trail, Bridge Pier, and South Cove.
              </p>
              <div className="text-[11px] font-extrabold text-[#CC5318] mt-1">
                Reward: Island Treasure Hunt Badge
              </div>
            </div>
            <button
              type="button"
              onClick={() => launchChallenge('treasure')}
              className="ui-btn ui-btn-primary px-3.5 py-2 text-xs shrink-0"
            >
              {isDone ? 'Replay Hunt' : 'Start Treasure Hunt'}
            </button>
          </div>
        )}

        {landmark.challengeType === 'timetrial' && (
          <div className="mt-4 p-4 ui-card-sand flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#26211E]">
                <Timer className="w-4 h-4 text-[#E65448]" />
                <span>45-SECOND PAVILION TIME TRIAL</span>
                {isDone && <CheckCircle2 className="w-4 h-4 text-[#5E915E]" />}
              </div>
              <p className="text-xs font-semibold text-[#61564E] mt-1">
                Clear 5 glowing ring gates around the ring road and Lagoon Bridge before time runs out.
              </p>
              <div className="text-[11px] font-extrabold text-[#E65448] mt-1">
                Reward: Pavilion Speed Sprint Badge
              </div>
            </div>
            <button
              type="button"
              onClick={() => launchChallenge('timetrial')}
              className="ui-btn ui-btn-danger px-3.5 py-2 text-xs shrink-0"
            >
              {isDone ? 'Retry Sprint' : 'Start Time Trial'}
            </button>
          </div>
        )}

        {landmark.challengeType === 'race' && (
          <div className="mt-4 p-4 ui-card-sand flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#26211E]">
                <Flag className="w-4 h-4 text-[#CC5318]" />
                <span>PADDOCK COUNTDOWN CIRCUIT RACE</span>
              </div>
              <p className="text-xs font-semibold text-[#61564E] mt-1 tabular-nums">
                {bestLapSeconds
                  ? `Best: ${bestLapSeconds.toFixed(2)}s${lastLapSeconds ? ` · Last: ${lastLapSeconds.toFixed(2)}s` : ''} · Ghost replay ready!`
                  : '3-2-1-GO countdown start · 4 ordered sector checkpoints · Ghost recording.'}
              </p>
              <div className="text-[11px] font-extrabold text-[#CC5318] mt-1">
                Reward: Race Champion Achievement + Midnight Circuit Paint
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onStartRace();
                onClose();
              }}
              className="ui-btn ui-btn-primary px-3.5 py-2 text-xs shrink-0"
            >
              Start Race
            </button>
          </div>
        )}

        <ul className="mt-4 space-y-1.5 border-t ui-divider pt-3.5">
          {landmark.highlights.map((item) => (
            <li
              key={item}
              className="text-sm font-bold text-[#26211E] flex items-center gap-2"
            >
              <span
                className="w-2 h-2 rounded-sm shrink-0"
                style={{ backgroundColor: landmark.color }}
                aria-hidden="true"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => onSetObjective(isObjective ? null : landmark.id)}
            className={`ui-btn px-3.5 py-2 text-xs ${isObjective ? 'ui-btn-danger' : 'ui-btn-outline'}`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>{isObjective ? 'Clear Objective' : 'Set Objective'}</span>
          </button>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="ui-btn ui-btn-secondary px-4 py-2 text-sm"
            >
              Keep Driving
            </button>
            <button
              type="button"
              onClick={() => onOpenPage(landmark.route)}
              className="ui-btn ui-btn-primary px-5 py-2 text-sm"
            >
              <span>Open Full Page</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
