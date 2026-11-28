export type GamePhase = 'loading' | 'title' | 'playing' | 'paused' | 'photomode';

export type QualityLevel = 'low' | 'medium' | 'high';

export type WeatherMode = 'sunny' | 'sunset' | 'night' | 'rain' | 'fog' | 'storm' | 'clear';

export type DrivingAssistLevel = 'easy' | 'normal' | 'pro';

export type WindMode = 'auto' | 'calm' | 'normal' | 'strong';

export type CameraMode = 'chase' | 'close' | 'far' | 'topdown' | 'orbit';

export type LandmarkCategory = 'Portfolio' | 'Challenge' | 'Circuit';

export interface WorldLandmark {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  zoneLabel: string;
  category: LandmarkCategory;
  challengeType?: 'delivery' | 'sql' | 'rfid' | 'race' | 'bughunt' | 'memory' | 'treasure' | 'timetrial';
  position: { x: number; y?: number; z: number };
  radius: number;
  color: string;
  summary: string;
  highlights: string[];
}

export type CollectibleKind = 'orb' | 'token' | 'fragment' | 'secret';

export interface CollectibleDef {
  id: string;
  kind: CollectibleKind;
  x: number;
  z: number;
  label: string;
  hint?: string;
}

export interface SecretLocationDef {
  id: string;
  title: string;
  x: number;
  z: number;
  radius: number;
  description: string;
}

export type ProjectCategory =
  | 'Web Application'
  | 'Reservation Platform'
  | 'E-Commerce'
  | 'Business Operations'
  | 'Full-Stack Web Application'
  | 'Android Application'
  | 'Mobile Application'
  | 'Coursework Project'
  | 'Hardware & Automation'
  | 'Electronics Prototype';

export type ProjectStatus =
  | 'Personal project'
  | 'Client work'
  | 'In development'
  | 'Coursework'
  | 'Prototype / Design'
  | 'Electronics prototype';

export type ProjectPreviewKind =
  | 'lms'
  | 'hotel-booking'
  | 'ecommerce'
  | 'store-ops'
  | 'granbell'
  | 'galleryx'
  | 'mobile-utilities'
  | 'media-portal'
  | 'smartmove'
  | 'coconut-automation'
  | 'smart-gate';

export interface PortfolioProject {
  number: string;
  slug: string;
  title: string;
  category: ProjectCategory;
  status: ProjectStatus;
  technologies: string[];
  description: string;
  implementedFeatures: string[];
  plannedFeatures: string[];
  contribution: string;
  role?: string;
  problemSolved?: string;
  architectureSummary?: string;
  outcomeNote?: string;
  previewKind: ProjectPreviewKind;
  accentColor: string;
  links: {
    liveUrl: string;
    repoUrl: string;
    livePlaceholder: string;
    repoPlaceholder: string;
  };
}

export type SkillCategoryName =
  | 'Frontend'
  | 'Backend and Databases'
  | 'Mobile and Games'
  | 'Tools and Workflow'
  | 'Creative Work';

export interface SkillItem {
  id: string;
  name: string;
  category: SkillCategoryName;
  shortDescription: string;
  detailDescription: string;
  symbolKey: string;
  accentColor: string;
}

export interface JourneyMilestone {
  id: string;
  title: string;
  organization: string;
  period: string;
  statusLabel: string;
  type: 'Education' | 'Experience' | 'Exploration';
  location: string;
  description: string;
}

export interface ServiceOffering {
  id: string;
  number: string;
  title: string;
  tier: 'Established Service' | 'Exploratory Area';
  description: string;
  technologies: string[];
  focusAreas: string[];
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  points: number;
  category: 'Exploration' | 'Driving' | 'Discovery';
}

export interface AchievementReward {
  id: string;
  title: string;
  unlockRequirement: string;
  rewardDetail: string;
  requiredScore: number;
}

export type VehicleChassisType = 'buggy' | 'rover' | 'rally';
export type VehicleRimStyle = 'classic-5spoke' | 'offroad-beadlock' | 'aero-mesh' | 'turbo-fan';
export type VehicleAccessoryType =
  | 'none'
  | 'spare-tire'
  | 'roof-lights'
  | 'cargo-box'
  | 'spoiler'
  | 'trail-expedition-rack';
export type HeadlightEffectType = 'warm-halogen' | 'cool-led' | 'amber-rally';
export type WaterDriveState = 'dry' | 'entry' | 'shallow' | 'exit' | 'deep-warning';

export interface VehicleConfig {
  chassisType: VehicleChassisType;
  paintColor: string;
  accentColor: string;
  skinId: string;
  wheelStyle: 'all-terrain' | 'sport' | 'dune';
  rimStyle?: VehicleRimStyle;
  accessory: VehicleAccessoryType;
  headlightEffect: HeadlightEffectType;
  plateText: string;
  engineTier: 1 | 2 | 3;
  suspensionTier: 1 | 2 | 3;
  boostTier: 1 | 2 | 3;
}

export interface ChallengeBests {
  bestDriftScore: number;
  bestStuntScore: number;
  bestLagoonRunSeconds: number | null;
  bestDoubleJumpSeconds: number | null;
  bestParkingScore: number;
  bestForestTrailSeconds: number | null;
}

export interface GameSettings {
  quality: QualityLevel;
  weatherMode: WeatherMode;
  windMode?: WindMode;
  audioEnabled: boolean;
  musicEnabled: boolean;
  sfxVolume: number;
  musicVolume: number;
  cameraMode: CameraMode;
  showTouchControls: 'auto' | 'always' | 'off';
  ghostEnabled: boolean;
  headlightsOn: boolean;
  reducedMotion: boolean;
  assistLevel?: DrivingAssistLevel;
  dayNightCycle?: boolean;
  audioCaptions?: boolean;
}

export interface AuthUserSummary {
  uid: string;
  displayName: string;
  photoURL: string | null;
  emailVerified: boolean;
  isAdmin: boolean;
}

export interface LeaderboardEntry {
  id: string;
  uid?: string;
  driver: string;
  vehicle: string;
  lapSeconds: number;
  recordedAt: string;
  runId?: string;
  serverVerified?: boolean;
  isPlayer?: boolean;
}

export type WhisperStatus = 'published' | 'flagged' | 'removed';
export type WhisperReportReason = 'spam' | 'offensive' | 'harassment' | 'other';

export interface WhisperMessage {
  id: string;
  authorUid?: string;
  author: string;
  countryCode: string;
  role?: string;
  message: string;
  status: WhisperStatus;
  reportCount: number;
  createdAt: string;
  createdAtMs?: number;
  serverVerified?: boolean;
}

export interface GhostSample {
  t: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export type ActiveChallengeId =
  | 'delivery'
  | 'sql'
  | 'rfid'
  | 'bughunt'
  | 'memory'
  | 'treasure'
  | 'timetrial'
  | 'lagoon-run'
  | 'drift-master'
  | 'stunt-master'
  | 'double-jump-trial'
  | 'precision-parking'
  | 'forest-trail'
  | null;

export type MissionCategoryGroup =
  | 'EXPLORATION'
  | 'RACING'
  | 'STUNTS'
  | 'WATER'
  | 'TECHNOLOGY';

export interface MissionCatalogItem {
  id: string;
  title: string;
  category: MissionCategoryGroup;
  difficulty: 'Beginner' | 'Normal' | 'Pro';
  objective: string;
  startLocationLabel: string;
  startPoint: { x: number; z: number };
  startYaw?: number;
  controlsHint: string;
  rewardSummary: string;
  mode: 'challenge' | 'race' | 'tour';
  challengeId?: Exclude<ActiveChallengeId, null>;
  personalBestUnit?: 'score' | 'seconds';
}

export interface ActiveChallengeHud {
  id: ActiveChallengeId;
  title: string;
  objective: string;
  progressText: string;
  progressCurrent: number;
  progressTotal: number;
  timerSec: number | null;
  timeLimitSec: number | null;
  status: 'idle' | 'active' | 'completed' | 'failed';
  rewardText: string;
  feedbackText?: string;
  liveScore?: number;
  targetScore?: number;
}

export interface RaceHudState {
  phase: 'idle' | 'countdown' | 'racing' | 'finished';
  countdownVal: number;
  elapsedSec: number;
  checkpointIndex: number;
  totalCheckpoints: number;
  bestTimeSec: number | null;
  lastTimeSec: number | null;
  isNewBest: boolean;
  ghostActive: boolean;
}

export interface GameHudSnapshot {
  speedKmh: number;
  boostCharge: number;
  isBoosting: boolean;
  isDrifting: boolean;
  isGrounded: boolean;
  jumpsRemaining: number;
  maxJumps: number;
  isOverturned: boolean;
  autoRecoverProgress: number;
  waterState: WaterDriveState;
  waterDepth: number;
  driftScoreActive: number;
  driftCombo: number;
  driftTotalScore: number;
  stuntScore: number;
  pitchDeg: number;
  rollDeg: number;
  headlightsOn: boolean;
  zoneName: string;
  nearestLandmark: WorldLandmark | null;
  playerX: number;
  playerY: number;
  playerZ: number;
  headingRad: number;
  distanceDrivenMeters: number;
  orbsFound: number;
  totalOrbs: number;
  tokensFound: number;
  totalTokens: number;
  fragmentsFound: number;
  totalFragments: number;
  secretsFound: number;
  totalSecrets: number;
  gear?: number;
  rpm?: number;
  boundaryDistMeters?: number;
  driftHint?: string;
  missionDistanceMeters?: number;
  missionBearingDeg?: number;
  timeTrialDeltaSec?: number | null;
  timeTrialMedal?: 'Bronze' | 'Silver' | 'Gold' | null;
  companionDroneText?: string | null;
  freedToast?: string | null;
  audioCaptionText?: string | null;
  activeChallenge: ActiveChallengeHud;
  race: RaceHudState;
}
