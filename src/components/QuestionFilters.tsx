import { useState } from "react";
import type { Category, Visibility } from "../domain/types";
import { IconFilter, IconSort } from "./icons";
import { visibilityConfig, visibilityOrder } from "./ui";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent } from "./ui/card";

export type SortKey = "movers" | "risk_weighted" | "resolving_soon" | "most_uncertain";
export type HorizonKey = "daily" | "weekly" | "quarterly" | "all";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "movers", label: "Biggest movers" },
  { key: "risk_weighted", label: "Highest Impact" },
  { key: "resolving_soon", label: "Resolving soon" },
  { key: "most_uncertain", label: "Most uncertain" },
];

const HORIZONS: { key: HorizonKey; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "all", label: "All" },
];

export default function QuestionFilters({
  search,
  onSearchChange,
  cat,
  onCatChange,
  categories,
  owner,
  onOwnerChange,
  owners,
  vis,
  onVisChange,
  sort,
  onSortChange,
  horizon,
  onHorizonChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  cat: Category | "all";
  onCatChange: (v: Category | "all") => void;
  categories: Category[];
  owner: string;
  onOwnerChange: (v: string) => void;
  owners: string[];
  vis: "all" | Visibility;
  onVisChange: (v: "all" | Visibility) => void;
  sort: SortKey | null;
  onSortChange: (v: SortKey | null) => void;
  horizon: HorizonKey;
  onHorizonChange: (v: HorizonKey) => void;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const filtersActive = cat !== "all" || owner !== "all" || vis !== "all";
  const sortLabel = sort ? SORTS.find((s) => s.key === sort)?.label : null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <Input
          className="min-w-0 flex-1"
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by question title…"
          aria-label="Search by question title"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger
                type="button"
                className={`inline-flex h-7 items-center gap-1 rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium ${filtersActive ? "border-primary text-primary" : ""}`}
                aria-expanded={filterOpen}
                onClick={() => {
                  setFilterOpen((o) => !o);
                  setSortOpen(false);
                }}
              >
                <IconFilter />
                Filter
              </PopoverTrigger>
              <PopoverContent className="grid gap-3" align="start" aria-label="Filters">
                <label className="grid gap-1.5 text-sm font-medium">
                  <span>Category</span>
                  <Select
                    value={cat}
                    onValueChange={(value) => onCatChange(value as Category | "all")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  <span>Owner</span>
                  <Select value={owner} onValueChange={(value) => onOwnerChange(value ?? "all")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All owners</SelectItem>
                      {owners.map((team) => (
                        <SelectItem key={team} value={team}>
                          {team}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  <span>Visibility</span>
                  <Select
                    value={vis}
                    onValueChange={(value) => onVisChange(value as "all" | Visibility)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All visibility</SelectItem>
                      {visibilityOrder.map((visibility) => (
                        <SelectItem key={visibility} value={visibility}>
                          {visibilityConfig[visibility].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </PopoverContent>
            </Popover>

            <Popover open={sortOpen} onOpenChange={setSortOpen}>
              <PopoverTrigger
                type="button"
                className="inline-flex h-7 items-center gap-1 rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium"
                aria-expanded={sortOpen}
                onClick={() => {
                  setSortOpen((o) => !o);
                  setFilterOpen(false);
                }}
              >
                <IconSort />
                Sort
              </PopoverTrigger>
              {sortLabel && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                  {sortLabel}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-5"
                    aria-label={`Clear sort: ${sortLabel}`}
                    onClick={() => onSortChange(null)}
                  >
                    ×
                  </Button>
                </span>
              )}
              <PopoverContent
                className="grid w-52 gap-1 p-1"
                align="start"
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
                    className={`justify-start ${sort === s.key ? "bg-muted text-foreground" : ""}`}
                    onClick={() => {
                      onSortChange(s.key);
                      setSortOpen(false);
                    }}
                  >
                    {s.label}
                  </Button>
                ))}
              </PopoverContent>
            </Popover>
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Prediction horizon:</span>
            <Select value={horizon} onValueChange={(value) => onHorizonChange(value as HorizonKey)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HORIZONS.map((item) => (
                  <SelectItem key={item.key} value={item.key}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
      </CardContent>
    </Card>
  );
}

export function withinHorizon(resolutionDate: string, horizon: HorizonKey): boolean {
  if (horizon === "all") return true;
  const days = horizon === "daily" ? 1 : horizon === "weekly" ? 7 : 91;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  return new Date(resolutionDate) <= cutoff;
}
