// Lightweight dependency-free SVG charts used across the dashboard.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProbabilityPoint } from "../domain/types";

export interface ProbPoint {
  id?: string;
  timestamp: string;
  probability: number;
  trigger?: string;
  source?: string;
  /** Short blurb shown in the soft-refresh popup. */
  summary?: string;
  /** Longer copy revealed when the popup is expanded. */
  detail?: string;
}

// --- Refresh-kind classification (drives scatter colors + legend) ---
type RefreshKind = "backcast" | "hard" | "soft";

const HARD_TRIGGERS = new Set([
  "New primary-source filing ingested",
  "Red-team challenge incorporated",
  "Internal status change",
]);
const BACKCAST_TRIGGERS = new Set(["Base-rate refresh"]);

const SOFT_SNIPPETS: Record<string, { summary: string; detail: string }> = {
  "Scheduled weekly run": {
    summary: "Weekly ensemble run ingested new market and news signals.",
    detail:
      "The scheduled pipeline pulled fresh price feeds, headline clusters, and agent sub-estimates. Minor re-weighting moved the pooled probability without a structural model change.",
  },
  "Watched market signal moved": {
    summary: "A tracked external indicator crossed its alert threshold.",
    detail:
      "The signal watcher flagged a move in a correlated market or policy proxy. The ensemble nudged the estimate to stay aligned with the outside view while preserving the prior base rate.",
  },
  "Manual forecast refresh": {
    summary: "Analyst-triggered refresh incorporated the latest available evidence.",
    detail:
      "A human reviewer requested an immediate re-run after reviewing new inputs. Agent estimates were re-pooled and extremized before locking the updated probability.",
  },
};

export function kindFor(trigger?: string): RefreshKind {
  if (trigger && BACKCAST_TRIGGERS.has(trigger)) return "backcast";
  if (trigger && HARD_TRIGGERS.has(trigger)) return "hard";
  return "soft";
}

const KIND_META: Record<RefreshKind, { label: string; color: string }> = {
  backcast: { label: "Backcast", color: "#8a95a3" },
  hard: { label: "Hard refresh", color: "#4a5568" },
  soft: { label: "Soft refresh", color: "#d97706" },
};

const CHART_GRID = "#f0f1f3";
const CHART_AXIS = "#5b6672";
const CHART_LINE = "#16345c";

/** Map probability history into chart-ready points with soft-refresh popup copy. */
export function buildProbPoints(history: ProbabilityPoint[]): ProbPoint[] {
  return history.map((h, i) => {
    const prev = i > 0 ? history[i - 1].probability : h.probability;
    const delta = h.probability - prev;
    const kind = kindFor(h.updateTrigger);
    const snippet = SOFT_SNIPPETS[h.updateTrigger] ?? {
      summary: `${h.updateTrigger} moved the estimate to ${(h.probability * 100).toFixed(0)}%.`,
      detail: `Source: ${h.source}. Prior estimate was ${(prev * 100).toFixed(0)}%; new inputs shifted the pooled probability by ${Math.abs(delta * 100).toFixed(1)} points.`,
    };

    return {
      id: h.id,
      timestamp: h.timestamp,
      probability: h.probability,
      trigger: h.updateTrigger,
      source: h.source,
      summary: kind === "soft" ? snippet.summary : undefined,
      detail: kind === "soft" ? snippet.detail : undefined,
    };
  });
}

const TIMEFRAMES: { key: string; days: number }[] = [
  { key: "6H", days: 0.25 },
  { key: "12H", days: 0.5 },
  { key: "1D", days: 1 },
  { key: "1W", days: 7 },
  { key: "1M", days: 30 },
  { key: "All", days: Infinity },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type ViewRange = {
  i0: number;
  i1: number;
  yLo: number;
  yHi: number;
};

type BrushBox = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

function fmtDate(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts.slice(5);
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`;
}

const ZOOM_MS = 480;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function computeFullRange(base: ProbPoint[], zoomLevel: number): ViewRange {
  if (base.length < 2) return { i0: 0, i1: 1, yLo: 0, yHi: 1 };
  const min = Math.min(...base.map((p) => p.probability));
  const max = Math.max(...base.map((p) => p.probability));
  const pad = 0.06;
  const dataLo = Math.max(0, min - pad);
  const dataHi = Math.min(1, max + pad);
  const t = zoomLevel / 4;
  return {
    i0: 0,
    i1: base.length - 1,
    yLo: dataLo * t,
    yHi: 1 - t + dataHi * t,
  };
}

function yDomainFromRange(r: ViewRange) {
  const span = r.yHi - r.yLo;
  const pad = Math.max(span * 0.04, 0.01);
  return {
    lo: Math.max(0, r.yLo - pad),
    hi: Math.min(1, r.yHi + pad),
  };
}

function rangesDiffer(a: ViewRange, b: ViewRange): boolean {
  return (
    Math.abs(a.i0 - b.i0) > 0.04 ||
    Math.abs(a.i1 - b.i1) > 0.04 ||
    Math.abs(a.yLo - b.yLo) > 0.008 ||
    Math.abs(a.yHi - b.yHi) > 0.008
  );
}

const ZOOM_STEP = 0.22;
const MIN_INDEX_SPAN = 1;
const MIN_Y_SPAN = 0.04;

/** Zoom in/out relative to the current viewport, clamped to the full series bounds. */
function zoomRelative(current: ViewRange, direction: 1 | -1, base: ProbPoint[]): ViewRange {
  const full = computeFullRange(base, 0);
  const iMid = (current.i0 + current.i1) / 2;
  const yMid = (current.yLo + current.yHi) / 2;
  const factor = direction === 1 ? 1 - ZOOM_STEP : 1 + ZOOM_STEP;

  let iSpan = Math.max(MIN_INDEX_SPAN, (current.i1 - current.i0) * factor);
  let ySpan = Math.max(MIN_Y_SPAN, (current.yHi - current.yLo) * factor);

  const fullISpan = full.i1 - full.i0;
  const fullYSpan = full.yHi - full.yLo;
  iSpan = Math.min(iSpan, fullISpan);
  ySpan = Math.min(ySpan, fullYSpan);

  let i0 = iMid - iSpan / 2;
  let i1 = iMid + iSpan / 2;
  let yLo = yMid - ySpan / 2;
  let yHi = yMid + ySpan / 2;

  if (i0 < full.i0) {
    i1 += full.i0 - i0;
    i0 = full.i0;
  }
  if (i1 > full.i1) {
    i0 -= i1 - full.i1;
    i1 = full.i1;
  }
  if (yLo < full.yLo) {
    yHi += full.yLo - yLo;
    yLo = full.yLo;
  }
  if (yHi > full.yHi) {
    yLo -= yHi - full.yHi;
    yHi = full.yHi;
  }

  i0 = Math.max(full.i0, i0);
  i1 = Math.min(full.i1, i1);
  yLo = Math.max(full.yLo, yLo);
  yHi = Math.min(full.yHi, yHi);

  if (i1 - i0 < MIN_INDEX_SPAN) {
    const mid = (i0 + i1) / 2;
    i0 = Math.max(full.i0, mid - MIN_INDEX_SPAN / 2);
    i1 = Math.min(full.i1, i0 + MIN_INDEX_SPAN);
  }

  return { i0, i1, yLo, yHi };
}

function canZoomIn(current: ViewRange): boolean {
  return current.i1 - current.i0 > MIN_INDEX_SPAN + 0.05 || current.yHi - current.yLo > MIN_Y_SPAN + 0.005;
}

export function ProbChart({
  points,
  height = 300,
  endpointLabel,
}: {
  points: ProbPoint[];
  // Kept for backwards compatibility; annotations are now derived internally.
  annotations?: { index: number; label: string }[];
  height?: number;
  endpointLabel?: { tag?: string; probability: number };
}) {
  const [tf, setTf] = useState("All");
  const [displayRange, setDisplayRange] = useState<ViewRange>({ i0: 0, i1: 1, yLo: 0, yHi: 1 });
  const [brush, setBrush] = useState<BrushBox | null>(null);
  const [brushing, setBrushing] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const plotRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const brushRef = useRef<BrushBox | null>(null);
  const displayRangeRef = useRef(displayRange);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    displayRangeRef.current = displayRange;
  }, [displayRange]);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // Filter to the selected timeframe window (relative to the latest point).
  const baseVisible = useMemo(() => {
    if (points.length < 2) return points;
    const frame = TIMEFRAMES.find((t) => t.key === tf)!;
    if (!Number.isFinite(frame.days)) return points;
    const last = new Date(points[points.length - 1].timestamp).getTime();
    const cutoff = last - frame.days * 86400000;
    const filtered = points.filter((p) => new Date(p.timestamp).getTime() >= cutoff);
    return filtered.length >= 2 ? filtered : points.slice(-2);
  }, [points, tf]);

  const fullRange = useMemo(() => computeFullRange(baseVisible, 0), [baseVisible]);
  const isZoomed = useMemo(() => rangesDiffer(displayRange, fullRange), [displayRange, fullRange]);
  const zoomInEnabled = useMemo(() => canZoomIn(displayRange), [displayRange]);

  const animateRange = useCallback((target: ViewRange) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const from = { ...displayRangeRef.current };
    const start = performance.now();
    setIsAnimating(true);
    setSelectedIdx(null);
    setExpanded(false);

    const step = (now: number) => {
      const raw = Math.min(1, (now - start) / ZOOM_MS);
      const t = easeOutCubic(raw);
      const next: ViewRange = {
        i0: from.i0 + (target.i0 - from.i0) * t,
        i1: from.i1 + (target.i1 - from.i1) * t,
        yLo: from.yLo + (target.yLo - from.yLo) * t,
        yHi: from.yHi + (target.yHi - from.yHi) * t,
      };
      displayRangeRef.current = next;
      setDisplayRange(next);
      if (raw < 1) animRef.current = requestAnimationFrame(step);
      else {
        animRef.current = null;
        setIsAnimating(false);
      }
    };
    animRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = null;
    const full = computeFullRange(baseVisible, 0);
    displayRangeRef.current = full;
    setDisplayRange(full);
    setBrush(null);
    setBrushing(false);
    setIsAnimating(false);
    setSelectedIdx(null);
    setExpanded(false);
  }, [tf, baseVisible.length]);

  useEffect(() => {
    setSelectedIdx(null);
    setExpanded(false);
  }, [displayRange]);

  useEffect(() => {
    if (selectedIdx === null) return;
    const onDocClick = (e: MouseEvent) => {
      if (!plotRef.current?.contains(e.target as Node)) {
        setSelectedIdx(null);
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [selectedIdx]);

  const W = 760;
  const H = height;
  const padL = 56;
  const padR = endpointLabel ? 54 : 16;
  const padB = 46;
  const padT = 14;
  const innerW = W - padL - padR;
  const innerH = H - padB - padT;

  const { lo, hi } = yDomainFromRange(displayRange);
  const xSpan = displayRange.i1 - displayRange.i0 || 1;
  const xAt = (i: number) => padL + ((i - displayRange.i0) / xSpan) * innerW;
  const ys = (p: number) => padT + (1 - (p - lo) / (hi - lo || 1)) * innerH;

  const toSvgCoords = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * W,
      y: ((clientY - rect.top) / rect.height) * H,
    };
  };

  const clampToPlot = (x: number, y: number) => ({
    x: Math.max(padL, Math.min(padL + innerW, x)),
    y: Math.max(padT, Math.min(padT + innerH, y)),
  });

  const applyBrush = (box: BrushBox) => {
    const left = Math.max(padL, Math.min(box.x0, box.x1));
    const right = Math.min(padL + innerW, Math.max(box.x0, box.x1));
    const top = Math.max(padT, Math.min(box.y0, box.y1));
    const bottom = Math.min(padT + innerH, Math.max(box.y0, box.y1));

    if (right - left < 14 || bottom - top < 14) return;

    const range = displayRangeRef.current;
    const relSpan = range.i1 - range.i0 || 1;
    const i0rel = ((left - padL) / innerW) * relSpan;
    const i1rel = ((right - padL) / innerW) * relSpan;
    const absI0 = range.i0 + Math.min(i0rel, i1rel);
    const absI1 = range.i0 + Math.max(i0rel, i1rel);

    const yDom = yDomainFromRange(range);
    const probAt = (svgY: number) => yDom.lo + (1 - (svgY - padT) / innerH) * (yDom.hi - yDom.lo);
    const yTop = probAt(top);
    const yBottom = probAt(bottom);
    const yLo = Math.max(0, Math.min(yTop, yBottom));
    const yHi = Math.min(1, Math.max(yTop, yBottom));

    if (absI1 <= absI0 && yHi - yLo < 0.02) return;

    const i0 = absI0;
    const i1 = absI1 <= absI0 ? Math.min(baseVisible.length - 1, absI0 + 1) : absI1;

    animateRange({ i0, i1, yLo, yHi });
  };

  const resetView = () => {
    brushRef.current = null;
    setBrush(null);
    setBrushing(false);
    animateRange(fullRange);
  };

  const zoomBy = (direction: 1 | -1) => {
    animateRange(zoomRelative(displayRangeRef.current, direction, baseVisible));
  };

  const onPlotPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isAnimating) return;
    const target = e.target as Element;
    if (target.closest(".pc-dot-soft") || target.closest(".pc-popup")) return;

    const { x, y } = toSvgCoords(e.clientX, e.clientY);
    if (x < padL || x > padL + innerW || y < padT || y > padT + innerH) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    setBrushing(true);
    const next = { x0: x, y0: y, x1: x, y1: y };
    brushRef.current = next;
    setBrush(next);
    setSelectedIdx(null);
    setExpanded(false);
  };

  const onPlotPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!brushing || !brushRef.current) return;
    const pt = toSvgCoords(e.clientX, e.clientY);
    const { x, y } = clampToPlot(pt.x, pt.y);
    const next = { ...brushRef.current, x1: x, y1: y };
    brushRef.current = next;
    setBrush(next);
  };

  const onPlotPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!brushing) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (brushRef.current) applyBrush(brushRef.current);
    brushRef.current = null;
    setBrush(null);
    setBrushing(false);
  };

  if (points.length < 2) return null;

  const smoothPath = (getY: (p: ProbPoint) => number) =>
    baseVisible.map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${getY(p).toFixed(1)}`).join(" ");

  const line = smoothPath((p) => ys(p.probability));

  const selected = selectedIdx !== null ? baseVisible[selectedIdx] : null;
  const selectedKind = selected ? kindFor(selected.trigger) : null;

  const ticks = 5;
  const gridY = Array.from({ length: ticks }, (_, i) => lo + ((hi - lo) * i) / (ticks - 1));
  const iStart = Math.max(0, Math.floor(displayRange.i0));
  const iEnd = Math.min(baseVisible.length - 1, Math.ceil(displayRange.i1));
  const labelEvery = Math.max(1, Math.ceil((iEnd - iStart + 1) / 7));
  const lastIdx = baseVisible.length - 1;
  const lastPoint = baseVisible[lastIdx];
  const endX = xAt(lastIdx);
  const endY = ys(lastPoint.probability);
  const endpointTag = endpointLabel?.tag ?? "Yes";
  const endpointPct = endpointLabel
    ? `${((endpointLabel.probability ?? lastPoint.probability) * 100).toFixed(0)}%`
    : null;

  return (
    <div className="prob-chart-wrap">
      <div className="pc-toolbar">
        <div className="pc-timeframes" role="tablist" aria-label="Timeframe">
          {TIMEFRAMES.map((t) => (
            <button
              key={t.key}
              className={`pc-tf${tf === t.key ? " active" : ""}`}
              onClick={() => setTf(t.key)}
              type="button"
            >
              {t.key}
            </button>
          ))}
        </div>
        <div className="pc-zoom">
          {isZoomed && (
            <button type="button" className="pc-reset" onClick={resetView}>
              Reset
            </button>
          )}
          <button
            type="button"
            className="pc-zoom-btn"
            aria-label="Zoom in"
            disabled={isAnimating || !zoomInEnabled}
            onClick={() => zoomBy(1)}
          >
            +
          </button>
          <button
            type="button"
            className="pc-zoom-btn"
            aria-label="Zoom out"
            disabled={isAnimating || !isZoomed}
            onClick={() => zoomBy(-1)}
          >
            −
          </button>
        </div>
      </div>

      <div className="pc-legend">
        {(Object.keys(KIND_META) as RefreshKind[]).map((k) => (
          <span className="pc-leg-item" key={k}>
            <span className="pc-leg-dot" style={{ background: KIND_META[k].color }} /> {KIND_META[k].label}
          </span>
        ))}
      </div>

      <div className="pc-plot" ref={plotRef}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          className={`prob-chart${brushing ? " pc-brushing" : ""}${isAnimating ? " pc-animating" : ""}`}
          role="img"
          aria-label={
            endpointPct
              ? `Probability over time. Current estimate: ${endpointPct}`
              : "Probability over time"
          }
          onPointerDown={onPlotPointerDown}
          onPointerMove={onPlotPointerMove}
          onPointerUp={onPlotPointerUp}
          onPointerCancel={onPlotPointerUp}
          onDoubleClick={resetView}
        >
          <defs>
            <clipPath id="pc-clip">
              <rect x={padL} y={padT} width={innerW} height={innerH} />
            </clipPath>
          </defs>

          {gridY.map((g, i) => (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={ys(g)} y2={ys(g)} stroke={CHART_GRID} />
              <text x={padL - 10} y={ys(g) + 3.5} textAnchor="end" fontSize="10.5" fill={CHART_AXIS}>
                {(g * 100).toFixed(0)}
              </text>
            </g>
          ))}

          <g clipPath="url(#pc-clip)">
            <path d={line} fill="none" stroke={CHART_LINE} strokeWidth="2.4" strokeLinejoin="round" />

            {baseVisible.map((p, i) => {
              const cx = xAt(i);
              if (cx < padL - 8 || cx > padL + innerW + 8) return null;

              const isLast = i === baseVisible.length - 1;
              const kind = kindFor(p.trigger);
              const isSoft = kind === "soft";
              const isSelected = selectedIdx === i;
              const r = isLast ? 5 : isSoft ? 3.5 : 3;

              return (
                <circle
                  key={p.id ?? i}
                  cx={cx}
                  cy={ys(p.probability)}
                  r={r}
                  fill={isLast ? CHART_LINE : KIND_META[kind].color}
                  stroke="#fff"
                  strokeWidth={isSelected ? 2 : isLast ? 1.5 : 1}
                  className={isSoft ? "pc-dot-soft" : undefined}
                  style={{ cursor: isSoft && !isAnimating ? "pointer" : "default" }}
                  onClick={
                    isSoft && !isAnimating
                      ? (e) => {
                          e.stopPropagation();
                          if (selectedIdx === i) {
                            setSelectedIdx(null);
                            setExpanded(false);
                          } else {
                            setSelectedIdx(i);
                            setExpanded(false);
                          }
                        }
                      : undefined
                  }
                >
                  {!isSoft && (
                    <title>{`${fmtDate(p.timestamp)} · ${(p.probability * 100).toFixed(0)}%${
                      p.trigger ? ` · ${p.trigger}` : ""
                    }`}</title>
                  )}
                </circle>
              );
            })}
          </g>

          {endpointLabel && endpointPct && (
            <g className="pc-endpoint-label" aria-hidden="true">
              <circle cx={endX} cy={endY} r={18} fill={CHART_LINE} fillOpacity="0.1" />
              <text x={endX + 11} y={endY - 2} fontSize="9.5" fontWeight="600" fill={CHART_LINE}>
                {endpointTag}
              </text>
              <text
                x={endX + 11}
                y={endY + 14}
                fontSize="18"
                fontWeight="700"
                fill={CHART_LINE}
                fontFamily="Roboto Condensed, Arial Narrow, sans-serif"
              >
                {endpointPct}
              </text>
            </g>
          )}

          {baseVisible.map((p, i) =>
            i >= iStart && (i === iEnd || (i - iStart) % labelEvery === 0) ? (
              <text key={`l-${i}`} x={xAt(i)} y={H - 24} textAnchor="middle" fontSize="9.5" fill={CHART_AXIS}>
                {fmtDate(p.timestamp)}
              </text>
            ) : null
          )}

          {brush && (
            <rect
              className="pc-brush-rect"
              x={Math.min(brush.x0, brush.x1)}
              y={Math.min(brush.y0, brush.y1)}
              width={Math.abs(brush.x1 - brush.x0)}
              height={Math.abs(brush.y1 - brush.y0)}
              fill="rgba(22, 52, 92, 0.1)"
              stroke={CHART_LINE}
              strokeWidth="1"
              strokeDasharray="4 3"
              pointerEvents="none"
            />
          )}
        </svg>

        {selected && selectedKind === "soft" && selectedIdx !== null && (
          <div
            className="pc-popup"
            style={{
              left: `${(xAt(selectedIdx) / W) * 100}%`,
              top: `${(ys(selected.probability) / H) * 100}%`,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="pc-popup-close"
              aria-label="Close"
              onClick={() => {
                setSelectedIdx(null);
                setExpanded(false);
              }}
            >
              ×
            </button>
            <div className="pc-popup-meta">
              {fmtDate(selected.timestamp)} · {(selected.probability * 100).toFixed(0)}%
            </div>
            <p className="pc-popup-summary">{selected.summary}</p>
            {expanded && selected.detail && <p className="pc-popup-detail">{selected.detail}</p>}
            {selected.detail && (
              <button type="button" className="pc-popup-toggle" onClick={() => setExpanded((v) => !v)}>
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

export function ReliabilityDiagram({
  bins,
}: {
  bins: { predictedMean: number; observedFrequency: number; count: number }[];
}) {
  const W = 360;
  const H = 360;
  const pad = 38;
  const inner = W - pad * 2;
  const px = (x: number) => pad + x * inner;
  const py = (y: number) => H - pad - y * inner;
  const used = bins.filter((b) => b.count > 0);
  const maxCount = Math.max(...used.map((b) => b.count), 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="reliability">
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (
        <g key={g}>
          <line x1={px(g)} x2={px(g)} y1={py(0)} y2={py(1)} stroke="#eef1ef" />
          <line x1={px(0)} x2={px(1)} y1={py(g)} y2={py(g)} stroke="#eef1ef" />
        </g>
      ))}
      {/* perfect-calibration diagonal */}
      <line x1={px(0)} y1={py(0)} x2={px(1)} y2={py(1)} stroke="#b6c2bc" strokeDasharray="4 4" />
      {/* bars sized by count */}
      {used.map((b, i) => (
        <circle
          key={i}
          cx={px(b.predictedMean)}
          cy={py(b.observedFrequency)}
          r={4 + (b.count / maxCount) * 8}
          fill="#00b888"
          fillOpacity="0.8"
          stroke="#fff"
        >
          <title>{`pred ${(b.predictedMean * 100).toFixed(0)}% → obs ${(b.observedFrequency * 100).toFixed(0)}% (n=${b.count})`}</title>
        </circle>
      ))}
      <polyline
        points={used.map((b) => `${px(b.predictedMean)},${py(b.observedFrequency)}`).join(" ")}
        fill="none"
        stroke="#00b888"
        strokeWidth="2"
      />
      <text x={W / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="#5b6b66">
        Predicted probability
      </text>
      <text x={12} y={H / 2} textAnchor="middle" fontSize="11" fill="#5b6b66" transform={`rotate(-90 12 ${H / 2})`}>
        Observed frequency
      </text>
    </svg>
  );
}

export function MiniBars({ data }: { data: { date: string; brier: number }[] }) {
  const W = 720;
  const H = 200;
  const pad = 34;
  const innerW = W - pad - 12;
  const innerH = H - pad - 12;
  const max = Math.max(...data.map((d) => d.brier)) * 1.15;
  const xs = (i: number) => pad + (i / (data.length - 1)) * innerW;
  const ys = (v: number) => 12 + (1 - v / max) * innerH;
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${xs(i)},${ys(d.brier)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {[0, 0.1, 0.2, 0.3].map((g) => (
        <g key={g}>
          <line x1={pad} x2={W - 12} y1={ys(g)} y2={ys(g)} stroke="#eef1ef" />
          <text x={pad - 6} y={ys(g) + 3} textAnchor="end" fontSize="10" fill="#8a978f">
            {g.toFixed(2)}
          </text>
        </g>
      ))}
      <path d={line} fill="none" stroke="#2f6df6" strokeWidth="2.2" />
      {data.map((d, i) => (
        <circle key={i} cx={xs(i)} cy={ys(d.brier)} r="3" fill="#2f6df6" />
      ))}
      {data.map((d, i) =>
        i % 2 === 0 ? (
          <text key={i} x={xs(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="#8a978f">
            {d.date.slice(2)}
          </text>
        ) : null
      )}
    </svg>
  );
}
