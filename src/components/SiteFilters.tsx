import { useEffect, useRef, useState } from "react";
import type { Visibility } from "../domain/types";
import { ASSET_CLASS_LABEL, SUBMARKETS, type AssetClass, type Submarket } from "../domain/siteSelection";
import { IconFilter, IconSearch, IconSort } from "./icons";
import { visibilityConfig, visibilityOrder } from "./ui";
import { type HorizonKey, type SortKey } from "./QuestionFilters";

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

export default function SiteFilters({
  search,
  onSearchChange,
  assetClass,
  onAssetClassChange,
  submarket,
  onSubmarketChange,
  vis,
  onVisChange,
  sort,
  onSortChange,
  horizon,
  onHorizonChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  assetClass: AssetClass | "all";
  onAssetClassChange: (v: AssetClass | "all") => void;
  submarket: Submarket | "all";
  onSubmarketChange: (v: Submarket | "all") => void;
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

  const filtersActive = assetClass !== "all" || submarket !== "all" || vis !== "all";
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
          placeholder="Search sites…"
          aria-label="Search sites"
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
                  <span>Asset class</span>
                  <select
                    value={assetClass}
                    onChange={(e) => onAssetClassChange(e.target.value as AssetClass | "all")}
                  >
                    <option value="all">All asset classes</option>
                    <option value="retail">{ASSET_CLASS_LABEL.retail}</option>
                    <option value="industrial">{ASSET_CLASS_LABEL.industrial}</option>
                  </select>
                </label>
                <label className="filter-field">
                  <span>Submarket</span>
                  <select
                    value={submarket}
                    onChange={(e) => onSubmarketChange(e.target.value as Submarket | "all")}
                  >
                    <option value="all">All submarkets</option>
                    {SUBMARKETS.map((s) => (
                      <option key={s} value={s}>
                        {s}
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
