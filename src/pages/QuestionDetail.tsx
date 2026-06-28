import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "../store";
import { runForecast } from "../domain/engine";
import { evidenceSources } from "../domain/seed";
import AgentPanel from "../components/AgentPanel";
import { ProbChart } from "../components/charts";
import { categoryColors, pct } from "../components/ui";

export default function QuestionDetail() {
  const { id } = useParams();
  const { questions, yesOutcome, historyFor } = useStore();
  const q = questions.find((x) => x.id === id);

  const forecast = useMemo(() => (q ? runForecast(q) : null), [q]);

  if (!q) {
    return (
      <div className="dash-page">
        <div className="locked-card">
          <h2>🔒 Not available</h2>
          <p>
            This question is either private and outside your access grants, or doesn't exist. Private lines are never
            exposed outside authorized roles.
          </p>
          <Link to="/" className="btn">
            Back to overview
          </Link>
        </div>
      </div>
    );
  }

  const yes = yesOutcome(q.id)!;
  const history = historyFor(yes.id);
  const chartPoints = history.map((h) => ({ timestamp: h.timestamp, probability: h.probability, trigger: h.updateTrigger }));
  // Annotate the biggest single-step moves.
  const annotations = history
    .map((h, i) => ({ i, move: i === 0 ? 0 : Math.abs(h.probability - history[i - 1].probability) }))
    .sort((a, b) => b.move - a.move)
    .slice(0, 3)
    .map((a) => ({ index: a.i, label: `${history[a.i].updateTrigger}: ${pct(history[a.i].probability)}` }));

  const evidence = evidenceSources.slice(0, 5);

  return (
    <div className="dash-page detail">
      <Link to="/" className="back-link">
        ← Overview
      </Link>

      <div className="detail-head">
        <span className="qc-cat" style={{ color: categoryColors[q.category] }}>
          <span className="qc-dot" style={{ background: categoryColors[q.category] }} />
          {q.category}
        </span>
        <span className="qc-tags">
          <span className={`tag ${q.riskOrOpportunity === "risk" ? "tag-risk" : "tag-opp"}`}>
            {q.riskOrOpportunity === "risk" ? "Risk" : "Opportunity"}
          </span>
          {q.visibility === "private" && <span className="tag tag-private">🔒 Private · {q.owningTeam}</span>}
        </span>
      </div>
      <h1 className="detail-title">{q.title}</h1>
      <p className="detail-def">{q.preciseDefinition}</p>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="panel">
            <div className="panel-head">
              <span>Probability over time</span>
              <span className="big-prob">{pct(yes.currentProbability)}</span>
            </div>
            <ProbChart points={chartPoints} annotations={annotations} />
            <div className="anno-legend">
              {annotations.map((a) => (
                <div key={a.index} className="anno-item">
                  <span className="anno-dot" /> {a.label}
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <span>Agent panel (dragonfly eye)</span>
              <span className="muted">confidence in estimate: {pct(forecast!.confidenceInEstimateQuality)}</span>
            </div>
            <AgentPanel panel={forecast!.agentPanel} />
          </div>

          <div className="panel two-col">
            <div>
              <h4 className="up">Drivers up</h4>
              <ul>
                {forecast!.driversUp.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="down">Drivers down</h4>
              <ul>
                {forecast!.driversDown.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <span>Forecast history</span>
              <span className="muted">immutable once locked for resolution</span>
            </div>
            <table className="hist-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Prob.</th>
                  <th>Source</th>
                  <th>What changed (trigger)</th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((h) => (
                  <tr key={h.id}>
                    <td>{h.timestamp}</td>
                    <td>{pct(h.probability)}</td>
                    <td>{h.source}</td>
                    <td>{h.updateTrigger}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="detail-side">
          <div className="panel kv">
            <h4>Resolution</h4>
            <div className="kv-row"><span>Criteria</span><b>{q.resolutionCriteria}</b></div>
            <div className="kv-row"><span>Source</span><b>{q.resolutionSource}</b></div>
            <div className="kv-row"><span>Resolves</span><b>{q.resolutionDate}</b></div>
            <div className="kv-row"><span>Impact</span><b>{q.impactEstimate}</b></div>
          </div>

          <div className="panel kv">
            <h4>Outside vs inside view</h4>
            <div className="kv-row"><span>Base rate</span><b>{pct(forecast!.priorBaseRate)}</b></div>
            <p className="muted small">{forecast!.outsideView}</p>
            <p className="muted small">{forecast!.insideView}</p>
          </div>

          <div className="panel kv">
            <h4>Horizon sensitivity</h4>
            {Object.entries(forecast!.horizonSensitivity).map(([k, v]) => (
              <div className="kv-row" key={k}>
                <span>{k}</span>
                <b>{pct(v)}</b>
              </div>
            ))}
          </div>

          <div className="panel kv">
            <h4>Key uncertainties</h4>
            <ul className="tight">
              {forecast!.keyUncertainties.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
            <h4>Update triggers</h4>
            <ul className="tight">
              {forecast!.updateTriggers.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
            <h4>Alternative scenarios</h4>
            <ul className="tight">
              {forecast!.alternativeScenarios.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </div>

          <div className="panel kv">
            <h4>Evidence sources</h4>
            {evidence.map((e) => (
              <div key={e.id} className="ev-row">
                <span className="ev-class">{e.sourceClass.replace("_", " ")}</span>
                <span className="ev-title">{e.title}</span>
                {e.disconfirming && <span className="ev-dis" title="Deliberately disconfirming">⚖︎</span>}
                <span className="ev-cred">{pct(e.credibilityScore)}</span>
              </div>
            ))}
          </div>

          <Link to={`/decision?q=${q.id}`} className="btn full">
            Open decision view →
          </Link>
        </aside>
      </div>
    </div>
  );
}
