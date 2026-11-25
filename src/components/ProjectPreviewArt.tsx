import React from 'react';
import type { ProjectPreviewKind } from '../types/portfolio';

interface ProjectPreviewArtProps {
  kind: ProjectPreviewKind;
  accentColor: string;
  title: string;
}

export const ProjectPreviewArt: React.FC<ProjectPreviewArtProps> = ({
  kind,
  accentColor,
  title,
}) => {
  return (
    <div
      className="relative w-full aspect-[16/9] rounded-xl border border-[#D9C3A3] bg-[#F9F0E2] overflow-hidden"
      aria-label={`Conceptual illustration for ${title}`}
    >
      <svg viewBox="0 0 320 180" className="w-full h-full block">
        <defs>
          <pattern id={`grid-${kind}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E6D3B5" strokeWidth="0.9" />
          </pattern>
        </defs>
        <rect width="320" height="180" fill="#FAF1E3" />
        <rect width="320" height="180" fill={`url(#grid-${kind})`} />

        {kind === 'lms' && (
          <g>
            <rect x="26" y="22" width="268" height="136" rx="10" fill="#FFF9F0" stroke="#26211E" strokeWidth="2.6" />
            <rect x="26" y="22" width="66" height="136" rx="9" fill={accentColor} stroke="#26211E" strokeWidth="2.6" />
            <rect x="38" y="42" width="42" height="8" rx="4" fill="#FFF9F0" fillOpacity="0.85" />
            <rect x="38" y="60" width="34" height="6" rx="3" fill="#FFF9F0" fillOpacity="0.45" />
            <rect x="38" y="74" width="38" height="6" rx="3" fill="#FFF9F0" fillOpacity="0.45" />
            <rect x="108" y="40" width="80" height="44" rx="6" fill="#F5E9D4" stroke="#26211E" strokeWidth="2" />
            <path d="M120 70 L138 56 L154 64 L176 48" fill="none" stroke={accentColor} strokeWidth="3" strokeLinecap="round" />
            <rect x="198" y="40" width="82" height="44" rx="6" fill="#F5E9D4" stroke="#26211E" strokeWidth="2" />
            <rect x="210" y="54" width="58" height="7" rx="3" fill="#26211E" fillOpacity="0.7" />
            <rect x="210" y="67" width="40" height="6" rx="3" fill="#21968B" />
            <rect x="108" y="96" width="172" height="44" rx="6" fill="#21968B" fillOpacity="0.16" stroke="#26211E" strokeWidth="2" />
            <rect x="122" y="114" width="96" height="8" rx="4" fill="#21968B" />
            <circle cx="256" cy="118" r="10" fill={accentColor} />
          </g>
        )}

        {(kind === 'hotel-booking' || kind === 'granbell') && (
          <g>
            <rect x="30" y="24" width="260" height="132" rx="10" fill="#FFF9F0" stroke="#26211E" strokeWidth="2.6" />
            <rect x="30" y="24" width="260" height="30" rx="9" fill="#26211E" />
            <rect x="46" y="34" width="88" height="10" rx="4" fill={accentColor} />
            <circle cx="268" cy="39" r="5" fill="#FFF9F0" />
            <g stroke="#26211E" strokeWidth="1.8">
              <rect x="46" y="70" width="68" height="32" rx="5" fill="#F5E9D4" />
              <rect x="126" y="70" width="68" height="32" rx="5" fill={accentColor} fillOpacity="0.32" />
              <rect x="206" y="70" width="68" height="32" rx="5" fill="#F5E9D4" />
              <rect x="46" y="110" width="68" height="32" rx="5" fill="#21968B" fillOpacity="0.28" />
              <rect x="126" y="110" width="68" height="32" rx="5" fill="#F5E9D4" />
              <rect x="206" y="110" width="68" height="32" rx="5" fill={accentColor} fillOpacity="0.22" />
            </g>
          </g>
        )}

        {(kind === 'ecommerce' || kind === 'store-ops') && (
          <g>
            <rect x="28" y="24" width="264" height="132" rx="10" fill="#FFF9F0" stroke="#26211E" strokeWidth="2.6" />
            <rect x="44" y="38" width="232" height="22" rx="5" fill="#26211E" />
            <rect x="56" y="45" width="90" height="8" rx="4" fill="#FFF9F0" fillOpacity="0.85" />
            <circle cx="258" cy="49" r="6" fill={accentColor} />
            <rect x="44" y="72" width="70" height="68" rx="8" fill="#F5E9D4" stroke="#26211E" strokeWidth="2" />
            <rect x="125" y="72" width="70" height="68" rx="8" fill="#F5E9D4" stroke="#26211E" strokeWidth="2" />
            <rect x="206" y="72" width="70" height="68" rx="8" fill={accentColor} fillOpacity="0.26" stroke="#26211E" strokeWidth="2" />
            <rect x="56" y="118" width="46" height="8" rx="4" fill={accentColor} />
            <rect x="137" y="118" width="46" height="8" rx="4" fill="#21968B" />
            <rect x="218" y="118" width="46" height="8" rx="4" fill="#26211E" />
          </g>
        )}

        {(kind === 'galleryx' || kind === 'mobile-utilities') && (
          <g>
            <rect x="114" y="16" width="92" height="148" rx="16" fill="#FFF9F0" stroke="#26211E" strokeWidth="2.8" />
            <rect x="148" y="22" width="24" height="4" rx="2" fill="#26211E" />
            <rect x="126" y="34" width="68" height="18" rx="4" fill={accentColor} />
            <rect x="126" y="60" width="31" height="28" rx="5" fill="#F5E9D4" stroke="#26211E" strokeWidth="1.6" />
            <rect x="163" y="60" width="31" height="28" rx="5" fill="#21968B" fillOpacity="0.32" stroke="#26211E" strokeWidth="1.6" />
            <rect x="126" y="94" width="31" height="28" rx="5" fill={accentColor} fillOpacity="0.32" stroke="#26211E" strokeWidth="1.6" />
            <rect x="163" y="94" width="31" height="28" rx="5" fill="#F5E9D4" stroke="#26211E" strokeWidth="1.6" />
            <rect x="126" y="130" width="68" height="20" rx="5" fill="#26211E" />
          </g>
        )}

        {kind === 'media-portal' && (
          <g>
            <rect x="28" y="24" width="264" height="132" rx="10" fill="#26211E" />
            <rect x="42" y="36" width="166" height="86" rx="6" fill="#3B332E" stroke="#FFF9F0" strokeWidth="1.6" />
            <circle cx="125" cy="79" r="18" fill={accentColor} fillOpacity="0.9" />
            <polygon points="119,70 119,88 135,79" fill="#FFF9F0" />
            <rect x="218" y="36" width="60" height="24" rx="4" fill={accentColor} />
            <rect x="218" y="67" width="60" height="24" rx="4" fill="#FFF9F0" fillOpacity="0.22" />
            <rect x="218" y="98" width="60" height="24" rx="4" fill="#FFF9F0" fillOpacity="0.22" />
            <rect x="42" y="132" width="236" height="9" rx="4.5" fill="#564D47" />
            <rect x="42" y="132" width="118" height="9" rx="4.5" fill={accentColor} />
          </g>
        )}

        {kind === 'smartmove' && (
          <g>
            <rect x="32" y="32" width="88" height="54" rx="8" fill="#FFF9F0" stroke="#26211E" strokeWidth="2.4" />
            <rect x="44" y="46" width="64" height="8" rx="3" fill="#21968B" />
            <rect x="44" y="60" width="46" height="6" rx="3" fill="#61564E" fillOpacity="0.5" />
            <rect x="200" y="32" width="88" height="54" rx="8" fill="#FFF9F0" stroke="#26211E" strokeWidth="2.4" />
            <rect x="212" y="46" width="64" height="8" rx="3" fill={accentColor} />
            <rect x="212" y="60" width="46" height="6" rx="3" fill="#61564E" fillOpacity="0.5" />
            <rect x="114" y="106" width="92" height="46" rx="8" fill={accentColor} stroke="#26211E" strokeWidth="2.4" />
            <rect x="130" y="124" width="60" height="8" rx="3" fill="#FFF9F0" />
            <path d="M120 59 L200 59 M76 86 L142 106 M244 86 L178 106" stroke="#26211E" strokeWidth="2.4" strokeDasharray="5 4" fill="none" />
          </g>
        )}

        {kind === 'coconut-automation' && (
          <g>
            <rect x="36" y="42" width="76" height="96" rx="8" fill="#21968B" stroke="#26211E" strokeWidth="2.6" />
            <rect x="48" y="58" width="52" height="12" rx="4" fill="#FFF9F0" />
            <circle cx="164" cy="90" r="32" fill={accentColor} stroke="#26211E" strokeWidth="2.8" />
            <circle cx="164" cy="90" r="12" fill="#FFF9F0" stroke="#26211E" strokeWidth="2.2" />
            <rect x="220" y="54" width="64" height="72" rx="8" fill="#FFF9F0" stroke="#26211E" strokeWidth="2.6" />
            <line x1="112" y1="90" x2="132" y2="90" stroke="#26211E" strokeWidth="3" />
            <line x1="196" y1="90" x2="220" y2="90" stroke="#26211E" strokeWidth="3" />
          </g>
        )}

        {kind === 'smart-gate' && (
          <g>
            <rect x="44" y="58" width="44" height="88" rx="6" fill="#26211E" />
            <rect x="52" y="70" width="28" height="22" rx="3" fill="#21968B" />
            <line x1="88" y1="74" x2="246" y2="42" stroke={accentColor} strokeWidth="10" strokeLinecap="round" />
            <circle cx="88" cy="74" r="9" fill="#FFF9F0" stroke="#26211E" strokeWidth="2.4" />
            <rect x="210" y="96" width="66" height="50" rx="8" fill="#FFF9F0" stroke="#26211E" strokeWidth="2.4" />
            <circle cx="243" cy="121" r="11" fill="#21968B" fillOpacity="0.3" stroke="#26211E" strokeWidth="2" />
          </g>
        )}

        <rect x="12" y="12" width="114" height="20" rx="5" fill="#26211E" />
        <text x="69" y="25" textAnchor="middle" fill="#FFF9F0" fontFamily="Nunito, sans-serif" fontSize="9.5" fontWeight="800">
          CONCEPT PREVIEW
        </text>
      </svg>
    </div>
  );
};
