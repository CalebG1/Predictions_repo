// White space: coverage gaps between the universe of material risks/opportunities
// and the org's live forecast book. Pure + deterministic — no store dependency.
// Candidates that no longer satisfy their gap condition stop surfacing once the
// book fills that cell (e.g. after promotion).

import { competitorById, competitorMoves, type MoveCategory } from "./competitors";
import type { CreateQuestionInput } from "./generateQuestion";
import { isStandardsQuestion, type CommitmentTheme } from "./standards";
import type { Category, ForecastQuestion, RiskOrOpportunity } from "./types";

export type WhiteSpaceSource = "coverage_gap" | "competitor_move" | "standards_checklist";
export type Materiality = "high" | "medium" | "low";
export type WhiteSpaceDecisionStatus = "promoted" | "watching" | "dismissed";

export interface WhiteSpaceDecision {
  status: WhiteSpaceDecisionStatus;
  decidedAt: string;
  questionId?: string;
  dismissReason?: string;
}

export const categoryOrder: Category[] = [
  "Financial",
  "Operational",
  "Geopolitical",
  "Regulatory",
  "Talent",
  "Security/Cyber",
  "Supply Chain",
  "Product",
  "Reputational",
  "Macro",
  "Competitive",
];

export type CoverageCell = {
  category: Category;
  riskOrOpportunity: RiskOrOpportunity;
  count: number;
};

export type CoverageMatrix = Record<Category, Record<RiskOrOpportunity, number>>;

/** Open, non-standards questions that constitute the org's live book. */
export function bookQuestions(questions: ForecastQuestion[]): ForecastQuestion[] {
  return questions.filter((q) => q.status === "open" && !isStandardsQuestion(q.id));
}

export function coverageMatrix(questions: ForecastQuestion[]): CoverageMatrix {
  const matrix = {} as CoverageMatrix;
  for (const cat of categoryOrder) {
    matrix[cat] = { risk: 0, opportunity: 0 };
  }
  for (const q of bookQuestions(questions)) {
    if (!matrix[q.category]) matrix[q.category] = { risk: 0, opportunity: 0 };
    matrix[q.category][q.riskOrOpportunity] += 1;
  }
  return matrix;
}

export function coverageCells(questions: ForecastQuestion[]): CoverageCell[] {
  const matrix = coverageMatrix(questions);
  const cells: CoverageCell[] = [];
  for (const category of categoryOrder) {
    for (const side of ["risk", "opportunity"] as const) {
      cells.push({ category, riskOrOpportunity: side, count: matrix[category][side] });
    }
  }
  return cells;
}

export interface WhiteSpaceCandidate {
  id: string;
  title: string;
  whyItMatters: string;
  riskOrOpportunity: RiskOrOpportunity;
  category: Category;
  materiality: Materiality;
  source: WhiteSpaceSource;
  /** Human-readable chip, e.g. "Not covered: Product × risk". */
  sourceLabel: string;
  createInput: CreateQuestionInput;
  /** True when the gap this candidate represents still exists in the book. */
  isGapOpen: (questions: ForecastQuestion[]) => boolean;
}

const MATERIALITY_RANK: Record<Materiality, number> = { high: 0, medium: 1, low: 2 };

function cellEmpty(
  questions: ForecastQuestion[],
  category: Category,
  side: RiskOrOpportunity,
  maxCount = 0,
): boolean {
  return coverageMatrix(questions)[category][side] <= maxCount;
}

function hasCompetitorMove(
  questions: ForecastQuestion[],
  competitorId: string,
  moveCategory: MoveCategory,
): boolean {
  const openIds = new Set(bookQuestions(questions).map((q) => q.id));
  return competitorMoves.some(
    (m) =>
      m.competitorId === competitorId &&
      m.moveCategory === moveCategory &&
      openIds.has(m.questionId),
  );
}

/** Keyword sets used to decide whether a standards theme is already represented. */
const STANDARDS_THEME_KEYWORDS: Record<string, RegExp> = {
  churn: /\b(churn|gross retention|net revenue retention|nrr)\b/i,
  arr: /\b(arr|annual recurring revenue|net new arr)\b/i,
  billings: /\b(billings|deferred revenue|rpo|remaining performance)\b/i,
  cloud_cogs: /\b(cloud (cogs|cost)|infrastructure cost|hosting cost)\b/i,
  nrr_guidance: /\b(net revenue retention|nrr)\b/i,
  large_customers: /\b(large[- ]customer|>\$100k|enterprise customer count)\b/i,
};

function bookMatchesTheme(questions: ForecastQuestion[], themeKey: string): boolean {
  const re = STANDARDS_THEME_KEYWORDS[themeKey];
  if (!re) return false;
  return bookQuestions(questions).some((q) => re.test(`${q.title} ${q.preciseDefinition}`));
}

function competitorLabel(competitorId: string, moveCategory: MoveCategory): string {
  const name = competitorById(competitorId)?.name ?? competitorId;
  return `Competitor move untracked: ${name} × ${moveCategory}`;
}

function coverageLabel(category: Category, side: RiskOrOpportunity): string {
  return `Not covered: ${category} × ${side}`;
}

function standardsLabel(theme: string): string {
  return `In standards checklist, not in book: ${theme}`;
}

function mk(
  partial: Omit<WhiteSpaceCandidate, "isGapOpen" | "createInput" | "sourceLabel"> & {
    sourceLabel: string;
    createInput?: Partial<CreateQuestionInput>;
    isGapOpen: (questions: ForecastQuestion[]) => boolean;
  },
): WhiteSpaceCandidate {
  const {
    id,
    title,
    whyItMatters,
    riskOrOpportunity,
    category,
    materiality,
    source,
    sourceLabel,
    isGapOpen,
    createInput: extra,
  } = partial;
  return {
    id,
    title,
    whyItMatters,
    riskOrOpportunity,
    category,
    materiality,
    source,
    sourceLabel,
    isGapOpen,
    createInput: {
      title,
      description: whyItMatters,
      category,
      riskOrOpportunity,
      visibility: "public",
      impactEstimate:
        riskOrOpportunity === "risk"
          ? "Material operational or financial exposure if untracked"
          : "Meaningful upside that is currently outside the forecast book",
      resolutionCriteria: `Resolves YES if the event described in "${title.replace(/\?$/, "")}" occurs by the stated resolution date.`,
      resolutionSource: "Primary source verification + internal review",
      ...extra,
    },
  };
}

/** Curated library of white-space candidates. Filtered at build time by gap conditions. */
export const whiteSpaceLibrary: WhiteSpaceCandidate[] = [
  // --- Coverage gaps (empty category × side cells) ---
  mk({
    id: "ws-cov-product-risk",
    title: "Will a material product regression force a public rollback or GA delay this year?",
    whyItMatters:
      "The book has Product opportunities but zero Product risks. A quality or reliability miss can erase the upside those opportunity forecasts assume.",
    riskOrOpportunity: "risk",
    category: "Product",
    materiality: "high",
    source: "coverage_gap",
    sourceLabel: coverageLabel("Product", "risk"),
    isGapOpen: (qs) => cellEmpty(qs, "Product", "risk"),
  }),
  mk({
    id: "ws-cov-competitive-opp",
    title: "Will we win a net-new logo from a displaced competitor account this fiscal year?",
    whyItMatters:
      "Competitive coverage is almost entirely risk-framed. Without opportunity forecasts, the book cannot track share gains when a rival stumbles.",
    riskOrOpportunity: "opportunity",
    category: "Competitive",
    materiality: "high",
    source: "coverage_gap",
    sourceLabel: coverageLabel("Competitive", "opportunity"),
    isGapOpen: (qs) => cellEmpty(qs, "Competitive", "opportunity"),
  }),
  mk({
    id: "ws-cov-regulatory-opp",
    title: "Will a favorable regulatory clarification open a new sellable use case this year?",
    whyItMatters:
      "Regulatory is tracked only as downside. Clarifications and safe harbors often create go-to-market openings the book currently ignores.",
    riskOrOpportunity: "opportunity",
    category: "Regulatory",
    materiality: "medium",
    source: "coverage_gap",
    sourceLabel: coverageLabel("Regulatory", "opportunity"),
    isGapOpen: (qs) => cellEmpty(qs, "Regulatory", "opportunity"),
  }),
  mk({
    id: "ws-cov-reputational-opp",
    title: "Will a third-party analyst or press ranking materially lift inbound pipeline this year?",
    whyItMatters:
      "Reputational coverage is risk-only. Positive brand moments (awards, rankings, narrative shifts) can move pipeline and are worth a dedicated forecast.",
    riskOrOpportunity: "opportunity",
    category: "Reputational",
    materiality: "medium",
    source: "coverage_gap",
    sourceLabel: coverageLabel("Reputational", "opportunity"),
    isGapOpen: (qs) => cellEmpty(qs, "Reputational", "opportunity"),
  }),
  mk({
    id: "ws-cov-geopolitical-opp",
    title: "Will a geopolitical thaw reopen a previously restricted enterprise market this year?",
    whyItMatters:
      "Geopolitical is tracked only as disruption risk. Easing of sanctions or export controls can reopen territory that currently has no upside forecast.",
    riskOrOpportunity: "opportunity",
    category: "Geopolitical",
    materiality: "low",
    source: "coverage_gap",
    sourceLabel: coverageLabel("Geopolitical", "opportunity"),
    isGapOpen: (qs) => cellEmpty(qs, "Geopolitical", "opportunity"),
  }),
  mk({
    id: "ws-cov-financial-risk-depth",
    title: "Will next-quarter gross margin miss the low end of guidance?",
    whyItMatters:
      "Financial risk coverage is thin relative to opportunity coverage. A margin miss is a high-signal commitment the book should own explicitly.",
    riskOrOpportunity: "risk",
    category: "Financial",
    materiality: "high",
    source: "coverage_gap",
    sourceLabel: "Thin coverage: Financial × risk",
    isGapOpen: (qs) => cellEmpty(qs, "Financial", "risk", 1),
  }),

  // --- Competitor moves not in the book ---
  mk({
    id: "ws-comp-openai-pricing",
    title: "Will OpenAI cut enterprise API list prices by 20%+ before year-end?",
    whyItMatters:
      "OpenAI Product and Market Entry moves are tracked, but Pricing & Packaging is not. A list-price cut would reprice competitive deals immediately.",
    riskOrOpportunity: "risk",
    category: "Competitive",
    materiality: "high",
    source: "competitor_move",
    sourceLabel: competitorLabel("openai", "Pricing & Packaging"),
    isGapOpen: (qs) => !hasCompetitorMove(qs, "openai", "Pricing & Packaging"),
  }),
  mk({
    id: "ws-comp-openai-mna",
    title: "Will OpenAI announce an acquisition of a major enterprise data/platform vendor this year?",
    whyItMatters:
      "OpenAI M&A is untracked. A platform acquisition would change the competitive set overnight and invalidate several current Product forecasts.",
    riskOrOpportunity: "risk",
    category: "Competitive",
    materiality: "medium",
    source: "competitor_move",
    sourceLabel: competitorLabel("openai", "M&A & Investment"),
    isGapOpen: (qs) => !hasCompetitorMove(qs, "openai", "M&A & Investment"),
  }),
  mk({
    id: "ws-comp-msft-market-entry",
    title: "Will Microsoft launch a vertical agent pack aimed at our core ICP this year?",
    whyItMatters:
      "Microsoft Market Entry is untracked while Product and Pricing are heavy. A vertical pack aimed at our ICP is the move most likely to steal pipeline.",
    riskOrOpportunity: "risk",
    category: "Competitive",
    materiality: "high",
    source: "competitor_move",
    sourceLabel: competitorLabel("microsoft", "Market Entry"),
    isGapOpen: (qs) => !hasCompetitorMove(qs, "microsoft", "Market Entry"),
  }),
  mk({
    id: "ws-comp-anthropic-product",
    title: "Will Anthropic ship a native enterprise agent builder competitive with ours this year?",
    whyItMatters:
      "Anthropic Market Entry and Partnerships are tracked, but Product launches are not. A native builder would close a gap they currently concede.",
    riskOrOpportunity: "risk",
    category: "Competitive",
    materiality: "high",
    source: "competitor_move",
    sourceLabel: competitorLabel("anthropic", "Product"),
    isGapOpen: (qs) => !hasCompetitorMove(qs, "anthropic", "Product"),
  }),
  mk({
    id: "ws-comp-salesforce-product",
    title: "Will Salesforce GA an agent runtime that displaces our seat expansion motion this year?",
    whyItMatters:
      "Salesforce Pricing and Market Entry are tracked; Product is not. A runtime that lands inside existing CRM seats is the highest-leverage threat.",
    riskOrOpportunity: "risk",
    category: "Competitive",
    materiality: "high",
    source: "competitor_move",
    sourceLabel: competitorLabel("salesforce", "Product"),
    isGapOpen: (qs) => !hasCompetitorMove(qs, "salesforce", "Product"),
  }),
  mk({
    id: "ws-comp-google-partnerships",
    title: "Will Google announce a preferred-partner agreement with a top-3 SI that blocks us?",
    whyItMatters:
      "Google Partnerships are untracked. SI exclusivity can lock out distribution even when product parity is close.",
    riskOrOpportunity: "risk",
    category: "Competitive",
    materiality: "medium",
    source: "competitor_move",
    sourceLabel: competitorLabel("google", "Partnerships"),
    isGapOpen: (qs) => !hasCompetitorMove(qs, "google", "Partnerships"),
  }),
  mk({
    id: "ws-comp-adobe-partnerships",
    title: "Will Adobe partner with a major cloud marketplace to bundle Firefly against us?",
    whyItMatters:
      "Adobe Partnerships are untracked. Marketplace bundling changes procurement defaults for creative and marketing buyers.",
    riskOrOpportunity: "risk",
    category: "Competitive",
    materiality: "medium",
    source: "competitor_move",
    sourceLabel: competitorLabel("adobe", "Partnerships"),
    isGapOpen: (qs) => !hasCompetitorMove(qs, "adobe", "Partnerships"),
  }),
  mk({
    id: "ws-comp-hubspot-tech",
    title: "Will HubSpot ship a first-party model that removes the need for our connector?",
    whyItMatters:
      "HubSpot Technology moves are untracked. A native model that collapses our integration surface would hit expansion and retention together.",
    riskOrOpportunity: "risk",
    category: "Competitive",
    materiality: "medium",
    source: "competitor_move",
    sourceLabel: competitorLabel("hubspot", "Technology"),
    isGapOpen: (qs) => !hasCompetitorMove(qs, "hubspot", "Technology"),
  }),
  mk({
    id: "ws-comp-servicenow-gtm",
    title: "Will ServiceNow stand up a dedicated AI-agent field team aimed at our accounts?",
    whyItMatters:
      "ServiceNow Go-to-market is untracked. A dedicated field team is often the leading indicator of an account-takeover campaign.",
    riskOrOpportunity: "risk",
    category: "Competitive",
    materiality: "low",
    source: "competitor_move",
    sourceLabel: competitorLabel("servicenow", "Go-to-market"),
    isGapOpen: (qs) => !hasCompetitorMove(qs, "servicenow", "Go-to-market"),
  }),

  // --- Standards checklist (tech/SaaS themes missing from the org book) ---
  mk({
    id: "ws-std-churn",
    title: "Will full-year logo churn exceed 8%?",
    whyItMatters:
      "Churn / gross retention sits on every SaaS standards checklist. The book has no resolvable forecast for it, so retention risk is implicit only.",
    riskOrOpportunity: "risk",
    category: "Financial",
    materiality: "high",
    source: "standards_checklist",
    sourceLabel: standardsLabel("churn"),
    isGapOpen: (qs) => !bookMatchesTheme(qs, "churn"),
    createInput: {
      resolutionCriteria: "Resolves YES if reported full-year logo churn exceeds 8%.",
    },
  }),
  mk({
    id: "ws-std-arr",
    title: "Will year-end ARR land above the current guidance midpoint?",
    whyItMatters:
      "ARR is the core SaaS commitment. Without an explicit ARR forecast, Standards coverage and the live book are disconnected on the primary growth metric.",
    riskOrOpportunity: "opportunity",
    category: "Financial",
    materiality: "high",
    source: "standards_checklist",
    sourceLabel: standardsLabel("ARR"),
    isGapOpen: (qs) => !bookMatchesTheme(qs, "arr"),
    createInput: {
      resolutionCriteria:
        "Resolves YES if reported year-end ARR is at or above the guidance midpoint published at the start of the year.",
    },
  }),
  mk({
    id: "ws-std-nrr",
    title: "Will full-year net revenue retention stay at or above 115%?",
    whyItMatters:
      "NRR is a universal SaaS standard. The book does not currently resolve a NRR commitment, leaving expansion health untracked.",
    riskOrOpportunity: "opportunity",
    category: "Financial",
    materiality: "high",
    source: "standards_checklist",
    sourceLabel: standardsLabel("NRR"),
    isGapOpen: (qs) => !bookMatchesTheme(qs, "nrr_guidance"),
    createInput: {
      resolutionCriteria: "Resolves YES if reported full-year NRR is at or above 115%.",
    },
  }),
  mk({
    id: "ws-std-billings",
    title: "Will full-year billings growth beat the Street consensus?",
    whyItMatters:
      "Billings / RPO is on the SaaS standards checklist and is often the earliest demand signal. It is not yet a first-class forecast in the book.",
    riskOrOpportunity: "opportunity",
    category: "Financial",
    materiality: "medium",
    source: "standards_checklist",
    sourceLabel: standardsLabel("billings"),
    isGapOpen: (qs) => !bookMatchesTheme(qs, "billings"),
  }),
  mk({
    id: "ws-std-cloud-cogs",
    title: "Will cloud infrastructure COGS as a % of revenue rise more than 150 bps this year?",
    whyItMatters:
      "Cloud/infrastructure cost is a standard SaaS cost commitment. Without it, margin forecasts rest on an untracked COGS assumption.",
    riskOrOpportunity: "risk",
    category: "Operational",
    materiality: "medium",
    source: "standards_checklist",
    sourceLabel: standardsLabel("cloud COGS"),
    isGapOpen: (qs) => !bookMatchesTheme(qs, "cloud_cogs"),
  }),
  mk({
    id: "ws-std-large-customers",
    title: "Will we add 25+ net new customers above $100K ARR this year?",
    whyItMatters:
      "Large-customer count is a standard SaaS growth commitment. The book tracks general growth but not this concentration metric.",
    riskOrOpportunity: "opportunity",
    category: "Product",
    materiality: "medium",
    source: "standards_checklist",
    sourceLabel: standardsLabel("large-customer count"),
    isGapOpen: (qs) => !bookMatchesTheme(qs, "large_customers"),
  }),

  // --- Extra balanced opportunities / risks that fill thinner cells ---
  mk({
    id: "ws-cov-talent-opp-depth",
    title: "Will we fill the open Staff+ ML hiring slate before Q4?",
    whyItMatters:
      "Talent opportunity coverage is thin. Staffing the ML slate on time is a leading indicator for several Product opportunity forecasts.",
    riskOrOpportunity: "opportunity",
    category: "Talent",
    materiality: "medium",
    source: "coverage_gap",
    sourceLabel: "Thin coverage: Talent × opportunity",
    isGapOpen: (qs) => cellEmpty(qs, "Talent", "opportunity", 1),
  }),
  mk({
    id: "ws-cov-macro-opp-depth",
    title: "Will a Fed cut cycle unlock a delayed enterprise budget tranche this year?",
    whyItMatters:
      "Macro opportunity coverage is thin. Rate relief often releases deferred software spend that currently has no dedicated forecast.",
    riskOrOpportunity: "opportunity",
    category: "Macro",
    materiality: "low",
    source: "coverage_gap",
    sourceLabel: "Thin coverage: Macro × opportunity",
    isGapOpen: (qs) => cellEmpty(qs, "Macro", "opportunity", 1),
  }),
  mk({
    id: "ws-cov-security-opp",
    title: "Will a major competitor breach convert into ≥3 closed-won displacements this year?",
    whyItMatters:
      "Security/Cyber is heavily risk-weighted. Competitive breach-driven wins are a recurring opportunity the book does not yet track.",
    riskOrOpportunity: "opportunity",
    category: "Security/Cyber",
    materiality: "medium",
    source: "coverage_gap",
    sourceLabel: "Thin coverage: Security/Cyber × opportunity",
    isGapOpen: (qs) => cellEmpty(qs, "Security/Cyber", "opportunity", 1),
  }),
];

export function buildWhiteSpaceCandidates(questions: ForecastQuestion[]): WhiteSpaceCandidate[] {
  return whiteSpaceLibrary
    .filter((c) => c.isGapOpen(questions))
    .sort((a, b) => {
      const m = MATERIALITY_RANK[a.materiality] - MATERIALITY_RANK[b.materiality];
      if (m !== 0) return m;
      // Opportunities after risks within the same materiality so both sides stay visible.
      if (a.riskOrOpportunity !== b.riskOrOpportunity) {
        return a.riskOrOpportunity === "risk" ? -1 : 1;
      }
      return a.title.localeCompare(b.title);
    });
}

export function whiteSpaceCandidateById(id: string): WhiteSpaceCandidate | undefined {
  return whiteSpaceLibrary.find((c) => c.id === id);
}

/** Theme helper exported for tests / future Standards cross-links. */
export type { CommitmentTheme };
