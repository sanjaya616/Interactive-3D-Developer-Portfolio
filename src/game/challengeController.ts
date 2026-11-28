import {
  BUG_HUNT_TARGETS,
  DOUBLE_JUMP_PLATFORMS,
  DRIFT_CIRCUIT_CHECKPOINTS,
  FOREST_TRAIL_GATES,
  LAGOON_RUN_CHECKPOINTS,
  LAGOON_RUN_OBSTACLES,
  MEMORY_PADS,
  PADDOCK_CHECKPOINTS,
  PRECISION_PARKING_BAYS,
  SQL_CHALLENGE_GATES,
  STUNT_AIR_CHECKPOINTS,
  TIME_TRIAL_CHECKPOINTS,
  TREASURE_CHESTS,
  WORLD_LANDMARKS,
} from '../data/portfolioData';
import { PADDOCK_CENTER } from './worldConstants';
import type {
  ActiveChallengeHud,
  ActiveChallengeId,
  GhostSample,
  RaceHudState,
} from '../types/portfolio';

export const DELIVERY_ROUTE_IDS = ['studio', 'workshop', 'signal-house'] as const;
const MEMORY_SEQUENCE = [0, 1, 3, 2];

export interface ChallengeTickTelemetry {
  py?: number;
  yaw?: number;
  speedMs?: number;
  isGrounded?: boolean;
  isOverturned?: boolean;
  justDoubleJumped?: boolean;
  justLanded?: boolean;
  driftActiveScore?: number;
  driftBankedNow?: number;
  driftPenalizedNow?: boolean;
}

export interface ChallengeTickEffects {
  playChime?: boolean;
  playClick?: boolean;
  playBeep?: boolean;
  playGo?: boolean;
  unlockAchievementId?: string;
  completeChallengeId?: string;
  challengeMetric?: { id: Exclude<ActiveChallengeId, null>; value: number };
  toastMessage?: string;
  securityGateOpen?: boolean;
  rfidCardCollected?: boolean;
  deliveryTargetId?: string | null;
  sqlNextIdx?: number;
  paddockNextIdx?: number;
  timeTrialNextIdx?: number | null;
  bugHuntFoundIds?: string[];
  memoryHighlightPadId?: number | null;
  treasureFoundIds?: string[];
  lagoonRunNextIdx?: number | null;
  driftGateNextIdx?: number | null;
  stuntAirFoundIds?: string[];
  parkingBayState?: { nextIdx: number | null; alignPct: number };
  forestTrailNextIdx?: number | null;
  raceFinished?: { lapSeconds: number; ghostFrames: GhostSample[] };
}

const ALL_STUNT_IDS = STUNT_AIR_CHECKPOINTS.map((c) => c.id);

export class ChallengeManager {
  private activeId: ActiveChallengeId = null;
  private status: ActiveChallengeHud['status'] = 'idle';
  private timerSec: number | null = null;
  private timeLimitSec: number | null = null;
  private feedbackText: string | undefined;

  // Delivery (3 consecutive stops)
  private deliveryStep = 0;

  // SQL (0..3 -> SELECT, FROM, JOIN, WHERE)
  private sqlStep = 0;

  // RFID (0 = collect card, 1 = scan at booth, 2 = pass gate)
  private rfidStep = 0;

  // Bug Hunt
  private bugsFound = new Set<string>();

  // Treasure Hunt
  private treasuresFound = new Set<string>();

  // Memory Sequence
  private memoryPhase: 'playback' | 'input' = 'playback';
  private memoryPlaybackTimer = 0;
  private memoryInputStep = 0;
  private memoryCooldown = 0;
  private memoryCurrentHighlight: number | null = null;

  // Time Trial
  private timeTrialStep = 0;

  // Lagoon Run
  private lagoonStep = 0;
  private lagoonElapsedSec = 0;
  private lagoonPenaltyCooldown = 0;
  private lagoonCountdownSec = 0;
  private lagoonCountdownInt = 0;

  // Drift Master
  private driftGateStep = 0;
  private driftGatesCleared = 0;
  private driftChallengeScore = 0;

  // Stunt Master
  private stuntGatesCleared = new Set<string>();
  private stuntBankedTotal = 0;
  private stuntPendingAirPts = 0;

  // Double-Jump Sky Trial
  private djStep = 0;
  private djElapsedSec = 0;

  // Precision Parking
  private parkingStep = 0;
  private parkingHoldSec = 0;
  private parkingScoreTotal = 0;
  private parkingAlignPct = 0;

  // Forest Trail
  private ftStep = 0;
  private ftElapsedSec = 0;

  // Paddock Race
  private racePhase: RaceHudState['phase'] = 'idle';
  private raceCountdown = 0;
  private lastCountdownInt = 0;
  private raceElapsedSec = 0;
  private raceCpIndex = 0;
  private raceBestSec: number | null = null;
  private raceLastSec: number | null = null;
  private raceIsNewBest = false;
  private recordedGhost: GhostSample[] = [];
  private ghostSampleTimer = 0;
  private savedGhost: GhostSample[] = [];

  setSavedRaceData(bestSec: number | null, lastSec: number | null, ghost: GhostSample[]): void {
    this.raceBestSec = bestSec;
    this.raceLastSec = lastSec;
    this.savedGhost = ghost;
  }

  getActiveChallengeId(): ActiveChallengeId {
    return this.activeId;
  }

  getRacePhase(): RaceHudState['phase'] {
    return this.racePhase;
  }

  isThrottleLocked(): boolean {
    return (
      this.racePhase === 'countdown' ||
      (this.activeId === 'lagoon-run' && this.status === 'active' && this.lagoonCountdownSec > 0)
    );
  }

  getLiveStuntScore(): number {
    return Math.round(this.stuntBankedTotal + this.stuntPendingAirPts);
  }

  getActiveTargetPoint(): { x: number; z: number; label: string } | null {
    if (this.racePhase === 'countdown' || this.racePhase === 'racing') {
      if (this.raceCpIndex < PADDOCK_CHECKPOINTS.length) {
        const cp = PADDOCK_CHECKPOINTS[this.raceCpIndex];
        return { x: cp.x, z: cp.z, label: cp.label || `Sector ${this.raceCpIndex + 1}` };
      }
      return { x: PADDOCK_CENTER.x, z: PADDOCK_CENTER.z, label: 'Finish Gantry' };
    }
    if (this.status !== 'active' || !this.activeId) return null;

    if (this.activeId === 'delivery') {
      const targetId = DELIVERY_ROUTE_IDS[Math.min(this.deliveryStep, DELIVERY_ROUTE_IDS.length - 1)];
      const lm = WORLD_LANDMARKS.find((l) => l.id === targetId);
      return lm ? { x: lm.position.x, z: lm.position.z, label: lm.title } : null;
    }
    if (this.activeId === 'sql') {
      const g = SQL_CHALLENGE_GATES[Math.min(this.sqlStep, SQL_CHALLENGE_GATES.length - 1)];
      return g ? { x: g.x, z: g.z, label: `SQL ${g.clause}` } : null;
    }
    if (this.activeId === 'rfid') {
      if (this.rfidStep === 0) return { x: 54, z: 42, label: 'RFID Keycard #4092' };
      if (this.rfidStep === 1) return { x: 44, z: 48, label: 'Scanner Booth' };
      return { x: 48, z: 55, label: 'Compound Exit Gate' };
    }
    if (this.activeId === 'bughunt') {
      const nextBug = BUG_HUNT_TARGETS.find((b) => !this.bugsFound.has(b.id));
      return nextBug ? { x: nextBug.x, z: nextBug.z, label: nextBug.label } : null;
    }
    if (this.activeId === 'memory') {
      const padId = MEMORY_SEQUENCE[Math.min(this.memoryInputStep, MEMORY_SEQUENCE.length - 1)];
      const pad = MEMORY_PADS.find((p) => p.id === padId) ?? MEMORY_PADS[0];
      return pad ? { x: pad.x, z: pad.z, label: pad.label } : null;
    }
    if (this.activeId === 'treasure') {
      const chest = TREASURE_CHESTS.find((t) => !this.treasuresFound.has(t.id));
      return chest ? { x: chest.x, z: chest.z, label: chest.label } : null;
    }
    if (this.activeId === 'timetrial') {
      const cp = TIME_TRIAL_CHECKPOINTS[Math.min(this.timeTrialStep, TIME_TRIAL_CHECKPOINTS.length - 1)];
      return cp ? { x: cp.x, z: cp.z, label: cp.label } : null;
    }
    if (this.activeId === 'lagoon-run') {
      const cp = LAGOON_RUN_CHECKPOINTS[Math.min(this.lagoonStep, LAGOON_RUN_CHECKPOINTS.length - 1)];
      return cp ? { x: cp.x, z: cp.z, label: cp.label } : null;
    }
    if (this.activeId === 'drift-master') {
      const cp = DRIFT_CIRCUIT_CHECKPOINTS[this.driftGateStep % DRIFT_CIRCUIT_CHECKPOINTS.length];
      return cp ? { x: cp.x, z: cp.z, label: cp.label } : null;
    }
    if (this.activeId === 'stunt-master') {
      const sc = STUNT_AIR_CHECKPOINTS.find((c) => !this.stuntGatesCleared.has(c.id)) ?? STUNT_AIR_CHECKPOINTS[0];
      return sc ? { x: sc.x, z: sc.z, label: sc.label } : null;
    }
    if (this.activeId === 'double-jump-trial') {
      const p = DOUBLE_JUMP_PLATFORMS[Math.min(this.djStep, DOUBLE_JUMP_PLATFORMS.length - 1)];
      return p ? { x: p.x, z: p.z, label: p.label } : null;
    }
    if (this.activeId === 'precision-parking') {
      const bay = PRECISION_PARKING_BAYS[Math.min(this.parkingStep, PRECISION_PARKING_BAYS.length - 1)];
      return bay ? { x: bay.x, z: bay.z, label: bay.label } : null;
    }
    if (this.activeId === 'forest-trail') {
      const g = FOREST_TRAIL_GATES[Math.min(this.ftStep, FOREST_TRAIL_GATES.length - 1)];
      return g ? { x: g.x, z: g.z, label: g.label } : null;
    }
    return null;
  }

  startChallenge(id: Exclude<ActiveChallengeId, null>): ChallengeTickEffects {
    if (this.racePhase !== 'idle') {
      this.racePhase = 'idle';
      this.raceCountdown = 0;
      this.raceElapsedSec = 0;
      this.raceCpIndex = 0;
    }
    this.lagoonCountdownSec = 0;
    this.lagoonCountdownInt = 0;
    this.activeId = id;
    this.status = 'active';
    this.feedbackText = undefined;
    this.timerSec = null;
    this.timeLimitSec = null;

    const fx: ChallengeTickEffects = {
      playClick: true,
      deliveryTargetId: null,
      timeTrialNextIdx: null,
      memoryHighlightPadId: null,
      paddockNextIdx: 0,
      rfidCardCollected: false,
      securityGateOpen: false,
      sqlNextIdx: 0,
      lagoonRunNextIdx: null,
      driftGateNextIdx: null,
      stuntAirFoundIds: ALL_STUNT_IDS,
      parkingBayState: { nextIdx: null, alignPct: 0 },
      forestTrailNextIdx: null,
    };

    if (id === 'delivery') {
      this.deliveryStep = 0;
      fx.deliveryTargetId = DELIVERY_ROUTE_IDS[0];
      fx.toastMessage = 'Delivery Run Started: Head to The Studio (1/3)!';
    } else if (id === 'sql') {
      this.sqlStep = 0;
      fx.sqlNextIdx = 0;
      fx.toastMessage = 'Query Valley: Drive through SELECT → FROM → JOIN → WHERE in order!';
    } else if (id === 'rfid') {
      this.rfidStep = 0;
      fx.rfidCardCollected = false;
      fx.securityGateOpen = false;
      fx.toastMessage = 'Security Mission: Find the glowing RFID Keycard near Signal Workshop!';
    } else if (id === 'bughunt') {
      this.bugsFound.clear();
      fx.bugHuntFoundIds = [];
      fx.toastMessage = 'Bug Hunt: Squash all 3 glitch bugs around The Workshop!';
    } else if (id === 'memory') {
      this.memoryPhase = 'playback';
      this.memoryPlaybackTimer = 0;
      this.memoryInputStep = 0;
      this.memoryCooldown = 0;
      fx.toastMessage = 'Memory Challenge: Watch the 4 illuminated Lookout Hill pads!';
    } else if (id === 'treasure') {
      this.treasuresFound.clear();
      fx.treasureFoundIds = [];
      fx.toastMessage = 'Treasure Hunt: Find all 4 hidden treasure chests across the world!';
    } else if (id === 'timetrial') {
      this.timeTrialStep = 0;
      this.timerSec = 45.0;
      this.timeLimitSec = 45.0;
      fx.timeTrialNextIdx = 0;
      fx.toastMessage = 'Time Trial: Clear all 5 ring gates within 45 seconds!';
    } else if (id === 'lagoon-run') {
      this.lagoonStep = 0;
      this.lagoonElapsedSec = 0;
      this.lagoonPenaltyCooldown = 0;
      this.lagoonCountdownSec = 2.5;
      this.lagoonCountdownInt = 4;
      this.timerSec = 0;
      this.feedbackText = 'Launch in 3...';
      fx.lagoonRunNextIdx = 0;
      fx.toastMessage = 'Lagoon Run: 3-2-1 countdown on north bank! Weave past buoys to Exit Dock!';
    } else if (id === 'drift-master') {
      this.driftGateStep = 0;
      this.driftGatesCleared = 0;
      this.driftChallengeScore = 0;
      fx.driftGateNextIdx = 0;
      fx.toastMessage = 'Drift Master: Hold X to drift through 4 Arena hairpins & hit 1,200 pts!';
    } else if (id === 'stunt-master') {
      this.stuntGatesCleared.clear();
      this.stuntBankedTotal = 0;
      this.stuntPendingAirPts = 0;
      fx.stuntAirFoundIds = [];
      fx.toastMessage = 'Stunt Master: Hit launch ramps + Space x2 jump for 800+ Stunt pts!';
    } else if (id === 'double-jump-trial') {
      this.djStep = 0;
      this.djElapsedSec = 0;
      this.timerSec = 0;
      fx.toastMessage = 'Sky Trial: Jump onto Sky Step Alpha, then double-jump to Sky Deck Omega!';
    } else if (id === 'precision-parking') {
      this.parkingStep = 0;
      this.parkingHoldSec = 0;
      this.parkingScoreTotal = 0;
      this.parkingAlignPct = 0;
      fx.parkingBayState = { nextIdx: 0, alignPct: 0 };
      fx.toastMessage = 'Precision Parking: Stop cleanly inside Bay A, Bay B & tight Bay C!';
    } else if (id === 'forest-trail') {
      this.ftStep = 0;
      this.ftElapsedSec = 0;
      this.timerSec = 0;
      fx.forestTrailNextIdx = 0;
      fx.toastMessage = 'Forest Trail: Cross the Timber Brook Bridge through all 5 woodland gates!';
    }
    return fx;
  }

  restartActiveChallenge(): ChallengeTickEffects {
    if (!this.activeId) return {};
    return this.startChallenge(this.activeId);
  }

  cancelChallenge(): ChallengeTickEffects {
    this.activeId = null;
    this.status = 'idle';
    this.timerSec = null;
    this.timeLimitSec = null;
    this.feedbackText = undefined;
    this.rfidStep = 0;
    this.sqlStep = 0;
    return {
      deliveryTargetId: null,
      timeTrialNextIdx: null,
      memoryHighlightPadId: null,
      rfidCardCollected: false,
      securityGateOpen: false,
      sqlNextIdx: 0,
      lagoonRunNextIdx: null,
      driftGateNextIdx: null,
      stuntAirFoundIds: ALL_STUNT_IDS,
      parkingBayState: { nextIdx: null, alignPct: 0 },
      forestTrailNextIdx: null,
    };
  }

  startRace(ghostEnabled: boolean): ChallengeTickEffects {
    this.activeId = null;
    this.status = 'idle';
    this.timerSec = null;
    this.timeLimitSec = null;
    this.feedbackText = undefined;
    this.rfidStep = 0;
    this.sqlStep = 0;

    this.racePhase = 'countdown';
    this.raceCountdown = 3.0;
    this.lastCountdownInt = 4;
    this.raceElapsedSec = 0;
    this.raceCpIndex = 0;
    this.raceIsNewBest = false;
    this.recordedGhost = [];
    this.ghostSampleTimer = 0;
    return {
      deliveryTargetId: null,
      timeTrialNextIdx: null,
      memoryHighlightPadId: null,
      rfidCardCollected: false,
      securityGateOpen: false,
      sqlNextIdx: 0,
      paddockNextIdx: 0,
      lagoonRunNextIdx: null,
      driftGateNextIdx: null,
      stuntAirFoundIds: ALL_STUNT_IDS,
      parkingBayState: { nextIdx: null, alignPct: 0 },
      forestTrailNextIdx: null,
      toastMessage: ghostEnabled && this.savedGhost.length > 0
        ? 'The Paddock Race: 3-2-1 countdown — Ghost Replay active!'
        : 'The Paddock Race: Get ready for 3-2-1-GO!',
    };
  }

  stopRace(): ChallengeTickEffects {
    this.racePhase = 'idle';
    this.raceCountdown = 0;
    this.raceElapsedSec = 0;
    this.raceCpIndex = 0;
    return { paddockNextIdx: 0 };
  }

  dismissRaceResults(): void {
    if (this.racePhase === 'finished') {
      this.racePhase = 'idle';
    }
  }

  sampleGhostPose(dt: number, x: number, y: number, z: number, yaw: number): GhostSample | null {
    if (this.racePhase === 'racing') {
      this.ghostSampleTimer += dt;
      if (this.ghostSampleTimer >= 0.08 && this.recordedGhost.length < 1100) {
        this.ghostSampleTimer = 0;
        this.recordedGhost.push({
          t: Number(this.raceElapsedSec.toFixed(2)),
          x: Number(x.toFixed(2)),
          y: Number(y.toFixed(2)),
          z: Number(z.toFixed(2)),
          yaw: Number(yaw.toFixed(3)),
        });
      }
    }

    if (this.racePhase !== 'racing' || this.savedGhost.length < 2) return null;
    const t = this.raceElapsedSec;
    const frames = this.savedGhost;
    if (t >= frames[frames.length - 1].t) return frames[frames.length - 1];
    for (let i = 0; i < frames.length - 1; i++) {
      const a = frames[i];
      const b = frames[i + 1];
      if (t >= a.t && t <= b.t) {
        const span = Math.max(0.001, b.t - a.t);
        const alpha = (t - a.t) / span;
        return {
          t,
          x: a.x + (b.x - a.x) * alpha,
          y: a.y + (b.y - a.y) * alpha,
          z: a.z + (b.z - a.z) * alpha,
          yaw: a.yaw + Math.atan2(Math.sin(b.yaw - a.yaw), Math.cos(b.yaw - a.yaw)) * alpha,
        };
      }
    }
    return frames[0];
  }

  tick(px: number, pz: number, dt: number, telemetry?: ChallengeTickTelemetry): ChallengeTickEffects {
    const fx: ChallengeTickEffects = {};

    // 1. Paddock Racing Update
    if (this.racePhase === 'countdown') {
      this.raceCountdown -= dt;
      const ceilInt = Math.ceil(this.raceCountdown);
      if (ceilInt > 0 && ceilInt < this.lastCountdownInt) {
        this.lastCountdownInt = ceilInt;
        fx.playBeep = true;
      }
      if (this.raceCountdown <= 0) {
        this.racePhase = 'racing';
        this.raceCountdown = 0;
        fx.playGo = true;
        fx.toastMessage = 'GO! Hit all 4 sector checkpoints!';
      }
    } else if (this.racePhase === 'racing') {
      this.raceElapsedSec += dt;
      if (this.raceCpIndex < PADDOCK_CHECKPOINTS.length) {
        const targetCp = PADDOCK_CHECKPOINTS[this.raceCpIndex];
        if (Math.hypot(px - targetCp.x, pz - targetCp.z) <= 9.5) {
          this.raceCpIndex++;
          fx.paddockNextIdx = this.raceCpIndex;
          fx.playClick = true;
          if (this.raceCpIndex === PADDOCK_CHECKPOINTS.length) {
            fx.toastMessage = 'Final Sector Clear — Sprint to the Checkered Gantry!';
          }
        }
      } else {
        // Cross finish line at Paddock
        if (Math.hypot(px - PADDOCK_CENTER.x, pz - PADDOCK_CENTER.z) <= 8.5 && this.raceElapsedSec > 5) {
          const cleanSec = Number(this.raceElapsedSec.toFixed(2));
          this.racePhase = 'finished';
          this.raceLastSec = cleanSec;
          this.raceIsNewBest = this.raceBestSec === null || cleanSec < this.raceBestSec;
          if (this.raceIsNewBest) {
            this.raceBestSec = cleanSec;
            this.savedGhost = [...this.recordedGhost];
          }
          fx.playChime = true;
          fx.raceFinished = { lapSeconds: cleanSec, ghostFrames: [...this.recordedGhost] };
          fx.paddockNextIdx = 0;
        }
      }
    }

    // 2. Active World Challenge Update
    if (this.status !== 'active' || !this.activeId) return fx;

    if (this.activeId === 'delivery') {
      const targetId = DELIVERY_ROUTE_IDS[this.deliveryStep];
      const targetLm = WORLD_LANDMARKS.find((l) => l.id === targetId);
      if (targetLm && Math.hypot(px - targetLm.position.x, pz - targetLm.position.z) <= targetLm.radius + 1.5) {
        this.deliveryStep++;
        if (this.deliveryStep >= DELIVERY_ROUTE_IDS.length) {
          this.status = 'completed';
          fx.deliveryTargetId = null;
          fx.playChime = true;
          fx.unlockAchievementId = 'delivery-expert';
          fx.completeChallengeId = 'delivery';
          fx.toastMessage = 'All 3 Express Parcels Delivered!';
        } else {
          const nextId = DELIVERY_ROUTE_IDS[this.deliveryStep];
          const nextLm = WORLD_LANDMARKS.find((l) => l.id === nextId);
          fx.deliveryTargetId = nextId;
          fx.playClick = true;
          fx.toastMessage = `Stop ${this.deliveryStep}/3 clear! Next → ${nextLm?.title}`;
        }
      }
    } else if (this.activeId === 'sql') {
      const expected = SQL_CHALLENGE_GATES[this.sqlStep];
      if (Math.hypot(px - expected.x, pz - expected.z) <= 4.8) {
        this.sqlStep++;
        this.feedbackText = undefined;
        fx.sqlNextIdx = this.sqlStep;
        if (this.sqlStep >= SQL_CHALLENGE_GATES.length) {
          this.status = 'completed';
          fx.playChime = true;
          fx.unlockAchievementId = 'database-master';
          fx.completeChallengeId = 'sql';
          fx.toastMessage = 'SQL Query Complete: SELECT → FROM → JOIN → WHERE!';
        } else {
          fx.playClick = true;
          fx.toastMessage = `Gate ${expected.clause} passed! Next: ${SQL_CHALLENGE_GATES[this.sqlStep].clause}`;
        }
      } else {
        // Anti-skip check for out-of-order gates
        for (let i = this.sqlStep + 1; i < SQL_CHALLENGE_GATES.length; i++) {
          const wrong = SQL_CHALLENGE_GATES[i];
          if (Math.hypot(px - wrong.x, pz - wrong.z) <= 4.2) {
            this.feedbackText = `Out of order! Pass ${expected.clause} before ${wrong.clause}.`;
            break;
          }
        }
      }
    } else if (this.activeId === 'rfid') {
      if (this.rfidStep === 0) {
        if (Math.hypot(px - 54, pz - 42) <= 4.2) {
          this.rfidStep = 1;
          fx.rfidCardCollected = true;
          fx.playClick = true;
          fx.toastMessage = 'RFID Card #4092 Collected! Drive to Signal Workshop Scanner Pad.';
        }
      } else if (this.rfidStep === 1) {
        if (Math.hypot(px - 44, pz - 48) <= 5.5) {
          this.rfidStep = 2;
          fx.securityGateOpen = true;
          fx.playClick = true;
          fx.toastMessage = 'Card Scanned! Boom barrier raised — drive past the compound gate!';
        }
      } else if (this.rfidStep === 2) {
        // Drive past the raised compound gate checkpoint at (48, 55)
        if (Math.hypot(px - 48, pz - 55) <= 4.8) {
          this.status = 'completed';
          fx.playChime = true;
          fx.unlockAchievementId = 'security-expert';
          fx.completeChallengeId = 'rfid';
          fx.toastMessage = 'RFID Security Gate Cleared!';
        }
      }
    } else if (this.activeId === 'bughunt') {
      for (const b of BUG_HUNT_TARGETS) {
        if (!this.bugsFound.has(b.id) && Math.hypot(px - b.x, pz - b.z) <= 3.8) {
          this.bugsFound.add(b.id);
          fx.bugHuntFoundIds = Array.from(this.bugsFound);
          if (this.bugsFound.size >= BUG_HUNT_TARGETS.length) {
            this.status = 'completed';
            fx.playChime = true;
            fx.completeChallengeId = 'bughunt';
            fx.toastMessage = 'All 3 Workshop Glitch Bugs Squashed!';
          } else {
            fx.playClick = true;
            fx.toastMessage = `Squashed ${b.label} (${this.bugsFound.size}/${BUG_HUNT_TARGETS.length})`;
          }
        }
      }
    } else if (this.activeId === 'memory') {
      if (this.memoryPhase === 'playback') {
        this.memoryPlaybackTimer += dt;
        const slot = Math.floor(this.memoryPlaybackTimer / 0.85);
        const withinSlot = this.memoryPlaybackTimer % 0.85;
        if (slot < MEMORY_SEQUENCE.length) {
          const targetPad = withinSlot < 0.62 ? MEMORY_SEQUENCE[slot] : null;
          if (targetPad !== this.memoryCurrentHighlight) {
            this.memoryCurrentHighlight = targetPad;
            fx.memoryHighlightPadId = targetPad;
            if (targetPad !== null) fx.playBeep = true;
          }
        } else {
          this.memoryPhase = 'input';
          this.memoryInputStep = 0;
          this.memoryCurrentHighlight = null;
          fx.memoryHighlightPadId = null;
          fx.toastMessage = 'Your turn! Drive over the 4 pads in the illuminated order!';
        }
      } else {
        if (this.memoryCooldown > 0) this.memoryCooldown -= dt;
        if (this.memoryCooldown <= 0) {
          for (const pad of MEMORY_PADS) {
            if (Math.hypot(px - pad.x, pz - pad.z) <= 3.4) {
              this.memoryCooldown = 0.75;
              const expectedId = MEMORY_SEQUENCE[this.memoryInputStep];
              if (pad.id === expectedId) {
                this.memoryInputStep++;
                this.feedbackText = undefined;
                fx.memoryHighlightPadId = pad.id;
                if (this.memoryInputStep >= MEMORY_SEQUENCE.length) {
                  this.status = 'completed';
                  fx.playChime = true;
                  fx.completeChallengeId = 'memory';
                  fx.toastMessage = 'Memory Sequence Cleared at Lookout Hill!';
                } else {
                  fx.playClick = true;
                }
              } else {
                this.memoryPhase = 'playback';
                this.memoryPlaybackTimer = 0;
                this.memoryInputStep = 0;
                this.feedbackText = 'Wrong pad! Watch the sequence replay.';
                fx.playBeep = true;
              }
              break;
            }
          }
        }
      }
    } else if (this.activeId === 'treasure') {
      for (const tr of TREASURE_CHESTS) {
        if (!this.treasuresFound.has(tr.id) && Math.hypot(px - tr.x, pz - tr.z) <= 3.9) {
          this.treasuresFound.add(tr.id);
          fx.treasureFoundIds = Array.from(this.treasuresFound);
          if (this.treasuresFound.size >= TREASURE_CHESTS.length) {
            this.status = 'completed';
            fx.playChime = true;
            fx.completeChallengeId = 'treasure';
            fx.toastMessage = 'All 4 Studio Treasure Chests Discovered!';
          } else {
            fx.playClick = true;
            fx.toastMessage = `Chest Found: ${tr.label} (${this.treasuresFound.size}/${TREASURE_CHESTS.length})`;
          }
        }
      }
    } else if (this.activeId === 'timetrial') {
      this.timerSec = Math.max(0, (this.timerSec ?? 45) - dt);
      if (this.timerSec <= 0) {
        this.status = 'failed';
        fx.timeTrialNextIdx = null;
        fx.playBeep = true;
        fx.toastMessage = 'Time Trial Expired — Restart to try again!';
      } else {
        const target = TIME_TRIAL_CHECKPOINTS[this.timeTrialStep];
        if (Math.hypot(px - target.x, pz - target.z) <= 5.2) {
          this.timeTrialStep++;
          if (this.timeTrialStep >= TIME_TRIAL_CHECKPOINTS.length) {
            this.status = 'completed';
            fx.timeTrialNextIdx = null;
            fx.playChime = true;
            fx.completeChallengeId = 'timetrial';
            fx.toastMessage = `Time Trial Cleared with ${this.timerSec.toFixed(1)}s left!`;
          } else {
            fx.timeTrialNextIdx = this.timeTrialStep;
            fx.playClick = true;
          }
        }
      }
    } else if (this.activeId === 'lagoon-run') {
      if (this.lagoonCountdownSec > 0) {
        this.lagoonCountdownSec = Math.max(0, this.lagoonCountdownSec - dt);
        const ceilVal = Math.ceil(this.lagoonCountdownSec);
        if (ceilVal < this.lagoonCountdownInt && ceilVal > 0) {
          this.lagoonCountdownInt = ceilVal;
          fx.playBeep = true;
          this.feedbackText = `Launch in ${ceilVal}...`;
        }
        if (this.lagoonCountdownSec <= 0) {
          this.lagoonCountdownInt = 0;
          this.feedbackText = undefined;
          fx.playGo = true;
          fx.toastMessage = 'GO! Splash into Amphibious Lagoon!';
        }
        return fx;
      }

      this.lagoonElapsedSec += dt;
      this.timerSec = this.lagoonElapsedSec;
      this.lagoonPenaltyCooldown = Math.max(0, this.lagoonPenaltyCooldown - dt);

      if (this.lagoonPenaltyCooldown <= 0) {
        for (const ob of LAGOON_RUN_OBSTACLES) {
          if (Math.hypot(px - ob.x, pz - ob.z) <= ob.radius + 1.05) {
            this.lagoonElapsedSec += 2.0;
            this.timerSec = this.lagoonElapsedSec;
            this.lagoonPenaltyCooldown = 1.4;
            this.feedbackText = `Hit ${ob.kind === 'buoy' ? 'channel buoy' : 'lagoon rock'} (+2.0s penalty)`;
            fx.playBeep = true;
            break;
          }
        }
      }

      const cp = LAGOON_RUN_CHECKPOINTS[this.lagoonStep];
      if (cp && Math.hypot(px - cp.x, pz - cp.z) <= cp.radius + 1.3) {
        this.lagoonStep++;
        this.feedbackText = undefined;
        if (this.lagoonStep >= LAGOON_RUN_CHECKPOINTS.length) {
          const finalSec = Number(this.lagoonElapsedSec.toFixed(2));
          this.status = 'completed';
          fx.lagoonRunNextIdx = null;
          fx.playChime = true;
          fx.completeChallengeId = 'lagoon-run';
          fx.challengeMetric = { id: 'lagoon-run', value: finalSec };
          fx.toastMessage = `Lagoon Run Cleared in ${finalSec.toFixed(2)}s! Amphibious Aqua Skin unlocked!`;
        } else {
          fx.lagoonRunNextIdx = this.lagoonStep;
          fx.playClick = true;
          fx.toastMessage = `Gate ${this.lagoonStep}/${LAGOON_RUN_CHECKPOINTS.length} cleared!`;
        }
      }
    } else if (this.activeId === 'drift-master') {
      if (telemetry?.driftBankedNow) {
        this.driftChallengeScore += telemetry.driftBankedNow;
        this.feedbackText = undefined;
      }
      if (telemetry?.driftPenalizedNow) {
        this.feedbackText = 'Drift spun out! Exit slides cleanly while moving.';
      }
      const gate = DRIFT_CIRCUIT_CHECKPOINTS[this.driftGateStep % DRIFT_CIRCUIT_CHECKPOINTS.length];
      if (Math.hypot(px - gate.x, pz - gate.z) <= gate.radius + 1.2) {
        this.driftGateStep++;
        this.driftGatesCleared = Math.min(DRIFT_CIRCUIT_CHECKPOINTS.length, this.driftGatesCleared + 1);
        const liveDrift = (telemetry?.driftActiveScore ?? 0) > 15;
        this.driftChallengeScore += liveDrift ? 220 : 120;
        fx.driftGateNextIdx = this.driftGateStep % DRIFT_CIRCUIT_CHECKPOINTS.length;
        fx.playClick = true;
      }
      const combinedScore = Math.round(this.driftChallengeScore + (telemetry?.driftActiveScore ?? 0));
      if (combinedScore >= 1200 && this.driftGatesCleared >= DRIFT_CIRCUIT_CHECKPOINTS.length) {
        this.driftChallengeScore = combinedScore;
        this.status = 'completed';
        fx.driftGateNextIdx = null;
        fx.playChime = true;
        fx.completeChallengeId = 'drift-master';
        fx.challengeMetric = { id: 'drift-master', value: combinedScore };
        fx.toastMessage = `Drift Master Cleared (${combinedScore} pts)! Apex Drift Mesh rims & Purple paint unlocked!`;
      }
    } else if (this.activeId === 'stunt-master') {
      const py = telemetry?.py ?? 0;
      const airborne = telemetry ? !telemetry.isGrounded : false;
      if (airborne && !telemetry?.isOverturned) {
        this.stuntPendingAirPts += dt * 210;
      }
      if (telemetry?.justDoubleJumped) {
        this.stuntPendingAirPts += 200;
      }
      for (const sc of STUNT_AIR_CHECKPOINTS) {
        if (!this.stuntGatesCleared.has(sc.id)) {
          const distXZ = Math.hypot(px - sc.x, pz - sc.z);
          if (distXZ <= sc.radius + 1.6 && Math.abs(py - sc.y) <= 3.2 && (airborne || py >= 1.2)) {
            this.stuntGatesCleared.add(sc.id);
            this.stuntPendingAirPts += 250;
            fx.stuntAirFoundIds = Array.from(this.stuntGatesCleared);
            fx.playClick = true;
            fx.toastMessage = `${sc.label} Cleared! (${this.stuntGatesCleared.size}/${STUNT_AIR_CHECKPOINTS.length})`;
          }
        }
      }
      if (telemetry?.isOverturned) {
        if (this.stuntPendingAirPts > 0) {
          this.stuntPendingAirPts = 0;
          this.feedbackText = 'Crashed upside down — air combo dropped! Press F to recover.';
        }
      } else if (telemetry?.justLanded && this.stuntPendingAirPts >= 40) {
        const banked = Math.round(this.stuntPendingAirPts);
        this.stuntBankedTotal += banked;
        this.stuntPendingAirPts = 0;
        this.feedbackText = `Stunt Landed +${banked} pts!`;
        fx.playClick = true;
      }
      if (this.stuntBankedTotal >= 800 && this.stuntGatesCleared.size >= 2) {
        const finalScore = Math.round(this.stuntBankedTotal);
        this.status = 'completed';
        fx.stuntAirFoundIds = ALL_STUNT_IDS;
        fx.playChime = true;
        fx.completeChallengeId = 'stunt-master';
        fx.challengeMetric = { id: 'stunt-master', value: finalScore };
        fx.toastMessage = `Stunt Master Cleared (${finalScore} pts)! Aero Turbo-Fan rims unlocked!`;
      }
    } else if (this.activeId === 'double-jump-trial') {
      this.djElapsedSec += dt;
      this.timerSec = this.djElapsedSec;
      const py = telemetry?.py ?? 0;
      const targetPlat = DOUBLE_JUMP_PLATFORMS[this.djStep];
      if (targetPlat && !telemetry?.isOverturned) {
        const inFootprint =
          Math.abs(px - targetPlat.x) <= targetPlat.width * 0.55 &&
          Math.abs(pz - targetPlat.z) <= targetPlat.length * 0.55;
        if (inFootprint && py >= targetPlat.y - 0.1) {
          this.djStep++;
          if (this.djStep >= DOUBLE_JUMP_PLATFORMS.length) {
            const finalSec = Number(this.djElapsedSec.toFixed(2));
            this.status = 'completed';
            fx.playChime = true;
            fx.completeChallengeId = 'double-jump-trial';
            fx.challengeMetric = { id: 'double-jump-trial', value: finalSec };
            fx.toastMessage = `Sky Trial Cleared in ${finalSec.toFixed(2)}s!`;
          } else {
            fx.playClick = true;
            fx.toastMessage = `${targetPlat.label} Reached! Launch & double-jump to Sky Deck Omega!`;
          }
        }
      }
    } else if (this.activeId === 'precision-parking') {
      const bay = PRECISION_PARKING_BAYS[this.parkingStep];
      if (bay) {
        const distErr = Math.hypot(px - bay.x, pz - bay.z);
        const yaw = telemetry?.yaw ?? bay.targetYaw;
        const headingDiffDeg = Math.abs(
          (Math.atan2(Math.sin(yaw - bay.targetYaw), Math.cos(yaw - bay.targetYaw)) * 180) / Math.PI,
        );
        const speedMs = Math.abs(telemetry?.speedMs ?? 0);
        if (distErr <= bay.maxCenterErr && headingDiffDeg <= bay.maxHeadingErrDeg && speedMs <= 1.2) {
          this.parkingHoldSec += dt;
          this.parkingAlignPct = Math.min(1, this.parkingHoldSec / 0.65);
          this.feedbackText = `Hold steady... ${Math.round(this.parkingAlignPct * 100)}%`;
          if (this.parkingHoldSec >= 0.65) {
            const bayPts = Math.max(150, Math.round(420 - distErr * 85 - headingDiffDeg * 3.5));
            this.parkingScoreTotal += bayPts;
            this.parkingStep++;
            this.parkingHoldSec = 0;
            this.parkingAlignPct = 0;
            this.feedbackText = undefined;
            if (this.parkingStep >= PRECISION_PARKING_BAYS.length) {
              this.status = 'completed';
              fx.parkingBayState = { nextIdx: null, alignPct: 1 };
              fx.playChime = true;
              fx.completeChallengeId = 'precision-parking';
              fx.challengeMetric = { id: 'precision-parking', value: this.parkingScoreTotal };
              fx.toastMessage = `Precision Parking Cleared (${this.parkingScoreTotal} pts)!`;
            } else {
              fx.parkingBayState = { nextIdx: this.parkingStep, alignPct: 0 };
              fx.playClick = true;
              fx.toastMessage = `${bay.label} Cleared (+${bayPts} pts)! Proceed to ${PRECISION_PARKING_BAYS[this.parkingStep].label}.`;
            }
          } else {
            fx.parkingBayState = { nextIdx: this.parkingStep, alignPct: this.parkingAlignPct };
          }
        } else {
          this.parkingHoldSec = Math.max(0, this.parkingHoldSec - dt * 1.5);
          this.parkingAlignPct = distErr <= bay.maxCenterErr * 1.3 ? 0.35 : 0;
          this.feedbackText =
            distErr > bay.maxCenterErr
              ? `Center in ${bay.label} (${distErr.toFixed(1)}m off)`
              : headingDiffDeg > bay.maxHeadingErrDeg
                ? `Straighten angle (${Math.round(headingDiffDeg)}° off)`
                : 'Brake to a near-stop (< 4 km/h)';
          fx.parkingBayState = { nextIdx: this.parkingStep, alignPct: this.parkingAlignPct };
        }
      }
    } else if (this.activeId === 'forest-trail') {
      this.ftElapsedSec += dt;
      this.timerSec = this.ftElapsedSec;
      const gate = FOREST_TRAIL_GATES[this.ftStep];
      if (gate && Math.hypot(px - gate.x, pz - gate.z) <= gate.radius + 1.2) {
        this.ftStep++;
        if (this.ftStep >= FOREST_TRAIL_GATES.length) {
          const finalSec = Number(this.ftElapsedSec.toFixed(2));
          this.status = 'completed';
          fx.forestTrailNextIdx = null;
          fx.playChime = true;
          fx.completeChallengeId = 'forest-trail';
          fx.challengeMetric = { id: 'forest-trail', value: finalSec };
          fx.toastMessage = `Forest Trail Cleared in ${finalSec.toFixed(2)}s! Trail Expedition Rack unlocked!`;
        } else {
          fx.forestTrailNextIdx = this.ftStep;
          fx.playClick = true;
          fx.toastMessage = `${gate.label} Cleared (${this.ftStep}/${FOREST_TRAIL_GATES.length})!`;
        }
      }
    }

    return fx;
  }

  getActiveChallengeHud(): ActiveChallengeHud {
    if (!this.activeId) {
      return {
        id: null,
        title: '',
        objective: '',
        progressText: '',
        progressCurrent: 0,
        progressTotal: 0,
        timerSec: null,
        timeLimitSec: null,
        status: 'idle',
        rewardText: '',
      };
    }

    if (this.activeId === 'delivery') {
      const targetId = DELIVERY_ROUTE_IDS[Math.min(this.deliveryStep, DELIVERY_ROUTE_IDS.length - 1)];
      const lm = WORLD_LANDMARKS.find((l) => l.id === targetId);
      return {
        id: 'delivery',
        title: 'EXPRESS DELIVERY RUN',
        objective:
          this.status === 'completed'
            ? 'All 3 destinations served!'
            : `Follow sky beacon to ${lm?.title ?? targetId}`,
        progressText: `${this.deliveryStep} / ${DELIVERY_ROUTE_IDS.length} Stops`,
        progressCurrent: this.deliveryStep,
        progressTotal: DELIVERY_ROUTE_IDS.length,
        timerSec: null,
        timeLimitSec: null,
        status: this.status,
        rewardText: 'Unlocks DELIVERY EXPERT',
        feedbackText: this.feedbackText,
      };
    }

    if (this.activeId === 'sql') {
      const gate = SQL_CHALLENGE_GATES[Math.min(this.sqlStep, SQL_CHALLENGE_GATES.length - 1)];
      return {
        id: 'sql',
        title: 'QUERY VALLEY SQL CIRCUIT',
        objective:
          this.status === 'completed'
            ? 'Query executed: SELECT → FROM → JOIN → WHERE'
            : `Drive through gate #${this.sqlStep + 1}: ${gate.clause}`,
        progressText: `${this.sqlStep} / ${SQL_CHALLENGE_GATES.length} Clauses`,
        progressCurrent: this.sqlStep,
        progressTotal: SQL_CHALLENGE_GATES.length,
        timerSec: null,
        timeLimitSec: null,
        status: this.status,
        rewardText: 'Unlocks DATABASE MASTER',
        feedbackText: this.feedbackText,
      };
    }

    if (this.activeId === 'rfid') {
      const obj =
        this.status === 'completed'
          ? 'Compound gate cleared!'
          : this.rfidStep === 0
            ? 'Collect glowing RFID Card #4092 east of Signal Workshop (54, 42)'
            : this.rfidStep === 1
              ? 'Drive to Signal Workshop Scanner Pad (44, 48)'
              : 'Gate Raised! Drive south-east through Exit Marker (48, 55)';
      return {
        id: 'rfid',
        title: 'RFID SECURITY MISSION',
        objective: obj,
        progressText: `${this.status === 'completed' ? 3 : this.rfidStep} / 3 Steps`,
        progressCurrent: this.status === 'completed' ? 3 : this.rfidStep,
        progressTotal: 3,
        timerSec: null,
        timeLimitSec: null,
        status: this.status,
        rewardText: 'Unlocks SECURITY EXPERT',
        feedbackText: this.feedbackText,
      };
    }

    if (this.activeId === 'bughunt') {
      return {
        id: 'bughunt',
        title: 'WORKSHOP BUG HUNT',
        objective:
          this.status === 'completed'
            ? 'Codebase clean — 0 glitches left!'
            : 'Squash glowing red glitch bugs around The Workshop yard',
        progressText: `${this.bugsFound.size} / ${BUG_HUNT_TARGETS.length} Bugs`,
        progressCurrent: this.bugsFound.size,
        progressTotal: BUG_HUNT_TARGETS.length,
        timerSec: null,
        timeLimitSec: null,
        status: this.status,
        rewardText: 'Lab Challenge Badge',
      };
    }

    if (this.activeId === 'memory') {
      return {
        id: 'memory',
        title: 'SUMMIT MEMORY SEQUENCE',
        objective:
          this.status === 'completed'
            ? 'All 4 beacon pads matched!'
            : this.memoryPhase === 'playback'
              ? 'Watch the glowing beacon sequence at Lookout Hill...'
              : `Drive over pad ${this.memoryInputStep + 1} of ${MEMORY_SEQUENCE.length}`,
        progressText: `${this.memoryInputStep} / ${MEMORY_SEQUENCE.length} Pads`,
        progressCurrent: this.memoryInputStep,
        progressTotal: MEMORY_SEQUENCE.length,
        timerSec: null,
        timeLimitSec: null,
        status: this.status,
        rewardText: 'Lookout Challenge Badge',
        feedbackText: this.feedbackText,
      };
    }

    if (this.activeId === 'treasure') {
      return {
        id: 'treasure',
        title: 'WORLD TREASURE HUNT',
        objective:
          this.status === 'completed'
            ? 'All 4 chests uncovered!'
            : 'Seek golden chests near Studio, Pine Trail, Bridge & South Cove',
        progressText: `${this.treasuresFound.size} / ${TREASURE_CHESTS.length} Chests`,
        progressCurrent: this.treasuresFound.size,
        progressTotal: TREASURE_CHESTS.length,
        timerSec: null,
        timeLimitSec: null,
        status: this.status,
        rewardText: 'Treasure Hunter Badge',
      };
    }

    if (this.activeId === 'lagoon-run') {
      const nextGate = LAGOON_RUN_CHECKPOINTS[Math.min(this.lagoonStep, LAGOON_RUN_CHECKPOINTS.length - 1)];
      const countdownActive = this.status === 'active' && this.lagoonCountdownSec > 0;
      return {
        id: 'lagoon-run',
        title: 'LAGOON RUN AMPHIBIOUS TRIAL',
        objective:
          this.status === 'completed'
            ? 'Water course cleared onto the Exit Dock!'
            : countdownActive
              ? `Get Ready: ${Math.max(1, Math.ceil(this.lagoonCountdownSec))}...`
              : `Steer through ${nextGate.label} (avoid buoys & rocks)`,
        progressText: `${this.lagoonStep} / ${LAGOON_RUN_CHECKPOINTS.length} Gates`,
        progressCurrent: this.lagoonStep,
        progressTotal: LAGOON_RUN_CHECKPOINTS.length,
        timerSec: countdownActive ? 0 : this.timerSec !== null ? Number(this.timerSec.toFixed(1)) : 0,
        timeLimitSec: null,
        status: this.status,
        rewardText: 'Unlocks Amphibious Aqua Skin',
        feedbackText: this.feedbackText,
      };
    }

    if (this.activeId === 'drift-master') {
      return {
        id: 'drift-master',
        title: 'DRIFT MASTER CIRCUIT',
        objective:
          this.status === 'completed'
            ? 'Drift circuit mastered!'
            : 'Clear 4 Arena gates & bank 1,200+ Drift Points (hold X)',
        progressText: `${this.driftGatesCleared} / ${DRIFT_CIRCUIT_CHECKPOINTS.length} Gates · ${this.driftChallengeScore} pts`,
        progressCurrent: this.driftGatesCleared,
        progressTotal: DRIFT_CIRCUIT_CHECKPOINTS.length,
        timerSec: null,
        timeLimitSec: null,
        status: this.status,
        rewardText: 'Unlocks Apex Drift Mesh & Violet Paint',
        feedbackText: this.feedbackText,
        liveScore: this.driftChallengeScore,
        targetScore: 1200,
      };
    }

    if (this.activeId === 'stunt-master') {
      return {
        id: 'stunt-master',
        title: 'STUNT MASTER ARENA',
        objective:
          this.status === 'completed'
            ? 'Stunt Master Record Set!'
            : 'Clear 2+ aerial ramp rings & land 800+ Stunt Points upright',
        progressText: `${this.stuntGatesCleared.size} / ${STUNT_AIR_CHECKPOINTS.length} Air Rings · ${this.stuntBankedTotal} pts`,
        progressCurrent: this.stuntGatesCleared.size,
        progressTotal: STUNT_AIR_CHECKPOINTS.length,
        timerSec: null,
        timeLimitSec: null,
        status: this.status,
        rewardText: 'Unlocks Aero Turbo-Fan Rims & Skyline Paint',
        feedbackText: this.feedbackText,
        liveScore: Math.round(this.stuntBankedTotal + this.stuntPendingAirPts),
        targetScore: 800,
      };
    }

    if (this.activeId === 'double-jump-trial') {
      const targetPlat = DOUBLE_JUMP_PLATFORMS[Math.min(this.djStep, DOUBLE_JUMP_PLATFORMS.length - 1)];
      return {
        id: 'double-jump-trial',
        title: 'DOUBLE-JUMP SKY TRIAL',
        objective:
          this.status === 'completed'
            ? 'Both elevated Sky Decks conquered!'
            : `Launch off ramp & jump onto ${targetPlat.label}`,
        progressText: `${this.djStep} / ${DOUBLE_JUMP_PLATFORMS.length} Sky Decks`,
        progressCurrent: this.djStep,
        progressTotal: DOUBLE_JUMP_PLATFORMS.length,
        timerSec: this.timerSec !== null ? Number(this.timerSec.toFixed(1)) : 0,
        timeLimitSec: null,
        status: this.status,
        rewardText: 'Sky Mastery Time Record',
      };
    }

    if (this.activeId === 'precision-parking') {
      const bay = PRECISION_PARKING_BAYS[Math.min(this.parkingStep, PRECISION_PARKING_BAYS.length - 1)];
      return {
        id: 'precision-parking',
        title: 'PRECISION PARKING TEST',
        objective:
          this.status === 'completed'
            ? 'All 3 bays parked cleanly!'
            : `Park centered & straight inside ${bay.label} under 4 km/h`,
        progressText: `${this.parkingStep} / ${PRECISION_PARKING_BAYS.length} Bays · ${this.parkingScoreTotal} pts`,
        progressCurrent: this.parkingStep,
        progressTotal: PRECISION_PARKING_BAYS.length,
        timerSec: null,
        timeLimitSec: null,
        status: this.status,
        rewardText: 'Precision Driver Record',
        feedbackText: this.feedbackText,
        liveScore: this.parkingScoreTotal,
        targetScore: 900,
      };
    }

    if (this.activeId === 'forest-trail') {
      const gate = FOREST_TRAIL_GATES[Math.min(this.ftStep, FOREST_TRAIL_GATES.length - 1)];
      return {
        id: 'forest-trail',
        title: 'FOREST TRAIL EXPEDITION',
        objective:
          this.status === 'completed'
            ? 'Woodland trail expedition complete!'
            : `Follow trail through ${gate.label}`,
        progressText: `${this.ftStep} / ${FOREST_TRAIL_GATES.length} Trail Gates`,
        progressCurrent: this.ftStep,
        progressTotal: FOREST_TRAIL_GATES.length,
        timerSec: this.timerSec !== null ? Number(this.timerSec.toFixed(1)) : 0,
        timeLimitSec: null,
        status: this.status,
        rewardText: 'Unlocks Trail Expedition Rack',
      };
    }

    const nextGate = TIME_TRIAL_CHECKPOINTS[Math.min(this.timeTrialStep, TIME_TRIAL_CHECKPOINTS.length - 1)];
    return {
      id: 'timetrial',
      title: 'PAVILION TIME TRIAL',
      objective:
        this.status === 'completed'
          ? 'Sprint finished before the buzzer!'
          : this.status === 'failed'
            ? 'Time expired! Hit Restart to try again.'
            : `Sprint to ${nextGate.label}`,
      progressText: `${this.timeTrialStep} / ${TIME_TRIAL_CHECKPOINTS.length} Gates`,
      progressCurrent: this.timeTrialStep,
      progressTotal: TIME_TRIAL_CHECKPOINTS.length,
      timerSec: this.timerSec !== null ? Number(this.timerSec.toFixed(1)) : null,
      timeLimitSec: this.timeLimitSec,
      status: this.status,
      rewardText: 'Speed Challenge Badge',
    };
  }

  getRaceHudState(ghostEnabled: boolean): RaceHudState {
    return {
      phase: this.racePhase,
      countdownVal: Math.max(0, Math.ceil(this.raceCountdown)),
      elapsedSec: Number(this.raceElapsedSec.toFixed(2)),
      checkpointIndex: this.raceCpIndex,
      totalCheckpoints: PADDOCK_CHECKPOINTS.length,
      bestTimeSec: this.raceBestSec,
      lastTimeSec: this.raceLastSec,
      isNewBest: this.raceIsNewBest,
      ghostActive: ghostEnabled && this.savedGhost.length > 1,
    };
  }
}
