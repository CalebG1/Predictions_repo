// Per-question insights for Real Estate site forecasts (mirror of
// CyberQuestionInsights): plain-English explanation, factor decomposition,
// gravity trade-area summary, associated market signals, recommended action.

import { useMemo } from "react";
import type { ForecastQuestion } from "../domain/types";
import { useStore } from "../store";
import { pct, signedPct } from "./ui";
import ConfidenceBadge from "./ConfidenceBadge";
import {
  signalsForQuestion,
  SIGNAL_STATUS_LABEL,
  type SignalSeverity,
} from "../domain/siteSignals";
import {
  forecastDecomposition,
  questionConfidence,
  recommendedAction,
  explanationFor,
} from "../domain/siteIntel";
import {
  ASSET_CLASS_LABEL,
  DEFAULT_BETA,
  candidateSites,
  demandGrid,
  gravitySitesFrom,
  operatingRetailSites,
  siteForQuestion,
} from "../domain/siteSelection";
import { cannibalizationMatrix, marketShares } from "../domain/tradeArea";
import { gravityRevenueM, targetRevenueM } from "../domain/siteEngine";
import SiteScenarioPanel from "./SiteScenarioPanel";

function severityClass(sev: SignalSeverity): string {
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

export default function SiteQuestionInsights({ q }: { q: ForecastQuestion }) {
  const { yesOutcome, historyFor } = useStore();
  const site = siteForQuestion(q.id);

  const { current, prior } = useMemo(() => {
    const yes = yesOutcome(q.id);
    const cur = yes?.currentProbability ?? q.priorBaseRate;
    const history = yes ? historyFor(yes.id) : [];
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
  const signals = useMemo(() => signalsForQuestion(q.id), [q.id]);
  const explanation = useMemo(() => explanationFor(q, prior, current), [q, prior, current]);
  const action = recommendedAction(q.id);

  const gravity = useMemo(() => {
    if (!site || site.assetClass !== "retail") return null;
    const sites = gravitySitesFrom(candidateSites);
    const shares = marketShares(sites, demandGrid, DEFAULT_BETA);
    const impliedM = gravityRevenueM(site, DEFAULT_BETA);
    const targetM = targetRevenueM(site);
    const incumbents = operatingRetailSites().map((s) => ({
      id: s.id,
      x: s.x,
      y: s.y,
      attractiveness: s.attractiveness,
    }));
    const cannibal = cannibalizationMatrix(
      [{ id: site.id, x: site.x, y: site.y, attractiveness: site.attractiveness }],
      incumbents,
      demandGrid,
      DEFAULT_BETA
    ).sort((a, b) => b.shareLoss - a.shareLoss);
    const worst = cannibal[0];
    const worstName = worst
      ? candidateSites.find((s) => s.id === worst.incumbentId)?.name ?? worst.incumbentId
      : null;
    return { share: shares[site.id] ?? 0, impliedM, targetM, worst, worstName };
  }, [site]);

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
        {site && (
          <p className="muted small site-insight-context">
            {site.name} · {ASSET_CLASS_LABEL[site.assetClass]} · {site.submarket} ·{" "}
            {site.targetMetric}
          </p>
        )}
        <p className="cyber-explain-body">{explanation}</p>
        <div className="cyber-action">
          <span className="cyber-action-label">Recommended action</span>
          <span className="cyber-action-body">{action}</span>
        </div>
      </div>

      {site && (
        <div className="panel">
          <div className="panel-head">
            <span>Scenario simulator</span>
            <span className="muted">
              Monte Carlo re-runs live as you move the sliders · {site.name}
            </span>
          </div>
          <SiteScenarioPanel site={site} />
        </div>
      )}

      {gravity && (
        <div className="panel">
          <div className="panel-head">
            <span>Trade-area model</span>
            <span className="muted">Huff gravity model · distance-decay β = {DEFAULT_BETA}</span>
          </div>
          <div className="gravity-stats">
            <div className="gravity-stat">
              <span className="gravity-stat-label">Metro market share</span>
              <span className="gravity-stat-val">{pct(gravity.share)}</span>
            </div>
            {gravity.impliedM !== null && (
              <div className="gravity-stat">
                <span className="gravity-stat-label">Gravity-implied year-1 revenue</span>
                <span className="gravity-stat-val">${gravity.impliedM.toFixed(2)}M</span>
              </div>
            )}
            {gravity.targetM !== null && (
              <div className="gravity-stat">
                <span className="gravity-stat-label">Underwriting target</span>
                <span className="gravity-stat-val">${gravity.targetM.toFixed(2)}M</span>
              </div>
            )}
            {gravity.worst && gravity.worstName && (
              <div className="gravity-stat">
                <span className="gravity-stat-label">Largest cannibalization</span>
                <span className="gravity-stat-val">
                  −{pct(gravity.worst.shareLoss)} <span className="muted small">of {gravity.worstName}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

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
          <span>Associated market signals</span>
          <span className="muted">{signals.length} forecast-relevant · newest first</span>
        </div>
        {signals.length === 0 ? (
          <p className="muted">No market signals are currently mapped to this forecast.</p>
        ) : (
          <div className="alert-table-wrap">
            <table className="alert-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Signal</th>
                  <th>Source</th>
                  <th>Severity</th>
                  <th className="num">Impact</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {signals.map(({ signal, impact }) => (
                  <tr key={signal.id}>
                    <td className="alert-time">{formatTs(signal.timestamp)}</td>
                    <td className="alert-title-cell">
                      {signal.sourceUrl ? (
                        <a href={signal.sourceUrl} target="_blank" rel="noreferrer" className="alert-link">
                          {signal.title}
                        </a>
                      ) : (
                        signal.title
                      )}
                    </td>
                    <td>{signal.source}</td>
                    <td>
                      <span className={severityClass(signal.severity)}>{signal.severity}</span>
                    </td>
                    <td className={`num alert-impact ${impact.direction === "increase" ? "up" : "down"}`}>
                      {signedPct(impact.probabilityDelta)}%
                    </td>
                    <td className="alert-status">{SIGNAL_STATUS_LABEL[signal.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {signals.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <span>Timeline of probability-changing events</span>
            <span className="muted">What happened, why it mattered, and how much it moved the line</span>
          </div>
          <div className="event-timeline">
            {signals.map(({ signal, impact }) => (
              <div className="event-item" key={signal.id}>
                <div className="event-marker" aria-hidden="true" />
                <div className="event-body">
                  <div className="event-head">
                    <span className="event-time">{formatTs(signal.timestamp)}</span>
                    <span className={`event-delta ${impact.direction === "increase" ? "up" : "down"}`}>
                      {signedPct(impact.probabilityDelta)}%
                    </span>
                  </div>
                  <div className="event-alert">{signal.title}</div>
                  <div className="event-source">
                    Source: {signal.source}
                    {signal.submarket ? ` · ${signal.submarket}` : ""}
                  </div>
                  <p className="event-reason">{impact.reason}</p>
                  {signal.affectedSites.length > 0 && (
                    <div className="event-entities">
                      {signal.affectedSites.map((id) => (
                        <span className="entity-chip" key={id}>
                          {candidateSites.find((s) => s.id === id)?.name ?? id}
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
    </div>
  );
}
