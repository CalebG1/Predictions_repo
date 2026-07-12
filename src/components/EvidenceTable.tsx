import { useMemo, useState, type MouseEvent, type ReactNode } from "react";
import type {
  EvidenceRefreshFrequency,
  EvidenceRelevance,
  EvidenceSource,
  SourceClass,
  Visibility,
} from "../domain/types";
import { useStore } from "../store";
import AddSourceModal from "./AddSourceModal";
import { BrandIcon } from "./brandIcons";
import { IconExternalLink, IconPlus, IconRefresh, IconTrash } from "./icons";
import { pct } from "./ui";

const SOURCE_CLASS_LABELS: Record<SourceClass, string> = {
  central_bank: "Central bank",
  gov_stats: "Gov stats",
  market_data: "Market data",
  nowcasting: "Nowcasting",
  corporate_demand: "Corporate / primary",
  fast_feed: "News / fast feed",
  org_internal: "Internal",
};

const RELEVANCE_LABELS: Record<EvidenceRelevance, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const FREQUENCY_LABELS: Record<EvidenceRefreshFrequency, string> = {
  default: "Default",
  hourly: "Hourly",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function fmtRelative(iso?: string): string {
  if (!iso) return "Never refreshed";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Never refreshed";
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "Refreshed just now";
  if (mins < 60) return `Refreshed ${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Refreshed ${hours}h ago`;
  const days = Math.round(hours / 24);
  return `Refreshed ${days}d ago`;
}

function kindBadge(evidence: EvidenceSource): string {
  const kind = evidence.kind ?? "feed";
  if (kind === "app_message") return evidence.app?.app === "teams" ? "Microsoft Teams" : "Slack";
  if (kind === "analysis") return "Analysis";
  if (kind === "website") return "Web article";
  if (kind === "prediction") return "Agent prediction";
  return SOURCE_CLASS_LABELS[evidence.sourceClass];
}

function sourceSubtitle(evidence: EvidenceSource): string {
  const kind = evidence.kind ?? "feed";
  if (kind === "app_message" && evidence.app) {
    return `${evidence.app.author} · ${evidence.app.authorRole}`;
  }
  if (kind === "analysis") return `${evidence.analysis?.language ?? "Python"} notebook`;
  if (kind === "website" && evidence.website) return evidence.website.domain;
  if (kind === "prediction" && evidence.prediction) {
    return `${(evidence.prediction.probability * 100).toFixed(0)}% estimate`;
  }
  return `${SOURCE_CLASS_LABELS[evidence.sourceClass]}${evidence.geographyTag ? ` · ${evidence.geographyTag}` : ""}`;
}

function sourceIcon(evidence: EvidenceSource): ReactNode {
  if (evidence.kind === "app_message" && evidence.app) {
    return (
      <span className={`evidence-source-icon evidence-source-icon-${evidence.app.app}`}>
        <BrandIcon kind={evidence.app.app} width={14} height={14} />
      </span>
    );
  }
  return null;
}

function AppMessageBody({ evidence }: { evidence: EvidenceSource }) {
  const app = evidence.app!;
  return (
    <div className="evidence-detail-app">
      <div className="evidence-detail-app-head">
        <span className={`pc-evc-app-logo pc-evc-app-logo-${app.app}`}>
          <BrandIcon kind={app.app} width={16} height={16} />
        </span>
        <div>
          <span className="evidence-detail-app-channel">{app.channel}</span>
          <span className="evidence-detail-app-name">{app.app === "teams" ? "Microsoft Teams" : "Slack"}</span>
        </div>
      </div>
      <div className="evidence-detail-message">
        <div className="evidence-detail-message-author">
          <span className="pc-evc-avatar" aria-hidden="true">
            {app.author
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)}
          </span>
          <span>{app.author}</span>
          <span className="muted small">{app.authorRole}</span>
        </div>
        <p>{app.message}</p>
      </div>
    </div>
  );
}

function AnalysisBody({ evidence }: { evidence: EvidenceSource }) {
  const a = evidence.analysis!;
  return (
    <div className="evidence-detail-analysis">
      <p>{a.narrative}</p>
      <div className="pc-evc-code-block">
        <div className="pc-evc-code-head">
          <span>{a.language}</span>
        </div>
        <pre className="pc-evc-code">{a.code}</pre>
      </div>
      <div className="pc-evc-output-block">
        <span className="pc-evc-output-label">Output</span>
        <pre className="pc-evc-output">{a.output}</pre>
      </div>
    </div>
  );
}

function WebsiteBody({ evidence }: { evidence: EvidenceSource }) {
  const w = evidence.website!;
  return (
    <a className="pc-evc-website" href={w.url} target="_blank" rel="noopener noreferrer">
      <div className="pc-evc-website-head">
        <span className="pc-evc-favicon" aria-hidden="true">
          {w.publisher.slice(0, 1)}
        </span>
        <span className="pc-evc-domain">{w.domain}</span>
        <IconExternalLink />
      </div>
      <div className="pc-evc-website-headline">{w.headline}</div>
      <p className="pc-evc-website-snippet">{w.snippet}</p>
    </a>
  );
}

function PredictionBody({ evidence }: { evidence: EvidenceSource }) {
  const p = evidence.prediction!;
  return (
    <div className="evidence-detail-prediction">
      <div className="evidence-detail-prediction-head">
        <span>{p.agent}</span>
        <b>{pct(p.probability)}</b>
      </div>
      <p>{p.summary}</p>
    </div>
  );
}

function EvidenceDetailModal({ evidence, onClose }: { evidence: EvidenceSource; onClose: () => void }) {
  const relevance = evidence.relevance ?? "medium";
  const frequency = evidence.refreshFrequency ?? "default";
  const kind = evidence.kind ?? "feed";

  return (
    <div className="evidence-detail-overlay" onMouseDown={onClose}>
      <div className="evidence-detail-panel" onMouseDown={(e) => e.stopPropagation()}>
        <header className="evidence-detail-head">
          <div className="evidence-detail-head-main">
            <span className="evidence-detail-class">{kindBadge(evidence)}</span>
            <h3>{evidence.title}</h3>
          </div>
          <button type="button" className="evidence-detail-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="evidence-detail-body">
          {kind === "app_message" && evidence.app && <AppMessageBody evidence={evidence} />}
          {kind === "analysis" && evidence.analysis && <AnalysisBody evidence={evidence} />}
          {kind === "website" && evidence.website && <WebsiteBody evidence={evidence} />}
          {kind === "prediction" && evidence.prediction && <PredictionBody evidence={evidence} />}

          <div className="evidence-detail-grid">
            <div className="evidence-detail-field">
              <span className="evidence-detail-label">Published</span>
              <span>{fmtDate(evidence.retrievedAt)}</span>
            </div>
            <div className="evidence-detail-field">
              <span className="evidence-detail-label">Credibility</span>
              <span>{pct(evidence.credibilityScore)}</span>
            </div>
            <div className="evidence-detail-field">
              <span className="evidence-detail-label">Relevance</span>
              <span className={`evidence-detail-pill rel-${relevance}`}>{RELEVANCE_LABELS[relevance]}</span>
            </div>
            <div className="evidence-detail-field">
              <span className="evidence-detail-label">Refresh schedule</span>
              <span>{FREQUENCY_LABELS[frequency]}</span>
            </div>
            {evidence.methodTag && kind === "feed" && (
              <div className="evidence-detail-field">
                <span className="evidence-detail-label">Method</span>
                <span>{evidence.methodTag}</span>
              </div>
            )}
            {evidence.geographyTag && (
              <div className="evidence-detail-field">
                <span className="evidence-detail-label">Geography</span>
                <span>{evidence.geographyTag}</span>
              </div>
            )}
          </div>

          {evidence.indicates && (
            <div className="evidence-detail-indicates">
              <span className="evidence-detail-label">What this indicates</span>
              <p>{evidence.indicates}</p>
            </div>
          )}

          {evidence.disconfirming && (
            <p className="evidence-detail-disconfirming">
              ⚖︎ Deliberately sourced to challenge the lead view, to guard against one-sided evidence gathering.
            </p>
          )}

          {(evidence.url || evidence.website?.url) && kind !== "website" && (
            <a
              className="evidence-detail-link"
              href={evidence.url ?? evidence.website?.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open source
              <IconExternalLink />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EvidenceTable({
  questionId,
  evidence,
}: {
  questionId: string;
  evidence: EvidenceSource[];
}) {
  const {
    setEvidenceRelevance,
    setEvidenceRefreshFrequency,
    refreshEvidenceRow,
    deleteEvidenceRow,
    contextItems,
    bindingsFor,
    bindContext,
    addAppContext,
    addUpload,
    addContextItem,
  } = useStore();
  const [detail, setDetail] = useState<EvidenceSource | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const boundItemIds = useMemo(
    () => new Set(bindingsFor(questionId).map((b) => b.contextItemId)),
    [bindingsFor, questionId]
  );

  const stop = (e: MouseEvent) => e.stopPropagation();

  const doRefresh = (id: string) => {
    if (refreshingId) return;
    setRefreshingId(id);
    window.setTimeout(() => {
      refreshEvidenceRow(questionId, id);
      setRefreshingId(null);
    }, 550);
  };

  return (
    <div className="panel evidence-table-panel">
      <div className="evidence-table-head">
        <h4>Evidence</h4>
        <span className="muted small evidence-table-head-count">
          {evidence.length === 0
            ? "No evidence sources yet"
            : `${evidence.length} source${evidence.length === 1 ? "" : "s"} · click a row for details`}
        </span>
        <button type="button" className="ctx-primary-btn evidence-add-btn" onClick={() => setAddOpen(true)}>
          <IconPlus />
          Add evidence
        </button>
      </div>

      {evidence.length === 0 ? (
        <p className="muted evidence-table-empty">No evidence sources added yet.</p>
      ) : (
        <div className="evidence-table-wrap">
          <table className="evidence-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Published</th>
                <th>Relevance</th>
                <th>Refresh</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {evidence.map((e) => {
                const relevance = e.relevance ?? "medium";
                const frequency = e.refreshFrequency ?? "default";
                const isRefreshing = refreshingId === e.id;
                return (
                  <tr
                    key={e.id}
                    className="evidence-row"
                    tabIndex={0}
                    role="button"
                    aria-label={`View details for ${e.title}`}
                    onClick={() => setDetail(e)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        setDetail(e);
                      }
                    }}
                  >
                    <td className="evidence-cell-source">
                      <div className="evidence-source-main">
                        {sourceIcon(e)}
                        <span className="evidence-source-title">{e.title}</span>
                        {e.disconfirming && (
                          <span className="ev-dis" title="Deliberately disconfirming">
                            ⚖︎
                          </span>
                        )}
                        {(e.url || e.website?.url) && (
                          <a
                            href={e.url ?? e.website?.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="evidence-source-link"
                            onClick={stop}
                            aria-label="Open source in new tab"
                            title="Open source"
                          >
                            <IconExternalLink />
                          </a>
                        )}
                      </div>
                      <span className="evidence-source-sub">{sourceSubtitle(e)}</span>
                    </td>

                    <td className="evidence-cell-date">{fmtDate(e.retrievedAt)}</td>

                    <td className="evidence-cell-relevance" onClick={stop}>
                      <select
                        className={`evidence-relevance-select rel-${relevance}`}
                        value={relevance}
                        aria-label={`Relevance for ${e.title}`}
                        onChange={(ev) =>
                          setEvidenceRelevance(questionId, e.id, ev.target.value as EvidenceRelevance)
                        }
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </td>

                    <td className="evidence-cell-refresh" onClick={stop}>
                      <div className="evidence-refresh-controls">
                        <select
                          className="evidence-freq-select"
                          value={frequency}
                          aria-label={`Refresh frequency for ${e.title}`}
                          onChange={(ev) =>
                            setEvidenceRefreshFrequency(
                              questionId,
                              e.id,
                              ev.target.value as EvidenceRefreshFrequency
                            )
                          }
                        >
                          <option value="default">Default</option>
                          <option value="hourly">Hourly</option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                        <button
                          type="button"
                          className={`evidence-refresh-btn${isRefreshing ? " spinning" : ""}`}
                          onClick={() => doRefresh(e.id)}
                          disabled={isRefreshing}
                          aria-label={`Refresh ${e.title} now`}
                          title="Refresh now"
                        >
                          <IconRefresh />
                        </button>
                      </div>
                      <span className="evidence-refresh-sub">{fmtRelative(e.lastRefreshedAt)}</span>
                    </td>

                    <td className="evidence-cell-actions" onClick={stop}>
                      <button
                        type="button"
                        className="evidence-delete-btn"
                        onClick={() => deleteEvidenceRow(questionId, e.id)}
                        aria-label={`Delete ${e.title}`}
                        title="Delete"
                      >
                        <IconTrash />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {detail && <EvidenceDetailModal evidence={detail} onClose={() => setDetail(null)} />}

      <AddSourceModal
        open={addOpen}
        libraryItems={contextItems}
        boundItemIds={boundItemIds}
        onClose={() => setAddOpen(false)}
        onAddAppContext={(connector, data) => {
          addAppContext(
            {
              connectorId: connector.id,
              title: data.title,
              body: data.body,
              sourceRef: data.sourceRef,
              visibility: data.visibility as Visibility,
              tags: data.tags,
            },
            questionId
          );
        }}
        onImport={(fileNames) => addUpload(questionId, fileNames)}
        onNotes={(data) => {
          const item = addContextItem({ type: "manual", ...data });
          bindContext(questionId, item.id);
        }}
        onBindFromLibrary={(itemId) => bindContext(questionId, itemId)}
      />
    </div>
  );
}
