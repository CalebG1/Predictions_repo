import type { Market } from "../data";

export default function MarketCard({ market }: { market: Market }) {
  return (
    <div className="market-card">
      <div className="mc-head">
        <span className="mc-logo" style={{ background: market.logoColor }}>
          {market.logo}
        </span>
        <span className="mc-eyebrow">{market.eyebrow}</span>
      </div>

      <h3 className="mc-title">{market.title}</h3>
      {market.date && <div className="mc-date">{market.date}</div>}

      <div className="mc-rows">
        {market.outcomes.map((o) => (
          <div key={o.label} className={`mc-row${market.hasAvatars ? " with-avatar" : ""}`}>
            <span className="mc-outcome">
              {o.avatar && <span className="mc-avatar">{o.avatar}</span>}
              {o.label}
            </span>
            <span className="mc-mult">{o.mult}</span>
            <button className="mc-pct">{o.pct}%</button>
          </div>
        ))}
      </div>

      <div className="mc-foot">
        <span>{market.volume}</span>
        <span className="markets">{market.markets} markets</span>
      </div>
    </div>
  );
}
