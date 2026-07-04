import { useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import type { ForecastQuestion } from "../domain/types";
import { Sparkline } from "./charts";
import VisibilityPicker from "./VisibilityPicker";
import { categoryColors, pct } from "./ui";

export default function QuestionCard({ q }: { q: ForecastQuestion }) {
  const { yesOutcome, historyFor, setVisibility, refreshForecast } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const yes = yesOutcome(q.id);
  const history = yes ? historyFor(yes.id) : [];
  const p = yes?.currentProbability ?? q.priorBaseRate;

  const handleRefresh = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRefreshing(true);
    refreshForecast(q.id);
    window.setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <div className="qcard">
      <div className="qc-top">
        <span className="qc-cat" style={{ color: categoryColors[q.category] }}>
          <span className="qc-dot" style={{ background: categoryColors[q.category] }} />
          {q.category}
        </span>
        <span className="qc-tags">
          <button
            type="button"
            className={`qc-refresh${refreshing ? " refreshing" : ""}`}
            title="Refresh forecast"
            aria-label="Refresh forecast"
            onClick={handleRefresh}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <polyline points="21 3 21 9 15 9" />
            </svg>
          </button>
          <VisibilityPicker value={q.visibility} onChange={(v) => setVisibility(q.id, v)} />
        </span>
      </div>

      <Link to={`/q/${q.id}`} className="qcard-link">
        <h3 className="qc-title">{q.title}</h3>

        <div className="qc-mid">
          <div className="qc-prob">
            <div className="qc-prob-num">{pct(p)}</div>
          </div>
          <Sparkline values={history.map((h) => h.probability)} />
        </div>

        <div className="qc-foot">
          <span className="qc-date">resolves {q.resolutionDate}</span>
        </div>
      </Link>
    </div>
  );
}
