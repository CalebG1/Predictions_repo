// Site-selection wrapper around the multi-agent forecasting engine.
//
// Same "dragonfly eye" structure as engine.ts — each agent produces an
// INDEPENDENT estimate before synthesis, pooled via log-odds, extremized only
// when diverse — but the agent panel is real-estate specific and the
// trade-area agent's estimate is seeded from the actual Huff gravity model
// output rather than a generic bias.

import { clampProb, extremize, logOddsAverage } from "./scoring";
import type { AgentEstimate, AgentRole, ForecastObject, ForecastQuestion } from "./types";
import type { CandidateSite } from "./siteSelection";
import {
  AVG_ANNUAL_SPEND,
  DEFAULT_BETA,
  candidateSites,
  demandGrid,
  gravitySitesFrom,
} from "./siteSelection";
import { captureBySite } from "./tradeArea";
import { impactsForQuestion } from "./siteSignals";

// Deterministic pseudo-random in [0,1) from a string seed (same as engine.ts).
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

/** Parse the leading dollar amount (in $M) out of a target metric string. */
export function targetRevenueM(site: CandidateSite): number | null {
  const m = site.targetMetric.match(/\$([\d.]+)M/);
  return m ? Number(m[1]) : null;
}

/**
 * Gravity-implied first-year revenue for a retail site ($M): expected
 * customer capture x average annual spend, against all retail sites (own
 * portfolio candidates compete too — that is the cannibalization reality).
 */
export function gravityRevenueM(site: CandidateSite, beta = DEFAULT_BETA): number | null {
  if (site.assetClass !== "retail") return null;
  const sites = gravitySitesFrom(candidateSites);
  const capture = captureBySite(sites, demandGrid, beta);
  const customers = capture[site.id];
  if (customers === undefined) return null;
  return (customers * AVG_ANNUAL_SPEND) / 1_000_000;
}

/**
 * Trade-area agent estimate: gravity-implied revenue relative to the
 * underwriting target, mapped through a smooth logistic so a site 20% over
 * target lands high (but never certain) and 20% under lands low.
 */
export function tradeAreaEstimate(site: CandidateSite, beta = DEFAULT_BETA): number | null {
  const target = targetRevenueM(site);
  const implied = gravityRevenueM(site, beta);
  if (target === null || implied === null || target === 0) return null;
  const ratio = implied / target;
  return clampProb(1 / (1 + Math.exp(-6 * (ratio - 1))));
}

interface SiteAgentDef {
  role: AgentRole;
  weight: number;
  bias: number;
  rationale: string;
  /** Restrict an agent to one asset class (undefined = both). */
  assetClass?: CandidateSite["assetClass"];
}

const SITE_AGENTS: SiteAgentDef[] = [
  { role: "base-rate", weight: 1.2, bias: 0, rationale: "Anchored on comparison-class frequency: first-year target hit rate for similar openings." },
  { role: "demographics", weight: 0.9, bias: 0.03, rationale: "Trade-area population, income, and growth trajectory vs. underwriting assumptions." },
  { role: "competition", weight: 0.9, bias: -0.04, rationale: "Competitor density, announced entries/exits, and cannibalization from own portfolio." },
  { role: "regulatory", weight: 0.8, bias: -0.02, rationale: "Permitting, zoning, and entitlement path relative to the committed calendar.", assetClass: "industrial" },
  { role: "red-team", weight: 0.7, bias: -0.1, rationale: "Strongest case against the lead view (comp misses, seasonality, execution risk)." },
  { role: "bayesian-updater", weight: 1.0, bias: 0, rationale: "Likelihood-weighted update on the recent market-signal evidence." },
];

export interface SiteRunOptions {
  /** Pull the aggregate toward this when provided (continuity with history). */
  anchor?: number;
  trigger?: string;
  beta?: number;
}

/**
 * Run the site forecast: real-estate agent panel (trade-area agent seeded from
 * the gravity model for retail), pooled via log-odds, extremized when diverse.
 */
export function runSiteForecast(
  q: ForecastQuestion,
  site: CandidateSite,
  opts: SiteRunOptions = {}
): ForecastObject {
  const rng = seeded(q.id + (opts.trigger ?? "scheduled"));
  const base = clampProb(q.priorBaseRate);
  const beta = opts.beta ?? DEFAULT_BETA;

  // Net signal pressure feeds the bayesian-updater's independent estimate.
  const signalDelta = impactsForQuestion(q.id).reduce((a, i) => a + i.probabilityDelta, 0);

  const agentPanel: AgentEstimate[] = [];

  const gravityP = tradeAreaEstimate(site, beta);
  if (gravityP !== null) {
    agentPanel.push({
      agent: "trade-area",
      estimate: gravityP,
      rationale: "Huff gravity model: expected trade-area capture vs. the underwriting target.",
      rationaleRef: `rationale:${q.id}:trade-area`,
      weight: 1.3,
    });
  }

  for (const a of SITE_AGENTS) {
    if (a.assetClass && a.assetClass !== site.assetClass) continue;
    const noise = (rng() - 0.5) * 0.16;
    const signalTerm = a.role === "bayesian-updater" ? signalDelta * 2 : 0;
    agentPanel.push({
      agent: a.role,
      estimate: clampProb(base + a.bias + signalTerm + noise),
      rationale: a.rationale,
      rationaleRef: `rationale:${q.id}:${a.role}`,
      weight: a.weight,
    });
  }

  const estimates = agentPanel.map((a) => a.estimate);
  const weights = agentPanel.map((a) => a.weight);
  const pooled = logOddsAverage(estimates, weights);

  const spread = Math.max(...estimates) - Math.min(...estimates);
  const extremizeFactor = spread > 0.25 ? 1.15 : 1.0;
  let current = extremize(pooled, extremizeFactor);
  if (opts.anchor !== undefined) current = clampProb(0.7 * current + 0.3 * opts.anchor);

  agentPanel.push(
    {
      agent: "synthesis",
      estimate: pooled,
      rationale: "Log-odds pool of independent agent estimates.",
      rationaleRef: `rationale:${q.id}:synthesis`,
      weight: 0,
    },
    {
      agent: "extremizer",
      estimate: current,
      rationale:
        extremizeFactor > 1
          ? "Agents diverse + partially informed → sharpened aggregate."
          : "Insufficient diversity → no extremizing applied.",
      rationaleRef: `rationale:${q.id}:extremizer`,
      weight: 0,
    }
  );

  const confidence = clampProb(0.5 + (0.25 - Math.min(spread, 0.25)) - rng() * 0.1);

  const isRetail = site.assetClass === "retail";
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
    outsideView: `Comparison-class hit rate for similar ${isRetail ? "retail openings" : "industrial projects"} ≈ ${(base * 100).toFixed(0)}%.`,
    insideView: q.preciseDefinition,
    driversUp: isRetail
      ? ["Trade-area capture above plan", "Complementary co-tenancy / anchor traffic", "Competitor exits releasing demand"]
      : ["Supportive staff report / entitlement path", "Pre-leasing momentum", "Transit and labor-catchment expansion"],
    driversDown: isRetail
      ? ["Competitor entries inside the catchment", "Cannibalization of own operating sites", "Access disruption or rent escalation"]
      : ["Neighborhood opposition and hearing delays", "Competing supply deliveries", "Labor-market tightening"],
    keyUncertainties: [
      "Distance-decay behavior of the local customer base",
      "Timing of announced competitor moves",
      `Reliability of the ${q.resolutionSource} signal`,
    ],
    updateTriggers: [
      "New permit / zoning docket activity in the submarket",
      "Census or traffic-count refresh",
      "Comps feed or broker-intel update",
    ],
    alternativeScenarios: [
      "Base case: capture consistent with the gravity model",
      "Tail case: competitor entry compresses the trade area",
      "Upside case: anchor/co-tenancy outperformance",
    ],
    horizonSensitivity: {
      "3m": clampProb(current - 0.1 - rng() * 0.05),
      "6m": clampProb(current - 0.04),
      "12m": current,
    },
    confidenceInEstimateQuality: confidence,
    agentPanel,
    nextReviewDate: nextReview(q),
    scoringPlan: `Resolved against ${q.resolutionSource}; scored with Brier; baselines: no-change, base-rate, recent-trend.`,
  };
}

function nextReview(q: ForecastQuestion): string {
  const d = new Date(q.openDate);
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}
