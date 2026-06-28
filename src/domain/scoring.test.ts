import { describe, expect, it } from "vitest";
import {
  bayesUpdate,
  brierBinary,
  brierMulticlass,
  calibrationBins,
  clampProb,
  extremize,
  isCoherent,
  logOddsAverage,
  logit,
  meanBrier,
  normalize,
  rmsCalibrationError,
  sigmoid,
} from "./scoring";

describe("clampProb", () => {
  it("never returns 0 or 1 (no certainty on contingent events)", () => {
    expect(clampProb(0)).toBeGreaterThan(0);
    expect(clampProb(1)).toBeLessThan(1);
    expect(clampProb(0.5)).toBeCloseTo(0.5);
  });
});

describe("brier", () => {
  it("scores a perfect binary forecast at 0", () => {
    expect(brierBinary(1, 1)).toBeCloseTo(0);
    expect(brierBinary(0, 0)).toBeCloseTo(0);
  });
  it("scores a maximally wrong forecast at 1", () => {
    expect(brierBinary(1, 0)).toBeCloseTo(1);
    expect(brierBinary(0, 1)).toBeCloseTo(1);
  });
  it("scores a coin-flip at 0.25", () => {
    expect(brierBinary(0.5, 1)).toBeCloseTo(0.25);
  });
  it("multiclass matches binary when 2 classes", () => {
    expect(brierMulticlass([0.7, 0.3], 0)).toBeCloseTo(0.09 + 0.09);
  });
  it("mean brier averages across forecasts", () => {
    expect(meanBrier([{ p: 0.5, outcome: 1 }, { p: 0.5, outcome: 0 }])).toBeCloseTo(0.25);
  });
});

describe("logit/sigmoid", () => {
  it("are inverses", () => {
    for (const p of [0.1, 0.37, 0.5, 0.82]) {
      expect(sigmoid(logit(p))).toBeCloseTo(p, 6);
    }
  });
});

describe("logOddsAverage", () => {
  it("returns the common value when all agree", () => {
    expect(logOddsAverage([0.6, 0.6, 0.6])).toBeCloseTo(0.6, 6);
  });
  it("is symmetric around 0.5 for mirrored inputs", () => {
    expect(logOddsAverage([0.2, 0.8])).toBeCloseTo(0.5, 6);
  });
  it("respects weights", () => {
    const heavyLow = logOddsAverage([0.2, 0.8], [3, 1]);
    expect(heavyLow).toBeLessThan(0.5);
  });
  it("handles empty input", () => {
    expect(logOddsAverage([])).toBe(0.5);
  });
});

describe("extremize", () => {
  it("sharpens away from 0.5 when a>1", () => {
    expect(extremize(0.7, 1.5)).toBeGreaterThan(0.7);
    expect(extremize(0.3, 1.5)).toBeLessThan(0.3);
  });
  it("is identity at a=1", () => {
    expect(extremize(0.62, 1)).toBeCloseTo(0.62, 6);
  });
});

describe("calibration", () => {
  it("bins perfectly-calibrated data near the diagonal", () => {
    // build data where observed frequency ~= predicted in each bin
    const data: { p: number; outcome: 0 | 1 }[] = [];
    for (let b = 0; b < 10; b++) {
      const p = (b + 0.5) / 10;
      const yes = Math.round(p * 100);
      for (let i = 0; i < 100; i++) data.push({ p, outcome: i < yes ? 1 : 0 });
    }
    const bins = calibrationBins(data, 10);
    const rmsce = rmsCalibrationError(bins);
    expect(rmsce).toBeLessThan(0.02);
  });

  it("detects overconfidence as nonzero RMS calibration error", () => {
    const data: { p: number; outcome: 0 | 1 }[] = [];
    for (let i = 0; i < 100; i++) data.push({ p: 0.9, outcome: i < 60 ? 1 : 0 });
    const bins = calibrationBins(data, 10);
    expect(rmsCalibrationError(bins)).toBeGreaterThan(0.2);
  });
});

describe("coherence", () => {
  it("accepts probabilities summing to 1", () => {
    expect(isCoherent([0.3, 0.7])).toBe(true);
    expect(isCoherent([0.2, 0.5, 0.31])).toBe(true); // 1.01 within 0.02 tolerance
    expect(isCoherent([0.2, 0.5, 0.4])).toBe(false); // 1.10 outside tolerance
  });
  it("normalize makes a set sum to 1", () => {
    const n = normalize([2, 2, 4]);
    expect(n.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    expect(n[2]).toBeCloseTo(0.5, 6);
  });
});

describe("bayesUpdate", () => {
  it("leaves prior unchanged with LR=1", () => {
    expect(bayesUpdate(0.4, 1)).toBeCloseTo(0.4, 6);
  });
  it("raises probability with LR>1", () => {
    expect(bayesUpdate(0.4, 3)).toBeGreaterThan(0.4);
  });
});
