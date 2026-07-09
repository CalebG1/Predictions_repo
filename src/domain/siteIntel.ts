// Site-selection forecast intelligence.
//
// Mirrors cyberForecast.ts: turns a site question + its signals + its history
// into executive-legible artifacts — a factor decomposition, a confidence
// label, a plain-English explanation, and a recommended action. Factor
// vocabularies differ by asset class (retail vs. industrial).

import type { Confidence, ForecastQuestion, ProbabilityPoint } from "./types";
import { impactsForQuestion, signalsForQuestion } from "./siteSignals";

export interface SiteFactor {
  factor: string;
  /** Signed contribution in probability points (e.g. +0.08 = +8pp). */
  contribution: number;
}

interface SiteIntel {
  confidence: Confidence;
  structuralFactors: SiteFactor[];
  recommendedAction: string;
}

const INTEL: Record<string, SiteIntel> = {
  "q-site-maple": {
    confidence: "medium",
    structuralFactors: [
      { factor: "Trade-area capture vs. plan", contribution: 0.05 },
      { factor: "Daytime worker density", contribution: 0.04 },
      { factor: "Competitor entry two blocks away", contribution: -0.05 },
      { factor: "Cannibalization of Midtown Flagship", contribution: -0.03 },
      { factor: "Rent escalation since underwriting", contribution: -0.01 },
    ],
    recommendedAction:
      "Re-run the pro forma with the competitor entry assumed open by month 8, and negotiate a rent abatement or percentage-rent structure before executing the lease.",
  },
  "q-site-northgate": {
    confidence: "high",
    structuralFactors: [
      { factor: "Grocery anchor LOI signed", contribution: 0.05 },
      { factor: "Submarket population growth", contribution: 0.03 },
      { factor: "Strong center co-tenancy mix", contribution: 0.02 },
      { factor: "Limited competing QSR density", contribution: 0.02 },
      { factor: "Anchor opening-date slippage risk", contribution: -0.02 },
    ],
    recommendedAction:
      "Move to LOI while anchor momentum holds; tie the rent commencement date to the anchor's confirmed opening to hedge slippage risk.",
  },
  "q-site-eastbank": {
    confidence: "medium",
    structuralFactors: [
      { factor: "Waterfront foot traffic upside", contribution: 0.03 },
      { factor: "Bridge closures through Q2 2027", contribution: -0.04 },
      { factor: "Thin trade-area population east of river", contribution: -0.02 },
    ],
    recommendedAction:
      "Defer commitment until the DOT publishes the final closure schedule, or negotiate opening-year rent relief sized to the access disruption.",
  },
  "q-site-university": {
    confidence: "medium",
    structuralFactors: [
      { factor: "Pedestrian counts +12% YoY", contribution: 0.04 },
      { factor: "Enrollment growth announced", contribution: 0.02 },
      { factor: "Deeper summer trough than underwritten", contribution: -0.03 },
      { factor: "Late-night competitor saturation", contribution: -0.02 },
    ],
    recommendedAction:
      "Stress the pro forma with a 22% summer trough and validate the catering/delivery channel plan that offsets academic-calendar seasonality.",
  },
  "q-site-harborpoint": {
    confidence: "low",
    structuralFactors: [
      { factor: "Competitor exit releases demand", contribution: 0.04 },
      { factor: "Comps missed first-year plans", contribution: -0.04 },
      { factor: "Weak evening trade-area draw", contribution: -0.02 },
      { factor: "Cannibalization of Westfield Crossing", contribution: -0.02 },
    ],
    recommendedAction:
      "Hold until the competitor's closure is confirmed and 60 days of post-closure traffic data lands; the comp-set misses argue against pre-committing.",
  },
  "q-site-airport": {
    confidence: "high",
    structuralFactors: [
      { factor: "Staff report recommends approval", contribution: 0.07 },
      { factor: "Precedent industrial rezonings approved", contribution: 0.04 },
      { factor: "Neighborhood truck-routing opposition", contribution: -0.03 },
      { factor: "Hearing-calendar slip risk", contribution: -0.02 },
    ],
    recommendedAction:
      "Pre-negotiate the truck-routing condition with the neighborhood association before the August 12 hearing to convert opposition into conditioned support.",
  },
  "q-site-southloop": {
    confidence: "medium",
    structuralFactors: [
      { factor: "3PL lease in advanced negotiation", contribution: 0.05 },
      { factor: "Highway interchange adjacency", contribution: 0.03 },
      { factor: "Competing supply delivering within 12 months", contribution: -0.04 },
      { factor: "Labor-cost pressure on tenant economics", contribution: -0.01 },
    ],
    recommendedAction:
      "Prioritize closing the 3PL lease before the competing supply delivers; consider a modest TI concession to compress the negotiation timeline.",
  },
  "q-site-riverside": {
    confidence: "medium",
    structuralFactors: [
      { factor: "BRT stop expands labor catchment", contribution: 0.03 },
      { factor: "Warehouse wage index +9% YoY", contribution: -0.05 },
      { factor: "Competing corridor supply bidding up labor", contribution: -0.02 },
      { factor: "Shift-differential budget headroom", contribution: 0.02 },
    ],
    recommendedAction:
      "Rebuild the staffing plan against the updated wage index and lock a transit-linked recruiting partnership before committing to the 6-month ramp.",
  },
};

export function questionConfidence(questionId: string): Confidence {
  return INTEL[questionId]?.confidence ?? "medium";
}

/**
 * Factor decomposition: curated structural factors, falling back to the
 * largest signal-driven contributions so the breakdown reflects live evidence.
 */
export function forecastDecomposition(questionId: string): SiteFactor[] {
  const intel = INTEL[questionId];
  if (intel) return intel.structuralFactors;

  const impacts = impactsForQuestion(questionId);
  if (impacts.length === 0) {
    return [{ factor: "Base rate (outside view)", contribution: 0 }];
  }
  return impacts.slice(0, 6).map((i) => ({ factor: i.reason, contribution: i.probabilityDelta }));
}

export function recommendedAction(questionId: string): string {
  return (
    INTEL[questionId]?.recommendedAction ??
    "Review the top drivers and assign an owner to the highest-contribution factor."
  );
}

export type Trend = "up" | "flat" | "down";

function sevenDayDelta(history: ProbabilityPoint[]): number | null {
  if (history.length === 0) return null;
  const latest = history[history.length - 1];
  const cutoff = new Date(latest.timestamp);
  cutoff.setDate(cutoff.getDate() - 7);
  const past = [...history].reverse().find((h) => new Date(h.timestamp) <= cutoff);
  if (!past) return null;
  return latest.probability - past.probability;
}

export function trendFrom(history: ProbabilityPoint[]): Trend {
  const d = sevenDayDelta(history);
  if (d === null || Math.abs(d) < 0.005) return "flat";
  return d > 0 ? "up" : "down";
}

/**
 * Plain-English explanation of the latest movement, legible to a real-estate
 * committee (no gravity-model jargon in the headline).
 */
export function explanationFor(
  question: ForecastQuestion,
  priorProbability: number,
  currentProbability: number
): string {
  const from = `${(priorProbability * 100).toFixed(0)}%`;
  const to = `${(currentProbability * 100).toFixed(0)}%`;
  const rose = currentProbability >= priorProbability;
  const joined = signalsForQuestion(question.id);
  const aligned = joined
    .filter((s) => (rose ? s.impact.direction === "increase" : s.impact.direction === "decrease"))
    .slice(0, 2);

  if (aligned.length === 0) {
    return `The probability is ${to}. No forecast-relevant market signals moved this site in the recent window; the estimate reflects the outside-view base rate and the standing trade-area model.`;
  }

  const primary = aligned[0];
  const secondary = aligned[1];
  const lead =
    `The probability ${rose ? "increased" : "decreased"} from ${from} to ${to} primarily because ` +
    lowerFirst(primary.signal.title) + ".";
  const detail = ` ${primary.impact.reason}`;
  const extra = secondary
    ? ` This was compounded by ${lowerFirst(secondary.signal.title)}, which ${lowerFirst(secondary.impact.reason)}`
    : "";
  return lead + detail + extra;
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const TREND_GLYPH: Record<Trend, string> = {
  up: "↑",
  down: "↓",
  flat: "→",
};
