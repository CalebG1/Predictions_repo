import { useEffect, useRef, useState } from "react";
import type { Category, Visibility } from "../domain/types";
import { IconFilter, IconSearch, IconSort } from "./icons";
import { visibilityConfig, visibilityOrder } from "./ui";

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
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const filtersActive = cat !== "all" || owner !== "all" || vis !== "all";
  const sortLabel = sort ? SORTS.find((s) => s.key === sort)?.label : null;

  useEffect(() => {
    if (!filterOpen) return;
    const close = (e: Event) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [filterOpen]);

  useEffect(() => {
    if (!sortOpen) return;
    const close = (e: Event) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [sortOpen]);

  return (
    <div className={`filter-bar${sort ? " has-sort-tag" : ""}`}>
      <label className="filter-search">
        <span className="filter-search-icon" aria-hidden="true">
          <IconSearch />
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by question title…"
          aria-label="Search by question title"
        />
      </label>

      <div className="filter-toolbar">
        <div className="filter-actions">
          <div className="filter-menu-wrap" ref={filterRef}>
          <button
            type="button"
            className={`filter-btn${filtersActive ? " active" : ""}`}
            aria-expanded={filterOpen}
            onClick={() => {
              setFilterOpen((o) => !o);
              setSortOpen(false);
            }}
          >
            <IconFilter />
            Filter
          </button>
          {filterOpen && (
            <div className="filter-panel" role="dialog" aria-label="Filters">
              <label className="filter-field">
                <span>Category</span>
                <select value={cat} onChange={(e) => onCatChange(e.target.value as Category | "all")}>
                  <option value="all">All categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="filter-field">
                <span>Owner</span>
                <select value={owner} onChange={(e) => onOwnerChange(e.target.value)}>
                  <option value="all">All owners</option>
                  {owners.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
              </label>
              <label className="filter-field">
                <span>Visibility</span>
                <select value={vis} onChange={(e) => onVisChange(e.target.value as "all" | Visibility)}>
                  <option value="all">All visibility</option>
                  {visibilityOrder.map((v) => (
                    <option key={v} value={v}>
                      {visibilityConfig[v].label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>

        <div className="filter-sort-wrap" ref={sortRef}>
          <button
            type="button"
            className="filter-btn"
            aria-expanded={sortOpen}
            onClick={() => {
              setSortOpen((o) => !o);
              setFilterOpen(false);
            }}
          >
            <IconSort />
            Sort
          </button>
          {sortLabel && (
            <span className="filter-active-tag">
              {sortLabel}
              <button
                type="button"
                className="filter-active-tag-clear"
                aria-label={`Clear sort: ${sortLabel}`}
                onClick={() => onSortChange(null)}
              >
                ×
              </button>
            </span>
          )}
          {sortOpen && (
            <div className="filter-panel filter-panel-sort" role="listbox" aria-label="Sort options">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  role="option"
                  aria-selected={sort === s.key}
                  className={`filter-panel-option${sort === s.key ? " active" : ""}`}
                  onClick={() => {
                    onSortChange(s.key);
                    setSortOpen(false);
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
        </div>

        <label className="filter-horizon">
          <span>Prediction horizon:</span>
          <select value={horizon} onChange={(e) => onHorizonChange(e.target.value as HorizonKey)}>
            {HORIZONS.map((h) => (
              <option key={h.key} value={h.key}>
                {h.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

export function withinHorizon(resolutionDate: string, horizon: HorizonKey): boolean {
  if (horizon === "all") return true;
  const days = horizon === "daily" ? 1 : horizon === "weekly" ? 7 : 91;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  return new Date(resolutionDate) <= cutoff;
}
