// Lightweight dependency-free SVG charts used across the dashboard.

export function Sparkline({
  values,
  width = 120,
  height = 34,
  color = "#00b888",
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const up = values[values.length - 1] >= values[0];
  const stroke = color ?? (up ? "#00b888" : "#e5484d");
  return (
    <svg width={width} height={height} className="sparkline">
      <polyline points={pts.join(" ")} fill="none" stroke={stroke} strokeWidth="1.8" />
    </svg>
  );
}

export interface ProbPoint {
  timestamp: string;
  probability: number;
  trigger?: string;
}

export function ProbChart({
  points,
  annotations = [],
  height = 240,
}: {
  points: ProbPoint[];
  annotations?: { index: number; label: string }[];
  height?: number;
}) {
  const W = 720;
  const H = height;
  const padL = 36;
  const padB = 24;
  const padT = 12;
  const innerW = W - padL - 12;
  const innerH = H - padB - padT;
  if (points.length < 2) return null;

  const xs = (i: number) => padL + (i / (points.length - 1)) * innerW;
  const ys = (p: number) => padT + (1 - p) * innerH;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${xs(i).toFixed(1)},${ys(p.probability).toFixed(1)}`).join(" ");
  const area = `${line} L${xs(points.length - 1)},${padT + innerH} L${padL},${padT + innerH} Z`;

  const gridY = [0, 0.25, 0.5, 0.75, 1];
  const labelEvery = Math.ceil(points.length / 6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="prob-chart" role="img">
      <defs>
        <linearGradient id="pcfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00b888" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#00b888" stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridY.map((g) => (
        <g key={g}>
          <line x1={padL} x2={W - 12} y1={ys(g)} y2={ys(g)} stroke="#eef1ef" />
          <text x={padL - 8} y={ys(g) + 3} textAnchor="end" fontSize="10" fill="#8a978f">
            {(g * 100).toFixed(0)}%
          </text>
        </g>
      ))}
      <path d={area} fill="url(#pcfill)" />
      <path d={line} fill="none" stroke="#00b888" strokeWidth="2.2" />
      {annotations.map((a) => (
        <g key={a.index}>
          <circle cx={xs(a.index)} cy={ys(points[a.index].probability)} r="4" fill="#fff" stroke="#0e1a16" strokeWidth="2">
            <title>{a.label}</title>
          </circle>
        </g>
      ))}
      {points.map((p, i) =>
        i % labelEvery === 0 ? (
          <text key={i} x={xs(i)} y={H - 6} textAnchor="middle" fontSize="9.5" fill="#8a978f">
            {p.timestamp.slice(5)}
          </text>
        ) : null
      )}
    </svg>
  );
}

export interface ScatterDot {
  x: number; // probability 0..1
  y: number; // impact 0..1
  color: string;
  label: string;
  r?: number;
}

export function ScatterMatrix({ dots }: { dots: ScatterDot[] }) {
  const W = 640;
  const H = 420;
  const pad = 44;
  const innerW = W - pad * 2;
  const innerH = H - pad * 2;
  const px = (x: number) => pad + x * innerW;
  const py = (y: number) => pad + (1 - y) * innerH;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="scatter">
      {/* quadrant shading: top-right = high prob + high impact */}
      <rect x={px(0.5)} y={py(1)} width={innerW / 2} height={innerH / 2} fill="#fdeceb" />
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (
        <g key={`x${g}`}>
          <line x1={px(g)} x2={px(g)} y1={pad} y2={H - pad} stroke="#eef1ef" />
          <text x={px(g)} y={H - pad + 16} textAnchor="middle" fontSize="10" fill="#8a978f">
            {(g * 100).toFixed(0)}%
          </text>
        </g>
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (
        <g key={`y${g}`}>
          <line x1={pad} x2={W - pad} y1={py(g)} y2={py(g)} stroke="#eef1ef" />
          <text x={pad - 8} y={py(g) + 3} textAnchor="end" fontSize="10" fill="#8a978f">
            {(g * 100).toFixed(0)}
          </text>
        </g>
      ))}
      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#5b6b66" fontWeight={600}>
        Probability →
      </text>
      <text x={14} y={H / 2} textAnchor="middle" fontSize="11" fill="#5b6b66" fontWeight={600} transform={`rotate(-90 14 ${H / 2})`}>
        Impact →
      </text>
      {dots.map((d, i) => (
        <g key={i}>
          <circle cx={px(d.x)} cy={py(d.y)} r={d.r ?? 8} fill={d.color} fillOpacity="0.85" stroke="#fff" strokeWidth="1.5">
            <title>{d.label}</title>
          </circle>
        </g>
      ))}
    </svg>
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
