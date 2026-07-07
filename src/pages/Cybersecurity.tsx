import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RiskMatrixScatter } from "../components/charts";
import CreateQuestionModal, { AddQuestionButton } from "../components/CreateQuestionModal";
import CyberForecastTable from "../components/CyberForecastTable";
import { touchpointMeta } from "../domain/touchpoints";
import {
  aggregatedSignals,
  cyberExposure,
  cyberQuestions,
  riskMatrixPoints,
  threatCoverage,
} from "../domain/cyberDashboard";
import {
  enterpriseRiskMap,
  enterpriseSummary,
  CONFIDENCE_LABEL,
  TREND_GLYPH,
} from "../domain/cyberForecast";
import {
  alertConversionStats,
  alertImpactFeed,
  ALERT_STATUS_LABEL,
  type AlertSeverity,
} from "../domain/alerts";
import { peerMatrix, PEER_MATRIX_MODES, PEER_CAVEAT } from "../domain/peers";
import { riskWeighted, useStore } from "../store";
import { categoryColors, pct, signedPct, impactLevelLabel } from "../components/ui";

function severityClass(sev: AlertSeverity): string {
  return `sev-chip sev-${sev}`;
}

export default function Cybersecurity() {
  const navigate = useNavigate();
  const { questions, yesOutcome, historyFor, touchpointSignalsFor } = useStore();
  const [createOpen, setCreateOpen] = useState(false);

  const cyber = useMemo(() => cyberQuestions(questions), [questions]);
  const visibleIds = useMemo(() => new Set(questions.map((q) => q.id)), [questions]);
  const titleFor = useMemo(() => {
    const map = new Map(questions.map((q) => [q.id, q.title]));
    return (id: string) => map.get(id);
  }, [questions]);

  const metrics = useMemo(
    () => cyberExposure(questions, yesOutcome, historyFor),
    [questions, yesOutcome, historyFor]
  );

  const riskMap = useMemo(
    () => enterpriseRiskMap(questions, yesOutcome, historyFor),
    [questions, yesOutcome, historyFor]
  );

  const matrixPoints = useMemo(() => riskMatrixPoints(questions, yesOutcome), [questions, yesOutcome]);
  const coverage = useMemo(() => threatCoverage(questions, yesOutcome), [questions, yesOutcome]);
  const signals = useMemo(
    () => aggregatedSignals(questions, touchpointSignalsFor),
    [questions, touchpointSignalsFor]
  );

  const feed = useMemo(() => alertImpactFeed(titleFor, visibleIds), [titleFor, visibleIds]);
  const conversion = useMemo(() => alertConversionStats(visibleIds), [visibleIds]);
  const matrix = useMemo(() => peerMatrix(visibleIds), [visibleIds]);

  const summary = useMemo(() => {
    const upCount = riskMap.filter((r) => r.trend === "up").length;
    const downCount = riskMap.filter((r) => r.trend === "down").length;
    const netDirection =
      upCount > downCount ? "increased" : downCount > upCount ? "decreased" : "held steady";

    const topDrivers = feed
      .filter((f) => f.impacts[0]?.direction === "increase")
      .slice(0, 3)
      .map((f) => f.alert.title);

    const our = matrix.find((r) => r.label === "Our company");
    const median = matrix.find((r) => r.label === "Industry median");
    const aboveMedianModes: string[] = [];
    const belowMedianModes: string[] = [];
    if (our && median) {
      for (const mode of PEER_MATRIX_MODES) {
        const o = our.values[mode];
        const m = median.values[mode];
        if (o === undefined || m === undefined) continue;
        if (o > m + 0.01) aboveMedianModes.push(mode);
        else if (o < m - 0.01) belowMedianModes.push(mode);
      }
    }

    return enterpriseSummary({
      netDirection,
      topDrivers,
      elevatedCount: metrics.elevatedCount,
      aboveMedianModes: aboveMedianModes.slice(0, 2),
      belowMedianModes: belowMedianModes.slice(0, 2),
    });
  }, [riskMap, feed, matrix, metrics.elevatedCount]);

  const sortedQuestions = useMemo(() => {
    return [...cyber].sort((a, b) => {
      const pa = yesOutcome(a.id)?.currentProbability ?? a.priorBaseRate;
      const pb = yesOutcome(b.id)?.currentProbability ?? b.priorBaseRate;
      return riskWeighted(b, pb) - riskWeighted(a, pa);
    });
  }, [cyber, yesOutcome]);

  const gapCount = coverage.filter((c) => !c.covered).length;

  return (
    <div className="dash-page cyber-page">
      <div className="dash-page-top">
        <div className="dash-head">
          <div>
            <h1>Cybersecurity</h1>
            <p className="dash-sub">
              CISO command center — forecasts first, alerts second. What is most likely to go wrong next, why, and how we
              compare to peers.
            </p>
          </div>
          <AddQuestionButton onClick={() => setCreateOpen(true)} />
        </div>

        <CreateQuestionModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          defaultCategory="Security/Cyber"
        />
      </div>

      <div className="panel cyber-exec">
        <div className="panel-head">
          <span>Executive summary</span>
          <span className="muted">Auto-generated from this week&apos;s movers and peer position</span>
        </div>
        <p className="cyber-exec-body">{summary}</p>
      </div>

      <div className="metric-row">
        <div className="metric">
          <div className="metric-num">{(metrics.aggregateExposure * 100).toFixed(0)}%</div>
          <div className="metric-lbl">Aggregate exposure (risk-weighted)</div>
        </div>
        <div className="metric">
          <div className="metric-num">{metrics.elevatedCount}</div>
          <div className="metric-lbl">Elevated this week (&gt;3pp)</div>
        </div>
        <div className="metric">
          <div className="metric-num">{metrics.resolvingSoonCount}</div>
          <div className="metric-lbl">Resolving within 30 days</div>
        </div>
        <div className="metric">
          <div className="metric-num">{metrics.activeForecasts}</div>
          <div className="metric-lbl">Active cyber forecasts</div>
        </div>
        <div className="metric">
          <div className="metric-num">{gapCount}</div>
          <div className="metric-lbl">Threat vector gaps</div>
        </div>
      </div>

      {/* Enterprise cyber risk map */}
      <div className="panel">
        <div className="panel-head">
          <span>Enterprise cyber risk map</span>
          <span className="muted">Forecasted failure landscape by type</span>
        </div>
        <div className="qtable-wrap">
          <table className="qtable risk-map-table">
            <thead>
              <tr>
                <th>Failure type</th>
                <th className="num">Probability</th>
                <th>Trend</th>
                <th>Impact</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {riskMap.map((row) => {
                const clickable = !!row.questionId;
                return (
                  <tr
                    key={row.failureMode}
                    className={clickable ? "qt-row" : ""}
                    role={clickable ? "link" : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    onClick={clickable ? () => navigate(`/q/${row.questionId}`) : undefined}
                    onKeyDown={
                      clickable
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              navigate(`/q/${row.questionId}`);
                            }
                          }
                        : undefined
                    }
                  >
                    <td className="rmt-mode">{row.failureMode}</td>
                    <td className="num rmt-prob">{pct(row.probability)}</td>
                    <td className={`rmt-trend trend-${row.trend}`}>{TREND_GLYPH[row.trend]}</td>
                    <td>
                      <span className={`impact-chip impact-${row.impact}`}>{impactLevelLabel[row.impact]}</span>
                    </td>
                    <td>
                      <span className={`conf-dot conf-${row.confidence}`} />
                      {CONFIDENCE_LABEL[row.confidence]}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="cyber-grid">
        <div className="panel">
          <div className="panel-head">
            <span>Risk matrix</span>
            <span className="muted">Probability × impact · click a dot for detail</span>
          </div>
          <RiskMatrixScatter
            points={matrixPoints}
            color={categoryColors["Security/Cyber"]}
            onSelect={(id) => navigate(`/q/${id}`)}
          />
        </div>

        <div className="panel">
          <div className="panel-head">
            <span>Threat coverage</span>
            <span className="muted">
              {coverage.filter((c) => c.covered).length} of {coverage.length} vectors covered
            </span>
          </div>
          <div className="threat-coverage-grid">
            {coverage.map((item) => (
              <div key={item.vector} className={`threat-chip ${item.covered ? "covered" : "gap"}`}>
                <span className="threat-chip-label">{item.vector}</span>
                {item.covered ? (
                  <span className="threat-chip-prob">{pct(item.maxProbability!)}</span>
                ) : (
                  <button type="button" className="threat-chip-cta" onClick={() => setCreateOpen(true)}>
                    Add forecast
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alert-to-risk conversion */}
      <div className="panel">
        <div className="panel-head">
          <span>Alert-to-risk conversion</span>
          <span className="muted">How raw alerts become forecast movements</span>
        </div>
        <div className="qtable-wrap">
          <table className="qtable conversion-table">
            <thead>
              <tr>
                <th>Alert source</th>
                <th className="num">Received</th>
                <th className="num">Forecast-relevant</th>
                <th className="num">Material movers</th>
              </tr>
            </thead>
            <tbody>
              {conversion.map((row) => (
                <tr key={row.source}>
                  <td>{row.source}</td>
                  <td className="num muted">{row.received}</td>
                  <td className="num">{row.forecastRelevant}</td>
                  <td className="num conv-material">{row.materialMovers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small conversion-note">
          The product reasons about which alerts matter: most raw alerts never move a forecast. Only material movers
          (≥1pp, a critical business service, or a new failure path) change the probabilities above.
        </p>
      </div>

      {/* Alert impact feed */}
      <div className="panel">
        <div className="panel-head">
          <span>Alert impact feed</span>
          <span className="muted">Alerts that changed one or more forecasts</span>
        </div>
        <div className="alert-feed">
          {feed.length === 0 ? (
            <p className="muted">No forecast-relevant alerts in view.</p>
          ) : (
            feed.slice(0, 10).map((item) => (
              <div className="alert-feed-item" key={item.alert.id}>
                <div className="alert-feed-head">
                  <span className={severityClass(item.alert.severity)}>{item.alert.severity}</span>
                  <span className="alert-feed-title">{item.alert.title}</span>
                  <span className="alert-feed-source">
                    {item.alert.source} · {ALERT_STATUS_LABEL[item.alert.status]}
                  </span>
                </div>
                <div className="alert-feed-affected">
                  {item.impacts.map((imp) => (
                    <Link key={imp.questionId} to={`/q/${imp.questionId}`} className="affected-q">
                      <span className="affected-title">{imp.questionTitle}</span>
                      <span className={`affected-delta ${imp.direction === "increase" ? "up" : "down"}`}>
                        {signedPct(imp.probabilityDelta)}%
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="cyber-lower-grid">
        <div className="panel">
          <div className="panel-head">
            <span>Internal signals</span>
            <span className="muted">Aggregated touchpoints across cyber forecasts</span>
          </div>
          <div className="signals-feed">
            {signals.length === 0 ? (
              <p className="muted">No internal signals connected yet.</p>
            ) : (
              signals.slice(0, 12).map((row, i) => {
                const meta = touchpointMeta(row.signal.kind);
                return (
                  <Link to={`/q/${row.questionId}`} key={i} className="feed-row signals-feed-row">
                    <span
                      className="signals-feed-icon"
                      style={{ background: meta?.brandColor ?? "#5b6b66" }}
                      title={meta?.label}
                    />
                    <span className="feed-date">{row.signal.updatedAt}</span>
                    <span className="feed-title">{row.questionTitle}</span>
                    <span className="feed-trigger">{row.signal.summary}</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Peer comparison matrix */}
        <div className="panel">
          <div className="panel-head">
            <span>Peer &amp; industry comparison</span>
            <span className="muted">Public and third-party signals</span>
          </div>
          <div className="qtable-wrap">
            <table className="qtable peer-matrix-table">
              <thead>
                <tr>
                  <th>Cohort</th>
                  {PEER_MATRIX_MODES.map((m) => (
                    <th key={m} className="num">
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row) => (
                  <tr key={row.label} className={row.label === "Our company" ? "peer-us" : ""}>
                    <td>{row.label}</td>
                    {PEER_MATRIX_MODES.map((m) => (
                      <td key={m} className="num">
                        {row.values[m] !== undefined ? pct(row.values[m]!) : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="peer-caveat small">
            <span className="peer-caveat-mark" aria-hidden="true">
              ⓘ
            </span>
            {PEER_CAVEAT}
          </p>
        </div>
      </div>

      <div className="dash-page-body">
        <div className="panel">
          <div className="panel-head">
            <span>Active cyber forecasts</span>
            <span className="muted">Sorted by risk-weighted exposure</span>
          </div>
          <CyberForecastTable questions={sortedQuestions} />
        </div>
      </div>
    </div>
  );
}
