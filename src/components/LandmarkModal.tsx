import React from 'react';
import {
  ArrowRight,
  Bug,
  CheckCircle2,
  Compass,
  Crosshair,
  Database,
  Flag,
  KeyRound,
  Lightbulb,
  Package,
  Timer,
  X,
} from 'lucide-react';
import { DEVELOPER_PROFILE, PORTFOLIO_PROJECTS } from '../data/portfolioData';
import type { ActiveChallengeId, WorldLandmark } from '../types/portfolio';
import { ProfileAvatar } from './ProfileAvatar';

interface LandmarkModalProps {
  landmark: WorldLandmark | null;
  objectiveId: string | null;
  completedChallenges: string[];
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
  bestLapSeconds,
  lastLapSeconds,
  onSetObjective,
  onStartChallenge,
  onStartRace,
  onClose,
  onOpenPage,
}) => {
  if (!landmark) return null;

  const isObjective = objectiveId === landmark.id;
  const challengeId =
    landmark.challengeType && landmark.challengeType !== 'race' ? landmark.challengeType : null;
  const isDone = challengeId ? completedChallenges.includes(challengeId) : false;

  const launchChallenge = (id: Exclude<ActiveChallengeId, null>) => {
    onStartChallenge(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#26211E]/55 p-3 sm:p-5 overflow-y-auto">
      <div
        className="animate-modal-pop w-full max-w-xl max-h-[90dvh] overflow-y-auto bg-[#FFF9F0] border-2 border-[#26211E] rounded-2xl p-5 sm:p-6 shadow-[0_8px_0_#26211E] my-auto"
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
            className="w-9 h-9 rounded-xl border-2 border-[#26211E] bg-[#F5E9D4] flex items-center justify-center hover:bg-[#E6D3B5] cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Character Biography Card inside THE STUDIO */}
        {landmark.id === 'studio' && (
          <div className="mt-4 p-4 rounded-xl bg-[#F5E9D4]/75 border border-[#D9C3A3] flex items-center gap-4">
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

        {/* Featured Exhibits inside PROJECT PAVILION */}
        {landmark.id === 'projects' && (
          <div className="mt-4 p-4 rounded-xl bg-[#F5E9D4]/75 border border-[#D9C3A3]">
            <div className="text-xs font-extrabold text-[#26211E] mb-2">
              FEATURED PAVILION EXHIBITS ({PORTFOLIO_PROJECTS.length} TOTAL)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PORTFOLIO_PROJECTS.slice(0, 4).map((proj) => (
                <button
                  key={proj.slug}
                  type="button"
                  onClick={() => onOpenPage(`/projects/${proj.slug}`)}
                  className="text-left p-2.5 rounded-xl bg-[#FFF9F0] border border-[#D9C3A3] hover:border-[#26211E] hover:bg-[#F5E9D4] transition-colors duration-150 cursor-pointer"
                >
                  <div className="text-xs font-extrabold text-[#26211E] truncate">
                    {proj.number}. {proj.title}
                  </div>
                  <div className="text-[11px] font-bold text-[#61564E] truncate">
                    {proj.category} · {proj.status}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="mt-3.5 text-sm sm:text-base font-semibold text-[#61564E] leading-relaxed">
          {landmark.summary}
        </p>

        {/* Interactive In-World Challenge Launchers */}
        {landmark.challengeType === 'delivery' && (
          <div className="mt-4 p-4 rounded-xl bg-[#F5E9D4]/75 border border-[#D9C3A3] flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#26211E]">
                <Package className="w-4 h-4 text-[#E69F38]" />
                <span>3-STOP EXPRESS DELIVERY MISSION</span>
                {isDone && <CheckCircle2 className="w-4 h-4 text-[#5E915E]" />}
              </div>
              <p className="text-xs font-semibold text-[#61564E] mt-1">
                Deliver parcels across The Studio → The Workshop → Signal House in sequence.
              </p>
            </div>
            <button
              type="button"
              onClick={() => launchChallenge('delivery')}
              className="px-3.5 py-2 rounded-xl bg-[#21968B] text-[#FFF9F0] border-2 border-[#26211E] text-xs font-extrabold hover:opacity-95 transition-opacity cursor-pointer shrink-0"
            >
              {isDone ? 'Replay Run' : 'Start Delivery'}
            </button>
          </div>
        )}

        {landmark.challengeType === 'sql' && (
          <div className="mt-4 p-4 rounded-xl bg-[#F5E9D4]/75 border border-[#D9C3A3] flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#26211E]">
                <Database className="w-4 h-4 text-[#3E7B9E]" />
                <span>QUERY VALLEY · 3D SQL CHECKPOINT CIRCUIT</span>
                {isDone && <CheckCircle2 className="w-4 h-4 text-[#5E915E]" />}
              </div>
              <p className="text-xs font-semibold text-[#61564E] mt-1">
                Drive through the 4 glowing valley gates in strict relational order: SELECT → FROM → JOIN → WHERE.
              </p>
            </div>
            <button
              type="button"
              onClick={() => launchChallenge('sql')}
              className="px-3.5 py-2 rounded-xl bg-[#3E7B9E] text-[#FFF9F0] border-2 border-[#26211E] text-xs font-extrabold hover:opacity-95 transition-opacity cursor-pointer shrink-0"
            >
              {isDone ? 'Replay Circuit' : 'Start SQL Run'}
            </button>
          </div>
        )}

        {landmark.challengeType === 'rfid' && (
          <div className="mt-4 p-4 rounded-xl bg-[#F5E9D4]/75 border border-[#D9C3A3] flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#26211E]">
                <KeyRound className="w-4 h-4 text-[#E65448]" />
                <span>SIGNAL WORKSHOP · RFID CARD &amp; GATE MISSION</span>
                {isDone && <CheckCircle2 className="w-4 h-4 text-[#5E915E]" />}
              </div>
              <p className="text-xs font-semibold text-[#61564E] mt-1">
                Collect the glowing RFID keycard nearby, scan it at the yard pad to raise the barrier arm, and drive through.
              </p>
            </div>
            <button
              type="button"
              onClick={() => launchChallenge('rfid')}
              className="px-3.5 py-2 rounded-xl bg-[#E65448] text-[#FFF9F0] border-2 border-[#26211E] text-xs font-extrabold hover:opacity-95 transition-opacity cursor-pointer shrink-0"
            >
              {isDone ? 'Replay Mission' : 'Start Security Run'}
            </button>
          </div>
        )}

        {landmark.challengeType === 'bughunt' && (
          <div className="mt-4 p-4 rounded-xl bg-[#F5E9D4]/75 border border-[#D9C3A3] flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#26211E]">
                <Bug className="w-4 h-4 text-[#E65448]" />
                <span>THE WORKSHOP · BUG HUNT CHALLENGE</span>
                {isDone && <CheckCircle2 className="w-4 h-4 text-[#5E915E]" />}
              </div>
              <p className="text-xs font-semibold text-[#61564E] mt-1">
                Locate and squash all 3 red glitch targets spinning around The Workshop yard.
              </p>
            </div>
            <button
              type="button"
              onClick={() => launchChallenge('bughunt')}
              className="px-3.5 py-2 rounded-xl bg-[#21968B] text-[#FFF9F0] border-2 border-[#26211E] text-xs font-extrabold hover:opacity-95 transition-opacity cursor-pointer shrink-0"
            >
              {isDone ? 'Hunt Again' : 'Start Bug Hunt'}
            </button>
          </div>
        )}

        {landmark.challengeType === 'memory' && (
          <div className="mt-4 p-4 rounded-xl bg-[#F5E9D4]/75 border border-[#D9C3A3] flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#26211E]">
                <Lightbulb className="w-4 h-4 text-[#5E915E]" />
                <span>LOOKOUT HILL · MEMORY SEQUENCE</span>
                {isDone && <CheckCircle2 className="w-4 h-4 text-[#5E915E]" />}
              </div>
              <p className="text-xs font-semibold text-[#61564E] mt-1">
                Watch the 4 summit beacon pads illuminate, then drive across them in matching order.
              </p>
            </div>
            <button
              type="button"
              onClick={() => launchChallenge('memory')}
              className="px-3.5 py-2 rounded-xl bg-[#5E915E] text-[#FFF9F0] border-2 border-[#26211E] text-xs font-extrabold hover:opacity-95 transition-opacity cursor-pointer shrink-0"
            >
              {isDone ? 'Replay Memory' : 'Start Memory'}
            </button>
          </div>
        )}

        {landmark.challengeType === 'treasure' && (
          <div className="mt-4 p-4 rounded-xl bg-[#F5E9D4]/75 border border-[#D9C3A3] flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#26211E]">
                <Compass className="w-4 h-4 text-[#EC6D2C]" />
                <span>4-CHEST WORLD TREASURE HUNT</span>
                {isDone && <CheckCircle2 className="w-4 h-4 text-[#5E915E]" />}
              </div>
              <p className="text-xs font-semibold text-[#61564E] mt-1">
                Track down 4 hidden treasure chests across Studio, Pine Trail, Bridge Pier, and South Cove.
              </p>
            </div>
            <button
              type="button"
              onClick={() => launchChallenge('treasure')}
              className="px-3.5 py-2 rounded-xl bg-[#EC6D2C] text-[#FFF9F0] border-2 border-[#26211E] text-xs font-extrabold hover:bg-[#CC5318] transition-colors cursor-pointer shrink-0"
            >
              {isDone ? 'Replay Hunt' : 'Start Treasure Hunt'}
            </button>
          </div>
        )}

        {landmark.challengeType === 'timetrial' && (
          <div className="mt-4 p-4 rounded-xl bg-[#F5E9D4]/75 border border-[#D9C3A3] flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#26211E]">
                <Timer className="w-4 h-4 text-[#E65448]" />
                <span>45-SECOND PAVILION TIME TRIAL</span>
                {isDone && <CheckCircle2 className="w-4 h-4 text-[#5E915E]" />}
              </div>
              <p className="text-xs font-semibold text-[#61564E] mt-1">
                Clear 5 glowing ring gates around the ring road and Lagoon Bridge before time runs out.
              </p>
            </div>
            <button
              type="button"
              onClick={() => launchChallenge('timetrial')}
              className="px-3.5 py-2 rounded-xl bg-[#E65448] text-[#FFF9F0] border-2 border-[#26211E] text-xs font-extrabold hover:opacity-95 transition-opacity cursor-pointer shrink-0"
            >
              {isDone ? 'Retry Sprint' : 'Start Time Trial'}
            </button>
          </div>
        )}

        {landmark.challengeType === 'race' && (
          <div className="mt-4 p-4 rounded-xl bg-[#F5E9D4]/75 border border-[#D9C3A3] flex items-center justify-between gap-3">
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
            </div>
            <button
              type="button"
              onClick={() => {
                onStartRace();
                onClose();
              }}
              className="px-3.5 py-2 rounded-xl bg-[#CC5318] text-[#FFF9F0] border-2 border-[#26211E] text-xs font-extrabold hover:opacity-95 transition-opacity cursor-pointer shrink-0"
            >
              Start Race
            </button>
          </div>
        )}

        <ul className="mt-4 space-y-1.5 border-t border-[#E6D3B5] pt-3.5">
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
            className="px-3.5 py-2 rounded-xl bg-[#FFF9F0] border-2 border-[#26211E] text-xs font-extrabold text-[#26211E] hover:bg-[#F5E9D4] transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <Crosshair className="w-3.5 h-3.5 text-[#E65448]" />
            <span>{isObjective ? 'Clear Objective' : 'Set Objective'}</span>
          </button>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#F5E9D4] border-2 border-[#26211E] text-sm font-bold text-[#26211E] hover:bg-[#E6D3B5] transition-colors cursor-pointer"
            >
              Keep Driving
            </button>
            <button
              type="button"
              onClick={() => onOpenPage(landmark.route)}
              className="px-5 py-2 rounded-xl bg-[#EC6D2C] text-[#FFF9F0] border-2 border-[#26211E] shadow-[0_3px_0_#26211E] text-sm font-extrabold inline-flex items-center gap-2 hover:bg-[#CC5318] transition-colors cursor-pointer"
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
