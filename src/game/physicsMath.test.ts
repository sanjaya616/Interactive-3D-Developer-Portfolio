import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampDt,
  computeBridgeSurfaceY,
  computeDrivingParamsForVehicle,
  computeGroundHeight,
  findNearestLandmark,
  getZoneName,
  speedMsToKmh,
  stepPlanarDriving,
} from './physicsMath';
import { ChallengeManager } from './challengeController';
import {
  ACHIEVEMENTS_LIST,
  DEVELOPER_PROFILE,
  INITIAL_LEADERBOARD,
  JOURNEY_MILESTONES,
  NAVIGATION_ROUTES,
  PADDOCK_CHECKPOINTS,
  PORTFOLIO_PROJECTS,
  SECRET_LOCATIONS,
  SERVICES_LIST,
  SKILL_CATEGORIES,
  SKILLS_CATALOG,
  SQL_CHALLENGE_GATES,
  TIME_TRIAL_CHECKPOINTS,
  WORLD_COLLECTIBLES,
  WORLD_LANDMARKS,
} from '../data/portfolioData';
import { DEFAULT_VEHICLE, SAVE_VERSION, parseVersionedSave } from '../state/saveValidation';

test('clampDt bounds frame delta safely', () => {
  assert.equal(clampDt(0.016), 0.016);
  assert.equal(clampDt(0.5), 0.05);
  assert.ok(clampDt(-1) > 0);
});

test('stepPlanarDriving accelerates forward, steers, drifts, boosts, brakes, and jumps', () => {
  const accelStep = stepPlanarDriving(
    { forwardSpeed: 0, lateralSpeed: 0, boostCharge: 100, isGrounded: true },
    { throttle: 1, steer: 0, brake: false, boost: false, jump: false },
    0.05,
  );
  assert.ok(accelStep.nextForwardSpeed > 1.0);
  assert.equal(accelStep.isBoosting, false);
  assert.equal(accelStep.isDrifting, false);
  assert.equal(accelStep.jumpImpulse, 0);

  const steerStep = stepPlanarDriving(
    { forwardSpeed: 10, lateralSpeed: 0, boostCharge: 100, isGrounded: true },
    { throttle: 1, steer: 1, brake: false, boost: true, jump: true },
    0.05,
  );
  assert.ok(steerStep.yawDelta > 0);
  assert.equal(steerStep.isBoosting, true);
  assert.ok(steerStep.nextBoostCharge < 100);
  assert.ok(steerStep.jumpImpulse > 0);

  // Handbrake drifting builds lateral slip and sharpens turn rate
  const normalTurn = stepPlanarDriving(
    { forwardSpeed: 16, lateralSpeed: 0, boostCharge: 100, isGrounded: true },
    { throttle: 1, steer: 1, brake: false, handbrake: false, boost: false, jump: false },
    0.05,
  );
  const driftStep = stepPlanarDriving(
    { forwardSpeed: 16, lateralSpeed: 0, boostCharge: 100, isGrounded: true },
    { throttle: 1, steer: 1, brake: false, handbrake: true, boost: false, jump: false },
    0.05,
  );
  assert.equal(driftStep.isDrifting, true);
  assert.ok(Math.abs(driftStep.nextLateralSpeed) > 1.0);
  assert.ok(driftStep.yawDelta > normalTurn.yawDelta);

  const brakeStep = stepPlanarDriving(
    { forwardSpeed: 12, lateralSpeed: 0, boostCharge: 50, isGrounded: true },
    { throttle: 0, steer: 0, brake: true, boost: false, jump: false },
    0.05,
  );
  assert.ok(brakeStep.nextForwardSpeed < 12);

  const airStep = stepPlanarDriving(
    { forwardSpeed: 10, lateralSpeed: 0, boostCharge: 50, isGrounded: false },
    { throttle: 1, steer: 0, brake: false, boost: false, jump: true },
    0.05,
  );
  assert.equal(airStep.jumpImpulse, 0);
});

test('computeDrivingParamsForVehicle scales speed, suspension grip, and boost by tiers', () => {
  const tier1 = computeDrivingParamsForVehicle({
    chassisType: 'buggy',
    wheelStyle: 'all-terrain',
    engineTier: 1,
    suspensionTier: 1,
    boostTier: 1,
  });
  const tier3Rally = computeDrivingParamsForVehicle({
    chassisType: 'rally',
    wheelStyle: 'sport',
    engineTier: 3,
    suspensionTier: 3,
    boostTier: 3,
  });

  assert.ok(tier3Rally.maxForwardSpeed > tier1.maxForwardSpeed);
  assert.ok(tier3Rally.engineAccel > tier1.engineAccel);
  assert.ok(tier3Rally.lateralGrip > tier1.lateralGrip);
  assert.ok(tier3Rally.jumpVelocity > tier1.jumpVelocity);
  assert.ok(tier3Rally.boostMultiplier > tier1.boostMultiplier);
  assert.ok(tier3Rally.boostRechargeRate > tier1.boostRechargeRate);
});

test('speedMsToKmh converts to integer km/h', () => {
  assert.equal(speedMsToKmh(10), 36);
  assert.equal(speedMsToKmh(-5), 18);
});

test('computeGroundHeight models flat plaza, Lookout Hill plateau, water basins, and bridge surface', () => {
  assert.equal(computeGroundHeight(0, 0), 0);
  assert.equal(computeGroundHeight(-36, -34), 0);
  assert.equal(computeGroundHeight(0, -72), 3.6);
  assert.ok(computeGroundHeight(0, -49) > 1.0 && computeGroundHeight(0, -49) < 3.0);
  assert.ok(computeGroundHeight(45, -22) < -1.0);
  assert.ok(computeGroundHeight(-18, 66) < -1.0);
  assert.equal(computeBridgeSurfaceY(40, -22), 0.9);
  assert.equal(computeBridgeSurfaceY(0, 0), null);
});

test('all 9 destinations are distinct, non-overlapping, and detected cleanly', () => {
  assert.equal(WORLD_LANDMARKS.length, 9);

  for (let i = 0; i < WORLD_LANDMARKS.length; i++) {
    for (let j = i + 1; j < WORLD_LANDMARKS.length; j++) {
      const a = WORLD_LANDMARKS[i];
      const b = WORLD_LANDMARKS[j];
      const dist = Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z);
      assert.ok(dist >= 22, `${a.title} and ${b.title} too close (${dist.toFixed(1)}m)`);
    }
  }

  for (const lm of WORLD_LANDMARKS) {
    const hit = findNearestLandmark(lm.position.x, lm.position.z, WORLD_LANDMARKS);
    assert.equal(hit.landmark?.id, lm.id);
    assert.equal(getZoneName(lm.position.x, lm.position.z, WORLD_LANDMARKS), lm.zoneLabel);
  }

  assert.equal(getZoneName(0, 0, WORLD_LANDMARKS), 'Starting Plaza');
  assert.equal(getZoneName(40, -22, WORLD_LANDMARKS), 'Emerald Lagoon Bridge');
  assert.equal(getZoneName(-42, -4, WORLD_LANDMARKS), 'West Ridge Tunnel');
});

test('parseVersionedSave handles null, corrupted JSON, partial data, and valid v3 saves', () => {
  const empty = parseVersionedSave(null);
  assert.equal(empty.version, SAVE_VERSION);
  assert.equal(empty.settings.weatherMode, 'sunny');
  assert.equal(empty.settings.audioEnabled, false);
  assert.equal(empty.settings.musicEnabled, true);
  assert.equal(empty.settings.sfxVolume, 0.8);
  assert.equal(empty.settings.musicVolume, 0.45);
  assert.equal(empty.settings.reducedMotion, false);

  const broken = parseVersionedSave('{not-valid-json');
  assert.equal(broken.version, SAVE_VERSION);
  assert.equal(broken.vehicle.chassisType, 'buggy');

  const partial = parseVersionedSave(
    JSON.stringify({
      settings: {
        weatherMode: 'night',
        cameraMode: 'invalid-cam',
        sfxVolume: 4.5,
        musicVolume: -0.2,
        musicEnabled: false,
        reducedMotion: true,
      },
      vehicle: { engineTier: 3, boostTier: 99, plateText: 'sanjaya999' },
      collectedIds: ['orb-react', 42, 'orb-react'],
      bestLapSeconds: 18.42,
      bestLapGhost: [
        { t: 0, x: -66, y: 0.6, z: 18, yaw: 0 },
        { t: 1, x: 'bad' },
      ],
    }),
  );
  assert.equal(partial.settings.weatherMode, 'night');
  assert.equal(partial.settings.cameraMode, 'chase');
  assert.equal(partial.settings.sfxVolume, 1);
  assert.equal(partial.settings.musicVolume, 0);
  assert.equal(partial.settings.musicEnabled, false);
  assert.equal(partial.settings.reducedMotion, true);
  assert.equal(partial.vehicle.engineTier, 3);
  assert.equal(partial.vehicle.boostTier, 1);
  assert.equal(partial.vehicle.plateText, 'SANJAYA9');
  assert.deepEqual(partial.collectedIds, ['orb-react']);
  assert.equal(partial.bestLapSeconds, 18.42);
  assert.equal(partial.bestLapGhost.length, 1);
});

test('ChallengeManager enforces SQL anti-skip order, RFID 3-step, Delivery 3-stop, Time Trial, and Paddock Race', () => {
  const cm = new ChallengeManager();

  // 1. SQL Query Valley anti-skip + ordered completion
  cm.startChallenge('sql');
  // Driving straight to WHERE (48, -84) before SELECT must trigger feedback and stay at step 0
  cm.tick(SQL_CHALLENGE_GATES[3].x, SQL_CHALLENGE_GATES[3].z, 0.05);
  assert.equal(cm.getActiveChallengeHud().progressCurrent, 0);
  assert.ok(cm.getActiveChallengeHud().feedbackText?.includes('Out of order'));

  // Passing in order SELECT -> FROM -> JOIN -> WHERE completes the challenge and unlocks DATABASE MASTER
  let sqlDoneFx = cm.tick(SQL_CHALLENGE_GATES[0].x, SQL_CHALLENGE_GATES[0].z, 0.05);
  assert.equal(cm.getActiveChallengeHud().progressCurrent, 1);
  sqlDoneFx = cm.tick(SQL_CHALLENGE_GATES[1].x, SQL_CHALLENGE_GATES[1].z, 0.05);
  sqlDoneFx = cm.tick(SQL_CHALLENGE_GATES[2].x, SQL_CHALLENGE_GATES[2].z, 0.05);
  sqlDoneFx = cm.tick(SQL_CHALLENGE_GATES[3].x, SQL_CHALLENGE_GATES[3].z, 0.05);
  assert.equal(cm.getActiveChallengeHud().status, 'completed');
  assert.equal(sqlDoneFx.unlockAchievementId, 'database-master');

  // 2. RFID 3-step sequence
  cm.startChallenge('rfid');
  const cardFx = cm.tick(54, 42, 0.05);
  assert.equal(cardFx.rfidCardCollected, true);
  const scanFx = cm.tick(44, 48, 0.05);
  assert.equal(scanFx.securityGateOpen, true);
  const exitFx = cm.tick(48, 55, 0.05);
  assert.equal(exitFx.unlockAchievementId, 'security-expert');

  // 3. Delivery 3-stop chain
  cm.startChallenge('delivery');
  const studio = WORLD_LANDMARKS.find((l) => l.id === 'studio')!;
  const workshop = WORLD_LANDMARKS.find((l) => l.id === 'workshop')!;
  const signalHouse = WORLD_LANDMARKS.find((l) => l.id === 'signal-house')!;
  cm.tick(studio.position.x, studio.position.z, 0.05);
  assert.equal(cm.getActiveChallengeHud().progressCurrent, 1);
  cm.tick(workshop.position.x, workshop.position.z, 0.05);
  assert.equal(cm.getActiveChallengeHud().progressCurrent, 2);
  const delFx = cm.tick(signalHouse.position.x, signalHouse.position.z, 0.05);
  assert.equal(delFx.unlockAchievementId, 'delivery-expert');

  // 4. Time trial countdown failure + completion
  cm.startChallenge('timetrial');
  cm.tick(0, 0, 46);
  assert.equal(cm.getActiveChallengeHud().status, 'failed');
  cm.startChallenge('timetrial');
  let ttFx = {};
  for (const cp of TIME_TRIAL_CHECKPOINTS) {
    ttFx = cm.tick(cp.x, cp.z, 0.5);
  }
  assert.equal(cm.getActiveChallengeHud().status, 'completed');
  assert.equal((ttFx as { completeChallengeId?: string }).completeChallengeId, 'timetrial');

  // 5. Paddock race 3-2-1-GO countdown + anti-skip checkpoints + ghost recording
  cm.startRace(true);
  assert.equal(cm.getRacePhase(), 'countdown');
  assert.equal(cm.isThrottleLocked(), true);
  cm.tick(-66, 18, 3.1);
  assert.equal(cm.getRacePhase(), 'racing');
  assert.equal(cm.isThrottleLocked(), false);

  for (const cp of PADDOCK_CHECKPOINTS) {
    cm.sampleGhostPose(0.2, cp.x, 0.6, cp.z, 0);
    cm.tick(cp.x, cp.z, 1.5);
  }
  assert.equal(cm.getRaceHudState(true).checkpointIndex, 4);
  const raceEndFx = cm.tick(-66, 18, 0.2);
  assert.equal(cm.getRacePhase(), 'finished');
  assert.ok(raceEndFx.raceFinished && raceEndFx.raceFinished.lapSeconds > 5);

  // 6. Starting Paddock Race clears any running challenge, and cancelChallenge resets RFID/SQL props
  cm.startChallenge('sql');
  assert.equal(cm.getActiveChallengeId(), 'sql');
  const raceOverrideFx = cm.startRace(false);
  assert.equal(cm.getActiveChallengeId(), null);
  assert.equal(raceOverrideFx.sqlNextIdx, 0);
  cm.stopRace();
  assert.equal(cm.getActiveChallengeHud().id, null);

  cm.startChallenge('rfid');
  cm.tick(54, 42, 0.05);
  const cancelFx = cm.cancelChallenge();
  assert.equal(cm.getActiveChallengeId(), null);
  assert.equal(cancelFx.rfidCardCollected, false);
  assert.equal(cancelFx.securityGateOpen, false);
});

test('centralized Sanjaya Lakshan portfolio, 10 achievements, and 20 collectibles integrity check', () => {
  assert.equal(DEVELOPER_PROFILE.name, 'Sanjaya Lakshan');
  assert.equal(DEVELOPER_PROFILE.email, 'sanjayalasnan327@gmail.com');
  assert.equal(PORTFOLIO_PROJECTS.length, 11);
  assert.equal(SKILL_CATEGORIES.length, 5);
  assert.equal(SKILLS_CATALOG.length, 24);
  assert.equal(JOURNEY_MILESTONES.length, 5);
  assert.equal(SERVICES_LIST.length, 6);
  assert.equal(INITIAL_LEADERBOARD.length, 0);
  assert.equal(DEFAULT_VEHICLE.chassisType, 'buggy');
  assert.equal(DEFAULT_VEHICLE.headlightEffect, 'warm-halogen');

  // Exact 10 requested achievements
  assert.equal(ACHIEVEMENTS_LIST.length, 10);
  assert.deepEqual(
    ACHIEVEMENTS_LIST.map((a) => a.id),
    [
      'first-drive',
      'world-explorer',
      'project-explorer',
      'tech-collector',
      'race-champion',
      'delivery-expert',
      'database-master',
      'security-expert',
      'secret-finder',
      'complete-explorer',
    ],
  );

  // 20 collectibles split: 8 orbs, 6 tokens, 4 fragments, 2 secrets
  assert.equal(WORLD_COLLECTIBLES.length, 20);
  assert.equal(WORLD_COLLECTIBLES.filter((c) => c.kind === 'orb').length, 8);
  assert.equal(WORLD_COLLECTIBLES.filter((c) => c.kind === 'token').length, 6);
  assert.equal(WORLD_COLLECTIBLES.filter((c) => c.kind === 'fragment').length, 4);
  assert.equal(WORLD_COLLECTIBLES.filter((c) => c.kind === 'secret').length, 2);
  assert.equal(SECRET_LOCATIONS.length, 2);

  // Verify no fabricated project URLs exist and Learning Management System separates implemented vs planned
  const lms = PORTFOLIO_PROJECTS[0];
  assert.equal(lms.title, 'Learning Management System');
  assert.equal(lms.implementedFeatures.length, 5);
  assert.equal(lms.plannedFeatures.length, 3);
  for (const p of PORTFOLIO_PROJECTS) {
    assert.equal(p.links.liveUrl, '');
    assert.equal(p.links.repoUrl, '');
  }

  assert.ok(NAVIGATION_ROUTES.some((r) => r.path === '/classic'));
});
