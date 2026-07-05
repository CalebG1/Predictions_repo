import { Link } from "react-router-dom";
import { useStore } from "../store";
import type { ForecastQuestion } from "../domain/types";
import TouchpointIcons from "./TouchpointIcons";
import QuestionOverflowMenu from "./QuestionOverflowMenu";
import VisibilityPicker from "./VisibilityPicker";
import { pct } from "./ui";

function QuestionTableRow({ q, pinned }: { q: ForecastQuestion; pinned: boolean }) {
  const { yesOutcome, setVisibility, touchpointSignalsFor, addTouchpoint } = useStore();
  const yes = yesOutcome(q.id);
  const p = yes?.currentProbability ?? q.priorBaseRate;
  const signals = touchpointSignalsFor(q.id);

  return (
    <tr className={pinned ? "qt-pinned" : undefined}>
      <td>
        <Link to={`/q/${q.id}`} className="qt-title">
          {q.title}
        </Link>
      </td>
      <td className="qt-prob">{pct(p)}</td>
      <td>
        <VisibilityPicker value={q.visibility} onChange={(v) => setVisibility(q.id, v)} />
      </td>
      <td>
        <TouchpointIcons signals={signals} onAdd={(kind) => addTouchpoint(q.id, kind)} />
      </td>
      <td className="qt-date">{q.resolutionDate}</td>
      <td className="qt-menu">
        <QuestionOverflowMenu q={q} probability={p} showPin />
      </td>
    </tr>
  );
}

export default function QuestionTable({ questions }: { questions: ForecastQuestion[] }) {
  const { pinnedIds } = useStore();

  return (
    <div className="qtable-wrap">
      <table className="qtable">
        <thead>
          <tr>
            <th>Question</th>
            <th>Probability</th>
            <th>Visibility</th>
            <th>Sources</th>
            <th>Resolves</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {questions.map((q) => (
            <QuestionTableRow key={q.id} q={q} pinned={pinnedIds.includes(q.id)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
