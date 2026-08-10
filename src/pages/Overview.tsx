import { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, CalendarClock, Search, ShieldAlert, TrendingUp } from "lucide-react";
import { useStore, probabilityDelta, riskWeighted, sortWithPins } from "../store";
import QuestionCard from "../components/QuestionCard";
import QuestionFilters, {
  type HorizonKey,
  type SortKey,
  withinHorizon,
} from "../components/QuestionFilters";
import QuestionTable from "../components/QuestionTable";
import CreateQuestionModal, { AddQuestionButton } from "../components/CreateQuestionModal";
import { isCategory } from "../components/ui";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { isStandardsQuestion } from "../domain/standards";
import type { Category, RiskOrOpportunity, Visibility } from "../domain/types";

type ViewMode = "cards" | "table";

export default function Overview() {
  const { questions, yesOutcome, historyFor, pinnedIds } = useStore();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey | null>(null);
  const [cat, setCat] = useState<Category | "all">("all");
  const [owner, setOwner] = useState<string>("all");
  const [riskType, setRiskType] = useState<RiskOrOpportunity | "all">("all");
  const [vis, setVis] = useState<"all" | Visibility>("all");
  const [horizon, setHorizon] = useState<HorizonKey>("all");
  const [view] = useState<ViewMode>("table");
  const [createOpen, setCreateOpen] = useState(false);
  const [askInput, setAskInput] = useState("");

  useEffect(() => {
    const catParam = searchParams.get("cat");
    setCat(catParam && isCategory(catParam) ? catParam : "all");

    const ownerParam = searchParams.get("owner");
    setOwner(ownerParam ?? "all");

    const typeParam = searchParams.get("type");
    setRiskType(typeParam === "risk" || typeParam === "opportunity" ? typeParam : "all");
  }, [searchParams]);

  // Standardized company commitments have their own tab (/standards); keep
  // them out of the main question list so they don't drown everything else.
  const baseQuestions = useMemo(
    () => questions.filter((q) => !isStandardsQuestion(q.id)),
    [questions],
  );

  const categories = useMemo(
    () => Array.from(new Set(baseQuestions.map((q) => q.category))).sort(),
    [baseQuestions],
  );

  const owners = useMemo(
    () => Array.from(new Set(baseQuestions.map((q) => q.owningTeam))).sort(),
    [baseQuestions],
  );

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();

    let list = baseQuestions.filter((q) => {
      if (query && !q.title.toLowerCase().includes(query)) return false;
      if (cat !== "all" && q.category !== cat) return false;
      if (owner !== "all" && q.owningTeam !== owner) return false;
      if (riskType !== "all" && q.riskOrOpportunity !== riskType) return false;
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
  }, [
    baseQuestions,
    search,
    cat,
    owner,
    riskType,
    vis,
    horizon,
    sort,
    view,
    pinnedIds,
    yesOutcome,
    historyFor,
  ]);

  const briefing = useMemo(() => {
    const scored = baseQuestions
      .map((question) => {
        const outcome = yesOutcome(question.id);
        const probability = outcome?.currentProbability ?? 0.5;
        const history = outcome ? historyFor(outcome.id) : [];
        const delta = probabilityDelta(history, 7) ?? 0;
        return { question, probability, delta, weightedRisk: riskWeighted(question, probability) };
      })
      .sort((a, b) => b.weightedRisk - a.weightedRisk);
    const mover = [...scored].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
    const soonest = [...scored].sort((a, b) =>
      a.question.resolutionDate.localeCompare(b.question.resolutionDate),
    )[0];
    return {
      atRisk: scored.filter(
        (item) => item.question.riskOrOpportunity === "risk" && item.probability >= 0.4,
      ).length,
      critical: scored[0],
      mover,
      soonest,
    };
  }, [baseQuestions, yesOutcome, historyFor]);

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8">
      <div className="mb-6 space-y-7">
        <section className="mx-auto flex max-w-3xl flex-col items-center pt-8 text-center sm:pt-12">
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Ask a forecast
          </h1>
          <p className="mt-3 max-w-xl text-base text-muted-foreground">
            Turn an important uncertainty into a calibrated forecast with evidence, scenarios, and a
            clear resolution rule.
          </p>
          <form
            className="mt-7 flex w-full items-center rounded-full border bg-background p-1.5 shadow-sm transition-shadow focus-within:shadow-md"
            onSubmit={(event) => {
              event.preventDefault();
              setCreateOpen(true);
            }}
          >
            <Search className="ml-3 size-5 shrink-0 text-muted-foreground" />
            <Input
              value={askInput}
              onChange={(event) => setAskInput(event.target.value)}
              className="h-11 flex-1 border-0 bg-transparent px-3 text-base shadow-none focus-visible:ring-0"
              placeholder="What do you need to know?"
              aria-label="Ask a forecast"
            />
            <Button type="submit" className="rounded-full px-5">
              Ask
            </Button>
          </form>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="self-center text-xs text-muted-foreground">Try:</span>
            {[
              "Will Atlas cell allocation clear in time for Q4?",
              "Will the Flexport delay impact the Atlas beta build?",
              "Will AI inference costs exceed plan this quarter?",
            ].map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setAskInput(example);
                  setCreateOpen(true);
                }}
                className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {example}
              </button>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Executive briefing</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
              What needs a decision?
            </h2>
          </div>
          <AddQuestionButton
            onClick={() => {
              setAskInput("");
              setCreateOpen(true);
            }}
          />
        </div>

        <CreateQuestionModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          initialTitle={askInput}
        />

        <section className="grid gap-3 md:grid-cols-3">
          {briefing.critical && (
            <Link to={`/q/${briefing.critical.question.id}`} className="group">
              <Card className="h-full border-rose-500/20 transition-colors group-hover:border-rose-500/45">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-lg bg-rose-500/10 p-2 text-rose-700">
                      <ShieldAlert className="size-4" />
                    </span>
                    <Badge variant="destructive">Highest exposure</Badge>
                  </div>
                  <p className="mt-4 line-clamp-2 text-sm font-semibold">
                    {briefing.critical.question.title}
                  </p>
                  <div className="mt-3 flex items-end justify-between">
                    <p className="text-xs text-muted-foreground">risk-weighted priority</p>
                    <p className="text-2xl font-semibold tabular-nums">
                      {Math.round(briefing.critical.probability * 100)}%
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
          {briefing.mover && (
            <Link to={`/q/${briefing.mover.question.id}`} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/45">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-lg bg-primary/10 p-2 text-primary">
                      <TrendingUp className="size-4" />
                    </span>
                    <Badge variant="outline">Largest 7d move</Badge>
                  </div>
                  <p className="mt-4 line-clamp-2 text-sm font-semibold">
                    {briefing.mover.question.title}
                  </p>
                  <div className="mt-3 flex items-end justify-between">
                    <p className="text-xs text-muted-foreground">
                      {briefing.atRisk} risks above 40%
                    </p>
                    <p
                      className={`text-2xl font-semibold tabular-nums ${briefing.mover.delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                    >
                      {briefing.mover.delta >= 0 ? "+" : ""}
                      {Math.round(briefing.mover.delta * 100)} pts
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
          {briefing.soonest && (
            <Link to={`/q/${briefing.soonest.question.id}`} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/45">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-lg bg-amber-500/10 p-2 text-amber-700">
                      <CalendarClock className="size-4" />
                    </span>
                    <Badge variant="outline">Decision horizon</Badge>
                  </div>
                  <p className="mt-4 line-clamp-2 text-sm font-semibold">
                    {briefing.soonest.question.title}
                  </p>
                  <div className="mt-3 flex items-end justify-between">
                    <p className="text-xs text-muted-foreground">
                      resolves {briefing.soonest.question.resolutionDate}
                    </p>
                    <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        </section>

        <div className="flex items-center justify-between gap-3 pt-2">
          <div>
            <h2 className="text-lg font-semibold">Forecast registry</h2>
            <p className="text-sm text-muted-foreground">
              Explore every active question, its evidence, and its latest probability.
            </p>
          </div>
          <Link
            to="/movers"
            className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:flex"
          >
            View all moves <ArrowRight className="size-4" />
          </Link>
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
      </div>

      <div className="min-w-0">
        {view === "cards" ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((q) => (
              <QuestionCard key={q.id} q={q} />
            ))}
          </div>
        ) : (
          <QuestionTable questions={rows} />
        )}
      </div>
    </main>
  );
}
