import { runForecast } from "./engine";
import { evidenceSources } from "./seed";
import type { Category, ForecastQuestion, Outcome, ProbabilityPoint, RiskOrOpportunity, User } from "./types";

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
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1) + "?";
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

function pickNewsSource(title: string) {
  const lower = title.toLowerCase();
  const ranked = evidenceSources
    .map((src) => {
      const srcTokens = tokenize(src.title);
      const queryTokens = tokenize(title);
      let overlap = 0;
      queryTokens.forEach((t) => {
        if (srcTokens.has(t)) overlap += 1;
      });
      if (src.sourceClass === "fast_feed" && (lower.includes("conflict") || lower.includes("geopolit"))) overlap += 2;
      if (src.sourceClass === "central_bank" && lower.includes("rate")) overlap += 2;
      if (src.sourceClass === "gov_stats" && (lower.includes("cpi") || lower.includes("inflation"))) overlap += 2;
      return { src, overlap };
    })
    .sort((a, b) => b.overlap - a.overlap);
  return ranked[0]?.src ?? evidenceSources[0];
}

export interface GeneratedQuestionBundle {
  question: ForecastQuestion;
  outcomes: Outcome[];
  history: ProbabilityPoint[];
}

export function generateQuestionFromDraft(
  rawTitle: string,
  user: User,
  opts: { fromNews?: boolean } = {}
): GeneratedQuestionBundle {
  const title = formatTitle(rawTitle);
  const id = `q-user-${Date.now()}`;
  const rng = seeded(id + rawTitle);
  const category = inferCategory(rawTitle);
  const riskOrOpportunity = inferRiskOrOpportunity(rawTitle);
  const monthsOut = 6 + Math.floor(rng() * 7);
  const resolutionDate = resolutionDateFromNow(monthsOut);
  const openDate = new Date().toISOString().slice(0, 10);
  const newsSource = opts.fromNews ? pickNewsSource(rawTitle) : null;

  const preciseDefinition = opts.fromNews
    ? `${title.replace(/\?$/, "")} — operationalized per ${newsSource!.title} and corroborating primary sources before ${resolutionDate}.`
    : `${title.replace(/\?$/, "")} — resolvable per documented criteria before ${resolutionDate}.`;

  const resolutionCriteria = opts.fromNews
    ? `Resolves YES if corroborated by ${newsSource!.title} and aligned primary reporting before the resolution date.`
    : `Resolves YES when the stated condition in the question is met before ${resolutionDate}.`;

  const resolutionSource = newsSource?.title ?? "Primary source verification + internal review";

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
    impactEstimate: riskOrOpportunity === "risk" ? "Material operational or financial exposure" : "Meaningful upside to plan",
    impactLevel,
    impactScore,
    resolutionCriteria,
    resolutionSource,
    openDate,
    resolutionDate,
    status: "open",
    visibility: "public",
    owningTeam: user.team,
    createdBy: user.id,
    priorBaseRate,
  };

  const forecast = runForecast(question, { trigger: opts.fromNews ? "news-ingest" : "question-framer" });
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
      updateTrigger: opts.fromNews ? `Framed from ${newsSource!.title}` : "Initial base-rate anchor",
    },
    {
      id: `${id}-ph-1`,
      outcomeId: `${id}-yes`,
      probability: yesProb,
      timestamp: new Date().toISOString().slice(0, 10),
      source: "agent-ensemble",
      updateTrigger: opts.fromNews ? "News-driven ensemble forecast" : "Question-framer synthesis",
    },
  ];

  return { question, outcomes, history };
}
