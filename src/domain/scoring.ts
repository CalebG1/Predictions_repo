// Pure, dependency-free scoring + aggregation math.
// Everything here is unit-tested (see scoring.test.ts) because this is the
// trust layer of the product: probabilities must be scored with proper scoring
// rules and aggregated coherently.

import type { CalibrationBin } from "./types";

/** Clamp a probability away from 0/1 — we never assign 0%/100% to contingent events. */
export function clampProb(p: number, eps = 1e-6): number {
  return Math.min(1 - eps, Math.max(eps, p));
}

/** Brier score for a single binary forecast. outcome ∈ {0,1}. Lower is better. */
export function brierBinary(p: number, outcome: 0 | 1): number {
  return (p - outcome) ** 2;
}

/**
 * Multi-class Brier score: sum over outcomes of (p_i - o_i)^2.
 * `probs` must sum to ~1; `outcomeIndex` is the index that actually occurred.
 */
export function brierMulticlass(probs: number[], outcomeIndex: number): number {
  return probs.reduce((acc, p, i) => acc + (p - (i === outcomeIndex ? 1 : 0)) ** 2, 0);
}

/** Mean Brier across many binary forecasts. */
export function meanBrier(forecasts: { p: number; outcome: 0 | 1 }[]): number {
  if (forecasts.length === 0) return 0;
  return forecasts.reduce((acc, f) => acc + brierBinary(f.p, f.outcome), 0) / forecasts.length;
}

export function logit(p: number): number {
  const c = clampProb(p);
  return Math.log(c / (1 - c));
}

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Log-odds (a.k.a. logistic-opinion-pool) averaging of independent estimates.
 * This is the synthesis agent's aggregator: average in logit space, optionally
 * weighted, then map back to probability space.
 */
export function logOddsAverage(estimates: number[], weights?: number[]): number {
  if (estimates.length === 0) return 0.5;
  const w = weights ?? estimates.map(() => 1);
  const totalW = w.reduce((a, b) => a + b, 0) || 1;
  const meanLogit = estimates.reduce((acc, p, i) => acc + (w[i] / totalW) * logit(p), 0);
  return clampProb(sigmoid(meanLogit));
}

/**
 * Extremize an aggregate by scaling the pooled log-odds by `a` (> 1 sharpens).
 * Only justified when contributing agents are diverse + partially informed.
 */
export function extremize(p: number, a = 1.0): number {
  return clampProb(sigmoid(a * logit(p)));
}

/**
 * Build calibration bins for a reliability diagram.
 * @param data predicted probability + observed outcome (0/1) pairs.
 * @param nBins number of equal-width buckets across [0,1].
 */
export function calibrationBins(
  data: { p: number; outcome: 0 | 1 }[],
  nBins = 10
): CalibrationBin[] {
  const bins: { sumP: number; sumO: number; count: number }[] = Array.from(
    { length: nBins },
    () => ({ sumP: 0, sumO: 0, count: 0 })
  );
  for (const { p, outcome } of data) {
    let idx = Math.floor(p * nBins);
    if (idx >= nBins) idx = nBins - 1;
    if (idx < 0) idx = 0;
    bins[idx].sumP += p;
    bins[idx].sumO += outcome;
    bins[idx].count += 1;
  }
  return bins.map((b, i) => ({
    bucket: (i + 0.5) / nBins,
    predictedMean: b.count ? b.sumP / b.count : (i + 0.5) / nBins,
    observedFrequency: b.count ? b.sumO / b.count : 0,
    count: b.count,
  }));
}

/**
 * RMS calibration error: sqrt of the count-weighted mean squared gap between
 * predicted mean and observed frequency across non-empty bins.
 */
export function rmsCalibrationError(bins: CalibrationBin[]): number {
  const used = bins.filter((b) => b.count > 0);
  const totalN = used.reduce((a, b) => a + b.count, 0);
  if (totalN === 0) return 0;
  const weighted = used.reduce(
    (acc, b) => acc + b.count * (b.predictedMean - b.observedFrequency) ** 2,
    0
  );
  return Math.sqrt(weighted / totalN);
}

/**
 * Murphy decomposition pieces: calibration (reliability) and sharpness (resolution).
 * Returns reliability (lower better) and resolution (higher better) terms.
 */
export function calibrationVsSharpness(data: { p: number; outcome: 0 | 1 }[], nBins = 10) {
  const bins = calibrationBins(data, nBins).filter((b) => b.count > 0);
  const n = data.length || 1;
  const baseRate = data.reduce((a, d) => a + d.outcome, 0) / n;
  const reliability =
    bins.reduce((acc, b) => acc + b.count * (b.predictedMean - b.observedFrequency) ** 2, 0) / n;
  const resolution =
    bins.reduce((acc, b) => acc + b.count * (b.observedFrequency - baseRate) ** 2, 0) / n;
  const uncertainty = baseRate * (1 - baseRate);
  return { reliability, resolution, uncertainty, baseRate };
}

/** Probability-coherence check: mutually-exclusive outcomes should sum to ~1. */
export function isCoherent(probs: number[], tol = 0.02): boolean {
  const sum = probs.reduce((a, b) => a + b, 0);
  return Math.abs(sum - 1) <= tol;
}

/** Normalize a set of probabilities so they sum to 1 (coherence repair). */
export function normalize(probs: number[]): number[] {
  const sum = probs.reduce((a, b) => a + b, 0);
  if (sum === 0) return probs.map(() => 1 / probs.length);
  return probs.map((p) => p / sum);
}

/** Bayesian update of a prior probability given a likelihood ratio. */
export function bayesUpdate(prior: number, likelihoodRatio: number): number {
  const priorOdds = clampProb(prior) / (1 - clampProb(prior));
  const posteriorOdds = priorOdds * likelihoodRatio;
  return clampProb(posteriorOdds / (1 + posteriorOdds));
}
