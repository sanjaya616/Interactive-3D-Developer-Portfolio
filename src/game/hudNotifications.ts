export type HudNotificationKind =
  | 'discovery'
  | 'collectible'
  | 'challenge'
  | 'achievement'
  | 'race'
  | 'info';

export interface HudNotificationItem {
  id: string;
  kind: HudNotificationKind;
  title: string;
  subtitle?: string;
  points?: number;
  durationMs: number;
}

const PRIORITY_BY_KIND: Record<HudNotificationKind, number> = {
  achievement: 4,
  race: 3,
  challenge: 3,
  discovery: 2,
  collectible: 1,
  info: 1,
};

export function enqueueHudNotification(
  queue: HudNotificationItem[],
  item: Omit<HudNotificationItem, 'id' | 'durationMs'> & { durationMs?: number },
  seq: number,
): HudNotificationItem[] {
  const cleanTitle = item.title.trim();
  if (!cleanTitle) return queue;

  // Avoid duplicate back-to-back identical notifications
  const dup = queue.some(
    (entry) => entry.kind === item.kind && entry.title === cleanTitle && entry.subtitle === item.subtitle,
  );
  if (dup) return queue;

  const entry: HudNotificationItem = {
    id: `hud-notif-${seq}`,
    kind: item.kind,
    title: cleanTitle,
    subtitle: item.subtitle,
    points: item.points,
    durationMs:
      item.durationMs ??
      (item.kind === 'achievement' ? 3600 : item.kind === 'race' ? 3400 : 2800),
  };

  // Keep queue bounded cleanly (max 4 pending, preserving highest-priority alerts)
  const next = [...queue, entry];
  if (next.length <= 4) return next;

  const [active, ...waiting] = next;
  waiting.sort((a, b) => PRIORITY_BY_KIND[b.kind] - PRIORITY_BY_KIND[a.kind]);
  return [active, ...waiting.slice(0, 3)];
}

export function advanceHudNotificationQueue(
  queue: HudNotificationItem[],
  dismissId?: string,
): HudNotificationItem[] {
  if (queue.length === 0) return queue;
  if (!dismissId) return queue.slice(1);
  return queue.filter((item) => item.id !== dismissId);
}
