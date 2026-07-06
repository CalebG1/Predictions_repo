// Lightweight dependency-free SVG charts used across the dashboard.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

function fmtCrosshairDate(d: Date): string {
  if (Number.isNaN(d.getTime())) return "";
  const rounded = new Date(d);
  rounded.setMinutes(0, 0, 0);
  if (d.getMinutes() >= 30) rounded.setHours(rounded.getHours() + 1);
  const hour = rounded.getHours();
  const h12 = hour % 12 || 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${MONTHS[rounded.getMonth()]} ${rounded.getDate()} · ${h12} ${ampm}`;
}

function absIFromX(
  x: number,
  padL: number,
  plotInnerW: number,
  range: ViewRange,
  xSpan: number
): number {
  const frac = Math.max(0, Math.min(1, (x - padL) / (plotInnerW || 1)));
  return range.i0 + frac * xSpan;
}

function valueAtAbsI(absI: number, values: number[]): number {
  const i0 = Math.max(0, Math.min(values.length - 1, Math.floor(absI)));
  const i1 = Math.min(values.length - 1, i0 + 1);
  const t = absI - i0;
  return values[i0] + t * (values[i1] - values[i0]);
}

function timeAtAbsI(absI: number, visible: ProbPoint[]): Date {
  const i0 = Math.max(0, Math.min(visible.length - 1, Math.floor(absI)));
  const i1 = Math.min(visible.length - 1, i0 + 1);
  const t = absI - i0;
  const ms0 = new Date(visible[i0].timestamp).getTime();
  const ms1 = new Date(visible[i1].timestamp).getTime();
  if (ms0 === ms1) {
    const start = new Date(visible[0].timestamp).getTime();
    const end = new Date(visible[visible.length - 1].timestamp).getTime();
    const span = (end - start) / Math.max(1, visible.length - 1);
    return new Date(ms0 + (absI - i0) * span);
  }
  return new Date(ms0 + t * (ms1 - ms0));
}

/** Spread label anchors so text blocks (above + below anchor) never overlap. */
function declutterLabelYs(
  anchorYs: number[],
  blockAbove: number,
  blockBelow: number,
  gap: number,
  lo: number,
  hi: number
): number[] {
  if (anchorYs.length === 0) return [];
  const ys = [...anchorYs];
  const top = (y: number) => y - blockAbove;
  const bottom = (y: number) => y + blockBelow;

  for (let iter = 0; iter < 16; iter++) {
    const order = ys.map((_, i) => i).sort((a, b) => ys[a] - ys[b]);
    for (let k = 1; k < order.length; k++) {
      const i = order[k];
      const prev = order[k - 1];
      const push = bottom(ys[prev]) + gap - top(ys[i]);
      if (push > 0) ys[i] += push;
    }
    const maxBottom = Math.max(...ys.map(bottom));
    if (maxBottom > hi) {
      const shift = maxBottom - hi;
      for (let i = 0; i < ys.length; i++) ys[i] -= shift;
    }
    const minTop = Math.min(...ys.map(top));
    if (minTop < lo) {
      const shift = lo - minTop;
      for (let i = 0; i < ys.length; i++) ys[i] += shift;
    }
  }

  return ys;
}

/** Optional companion lines aligned 1:1 with the primary `points` array. */
export interface CompanionSeries {
  id: string;
  label: string;
  color: string;
  values: number[];
  /** Refresh metadata aligned 1:1 with primary `points`. */
  meta: ProbPoint[];
}

const ZOOM_MS = 480;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function svgRenderMetrics(svg: SVGSVGElement, viewW: number, viewH: number) {
  const rect = svg.getBoundingClientRect();
  const scale = Math.min(rect.width / viewW, rect.height / viewH);
  return { rect, scale, offsetX: 0, offsetY: 0 };
}

function clientToSvgPoint(
  svg: SVGSVGElement,
  viewW: number,
  viewH: number,
  clientX: number,
  clientY: number
) {
  const { rect, scale, offsetX, offsetY } = svgRenderMetrics(svg, viewW, viewH);
  return {
    x: (clientX - rect.left - offsetX) / scale,
    y: (clientY - rect.top - offsetY) / scale,
  };
}

function svgPointToClient(
  svg: SVGSVGElement,
  viewW: number,
  viewH: number,
  svgX: number,
  svgY: number
) {
  const { rect, scale, offsetX, offsetY } = svgRenderMetrics(svg, viewW, viewH);
  return {
    x: rect.left + offsetX + svgX * scale,
    y: rect.top + offsetY + svgY * scale,
  };
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

/** Stable colors for common categorical option labels. */
const OPTION_COLORS: Record<string, string> = {
  OpenAI: "#5a9a87",
  Google: "#6889b8",
  Anthropic: "#c08a4a",
  Meta: "#8f7aab",
};

const OPTION_FALLBACK = ["#5a9a87", "#6889b8", "#c08a4a", "#8f7aab"];

export function colorForOption(label: string, index: number): string {
  return OPTION_COLORS[label] ?? OPTION_FALLBACK[index % OPTION_FALLBACK.length];
}

type SelectedDot = {
  seriesId: string;
  idx: number;
};

type PopupAnchor = {
  x: number;
  y: number;
  placeBelow: boolean;
  arrowShift: number;
};

export function ProbChart({
  points,
  height = 300,
  endpointLabel,
  companionSeries,
  primaryLineColor,
}: {
  points: ProbPoint[];
  // Kept for backwards compatibility; annotations are now derived internally.
  annotations?: { index: number; label: string }[];
  height?: number;
  endpointLabel?: { tag?: string; probability: number };
  /** Additional lines for categorical (multi-option) questions. */
  companionSeries?: CompanionSeries[];
  primaryLineColor?: string;
}) {
  const [tf, setTf] = useState("All");
  const [displayRange, setDisplayRange] = useState<ViewRange>({ i0: 0, i1: 1, yLo: 0, yHi: 1 });
  const [brush, setBrush] = useState<BrushBox | null>(null);
  const [brushing, setBrushing] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedDot, setSelectedDot] = useState<SelectedDot | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [popupAnchor, setPopupAnchor] = useState<PopupAnchor | null>(null);
  const [drawerInsetSvg, setDrawerInsetSvg] = useState(0);
  const plotRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
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

  // Re-align companion values to the timeframe-filtered `baseVisible` slice.
  const alignedCompanions = useMemo(() => {
    if (!companionSeries?.length) return [];
    return companionSeries.map((s) => ({
      ...s,
      values: baseVisible.map((p) => {
        const idx = points.findIndex((pt) => pt.id === p.id);
        return idx >= 0 ? s.values[idx] : 0;
      }),
      meta: baseVisible.map((p) => {
        const idx = points.findIndex((pt) => pt.id === p.id);
        return idx >= 0 ? s.meta[idx] : { timestamp: p.timestamp, probability: 0 };
      }),
    }));
  }, [companionSeries, baseVisible, points]);

  const hasCompanions = alignedCompanions.length > 0;
  const primaryColor = primaryLineColor ?? (hasCompanions ? OPTION_FALLBACK[0] : CHART_LINE);

  const animateRange = useCallback((target: ViewRange) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const from = { ...displayRangeRef.current };
    const start = performance.now();
    setIsAnimating(true);
    setSelectedDot(null);
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
    setSelectedDot(null);
    setHoverX(null);
    setExpanded(false);
  }, [tf, baseVisible.length]);

  useEffect(() => {
    setSelectedDot(null);
    setHoverX(null);
    setExpanded(false);
  }, [displayRange]);

  useEffect(() => {
    if (selectedDot === null) return;
    const onDocClick = (e: MouseEvent) => {
      if (!plotRef.current?.contains(e.target as Node)) {
        setSelectedDot(null);
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [selectedDot]);

  const chartHeight = height;
  const chartViewW = 760;

  const W = chartViewW;
  const H = chartHeight;
  const padL = 44;
  const padR = hasCompanions ? 120 : endpointLabel ? 54 : 24;
  const labelOffset = 10;
  const padB = 46;
  const padT = 34;
  const innerW = W - padL - padR;
  const innerH = H - padB - padT;
  const plotInnerW = Math.max(120, innerW - drawerInsetSvg);

  const { lo, hi } = yDomainFromRange(displayRange);
  const xSpan = displayRange.i1 - displayRange.i0 || 1;
  const xAt = (i: number) => padL + ((i - displayRange.i0) / xSpan) * plotInnerW;
  const ys = (p: number) => padT + (1 - (p - lo) / (hi - lo || 1)) * innerH;

  useLayoutEffect(() => {
    const updateInset = () => {
      if (!expanded || !drawerRef.current || !chartRef.current) {
        setDrawerInsetSvg(0);
        return;
      }
      const drawerW = drawerRef.current.getBoundingClientRect().width;
      const chartW = chartRef.current.getBoundingClientRect().width;
      if (chartW <= 0 || drawerW <= 0) {
        setDrawerInsetSvg(0);
        return;
      }
      setDrawerInsetSvg((drawerW / chartW) * chartViewW);
    };

    updateInset();
    const ro = new ResizeObserver(updateInset);
    if (drawerRef.current) ro.observe(drawerRef.current);
    if (chartRef.current) ro.observe(chartRef.current);
    return () => ro.disconnect();
  }, [expanded, chartViewW]);

  useLayoutEffect(() => {
    const selectedProb = selectedDot
      ? selectedDot.seriesId === "primary"
        ? baseVisible[selectedDot.idx]?.probability ?? null
        : alignedCompanions.find((s) => s.id === selectedDot.seriesId)?.values[selectedDot.idx] ?? null
      : null;

    const updateAnchor = () => {
      if (!selectedDot || selectedProb === null || !svgRef.current || !chartRef.current) {
        setPopupAnchor(null);
        return;
      }

      const svg = svgRef.current;
      const chart = chartRef.current;
      const chartRect = chart.getBoundingClientRect();
      const anchorX = xAt(selectedDot.idx);
      const anchorY = ys(selectedProb);
      const point = svgPointToClient(svg, chartViewW, chartHeight, anchorX, anchorY);
      const x = point.x - chartRect.left;
      const y = point.y - chartRect.top;

      const popupEl = popupRef.current;
      const popupH = popupEl?.offsetHeight ?? 100;
      const popupW = popupEl?.offsetWidth ?? 260;
      const pad = 8;
      const gap = 10;

      const clampedX = Math.max(
        popupW / 2 + pad,
        Math.min(chartRect.width - popupW / 2 - pad, x)
      );
      const placeBelow = y - popupH - gap < pad;

      setPopupAnchor({ x: clampedX, y, placeBelow, arrowShift: x - clampedX });
    };

    updateAnchor();
    const raf = requestAnimationFrame(updateAnchor);

    const svg = svgRef.current;
    const chart = chartRef.current;
    if (!svg || !chart) return () => cancelAnimationFrame(raf);

    const ro = new ResizeObserver(updateAnchor);
    ro.observe(svg);
    ro.observe(chart);
    if (popupRef.current) ro.observe(popupRef.current);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [
    selectedDot,
    chartHeight,
    expanded,
    drawerInsetSvg,
    displayRange,
    baseVisible,
    alignedCompanions,
    plotInnerW,
    lo,
    hi,
  ]);

  const toSvgCoords = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    return clientToSvgPoint(svg, W, H, clientX, clientY);
  };

  const clampToPlot = (x: number, y: number) => ({
    x: Math.max(padL, Math.min(padL + plotInnerW, x)),
    y: Math.max(padT, Math.min(padT + innerH, y)),
  });

  const applyBrush = (box: BrushBox) => {
    const left = Math.max(padL, Math.min(box.x0, box.x1));
    const right = Math.min(padL + plotInnerW, Math.max(box.x0, box.x1));
    const top = Math.max(padT, Math.min(box.y0, box.y1));
    const bottom = Math.min(padT + innerH, Math.max(box.y0, box.y1));

    if (right - left < 14 || bottom - top < 14) return;

    const range = displayRangeRef.current;
    const relSpan = range.i1 - range.i0 || 1;
    const i0rel = ((left - padL) / plotInnerW) * relSpan;
    const i1rel = ((right - padL) / plotInnerW) * relSpan;
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
    if (target.closest(".pc-dot-soft") || target.closest(".pc-popup") || target.closest(".pc-evidence-drawer")) return;

    const { x, y } = toSvgCoords(e.clientX, e.clientY);
    if (x < padL || x > padL + plotInnerW || y < padT || y > padT + innerH) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    setBrushing(true);
    const next = { x0: x, y0: y, x1: x, y1: y };
    brushRef.current = next;
    setBrush(next);
    setSelectedDot(null);
    setHoverX(null);
    setExpanded(false);
  };

  const updateHover = (clientX: number) => {
    if (brushing || isAnimating || selectedDot) return;
    const { x } = toSvgCoords(clientX, 0);
    if (x < padL - 4 || x > padL + plotInnerW + 4) {
      setHoverX(null);
      return;
    }
    setHoverX(Math.max(padL, Math.min(padL + plotInnerW, x)));
  };

  const onPlotPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (brushing && brushRef.current) {
      const pt = toSvgCoords(e.clientX, e.clientY);
      const { x, y } = clampToPlot(pt.x, pt.y);
      const next = { ...brushRef.current, x1: x, y1: y };
      brushRef.current = next;
      setBrush(next);
      return;
    }
    updateHover(e.clientX);
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

  const pathFromValues = (values: number[], from: number, to: number) =>
    values
      .slice(from, to + 1)
      .map((v, k) => `${k === 0 ? "M" : "L"}${xAt(from + k).toFixed(1)},${ys(v).toFixed(1)}`)
      .join(" ");

  const pathToFrac = (values: number[], from: number, toFrac: number) => {
    const iEnd = Math.floor(toFrac);
    let path = pathFromValues(values, from, iEnd);
    const t = toFrac - iEnd;
    if (t > 0.001 && iEnd + 1 < values.length) {
      const y = valueAtAbsI(toFrac, values);
      path += ` L${xAt(toFrac).toFixed(1)},${ys(y).toFixed(1)}`;
    }
    return path;
  };

  const primaryValues = baseVisible.map((p) => p.probability);
  const lastIdx = baseVisible.length - 1;
  const pinnedIdx = selectedDot?.idx ?? null;
  const effFrac =
    pinnedIdx ?? (hoverX !== null ? absIFromX(hoverX, padL, plotInnerW, displayRange, xSpan) : lastIdx);
  const crosshairActive = (pinnedIdx !== null || hoverX !== null) && !brushing && !isAnimating;
  const crosshairX = pinnedIdx !== null ? xAt(pinnedIdx) : hoverX ?? xAt(lastIdx);
  const crosshairDate = fmtCrosshairDate(timeAtAbsI(effFrac, baseVisible));
  const primaryAtCrosshair = valueAtAbsI(effFrac, primaryValues);

  const selectedPoint: ProbPoint | null = selectedDot
    ? selectedDot.seriesId === "primary"
      ? (baseVisible[selectedDot.idx] ?? null)
      : (alignedCompanions.find((s) => s.id === selectedDot.seriesId)?.meta[selectedDot.idx] ?? null)
    : null;

  const selectedProb: number | null = selectedDot
    ? selectedDot.seriesId === "primary"
      ? primaryValues[selectedDot.idx]
      : (alignedCompanions.find((s) => s.id === selectedDot.seriesId)?.values[selectedDot.idx] ?? null)
    : null;

  const selectedKind = selectedPoint ? kindFor(selectedPoint.trigger) : null;
  const drawerOpen = expanded && !!selectedPoint?.detail;

  const ticks = 5;
  const gridY = Array.from({ length: ticks }, (_, i) => lo + ((hi - lo) * i) / (ticks - 1));
  const iStart = Math.max(0, Math.floor(displayRange.i0));
  const iEnd = Math.min(baseVisible.length - 1, Math.ceil(displayRange.i1));
  const labelEvery = Math.max(1, Math.ceil((iEnd - iStart + 1) / 7));
  const lastPoint = baseVisible[lastIdx];
  const endX = xAt(lastIdx);
  const endY = ys(lastPoint.probability);
  const endpointTag = endpointLabel?.tag ?? "Yes";
  const endpointPct = endpointLabel
    ? `${((endpointLabel.probability ?? lastPoint.probability) * 100).toFixed(0)}%`
    : null;

  const readoutSeries = [
    {
      id: "primary",
      label: endpointTag,
      color: primaryColor,
      value: primaryAtCrosshair,
    },
    ...(alignedCompanions.map((s) => ({
      id: s.id,
      label: s.label,
      color: s.color,
      value: valueAtAbsI(effFrac, s.values),
    }))),
  ];

  const endLabelYs = hasCompanions
    ? declutterLabelYs(
        [
          endY,
          ...alignedCompanions.map((s) => ys(s.values[lastIdx] ?? 0)),
        ],
        8,
        10,
        4,
        padT + 4,
        padT + innerH - 2
      )
    : null;

  const trackLabelYs = crosshairActive
    ? declutterLabelYs(
        readoutSeries.map((s) => ys(s.value)),
        14,
        15,
        4,
        padT + 2,
        padT + innerH - 2
      )
    : null;

  const lineW = hasCompanions ? 1.35 : 1.6;
  const lineWPrimary = hasCompanions ? 1.45 : 1.75;
  const dotLastR = 3.5;
  const dotSoftR = 2.25;
  const dotR = 1.75;
  const dotHitR = 10;
  const dotHistOpacity = 0.62;

  return (
    <div className="prob-chart-wrap">
      <div className="pc-toolbar">
        <div className="pc-legend">
          {(Object.keys(KIND_META) as RefreshKind[]).map((k) => (
            <span className="pc-leg-item" key={k}>
              <span className="pc-leg-dot" style={{ background: KIND_META[k].color }} /> {KIND_META[k].label}
            </span>
          ))}
        </div>
        <div className="pc-toolbar-controls">
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
      </div>

      <div className={`pc-plot${drawerOpen ? " pc-drawer-open" : ""}`} ref={plotRef}>
        <div className="pc-plot-chart" ref={chartRef} style={{ aspectRatio: `${W} / ${H}` }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMinYMin meet"
          className={`prob-chart${brushing ? " pc-brushing" : crosshairActive ? " pc-hovering" : ""}${isAnimating ? " pc-animating" : ""}`}
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
          onPointerLeave={() => setHoverX(null)}
          onDoubleClick={resetView}
        >
          <defs>
            <clipPath id="pc-clip">
              <rect x={padL} y={padT} width={plotInnerW} height={innerH} />
            </clipPath>
          </defs>

          {gridY.map((g, i) => (
            <g key={i}>
              <line
                x1={padL}
                x2={padL + plotInnerW}
                y1={ys(g)}
                y2={ys(g)}
                stroke="#d8dce0"
                strokeWidth="1"
                strokeDasharray="2 4"
              />
              <text x={padL - 8} y={ys(g) + 3.5} textAnchor="end" fontSize="10.5" fill={CHART_AXIS}>
                {(g * 100).toFixed(0)}%
              </text>
            </g>
          ))}

          <g clipPath="url(#pc-clip)">
            {/* companion lines (faded future + solid past on hover) */}
            {(alignedCompanions).map((s) => (
              <g key={s.id}>
                {crosshairActive && (
                  <path
                    d={pathFromValues(s.values, 0, lastIdx)}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={lineW}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    opacity={0.22}
                  />
                )}
                <path
                  d={pathToFrac(s.values, 0, crosshairActive ? effFrac : lastIdx)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={lineW}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </g>
            ))}

            {/* primary line */}
            {(() => {
              const color = primaryColor;
              return (
                <g>
                  {crosshairActive && (
                    <path
                      d={pathFromValues(primaryValues, 0, lastIdx)}
                      fill="none"
                      stroke={color}
                      strokeWidth={lineWPrimary}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      opacity={0.22}
                    />
                  )}
                  <path
                    d={pathToFrac(primaryValues, 0, crosshairActive ? effFrac : lastIdx)}
                    fill="none"
                    stroke={color}
                    strokeWidth={lineWPrimary}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </g>
              );
            })()}

            {[
              { id: "primary", lineColor: primaryColor, values: primaryValues, meta: baseVisible },
              ...alignedCompanions.map((s) => ({
                id: s.id,
                lineColor: s.color,
                values: s.values,
                meta: s.meta,
              })),
            ].flatMap((series) =>
              baseVisible.map((_, i) => {
                const cx = xAt(i);
                if (cx < padL - 8 || cx > padL + plotInnerW + 8) return null;

                const p = series.meta[i];
                const prob = series.values[i] ?? 0;
                const isLast = i === baseVisible.length - 1;
                const kind = kindFor(p.trigger);
                const isSoft = kind === "soft";
                const isSelected =
                  selectedDot?.seriesId === series.id && selectedDot?.idx === i;
                const r = isLast ? dotLastR : isSoft ? dotSoftR : dotR;
                const faded = crosshairActive && i > effFrac;
                const dotOpacity = faded ? 0.25 : isLast ? 1 : dotHistOpacity;
                const handleSoftClick =
                  isSoft && !isAnimating
                    ? (e: React.MouseEvent) => {
                        e.stopPropagation();
                        if (isSelected) {
                          setSelectedDot(null);
                          setExpanded(false);
                        } else {
                          setSelectedDot({ seriesId: series.id, idx: i });
                          setExpanded(false);
                        }
                      }
                    : undefined;

                const visibleDot = (
                  <circle
                    cx={cx}
                    cy={ys(prob)}
                    r={isSelected ? r + 0.75 : r}
                    fill={isLast ? series.lineColor : KIND_META[kind].color}
                    stroke="#fff"
                    strokeWidth={isSelected ? 1.25 : isLast ? 0.85 : 0.5}
                    opacity={dotOpacity}
                    pointerEvents="none"
                  />
                );

                if (isSoft) {
                  return (
                    <g key={`${series.id}-${p.id ?? i}`}>
                      <circle
                        cx={cx}
                        cy={ys(prob)}
                        r={dotHitR}
                        fill="transparent"
                        className="pc-dot-soft"
                        style={{ cursor: !isAnimating ? "pointer" : "default" }}
                        onClick={handleSoftClick}
                      />
                      {visibleDot}
                    </g>
                  );
                }

                return (
                  <g key={`${series.id}-${p.id ?? i}`}>
                    {visibleDot}
                    <title>{`${fmtDate(p.timestamp)} · ${(prob * 100).toFixed(0)}%${
                      p.trigger ? ` · ${p.trigger}` : ""
                    }`}</title>
                  </g>
                );
              })
            )}
          </g>

          {/* endpoint labels at line ends (hidden while crosshair is active) */}
          {!crosshairActive && hasCompanions && endLabelYs ? (
            <>
              <text
                x={endX + labelOffset}
                y={endLabelYs[0] + 4}
                fontSize="12"
                fontWeight="600"
                fill={primaryColor}
              >
                {endpointTag} {(primaryValues[lastIdx] * 100).toFixed(1)}%
              </text>
              {alignedCompanions.map((s, i) => (
                <text
                  key={`el-${s.id}`}
                  x={endX + labelOffset}
                  y={endLabelYs[i + 1] + 4}
                  fontSize="12"
                  fontWeight="600"
                  fill={s.color}
                >
                  {s.label} {((s.values[lastIdx] ?? 0) * 100).toFixed(1)}%
                </text>
              ))}
            </>
          ) : (
            !crosshairActive &&
            endpointLabel &&
            endpointPct && (
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
            )
          )}

          {/* hover crosshair + date pill + inline tracking labels */}
          {crosshairActive && trackLabelYs && (
            <g className="pc-cross" pointerEvents="none">
              <line
                x1={crosshairX}
                x2={crosshairX}
                y1={padT - 4}
                y2={padT + innerH}
                stroke="#9aa5ad"
                strokeWidth="1"
              />
              <circle
                cx={crosshairX}
                cy={ys(primaryAtCrosshair)}
                r={3}
                fill={hasCompanions ? primaryColor : CHART_LINE}
                stroke="#fff"
                strokeWidth="1"
              />
              {alignedCompanions.map((s) => (
                <circle
                  key={`hc-${s.id}`}
                  cx={crosshairX}
                  cy={ys(valueAtAbsI(effFrac, s.values))}
                  r={3}
                  fill={s.color}
                  stroke="#fff"
                  strokeWidth="1"
                />
              ))}

              {readoutSeries.map((s, i) => (
                <g key={`tl-${s.id}`}>
                  <text
                    x={crosshairX + labelOffset}
                    y={trackLabelYs[i] - 5}
                    fontSize="9.5"
                    fontWeight="700"
                    fill={s.color}
                    letterSpacing="0.3"
                  >
                    {s.label.toUpperCase()}
                  </text>
                  <text
                    x={crosshairX + labelOffset}
                    y={trackLabelYs[i] + 10}
                    fontSize="14"
                    fontWeight="700"
                    fill={s.color}
                    fontFamily="Roboto Condensed, Arial Narrow, sans-serif"
                  >
                    {(s.value * 100).toFixed(1)}%
                  </text>
                </g>
              ))}

              <g
                className="pc-crosshair-date"
                transform={`translate(${Math.max(
                  padL + 52,
                  Math.min(padL + plotInnerW - 52, crosshairX)
                )}, ${padT - 13})`}
              >
                <rect x={-52} y={-10} width={104} height={16} rx={3} fill="#f4f6f5" stroke="#dde2df" strokeWidth="0.75" />
                <text
                  x={0}
                  y={1.5}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill={CHART_AXIS}
                  letterSpacing="0.1"
                >
                  {crosshairDate}
                </text>
              </g>
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

        {selectedPoint && selectedKind === "soft" && selectedDot !== null && selectedProb !== null && (
          <div
            ref={popupRef}
            className={`pc-popup${popupAnchor?.placeBelow ? " pc-popup--below" : ""}`}
            style={{
              left: popupAnchor?.x ?? 0,
              top: popupAnchor?.y ?? 0,
              visibility: popupAnchor ? "visible" : "hidden",
              ["--pc-arrow-shift" as string]: popupAnchor ? `${popupAnchor.arrowShift}px` : "0px",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="pc-popup-close"
              aria-label="Close"
              onClick={() => {
                setSelectedDot(null);
                setExpanded(false);
              }}
            >
              ×
            </button>
            <div className="pc-popup-meta">
              {fmtDate(selectedPoint.timestamp)} · {(selectedProb * 100).toFixed(0)}%
            </div>
            <p className="pc-popup-summary">{selectedPoint.summary}</p>
            {selectedPoint.detail && (
              <button type="button" className="pc-popup-toggle" onClick={() => setExpanded((v) => !v)}>
                {drawerOpen ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        )}
        </div>

        {selectedPoint?.detail && (
          <aside
            ref={drawerRef}
            className={`pc-evidence-drawer${drawerOpen ? " open" : ""}`}
            aria-hidden={!drawerOpen}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="pc-evidence-drawer-head">
              <span className="pc-evidence-drawer-title">Evidence</span>
              <button
                type="button"
                className="pc-evidence-drawer-close"
                aria-label="Close evidence panel"
                onClick={() => {
                  setExpanded(false);
                  setSelectedDot(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="pc-evidence-drawer-meta">
              {fmtDate(selectedPoint.timestamp)}
              {selectedProb !== null && ` · ${(selectedProb * 100).toFixed(0)}%`}
            </div>
            {selectedPoint.trigger && (
              <div className="pc-evidence-drawer-trigger">{selectedPoint.trigger}</div>
            )}
            <p className="pc-evidence-drawer-summary">{selectedPoint.summary}</p>
            <p className="pc-evidence-drawer-detail">{selectedPoint.detail}</p>
          </aside>
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
