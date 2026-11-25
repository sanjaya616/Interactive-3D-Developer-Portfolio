import { WORLD_LANDMARKS } from '../data/portfolioData.ts';
import type { WorldLandmark } from '../types/portfolio.ts';

export interface TourStopDef {
  id: string;
  stepNumber: number;
  title: string;
  intro: string;
  callout: string;
}

export interface TourState {
  active: boolean;
  currentIndex: number;
  visitedStopIds: string[];
  completed: boolean;
}

export const TOUR_STOPS: TourStopDef[] = [
  {
    id: 'studio',
    stepNumber: 1,
    title: 'THE STUDIO',
    intro: 'Meet Sanjaya Lakshan — freelance full-stack developer and NIBM undergraduate based in Anuradhapura.',
    callout: 'Press ENTER at The Studio to inspect bio, education, and freelance background.',
  },
  {
    id: 'projects',
    stepNumber: 2,
    title: 'PROJECT PAVILION',
    intro: 'Central exhibition showcasing 11 real software, mobile, coursework, and hardware builds.',
    callout: 'Open any project card to compare implemented features against planned milestones.',
  },
  {
    id: 'workshop',
    stepNumber: 3,
    title: 'THE WORKSHOP',
    intro: 'Interactive technology lab organizing 24 real tools across Frontend, Backend, Mobile, Tools & Creative work.',
    callout: 'Explore the 5 hexagonal lab pods or trigger the 3-target Bug Hunt challenge.',
  },
  {
    id: 'lookout',
    stepNumber: 4,
    title: 'LOOKOUT HILL',
    intro: 'Elevated sandstone ridge overlooking the island, charting Sanjaya’s 5-stage learning & freelance journey.',
    callout: 'Climb the hill trail and try the 4-beacon Summit Memory Challenge.',
  },
  {
    id: 'signal-house',
    stepNumber: 5,
    title: 'SIGNAL HOUSE',
    intro: 'Communications hub linking directly to email, phone, GitHub, and LinkedIn contact channels.',
    callout: 'Final tour stop — reach Signal House to complete the Guided Portfolio Tour.',
  },
];

const TOUR_ID_SET = new Set(TOUR_STOPS.map((s) => s.id));

export function createInitialTourState(discoveredIds: string[] = []): TourState {
  const visited = TOUR_STOPS.map((s) => s.id).filter((id) => discoveredIds.includes(id));
  const firstUnvisited = TOUR_STOPS.findIndex((s) => !visited.includes(s.id));
  return {
    active: false,
    currentIndex: firstUnvisited >= 0 ? firstUnvisited : 0,
    visitedStopIds: visited,
    completed: visited.length === TOUR_STOPS.length,
  };
}

export function startGuidedTour(discoveredIds: string[] = []): TourState {
  const visited = TOUR_STOPS.map((s) => s.id).filter((id) => discoveredIds.includes(id));
  const firstUnvisited = TOUR_STOPS.findIndex((s) => !visited.includes(s.id));
  return {
    active: true,
    currentIndex: firstUnvisited >= 0 ? firstUnvisited : 0,
    visitedStopIds: visited,
    completed: visited.length === TOUR_STOPS.length,
  };
}

export function restartGuidedTour(): TourState {
  return {
    active: true,
    currentIndex: 0,
    visitedStopIds: [],
    completed: false,
  };
}

export function skipTourStop(state: TourState): TourState {
  if (!state.active) return state;
  const nextIndex = state.currentIndex + 1;
  if (nextIndex >= TOUR_STOPS.length) {
    // Wrap to first unvisited if any remain, else mark complete
    const unvisitedIdx = TOUR_STOPS.findIndex((s) => !state.visitedStopIds.includes(s.id));
    if (unvisitedIdx >= 0 && unvisitedIdx !== state.currentIndex) {
      return { ...state, currentIndex: unvisitedIdx };
    }
    return {
      ...state,
      active: false,
      currentIndex: TOUR_STOPS.length - 1,
      completed: state.visitedStopIds.length >= TOUR_STOPS.length,
    };
  }
  return {
    ...state,
    currentIndex: nextIndex,
  };
}

export function recordTourStopVisited(state: TourState, landmarkId: string): TourState {
  if (!TOUR_ID_SET.has(landmarkId)) return state;
  const visitedStopIds = state.visitedStopIds.includes(landmarkId)
    ? state.visitedStopIds
    : [...state.visitedStopIds, landmarkId];

  const allDone = TOUR_STOPS.every((s) => visitedStopIds.includes(s.id));
  const currentStop = TOUR_STOPS[state.currentIndex];

  if (allDone) {
    return {
      ...state,
      active: false,
      visitedStopIds,
      completed: true,
    };
  }

  let nextIndex = state.currentIndex;
  if (currentStop && currentStop.id === landmarkId) {
    const nextUnvisitedAfter = TOUR_STOPS.findIndex(
      (s, idx) => idx > state.currentIndex && !visitedStopIds.includes(s.id),
    );
    const anyUnvisited = TOUR_STOPS.findIndex((s) => !visitedStopIds.includes(s.id));
    nextIndex = nextUnvisitedAfter >= 0 ? nextUnvisitedAfter : anyUnvisited >= 0 ? anyUnvisited : state.currentIndex;
  }

  return {
    ...state,
    currentIndex: nextIndex,
    visitedStopIds,
    completed: false,
  };
}

export function endGuidedTour(state: TourState): TourState {
  return {
    ...state,
    active: false,
  };
}

export function getActiveTourStop(state: TourState): {
  stop: TourStopDef;
  landmark: WorldLandmark | null;
} {
  const safeIdx = Math.max(0, Math.min(TOUR_STOPS.length - 1, state.currentIndex));
  const stop = TOUR_STOPS[safeIdx];
  const landmark = WORLD_LANDMARKS.find((l) => l.id === stop.id) || null;
  return { stop, landmark };
}

export function computeDistanceAndBearing(
  px: number,
  pz: number,
  tx: number,
  tz: number,
): { distanceMeters: number; bearingLabel: string } {
  const dx = tx - px;
  const dz = tz - pz;
  const distanceMeters = Math.round(Math.hypot(dx, dz));
  // -Z is North in Three.js world space, +X is East
  const angleRad = Math.atan2(dx, -dz);
  const deg = ((angleRad * 180) / Math.PI + 360) % 360;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const bearingLabel = dirs[Math.round(deg / 45) % 8];
  return { distanceMeters, bearingLabel };
}
