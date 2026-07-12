import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "../store";
import { runForecast } from "../domain/engine";
import QuestionComments from "../components/QuestionComments";
import QuestionQaChat from "../components/QuestionQaChat";
import ReasoningThread from "../components/ReasoningThread";
import EvidenceTable from "../components/EvidenceTable";
import { buildForecastReasoning } from "../domain/reasoning";
import { buildProbPoints, colorForOption, ProbChart, type CompanionSeries } from "../components/charts";
import VisibilityPicker from "../components/VisibilityPicker";
import { overviewHref } from "../components/ui";

export default function QuestionDetail() {
  const { id } = useParams();
  const { questions, yesOutcome, historyFor, outcomesFor, setVisibility, evidenceFor } = useStore();
  const q = questions.find((x) => x.id === id);

  const forecast = useMemo(() => (q ? runForecast(q) : null), [q]);
  const evidence = useMemo(() => (q ? evidenceFor(q.id) : []), [q, evidenceFor]);

  const chartConfig = useMemo(() => {
    if (!q) return null;
    if (q.type === "categorical") {
      const allOutcomes = outcomesFor(q.id);
      const sorted = [...allOutcomes].sort((a, b) => b.currentProbability - a.currentProbability);
      const primary = sorted[0];
      const primaryHistory = historyFor(primary.id);
      const points = buildProbPoints(primaryHistory, { subject: primary.label, questionTitle: q.title });

      const companionSeries: CompanionSeries[] = sorted.slice(1).map((o, i) => {
        const companionPoints = buildProbPoints(historyFor(o.id), { subject: o.label, questionTitle: q.title });
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
      points: buildProbPoints(history, {
        subject: q.type === "scalar" ? "Above consensus" : "Yes",
        questionTitle: q.title,
      }),
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

      <ReasoningThread
        reasoning={reasoning}
        questionId={q.id}
        question={q}
        forecast={forecast!}
        history={chartConfig.history}
      />

      <EvidenceTable questionId={q.id} evidence={evidence} />

      <QuestionComments q={q} />

      <QuestionQaChat q={q} />
    </div>
  );
}
