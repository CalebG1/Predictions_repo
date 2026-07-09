// Hand-rolled SVG metro map (no mapping dependency), consistent with the
// repo's zero-charting-dependency ethos. Site coordinates are normalized
// [0,1]; the schema is ready for real lat/lng + a live map provider later.

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { pct } from "./ui";
import {
  ASSET_CLASS_LABEL,
  DEFAULT_BETA,
  candidateSites,
  demandGrid,
  gravitySitesFrom,
  type CandidateSite,
} from "../domain/siteSelection";
import { tradeAreaRadius } from "../domain/tradeArea";

const VIEW = 100;

/** Probability color scale: red (low) → amber → green (high). */
export function probColor(p: number): string {
  const hue = Math.round(Math.min(1, Math.max(0, p)) * 140);
  return `hsl(${hue}, 62%, 42%)`;
}

interface DistrictShape {
  label: string;
  points: string;
  labelX: number;
  labelY: number;
}

const DISTRICTS: DistrictShape[] = [
  { label: "Northgate", points: "24,6 52,6 50,30 26,32", labelX: 30, labelY: 12 },
  { label: "University District", points: "52,10 74,14 70,34 50,30", labelX: 56, labelY: 17 },
  { label: "Downtown Core", points: "38,34 60,32 62,62 40,64", labelX: 44, labelY: 39 },
  { label: "Eastbank", points: "64,30 84,34 82,56 64,58", labelX: 69, labelY: 37 },
  { label: "Harbor Point", points: "14,44 36,42 36,70 16,72", labelX: 18, labelY: 49 },
  { label: "Airport District", points: "70,60 92,62 90,84 72,82", labelX: 75, labelY: 67 },
  { label: "South Industrial", points: "28,72 66,70 64,94 30,92", labelX: 38, labelY: 90 },
];

const ROADS: { d: string; major?: boolean }[] = [
  { d: "M 8 40 Q 40 34 62 34 T 96 40", major: true }, // east-west arterial
  { d: "M 46 2 Q 48 40 44 70 T 48 98", major: true }, // north-south arterial
  { d: "M 12 66 Q 42 60 70 66 T 96 72" }, // southern corridor
  { d: "M 60 6 Q 66 30 78 46" }, // university connector
  { d: "M 22 20 Q 30 42 24 64" }, // west loop
];

// River running down the east side, past Eastbank toward the harbor.
const RIVER = "M 88 2 Q 78 20 66 34 Q 58 46 60 60 Q 62 76 50 86 Q 40 94 34 98";

export interface SiteMapProps {
  sites: CandidateSite[];
  probabilityFor: (site: CandidateSite) => number | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function SiteMap({ sites, probabilityFor, selectedId, onSelect }: SiteMapProps) {
  const gravity = useMemo(() => gravitySitesFrom(candidateSites), []);

  const radii = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of gravity) {
      map.set(g.id, tradeAreaRadius(g, gravity, demandGrid, DEFAULT_BETA));
    }
    return map;
  }, [gravity]);

  const selected = selectedId ? sites.find((s) => s.id === selectedId) ?? null : null;
  const visibleIds = new Set(sites.map((s) => s.id));

  return (
    <div className="site-map-wrap">
      <svg
        className="site-map"
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        role="img"
        aria-label="Harbor City metro map of candidate sites"
        onClick={() => onSelect(null)}
      >
        {/* Districts */}
        {DISTRICTS.map((d) => (
          <g key={d.label}>
            <polygon className="site-map-district" points={d.points} />
            <text className="site-map-district-label" x={d.labelX} y={d.labelY}>
              {d.label}
            </text>
          </g>
        ))}

        {/* River + roads */}
        <path className="site-map-river" d={RIVER} />
        {ROADS.map((r, i) => (
          <path key={i} className={`site-map-road${r.major ? " major" : ""}`} d={r.d} />
        ))}

        {/* Trade-area rings for visible retail sites */}
        {sites
          .filter((s) => s.assetClass === "retail")
          .map((s) => {
            const r = radii.get(s.id);
            if (!r) return null;
            const isSel = s.id === selectedId;
            return (
              <circle
                key={`ring-${s.id}`}
                className={`site-map-ring${isSel ? " selected" : ""}`}
                cx={s.x * VIEW}
                cy={s.y * VIEW}
                r={r * VIEW}
              />
            );
          })}

        {/* Site pins */}
        {sites.map((s) => {
          const p = probabilityFor(s);
          const isSel = s.id === selectedId;
          const cx = s.x * VIEW;
          const cy = s.y * VIEW;
          const operating = s.status === "operating";
          const r = operating ? 1.6 : 1.9 + (p ?? 0.5) * 1.4;
          return (
            <g
              key={s.id}
              className={`site-map-pin${isSel ? " selected" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={`${s.name}${p !== null ? `, probability ${pct(p)}` : ", operating site"}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(isSel ? null : s.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(isSel ? null : s.id);
                }
              }}
            >
              <title>
                {s.name} · {ASSET_CLASS_LABEL[s.assetClass]}
                {p !== null ? ` · ${pct(p)}` : " · Operating"}
              </title>
              {operating ? (
                <rect
                  className="site-map-dot operating"
                  x={cx - r}
                  y={cy - r}
                  width={r * 2}
                  height={r * 2}
                  transform={`rotate(45 ${cx} ${cy})`}
                />
              ) : (
                <circle
                  className="site-map-dot"
                  cx={cx}
                  cy={cy}
                  r={r}
                  style={{ fill: p !== null ? probColor(p) : "var(--text-3)" }}
                />
              )}
              {p !== null && !operating && (
                <text className="site-map-pin-label" x={cx} y={cy - r - 1.2} textAnchor="middle">
                  {pct(p)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Selected-site info card */}
      {selected && visibleIds.has(selected.id) && (
        <div
          className="site-map-card"
          style={{
            left: `${Math.min(72, Math.max(2, selected.x * 100 - 10))}%`,
            top: `${Math.min(70, Math.max(2, selected.y * 100 + 5))}%`,
          }}
        >
          <div className="site-map-card-title">{selected.name}</div>
          <div className="site-map-card-meta">
            {ASSET_CLASS_LABEL[selected.assetClass]} · {selected.submarket}
          </div>
          <div className="site-map-card-target">{selected.targetMetric}</div>
          {selected.questionId ? (
            <>
              <div className="site-map-card-prob">
                {(() => {
                  const p = probabilityFor(selected);
                  return p !== null ? (
                    <>
                      <span className="site-map-card-prob-val" style={{ color: probColor(p) }}>
                        {pct(p)}
                      </span>
                      <span className="muted small"> probability of hitting target</span>
                    </>
                  ) : null;
                })()}
              </div>
              <Link className="site-map-card-link" to={`/q/${selected.questionId}`}>
                View forecast →
              </Link>
            </>
          ) : (
            <div className="muted small">Operating portfolio site (no open forecast)</div>
          )}
        </div>
      )}

      <div className="site-map-legend">
        <span className="site-map-legend-item">
          <span className="site-map-legend-swatch" style={{ background: probColor(0.75) }} /> High
          probability
        </span>
        <span className="site-map-legend-item">
          <span className="site-map-legend-swatch" style={{ background: probColor(0.45) }} /> Uncertain
        </span>
        <span className="site-map-legend-item">
          <span className="site-map-legend-swatch" style={{ background: probColor(0.2) }} /> Low
          probability
        </span>
        <span className="site-map-legend-item">
          <span className="site-map-legend-swatch operating" /> Operating site
        </span>
        <span className="site-map-legend-item">
          <span className="site-map-legend-ring" /> 75% trade area
        </span>
      </div>
    </div>
  );
}
