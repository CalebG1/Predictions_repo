// Risk by security domain — PRD §6.3.B.
// Maps PRD security domains to backing forecast questions and live alert signals.

import type { ForecastQuestion, Outcome, ProbabilityPoint } from "./types";
import { alertsForQuestion } from "./alerts";
import { peerBenchmarkFor } from "./peers";
import { questionConfidence } from "./cyberForecast";

export type SecurityDomain =
  | "Identity"
  | "Endpoint"
  | "Cloud"
  | "Network"
  | "Email"
  | "Application security"
  | "Data security"
  | "Vendor risk"
  | "Compliance"
  | "Incident response readiness";

export const SECURITY_DOMAINS: SecurityDomain[] = [
  "Identity",
  "Endpoint",
  "Cloud",
  "Network",
  "Email",
  "Application security",
  "Data security",
  "Vendor risk",
  "Compliance",
  "Incident response readiness",
];

interface DomainDef {
  domain: SecurityDomain;
  questionId?: string;
  /** Static fallback when question not visible. */
  fallbackProbability: number;
  fallbackRemediation: number;
  fallbackControlCoverage: number;
}

const DOMAIN_DEFS: DomainDef[] = [
  { domain: "Identity", questionId: "q-cyber-iam", fallbackProbability: 0.13, fallbackRemediation: 2, fallbackControlCoverage: 78 },
  { domain: "Endpoint", questionId: "q-cyber-ransomware", fallbackProbability: 0.19, fallbackRemediation: 4, fallbackControlCoverage: 82 },
  { domain: "Cloud", questionId: "q-cyber-cloud", fallbackProbability: 0.21, fallbackRemediation: 3, fallbackControlCoverage: 71 },
  { domain: "Network", questionId: "q-cyber-ddos", fallbackProbability: 0.25, fallbackRemediation: 1, fallbackControlCoverage: 85 },
  { domain: "Email", questionId: "q-cyber-phishing", fallbackProbability: 0.14, fallbackRemediation: 2, fallbackControlCoverage: 76 },
  { domain: "Application security", questionId: "q-cyber-zero-day", fallbackProbability: 0.17, fallbackRemediation: 12, fallbackControlCoverage: 68 },
  { domain: "Data security", questionId: "q-cyber-breach", fallbackProbability: 0.22, fallbackRemediation: 3, fallbackControlCoverage: 74 },
  { domain: "Vendor risk", questionId: "q-cyber-vendor", fallbackProbability: 0.24, fallbackRemediation: 2, fallbackControlCoverage: 65 },
  { domain: "Compliance", questionId: "q-cyber-compliance", fallbackProbability: 0.28, fallbackRemediation: 3, fallbackControlCoverage: 72 },
  { domain: "Incident response readiness", questionId: "q-cyber-zero-trust", fallbackProbability: 0.48, fallbackRemediation: 1, fallbackControlCoverage: 80 },
];

/** Map forecast question id → security domain (for filters). */
export const QUESTION_TO_DOMAIN: Record<string, SecurityDomain> = Object.fromEntries(
  DOMAIN_DEFS.filter((d) => d.questionId).map((d) => [d.questionId!, d.domain])
) as Record<string, SecurityDomain>;

export type PeerPosition = "above" | "at" | "below";

export interface SecurityDomainRow {
  domain: SecurityDomain;
  questionId?: string;
  /** Composite 0–100 risk score (probability × impact weighting). */
  riskScore: number;
  failureProbability: number;
  topAlerts: string[];
  openRemediation: number;
  peerComparison: PeerPosition;
  controlCoverage: number;
  confidence: ReturnType<typeof questionConfidence>;
}

function peerPosition(questionId: string, ourProb: number): PeerPosition {
  const b = peerBenchmarkFor(questionId);
  if (!b) return "at";
  const diff = ourProb - b.industryMedian;
  if (diff > 0.02) return "above";
  if (diff < -0.02) return "below";
  return "at";
}

export function securityDomainRows(
  questions: ForecastQuestion[],
  yesOutcome: (id: string) => Outcome | undefined,
  _historyFor: (outcomeId: string) => ProbabilityPoint[]
): SecurityDomainRow[] {
  const byId = new Map(questions.map((q) => [q.id, q]));

  return DOMAIN_DEFS.map((def) => {
    const q = def.questionId ? byId.get(def.questionId) : undefined;
    const prob = q
      ? (yesOutcome(q.id)?.currentProbability ?? q.priorBaseRate)
      : def.fallbackProbability;
    const impact = q?.impactScore ?? 0.7;
    const riskScore = Math.round(prob * impact * 100);

    const topAlerts = def.questionId
      ? alertsForQuestion(def.questionId)
          .slice(0, 2)
          .map((a) => a.alert.title)
      : [];

    const openRemediation = def.questionId
      ? alertsForQuestion(def.questionId).filter(
          (a) => a.alert.status === "open" || a.alert.status === "investigating"
        ).length
      : def.fallbackRemediation;

    return {
      domain: def.domain,
      questionId: q?.id,
      riskScore,
      failureProbability: prob,
      topAlerts,
      openRemediation,
      peerComparison: def.questionId ? peerPosition(def.questionId, prob) : "at",
      controlCoverage: def.fallbackControlCoverage,
      confidence: def.questionId ? questionConfidence(def.questionId) : "medium",
    };
  });
}

export const PEER_POSITION_LABEL: Record<PeerPosition, string> = {
  above: "Above median",
  at: "At median",
  below: "Below median",
};
