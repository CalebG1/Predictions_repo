import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock3, Plus, Search, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

type Health = "On track" | "Watch" | "At risk";
type Project = {
  id: string;
  name: string;
  description: string;
  industry: string;
  owner: string;
  initials: string;
  confidence: number;
  health: Health;
  progress: number;
  target: string;
  forecasts: number;
};

const initialProjects: Project[] = [
  {
    id: "atlas-ev",
    name: "Atlas EV Platform",
    description:
      "Design and validate a modular electric crossover platform for a 2028 model-year launch.",
    industry: "Automotive",
    owner: "Maya Chen",
    initials: "MC",
    confidence: 64,
    health: "Watch",
    progress: 58,
    target: "Sep 18, 2026",
    forecasts: 18,
  },
  {
    id: "northstar",
    name: "Northstar Billing Migration",
    description: "Move enterprise accounts from the legacy ledger to a usage-based billing stack.",
    industry: "Software",
    owner: "Eli Navarro",
    initials: "EN",
    confidence: 87,
    health: "On track",
    progress: 71,
    target: "Aug 28, 2026",
    forecasts: 14,
  },
  {
    id: "harborline",
    name: "Harborline Residences",
    description: "Deliver a mixed-use waterfront building with public access and retail.",
    industry: "Real estate",
    owner: "Leila Morgan",
    initials: "LM",
    confidence: 43,
    health: "At risk",
    progress: 39,
    target: "Nov 12, 2026",
    forecasts: 23,
  },
  {
    id: "tundra",
    name: "Tundra Carbon Capture Pilot",
    description: "Install a capture unit on an operating cement kiln without disrupting output.",
    industry: "Climate infrastructure",
    owner: "Ravi Shah",
    initials: "RS",
    confidence: 78,
    health: "On track",
    progress: 46,
    target: "Oct 2, 2026",
    forecasts: 16,
  },
  {
    id: "iris",
    name: "Iris Oncology Assay",
    description: "Develop and validate a blood-based recurrence test for colorectal cancer.",
    industry: "Biotechnology",
    owner: "Dr. Nia Okafor",
    initials: "NO",
    confidence: 67,
    health: "Watch",
    progress: 63,
    target: "Sep 30, 2026",
    forecasts: 20,
  },
  {
    id: "kestrel",
    name: "Kestrel Earth Observation-1",
    description:
      "Build and launch a hyperspectral satellite for agriculture and wildfire monitoring.",
    industry: "Aerospace",
    owner: "Jon Bell",
    initials: "JB",
    confidence: 49,
    health: "At risk",
    progress: 76,
    target: "Aug 24, 2026",
    forecasts: 27,
  },
];

const healthStyle: Record<Health, string> = {
  "On track": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Watch: "bg-amber-50 text-amber-700 ring-amber-200",
  "At risk": "bg-rose-50 text-rose-700 ring-rose-200",
};

export default function Projects() {
  const [projects, setProjects] = useState(initialProjects);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Health | "All">("All");
  const [open, setOpen] = useState(false);
  const visible = useMemo(
    () =>
      projects.filter(
        (p) =>
          (filter === "All" || p.health === filter) &&
          `${p.name} ${p.industry}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [projects, query, filter],
  );
  function addProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name"));
    setProjects((items) => [
      {
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "new-project",
        name,
        description: String(data.get("description")) || "New project workspace",
        industry: String(data.get("industry")) || "Other",
        owner: String(data.get("owner")) || "Unassigned",
        initials: "NP",
        confidence: 50,
        health: "Watch",
        progress: 0,
        target: "Set target",
        forecasts: 0,
      },
      ...items,
    ]);
    setOpen(false);
  }
  return (
    <main className="mx-auto max-w-7xl px-5 py-8 pb-24 text-slate-900">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase">
            Portfolio intelligence
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Projects</h1>
          <p className="mt-2 text-sm text-slate-500">
            Forecast delivery confidence across your active initiatives.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} />
          New project
        </Button>
      </div>
      <div className="mb-5 flex flex-wrap gap-3">
        <label className="flex min-w-64 flex-1 items-center gap-2">
          <Search size={17} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects"
          />
        </label>
        <Select value={filter} onValueChange={(value) => setFilter(value as Health | "All")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["All", "On track", "Watch", "At risk"] as const).map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((project) => (
          <Card
            key={project.id}
            className="group transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
          >
            <CardContent className="p-5">
              <Link to={`/projects/${project.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-lg bg-blue-50 text-sm font-bold text-blue-700">
                      {project.initials}
                    </span>
                    <div>
                      <h2 className="font-semibold group-hover:text-blue-700">{project.name}</h2>
                      <p className="text-xs text-slate-500">{project.industry}</p>
                    </div>
                  </div>
                  <Star size={17} className="text-slate-300" />
                </div>
                <p className="mt-4 min-h-10 text-sm leading-5 text-slate-600">
                  {project.description}
                </p>
                <div className="mt-5 flex items-center justify-between">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${healthStyle[project.health]}`}
                  >
                    {project.health}
                  </span>
                  <span className="text-sm font-bold">{project.confidence}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${project.confidence}%` }}
                  />
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>{project.progress}% complete</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 size={13} />
                    {project.target}
                  </span>
                </div>
              </Link>
            </CardContent>
          </Card>
        ))}
      </section>
      {visible.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-500">
          No projects match those filters.
        </p>
      )}
      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && setOpen(false)}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={addProject}>
            <DialogHeader className="px-6 pt-6 pr-12">
              <DialogTitle>Create a project</DialogTitle>
              <DialogDescription>
                Set up the workspace; you can add forecasts and sources next.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 px-6 py-5">
              <Input required name="name" placeholder="Project name" />
              <Textarea name="description" placeholder="Short description" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="industry" placeholder="Industry" />
                <Input name="owner" placeholder="Project lead" />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600"
              >
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
