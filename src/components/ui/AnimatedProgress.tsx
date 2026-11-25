import React from 'react';

interface AnimatedProgressProps {
  value: number;
  max?: number;
  color?: 'orange' | 'turquoise' | 'sage' | 'coral' | 'amber';
  heightClass?: string;
  label?: string;
  valueText?: string;
}

const FILL_COLORS: Record<NonNullable<AnimatedProgressProps['color']>, string> = {
  orange: '#EC6D2C',
  turquoise: '#21968B',
  sage: '#5E915E',
  coral: '#E65448',
  amber: '#E69F38',
};

export const AnimatedProgress: React.FC<AnimatedProgressProps> = ({
  value,
  max = 100,
  color = 'orange',
  heightClass = 'h-2.5',
  label,
  valueText,
}) => {
  const safeMax = max > 0 ? max : 100;
  const pct = Math.max(0, Math.min(100, (value / safeMax) * 100));

  return (
    <div className="w-full">
      {(label || valueText) && (
        <div className="flex items-center justify-between gap-2 text-xs font-extrabold text-[#61564E] mb-1.5">
          {label && <span className="truncate">{label}</span>}
          {valueText && <span className="tabular-nums text-[#26211E] shrink-0">{valueText}</span>}
        </div>
      )}
      <div
        className={`ui-progress-track ${heightClass}`}
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={safeMax}
      >
        <div
          className="ui-progress-fill"
          style={{
            width: `${pct}%`,
            backgroundColor: FILL_COLORS[color],
          }}
        />
      </div>
    </div>
  );
};
