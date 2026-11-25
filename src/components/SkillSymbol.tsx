import React from 'react';

interface SkillSymbolProps {
  symbolKey: string;
  accentColor: string;
}

const SYMBOL_LABELS: Record<string, string> = {
  html5: 'H5',
  css3: 'C3',
  js: 'JS',
  react: 'RE',
  ui: 'UI',
  'web-design': 'WD',
  php: 'PHP',
  sql: 'SQL',
  mysql: 'MY',
  postgres: 'PG',
  oracle: 'PL',
  mongodb: 'MG',
  python: 'PY',
  c: 'C',
  dotnet: 'C#',
  flutter: 'FL',
  mobile: 'MB',
  game: 'GM',
  git: 'GT',
  github: 'GH',
  wordpress: 'WP',
  workflow: 'PM',
  photo: 'PH',
  video: 'VD',
};

export const SkillSymbol: React.FC<SkillSymbolProps> = ({
  symbolKey,
  accentColor,
}) => {
  const code = SYMBOL_LABELS[symbolKey] || symbolKey.slice(0, 2).toUpperCase();

  return (
    <div
      className="w-10 h-10 rounded-xl border-2 border-[#26211E] flex items-center justify-center shrink-0 shadow-[0_2px_0_#26211E] text-xs font-extrabold text-[#FFF9F0]"
      style={{ backgroundColor: accentColor }}
      aria-hidden="true"
    >
      {code}
    </div>
  );
};
