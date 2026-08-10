import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

const records: Record<
  string,
  {
    name: string;
    industry: string;
    owner: string;
    initials: string;
    confidence: number;
    health: string;
    target: string;
  }
> = {
  "atlas-ev": {
    name: "Atlas EV Platform",
    industry: "Automotive",
    owner: "Maya Chen",
    initials: "MC",
    confidence: 64,
    health: "Watch",
    target: "Sep 18, 2026",
  },
  northstar: {
    name: "Northstar Billing Migration",
    industry: "Software",
    owner: "Eli Navarro",
    initials: "EN",
    confidence: 87,
    health: "On track",
    target: "Aug 28, 2026",
  },
  harborline: {
    name: "Harborline Residences",
    industry: "Real estate",
    owner: "Leila Morgan",
    initials: "LM",
    confidence: 43,
    health: "At risk",
    target: "Nov 12, 2026",
  },
};
const baseTasks = [
  {
    id: 1,
    title: "Close battery enclosure reinforcement design",
    owner: "Avery Li",
    due: "Aug 13",
    status: "In progress",
  },
  {
    id: 2,
    title: "Confirm side-impact test article build schedule",
    owner: "Daria Cole",
    due: "Aug 14",
    status: "In progress",
  },
  {
    id: 3,
    title: "Review thermal model assumptions with supplier",
    owner: "Owen Brooks",
    due: "Aug 12",
    status: "In review",
  },
  {
    id: 4,
    title: "Publish crash-test readiness review",
    owner: "Maya Chen",
    due: "Aug 19",
    status: "Backlog",
  },
];
const tabs = ["Overview", "Tasks", "Forecasts", "Resources", "Risks", "Activity"];
export default function ProjectDetail() {
  const { id = "atlas-ev" } = useParams();
  const project = records[id] ?? records["atlas-ev"];
  const [tab, setTab] = useState("Overview");
  const [tasks, setTasks] = useState(baseTasks);
  const [adding, setAdding] = useState(false);
  const summary = useMemo(() => `${tasks.length} tracked work items`, [tasks]);
  function addTask() {
    setTasks([
      ...tasks,
      {
        id: Date.now(),
        title: "New readiness task",
        owner: project.owner,
        due: "Set date",
        status: "Backlog",
      },
    ]);
    setAdding(false);
  }
  return (
    <main className="mx-auto max-w-7xl px-5 py-7 pb-24 text-slate-900">
      <Link
        to="/projects"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-blue-700"
      >
        <ArrowLeft size={16} />
        All projects
      </Link>
      <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-blue-600 font-bold text-white">
            {project.initials}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                {project.health}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {project.industry} · Led by {project.owner}
            </p>
          </div>
        </div>
        <Button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={16} />
          Add task
        </Button>
      </header>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["Delivery confidence", `${project.confidence}%`, Sparkles],
            ["Target date", project.target, CalendarDays],
            ["Team members", "12", Users],
            ["Work items", summary, ClipboardList],
          ] as const
        ).map(([label, value, Icon]) => (
          <Card
            key={String(label)}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <CardContent>
              <Icon size={18} className="text-blue-600" />
              <p className="mt-3 text-xs font-medium text-slate-500">{String(label)}</p>
              <strong className="mt-1 block text-lg">{String(value)}</strong>
            </CardContent>
          </Card>
        ))}
      </div>
      <nav className="mt-7 flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold ${tab === item ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-900"}`}
          >
            {item}
          </button>
        ))}
      </nav>
      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          {tab === "Overview" && (
            <>
              <Card>
                <CardContent className="p-5">
                  <h2 className="font-semibold">Delivery outlook</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    The current forecast reflects evidence from validation, supplier readiness, and
                    the upcoming program review. Focus the team on resolving the thermal validation
                    dependency before the next milestone.
                  </p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-blue-600"
                      style={{ width: `${project.confidence}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
              <TaskList tasks={tasks} setTasks={setTasks} />
            </>
          )}
          {tab === "Tasks" && <TaskList tasks={tasks} setTasks={setTasks} />}{" "}
          {tab !== "Overview" && tab !== "Tasks" && (
            <Card>
              <CardContent className="p-6 text-sm text-slate-600">
                <h2 className="font-semibold text-slate-900">{tab}</h2>
                <p className="mt-2">
                  This workspace section is ready for project specific {tab.toLowerCase()}.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
        <aside className="space-y-5">
          <Card className="border-blue-100 bg-blue-50">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 font-semibold text-blue-900">
                <Sparkles size={17} />
                Forecast briefing
              </div>
              <p className="mt-2 text-sm leading-6 text-blue-900/75">
                Confidence is {project.confidence}%. The next evidence update should come from the
                readiness review.
              </p>
              <Button variant="link" className="mt-4 px-0 text-blue-700">
                Open forecast details →
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <h2 className="font-semibold">Upcoming milestone</h2>
              <p className="mt-3 font-medium">Alpha crash test</p>
              <p className="mt-1 text-sm text-slate-500">Due {project.target}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <h2 className="font-semibold">Resources</h2>
              {["Program hub", "Validation evidence index", "Supplier dashboard"].map((name) => (
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-600" key={name}>
                  <FileText size={16} className="text-slate-400" />
                  {name}
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </section>
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add task</DialogTitle>
            <DialogDescription>Create a new work item for this project.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setAdding(false)}
              className="px-3 py-2 text-sm font-semibold text-slate-600"
            >
              Cancel
            </Button>
            <Button
              onClick={addTask}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Add task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
function TaskList({
  tasks,
  setTasks,
}: {
  tasks: typeof baseTasks;
  setTasks: React.Dispatch<React.SetStateAction<typeof baseTasks>>;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 className="font-semibold">Priority work</h2>
          <span className="text-xs text-slate-500">
            {tasks.filter((t) => t.status === "Done").length}/{tasks.length} complete
          </span>
        </div>
        <div>
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 border-b border-slate-100 p-4 last:border-0"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setTasks((items) =>
                    items.map((t) =>
                      t.id === task.id
                        ? {
                            ...t,
                            status: t.status === "Done" ? "Backlog" : "Done",
                          }
                        : t,
                    ),
                  )
                }
                className="text-slate-300 hover:text-blue-600"
              >
                <CheckCircle2 size={20} fill={task.status === "Done" ? "currentColor" : "none"} />
              </Button>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${task.status === "Done" ? "text-slate-400 line-through" : "text-slate-800"}`}
                >
                  {task.title}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {task.owner} · Due {task.due}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                {task.status}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
