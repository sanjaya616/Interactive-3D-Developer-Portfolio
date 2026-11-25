import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SKILL_ORB_LINKS,
  buildMissionJournal,
  getAchievementProgress,
  getAllAchievementsProgress,
  type ProgressionInput,
} from './progression.ts';

const EMPTY_INPUT: ProgressionInput = {
  unlockedAchievements: [],
  discoveredLandmarks: [],
  openedProjects: [],
  collectedIds: [],
  discoveredSecrets: [],
  completedChallenges: [],
  bestLapSeconds: null,
  distanceDrivenMeters: 0,
  tourVisitedStops: [],
};

test('Achievement progress differentiates locked, in-progress, and unlocked states accurately', () => {
  const locked = getAchievementProgress('world-explorer', EMPTY_INPUT);
  assert.equal(locked.status, 'locked');
  assert.equal(locked.current, 0);
  assert.equal(locked.total, 9);

  const partial = getAchievementProgress('world-explorer', {
    ...EMPTY_INPUT,
    discoveredLandmarks: ['studio', 'projects', 'workshop'],
  });
  assert.equal(partial.status, 'in-progress');
  assert.equal(partial.current, 3);
  assert.equal(partial.total, 9);
  assert.equal(partial.progressLabel, '3/9 Zones');

  const done = getAchievementProgress('tech-collector', {
    ...EMPTY_INPUT,
    unlockedAchievements: ['tech-collector'],
    collectedIds: ['orb-react', 'orb-three', 'orb-sql', 'orb-php', 'orb-kotlin', 'orb-flutter', 'orb-git', 'orb-arduino'],
  });
  assert.equal(done.status, 'unlocked');
  assert.equal(done.pct, 100);
  assert.ok(done.rewardLabel && done.rewardLabel.includes('Emerald Matrix'));

  const all = getAllAchievementsProgress(EMPTY_INPUT);
  assert.equal(all.length, 10);
});

test('Mission journal organizes all 5 categories and preserves completion state', () => {
  const journal = buildMissionJournal({
    ...EMPTY_INPUT,
    discoveredLandmarks: ['studio', 'projects'],
    completedChallenges: ['delivery', 'bughunt'],
    collectedIds: ['orb-react', 'token-plaza'],
    discoveredSecrets: ['secret-pine-sanctuary'],
  });

  const sections = new Set(journal.map((e) => e.section));
  assert.deepEqual([...sections].sort(), ['challenges', 'collectibles', 'exploration', 'secrets']);

  const completed = journal.filter((e) => e.completed);
  assert.equal(completed.length, 3); // delivery, bughunt, secret-pine-sanctuary
});

test('All 8 Skill Orbs map to documented skill items cleanly', () => {
  assert.equal(SKILL_ORB_LINKS.length, 8);
  for (const link of SKILL_ORB_LINKS) {
    assert.ok(link.orbId.startsWith('orb-'));
    assert.ok(link.skillNames.length >= 1);
  }
});
