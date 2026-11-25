import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ACHIEVEMENTS_LIST,
  CORE_REQUIRED_ACHIEVEMENT_IDS,
  GARAGE_PAINT_PRESETS,
  PORTFOLIO_PROJECTS,
  WORLD_COLLECTIBLES,
  WORLD_LANDMARKS,
} from '../data/portfolioData';
import {
  deleteWhisperEntry,
  fetchGlobalLeaderboard,
  fetchModerationWhispers,
  loadCloudUserSave,
  mergeCloudAndLocalSave,
  moderateWhisperStatus,
  reportWhisperMessage,
  saveCloudUserSave,
  signInWithGoogle,
  signOutFirebase,
  startVerifiedRaceSession,
  submitVerifiedWhisper,
  subscribePublishedWhispers,
  subscribeToAuth,
  toAuthUserSummary,
  verifyAndPublishLap,
} from '../firebase/services';
import { soundEngine } from '../game/audio';
import { loadVersionedSave, saveVersionedSave, type VersionedSaveState } from './storage';
import type {
  AchievementDef,
  AuthUserSummary,
  CameraMode,
  GamePhase,
  GameSettings,
  GhostSample,
  LeaderboardEntry,
  VehicleConfig,
  WhisperMessage,
  WhisperReportReason,
  WhisperStatus,
} from '../types/portfolio';

export type CloudSyncStatus = 'guest' | 'syncing' | 'synced' | 'error';

interface AppStateContextValue {
  authReady: boolean;
  authUser: AuthUserSummary | null;
  authBusy: boolean;
  authError: string | null;
  cloudSyncStatus: CloudSyncStatus;
  playerDisplayName: string;
  updatePlayerDisplayName: (name: string) => void;
  signInGoogle: () => Promise<void>;
  signOutAccount: () => Promise<void>;
  settings: GameSettings;
  updateSettings: (partial: Partial<GameSettings>) => void;
  toggleAudio: () => void;
  toggleHeadlights: () => void;
  cycleCameraMode: () => void;
  vehicleConfig: VehicleConfig;
  updateVehicleConfig: (partial: Partial<VehicleConfig>) => void;
  unlockedSkins: string[];
  discoveredLandmarks: string[];
  markLandmarkDiscovered: (id: string) => void;
  openedProjects: string[];
  markProjectOpened: (slug: string) => void;
  collectedIds: string[];
  collectedOrbs: string[];
  collectedTokens: string[];
  collectedFragments: string[];
  collectedSecrets: string[];
  markCollectiblePicked: (id: string) => void;
  discoveredSecrets: string[];
  markSecretDiscovered: (id: string) => void;
  completedChallenges: string[];
  markChallengeCompleted: (id: string) => void;
  unlockedAchievements: string[];
  unlockAchievement: (id: string) => void;
  recentAchievement: AchievementDef | null;
  clearRecentAchievement: () => void;
  bestLapSeconds: number | null;
  lastLapSeconds: number | null;
  bestLapGhost: GhostSample[];
  beginPaddockRaceSession: () => void;
  recordRaceFinish: (lapSeconds: number, ghostFrames: GhostSample[]) => { isNewBest: boolean };
  lastRaceSubmissionNote: string | null;
  leaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;
  leaderboardError: string | null;
  refreshGlobalLeaderboard: () => Promise<void>;
  whispers: WhisperMessage[];
  whispersLoading: boolean;
  whispersError: string | null;
  postWhisper: (authorName: string, countryCode: string, message: string) => Promise<void>;
  reportWhisper: (whisper: WhisperMessage, reason: WhisperReportReason) => Promise<void>;
  moderationWhispers: WhisperMessage[];
  refreshModerationQueue: () => Promise<void>;
  moderateWhisper: (whisperId: string, nextStatus: WhisperStatus) => Promise<void>;
  removeWhisper: (whisperId: string) => Promise<void>;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  assistantOpen: boolean;
  setAssistantOpen: (open: boolean) => void;
  worldPhase: GamePhase;
  setWorldPhase: (phase: GamePhase) => void;
  touchHudActive: boolean;
  setTouchHudActive: (active: boolean) => void;
  distanceDrivenMeters: number;
  addDistanceDriven: (deltaMeters: number) => void;
  currentWorldZone: string;
  setCurrentWorldZone: (zone: string) => void;
  registerWorldNavigator: (fn: ((landmarkId: string) => boolean) | null) => void;
  driveToWorldLandmark: (landmarkId: string) => boolean;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

const CAMERA_ORDER: CameraMode[] = ['chase', 'close', 'far', 'topdown', 'orbit'];

function withCompleteExplorerCheck(unlocked: string[]): { next: string[]; unlockedIds: string[] } {
  const unique = Array.from(new Set(unlocked));
  const newlyAdded: string[] = [];
  const allCoreDone = CORE_REQUIRED_ACHIEVEMENT_IDS.every((id) => unique.includes(id));
  if (allCoreDone && !unique.includes('complete-explorer')) {
    unique.push('complete-explorer');
    newlyAdded.push('complete-explorer');
  }
  return { next: unique, unlockedIds: newlyAdded };
}

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [saveState, setSaveState] = useState<VersionedSaveState>(() => loadVersionedSave());
  const [recentAchievement, setRecentAchievement] = useState<AchievementDef | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [worldPhase, setWorldPhase] = useState<GamePhase>('loading');
  const [touchHudActive, setTouchHudActive] = useState(false);
  const [currentWorldZone, setCurrentWorldZone] = useState('Starting Plaza');
  const worldNavigatorRef = useRef<((landmarkId: string) => boolean) | null>(null);

  const registerWorldNavigator = useCallback(
    (fn: ((landmarkId: string) => boolean) | null) => {
      worldNavigatorRef.current = fn;
    },
    [],
  );

  const driveToWorldLandmark = useCallback((landmarkId: string): boolean => {
    if (!worldNavigatorRef.current) return false;
    return worldNavigatorRef.current(landmarkId);
  }, []);

  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUserSummary | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('guest');

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [lastRaceSubmissionNote, setLastRaceSubmissionNote] = useState<string | null>(null);

  const [whispers, setWhispers] = useState<WhisperMessage[]>([]);
  const [whispersLoading, setWhispersLoading] = useState(true);
  const [whispersError, setWhispersError] = useState<string | null>(null);
  const [moderationWhispers, setModerationWhispers] = useState<WhisperMessage[]>([]);

  const cloudDocExistsRef = useRef(false);
  const cloudHydratedUidRef = useRef<string | null>(null);
  const saveStateRef = useRef(saveState);
  saveStateRef.current = saveState;

  const activeRaceTokenRef = useRef<string | null>(null);
  const syncTimerRef = useRef<number | null>(null);

  const commitSave = useCallback((updater: (prev: VersionedSaveState) => VersionedSaveState) => {
    setSaveState((prev) => {
      const next = updater(prev);
      saveVersionedSave(next);
      return next;
    });
  }, []);

  const refreshGlobalLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      const rows = await fetchGlobalLeaderboard();
      setLeaderboard(rows);
    } catch (err) {
      setLeaderboardError(
        err instanceof Error ? err.message : 'Unable to load global leaderboard right now.',
      );
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  const refreshModerationQueue = useCallback(async () => {
    if (!authUser?.isAdmin) {
      setModerationWhispers([]);
      return;
    }
    try {
      const items = await fetchModerationWhispers();
      setModerationWhispers(items);
    } catch {
      // Surface only non-admin issues safely
    }
  }, [authUser?.isAdmin]);

  // Subscribe to Firebase Auth & hydrate Cloud Save safely while keeping local guest save intact
  useEffect(() => {
    const unsub = subscribeToAuth(async (firebaseUser) => {
      const summary = toAuthUserSummary(firebaseUser);
      setAuthUser(summary);
      setAuthReady(true);

      if (!summary) {
        cloudDocExistsRef.current = false;
        cloudHydratedUidRef.current = null;
        setCloudSyncStatus('guest');
        setModerationWhispers([]);
        return;
      }

      if (cloudHydratedUidRef.current === summary.uid) return;
      setCloudSyncStatus('syncing');
      try {
        const cloudDoc = await loadCloudUserSave(summary.uid);
        cloudDocExistsRef.current = Boolean(cloudDoc);
        const merged = mergeCloudAndLocalSave(
          saveStateRef.current,
          cloudDoc,
          summary.displayName,
        );
        saveVersionedSave(merged);
        setSaveState(merged);
        cloudHydratedUidRef.current = summary.uid;

        await saveCloudUserSave(summary.uid, merged, Boolean(cloudDoc));
        cloudDocExistsRef.current = true;
        setCloudSyncStatus('synced');
      } catch {
        setCloudSyncStatus('error');
      }
    });
    return unsub;
  }, []);

  // Debounced cloud sync whenever authenticated save state updates
  useEffect(() => {
    if (!authUser || cloudHydratedUidRef.current !== authUser.uid) return;
    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current);
    }
    setCloudSyncStatus('syncing');
    syncTimerRef.current = window.setTimeout(async () => {
      try {
        await saveCloudUserSave(authUser.uid, saveStateRef.current, cloudDocExistsRef.current);
        cloudDocExistsRef.current = true;
        setCloudSyncStatus('synced');
      } catch {
        setCloudSyncStatus('error');
      }
    }, 900);
    return () => {
      if (syncTimerRef.current !== null) window.clearTimeout(syncTimerRef.current);
    };
  }, [
    authUser,
    saveState.displayName,
    saveState.vehicle,
    saveState.settings,
    saveState.visitedLocations,
    saveState.openedProjects,
    saveState.collectedIds,
    saveState.discoveredSecrets,
    saveState.completedChallenges,
    saveState.unlockedAchievements,
    saveState.bestLapSeconds,
    saveState.lastLapSeconds,
    saveState.distanceDrivenMeters,
  ]);

  // Load initial global leaderboard & subscribe to published Whispers
  useEffect(() => {
    void refreshGlobalLeaderboard();
    setWhispersLoading(true);
    const unsub = subscribePublishedWhispers(
      (items) => {
        setWhispers(items);
        setWhispersLoading(false);
        setWhispersError(null);
      },
      (err) => {
        setWhispersLoading(false);
        setWhispersError(err.message || 'Unable to stream visitor messages.');
      },
    );
    return unsub;
  }, [refreshGlobalLeaderboard]);

  useEffect(() => {
    if (authUser?.isAdmin) {
      void refreshModerationQueue();
    }
  }, [authUser?.isAdmin, refreshModerationQueue]);

  useEffect(() => {
    soundEngine.setAudioPreferences(
      saveState.settings.audioEnabled,
      saveState.settings.sfxVolume,
      saveState.settings.musicVolume,
      saveState.settings.musicEnabled,
    );
  }, [
    saveState.settings.audioEnabled,
    saveState.settings.sfxVolume,
    saveState.settings.musicVolume,
    saveState.settings.musicEnabled,
  ]);

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = saveState.settings.reducedMotion
      ? 'true'
      : 'false';
  }, [saveState.settings.reducedMotion]);

  const signInGoogle = useCallback(async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in was cancelled or blocked.';
      setAuthError(msg);
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const signOutAccount = useCallback(async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signOutFirebase();
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const updatePlayerDisplayName = useCallback(
    (name: string) => {
      const cleaned = name.replace(/[^a-zA-Z0-9 ._-]/g, '').slice(0, 24);
      commitSave((prev) => ({
        ...prev,
        displayName: cleaned.trim() || 'Explorer',
      }));
    },
    [commitSave],
  );

  const showAchievementToast = useCallback((id: string) => {
    const def = ACHIEVEMENTS_LIST.find((a) => a.id === id) || null;
    if (def) {
      setRecentAchievement(def);
      soundEngine.playAchievement();
    }
  }, []);

  const unlockAchievement = useCallback(
    (id: string) => {
      commitSave((prev) => {
        if (prev.unlockedAchievements.includes(id)) return prev;
        const { next, unlockedIds } = withCompleteExplorerCheck([
          ...prev.unlockedAchievements,
          id,
        ]);
        showAchievementToast(unlockedIds.includes('complete-explorer') ? 'complete-explorer' : id);
        return { ...prev, unlockedAchievements: next };
      });
    },
    [commitSave, showAchievementToast],
  );

  const updateSettings = useCallback(
    (partial: Partial<GameSettings>) => {
      commitSave((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...partial },
      }));
    },
    [commitSave],
  );

  const toggleAudio = useCallback(() => {
    commitSave((prev) => ({
      ...prev,
      settings: { ...prev.settings, audioEnabled: !prev.settings.audioEnabled },
    }));
  }, [commitSave]);

  const toggleHeadlights = useCallback(() => {
    commitSave((prev) => ({
      ...prev,
      settings: { ...prev.settings, headlightsOn: !prev.settings.headlightsOn },
    }));
  }, [commitSave]);

  const cycleCameraMode = useCallback(() => {
    commitSave((prev) => {
      const idx = CAMERA_ORDER.indexOf(prev.settings.cameraMode);
      const nextMode = CAMERA_ORDER[(idx + 1) % CAMERA_ORDER.length];
      return {
        ...prev,
        settings: { ...prev.settings, cameraMode: nextMode },
      };
    });
  }, [commitSave]);

  const updateVehicleConfig = useCallback(
    (partial: Partial<VehicleConfig>) => {
      commitSave((prev) => ({
        ...prev,
        vehicle: { ...prev.vehicle, ...partial },
      }));
    },
    [commitSave],
  );

  const markLandmarkDiscovered = useCallback(
    (id: string) => {
      commitSave((prev) => {
        if (prev.visitedLocations.includes(id)) return prev;
        const visitedLocations = [...prev.visitedLocations, id];
        let unlocked = prev.unlockedAchievements;
        if (
          WORLD_LANDMARKS.every((lm) => visitedLocations.includes(lm.id)) &&
          !unlocked.includes('world-explorer')
        ) {
          const check = withCompleteExplorerCheck([...unlocked, 'world-explorer']);
          unlocked = check.next;
          showAchievementToast(
            check.unlockedIds.includes('complete-explorer')
              ? 'complete-explorer'
              : 'world-explorer',
          );
        }
        return { ...prev, visitedLocations, unlockedAchievements: unlocked };
      });
    },
    [commitSave, showAchievementToast],
  );

  const markProjectOpened = useCallback(
    (slug: string) => {
      commitSave((prev) => {
        if (prev.openedProjects.includes(slug)) return prev;
        const openedProjects = [...prev.openedProjects, slug];
        let unlocked = prev.unlockedAchievements;
        if (
          PORTFOLIO_PROJECTS.every((p) => openedProjects.includes(p.slug)) &&
          !unlocked.includes('project-explorer')
        ) {
          const check = withCompleteExplorerCheck([...unlocked, 'project-explorer']);
          unlocked = check.next;
          showAchievementToast(
            check.unlockedIds.includes('complete-explorer')
              ? 'complete-explorer'
              : 'project-explorer',
          );
        }
        return { ...prev, openedProjects, unlockedAchievements: unlocked };
      });
    },
    [commitSave, showAchievementToast],
  );

  const markCollectiblePicked = useCallback(
    (id: string) => {
      commitSave((prev) => {
        if (prev.collectedIds.includes(id)) return prev;
        const collectedIds = [...prev.collectedIds, id];
        const allOrbIds = WORLD_COLLECTIBLES.filter((c) => c.kind === 'orb').map((c) => c.id);
        let unlocked = prev.unlockedAchievements;
        if (
          allOrbIds.every((oid) => collectedIds.includes(oid)) &&
          !unlocked.includes('tech-collector')
        ) {
          const check = withCompleteExplorerCheck([...unlocked, 'tech-collector']);
          unlocked = check.next;
          showAchievementToast(
            check.unlockedIds.includes('complete-explorer')
              ? 'complete-explorer'
              : 'tech-collector',
          );
        }
        return { ...prev, collectedIds, unlockedAchievements: unlocked };
      });
    },
    [commitSave, showAchievementToast],
  );

  const markSecretDiscovered = useCallback(
    (id: string) => {
      commitSave((prev) => {
        if (prev.discoveredSecrets.includes(id)) return prev;
        const discoveredSecrets = [...prev.discoveredSecrets, id];
        let unlocked = prev.unlockedAchievements;
        if (!unlocked.includes('secret-finder')) {
          const check = withCompleteExplorerCheck([...unlocked, 'secret-finder']);
          unlocked = check.next;
          showAchievementToast(
            check.unlockedIds.includes('complete-explorer')
              ? 'complete-explorer'
              : 'secret-finder',
          );
        }
        return { ...prev, discoveredSecrets, unlockedAchievements: unlocked };
      });
    },
    [commitSave, showAchievementToast],
  );

  const markChallengeCompleted = useCallback(
    (id: string) => {
      commitSave((prev) => {
        if (prev.completedChallenges.includes(id)) return prev;
        return {
          ...prev,
          completedChallenges: [...prev.completedChallenges, id],
        };
      });
    },
    [commitSave],
  );

  const addDistanceDriven = useCallback(
    (deltaMeters: number) => {
      const add = Math.round(deltaMeters);
      if (!Number.isFinite(add) || add <= 0) return;
      commitSave((prev) => ({
        ...prev,
        distanceDrivenMeters: prev.distanceDrivenMeters + add,
      }));
    },
    [commitSave],
  );

  const beginPaddockRaceSession = useCallback(() => {
    activeRaceTokenRef.current = null;
    setLastRaceSubmissionNote(null);
    void startVerifiedRaceSession(saveStateRef.current.vehicle).then((session) => {
      if (session?.runToken) {
        activeRaceTokenRef.current = session.runToken;
      }
    });
  }, []);

  const recordRaceFinish = useCallback(
    (lapSeconds: number, ghostFrames: GhostSample[]): { isNewBest: boolean } => {
      const cleanSec = Number(lapSeconds.toFixed(2));
      let isNewBest = false;
      commitSave((prev) => {
        isNewBest = prev.bestLapSeconds === null || cleanSec < prev.bestLapSeconds;

        let unlocked = prev.unlockedAchievements;
        if (!unlocked.includes('race-champion')) {
          const check = withCompleteExplorerCheck([...unlocked, 'race-champion']);
          unlocked = check.next;
          showAchievementToast(
            check.unlockedIds.includes('complete-explorer')
              ? 'complete-explorer'
              : 'race-champion',
          );
        }

        const completedChallenges = prev.completedChallenges.includes('race')
          ? prev.completedChallenges
          : [...prev.completedChallenges, 'race'];

        return {
          ...prev,
          lastLapSeconds: cleanSec,
          bestLapSeconds: isNewBest ? cleanSec : prev.bestLapSeconds,
          bestLapGhost: isNewBest && ghostFrames.length > 0 ? ghostFrames : prev.bestLapGhost,
          unlockedAchievements: unlocked,
          completedChallenges,
        };
      });

      const runToken = activeRaceTokenRef.current;
      activeRaceTokenRef.current = null;

      if (authUser && runToken) {
        setLastRaceSubmissionNote('Verifying telemetry with server...');
        void verifyAndPublishLap(
          runToken,
          ghostFrames,
          saveStateRef.current.vehicle,
          saveStateRef.current.displayName || authUser.displayName,
        )
          .then((res) => {
            if (res.published) {
              setLastRaceSubmissionNote(
                res.updatedExisting
                  ? `Global PB updated: ${res.entry?.lapSeconds.toFixed(2)}s!`
                  : `Published to Global Leaderboard: ${res.entry?.lapSeconds.toFixed(2)}s!`,
              );
              void refreshGlobalLeaderboard();
            } else if (res.reason) {
              setLastRaceSubmissionNote(res.reason);
            }
          })
          .catch((err) => {
            setLastRaceSubmissionNote(
              err instanceof Error ? err.message : 'Unable to submit global lap.',
            );
          });
      } else if (!authUser) {
        setLastRaceSubmissionNote('Saved locally (Sign in with Google to submit to Global Leaderboard).');
      }

      return { isNewBest };
    },
    [authUser, commitSave, refreshGlobalLeaderboard, showAchievementToast],
  );

  const postWhisper = useCallback(
    async (authorName: string, countryCode: string, message: string) => {
      await submitVerifiedWhisper(authorName, countryCode, message);
      if (authUser?.isAdmin) {
        void refreshModerationQueue();
      }
    },
    [authUser?.isAdmin, refreshModerationQueue],
  );

  const reportWhisper = useCallback(
    async (whisper: WhisperMessage, reason: WhisperReportReason) => {
      await reportWhisperMessage(whisper, reason);
      if (authUser?.isAdmin) {
        void refreshModerationQueue();
      }
    },
    [authUser?.isAdmin, refreshModerationQueue],
  );

  const moderateWhisper = useCallback(
    async (whisperId: string, nextStatus: WhisperStatus) => {
      await moderateWhisperStatus(whisperId, nextStatus);
      await refreshModerationQueue();
    },
    [refreshModerationQueue],
  );

  const removeWhisper = useCallback(
    async (whisperId: string) => {
      await deleteWhisperEntry(whisperId);
      await refreshModerationQueue();
    },
    [refreshModerationQueue],
  );

  const clearRecentAchievement = useCallback(() => {
    setRecentAchievement(null);
  }, []);

  const unlockedSkins = useMemo(
    () =>
      GARAGE_PAINT_PRESETS.filter(
        (p) => !p.unlockAchievementId || saveState.unlockedAchievements.includes(p.unlockAchievementId),
      ).map((p) => p.id),
    [saveState.unlockedAchievements],
  );

  const collectedOrbs = useMemo(
    () => saveState.collectedIds.filter((id) => id.startsWith('orb-')),
    [saveState.collectedIds],
  );
  const collectedTokens = useMemo(
    () => saveState.collectedIds.filter((id) => id.startsWith('token-')),
    [saveState.collectedIds],
  );
  const collectedFragments = useMemo(
    () => saveState.collectedIds.filter((id) => id.startsWith('frag-')),
    [saveState.collectedIds],
  );
  const collectedSecrets = useMemo(
    () => saveState.collectedIds.filter((id) => id.startsWith('secret-')),
    [saveState.collectedIds],
  );

  return (
    <AppStateContext.Provider
      value={{
        authReady,
        authUser,
        authBusy,
        authError,
        cloudSyncStatus,
        playerDisplayName: saveState.displayName || authUser?.displayName || 'Explorer',
        updatePlayerDisplayName,
        signInGoogle,
        signOutAccount,
        settings: saveState.settings,
        updateSettings,
        toggleAudio,
        toggleHeadlights,
        cycleCameraMode,
        vehicleConfig: saveState.vehicle,
        updateVehicleConfig,
        unlockedSkins,
        discoveredLandmarks: saveState.visitedLocations,
        markLandmarkDiscovered,
        openedProjects: saveState.openedProjects,
        markProjectOpened,
        collectedIds: saveState.collectedIds,
        collectedOrbs,
        collectedTokens,
        collectedFragments,
        collectedSecrets,
        markCollectiblePicked,
        discoveredSecrets: saveState.discoveredSecrets,
        markSecretDiscovered,
        completedChallenges: saveState.completedChallenges,
        markChallengeCompleted,
        unlockedAchievements: saveState.unlockedAchievements,
        unlockAchievement,
        recentAchievement,
        clearRecentAchievement,
        bestLapSeconds: saveState.bestLapSeconds,
        lastLapSeconds: saveState.lastLapSeconds,
        bestLapGhost: saveState.bestLapGhost,
        beginPaddockRaceSession,
        recordRaceFinish,
        lastRaceSubmissionNote,
        leaderboard,
        leaderboardLoading,
        leaderboardError,
        refreshGlobalLeaderboard,
        whispers,
        whispersLoading,
        whispersError,
        postWhisper,
        reportWhisper,
        moderationWhispers,
        refreshModerationQueue,
        moderateWhisper,
        removeWhisper,
        drawerOpen,
        setDrawerOpen,
        assistantOpen,
        setAssistantOpen,
        worldPhase,
        setWorldPhase,
        touchHudActive,
        setTouchHudActive,
        distanceDrivenMeters: saveState.distanceDrivenMeters,
        addDistanceDriven,
        currentWorldZone,
        setCurrentWorldZone,
        registerWorldNavigator,
        driveToWorldLandmark,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
};

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}
