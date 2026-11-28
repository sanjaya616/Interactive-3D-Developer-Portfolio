export type AnalyticsEventName =
  | 'route_view'
  | 'landmark_visit'
  | 'challenge_start'
  | 'challenge_complete'
  | 'assistant_query';

export interface LocalAnalyticsSnapshot {
  optedOut: boolean;
  sessionStartedAt: string;
  totalEvents: number;
  countsByEvent: Record<AnalyticsEventName, number>;
  recentRoutes: string[];
}

const STORAGE_KEY = 'sanjaya_analytics_v1';

function createEmptySnapshot(): LocalAnalyticsSnapshot {
  return {
    optedOut: false,
    sessionStartedAt: new Date().toISOString(),
    totalEvents: 0,
    countsByEvent: {
      route_view: 0,
      landmark_visit: 0,
      challenge_start: 0,
      challenge_complete: 0,
      assistant_query: 0,
    },
    recentRoutes: [],
  };
}

export function getAnalyticsSnapshot(): LocalAnalyticsSnapshot {
  if (typeof window === 'undefined') return createEmptySnapshot();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptySnapshot();
    const parsed = JSON.parse(raw) as Partial<LocalAnalyticsSnapshot>;
    return {
      optedOut: Boolean(parsed.optedOut),
      sessionStartedAt:
        typeof parsed.sessionStartedAt === 'string'
          ? parsed.sessionStartedAt
          : new Date().toISOString(),
      totalEvents: typeof parsed.totalEvents === 'number' ? parsed.totalEvents : 0,
      countsByEvent: {
        ...createEmptySnapshot().countsByEvent,
        ...(parsed.countsByEvent ?? {}),
      },
      recentRoutes: Array.isArray(parsed.recentRoutes)
        ? parsed.recentRoutes.filter((r): r is string => typeof r === 'string').slice(0, 10)
        : [],
    };
  } catch {
    return createEmptySnapshot();
  }
}

export function trackAnalyticsEvent(event: AnalyticsEventName, label?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const snap = getAnalyticsSnapshot();
    if (snap.optedOut) return;
    snap.totalEvents += 1;
    snap.countsByEvent[event] = (snap.countsByEvent[event] ?? 0) + 1;
    if (event === 'route_view' && label) {
      snap.recentRoutes = [label, ...snap.recentRoutes.filter((r) => r !== label)].slice(0, 10);
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

export function setAnalyticsOptOut(optedOut: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    const snap = getAnalyticsSnapshot();
    snap.optedOut = optedOut;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
  } catch {
    // Ignore storage errors
  }
}

export function resetAnalytics(): void {
  if (typeof window === 'undefined') return;
  try {
    const snap = getAnalyticsSnapshot();
    const next = createEmptySnapshot();
    next.optedOut = snap.optedOut;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors
  }
}
