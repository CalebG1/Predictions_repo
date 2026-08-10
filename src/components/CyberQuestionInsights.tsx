import { useMemo } from "react";
import type { ForecastQuestion } from "../domain/types";
import { useStore } from "../store";
import { pct, signedPct } from "./ui";
import ConfidenceBadge from "./ConfidenceBadge";
import { alertsForQuestion, ALERT_STATUS_LABEL, type AlertSeverity } from "../domain/alerts";
import {
  forecastDecomposition,
  questionConfidence,
  recommendedAction,
  explanationFor,
} from "../domain/cyberForecast";
import { peerBenchmarkFor, PEER_CAVEAT, PEER_SOURCE_LABEL } from "../domain/peers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Card, CardContent } from "./ui/card";

function severityClass(sev: AlertSeverity): string {
  return `sev-chip sev-${sev}`;
}

function formatTs(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CyberQuestionInsights({ q }: { q: ForecastQuestion }) {
  const { yesOutcome, historyFor } = useStore();

  const { current, prior } = useMemo(() => {
    const yes = yesOutcome(q.id);
    const cur = yes?.currentProbability ?? q.priorBaseRate;
    const history = yes ? historyFor(yes.id) : [];
    // Prior = probability ~7 days before the latest point (fallback to previous point).
    let priorP = cur;
    if (history.length >= 2) {
      const latest = history[history.length - 1];
      const cutoff = new Date(latest.timestamp);
      cutoff.setDate(cutoff.getDate() - 7);
      const past = [...history].reverse().find((h) => new Date(h.timestamp) <= cutoff);
      priorP = past?.probability ?? history[history.length - 2].probability;
    }
    return { current: cur, prior: priorP };
  }, [q.id, q.priorBaseRate, yesOutcome, historyFor]);

  const confidence = questionConfidence(q.id);
  const decomposition = useMemo(() => forecastDecomposition(q.id), [q.id]);
  const alerts = useMemo(() => alertsForQuestion(q.id), [q.id]);
  const explanation = useMemo(() => explanationFor(q, prior, current), [q, prior, current]);
  const action = recommendedAction(q.id);
  const peer = peerBenchmarkFor(q.id);

  const delta = current - prior;
  const maxContribution = Math.max(0.01, ...decomposition.map((f) => Math.abs(f.contribution)));

  return (
    <div className="mb-6 space-y-5">
      <Card className="border bg-card">
        <CardContent>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <span>Why this probability</span>
            <span className="inline-flex items-center gap-3">
              <ConfidenceBadge confidence={confidence} />
              <span
                className={`font-semibold tabular-nums ${delta >= 0 ? "text-red-600" : "text-emerald-600"}`}
              >
                {signedPct(delta)}% over 7 days
              </span>
            </span>
          </div>
          <p className="mb-4 text-[15px] leading-relaxed">{explanation}</p>
          <div className="flex flex-col gap-1 rounded-lg border-l-4 border-primary bg-muted/50 p-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recommended action
            </span>
            <span className="text-sm leading-relaxed">{action}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border bg-card">
        <CardContent>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <span>Forecast decomposition</span>
            <span className="text-muted-foreground">How much each factor contributes</span>
          </div>
          <div className="space-y-2">
            {decomposition.map((f) => {
              const up = f.contribution >= 0;
              const width = (Math.abs(f.contribution) / maxContribution) * 100;
              return (
                <div
                  className="grid grid-cols-[minmax(8rem,220px)_1fr_auto] items-center gap-3 text-sm"
                  key={f.factor}
                >
                  <span>{f.factor}</span>
                  <span className="relative h-3 overflow-hidden rounded bg-muted">
                    <span
                      className={`absolute inset-y-0 left-0 rounded ${up ? "bg-red-500" : "bg-emerald-600"}`}
                      style={{ width: `${width}%` }}
                    />
                  </span>
                  <span
                    className={`text-right text-sm font-semibold tabular-nums ${up ? "text-red-600" : "text-emerald-600"}`}
                  >
                    {signedPct(f.contribution)}%
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border bg-card">
        <CardContent>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <span>Associated alerts</span>
            <span className="text-muted-foreground">
              {alerts.length} forecast-relevant · newest first
            </span>
          </div>
          {alerts.length === 0 ? (
            <p className="text-muted-foreground">
              No alerts are currently mapped to this forecast.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Alert</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead className="num">Impact</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map(({ alert, impact }) => (
                    <TableRow key={alert.id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatTs(alert.timestamp)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {alert.sourceUrl ? (
                          <a
                            href={alert.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-primary hover:underline"
                          >
                            {alert.title}
                          </a>
                        ) : (
                          alert.title
                        )}
                      </TableCell>
                      <TableCell>{alert.source}</TableCell>
                      <TableCell>
                        <span className={severityClass(alert.severity)}>{alert.severity}</span>
                      </TableCell>
                      <TableCell className="num font-medium">
                        {signedPct(impact.probabilityDelta)}%
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {ALERT_STATUS_LABEL[alert.status]}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {alerts.length > 0 && (
        <Card className="border bg-card">
          <CardContent>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <span>Timeline of probability-changing events</span>
              <span className="text-muted-foreground">
                What happened, why it mattered, and how much it moved the line
              </span>
            </div>
            <div className="space-y-0">
              {alerts.map(({ alert, impact }) => (
                <div
                  className="relative flex gap-3 pb-5 last:pb-0 before:absolute before:bottom-0 before:left-1.5 before:top-3 before:w-px before:bg-border last:before:hidden"
                  key={alert.id}
                >
                  <div
                    className="relative z-10 mt-1 size-3 shrink-0 rounded-full border-2 border-primary bg-background"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">
                        {formatTs(alert.timestamp)}
                      </span>
                      <span
                        className={
                          impact.direction === "increase"
                            ? "text-sm font-bold text-destructive"
                            : "text-sm font-bold text-emerald-700"
                        }
                      >
                        {signedPct(impact.probabilityDelta)}%
                      </span>
                    </div>
                    <div className="mt-1 font-semibold">{alert.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Source: {alert.source}
                      {alert.mitreTechnique ? ` · ${alert.mitreTechnique}` : ""}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{impact.reason}</p>
                    {alert.affectedEntities.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {alert.affectedEntities.map((e) => (
                          <span className="entity-chip" key={e}>
                            {e}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {peer && (
        <Card className="border bg-card">
          <CardContent>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <span>Peer &amp; industry comparison</span>
              <span className="text-muted-foreground">{PEER_SOURCE_LABEL[peer.sourceType]}</span>
            </div>
            <div className="mb-3 space-y-2">
              <PeerBar label="Our company" value={peer.ourCompany} highlight />
              <PeerBar label="Industry median" value={peer.industryMedian} />
              <PeerBar
                label="Similar companies"
                value={peer.similarHigh}
                rangeLow={peer.similarLow}
                isRange
              />
              <PeerBar label="Top quartile" value={peer.topQuartile} />
              <PeerBar label="Bottom quartile" value={peer.bottomQuartile} />
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{peer.explanation}</p>
            <p className="mt-3 flex gap-2 text-xs leading-relaxed text-muted-foreground">
              <span className="shrink-0" aria-hidden="true">
                ⓘ
              </span>
              {PEER_CAVEAT}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PeerBar({
  label,
  value,
  rangeLow,
  isRange,
  highlight,
}: {
  label: string;
  value: number;
  rangeLow?: number;
  isRange?: boolean;
  highlight?: boolean;
}) {
  const width = value * 100;
  const rangeStart = (rangeLow ?? 0) * 100;
  return (
    <div className="grid grid-cols-[minmax(7rem,150px)_1fr_auto] items-center gap-3 text-sm">
      <span className={highlight ? "font-semibold" : ""}>{label}</span>
      <span className="relative h-3 overflow-hidden rounded bg-muted">
        {isRange && rangeLow !== undefined ? (
          <span
            className="absolute inset-y-0 rounded bg-slate-300"
            style={{ left: `${rangeStart}%`, width: `${width - rangeStart}%` }}
          />
        ) : (
          <span
            className={`absolute inset-y-0 left-0 rounded ${highlight ? "bg-primary" : "bg-slate-400"}`}
            style={{ width: `${width}%` }}
          />
        )}
      </span>
      <span className="text-right text-sm font-medium tabular-nums">
        {isRange && rangeLow !== undefined ? `${pct(rangeLow)}–${pct(value)}` : pct(value)}
      </span>
    </div>
  );
}
