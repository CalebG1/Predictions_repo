import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "../store";
import { runForecast } from "../domain/engine";
import QuestionComments from "../components/QuestionComments";
import QuestionQaChat from "../components/QuestionQaChat";
import ReasoningThread from "../components/ReasoningThread";
import CyberQuestionInsights from "../components/CyberQuestionInsights";
import { buildForecastReasoning } from "../domain/reasoning";
import { buildProbPoints, colorForOption, ProbChart, type CompanionSeries } from "../components/charts";
import VisibilityPicker from "../components/VisibilityPicker";
import { overviewHref, pct } from "../components/ui";

export default function QuestionDetail() {
  const { id } = useParams();
  const { questions, yesOutcome, historyFor, outcomesFor, setVisibility, evidenceFor } = useStore();
  const q = questions.find((x) => x.id === id);

  const forecast = useMemo(() => (q ? runForecast(q) : null), [q]);
  const evidence = useMemo(() => (q ? evidenceFor(q.id) : []), [q, evidenceFor]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const chartConfig = useMemo(() => {
    if (!q) return null;
    if (q.type === "categorical") {
      const allOutcomes = outcomesFor(q.id);
      const sorted = [...allOutcomes].sort((a, b) => b.currentProbability - a.currentProbability);
      const primary = sorted[0];
      const primaryHistory = historyFor(primary.id);
      const points = buildProbPoints(primaryHistory);

      const companionSeries: CompanionSeries[] = sorted.slice(1).map((o, i) => {
        const companionPoints = buildProbPoints(historyFor(o.id));
        const byTs = new Map(companionPoints.map((p) => [p.timestamp, p]));
        return {
          id: o.id,
          label: o.label,
          color: colorForOption(o.label, i + 1),
          values: points.map((p) => byTs.get(p.timestamp)?.probability ?? 0),
          meta: points.map((p) => {
            const pt = byTs.get(p.timestamp);
            return (
              pt ?? {
                timestamp: p.timestamp,
                probability: 0,
                trigger: "Scheduled weekly run",
              }
            );
          }),
        };
      });

      return {
        points,
        companionSeries,
        primaryLineColor: colorForOption(primary.label, 0),
        endpointLabel: { tag: primary.label, probability: primary.currentProbability },
        history: primaryHistory,
      };
    }

    const yes = yesOutcome(q.id)!;
    const history = historyFor(yes.id);
    return {
      points: buildProbPoints(history),
      companionSeries: undefined,
      primaryLineColor: undefined,
      endpointLabel: {
        tag: q.type === "scalar" ? "Above consensus" : "Yes",
        probability: yes.currentProbability,
      },
      history,
    };
  }, [q, outcomesFor, historyFor, yesOutcome]);

  const reasoning = useMemo(() => {
    if (!q || !forecast || !chartConfig) return null;
    return buildForecastReasoning(q, forecast, chartConfig.history, evidence);
  }, [q, forecast, chartConfig, evidence]);

  if (!q || !chartConfig || !reasoning) {
    return (
      <div className="dash-page">
        <div className="locked-card">
          <h2>🔒 Not available</h2>
          <p>
            This question is outside your visibility level, or doesn't exist. Restricted lines are never
            exposed outside authorized roles.
          </p>
          <Link to="/" className="btn">
            Back to overview
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-page detail">
      <div className="detail-hero">
        <div className="detail-head">
          <div className="detail-head-main">
            <nav className="detail-breadcrumbs" aria-label="Question categories">
              <Link to={overviewHref({ type: q.riskOrOpportunity })}>
                {q.riskOrOpportunity === "risk" ? "Risk" : "Opportunity"}
              </Link>
              <span className="detail-crumb-sep" aria-hidden="true">
                ·
              </span>
              <Link to={overviewHref({ type: q.riskOrOpportunity, cat: q.category })}>{q.category}</Link>
              <span className="detail-crumb-sep" aria-hidden="true">
                ·
              </span>
              <Link
                to={overviewHref({
                  type: q.riskOrOpportunity,
                  cat: q.category,
                  owner: q.owningTeam,
                })}
              >
                {q.owningTeam}
              </Link>
            </nav>
            <h1 className="detail-title">{q.title}</h1>
          </div>
          <div className="detail-nav-meta">
            <VisibilityPicker
              value={q.visibility}
              owningTeam={q.owningTeam}
              onChange={(v) => setVisibility(q.id, v)}
            />
          </div>
        </div>
      </div>

      <div className="panel detail-chart">
        <ProbChart
          points={chartConfig.points}
          endpointLabel={chartConfig.endpointLabel}
          companionSeries={chartConfig.companionSeries}
          primaryLineColor={chartConfig.primaryLineColor}
        />
      </div>

      <ReasoningThread reasoning={reasoning} questionId={q.id} />

      {q.category === "Security/Cyber" && <CyberQuestionInsights q={q} />}

      <div className="detail-grid">
        <div className="detail-main">
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

          <div className="panel panel-collapse">
            <button
              type="button"
              className="panel-collapse-trigger"
              aria-expanded={historyOpen}
              onClick={() => setHistoryOpen((open) => !open)}
            >
              <span className="panel-collapse-label">
                <span>Forecast history</span>
                <span className="muted">{chartConfig.history.length} updates</span>
              </span>
              <span className={`panel-collapse-chevron${historyOpen ? " open" : ""}`} aria-hidden="true" />
            </button>
            {historyOpen && (
              <div className="panel-collapse-body">
                <p className="muted small panel-collapse-note">Immutable once locked for resolution.</p>
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
                    {[...chartConfig.history].reverse().map((h) => (
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
            )}
          </div>

          <QuestionComments q={q} />
        </div>

        <aside className="detail-side">
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
            {evidence.length === 0 ? (
              <p className="muted">No evidence sources added yet.</p>
            ) : (
              evidence.map((e) => (
                <div key={e.id} className="ev-row">
                  <span className="ev-class">{e.sourceClass.replace("_", " ")}</span>
                  <span className="ev-title">{e.title}</span>
                  {e.disconfirming && <span className="ev-dis" title="Deliberately disconfirming">⚖︎</span>}
                  <span className="ev-cred">{pct(e.credibilityScore)}</span>
                </div>
              ))
            )}
          </div>

        </aside>
      </div>

      <QuestionQaChat q={q} />
    </div>
  );
}
