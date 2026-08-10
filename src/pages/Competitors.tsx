// Competitors tab: Kalshi-style market cards grouped by company, with a
// top-movers sidebar. Click a company header to open its profile; click a
// card (or its probability pill) to open the forecast.

import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { probabilityDelta, useStore } from "../store";
import {
  competitors,
  competitorForQuestion,
  moveForQuestion,
  moveCategoryOrder,
  type Competitor,
  type CompetitorMove,
  type MoveCategory,
} from "../domain/competitors";
import { CompetitorAvatar, NewMovesModal, newlyIdentifiedCount } from "../components/competitors";
import { IconFilter, IconSearch, IconSort } from "../components/icons";
import { pct, signedPct } from "../components/ui";
import type { ForecastQuestion } from "../domain/types";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

type SortKey = "probability" | "movers" | "resolving_soon" | "most_uncertain";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "probability", label: "Most likely" },
  { key: "movers", label: "Largest changes this week" },
  { key: "resolving_soon", label: "Resolving soon" },
  { key: "most_uncertain", label: "Most uncertain" },
];

interface Row {
  question: ForecastQuestion;
  competitor: Competitor;
  move: CompetitorMove;
  probability: number;
  delta7: number | null;
}

function ForecastCard({ row }: { row: Row }) {
  const navigate = useNavigate();
  const delta = row.delta7 ?? 0;
  const barWidth = Math.max(4, Math.round(row.probability * 100));

  return (
    <Card
      className="cursor-pointer text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/q/${row.question.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/q/${row.question.id}`);
        }
      }}
    >
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
          <CompetitorAvatar competitor={row.competitor} />
          <span>{row.move.moveCategory}</span>
          {row.move.newlyIdentified && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">New</span>
          )}
        </div>

        <h3 className="line-clamp-2 min-h-10 text-base font-semibold leading-5">
          {row.question.title}
        </h3>

        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <span className="block text-xs text-muted-foreground">{row.move.expectedHorizon}</span>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
          <span
            className={`text-xs font-semibold ${delta >= 0 ? "text-emerald-600" : "text-destructive"}`}
          >
            {signedPct(row.delta7)}% 7d
          </span>
          <Button
            type="button"
            size="sm"
            className="font-bold"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/q/${row.question.id}`);
            }}
          >
            {pct(row.probability)}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3 border-t pt-3 text-xs text-muted-foreground">
          <span>Resolves {row.question.resolutionDate}</span>
          <Link
            to={`/competitors/${row.competitor.id}`}
            className="font-medium text-primary hover:underline"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {row.competitor.name} →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function MoverRow({ row }: { row: Row }) {
  const delta = row.delta7 ?? 0;
  const up = delta >= 0;
  return (
    <Link
      to={`/q/${row.question.id}`}
      className="flex items-center justify-between gap-3 py-3 first:pt-0 hover:text-primary"
    >
      <div className="min-w-0">
        <span className="block truncate text-sm font-medium">{row.question.title}</span>
        <span className="block text-xs text-muted-foreground">{row.competitor.name}</span>
      </div>
      <div className="shrink-0 text-right">
        <span className="block text-sm font-semibold">{pct(row.probability)}</span>
        <span className={`text-xs font-semibold ${up ? "text-emerald-600" : "text-destructive"}`}>
          {up ? "▲" : "▼"} {Math.abs(Math.round(delta * 100))}
        </span>
      </div>
    </Link>
  );
}

export default function Competitors() {
  const { questions, yesOutcome, historyFor } = useStore();
  const [search, setSearch] = useState("");
  const [company, setCompany] = useState<string>("all");
  const [moveCat, setMoveCat] = useState<MoveCategory | "all">("all");
  const [sort, setSort] = useState<SortKey>("probability");
  const [newMovesOpen, setNewMovesOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const allRows = useMemo(() => {
    const rows: Row[] = [];
    for (const q of questions) {
      const competitor = competitorForQuestion(q.id);
      const move = moveForQuestion(q.id);
      if (!competitor || !move) continue;
      const yes = yesOutcome(q.id);
      if (!yes) continue;
      rows.push({
        question: q,
        competitor,
        move,
        probability: yes.currentProbability,
        delta7: probabilityDelta(historyFor(yes.id), 7),
      });
    }
    return rows;
  }, [questions, yesOutcome, historyFor]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    let list = allRows.filter((r) => {
      if (
        query &&
        !r.question.title.toLowerCase().includes(query) &&
        !r.competitor.name.toLowerCase().includes(query)
      ) {
        return false;
      }
      if (company !== "all" && r.competitor.id !== company) return false;
      if (moveCat !== "all" && r.move.moveCategory !== moveCat) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      switch (sort) {
        case "probability":
          return b.probability - a.probability;
        case "movers":
          return Math.abs(b.delta7 ?? 0) - Math.abs(a.delta7 ?? 0);
        case "resolving_soon":
          return a.question.resolutionDate.localeCompare(b.question.resolutionDate);
        case "most_uncertain":
          return Math.abs(0.5 - a.probability) - Math.abs(0.5 - b.probability);
      }
    });
  }, [allRows, search, company, moveCat, sort]);

  const sections = useMemo(() => {
    const byId = new Map<string, Row[]>();
    for (const r of rows) {
      const list = byId.get(r.competitor.id) ?? [];
      list.push(r);
      byId.set(r.competitor.id, list);
    }
    // Preserve the seed competitor order; drop companies with no matching rows.
    return competitors
      .filter((c) => byId.has(c.id))
      .map((c) => ({ competitor: c, rows: byId.get(c.id)! }));
  }, [rows]);

  const topMovers = useMemo(
    () =>
      [...allRows]
        .filter((r) => r.delta7 != null && Math.abs(r.delta7) > 0)
        .sort((a, b) => Math.abs(b.delta7 ?? 0) - Math.abs(a.delta7 ?? 0))
        .slice(0, 6),
    [allRows],
  );

  const trending = useMemo(
    () => [...allRows].sort((a, b) => b.probability - a.probability).slice(0, 5),
    [allRows],
  );

  const newCount = useMemo(() => newlyIdentifiedCount(questions), [questions]);
  const filtersActive = company !== "all" || moveCat !== "all";
  const sortLabel = SORTS.find((s) => s.key === sort)?.label;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1240px] flex-col px-5 py-6">
      <div className="shrink-0 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Competitors</h1>
          </div>
          <Button type="button" size="lg" onClick={() => setNewMovesOpen(true)}>
            <span aria-hidden="true">✦</span>
            Newly identified moves
            {newCount > 0 && (
              <span className="rounded-full bg-primary-foreground/20 px-1.5 text-xs">
                {newCount}
              </span>
            )}
          </Button>
        </div>

        <NewMovesModal
          open={newMovesOpen}
          onClose={() => setNewMovesOpen(false)}
          questions={questions}
          yesOutcome={yesOutcome}
        />

        <Card>
          <CardContent className="flex flex-wrap items-center gap-3">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-md border bg-background px-3 py-2">
              <span className="text-muted-foreground" aria-hidden="true">
                <IconSearch />
              </span>
              <Input
                className="min-w-0 flex-1 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search competitor forecasts…"
                aria-label="Search competitor forecasts"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className={filtersActive ? "border-primary bg-primary/10 text-primary" : ""}
                    >
                      <IconFilter />
                      Filter
                    </Button>
                  }
                  aria-expanded={filterOpen}
                  onClick={() => setSortOpen(false)}
                />
                <PopoverContent className="grid w-64 gap-3" align="end" aria-label="Filters">
                  <label className="grid gap-1 text-sm font-medium">
                    <span className="text-muted-foreground">Company</span>
                    <Select value={company} onValueChange={(value) => setCompany(value ?? "all")}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All companies</SelectItem>
                        {competitors.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="grid gap-1 text-sm font-medium">
                    <span className="text-muted-foreground">Move type</span>
                    <Select
                      value={moveCat}
                      onValueChange={(value) =>
                        setMoveCat((value ?? "all") as MoveCategory | "all")
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All move types</SelectItem>
                        {moveCategoryOrder.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                </PopoverContent>
              </Popover>

              <Popover open={sortOpen} onOpenChange={setSortOpen}>
                <PopoverTrigger
                  render={
                    <Button type="button" variant="outline">
                      <IconSort />
                      Sort
                    </Button>
                  }
                  aria-expanded={sortOpen}
                  onClick={() => setFilterOpen(false)}
                />
                {sort !== "probability" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs">
                    {sortLabel}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground"
                      aria-label={`Clear sort: ${sortLabel}`}
                      onClick={() => setSort("probability")}
                    >
                      ×
                    </Button>
                  </span>
                )}
                <PopoverContent
                  className="grid w-56 gap-1 p-1"
                  align="end"
                  role="listbox"
                  aria-label="Sort options"
                >
                  {SORTS.map((s) => (
                    <Button
                      key={s.key}
                      type="button"
                      role="option"
                      aria-selected={sort === s.key}
                      variant="ghost"
                      size="sm"
                      className={`justify-start ${sort === s.key ? "bg-muted font-medium" : ""}`}
                      onClick={() => {
                        setSort(s.key);
                        setSortOpen(false);
                      }}
                    >
                      {s.label}
                    </Button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-1 mt-5 min-h-0 flex-1 overflow-auto pb-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-8">
            {sections.map(({ competitor, rows: sectionRows }) => (
              <section key={competitor.id} className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <Link
                    to={`/competitors/${competitor.id}`}
                    className="inline-flex items-center gap-2 hover:text-primary"
                  >
                    <CompetitorAvatar competitor={competitor} />
                    <h2>{competitor.name}</h2>
                    <span className="text-muted-foreground" aria-hidden="true">
                      ›
                    </span>
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {sectionRows.length} forecast{sectionRows.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {sectionRows.map((r) => (
                    <ForecastCard key={r.question.id} row={r} />
                  ))}
                </div>
              </section>
            ))}
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No forecasts match the current filters.
              </p>
            )}
          </div>

          <aside className="space-y-5">
            <Card>
              <CardContent>
                <Link
                  to="/competitors"
                  className="mb-3 flex items-center justify-between text-sm font-semibold hover:text-primary"
                  onClick={() => setSort("movers")}
                >
                  <span>Top movers</span>
                  <span aria-hidden="true">›</span>
                </Link>
                <div className="divide-y">
                  {topMovers.map((r) => (
                    <MoverRow key={r.question.id} row={r} />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="mb-3 flex items-center justify-between text-sm font-semibold">
                  <span>Most likely</span>
                </div>
                <div className="divide-y">
                  {trending.map((r) => (
                    <MoverRow key={r.question.id} row={r} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
