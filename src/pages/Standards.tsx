// Standards tab: the standardized commitments a selected company reports
// against each quarter — ~50 per company (20 universal core + 30
// vertical-specific), instantiated from src/data/questions.json. Company-
// scoped: executives pick their company and work that set alone.

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { probabilityDelta, useStore } from "../store";
import {
  commitmentForQuestion,
  commitmentThemeOrder,
  standardsCompanies,
  standardsCompanyById,
  standardsCompanyForQuestion,
  verticalLabels,
  type CommitmentScope,
  type CommitmentTheme,
  type StandardCommitment,
  type StandardsCompany,
} from "../domain/standards";
import { CompetitorAvatar } from "../components/competitors";
import { ForecastCard, MoverRow } from "../components/forecast-card";
import { IconFilter, IconSearch, IconSort } from "../components/icons";
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

const DEFAULT_COMPANY_ID = standardsCompanies[0]?.id ?? "jpmorgan";

interface Row {
  question: ForecastQuestion;
  company: StandardsCompany;
  commitment: StandardCommitment;
  probability: number;
  delta7: number | null;
}

function StandardCard({ row }: { row: Row }) {
  return (
    <ForecastCard
      question={row.question}
      probability={row.probability}
      delta7={row.delta7}
      entity={row.company}
      chipLabel={row.commitment.theme}
      badge={row.commitment.scope === "universal" ? "Universal" : undefined}
      horizonText={row.commitment.horizon}
      footerTo={`/standards?company=${row.company.id}`}
      footerLabel={`${row.company.name} →`}
    />
  );
}

export default function Standards() {
  const { questions, yesOutcome, historyFor } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState(DEFAULT_COMPANY_ID);
  const [scope, setScope] = useState<CommitmentScope | "all">("all");
  const [theme, setTheme] = useState<CommitmentTheme | "all">("all");
  const [sort, setSort] = useState<SortKey>("probability");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  // Deep-link / persist the selected company via ?company=<id>.
  useEffect(() => {
    const param = searchParams.get("company");
    if (param && standardsCompanyById(param)) {
      setCompanyId(param);
    } else if (!param) {
      setSearchParams({ company: DEFAULT_COMPANY_ID }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const selectedCompany = standardsCompanyById(companyId) ?? standardsCompanies[0];

  const selectCompany = (id: string) => {
    if (!standardsCompanyById(id)) return;
    setCompanyId(id);
    setSearchParams({ company: id }, { replace: true });
  };

  const companyRows = useMemo(() => {
    if (!selectedCompany) return [] as Row[];
    const rows: Row[] = [];
    for (const q of questions) {
      const companyMatch = standardsCompanyForQuestion(q.id);
      const commitment = commitmentForQuestion(q.id);
      if (!companyMatch || !commitment) continue;
      if (companyMatch.id !== selectedCompany.id) continue;
      const yes = yesOutcome(q.id);
      if (!yes) continue;
      rows.push({
        question: q,
        company: companyMatch,
        commitment,
        probability: yes.currentProbability,
        delta7: probabilityDelta(historyFor(yes.id), 7),
      });
    }
    return rows;
  }, [questions, yesOutcome, historyFor, selectedCompany]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = companyRows.filter((r) => {
      if (query && !r.question.title.toLowerCase().includes(query)) return false;
      if (scope !== "all" && r.commitment.scope !== scope) return false;
      if (theme !== "all" && r.commitment.theme !== theme) return false;
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
  }, [companyRows, search, scope, theme, sort]);

  const topMovers = useMemo(
    () =>
      [...companyRows]
        .filter((r) => r.delta7 != null && Math.abs(r.delta7) > 0)
        .sort((a, b) => Math.abs(b.delta7 ?? 0) - Math.abs(a.delta7 ?? 0))
        .slice(0, 6),
    [companyRows],
  );

  const trending = useMemo(
    () => [...companyRows].sort((a, b) => b.probability - a.probability).slice(0, 5),
    [companyRows],
  );

  const filtersActive = scope !== "all" || theme !== "all";
  const sortLabel = SORTS.find((s) => s.key === sort)?.label;

  if (!selectedCompany) {
    return (
      <div className="mx-auto w-full max-w-[1240px] px-5 py-6">
        <p className="text-sm text-muted-foreground">No standards companies configured.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1240px] flex-col px-5 py-6">
      <div className="shrink-0 space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Standards</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            The standardized commitments this company reports against every quarter: earnings
            guidance, performance targets, and risks mitigated. 20 universal core questions plus
            30 vertical-specific ones.
          </p>
        </div>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Company">
          {standardsCompanies.map((c) => {
            const active = c.id === selectedCompany.id;
            return (
              <Button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={active}
                variant={active ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={() => selectCompany(c.id)}
              >
                <CompetitorAvatar competitor={c} />
                <span className="truncate">{c.name}</span>
              </Button>
            );
          })}
        </div>

        <Card>
          <CardContent className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
              <CompetitorAvatar competitor={selectedCompany} size="lg" />
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold">{selectedCompany.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {verticalLabels[selectedCompany.verticalId]} · {companyRows.length} commitments
                </p>
              </div>
            </div>

            <label className="flex min-w-0 flex-[1_1_14rem] items-center gap-2 rounded-md border bg-background px-3 py-2">
              <span className="text-muted-foreground" aria-hidden="true">
                <IconSearch />
              </span>
              <Input
                className="min-w-0 flex-1 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search this company's commitments…"
                aria-label="Search this company's commitments"
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
                    <span className="text-muted-foreground">Scope</span>
                    <Select
                      value={scope}
                      onValueChange={(value) =>
                        setScope((value ?? "all") as CommitmentScope | "all")
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Universal + vertical</SelectItem>
                        <SelectItem value="universal">Universal core</SelectItem>
                        <SelectItem value="vertical">Vertical-specific</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="grid gap-1 text-sm font-medium">
                    <span className="text-muted-foreground">Theme</span>
                    <Select
                      value={theme}
                      onValueChange={(value) =>
                        setTheme((value ?? "all") as CommitmentTheme | "all")
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All themes</SelectItem>
                        {commitmentThemeOrder.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
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
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((r) => (
                <StandardCard key={r.question.id} row={r} />
              ))}
            </div>
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No commitments match the current filters.
              </p>
            )}
          </div>

          <aside className="space-y-5">
            <Card>
              <CardContent>
                <button
                  type="button"
                  className="mb-3 flex w-full items-center justify-between text-sm font-semibold hover:text-primary"
                  onClick={() => setSort("movers")}
                >
                  <span>Top movers</span>
                  <span aria-hidden="true">›</span>
                </button>
                <div className="divide-y">
                  {topMovers.map((r) => (
                    <MoverRow
                      key={r.question.id}
                      question={r.question}
                      probability={r.probability}
                      delta7={r.delta7}
                      subtitle={r.commitment.theme}
                    />
                  ))}
                  {topMovers.length === 0 && (
                    <p className="text-xs text-muted-foreground">No movers this week.</p>
                  )}
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
                    <MoverRow
                      key={r.question.id}
                      question={r.question}
                      probability={r.probability}
                      delta7={r.delta7}
                      subtitle={r.commitment.theme}
                    />
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
