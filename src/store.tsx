import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  accessGrants,
  organization,
  outcomes as seedOutcomes,
  probabilityHistory as seedHistory,
  questions as seedQuestions,
  users,
} from "./domain/seed";
import { canViewQuestion, visibleQuestions } from "./domain/access";
import type { ForecastQuestion, Outcome, ProbabilityPoint, User } from "./domain/types";

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
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(users[0]);

  const value = useMemo<StoreCtx>(() => {
    const visible = visibleQuestions(user, seedQuestions, accessGrants);
    return {
      org: organization,
      user,
      setUser,
      allUsers: users,
      questions: visible,
      canView: (q) => canViewQuestion(user, q, accessGrants),
      outcomesFor: (questionId) => seedOutcomes.filter((o) => o.questionId === questionId),
      historyFor: (outcomeId) =>
        seedHistory
          .filter((h) => h.outcomeId === outcomeId)
          .sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
      yesOutcome: (questionId) =>
        seedOutcomes.find((o) => o.questionId === questionId && o.id.endsWith("-yes")),
    };
  }, [user]);

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
