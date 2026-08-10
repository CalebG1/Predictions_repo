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
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Card, CardContent } from "./ui/card";

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
      <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-[5px]">
        <BrandIcon kind={evidence.app.app} width={14} height={14} />
      </span>
    );
  }
  return null;
}

function AppMessageBody({ evidence }: { evidence: EvidenceSource }) {
  const app = evidence.app!;
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="inline-flex size-7 items-center justify-center rounded-md bg-muted">
          <BrandIcon kind={app.app} width={16} height={16} />
        </span>
        <div>
          <span className="block text-sm font-bold">{app.channel}</span>
          <span className="block text-xs text-muted-foreground">
            {app.app === "teams" ? "Microsoft Teams" : "Slack"}
          </span>
        </div>
      </div>
      <div className="rounded-lg bg-muted p-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold">
          <span
            className="inline-flex size-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary"
            aria-hidden="true"
          >
            {app.author
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)}
          </span>
          <span>{app.author}</span>
          <span className="text-muted-foreground small">{app.authorRole}</span>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{app.message}</p>
      </div>
    </div>
  );
}

function AnalysisBody({ evidence }: { evidence: EvidenceSource }) {
  const a = evidence.analysis!;
  return (
    <div>
      <p className="mb-2.5 text-sm leading-6 text-muted-foreground">{a.narrative}</p>
      <div className="overflow-hidden rounded-lg border">
        <div className="border-b bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          <span>{a.language}</span>
        </div>
        <pre className="overflow-x-auto p-3 font-mono text-xs leading-5">{a.code}</pre>
      </div>
      <div className="mt-2.5 overflow-hidden rounded-lg border">
        <span className="block bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          Output
        </span>
        <pre className="overflow-x-auto bg-muted/40 p-3 font-mono text-xs leading-5">
          {a.output}
        </pre>
      </div>
    </div>
  );
}

function WebsiteBody({ evidence }: { evidence: EvidenceSource }) {
  const w = evidence.website!;
  return (
    <a
      className="block rounded-lg border p-3 text-foreground transition-colors hover:bg-muted/60"
      href={w.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span
          className="inline-flex size-5 items-center justify-center rounded bg-muted font-semibold"
          aria-hidden="true"
        >
          {w.publisher.slice(0, 1)}
        </span>
        <span className="font-medium">{w.domain}</span>
        <IconExternalLink />
      </div>
      <div className="mt-2 font-semibold">{w.headline}</div>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{w.snippet}</p>
    </a>
  );
}

function PredictionBody({ evidence }: { evidence: EvidenceSource }) {
  const p = evidence.prediction!;
  return (
    <div className="rounded-lg border bg-muted p-3.5">
      <div className="mb-1.5 flex items-baseline justify-between gap-2.5 text-sm font-semibold">
        <span>{p.agent}</span>
        <b className="text-lg text-foreground">{pct(p.probability)}</b>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{p.summary}</p>
    </div>
  );
}

function EvidenceDetailModal({
  evidence,
  onClose,
}: {
  evidence: EvidenceSource;
  onClose: () => void;
}) {
  const relevance = evidence.relevance ?? "medium";
  const frequency = evidence.refreshFrequency ?? "default";
  const kind = evidence.kind ?? "feed";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogTitle className="sr-only">{evidence.title}</DialogTitle>
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
              {kindBadge(evidence)}
            </span>
            <h3>{evidence.title}</h3>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            ×
          </Button>
        </header>

        <div className="space-y-5">
          {kind === "app_message" && evidence.app && <AppMessageBody evidence={evidence} />}
          {kind === "analysis" && evidence.analysis && <AnalysisBody evidence={evidence} />}
          {kind === "website" && evidence.website && <WebsiteBody evidence={evidence} />}
          {kind === "prediction" && evidence.prediction && <PredictionBody evidence={evidence} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Published</span>
              <span>{fmtDate(evidence.retrievedAt)}</span>
            </div>
            <div className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Credibility</span>
              <span>{pct(evidence.credibilityScore)}</span>
            </div>
            <div className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Relevance</span>
              <span className="w-fit rounded-full bg-muted px-2 py-1 text-xs font-medium">
                {RELEVANCE_LABELS[relevance]}
              </span>
            </div>
            <div className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Refresh schedule</span>
              <span>{FREQUENCY_LABELS[frequency]}</span>
            </div>
            {evidence.methodTag && kind === "feed" && (
              <div className="grid gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">Method</span>
                <span>{evidence.methodTag}</span>
              </div>
            )}
            {evidence.geographyTag && (
              <div className="grid gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">Geography</span>
                <span>{evidence.geographyTag}</span>
              </div>
            )}
          </div>

          {evidence.indicates && (
            <div className="border-t border-dashed pt-4">
              <span className="text-xs font-medium text-muted-foreground">What this indicates</span>
              <p>{evidence.indicates}</p>
            </div>
          )}

          {evidence.disconfirming && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              ⚖︎ Deliberately sourced to challenge the lead view, to guard against one-sided evidence
              gathering.
            </p>
          )}

          {(evidence.url || evidence.website?.url) && kind !== "website" && (
            <a
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              href={evidence.url ?? evidence.website?.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open source
              <IconExternalLink />
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
    [bindingsFor, questionId],
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
    <Card className="border bg-card">
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <h4 className="mr-auto">Evidence</h4>
          <span className="mr-1 text-xs text-muted-foreground">
            {evidence.length === 0
              ? "No evidence sources yet"
              : `${evidence.length} source${evidence.length === 1 ? "" : "s"} · click a row for details`}
          </span>
          <Button
            type="button"
            className="inline-flex items-center gap-1.5"
            onClick={() => setAddOpen(true)}
          >
            <IconPlus />
            Add evidence
          </Button>
        </div>

        {evidence.length === 0 ? (
          <p className="text-sm text-muted-foreground">No evidence sources added yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead>Relevance</TableHead>
                  <TableHead>Refresh</TableHead>
                  <TableHead aria-label="Actions" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {evidence.map((e) => {
                  const relevance = e.relevance ?? "medium";
                  const frequency = e.refreshFrequency ?? "default";
                  const isRefreshing = refreshingId === e.id;
                  return (
                    <TableRow
                      key={e.id}
                      className="cursor-pointer transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-2px]"
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
                      <TableCell className="min-w-55 max-w-90">
                        <div className="flex items-center gap-1.5">
                          {sourceIcon(e)}
                          <span className="overflow-hidden text-ellipsis whitespace-nowrap font-semibold">
                            {e.title}
                          </span>
                          {e.disconfirming && (
                            <span className="" title="Deliberately disconfirming">
                              ⚖︎
                            </span>
                          )}
                          {(e.url || e.website?.url) && (
                            <a
                              href={e.url ?? e.website?.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex shrink-0 text-muted-foreground hover:text-primary"
                              onClick={stop}
                              aria-label="Open source in new tab"
                              title="Open source"
                            >
                              <IconExternalLink />
                            </a>
                          )}
                        </div>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {sourceSubtitle(e)}
                        </span>
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {fmtDate(e.retrievedAt)}
                      </TableCell>

                      <TableCell className="whitespace-nowrap" onClick={stop}>
                        <Select
                          value={relevance}
                          onValueChange={(value) =>
                            value &&
                            setEvidenceRelevance(questionId, e.id, value as EvidenceRelevance)
                          }
                        >
                          <SelectTrigger
                            className={
                              relevance === "high"
                                ? "h-7 w-24 rounded-full border-0 bg-emerald-100 px-2 text-xs font-bold text-emerald-700"
                                : relevance === "low"
                                  ? "h-7 w-24 rounded-full border-0 bg-red-100 px-2 text-xs font-bold text-red-700"
                                  : "h-7 w-24 rounded-full border-0 bg-amber-100 px-2 text-xs font-bold text-amber-700"
                            }
                            aria-label={`Relevance for ${e.title}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell className="whitespace-nowrap" onClick={stop}>
                        <div className="flex items-center gap-1.5">
                          <Select
                            value={frequency}
                            onValueChange={(value) =>
                              value &&
                              setEvidenceRefreshFrequency(
                                questionId,
                                e.id,
                                value as EvidenceRefreshFrequency,
                              )
                            }
                          >
                            <SelectTrigger
                              className="h-7 w-24 text-xs"
                              aria-label={`Refresh frequency for ${e.title}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(["default", "hourly", "daily", "weekly", "monthly"] as const).map(
                                (option) => (
                                  <SelectItem key={option} value={option}>
                                    {option.charAt(0).toUpperCase() + option.slice(1)}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            className={`size-7 border bg-background p-1 text-muted-foreground hover:border-primary hover:text-primary ${isRefreshing ? "animate-spin" : ""}`}
                            onClick={() => doRefresh(e.id)}
                            disabled={isRefreshing}
                            aria-label={`Refresh ${e.title} now`}
                            title="Refresh now"
                          >
                            <IconRefresh />
                          </Button>
                        </div>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {fmtRelative(e.lastRefreshedAt)}
                        </span>
                      </TableCell>

                      <TableCell className="text-right" onClick={stop}>
                        <Button
                          type="button"
                          className="size-7 border bg-background p-1 text-muted-foreground hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => deleteEvidenceRow(questionId, e.id)}
                          aria-label={`Delete ${e.title}`}
                          title="Delete"
                        >
                          <IconTrash />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
              questionId,
            );
          }}
          onImport={(fileNames) => addUpload(questionId, fileNames)}
          onNotes={(data) => {
            const item = addContextItem({ type: "manual", ...data });
            bindContext(questionId, item.id);
          }}
          onBindFromLibrary={(itemId) => bindContext(questionId, itemId)}
        />
      </CardContent>
    </Card>
  );
}
