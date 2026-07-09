import { describe, expect, it } from "vitest";
import {
  cannibalizationMatrix,
  captureBySite,
  distance,
  huffProbabilities,
  marketShares,
  tradeAreaRadius,
  type DemandPoint,
  type GravitySite,
} from "./tradeArea";
import { candidateRetailSites, demandGrid, gravitySitesFrom, candidateSites, operatingRetailSites } from "./siteSelection";

const A: GravitySite = { id: "a", x: 0.2, y: 0.5, attractiveness: 3 };
const B: GravitySite = { id: "b", x: 0.8, y: 0.5, attractiveness: 3 };
const BIG_B: GravitySite = { ...B, attractiveness: 9 };

const cells: DemandPoint[] = [
  { id: "c1", x: 0.25, y: 0.5, population: 1000 },
  { id: "c2", x: 0.5, y: 0.5, population: 1000 },
  { id: "c3", x: 0.75, y: 0.5, population: 1000 },
];

describe("huffProbabilities", () => {
  it("sums to 1 across sites for every cell", () => {
    for (const cell of cells) {
      const probs = huffProbabilities([A, B], cell, 2);
      expect(probs.reduce((x, y) => x + y, 0)).toBeCloseTo(1, 10);
    }
  });

  it("gives the nearer site the higher probability at equal attractiveness", () => {
    const probs = huffProbabilities([A, B], cells[0], 2);
    expect(probs[0]).toBeGreaterThan(probs[1]);
  });

  it("splits an equidistant cell evenly at equal attractiveness", () => {
    const probs = huffProbabilities([A, B], cells[1], 2);
    expect(probs[0]).toBeCloseTo(0.5, 10);
  });

  it("gives a more attractive site a larger share at equal distance", () => {
    const probs = huffProbabilities([A, BIG_B], cells[1], 2);
    expect(probs[1]).toBeGreaterThan(probs[0]);
    expect(probs[1]).toBeCloseTo(0.75, 10);
  });

  it("is beta-sensitive: higher beta concentrates share on the nearer site", () => {
    const low = huffProbabilities([A, B], cells[0], 1.2);
    const high = huffProbabilities([A, B], cells[0], 3);
    expect(high[0]).toBeGreaterThan(low[0]);
  });
});

describe("captureBySite / marketShares", () => {
  it("conserves total demand across sites", () => {
    const capture = captureBySite([A, B], cells, 2);
    const total = capture.a + capture.b;
    expect(total).toBeCloseTo(3000, 6);
  });

  it("market shares sum to 1", () => {
    const shares = marketShares([A, B], cells, 2);
    expect(shares.a + shares.b).toBeCloseTo(1, 10);
  });
});

describe("cannibalizationMatrix", () => {
  it("reports a positive share loss when a candidate enters an incumbent's catchment", () => {
    const incumbent = A;
    const candidate: GravitySite = { id: "cand", x: 0.3, y: 0.5, attractiveness: 3 };
    const entries = cannibalizationMatrix([candidate], [incumbent], cells, 2);
    expect(entries).toHaveLength(1);
    expect(entries[0].shareLoss).toBeGreaterThan(0);
    expect(entries[0].shareLoss).toBeLessThanOrEqual(1);
  });

  it("nearby candidates cannibalize more than distant ones", () => {
    const near: GravitySite = { id: "near", x: 0.25, y: 0.5, attractiveness: 3 };
    const far: GravitySite = { id: "far", x: 0.9, y: 0.9, attractiveness: 3 };
    const entries = cannibalizationMatrix([near, far], [A], cells, 2);
    const nearLoss = entries.find((e) => e.candidateId === "near")!.shareLoss;
    const farLoss = entries.find((e) => e.candidateId === "far")!.shareLoss;
    expect(nearLoss).toBeGreaterThan(farLoss);
  });

  it("produces a full matrix over the seeded portfolio", () => {
    const toGravity = (s: { id: string; x: number; y: number; attractiveness: number }) => ({
      id: s.id,
      x: s.x,
      y: s.y,
      attractiveness: s.attractiveness,
    });
    const entries = cannibalizationMatrix(
      candidateRetailSites().map(toGravity),
      operatingRetailSites().map(toGravity),
      demandGrid,
      2
    );
    expect(entries).toHaveLength(candidateRetailSites().length * operatingRetailSites().length);
    for (const e of entries) {
      expect(e.shareLoss).toBeGreaterThanOrEqual(0);
      expect(e.shareLoss).toBeLessThanOrEqual(1);
    }
  });
});

describe("tradeAreaRadius", () => {
  it("returns a positive radius covering most capture", () => {
    const gravity = gravitySitesFrom(candidateSites);
    const r = tradeAreaRadius(gravity[0], gravity, demandGrid, 2, 0.75);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThanOrEqual(Math.SQRT2); // bounded by the unit map diagonal
  });

  it("grows with the coverage requirement", () => {
    const gravity = gravitySitesFrom(candidateSites);
    const r50 = tradeAreaRadius(gravity[0], gravity, demandGrid, 2, 0.5);
    const r90 = tradeAreaRadius(gravity[0], gravity, demandGrid, 2, 0.9);
    expect(r90).toBeGreaterThanOrEqual(r50);
  });
});

describe("distance", () => {
  it("is floored away from zero so utilities stay finite", () => {
    expect(distance({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 })).toBeGreaterThan(0);
  });
});
