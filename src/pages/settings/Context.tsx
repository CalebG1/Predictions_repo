import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AddContextModal from "../../components/context/AddContextModal";
import ContextItemDetail from "../../components/context/ContextItemDetail";
import InlineCombobox from "../../components/context/InlineCombobox";
import VisibilityBadge from "../../components/VisibilityBadge";
import { bindingCountForItem } from "../../domain/context";
import type { ContextItem, ContextItemType, ContextBinding } from "../../domain/types";
import { useStore } from "../../store";
import { users } from "../../domain/seed";

const TABS = ["library", "bindings", "governance"] as const;
type Tab = (typeof TABS)[number];

const WORKFLOW = ["Outside view", "Inside view", "Bayesian updating"];

function typeLabel(item: ContextItem): string {
  if (item.connectorId && item.type === "manual") return "App context";
  if (item.type === "manual") return "Notes";
  if (item.type === "instruction") return "Notes";
  return item.type.charAt(0).toUpperCase() + item.type.slice(1);
}

export default function Context() {
  const {
    contextItems,
    contextBindings,
    contextAuditLog,
    questions,
    allUsers,
    addContextItem,
    addAppContext,
    bindContext,
    restoreContextBinding,
    unbindContext,
    approveContextItem,
    rejectContextItem,
    archiveContextItem,
    revisionsFor,
    canEditContext,
    canApproveContext,
  } = useStore();

  const [tab, setTab] = useState<Tab>("library");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ContextItemType | "all" | "app" | "notes">("all");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<ContextItem | null>(null);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [bindingsSearch, setBindingsSearch] = useState("");
  const [newBindForecast, setNewBindForecast] = useState("");
  const [newBindItem, setNewBindItem] = useState("");
  const [newBindForecastId, setNewBindForecastId] = useState("");
  const [newBindItemId, setNewBindItemId] = useState("");
  const [newBindNotes, setNewBindNotes] = useState("");
  const [highlightedBindingId, setHighlightedBindingId] = useState<string | null>(null);
  const [auditQuery, setAuditQuery] = useState("");
  const bindRowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const undoFadeTimerRef = useRef<number | null>(null);
  const undoRemoveTimerRef = useRef<number | null>(null);
  const undoBindingRef = useRef<ContextBinding | null>(null);
  const [undoNoticeId, setUndoNoticeId] = useState(0);
  const [undoBinding, setUndoBinding] = useState<ContextBinding | null>(null);
  const [undoFading, setUndoFading] = useState(false);

  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? allUsers.find((u) => u.id === id)?.name ?? id;

  const pendingCount = useMemo(
    () => contextItems.filter((i) => i.status === "pending_approval").length,
    [contextItems]
  );

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contextItems.filter((item) => {
      if (typeFilter === "app" && !(item.type === "manual" && item.connectorId)) return false;
      if (typeFilter === "notes" && !((item.type === "manual" && !item.connectorId) || item.type === "instruction")) return false;
      if (typeFilter !== "all" && typeFilter !== "app" && typeFilter !== "notes" && item.type !== typeFilter) return false;
      if (q && !item.title.toLowerCase().includes(q) && !item.owningTeam.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [contextItems, query, typeFilter]);

  const bindingRows = useMemo(() => {
    return contextBindings.map((b) => {
      const item = contextItems.find((i) => i.id === b.contextItemId);
      const question = questions.find((q) => q.id === b.questionId);
      return { binding: b, item, question };
    });
  }, [contextBindings, contextItems, questions]);

  const filteredBindingRows = useMemo(() => {
    const q = bindingsSearch.trim().toLowerCase();
    if (!q) return bindingRows;
    return bindingRows.filter(({ binding, item, question }) => {
      const itemTitle = (item?.title ?? binding.contextItemId).toLowerCase();
      const forecastTitle = (question?.title ?? binding.questionId).toLowerCase();
      const notes = (binding.notes ?? "").toLowerCase();
      return itemTitle.includes(q) || forecastTitle.includes(q) || notes.includes(q);
    });
  }, [bindingRows, bindingsSearch]);

  const bindableItems = useMemo(
    () => contextItems.filter((i) => i.status !== "archived"),
    [contextItems]
  );

  useEffect(() => {
    const q = bindingsSearch.trim().toLowerCase();
    if (!q) return;

    const matchingForecasts = questions.filter((question) => question.title.toLowerCase().includes(q));
    const matchingItems = bindableItems.filter((item) => item.title.toLowerCase().includes(q));

    if (matchingForecasts.length === 1) {
      setNewBindForecast(matchingForecasts[0].title);
      setNewBindForecastId(matchingForecasts[0].id);
    }
    if (matchingItems.length === 1) {
      setNewBindItem(matchingItems[0].title);
      setNewBindItemId(matchingItems[0].id);
    }
  }, [bindingsSearch, questions, bindableItems]);

  const forecastComboboxOptions = useMemo(() => {
    const boundToItem = newBindItemId
      ? new Set(
          contextBindings
            .filter((b) => b.contextItemId === newBindItemId)
            .map((b) => b.questionId)
        )
      : null;

    return questions.map((question) => ({
      id: question.id,
      label: question.title,
      disabled: boundToItem?.has(question.id),
    }));
  }, [questions, newBindItemId, contextBindings]);

  const contextItemComboboxOptions = useMemo(() => {
    const boundToForecast = newBindForecastId
      ? new Set(
          contextBindings
            .filter((b) => b.questionId === newBindForecastId)
            .map((b) => b.contextItemId)
        )
      : null;

    return bindableItems.map((item) => ({
      id: item.id,
      label: item.title,
      meta: typeLabel(item),
      disabled: boundToForecast?.has(item.id),
    }));
  }, [bindableItems, newBindForecastId, contextBindings]);

  const resolveForecastByText = (text: string) => {
    const q = text.trim().toLowerCase();
    if (!q) return undefined;
    return (
      questions.find((question) => question.title.toLowerCase() === q) ??
      questions.find((question) => question.title.toLowerCase().includes(q))
    );
  };

  const resolveContextItemByText = (text: string) => {
    const q = text.trim().toLowerCase();
    if (!q) return undefined;
    return (
      bindableItems.find((item) => item.title.toLowerCase() === q) ??
      bindableItems.find((item) => item.title.toLowerCase().includes(q))
    );
  };

  const resolvedBindForecast = useMemo(() => {
    if (newBindForecastId) return questions.find((q) => q.id === newBindForecastId);
    return resolveForecastByText(newBindForecast);
  }, [newBindForecastId, newBindForecast, questions]);

  const resolvedBindItem = useMemo(() => {
    if (newBindItemId) return bindableItems.find((i) => i.id === newBindItemId);
    return resolveContextItemByText(newBindItem);
  }, [newBindItemId, newBindItem, bindableItems]);

  const newBindingDuplicate = useMemo(() => {
    if (!resolvedBindForecast || !resolvedBindItem) return false;
    return contextBindings.some(
      (b) =>
        b.questionId === resolvedBindForecast.id &&
        b.contextItemId === resolvedBindItem.id
    );
  }, [contextBindings, resolvedBindForecast, resolvedBindItem]);

  const canCreateBinding = !!resolvedBindForecast && !!resolvedBindItem && !newBindingDuplicate;

  const handleCreateBinding = () => {
    if (!resolvedBindForecast || !resolvedBindItem || newBindingDuplicate) return;

    const bindingId = bindContext(
      resolvedBindForecast.id,
      resolvedBindItem.id,
      newBindNotes.trim() || undefined
    );
    if (bindingId) {
      setBindingsSearch("");
      setHighlightedBindingId(bindingId);
    }
    setNewBindForecast("");
    setNewBindItem("");
    setNewBindForecastId("");
    setNewBindItemId("");
    setNewBindNotes("");
  };

  const clearUndoTimers = () => {
    if (undoFadeTimerRef.current) {
      window.clearTimeout(undoFadeTimerRef.current);
      undoFadeTimerRef.current = null;
    }
    if (undoRemoveTimerRef.current) {
      window.clearTimeout(undoRemoveTimerRef.current);
      undoRemoveTimerRef.current = null;
    }
  };

  const clearUndoToast = () => {
    clearUndoTimers();
    undoBindingRef.current = null;
    setUndoBinding(null);
    setUndoFading(false);
  };

  const showUndoToast = (binding: ContextBinding) => {
    clearUndoTimers();
    undoBindingRef.current = binding;
    setUndoFading(false);
    setUndoBinding(binding);
    setUndoNoticeId((id) => id + 1);
    undoFadeTimerRef.current = window.setTimeout(() => {
      setUndoFading(true);
      undoRemoveTimerRef.current = window.setTimeout(() => {
        setUndoBinding(null);
        undoBindingRef.current = null;
        setUndoFading(false);
        undoRemoveTimerRef.current = null;
      }, 400);
    }, 5000);
  };

  const handleUnbind = (bindingId: string) => {
    const removed = unbindContext(bindingId);
    if (!removed) return;
    showUndoToast(removed);
  };

  const handleUndoUnbind = () => {
    const binding = undoBindingRef.current ?? undoBinding;
    if (!binding) return;
    restoreContextBinding(binding);
    clearUndoToast();
  };

  useEffect(() => () => clearUndoToast(), []);

  useEffect(() => {
    if (!highlightedBindingId) return;
    const row = bindRowRefs.current.get(highlightedBindingId);
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const timer = window.setTimeout(() => setHighlightedBindingId(null), 2200);
    return () => window.clearTimeout(timer);
  }, [highlightedBindingId, filteredBindingRows.length]);

  const filteredAudit = useMemo(() => {
    const q = auditQuery.trim().toLowerCase();
    if (!q) return contextAuditLog;
    return contextAuditLog.filter(
      (a) =>
        a.detail.toLowerCase().includes(q) ||
        a.action.includes(q) ||
        userName(a.actorId).toLowerCase().includes(q)
    );
  }, [contextAuditLog, auditQuery]);

  const pendingItems = contextItems.filter((i) => i.status === "pending_approval");

  const detailBindings = useMemo(() => {
    if (!detailItem) return [];
    return contextBindings
      .filter((b) => b.contextItemId === detailItem.id)
      .map((b) => ({
        questionId: b.questionId,
        questionTitle: questions.find((q) => q.id === b.questionId)?.title ?? b.questionId,
      }));
  }, [detailItem, contextBindings, questions]);

  return (
    <>
      <div className="settings-section-head ctx-page-head">
        <h2>Context registry</h2>
      </div>

      <div className="ctx-page-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`ctx-page-tab${tab === t ? " active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "library" && "Library"}
            {t === "bindings" && "Bindings"}
            {t === "governance" && "Governance"}
            {t === "governance" && pendingCount > 0 && (
              <span className="ctx-tab-badge">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "library" && (
        <>
          <div className="panel ctx-library-panel">
            <div className="ctx-library-toolbar">
              <input
                type="search"
                placeholder="Search by name or team…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="ctx-search"
              />
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as ContextItemType | "all" | "app" | "notes")}>
                <option value="all">All types</option>
                <option value="document">Document</option>
                <option value="app">App context</option>
                <option value="notes">Notes</option>
                <option value="evidence">Evidence</option>
              </select>
              <button type="button" className="ctx-primary-btn" onClick={() => setAddModalOpen(true)}>
                Add context
              </button>
            </div>

            <div className="ctx-table-wrap">
              <table className="hist-table ctx-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Visibility</th>
                    <th>Team</th>
                    <th>Status</th>
                    <th>Bindings</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="ctx-empty-cell muted">
                        No context items match your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        className="ctx-row-clickable"
                        onClick={() => setDetailItem(item)}
                      >
                        <td className="ctx-name-cell">{item.title}</td>
                        <td><span className="ctx-type-badge">{typeLabel(item)}</span></td>
                        <td><VisibilityBadge value={item.visibility} /></td>
                        <td className="muted">{item.owningTeam}</td>
                        <td><span className={`ctx-status ctx-status-${item.status}`}>{item.status.replace("_", " ")}</span></td>
                        <td>{bindingCountForItem(item.id, contextBindings)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <button
              type="button"
              className="ctx-workflow-toggle"
              onClick={() => setWorkflowOpen((v) => !v)}
            >
              How context feeds forecasts {workflowOpen ? "▾" : "▸"}
            </button>
            {workflowOpen && (
              <div className="context-steps">
                {WORKFLOW.map((step, i) => (
                  <div key={step} className="context-step">
                    <div className="context-step-num">{i + 1}</div>
                    <div>
                      <h4>{step}</h4>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "bindings" && (
        <div className="panel ctx-bind-panel">
          <div className="panel-head">
            <span>Forecast bindings</span>
          </div>

          {undoBinding && (
            <div
              key={undoNoticeId}
              className={`ctx-bind-undo-toast${undoFading ? " fade-out" : ""}`}
            >
              <span>Binding removed</span>
              <button type="button" className="ctx-bind-undo-btn" onClick={handleUndoUnbind}>
                Undo
              </button>
              <button
                type="button"
                className="ctx-bind-undo-dismiss"
                aria-label="Dismiss"
                onClick={clearUndoToast}
              >
                ×
              </button>
            </div>
          )}

          <div className="ctx-bind-toolbar">
            <input
              type="search"
              className="ctx-search"
              placeholder="Search by context item, forecast, or notes…"
              value={bindingsSearch}
              onChange={(e) => setBindingsSearch(e.target.value)}
            />
          </div>

          <div className="ctx-bind-body">
            <div className="ctx-bind-table-head">
              <table className="hist-table ctx-bind-table">
                <colgroup>
                  <col className="ctx-bind-col-forecast" />
                  <col className="ctx-bind-col-item" />
                  <col className="ctx-bind-col-notes" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Forecast</th>
                    <th>Context item</th>
                    <th>Notes</th>
                  </tr>
                </thead>
              </table>
            </div>

            <div className="ctx-bind-scroll">
              <table className="hist-table ctx-bind-table">
                <colgroup>
                  <col className="ctx-bind-col-forecast" />
                  <col className="ctx-bind-col-item" />
                  <col className="ctx-bind-col-notes" />
                </colgroup>
                <tbody>
                  {filteredBindingRows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="ctx-empty-cell muted">
                        {bindingsSearch.trim() ? "No bindings match your search." : "No bindings yet."}
                      </td>
                    </tr>
                  ) : (
                    filteredBindingRows.map(({ binding, item, question }) => (
                      <tr
                        key={binding.id}
                        ref={(el) => {
                          if (el) bindRowRefs.current.set(binding.id, el);
                          else bindRowRefs.current.delete(binding.id);
                        }}
                        className={[
                          "ctx-bind-row",
                          highlightedBindingId === binding.id ? "ctx-bind-row-new" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <td>
                          <Link className="ctx-bind-cell-link" to={`/q/${binding.questionId}`}>
                            {question?.title ?? binding.questionId}
                          </Link>
                        </td>
                        <td>
                          {item ? (
                            <button type="button" className="ctx-bind-cell-link" onClick={() => setDetailItem(item)}>
                              {item.title}
                            </button>
                          ) : (
                            binding.contextItemId
                          )}
                        </td>
                        <td className="ctx-bind-notes-cell">
                          <span className="ctx-bind-notes-text">{binding.notes || "—"}</span>
                          <button
                            type="button"
                            className="ctx-bind-remove-btn"
                            aria-label="Remove binding"
                            onClick={() => handleUnbind(binding.id)}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="ctx-bind-create">
              <table className="hist-table ctx-bind-table">
                <colgroup>
                  <col className="ctx-bind-col-forecast" />
                  <col className="ctx-bind-col-item" />
                  <col className="ctx-bind-col-notes" />
                </colgroup>
                <tbody>
                  <tr className="ctx-bind-new-row">
                    <td>
                      <InlineCombobox
                        placeholder="Forecast"
                        options={forecastComboboxOptions}
                        value={newBindForecast}
                        selectedId={newBindForecastId}
                        onValueChange={(text) => {
                          setNewBindForecast(text);
                          const match = forecastComboboxOptions.find(
                            (o) => o.label.toLowerCase() === text.trim().toLowerCase()
                          );
                          setNewBindForecastId(match && !match.disabled ? match.id : "");
                        }}
                        onSelect={(option) => {
                          setNewBindForecast(option.label);
                          setNewBindForecastId(option.id);
                        }}
                      />
                    </td>
                    <td>
                      <InlineCombobox
                        placeholder="Context item"
                        options={contextItemComboboxOptions}
                        value={newBindItem}
                        selectedId={newBindItemId}
                        onValueChange={(text) => {
                          setNewBindItem(text);
                          const match = contextItemComboboxOptions.find(
                            (o) => o.label.toLowerCase() === text.trim().toLowerCase()
                          );
                          setNewBindItemId(match && !match.disabled ? match.id : "");
                        }}
                        onSelect={(option) => {
                          setNewBindItem(option.label);
                          setNewBindItemId(option.id);
                        }}
                      />
                    </td>
                    <td className="ctx-bind-create-action">
                      <input
                        type="text"
                        className="ctx-bind-notes-input"
                        placeholder="Notes"
                        value={newBindNotes}
                        onChange={(e) => setNewBindNotes(e.target.value)}
                      />
                      <button
                        type="button"
                        className="ctx-primary-btn ctx-bind-submit-btn"
                        disabled={!canCreateBinding}
                        onClick={handleCreateBinding}
                      >
                        Bind
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "governance" && (
        <>
          {canApproveContext() && pendingItems.length > 0 && (
            <div className="panel">
              <div className="panel-head">
                <span>Approval queue</span>
                <span className="muted">{pendingItems.length} pending</span>
              </div>
              <table className="hist-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Type</th>
                    <th>Visibility</th>
                    <th>Team</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pendingItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.title}</td>
                      <td>{typeLabel(item)}</td>
                      <td><VisibilityBadge value={item.visibility} /></td>
                      <td>{item.owningTeam}</td>
                      <td className="ctx-actions-cell">
                        <button type="button" className="ctx-primary-btn" onClick={() => approveContextItem(item.id)}>
                          Approve
                        </button>
                        <button type="button" className="ctx-secondary-btn" onClick={() => rejectContextItem(item.id)}>
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="panel">
            <div className="panel-head">
              <span>Audit log</span>
              <input
                type="search"
                className="ctx-search"
                placeholder="Filter audit…"
                value={auditQuery}
                onChange={(e) => setAuditQuery(e.target.value)}
              />
            </div>
            <table className="hist-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {filteredAudit.map((entry) => (
                  <tr key={entry.id}>
                    <td className="muted">{entry.timestamp.slice(0, 16).replace("T", " ")}</td>
                    <td>{userName(entry.actorId)}</td>
                    <td><span className="ctx-type-badge">{entry.action}</span></td>
                    <td>{entry.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <AddContextModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAddAppContext={(connector, data) => {
          addAppContext({
            connectorId: connector.id,
            title: data.title,
            body: data.body,
            sourceRef: data.sourceRef,
            visibility: data.visibility,
            tags: data.tags,
          });
        }}
        onImport={(names) => {
          const title = names.length === 1 ? names[0] : `${names.length} uploaded files`;
          addContextItem({ type: "document", title, fileNames: names, visibility: "team" });
        }}
        onNotes={(data) => addContextItem({ type: "manual", ...data })}
      />

      {detailItem && (
        <ContextItemDetail
          item={detailItem}
          bindings={detailBindings}
          revisions={revisionsFor(detailItem.id)}
          canEdit={canEditContext(detailItem)}
          onClose={() => setDetailItem(null)}
          onArchive={() => {
            archiveContextItem(detailItem.id);
            setDetailItem(null);
          }}
          onApprove={
            canApproveContext() && detailItem.status === "pending_approval"
              ? () => {
                  approveContextItem(detailItem.id);
                  setDetailItem(null);
                }
              : undefined
          }
          onReject={
            canApproveContext() && detailItem.status === "pending_approval"
              ? () => {
                  rejectContextItem(detailItem.id);
                  setDetailItem(null);
                }
              : undefined
          }
        />
      )}
    </>
  );
}
