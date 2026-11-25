import {
  BUG_HUNT_TARGETS,
  MEMORY_PADS,
  PADDOCK_CHECKPOINTS,
  SQL_CHALLENGE_GATES,
  TIME_TRIAL_CHECKPOINTS,
  TREASURE_CHESTS,
  WORLD_LANDMARKS,
} from '../data/portfolioData';
import type {
  ActiveChallengeHud,
  ActiveChallengeId,
  GhostSample,
  RaceHudState,
} from '../types/portfolio';

export const DELIVERY_ROUTE_IDS = ['studio', 'workshop', 'signal-house'] as const;
const MEMORY_SEQUENCE = [0, 1, 3, 2];

export interface ChallengeTickEffects {
  playChime?: boolean;
  playClick?: boolean;
  playBeep?: boolean;
  playGo?: boolean;
  unlockAchievementId?: string;
  completeChallengeId?: string;
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
  raceFinished?: { lapSeconds: number; ghostFrames: GhostSample[] };
}

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
    return this.racePhase === 'countdown';
  }

  startChallenge(id: Exclude<ActiveChallengeId, null>): ChallengeTickEffects {
    if (this.racePhase !== 'idle') {
      this.racePhase = 'idle';
      this.raceCountdown = 0;
      this.raceElapsedSec = 0;
      this.raceCpIndex = 0;
    }
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

  tick(px: number, pz: number, dt: number): ChallengeTickEffects {
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
        // Cross finish line at Paddock (-66, 18)
        if (Math.hypot(px + 66, pz - 18) <= 8.5 && this.raceElapsedSec > 5) {
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
