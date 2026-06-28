// Deterministic mock of the multi-agent "dragonfly eye" forecasting engine.
//
// In production each agent would be an LLM call with retrieval; here we generate
// reproducible estimates so the dashboard is demoable and the synthesis/scoring
// path is exercised end-to-end. The IMPORTANT properties preserved:
//   - each agent produces an INDEPENDENT estimate before synthesis (anti-anchoring)
//   - estimates are pooled with log-odds averaging
//   - the extremizer only sharpens when agents are diverse + partially informed
//   - every run emits the standard ForecastObject (Appendix A)

import { logOddsAverage, extremize, clampProb } from "./scoring";
import type { AgentEstimate, AgentRole, ForecastObject, ForecastQuestion } from "./types";

// Deterministic pseudo-random in [0,1) from a string seed.
function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Agents that produce a numeric estimate (others are process/meta roles).
const ESTIMATING_AGENTS: { role: AgentRole; weight: number; bias: number; label: string }[] = [
  { role: "base-rate", weight: 1.2, bias: 0, label: "Anchored on comparison-class frequency." },
  { role: "inside-view", weight: 1.0, bias: 0.06, label: "Case-specific causal forces and incentives." },
  { role: "market-crowd", weight: 0.9, bias: -0.02, label: "External markets / polls / benchmarks." },
  { role: "red-team", weight: 0.7, bias: -0.12, label: "Strongest case against the lead view." },
  { role: "scope-sensitivity", weight: 0.6, bias: 0.03, label: "Sensitivity to time window / threshold." },
  { role: "bayesian-updater", weight: 1.0, bias: 0.04, label: "Likelihood-weighted update on new evidence." },
];

export interface RunOptions {
  /** Pull the aggregate toward this when provided (e.g. last known probability). */
  anchor?: number;
  trigger?: string;
}

export function runForecast(q: ForecastQuestion, opts: RunOptions = {}): ForecastObject {
  const rng = seeded(q.id + (opts.trigger ?? "scheduled"));
  const base = clampProb(q.priorBaseRate);

  const agentPanel: AgentEstimate[] = ESTIMATING_AGENTS.map((a) => {
    // Independent estimate: base rate + role bias + bounded noise.
    const noise = (rng() - 0.5) * 0.18;
    const estimate = clampProb(base + a.bias + noise);
    return {
      agent: a.role,
      estimate,
      rationale: a.label,
      rationaleRef: `rationale:${q.id}:${a.role}`,
      weight: a.weight,
    };
  });

  const estimates = agentPanel.map((a) => a.estimate);
  const weights = agentPanel.map((a) => a.weight);
  const pooled = logOddsAverage(estimates, weights);

  // Diversity = spread of independent estimates. Extremize only if diverse.
  const spread = Math.max(...estimates) - Math.min(...estimates);
  const extremizeFactor = spread > 0.25 ? 1.15 : 1.0;
  let current = extremize(pooled, extremizeFactor);

  // Soft pull toward an anchor (continuity with prior history).
  if (opts.anchor !== undefined) current = clampProb(0.7 * current + 0.3 * opts.anchor);

  const synthesisEstimate: AgentEstimate = {
    agent: "synthesis",
    estimate: pooled,
    rationale: "Log-odds pool of independent agent estimates.",
    rationaleRef: `rationale:${q.id}:synthesis`,
    weight: 0,
  };
  const extremizerEstimate: AgentEstimate = {
    agent: "extremizer",
    estimate: current,
    rationale:
      extremizeFactor > 1
        ? "Agents diverse + partially informed → sharpened aggregate."
        : "Insufficient diversity → no extremizing applied.",
    rationaleRef: `rationale:${q.id}:extremizer`,
    weight: 0,
  };

  const confidence = clampProb(0.5 + (0.25 - Math.min(spread, 0.25)) - rng() * 0.1);

  return {
    questionId: q.id,
    question: q.title,
    resolutionCriteria: q.resolutionCriteria,
    resolutionDate: q.resolutionDate,
    resolutionSource: q.resolutionSource,
    type: q.type,
    riskOrOpportunity: q.riskOrOpportunity,
    impact: q.impactEstimate,
    currentProbability: current,
    priorBaseRate: base,
    outsideView: `Comparison class historical frequency ≈ ${(base * 100).toFixed(0)}%.`,
    insideView: q.preciseDefinition,
    driversUp: driversFor(q, "up"),
    driversDown: driversFor(q, "down"),
    keyUncertainties: uncertaintiesFor(q),
    updateTriggers: triggersFor(q),
    alternativeScenarios: scenariosFor(),
    horizonSensitivity: {
      "3m": clampProb(current - 0.12 - rng() * 0.05),
      "6m": clampProb(current - 0.04),
      "12m": current,
    },
    confidenceInEstimateQuality: confidence,
    agentPanel: [...agentPanel, synthesisEstimate, extremizerEstimate],
    nextReviewDate: nextReview(q),
    scoringPlan: `Resolved against ${q.resolutionSource}; scored with Brier; baselines: no-change, base-rate, recent-trend, external market.`,
  };
}

function driversFor(q: ForecastQuestion, dir: "up" | "down"): string[] {
  const up = [
    "Recent leading indicators trending toward the event",
    "Incentives of key actors favor this outcome",
    "Structural/secular tailwinds in the comparison class",
  ];
  const down = [
    "Mitigations and controls already in place",
    "Historical base rate is lower than the inside view suggests",
    "Counter-pressures from regulators / competitors / counterparties",
  ];
  return (dir === "up" ? up : down).slice(0, q.riskOrOpportunity === "risk" ? 3 : 2);
}

function uncertaintiesFor(q: ForecastQuestion): string[] {
  return [
    `Reliability of the ${q.resolutionSource} signal`,
    "Possible regime change before resolution date",
    "Sparse comparison class → wide outside-view interval",
  ];
}

function triggersFor(q: ForecastQuestion): string[] {
  return [
    "New primary-source filing or official statement",
    "Material move in a watched market/nowcasting signal",
    `Internal ${q.owningTeam} status change or incident`,
  ];
}

function scenariosFor(): string[] {
  return [
    "Base case: gradual drift consistent with the outside view",
    "Tail case: low-probability / high-impact shock accelerates resolution",
    "Reversal case: mitigations succeed and probability decays",
  ];
}

function nextReview(q: ForecastQuestion): string {
  const d = new Date(q.openDate);
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}
