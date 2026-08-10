// Standardized company commitments ("Standards" tab): the universal-core +
// vertical question templates in src/data/questions.json instantiated for 13
// example Fortune 500 companies (one per vertical). Each template is filled
// with deterministic, company-scaled example values and emitted as a plain
// ForecastQuestion seed so the existing detail page, evidence, and history
// machinery apply unchanged (mirrors domain/competitors.ts).

import rawTemplates from "../data/questions.json";
import type { ForecastQuestion } from "./types";

const templates = rawTemplates as {
  universal_core: string[];
  segments: Record<string, string[]>;
};

// --- Verticals ---

export type VerticalId =
  | "banking_financial_services"
  | "tech_software_saas"
  | "consumer_tech_hardware_semis"
  | "retail_ecommerce"
  | "restaurants_consumer_services"
  | "cpg_food_beverage"
  | "healthcare_pharma"
  | "industrial_manufacturing"
  | "energy_utilities"
  | "telecom_media"
  | "transportation_logistics"
  | "automotive"
  | "real_estate_reits_homebuilders";

export const verticalOrder: VerticalId[] = [
  "banking_financial_services",
  "tech_software_saas",
  "consumer_tech_hardware_semis",
  "retail_ecommerce",
  "restaurants_consumer_services",
  "cpg_food_beverage",
  "healthcare_pharma",
  "industrial_manufacturing",
  "energy_utilities",
  "telecom_media",
  "transportation_logistics",
  "automotive",
  "real_estate_reits_homebuilders",
];

export const verticalLabels: Record<VerticalId, string> = {
  banking_financial_services: "Banking & Financial Services",
  tech_software_saas: "Tech, Software & SaaS",
  consumer_tech_hardware_semis: "Consumer Tech, Hardware & Semis",
  retail_ecommerce: "Retail & E-commerce",
  restaurants_consumer_services: "Restaurants & Consumer Services",
  cpg_food_beverage: "CPG, Food & Beverage",
  healthcare_pharma: "Healthcare & Pharma",
  industrial_manufacturing: "Industrial & Manufacturing",
  energy_utilities: "Energy & Utilities",
  telecom_media: "Telecom & Media",
  transportation_logistics: "Transportation & Logistics",
  automotive: "Automotive",
  real_estate_reits_homebuilders: "Real Estate, REITs & Homebuilders",
};

// --- Companies (one example Fortune 500 company per vertical) ---

export interface StandardsCompany {
  id: string;
  name: string;
  /** 1–2 letter monogram rendered as the avatar chip. */
  monogram: string;
  /** Brand accent color for the monogram chip. */
  color: string;
  verticalId: VerticalId;
  description: string;
  /** Approximate annual revenue in $M, used to scale example guidance values. */
  revenueM: number;
  /** Next quarterly earnings date — resolution for next-quarter commitments. */
  nextReportDate: string;
  /** Full-year results date — resolution for full-year commitments. */
  annualReportDate: string;
}

export const standardsCompanies: StandardsCompany[] = [
  {
    id: "jpmorgan",
    name: "JPMorgan Chase",
    monogram: "JP",
    color: "#1f4e9b",
    verticalId: "banking_financial_services",
    description:
      "Global bank spanning consumer banking, markets, investment banking, and asset & wealth management.",
    revenueM: 162000,
    nextReportDate: "2026-10-13",
    annualReportDate: "2027-01-15",
  },
  {
    id: "oracle",
    name: "Oracle",
    monogram: "OR",
    color: "#c74634",
    verticalId: "tech_software_saas",
    description:
      "Enterprise software and cloud infrastructure with fast-growing SaaS and OCI businesses.",
    revenueM: 53000,
    nextReportDate: "2026-09-10",
    annualReportDate: "2027-06-15",
  },
  {
    id: "apple",
    name: "Apple",
    monogram: "AP",
    color: "#3f3f46",
    verticalId: "consumer_tech_hardware_semis",
    description:
      "Consumer devices, custom silicon, and an expanding high-margin services attach business.",
    revenueM: 391000,
    nextReportDate: "2026-10-29",
    annualReportDate: "2027-01-28",
  },
  {
    id: "walmart",
    name: "Walmart",
    monogram: "WM",
    color: "#0071ce",
    verticalId: "retail_ecommerce",
    description:
      "Largest global retailer scaling e-commerce, retail media, and membership revenue streams.",
    revenueM: 648000,
    nextReportDate: "2026-11-19",
    annualReportDate: "2027-02-18",
  },
  {
    id: "mcdonalds",
    name: "McDonald's",
    monogram: "MC",
    color: "#da291c",
    verticalId: "restaurants_consumer_services",
    description:
      "Franchise-led global restaurant system focused on digital, delivery, and unit growth.",
    revenueM: 26000,
    nextReportDate: "2026-10-27",
    annualReportDate: "2027-01-27",
  },
  {
    id: "pg",
    name: "Procter & Gamble",
    monogram: "PG",
    color: "#005cb9",
    verticalId: "cpg_food_beverage",
    description:
      "Branded consumer staples portfolio managing volume, price/mix, and input-cost cycles.",
    revenueM: 84000,
    nextReportDate: "2026-10-20",
    annualReportDate: "2027-01-22",
  },
  {
    id: "pfizer",
    name: "Pfizer",
    monogram: "PF",
    color: "#0093d0",
    verticalId: "healthcare_pharma",
    description:
      "Global pharma balancing pipeline readouts against loss-of-exclusivity revenue cliffs.",
    revenueM: 59000,
    nextReportDate: "2026-11-03",
    annualReportDate: "2027-02-02",
  },
  {
    id: "caterpillar",
    name: "Caterpillar",
    monogram: "CA",
    color: "#a16207",
    verticalId: "industrial_manufacturing",
    description:
      "Heavy equipment and power systems manufacturer with a large aftermarket services base.",
    revenueM: 65000,
    nextReportDate: "2026-10-28",
    annualReportDate: "2027-01-29",
  },
  {
    id: "exxonmobil",
    name: "ExxonMobil",
    monogram: "XM",
    color: "#c81e1e",
    verticalId: "energy_utilities",
    description:
      "Integrated energy major spanning upstream production, refining, and low-carbon investments.",
    revenueM: 340000,
    nextReportDate: "2026-10-30",
    annualReportDate: "2027-01-29",
  },
  {
    id: "comcast",
    name: "Comcast",
    monogram: "CC",
    color: "#6d28d9",
    verticalId: "telecom_media",
    description:
      "Connectivity and media conglomerate balancing broadband, streaming, studios, and parks.",
    revenueM: 122000,
    nextReportDate: "2026-10-29",
    annualReportDate: "2027-01-28",
  },
  {
    id: "ups",
    name: "UPS",
    monogram: "UP",
    color: "#7c4a03",
    verticalId: "transportation_logistics",
    description:
      "Global parcel and logistics network managing volume, yield, and network utilization.",
    revenueM: 91000,
    nextReportDate: "2026-10-22",
    annualReportDate: "2027-01-28",
  },
  {
    id: "ford",
    name: "Ford",
    monogram: "F",
    color: "#1e40af",
    verticalId: "automotive",
    description:
      "Legacy automaker managing the EV transition alongside a profitable truck and fleet core.",
    revenueM: 176000,
    nextReportDate: "2026-10-27",
    annualReportDate: "2027-02-04",
  },
  {
    id: "drhorton",
    name: "D.R. Horton",
    monogram: "DH",
    color: "#0f766e",
    verticalId: "real_estate_reits_homebuilders",
    description:
      "Volume homebuilder managing closings, margins, and land pipeline through rate cycles.",
    revenueM: 36000,
    nextReportDate: "2026-10-27",
    annualReportDate: "2027-01-20",
  },
];

// --- Commitment taxonomy (question -> company + scope + theme) ---

export type CommitmentScope = "universal" | "vertical";

export type CommitmentTheme =
  | "Guidance"
  | "Growth"
  | "Margins & Costs"
  | "Capital & Cash"
  | "Operations"
  | "Risk & Liabilities";

export const commitmentThemeOrder: CommitmentTheme[] = [
  "Guidance",
  "Growth",
  "Margins & Costs",
  "Capital & Cash",
  "Operations",
  "Risk & Liabilities",
];

/** Links a forecast question to a standards company and commitment taxonomy. */
export interface StandardCommitment {
  questionId: string;
  companyId: string;
  verticalId: VerticalId;
  scope: CommitmentScope;
  theme: CommitmentTheme;
  /** Human-readable reporting window shown on the card. */
  horizon: string;
}

const THEME_RULES: [RegExp, CommitmentTheme][] = [
  [
    /litigation|contingent|provision|charge-off|non-performing|catastrophe|warranty|recall|impairment|write-down|loss reserve|cancellation|shrink|decommissioning|stress test|at risk|disruption|churn|attrition|hedging|delinquenc/i,
    "Risk & Liabilities",
  ],
  [
    /capex|free cash flow|buyback|dividend|share count|leverage|debt|working capital|capital ratio|cet1|refinancing|tax rate|stock-based|float|risk-weighted|book value|distribution guidance/i,
    "Capital & Cash",
  ],
  [
    /margin|ebitda|cost|expense|efficiency|sg&a|inflation|productivity|savings|markdown|combined ratio|operating ratio|trade spend/i,
    "Margins & Costs",
  ],
  [
    /uptime|utilization|inventory|lead time|headcount|on-time|occupancy|load factor|yield rate|turnover|cycle time|backlog|book-to-bill|dwell|reliability|days supply|days sales/i,
    "Operations",
  ],
  [
    /growth|net adds|subscriber|membership|expansion|launch|pipeline|orders|penetration|market share|conversion|new store|new unit|store count|traffic|enrollment|net inflows|openings/i,
    "Growth",
  ],
];

function themeFor(text: string): CommitmentTheme {
  for (const [re, theme] of THEME_RULES) if (re.test(text)) return theme;
  return "Guidance";
}

// --- Deterministic PRNG (same construction as seed.ts) ---

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

// --- Template filling helpers ---

type Rng = () => number;

function between(rng: Rng, lo: number, hi: number): number {
  return lo + rng() * (hi - lo);
}

function pick<T>(rng: Rng, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Round to a clean, guidance-looking figure. */
function clean(n: number): number {
  if (n >= 10000) return Math.round(n / 500) * 500;
  if (n >= 1000) return Math.round(n / 50) * 50;
  if (n >= 100) return Math.round(n / 5) * 5;
  if (n >= 10) return Math.round(n);
  return n;
}

/** Rounding granularity used by clean() at this magnitude. */
function stepFor(n: number): number {
  if (n >= 10000) return 500;
  if (n >= 1000) return 50;
  if (n >= 100) return 5;
  return 1;
}

type Range = [number, number];

function matchRange(text: string, rules: [RegExp, Range][], fallback: Range, rng: Rng): number {
  for (const [re, [lo, hi]] of rules) if (re.test(text)) return between(rng, lo, hi);
  return between(rng, fallback[0], fallback[1]);
}

// Percent magnitudes, keyed on what the template is measuring.
const PCT_RULES: [RegExp, Range][] = [
  [/uptime|sla|on-time|reliability/i, [99.0, 99.9]],
  [/combined ratio/i, [92, 97]],
  [/efficiency ratio/i, [55, 62]],
  [/medical loss ratio|mlr/i, [84, 88]],
  [/operating ratio/i, [58, 64]],
  [/net revenue retention|nrr/i, [104, 116]],
  [/gross retention/i, [88, 95]],
  [/rule of 40/i, [36, 46]],
  [/net interest margin|nim/i, [2.4, 3.4]],
  [/loan yield/i, [5, 7]],
  [/cost of deposits/i, [1.6, 2.8]],
  [
    /occupancy|load factor|retention|renewal|persistence|adherence|utilization|hedged|recovered|pass-through|new store productivity/i,
    [82, 96],
  ],
  [/gross margin/i, [30, 56]],
  [/operating margin|restaurant-level margin/i, [12, 28]],
  [/tax rate/i, [17, 23]],
  [
    /churn|attrition|cancellation|shrink|return rate|charge-off|non-performing|erosion|markdown|defect|catastrophe/i,
    [1.5, 9],
  ],
  [/cet1|capital ratio|rotce|allowed return|roe|reserve ratio|buffer/i, [9, 17]],
  [/success probability/i, [55, 75]],
  [/mix|penetration|as % of|% of|share guidance|attach rate|conversion rate/i, [12, 45]],
  [
    /growth|inflation|increase|comparable|same-store|expansion|price elasticity|decline|change/i,
    [2, 8],
  ],
];

// $M magnitudes as a fraction of annual revenue. The top-line revenue rule is
// anchored so sub-revenue lines ("services revenue guidance", ...) fall through.
const M_RULES: [RegExp, Range][] = [
  [/^(next-quarter|full-year) revenue guidance:/i, [0.95, 1.05]],
  [/organic sales|arr guidance|billings guidance/i, [0.95, 1.05]],
  [/closure|restructuring|impairment|write-down/i, [0.002, 0.008]],
  [/aftermarket|services revenue|parts/i, [0.08, 0.18]],
  [/free cash flow/i, [0.1, 0.16]],
  [/adjusted ebitda/i, [0.18, 0.3]],
  [
    /capex|capacity expansion|grid modernization|infrastructure|buildout|fleet renewal|fabs|remodels/i,
    [0.05, 0.1],
  ],
  [/r&d/i, [0.06, 0.12]],
  [/sg&a/i, [0.15, 0.24]],
  [/stock-based compensation/i, [0.02, 0.05]],
  [/buyback/i, [0.03, 0.08]],
  [/litigation|contingent/i, [0.004, 0.015]],
  [/content spend/i, [0.1, 0.16]],
  [/backlog|order book|order intake/i, [0.4, 1.2]],
];

// $B magnitudes as a multiple of annual revenue.
const B_RULES: [RegExp, Range][] = [
  [/assets under management|aum/i, [15, 25]],
  [/deposit/i, [10, 14]],
  [/risk-weighted|rwa/i, [8, 12]],
  [/net inflows|net flow/i, [1, 3]],
  [/mortgage origination/i, [2, 4]],
];

// Standalone $[X] magnitudes: [pattern, lo, hi, decimals].
const DOLLAR_RULES: [RegExp, number, number, number][] = [
  [/eps/i, 1.6, 5.5, 2],
  [/dividend per share|distribution guidance/i, 0.8, 3.2, 2],
  [/per gallon/i, 2.4, 3.2, 2],
  [/book value per share/i, 28, 90, 0],
  [/average home selling price/i, 330000, 440000, 0],
  [/average unit volume/i, 1800000, 3600000, 0],
  [/revpar/i, 105, 165, 0],
  [/average daily rate|adr/i, 150, 240, 0],
  [/arpu/i, 42, 78, 0],
  [/rasm|casm/i, 0.12, 0.18, 2],
  [/revenue per package/i, 10, 16, 2],
  [/refining|processing margin/i, 8, 20, 0],
  [/lease operating cost/i, 8, 15, 0],
  [/price realization/i, 60, 90, 0],
  [/margin per unit/i, 2500, 6000, 0],
  [/per vehicle|incentive spend/i, 1800, 4500, 0],
  [/cost per gross addition|cpga/i, 300, 600, 0],
  [/average selling price|average transaction price|average ticket|basket/i, 45, 900, 0],
  [/freight rate|per unit/i, 40, 400, 0],
];

// [X]M count magnitudes (millions of things).
const MCOUNT_RULES: [RegExp, Range][] = [
  [/homes passed/i, [30, 60]],
  [/installed base|devices/i, [400, 2200]],
  [/packages/i, [4500, 6500]],
  [/transaction count/i, [500, 1500]],
  [/net adds|subscriber/i, [1, 12]],
  [/members|customers|patients/i, [20, 260]],
  [/procedures/i, [5, 30]],
  [/carloads/i, [5, 12]],
  [/sq ft/i, [2, 15]],
  [/unit shipment|units|vehicles|deliveries/i, [1, 12]],
];

// Plain [X] magnitudes, keyed on the surrounding unit words.
const PLAIN_RULES: [RegExp, Range][] = [
  [/weeks/i, [4, 16]],
  [/days/i, [18, 60]],
  [/months/i, [5, 11]],
  [/years/i, [3, 7]],
  [/minutes/i, [80, 140]],
  [/lots/i, [350000, 650000]],
  [/mw\b|mw /i, [800, 4000]],
  [/wells/i, [150, 400]],
  [/units\/month/i, [4, 60]],
  [/reps/i, [500, 2000]],
  [/titles/i, [15, 40]],
  [/markets/i, [3, 10]],
  [/readouts/i, [2, 6]],
  [/large-customer|customer count/i, [1500, 6000]],
  [/net \[x\] stores|stores/i, [20, 160]],
  [/units\/rooms|rooms|units/i, [100, 1500]],
  [/projects/i, [8, 30]],
  [/routes/i, [10, 40]],
];

const DATE_POOL = [
  "2026-09-30",
  "2026-10-15",
  "2026-11-16",
  "2026-12-31",
  "2027-01-29",
  "2027-03-31",
];

function fillTemplate(template: string, rng: Rng, company: StandardsCompany): string {
  const nextQuarter = /^next-quarter/i.test(template);
  const quarterFactor = nextQuarter ? 0.25 : 1;
  let out = template;

  const pctValue = (): string => {
    const v = matchRange(out, PCT_RULES, [3, 15], rng);
    const decimals = v >= 99 ? 2 : v < 10 ? 1 : 0;
    return fmt(v, decimals);
  };

  // Paired / compound tokens first.
  out = out.replace(/\[X\]%\/\[Y\]%/g, () => {
    const a = Math.round(between(rng, 55, 78));
    return `${a}%/${100 - a}%`;
  });
  out = out.replace(
    /\[X\] \[boe\/d, MWh, etc\.\]/g,
    () => `${fmt(clean(between(rng, 2600, 4200)))} Kboe/d`,
  );
  out = out.replace(/\[X\] \[boe\/units\]/g, () => `${fmt(between(rng, 12, 22), 1)}B boe`);
  out = out.replace(
    /\[X\] per \[Y\] units/g,
    () => `${fmt(between(rng, 0.5, 3), 1)} per 1,000 units`,
  );

  // Ranges.
  out = out.replace(/\$\[low\]-\$\[high\]M/g, () => {
    const frac = matchRange(out, M_RULES, [0.01, 0.08], rng);
    const mid = clean(company.revenueM * frac * quarterFactor);
    const lo = clean(mid * (1 - between(rng, 0.015, 0.04)));
    let hi = clean(mid * (1 + between(rng, 0.015, 0.04)));
    if (hi <= lo) hi = lo + stepFor(lo);
    return `$${fmt(lo)}-$${fmt(hi)}M`;
  });
  out = out.replace(/\$\[low\]-\$\[high\]/g, () => {
    const lo = between(rng, 1.6, 5.2);
    const hi = lo + between(rng, 0.1, 0.3);
    return `$${fmt(lo, 2)}-$${fmt(hi, 2)}`;
  });
  out = out.replace(/\[low\]-\[high\]%/g, () => {
    const base = matchRange(out, PCT_RULES, [3, 15], rng);
    let spread = Math.max(0.3, base * between(rng, 0.04, 0.12));
    // Ratios that live near 100% (uptime, on-time, occupancy) must stay below it.
    if (base >= 95 && base <= 100) spread = Math.min(spread, 99.95 - base);
    const decimals = base >= 99 && base <= 100 ? 2 : base < 10 ? 1 : 0;
    return `${fmt(base, decimals)}-${fmt(base + spread, decimals)}%`;
  });

  // Dollar values.
  out = out.replace(/\$\[[XY]\]M/g, () => {
    const frac = matchRange(out, M_RULES, [0.01, 0.08], rng);
    return `$${fmt(clean(company.revenueM * frac * quarterFactor))}M`;
  });
  out = out.replace(/\$\[[XY]\]B/g, () => {
    const mult = matchRange(out, B_RULES, [0.3, 1.2], rng);
    const v = (company.revenueM * mult) / 1000;
    return `$${fmt(v, v < 10 ? 1 : 0)}B`;
  });
  out = out.replace(/\$\[[XY]\]/g, () => {
    for (const [re, lo, hi, decimals] of DOLLAR_RULES) {
      if (re.test(out)) return `$${fmt(clean(between(rng, lo, hi)), decimals)}`;
    }
    return `$${fmt(clean(between(rng, 20, 400)))}`;
  });

  // Counts and multipliers.
  out = out.replace(/\[[XY]\]bps/g, () => pick(rng, ["25bps", "50bps"]));
  out = out.replace(/\[[XY]\]M/g, () => {
    if (/shares/i.test(out)) return `${fmt(clean(company.revenueM / between(rng, 40, 90)))}M`;
    return `${fmt(clean(matchRange(out, MCOUNT_RULES, [5, 150], rng)))}M`;
  });
  out = out.replace(/\[[XY]\]x/g, () => {
    if (/book-to-bill/i.test(out)) return `${fmt(between(rng, 0.9, 1.2), 2)}x`;
    if (/magic number/i.test(out)) return `${fmt(between(rng, 0.7, 1.2), 2)}x`;
    if (/leverage|net debt/i.test(out)) return `${fmt(between(rng, 1.5, 3), 1)}x`;
    if (/turnover/i.test(out)) return `${fmt(between(rng, 3, 8), 1)}x`;
    return `${fmt(between(rng, 1, 3), 1)}x`;
  });
  out = out.replace(/\[[XY]\]%/g, () => `${pctValue()}%`);

  // Categorical / textual tokens.
  out = out.replace(/\[beat\/met\/missed\]/g, () => pick(rng, ["beat", "met", "missed"]));
  out = out.replace(/\[gap direction\]/g, () =>
    pick(rng, ["consensus above midpoint", "midpoint above consensus", "roughly in line"]),
  );
  out = out.replace(/\[II\/III\]/g, () => pick(rng, ["II", "III"]));
  out = out.replace(/\[unit\]/g, () => "barrel");
  out = out.replace(/\[category\]/g, () =>
    pick(rng, ["e-commerce", "grocery", "services", "private label"]),
  );
  out = out.replace(/\[year\]/g, () => String(pick(rng, [2027, 2028, 2029, 2030])));
  out = out.replace(/\[date\]/g, () =>
    nextQuarter ? company.nextReportDate : pick(rng, DATE_POOL),
  );

  // Remaining bare [X]/[Y] numbers.
  out = out.replace(/\[[XY]\]/g, () => {
    if (/employees|headcount/i.test(out)) {
      return fmt(clean(company.revenueM * between(rng, 1.5, 3)));
    }
    if (/score|scale/i.test(out)) return fmt(between(rng, 4.2, 4.7), 1);
    return fmt(clean(matchRange(out, PLAIN_RULES, [10, 100], rng)));
  });

  return out;
}

/** Collapse the stray embedded newlines/indentation present in the JSON strings. */
function normalize(template: string): string {
  return template.replace(/\s+/g, " ").trim();
}

// --- Seed generation ---

/** Mirrors seed.ts QSeed so these rows drop straight into the generator. */
export type StandardsQuestionSeed = Omit<ForecastQuestion, "id"> & {
  id: string;
  initial: number;
  triggers?: string[];
};

const EARNINGS_TRIGGERS = [
  "Earnings call transcript analyzed",
  "10-Q filing ingested",
  "Sell-side consensus revision detected",
  "Management guidance reaffirmed",
  "Channel-check data ingested",
  "8-K filing parsed",
  "Investor-day commentary analyzed",
];

const OPEN_DATES = ["2026-02-02", "2026-03-02", "2026-04-01", "2026-05-01"];

function buildSeeds(): { seeds: StandardsQuestionSeed[]; commitments: StandardCommitment[] } {
  const seeds: StandardsQuestionSeed[] = [];
  const commitments: StandardCommitment[] = [];

  for (const company of standardsCompanies) {
    const rows = [
      ...templates.universal_core.map((t, i) => ({ t, scope: "universal" as const, idx: i })),
      ...(templates.segments[company.verticalId] ?? []).map((t, i) => ({
        t,
        scope: "vertical" as const,
        idx: i,
      })),
    ];

    for (const { t, scope, idx } of rows) {
      const id = `q-std-${company.id}-${scope === "universal" ? "u" : "v"}${idx + 1}`;
      const rng = seeded(id);
      const template = normalize(t);
      const filled = fillTemplate(template, rng, company);
      const nextQuarter = /^next-quarter/i.test(template);
      const resolutionDate = nextQuarter ? company.nextReportDate : company.annualReportDate;
      const initial = 0.45 + rng() * 0.4;
      const impactScore = 0.35 + rng() * 0.45;

      seeds.push({
        id,
        title: filled.replace(/\.$/, ""),
        preciseDefinition: `Standardized ${
          scope === "universal" ? "universal core" : verticalLabels[company.verticalId]
        } commitment for ${company.name}: "${filled}" The company reports the actual figure in its ${
          nextQuarter ? "next quarterly" : "full-year"
        } earnings report on ${resolutionDate}.`,
        category: "Financial",
        type: "binary",
        riskOrOpportunity: "opportunity",
        impactEstimate: "Guidance credibility with investors and the board",
        impactLevel: impactScore > 0.72 ? "high" : impactScore > 0.5 ? "medium" : "low",
        impactScore: Number(impactScore.toFixed(2)),
        resolutionCriteria: `Resolves YES if ${company.name}'s reported actual meets or lands within the committed value in this standard, per the ${
          nextQuarter ? "next quarterly" : "full-year"
        } earnings release.`,
        resolutionSource: `${company.name} earnings release / SEC filings`,
        openDate: pick(rng, OPEN_DATES),
        resolutionDate,
        status: "open",
        visibility: "public",
        owningTeam: "Finance",
        createdBy: "u-exec",
        priorBaseRate: Number(
          Math.min(0.9, Math.max(0.1, initial + (rng() - 0.5) * 0.1)).toFixed(2),
        ),
        initial: Number(initial.toFixed(2)),
        triggers: EARNINGS_TRIGGERS,
      });

      commitments.push({
        questionId: id,
        companyId: company.id,
        verticalId: company.verticalId,
        scope,
        theme: themeFor(template),
        horizon: nextQuarter ? "Next earnings report" : "Full fiscal year",
      });
    }
  }

  return { seeds, commitments };
}

const built = buildSeeds();

export const standardsQuestionSeeds: StandardsQuestionSeed[] = built.seeds;
export const standardCommitments: StandardCommitment[] = built.commitments;

// --- Lookups / helpers ---

const companyIndex = new Map(standardsCompanies.map((c) => [c.id, c]));
const commitmentByQuestion = new Map(standardCommitments.map((c) => [c.questionId, c]));

export function standardsCompanyById(id: string): StandardsCompany | undefined {
  return companyIndex.get(id);
}

export function commitmentForQuestion(questionId: string): StandardCommitment | undefined {
  return commitmentByQuestion.get(questionId);
}

export function standardsCompanyForQuestion(questionId: string): StandardsCompany | undefined {
  const commitment = commitmentByQuestion.get(questionId);
  return commitment ? companyIndex.get(commitment.companyId) : undefined;
}

export function isStandardsQuestion(questionId: string): boolean {
  return commitmentByQuestion.has(questionId);
}
