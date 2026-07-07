import { useNavigate } from "react-router-dom";
import type { ForecastQuestion } from "../domain/types";
import { probabilityDelta, useStore } from "../store";
import { pct, signedPct, impactLevelLabel } from "./ui";
import { relatedAlertCount } from "../domain/alerts";
import { questionConfidence, CONFIDENCE_LABEL } from "../domain/cyberForecast";
import VisibilityBadge from "./VisibilityBadge";

function Row({ q }: { q: ForecastQuestion }) {
  const navigate = useNavigate();
  const { yesOutcome, historyFor } = useStore();
  const yes = yesOutcome(q.id);
  const p = yes?.currentProbability ?? q.priorBaseRate;
  const d7 = yes ? probabilityDelta(historyFor(yes.id), 7) : null;
  const delta = d7 ?? 0;
  const alertCount = relatedAlertCount(q.id);
  const confidence = questionConfidence(q.id);

  const go = () => navigate(`/q/${q.id}`);

  return (
    <tr
      className="qt-row"
      role="link"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      }}
    >
      <td className="cft-question">
        <span className="cft-title">{q.title}</span>
      </td>
      <td className="cft-prob">
        <span className="cft-prob-val">{pct(p)}</span>
        <span className={`qt-prob-delta delta ${delta >= 0 ? "up" : "down"}`}>{signedPct(delta)}%</span>
      </td>
      <td className="num">
        <span className="cft-alerts">{alertCount}</span>
      </td>
      <td>
        <span className={`impact-chip impact-${q.impactLevel}`}>{impactLevelLabel[q.impactLevel]}</span>
      </td>
      <td>
        <span className={`conf-dot conf-${confidence}`} title={`${CONFIDENCE_LABEL[confidence]} confidence`} />
        {CONFIDENCE_LABEL[confidence]}
      </td>
      <td className="cft-date">{q.resolutionDate}</td>
      <td>
        <VisibilityBadge value={q.visibility} owningTeam={q.owningTeam} />
      </td>
    </tr>
  );
}

export default function CyberForecastTable({ questions }: { questions: ForecastQuestion[] }) {
  return (
    <div className="qtable-wrap">
      <table className="qtable cft">
        <thead>
          <tr>
            <th>Question</th>
            <th>Probability</th>
            <th className="num">Related alerts</th>
            <th>Impact</th>
            <th>Confidence</th>
            <th>Resolves</th>
            <th>Visibility</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((q) => (
            <Row key={q.id} q={q} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
