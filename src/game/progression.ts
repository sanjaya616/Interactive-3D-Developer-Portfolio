import {
  ACHIEVEMENTS_LIST,
  CORE_REQUIRED_ACHIEVEMENT_IDS,
  GARAGE_PAINT_PRESETS,
  PORTFOLIO_PROJECTS,
  SECRET_LOCATIONS,
  SKILLS_CATALOG,
  WORLD_COLLECTIBLES,
  WORLD_LANDMARKS,
} from '../data/portfolioData.ts';

export interface ProgressionInput {
  unlockedAchievements: string[];
  discoveredLandmarks: string[];
  openedProjects: string[];
  collectedIds: string[];
  discoveredSecrets: string[];
  completedChallenges: string[];
  bestLapSeconds: number | null;
  distanceDrivenMeters: number;
  tourVisitedStops?: string[];
}

export type AchievementStatus = 'locked' | 'in-progress' | 'unlocked';

export interface AchievementProgressInfo {
  achievementId: string;
  current: number;
  total: number;
  pct: number;
  status: AchievementStatus;
  progressLabel: string;
  rewardLabel?: string;
}

export type MissionSectionId =
  | 'exploration'
  | 'challenges'
  | 'collectibles'
  | 'secrets'
  | 'completed';

export interface MissionJournalEntry {
  id: string;
  section: Exclude<MissionSectionId, 'completed'>;
  title: string;
  description: string;
  zoneLabel: string;
  landmarkId?: string;
  current: number;
  total: number;
  completed: boolean;
  rewardText: string;
}

export interface SkillOrbInfo {
  orbId: string;
  orbLabel: string;
  techFocus: string;
  skillNames: string[];
  hint: string;
}

const TOTAL_LANDMARKS = WORLD_LANDMARKS.length;
const TOTAL_PROJECTS = PORTFOLIO_PROJECTS.length;
const TOTAL_ORBS = WORLD_COLLECTIBLES.filter((c) => c.kind === 'orb').length;
const TOTAL_TOKENS = WORLD_COLLECTIBLES.filter((c) => c.kind === 'token').length;
const TOTAL_FRAGMENTS = WORLD_COLLECTIBLES.filter((c) => c.kind === 'fragment').length;
const TOTAL_SECRET_RELICS = WORLD_COLLECTIBLES.filter((c) => c.kind === 'secret').length;

export function getAchievementProgress(
  achievementId: string,
  input: ProgressionInput,
): AchievementProgressInfo {
  const isUnlocked = input.unlockedAchievements.includes(achievementId);
  const linkedPaint = GARAGE_PAINT_PRESETS.find((p) => p.unlockAchievementId === achievementId);
  const rewardLabel = linkedPaint ? `Unlocks ${linkedPaint.name.replace(' (Unlock)', '')} Paint` : undefined;

  const orbsCount = input.collectedIds.filter((id) => id.startsWith('orb-')).length;
  const coreUnlockedCount = CORE_REQUIRED_ACHIEVEMENT_IDS.filter((id) =>
    input.unlockedAchievements.includes(id),
  ).length;

  let current = 0;
  let total = 1;
  let unit = 'done';

  switch (achievementId) {
    case 'first-drive': {
      total = 1;
      current = isUnlocked || input.distanceDrivenMeters >= 4 ? 1 : 0;
      unit = 'Drive';
      break;
    }
    case 'world-explorer': {
      total = TOTAL_LANDMARKS;
      current = isUnlocked ? total : Math.min(total, input.discoveredLandmarks.length);
      unit = 'Zones';
      break;
    }
    case 'project-explorer': {
      total = TOTAL_PROJECTS;
      current = isUnlocked ? total : Math.min(total, input.openedProjects.length);
      unit = 'Projects';
      break;
    }
    case 'tech-collector': {
      total = TOTAL_ORBS;
      current = isUnlocked ? total : Math.min(total, orbsCount);
      unit = 'Orbs';
      break;
    }
    case 'race-champion': {
      total = 1;
      current = isUnlocked || input.bestLapSeconds !== null ? 1 : 0;
      unit = 'Lap';
      break;
    }
    case 'delivery-expert': {
      total = 1;
      current = isUnlocked || input.completedChallenges.includes('delivery') ? 1 : 0;
      unit = 'Run';
      break;
    }
    case 'database-master': {
      total = 1;
      current = isUnlocked || input.completedChallenges.includes('sql') ? 1 : 0;
      unit = 'Circuit';
      break;
    }
    case 'security-expert': {
      total = 1;
      current = isUnlocked || input.completedChallenges.includes('rfid') ? 1 : 0;
      unit = 'Gate';
      break;
    }
    case 'secret-finder': {
      total = 1;
      current = isUnlocked || input.discoveredSecrets.length > 0 ? 1 : 0;
      unit = 'Secret';
      break;
    }
    case 'complete-explorer': {
      total = CORE_REQUIRED_ACHIEVEMENT_IDS.length;
      current = isUnlocked ? total : Math.min(total, coreUnlockedCount);
      unit = 'Achievements';
      break;
    }
    default: {
      total = 1;
      current = isUnlocked ? 1 : 0;
      unit = 'Done';
    }
  }

  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const status: AchievementStatus = isUnlocked
    ? 'unlocked'
    : current > 0
      ? 'in-progress'
      : 'locked';

  return {
    achievementId,
    current,
    total,
    pct,
    status,
    progressLabel: `${current}/${total} ${unit}`,
    rewardLabel,
  };
}

export function getAllAchievementsProgress(input: ProgressionInput): AchievementProgressInfo[] {
  return ACHIEVEMENTS_LIST.map((a) => getAchievementProgress(a.id, input));
}

export function buildMissionJournal(input: ProgressionInput): MissionJournalEntry[] {
  const orbsFound = input.collectedIds.filter((id) => id.startsWith('orb-')).length;
  const tokensFound = input.collectedIds.filter((id) => id.startsWith('token-')).length;
  const fragsFound = input.collectedIds.filter((id) => id.startsWith('frag-')).length;
  const secretsFound = input.collectedIds.filter((id) => id.startsWith('secret-')).length;
  const tourCount = input.tourVisitedStops?.length ?? 0;

  const entries: MissionJournalEntry[] = [
    // 1. Main Portfolio Exploration
    {
      id: 'exp-zones',
      section: 'exploration',
      title: 'Chart All 9 World Destinations',
      description: 'Drive across the island to discover every showcase building, circuit, and challenge hub.',
      zoneLabel: 'Whole World',
      landmarkId: 'studio',
      current: Math.min(TOTAL_LANDMARKS, input.discoveredLandmarks.length),
      total: TOTAL_LANDMARKS,
      completed: input.discoveredLandmarks.length >= TOTAL_LANDMARKS,
      rewardText: 'Unlocks WORLD EXPLORER (80 pts + Sandstone Olive Livery)',
    },
    {
      id: 'exp-projects',
      section: 'exploration',
      title: 'Inspect All 11 Portfolio Projects',
      description: 'Browse the Project Pavilion gallery and inspect every documented project case study.',
      zoneLabel: 'Project Pavilion',
      landmarkId: 'projects',
      current: Math.min(TOTAL_PROJECTS, input.openedProjects.length),
      total: TOTAL_PROJECTS,
      completed: input.openedProjects.length >= TOTAL_PROJECTS,
      rewardText: 'Unlocks PROJECT EXPLORER (60 pts)',
    },
    {
      id: 'exp-tour',
      section: 'exploration',
      title: '5-Stop Guided Portfolio Tour',
      description: 'Visit The Studio, Project Pavilion, The Workshop, Lookout Hill & Signal House.',
      zoneLabel: 'Guided Tour',
      landmarkId: 'studio',
      current: Math.min(5, tourCount),
      total: 5,
      completed: tourCount >= 5,
      rewardText: 'Guided Exploration Complete',
    },

    // 2. Driving Challenges (8 activities)
    {
      id: 'ch-delivery',
      section: 'challenges',
      title: '3-Stop Express Parcel Delivery',
      description: 'Deliver parcels from Delivery Depot to Studio, Workshop & Signal House.',
      zoneLabel: 'Delivery Depot',
      landmarkId: 'delivery',
      current: input.completedChallenges.includes('delivery') ? 1 : 0,
      total: 1,
      completed: input.completedChallenges.includes('delivery'),
      rewardText: 'Unlocks DELIVERY EXPERT + Express Amber Paint',
    },
    {
      id: 'ch-sql',
      section: 'challenges',
      title: 'Query Valley SQL Circuit',
      description: 'Pass SELECT → FROM → JOIN → WHERE gates in strict relational order.',
      zoneLabel: 'Query Valley',
      landmarkId: 'query-valley',
      current: input.completedChallenges.includes('sql') ? 1 : 0,
      total: 1,
      completed: input.completedChallenges.includes('sql'),
      rewardText: 'Unlocks DATABASE MASTER + Deep Query Blue Paint',
    },
    {
      id: 'ch-rfid',
      section: 'challenges',
      title: 'RFID Security Gate Clearance',
      description: 'Collect the RC522 keycard, scan at Signal Workshop, and drive through the boom arm.',
      zoneLabel: 'Signal Workshop',
      landmarkId: 'signal-workshop',
      current: input.completedChallenges.includes('rfid') ? 1 : 0,
      total: 1,
      completed: input.completedChallenges.includes('rfid'),
      rewardText: 'Unlocks SECURITY EXPERT + Crimson Signal Paint',
    },
    {
      id: 'ch-race',
      section: 'challenges',
      title: 'The Paddock Time Trial Lap',
      description: 'Finish all 4 sectors on the Paddock Circuit after the 3-2-1-GO countdown.',
      zoneLabel: 'The Paddock',
      landmarkId: 'paddock',
      current: input.bestLapSeconds !== null || input.completedChallenges.includes('race') ? 1 : 0,
      total: 1,
      completed: input.bestLapSeconds !== null || input.completedChallenges.includes('race'),
      rewardText: 'Unlocks RACE CHAMPION + Midnight Circuit Paint',
    },
    {
      id: 'ch-bughunt',
      section: 'challenges',
      title: 'Workshop Bug Hunt',
      description: 'Locate and squash all 3 glitch bugs around The Workshop lab yard.',
      zoneLabel: 'The Workshop',
      landmarkId: 'workshop',
      current: input.completedChallenges.includes('bughunt') ? 1 : 0,
      total: 1,
      completed: input.completedChallenges.includes('bughunt'),
      rewardText: 'Lab Challenge Completion Badge',
    },
    {
      id: 'ch-memory',
      section: 'challenges',
      title: 'Lookout Summit Memory Sequence',
      description: 'Observe the 4 illuminated hilltop pads and repeat the sequence by car.',
      zoneLabel: 'Lookout Hill',
      landmarkId: 'lookout',
      current: input.completedChallenges.includes('memory') ? 1 : 0,
      total: 1,
      completed: input.completedChallenges.includes('memory'),
      rewardText: 'Summit Sequence Completion Badge',
    },
    {
      id: 'ch-treasure',
      section: 'challenges',
      title: '4-Chest World Treasure Hunt',
      description: 'Seek 4 hidden chests near Studio, Pine Trail, Bridge Pier, and South Cove.',
      zoneLabel: 'The Studio',
      landmarkId: 'studio',
      current: input.completedChallenges.includes('treasure') ? 1 : 0,
      total: 1,
      completed: input.completedChallenges.includes('treasure'),
      rewardText: 'Treasure Hunt Completion Badge',
    },
    {
      id: 'ch-timetrial',
      section: 'challenges',
      title: '45-Second Pavilion Time Trial',
      description: 'Clear 5 ring gates around Lagoon Bridge and Central Ring before the timer expires.',
      zoneLabel: 'Project Pavilion',
      landmarkId: 'projects',
      current: input.completedChallenges.includes('timetrial') ? 1 : 0,
      total: 1,
      completed: input.completedChallenges.includes('timetrial'),
      rewardText: 'Speed Sprint Completion Badge',
    },

    // 3. Collectibles
    {
      id: 'col-orbs',
      section: 'collectibles',
      title: '8 Glowing Skill Orbs',
      description: 'Gather all 8 cyan Skill Orbs tied to React, Three.js, SQL, PHP, Kotlin, Flutter, Git & Arduino.',
      zoneLabel: 'Across Island',
      landmarkId: 'workshop',
      current: Math.min(TOTAL_ORBS, orbsFound),
      total: TOTAL_ORBS,
      completed: orbsFound >= TOTAL_ORBS,
      rewardText: 'Unlocks TECH COLLECTOR + Emerald Matrix Paint',
    },
    {
      id: 'col-tokens',
      section: 'collectibles',
      title: '6 Hidden Founder Tokens',
      description: 'Collect golden tokens placed at scenic overlooks, corners, and lagoon shores.',
      zoneLabel: 'Scenic Spots',
      landmarkId: 'lookout',
      current: Math.min(TOTAL_TOKENS, tokensFound),
      total: TOTAL_TOKENS,
      completed: tokensFound >= TOTAL_TOKENS,
      rewardText: 'Archive Token Completion',
    },
    {
      id: 'col-fragments',
      section: 'collectibles',
      title: '4 Archive Fragments',
      description: 'Recover cardinal north, east, south, and west exploration fragments.',
      zoneLabel: 'Outer Ring',
      landmarkId: 'query-valley',
      current: Math.min(TOTAL_FRAGMENTS, fragsFound),
      total: TOTAL_FRAGMENTS,
      completed: fragsFound >= TOTAL_FRAGMENTS,
      rewardText: 'Cartographer Archive Progress',
    },
    {
      id: 'col-relics',
      section: 'collectibles',
      title: '2 Secret Relics',
      description: 'Recover rare artifacts resting inside off-road hidden locations.',
      zoneLabel: 'Hidden Corners',
      landmarkId: 'delivery',
      current: Math.min(TOTAL_SECRET_RELICS, secretsFound),
      total: TOTAL_SECRET_RELICS,
      completed: secretsFound >= TOTAL_SECRET_RELICS,
      rewardText: 'Relic Hunter Completion',
    },

    // 4. Hidden Discoveries
    ...SECRET_LOCATIONS.map((sec, idx) => ({
      id: `sec-${sec.id}`,
      section: 'secrets' as const,
      title: sec.title,
      description: sec.description,
      zoneLabel: idx === 0 ? 'North Ridge' : 'South Waters',
      landmarkId: idx === 0 ? 'lookout' : 'delivery',
      current: input.discoveredSecrets.includes(sec.id) ? 1 : 0,
      total: 1,
      completed: input.discoveredSecrets.includes(sec.id),
      rewardText: 'Unlocks SECRET FINDER (40 pts)',
    })),
  ];

  return entries;
}

export const SKILL_ORB_LINKS: SkillOrbInfo[] = [
  {
    orbId: 'orb-react',
    orbLabel: 'Skill Orb · React & TypeScript',
    techFocus: 'Frontend Architecture',
    skillNames: ['React', 'JavaScript', 'HTML / CSS'],
    hint: 'Ring Boulevard North (0, -22)',
  },
  {
    orbId: 'orb-three',
    orbLabel: 'Skill Orb · Three.js & WebGL',
    techFocus: 'Interactive 3D & Graphics',
    skillNames: ['JavaScript', 'Graphic Design', 'Video Editing'],
    hint: 'West Plaza Approach (-42, -4)',
  },
  {
    orbId: 'orb-sql',
    orbLabel: 'Skill Orb · MySQL & PL/SQL',
    techFocus: 'Relational Databases',
    skillNames: ['MySQL', 'PostgreSQL', 'Oracle Database / PL/SQL', 'SQL'],
    hint: 'Atop Emerald Lagoon Bridge (40, -22)',
  },
  {
    orbId: 'orb-php',
    orbLabel: 'Skill Orb · PHP & Laravel Craft',
    techFocus: 'Server-Side Web Systems',
    skillNames: ['PHP', 'Java', 'Node.js'],
    hint: 'The Studio Trail (-28, -28)',
  },
  {
    orbId: 'orb-kotlin',
    orbLabel: 'Skill Orb · Kotlin & Android',
    techFocus: 'Native Android Development',
    skillNames: ['Kotlin (Android Studio)', 'Mobile Application Development'],
    hint: 'Workshop Perimeter (54, 14)',
  },
  {
    orbId: 'orb-flutter',
    orbLabel: 'Skill Orb · Flutter & Dart',
    techFocus: 'Cross-Platform Mobile Apps',
    skillNames: ['Flutter & Dart', 'Firebase'],
    hint: 'Signal Boulevard East (16, 32)',
  },
  {
    orbId: 'orb-git',
    orbLabel: 'Skill Orb · Git & Workflow',
    techFocus: 'Version Control & IDE Flow',
    skillNames: ['Git & GitHub', 'VS Code'],
    hint: 'Paddock Outer Verge (-50, 24)',
  },
  {
    orbId: 'orb-arduino',
    orbLabel: 'Skill Orb · Arduino & RFID',
    techFocus: 'Embedded Prototyping',
    skillNames: ['Arduino', 'C Programming', 'C#'],
    hint: 'Signal Workshop Road (34, 36)',
  },
];

export function getSkillCategoriesWithCounts() {
  const categories = ['Frontend', 'Backend and Databases', 'Mobile and Games', 'Creative Work', 'Tools and Workflow'] as const;
  return categories.map((cat) => ({
    category: cat,
    skills: SKILLS_CATALOG.filter((s) => s.category === cat),
  }));
}
