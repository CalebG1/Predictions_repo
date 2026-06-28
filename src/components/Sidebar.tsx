import { useState } from "react";
import { trendingList, primaries2026 } from "../data";
import type { TrendItem } from "../data";

function TrendRow({ item, rank }: { item: TrendItem; rank: number }) {
  const up = item.change >= 0;
  return (
    <div className="trend-item">
      <span className="trend-rank">{rank}</span>
      <div>
        <div className="trend-q">{item.q}</div>
        <div className="trend-sub">{item.sub}</div>
      </div>
      <div className="trend-num">
        <div className="trend-pct">{item.pct}%</div>
        <div className={`trend-change ${up ? "up" : "down"}`}>
          {up ? "▲" : "▼"} {Math.abs(item.change)}
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [mode, setMode] = useState("Prediction");
  const [showPromo, setShowPromo] = useState(true);

  return (
    <aside className="sidebar">
      {showPromo && (
        <div className="promo">
          <button className="promo-close" onClick={() => setShowPromo(false)}>
            ✕
          </button>
          <svg className="promo-rings" viewBox="0 0 180 120" fill="none" stroke="#1f6b4f" strokeWidth="1">
            {Array.from({ length: 8 }).map((_, i) => (
              <ellipse key={i} cx="90" cy="60" rx={20 + i * 9} ry={12 + i * 5} />
            ))}
          </svg>
          <h3>Intro to Perpetuals</h3>
          <p>Trade with leverage, go long or short, and keep your position open without an expiration date.</p>
          <button className="promo-btn">Get started</button>
        </div>
      )}

      <a href="#" className="side-link">
        <div>
          <div className="sl-title">FIFA World Cup</div>
          <div className="sl-sub">$4,464,068,434 total volume</div>
        </div>
        <span style={{ color: "#8a978f" }}>›</span>
      </a>

      <a href="#" className="side-link">
        <div>
          <div className="sl-title">2026 Elections</div>
          <div className="sl-sub">$357,321,170 total volume</div>
        </div>
        <span style={{ color: "#8a978f" }}>›</span>
      </a>

      <div className="customize">
        <div className="customize-head">
          Customize your view
          <span className="x">✕</span>
        </div>
        <div className="toggle">
          {["Prediction", "Sports", "Trader"].map((m) => (
            <button key={m} className={mode === m ? "active" : ""} onClick={() => setMode(m)}>
              {m}
            </button>
          ))}
        </div>
        <p>Get the classic Kalshi experience. You can always switch between modes in Settings later.</p>
      </div>

      <div>
        <div className="trend-list-head">
          Trending <span className="chev">›</span>
        </div>
        {trendingList.map((t, i) => (
          <TrendRow key={t.q} item={t} rank={i + 1} />
        ))}
      </div>

      <div>
        <div className="trend-list-head">
          2026 Primaries <span className="chev">›</span>
        </div>
        {primaries2026.map((t, i) => (
          <TrendRow key={t.q} item={t} rank={i + 1} />
        ))}
      </div>
    </aside>
  );
}
