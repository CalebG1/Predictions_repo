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
import {
  peerBenchmarkFor,
  PEER_CAVEAT,
  PEER_SOURCE_LABEL,
} from "../domain/peers";

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
    <div className="cyber-insights">
      <div className="panel cyber-explain">
        <div className="panel-head">
          <span>Why this probability</span>
          <span className="cyber-explain-meta">
            <ConfidenceBadge confidence={confidence} />
            <span className={`cyber-move ${delta >= 0 ? "up" : "down"}`}>
              {signedPct(delta)}% over 7 days
            </span>
          </span>
        </div>
        <p className="cyber-explain-body">{explanation}</p>
        <div className="cyber-action">
          <span className="cyber-action-label">Recommended action</span>
          <span className="cyber-action-body">{action}</span>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span>Forecast decomposition</span>
          <span className="muted">How much each factor contributes</span>
        </div>
        <div className="decomp-list">
          {decomposition.map((f) => {
            const up = f.contribution >= 0;
            const width = (Math.abs(f.contribution) / maxContribution) * 100;
            return (
              <div className="decomp-row" key={f.factor}>
                <span className="decomp-label">{f.factor}</span>
                <span className="decomp-bar-wrap">
                  <span className={`decomp-bar ${up ? "up" : "down"}`} style={{ width: `${width}%` }} />
                </span>
                <span className={`decomp-val ${up ? "up" : "down"}`}>{signedPct(f.contribution)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span>Associated alerts</span>
          <span className="muted">{alerts.length} forecast-relevant · newest first</span>
        </div>
        {alerts.length === 0 ? (
          <p className="muted">No alerts are currently mapped to this forecast.</p>
        ) : (
          <div className="alert-table-wrap">
            <table className="alert-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Alert</th>
                  <th>Source</th>
                  <th>Severity</th>
                  <th className="num">Impact</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(({ alert, impact }) => (
                  <tr key={alert.id}>
                    <td className="alert-time">{formatTs(alert.timestamp)}</td>
                    <td className="alert-title-cell">
                      {alert.sourceUrl ? (
                        <a href={alert.sourceUrl} target="_blank" rel="noreferrer" className="alert-link">
                          {alert.title}
                        </a>
                      ) : (
                        alert.title
                      )}
                    </td>
                    <td>{alert.source}</td>
                    <td>
                      <span className={severityClass(alert.severity)}>{alert.severity}</span>
                    </td>
                    <td className={`num alert-impact ${impact.direction === "increase" ? "up" : "down"}`}>
                      {signedPct(impact.probabilityDelta)}%
                    </td>
                    <td className="alert-status">{ALERT_STATUS_LABEL[alert.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {alerts.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <span>Timeline of probability-changing events</span>
            <span className="muted">What happened, why it mattered, and how much it moved the line</span>
          </div>
          <div className="event-timeline">
            {alerts.map(({ alert, impact }) => (
              <div className="event-item" key={alert.id}>
                <div className="event-marker" aria-hidden="true" />
                <div className="event-body">
                  <div className="event-head">
                    <span className="event-time">{formatTs(alert.timestamp)}</span>
                    <span className={`event-delta ${impact.direction === "increase" ? "up" : "down"}`}>
                      {signedPct(impact.probabilityDelta)}%
                    </span>
                  </div>
                  <div className="event-alert">{alert.title}</div>
                  <div className="event-source">
                    Source: {alert.source}
                    {alert.mitreTechnique ? ` · ${alert.mitreTechnique}` : ""}
                  </div>
                  <p className="event-reason">{impact.reason}</p>
                  {alert.affectedEntities.length > 0 && (
                    <div className="event-entities">
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
        </div>
      )}

      {peer && (
        <div className="panel cyber-peer">
          <div className="panel-head">
            <span>Peer &amp; industry comparison</span>
            <span className="muted">{PEER_SOURCE_LABEL[peer.sourceType]}</span>
          </div>
          <div className="peer-bars">
            <PeerBar label="Our company" value={peer.ourCompany} highlight />
            <PeerBar label="Industry median" value={peer.industryMedian} />
            <PeerBar label="Similar companies" value={peer.similarHigh} rangeLow={peer.similarLow} isRange />
            <PeerBar label="Top quartile" value={peer.topQuartile} />
            <PeerBar label="Bottom quartile" value={peer.bottomQuartile} />
          </div>
          <p className="peer-explain">{peer.explanation}</p>
          <p className="peer-caveat">
            <span className="peer-caveat-mark" aria-hidden="true">
              ⓘ
            </span>
            {PEER_CAVEAT}
          </p>
        </div>
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
    <div className={`peer-bar-row${highlight ? " highlight" : ""}`}>
      <span className="peer-bar-label">{label}</span>
      <span className="peer-bar-track">
        {isRange && rangeLow !== undefined ? (
          <span
            className="peer-bar-fill range"
            style={{ left: `${rangeStart}%`, width: `${width - rangeStart}%` }}
          />
        ) : (
          <span className={`peer-bar-fill${highlight ? " highlight" : ""}`} style={{ width: `${width}%` }} />
        )}
      </span>
      <span className="peer-bar-val">
        {isRange && rangeLow !== undefined ? `${pct(rangeLow)}–${pct(value)}` : pct(value)}
      </span>
    </div>
  );
}
