// Real-estate market signals as forecast evidence.
//
// Mirrors alerts.ts: signals from upstream sources (permit portals, competitor
// trackers, census updates, comps feeds, traffic counts, broker intel) are
// treated as EVIDENCE that moves one or more site forecast questions. Each
// signal can map to multiple questions via SignalForecastImpact, and
// materiality filtering separates raw noise from probability-moving signal.

import type { Confidence } from "./types";

export type SignalSource =
  | "City Permit Portal"
  | "Zoning Board"
  | "Competitor Tracker"
  | "Census / ACS Update"
  | "Comps Feed"
  | "Traffic Counts"
  | "Broker Intel"
  | "Labor Market Feed"
  | "DOT Roadworks";

export type SignalSeverity = "low" | "medium" | "high" | "critical";

export type SignalStatus = "new" | "monitoring" | "confirmed" | "dismissed";

/** A normalized event/finding from an upstream real-estate data source. */
export interface SiteSignal {
  id: string;
  source: SignalSource;
  sourceUrl?: string;
  timestamp: string; // ISO
  severity: SignalSeverity;
  title: string;
  description: string;
  affectedSites: string[]; // CandidateSite ids
  submarket?: string;
  status: SignalStatus;
  owner: string;
  confidence: Confidence;
  /** True when the signal influences at least one forecast. */
  forecastRelevant: boolean;
}

/** How much a specific signal moved a specific question, and why. */
export interface SignalForecastImpact {
  signalId: string;
  questionId: string;
  /** Signed probability delta, e.g. +0.032 = +3.2pp. */
  probabilityDelta: number;
  direction: "increase" | "decrease";
  confidence: Confidence;
  reason: string;
}

/**
 * Raw signal volume received per source. The seed `siteSignals` below are the
 * forecast-relevant subset; these totals simulate the full firehose so the
 * signal-to-forecast conversion module can show how much noise is filtered.
 */
export const signalSourceVolume: Record<SignalSource, number> = {
  "City Permit Portal": 214,
  "Zoning Board": 31,
  "Competitor Tracker": 96,
  "Census / ACS Update": 18,
  "Comps Feed": 142,
  "Traffic Counts": 88,
  "Broker Intel": 42,
  "Labor Market Feed": 26,
  "DOT Roadworks": 54,
};

export const siteSignals: SiteSignal[] = [
  {
    id: "s-competitor-permit",
    source: "City Permit Portal",
    sourceUrl: "https://permits.harborcity.example.gov/BLD-2026-08841",
    timestamp: "2026-06-26T15:20:00Z",
    severity: "high",
    title: "Competitor QSR files build-out permit two blocks from Maple & 3rd",
    description:
      "A national QSR brand filed a tenant-improvement permit at 5th & Pine, ~300m from the Maple & 3rd candidate. Estimated open within 8 months.",
    affectedSites: ["site-maple", "site-midtown"],
    submarket: "Downtown Core",
    status: "confirmed",
    owner: "Market Intelligence",
    confidence: "high",
    forecastRelevant: true,
  },
  {
    id: "s-northgate-anchor",
    source: "Broker Intel",
    timestamp: "2026-06-25T18:05:00Z",
    severity: "high",
    title: "Grocery anchor signs LOI at Northgate Promenade",
    description:
      "Listing broker confirms a regional grocery anchor signed a letter of intent for the 42k sqft anchor pad. Anchor-driven traffic typically lifts inline QSR sales 8-15%.",
    affectedSites: ["site-northgate"],
    submarket: "Northgate",
    status: "confirmed",
    owner: "Real Estate Team",
    confidence: "medium",
    forecastRelevant: true,
  },
  {
    id: "s-acs-northgate",
    source: "Census / ACS Update",
    sourceUrl: "https://data.census.gov/",
    timestamp: "2026-06-24T09:00:00Z",
    severity: "medium",
    title: "ACS update: Northgate population +4.1% YoY, median income +6%",
    description:
      "The latest ACS 1-year estimates show the Northgate submarket growing well above metro average, driven by two delivered multifamily projects.",
    affectedSites: ["site-northgate"],
    submarket: "Northgate",
    status: "confirmed",
    owner: "Analytics",
    confidence: "high",
    forecastRelevant: true,
  },
  {
    id: "s-eastbank-roadworks",
    source: "DOT Roadworks",
    sourceUrl: "https://dot.harborcity.example.gov/projects/eastbank-bridge",
    timestamp: "2026-06-27T07:45:00Z",
    severity: "medium",
    title: "Eastbank bridge rehab extends lane closures through Q2 2027",
    description:
      "DOT extended the Eastbank bridge rehabilitation schedule by 9 months. Peak-hour access to the Eastbank Landing pad degrades materially during closures.",
    affectedSites: ["site-eastbank"],
    submarket: "Eastbank",
    status: "monitoring",
    owner: "Real Estate Team",
    confidence: "high",
    forecastRelevant: true,
  },
  {
    id: "s-university-traffic",
    source: "Traffic Counts",
    timestamp: "2026-06-23T12:30:00Z",
    severity: "medium",
    title: "University District pedestrian counts +12% vs. prior spring",
    description:
      "Spring pedestrian counters on the University Commons block show sustained 12% growth, consistent with the enrollment increase announced in March.",
    affectedSites: ["site-university"],
    submarket: "University District",
    status: "confirmed",
    owner: "Analytics",
    confidence: "medium",
    forecastRelevant: true,
  },
  {
    id: "s-university-summer",
    source: "Comps Feed",
    timestamp: "2026-06-21T10:15:00Z",
    severity: "low",
    title: "Comp set shows 22% summer revenue trough in university trade areas",
    description:
      "Comparable university-adjacent stores in the comps panel show deeper seasonal troughs than underwritten, pressuring the first-year revenue target.",
    affectedSites: ["site-university"],
    submarket: "University District",
    status: "monitoring",
    owner: "Analytics",
    confidence: "medium",
    forecastRelevant: true,
  },
  {
    id: "s-harborpoint-comp",
    source: "Comps Feed",
    timestamp: "2026-06-26T11:40:00Z",
    severity: "medium",
    title: "Two Harbor Point comps miss first-year targets by >10%",
    description:
      "The two most comparable recent openings in Harbor Point-like submarkets both landed 10-14% under their first-year revenue plans.",
    affectedSites: ["site-harborpoint"],
    submarket: "Harbor Point",
    status: "confirmed",
    owner: "Analytics",
    confidence: "medium",
    forecastRelevant: true,
  },
  {
    id: "s-harborpoint-closure",
    source: "Competitor Tracker",
    timestamp: "2026-06-22T16:00:00Z",
    severity: "medium",
    title: "Competing sandwich chain closing its Harbor Point unit",
    description:
      "A direct competitor announced closure of its Harbor Point location effective August, releasing an estimated $0.6M of annual demand into the trade area.",
    affectedSites: ["site-harborpoint", "site-westfield"],
    submarket: "Harbor Point",
    status: "confirmed",
    owner: "Market Intelligence",
    confidence: "high",
    forecastRelevant: true,
  },
  {
    id: "s-airport-zoning-docket",
    source: "Zoning Board",
    sourceUrl: "https://zoning.harborcity.example.gov/dockets/Z-2026-114",
    timestamp: "2026-06-27T09:30:00Z",
    severity: "high",
    title: "Lot 7 rezoning docketed for August hearing with staff support",
    description:
      "The rezoning application for Airport Logistics Park Lot 7 was docketed for the August 12 hearing. Planning staff report recommends approval with standard traffic conditions.",
    affectedSites: ["site-airport"],
    submarket: "Airport District",
    status: "confirmed",
    owner: "Entitlements",
    confidence: "high",
    forecastRelevant: true,
  },
  {
    id: "s-airport-opposition",
    source: "Zoning Board",
    timestamp: "2026-06-24T14:10:00Z",
    severity: "medium",
    title: "Neighborhood association files opposition to Lot 7 truck routing",
    description:
      "The Airport District neighborhood association filed a formal objection citing truck traffic on Ellis Road. Similar objections delayed (but did not kill) two prior industrial rezonings.",
    affectedSites: ["site-airport"],
    submarket: "Airport District",
    status: "monitoring",
    owner: "Entitlements",
    confidence: "medium",
    forecastRelevant: true,
  },
  {
    id: "s-southloop-tenant",
    source: "Broker Intel",
    timestamp: "2026-06-25T13:50:00Z",
    severity: "high",
    title: "3PL tenant in advanced talks for 40% of South Loop DC",
    description:
      "A national 3PL is in lease negotiation for 120k sqft of the South Loop Distribution Center, which would de-risk a large share of the year-1 utilization target.",
    affectedSites: ["site-southloop"],
    submarket: "South Industrial",
    status: "monitoring",
    owner: "Leasing",
    confidence: "medium",
    forecastRelevant: true,
  },
  {
    id: "s-southloop-supply",
    source: "Comps Feed",
    timestamp: "2026-06-20T08:20:00Z",
    severity: "medium",
    title: "1.1M sqft of competing big-box supply delivering within 12 months",
    description:
      "Three competing distribution projects within the South Industrial corridor deliver in the next four quarters, roughly doubling available big-box supply.",
    affectedSites: ["site-southloop", "site-riverside"],
    submarket: "South Industrial",
    status: "confirmed",
    owner: "Analytics",
    confidence: "high",
    forecastRelevant: true,
  },
  {
    id: "s-riverside-labor",
    source: "Labor Market Feed",
    timestamp: "2026-06-26T10:00:00Z",
    severity: "high",
    title: "Warehouse wage index +9% YoY in the southern corridor",
    description:
      "Posted warehouse wages within a 20-minute commute of Riverside rose 9% YoY with posting durations lengthening — a tightening labor pool for the 250-FTE staffing plan.",
    affectedSites: ["site-riverside", "site-southloop"],
    submarket: "South Industrial",
    status: "confirmed",
    owner: "People Analytics",
    confidence: "high",
    forecastRelevant: true,
  },
  {
    id: "s-riverside-transit",
    source: "DOT Roadworks",
    timestamp: "2026-06-23T15:30:00Z",
    severity: "low",
    title: "New bus rapid transit stop approved 400m from Riverside campus",
    description:
      "The transit authority approved a BRT stop serving the Riverside Industrial Campus, expanding the non-driving labor catchment for shift workers.",
    affectedSites: ["site-riverside"],
    submarket: "South Industrial",
    status: "confirmed",
    owner: "Entitlements",
    confidence: "medium",
    forecastRelevant: true,
  },
  {
    id: "s-maple-rent",
    source: "Comps Feed",
    timestamp: "2026-06-24T17:25:00Z",
    severity: "low",
    title: "Downtown Core asking rents +7% since underwriting",
    description:
      "Asking rents for comparable downtown pads moved +7% since the Maple & 3rd pro forma was built, compressing the margin cushion under the revenue target.",
    affectedSites: ["site-maple"],
    submarket: "Downtown Core",
    status: "confirmed",
    owner: "Real Estate Team",
    confidence: "medium",
    forecastRelevant: true,
  },
];

/** Signal -> question impact edges. One signal can move multiple questions. */
export const signalImpacts: SignalForecastImpact[] = [
  { signalId: "s-competitor-permit", questionId: "q-site-maple", probabilityDelta: -0.045, direction: "decrease", confidence: "high", reason: "A same-category competitor opening 300m away pulls trade-area share directly from the candidate's core catchment." },
  { signalId: "s-northgate-anchor", questionId: "q-site-northgate", probabilityDelta: 0.05, direction: "increase", confidence: "medium", reason: "A signed grocery anchor materially raises center foot traffic; comparable anchor-adjacent units run 8-15% above plan." },
  { signalId: "s-acs-northgate", questionId: "q-site-northgate", probabilityDelta: 0.022, direction: "increase", confidence: "high", reason: "Above-metro population and income growth expand the addressable spend inside the trade area." },
  { signalId: "s-eastbank-roadworks", questionId: "q-site-eastbank", probabilityDelta: -0.035, direction: "decrease", confidence: "high", reason: "Extended lane closures degrade peak-hour access through the opening year, suppressing early trade-area capture." },
  { signalId: "s-university-traffic", questionId: "q-site-university", probabilityDelta: 0.025, direction: "increase", confidence: "medium", reason: "Sustained pedestrian-count growth on the block is a leading indicator of transaction volume." },
  { signalId: "s-university-summer", questionId: "q-site-university", probabilityDelta: -0.015, direction: "decrease", confidence: "medium", reason: "Comps show deeper summer troughs than underwritten, pressuring the first-year revenue target." },
  { signalId: "s-harborpoint-comp", questionId: "q-site-harborpoint", probabilityDelta: -0.03, direction: "decrease", confidence: "medium", reason: "The two closest comparables both missed first-year plans by >10%, weakening the outside view." },
  { signalId: "s-harborpoint-closure", questionId: "q-site-harborpoint", probabilityDelta: 0.028, direction: "increase", confidence: "high", reason: "A direct competitor's exit releases established demand into the candidate's catchment." },
  { signalId: "s-airport-zoning-docket", questionId: "q-site-airport", probabilityDelta: 0.06, direction: "increase", confidence: "high", reason: "A docketed hearing with a supportive staff report is the strongest single predictor of rezoning approval." },
  { signalId: "s-airport-opposition", questionId: "q-site-airport", probabilityDelta: -0.025, direction: "decrease", confidence: "medium", reason: "Formal neighborhood opposition historically adds delay risk and conditions, occasionally derailing approval." },
  { signalId: "s-southloop-tenant", questionId: "q-site-southloop", probabilityDelta: 0.045, direction: "increase", confidence: "medium", reason: "An advanced-stage 3PL lease would de-risk ~40% of the year-1 utilization target in one signature." },
  { signalId: "s-southloop-supply", questionId: "q-site-southloop", probabilityDelta: -0.03, direction: "decrease", confidence: "high", reason: "Competing big-box supply doubling within 12 months weakens pricing power and absorption pace." },
  { signalId: "s-southloop-supply", questionId: "q-site-riverside", probabilityDelta: -0.012, direction: "decrease", confidence: "medium", reason: "Corridor-wide supply competition also bids up the shared labor pool Riverside depends on." },
  { signalId: "s-riverside-labor", questionId: "q-site-riverside", probabilityDelta: -0.04, direction: "decrease", confidence: "high", reason: "A 9% wage spike with longer posting durations directly threatens the 250-FTE staffing plan." },
  { signalId: "s-riverside-labor", questionId: "q-site-southloop", probabilityDelta: -0.01, direction: "decrease", confidence: "medium", reason: "Labor tightening raises operating cost assumptions embedded in the utilization target." },
  { signalId: "s-riverside-transit", questionId: "q-site-riverside", probabilityDelta: 0.02, direction: "increase", confidence: "medium", reason: "A BRT stop expands the non-driving labor catchment, easing shift-worker recruiting." },
  { signalId: "s-maple-rent", questionId: "q-site-maple", probabilityDelta: -0.012, direction: "decrease", confidence: "medium", reason: "Higher rent raises the revenue bar implicitly required for the site to clear its underwriting." },
];

const MATERIAL_DELTA = 0.01;

/** A meaningful probability move. */
export function isMaterialMover(impact: SignalForecastImpact): boolean {
  return Math.abs(impact.probabilityDelta) >= MATERIAL_DELTA;
}

const signalById = new Map(siteSignals.map((s) => [s.id, s]));

export function signalForId(signalId: string): SiteSignal | undefined {
  return signalById.get(signalId);
}

/** Impacts affecting a given question, largest absolute move first. */
export function impactsForQuestion(questionId: string): SignalForecastImpact[] {
  return signalImpacts
    .filter((i) => i.questionId === questionId)
    .sort((a, b) => Math.abs(b.probabilityDelta) - Math.abs(a.probabilityDelta));
}

export interface SignalWithImpact {
  signal: SiteSignal;
  impact: SignalForecastImpact;
}

/** Signals associated with a question, joined with their impact, newest first. */
export function signalsForQuestion(questionId: string): SignalWithImpact[] {
  return impactsForQuestion(questionId)
    .map((impact) => {
      const signal = signalById.get(impact.signalId);
      return signal ? { signal, impact } : null;
    })
    .filter((x): x is SignalWithImpact => x !== null)
    .sort((a, b) => b.signal.timestamp.localeCompare(a.signal.timestamp));
}

/** Number of signals associated with a question. */
export function relatedSignalCount(questionId: string): number {
  return signalImpacts.filter((i) => i.questionId === questionId).length;
}

export interface SignalImpactFeedItem {
  signal: SiteSignal;
  impacts: (SignalForecastImpact & { questionTitle: string })[];
  topMagnitude: number;
}

/**
 * Signal impact feed: forecast-relevant signals grouped with every question
 * they moved, ordered by recency then by the size of their largest move.
 */
export function signalImpactFeed(
  questionTitle: (questionId: string) => string | undefined,
  visibleQuestionIds: Set<string>
): SignalImpactFeedItem[] {
  const items: SignalImpactFeedItem[] = [];
  for (const signal of siteSignals) {
    if (!signal.forecastRelevant) continue;
    const impacts = signalImpacts
      .filter((i) => i.signalId === signal.id && visibleQuestionIds.has(i.questionId))
      .map((i) => ({ ...i, questionTitle: questionTitle(i.questionId) ?? i.questionId }))
      .sort((a, b) => Math.abs(b.probabilityDelta) - Math.abs(a.probabilityDelta));
    if (impacts.length === 0) continue;
    items.push({
      signal,
      impacts,
      topMagnitude: Math.max(...impacts.map((i) => Math.abs(i.probabilityDelta))),
    });
  }
  return items.sort(
    (a, b) => b.signal.timestamp.localeCompare(a.signal.timestamp) || b.topMagnitude - a.topMagnitude
  );
}

export interface SignalConversionRow {
  source: SignalSource;
  received: number;
  forecastRelevant: number;
  materialMovers: number;
}

/**
 * Signal-to-forecast conversion: for each source, raw signals received, how
 * many were forecast-relevant, and how many were material movers. Only counts
 * impacts on questions the caller can see.
 */
export function signalConversionStats(visibleQuestionIds: Set<string>): SignalConversionRow[] {
  const relevantIds = new Set<string>();
  const materialIds = new Set<string>();
  for (const impact of signalImpacts) {
    if (!visibleQuestionIds.has(impact.questionId)) continue;
    relevantIds.add(impact.signalId);
    if (isMaterialMover(impact)) materialIds.add(impact.signalId);
  }

  const bySource = new Map<SignalSource, { relevant: number; material: number }>();
  for (const signal of siteSignals) {
    if (!relevantIds.has(signal.id)) continue;
    const entry = bySource.get(signal.source) ?? { relevant: 0, material: 0 };
    entry.relevant += 1;
    if (materialIds.has(signal.id)) entry.material += 1;
    bySource.set(signal.source, entry);
  }

  return Array.from(bySource.entries())
    .map(([source, counts]) => ({
      source,
      received: signalSourceVolume[source],
      forecastRelevant: counts.relevant,
      materialMovers: counts.material,
    }))
    .sort((a, b) => b.materialMovers - a.materialMovers || b.forecastRelevant - a.forecastRelevant);
}

export const SIGNAL_STATUS_LABEL: Record<SignalStatus, string> = {
  new: "New",
  monitoring: "Monitoring",
  confirmed: "Confirmed",
  dismissed: "Dismissed",
};
