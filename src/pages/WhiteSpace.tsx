// White space: coverage map of the live forecast book + ranked candidates for
// material risks/opportunities that are not yet first-class forecasts.

import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import {
  bookQuestions,
  categoryOrder,
  coverageCells,
  type Materiality,
  type WhiteSpaceSource,
} from "../domain/whitespace";
import type { Category, RiskOrOpportunity } from "../domain/types";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

type SideFilter = RiskOrOpportunity | "all";
type SourceFilter = WhiteSpaceSource | "all";
type MaterialityFilter = Materiality | "all";
type CellFilter = { category: Category; riskOrOpportunity: RiskOrOpportunity } | null;

const SOURCE_LABELS: Record<WhiteSpaceSource, string> = {
  coverage_gap: "Coverage gap",
  competitor_move: "Competitor move",
  standards_checklist: "Standards checklist",
};

function sideBadgeVariant(side: RiskOrOpportunity): "destructive" | "default" {
  return side === "risk" ? "destructive" : "default";
}

function materialityLabel(m: Materiality): string {
  return m === "high" ? "High" : m === "medium" ? "Medium" : "Low";
}

export default function WhiteSpace() {
  const {
    questions,
    whiteSpaceRows,
    whiteSpaceRowsAll,
    promoteWhiteSpaceCandidate,
    watchWhiteSpaceCandidate,
    dismissWhiteSpaceCandidate,
    restoreWhiteSpaceCandidate,
  } = useStore();
  const navigate = useNavigate();

  const [side, setSide] = useState<SideFilter>("all");
  const [source, setSource] = useState<SourceFilter>("all");
  const [materiality, setMateriality] = useState<MaterialityFilter>("all");
  const [cellFilter, setCellFilter] = useState<CellFilter>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [dismissReason, setDismissReason] = useState("");

  const book = useMemo(() => bookQuestions(questions), [questions]);
  const cells = useMemo(() => coverageCells(questions), [questions]);

  const emptyCellCount = cells.filter((c) => c.count === 0).length;

  const baseRows = showArchived ? whiteSpaceRowsAll : whiteSpaceRows;

  const rows = useMemo(() => {
    return baseRows.filter(({ candidate, decision }) => {
      if (!showArchived && decision?.status === "promoted") return false;
      if (side !== "all" && candidate.riskOrOpportunity !== side) return false;
      if (source !== "all" && candidate.source !== source) return false;
      if (materiality !== "all" && candidate.materiality !== materiality) return false;
      if (
        cellFilter &&
        (candidate.category !== cellFilter.category ||
          candidate.riskOrOpportunity !== cellFilter.riskOrOpportunity)
      ) {
        return false;
      }
      if (showArchived) {
        // In archived mode, prefer dismissed/promoted; still allow watching.
        if (!decision) return false;
      }
      return true;
    });
  }, [baseRows, side, source, materiality, cellFilter, showArchived]);

  const activeCount = whiteSpaceRows.filter((r) => r.decision?.status !== "promoted").length;
  const watchingCount = whiteSpaceRowsAll.filter((r) => r.decision?.status === "watching").length;
  const dismissedCount = whiteSpaceRowsAll.filter((r) => r.decision?.status === "dismissed").length;
  const promotedCount = whiteSpaceRowsAll.filter((r) => r.decision?.status === "promoted").length;

  function toggleCell(category: Category, riskOrOpportunity: RiskOrOpportunity) {
    setCellFilter((prev) =>
      prev?.category === category && prev.riskOrOpportunity === riskOrOpportunity
        ? null
        : { category, riskOrOpportunity },
    );
  }

  function handleTrack(candidateId: string) {
    setPromotingId(candidateId);
  }

  function confirmTrack(candidateId: string) {
    const q = promoteWhiteSpaceCandidate(candidateId);
    setPromotingId(null);
    if (q) navigate(`/q/${q.id}`);
  }

  function handleDismiss(candidateId: string) {
    setDismissingId(candidateId);
    setDismissReason("");
  }

  function confirmDismiss(candidateId: string) {
    dismissWhiteSpaceCandidate(candidateId, dismissReason);
    setDismissingId(null);
    setDismissReason("");
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-7xl flex-col px-5 py-6">
      <div className="shrink-0 space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">White space</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Material risks and opportunities not yet in your forecast book. Promote a candidate to
            track it as a live forecast, or dismiss it so it stops nagging.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>
            <strong className="text-foreground">{activeCount}</strong> open gaps
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="text-foreground">{emptyCellCount}</strong> empty coverage cells
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="text-foreground">{watchingCount}</strong> watching
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="text-foreground">{promotedCount}</strong> tracked
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="text-foreground">{dismissedCount}</strong> dismissed
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Book size <strong className="text-foreground">{book.length}</strong>
          </span>
        </div>

        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-sm font-semibold">Coverage map</CardTitle>
            <p className="text-xs text-muted-foreground">
              Open questions by category × side. Click a cell to filter candidates. Empty cells are
              flagged.
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto pt-3">
            <table className="w-full min-w-[28rem] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-1.5 pr-3 font-medium">Category</th>
                  <th className="px-2 py-1.5 font-medium">Risk</th>
                  <th className="px-2 py-1.5 font-medium">Opportunity</th>
                </tr>
              </thead>
              <tbody>
                {categoryOrder.map((category) => {
                  const risk = cells.find(
                    (c) => c.category === category && c.riskOrOpportunity === "risk",
                  );
                  const opp = cells.find(
                    (c) => c.category === category && c.riskOrOpportunity === "opportunity",
                  );
                  return (
                    <tr key={category} className="border-t border-border/60">
                      <td className="py-1.5 pr-3 text-xs font-medium">{category}</td>
                      {(["risk", "opportunity"] as const).map((s) => {
                        const cell = s === "risk" ? risk : opp;
                        const count = cell?.count ?? 0;
                        const active =
                          cellFilter?.category === category &&
                          cellFilter.riskOrOpportunity === s;
                        const empty = count === 0;
                        return (
                          <td key={s} className="px-2 py-1.5">
                            <button
                              type="button"
                              onClick={() => toggleCell(category, s)}
                              className={`inline-flex min-w-10 items-center justify-center rounded-md px-2 py-1 text-xs font-semibold tabular-nums transition-colors ${
                                active
                                  ? "bg-primary text-primary-foreground"
                                  : empty
                                    ? "bg-destructive/10 text-destructive ring-1 ring-destructive/30 hover:bg-destructive/15"
                                    : "bg-muted text-foreground hover:bg-muted/80"
                              }`}
                              aria-pressed={active}
                              aria-label={`${category} ${s}: ${count}${empty ? " (empty)" : ""}`}
                            >
                              {count}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {cellFilter && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">
                  Filtering candidates for{" "}
                  <strong className="text-foreground">
                    {cellFilter.category} × {cellFilter.riskOrOpportunity}
                  </strong>
                </span>
                <Button type="button" size="xs" variant="ghost" onClick={() => setCellFilter(null)}>
                  Clear
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-wrap items-center gap-3">
            <label className="grid gap-1 text-xs font-medium">
              <span className="text-muted-foreground">Side</span>
              <Select
                value={side}
                onValueChange={(v) => setSide((v as SideFilter) ?? "all")}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="risk">Risk</SelectItem>
                  <SelectItem value="opportunity">Opportunity</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label className="grid gap-1 text-xs font-medium">
              <span className="text-muted-foreground">Source</span>
              <Select
                value={source}
                onValueChange={(v) => setSource((v as SourceFilter) ?? "all")}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="coverage_gap">Coverage gap</SelectItem>
                  <SelectItem value="competitor_move">Competitor move</SelectItem>
                  <SelectItem value="standards_checklist">Standards checklist</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label className="grid gap-1 text-xs font-medium">
              <span className="text-muted-foreground">Materiality</span>
              <Select
                value={materiality}
                onValueChange={(v) => setMateriality((v as MaterialityFilter) ?? "all")}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label className="ml-auto flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                className="size-3.5 accent-primary"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />
              Show dismissed / tracked
            </label>
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 min-h-0 flex-1 space-y-3 pb-8">
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {showArchived
              ? "No dismissed or tracked candidates yet."
              : "No open white-space candidates match the current filters."}
          </p>
        )}

        {rows.map(({ candidate, decision }) => {
          const isPromoted = decision?.status === "promoted";
          const isWatching = decision?.status === "watching";
          const isDismissed = decision?.status === "dismissed";
          const confirming = promotingId === candidate.id;
          const dismissing = dismissingId === candidate.id;

          return (
            <Card key={candidate.id} size="sm">
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={sideBadgeVariant(candidate.riskOrOpportunity)}>
                        {candidate.riskOrOpportunity === "risk" ? "Risk" : "Opportunity"}
                      </Badge>
                      <Badge variant="outline">{candidate.category}</Badge>
                      <Badge variant="secondary">
                        {materialityLabel(candidate.materiality)} materiality
                      </Badge>
                      <Badge variant="outline">{SOURCE_LABELS[candidate.source]}</Badge>
                      {isWatching && <Badge variant="secondary">Watching</Badge>}
                      {isPromoted && <Badge>Tracked</Badge>}
                      {isDismissed && <Badge variant="outline">Dismissed</Badge>}
                    </div>
                    <h2 className="text-base font-semibold leading-snug">{candidate.title}</h2>
                    <p className="text-xs font-medium text-muted-foreground">
                      {candidate.sourceLabel}
                    </p>
                    <p className="text-sm text-muted-foreground">{candidate.whyItMatters}</p>
                    {isDismissed && decision?.dismissReason && (
                      <p className="text-xs text-muted-foreground">
                        Dismiss reason: {decision.dismissReason}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                    {isPromoted && decision?.questionId ? (
                      <Button
                        type="button"
                        size="sm"
                        render={<Link to={`/q/${decision.questionId}`} />}
                      >
                        Open forecast
                      </Button>
                    ) : isDismissed ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => restoreWhiteSpaceCandidate(candidate.id)}
                      >
                        Restore
                      </Button>
                    ) : confirming ? (
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" onClick={() => confirmTrack(candidate.id)}>
                          Confirm track
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setPromotingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : dismissing ? (
                      <div className="grid w-56 gap-2">
                        <input
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                          placeholder="Reason (optional)"
                          value={dismissReason}
                          onChange={(e) => setDismissReason(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => confirmDismiss(candidate.id)}
                          >
                            Dismiss
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setDismissingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" onClick={() => handleTrack(candidate.id)}>
                          Track
                        </Button>
                        {!isWatching && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => watchWhiteSpaceCandidate(candidate.id)}
                          >
                            Watch
                          </Button>
                        )}
                        {isWatching && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => restoreWhiteSpaceCandidate(candidate.id)}
                          >
                            Unwatch
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDismiss(candidate.id)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
