// Monte Carlo scenario simulator for candidate sites.
//
// Samples the uncertain inputs of a site's underwriting — distance-decay
// behavior, demographic growth, competitor entry, rent/cost inflation — and
// produces a full outcome distribution instead of a point estimate.
// P(hit target) is read directly off the distribution. Deterministic given a
// seed, so results are reproducible and unit-testable.

import type { CandidateSite } from "./siteSelection";
import {
  AVG_ANNUAL_SPEND,
  DEFAULT_BETA,
  candidateSites,
  demandGrid,
  gravitySitesFrom,
} from "./siteSelection";
import { captureBySite, type GravitySite } from "./tradeArea";
import { targetRevenueM } from "./siteEngine";

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

/** Approximate standard normal via sum of uniforms (Irwin–Hall, n=6). */
function gaussian(rng: () => number): number {
  let s = 0;
  for (let i = 0; i < 6; i++) s += rng();
  return (s - 3) / Math.sqrt(0.5);
}

export interface ScenarioParams {
  /** A new same-category competitor opens near the site during year 1. */
  competitorEntry: boolean;
  /** Trade-area population/spend growth, -10..+10 (%). */
  demographicGrowthPct: number;
  /** Rent/cost inflation vs. underwriting, 0..15 (%). Raises the effective target. */
  costInflationPct: number;
  /** Huff distance-decay exponent center (sampled around this). */
  beta?: number;
}

export const DEFAULT_SCENARIO: ScenarioParams = {
  competitorEntry: false,
  demographicGrowthPct: 0,
  costInflationPct: 0,
  beta: DEFAULT_BETA,
};

export interface HistogramBin {
  binStart: number;
  binEnd: number;
  count: number;
}

export interface ScenarioResult {
  /** Sampled outcome values (retail: year-1 revenue $M; industrial: % of target attained x 100). */
  samples: number[];
  /** The (inflation-adjusted) bar a sample must clear. */
  effectiveTarget: number;
  pHitTarget: number;
  mean: number;
  p10: number;
  p50: number;
  p90: number;
  histogram: HistogramBin[];
  unit: string;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)));
  return sorted[idx];
}

function buildHistogram(samples: number[], nBins = 24): HistogramBin[] {
  if (samples.length === 0) return [];
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const span = max - min || 1;
  const bins: HistogramBin[] = Array.from({ length: nBins }, (_, i) => ({
    binStart: min + (span * i) / nBins,
    binEnd: min + (span * (i + 1)) / nBins,
    count: 0,
  }));
  for (const s of samples) {
    let idx = Math.floor(((s - min) / span) * nBins);
    if (idx >= nBins) idx = nBins - 1;
    bins[idx].count += 1;
  }
  return bins;
}

function summarize(samples: number[], effectiveTarget: number, unit: string): ScenarioResult {
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((a, b) => a + b, 0) / (samples.length || 1);
  const hits = samples.filter((s) => s >= effectiveTarget).length;
  return {
    samples,
    effectiveTarget,
    pHitTarget: samples.length ? hits / samples.length : 0,
    mean,
    p10: quantile(sorted, 0.1),
    p50: quantile(sorted, 0.5),
    p90: quantile(sorted, 0.9),
    histogram: buildHistogram(samples),
    unit,
  };
}

/**
 * Retail path: gravity capture -> revenue, sampling beta, demographic growth,
 * capture noise, and optional competitor entry (a synthetic entrant placed
 * just inside the candidate's catchment).
 */
function simulateRetail(
  site: CandidateSite,
  params: ScenarioParams,
  runs: number,
  rng: () => number
): ScenarioResult {
  const target = targetRevenueM(site) ?? 2.0;
  const effectiveTarget = target * (1 + params.costInflationPct / 100);
  const baseSites = gravitySitesFrom(candidateSites);
  const betaCenter = params.beta ?? DEFAULT_BETA;

  const competitor: GravitySite = {
    id: "__scenario-competitor",
    x: site.x + 0.04,
    y: site.y - 0.03,
    attractiveness: site.attractiveness * 0.9,
  };

  const samples: number[] = [];
  for (let i = 0; i < runs; i++) {
    const beta = Math.max(1.2, betaCenter + gaussian(rng) * 0.25);
    const growth = params.demographicGrowthPct / 100 + gaussian(rng) * 0.015;
    const sites = params.competitorEntry ? [...baseSites, competitor] : baseSites;
    const capture = captureBySite(sites, demandGrid, beta)[site.id] ?? 0;
    const executionNoise = 1 + gaussian(rng) * 0.09;
    const revenueM =
      ((capture * (1 + growth) * AVG_ANNUAL_SPEND) / 1_000_000) * executionNoise;
    samples.push(Math.max(0, revenueM));
  }
  return summarize(samples, effectiveTarget, "$M year-1 revenue");
}

/**
 * Industrial path: a factor model on % of target attained (utilization,
 * staffing, entitlement progress). Demographic growth proxies labor-pool
 * growth; competitor entry proxies competing supply bidding up labor/tenants;
 * cost inflation erodes the economics behind the target.
 */
function simulateIndustrial(
  params: ScenarioParams,
  runs: number,
  rng: () => number
): ScenarioResult {
  const effectiveTarget = 100 * (1 + params.costInflationPct / 200);
  const samples: number[] = [];
  for (let i = 0; i < runs; i++) {
    const laborTerm = params.demographicGrowthPct * 1.4;
    const supplyTerm = params.competitorEntry ? -9 : 0;
    const noise = gaussian(rng) * 12;
    const attained = 102 + laborTerm + supplyTerm - params.costInflationPct * 0.6 + noise;
    samples.push(Math.max(0, attained));
  }
  return summarize(samples, effectiveTarget, "% of target attained");
}

/**
 * Simulate a candidate site under a scenario. Deterministic for a given
 * (site, params, runs) triple.
 */
export function simulateSite(
  site: CandidateSite,
  params: ScenarioParams = DEFAULT_SCENARIO,
  runs = 600
): ScenarioResult {
  const seed =
    site.id +
    `|c${params.competitorEntry ? 1 : 0}` +
    `|g${params.demographicGrowthPct}` +
    `|r${params.costInflationPct}` +
    `|b${params.beta ?? DEFAULT_BETA}` +
    `|n${runs}`;
  const rng = seeded(seed);
  return site.assetClass === "retail"
    ? simulateRetail(site, params, runs, rng)
    : simulateIndustrial(params, runs, rng);
}
