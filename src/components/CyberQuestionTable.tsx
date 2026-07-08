import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { probabilityDelta, useStore } from "../store";
import type { ForecastQuestion, Visibility } from "../domain/types";
import TouchpointIcons from "./TouchpointIcons";
import QuestionOverflowMenu from "./QuestionOverflowMenu";
import VisibilityBadge from "./VisibilityBadge";
import QuestionTags from "./QuestionTags";
import { IconPin } from "./icons";
import { pct, signedPct } from "./ui";
import { alertsForQuestion, ALERT_STATUS_LABEL } from "../domain/alerts";
import { forecastDecomposition } from "../domain/cyberForecast";

interface SubForecast {
  id: string;
  title: string;
  tags: string[];
  probability: number;
  delta: number;
  source?: string;
  resolves: string;
  visibility: Visibility;
  owningTeam?: string;
  statusLabel?: string;
}

function subForecastsFor(q: ForecastQuestion): SubForecast[] {
  const resolves = q.resolutionDate;

  const drivers = forecastDecomposition(q.id).map((f) => ({
    id: `driver-${f.factor}`,
    title: f.factor,
    tags: [f.contribution >= 0 ? "Risk driver" : "Mitigating factor", "Component"],
    probability: Math.min(0.99, Math.max(0.05, Math.abs(f.contribution) + 0.08)),
    delta: f.contribution,
    resolves,
    visibility: q.visibility,
    owningTeam: q.owningTeam,
  }));

  const incidents = alertsForQuestion(q.id).map(({ alert, impact }) => ({
    id: alert.id,
    title: alert.title,
    tags: [alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1), "Incident"],
    probability: Math.min(0.99, Math.max(0.05, Math.abs(impact.probabilityDelta) + 0.1)),
    delta: impact.probabilityDelta,
    source: alert.source,
    resolves: alert.timestamp.slice(0, 10),
    visibility: q.visibility,
    owningTeam: alert.owner,
    statusLabel: ALERT_STATUS_LABEL[alert.status],
  }));

  return [...drivers, ...incidents];
}

function SubForecastTableRow({ sub }: { sub: SubForecast }) {
  const up = sub.delta >= 0;

  return (
    <tr className="qt-row qt-child-row">
      <td className="qt-expand-col" />
      <td className="qt-pin-col" />
      <td className="qt-question-col">
        <div className="qt-question-cell qt-child-cell">
          <span className="qt-title">{sub.title}</span>
          <div className="qt-tags">
            {sub.tags.map((tag) => (
              <span className="qt-tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </td>
      <td className="qt-prob">
        <div className="qt-prob-inner">
          <span className="qt-prob-val">{pct(sub.probability)}</span>
          <span className={`qt-prob-delta delta ${up ? "up" : "down"}`}>{signedPct(sub.delta)}%</span>
        </div>
      </td>
      <td className="qt-sources-col">
        {sub.source ? <span className="qt-child-source">{sub.source}</span> : <span className="muted">—</span>}
      </td>
      <td className="qt-date-col">{sub.resolves}</td>
      <td className="qt-vis-col">
        {sub.statusLabel ? (
          <span className="visibility-badge">
            <span className="visibility-label">{sub.statusLabel}</span>
          </span>
        ) : (
          <VisibilityBadge value={sub.visibility} owningTeam={sub.owningTeam} />
        )}
      </td>
      <td className="qt-menu" />
    </tr>
  );
}

function CyberQuestionTableRow({ q, pinned }: { q: ForecastQuestion; pinned: boolean }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const { yesOutcome, historyFor, touchpointSignalsFor, addSource, addUpload, togglePin } = useStore();
  const yes = yesOutcome(q.id);
  const p = yes?.currentProbability ?? q.priorBaseRate;
  const d1 = yes ? probabilityDelta(historyFor(yes.id), 1) : null;
  const delta = d1 ?? 0;
  const signals = touchpointSignalsFor(q.id);
  const subs = useMemo(() => subForecastsFor(q), [q]);

  const goToQuestion = () => navigate(`/q/${q.id}`);

  return (
    <>
      <tr
        className={`qt-row${expanded ? " expanded" : ""}`}
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
        <td className="qt-expand-col">
          {subs.length > 0 && (
            <button
              type="button"
              className="qt-expand-btn"
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse forecasts" : "Expand forecasts"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setExpanded((open) => !open);
              }}
            >
              <span className={`panel-collapse-chevron${expanded ? " open" : ""}`} aria-hidden="true" />
            </button>
          )}
        </td>
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
            <span className={`qt-prob-delta delta ${delta >= 0 ? "up" : "down"}`}>{signedPct(delta)}%</span>
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
      {expanded && subs.map((sub) => <SubForecastTableRow key={sub.id} sub={sub} />)}
    </>
  );
}

export default function CyberQuestionTable({ questions }: { questions: ForecastQuestion[] }) {
  const { pinnedIds } = useStore();

  return (
    <div className="qtable-wrap">
      <table className="qtable">
        <thead>
          <tr>
            <th className="qt-expand-col" aria-label="Expand" />
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
            <CyberQuestionTableRow key={q.id} q={q} pinned={pinnedIds.includes(q.id)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
