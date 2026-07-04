import { useMemo, useState } from "react";
import { useStore, probabilityDelta, riskWeighted } from "../store";
import QuestionCard from "../components/QuestionCard";
import type { Category, RiskOrOpportunity, Visibility } from "../domain/types";
import { visibilityConfig, visibilityOrder } from "../components/ui";

type SortKey = "movers" | "risk_weighted" | "resolving_soon" | "most_uncertain";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "movers", label: "Biggest movers" },
  { key: "risk_weighted", label: "Highest risk-weighted" },
  { key: "resolving_soon", label: "Resolving soon" },
  { key: "most_uncertain", label: "Most uncertain" },
];

export default function Overview() {
  const { questions, yesOutcome, historyFor } = useStore();
  const [sort, setSort] = useState<SortKey>("movers");
  const [cat, setCat] = useState<Category | "all">("all");
  const [kind, setKind] = useState<RiskOrOpportunity | "all">("all");
  const [vis, setVis] = useState<"all" | Visibility>("all");

  const categories = useMemo(
    () => Array.from(new Set(questions.map((q) => q.category))).sort(),
    [questions]
  );

  const rows = useMemo(() => {
    let list = questions.filter((q) => {
      if (cat !== "all" && q.category !== cat) return false;
      if (kind !== "all" && q.riskOrOpportunity !== kind) return false;
      if (vis !== "all" && q.visibility !== vis) return false;
      return true;
    });

    const score = (qId: string) => {
      const yes = yesOutcome(qId);
      const h = yes ? historyFor(yes.id) : [];
      const p = yes?.currentProbability ?? 0.5;
      return { p, d7: probabilityDelta(h, 7) ?? 0 };
    };

    list = [...list].sort((a, b) => {
      const sa = score(a.id);
      const sb = score(b.id);
      switch (sort) {
        case "movers":
          return Math.abs(sb.d7) - Math.abs(sa.d7);
        case "risk_weighted":
          return riskWeighted(b, sb.p) - riskWeighted(a, sa.p);
        case "resolving_soon":
          return a.resolutionDate.localeCompare(b.resolutionDate);
        case "most_uncertain":
          return Math.abs(0.5 - sa.p) - Math.abs(0.5 - sb.p);
      }
    });
    return list;
  }, [questions, cat, kind, vis, sort, yesOutcome, historyFor]);

  const riskCount = questions.filter((q) => q.riskOrOpportunity === "risk").length;
  const oppCount = questions.length - riskCount;

  return (
    <div className="dash-page">
      <div className="dash-head">
        <div>
          <h1>Risk &amp; Opportunity Overview</h1>
          <p className="dash-sub">
            {questions.length} open questions · {riskCount} risks · {oppCount} opportunities · probabilities produced
            by a calibrated multi-agent engine and fully auditable.
          </p>
        </div>
      </div>

      <div className="filters">
        <div className="filter-group">
          {SORTS.map((s) => (
            <button key={s.key} className={`chip ${sort === s.key ? "active" : ""}`} onClick={() => setSort(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="filter-group right">
          <select value={cat} onChange={(e) => setCat(e.target.value as Category | "all")}>
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select value={kind} onChange={(e) => setKind(e.target.value as RiskOrOpportunity | "all")}>
            <option value="all">Risk + Opportunity</option>
            <option value="risk">Risks</option>
            <option value="opportunity">Opportunities</option>
          </select>
          <select value={vis} onChange={(e) => setVis(e.target.value as "all" | Visibility)}>
            <option value="all">All visibility</option>
            {visibilityOrder.map((v) => (
              <option key={v} value={v}>
                {visibilityConfig[v].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="qgrid">
        {rows.map((q) => (
          <QuestionCard key={q.id} q={q} />
        ))}
      </div>
    </div>
  );
}
