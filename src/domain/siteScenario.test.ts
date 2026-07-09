import { describe, expect, it } from "vitest";
import { simulateSite, DEFAULT_SCENARIO } from "./siteScenario";
import { runSiteForecast, tradeAreaEstimate, gravityRevenueM, targetRevenueM } from "./siteEngine";
import { siteForId, siteForQuestion, candidateSites } from "./siteSelection";
import { questions } from "./seed";

const retail = siteForId("site-northgate")!;
const industrial = siteForId("site-southloop")!;

describe("simulateSite (Monte Carlo)", () => {
  it("is deterministic for identical inputs", () => {
    const a = simulateSite(retail, DEFAULT_SCENARIO);
    const b = simulateSite(retail, DEFAULT_SCENARIO);
    expect(a.samples).toEqual(b.samples);
    expect(a.pHitTarget).toBe(b.pHitTarget);
  });

  it("produces the requested number of samples and coherent stats", () => {
    const r = simulateSite(retail, DEFAULT_SCENARIO, 400);
    expect(r.samples).toHaveLength(400);
    expect(r.pHitTarget).toBeGreaterThanOrEqual(0);
    expect(r.pHitTarget).toBeLessThanOrEqual(1);
    expect(r.p10).toBeLessThanOrEqual(r.p50);
    expect(r.p50).toBeLessThanOrEqual(r.p90);
    const binTotal = r.histogram.reduce((a, b) => a + b.count, 0);
    expect(binTotal).toBe(400);
  });

  it("competitor entry lowers P(hit target) for a retail site", () => {
    const base = simulateSite(retail, { ...DEFAULT_SCENARIO, competitorEntry: false });
    const withEntry = simulateSite(retail, { ...DEFAULT_SCENARIO, competitorEntry: true });
    expect(withEntry.pHitTarget).toBeLessThan(base.pHitTarget);
  });

  it("demographic growth raises the mean outcome", () => {
    const base = simulateSite(retail, DEFAULT_SCENARIO);
    const grown = simulateSite(retail, { ...DEFAULT_SCENARIO, demographicGrowthPct: 8 });
    expect(grown.mean).toBeGreaterThan(base.mean);
  });

  it("cost inflation raises the effective target and lowers P(hit)", () => {
    const base = simulateSite(retail, DEFAULT_SCENARIO);
    const inflated = simulateSite(retail, { ...DEFAULT_SCENARIO, costInflationPct: 12 });
    expect(inflated.effectiveTarget).toBeGreaterThan(base.effectiveTarget);
    expect(inflated.pHitTarget).toBeLessThanOrEqual(base.pHitTarget);
  });

  it("handles industrial sites via the factor model", () => {
    const r = simulateSite(industrial, DEFAULT_SCENARIO, 300);
    expect(r.samples).toHaveLength(300);
    expect(r.unit).toContain("% of target");
    const withSupply = simulateSite(industrial, { ...DEFAULT_SCENARIO, competitorEntry: true }, 300);
    expect(withSupply.mean).toBeLessThan(r.mean);
  });
});

describe("siteEngine gravity integration", () => {
  it("computes a gravity-implied revenue for retail sites only", () => {
    expect(gravityRevenueM(retail)).toBeGreaterThan(0);
    expect(gravityRevenueM(industrial)).toBeNull();
  });

  it("parses the underwriting target out of the target metric", () => {
    expect(targetRevenueM(retail)).toBe(2.8);
    expect(targetRevenueM(industrial)).toBeNull();
  });

  it("trade-area estimate is a valid probability for retail", () => {
    const p = tradeAreaEstimate(retail);
    expect(p).not.toBeNull();
    expect(p!).toBeGreaterThan(0);
    expect(p!).toBeLessThan(1);
  });

  it("runSiteForecast emits a coherent ForecastObject with a trade-area agent for retail", () => {
    const q = questions.find((item) => item.id === retail.questionId)!;
    const fo = runSiteForecast(q, retail);
    expect(fo.currentProbability).toBeGreaterThan(0);
    expect(fo.currentProbability).toBeLessThan(1);
    expect(fo.agentPanel.some((a) => a.agent === "trade-area")).toBe(true);
    expect(fo.agentPanel.some((a) => a.agent === "synthesis")).toBe(true);
    // Deterministic given the same trigger.
    const again = runSiteForecast(q, retail);
    expect(again.currentProbability).toBe(fo.currentProbability);
  });

  it("uses the regulatory agent for industrial but not retail", () => {
    const qInd = questions.find((item) => item.id === industrial.questionId)!;
    const foInd = runSiteForecast(qInd, industrial);
    expect(foInd.agentPanel.some((a) => a.agent === "regulatory")).toBe(true);
    expect(foInd.agentPanel.some((a) => a.agent === "trade-area")).toBe(false);

    const qRet = questions.find((item) => item.id === retail.questionId)!;
    const foRet = runSiteForecast(qRet, retail);
    expect(foRet.agentPanel.some((a) => a.agent === "regulatory")).toBe(false);
  });
});

describe("seeded site/question linkage", () => {
  it("every candidate site's questionId resolves to a seeded Real Estate question", () => {
    for (const site of candidateSites) {
      if (!site.questionId) continue;
      const q = questions.find((item) => item.id === site.questionId);
      expect(q, `missing question for ${site.id}`).toBeDefined();
      expect(q!.category).toBe("Real Estate");
      expect(siteForQuestion(site.questionId)?.id).toBe(site.id);
    }
  });
});
