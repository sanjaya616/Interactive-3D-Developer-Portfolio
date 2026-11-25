export interface CountryOption {
  code: string;
  flag: string;
  name: string;
}

export const WHISPER_COUNTRIES: CountryOption[] = [
  { code: 'LK', flag: '🇱🇰', name: 'Sri Lanka' },
  { code: 'US', flag: '🇺🇸', name: 'United States' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'IN', flag: '🇮🇳', name: 'India' },
  { code: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: 'SG', flag: '🇸🇬', name: 'Singapore' },
  { code: 'FR', flag: '🇫🇷', name: 'France' },
  { code: 'BR', flag: '🇧🇷', name: 'Brazil' },
  { code: 'KR', flag: '🇰🇷', name: 'South Korea' },
  { code: 'NL', flag: '🇳🇱', name: 'Netherlands' },
  { code: 'AE', flag: '🇦🇪', name: 'United Arab Emirates' },
  { code: 'MY', flag: '🇲🇾', name: 'Malaysia' },
  { code: 'NZ', flag: '🇳🇿', name: 'New Zealand' },
  { code: 'SE', flag: '🇸🇪', name: 'Sweden' },
  { code: 'CH', flag: '🇨🇭', name: 'Switzerland' },
  { code: 'ES', flag: '🇪🇸', name: 'Spain' },
  { code: 'GL', flag: '🌍', name: 'Global' },
];

export const ALLOWED_COUNTRY_CODES = new Set(WHISPER_COUNTRIES.map((c) => c.code));

export function getCountryByCode(code: string): CountryOption {
  return WHISPER_COUNTRIES.find((c) => c.code === code) ?? WHISPER_COUNTRIES[WHISPER_COUNTRIES.length - 1];
}
