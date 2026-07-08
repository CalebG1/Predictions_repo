// Generates the individual pieces of evidence that fed a single forecast refresh.
// Each soft-refresh chart point can be backed by several distinct inputs (a Teams/Slack
// message, a quantitative analysis, a news article, etc.) — this module builds a
// deterministic, richly-typed list of those inputs so the evidence drawer can let a
// user page through "what actually happened" behind a probability move.

export type EvidenceKind = "app_message" | "analysis" | "website";

export interface AppMessageEvidence {
  app: "teams" | "slack";
  channel: string;
  author: string;
  authorRole: string;
  message: string;
}

export interface AnalysisEvidence {
  title: string;
  narrative: string;
  language: string;
  code: string;
  output: string;
}

export interface WebsiteEvidence {
  domain: string;
  url: string;
  publisher: string;
  headline: string;
  snippet: string;
}

export interface EvidenceItem {
  id: string;
  kind: EvidenceKind;
  timestamp: string; // ISO
  /** One-line label used in list/summary contexts. */
  headline: string;
  /** Plain-language read on what this evidence indicates for the forecast. */
  indicates: string;
  app?: AppMessageEvidence;
  analysis?: AnalysisEvidence;
  website?: WebsiteEvidence;
}

export interface EvidenceContext {
  pointId: string;
  timestamp: string;
  trigger: string;
  /** The chart series this point belongs to, e.g. "OpenAI" or "Yes". */
  subject: string;
  questionTitle: string;
  probability: number;
  /** probability - previous probability for this series. */
  delta: number;
}

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

type Direction = "up" | "down" | "flat";

function directionOf(delta: number): Direction {
  if (delta > 0.003) return "up";
  if (delta < -0.003) return "down";
  return "flat";
}

const GENERIC_SUBJECTS = new Set(["yes", "no", "above consensus", "below consensus"]);

function isGenericSubject(subject: string): boolean {
  return GENERIC_SUBJECTS.has(subject.trim().toLowerCase());
}

const TEAMS_CHANNELS = [
  "Product Strategy",
  "AI Roadmap",
  "Market Watch",
  "Leadership Sync",
  "Partner Updates",
  "Competitive Intel",
];

const SLACK_CHANNELS = [
  "#signals-feed",
  "#news-monitor",
  "#eng-updates",
  "#growth-metrics",
  "#risk-radar",
  "#competitive-intel",
];

const PEOPLE: { name: string; role: string }[] = [
  { name: "Priya Natarajan", role: "Competitive Intelligence" },
  { name: "Marcus Webb", role: "Data Science" },
  { name: "Elena Ruiz", role: "Corporate Strategy" },
  { name: "Sam O'Connor", role: "Platform Engineering" },
  { name: "Dana Whitfield", role: "Research" },
  { name: "Jon Kessler", role: "Operations" },
  { name: "Wei Chen", role: "Product Analytics" },
  { name: "Aisha Bello", role: "Market Research" },
];

const PUBLISHERS: { name: string; domain: string }[] = [
  { name: "Reuters", domain: "reuters.com" },
  { name: "Bloomberg", domain: "bloomberg.com" },
  { name: "The Information", domain: "theinformation.com" },
  { name: "TechCrunch", domain: "techcrunch.com" },
  { name: "Axios", domain: "axios.com" },
  { name: "Financial Times", domain: "ft.com" },
  { name: "The Verge", domain: "theverge.com" },
];

const ANALYSIS_TITLES = [
  "Ensemble re-weighting pass",
  "Log-odds pooling refresh",
  "Momentum & mean-reversion check",
  "Cross-source consistency audit",
  "Anomaly scan on inbound signals",
];

function appMessageText(rng: () => number, subject: string, title: string, dir: Direction): string {
  const entity = !isGenericSubject(subject);
  const t = entity ? subject : `“${title}”`;
  const bank: Record<Direction, string[]> = entity
    ? {
        up: [
          `Just saw ${t} post a strong benchmark result — worth bumping our estimate.`,
          `Heard from a contact close to ${t} that things are trending in our favor. Confidence is decent.`,
          `${t}'s latest release is getting genuinely positive early reviews internally.`,
        ],
        down: [
          `${t} had a rough week — seeing chatter about churn and dissatisfied users.`,
          `Picked up a concerning signal on ${t}: backlash trending on socials.`,
          `Contact flagged that ${t} is losing a key partnership. Might cool the estimate a bit.`,
        ],
        flat: [
          `Nothing new on ${t} this cycle — status quo holding.`,
          `Checked in on ${t}, no material changes since last week.`,
        ],
      }
    : {
        up: [
          `New development strengthens the case for ${t} — sharing before the next refresh.`,
          `Fresh signal here nudges this one upward, flagging for the model.`,
          `Contact passed along information that supports a higher probability on this.`,
        ],
        down: [
          `New development weakens the case for ${t} — sharing before the next refresh.`,
          `Fresh signal here nudges this one downward, flagging for the model.`,
          `Contact passed along information that supports a lower probability on this.`,
        ],
        flat: [`Routine check-in on ${t} — nothing material to report this cycle.`, `Monitoring continues on this one; no change worth flagging.`],
      };
  return pick(rng, bank[dir]);
}

function websiteHeadline(rng: () => number, subject: string, title: string, dir: Direction): string {
  const entity = !isGenericSubject(subject);
  const t = entity ? subject : title;
  const bank: Record<Direction, string[]> = entity
    ? {
        up: [
          `${t} notches a milestone that shifts the competitive picture`,
          `Analysts raise outlook on ${t} after a strong showing`,
          `${t} unveils update that beats expectations`,
        ],
        down: [
          `${t} faces setback as concerns mount`,
          `Report: missteps at ${t} draw scrutiny`,
          `${t} outlook trimmed after a rocky week`,
        ],
        flat: [`${t}: a quiet week, but worth watching`, `No major catalysts for ${t} this cycle`],
      }
    : {
        up: [`Analysts see rising odds on: ${t}`, `New reporting adds weight to a “yes” on: ${t}`],
        down: [`Analysts trim odds on: ${t}`, `New reporting adds weight to a “no” on: ${t}`],
        flat: [`Still unresolved: where things stand on ${t}`, `A status update on ${t}, with little new to add`],
      };
  return pick(rng, bank[dir]);
}

function websiteSnippet(rng: () => number, subject: string, title: string, dir: Direction): string {
  const entity = !isGenericSubject(subject);
  const t = entity ? subject : title;
  const bank: Record<Direction, string[]> = {
    up: [
      `"The data points to sustained momentum, and ${entity ? t : "the underlying trend"} looks stronger than consensus expected a quarter ago," the report notes.`,
      `Industry trackers cited in the piece show the trend accelerating, with knock-on effects likely over the coming weeks.`,
    ],
    down: [
      `"Several people familiar with the matter described a bumpier path than previously disclosed," according to the report.`,
      `The piece cites multiple sources describing headwinds that could take a quarter or more to resolve.`,
    ],
    flat: [
      `The report characterizes the situation as "largely unchanged," with no new catalysts expected before the next checkpoint.`,
      `Coverage frames this as a holding pattern, with most watchers waiting on the next data release.`,
    ],
  };
  return pick(rng, bank[dir]);
}

function buildAnalysisCode(ctx: EvidenceContext, rng: () => number): { code: string; output: string; narrative: string } {
  const base = Math.max(0.02, Math.min(0.98, ctx.probability - ctx.delta));
  const marketSignal = Math.max(0.02, Math.min(0.98, base + (rng() - 0.5) * 0.12));
  const insideView = Math.max(0.02, Math.min(0.98, ctx.probability + (rng() - 0.5) * 0.08));
  const redTeam = Math.max(0.02, Math.min(0.98, base - (rng() - 0.5) * 0.1));

  const code = `import numpy as np

estimates = {
    "base_rate":     ${base.toFixed(3)},
    "market_signal": ${marketSignal.toFixed(3)},
    "inside_view":   ${insideView.toFixed(3)},
    "red_team":      ${redTeam.toFixed(3)},
}
weights = {"base_rate": 0.20, "market_signal": 0.35, "inside_view": 0.30, "red_team": 0.15}

def log_odds(p):
    return np.log(p / (1 - p))

def sigmoid(x):
    return 1 / (1 + np.exp(-x))

pooled_logodds = sum(weights[k] * log_odds(v) for k, v in estimates.items())
pooled = sigmoid(pooled_logodds)
print(f"pooled_probability = {pooled:.3f}")`;

  const output = `pooled_probability = ${ctx.probability.toFixed(3)}`;

  const narrative =
    ctx.delta === 0
      ? `Re-ran the pooling model on this cycle's inputs; the log-odds average landed back on ${(ctx.probability * 100).toFixed(0)}%, confirming no structural change.`
      : `Re-ran the pooling model across base rate, market signal, inside view, and red-team estimates for this cycle. The weighted log-odds average moved the pooled probability ${ctx.delta > 0 ? "up" : "down"} to ${(ctx.probability * 100).toFixed(0)}%.`;

  return { code, output, narrative };
}

function analysisIndicates(rng: () => number, ctx: EvidenceContext, dir: Direction): string {
  const entity = !isGenericSubject(ctx.subject);
  const t = entity ? ctx.subject : ctx.questionTitle;
  const bank: Record<Direction, string[]> = entity
    ? {
        up: [
          `The pooled model reads ${t} as gaining ground — market and inside-view estimates are aligned and pulling above the prior base rate.`,
          `Cross-checking sub-estimates suggests ${t}'s trajectory is stronger than the comparison class assumed.`,
        ],
        down: [
          `The pooled model reads ${t} as losing ground — red-team and market signals are converging below the prior base rate.`,
          `Cross-checking sub-estimates suggests ${t}'s momentum is weaker than the comparison class assumed.`,
        ],
        flat: [
          `Sub-estimates are in rough agreement on ${t}; nothing in this pass points to a structural shift from the prior run.`,
          `The model sees ${t} holding steady — no single estimator is flagging a break from the established trend.`,
        ],
      }
    : {
        up: [
          `The pooled model reads the evidence as tilting toward a higher likelihood on this question.`,
          `Sub-estimates are converging above the prior base rate — the run suggests conditions are more favorable than before.`,
        ],
        down: [
          `The pooled model reads the evidence as tilting toward a lower likelihood on this question.`,
          `Sub-estimates are converging below the prior base rate — the run suggests conditions are less favorable than before.`,
        ],
        flat: [
          `Sub-estimates are in rough agreement; this pass does not point to a structural shift from the prior run.`,
          `The model sees the situation as largely unchanged — no estimator is flagging a break from the established trend.`,
        ],
      };
  return pick(rng, bank[dir]);
}

function appIndicates(
  rng: () => number,
  subject: string,
  title: string,
  dir: Direction,
  person: { name: string; role: string },
  channel: string
): string {
  const entity = !isGenericSubject(subject);
  const t = entity ? subject : title;
  const bank: Record<Direction, string[]> = entity
    ? {
        up: [
          `Suggests ${t} is building momentum — an early internal read before the broader market has fully priced it in.`,
          `Points to favorable developments around ${t} that the inside-view estimator should weigh.`,
          `Flags positive chatter on ${channel} that ${person.role.toLowerCase()} sees as leading, not lagging.`,
        ],
        down: [
          `Suggests ${t} is facing headwinds — an early internal read that may not yet show up in public data.`,
          `Points to concerning signals around ${t} that the inside-view estimator should weigh.`,
          `Flags negative chatter on ${channel} that ${person.role.toLowerCase()} sees as worth taking seriously.`,
        ],
        flat: [
          `No material change flagged for ${t} — routine monitoring with nothing new to act on.`,
          `Status-quo check-in on ${t}; the channel has not surfaced anything that shifts the prior view.`,
        ],
      }
    : {
        up: [
          `Suggests conditions are becoming more favorable for this outcome — a qualitative lead from ${person.role.toLowerCase()}.`,
          `Points to developments that support a higher likelihood, surfaced on ${channel} ahead of the refresh.`,
        ],
        down: [
          `Suggests conditions are becoming less favorable for this outcome — a qualitative lead from ${person.role.toLowerCase()}.`,
          `Points to developments that support a lower likelihood, surfaced on ${channel} ahead of the refresh.`,
        ],
        flat: [
          `Routine monitoring — nothing on ${channel} that shifts the prior view on this question.`,
          `Status-quo check-in; no new signal worth acting on this cycle.`,
        ],
      };
  return pick(rng, bank[dir]);
}

function websiteIndicates(rng: () => number, subject: string, title: string, dir: Direction, publisher: string): string {
  const entity = !isGenericSubject(subject);
  const t = entity ? subject : title;
  const bank: Record<Direction, string[]> = entity
    ? {
        up: [
          `Public reporting from ${publisher} suggests ${t} is on a stronger trajectory than the base rate assumed.`,
          `Third-party coverage indicates tailwinds for ${t} that corroborate the inside view.`,
        ],
        down: [
          `Public reporting from ${publisher} suggests ${t} is on a weaker trajectory than the base rate assumed.`,
          `Third-party coverage indicates headwinds for ${t} that warrant a more cautious read.`,
        ],
        flat: [
          `${publisher} coverage frames ${t} as largely unchanged — no new catalyst to revise the prior.`,
          `External reporting does not surface a break from the established trend on ${t}.`,
        ],
      }
    : {
        up: [
          `${publisher} reporting adds weight to a more favorable outcome on this question.`,
          `Third-party coverage corroborates signals that conditions are tilting in the expected direction.`,
        ],
        down: [
          `${publisher} reporting adds weight to a less favorable outcome on this question.`,
          `Third-party coverage corroborates signals that conditions are tilting against the prior view.`,
        ],
        flat: [
          `${publisher} coverage does not surface a new catalyst — the external view is consistent with the prior run.`,
          `No break from the established trend in this week's public reporting.`,
        ],
      };
  return pick(rng, bank[dir]);
}

function offsetTimestamp(base: string, hoursBefore: number): string {
  const t = new Date(base).getTime();
  if (Number.isNaN(t)) return base;
  return new Date(t - hoursBefore * 3600 * 1000).toISOString();
}

/** Builds the ordered list of evidence items behind a single soft-refresh chart point. */
export function buildEvidenceItems(ctx: EvidenceContext): EvidenceItem[] {
  const rng = seeded(`${ctx.pointId}::evidence`);
  const dir = directionOf(ctx.delta);
  const count = 3 + Math.floor(rng() * 3); // 3..5

  const items: EvidenceItem[] = [];

  for (let i = 0; i < count; i++) {
    const hoursBefore = 1 + Math.floor(rng() * 46);
    const timestamp = offsetTimestamp(ctx.timestamp, hoursBefore);
    const id = `${ctx.pointId}-ev-${i}`;

    if (i === 0) {
      const title = pick(rng, ANALYSIS_TITLES);
      const { code, output, narrative } = buildAnalysisCode(ctx, rng);
      items.push({
        id,
        kind: "analysis",
        timestamp,
        headline: title,
        indicates: analysisIndicates(rng, ctx, dir),
        analysis: {
          title,
          narrative,
          language: "python",
          code,
          output,
        },
      });
      continue;
    }

    const useApp = rng() < 0.55;
    if (useApp) {
      const app: "teams" | "slack" = rng() < 0.5 ? "teams" : "slack";
      const person = pick(rng, PEOPLE);
      const channel = app === "teams" ? pick(rng, TEAMS_CHANNELS) : pick(rng, SLACK_CHANNELS);
      const message = appMessageText(rng, ctx.subject, ctx.questionTitle, dir);
      items.push({
        id,
        kind: "app_message",
        timestamp,
        headline: app === "teams" ? `${channel} on Microsoft Teams` : `${channel} on Slack`,
        indicates: appIndicates(rng, ctx.subject, ctx.questionTitle, dir, person, channel),
        app: {
          app,
          channel,
          author: person.name,
          authorRole: person.role,
          message,
        },
      });
    } else {
      const publisher = pick(rng, PUBLISHERS);
      const headline = websiteHeadline(rng, ctx.subject, ctx.questionTitle, dir);
      const snippet = websiteSnippet(rng, ctx.subject, ctx.questionTitle, dir);
      const slug = headline
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 60);
      items.push({
        id,
        kind: "website",
        timestamp,
        headline: `${publisher.name}`,
        indicates: websiteIndicates(rng, ctx.subject, ctx.questionTitle, dir, publisher.name),
        website: {
          domain: publisher.domain,
          url: `https://www.${publisher.domain}/${slug}`,
          publisher: publisher.name,
          headline,
          snippet,
        },
      });
    }
  }

  return items;
}
