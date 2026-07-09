import { useMemo, useState } from "react";
import { probabilityDelta, riskWeighted, useStore } from "../store";
import CreateQuestionModal, { AddQuestionButton } from "../components/CreateQuestionModal";
import QuestionTable from "../components/QuestionTable";
import SiteFilters from "../components/SiteFilters";
import SiteMap from "../components/SiteMap";
import { withinHorizon, type HorizonKey, type SortKey } from "../components/QuestionFilters";
import {
  candidateSites,
  METRO_NAME,
  siteForQuestion,
  siteQuestions,
  type AssetClass,
  type CandidateSite,
  type Submarket,
} from "../domain/siteSelection";
import type { Visibility } from "../domain/types";

export default function SiteSelection() {
  const { questions, yesOutcome, historyFor } = useStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [assetClass, setAssetClass] = useState<AssetClass | "all">("all");
  const [submarket, setSubmarket] = useState<Submarket | "all">("all");
  const [vis, setVis] = useState<"all" | Visibility>("all");
  const [sort, setSort] = useState<SortKey | null>(null);
  const [horizon, setHorizon] = useState<HorizonKey>("all");
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  const siteQs = useMemo(() => siteQuestions(questions), [questions]);

  const filteredQuestions = useMemo(() => {
    const query = search.trim().toLowerCase();
    let list = siteQs.filter((q) => {
      const site = siteForQuestion(q.id);
      if (query) {
        const hay = `${q.title} ${site?.name ?? ""} ${site?.submarket ?? ""}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      if (assetClass !== "all" && site?.assetClass !== assetClass) return false;
      if (submarket !== "all" && site?.submarket !== submarket) return false;
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
    } else {
      // Default: highest probability x impact (best risk-weighted candidates first).
      list = [...list].sort((a, b) => {
        const pa = yesOutcome(a.id)?.currentProbability ?? a.priorBaseRate;
        const pb = yesOutcome(b.id)?.currentProbability ?? b.priorBaseRate;
        return riskWeighted(b, pb) - riskWeighted(a, pa);
      });
    }

    return list;
  }, [siteQs, search, assetClass, submarket, vis, horizon, sort, yesOutcome, historyFor]);

  const visibleQuestionIds = useMemo(
    () => new Set(filteredQuestions.map((q) => q.id)),
    [filteredQuestions]
  );

  /** Sites shown on the map: those backing a filtered question + operating sites. */
  const mapSites = useMemo(() => {
    return candidateSites.filter((s) => {
      if (s.status === "operating") {
        if (assetClass !== "all" && s.assetClass !== assetClass) return false;
        if (submarket !== "all" && s.submarket !== submarket) return false;
        return true;
      }
      return s.questionId !== undefined && visibleQuestionIds.has(s.questionId);
    });
  }, [assetClass, submarket, visibleQuestionIds]);

  const probabilityFor = useMemo(() => {
    return (site: CandidateSite): number | null => {
      if (!site.questionId) return null;
      const q = siteQs.find((item) => item.id === site.questionId);
      if (!q) return null;
      const yes = yesOutcome(q.id);
      return yes?.currentProbability ?? q.priorBaseRate;
    };
  }, [siteQs, yesOutcome]);

  return (
    <div className="dash-page cyber-page dash-page-questions">
      <div className="dash-page-top">
        <div className="dash-head">
          <div>
            <h1>Site Selection</h1>
            <p className="muted small site-metro-tag">{METRO_NAME} · predictive site selection pipeline</p>
          </div>
          <AddQuestionButton onClick={() => setCreateOpen(true)} />
        </div>

        <CreateQuestionModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          defaultCategory="Real Estate"
        />

        <SiteFilters
          search={search}
          onSearchChange={setSearch}
          assetClass={assetClass}
          onAssetClassChange={setAssetClass}
          submarket={submarket}
          onSubmarketChange={setSubmarket}
          vis={vis}
          onVisChange={setVis}
          sort={sort}
          onSortChange={setSort}
          horizon={horizon}
          onHorizonChange={setHorizon}
        />
      </div>

      <div className="dash-page-body cyber-dashboard-body">
        <div className="panel site-map-panel">
          <div className="panel-head">
            <span>Candidate map</span>
            <span className="muted">
              Pins colored by probability of hitting target · dashed rings show 75% trade areas
            </span>
          </div>
          <SiteMap
            sites={mapSites}
            probabilityFor={probabilityFor}
            selectedId={selectedSiteId}
            onSelect={setSelectedSiteId}
          />
        </div>

        <QuestionTable questions={filteredQuestions} />
      </div>
    </div>
  );
}
