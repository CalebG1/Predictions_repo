// Peer / industry benchmarking.
//
// Honesty principle: internal forecasts can be high-confidence because they use
// private telemetry. Peer and competitor estimates are built only from public,
// third-party, and externally observable signals, so they are labeled with
// lower confidence and always accompanied by the caveat below.

import type { Confidence } from "./types";

export const PEER_CAVEAT =
  "Peer and competitor estimates are based on public, third-party, and externally observable signals. They do not use private internal telemetry unless explicitly connected by that organization. Confidence may be lower than internal forecasts.";

/** Broad cyber failure modes used for the peer comparison matrix. */
export type FailureMode =
  | "Ransomware"
  | "Credential compromise"
  | "Cloud data exposure"
  | "Vendor breach"
  | "DDoS outage"
  | "Compliance miss"
  | "Insider misuse";

export type PeerSourceType =
  | "internal_telemetry"
  | "industry_baseline"
  | "peer_cohort"
  | "public_signal"
  | "third_party_rating";

/** Per-question benchmark against a defined peer cohort. */
export interface PeerBenchmark {
  questionId: string;
  cohort: string;
  ourCompany: number;
  industryMedian: number;
  topQuartile: number;
  bottomQuartile: number;
  /** Range for "similar companies" shown on the detail page. */
  similarLow: number;
  similarHigh: number;
  confidence: Confidence;
  sourceType: PeerSourceType;
  explanation: string;
}

const COHORT = "Large US B2B SaaS companies, 1k–5k employees";

export const peerBenchmarks: PeerBenchmark[] = [
  {
    questionId: "q-cyber-ransomware",
    cohort: COHORT,
    ourCompany: 0.19,
    industryMedian: 0.18,
    topQuartile: 0.09,
    bottomQuartile: 0.39,
    similarLow: 0.16,
    similarHigh: 0.28,
    confidence: "medium",
    sourceType: "peer_cohort",
    explanation:
      "Ransomware probability sits near the industry median. Endpoint coverage and backup maturity hold us below higher-risk peers, but recent precursor detections on privileged hosts keep it from reaching the top quartile.",
  },
  {
    questionId: "q-cyber-iam",
    cohort: COHORT,
    ourCompany: 0.13,
    industryMedian: 0.16,
    topQuartile: 0.07,
    bottomQuartile: 0.31,
    similarLow: 0.1,
    similarHigh: 0.2,
    confidence: "high",
    sourceType: "internal_telemetry",
    explanation:
      "Credential-compromise risk is below the median thanks to phishing-resistant MFA coverage, though impossible-travel and MFA-fatigue signals this week narrow the gap.",
  },
  {
    questionId: "q-cyber-cloud",
    cohort: COHORT,
    ourCompany: 0.21,
    industryMedian: 0.27,
    topQuartile: 0.13,
    bottomQuartile: 0.48,
    similarLow: 0.18,
    similarHigh: 0.34,
    confidence: "medium",
    sourceType: "public_signal",
    explanation:
      "Cloud data-exposure risk is below median overall, but an actively public storage bucket and over-permissioned automation identity are pulling the internal estimate upward this week.",
  },
  {
    questionId: "q-cyber-vendor",
    cohort: COHORT,
    ourCompany: 0.24,
    industryMedian: 0.34,
    topQuartile: 0.21,
    bottomQuartile: 0.58,
    similarLow: 0.2,
    similarHigh: 0.44,
    confidence: "low",
    sourceType: "third_party_rating",
    explanation:
      "Vendor-breach risk is below the median, but concentration in a small number of Tier-1 data processors — one of which just disclosed an incident — adds uncertainty. Confidence is low because it relies on external disclosures.",
  },
  {
    questionId: "q-cyber-breach",
    cohort: COHORT,
    ourCompany: 0.22,
    industryMedian: 0.2,
    topQuartile: 0.11,
    bottomQuartile: 0.42,
    similarLow: 0.17,
    similarHigh: 0.3,
    confidence: "medium",
    sourceType: "peer_cohort",
    explanation:
      "Material-incident probability is slightly above the median, driven by an exploited internet-facing exposure and overdue remediation. Mature detection and response capabilities keep it below the bottom quartile.",
  },
  {
    questionId: "q-cyber-ddos",
    cohort: COHORT,
    ourCompany: 0.25,
    industryMedian: 0.22,
    topQuartile: 0.12,
    bottomQuartile: 0.4,
    similarLow: 0.18,
    similarHigh: 0.32,
    confidence: "medium",
    sourceType: "industry_baseline",
    explanation:
      "DDoS-outage risk is a touch above median. Always-on scrubbing helps, but a recent volumetric probe and a pending mitigation-vendor renewal add near-term uncertainty.",
  },
  {
    questionId: "q-cyber-compliance",
    cohort: COHORT,
    ourCompany: 0.28,
    industryMedian: 0.19,
    topQuartile: 0.08,
    bottomQuartile: 0.31,
    similarLow: 0.15,
    similarHigh: 0.3,
    confidence: "high",
    sourceType: "internal_telemetry",
    explanation:
      "Compliance-miss risk is above the median because two SOC 2 control gaps are overdue with a tight audit window. This is high-confidence: it is measured directly from our own GRC tracker.",
  },
  {
    questionId: "q-cyber-phishing",
    cohort: COHORT,
    ourCompany: 0.14,
    industryMedian: 0.17,
    topQuartile: 0.08,
    bottomQuartile: 0.33,
    similarLow: 0.11,
    similarHigh: 0.22,
    confidence: "medium",
    sourceType: "peer_cohort",
    explanation:
      "BEC/wire-fraud risk is below median due to payment dual-control and vendor bank-change verification, though an active campaign against finance users is applying upward pressure.",
  },
  {
    questionId: "q-cyber-zero-day",
    cohort: COHORT,
    ourCompany: 0.17,
    industryMedian: 0.15,
    topQuartile: 0.07,
    bottomQuartile: 0.34,
    similarLow: 0.12,
    similarHigh: 0.24,
    confidence: "medium",
    sourceType: "public_signal",
    explanation:
      "Exploited-CVE risk is slightly above median because several internet-facing KEV vulnerabilities remain past SLA. Faster patch cadence would move us toward the top quartile.",
  },
];

const byQuestion = new Map(peerBenchmarks.map((b) => [b.questionId, b]));

export function peerBenchmarkFor(questionId: string): PeerBenchmark | undefined {
  return byQuestion.get(questionId);
}

export const PEER_SOURCE_LABEL: Record<PeerSourceType, string> = {
  internal_telemetry: "Internal telemetry",
  industry_baseline: "Industry baseline",
  peer_cohort: "Peer cohort estimate",
  public_signal: "Public-signal estimate",
  third_party_rating: "Third-party risk score",
};

export interface PeerMatrixRow {
  label: string;
  values: Partial<Record<FailureMode, number>>;
  confidence: Confidence;
}

/** Question ids that back each failure-mode column in the peer matrix. */
export const FAILURE_MODE_QUESTION: Record<FailureMode, string | undefined> = {
  Ransomware: "q-cyber-ransomware",
  "Credential compromise": "q-cyber-iam",
  "Cloud data exposure": "q-cyber-cloud",
  "Vendor breach": "q-cyber-vendor",
  "DDoS outage": "q-cyber-ddos",
  "Compliance miss": "q-cyber-compliance",
  "Insider misuse": undefined,
};

export const PEER_MATRIX_MODES: FailureMode[] = [
  "Ransomware",
  "Cloud data exposure",
  "Vendor breach",
  "Compliance miss",
];

/**
 * Build the peer comparison matrix (our company + cohort rows) for a set of
 * visible questions. Rows the company can't see are simply omitted from that
 * column so private lines never leak into shared benchmarks.
 */
export function peerMatrix(visibleQuestionIds: Set<string>): PeerMatrixRow[] {
  const modeValue = (
    pick: (b: PeerBenchmark) => number
  ): Partial<Record<FailureMode, number>> => {
    const values: Partial<Record<FailureMode, number>> = {};
    for (const mode of PEER_MATRIX_MODES) {
      const qid = FAILURE_MODE_QUESTION[mode];
      if (!qid || !visibleQuestionIds.has(qid)) continue;
      const b = byQuestion.get(qid);
      if (b) values[mode] = pick(b);
    }
    return values;
  };

  return [
    { label: "Our company", values: modeValue((b) => b.ourCompany), confidence: "high" },
    { label: "Industry median", values: modeValue((b) => b.industryMedian), confidence: "medium" },
    { label: "Top quartile", values: modeValue((b) => b.topQuartile), confidence: "medium" },
    { label: "Bottom quartile", values: modeValue((b) => b.bottomQuartile), confidence: "medium" },
  ];
}
