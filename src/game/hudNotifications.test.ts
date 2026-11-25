import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceHudNotificationQueue,
  enqueueHudNotification,
  type HudNotificationItem,
} from './hudNotifications';

test('enqueueHudNotification adds distinct notifications and skips exact duplicates', () => {
  let queue: HudNotificationItem[] = [];
  queue = enqueueHudNotification(
    queue,
    { kind: 'discovery', title: 'The Studio', subtitle: 'Zone Discovered' },
    1,
  );
  queue = enqueueHudNotification(
    queue,
    { kind: 'discovery', title: 'The Studio', subtitle: 'Zone Discovered' },
    2,
  );
  assert.equal(queue.length, 1);
  assert.equal(queue[0].id, 'hud-notif-1');
  assert.equal(queue[0].durationMs, 2800);
});

test('enqueueHudNotification preserves active item and prioritizes achievements over low-priority pickups when full', () => {
  let queue: HudNotificationItem[] = [];
  queue = enqueueHudNotification(queue, { kind: 'info', title: 'First active' }, 1);
  queue = enqueueHudNotification(queue, { kind: 'collectible', title: 'Orb 1/8' }, 2);
  queue = enqueueHudNotification(queue, { kind: 'collectible', title: 'Orb 2/8' }, 3);
  queue = enqueueHudNotification(queue, { kind: 'discovery', title: 'Lookout Hill' }, 4);
  queue = enqueueHudNotification(
    queue,
    { kind: 'achievement', title: 'Master Explorer', points: 50 },
    5,
  );

  assert.equal(queue.length, 4);
  assert.equal(queue[0].title, 'First active');
  assert.ok(queue.some((q) => q.kind === 'achievement' && q.title === 'Master Explorer'));
});

test('advanceHudNotificationQueue pops head or removes specific notification id', () => {
  let queue: HudNotificationItem[] = [];
  queue = enqueueHudNotification(queue, { kind: 'discovery', title: 'A' }, 1);
  queue = enqueueHudNotification(queue, { kind: 'race', title: 'B' }, 2);
  queue = advanceHudNotificationQueue(queue);
  assert.equal(queue.length, 1);
  assert.equal(queue[0].title, 'B');
  queue = advanceHudNotificationQueue(queue, 'hud-notif-2');
  assert.equal(queue.length, 0);
});
