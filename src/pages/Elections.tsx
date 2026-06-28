import { useState } from "react";
import MarketCard from "../components/MarketCard";
import { electionFilters, electionMarkets } from "../data";

export default function Elections() {
  const [active, setActive] = useState("Primaries");

  return (
    <div className="page elections">
      <aside className="elections-filters">
        {electionFilters.map((f) => {
          let cls = "filter-link";
          if (f === active) cls += f === "Primaries" ? " primary-active" : " active";
          if (f === "All markets" && active === "All markets") cls = "filter-link active";
          return (
            <button key={f} className={cls} onClick={() => setActive(f)}>
              {f}
            </button>
          );
        })}
      </aside>

      <main>
        <div className="elections-head">
          <h1>Elections</h1>
          <div className="elections-controls">
            <button className="pill-btn">Trending ▾</button>
            <button className="pill-btn">Frequency ▾</button>
            <button className="pill-btn icon-only">···</button>
          </div>
        </div>

        <div className="card-grid">
          {electionMarkets.map((m) => (
            <MarketCard key={m.id} market={m} />
          ))}
        </div>
      </main>
    </div>
  );
}
