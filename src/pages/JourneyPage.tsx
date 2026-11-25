import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Mountain } from 'lucide-react';
import { PortfolioLayout } from '../components/PortfolioLayout';
import { JOURNEY_MILESTONES } from '../data/portfolioData';

const STAGE_MARKERS = [
  'STAGE 01 · BASECAMP FOUNDATIONS',
  'STAGE 02 · RIDGE ASCENT',
  'STAGE 03 · PRACTICE TRAIL',
  'STAGE 04 · NIBM OVERLOOK',
  'STAGE 05 · SUMMIT & HORIZON',
];

export const JourneyPage: React.FC = () => {
  const [activeId, setActiveId] = useState<string>(JOURNEY_MILESTONES[2].id);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.journey-node',
        { opacity: 0, x: -16 },
        {
          opacity: 1,
          x: 0,
          duration: 0.45,
          stagger: 0.1,
          ease: 'power2.out',
          clearProps: 'transform',
        },
      );
    }, timelineRef);
    return () => ctx.revert();
  }, []);

  return (
    <PortfolioLayout
      title="LOOKOUT HILL TIMELINE"
      subtitle="Education & Practice · 5 Verified Milestones (Dates Displayed Only Where Available)"
    >
      {/* Mountain-Inspired Crest Header Graphic */}
      <div className="mb-10 ui-card-featured bg-[#F5E9D4]! overflow-hidden">
        <div className="px-6 pt-5 pb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#5E915E] tracking-wider">
            <Mountain className="w-4 h-4" />
            <span>ASCENT OVERVIEW · CLICK ANY WAYPOINT TO HIGHLIGHT</span>
          </div>
          <span className="text-xs font-extrabold text-[#61564E]">
            5 Verified Stages · Sri Lanka
          </span>
        </div>

        <svg
          viewBox="0 0 800 130"
          preserveAspectRatio="none"
          className="w-full h-24 sm:h-32 block border-t border-[#CBB18D]"
          role="img"
          aria-label="Mountain elevation trail linking five career and education milestones"
        >
          <rect width="800" height="130" fill="#FFF9F0" />
          <path
            d="M0 120 L110 88 L220 96 L355 58 L490 74 L640 26 L755 54 L800 42 L800 130 L0 130 Z"
            fill="#E6D3B5"
          />
          <path
            d="M0 124 L150 96 L310 74 L480 62 L645 36 L800 48"
            fill="none"
            stroke="#26211E"
            strokeWidth="3"
            strokeDasharray="6 5"
          />
          {JOURNEY_MILESTONES.map((m, idx) => {
            const x = 90 + idx * 155;
            const y = [108, 90, 74, 54, 38][idx];
            const isSelected = m.id === activeId;
            return (
              <g
                key={m.id}
                onClick={() => setActiveId(m.id)}
                className="cursor-pointer"
              >
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 10 : 7}
                  fill={isSelected ? '#EC6D2C' : '#21968B'}
                  stroke="#26211E"
                  strokeWidth="2.5"
                />
                <text
                  x={x}
                  y={y - 14}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="800"
                  fill="#26211E"
                >
                  0{idx + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Vertical Mountain Trail Timeline */}
      <div ref={timelineRef} className="relative pl-6 sm:pl-10 space-y-6">
        <div
          aria-hidden="true"
          className="absolute left-3 sm:left-5 top-4 bottom-4 w-1 bg-[#26211E] rounded-full"
        />

        {JOURNEY_MILESTONES.map((item, idx) => {
          const isHighlighted = item.id === activeId;
          const hasExplicitDate = item.period !== 'Completed';
          return (
            <div key={item.id} className="journey-node relative">
              <button
                type="button"
                onClick={() => setActiveId(item.id)}
                aria-label={`Highlight milestone 0${idx + 1}: ${item.title}`}
                className={`absolute -left-6 sm:-left-9 top-6 w-7 h-7 rounded-full border-2 border-[#26211E] flex items-center justify-center text-[11px] font-extrabold transition-transform duration-150 cursor-pointer ${
                  isHighlighted
                    ? 'bg-[#EC6D2C] text-[#FFF9F0] scale-110'
                    : 'bg-[#FFF9F0] text-[#26211E] hover:bg-[#F5E9D4]'
                }`}
              >
                {idx + 1}
              </button>

              <article
                onClick={() => setActiveId(item.id)}
                className={`p-6 cursor-pointer ${
                  isHighlighted
                    ? 'ui-card-featured'
                    : 'ui-card-interactive bg-[#F5E9D4]/55!'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold">
                  <span className="text-[#5E915E] tracking-wider">
                    {STAGE_MARKERS[idx]} · {item.location}
                  </span>
                  <span className="px-3 py-0.5 rounded-md border border-[#D9C3A3] bg-[#F5E9D4] text-[#26211E] tabular-nums">
                    {hasExplicitDate
                      ? `${item.period} · ${item.statusLabel}`
                      : item.statusLabel}
                  </span>
                </div>

                <h2 className="font-display text-4xl font-bold text-[#26211E] mt-2">
                  {item.title}
                </h2>
                <div className="text-sm font-extrabold text-[#EC6D2C]">
                  {item.organization}
                </div>

                <p className="mt-3 text-sm sm:text-base font-semibold text-[#61564E] leading-relaxed">
                  {item.description}
                </p>
              </article>
            </div>
          );
        })}
      </div>
    </PortfolioLayout>
  );
};
