import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOUR_STOPS,
  computeDistanceAndBearing,
  createInitialTourState,
  endGuidedTour,
  getActiveTourStop,
  recordTourStopVisited,
  restartGuidedTour,
  skipTourStop,
  startGuidedTour,
} from './guidedTour.ts';

test('Guided tour covers the 5 portfolio destinations in canonical sequence', () => {
  assert.deepEqual(
    TOUR_STOPS.map((s) => s.id),
    ['studio', 'projects', 'workshop', 'lookout', 'signal-house'],
  );

  let state = startGuidedTour([]);
  assert.equal(state.active, true);
  assert.equal(state.currentIndex, 0);
  assert.equal(getActiveTourStop(state).stop.id, 'studio');

  // Visiting current stop records progress and advances to next stop
  state = recordTourStopVisited(state, 'studio');
  assert.deepEqual(state.visitedStopIds, ['studio']);
  assert.equal(getActiveTourStop(state).stop.id, 'projects');

  // Skipping advances cleanly
  state = skipTourStop(state);
  assert.equal(getActiveTourStop(state).stop.id, 'workshop');

  // Visiting remaining stops completes tour
  state = recordTourStopVisited(state, 'workshop');
  state = recordTourStopVisited(state, 'lookout');
  state = recordTourStopVisited(state, 'signal-house');
  state = recordTourStopVisited(state, 'projects');
  assert.equal(state.completed, true);
  assert.equal(state.active, false);
  assert.equal(state.visitedStopIds.length, 5);
});

test('Guided tour preserves visited stops across end/start and supports full restart', () => {
  let state = createInitialTourState(['studio', 'projects']);
  assert.equal(state.visitedStopIds.length, 2);

  state = startGuidedTour(['studio', 'projects']);
  assert.equal(getActiveTourStop(state).stop.id, 'workshop');

  state = endGuidedTour(state);
  assert.equal(state.active, false);
  assert.deepEqual(state.visitedStopIds, ['studio', 'projects']);

  state = restartGuidedTour();
  assert.equal(state.active, true);
  assert.equal(state.currentIndex, 0);
  assert.equal(state.visitedStopIds.length, 0);
});

test('computeDistanceAndBearing computes Euclidean meter distance and cardinal heading', () => {
  const north = computeDistanceAndBearing(0, 0, 0, -50);
  assert.equal(north.distanceMeters, 50);
  assert.equal(north.bearingLabel, 'N');

  const southEast = computeDistanceAndBearing(0, 0, 30, 30);
  assert.equal(southEast.distanceMeters, 42);
  assert.equal(southEast.bearingLabel, 'SE');
});
