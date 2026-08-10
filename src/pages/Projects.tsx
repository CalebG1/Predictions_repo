import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Grid2X2,
  List,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Star,
  Target,
} from "lucide-react";
import { seedProjects, healthClasses, type Project, type ProjectHealth } from "../domain/projects";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";

const trend = (value: number) =>
  value > 0 ? (
    <span className="inline-flex items-center gap-0.5 text-emerald-600">
      <ArrowUp className="size-3" />
      {value} pts
    </span>
  ) : value < 0 ? (
    <span className="inline-flex items-center gap-0.5 text-rose-600">
      <ArrowDown className="size-3" />
      {Math.abs(value)} pts
    </span>
  ) : (
    <span className="text-slate-500">No change</span>
  );

export default function Projects() {
  const [projects, setProjects] = useState(seedProjects);
  const [query, setQuery] = useState("");
  const [health, setHealth] = useState<ProjectHealth | "All">("All");
  const [industry, setIndustry] = useState<string | null>("All");
  const [sort, setSort] = useState<string | null>("Needs attention");
  const [view, setView] = useState<"cards" | "list">("cards");
  const [open, setOpen] = useState(false);
  const industries = useMemo(
    () => ["All", ...new Set(projects.map((p) => p.industry))],
    [projects],
  );
  const visible = useMemo(
    () =>
      projects
        .filter(
          (p) =>
            (health === "All" || p.health === health) &&
            (industry === "All" || p.industry === industry) &&
            `${p.name} ${p.owner} ${p.location}`.toLowerCase().includes(query.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "Highest confidence"
            ? b.confidence - a.confidence
            : sort === "Nearest milestone"
              ? a.target.localeCompare(b.target)
              : sort === "Recently changed"
                ? Math.abs(b.change) - Math.abs(a.change)
                : a.confidence - b.confidence,
        ),
    [projects, query, health, industry, sort],
  );
  const addProject = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name"));
    setProjects((p) => [
      {
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name,
        initials: name
          .split(" ")
          .map((x) => x[0])
          .join("")
          .slice(0, 2),
        description: String(f.get("description")) || "New project workspace ready for forecasts.",
        industry: String(f.get("industry")) || "Other",
        location: String(f.get("location")) || "Location TBD",
        phase: "Planning",
        health: "On track",
        confidence: 72,
        change: 0,
        progress: 8,
        nextMilestone: "Scope approved",
        target: "TBD",
        owner: String(f.get("owner")) || "Unassigned",
        forecasts: 0,
        forecasters: 0,
        topForecast: "Will the initial scope be approved without material revisions?",
        topForecastProbability: 72,
        risks: [],
      },
      ...p,
    ]);
    setOpen(false);
  };
  const stats = [
    {
      label: "Portfolio confidence",
      value: `${Math.round(projects.reduce((s, p) => s + p.confidence, 0) / projects.length)}%`,
      note: "+2 pts this month",
      icon: Target,
    },
    {
      label: "Needs attention",
      value: String(projects.filter((p) => p.health === "At risk").length),
      note: "2 changed this week",
      icon: AlertTriangle,
    },
    {
      label: "Open forecasts",
      value: String(projects.reduce((s, p) => s + p.forecasts, 0)),
      note: "37 updated today",
      icon: Sparkles,
    },
    {
      label: "Your watchlist",
      value: String(projects.filter((p) => p.watched).length),
      note: "Across 3 industries",
      icon: Star,
    },
  ];
  return (
    <main className="mx-auto max-w-7xl px-5 py-8 pb-24 text-slate-900">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase">
            ● Portfolio intelligence · Updated 8 minutes ago
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Projects</h1>
          <p className="mt-2 text-sm text-slate-500">
            See where delivery is headed, what is changing, and where your team should act next.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          New project
        </Button>
      </header>

      <section className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
        <Sparkles className="size-5 text-blue-700" />
        <div className="min-w-64 flex-1">
          <p className="text-sm font-semibold">Attention shifted to Harborline Residences</p>
          <p className="text-sm text-slate-600">
            On-time delivery fell 12 points after its facade supplier moved the committed ship date.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setHealth("At risk")}>
          Review at-risk projects
        </Button>
      </section>
      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Portfolio</h2>
            <p className="text-sm text-slate-500">
              {visible.length} of {projects.length} projects
            </p>
          </div>
          <div className="flex rounded-lg bg-slate-100 p-1">
            {(["All", "On track", "Watch", "At risk"] as const).map((x) => (
              <button
                key={x}
                onClick={() => setHealth(x)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${health === x ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
              >
                {x}
                {x !== "All" && ` ${projects.filter((p) => p.health === x).length}`}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <label className="flex min-w-56 flex-1 items-center gap-2 rounded-md border bg-white px-3">
            <Search className="size-4 text-slate-400" />
            <Input
              className="border-0 px-0 shadow-none focus-visible:ring-0"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects"
            />
          </label>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {industries.map((i) => (
                <SelectItem key={i} value={i}>
                  {i === "All" ? "All industries" : i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                "Needs attention",
                "Highest confidence",
                "Nearest milestone",
                "Recently changed",
              ].map((i) => (
                <SelectItem key={i} value={i}>
                  {i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-md border p-1">
            <Button
              variant={view === "cards" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setView("cards")}
            >
              <Grid2X2 className="size-4" />
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setView("list")}
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>
        <div
          className={
            view === "cards" ? "mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "mt-5 space-y-2"
          }
        >
          {visible.map((p) => (
            <ProjectItem
              key={p.id}
              project={p}
              list={view === "list"}
              toggle={() =>
                setProjects((all) =>
                  all.map((x) => (x.id === p.id ? { ...x, watched: !x.watched } : x)),
                )
              }
            />
          ))}
        </div>
      </section>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={addProject}>
            <DialogHeader>
              <DialogTitle>Create a project</DialogTitle>
              <DialogDescription>
                Set up the workspace, then add forecasts and sources.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-5">
              <Input required name="name" placeholder="Project name" />
              <Textarea name="description" placeholder="Short description" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="industry" placeholder="Industry" />
                <Input name="owner" placeholder="Project lead" />
                <Input name="location" placeholder="Location" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button>Create project</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
function ProjectItem({
  project: p,
  list,
  toggle,
}: {
  project: Project;
  list: boolean;
  toggle: () => void;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <Link to={`/projects/${p.id}`} className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-sm font-bold text-blue-700">
            {p.initials}
          </span>
          <span>
            <span className="block font-semibold hover:text-blue-700">{p.name}</span>
            <span className="block text-xs text-slate-500">
              {p.industry} · {p.phase}
            </span>
          </span>
        </Link>
        <button onClick={toggle} aria-label="Toggle watchlist">
          <Star
            className={`size-4 ${p.watched ? "fill-amber-400 text-amber-500" : "text-slate-300"}`}
          />
        </button>
      </div>
      <p className="mt-3 text-sm leading-5 text-slate-600">{p.description}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3" />
          {p.location}
        </span>
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="size-3" />
          {p.target}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${healthClasses[p.health]}`}
        >
          {p.health}
        </span>
        <span className="text-sm font-bold">
          {p.confidence}% <small className="font-normal">{trend(p.change)}</small>
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-600" style={{ width: `${p.confidence}%` }} />
      </div>
      <div className="mt-3 flex justify-between text-xs text-slate-500">
        <span>{p.progress}% complete</span>
        <span>Next: {p.nextMilestone}</span>
      </div>
      <div className="mt-4 border-t pt-3">
        <p className="text-xs font-medium text-slate-500">
          KEY FORECAST <b className="float-right text-slate-700">{p.topForecastProbability}%</b>
        </p>
        <p className="mt-1 text-sm">{p.topForecast}</p>
        <div className="mt-3 flex flex-wrap gap-1">
          {p.risks.map((r) => (
            <span key={r} className="rounded bg-rose-50 px-2 py-1 text-xs text-rose-700">
              {r}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Lead: {p.owner} · {p.forecasts} questions · {p.forecasters} forecasters
        </p>
      </div>
    </>
  );
  return (
    <Card className={list ? "" : "transition hover:-translate-y-0.5 hover:shadow-md"}>
      <CardContent className={list ? "p-4 md:grid md:grid-cols-[1.5fr_2fr] md:gap-6" : "p-5"}>
        {content}
      </CardContent>
    </Card>
  );
}
