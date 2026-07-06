import { runForecast } from "./engine";
import type {
  Category,
  EvidenceSource,
  ForecastQuestion,
  Outcome,
  ProbabilityPoint,
  RiskOrOpportunity,
  SourceClass,
  User,
  Visibility,
} from "./types";

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

const CATEGORY_KEYWORDS: [Category, string[]][] = [
  ["Security/Cyber", ["cyber", "breach", "hack", "security", "ransomware", "incident", "exfil"]],
  ["Supply Chain", ["supplier", "supply", "shipment", "logistics", "freight", "port", "shipping"]],
  ["Geopolitical", ["war", "conflict", "sanction", "geopolit", "iran", "china", "russia", "middle east", "wto"]],
  ["Regulatory", ["regulation", "regulatory", "compliance", "rule", "law", "eu", "sec", "fda"]],
  ["Macro", ["fed", "rate", "cpi", "inflation", "gdp", "recession", "macro", "central bank"]],
  ["Financial", ["revenue", "margin", "acquisition", "m&a", "fx", "earnings", "budget"]],
  ["Talent", ["hire", "attrition", "talent", "workforce", "layoff", "recruit"]],
  ["Product", ["product", "launch", "release", "roadmap", "feature", "ga"]],
  ["Operational", ["uptime", "sla", "cloud", "ops", "platform", "outage"]],
  ["Reputational", ["brand", "reputation", "nps", "viral", "pr"]],
];

function inferCategory(title: string): Category {
  const lower = title.toLowerCase();
  for (const [cat, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return cat;
  }
  return "Operational";
}

function inferRiskOrOpportunity(title: string): RiskOrOpportunity {
  const lower = title.toLowerCase();
  const riskWords = ["risk", "disruption", "breach", "fail", "decline", "conflict", "overrun", "exceed", "drop"];
  const oppWords = ["launch", "close", "hit", "meet", "grow", "win", "fill", "ship", "cut rates"];
  const riskScore = riskWords.filter((w) => lower.includes(w)).length;
  const oppScore = oppWords.filter((w) => lower.includes(w)).length;
  return oppScore > riskScore ? "opportunity" : "risk";
}

function formatTitle(raw: string): string {
  const trimmed = raw.trim().replace(/\?+$/, "").trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  if (/^(will|does|is|are|when|which|what|how)\b/.test(lower)) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1) + (trimmed.endsWith("?") ? "" : "?");
  }
  return `Will ${trimmed.charAt(0).toLowerCase() + trimmed.slice(1)}?`;
}

function resolutionDateFromNow(monthsOut: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsOut);
  return d.toISOString().slice(0, 10);
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

export interface EvidenceDraft {
  title: string;
  url?: string;
  sourceClass?: SourceClass;
}

export interface CreateQuestionInput {
  title: string;
  description?: string;
  resolutionCriteria?: string;
  resolutionSource?: string;
  resolutionDate?: string;
  impactEstimate?: string;
  category?: Category;
  visibility?: Visibility;
  riskOrOpportunity?: RiskOrOpportunity;
  evidence?: EvidenceDraft[];
}

/** Rank existing questions by lexical overlap with the draft query. */
export function findSimilarQuestions(
  query: string,
  existing: ForecastQuestion[],
  limit = 5
): ForecastQuestion[] {
  const qTokens = tokenize(query);
  if (qTokens.size === 0) return existing.slice(0, limit);

  const scored = existing
    .map((q) => {
      const tTokens = tokenize(q.title + " " + q.preciseDefinition);
      let overlap = 0;
      qTokens.forEach((t) => {
        if (tTokens.has(t)) overlap += 1;
      });
      return { q, score: overlap };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return existing.slice(0, limit);
  }
  return scored.slice(0, limit).map(({ q }) => q);
}

export interface GeneratedQuestionBundle {
  question: ForecastQuestion;
  outcomes: Outcome[];
  history: ProbabilityPoint[];
  evidence: EvidenceSource[];
}

export function createQuestionFromInput(
  input: CreateQuestionInput,
  user: User,
  questionId?: string
): GeneratedQuestionBundle {
  const title = formatTitle(input.title);
  const id = questionId ?? `q-user-${Date.now()}`;
  const rng = seeded(id + input.title);
  const category = input.category ?? inferCategory(input.title);
  const riskOrOpportunity = input.riskOrOpportunity ?? inferRiskOrOpportunity(input.title);
  const resolutionDate = input.resolutionDate?.trim() || resolutionDateFromNow(6 + Math.floor(rng() * 6));
  const openDate = new Date().toISOString().slice(0, 10);

  const preciseDefinition =
    input.description?.trim() ||
    `${title.replace(/\?$/, "")} — resolvable per documented criteria before ${resolutionDate}.`;

  const resolutionCriteria =
    input.resolutionCriteria?.trim() ||
    `Resolves YES when the stated condition in the question is met before ${resolutionDate}.`;

  const resolutionSource = input.resolutionSource?.trim() || "Primary source verification + internal review";

  const priorBaseRate = Number((0.25 + rng() * 0.35).toFixed(2));
  const impactScore = Number((0.35 + rng() * 0.45).toFixed(2));
  const impactLevels = ["low", "medium", "high", "critical"] as const;
  const impactLevel = impactLevels[Math.min(3, Math.floor(impactScore * 4))];

  const question: ForecastQuestion = {
    id,
    title,
    preciseDefinition,
    category,
    type: "binary",
    riskOrOpportunity,
    impactEstimate:
      input.impactEstimate?.trim() ||
      (riskOrOpportunity === "risk" ? "Material operational or financial exposure" : "Meaningful upside to plan"),
    impactLevel,
    impactScore,
    resolutionCriteria,
    resolutionSource,
    openDate,
    resolutionDate,
    status: "open",
    visibility: input.visibility ?? "public",
    owningTeam: user.team,
    createdBy: user.id,
    priorBaseRate,
  };

  const evidence: EvidenceSource[] = (input.evidence ?? [])
    .filter((e) => e.title.trim())
    .map((e, i) => ({
      id: `${id}-ev-${i}`,
      title: e.title.trim(),
      url: e.url?.trim() || undefined,
      sourceClass: e.sourceClass ?? "org_internal",
      credibilityScore: 0.75,
      retrievedAt: openDate,
    }));

  const forecast = runForecast(question, { trigger: "question-create" });
  const yesProb = Number(forecast.currentProbability.toFixed(3));
  const noProb = Number((1 - yesProb).toFixed(3));

  const outcomes: Outcome[] = [
    {
      id: `${id}-yes`,
      questionId: id,
      label: "Yes",
      currentProbability: yesProb,
      isResolved: false,
    },
    {
      id: `${id}-no`,
      questionId: id,
      label: "No",
      currentProbability: noProb,
      isResolved: false,
    },
  ];

  const history: ProbabilityPoint[] = [
    {
      id: `${id}-ph-0`,
      outcomeId: `${id}-yes`,
      probability: priorBaseRate,
      timestamp: openDate,
      source: "agent-ensemble",
      updateTrigger: "Initial base-rate anchor",
    },
    {
      id: `${id}-ph-1`,
      outcomeId: `${id}-yes`,
      probability: yesProb,
      timestamp: openDate,
      source: "agent-ensemble",
      updateTrigger: evidence.length > 0 ? "Initial forecast with submitted evidence" : "Question created",
    },
  ];

  return { question, outcomes, history, evidence };
}

/** @deprecated Use createQuestionFromInput */
export function generateQuestionFromDraft(rawTitle: string, user: User): GeneratedQuestionBundle {
  return createQuestionFromInput({ title: rawTitle }, user);
}
