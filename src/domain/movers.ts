// Forecast movements — PRD §6.2.
// Explains why probabilities moved by tying each change to alert evidence.

import type { Confidence, ForecastQuestion, Outcome, ProbabilityPoint } from "./types";
import { alertsForQuestion } from "./alerts";
import { questionConfidence } from "./cyberForecast";

export interface MovementDriver {
  label: string;
  delta: number;
  reason: string;
}

export interface ForecastMovement {
  questionId: string;
  title: string;
  previous: number;
  current: number;
  change: number;
  mainDriver: string;
  confidence: Confidence;
  drivers: MovementDriver[];
}

function sevenDayDelta(history: ProbabilityPoint[]): { prior: number; current: number } | null {
  if (history.length === 0) return null;
  const current = history[history.length - 1].probability;
  const latest = history[history.length - 1];
  const cutoff = new Date(latest.timestamp);
  cutoff.setDate(cutoff.getDate() - 7);
  const past = [...history].reverse().find((h) => new Date(h.timestamp) <= cutoff);
  const prior = past?.probability ?? (history.length >= 2 ? history[history.length - 2].probability : current);
  return { prior, current };
}

/** Build driver breakdown from forecast-relevant alerts for a question. */
export function driversForQuestion(questionId: string): MovementDriver[] {
  return alertsForQuestion(questionId).map(({ alert, impact }) => ({
    label: alert.title,
    delta: impact.probabilityDelta,
    reason: impact.reason,
  }));
}

export function forecastMovement(
  q: ForecastQuestion,
  yesOutcome: (id: string) => Outcome | undefined,
  historyFor: (outcomeId: string) => ProbabilityPoint[]
): ForecastMovement | null {
  const yes = yesOutcome(q.id);
  if (!yes) return null;
  const window = sevenDayDelta(historyFor(yes.id));
  if (!window) return null;

  const drivers = driversForQuestion(q.id);
  const top = drivers.length > 0 ? drivers[0] : null;

  return {
    questionId: q.id,
    title: q.title,
    previous: window.prior,
    current: window.current,
    change: window.current - window.prior,
    mainDriver: top?.label ?? "Scheduled model refresh",
    confidence: questionConfidence(q.id),
    drivers,
  };
}

/** All movements for visible questions, sorted by absolute 7d change. */
export function forecastMovements(
  questions: ForecastQuestion[],
  yesOutcome: (id: string) => Outcome | undefined,
  historyFor: (outcomeId: string) => ProbabilityPoint[],
  opts?: { category?: ForecastQuestion["category"] }
): ForecastMovement[] {
  let list = questions;
  if (opts?.category) list = list.filter((q) => q.category === opts.category);

  return list
    .map((q) => forecastMovement(q, yesOutcome, historyFor))
    .filter((m): m is ForecastMovement => m !== null)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}

export interface TopMovers {
  upward: ForecastMovement[];
  downward: ForecastMovement[];
}

/** Compact top movers for the Overview page (PRD §6.1.B). */
export function topRiskMovers(
  questions: ForecastQuestion[],
  yesOutcome: (id: string) => Outcome | undefined,
  historyFor: (outcomeId: string) => ProbabilityPoint[],
  limit = 3
): TopMovers {
  const all = forecastMovements(questions, yesOutcome, historyFor, { category: "Security/Cyber" });
  return {
    upward: all.filter((m) => m.change > 0.005).slice(0, limit),
    downward: all.filter((m) => m.change < -0.005).slice(0, limit),
  };
}

/** Main driver for a single history step — prefer alert title if one exists near that time. */
export function mainDriverForTrigger(questionId: string, trigger: string): string {
  const drivers = driversForQuestion(questionId);
  if (drivers.length > 0) return drivers[0].label;
  return trigger;
}
