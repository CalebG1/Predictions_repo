import { useNavigate } from "react-router-dom";
import { probabilityDelta, useStore } from "../store";
import type { ForecastQuestion } from "../domain/types";
import TouchpointIcons from "./TouchpointIcons";
import QuestionOverflowMenu from "./QuestionOverflowMenu";
import VisibilityBadge from "./VisibilityBadge";
import QuestionTags from "./QuestionTags";
import { IconPin } from "./icons";
import { pct, signedPct } from "./ui";

function QuestionTableRow({ q, pinned }: { q: ForecastQuestion; pinned: boolean }) {
  const navigate = useNavigate();
  const { yesOutcome, historyFor, touchpointSignalsFor, addSource, addUpload, togglePin } = useStore();
  const yes = yesOutcome(q.id);
  const p = yes?.currentProbability ?? q.priorBaseRate;
  const d1 = yes ? probabilityDelta(historyFor(yes.id), 1) : null;
  const signals = touchpointSignalsFor(q.id);

  const goToQuestion = () => navigate(`/q/${q.id}`);

  return (
    <tr
      className="qt-row"
      role="link"
      tabIndex={0}
      onClick={goToQuestion}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToQuestion();
        }
      }}
    >
      <td className="qt-pin-col" aria-hidden={!pinned}>
        {pinned && (
          <button
            type="button"
            className="qt-pin"
            title="Unpin"
            aria-label="Unpin"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              togglePin(q.id);
            }}
          >
            <IconPin filled />
          </button>
        )}
      </td>
      <td className="qt-question-col">
        <div className="qt-question-cell">
          <span className="qt-title">{q.title}</span>
          <QuestionTags q={q} />
        </div>
      </td>
      <td className="qt-prob">
        <div className="qt-prob-inner">
          <span className="qt-prob-val">{pct(p)}</span>
          {d1 !== null && d1 !== 0 && (
            <span className={`qt-prob-delta delta ${d1 >= 0 ? "up" : "down"}`}>{signedPct(d1)}%</span>
          )}
        </div>
      </td>
      <td className="qt-sources-col">
        <TouchpointIcons
          signals={signals}
          maxVisible={3}
          onConnect={(connector) => addSource(q.id, connector)}
          onImport={(fileNames) => addUpload(q.id, fileNames)}
        />
      </td>
      <td className="qt-date-col">{q.resolutionDate}</td>
      <td className="qt-vis-col">
        <VisibilityBadge value={q.visibility} owningTeam={q.owningTeam} />
      </td>
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
            <th className="qt-pin-col" aria-hidden="true" />
            <th className="qt-question-col">Question</th>
            <th className="qt-prob-col">Probability</th>
            <th className="qt-sources-col">Sources</th>
            <th className="qt-date-col">Resolves</th>
            <th className="qt-vis-col">Visibility</th>
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
