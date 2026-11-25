import React, { useEffect, useState } from 'react';
import { AnimatedProgress } from './ui/AnimatedProgress';

interface LoadingScreenProps {
  visible: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ visible }) => {
  const [progress, setProgress] = useState(18);

  useEffect(() => {
    if (!visible) {
      setProgress(100);
      return;
    }
    const timer = window.setInterval(() => {
      setProgress((p) => (p < 92 ? p + 12 : p));
    }, 85);
    return () => window.clearInterval(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FFF9F0] text-[#26211E] px-6"
      role="status"
      aria-label="Loading 3D world"
    >
      <div className="w-full max-w-md flex flex-col items-center text-center">
        {/* Bespoke stylized vehicle & compass showcase emblem */}
        <svg
          viewBox="0 0 220 96"
          className="w-52 h-24 mb-3"
          aria-hidden="true"
        >
          {/* Horizon sun */}
          <circle cx="158" cy="40" r="24" fill="#F5E9D4" />
          <circle cx="158" cy="40" r="15" fill="#EC6D2C" fillOpacity="0.22" />
          {/* Road baseline */}
          <line x1="16" y1="76" x2="204" y2="76" stroke="#26211E" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="28" y1="82" x2="192" y2="82" stroke="#D9C3A3" strokeWidth="2.5" strokeDasharray="8 6" strokeLinecap="round" />
          {/* Stylized sculpted buggy */}
          <path
            d="M48 64 L58 39 L104 34 L126 48 L164 52 L172 67 L42 67 Z"
            fill="#EC6D2C"
            stroke="#26211E"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <polygon points="74,40 100,38 114,48 70,48" fill="#263942" stroke="#26211E" strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="158" y="54" width="12" height="6" rx="2" fill="#FFE08A" stroke="#26211E" strokeWidth="1.8" />
          {/* Wheels */}
          <circle cx="70" cy="68" r="13.5" fill="#26211E" />
          <circle cx="70" cy="68" r="6" fill="#21968B" />
          <circle cx="144" cy="68" r="13.5" fill="#26211E" />
          <circle cx="144" cy="68" r="6" fill="#21968B" />
        </svg>

        <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#21968B]">
          Interactive 3D Portfolio
        </span>
        <h1 className="font-display text-6xl sm:text-7xl font-bold tracking-wide text-[#26211E] leading-none mt-1">
          SANJAYA&apos;S WORLD
        </h1>
        <p className="mt-2.5 text-sm font-semibold text-[#61564E]">
          Building sandstone terrain, landmarks, physics &amp; vehicle rig...
        </p>

        <div className="mt-7 w-full max-w-xs ui-card-sand p-4">
          <AnimatedProgress
            value={progress}
            max={100}
            color="orange"
            heightClass="h-3"
            label="LOADING SCENE"
            valueText={`${progress}%`}
          />
        </div>
      </div>
    </div>
  );
};
