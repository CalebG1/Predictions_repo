import type { ForecastQuestion, Outcome, ProbabilityPoint, TouchpointSignal } from "./types";

function riskWeighted(q: ForecastQuestion, p: number): number {
  return p * q.impactScore;
}

export type ThreatVector =
  | "Ransomware"
  | "Phishing/Social Engineering"
  | "Insider Threat"
  | "Third-Party/Vendor"
  | "Cloud/IaC Misconfig"
  | "Identity/IAM"
  | "Data Exfiltration"
  | "DDoS/Availability"
  | "Regulatory/Compliance"
  | "Zero-Day/Exploit"
  | "Supply Chain";

export const CYBER_THREAT_VECTORS: ThreatVector[] = [
  "Ransomware",
  "Phishing/Social Engineering",
  "Insider Threat",
  "Third-Party/Vendor",
  "Cloud/IaC Misconfig",
  "Identity/IAM",
  "Data Exfiltration",
  "DDoS/Availability",
  "Regulatory/Compliance",
  "Zero-Day/Exploit",
  "Supply Chain",
];

export const questionThreatVectors: Record<string, ThreatVector[]> = {
  "q-cyber-breach": ["Data Exfiltration"],
  "q-cyber-ransomware": ["Ransomware"],
  "q-cyber-phishing": ["Phishing/Social Engineering"],
  "q-cyber-vendor": ["Third-Party/Vendor"],
  "q-cyber-iam": ["Identity/IAM"],
  "q-cyber-cloud": ["Cloud/IaC Misconfig"],
  "q-cyber-ddos": ["DDoS/Availability"],
  "q-cyber-compliance": ["Regulatory/Compliance"],
  "q-cyber-zero-day": ["Zero-Day/Exploit"],
  "q-cyber-zero-trust": ["Identity/IAM"],
};

export function cyberQuestions(questions: ForecastQuestion[]): ForecastQuestion[] {
  return questions.filter((q) => q.category === "Security/Cyber" && q.status === "open");
}

export interface CyberExposureMetrics {
  aggregateExposure: number;
  elevatedCount: number;
  highestPriority: { question: ForecastQuestion; riskWeight: number; probability: number } | null;
  resolvingSoonCount: number;
  activeForecasts: number;
}

function probabilityDelta(history: ProbabilityPoint[], days: number): number | null {
  if (history.length === 0) return null;
  const latest = history[history.length - 1];
  const cutoff = new Date(latest.timestamp);
  cutoff.setDate(cutoff.getDate() - days);
  const past = [...history].reverse().find((h) => new Date(h.timestamp) <= cutoff);
  if (!past) return null;
  return latest.probability - past.probability;
}

function withinDays(dateStr: string, days: number): boolean {
  const target = new Date(dateStr);
  const now = new Date();
  const limit = new Date(now);
  limit.setDate(limit.getDate() + days);
  return target >= now && target <= limit;
}

export function cyberExposure(
  questions: ForecastQuestion[],
  yesOutcome: (id: string) => Outcome | undefined,
  historyFor: (outcomeId: string) => ProbabilityPoint[]
): CyberExposureMetrics {
  const cyber = cyberQuestions(questions);
  const risks = cyber.filter((q) => q.riskOrOpportunity === "risk");

  let aggregateExposure = 0;
  let elevatedCount = 0;
  let highestPriority: CyberExposureMetrics["highestPriority"] = null;
  let resolvingSoonCount = 0;

  for (const q of risks) {
    const yes = yesOutcome(q.id);
    const p = yes?.currentProbability ?? q.priorBaseRate;
    const rw = riskWeighted(q, p);
    aggregateExposure += rw;

    if (withinDays(q.resolutionDate, 30)) resolvingSoonCount++;

    const h = yes ? historyFor(yes.id) : [];
    const d7 = probabilityDelta(h, 7);
    if (d7 !== null && d7 > 0.03) elevatedCount++;

    if (!highestPriority || rw > highestPriority.riskWeight) {
      highestPriority = { question: q, riskWeight: rw, probability: p };
    }
  }

  return {
    aggregateExposure,
    elevatedCount,
    highestPriority,
    resolvingSoonCount,
    activeForecasts: cyber.length,
  };
}

export interface CyberMoverRow {
  qid: string;
  title: string;
  date: string;
  from: number;
  to: number;
  trigger: string;
  source: string;
}

export function cyberMovers(
  questions: ForecastQuestion[],
  yesOutcome: (id: string) => Outcome | undefined,
  historyFor: (outcomeId: string) => ProbabilityPoint[],
  limit = 10
): CyberMoverRow[] {
  const rows: CyberMoverRow[] = [];
  for (const q of cyberQuestions(questions)) {
    const yes = yesOutcome(q.id);
    if (!yes) continue;
    const h = historyFor(yes.id);
    for (let i = 1; i < h.length; i++) {
      rows.push({
        qid: q.id,
        title: q.title,
        date: h[i].timestamp,
        from: h[i - 1].probability,
        to: h[i].probability,
        trigger: h[i].updateTrigger,
        source: h[i].source,
      });
    }
  }
  rows.sort((a, b) => b.date.localeCompare(a.date) || Math.abs(b.to - b.from) - Math.abs(a.to - a.from));
  return rows.slice(0, limit);
}

export interface AggregatedSignal {
  questionId: string;
  questionTitle: string;
  signal: TouchpointSignal;
}

export function aggregatedSignals(
  questions: ForecastQuestion[],
  touchpointSignalsFor: (id: string) => TouchpointSignal[]
): AggregatedSignal[] {
  const rows: AggregatedSignal[] = [];
  for (const q of cyberQuestions(questions)) {
    for (const signal of touchpointSignalsFor(q.id)) {
      rows.push({ questionId: q.id, questionTitle: q.title, signal });
    }
  }
  rows.sort((a, b) => b.signal.updatedAt.localeCompare(a.signal.updatedAt));
  return rows;
}

export interface ThreatCoverageItem {
  vector: ThreatVector;
  covered: boolean;
  maxProbability: number | null;
  questionIds: string[];
}

export function threatCoverage(
  questions: ForecastQuestion[],
  yesOutcome: (id: string) => Outcome | undefined
): ThreatCoverageItem[] {
  const cyber = cyberQuestions(questions);
  const vectorToQuestions = new Map<ThreatVector, { ids: string[]; maxP: number }>();

  for (const vector of CYBER_THREAT_VECTORS) {
    vectorToQuestions.set(vector, { ids: [], maxP: 0 });
  }

  for (const q of cyber) {
    const vectors = questionThreatVectors[q.id] ?? [];
    const yes = yesOutcome(q.id);
    const p = yes?.currentProbability ?? q.priorBaseRate;
    for (const vector of vectors) {
      const entry = vectorToQuestions.get(vector);
      if (!entry) continue;
      entry.ids.push(q.id);
      entry.maxP = Math.max(entry.maxP, p);
    }
  }

  return CYBER_THREAT_VECTORS.map((vector) => {
    const entry = vectorToQuestions.get(vector)!;
    return {
      vector,
      covered: entry.ids.length > 0,
      maxProbability: entry.ids.length > 0 ? entry.maxP : null,
      questionIds: entry.ids,
    };
  });
}

export interface RiskMatrixPoint {
  id: string;
  title: string;
  x: number;
  y: number;
}

export function riskMatrixPoints(
  questions: ForecastQuestion[],
  yesOutcome: (id: string) => Outcome | undefined
): RiskMatrixPoint[] {
  return cyberQuestions(questions)
    .filter((q) => q.riskOrOpportunity === "risk")
    .map((q) => {
      const yes = yesOutcome(q.id);
      const p = yes?.currentProbability ?? q.priorBaseRate;
      return { id: q.id, title: q.title, x: p, y: q.impactScore };
    });
}

export function executiveBrief(metrics: CyberExposureMetrics): string {
  const parts: string[] = [];

  if (metrics.elevatedCount > 0) {
    parts.push(
      `${metrics.elevatedCount} cyber risk${metrics.elevatedCount === 1 ? "" : "s"} elevated this week`
    );
  } else {
    parts.push("No cyber risks elevated more than 3pp this week");
  }

  if (metrics.highestPriority) {
    const { question, probability, riskWeight } = metrics.highestPriority;
    parts.push(
      `highest exposure: ${question.title.toLowerCase()} at ${(probability * 100).toFixed(0)}% (risk-weight ${(riskWeight * 100).toFixed(0)}%)`
    );
  }

  if (metrics.resolvingSoonCount > 0) {
    parts.push(
      `${metrics.resolvingSoonCount} forecast${metrics.resolvingSoonCount === 1 ? "" : "s"} resolving within 30 days`
    );
  }

  return parts.join("; ") + ".";
}
