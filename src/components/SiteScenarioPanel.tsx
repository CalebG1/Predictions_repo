// What-if scenario simulator: sliders re-run the Monte Carlo live and the
// outcome distribution (hand-rolled SVG histogram) shifts with them.

import { useMemo, useState } from "react";
import { pct } from "./ui";
import { probColor } from "./SiteMap";
import type { CandidateSite } from "../domain/siteSelection";
import { simulateSite, type ScenarioParams } from "../domain/siteScenario";

const W = 560;
const H = 150;
const PAD = { top: 12, right: 12, bottom: 24, left: 12 };

function Histogram({
  bins,
  target,
  unit,
}: {
  bins: { binStart: number; binEnd: number; count: number }[];
  target: number;
  unit: string;
}) {
  if (bins.length === 0) return null;
  const min = bins[0].binStart;
  const max = bins[bins.length - 1].binEnd;
  const span = max - min || 1;
  const maxCount = Math.max(...bins.map((b) => b.count), 1);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (v: number) => PAD.left + ((v - min) / span) * innerW;
  const targetX = x(Math.min(max, Math.max(min, target)));

  return (
    <svg className="scenario-hist" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Outcome distribution">
      {bins.map((b, i) => {
        const bw = (innerW / bins.length) * 0.86;
        const h = (b.count / maxCount) * innerH;
        const mid = (b.binStart + b.binEnd) / 2;
        return (
          <rect
            key={i}
            className={`scenario-bar${mid >= target ? " hit" : ""}`}
            x={x(b.binStart) + ((innerW / bins.length) - bw) / 2}
            y={PAD.top + innerH - h}
            width={bw}
            height={h}
          />
        );
      })}
      <line className="scenario-target-line" x1={targetX} y1={PAD.top - 4} x2={targetX} y2={PAD.top + innerH} />
      <text className="scenario-target-label" x={targetX + 4} y={PAD.top + 6}>
        target
      </text>
      <text className="scenario-axis-label" x={PAD.left} y={H - 6}>
        {min.toFixed(1)}
      </text>
      <text className="scenario-axis-label" x={W - PAD.right} y={H - 6} textAnchor="end">
        {max.toFixed(1)}
      </text>
      <text className="scenario-axis-label" x={W / 2} y={H - 6} textAnchor="middle">
        {unit}
      </text>
    </svg>
  );
}

export default function SiteScenarioPanel({ site }: { site: CandidateSite }) {
  const [competitorEntry, setCompetitorEntry] = useState(false);
  const [growth, setGrowth] = useState(0);
  const [inflation, setInflation] = useState(0);

  const params: ScenarioParams = useMemo(
    () => ({
      competitorEntry,
      demographicGrowthPct: growth,
      costInflationPct: inflation,
    }),
    [competitorEntry, growth, inflation]
  );

  const baseline = useMemo(
    () => simulateSite(site, { competitorEntry: false, demographicGrowthPct: 0, costInflationPct: 0 }),
    [site]
  );
  const result = useMemo(() => simulateSite(site, params), [site, params]);

  const deltaP = result.pHitTarget - baseline.pHitTarget;

  return (
    <div className="scenario-panel">
      <div className="scenario-controls">
        <label className="scenario-toggle">
          <input
            type="checkbox"
            checked={competitorEntry}
            onChange={(e) => setCompetitorEntry(e.target.checked)}
          />
          <span>
            {site.assetClass === "retail"
              ? "Competitor opens in trade area"
              : "Competing supply delivers nearby"}
          </span>
        </label>

        <label className="scenario-slider">
          <span>
            {site.assetClass === "retail" ? "Demographic growth" : "Labor-pool growth"}:{" "}
            <strong>
              {growth >= 0 ? "+" : ""}
              {growth}%
            </strong>
          </span>
          <input
            type="range"
            min={-10}
            max={10}
            step={1}
            value={growth}
            onChange={(e) => setGrowth(Number(e.target.value))}
          />
        </label>

        <label className="scenario-slider">
          <span>
            Rent / cost inflation: <strong>+{inflation}%</strong>
          </span>
          <input
            type="range"
            min={0}
            max={15}
            step={1}
            value={inflation}
            onChange={(e) => setInflation(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="scenario-output">
        <div className="scenario-stats">
          <div className="scenario-stat main">
            <span className="scenario-stat-label">P(hit target)</span>
            <span className="scenario-stat-val" style={{ color: probColor(result.pHitTarget) }}>
              {pct(result.pHitTarget)}
            </span>
            <span className={`scenario-stat-delta ${deltaP >= 0 ? "up" : "down"}`}>
              {deltaP >= 0 ? "+" : ""}
              {(deltaP * 100).toFixed(0)}pp vs. base case
            </span>
          </div>
          <div className="scenario-stat">
            <span className="scenario-stat-label">P10 / P50 / P90</span>
            <span className="scenario-stat-val small">
              {result.p10.toFixed(1)} / {result.p50.toFixed(1)} / {result.p90.toFixed(1)}
            </span>
          </div>
          <div className="scenario-stat">
            <span className="scenario-stat-label">Mean outcome</span>
            <span className="scenario-stat-val small">{result.mean.toFixed(1)}</span>
          </div>
          <div className="scenario-stat">
            <span className="scenario-stat-label">Effective target</span>
            <span className="scenario-stat-val small">{result.effectiveTarget.toFixed(1)}</span>
          </div>
        </div>
        <Histogram bins={result.histogram} target={result.effectiveTarget} unit={result.unit} />
        <p className="scenario-note muted small">
          600 Monte Carlo runs over distance-decay, growth, and execution uncertainty. Deterministic
          for a given scenario — same sliders, same distribution.
        </p>
      </div>
    </div>
  );
}
