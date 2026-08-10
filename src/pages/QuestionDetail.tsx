import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "../store";
import { runForecast } from "../domain/engine";
import QuestionComments from "../components/QuestionComments";
import QuestionQaChat from "../components/QuestionQaChat";
import ReasoningThread from "../components/ReasoningThread";
import AssumptionsPanel from "../components/assumptions/AssumptionsPanel";
import EvidenceTable from "../components/EvidenceTable";
import InterventionsPanel from "../components/InterventionsPanel";
import { buildForecastReasoning } from "../domain/reasoning";
import {
  buildProbPoints,
  colorForOption,
  ProbChart,
  type CompanionSeries,
} from "../components/charts";
import VisibilityPicker from "../components/VisibilityPicker";
import { overviewHref } from "../components/ui";
import { Card, CardContent } from "../components/ui/card";

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
      const points = buildProbPoints(primaryHistory, {
        subject: primary.label,
        questionTitle: q.title,
      });

      const companionSeries: CompanionSeries[] = sorted.slice(1).map((o, i) => {
        const companionPoints = buildProbPoints(historyFor(o.id), {
          subject: o.label,
          questionTitle: q.title,
        });
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
        endpointLabel: {
          tag: primary.label,
          probability: primary.currentProbability,
        },
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
      <div className="mx-auto w-full max-w-[1240px] space-y-6 px-[22px] py-8">
        <Card className="">
          <CardContent>
            <h2>🔒 Not available</h2>
            <p>
              This question is outside your visibility level, or doesn't exist. Restricted lines are
              never exposed outside authorized roles.
            </p>
            <Link to="/" className="">
              Back to overview
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-[calc(100vh-104px)] w-full max-w-[1240px] bg-background px-[22px] pb-22 pt-4">
      <div className="mb-5">
        <div className="mb-3 flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div className="min-w-0 flex-1">
            <nav
              className="mb-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground [&_a]:hover:text-foreground"
              aria-label="Question categories"
            >
              <Link to={overviewHref({ type: q.riskOrOpportunity })}>
                {q.riskOrOpportunity === "risk" ? "Risk" : "Opportunity"}
              </Link>
              <span className="text-muted-foreground" aria-hidden="true">
                ·
              </span>
              <Link
                to={overviewHref({
                  type: q.riskOrOpportunity,
                  cat: q.category,
                })}
              >
                {q.category}
              </Link>
              <span className="text-muted-foreground" aria-hidden="true">
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
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{q.title}</h1>
          </div>
          <div className="shrink-0 pt-1">
            <VisibilityPicker
              value={q.visibility}
              owningTeam={q.owningTeam}
              onChange={(v) => setVisibility(q.id, v)}
            />
          </div>
        </div>
      </div>

      <Card className="mb-5 border-0 bg-transparent p-0 shadow-none">
        <CardContent className="p-0">
          <ProbChart
            points={chartConfig.points}
            endpointLabel={chartConfig.endpointLabel}
            companionSeries={chartConfig.companionSeries}
            primaryLineColor={chartConfig.primaryLineColor}
          />
        </CardContent>
      </Card>

      <ReasoningThread
        reasoning={reasoning}
        questionId={q.id}
        question={q}
        forecast={forecast!}
        history={chartConfig.history}
      />

      <AssumptionsPanel questionId={q.id} question={q} evidence={evidence} />

      <EvidenceTable questionId={q.id} evidence={evidence} />

      <InterventionsPanel questionId={q.id} />

      <QuestionComments q={q} />

      <QuestionQaChat q={q} />
    </div>
  );
}
