import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { probabilityDelta, riskWeighted, sortWithPins, useStore } from "../store";
import CreateQuestionModal, { AddQuestionButton } from "../components/CreateQuestionModal";
import CyberQuestionTable from "../components/CyberQuestionTable";
import CyberFiltersV2, { type CyberViewKey } from "../components/CyberFiltersV2";
import { withinHorizon, type HorizonKey, type SortKey } from "../components/QuestionFilters";
import { cyberQuestions } from "../domain/cyberDashboard";
import { enterpriseRiskMap, CONFIDENCE_LABEL, TREND_GLYPH } from "../domain/cyberForecast";
import {
  alertConversionStats,
  alertImpactFeed,
  type AlertSeverity,
  type AlertSource,
} from "../domain/alerts";
import { peerMatrix, PEER_MATRIX_MODES } from "../domain/peers";
import {
  QUESTION_TO_DOMAIN,
  securityDomainRows,
  PEER_POSITION_LABEL,
  type SecurityDomain,
} from "../domain/securityDomains";
import { pct, signedPct, impactLevelLabel } from "../components/ui";
import type { Visibility } from "../domain/types";

function severityClass(sev: AlertSeverity): string {
  return `sev-chip sev-${sev}`;
}

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Cybersecurity2() {
  const navigate = useNavigate();
  const { questions, yesOutcome, historyFor, pinnedIds } = useStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<CyberViewKey>("forecasts");
  const [domain, setDomain] = useState<SecurityDomain | "all">("all");
  const [owner, setOwner] = useState<string>("all");
  const [alertSource, setAlertSource] = useState<AlertSource | "all">("all");
  const [vis, setVis] = useState<"all" | Visibility>("all");
  const [sort, setSort] = useState<SortKey | null>(null);
  const [horizon, setHorizon] = useState<HorizonKey>("all");

  const cyber = useMemo(() => cyberQuestions(questions), [questions]);
  const owners = useMemo(
    () => Array.from(new Set(cyber.map((q) => q.owningTeam))).sort(),
    [cyber]
  );
  const visibleIds = useMemo(() => new Set(cyber.map((q) => q.id)), [cyber]);
  const titleFor = useMemo(() => {
    const map = new Map(cyber.map((q) => [q.id, q.title]));
    return (id: string) => map.get(id);
  }, [cyber]);

  const filteredForecasts = useMemo(() => {
    const query = search.trim().toLowerCase();
    let list = cyber.filter((q) => {
      if (query && !q.title.toLowerCase().includes(query)) return false;
      if (domain !== "all" && QUESTION_TO_DOMAIN[q.id] !== domain) return false;
      if (owner !== "all" && q.owningTeam !== owner) return false;
      if (vis !== "all" && q.visibility !== vis) return false;
      if (!withinHorizon(q.resolutionDate, horizon)) return false;
      return true;
    });

    const score = (qId: string) => {
      const yes = yesOutcome(qId);
      const h = yes ? historyFor(yes.id) : [];
      const p = yes?.currentProbability ?? 0.5;
      return { p, d7: probabilityDelta(h, 7) ?? 0 };
    };

    if (sort) {
      list = [...list].sort((a, b) => {
        const sa = score(a.id);
        const sb = score(b.id);
        switch (sort) {
          case "movers":
            return Math.abs(sb.d7) - Math.abs(sa.d7);
          case "risk_weighted":
            return riskWeighted(b, sb.p) - riskWeighted(a, sb.p);
          case "resolving_soon":
            return a.resolutionDate.localeCompare(b.resolutionDate);
          case "most_uncertain":
            return Math.abs(0.5 - sa.p) - Math.abs(0.5 - sb.p);
        }
      });
    }

    return sortWithPins(list, pinnedIds);
  }, [cyber, search, domain, owner, vis, horizon, sort, pinnedIds, yesOutcome, historyFor]);

  const riskMap = useMemo(() => {
    const query = search.trim().toLowerCase();
    return enterpriseRiskMap(questions, yesOutcome, historyFor).filter(
      (r) => !query || r.failureMode.toLowerCase().includes(query)
    );
  }, [questions, yesOutcome, historyFor, search]);

  const domains = useMemo(() => {
    const query = search.trim().toLowerCase();
    return securityDomainRows(questions, yesOutcome, historyFor).filter((d) => {
      if (domain !== "all" && d.domain !== domain) return false;
      if (query && !d.domain.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [questions, yesOutcome, historyFor, domain, search]);

  const feed = useMemo(() => {
    const query = search.trim().toLowerCase();
    return alertImpactFeed(titleFor, visibleIds).filter((item) => {
      if (alertSource !== "all" && item.alert.source !== alertSource) return false;
      if (query && !item.alert.title.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [titleFor, visibleIds, alertSource, search]);

  const conversion = useMemo(() => {
    let rows = alertConversionStats(visibleIds);
    if (alertSource !== "all") rows = rows.filter((r) => r.source === alertSource);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => r.source.toLowerCase().includes(q));
    }
    return rows;
  }, [visibleIds, alertSource, search]);

  const peerMatrixRows = useMemo(() => peerMatrix(visibleIds), [visibleIds]);

  return (
    <div className="dash-page dash-page-questions">
      <div className="dash-page-top">
        <div className="dash-head">
          <div>
            <h1>Cybersecurity 2</h1>
          </div>
          <AddQuestionButton onClick={() => setCreateOpen(true)} />
        </div>

        <CreateQuestionModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          defaultCategory="Security/Cyber"
        />

        <CyberFiltersV2
          search={search}
          onSearchChange={setSearch}
          view={view}
          onViewChange={setView}
          domain={domain}
          onDomainChange={setDomain}
          owner={owner}
          onOwnerChange={setOwner}
          owners={owners}
          alertSource={alertSource}
          onAlertSourceChange={setAlertSource}
          vis={vis}
          onVisChange={setVis}
          sort={sort}
          onSortChange={setSort}
          horizon={horizon}
          onHorizonChange={setHorizon}
        />
      </div>

      <div className="dash-page-body">
        {view === "forecasts" && <CyberQuestionTable questions={filteredForecasts} />}

        {view === "risk_map" && (
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
        )}

        {view === "domains" && (
          <div className="qtable-wrap">
            <table className="qtable domain-table">
              <thead>
                <tr>
                  <th>Domain</th>
                  <th className="num">Risk score</th>
                  <th className="num">Failure prob.</th>
                  <th>Top alerts</th>
                  <th className="num">Open items</th>
                  <th>Peer</th>
                  <th className="num">Controls</th>
                </tr>
              </thead>
              <tbody>
                {domains.map((d) => (
                  <tr
                    key={d.domain}
                    className={d.questionId ? "qt-row" : ""}
                    role={d.questionId ? "link" : undefined}
                    tabIndex={d.questionId ? 0 : undefined}
                    onClick={d.questionId ? () => navigate(`/q/${d.questionId}`) : undefined}
                    onKeyDown={
                      d.questionId
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              navigate(`/q/${d.questionId}`);
                            }
                          }
                        : undefined
                    }
                  >
                    <td className="domain-name">{d.domain}</td>
                    <td className="num domain-score">{d.riskScore}</td>
                    <td className="num">{pct(d.failureProbability)}</td>
                    <td className="domain-alerts">
                      {d.topAlerts.length === 0 ? (
                        <span className="muted">—</span>
                      ) : (
                        d.topAlerts.map((a) => (
                          <span className="domain-alert-chip" key={a}>
                            {a}
                          </span>
                        ))
                      )}
                    </td>
                    <td className="num">{d.openRemediation}</td>
                    <td className={`domain-peer peer-${d.peerComparison}`}>
                      {PEER_POSITION_LABEL[d.peerComparison]}
                    </td>
                    <td className="num">{d.controlCoverage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === "alerts" && (
          <div className="qtable-wrap">
            <table className="qtable alert-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Alert</th>
                  <th>Source</th>
                  <th>Severity</th>
                  <th>Affected forecasts</th>
                  <th className="num">Max impact</th>
                </tr>
              </thead>
              <tbody>
                {feed.map((item) => {
                  const maxImpact = Math.max(...item.impacts.map((i) => Math.abs(i.probabilityDelta)));
                  const topImpact = item.impacts.find((i) => Math.abs(i.probabilityDelta) === maxImpact)!;
                  return (
                    <tr key={item.alert.id}>
                      <td className="alert-time">{formatTs(item.alert.timestamp)}</td>
                      <td className="alert-title-cell">{item.alert.title}</td>
                      <td>{item.alert.source}</td>
                      <td>
                        <span className={severityClass(item.alert.severity)}>{item.alert.severity}</span>
                      </td>
                      <td>
                        <div className="alert-feed-affected inline">
                          {item.impacts.map((imp) => (
                            <Link key={imp.questionId} to={`/q/${imp.questionId}`} className="affected-q">
                              <span className="affected-title">{imp.questionTitle}</span>
                              <span className={`affected-delta ${imp.direction === "increase" ? "up" : "down"}`}>
                                {signedPct(imp.probabilityDelta)}%
                              </span>
                            </Link>
                          ))}
                        </div>
                      </td>
                      <td className={`num alert-impact ${topImpact.direction === "increase" ? "up" : "down"}`}>
                        {signedPct(topImpact.probabilityDelta)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {view === "conversion" && (
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
        )}

        {view === "peer" && (
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
                {peerMatrixRows.map((row) => (
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
        )}
      </div>
    </div>
  );
}
