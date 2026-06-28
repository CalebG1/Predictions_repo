import { Link } from "react-router-dom";
import { useStore, probabilityDelta } from "../store";
import type { ForecastQuestion } from "../domain/types";
import { Sparkline } from "./charts";
import { categoryColors, pct, signedPct } from "./ui";

export default function QuestionCard({ q }: { q: ForecastQuestion }) {
  const { yesOutcome, historyFor } = useStore();
  const yes = yesOutcome(q.id);
  const history = yes ? historyFor(yes.id) : [];
  const p = yes?.currentProbability ?? q.priorBaseRate;
  const d7 = probabilityDelta(history, 7);
  const d30 = probabilityDelta(history, 30);
  const isRisk = q.riskOrOpportunity === "risk";

  return (
    <Link to={`/q/${q.id}`} className="qcard">
      <div className="qc-top">
        <span className="qc-cat" style={{ color: categoryColors[q.category] }}>
          <span className="qc-dot" style={{ background: categoryColors[q.category] }} />
          {q.category}
        </span>
        <span className="qc-tags">
          <span className={`tag ${isRisk ? "tag-risk" : "tag-opp"}`}>{isRisk ? "Risk" : "Opportunity"}</span>
          {q.visibility === "private" && (
            <span className="tag tag-private" title="Private — access-controlled">
              🔒 Private
            </span>
          )}
        </span>
      </div>

      <h3 className="qc-title">{q.title}</h3>

      <div className="qc-mid">
        <div className="qc-prob">
          <div className="qc-prob-num">{pct(p)}</div>
          <div className="qc-deltas">
            <span className={`delta ${(d7 ?? 0) >= 0 ? "up" : "down"}`}>
              7d {signedPct(d7)}
            </span>
            <span className={`delta ${(d30 ?? 0) >= 0 ? "up" : "down"}`}>
              30d {signedPct(d30)}
            </span>
          </div>
        </div>
        <Sparkline values={history.map((h) => h.probability)} />
      </div>

      <div className="qc-foot">
        <span className={`impact impact-${q.impactLevel}`}>{q.impactLevel} impact</span>
        <span className="qc-date">resolves {q.resolutionDate}</span>
      </div>
    </Link>
  );
}
