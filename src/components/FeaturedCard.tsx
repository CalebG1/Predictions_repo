import { featuredMarket as f } from "../data";

function genPath(seed: number, base: number) {
  const pts: string[] = [];
  const n = 40;
  let v = base;
  for (let i = 0; i < n; i++) {
    const noise = Math.sin(i * 0.7 + seed) * 4 + Math.cos(i * 0.3 + seed * 2) * 3;
    v = base + noise + (i > 20 ? (seed % 2 === 0 ? 3 : -4) : 0);
    const x = (i / (n - 1)) * 300;
    const y = 120 - ((v - 37) / 31) * 120;
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

export default function FeaturedCard() {
  return (
    <div className="featured">
      <div className="featured-top">
        <div className="featured-eyebrow">
          <span className="mc-logo" style={{ background: "#1b1b1b", borderRadius: 6 }}>
            💬
          </span>
          {f.eyebrow}
        </div>
        <div className="pager">
          <button>‹</button>
          <span>
            {f.page} of {f.totalPages}
          </span>
          <button>›</button>
        </div>
      </div>

      <h2 className="featured-title">{f.title}</h2>

      <div className="featured-body">
        <div className="featured-table">
          <div className="ft-head">
            <span>Market</span>
            <span>Pays out</span>
            <span>Odds</span>
          </div>
          <div className="mc-rows">
            {f.rows.map((r) => (
              <div key={r.label} className="mc-row">
                <span className="mc-outcome">{r.label}</span>
                <span className="mc-mult">{r.mult}</span>
                <button className="mc-pct">{r.pct}%</button>
              </div>
            ))}
          </div>
          <div className="mc-foot">
            <span>{f.volume}</span>
            <span className="markets">{f.more} more</span>
          </div>
          <p className="featured-news">
            <b>News</b> {f.news}
          </p>
        </div>

        <div className="chart-wrap">
          <div className="chart-legend">
            {f.legend.map((l) => (
              <span key={l.label}>
                <span className="dot" style={{ background: l.color }} />
                {l.label} <b>{l.pct}%</b>
              </span>
            ))}
          </div>
          <svg viewBox="0 0 340 130" width="100%" height="190" preserveAspectRatio="none">
            {[37.5, 45, 52.5, 60, 67.5].map((g, i) => (
              <line key={g} x1="0" x2="300" y1={120 - i * 30} y2={120 - i * 30} stroke="#eef1ef" strokeWidth="1" />
            ))}
            <path d={genPath(1, 58)} fill="none" stroke={f.legend[0].color} strokeWidth="2" />
            <path d={genPath(2, 52)} fill="none" stroke={f.legend[1].color} strokeWidth="2" />
            <path d={genPath(3, 44)} fill="none" stroke={f.legend[2].color} strokeWidth="2" />
            {[37.5, 45, 52.5, 60, 67.5].reverse().map((g, i) => (
              <text key={g} x="305" y={i * 30 + 4} fontSize="8" fill="#8a978f">
                {g}%
              </text>
            ))}
          </svg>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#8a978f", marginTop: 4 }}>
            <span>2:00pm</span>
            <span>2:15pm</span>
            <span>2:30pm</span>
            <span>2:45pm</span>
            <span>3:00pm</span>
          </div>
        </div>
      </div>
    </div>
  );
}
