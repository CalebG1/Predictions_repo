import { Link } from "react-router-dom";
import { useStore } from "../store";
import type { ForecastQuestion } from "../domain/types";
import TouchpointIcons from "./TouchpointIcons";
import QuestionOverflowMenu from "./QuestionOverflowMenu";
import VisibilityBadge from "./VisibilityBadge";
import { pct } from "./ui";

export default function QuestionCard({ q }: { q: ForecastQuestion }) {
  const { yesOutcome, touchpointSignalsFor } = useStore();
  const yes = yesOutcome(q.id);
  const p = yes?.currentProbability ?? q.priorBaseRate;
  const signals = touchpointSignalsFor(q.id);

  return (
    <div className="qcard">
      <div className="qc-top">
        <QuestionOverflowMenu q={q} probability={p} />
      </div>

      <Link to={`/q/${q.id}`} className="qcard-link">
        <h3 className="qc-title">{q.title}</h3>

        <div className="qc-mid">
          <div className="qc-prob-num">{pct(p)}</div>
        </div>

        <div className="qc-foot">
          <TouchpointIcons questionId={q.id} signals={signals} />
          <span className="qc-foot-meta">
            <span className="qc-date">resolves {q.resolutionDate}</span>
            <VisibilityBadge value={q.visibility} owningTeam={q.owningTeam} />
          </span>
        </div>
      </Link>
    </div>
  );
}
