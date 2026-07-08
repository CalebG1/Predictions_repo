import { Link } from "react-router-dom";
import { connectorById } from "../../domain/connectors";
import type { ContextItem, ContextRevision } from "../../domain/types";
import VisibilityBadge from "../VisibilityBadge";

function typeLabel(item: ContextItem): string {
  if (item.connectorId && item.type === "manual") return "App context";
  if (item.type === "manual" || item.type === "instruction") return "Notes";
  if (item.type === "analysis") return "Analysis";
  return item.type.charAt(0).toUpperCase() + item.type.slice(1);
}

function statusLabel(status: ContextItem["status"]): string {
  return status === "pending_approval" ? "Pending approval" : status.charAt(0).toUpperCase() + status.slice(1);
}

export default function ContextItemDetail({
  item,
  bindings,
  revisions,
  canEdit,
  onClose,
  onArchive,
  onApprove,
  onReject,
}: {
  item: ContextItem;
  bindings: { questionId: string; questionTitle: string }[];
  revisions: ContextRevision[];
  canEdit: boolean;
  onClose: () => void;
  onArchive: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const appConnector = item.connectorId ? connectorById(item.connectorId) : undefined;
  const isAppContext = item.type === "manual" && !!item.connectorId;

  return (
    <div className="ctx-detail-overlay" onMouseDown={onClose}>
      <div className="ctx-detail-panel" onMouseDown={(e) => e.stopPropagation()}>
        <header className="ctx-detail-head">
          <div className="ctx-detail-head-main">
            <h3>{item.title}</h3>
            <div className="ctx-detail-meta">
              <span className="ctx-type-badge">{typeLabel(item)}</span>
              <VisibilityBadge value={item.visibility} />
              <span className={`ctx-status ctx-status-${item.status}`}>{statusLabel(item.status)}</span>
            </div>
            <p className="ctx-detail-submeta">
              {item.owningTeam} · {item.updatedAt.slice(0, 10)}
              {isAppContext && appConnector ? ` · ${appConnector.name}` : ""}
            </p>
          </div>
          <button type="button" className="ctx-detail-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="ctx-detail-body">
          {item.notebookCells && item.notebookCells.length > 0 ? (
            <div className="ctx-detail-card">
              <span className="ctx-detail-card-label">Notebook</span>
              <div className="ctx-detail-notebook">
                {item.notebookCells.map((cell) => (
                  <div key={cell.id} className="ctx-detail-nb-cell">
                    {cell.kind === "markdown" ? (
                      <p className="ctx-detail-nb-markdown">{cell.source}</p>
                    ) : (
                      <>
                        <pre className="ctx-detail-nb-code">{cell.source}</pre>
                        {(cell.output || cell.error) && (
                          <pre className={`ctx-detail-nb-output${cell.error ? " error" : ""}`}>
                            {cell.error ?? cell.output}
                          </pre>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            item.body && (
              <div className="ctx-detail-card">
                <span className="ctx-detail-card-label">Context</span>
                <pre className="ctx-detail-pre">{item.body}</pre>
              </div>
            )
          )}

          {item.fileNames && item.fileNames.length > 0 && (
            <div className="ctx-detail-card">
              <span className="ctx-detail-card-label">Files</span>
              <ul className="ctx-file-list">
                {item.fileNames.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="ctx-detail-card">
            <span className="ctx-detail-card-label">Bound forecasts · {bindings.length}</span>
            {bindings.length > 0 && (
              <ul className="ctx-bind-list">
                {bindings.map((b) => (
                  <li key={b.questionId}>
                    <Link to={`/q/${b.questionId}`} onClick={onClose}>
                      {b.questionTitle}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {revisions.length > 0 && (
            <div className="ctx-detail-card">
              <span className="ctx-detail-card-label">Revisions</span>
              <ul className="ctx-rev-list">
                {revisions.map((r) => (
                  <li key={r.id}>
                    <div className="ctx-rev-head">
                      <b>v{r.version}</b>
                      <span className="muted small">{r.changedAt.slice(0, 10)}</span>
                    </div>
                    {r.body.length > 0 && (
                      <pre className="ctx-rev-body">{r.body.slice(0, 160)}{r.body.length > 160 ? "…" : ""}</pre>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <footer className="ctx-detail-foot">
          {item.status === "pending_approval" && onApprove && onReject && (
            <>
              <button type="button" className="ctx-primary-btn" onClick={onApprove}>
                Approve
              </button>
              <button type="button" className="ctx-secondary-btn" onClick={onReject}>
                Reject
              </button>
            </>
          )}
          {canEdit && item.status !== "archived" && (
            <button type="button" className="ctx-secondary-btn" onClick={onArchive}>
              Archive
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
