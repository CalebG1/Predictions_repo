import { Link } from "react-router-dom";
import { useStore } from "../store";
import type { ForecastQuestion } from "../domain/types";
import TouchpointIcons from "./TouchpointIcons";
import QuestionOverflowMenu from "./QuestionOverflowMenu";
import VisibilityPicker from "./VisibilityPicker";
import { pct } from "./ui";

export default function QuestionCard({ q }: { q: ForecastQuestion }) {
  const { yesOutcome, setVisibility, touchpointSignalsFor, addTouchpoint } = useStore();
  const yes = yesOutcome(q.id);
  const p = yes?.currentProbability ?? q.priorBaseRate;
  const signals = touchpointSignalsFor(q.id);

  return (
    <div className="qcard">
      <div className="qc-top">
        <span className="qc-tags">
          <VisibilityPicker value={q.visibility} onChange={(v) => setVisibility(q.id, v)} />
          <QuestionOverflowMenu q={q} probability={p} />
        </span>
      </div>

      <Link to={`/q/${q.id}`} className="qcard-link">
        <h3 className="qc-title">{q.title}</h3>

        <div className="qc-mid">
          <div className="qc-prob-num">{pct(p)}</div>
        </div>

        <div className="qc-foot">
          <TouchpointIcons signals={signals} onAdd={(kind) => addTouchpoint(q.id, kind)} />
          <span className="qc-date">resolves {q.resolutionDate}</span>
        </div>
      </Link>
    </div>
  );
}
