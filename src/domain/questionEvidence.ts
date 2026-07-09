import { evidenceSources as seedCatalog } from "./seed";
import type { EvidenceSource, ForecastQuestion } from "./types";

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

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

function daysAgo(n: number): string {
  const d = new Date("2026-06-28");
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const PEOPLE = [
  { name: "Priya Natarajan", role: "Competitive Intelligence" },
  { name: "Marcus Webb", role: "Data Science" },
  { name: "Elena Ruiz", role: "Corporate Strategy" },
  { name: "Sam O'Connor", role: "Platform Engineering" },
  { name: "Dana Whitfield", role: "Research" },
  { name: "Wei Chen", role: "Product Analytics" },
];

const SLACK_BY_CATEGORY: Record<string, string[]> = {
  "Security/Cyber": ["#secops", "#incidents", "#security-awareness"],
  default: ["#signals-feed", "#news-monitor", "#competitive-intel"],
};

const TEAMS_BY_CATEGORY: Record<string, string[]> = {
  "Security/Cyber": ["SecOps standup", "IAM review", "Incident response"],
  default: ["Product Strategy", "Market Watch", "Leadership Sync"],
};

const PUBLISHERS = [
  { name: "Reuters", domain: "reuters.com" },
  { name: "Bloomberg", domain: "bloomberg.com" },
  { name: "The Information", domain: "theinformation.com" },
  { name: "TechCrunch", domain: "techcrunch.com" },
];

const AGENTS = [
  { id: "base-rate", label: "Base-rate agent" },
  { id: "inside-view", label: "Inside-view agent" },
  { id: "red-team", label: "Red-team agent" },
  { id: "market-crowd", label: "Market-crowd agent" },
];

function slackMessage(title: string, category: string): string {
  if (category === "Security/Cyber") {
    return `Flagging elevated chatter on ${title.toLowerCase()} — two unresolved critical alerts this week.`;
  }
  return `Fresh signal on ${title.toLowerCase()} surfaced in channel — worth folding into the next refresh.`;
}

function teamsMessage(title: string, category: string): string {
  if (category === "Security/Cyber") {
    return `IAM review notes dormant admin accounts still active — relevant to ${title.toLowerCase()}.`;
  }
  return `Leadership sync flagged a shift in assumptions behind ${title.toLowerCase()}.`;
}

function websiteHeadline(title: string): string {
  return `Analysts reassess outlook tied to: ${title}`;
}

function websiteSnippet(title: string): string {
  return `"Several sources cited in the piece describe conditions that bear directly on whether ${title.charAt(0).toLowerCase()}${title.slice(1)}," the report notes.`;
}

function agentSummary(agent: string, title: string): string {
  const lower = title.charAt(0).toLowerCase() + title.slice(1);
  const bank: Record<string, string> = {
    "base-rate": `Anchors on comparison-class frequency for events like ${lower}.`,
    "inside-view": `Weighs org-specific leading indicators and recent operational signals on ${lower}.`,
    "red-team": `Stress-tests the lead view — looks for reasons ${lower} may be over- or under-estimated.`,
    "market-crowd": `Pulls implied probabilities from external prediction markets and peer forecasts on ${lower}.`,
  };
  return bank[agent] ?? `Independent sub-estimate recorded before seeing peer agents.`;
}

function analysisIndicates(title: string): string {
  return `The pooled model cross-checks sub-estimates against fresh inputs on ${title.toLowerCase()} — this run is the structural reconciliation pass.`;
}

function appIndicates(person: { name: string; role: string }, channel: string): string {
  return `Qualitative lead from ${person.role.toLowerCase()} on ${channel} — surfaced ahead of the scheduled ensemble refresh.`;
}

function websiteIndicates(publisher: string): string {
  return `Third-party reporting from ${publisher} corroborates or challenges the inside view before the next forecast lock.`;
}

function predictionIndicates(agent: string): string {
  return `${AGENTS.find((a) => a.id === agent)?.label ?? "Agent"} sub-estimate pooled before extremization — recorded independently of peer views.`;
}

/** Builds the full evidence roster for a question: feeds, integrations, analyses, and agent traces. */
export function buildQuestionEvidence(questionId: string, question?: ForecastQuestion): EvidenceSource[] {
  const rng = seeded(`${questionId}::table-evidence`);
  const title = question?.title ?? "this forecast";
  const category = question?.category ?? "Macro";

  const slackChannels = SLACK_BY_CATEGORY[category] ?? SLACK_BY_CATEGORY.default;
  const teamsChannels = TEAMS_BY_CATEGORY[category] ?? TEAMS_BY_CATEGORY.default;
  const slackPerson = pick(rng, PEOPLE);
  const teamsPerson = pick(rng, PEOPLE);
  const publisher = pick(rng, PUBLISHERS);
  const agent = pick(rng, AGENTS);

  const feedPool = seedCatalog.filter((e) => e.kind !== "app_message" && e.kind !== "analysis");
  const feedA = feedPool[Math.floor(rng() * feedPool.length) % feedPool.length];
  const feedB = feedPool[(Math.floor(rng() * feedPool.length) + 3) % feedPool.length];

  const prob = 0.22 + rng() * 0.45;
  const base = prob - 0.04;
  const market = prob + (rng() - 0.5) * 0.08;
  const inside = prob + (rng() - 0.5) * 0.06;
  const red = prob - (rng() - 0.5) * 0.1;

  const analysisCode = `import numpy as np

estimates = {
    "base_rate":     ${base.toFixed(3)},
    "market_signal": ${market.toFixed(3)},
    "inside_view":   ${inside.toFixed(3)},
    "red_team":      ${red.toFixed(3)},
}
weights = {"base_rate": 0.20, "market_signal": 0.35, "inside_view": 0.30, "red_team": 0.15}

def log_odds(p):
    return np.log(p / (1 - p))

pooled = 1 / (1 + np.exp(-sum(weights[k] * log_odds(v) for k, v in estimates.items())))
print(f"pooled_probability = {pooled:.3f}")`;

  const wsHeadline = websiteHeadline(title);
  const wsSlug = wsHeadline.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);

  const rows: EvidenceSource[] = [
    {
      ...feedA,
      id: `${questionId}-${feedA.id}`,
      kind: "feed",
      refreshFrequency: feedA.refreshFrequency ?? "default",
    },
    {
      id: `${questionId}-ev-slack`,
      kind: "app_message",
      title: `${pick(rng, slackChannels)} on Slack`,
      sourceClass: "org_internal",
      methodTag: "slack",
      credibilityScore: 0.72,
      retrievedAt: daysAgo(4),
      relevance: "medium",
      refreshFrequency: "default",
      indicates: appIndicates(slackPerson, pick(rng, slackChannels)),
      app: {
        app: "slack",
        channel: pick(rng, slackChannels),
        author: slackPerson.name,
        authorRole: slackPerson.role,
        message: slackMessage(title, category),
      },
    },
    {
      id: `${questionId}-ev-teams`,
      kind: "app_message",
      title: `${pick(rng, teamsChannels)} on Microsoft Teams`,
      sourceClass: "org_internal",
      methodTag: "teams",
      credibilityScore: 0.75,
      retrievedAt: daysAgo(6),
      relevance: "high",
      refreshFrequency: "default",
      indicates: appIndicates(teamsPerson, pick(rng, teamsChannels)),
      app: {
        app: "teams",
        channel: pick(rng, teamsChannels),
        author: teamsPerson.name,
        authorRole: teamsPerson.role,
        message: teamsMessage(title, category),
      },
    },
    {
      id: `${questionId}-ev-analysis`,
      kind: "analysis",
      title: "Log-odds pooling refresh",
      sourceClass: "org_internal",
      methodTag: "python",
      credibilityScore: 0.9,
      retrievedAt: daysAgo(2),
      relevance: "high",
      refreshFrequency: "default",
      indicates: analysisIndicates(title),
      analysis: {
        narrative: `Re-ran the pooling model across base rate, market signal, inside view, and red-team estimates for ${title.toLowerCase()}.`,
        language: "python",
        code: analysisCode,
        output: `pooled_probability = ${prob.toFixed(3)}`,
      },
    },
    {
      id: `${questionId}-ev-website`,
      kind: "website",
      title: publisher.name,
      url: `https://www.${publisher.domain}/${wsSlug}`,
      sourceClass: "fast_feed",
      methodTag: "news",
      credibilityScore: 0.68,
      retrievedAt: daysAgo(8),
      relevance: "medium",
      refreshFrequency: "default",
      indicates: websiteIndicates(publisher.name),
      website: {
        domain: publisher.domain,
        url: `https://www.${publisher.domain}/${wsSlug}`,
        publisher: publisher.name,
        headline: wsHeadline,
        snippet: websiteSnippet(title),
      },
    },
    {
      id: `${questionId}-ev-prediction`,
      kind: "prediction",
      title: agent.label,
      sourceClass: "org_internal",
      methodTag: "agent-panel",
      credibilityScore: 0.7 + rng() * 0.15,
      retrievedAt: daysAgo(3),
      relevance: "medium",
      refreshFrequency: "default",
      indicates: predictionIndicates(agent.id),
      prediction: {
        agent: agent.label,
        probability: Number((prob + (rng() - 0.5) * 0.12).toFixed(3)),
        summary: agentSummary(agent.id, title),
      },
    },
    {
      ...feedB,
      id: `${questionId}-${feedB.id}`,
      kind: "feed",
      refreshFrequency: feedB.refreshFrequency ?? "default",
    },
  ];

  return rows.sort((a, b) => b.retrievedAt.localeCompare(a.retrievedAt));
}
