import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  accessGrants,
  organization,
  outcomes as seedOutcomes,
  probabilityHistory as seedHistory,
  questions as seedQuestions,
  users,
  seedTeamJoinRequests,
} from "./domain/seed";
import { seedTouchpointSignals } from "./domain/touchpoints";
import { connectorById } from "./domain/connectors";
import { createQuestionFromInput, type CreateQuestionInput } from "./domain/generateQuestion";
import { FORECAST_PROCESSING_MS, type ForecastJob } from "./domain/forecastJob";
import { runForecast } from "./domain/engine";
import { answerForecastQuestion } from "./domain/qaAnswer";
import { canViewQuestion, visibleQuestions } from "./domain/access";
import {
  assembleModelContext,
  bindingsForQuestion,
  createContextItemFromInput,
  itemsForQuestion,
  newId,
  revisionsForItem,
  seedContextAudit,
  seedContextBindings,
  seedContextItems,
  seedContextRevisions,
  touchpointSignalsFromBindings,
} from "./domain/context";
import {
  canApproveContextItem,
  canArchiveContextItem,
  canEditContextItem,
  visibleContextItems,
} from "./domain/contextAccess";
import type {
  Category,
  ContextAuditEntry,
  ContextBinding,
  ContextItem,
  ContextRevision,
  CreateContextItemInput,
  EvidenceSource,
  ForecastQuestion,
  ModelContextBundle,
  Outcome,
  ProbabilityAlert,
  ProbabilityPoint,
  QuestionComment,
  QaMessage,
  TouchpointSignal,
  TeamJoinRequest,
  User,
  UserPreferences,
  Visibility,
} from "./domain/types";
import { defaultUserPreferences, seedUserPreferences } from "./domain/profile";
import { orgTeams, userTeams } from "./domain/teams";
import { evidenceSources as seedEvidenceSources, seedComments } from "./domain/seed";

const ALERTS_STORAGE_KEY = "foresight-probability-alerts";
const CONTEXT_ITEMS_KEY = "foresight-context-items";
const CONTEXT_BINDINGS_KEY = "foresight-context-bindings";
const CONTEXT_REVISIONS_KEY = "foresight-context-revisions";
const CONTEXT_AUDIT_KEY = "foresight-context-audit";
const FORECAST_JOBS_STORAGE_KEY = "foresight-forecast-jobs";
const COMMENTS_STORAGE_KEY = "foresight-question-comments";
const QA_STORAGE_KEY = "foresight-question-qa";
const USER_PREFERENCES_KEY = "foresight-user-preferences";
const TEAM_JOIN_REQUESTS_KEY = "foresight-team-join-requests";

function loadTeamJoinRequests(): TeamJoinRequest[] {
  try {
    const raw = localStorage.getItem(TEAM_JOIN_REQUESTS_KEY);
    if (!raw) return [...seedTeamJoinRequests];
    const stored = JSON.parse(raw) as TeamJoinRequest[];
    const ids = new Set(stored.map((r) => r.id));
    return [...seedTeamJoinRequests.filter((r) => !ids.has(r.id)), ...stored];
  } catch {
    return [...seedTeamJoinRequests];
  }
}

function saveTeamJoinRequests(requests: TeamJoinRequest[]) {
  try {
    localStorage.setItem(TEAM_JOIN_REQUESTS_KEY, JSON.stringify(requests));
  } catch {
    /* ignore quota errors */
  }
}

function loadUserPreferences(): Record<string, UserPreferences> {
  try {
    const raw = localStorage.getItem(USER_PREFERENCES_KEY);
    if (!raw) return { ...seedUserPreferences };
    return { ...seedUserPreferences, ...(JSON.parse(raw) as Record<string, UserPreferences>) };
  } catch {
    return { ...seedUserPreferences };
  }
}

function saveUserPreferences(prefs: Record<string, UserPreferences>) {
  try {
    localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota errors */
  }
}

function loadForecastJobs(): ForecastJob[] {
  try {
    const raw = sessionStorage.getItem(FORECAST_JOBS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ForecastJob[];
  } catch {
    return [];
  }
}

function saveForecastJobs(jobs: ForecastJob[]) {
  try {
    sessionStorage.setItem(FORECAST_JOBS_STORAGE_KEY, JSON.stringify(jobs));
  } catch {
    /* ignore quota errors */
  }
}

function loadAlerts(): ProbabilityAlert[] {
  try {
    const raw = localStorage.getItem(ALERTS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ProbabilityAlert[];
  } catch {
    return [];
  }
}

function saveAlerts(alerts: ProbabilityAlert[]) {
  try {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
  } catch {
    /* ignore quota errors */
  }
}

function loadComments(): QuestionComment[] {
  try {
    const raw = localStorage.getItem(COMMENTS_STORAGE_KEY);
    if (!raw) return [...seedComments];
    const stored = JSON.parse(raw) as QuestionComment[];
    const ids = new Set(stored.map((c) => c.id));
    const merged = [...seedComments.filter((c) => !ids.has(c.id)), ...stored];
    return merged.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [...seedComments];
  }
}

function saveComments(comments: QuestionComment[]) {
  try {
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(comments));
  } catch {
    /* ignore quota errors */
  }
}

function loadQaMessages(): QaMessage[] {
  try {
    const raw = localStorage.getItem(QA_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QaMessage[];
  } catch {
    return [];
  }
}

function saveQaMessages(messages: QaMessage[]) {
  try {
    localStorage.setItem(QA_STORAGE_KEY, JSON.stringify(messages));
  } catch {
    /* ignore quota errors */
  }
}

function loadContextItems(): ContextItem[] {
  try {
    const raw = localStorage.getItem(CONTEXT_ITEMS_KEY);
    if (!raw) return [...seedContextItems];
    const stored = JSON.parse(raw) as ContextItem[];
    const ids = new Set(stored.map((i) => i.id));
    const merged = [...seedContextItems.filter((i) => !ids.has(i.id)), ...stored];
    return merged;
  } catch {
    return [...seedContextItems];
  }
}

function saveContextItems(items: ContextItem[]) {
  try {
    localStorage.setItem(CONTEXT_ITEMS_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

function loadContextBindings(): ContextBinding[] {
  try {
    const raw = localStorage.getItem(CONTEXT_BINDINGS_KEY);
    if (!raw) return [...seedContextBindings];
    const stored = JSON.parse(raw) as ContextBinding[];
    const ids = new Set(stored.map((b) => b.id));
    return [...seedContextBindings.filter((b) => !ids.has(b.id)), ...stored];
  } catch {
    return [...seedContextBindings];
  }
}

function saveContextBindings(bindings: ContextBinding[]) {
  try {
    localStorage.setItem(CONTEXT_BINDINGS_KEY, JSON.stringify(bindings));
  } catch {
    /* ignore */
  }
}

function loadContextRevisions(): ContextRevision[] {
  try {
    const raw = localStorage.getItem(CONTEXT_REVISIONS_KEY);
    if (!raw) return [...seedContextRevisions];
    const stored = JSON.parse(raw) as ContextRevision[];
    const ids = new Set(stored.map((r) => r.id));
    return [...seedContextRevisions.filter((r) => !ids.has(r.id)), ...stored];
  } catch {
    return [...seedContextRevisions];
  }
}

function saveContextRevisions(revisions: ContextRevision[]) {
  try {
    localStorage.setItem(CONTEXT_REVISIONS_KEY, JSON.stringify(revisions));
  } catch {
    /* ignore */
  }
}

function loadContextAudit(): ContextAuditEntry[] {
  try {
    const raw = localStorage.getItem(CONTEXT_AUDIT_KEY);
    if (!raw) return [...seedContextAudit];
    const stored = JSON.parse(raw) as ContextAuditEntry[];
    const ids = new Set(stored.map((a) => a.id));
    return [...seedContextAudit.filter((a) => !ids.has(a.id)), ...stored].sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp)
    );
  } catch {
    return [...seedContextAudit];
  }
}

function saveContextAudit(entries: ContextAuditEntry[]) {
  try {
    localStorage.setItem(CONTEXT_AUDIT_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

function checkAlertCrossing(
  alert: ProbabilityAlert,
  prior: number,
  current: number
): ProbabilityAlert | null {
  if (alert.triggeredAt) return null;
  const crossed =
    alert.direction === "above"
      ? prior < alert.threshold && current >= alert.threshold
      : prior > alert.threshold && current <= alert.threshold;
  if (!crossed) return null;
  return {
    ...alert,
    triggeredAt: new Date().toISOString(),
    triggeredProbability: current,
    read: false,
  };
}

interface StoreCtx {
  org: typeof organization;
  user: User;
  setUser: (u: User) => void;
  updateUser: (patch: Partial<User>) => void;
  allUsers: User[];
  userPreferences: UserPreferences;
  updateUserPreferences: (patch: Partial<UserPreferences>) => void;
  orgTeams: string[];
  teamJoinRequests: TeamJoinRequest[];
  requestTeamJoin: (team: string) => void;
  approveTeamJoinRequest: (requestId: string) => void;
  rejectTeamJoinRequest: (requestId: string) => void;
  /** Questions the current user is authorized to see. */
  questions: ForecastQuestion[];
  outcomesFor: (questionId: string) => Outcome[];
  historyFor: (outcomeId: string) => ProbabilityPoint[];
  yesOutcome: (questionId: string) => Outcome | undefined;
  canView: (q: ForecastQuestion) => boolean;
  setVisibility: (questionId: string, visibility: Visibility) => void;
  setCategory: (questionId: string, category: Category) => void;
  refreshForecast: (questionId: string) => void;
  touchpointSignalsFor: (questionId: string) => TouchpointSignal[];
  /** Add information from an org-provisioned app; optionally bind to a forecast. */
  addAppContext: (
    data: {
      connectorId: string;
      title: string;
      body: string;
      sourceRef?: string;
      visibility?: Visibility;
      tags?: string[];
    },
    questionId?: string
  ) => ContextItem;
  /** Import files as document context (creates library item + binding). */
  addUpload: (questionId: string, fileNames: string[]) => void;
  contextItems: ContextItem[];
  allContextItems: ContextItem[];
  contextBindings: ContextBinding[];
  contextAuditLog: ContextAuditEntry[];
  bindingsFor: (questionId: string) => ContextBinding[];
  boundContextFor: (questionId: string) => ContextItem[];
  bindContext: (questionId: string, contextItemId: string, notes?: string) => string | undefined;
  restoreContextBinding: (binding: ContextBinding) => void;
  unbindContext: (bindingId: string) => ContextBinding | undefined;
  addContextItem: (input: CreateContextItemInput) => ContextItem;
  updateContextItem: (id: string, patch: Partial<Pick<ContextItem, "title" | "description" | "body" | "visibility" | "tags">>, changeSummary?: string) => void;
  approveContextItem: (id: string) => void;
  rejectContextItem: (id: string) => void;
  archiveContextItem: (id: string) => void;
  revisionsFor: (contextItemId: string) => ContextRevision[];
  assembleModelContext: (questionId: string) => ModelContextBundle;
  canEditContext: (item: ContextItem) => boolean;
  canApproveContext: () => boolean;
  saveManualContextForQuestion: (questionId: string, body: string) => void;
  manualContextForQuestion: (questionId: string) => string;
  pinnedIds: string[];
  isPinned: (questionId: string) => boolean;
  togglePin: (questionId: string) => void;
  alerts: ProbabilityAlert[];
  addAlert: (alert: Omit<ProbabilityAlert, "id" | "createdAt" | "read">) => void;
  removeAlert: (alertId: string) => void;
  markAlertRead: (alertId: string) => void;
  markAllAlertsRead: () => void;
  unreadAlertCount: number;
  addQuestion: (input: CreateQuestionInput) => ForecastQuestion;
  startForecastJob: (input: CreateQuestionInput) => ForecastJob;
  getForecastJob: (jobId: string) => ForecastJob | undefined;
  finishForecastJob: (jobId: string) => ForecastQuestion | null;
  evidenceFor: (questionId: string) => EvidenceSource[];
  hideQuestion: (questionId: string) => void;
  deleteQuestion: (questionId: string) => void;
  commentsFor: (questionId: string) => QuestionComment[];
  addComment: (questionId: string, body: string, parentId?: string) => void;
  editComment: (commentId: string, body: string) => void;
  deleteComment: (commentId: string) => void;
  qaMessagesFor: (questionId: string) => QaMessage[];
  askQa: (questionId: string, prompt: string) => void;
  resetQa: (questionId: string) => void;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [allUsers, setAllUsers] = useState<User[]>(users);
  const [user, setUserState] = useState<User>(users[0]);
  const [preferencesByUser, setPreferencesByUser] = useState<Record<string, UserPreferences>>(() =>
    loadUserPreferences()
  );
  const [visibilityOverrides, setVisibilityOverrides] = useState<Record<string, Visibility>>({});
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, Category>>({});
  const [probabilityOverrides, setProbabilityOverrides] = useState<Record<string, number>>({});
  const [extraQuestions, setExtraQuestions] = useState<ForecastQuestion[]>([]);
  const [extraOutcomes, setExtraOutcomes] = useState<Outcome[]>([]);
  const [extraHistory, setExtraHistory] = useState<ProbabilityPoint[]>([]);
  const [extraEvidence, setExtraEvidence] = useState<Record<string, EvidenceSource[]>>({});
  const [touchpointSignals, setTouchpointSignals] = useState<Record<string, TouchpointSignal[]>>(() => ({
    ...seedTouchpointSignals,
  }));
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<ProbabilityAlert[]>(() => loadAlerts());
  const [hiddenByUser, setHiddenByUser] = useState<Record<string, string[]>>({});
  const [deletedQuestionIds, setDeletedQuestionIds] = useState<string[]>([]);
  const [forecastJobs, setForecastJobs] = useState<ForecastJob[]>(() => loadForecastJobs());
  const [comments, setComments] = useState<QuestionComment[]>(() => loadComments());
  const [qaMessages, setQaMessages] = useState<QaMessage[]>(() => loadQaMessages());
  const [contextItems, setContextItems] = useState<ContextItem[]>(() => loadContextItems());
  const [contextBindings, setContextBindings] = useState<ContextBinding[]>(() => loadContextBindings());
  const [contextRevisions, setContextRevisions] = useState<ContextRevision[]>(() => loadContextRevisions());
  const [contextAuditLog, setContextAuditLog] = useState<ContextAuditEntry[]>(() => loadContextAudit());
  const [teamJoinRequests, setTeamJoinRequests] = useState<TeamJoinRequest[]>(() => loadTeamJoinRequests());

  const persistTeamJoinRequests = useCallback(
    (updater: TeamJoinRequest[] | ((prev: TeamJoinRequest[]) => TeamJoinRequest[])) => {
      setTeamJoinRequests((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        saveTeamJoinRequests(next);
        return next;
      });
    },
    []
  );

  const addTeamToUser = useCallback((userId: string, team: string) => {
    setAllUsers((list) =>
      list.map((u) => {
        if (u.id !== userId) return u;
        const teams = userTeams(u);
        if (teams.includes(team)) return u;
        return { ...u, teams: [...teams, team] };
      })
    );
    setUserState((prev) => {
      if (prev.id !== userId) return prev;
      const teams = userTeams(prev);
      if (teams.includes(team)) return prev;
      return { ...prev, teams: [...teams, team] };
    });
  }, []);

  const requestTeamJoin = useCallback(
    (team: string) => {
      const trimmed = team.trim();
      if (!trimmed || !orgTeams.includes(trimmed)) return;
      if (userTeams(user).includes(trimmed)) return;
      const duplicate = teamJoinRequests.some(
        (r) => r.userId === user.id && r.team === trimmed && r.status === "pending"
      );
      if (duplicate) return;
      persistTeamJoinRequests((prev) => [
        ...prev,
        {
          id: newId("tjr"),
          userId: user.id,
          team: trimmed,
          status: "pending",
          requestedAt: new Date().toISOString(),
        },
      ]);
    },
    [persistTeamJoinRequests, teamJoinRequests, user]
  );

  const approveTeamJoinRequest = useCallback(
    (requestId: string) => {
      if (user.role !== "admin") return;
      const target = teamJoinRequests.find((r) => r.id === requestId && r.status === "pending");
      if (!target) return;
      persistTeamJoinRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? {
                ...r,
                status: "approved",
                resolvedAt: new Date().toISOString(),
                resolvedBy: user.id,
              }
            : r
        )
      );
      addTeamToUser(target.userId, target.team);
    },
    [addTeamToUser, persistTeamJoinRequests, teamJoinRequests, user.id, user.role]
  );

  const rejectTeamJoinRequest = useCallback(
    (requestId: string) => {
      if (user.role !== "admin") return;
      persistTeamJoinRequests((prev) =>
        prev.map((r) =>
          r.id === requestId && r.status === "pending"
            ? {
                ...r,
                status: "rejected",
                resolvedAt: new Date().toISOString(),
                resolvedBy: user.id,
              }
            : r
        )
      );
    },
    [persistTeamJoinRequests, user.id, user.role]
  );

  const setUser = useCallback((next: User) => {
    const merged = allUsers.find((u) => u.id === next.id) ?? next;
    setUserState(merged);
  }, [allUsers]);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUserState((prev) => {
      const next = { ...prev, ...patch };
      setAllUsers((list) => list.map((u) => (u.id === next.id ? next : u)));
      return next;
    });
  }, []);

  const userPreferences = useMemo(
    () => preferencesByUser[user.id] ?? defaultUserPreferences,
    [preferencesByUser, user.id]
  );

  const updateUserPreferences = useCallback(
    (patch: Partial<UserPreferences>) => {
      setPreferencesByUser((prev) => {
        const current = prev[user.id] ?? defaultUserPreferences;
        const next = { ...prev, [user.id]: { ...current, ...patch } };
        saveUserPreferences(next);
        return next;
      });
    },
    [user.id]
  );

  const persistAlerts = useCallback((updater: ProbabilityAlert[] | ((prev: ProbabilityAlert[]) => ProbabilityAlert[])) => {
    setAlerts((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveAlerts(next);
      return next;
    });
  }, []);

  const persistComments = useCallback((updater: QuestionComment[] | ((prev: QuestionComment[]) => QuestionComment[])) => {
    setComments((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveComments(next);
      return next;
    });
  }, []);

  const persistQaMessages = useCallback((updater: QaMessage[] | ((prev: QaMessage[]) => QaMessage[])) => {
    setQaMessages((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveQaMessages(next);
      return next;
    });
  }, []);

  const persistContextItems = useCallback((updater: ContextItem[] | ((prev: ContextItem[]) => ContextItem[])) => {
    setContextItems((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveContextItems(next);
      return next;
    });
  }, []);

  const persistContextBindings = useCallback(
    (updater: ContextBinding[] | ((prev: ContextBinding[]) => ContextBinding[])) => {
      setContextBindings((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        saveContextBindings(next);
        return next;
      });
    },
    []
  );

  const persistContextRevisions = useCallback(
    (updater: ContextRevision[] | ((prev: ContextRevision[]) => ContextRevision[])) => {
      setContextRevisions((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        saveContextRevisions(next);
        return next;
      });
    },
    []
  );

  const persistContextAudit = useCallback(
    (updater: ContextAuditEntry[] | ((prev: ContextAuditEntry[]) => ContextAuditEntry[])) => {
      setContextAuditLog((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        saveContextAudit(next);
        return next;
      });
    },
    []
  );

  const appendAudit = useCallback(
    (entry: Omit<ContextAuditEntry, "id" | "timestamp">) => {
      persistContextAudit((prev) => [
        {
          ...entry,
          id: newId("audit"),
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
    },
    [persistContextAudit]
  );

  const evaluateAlertsForOutcome = useCallback(
    (outcomeId: string, prior: number, current: number) => {
      setAlerts((prev) => {
        let changed = false;
        const next = prev.map((a) => {
          if (a.outcomeId !== outcomeId) return a;
          const updated = checkAlertCrossing(a, prior, current);
          if (updated) {
            changed = true;
            return updated;
          }
          return a;
        });
        if (changed) saveAlerts(next);
        return changed ? next : prev;
      });
    },
    []
  );

  const mergedQuestions = useMemo(
    () =>
      [...seedQuestions, ...extraQuestions]
        .filter((q) => !deletedQuestionIds.includes(q.id))
        .map((q) => ({
          ...q,
          ...(visibilityOverrides[q.id] ? { visibility: visibilityOverrides[q.id] } : {}),
          ...(categoryOverrides[q.id] ? { category: categoryOverrides[q.id] } : {}),
        })),
    [extraQuestions, deletedQuestionIds, visibilityOverrides, categoryOverrides]
  );

  const applyOutcomeOverrides = useCallback(
    (outcome: Outcome): Outcome => {
      const override = probabilityOverrides[outcome.id];
      return override !== undefined ? { ...outcome, currentProbability: override } : outcome;
    },
    [probabilityOverrides]
  );

  const historyFor = useCallback(
    (outcomeId: string) =>
      [...seedHistory.filter((h) => h.outcomeId === outcomeId), ...extraHistory.filter((h) => h.outcomeId === outcomeId)].sort(
        (a, b) => a.timestamp.localeCompare(b.timestamp)
      ),
    [extraHistory]
  );

  const allOutcomes = useMemo(
    () => [...seedOutcomes, ...extraOutcomes],
    [extraOutcomes]
  );

  const refreshForecast = useCallback(
    (questionId: string) => {
      const q = mergedQuestions.find((item) => item.id === questionId);
      const yes = allOutcomes.find((o) => o.questionId === questionId && o.id.endsWith("-yes"));
      if (!q || !yes) return;

      const prior = probabilityOverrides[yes.id] ?? yes.currentProbability;
      const forecast = runForecast(q, { anchor: prior, trigger: `refresh-${Date.now()}` });
      const newP = Number(forecast.currentProbability.toFixed(3));
      const no = allOutcomes.find((o) => o.questionId === questionId && o.id.endsWith("-no"));

      evaluateAlertsForOutcome(yes.id, prior, newP);

      setProbabilityOverrides((prev) => ({
        ...prev,
        [yes.id]: newP,
        ...(no ? { [no.id]: Number((1 - newP).toFixed(3)) } : {}),
      }));

      setExtraHistory((prev) => [
        ...prev,
        {
          id: `${questionId}-ph-refresh-${Date.now()}`,
          outcomeId: yes.id,
          probability: newP,
          timestamp: new Date().toISOString().slice(0, 10),
          source: "agent-ensemble",
          updateTrigger: "Manual forecast refresh",
        },
      ]);
    },
    [mergedQuestions, allOutcomes, probabilityOverrides, evaluateAlertsForOutcome]
  );

  const addQuestion = useCallback(
    (input: CreateQuestionInput, questionId?: string) => {
      const bundle = createQuestionFromInput(input, user, questionId);
      setExtraQuestions((prev) => {
        if (prev.some((q) => q.id === bundle.question.id)) return prev;
        return [...prev, bundle.question];
      });
      setExtraOutcomes((prev) => {
        const ids = new Set(prev.map((o) => o.id));
        const next = bundle.outcomes.filter((o) => !ids.has(o.id));
        return next.length ? [...prev, ...next] : prev;
      });
      setExtraHistory((prev) => {
        const ids = new Set(prev.map((h) => h.id));
        const next = bundle.history.filter((h) => !ids.has(h.id));
        return next.length ? [...prev, ...next] : prev;
      });
      if (bundle.evidence.length > 0) {
        setExtraEvidence((prev) => ({ ...prev, [bundle.question.id]: bundle.evidence }));
      }
      return bundle.question;
    },
    [user]
  );

  const persistForecastJobs = useCallback((updater: ForecastJob[] | ((prev: ForecastJob[]) => ForecastJob[])) => {
    setForecastJobs((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveForecastJobs(next);
      return next;
    });
  }, []);

  const startForecastJob = useCallback(
    (input: CreateQuestionInput) => {
      const questionId = `q-user-${Date.now()}`;
      const job: ForecastJob = {
        id: `job-${Date.now()}`,
        questionId,
        title: input.title.trim(),
        startedAt: Date.now(),
        durationMs: FORECAST_PROCESSING_MS,
        input,
        complete: false,
      };
      persistForecastJobs((prev) => [...prev.filter((j) => j.complete), job]);
      return job;
    },
    [persistForecastJobs]
  );

  const getForecastJob = useCallback(
    (jobId: string) => forecastJobs.find((j) => j.id === jobId),
    [forecastJobs]
  );

  const finishForecastJob = useCallback(
    (jobId: string) => {
      const job = forecastJobs.find((j) => j.id === jobId);
      if (!job) return null;

      const existing = extraQuestions.find((q) => q.id === job.questionId);
      if (job.complete) return existing ?? null;

      persistForecastJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, complete: true } : j))
      );
      return addQuestion(job.input, job.questionId);
    },
    [forecastJobs, extraQuestions, addQuestion, persistForecastJobs]
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      forecastJobs.forEach((job) => {
        if (!job.complete && now - job.startedAt >= job.durationMs) {
          finishForecastJob(job.id);
        }
      });
    }, 2000);
    return () => window.clearInterval(timer);
  }, [forecastJobs, finishForecastJob]);

  const evidenceFor = useCallback(
    (questionId: string) => {
      const custom = extraEvidence[questionId];
      if (custom?.length) return custom;
      if (questionId.startsWith("q-user-")) return [];
      return seedEvidenceSources.slice(0, 5);
    },
    [extraEvidence]
  );

  const hideQuestion = useCallback(
    (questionId: string) => {
      setHiddenByUser((prev) => {
        const current = prev[user.id] ?? [];
        if (current.includes(questionId)) return prev;
        return { ...prev, [user.id]: [...current, questionId] };
      });
      setPinnedIds((prev) => prev.filter((id) => id !== questionId));
    },
    [user.id]
  );

  const deleteQuestion = useCallback(
    (questionId: string) => {
      setDeletedQuestionIds((prev) => (prev.includes(questionId) ? prev : [...prev, questionId]));
      setExtraQuestions((prev) => prev.filter((q) => q.id !== questionId));
      setExtraOutcomes((prev) => prev.filter((o) => o.questionId !== questionId));
      setExtraHistory((prev) => prev.filter((h) => !h.outcomeId.startsWith(`${questionId}-`)));
      setExtraEvidence((prev) => {
        if (!(questionId in prev)) return prev;
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
      setPinnedIds((prev) => prev.filter((id) => id !== questionId));
      persistAlerts((prev) => prev.filter((a) => a.questionId !== questionId));
      setTouchpointSignals((prev) => {
        if (!(questionId in prev)) return prev;
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
      setHiddenByUser((prev) => {
        const next = { ...prev };
        for (const userId of Object.keys(next)) {
          next[userId] = next[userId].filter((id) => id !== questionId);
        }
        return next;
      });
      persistComments((prev) => prev.filter((c) => c.questionId !== questionId));
      persistQaMessages((prev) => prev.filter((m) => m.questionId !== questionId));
      persistContextBindings((prev) => prev.filter((b) => b.questionId !== questionId));
    },
    [persistAlerts, persistComments, persistQaMessages, persistContextBindings]
  );

  const visibleContextItemsList = useMemo(
    () => visibleContextItems(user, contextItems),
    [user, contextItems]
  );

  const bindingsFor = useCallback(
    (questionId: string) => bindingsForQuestion(questionId, contextBindings),
    [contextBindings]
  );

  const boundContextFor = useCallback(
    (questionId: string) =>
      itemsForQuestion(questionId, visibleContextItemsList, contextBindings),
    [visibleContextItemsList, contextBindings]
  );

  const touchpointSignalsFor = useCallback(
    (questionId: string) => {
      const fromBindings = touchpointSignalsFromBindings(
        questionId,
        visibleContextItemsList,
        contextBindings
      );
      if (fromBindings.length > 0) return fromBindings;
      return touchpointSignals[questionId] ?? [];
    },
    [visibleContextItemsList, contextBindings, touchpointSignals]
  );

  const bindContext = useCallback(
    (questionId: string, contextItemId: string, notes?: string): string | undefined => {
      const item = contextItems.find((i) => i.id === contextItemId);
      if (!item || item.status === "archived") return undefined;
      let createdId: string | undefined;
      persistContextBindings((prev) => {
        if (prev.some((b) => b.questionId === questionId && b.contextItemId === contextItemId)) {
          return prev;
        }
        const binding: ContextBinding = {
          id: newId("bind"),
          questionId,
          contextItemId,
          attachedBy: user.id,
          attachedAt: new Date().toISOString(),
          notes,
        };
        createdId = binding.id;
        appendAudit({
          actorId: user.id,
          action: "bind",
          resourceType: "binding",
          resourceId: binding.id,
          detail: `Bound "${item.title}" to forecast ${questionId}`,
        });
        return [...prev, binding];
      });
      return createdId;
    },
    [contextItems, user.id, persistContextBindings, appendAudit]
  );

  const unbindContext = useCallback(
    (bindingId: string): ContextBinding | undefined => {
      const target = contextBindings.find((b) => b.id === bindingId);
      if (!target) return undefined;

      persistContextBindings((prev) => {
        if (!prev.some((b) => b.id === bindingId)) return prev;
        const item = contextItems.find((i) => i.id === target.contextItemId);
        appendAudit({
          actorId: user.id,
          action: "unbind",
          resourceType: "binding",
          resourceId: bindingId,
          detail: `Unbound "${item?.title ?? target.contextItemId}" from ${target.questionId}`,
        });
        return prev.filter((b) => b.id !== bindingId);
      });
      return target;
    },
    [contextBindings, contextItems, user.id, persistContextBindings, appendAudit]
  );

  const restoreContextBinding = useCallback(
    (binding: ContextBinding) => {
      persistContextBindings((prev) => {
        if (
          prev.some(
            (b) =>
              b.id === binding.id ||
              (b.questionId === binding.questionId && b.contextItemId === binding.contextItemId)
          )
        ) {
          return prev;
        }
        const item = contextItems.find((i) => i.id === binding.contextItemId);
        appendAudit({
          actorId: user.id,
          action: "bind",
          resourceType: "binding",
          resourceId: binding.id,
          detail: `Restored binding for "${item?.title ?? binding.contextItemId}" on ${binding.questionId}`,
        });
        return [...prev, binding];
      });
    },
    [contextItems, user.id, persistContextBindings, appendAudit]
  );

  const addContextItem = useCallback(
    (input: CreateContextItemInput): ContextItem => {
      const item = createContextItemFromInput(input, user);
      persistContextItems((prev) => [...prev, item]);
      appendAudit({
        actorId: user.id,
        action: "create",
        resourceType: "context_item",
        resourceId: item.id,
        detail: `Created ${item.type} context: ${item.title}`,
      });
      if (item.body && (item.type === "manual" || item.type === "instruction")) {
        persistContextRevisions((prev) => [
          ...prev,
          {
            id: newId("rev"),
            contextItemId: item.id,
            version: 1,
            body: item.body!,
            changedBy: user.id,
            changedAt: item.createdAt,
            changeSummary: "Initial version",
          },
        ]);
      }
      return item;
    },
    [user, persistContextItems, appendAudit, persistContextRevisions]
  );

  const updateContextItem = useCallback(
    (
      id: string,
      patch: Partial<Pick<ContextItem, "title" | "description" | "body" | "visibility" | "tags">>,
      changeSummary = "Updated"
    ) => {
      const item = contextItems.find((i) => i.id === id);
      if (!item || !canEditContextItem(user, item)) return;
      const now = new Date().toISOString();
      persistContextItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: now } : i))
      );
      if (patch.body && patch.body !== item.body) {
        const body = patch.body;
        const revs = revisionsForItem(id, contextRevisions);
        const nextVersion = (revs[0]?.version ?? 0) + 1;
        persistContextRevisions((prev) => [
          ...prev,
          {
            id: newId("rev"),
            contextItemId: id,
            version: nextVersion,
            body,
            changedBy: user.id,
            changedAt: now,
            changeSummary,
          },
        ]);
      }
      appendAudit({
        actorId: user.id,
        action: "update",
        resourceType: "context_item",
        resourceId: id,
        detail: `${changeSummary}: ${item.title}`,
      });
    },
    [contextItems, contextRevisions, user, persistContextItems, persistContextRevisions, appendAudit]
  );

  const approveContextItem = useCallback(
    (id: string) => {
      if (!canApproveContextItem(user)) return;
      persistContextItems((prev) =>
        prev.map((i) =>
          i.id === id && i.status === "pending_approval"
            ? { ...i, status: "active", updatedAt: new Date().toISOString() }
            : i
        )
      );
      appendAudit({
        actorId: user.id,
        action: "approve",
        resourceType: "context_item",
        resourceId: id,
        detail: "Approved context item for model use",
      });
    },
    [user, persistContextItems, appendAudit]
  );

  const rejectContextItem = useCallback(
    (id: string) => {
      if (!canApproveContextItem(user)) return;
      persistContextItems((prev) =>
        prev.map((i) =>
          i.id === id && i.status === "pending_approval"
            ? { ...i, status: "archived", updatedAt: new Date().toISOString() }
            : i
        )
      );
      appendAudit({
        actorId: user.id,
        action: "reject",
        resourceType: "context_item",
        resourceId: id,
        detail: "Rejected context item",
      });
    },
    [user, persistContextItems, appendAudit]
  );

  const archiveContextItem = useCallback(
    (id: string) => {
      const item = contextItems.find((i) => i.id === id);
      if (!item || !canArchiveContextItem(user, item)) return;
      persistContextItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, status: "archived", updatedAt: new Date().toISOString() } : i
        )
      );
      appendAudit({
        actorId: user.id,
        action: "archive",
        resourceType: "context_item",
        resourceId: id,
        detail: `Archived: ${item.title}`,
      });
    },
    [contextItems, user, persistContextItems, appendAudit]
  );

  const revisionsFor = useCallback(
    (contextItemId: string) => revisionsForItem(contextItemId, contextRevisions),
    [contextRevisions]
  );

  const assembleModelContextFor = useCallback(
    (questionId: string) =>
      assembleModelContext(questionId, visibleContextItemsList, contextBindings, mergedQuestions),
    [visibleContextItemsList, contextBindings, mergedQuestions]
  );

  const canEditContext = useCallback(
    (item: ContextItem) => canEditContextItem(user, item),
    [user]
  );

  const canApproveContext = useCallback(() => canApproveContextItem(user), [user]);

  const manualContextItemForQuestion = useCallback(
    (questionId: string): ContextItem | undefined => {
      const bound = itemsForQuestion(questionId, contextItems, contextBindings);
      return bound.find((i) => i.type === "manual" && i.status === "active");
    },
    [contextItems, contextBindings]
  );

  const manualContextForQuestion = useCallback(
    (questionId: string) => manualContextItemForQuestion(questionId)?.body ?? "",
    [manualContextItemForQuestion]
  );

  const saveManualContextForQuestion = useCallback(
    (questionId: string, body: string) => {
      const trimmed = body.trim();
      const existing = manualContextItemForQuestion(questionId);
      if (existing) {
        updateContextItem(existing.id, { body: trimmed }, "Forecast-specific context update");
        return;
      }
      if (!trimmed) return;
      const item = addContextItem({
        type: "manual",
        title: `Additional context — ${questionId}`,
        body: trimmed,
        visibility: "team",
        owningTeam: user.team,
      });
      bindContext(questionId, item.id);
    },
    [manualContextItemForQuestion, updateContextItem, addContextItem, bindContext, user.team]
  );

  const addAppContext = useCallback(
    (
      data: {
        connectorId: string;
        title: string;
        body: string;
        sourceRef?: string;
        visibility?: Visibility;
        tags?: string[];
      },
      questionId?: string
    ): ContextItem => {
      const connector = connectorById(data.connectorId);
      const description = data.sourceRef
        ? `From ${connector?.name ?? data.connectorId} · ${data.sourceRef}`
        : `From ${connector?.name ?? data.connectorId}`;
      const item = addContextItem({
        type: "manual",
        title: data.title.trim(),
        body: data.body.trim(),
        connectorId: data.connectorId,
        description,
        visibility: data.visibility ?? "team",
        tags: data.tags,
      });
      if (questionId) bindContext(questionId, item.id);
      return item;
    },
    [addContextItem, bindContext]
  );

  const addUpload = useCallback(
    (questionId: string, fileNames: string[]) => {
      if (fileNames.length === 0) return;
      const title = fileNames.length === 1 ? fileNames[0] : `${fileNames.length} uploaded files`;
      const item = addContextItem({
        type: "document",
        title,
        fileNames,
        visibility: "team",
      });
      bindContext(questionId, item.id);
    },
    [addContextItem, bindContext]
  );

  const isPinned = useCallback((questionId: string) => pinnedIds.includes(questionId), [pinnedIds]);

  const togglePin = useCallback((questionId: string) => {
    setPinnedIds((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId]
    );
  }, []);

  const addAlert = useCallback(
    (input: Omit<ProbabilityAlert, "id" | "createdAt" | "read">) => {
      persistAlerts((prev) => [
        ...prev,
        {
          ...input,
          id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: new Date().toISOString(),
          read: false,
        },
      ]);
    },
    [persistAlerts]
  );

  const removeAlert = useCallback(
    (alertId: string) => {
      persistAlerts((prev) => prev.filter((a) => a.id !== alertId));
    },
    [persistAlerts]
  );

  const markAlertRead = useCallback(
    (alertId: string) => {
      persistAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, read: true } : a)));
    },
    [persistAlerts]
  );

  const markAllAlertsRead = useCallback(() => {
    persistAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  }, [persistAlerts]);

  const unreadAlertCount = useMemo(
    () => alerts.filter((a) => a.triggeredAt && !a.read).length,
    [alerts]
  );

  const commentsFor = useCallback(
    (questionId: string) => comments.filter((c) => c.questionId === questionId),
    [comments]
  );

  const addComment = useCallback(
    (questionId: string, body: string, parentId?: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      persistComments((prev) => {
        if (parentId) {
          const parent = prev.find((c) => c.id === parentId && c.questionId === questionId);
          if (!parent || parent.parentId) return prev;
        }
        return [
          ...prev,
          {
            id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            questionId,
            authorId: user.id,
            authorName: user.name,
            authorTeam: user.team,
            body: trimmed,
            createdAt: new Date().toISOString(),
            ...(parentId ? { parentId } : {}),
          },
        ];
      });
    },
    [user, persistComments]
  );

  const editComment = useCallback(
    (commentId: string, body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      persistComments((prev) =>
        prev.map((c) =>
          c.id === commentId && c.authorId === user.id
            ? { ...c, body: trimmed, editedAt: new Date().toISOString() }
            : c
        )
      );
    },
    [user.id, persistComments]
  );

  const deleteComment = useCallback(
    (commentId: string) => {
      persistComments((prev) => {
        const target = prev.find((c) => c.id === commentId);
        if (!target || target.authorId !== user.id) return prev;
        return prev.filter((c) => c.id !== commentId);
      });
    },
    [user.id, persistComments]
  );

  const qaMessagesFor = useCallback(
    (questionId: string) => qaMessages.filter((m) => m.questionId === questionId),
    [qaMessages]
  );

  const askQa = useCallback(
    (questionId: string, prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed) return;
      const q = mergedQuestions.find((item) => item.id === questionId);
      if (!q) return;
      const forecast = runForecast(q);
      const bundle = assembleModelContextFor(questionId);
      const contextNote =
        bundle.connectors.length + bundle.documents.length + bundle.manualNotes.length > 0
          ? `\n\n(Context: ${bundle.connectors.length} connector(s), ${bundle.documents.length} document(s), ${bundle.manualNotes.length} note(s) bound.)`
          : "";
      const ts = Date.now();
      const userMsg: QaMessage = {
        id: `qa-${ts}-u`,
        questionId,
        role: "user",
        body: trimmed,
        createdAt: new Date().toISOString(),
      };
      const assistantMsg: QaMessage = {
        id: `qa-${ts}-a`,
        questionId,
        role: "assistant",
        body: answerForecastQuestion(trimmed, forecast, q) + contextNote,
        createdAt: new Date(Date.now() + 1).toISOString(),
      };
      persistQaMessages((prev) => [...prev, userMsg, assistantMsg]);
    },
    [mergedQuestions, persistQaMessages, assembleModelContextFor]
  );

  const resetQa = useCallback(
    (questionId: string) => {
      persistQaMessages((prev) => prev.filter((m) => m.questionId !== questionId));
    },
    [persistQaMessages]
  );

  const value = useMemo<StoreCtx>(() => {
    const visible = visibleQuestions(user, mergedQuestions, accessGrants);
    const hidden = new Set(hiddenByUser[user.id] ?? []);
    return {
      org: organization,
      user,
      setUser,
      updateUser,
      allUsers,
      userPreferences,
      updateUserPreferences,
      orgTeams,
      teamJoinRequests,
      requestTeamJoin,
      approveTeamJoinRequest,
      rejectTeamJoinRequest,
      questions: visible.filter((q) => !hidden.has(q.id)),
      canView: (q) => canViewQuestion(user, q, accessGrants),
      setVisibility: (questionId, visibility) =>
        setVisibilityOverrides((prev) => ({ ...prev, [questionId]: visibility })),
      setCategory: (questionId, category) =>
        setCategoryOverrides((prev) => ({ ...prev, [questionId]: category })),
      refreshForecast,
      touchpointSignalsFor,
      addAppContext,
      addUpload,
      contextItems: visibleContextItemsList,
      allContextItems: contextItems,
      contextBindings,
      contextAuditLog,
      bindingsFor,
      boundContextFor,
      bindContext,
      restoreContextBinding,
      unbindContext,
      addContextItem,
      updateContextItem,
      approveContextItem,
      rejectContextItem,
      archiveContextItem,
      revisionsFor,
      assembleModelContext: assembleModelContextFor,
      canEditContext,
      canApproveContext,
      saveManualContextForQuestion,
      manualContextForQuestion,
      pinnedIds,
      isPinned,
      togglePin,
      alerts,
      addAlert,
      removeAlert,
      markAlertRead,
      markAllAlertsRead,
      unreadAlertCount,
      addQuestion,
      startForecastJob,
      getForecastJob,
      finishForecastJob,
      evidenceFor,
      hideQuestion,
      deleteQuestion,
      commentsFor,
      addComment,
      editComment,
      deleteComment,
      qaMessagesFor,
      askQa,
      resetQa,
      outcomesFor: (questionId) =>
        allOutcomes.filter((o) => o.questionId === questionId).map(applyOutcomeOverrides),
      historyFor,
      yesOutcome: (questionId) => {
        const list = allOutcomes.filter((o) => o.questionId === questionId).map(applyOutcomeOverrides);
        const yes = list.find((o) => o.id.endsWith("-yes"));
        if (yes) return yes;
        if (list.length === 0) return undefined;
        return list.reduce((best, o) => (o.currentProbability > best.currentProbability ? o : best));
      },
    };
  }, [user, allUsers, setUser, userPreferences, updateUser, updateUserPreferences, teamJoinRequests, requestTeamJoin, approveTeamJoinRequest, rejectTeamJoinRequest, mergedQuestions, hiddenByUser, forecastJobs, allOutcomes, applyOutcomeOverrides, historyFor, refreshForecast, touchpointSignalsFor, addAppContext, addUpload, visibleContextItemsList, contextItems, contextBindings, contextAuditLog, bindingsFor, boundContextFor, bindContext, restoreContextBinding, unbindContext, addContextItem, updateContextItem, approveContextItem, rejectContextItem, archiveContextItem, revisionsFor, assembleModelContextFor, canEditContext, canApproveContext, saveManualContextForQuestion, manualContextForQuestion, pinnedIds, isPinned, togglePin, alerts, addAlert, removeAlert, markAlertRead, markAllAlertsRead, unreadAlertCount, addQuestion, startForecastJob, getForecastJob, finishForecastJob, evidenceFor, hideQuestion, deleteQuestion, commentsFor, addComment, editComment, deleteComment, qaMessagesFor, askQa, resetQa]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// --- derived helpers ---

export function probabilityDelta(history: ProbabilityPoint[], days: number): number | null {
  if (history.length === 0) return null;
  const latest = history[history.length - 1];
  const cutoff = new Date(latest.timestamp);
  cutoff.setDate(cutoff.getDate() - days);
  const past = [...history].reverse().find((h) => new Date(h.timestamp) <= cutoff);
  if (!past) return null;
  return latest.probability - past.probability;
}

export function riskWeighted(q: ForecastQuestion, p: number): number {
  return p * q.impactScore;
}

export function sortWithPins(questions: ForecastQuestion[], pinnedIds: string[]): ForecastQuestion[] {
  if (pinnedIds.length === 0) return questions;
  const pinned = pinnedIds
    .map((id) => questions.find((q) => q.id === id))
    .filter((q): q is ForecastQuestion => q !== undefined);
  const unpinned = questions.filter((q) => !pinnedIds.includes(q.id));
  return [...pinned, ...unpinned];
}
