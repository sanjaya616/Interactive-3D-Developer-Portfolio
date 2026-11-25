import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  accent?: 'orange' | 'turquoise' | 'sage' | 'amber';
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  label,
  description,
  icon,
  accent = 'turquoise',
  disabled = false,
  onChange,
}) => {
  const trackBg = !checked
    ? '#E6D3B5'
    : accent === 'orange'
      ? '#EC6D2C'
      : accent === 'sage'
        ? '#5E915E'
        : accent === 'amber'
          ? '#D99B26'
          : '#21968B';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[#FFF9F0] border border-[#D9C3A3] hover:border-[#26211E] transition-colors cursor-pointer disabled:opacity-50 text-left"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && (
          <span className="w-8 h-8 rounded-lg bg-[#F5E9D4] border border-[#D9C3A3] flex items-center justify-center text-[#26211E] shrink-0">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <div className="text-xs font-extrabold text-[#26211E] truncate">{label}</div>
          {description && (
            <div className="text-[11px] font-semibold text-[#61564E] truncate">{description}</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`text-[10px] font-extrabold uppercase tracking-wider ${
            checked ? 'text-[#26211E]' : 'text-[#61564E]'
          }`}
        >
          {checked ? 'On' : 'Off'}
        </span>
        <span
          aria-hidden="true"
          className="relative inline-flex items-center w-11 h-6 rounded-full border-[1.5px] border-[#26211E] transition-colors duration-150"
          style={{ backgroundColor: trackBg }}
        >
          <span
            className={`inline-block w-4 h-4 rounded-full bg-[#FFF9F0] border border-[#26211E] shadow-xs transition-transform duration-150 ${
              checked ? 'translate-x-[22px]' : 'translate-x-[3px]'
            }`}
          />
        </span>
      </div>
    </button>
  );
};
