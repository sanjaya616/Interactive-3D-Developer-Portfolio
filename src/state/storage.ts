import {
  DEFAULT_SETTINGS,
  DEFAULT_VEHICLE,
  parseVersionedSave,
  type VersionedSaveState,
} from './saveValidation';

export { DEFAULT_SETTINGS, DEFAULT_VEHICLE };
export type { VersionedSaveState };

const SAVE_STORAGE_KEY = 'sanjaya_world_save_v3';

export function loadVersionedSave(): VersionedSaveState {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return parseVersionedSave(null);
    }
    const rawV3 = window.localStorage.getItem(SAVE_STORAGE_KEY);
    if (rawV3) {
      return parseVersionedSave(rawV3);
    }

    // Safely migrate legacy v1/v2 keys if present
    const legacySettings = window.localStorage.getItem('sanjaya_world_settings_v1');
    const legacyVehicle = window.localStorage.getItem('sanjaya_world_vehicle_v2');
    const legacyDiscovered = window.localStorage.getItem('sanjaya_world_discovered_v1');
    const legacyLeaderboard = window.localStorage.getItem('sanjaya_world_leaderboard_v2');

    if (legacySettings || legacyVehicle || legacyDiscovered || legacyLeaderboard) {
      const migrated = parseVersionedSave(
        JSON.stringify({
          settings: legacySettings ? JSON.parse(legacySettings) : undefined,
          vehicle: legacyVehicle ? JSON.parse(legacyVehicle) : undefined,
          visitedLocations: legacyDiscovered ? JSON.parse(legacyDiscovered) : [],
          leaderboard: legacyLeaderboard ? JSON.parse(legacyLeaderboard) : [],
        }),
      );
      if (migrated.leaderboard.length > 0) {
        migrated.bestLapSeconds = Math.min(...migrated.leaderboard.map((l) => l.lapSeconds));
      }
      saveVersionedSave(migrated);
      return migrated;
    }

    const base = parseVersionedSave(null);
    if (typeof window.matchMedia === 'function') {
      base.settings.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return base;
  } catch {
    return parseVersionedSave(null);
  }
}

export function saveVersionedSave(state: VersionedSaveState): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore private browsing / storage quota errors gracefully
  }
}
