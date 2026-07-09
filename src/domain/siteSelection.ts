// Predictive site selection: candidate sites as forecast questions.
//
// A CandidateSite is the physical asset under evaluation; its forecast
// (probability of hitting the underwriting target) lives in a standard
// ForecastQuestion so the whole existing engine/visibility/history stack
// applies unchanged. Coordinates are normalized [0,1] on a fictional metro
// map so no live mapping dependency is needed; the schema is ready for real
// lat/lng later.

import type { ForecastQuestion } from "./types";
import type { DemandPoint, GravitySite } from "./tradeArea";

export type AssetClass = "retail" | "industrial";
export type SiteStatus = "candidate" | "operating";

export interface CandidateSite {
  id: string;
  name: string;
  submarket: string;
  assetClass: AssetClass;
  status: SiteStatus;
  /** Normalized map coordinates in [0,1] (Harbor City metro map). */
  x: number;
  y: number;
  /**
   * Gravity-model attractiveness proxy. Retail: selling sqft (000s) adjusted
   * for visibility/co-tenancy. Industrial: not used by the gravity model.
   */
  attractiveness: number;
  /** Gross square footage (000s). */
  sqft: number;
  /** The underwriting target the forecast question resolves against. */
  targetMetric: string;
  /** Backing forecast question (operating sites have none). */
  questionId?: string;
}

export const METRO_NAME = "Harbor City metro";

export const SUBMARKETS = [
  "Downtown Core",
  "Northgate",
  "Eastbank",
  "University District",
  "Harbor Point",
  "Airport District",
  "South Industrial",
] as const;

export type Submarket = (typeof SUBMARKETS)[number];

export const candidateSites: CandidateSite[] = [
  // --- Retail / QSR candidates ---
  {
    id: "site-maple",
    name: "Maple & 3rd",
    submarket: "Downtown Core",
    assetClass: "retail",
    status: "candidate",
    x: 0.46,
    y: 0.52,
    attractiveness: 3.4,
    sqft: 3.2,
    targetMetric: "≥ $2.4M first-year revenue",
    questionId: "q-site-maple",
  },
  {
    id: "site-northgate",
    name: "Northgate Promenade",
    submarket: "Northgate",
    assetClass: "retail",
    status: "candidate",
    x: 0.38,
    y: 0.18,
    attractiveness: 4.1,
    sqft: 4.0,
    targetMetric: "≥ $2.8M first-year revenue",
    questionId: "q-site-northgate",
  },
  {
    id: "site-eastbank",
    name: "Eastbank Landing",
    submarket: "Eastbank",
    assetClass: "retail",
    status: "candidate",
    x: 0.72,
    y: 0.42,
    attractiveness: 2.6,
    sqft: 2.5,
    targetMetric: "≥ $1.9M first-year revenue",
    questionId: "q-site-eastbank",
  },
  {
    id: "site-university",
    name: "University Commons",
    submarket: "University District",
    assetClass: "retail",
    status: "candidate",
    x: 0.6,
    y: 0.25,
    attractiveness: 3.0,
    sqft: 2.8,
    targetMetric: "≥ $2.2M first-year revenue",
    questionId: "q-site-university",
  },
  {
    id: "site-harborpoint",
    name: "Harbor Point Pavilion",
    submarket: "Harbor Point",
    assetClass: "retail",
    status: "candidate",
    x: 0.24,
    y: 0.62,
    attractiveness: 2.2,
    sqft: 2.1,
    targetMetric: "≥ $1.7M first-year revenue",
    questionId: "q-site-harborpoint",
  },
  // --- Operating retail portfolio (cannibalization exposure) ---
  {
    id: "site-midtown",
    name: "Midtown Flagship",
    submarket: "Downtown Core",
    assetClass: "retail",
    status: "operating",
    x: 0.5,
    y: 0.4,
    attractiveness: 5.2,
    sqft: 5.0,
    targetMetric: "Operating — $4.1M trailing revenue",
  },
  {
    id: "site-westfield",
    name: "Westfield Crossing",
    submarket: "Harbor Point",
    assetClass: "retail",
    status: "operating",
    x: 0.3,
    y: 0.48,
    attractiveness: 3.6,
    sqft: 3.5,
    targetMetric: "Operating — $2.9M trailing revenue",
  },
  // --- Industrial / logistics candidates ---
  {
    id: "site-airport",
    name: "Airport Logistics Park — Lot 7",
    submarket: "Airport District",
    assetClass: "industrial",
    status: "candidate",
    x: 0.82,
    y: 0.72,
    attractiveness: 0,
    sqft: 420,
    targetMetric: "Rezoning approved before break-ground date",
    questionId: "q-site-airport",
  },
  {
    id: "site-southloop",
    name: "South Loop Distribution Center",
    submarket: "South Industrial",
    assetClass: "industrial",
    status: "candidate",
    x: 0.55,
    y: 0.85,
    attractiveness: 0,
    sqft: 310,
    targetMetric: "≥ 85% throughput utilization in year 1",
    questionId: "q-site-southloop",
  },
  {
    id: "site-riverside",
    name: "Riverside Industrial Campus",
    submarket: "South Industrial",
    assetClass: "industrial",
    status: "candidate",
    x: 0.35,
    y: 0.78,
    attractiveness: 0,
    sqft: 260,
    targetMetric: "Full staffing (250 FTE) within 6 months of opening",
    questionId: "q-site-riverside",
  },
];

const siteById = new Map(candidateSites.map((s) => [s.id, s]));
const siteByQuestion = new Map(
  candidateSites.filter((s) => s.questionId).map((s) => [s.questionId!, s])
);

export function siteForId(siteId: string): CandidateSite | undefined {
  return siteById.get(siteId);
}

export function siteForQuestion(questionId: string): CandidateSite | undefined {
  return siteByQuestion.get(questionId);
}

/** Visible open Real Estate forecast questions. */
export function siteQuestions(questions: ForecastQuestion[]): ForecastQuestion[] {
  return questions.filter((q) => q.category === "Real Estate" && q.status === "open");
}

export const ASSET_CLASS_LABEL: Record<AssetClass, string> = {
  retail: "Retail / QSR",
  industrial: "Industrial / Logistics",
};

// --- Demand grid (population cells for the gravity model) ---
//
// A hand-authored grid of population cells over the fictional metro. In
// production this would come from Census/ACS block groups; the shape is
// identical so the swap doesn't reshape the model.

export const demandGrid: DemandPoint[] = [
  { id: "cell-dt-1", x: 0.45, y: 0.45, population: 18400 },
  { id: "cell-dt-2", x: 0.52, y: 0.5, population: 16200 },
  { id: "cell-dt-3", x: 0.48, y: 0.58, population: 12800 },
  { id: "cell-ng-1", x: 0.36, y: 0.14, population: 14600 },
  { id: "cell-ng-2", x: 0.42, y: 0.22, population: 13100 },
  { id: "cell-ng-3", x: 0.3, y: 0.24, population: 9800 },
  { id: "cell-eb-1", x: 0.7, y: 0.38, population: 11900 },
  { id: "cell-eb-2", x: 0.76, y: 0.48, population: 8700 },
  { id: "cell-uni-1", x: 0.58, y: 0.2, population: 15400 },
  { id: "cell-uni-2", x: 0.64, y: 0.28, population: 10600 },
  { id: "cell-hp-1", x: 0.22, y: 0.56, population: 9200 },
  { id: "cell-hp-2", x: 0.28, y: 0.66, population: 7900 },
  { id: "cell-hp-3", x: 0.34, y: 0.55, population: 8800 },
  { id: "cell-air-1", x: 0.8, y: 0.66, population: 5200 },
  { id: "cell-si-1", x: 0.5, y: 0.8, population: 6400 },
  { id: "cell-si-2", x: 0.4, y: 0.74, population: 7100 },
];

/**
 * Average annual spend per captured resident at our brand (mock, USD).
 * Calibrated so gravity-implied revenues land near the underwriting targets
 * (ratios ~0.8–1.2x), giving forecasts a realistic probability spread.
 */
export const AVG_ANNUAL_SPEND = 85;

/** Default Huff distance-decay exponent used across the tab. */
export const DEFAULT_BETA = 2.0;

/** Retail sites as gravity-model inputs. */
export function gravitySitesFrom(sites: CandidateSite[]): GravitySite[] {
  return sites
    .filter((s) => s.assetClass === "retail")
    .map((s) => ({ id: s.id, x: s.x, y: s.y, attractiveness: s.attractiveness }));
}

/** Operating retail sites (the cannibalization exposure set). */
export function operatingRetailSites(): CandidateSite[] {
  return candidateSites.filter((s) => s.assetClass === "retail" && s.status === "operating");
}

/** Candidate retail sites (gravity-model entrants). */
export function candidateRetailSites(): CandidateSite[] {
  return candidateSites.filter((s) => s.assetClass === "retail" && s.status === "candidate");
}
