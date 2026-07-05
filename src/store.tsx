import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
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
import { runForecast } from "./domain/engine";
import { canViewQuestion, visibleQuestions } from "./domain/access";
import type { ForecastQuestion, Outcome, ProbabilityAlert, ProbabilityPoint, TouchpointSignal, User, Visibility } from "./domain/types";

const ALERTS_STORAGE_KEY = "foresight-probability-alerts";

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
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(users[0]);
  const [visibilityOverrides, setVisibilityOverrides] = useState<Record<string, Visibility>>({});
  const [probabilityOverrides, setProbabilityOverrides] = useState<Record<string, number>>({});
  const [extraHistory, setExtraHistory] = useState<ProbabilityPoint[]>([]);
  const [touchpointSignals, setTouchpointSignals] = useState<Record<string, TouchpointSignal[]>>(() => ({
    ...seedTouchpointSignals,
  }));
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<ProbabilityAlert[]>(() => loadAlerts());

  const persistAlerts = useCallback((updater: ProbabilityAlert[] | ((prev: ProbabilityAlert[]) => ProbabilityAlert[])) => {
    setAlerts((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveAlerts(next);
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
      seedQuestions.map((q) =>
        visibilityOverrides[q.id] ? { ...q, visibility: visibilityOverrides[q.id] } : q
      ),
    [visibilityOverrides]
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

  const refreshForecast = useCallback(
    (questionId: string) => {
      const q = mergedQuestions.find((item) => item.id === questionId);
      const yes = seedOutcomes.find((o) => o.questionId === questionId && o.id.endsWith("-yes"));
      if (!q || !yes) return;

      const prior = probabilityOverrides[yes.id] ?? yes.currentProbability;
      const forecast = runForecast(q, { anchor: prior, trigger: `refresh-${Date.now()}` });
      const newP = Number(forecast.currentProbability.toFixed(3));
      const no = seedOutcomes.find((o) => o.questionId === questionId && o.id.endsWith("-no"));

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
    [mergedQuestions, probabilityOverrides, evaluateAlertsForOutcome]
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

  const value = useMemo<StoreCtx>(() => {
    const visible = visibleQuestions(user, mergedQuestions, accessGrants);
    return {
      org: organization,
      user,
      setUser,
      allUsers: users,
      questions: visible,
      canView: (q) => canViewQuestion(user, q, accessGrants),
      setVisibility: (questionId, visibility) =>
        setVisibilityOverrides((prev) => ({ ...prev, [questionId]: visibility })),
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
      outcomesFor: (questionId) =>
        seedOutcomes.filter((o) => o.questionId === questionId).map(applyOutcomeOverrides),
      historyFor,
      yesOutcome: (questionId) => {
        const outcome = seedOutcomes.find((o) => o.questionId === questionId && o.id.endsWith("-yes"));
        return outcome ? applyOutcomeOverrides(outcome) : undefined;
      },
    };
  }, [user, mergedQuestions, applyOutcomeOverrides, historyFor, refreshForecast, touchpointSignalsFor, addSource, addUpload, pinnedIds, isPinned, togglePin, alerts, addAlert, removeAlert, markAlertRead, markAllAlertsRead, unreadAlertCount]);

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
