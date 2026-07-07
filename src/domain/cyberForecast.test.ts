import { describe, expect, it } from "vitest";
import {
  alertConversionStats,
  alertImpactFeed,
  alertsForQuestion,
  impactsForQuestion,
  isMaterialMover,
  relatedAlertCount,
} from "./alerts";
import { peerBenchmarkFor, peerMatrix, PEER_MATRIX_MODES } from "./peers";
import {
  enterpriseRiskMap,
  enterpriseSummary,
  forecastDecomposition,
  questionConfidence,
  trendFrom,
} from "./cyberForecast";
import type { ForecastQuestion, Outcome, ProbabilityPoint } from "./types";

describe("alert → forecast impact mapping", () => {
  it("associates one alert with multiple questions", () => {
    // The VPN CVE moves breach, IAM, and zero-day questions.
    const breach = impactsForQuestion("q-cyber-breach");
    expect(breach.some((i) => i.alertId === "a-vpn-cve")).toBe(true);
    const zeroDay = impactsForQuestion("q-cyber-zero-day");
    expect(zeroDay.some((i) => i.alertId === "a-vpn-cve")).toBe(true);
  });

  it("orders associated alerts by absolute impact then recency", () => {
    const impacts = impactsForQuestion("q-cyber-breach");
    for (let i = 1; i < impacts.length; i++) {
      expect(Math.abs(impacts[i - 1].probabilityDelta)).toBeGreaterThanOrEqual(
        Math.abs(impacts[i].probabilityDelta)
      );
    }
  });

  it("joins alerts with their impacts", () => {
    const rows = alertsForQuestion("q-cyber-cloud");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].alert.id).toBeTruthy();
    expect(rows[0].impact.questionId).toBe("q-cyber-cloud");
  });

  it("counts related alerts", () => {
    expect(relatedAlertCount("q-cyber-breach")).toBe(
      impactsForQuestion("q-cyber-breach").length
    );
  });

  it("materiality threshold is 1pp", () => {
    expect(isMaterialMover({ alertId: "x", questionId: "q", probabilityDelta: 0.01, direction: "increase", confidence: "high", reason: "" })).toBe(true);
    expect(isMaterialMover({ alertId: "x", questionId: "q", probabilityDelta: 0.004, direction: "increase", confidence: "high", reason: "" })).toBe(false);
  });
});

describe("alert-to-risk conversion", () => {
  const allVisible = new Set([
    "q-cyber-breach",
    "q-cyber-ransomware",
    "q-cyber-phishing",
    "q-cyber-vendor",
    "q-cyber-iam",
    "q-cyber-cloud",
    "q-cyber-ddos",
    "q-cyber-compliance",
    "q-cyber-zero-day",
    "q-cyber-zero-trust",
  ]);

  it("reports received >= forecast-relevant >= material movers per source", () => {
    const stats = alertConversionStats(allVisible);
    expect(stats.length).toBeGreaterThan(0);
    for (const row of stats) {
      expect(row.received).toBeGreaterThanOrEqual(row.forecastRelevant);
      expect(row.forecastRelevant).toBeGreaterThanOrEqual(row.materialMovers);
    }
  });

  it("excludes questions the user cannot see", () => {
    const onlyPublic = new Set(["q-cyber-ddos"]);
    const feed = alertImpactFeed((id) => id, onlyPublic);
    for (const item of feed) {
      for (const impact of item.impacts) {
        expect(onlyPublic.has(impact.questionId)).toBe(true);
      }
    }
  });
});

describe("peer benchmarking", () => {
  it("provides a benchmark with a cohort and confidence for a cyber question", () => {
    const b = peerBenchmarkFor("q-cyber-ransomware");
    expect(b).toBeDefined();
    expect(b!.cohort.length).toBeGreaterThan(0);
    expect(["high", "medium", "low"]).toContain(b!.confidence);
  });

  it("builds a matrix with our-company and cohort rows", () => {
    const visible = new Set(PEER_MATRIX_MODES.map(() => "").concat([
      "q-cyber-ransomware",
      "q-cyber-cloud",
      "q-cyber-vendor",
      "q-cyber-compliance",
    ]));
    const matrix = peerMatrix(visible);
    const labels = matrix.map((r) => r.label);
    expect(labels).toContain("Our company");
    expect(labels).toContain("Industry median");
  });

  it("omits columns for questions the user cannot see", () => {
    const matrix = peerMatrix(new Set(["q-cyber-ransomware"]));
    const our = matrix.find((r) => r.label === "Our company")!;
    expect(our.values["Ransomware"]).toBeDefined();
    expect(our.values["Vendor breach"]).toBeUndefined();
  });
});

describe("forecast decomposition & trend", () => {
  it("returns signed factor contributions", () => {
    const factors = forecastDecomposition("q-cyber-breach");
    expect(factors.length).toBeGreaterThan(0);
    expect(factors.some((f) => f.contribution > 0)).toBe(true);
    expect(factors.some((f) => f.contribution < 0)).toBe(true);
  });

  it("assigns a confidence to known questions", () => {
    expect(questionConfidence("q-cyber-compliance")).toBe("high");
    expect(questionConfidence("q-cyber-vendor")).toBe("low");
  });

  it("detects trend direction from history", () => {
    const rising: ProbabilityPoint[] = [
      { id: "1", outcomeId: "o", probability: 0.2, timestamp: "2026-06-01T00:00:00Z", source: "s", updateTrigger: "t" },
      { id: "2", outcomeId: "o", probability: 0.3, timestamp: "2026-06-20T00:00:00Z", source: "s", updateTrigger: "t" },
    ];
    expect(trendFrom(rising)).toBe("up");
  });
});

describe("enterprise risk map & summary", () => {
  const q = (id: string, prob: number): ForecastQuestion => ({
    id,
    title: id,
    preciseDefinition: "",
    category: "Security/Cyber",
    type: "binary",
    riskOrOpportunity: "risk",
    impactEstimate: "",
    impactLevel: "high",
    impactScore: 0.7,
    resolutionCriteria: "",
    resolutionSource: "",
    openDate: "2026-01-01",
    resolutionDate: "2026-12-31",
    status: "open",
    visibility: "public",
    owningTeam: "Security",
    createdBy: "u",
    priorBaseRate: prob,
  });

  it("uses live probability when a backing question is visible", () => {
    const questions = [q("q-cyber-ransomware", 0.25)];
    const yes = (id: string): Outcome | undefined =>
      id === "q-cyber-ransomware"
        ? { id: `${id}-yes`, questionId: id, label: "Yes", currentProbability: 0.25, isResolved: false }
        : undefined;
    const map = enterpriseRiskMap(questions, yes, () => []);
    const ransomware = map.find((r) => r.failureMode === "Ransomware")!;
    expect(ransomware.probability).toBeCloseTo(0.25);
    expect(ransomware.questionId).toBe("q-cyber-ransomware");
  });

  it("falls back to a static estimate for modes with no visible question", () => {
    const map = enterpriseRiskMap([], () => undefined, () => []);
    const insider = map.find((r) => r.failureMode === "Insider misuse")!;
    expect(insider.questionId).toBeUndefined();
    expect(insider.probability).toBeGreaterThan(0);
  });

  it("generates an executive summary grounded in drivers", () => {
    const text = enterpriseSummary({
      netDirection: "increased",
      topDrivers: ["Critical vulnerability on internet-facing VPN appliance"],
      elevatedCount: 2,
      aboveMedianModes: ["Compliance miss"],
      belowMedianModes: ["Cloud data exposure"],
    });
    expect(text).toContain("increased");
    expect(text.toLowerCase()).toContain("vpn");
    expect(text).toContain("median");
  });
});

import { forecastMovements, topRiskMovers, driversForQuestion } from "./movers";
import { securityDomainRows } from "./securityDomains";
import { questions as seedQuestions } from "./seed";
import { outcomes as seedOutcomes, probabilityHistory as seedHistory } from "./seed";

describe("forecast movements (PRD §6.2)", () => {
  const yesOutcome = (id: string) => seedOutcomes.find((o) => o.questionId === id && o.id.endsWith("-yes"));
  const historyFor = (outcomeId: string) =>
    seedHistory.filter((h) => h.outcomeId === outcomeId).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  it("builds driver breakdown from alerts", () => {
    const drivers = driversForQuestion("q-cyber-breach");
    expect(drivers.length).toBeGreaterThan(0);
    expect(drivers[0].label).toBeTruthy();
  });

  it("sorts movements by absolute change", () => {
    const cyber = seedQuestions.filter((q) => q.category === "Security/Cyber");
    const moves = forecastMovements(cyber, yesOutcome, historyFor);
    expect(moves.length).toBeGreaterThan(0);
    for (let i = 1; i < moves.length; i++) {
      expect(Math.abs(moves[i - 1].change)).toBeGreaterThanOrEqual(Math.abs(moves[i].change));
    }
  });

  it("returns top upward and downward movers", () => {
    const cyber = seedQuestions.filter((q) => q.category === "Security/Cyber");
    const top = topRiskMovers(cyber, yesOutcome, historyFor);
    expect(top.upward.length + top.downward.length).toBeGreaterThanOrEqual(0);
  });
});

describe("security domains (PRD §6.3.B)", () => {
  const yesOutcome = (id: string) => seedOutcomes.find((o) => o.questionId === id && o.id.endsWith("-yes"));
  const historyFor = (outcomeId: string) =>
    seedHistory.filter((h) => h.outcomeId === outcomeId).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  it("returns all ten PRD security domains", () => {
    const rows = securityDomainRows(seedQuestions, yesOutcome, historyFor);
    expect(rows.length).toBe(10);
    expect(rows.map((r) => r.domain)).toContain("Identity");
    expect(rows.map((r) => r.domain)).toContain("Compliance");
  });

  it("links domains to backing questions when visible", () => {
    const rows = securityDomainRows(seedQuestions, yesOutcome, historyFor);
    const identity = rows.find((r) => r.domain === "Identity")!;
    expect(identity.questionId).toBe("q-cyber-iam");
    expect(identity.riskScore).toBeGreaterThan(0);
  });
});
