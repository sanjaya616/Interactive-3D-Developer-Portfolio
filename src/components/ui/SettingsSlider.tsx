import React, { useId } from 'react';

interface SettingsSliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  accent?: 'orange' | 'turquoise' | 'dark';
  disabled?: boolean;
  ariaLabel?: string;
  onChange: (value: number) => void;
}

export const SettingsSlider: React.FC<SettingsSliderProps> = ({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '%',
  accent = 'turquoise',
  disabled = false,
  ariaLabel,
  onChange,
}) => {
  const inputId = useId();
  const clamped = Math.max(min, Math.min(max, value));
  const pct = max > min ? ((clamped - min) / (max - min)) * 100 : 0;

  const fillColor =
    accent === 'orange'
      ? '#EC6D2C'
      : accent === 'dark'
        ? '#26211E'
        : '#21968B';

  return (
    <div className={`select-none ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <label
          htmlFor={inputId}
          className="text-xs font-extrabold tracking-wide text-[#26211E] uppercase"
        >
          {label}
        </label>
        <span className="px-2 py-0.5 rounded-md bg-[#FFF9F0] border border-[#D9C3A3] text-[11px] font-extrabold tabular-nums text-[#26211E]">
          {Math.round(clamped)}
          {unit}
        </span>
      </div>

      <div className="relative h-7 flex items-center group">
        {/* Custom Track */}
        <div className="w-full h-2.5 rounded-full bg-[#E6D3B5] border border-[#CBB18D] overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-75"
            style={{ width: `${pct}%`, backgroundColor: fillColor }}
          />
        </div>

        {/* Custom Thumb */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#FFF9F0] border-2 border-[#26211E] shadow-[0_2px_0_#26211E] transition-transform duration-100 group-hover:scale-110"
          style={{ left: `${pct}%` }}
        >
          <span
            className="block w-2 h-2 rounded-full mx-auto mt-[4px]"
            style={{ backgroundColor: fillColor }}
          />
        </div>

        {/* Accessible native range input overlay */}
        <input
          id={inputId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={clamped}
          disabled={disabled}
          aria-label={ariaLabel || label}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed m-0"
        />
      </div>
    </div>
  );
};
