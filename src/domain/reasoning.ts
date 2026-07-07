import type {
  EvidenceSource,
  ForecastObject,
  ForecastQuestion,
  ProbabilityPoint,
} from "./types";

function formatPct(p: number): string {
  return `${(p * 100).toFixed(0)}%`;
}

export type ReasoningView = "one-line" | "summary" | "one-page";

export interface ReasoningRefresh {
  trigger: string;
  headline: string;
  url?: string;
  explanation: string;
}

export interface ReasoningNewsSource {
  title: string;
  url?: string;
}

export interface ReasoningPrecedent {
  title: string;
  description: string;
}

export interface ReasoningTraceAttempt {
  label: string;
  probability: number;
  summary: string;
}

export interface ReasoningKeyFigure {
  metric: string;
  value: string;
  source: string;
  significance: string;
}

export interface ForecastReasoning {
  oneLine: string;
  summaryBullets: string[];
  latestRefresh: ReasoningRefresh;
  changesFromPrevious: string[];
  newsSources: ReasoningNewsSource[];
  historicalPrecedents: ReasoningPrecedent[];
  predictionTrace: ReasoningTraceAttempt[];
  keyFigures: ReasoningKeyFigure[];
  historicalContext: string[];
}

const REASONING_OVERRIDES: Record<string, Partial<ForecastReasoning>> = {
  "q-geo": {
    oneLine:
      "I predict a 48% probability that the Strait of Hormuz will reopen by mid-June 2026, as crippling oil production losses force Iranian de-escalation alongside a phased restoration of maritime insurance following the deployment of U.S. naval escorts.",
    summaryBullets: [
      "I predict an outside chance (48%) that the Strait of Hormuz will be reopened to regular commercial shipping by June 17, 2026.",
      "Maritime traffic through the strait has collapsed to near zero, with only 0–1 tanker transits per day in mid-March versus a pre-conflict baseline of 50–60.",
      "Iranian threats to shipping and mines continue to deter commercial passage despite U.S. naval escort deployments.",
      "U.S. military operations have degraded Iranian naval capacity but have not yet restored insurer confidence.",
      "Diplomatic backchannels suggest phased de-escalation is possible if economic pressure on Iran intensifies.",
      "Saudi Red Sea export rerouting confirms the effective closure of Hormuz transit routes.",
    ],
    latestRefresh: {
      trigger: "news article",
      headline: "Saudi Red Sea oil exports set to jump to 3.8 million bpd in March, shipping data shows",
      url: "https://example.com/saudi-red-sea-exports",
      explanation:
        "The article states that Saudi Arabia's crude oil loadings at Yanbu are set to reach a record, 'following the effective closure of exports via the Strait of Hormuz due to the U.S.-Israeli war on Iran.' This confirms the effective closure of the Strait, which is directly relevant to a forecast about whether it will be reopened.",
    },
    changesFromPrevious: [
      "Probability unchanged at 48% — new shipping data confirms closure but does not shift reopening timeline.",
      "Added Saudi Red Sea rerouting as corroborating evidence of Hormuz closure.",
      "Insurance premium estimates revised upward based on latest war-risk pricing.",
    ],
    newsSources: [
      { title: "Saudi Red Sea oil exports set to jump to 3.8 million bpd in March", url: "#" },
      { title: "Brent crude tops $100 as Hormuz closure enters third week", url: "#" },
      { title: "Iran Q1 oil production falls 63% amid conflict", url: "#" },
      { title: "U.S. deploys naval escorts; insurers remain cautious", url: "#" },
      { title: "Lloyd's List: Hormuz transits drop to zero", url: "#" },
      { title: "IMF PortWatch flags Red Sea / Hormuz disruption", url: "#" },
      { title: "War risk premiums hit 1% of hull value", url: "#" },
      { title: "Drewry container index signals freight spike", url: "#" },
      { title: "U.S. SPR release of 172M barrels announced", url: "#" },
      { title: "Tehran signals willingness to negotiate under pressure", url: "#" },
      { title: "S&P Global: mid-March Hormuz transits at 0–1 tankers/day", url: "#" },
      { title: "Morgan Stanley models extended closure scenario", url: "#" },
      { title: "Business Times: maritime insurers suspend Hormuz coverage", url: "#" },
      { title: "Trading Economics: Iran production at 1.15M bpd", url: "#" },
    ],
    historicalPrecedents: [
      {
        title: "Tanker War (1984–1988)",
        description:
          "Iran-Iraq conflict disrupted Gulf shipping for years; partial reopening followed ceasefire negotiations and reduced mine threats.",
      },
      {
        title: "Operation Praying Mantis (April 1988)",
        description:
          "U.S. naval action degraded Iranian naval capacity; shipping partially resumed within months as insurance markets adjusted.",
      },
    ],
    keyFigures: [
      {
        metric: "Pre-Conflict Daily Transits",
        value: "50–60 Tankers",
        source: "Lloyd's List / IMF",
        significance: "Benchmark for 'regular commercial shipping'",
      },
      {
        metric: "Current Daily Transits (Mid-March)",
        value: "0–1 Tankers",
        source: "S&P Global / Morgan Stanley",
        significance: "Confirms effective closure",
      },
      {
        metric: "Brent Crude Price",
        value: "$101.83 (up 31%)",
        source: "Yahoo Finance",
        significance: "Economic pressure on reopening",
      },
      {
        metric: "War Risk Insurance Premium",
        value: "1% of hull value",
        source: "Business Times",
        significance: "Barrier to commercial return",
      },
      {
        metric: "Iran Q1 2026 Oil Production",
        value: "1.15M bpd (down 63%)",
        source: "Trading Economics",
        significance: "De-escalation incentive",
      },
      {
        metric: "U.S. SPR Release",
        value: "172 Million Barrels",
        source: "U.S. Department of Energy",
        significance: "Buys time; does not reopen strait",
      },
    ],
    historicalContext: [
      "The Tanker War (1984–1988) saw Iran and Iraq attack each other's oil infrastructure and shipping; the strait was intermittently closed, with full normalization taking years after the 1988 ceasefire.",
      "Operation Praying Mantis (April 18, 1988) was a decisive U.S. naval strike on Iranian platforms; shipping resumed partially within months as mine-clearing and insurance adjustments followed.",
      "The 1988 ceasefire between Iran and Iraq eventually restored most Gulf shipping, but only after sustained diplomatic pressure and reduced military threats to commercial vessels.",
    ],
  },
};

function latestHistoryPoint(history: ProbabilityPoint[]): ProbabilityPoint | undefined {
  if (history.length === 0) return undefined;
  return [...history].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
}

function probabilityDelta(history: ProbabilityPoint[]): number | null {
  if (history.length < 2) return null;
  const sorted = [...history].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return sorted[0].probability - sorted[1].probability;
}

function buildGenericReasoning(
  q: ForecastQuestion,
  forecast: ForecastObject,
  history: ProbabilityPoint[],
  evidence: EvidenceSource[],
): ForecastReasoning {
  const p = forecast.currentProbability;
  const delta = probabilityDelta(history);
  const deltaText =
    delta === null
      ? "No prior update to compare."
      : delta === 0
        ? `Probability unchanged at ${formatPct(p)} since the last refresh.`
        : `Probability moved ${delta > 0 ? "up" : "down"} ${formatPct(Math.abs(delta))} to ${formatPct(p)}.`;

  const latest = latestHistoryPoint(history);
  const trigger = latest?.updateTrigger ?? "Scheduled weekly run";

  return {
    oneLine: `I predict a ${formatPct(p)} probability that ${q.title.charAt(0).toLowerCase()}${q.title.slice(1)}, weighing ${forecast.driversUp[0]?.toLowerCase() ?? "recent signals"} against ${forecast.driversDown[0]?.toLowerCase() ?? "existing mitigations"}.`,
    summaryBullets: [
      `I predict a ${formatPct(p)} chance that ${q.title.charAt(0).toLowerCase()}${q.title.slice(1)} by ${q.resolutionDate}.`,
      forecast.outsideView,
      forecast.insideView,
      ...forecast.driversUp.slice(0, 2).map((d) => `Factor pushing up: ${d}.`),
      ...forecast.driversDown.slice(0, 1).map((d) => `Factor pushing down: ${d}.`),
      ...forecast.keyUncertainties.slice(0, 1).map((u) => `Key uncertainty: ${u}.`),
    ],
    latestRefresh: {
      trigger: trigger.toLowerCase().includes("news") ? "news article" : "scheduled refresh",
      headline: trigger,
      explanation: `${deltaText} ${forecast.updateTriggers[0] ?? "Next review on new primary-source signal."}`,
    },
    changesFromPrevious: [
      deltaText,
      ...forecast.driversUp.slice(0, 1).map((d) => `Upward driver noted: ${d}.`),
      ...forecast.driversDown.slice(0, 1).map((d) => `Downward driver noted: ${d}.`),
    ],
    newsSources: evidence.map((e) => ({ title: e.title, url: e.url })),
    historicalPrecedents: forecast.alternativeScenarios.slice(0, 2).map((s, i) => ({
      title: `Scenario ${i + 1}`,
      description: s,
    })),
    predictionTrace: forecast.agentPanel
      .filter((a) => a.agent !== "synthesis" && a.agent !== "extremizer")
      .slice(0, 4)
      .map((a, i) => ({
        label: `Attempt ${i + 1} · ${a.agent}`,
        probability: a.estimate,
        summary: a.rationale,
      })),
    keyFigures: [
      {
        metric: "Current probability",
        value: formatPct(p),
        source: "Forecast engine",
        significance: "Live estimate",
      },
      {
        metric: "Base rate (outside view)",
        value: formatPct(forecast.priorBaseRate),
        source: "Comparison class",
        significance: forecast.outsideView,
      },
      {
        metric: "3-month horizon",
        value: formatPct(forecast.horizonSensitivity["3m"] ?? p),
        source: "Scope sensitivity",
        significance: "Near-term outlook",
      },
      {
        metric: "Confidence in estimate",
        value: formatPct(forecast.confidenceInEstimateQuality),
        source: "Agent spread",
        significance: "Distinct from event probability",
      },
    ],
    historicalContext: [
      forecast.outsideView,
      ...forecast.alternativeScenarios,
      `Resolution criteria: ${q.resolutionCriteria}`,
    ],
  };
}

export function buildForecastReasoning(
  q: ForecastQuestion,
  forecast: ForecastObject,
  history: ProbabilityPoint[],
  evidence: EvidenceSource[],
): ForecastReasoning {
  const generic = buildGenericReasoning(q, forecast, history, evidence);
  const override = REASONING_OVERRIDES[q.id];
  if (!override) return generic;
  return { ...generic, ...override };
}
