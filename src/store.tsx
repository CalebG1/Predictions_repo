import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  accessGrants,
  organization,
  outcomes as seedOutcomes,
  probabilityHistory as seedHistory,
  questions as seedQuestions,
  users,
} from "./domain/seed";
import { seedTouchpointSignals, connectSignalFor, uploadSignalFor } from "./domain/touchpoints";
import type { Connector } from "./domain/connectors";
import { createQuestionFromInput, type CreateQuestionInput } from "./domain/generateQuestion";
import { FORECAST_PROCESSING_MS, type ForecastJob } from "./domain/forecastJob";
import { runForecast } from "./domain/engine";
import { answerForecastQuestion } from "./domain/qaAnswer";
import { canViewQuestion, visibleQuestions } from "./domain/access";
import type { ForecastQuestion, Outcome, ProbabilityAlert, ProbabilityPoint, TouchpointSignal, User, Visibility, Category, EvidenceSource, QuestionComment, QaMessage } from "./domain/types";
import { evidenceSources as seedEvidenceSources, seedComments } from "./domain/seed";

const ALERTS_STORAGE_KEY = "foresight-probability-alerts";
const FORECAST_JOBS_STORAGE_KEY = "foresight-forecast-jobs";
const COMMENTS_STORAGE_KEY = "foresight-question-comments";
const QA_STORAGE_KEY = "foresight-question-qa";

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
  allUsers: User[];
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
  /** Connect an app from the source gallery. */
  addSource: (questionId: string, connector: Connector) => void;
  /** Import files as an "Uploaded files" source. */
  addUpload: (questionId: string, fileNames: string[]) => void;
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
  const [user, setUser] = useState<User>(users[0]);
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
    },
    [persistAlerts, persistComments, persistQaMessages]
  );

  const touchpointSignalsFor = useCallback(
    (questionId: string) => touchpointSignals[questionId] ?? [],
    [touchpointSignals]
  );

  const addSource = useCallback((questionId: string, connector: Connector) => {
    const signal = connectSignalFor(connector);
    setTouchpointSignals((prev) => {
      const current = prev[questionId] ?? [];
      const already = current.some((s) =>
        signal.kind === "custom" ? s.sourceId === signal.sourceId : s.kind === signal.kind
      );
      if (already) return prev;
      return { ...prev, [questionId]: [...current, signal] };
    });
  }, []);

  const addUpload = useCallback((questionId: string, fileNames: string[]) => {
    if (fileNames.length === 0) return;
    const signal = uploadSignalFor(fileNames);
    setTouchpointSignals((prev) => {
      const current = prev[questionId] ?? [];
      const existing = current.find((s) => s.kind === "upload");
      if (existing) {
        return {
          ...prev,
          [questionId]: current.map((s) => (s.kind === "upload" ? signal : s)),
        };
      }
      return { ...prev, [questionId]: [...current, signal] };
    });
  }, []);

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
        body: answerForecastQuestion(trimmed, forecast, q),
        createdAt: new Date(Date.now() + 1).toISOString(),
      };
      persistQaMessages((prev) => [...prev, userMsg, assistantMsg]);
    },
    [mergedQuestions, persistQaMessages]
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
      allUsers: users,
      questions: visible.filter((q) => !hidden.has(q.id)),
      canView: (q) => canViewQuestion(user, q, accessGrants),
      setVisibility: (questionId, visibility) =>
        setVisibilityOverrides((prev) => ({ ...prev, [questionId]: visibility })),
      setCategory: (questionId, category) =>
        setCategoryOverrides((prev) => ({ ...prev, [questionId]: category })),
      refreshForecast,
      touchpointSignalsFor,
      addSource,
      addUpload,
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
  }, [user, mergedQuestions, hiddenByUser, forecastJobs, allOutcomes, applyOutcomeOverrides, historyFor, refreshForecast, touchpointSignalsFor, addSource, addUpload, pinnedIds, isPinned, togglePin, alerts, addAlert, removeAlert, markAlertRead, markAllAlertsRead, unreadAlertCount, addQuestion, startForecastJob, getForecastJob, finishForecastJob, evidenceFor, hideQuestion, deleteQuestion, commentsFor, addComment, editComment, deleteComment, qaMessagesFor, askQa, resetQa]);

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
