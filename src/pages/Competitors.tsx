// Competitors tab: an Overview-style question table scoped to the competitive
// universe. Every row is a competitor forecast with a company indicator;
// clicking the company opens its profile, clicking the row opens the forecast.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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

function CompetitorRow({ row }: { row: Row }) {
  const navigate = useNavigate();
  const delta = row.delta7 ?? 0;

  const goToQuestion = () => navigate(`/q/${row.question.id}`);

  return (
    <tr
      className="qt-row"
      role="link"
      tabIndex={0}
      onClick={goToQuestion}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToQuestion();
        }
      }}
    >
      <td className="qt-company-col">
        <button
          type="button"
          className="qt-company"
          title={`View ${row.competitor.name} profile`}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/competitors/${row.competitor.id}`);
          }}
        >
          <CompetitorAvatar competitor={row.competitor} />
          <span className="qt-company-name">{row.competitor.name}</span>
        </button>
      </td>
      <td className="qt-question-col">
        <div className="qt-question-cell">
          <span className="qt-title">
            {row.question.title}
            {row.move.newlyIdentified && <span className="comp-new-flag">New</span>}
          </span>
        </div>
      </td>
      <td className="qt-prob">
        <div className="qt-prob-inner">
          <span className="qt-prob-val">{pct(row.probability)}</span>
          <span className={`qt-prob-delta delta ${delta >= 0 ? "up" : "down"}`}>{signedPct(row.delta7)}% 7d</span>
        </div>
      </td>
      <td className="qt-move-col">
        <span className="comp-badge">{row.move.moveCategory}</span>
      </td>
      <td className="qt-date-col">{row.move.expectedHorizon}</td>
      <td className="qt-date-col">{row.question.resolutionDate}</td>
    </tr>
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
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

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
      if (query && !r.question.title.toLowerCase().includes(query)) return false;
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

  const newCount = useMemo(() => newlyIdentifiedCount(questions), [questions]);
  const filtersActive = company !== "all" || moveCat !== "all";
  const sortLabel = SORTS.find((s) => s.key === sort)?.label;

  return (
    <div className="dash-page dash-page-questions">
      <div className="dash-page-top">
        <div className="dash-head">
          <div>
            <h1>Competitors</h1>
          </div>
          <button type="button" className="comp-new-btn" onClick={() => setNewMovesOpen(true)}>
            <span className="comp-new-btn-spark" aria-hidden="true">
              ✦
            </span>
            Newly identified moves
            {newCount > 0 && <span className="comp-new-btn-count">{newCount}</span>}
          </button>
        </div>

        <NewMovesModal
          open={newMovesOpen}
          onClose={() => setNewMovesOpen(false)}
          questions={questions}
          yesOutcome={yesOutcome}
        />

        <div className={`filter-bar${sort !== "probability" ? " has-sort-tag" : ""}`}>
          <label className="filter-search">
            <span className="filter-search-icon" aria-hidden="true">
              <IconSearch />
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search competitor forecasts…"
              aria-label="Search competitor forecasts"
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
                      <span>Company</span>
                      <select value={company} onChange={(e) => setCompany(e.target.value)}>
                        <option value="all">All companies</option>
                        {competitors.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="filter-field">
                      <span>Move type</span>
                      <select value={moveCat} onChange={(e) => setMoveCat(e.target.value as MoveCategory | "all")}>
                        <option value="all">All move types</option>
                        {moveCategoryOrder.map((c) => (
                          <option key={c} value={c}>
                            {c}
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
                {sort !== "probability" && (
                  <span className="filter-active-tag">
                    {sortLabel}
                    <button
                      type="button"
                      className="filter-active-tag-clear"
                      aria-label={`Clear sort: ${sortLabel}`}
                      onClick={() => setSort("probability")}
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
                          setSort(s.key);
                          setSortOpen(false);
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {sort !== "movers" && (
                <button type="button" className="filter-btn" onClick={() => setSort("movers")}>
                  ▲▼ Largest changes this week
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="dash-page-body">
        <div className="qtable-wrap">
          <table className="qtable">
            <thead>
              <tr>
                <th className="qt-company-col">Company</th>
                <th className="qt-question-col">Forecast</th>
                <th className="qt-prob-col">Probability</th>
                <th className="qt-move-col">Move type</th>
                <th className="qt-date-col">Expected</th>
                <th className="qt-date-col">Resolves</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <CompetitorRow key={r.question.id} row={r} />
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="dash-sub comp-empty">No forecasts match the current filters.</p>}
        </div>
      </div>
    </div>
  );
}
