import type {
  AchievementDef,
  AchievementReward,
  CollectibleDef,
  HeadlightEffectType,
  LeaderboardEntry,
  SecretLocationDef,
  VehicleAccessoryType,
  VehicleChassisType,
  WeatherMode,
  WhisperMessage,
  WorldLandmark,
} from '../types/portfolio.ts';
import { JOURNEY_MILESTONES } from './journeyData.ts';
import { DEVELOPER_PROFILE } from './profileData.ts';
import { PORTFOLIO_PROJECTS, getProjectCounts } from './projectsData.ts';
import { SERVICES_LIST } from './servicesData.ts';
import { SKILL_CATEGORIES, SKILLS_CATALOG } from './skillsData.ts';

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
    position: { x: -66, y: 0, z: 18 },
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
  { id: 'orb-three', kind: 'orb', x: -42, z: -4, label: 'Skill Orb · Three.js & WebGL' },
  { id: 'orb-sql', kind: 'orb', x: 40, z: -22, label: 'Skill Orb · MySQL & PL/SQL' },
  { id: 'orb-php', kind: 'orb', x: -28, z: -28, label: 'Skill Orb · PHP & Laravel Craft' },
  { id: 'orb-kotlin', kind: 'orb', x: 54, z: 14, label: 'Skill Orb · Kotlin & Android' },
  { id: 'orb-flutter', kind: 'orb', x: 16, z: 32, label: 'Skill Orb · Flutter & Dart' },
  { id: 'orb-git', kind: 'orb', x: -50, z: 24, label: 'Skill Orb · Git & Workflow' },
  { id: 'orb-arduino', kind: 'orb', x: 34, z: 36, label: 'Skill Orb · Arduino & RFID' },

  // 6 Hidden Tokens
  { id: 'token-plaza', kind: 'token', x: 10, z: 10, label: 'Plaza Founder Token' },
  { id: 'token-lookout', kind: 'token', x: 0, z: -64, label: 'Lookout Ridge Token' },
  { id: 'token-paddock', kind: 'token', x: -78, z: 18, label: 'Paddock Apex Token' },
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
  { id: 'cp-1', label: 'Sector 1 · North Curve', x: -66, z: 0 },
  { id: 'cp-2', label: 'Sector 2 · West Hairpin', x: -84, z: 18 },
  { id: 'cp-3', label: 'Sector 3 · South Sweeper', x: -66, z: 36 },
  { id: 'cp-4', label: 'Sector 4 · Pit Return', x: -48, z: 18 },
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
    unlockLabel: 'Unlock: Complete all 9 other achievements',
  },
];

export const GARAGE_ACCESSORY_OPTIONS: {
  id: VehicleAccessoryType;
  label: string;
  desc: string;
}[] = [
  { id: 'spare-tire', label: 'Roof Spare Wheel', desc: 'Classic expedition wheel mounted over the rear deck' },
  { id: 'roof-lights', label: 'Rally Light Bar', desc: 'Quad roof-mounted spotlights for night & fog visibility' },
  { id: 'cargo-box', label: 'Delivery Crate Pack', desc: 'Strapped expedition cargo crate for courier runs' },
  { id: 'spoiler', label: 'Circuit Rear Wing', desc: 'Twin-strut aerodynamic wing for The Paddock loop' },
  { id: 'none', label: 'Clean Roof', desc: 'Streamlined factory roof with zero attachments' },
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
