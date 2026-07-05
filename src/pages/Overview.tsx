import { useMemo, useState } from "react";
import { useStore, probabilityDelta, riskWeighted, sortWithPins } from "../store";
import QuestionCard from "../components/QuestionCard";
import QuestionFilters, { type HorizonKey, type SortKey, withinHorizon } from "../components/QuestionFilters";
import QuestionTable from "../components/QuestionTable";
import type { Category, Visibility } from "../domain/types";

type ViewMode = "cards" | "table";

export default function Overview() {
  const { questions, yesOutcome, historyFor, pinnedIds } = useStore();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey | null>(null);
  const [cat, setCat] = useState<Category | "all">("all");
  const [owner, setOwner] = useState<string>("all");
  const [vis, setVis] = useState<"all" | Visibility>("all");
  const [horizon, setHorizon] = useState<HorizonKey>("all");
  const [view] = useState<ViewMode>("table");

  const categories = useMemo(
    () => Array.from(new Set(questions.map((q) => q.category))).sort(),
    [questions]
  );

  const owners = useMemo(
    () => Array.from(new Set(questions.map((q) => q.owningTeam))).sort(),
    [questions]
  );

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();

    let list = questions.filter((q) => {
      if (query && !q.title.toLowerCase().includes(query)) return false;
      if (cat !== "all" && q.category !== cat) return false;
      if (owner !== "all" && q.owningTeam !== owner) return false;
      if (vis !== "all" && q.visibility !== vis) return false;
      if (!withinHorizon(q.resolutionDate, horizon)) return false;
      return true;
    });

    const score = (qId: string) => {
      const yes = yesOutcome(qId);
      const h = yes ? historyFor(yes.id) : [];
      const p = yes?.currentProbability ?? 0.5;
      return { p, d7: probabilityDelta(h, 7) ?? 0 };
    };

    if (sort) {
      list = [...list].sort((a, b) => {
        const sa = score(a.id);
        const sb = score(b.id);
        switch (sort) {
          case "movers":
            return Math.abs(sb.d7) - Math.abs(sa.d7);
          case "risk_weighted":
            return riskWeighted(b, sb.p) - riskWeighted(a, sb.p);
          case "resolving_soon":
            return a.resolutionDate.localeCompare(b.resolutionDate);
          case "most_uncertain":
            return Math.abs(0.5 - sa.p) - Math.abs(0.5 - sb.p);
        }
      });
    }

    return view === "table" ? sortWithPins(list, pinnedIds) : list;
  }, [questions, search, cat, owner, vis, horizon, sort, view, pinnedIds, yesOutcome, historyFor]);

  return (
    <div className="dash-page">
      <div className="dash-head">
        <div>
          <h1>Questions</h1>
        </div>
      </div>

      <QuestionFilters
        search={search}
        onSearchChange={setSearch}
        cat={cat}
        onCatChange={setCat}
        categories={categories}
        owner={owner}
        onOwnerChange={setOwner}
        owners={owners}
        vis={vis}
        onVisChange={setVis}
        sort={sort}
        onSortChange={setSort}
        horizon={horizon}
        onHorizonChange={setHorizon}
      />

      {view === "cards" ? (
        <div className="qgrid">
          {rows.map((q) => (
            <QuestionCard key={q.id} q={q} />
          ))}
        </div>
      ) : (
        <QuestionTable questions={rows} />
      )}
    </div>
  );
}
