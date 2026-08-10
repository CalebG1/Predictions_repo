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
import { Button } from "../../components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Card, CardContent } from "../../components/ui/card";

const TABS = ["library", "bindings", "governance"] as const;
type Tab = (typeof TABS)[number];

function typeLabel(item: ContextItem): string {
  if (item.connectorId && item.type === "manual") return "App context";
  if (item.type === "manual") return "Notes";
  if (item.type === "instruction") return "Notes";
  if (item.type === "analysis") return "Analysis";
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

  const userName = (id: string) =>
    users.find((u) => u.id === id)?.name ?? allUsers.find((u) => u.id === id)?.name ?? id;

  const pendingCount = useMemo(
    () => contextItems.filter((i) => i.status === "pending_approval").length,
    [contextItems],
  );

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contextItems.filter((item) => {
      if (typeFilter === "app" && !(item.type === "manual" && item.connectorId)) return false;
      if (
        typeFilter === "notes" &&
        !((item.type === "manual" && !item.connectorId) || item.type === "instruction")
      )
        return false;
      if (
        typeFilter !== "all" &&
        typeFilter !== "app" &&
        typeFilter !== "notes" &&
        item.type !== typeFilter
      )
        return false;
      if (q && !item.title.toLowerCase().includes(q) && !item.owningTeam.toLowerCase().includes(q))
        return false;
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
    [contextItems],
  );

  useEffect(() => {
    const q = bindingsSearch.trim().toLowerCase();
    if (!q) return;

    const matchingForecasts = questions.filter((question) =>
      question.title.toLowerCase().includes(q),
    );
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
          contextBindings.filter((b) => b.contextItemId === newBindItemId).map((b) => b.questionId),
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
            .map((b) => b.contextItemId),
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
      (b) => b.questionId === resolvedBindForecast.id && b.contextItemId === resolvedBindItem.id,
    );
  }, [contextBindings, resolvedBindForecast, resolvedBindItem]);

  const canCreateBinding = !!resolvedBindForecast && !!resolvedBindItem && !newBindingDuplicate;

  const handleCreateBinding = () => {
    if (!resolvedBindForecast || !resolvedBindItem || newBindingDuplicate) return;

    const bindingId = bindContext(
      resolvedBindForecast.id,
      resolvedBindItem.id,
      newBindNotes.trim() || undefined,
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
        userName(a.actorId).toLowerCase().includes(q),
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
      <div className="mb-2">
        <h2>Context registry</h2>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t}>
              {t === "library" && "Library"}
              {t === "bindings" && "Bindings"}
              {t === "governance" && "Governance"}
              {t === "governance" && pendingCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tab === "library" && (
        <>
          <Card className="border bg-card overflow-hidden">
            <CardContent>
              <div className="flex flex-wrap items-center gap-3 border-b px-5 py-4">
                <Input
                  type="search"
                  placeholder="Search by name or team…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-w-50 flex-1"
                />
                <Select
                  value={typeFilter}
                  onValueChange={(value) =>
                    setTypeFilter(value as ContextItemType | "all" | "app" | "notes")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="app">App context</SelectItem>
                    <SelectItem value="notes">Notes</SelectItem>
                    <SelectItem value="evidence">Evidence</SelectItem>
                    <SelectItem value="analysis">Analysis</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" onClick={() => setAddModalOpen(true)}>
                  Add context
                </Button>
              </div>

              <div className="overflow-x-auto">
                <Table className="">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Visibility</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Bindings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="p-8 text-center text-muted-foreground">
                          No context items match your filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredItems.map((item) => (
                        <TableRow
                          key={item.id}
                          className="cursor-pointer hover:bg-muted/60"
                          onClick={() => setDetailItem(item)}
                        >
                          <TableCell className="max-w-70 font-medium">{item.title}</TableCell>
                          <TableCell>
                            <span className="rounded bg-muted px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {typeLabel(item)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <VisibilityBadge value={item.visibility} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">{item.owningTeam}</TableCell>
                          <TableCell>
                            <span
                              className={
                                item.status === "active"
                                  ? "text-sm font-medium capitalize text-emerald-700"
                                  : item.status === "pending_approval"
                                    ? "text-sm font-medium capitalize text-amber-700"
                                    : item.status === "error"
                                      ? "text-sm font-medium capitalize text-destructive"
                                      : "text-sm font-medium capitalize text-muted-foreground"
                              }
                            >
                              {item.status.replace("_", " ")}
                            </span>
                          </TableCell>
                          <TableCell>{bindingCountForItem(item.id, contextBindings)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {tab === "bindings" && (
        <Card className="border bg-card relative flex flex-col">
          <CardContent>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <span>Forecast bindings</span>
            </div>

            {undoBinding && (
              <div
                key={undoNoticeId}
                className={`absolute left-1/2 top-2.5 z-10 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-foreground/95 px-3.5 py-2 text-sm text-primary-foreground shadow-lg ${undoFading ? "animate-out fade-out slide-out-to-top-2" : "animate-in fade-in slide-in-from-top-2"}`}
              >
                <span>Binding removed</span>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-primary-foreground"
                  onClick={handleUndoUnbind}
                >
                  Undo
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 text-primary-foreground/70 hover:text-primary-foreground"
                  aria-label="Dismiss"
                  onClick={clearUndoToast}
                >
                  ×
                </Button>
              </div>
            )}

            <div className="border-b px-4 py-3">
              <Input
                type="search"
                className="w-full"
                placeholder="Search by context item, forecast, or notes…"
                value={bindingsSearch}
                onChange={(e) => setBindingsSearch(e.target.value)}
              />
            </div>

            <div className="flex min-h-0 max-h-[min(480px,calc(100vh-300px))] flex-col">
              <div className="shrink-0 border-b bg-background">
                <Table className="table-fixed">
                  <colgroup>
                    <col className="w-[34%]" />
                    <col className="w-[34%]" />
                    <col className="w-[32%]" />
                  </colgroup>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Forecast</TableHead>
                      <TableHead>Context item</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                </Table>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-background">
                <Table className="table-fixed">
                  <colgroup>
                    <col className="w-[34%]" />
                    <col className="w-[34%]" />
                    <col className="w-[32%]" />
                  </colgroup>
                  <TableBody>
                    {filteredBindingRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="p-8 text-center text-muted-foreground">
                          {bindingsSearch.trim()
                            ? "No bindings match your search."
                            : "No bindings yet."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBindingRows.map(({ binding, item, question }) => (
                        <TableRow
                          key={binding.id}
                          ref={(el) => {
                            if (el) bindRowRefs.current.set(binding.id, el);
                            else bindRowRefs.current.delete(binding.id);
                          }}
                          className={[
                            "relative transition-colors hover:bg-muted/60",
                            highlightedBindingId === binding.id
                              ? "animate-pulse bg-emerald-50"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <TableCell>
                            <Link
                              className="text-left hover:underline"
                              to={`/q/${binding.questionId}`}
                            >
                              {question?.title ?? binding.questionId}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {item ? (
                              <Button
                                type="button"
                                variant="link"
                                className="h-auto p-0 text-left text-foreground hover:underline"
                                onClick={() => setDetailItem(item)}
                              >
                                {item.title}
                              </Button>
                            ) : (
                              binding.contextItemId
                            )}
                          </TableCell>
                          <TableCell className="relative pr-9">
                            <span className="text-sm text-muted-foreground">
                              {binding.notes || "—"}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-1/2 size-6 -translate-y-1/2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              aria-label="Remove binding"
                              onClick={() => handleUnbind(binding.id)}
                            >
                              ×
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="relative z-20 shrink-0 overflow-visible border-t-2 bg-muted/40">
                <Table className="table-fixed">
                  <colgroup>
                    <col className="w-[34%]" />
                    <col className="w-[34%]" />
                    <col className="w-[32%]" />
                  </colgroup>
                  <TableBody>
                    <TableRow className="bg-muted/40">
                      <TableCell>
                        <InlineCombobox
                          placeholder="Forecast"
                          options={forecastComboboxOptions}
                          value={newBindForecast}
                          selectedId={newBindForecastId}
                          onValueChange={(text) => {
                            setNewBindForecast(text);
                            const match = forecastComboboxOptions.find(
                              (o) => o.label.toLowerCase() === text.trim().toLowerCase(),
                            );
                            setNewBindForecastId(match && !match.disabled ? match.id : "");
                          }}
                          onSelect={(option) => {
                            setNewBindForecast(option.label);
                            setNewBindForecastId(option.id);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <InlineCombobox
                          placeholder="Context item"
                          options={contextItemComboboxOptions}
                          value={newBindItem}
                          selectedId={newBindItemId}
                          onValueChange={(text) => {
                            setNewBindItem(text);
                            const match = contextItemComboboxOptions.find(
                              (o) => o.label.toLowerCase() === text.trim().toLowerCase(),
                            );
                            setNewBindItemId(match && !match.disabled ? match.id : "");
                          }}
                          onSelect={(option) => {
                            setNewBindItem(option.label);
                            setNewBindItemId(option.id);
                          }}
                        />
                      </TableCell>
                      <TableCell className="flex items-center justify-end gap-2 pr-3">
                        <Input
                          type="text"
                          className="min-w-0 flex-1"
                          placeholder="Notes"
                          value={newBindNotes}
                          onChange={(e) => setNewBindNotes(e.target.value)}
                        />
                        <Button
                          type="button"
                          className="min-w-18 shadow-sm"
                          disabled={!canCreateBinding}
                          onClick={handleCreateBinding}
                        >
                          Bind
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "governance" && (
        <>
          {canApproveContext() && pendingItems.length > 0 && (
            <Card className="border bg-card">
              <CardContent>
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <span>Approval queue</span>
                  <span className="text-muted-foreground">{pendingItems.length} pending</span>
                </div>
                <Table className="">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Visibility</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.title}</TableCell>
                        <TableCell>{typeLabel(item)}</TableCell>
                        <TableCell>
                          <VisibilityBadge value={item.visibility} />
                        </TableCell>
                        <TableCell>{item.owningTeam}</TableCell>
                        <TableCell className="flex gap-2">
                          <Button type="button" onClick={() => approveContextItem(item.id)}>
                            Approve
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => rejectContextItem(item.id)}
                          >
                            Reject
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card className="border bg-card">
            <CardContent>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <span>Audit log</span>
                <Input
                  type="search"
                  className="flex-1"
                  placeholder="Filter audit…"
                  value={auditQuery}
                  onChange={(e) => setAuditQuery(e.target.value)}
                />
              </div>
              <Table className="">
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAudit.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-muted-foreground">
                        {entry.timestamp.slice(0, 16).replace("T", " ")}
                      </TableCell>
                      <TableCell>{userName(entry.actorId)}</TableCell>
                      <TableCell>
                        <span className="rounded bg-muted px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {entry.action}
                        </span>
                      </TableCell>
                      <TableCell>{entry.detail}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
          addContextItem({
            type: "document",
            title,
            fileNames: names,
            visibility: "team",
          });
        }}
        onNotes={(data) => addContextItem({ type: "manual", ...data })}
        onAddAnalysis={(data) =>
          addContextItem({
            type: "analysis",
            title: data.title,
            body: data.body,
            visibility: data.visibility,
            notebookCells: data.notebookCells,
            runtime: data.runtime,
          })
        }
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
