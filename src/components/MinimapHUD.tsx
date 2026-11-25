import React from 'react';
import { Compass } from 'lucide-react';
import { SECRET_LOCATIONS, WORLD_COLLECTIBLES, WORLD_LANDMARKS } from '../data/portfolioData';

interface MinimapHUDProps {
  playerX: number;
  playerZ: number;
  headingRad: number;
  discoveredIds: string[];
  collectedIds?: string[];
  discoveredSecrets?: string[];
  objectiveId: string | null;
  onOpenMap: () => void;
}

export const MinimapHUD: React.FC<MinimapHUDProps> = ({
  playerX,
  playerZ,
  headingRad,
  discoveredIds,
  collectedIds = [],
  discoveredSecrets = [],
  objectiveId,
  onOpenMap,
}) => {
  const arrowDeg = (-headingRad * 180) / Math.PI;

  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={(e) => {
        e.currentTarget.blur();
        onOpenMap();
      }}
      aria-label="Open expanded world map [M]"
      title="Click to expand World Map (M)"
      className="pointer-events-auto group hidden md:flex flex-col bg-[#FFF9F0]/95 border-2 border-[#26211E] rounded-2xl p-2 shadow-[0_4px_0_#26211E] hover:bg-[#F5E9D4] active:translate-y-0.5 transition-colors cursor-pointer"
    >
      <div className="relative w-36 h-36 rounded-xl overflow-hidden border border-[#D9C3A3] bg-[#EED6AF]">
        {/* Crisp North Cardinal Badge */}
        <span
          aria-hidden="true"
          className="absolute top-1 left-1/2 -translate-x-1/2 z-10 px-1.5 py-0.2 rounded bg-[#26211E] text-[#FFF9F0] text-[8px] font-extrabold leading-tight"
        >
          N
        </span>

        <svg viewBox="-100 -100 200 200" className="w-full h-full block">
          <circle cx="0" cy="-72" r="20" fill="#B5C78E" opacity="0.65" />
          <rect x="16" y="-30" width="58" height="16" rx="5" fill="#21968B" opacity="0.82" />
          <circle cx="-18" cy="66" r="12.5" fill="#21968B" opacity="0.82" />

          <circle cx="0" cy="0" r="34" fill="none" stroke="#4B4440" strokeWidth="4.5" opacity="0.72" />
          <circle cx="-66" cy="18" r="18" fill="none" stroke="#4B4440" strokeWidth="4" opacity="0.72" />
          <circle cx="0" cy="0" r="12" fill="#FFF9F0" stroke="#EC6D2C" strokeWidth="2.5" />

          <g stroke="#4B4440" strokeWidth="4" strokeLinecap="round" opacity="0.74">
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
            strokeWidth="2.5"
            strokeDasharray="4 4"
          />

          <rect x="37" y="-32" width="6" height="20" rx="1.5" fill="#8B5A3C" stroke="#26211E" strokeWidth="1" />
          <rect x="-46" y="-12" width="8" height="16" rx="2" fill="#B98A5E" stroke="#26211E" strokeWidth="1" />

          {WORLD_COLLECTIBLES.map((c) => {
            if (collectedIds.includes(c.id)) return null;
            return (
              <circle
                key={c.id}
                cx={c.x}
                cy={c.z}
                r="2.1"
                fill={c.kind === 'orb' ? '#21968B' : c.kind === 'token' ? '#FFD54F' : '#E65448'}
                stroke="#26211E"
                strokeWidth="0.8"
              />
            );
          })}

          {SECRET_LOCATIONS.map((s) => (
            <circle
              key={s.id}
              cx={s.x}
              cy={s.z}
              r="3.2"
              fill={discoveredSecrets.includes(s.id) ? '#5E915E' : '#FFF9F0'}
              stroke="#26211E"
              strokeWidth="1.2"
              strokeDasharray="2 1"
            />
          ))}

          {WORLD_LANDMARKS.map((lm) => {
            const visited = discoveredIds.includes(lm.id);
            const isObjective = objectiveId === lm.id;
            return (
              <g key={lm.id} transform={`translate(${lm.position.x}, ${lm.position.z})`}>
                {isObjective && (
                  <circle
                    r="11"
                    fill="none"
                    stroke="#E65448"
                    strokeWidth="2.8"
                    strokeDasharray="4 3"
                  />
                )}
                {!visited && (
                  <circle r="7.5" fill="none" stroke="#FFF9F0" strokeWidth="2.2" />
                )}
                <circle
                  r={visited ? 5 : 5.5}
                  fill={lm.color}
                  stroke="#26211E"
                  strokeWidth="1.8"
                />
              </g>
            );
          })}

          <g transform={`translate(${playerX}, ${playerZ}) rotate(${arrowDeg})`}>
            <polygon
              points="0,-9.5 6.5,6.5 0,3 -6.5,6.5"
              fill="#26211E"
              stroke="#FFF9F0"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      </div>

      <div className="mt-1.5 flex items-center justify-between px-1 text-[11px] font-extrabold text-[#26211E]">
        <span className="inline-flex items-center gap-1">
          <Compass className="w-3.5 h-3.5 text-[#EC6D2C]" />
          <span>MINIMAP</span>
        </span>
        <span className="text-[#61564E]">[M]</span>
      </div>
    </button>
  );
};
