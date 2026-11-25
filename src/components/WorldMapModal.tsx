import React, { useEffect, useState } from 'react';
import {
  Compass,
  Crosshair,
  ExternalLink,
  Flag,
  HelpCircle,
  Navigation,
  Sparkles,
  X,
} from 'lucide-react';
import {
  PADDOCK_CHECKPOINTS,
  SECRET_LOCATIONS,
  SQL_CHALLENGE_GATES,
  WORLD_COLLECTIBLES,
  WORLD_LANDMARKS,
} from '../data/portfolioData';
import type { ActiveChallengeHud, WorldLandmark } from '../types/portfolio';

interface WorldMapModalProps {
  open: boolean;
  playerX: number;
  playerZ: number;
  headingRad: number;
  discoveredIds: string[];
  collectedIds: string[];
  discoveredSecrets: string[];
  activeChallenge: ActiveChallengeHud;
  objectiveId: string | null;
  onSelectObjective: (id: string | null) => void;
  onClose: () => void;
  onDriveTo: (landmark: WorldLandmark) => void;
  onOpenRoute: (route: string) => void;
}

export const WorldMapModal: React.FC<WorldMapModalProps> = ({
  open,
  playerX,
  playerZ,
  headingRad,
  discoveredIds,
  collectedIds,
  discoveredSecrets,
  activeChallenge,
  objectiveId,
  onSelectObjective,
  onClose,
  onDriveTo,
  onOpenRoute,
}) => {
  const [highlightedId, setHighlightedId] = useState<string>(
    objectiveId || WORLD_LANDMARKS[0].id,
  );
  const [showCollectibles, setShowCollectibles] = useState(true);
  const [showCheckpoints, setShowCheckpoints] = useState(true);
  const [showSecrets, setShowSecrets] = useState(true);

  useEffect(() => {
    if (open) {
      setHighlightedId((prev) => objectiveId || prev || WORLD_LANDMARKS[0].id);
    }
  }, [open, objectiveId]);

  if (!open) return null;

  const mapHalfSpan = 102;
  const toMapPct = (val: number) =>
    Math.max(5, Math.min(95, ((val + mapHalfSpan) / (mapHalfSpan * 2)) * 100));
  const arrowDeg = (-headingRad * 180) / Math.PI;
  const selectedLandmark =
    WORLD_LANDMARKS.find((l) => l.id === highlightedId) || WORLD_LANDMARKS[0];
  const selectedVisited = discoveredIds.includes(selectedLandmark.id);
  const selectedIsObjective = objectiveId === selectedLandmark.id;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#26211E]/55 p-3 sm:p-5 overflow-y-auto">
      <div
        className="animate-modal-pop w-full max-w-5xl max-h-[90dvh] overflow-y-auto bg-[#FFF9F0] border-2 border-[#26211E] rounded-2xl shadow-[0_8px_0_#26211E] my-auto"
        role="dialog"
        aria-label="World Map"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-3.5 bg-[#F5E9D4] border-b-2 border-[#26211E]">
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-[#EC6D2C]" />
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#26211E] leading-none">
                SANJAYA&apos;S WORLD MAP
              </h2>
              <p className="text-xs font-bold text-[#61564E] mt-0.5 tabular-nums">
                {discoveredIds.length}/{WORLD_LANDMARKS.length} destinations · {collectedIds.length}/{WORLD_COLLECTIBLES.length} collectibles · {discoveredSecrets.length}/{SECRET_LOCATIONS.length} secrets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCollectibles((v) => !v)}
              className={`px-2.5 py-1 rounded-lg border border-[#26211E] text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                showCollectibles ? 'bg-[#21968B] text-[#FFF9F0]' : 'bg-[#FFF9F0] text-[#26211E]'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Items</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCheckpoints((v) => !v)}
              className={`px-2.5 py-1 rounded-lg border border-[#26211E] text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                showCheckpoints ? 'bg-[#CC5318] text-[#FFF9F0]' : 'bg-[#FFF9F0] text-[#26211E]'
              }`}
            >
              <Flag className="w-3 h-3" />
              <span>Track &amp; Gates</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSecrets((v) => !v)}
              className={`px-2.5 py-1 rounded-lg border border-[#26211E] text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                showSecrets ? 'bg-[#5E915E] text-[#FFF9F0]' : 'bg-[#FFF9F0] text-[#26211E]'
              }`}
            >
              <HelpCircle className="w-3 h-3" />
              <span>Secrets</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close map"
              className="w-9 h-9 rounded-xl border-2 border-[#26211E] bg-[#FFF9F0] flex items-center justify-center hover:bg-[#E6D3B5] cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 sm:p-6">
          {/* Left: Interactive Map Canvas + Legend */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="relative aspect-square w-full max-h-[470px] rounded-2xl bg-[#EED4AA] border-2 border-[#26211E] overflow-hidden">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-2.5 right-2.5 z-20 w-7 h-7 rounded-full bg-[#FFF9F0]/90 border border-[#26211E] flex items-center justify-center text-[11px] font-extrabold text-[#26211E] shadow-xs"
              >
                N
              </div>
              <svg
                viewBox="-102 -102 204 204"
                className="w-full h-full block pointer-events-none"
                aria-hidden="true"
              >
                <circle cx="0" cy="-72" r="21" fill="#B5C78E" opacity="0.6" />
                <circle cx="0" cy="-72" r="14" fill="#9BB573" opacity="0.55" />

                <rect x="16" y="-30" width="58" height="16" rx="5" fill="#21968B" opacity="0.82" />
                <circle cx="-18" cy="66" r="12.5" fill="#21968B" opacity="0.82" />

                <circle cx="0" cy="0" r="34" fill="none" stroke="#564D47" strokeWidth="4.4" opacity="0.65" />
                <circle cx="-66" cy="18" r="18" fill="none" stroke="#564D47" strokeWidth="3.8" opacity="0.65" />
                <circle cx="0" cy="0" r="12" fill="#FFF9F0" stroke="#EC6D2C" strokeWidth="2.2" />

                <g stroke="#564D47" strokeWidth="3.8" strokeLinecap="round" opacity="0.68">
                  <line x1="0" y1="0" x2="0" y2="-72" />
                  <line x1="0" y1="0" x2="0" y2="46" />
                  <line x1="0" y1="0" x2="-36" y2="-34" />
                  <line x1="-34" y1="-2" x2="-66" y2="18" />
                  <line x1="-34" y1="24" x2="-38" y2="48" />
                  <line x1="33" y1="14" x2="64" y2="8" />
                  <line x1="28" y1="22" x2="44" y2="48" />
                  <line x1="31" y1="4" x2="40" y2="-12" />
                  <line x1="40" y1="-32" x2="36" y2="-44" />
                  <line x1="38" y1="-44" x2="48" y2="-74" />
                </g>

                <polyline
                  points="-36,-34 -24,-56 0,-72"
                  fill="none"
                  stroke="#8B5A3C"
                  strokeWidth="2.4"
                  strokeDasharray="4 4"
                />

                <rect x="37" y="-32" width="6" height="20" rx="1.5" fill="#8B5A3C" stroke="#26211E" strokeWidth="1" />
                <rect x="-46" y="-12" width="8" height="16" rx="2" fill="#B98A5E" stroke="#26211E" strokeWidth="1" />

                {/* Track & SQL Checkpoints */}
                {showCheckpoints && (
                  <g>
                    {PADDOCK_CHECKPOINTS.map((cp, idx) => (
                      <g key={cp.id} transform={`translate(${cp.x}, ${cp.z})`}>
                        <circle r="3.4" fill="#CC5318" stroke="#FFF9F0" strokeWidth="1.2" />
                        <text x="0" y="1.3" fontSize="3.4" fontWeight="900" fill="#FFF9F0" textAnchor="middle">
                          {idx + 1}
                        </text>
                      </g>
                    ))}
                    {SQL_CHALLENGE_GATES.map((g) => (
                      <rect
                        key={g.clause}
                        x={g.x - 2.2}
                        y={g.z - 2.2}
                        width="4.4"
                        height="4.4"
                        rx="1"
                        fill="#3E7B9E"
                        stroke="#FFF9F0"
                        strokeWidth="1"
                      />
                    ))}
                  </g>
                )}

                {/* Collectible Markers */}
                {showCollectibles &&
                  WORLD_COLLECTIBLES.map((c) => {
                    const picked = collectedIds.includes(c.id);
                    const color =
                      c.kind === 'orb'
                        ? '#21968B'
                        : c.kind === 'token'
                          ? '#FFD54F'
                          : c.kind === 'fragment'
                            ? '#E65448'
                            : '#5E915E';
                    return (
                      <circle
                        key={c.id}
                        cx={c.x}
                        cy={c.z}
                        r={picked ? 1.6 : 2.6}
                        fill={color}
                        opacity={picked ? 0.35 : 0.95}
                        stroke="#26211E"
                        strokeWidth={picked ? 0.4 : 0.9}
                      />
                    );
                  })}

                {/* Secret Locations */}
                {showSecrets &&
                  SECRET_LOCATIONS.map((s) => {
                    const found = discoveredSecrets.includes(s.id);
                    return (
                      <g key={s.id} transform={`translate(${s.x}, ${s.z})`}>
                        <circle
                          r="5.2"
                          fill={found ? '#5E915E' : '#FFF9F0'}
                          fillOpacity="0.9"
                          stroke="#26211E"
                          strokeWidth="1.3"
                          strokeDasharray="2 1"
                        />
                        <text
                          x="0"
                          y="1.8"
                          fontSize="5"
                          fontWeight="900"
                          fill={found ? '#FFF9F0' : '#26211E'}
                          textAnchor="middle"
                        >
                          {found ? '★' : '?'}
                        </text>
                      </g>
                    );
                  })}

                {/* Highlight & Objective Rings */}
                {WORLD_LANDMARKS.map((lm) => {
                  const isHighlighted = lm.id === highlightedId;
                  const isObj = lm.id === objectiveId;
                  if (!isHighlighted && !isObj) return null;
                  return (
                    <g key={`ring-${lm.id}`} transform={`translate(${lm.position.x}, ${lm.position.z})`}>
                      {isHighlighted && (
                        <circle
                          r="12"
                          fill="#EC6D2C"
                          fillOpacity="0.16"
                          stroke="#26211E"
                          strokeWidth="2.2"
                        />
                      )}
                      {isObj && (
                        <circle
                          r="15"
                          fill="none"
                          stroke="#E65448"
                          strokeWidth="2.2"
                          strokeDasharray="4 3"
                        />
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Clickable 9 Destination Pins */}
              {WORLD_LANDMARKS.map((lm) => {
                const visited = discoveredIds.includes(lm.id);
                const isSelected = lm.id === highlightedId;
                const isObjective = lm.id === objectiveId;
                return (
                  <button
                    key={lm.id}
                    type="button"
                    onClick={() => setHighlightedId(lm.id)}
                    aria-label={`Highlight ${lm.title}`}
                    style={{
                      left: `${toMapPct(lm.position.x)}%`,
                      top: `${toMapPct(lm.position.z)}%`,
                      backgroundColor: lm.color,
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded-lg border-2 text-[10px] sm:text-[11px] font-extrabold text-[#FFF9F0] shadow-[0_2px_0_#26211E] transition-transform cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'scale-110 z-20 border-[#26211E] ring-2 ring-[#FFF9F0]'
                        : 'z-10 border-[#26211E] hover:scale-105'
                    }`}
                  >
                    <span>{lm.zoneLabel}</span>
                    {visited ? ' ✓' : ' ·'}
                    {isObjective ? ' ★' : ''}
                  </button>
                );
              })}

              {/* Player Position & Heading Chevron */}
              <div
                style={{
                  left: `${toMapPct(playerX)}%`,
                  top: `${toMapPct(playerZ)}%`,
                  transform: `translate(-50%, -50%) rotate(${arrowDeg}deg)`,
                }}
                className="absolute z-30 pointer-events-none"
                title="Your Vehicle Heading"
              >
                <svg width="22" height="22" viewBox="-12 -12 24 24">
                  <polygon
                    points="0,-10 7,8 0,4 -7,8"
                    fill="#26211E"
                    stroke="#FFF9F0"
                    strokeWidth="2.4"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* Map Legend + Active Challenge */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-[#F5E9D4] border border-[#E6D3B5] text-xs font-bold text-[#26211E]">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#21968B] border border-[#26211E]" />
                  <span>Orbs</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FFD54F] border border-[#26211E]" />
                  <span>Tokens</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E65448] border border-[#26211E]" />
                  <span>Fragments</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#FFF9F0] border border-[#26211E] text-[9px] flex items-center justify-center font-black">
                    ?
                  </span>
                  <span>Secret Spots</span>
                </span>
              </div>
              {activeChallenge.id && (
                <span className="text-[11px] font-extrabold text-[#EC6D2C]">
                  Active: {activeChallenge.title} ({activeChallenge.progressText})
                </span>
              )}
            </div>
          </div>

          {/* Right: Highlighted Destination Detail + Directory */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div
              data-testid="map-highlighted-card"
              className="p-4 rounded-xl bg-[#F5E9D4]/80 border border-[#D9C3A3]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] font-extrabold text-[#61564E] tracking-wider">
                    {selectedLandmark.category.toUpperCase()} · {selectedVisited ? 'VISITED' : 'UNVISITED'}
                  </div>
                  <h3 className="font-display text-3xl sm:text-4xl font-bold text-[#26211E] leading-none mt-0.5">
                    {selectedLandmark.title}
                  </h3>
                  <div className="text-xs font-bold text-[#61564E] mt-1">
                    {selectedLandmark.subtitle}
                  </div>
                </div>
                <span
                  className="w-4 h-4 rounded-md border-2 border-[#26211E] shrink-0 mt-1"
                  style={{ backgroundColor: selectedLandmark.color }}
                />
              </div>

              <p className="text-xs font-semibold text-[#61564E] mt-2.5 leading-relaxed">
                {selectedLandmark.summary}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onSelectObjective(selectedIsObjective ? null : selectedLandmark.id)
                  }
                  className={`px-3 py-1.5 rounded-lg border-2 border-[#26211E] text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                    selectedIsObjective
                      ? 'bg-[#E65448] text-[#FFF9F0]'
                      : 'bg-[#FFF9F0] text-[#26211E] hover:bg-[#E6D3B5]'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>{selectedIsObjective ? 'Clear Objective' : 'Set Objective'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDriveTo(selectedLandmark)}
                  className="px-3 py-1.5 rounded-lg bg-[#21968B] text-[#FFF9F0] border-2 border-[#26211E] text-xs font-extrabold hover:opacity-90 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Warp Nearby</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenRoute(selectedLandmark.route)}
                  className="px-3 py-1.5 rounded-lg bg-[#EC6D2C] text-[#FFF9F0] border-2 border-[#26211E] text-xs font-extrabold hover:bg-[#CC5318] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Page</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
              {WORLD_LANDMARKS.map((lm) => {
                const found = discoveredIds.includes(lm.id);
                const selected = lm.id === highlightedId;
                const isObj = lm.id === objectiveId;
                return (
                  <button
                    key={lm.id}
                    type="button"
                    onClick={() => setHighlightedId(lm.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl border transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                      selected
                        ? 'bg-[#FFF9F0] border-2 border-[#26211E]'
                        : 'bg-[#F5E9D4]/55 border-[#E6D3B5] hover:bg-[#F5E9D4]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-[#26211E] flex items-center gap-1.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: lm.color }}
                        />
                        <span>{lm.title}</span>
                        {isObj && <span className="text-[#E65448]">★</span>}
                      </div>
                      <div className="text-[11px] font-semibold text-[#61564E] truncate">
                        {lm.subtitle}
                      </div>
                    </div>
                    <span className="text-[11px] font-extrabold shrink-0 text-[#61564E]">
                      {found ? 'Visited ✓' : 'Unvisited'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
