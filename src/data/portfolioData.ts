import type {
  AchievementDef,
  AchievementReward,
  CollectibleDef,
  HeadlightEffectType,
  LeaderboardEntry,
  MissionCatalogItem,
  SecretLocationDef,
  VehicleAccessoryType,
  VehicleChassisType,
  VehicleRimStyle,
  WeatherMode,
  WhisperMessage,
  WorldLandmark,
} from '../types/portfolio.ts';
import { JOURNEY_MILESTONES } from './journeyData.ts';
import { DEVELOPER_PROFILE } from './profileData.ts';
import { PORTFOLIO_PROJECTS, getProjectCounts } from './projectsData.ts';
import { SERVICES_LIST } from './servicesData.ts';
import { SKILL_CATEGORIES, SKILLS_CATALOG } from './skillsData.ts';
import { PADDOCK_CENTER } from '../game/worldConstants.ts';

export {
  DEVELOPER_PROFILE,
  JOURNEY_MILESTONES,
  PORTFOLIO_PROJECTS,
  SERVICES_LIST,
  SKILL_CATEGORIES,
  SKILLS_CATALOG,
  getProjectCounts,
};

const projectCounts = getProjectCounts();

export const WORLD_LANDMARKS: WorldLandmark[] = [
  {
    id: 'studio',
    title: 'THE STUDIO',
    subtitle: `${DEVELOPER_PROFILE.name} · ${DEVELOPER_PROFILE.location}`,
    route: '/about',
    zoneLabel: 'The Studio',
    category: 'Portfolio',
    challengeType: 'treasure',
    position: { x: -36, y: 0, z: -34 },
    radius: 8.5,
    color: '#F27D3B',
    summary: DEVELOPER_PROFILE.bio[0],
    highlights: [
      `${DEVELOPER_PROFILE.role} · ${DEVELOPER_PROFILE.institution}`,
      `Freelance Experience: ${DEVELOPER_PROFILE.freelancePeriod} · Education: ${DEVELOPER_PROFILE.educationPeriod}`,
      'Launch the 4-Relic Treasure Hunt around Sanjaya’s World',
    ],
  },
  {
    id: 'projects',
    title: 'PROJECT PAVILION',
    subtitle: `Exhibition · ${projectCounts.total} Real Projects`,
    route: '/projects',
    zoneLabel: 'Project Pavilion',
    category: 'Portfolio',
    challengeType: 'timetrial',
    position: { x: 36, y: 0, z: -44 },
    radius: 8.5,
    color: '#EE5D52',
    summary: `Interactive exhibition featuring ${projectCounts.total} software, mobile, coursework, and hardware builds—separating implemented functionality from planned milestones.`,
    highlights: [
      ...PORTFOLIO_PROJECTS.slice(0, 2).map((p) => `${p.number}. ${p.title} (${p.status})`),
      'Time Trial Challenge: 5-gate sprint in under 45 seconds',
    ],
  },
  {
    id: 'workshop',
    title: 'THE WORKSHOP',
    subtitle: `${SKILLS_CATALOG.length} Skills · Bug Hunt Lab`,
    route: '/skills',
    zoneLabel: 'The Workshop',
    category: 'Portfolio',
    challengeType: 'bughunt',
    position: { x: 64, y: 0, z: 8 },
    radius: 8.5,
    color: '#2BA89C',
    summary: `Technology laboratory organizing ${SKILLS_CATALOG.length} real tools across 5 categories—plus a live Bug Hunt to squash 3 hidden glitches around the lab.`,
    highlights: [
      'Web & DB: PHP, MySQL, PostgreSQL, Oracle PL/SQL, MongoDB, React',
      'Systems & Mobile: Kotlin Android, Flutter/Dart, Python, C, C# (.NET)',
      'Playable Bug Hunt: Locate & squash 3 hidden glitch bugs',
    ],
  },
  {
    id: 'lookout',
    title: 'LOOKOUT HILL',
    subtitle: `Journey & Memory Sequence · ${JOURNEY_MILESTONES.length} Milestones`,
    route: '/journey',
    zoneLabel: 'Lookout Hill',
    category: 'Portfolio',
    challengeType: 'memory',
    position: { x: 0, y: 3.6, z: -72 },
    radius: 9,
    color: '#6A9A68',
    summary:
      'An elevated sandstone viewpoint mapping Sanjaya Lakshan’s foundations, freelance practice since 2023, NIBM studies, and the Summit Illuminated Memory Challenge.',
    highlights: [
      ...JOURNEY_MILESTONES.slice(2, 4).map((m) => `${m.title} (${m.period})`),
      'Memory Challenge: Repeat the 4-beacon illuminated drive sequence',
    ],
  },
  {
    id: 'signal-house',
    title: 'SIGNAL HOUSE',
    subtitle: 'Contact & Direct Communication',
    route: '/contact',
    zoneLabel: 'Signal House',
    category: 'Portfolio',
    position: { x: 0, y: 0, z: 46 },
    radius: 8.5,
    color: '#2BA89C',
    summary: `Communications beacon for ${DEVELOPER_PROFILE.name} in ${DEVELOPER_PROFILE.location}. Reach out via email, phone, GitHub, or LinkedIn.`,
    highlights: [
      `Email: ${DEVELOPER_PROFILE.email}`,
      `Phone: ${DEVELOPER_PROFILE.phone}`,
      'GitHub & LinkedIn · English & Sinhala',
    ],
  },
  {
    id: 'paddock',
    title: 'THE PADDOCK',
    subtitle: 'Racing Circuit & Vehicle Garage',
    route: '/garage',
    zoneLabel: 'The Paddock',
    category: 'Circuit',
    challengeType: 'race',
    position: { x: PADDOCK_CENTER.x, y: 0, z: PADDOCK_CENTER.z },
    radius: 9,
    color: '#D9601E',
    summary:
      'Custom vehicle garage, checkered start/finish gantry, 4-checkpoint anti-skip racing circuit, countdown start, and personal-best ghost vehicle replay.',
    highlights: [
      '3-2-1-GO countdown race with ordered circuit checkpoints',
      'Optional Ghost Vehicle replaying your best recorded lap',
      'Customize chassis, paint, wheels, accessories, headlights & upgrades',
    ],
  },
  {
    id: 'delivery',
    title: 'DELIVERY DEPOT',
    subtitle: `${SERVICES_LIST.length} Services & 3-Stop Parcel Run`,
    route: '/services',
    zoneLabel: 'Delivery Depot',
    category: 'Challenge',
    challengeType: 'delivery',
    position: { x: -38, y: 0, z: 48 },
    radius: 8.5,
    color: '#E69F38',
    summary:
      'Pick up an express parcel at Delivery Depot and follow highlighted route beacons across three consecutive portfolio destinations.',
    highlights: [
      '3-destination courier mission: The Studio → The Workshop → Signal House',
      'Established: Web Development, Web/UI Design, Database Design',
      'Exploratory: Mobile Apps, Creative Media Editing, Hardware Automation',
    ],
  },
  {
    id: 'query-valley',
    title: 'QUERY VALLEY',
    subtitle: 'SQL Checkpoint Circuit (SELECT → WHERE)',
    route: '/behind-the-scenes',
    zoneLabel: 'Query Valley',
    category: 'Challenge',
    challengeType: 'sql',
    position: { x: 48, y: 0, z: -74 },
    radius: 9,
    color: '#3E7B9E',
    summary:
      'Drive through the four SQL clause gates in strict relational order: SELECT → FROM → JOIN → WHERE to complete Query Valley.',
    highlights: [
      'Ordered 3D driving gates: SELECT → FROM → JOIN → WHERE',
      'Prevents out-of-order gate skipping with live SQL query HUD',
      'Inspired by SmartMove & LMS relational schema architecture',
    ],
  },
  {
    id: 'signal-workshop',
    title: 'SIGNAL WORKSHOP',
    subtitle: 'RFID Keycard Hunt & Security Barrier',
    route: '/achievements',
    zoneLabel: 'Signal Workshop',
    category: 'Challenge',
    challengeType: 'rfid',
    position: { x: 44, y: 0, z: 48 },
    radius: 8.5,
    color: '#EE5D52',
    summary:
      'Locate and collect the misplaced RC522 RFID Access Card in the Signal Workshop yard, drive to the security barrier scanner, raise the boom arm, and pass through.',
    highlights: [
      'Step 1: Find & collect the glowing RFID access card',
      'Step 2: Drive to the barrier pad to scan & trigger the servo gate',
      'Step 3: Drive through the opened compound gate to clear the mission',
    ],
  },
];

export const SECRET_LOCATIONS: SecretLocationDef[] = [
  {
    id: 'secret-pine-sanctuary',
    title: 'Hidden Pine Trail Overlook',
    x: -24,
    z: -56,
    radius: 7.5,
    description: 'Secluded pine ridge trail linking The Studio to the back flank of Lookout Hill.',
  },
  {
    id: 'secret-south-cove',
    title: 'South Cove Crystal Shallows',
    x: -18,
    z: 66,
    radius: 8.0,
    description: 'Hidden emerald oasis pocket south of Delivery Depot and Signal House.',
  },
];

export const WORLD_COLLECTIBLES: CollectibleDef[] = [
  // 8 Skill Orbs (required for TECH COLLECTOR)
  { id: 'orb-react', kind: 'orb', x: 0, z: -22, label: 'Skill Orb · React & TypeScript' },
  { id: 'orb-three', kind: 'orb', x: -42.65, z: 3.41, label: 'Skill Orb · Three.js & WebGL' },
  { id: 'orb-sql', kind: 'orb', x: 40, z: -22, label: 'Skill Orb · MySQL & PL/SQL' },
  { id: 'orb-php', kind: 'orb', x: -28, z: -28, label: 'Skill Orb · PHP & Laravel Craft' },
  { id: 'orb-kotlin', kind: 'orb', x: 54, z: 14, label: 'Skill Orb · Kotlin & Android' },
  { id: 'orb-flutter', kind: 'orb', x: 16, z: 32, label: 'Skill Orb · Flutter & Dart' },
  { id: 'orb-git', kind: 'orb', x: -50, z: 24, label: 'Skill Orb · Git & Workflow' },
  { id: 'orb-arduino', kind: 'orb', x: 34, z: 36, label: 'Skill Orb · Arduino & RFID' },

  // 6 Hidden Tokens
  { id: 'token-plaza', kind: 'token', x: 10, z: 10, label: 'Plaza Founder Token' },
  { id: 'token-lookout', kind: 'token', x: 0, z: -64, label: 'Lookout Ridge Token' },
  { id: 'token-paddock', kind: 'token', x: PADDOCK_CENTER.x - 12, z: PADDOCK_CENTER.z, label: 'Paddock Apex Token' },
  { id: 'token-query', kind: 'token', x: 48, z: -60, label: 'Query Monolith Token' },
  { id: 'token-depot', kind: 'token', x: -46, z: 42, label: 'Depot Cargo Token' },
  { id: 'token-lagoon', kind: 'token', x: 24, z: -34, label: 'Lagoon Shore Token' },

  // 4 Achievement Fragments
  { id: 'frag-north', kind: 'fragment', x: -16, z: -42, label: 'Archive Fragment I' },
  { id: 'frag-east', kind: 'fragment', x: 68, z: -10, label: 'Archive Fragment II' },
  { id: 'frag-south', kind: 'fragment', x: 22, z: 54, label: 'Archive Fragment III' },
  { id: 'frag-west', kind: 'fragment', x: -64, z: -12, label: 'Archive Fragment IV' },

  // 2 Secret Objects
  { id: 'secret-pine-relic', kind: 'secret', x: -24, z: -56, label: 'Hidden Pine Compass Relic' },
  { id: 'secret-cove-relic', kind: 'secret', x: -18, z: 62, label: 'South Cove Shell Artifact' },
];

export const PADDOCK_CHECKPOINTS: { id: string; label: string; x: number; z: number }[] = [
  { id: 'cp-1', label: 'Sector 1 · North Curve', x: PADDOCK_CENTER.x, z: PADDOCK_CENTER.z - 18 },
  { id: 'cp-2', label: 'Sector 2 · West Hairpin', x: PADDOCK_CENTER.x - 18, z: PADDOCK_CENTER.z },
  { id: 'cp-3', label: 'Sector 3 · South Sweeper', x: PADDOCK_CENTER.x, z: PADDOCK_CENTER.z + 18 },
  { id: 'cp-4', label: 'Sector 4 · Pit Return', x: PADDOCK_CENTER.x + 18, z: PADDOCK_CENTER.z },
];

export const TIME_TRIAL_CHECKPOINTS: { label: string; x: number; z: number }[] = [
  { label: 'Ring East Entry', x: 28, z: -20 },
  { label: 'Lagoon Bridge', x: 40, z: -22 },
  { label: 'Workshop Straight', x: 46, z: 6 },
  { label: 'Signal Boulevard', x: 14, z: 32 },
  { label: 'Plaza Finish Arch', x: 0, z: -12 },
];

export const SQL_CHALLENGE_GATES: { clause: 'SELECT' | 'FROM' | 'JOIN' | 'WHERE'; x: number; z: number; snippet: string }[] = [
  { clause: 'SELECT', x: 34, z: -60, snippet: 'SELECT p.title, s.name' },
  { clause: 'FROM', x: 48, z: -58, snippet: 'FROM portfolio_projects p' },
  { clause: 'JOIN', x: 60, z: -68, snippet: 'JOIN tech_skills s ON p.id = s.project_id' },
  { clause: 'WHERE', x: 48, z: -84, snippet: "WHERE p.status = 'Verified';" },
];

export const BUG_HUNT_TARGETS: { id: string; label: string; x: number; z: number }[] = [
  { id: 'bug-1', label: 'Null-Pointer Glitch #1', x: 74, z: -4 },
  { id: 'bug-2', label: 'Off-By-One Bug #2', x: 76, z: 22 },
  { id: 'bug-3', label: 'Race Condition Bug #3', x: 54, z: 24 },
];

export const MEMORY_PADS: { id: number; label: string; color: string; x: number; z: number }[] = [
  { id: 0, label: 'Terracotta Pad', color: '#F27D3B', x: -8, z: -66 },
  { id: 1, label: 'Turquoise Pad', color: '#2BA89C', x: 8, z: -66 },
  { id: 2, label: 'Coral Pad', color: '#EE5D52', x: -8, z: -78 },
  { id: 3, label: 'Emerald Pad', color: '#6A9A68', x: 8, z: -78 },
];

export const TREASURE_CHESTS: { id: string; label: string; x: number; z: number }[] = [
  { id: 'tr-1', label: 'Studio Sketch Chest', x: -48, z: -44 },
  { id: 'tr-2', label: 'Pine Trail Relic Chest', x: -24, z: -56 },
  { id: 'tr-3', label: 'Bridge Pier Chest', x: 30, z: -12 },
  { id: 'tr-4', label: 'South Cove Chest', x: -12, z: 58 },
];

// =========================================================================
// EXPANSION DISTRICT COURSES & NEW CHALLENGE ARENA DEFINITIONS
// =========================================================================
export const FOREST_TRAIL_GATES: { id: string; label: string; x: number; z: number; radius: number }[] = [
  { id: 'ft-1', label: 'Timber Gate · Trailhead', x: -64, z: -60, radius: 5.5 },
  { id: 'ft-2', label: 'Fern Hollow Bend', x: -88, z: -76, radius: 5.5 },
  { id: 'ft-3', label: 'Brook Timber Bridge', x: -104, z: -84, radius: 5.5 },
  { id: 'ft-4', label: 'North Ridge Clearing', x: -120, z: -98, radius: 5.5 },
  { id: 'ft-5', label: 'Whispering Pine Overlook', x: -126, z: -68, radius: 6.0 },
];

export const LAGOON_RUN_CHECKPOINTS: { id: string; label: string; x: number; z: number; radius: number; isWater: boolean }[] = [
  { id: 'lr-1', label: 'Sand Bank Entry', x: -34, z: 92, radius: 5.6, isWater: false },
  { id: 'lr-2', label: 'Buoy Gate East', x: -24, z: 112, radius: 6.2, isWater: true },
  { id: 'lr-3', label: 'Lagoon Center Buoy', x: -38, z: 120, radius: 6.2, isWater: true },
  { id: 'lr-4', label: 'West Channel Marker', x: -50, z: 116, radius: 6.2, isWater: true },
  { id: 'lr-5', label: 'Timber Exit Ramp & Dock', x: -36, z: 141, radius: 6.0, isWater: false },
];

export const LAGOON_RUN_OBSTACLES: { id: string; kind: 'buoy' | 'rock'; x: number; z: number; radius: number }[] = [
  { id: 'lo-1', kind: 'rock', x: -30, z: 108, radius: 1.5 },
  { id: 'lo-2', kind: 'buoy', x: -33, z: 124, radius: 1.3 },
  { id: 'lo-3', kind: 'rock', x: -44, z: 110, radius: 1.6 },
  { id: 'lo-4', kind: 'buoy', x: -43, z: 128, radius: 1.3 },
];

export const DRIFT_CIRCUIT_CHECKPOINTS: { id: string; label: string; x: number; z: number; radius: number }[] = [
  { id: 'dc-1', label: 'Hairpin North Entry', x: 96, z: 54, radius: 7.0 },
  { id: 'dc-2', label: 'East Apex Sweeper', x: 132, z: 62, radius: 7.5 },
  { id: 'dc-3', label: 'South Hairpin Curl', x: 126, z: 96, radius: 7.5 },
  { id: 'dc-4', label: 'West Return Chicane', x: 88, z: 86, radius: 7.0 },
];

export interface StuntRampDef {
  id: string;
  label: string;
  x: number;
  z: number;
  yaw: number;
  width: number;
  length: number;
  height: number;
  kind: 'launch' | 'gap-takeoff' | 'platform';
}

export const STUNT_ARENA_RAMPS: readonly StuntRampDef[] = [
  { id: 'ramp-north-launch', label: 'Arena North Launch', x: 96, z: 68, yaw: 0, width: 6.4, length: 9.0, height: 2.35, kind: 'launch' },
  { id: 'ramp-east-kicker', label: 'East Side Kicker', x: 118, z: 82, yaw: Math.PI * 0.5, width: 6.2, length: 8.6, height: 2.5, kind: 'launch' },
  { id: 'ramp-dj-takeoff', label: 'Double-Jump Gap Takeoff', x: 106, z: 96, yaw: 0, width: 6.0, length: 8.5, height: 2.65, kind: 'gap-takeoff' },
];

export interface SkyPlatformDef {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  width: number;
  length: number;
  thickness: number;
}

export const DOUBLE_JUMP_PLATFORMS: readonly SkyPlatformDef[] = [
  { id: 'plat-1', label: 'Sky Step Alpha', x: 106, y: 3.1, z: 107.5, width: 7.4, length: 8.2, thickness: 0.55 },
  { id: 'plat-2', label: 'Sky Deck Omega', x: 106, y: 4.9, z: 121.0, width: 8.4, length: 9.4, thickness: 0.6 },
];

export const STUNT_AIR_CHECKPOINTS: { id: string; label: string; x: number; y: number; z: number; radius: number }[] = [
  { id: 'st-1', label: 'North Launch Crest', x: 96, y: 3.2, z: 75.5, radius: 5.5 },
  { id: 'st-2', label: 'East Kicker Flight', x: 125.5, y: 3.5, z: 82, radius: 5.8 },
  { id: 'st-3', label: 'Gap Crown Gate', x: 106, y: 4.5, z: 105.5, radius: 5.8 },
];

export interface ParkingBayDef {
  id: string;
  tier: 'Beginner' | 'Normal' | 'Advanced';
  label: string;
  x: number;
  z: number;
  targetYaw: number;
  width: number;
  length: number;
  maxHeadingErrDeg: number;
  maxCenterErr: number;
}

export const PRECISION_PARKING_BAYS: readonly ParkingBayDef[] = [
  { id: 'park-1', tier: 'Beginner', label: 'Bay A · Wide Entry', x: 82, z: 46, targetYaw: Math.PI, width: 4.4, length: 6.6, maxHeadingErrDeg: 20, maxCenterErr: 1.55 },
  { id: 'park-2', tier: 'Normal', label: 'Bay B · Angled Curb', x: 78, z: 62, targetYaw: Math.PI * 0.5, width: 3.8, length: 6.0, maxHeadingErrDeg: 14, maxCenterErr: 1.2 },
  { id: 'park-3', tier: 'Advanced', label: 'Bay C · Tight Chicane Box', x: 78, z: 76, targetYaw: Math.PI, width: 3.4, length: 5.5, maxHeadingErrDeg: 10, maxCenterErr: 0.95 },
];

export const DISTRICT_HUB_MARKERS: {
  id: string;
  title: string;
  subtitle: string;
  x: number;
  z: number;
  color: string;
  radius: number;
}[] = [
  {
    id: 'forest-trail-hub',
    title: 'FOREST TRAIL DISTRICT',
    subtitle: 'Winding Pine Trail · Timber Brook Bridge & Overlook',
    x: -104,
    z: -84,
    color: '#5E915E',
    radius: 10,
  },
  {
    id: 'amphibious-lagoon-hub',
    title: 'AMPHIBIOUS LAGOON',
    subtitle: 'Shallow Water Driving · Floating Buoys & Dock Run',
    x: -36,
    z: 118,
    color: '#21968B',
    radius: 12,
  },
  {
    id: 'stunt-drift-hub',
    title: 'STUNT & DRIFT ARENA',
    subtitle: 'Drift Hairpins · Double-Jump Sky Gaps · Precision Bays',
    x: 106,
    z: 74,
    color: '#EC6D2C',
    radius: 12,
  },
];

export const ACHIEVEMENTS_LIST: AchievementDef[] = [
  {
    id: 'first-drive',
    title: 'FIRST DRIVE',
    description: 'Drive the vehicle for the first time inside Sanjaya’s World.',
    points: 20,
    category: 'Driving',
  },
  {
    id: 'world-explorer',
    title: 'WORLD EXPLORER',
    description: 'Visit all nine destinations across the connected world map.',
    points: 80,
    category: 'Exploration',
  },
  {
    id: 'project-explorer',
    title: 'PROJECT EXPLORER',
    description: 'Open and inspect all eleven real projects in the portfolio.',
    points: 60,
    category: 'Discovery',
  },
  {
    id: 'tech-collector',
    title: 'TECH COLLECTOR',
    description: 'Collect all eight glowing Skill Orbs scattered across the world.',
    points: 60,
    category: 'Discovery',
  },
  {
    id: 'race-champion',
    title: 'RACE CHAMPION',
    description: 'Complete a timed circuit lap through all checkpoints at The Paddock.',
    points: 50,
    category: 'Driving',
  },
  {
    id: 'delivery-expert',
    title: 'DELIVERY EXPERT',
    description: 'Complete the 3-destination parcel delivery mission from Delivery Depot.',
    points: 50,
    category: 'Driving',
  },
  {
    id: 'database-master',
    title: 'DATABASE MASTER',
    description: 'Drive through SELECT → FROM → JOIN → WHERE in order at Query Valley.',
    points: 50,
    category: 'Discovery',
  },
  {
    id: 'security-expert',
    title: 'SECURITY EXPERT',
    description: 'Collect the RFID access card, scan at Signal Workshop, and clear the gate.',
    points: 50,
    category: 'Discovery',
  },
  {
    id: 'secret-finder',
    title: 'SECRET FINDER',
    description: 'Discover a hidden secret location off the beaten road.',
    points: 40,
    category: 'Exploration',
  },
  {
    id: 'complete-explorer',
    title: 'COMPLETE EXPLORER',
    description: 'Unlock all other nine achievements across Sanjaya’s World.',
    points: 140,
    category: 'Exploration',
  },
];

export const CORE_REQUIRED_ACHIEVEMENT_IDS = ACHIEVEMENTS_LIST.filter(
  (a) => a.id !== 'complete-explorer',
).map((a) => a.id);

export const EXPLORER_REWARDS: AchievementReward[] = [
  {
    id: 'reward-rookie',
    title: 'Plaza Scout Rank',
    unlockRequirement: 'Reach 60 Explorer Points',
    rewardDetail: 'Earns Plaza Scout distinction as you begin driving and discovering destinations.',
    requiredScore: 60,
  },
  {
    id: 'reward-craftsman',
    title: 'Workshop Navigator Rank',
    unlockRequirement: 'Reach 200 Explorer Points',
    rewardDetail: 'Recognizes multi-zone mastery across challenges, projects, and skill labs.',
    requiredScore: 200,
  },
  {
    id: 'reward-cartographer',
    title: 'Complete Explorer Rank',
    unlockRequirement: 'Reach 450 Explorer Points',
    rewardDetail: 'Highest portfolio exploration rank alongside the Solar Gold garage edition.',
    requiredScore: 450,
  },
];

export const GARAGE_CHASSIS_OPTIONS: {
  id: VehicleChassisType;
  label: string;
  tagline: string;
  specs: string;
}[] = [
  {
    id: 'buggy',
    label: 'Sandstone Buggy',
    tagline: 'Balanced open-world explorer chassis',
    specs: 'Sloped canopy, open rear rack & nimble wheelbase',
  },
  {
    id: 'rover',
    label: 'Highland Rover',
    tagline: 'Tall utility expedition SUV body',
    specs: 'Extended hardtop cabin & reinforced upright profile',
  },
  {
    id: 'rally',
    label: 'Tarmac Rally Coupe',
    tagline: 'Low-slung circuit fastback frame',
    specs: 'Swept wedge nose & track-tuned silhouette',
  },
];

export const GARAGE_PAINT_PRESETS = [
  { id: 'terracotta', name: 'Terracotta Sunset', hex: '#F27D3B', accent: '#2BA89C', unlockAchievementId: null as string | null, unlockLabel: 'Unlocked by default' },
  { id: 'coral', name: 'Coral Rally', hex: '#EE5D52', accent: '#FFF8EE', unlockAchievementId: null as string | null, unlockLabel: 'Unlocked by default' },
  { id: 'turquoise', name: 'Lagoon Turquoise', hex: '#2BA89C', accent: '#F27D3B', unlockAchievementId: null as string | null, unlockLabel: 'Unlocked by default' },
  { id: 'olive', name: 'Olive Safari', hex: '#6A9A68', accent: '#F4E6CE', unlockAchievementId: null as string | null, unlockLabel: 'Unlocked by default' },
  { id: 'ochre', name: 'Sunburst Ochre', hex: '#E69F38', accent: '#2B2623', unlockAchievementId: null as string | null, unlockLabel: 'Unlocked by default' },
  { id: 'charcoal', name: 'Charcoal Nomad', hex: '#38322E', accent: '#F27D3B', unlockAchievementId: null as string | null, unlockLabel: 'Unlocked by default' },
  {
    id: 'courier-amber',
    name: 'Express Courier (Unlock)',
    hex: '#D9822B',
    accent: '#FFF9F0',
    unlockAchievementId: 'delivery-expert',
    unlockLabel: 'Unlock: Clear 3-Stop Parcel Run (Delivery Expert)',
  },
  {
    id: 'query-cobalt',
    name: 'Query Cobalt (Unlock)',
    hex: '#2F6C8F',
    accent: '#FFD54F',
    unlockAchievementId: 'database-master',
    unlockLabel: 'Unlock: Clear Query Valley SQL Circuit (Database Master)',
  },
  {
    id: 'signal-crimson',
    name: 'Signal Crimson (Unlock)',
    hex: '#C4453B',
    accent: '#21968B',
    unlockAchievementId: 'security-expert',
    unlockLabel: 'Unlock: Clear Signal Workshop RFID Gate (Security Expert)',
  },
  {
    id: 'sandstone-sage',
    name: 'World Cartographer (Unlock)',
    hex: '#4A7C59',
    accent: '#E6D3B5',
    unlockAchievementId: 'world-explorer',
    unlockLabel: 'Unlock: Discover all 9 Destinations (World Explorer)',
  },
  {
    id: 'emerald-carbon',
    name: 'Emerald Matrix (Unlock)',
    hex: '#19876E',
    accent: '#FFD54F',
    unlockAchievementId: 'tech-collector',
    unlockLabel: 'Unlock: Collect all 8 Skill Orbs (Tech Collector)',
  },
  {
    id: 'midnight-circuit',
    name: 'Midnight Circuit (Unlock)',
    hex: '#24354F',
    accent: '#EE5D52',
    unlockAchievementId: 'race-champion',
    unlockLabel: 'Unlock: Complete The Paddock Race (Race Champion)',
  },
  {
    id: 'solar-gold',
    name: 'Solar Gold Edition (Unlock)',
    hex: '#D49A28',
    accent: '#2B2623',
    unlockAchievementId: 'complete-explorer',
    unlockChallengeId: null as string | null,
    unlockLabel: 'Unlock: Complete all 9 other achievements',
  },
  {
    id: 'lagoon-aqua',
    name: 'Amphibious Aqua (Unlock)',
    hex: '#19A7A0',
    accent: '#FFF9F0',
    unlockAchievementId: null as string | null,
    unlockChallengeId: 'lagoon-run',
    unlockLabel: 'Unlock: Clear Lagoon Run amphibious course',
  },
  {
    id: 'apex-violet',
    name: 'Apex Drift Purple (Unlock)',
    hex: '#7246A6',
    accent: '#FFD54F',
    unlockAchievementId: null as string | null,
    unlockChallengeId: 'drift-master',
    unlockLabel: 'Unlock: Beat Drift Master 1,200 pt circuit',
  },
  {
    id: 'skyline-blaze',
    name: 'Skyline Stunt Chrome (Unlock)',
    hex: '#EA5B2D',
    accent: '#92E9FF',
    unlockAchievementId: null as string | null,
    unlockChallengeId: 'stunt-master',
    unlockLabel: 'Unlock: Clear Stunt Master Arena',
  },
];

export const GARAGE_RIM_OPTIONS: {
  id: VehicleRimStyle;
  label: string;
  desc: string;
  unlockChallengeId: string | null;
  unlockLabel: string;
}[] = [
  {
    id: 'classic-5spoke',
    label: 'Classic 5-Spoke Alloy',
    desc: 'Machined satin alloy 5-spoke wheels with painted brake calipers',
    unlockChallengeId: null,
    unlockLabel: 'Unlocked by default',
  },
  {
    id: 'offroad-beadlock',
    label: 'Expedition Beadlock',
    desc: 'Heavy-duty bolted beadlock ring engineered for trails and shallows',
    unlockChallengeId: null,
    unlockLabel: 'Unlocked by default',
  },
  {
    id: 'aero-mesh',
    label: 'Apex Drift Mesh',
    desc: 'Lightweight 10-spoke cross-lace drift rims (clear Drift Master to unlock)',
    unlockChallengeId: 'drift-master',
    unlockLabel: 'Unlock: Clear Drift Master circuit',
  },
  {
    id: 'turbo-fan',
    label: 'Aero Turbo-Fan',
    desc: 'Vented competition turbine dish rims (clear Stunt Master or Lagoon Run)',
    unlockChallengeId: 'stunt-master',
    unlockLabel: 'Unlock: Clear Stunt Master Arena',
  },
];

export const GARAGE_ACCESSORY_OPTIONS: {
  id: VehicleAccessoryType;
  label: string;
  desc: string;
  unlockChallengeId: string | null;
  unlockLabel: string;
}[] = [
  {
    id: 'spare-tire',
    label: 'Roof Spare Wheel',
    desc: 'Classic expedition wheel mounted over the rear deck',
    unlockChallengeId: null,
    unlockLabel: 'Unlocked by default',
  },
  {
    id: 'roof-lights',
    label: 'Rally Light Bar',
    desc: 'Quad roof-mounted spotlights for night & fog visibility',
    unlockChallengeId: null,
    unlockLabel: 'Unlocked by default',
  },
  {
    id: 'cargo-box',
    label: 'Delivery Crate Pack',
    desc: 'Strapped expedition cargo crate for courier runs',
    unlockChallengeId: null,
    unlockLabel: 'Unlocked by default',
  },
  {
    id: 'spoiler',
    label: 'Circuit Rear Wing',
    desc: 'Twin-strut aerodynamic wing for The Paddock loop',
    unlockChallengeId: null,
    unlockLabel: 'Unlocked by default',
  },
  {
    id: 'trail-expedition-rack',
    label: 'Trail Expedition Rack',
    desc: 'Roof cargo basket, twin recovery traction boards & trail beacon (clear Forest Trail)',
    unlockChallengeId: 'forest-trail',
    unlockLabel: 'Unlock: Complete Forest Trail Expedition',
  },
  {
    id: 'none',
    label: 'Clean Roof',
    desc: 'Streamlined factory roof with zero attachments',
    unlockChallengeId: null,
    unlockLabel: 'Unlocked by default',
  },
];

export const GARAGE_HEADLIGHT_OPTIONS: {
  id: HeadlightEffectType;
  label: string;
  hex: string;
  beamHex: string;
  desc: string;
}[] = [
  {
    id: 'warm-halogen',
    label: 'Warm Halogen',
    hex: '#FFF3B8',
    beamHex: '#FFE08A',
    desc: 'Classic golden beams matching sunlit sandstone trails',
  },
  {
    id: 'cool-led',
    label: 'Cool Daylight LED',
    hex: '#D8F8FF',
    beamHex: '#92E9FF',
    desc: 'Crisp cool-white LEDs with focused forward light cones',
  },
  {
    id: 'amber-rally',
    label: 'Amber Fog Rally',
    hex: '#FFB347',
    beamHex: '#FF9A2E',
    desc: 'High-contrast amber lenses inspired by rally endurance rigs',
  },
];

export const WEATHER_OPTIONS: { id: WeatherMode; label: string; desc: string }[] = [
  { id: 'sunny', label: 'Golden Day', desc: 'Warm sunlight & clear horizon visibility' },
  { id: 'sunset', label: 'Amber Dusk', desc: 'Warm low sun with glowing street lanterns' },
  { id: 'night', label: 'Starlit Night', desc: 'Deep twilight sky, starry dome & bright headlights' },
  { id: 'rain', label: 'Rainstorm', desc: 'Dynamic rain streaks, cool sky & wet ground ripples' },
  { id: 'fog', label: 'Morning Mist', desc: 'Atmospheric horizon fog drifting across valleys' },
];

// Strictly local-only leaderboard: zero invented online competitors
export const INITIAL_LEADERBOARD: LeaderboardEntry[] = [];

// Strictly stored messages only: zero sample/fake guestbook messages
export const INITIAL_WHISPERS: WhisperMessage[] = [];

export const NAVIGATION_ROUTES = [
  { path: '/', label: '3D World', group: 'World' },
  { path: '/classic', label: 'Classic Portfolio Mode', group: 'World' },
  { path: '/about', label: 'About Me', group: 'Portfolio' },
  { path: '/projects', label: 'Projects', group: 'Portfolio' },
  { path: '/skills', label: 'Skills', group: 'Portfolio' },
  { path: '/journey', label: 'Journey', group: 'Portfolio' },
  { path: '/services', label: 'Services', group: 'Portfolio' },
  { path: '/achievements', label: 'Achievements', group: 'Arcade' },
  { path: '/garage', label: 'Vehicle Garage', group: 'Arcade' },
  { path: '/leaderboard', label: 'Leaderboard', group: 'Arcade' },
  { path: '/whispers', label: 'Visitor Whispers', group: 'Community' },
  { path: '/guide', label: 'How to Play', group: 'Guide' },
  { path: '/behind-the-scenes', label: 'Behind the Scenes', group: 'Guide' },
  { path: '/contact', label: 'Contact', group: 'Community' },
];

export const MISSION_CATALOG: MissionCatalogItem[] = [
  // EXPLORATION
  {
    id: 'tour',
    title: 'Guided Portfolio Tour',
    category: 'EXPLORATION',
    difficulty: 'Beginner',
    objective: 'Follow waypoint guidance across 5 signature destinations in Sanjaya’s World.',
    startLocationLabel: 'Starting Plaza',
    startPoint: { x: 0, z: 10 },
    startYaw: 0.68,
    controlsHint: 'W/S Drive · A/D Steer · Enter Open Destination',
    rewardSummary: 'Full Island Tour Completion',
    mode: 'tour',
  },
  {
    id: 'treasure',
    title: '4-Relic Treasure Hunt',
    category: 'EXPLORATION',
    difficulty: 'Beginner',
    objective: 'Locate and open all 4 expedition chests scattered from Studio to South Cove.',
    startLocationLabel: 'The Studio',
    startPoint: { x: -36, z: -26 },
    startYaw: 0.58,
    controlsHint: 'WASD Explore · Space Jump over ledges',
    rewardSummary: 'Studio Explorer Completion',
    mode: 'challenge',
    challengeId: 'treasure',
  },
  {
    id: 'forest-trail',
    title: 'Forest Trail Expedition',
    category: 'EXPLORATION',
    difficulty: 'Normal',
    objective: 'Drive the winding NW woodland loop across the timber stream bridge to the Pine Overlook.',
    startLocationLabel: 'Forest Trailhead',
    startPoint: { x: -56, z: -52 },
    startYaw: 0.785,
    controlsHint: 'WASD Trail Drive · Space Double-Jump Logs · F Recover',
    rewardSummary: 'Trail Expedition Rack & Woodland Time Record',
    mode: 'challenge',
    challengeId: 'forest-trail',
    personalBestUnit: 'seconds',
  },
  // RACING
  {
    id: 'race',
    title: 'Paddock Circuit Time Attack',
    category: 'RACING',
    difficulty: 'Normal',
    objective: 'Launch on 3-2-1-GO and clear all 4 oval sectors cleanly to post a verified PB lap.',
    startLocationLabel: 'The Paddock Start Grid',
    startPoint: { x: PADDOCK_CENTER.x, z: PADDOCK_CENTER.z },
    startYaw: 0,
    controlsHint: 'W/Shift Accelerate · X Corner Drift · Beat Ghost',
    rewardSummary: 'RACE CHAMPION (+50 pts) & Midnight Circuit Skin',
    mode: 'race',
    personalBestUnit: 'seconds',
  },
  {
    id: 'timetrial',
    title: '5-Gate Island Time Trial',
    category: 'RACING',
    difficulty: 'Pro',
    objective: 'Clear Ring Viaduct, Emerald Bridge, Workshop Straight & Signal Blvd within 45s.',
    startLocationLabel: 'Project Pavilion',
    startPoint: { x: 32, z: -36 },
    startYaw: 2.89,
    controlsHint: 'Shift Boost · X Tight Hairpin Drift · <45s Limit',
    rewardSummary: 'Pavilion Sprint Completion',
    mode: 'challenge',
    challengeId: 'timetrial',
  },
  {
    id: 'drift-master',
    title: 'Drift Master Circuit',
    category: 'RACING',
    difficulty: 'Normal',
    objective: 'Chain sustained drifts through the 4 Arena hairpins and reach 1,200+ Drift Score.',
    startLocationLabel: 'Stunt & Drift Arena North',
    startPoint: { x: 96, z: 42 },
    startYaw: Math.PI,
    controlsHint: 'X Handbrake Drift + A/D Countersteer · Release Smoothly',
    rewardSummary: 'Apex Drift Mesh Rims & Purple Paint',
    mode: 'challenge',
    challengeId: 'drift-master',
    personalBestUnit: 'score',
  },
  // STUNTS
  {
    id: 'stunt-master',
    title: 'Stunt Master Ramp Showdown',
    category: 'STUNTS',
    difficulty: 'Pro',
    objective: 'Hit 3 launch & kicker gates cleanly with airborne combos to clear 800+ Stunt Points.',
    startLocationLabel: 'Stunt Arena Ramp Pad',
    startPoint: { x: 96, z: 56 },
    startYaw: Math.PI,
    controlsHint: 'Shift Boost onto Ramps · Space 2x Jump · A/D/W/S Air Pitch',
    rewardSummary: 'Aero Turbo-Fan Rims & Skyline Chrome Paint',
    mode: 'challenge',
    challengeId: 'stunt-master',
    personalBestUnit: 'score',
  },
  {
    id: 'double-jump-trial',
    title: 'Double-Jump Sky Trial',
    category: 'STUNTS',
    difficulty: 'Pro',
    objective: 'Launch off the takeoff ramp and fire your mid-air 2nd jump to reach both Sky Decks.',
    startLocationLabel: 'Sky Ramp Approach',
    startPoint: { x: 106, z: 82 },
    startYaw: Math.PI,
    controlsHint: '1st Space on Lip -> Peak -> 2nd Space Mid-Air!',
    rewardSummary: 'Sky Trial Time Record & Mastery',
    mode: 'challenge',
    challengeId: 'double-jump-trial',
    personalBestUnit: 'seconds',
  },
  {
    id: 'precision-parking',
    title: 'Precision Parking Test',
    category: 'STUNTS',
    difficulty: 'Normal',
    objective: 'Align inside Bay A, Bay B, and tight Bay C under 3 km/h within heading tolerance.',
    startLocationLabel: 'Arena Parking West Lane',
    startPoint: { x: 82, z: 36 },
    startYaw: Math.PI,
    controlsHint: 'S/B Brake Slow · Align Heading Inside Lines · Hold 0.8s',
    rewardSummary: 'Precision Driver Record',
    mode: 'challenge',
    challengeId: 'precision-parking',
    personalBestUnit: 'score',
  },
  // WATER
  {
    id: 'lagoon-run',
    title: 'Lagoon Run Amphibious Trial',
    category: 'WATER',
    difficulty: 'Normal',
    objective: 'Splash into the shallow lagoon, weave past rocks & buoys through 5 gates, exit onto the dock.',
    startLocationLabel: 'Amphibious Lagoon North Bank',
    startPoint: { x: -34, z: 84 },
    startYaw: Math.PI,
    controlsHint: 'W Steady Throttle in Water · Avoid Red Buoys & Rocks',
    rewardSummary: 'Amphibious Aqua Skin & Water Time PB',
    mode: 'challenge',
    challengeId: 'lagoon-run',
    personalBestUnit: 'seconds',
  },
  // TECHNOLOGY
  {
    id: 'delivery',
    title: '3-Stop Express Parcel Run',
    category: 'TECHNOLOGY',
    difficulty: 'Normal',
    objective: 'Deliver courier packages sequentially to The Studio, The Workshop, and Signal House.',
    startLocationLabel: 'Delivery Depot',
    startPoint: { x: -38, z: 42 },
    startYaw: -0.03,
    controlsHint: 'Shift Boost · Follow Emerald Beacons',
    rewardSummary: 'DELIVERY EXPERT (+50 pts) & Courier Skin',
    mode: 'challenge',
    challengeId: 'delivery',
  },
  {
    id: 'sql',
    title: 'Query Valley SQL Circuit',
    category: 'TECHNOLOGY',
    difficulty: 'Normal',
    objective: 'Drive through SELECT → FROM → JOIN → WHERE gates in strict relational order.',
    startLocationLabel: 'Query Valley Entrance',
    startPoint: { x: 30, z: -52 },
    startYaw: -0.46,
    controlsHint: 'Follow Relational Clause Order · No Gate Skipping',
    rewardSummary: 'DATABASE MASTER (+50 pts) & Query Cobalt Skin',
    mode: 'challenge',
    challengeId: 'sql',
  },
  {
    id: 'rfid',
    title: 'Signal Workshop RFID Gate',
    category: 'TECHNOLOGY',
    difficulty: 'Normal',
    objective: 'Find the RC522 RFID Keycard, scan at the security barrier pad, and exit the compound.',
    startLocationLabel: 'Signal Workshop Compound',
    startPoint: { x: 40, z: 42 },
    startYaw: -Math.PI * 0.5,
    controlsHint: 'Drive onto Keycard -> Scan at Barrier -> Clear Gate',
    rewardSummary: 'SECURITY EXPERT (+50 pts) & Signal Crimson Skin',
    mode: 'challenge',
    challengeId: 'rfid',
  },
  {
    id: 'bughunt',
    title: 'Workshop Bug Hunt',
    category: 'TECHNOLOGY',
    difficulty: 'Beginner',
    objective: 'Locate and squash all 3 glitch bugs crawling around The Workshop lab yard.',
    startLocationLabel: 'The Workshop',
    startPoint: { x: 64, z: 2 },
    startYaw: -1.03,
    controlsHint: 'Look for Red Pulsing Glitch Cubes around Lab',
    rewardSummary: 'Workshop Lab Clearance',
    mode: 'challenge',
    challengeId: 'bughunt',
  },
  {
    id: 'memory',
    title: 'Summit Illuminated Memory',
    category: 'TECHNOLOGY',
    difficulty: 'Normal',
    objective: 'Watch the 4-pad light sequence at Lookout Hill and drive across them in matching order.',
    startLocationLabel: 'Lookout Hill Summit',
    startPoint: { x: 0, z: -58 },
    startYaw: 0,
    controlsHint: 'Memorize Flash Sequence · Drive Over Matching Pads',
    rewardSummary: 'Lookout Summit Mastery',
    mode: 'challenge',
    challengeId: 'memory',
  },
];
