// Cyber forecast intelligence.
//
// Turns a question + its alerts + its history into the executive-legible
// artifacts the PRD calls for: a factor decomposition, a confidence label, a
// plain-English explanation, a recommended action, and the enterprise risk map.

import type { Confidence, ForecastQuestion, ImpactLevel, Outcome, ProbabilityPoint } from "./types";
import { alertsForQuestion, impactsForQuestion } from "./alerts";

export interface ForecastFactor {
  factor: string;
  /** Signed contribution in probability points (e.g. +0.08 = +8pp). */
  contribution: number;
}

/** Curated per-question intelligence. Falls back to generic derivations. */
interface CyberIntel {
  confidence: Confidence;
  structuralFactors: ForecastFactor[];
  recommendedAction: string;
}

const INTEL: Record<string, CyberIntel> = {
  "q-cyber-breach": {
    confidence: "medium",
    structuralFactors: [
      { factor: "External attack surface", contribution: 0.08 },
      { factor: "Known exploited vulnerability", contribution: 0.07 },
      { factor: "Delayed remediation", contribution: 0.04 },
      { factor: "Privileged identity exposure", contribution: 0.03 },
      { factor: "Strong endpoint coverage", contribution: -0.02 },
      { factor: "Active monitoring & response", contribution: -0.01 },
    ],
    recommendedAction:
      "Accelerate patching or isolate the exposed VPN appliance within 24 hours, and run a privileged-access review this week.",
  },
  "q-cyber-ransomware": {
    confidence: "medium",
    structuralFactors: [
      { factor: "Endpoint precursor detections", contribution: 0.05 },
      { factor: "Privileged host exposure", contribution: 0.03 },
      { factor: "Backup RTO exceeds target", contribution: 0.02 },
      { factor: "EDR coverage & isolation", contribution: -0.03 },
      { factor: "Tested recovery runbook", contribution: -0.02 },
    ],
    recommendedAction:
      "Contain the flagged admin endpoint, validate immutable-backup restore times, and hunt for lateral movement from privileged hosts.",
  },
  "q-cyber-phishing": {
    confidence: "medium",
    structuralFactors: [
      { factor: "Active campaign against finance", contribution: 0.04 },
      { factor: "Click-through events", contribution: 0.02 },
      { factor: "Payment dual-control", contribution: -0.03 },
      { factor: "Vendor bank-change verification", contribution: -0.02 },
    ],
    recommendedAction:
      "Reinforce payment verification for the AP team and push targeted anti-phishing training to finance users this week.",
  },
  "q-cyber-vendor": {
    confidence: "low",
    structuralFactors: [
      { factor: "Vendor incident disclosure", contribution: 0.05 },
      { factor: "Data-processor concentration", contribution: 0.03 },
      { factor: "Dark-web credential mention", contribution: 0.01 },
      { factor: "Contractual breach-notification SLAs", contribution: -0.02 },
    ],
    recommendedAction:
      "Open a vendor-incident inquiry with the disclosing SaaS provider and confirm what data of ours is in scope; pre-stage customer-notification templates.",
  },
  "q-cyber-iam": {
    confidence: "medium",
    structuralFactors: [
      { factor: "Impossible-travel on privileged account", contribution: 0.04 },
      { factor: "MFA-fatigue patterns", contribution: 0.02 },
      { factor: "Dormant admin accounts", contribution: 0.02 },
      { factor: "Phishing-resistant MFA coverage", contribution: -0.03 },
    ],
    recommendedAction:
      "Force re-authentication and session revocation for the flagged privileged account, and disable dormant admin accounts.",
  },
  "q-cyber-cloud": {
    confidence: "medium",
    structuralFactors: [
      { factor: "Publicly exposed storage bucket", contribution: 0.05 },
      { factor: "Over-permissioned automation identity", contribution: 0.02 },
      { factor: "CSPM coverage & auto-remediation", contribution: -0.02 },
    ],
    recommendedAction:
      "Revoke public access on the exposed bucket immediately and scope the toxic IAM combination on the CI/CD role.",
  },
  "q-cyber-ddos": {
    confidence: "medium",
    structuralFactors: [
      { factor: "Recent volumetric probing", contribution: 0.02 },
      { factor: "Mitigation-vendor renewal pending", contribution: 0.02 },
      { factor: "Always-on scrubbing", contribution: -0.03 },
    ],
    recommendedAction:
      "Confirm the DDoS mitigation contract renewal before it lapses and validate failover runbooks for the customer portal.",
  },
  "q-cyber-compliance": {
    confidence: "high",
    structuralFactors: [
      { factor: "Overdue SOC 2 control gaps", contribution: 0.04 },
      { factor: "Tight audit window", contribution: 0.02 },
      { factor: "Evidence-automation coverage", contribution: -0.02 },
    ],
    recommendedAction:
      "Prioritize remediation of the two overdue SOC 2 control gaps and confirm auditor evidence readiness this sprint.",
  },
  "q-cyber-zero-day": {
    confidence: "medium",
    structuralFactors: [
      { factor: "Internet-facing KEV vulns past SLA", contribution: 0.04 },
      { factor: "Exploit availability", contribution: 0.03 },
      { factor: "Virtual patching / WAF", contribution: -0.02 },
    ],
    recommendedAction:
      "Apply emergency patching or virtual patching to the three internet-facing KEV assets and shorten the critical remediation SLA.",
  },
  "q-cyber-zero-trust": {
    confidence: "medium",
    structuralFactors: [
      { factor: "Device-trust rollout progress", contribution: 0.06 },
      { factor: "Executive sponsorship", contribution: 0.02 },
      { factor: "Agent-compatibility slip", contribution: -0.03 },
    ],
    recommendedAction:
      "Resolve the agent-compatibility blocker on the final workload group to keep Phase 2 on schedule.",
  },
};

export function questionConfidence(questionId: string): Confidence {
  return INTEL[questionId]?.confidence ?? "medium";
}

/**
 * Factor decomposition: curated structural factors, augmented with the largest
 * recent alert-driven contributions so the breakdown reflects live evidence.
 */
export function forecastDecomposition(questionId: string): ForecastFactor[] {
  const intel = INTEL[questionId];
  if (intel) return intel.structuralFactors;

  // Generic fallback: derive from alert impacts.
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
 * Plain-English explanation of the latest movement, legible to a security
 * executive (no CVSS/EPSS jargon in the headline).
 */
export function explanationFor(
  question: ForecastQuestion,
  priorProbability: number,
  currentProbability: number
): string {
  const from = `${(priorProbability * 100).toFixed(0)}%`;
  const to = `${(currentProbability * 100).toFixed(0)}%`;
  const alerts = alertsForQuestion(question.id);
  const top = alerts.filter((a) => a.impact.direction === "increase").slice(0, 2);

  if (top.length === 0) {
    return `The probability is ${to}. No forecast-relevant alerts moved this question in the recent window; the estimate reflects the outside-view base rate and standing controls.`;
  }

  const primary = top[0];
  const secondary = top[1];
  const rose = currentProbability >= priorProbability;
  const lead =
    `The probability ${rose ? "increased" : "moved"} from ${from} to ${to} primarily because ` +
    lowerFirst(primary.alert.title) + ".";
  const detail = ` ${primary.impact.reason}`;
  const extra = secondary
    ? ` This was compounded by ${lowerFirst(secondary.alert.title)}, which ${lowerFirst(secondary.impact.reason)}`
    : "";
  return lead + detail + extra;
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

// --- Enterprise cyber risk map (failure-type landscape) ---

export interface FailureModeRow {
  failureMode: string;
  questionId?: string;
  probability: number;
  trend: Trend;
  impact: ImpactLevel;
  confidence: Confidence;
}

interface FailureModeDef {
  failureMode: string;
  questionId?: string;
  /** Static fallback used when no backing question is visible. */
  fallbackProbability: number;
  fallbackImpact: ImpactLevel;
  fallbackConfidence: Confidence;
}

const FAILURE_MODES: FailureModeDef[] = [
  { failureMode: "Ransomware", questionId: "q-cyber-ransomware", fallbackProbability: 0.19, fallbackImpact: "critical", fallbackConfidence: "medium" },
  { failureMode: "Credential compromise", questionId: "q-cyber-iam", fallbackProbability: 0.13, fallbackImpact: "high", fallbackConfidence: "high" },
  { failureMode: "Cloud data exposure", questionId: "q-cyber-cloud", fallbackProbability: 0.21, fallbackImpact: "critical", fallbackConfidence: "medium" },
  { failureMode: "Vendor breach", questionId: "q-cyber-vendor", fallbackProbability: 0.24, fallbackImpact: "high", fallbackConfidence: "low" },
  { failureMode: "DDoS outage", questionId: "q-cyber-ddos", fallbackProbability: 0.25, fallbackImpact: "medium", fallbackConfidence: "medium" },
  { failureMode: "Compliance miss", questionId: "q-cyber-compliance", fallbackProbability: 0.28, fallbackImpact: "medium", fallbackConfidence: "high" },
  { failureMode: "Insider misuse", questionId: undefined, fallbackProbability: 0.11, fallbackImpact: "high", fallbackConfidence: "low" },
];

/**
 * Build the enterprise cyber risk map. For failure modes backed by a visible
 * question, probability/trend/impact/confidence come from live data; otherwise
 * the curated fallback is used.
 */
export function enterpriseRiskMap(
  questions: ForecastQuestion[],
  yesOutcome: (id: string) => Outcome | undefined,
  historyFor: (outcomeId: string) => ProbabilityPoint[]
): FailureModeRow[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  return FAILURE_MODES.map((def) => {
    const q = def.questionId ? byId.get(def.questionId) : undefined;
    if (!q) {
      return {
        failureMode: def.failureMode,
        questionId: undefined,
        probability: def.fallbackProbability,
        trend: "flat" as Trend,
        impact: def.fallbackImpact,
        confidence: def.fallbackConfidence,
      };
    }
    const yes = yesOutcome(q.id);
    const p = yes?.currentProbability ?? q.priorBaseRate;
    const history = yes ? historyFor(yes.id) : [];
    return {
      failureMode: def.failureMode,
      questionId: q.id,
      probability: p,
      trend: trendFrom(history),
      impact: q.impactLevel,
      confidence: questionConfidence(q.id),
    };
  });
}

/**
 * Auto-generated executive summary paragraph for the Cybersecurity overview.
 * Grounded in the week's actual movers and peer position, written for a CISO.
 */
export function enterpriseSummary(opts: {
  netDirection: "increased" | "decreased" | "held steady";
  topDrivers: string[];
  elevatedCount: number;
  aboveMedianModes: string[];
  belowMedianModes: string[];
}): string {
  const { netDirection, topDrivers, elevatedCount, aboveMedianModes, belowMedianModes } = opts;

  let lead: string;
  if (netDirection === "held steady") {
    lead = "Enterprise cyber risk held roughly steady this week.";
  } else {
    lead = `Enterprise cyber risk ${netDirection} ${elevatedCount > 1 ? "modestly" : "slightly"} this week.`;
  }

  const drivers =
    topDrivers.length > 0
      ? ` The main drivers were ${joinList(topDrivers.map(lowerFirst))}.`
      : " No individual alert produced a material move.";

  let peer = "";
  if (aboveMedianModes.length > 0 || belowMedianModes.length > 0) {
    const above =
      aboveMedianModes.length > 0
        ? `above the industry median for ${joinList(aboveMedianModes.map((m) => m.toLowerCase()))}`
        : "";
    const below =
      belowMedianModes.length > 0
        ? `below median for ${joinList(belowMedianModes.map((m) => m.toLowerCase()))}`
        : "";
    peer = ` Peer exposure remains ${[above, below].filter(Boolean).join(" but ")}.`;
  }

  return lead + drivers + peer;
}

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
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
