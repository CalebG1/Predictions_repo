import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  Folder,
  Link2,
  Plus,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { healthClasses, seedProjects } from "../domain/projects";
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
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../components/ui/drawer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

type Task = {
  id: number;
  title: string;
  status: "Backlog" | "In progress" | "In review" | "Done";
  assignee: string;
  due: string;
  priority: "Urgent" | "High" | "Medium" | "Low";
};
const initialTasks: Task[] = [
  {
    id: 1,
    title: "Close battery enclosure reinforcement design",
    status: "In progress",
    assignee: "Avery Li",
    due: "Aug 13",
    priority: "Urgent",
  },
  {
    id: 2,
    title: "Confirm side-impact test article build schedule",
    status: "In progress",
    assignee: "Daria Cole",
    due: "Aug 14",
    priority: "High",
  },
  {
    id: 3,
    title: "Review thermal model assumptions with cell supplier",
    status: "In review",
    assignee: "Owen Brooks",
    due: "Aug 12",
    priority: "High",
  },
  {
    id: 4,
    title: "Publish alpha crash-test readiness review",
    status: "Backlog",
    assignee: "Maya Chen",
    due: "Aug 19",
    priority: "Medium",
  },
  {
    id: 5,
    title: "Upload fixture calibration certificates",
    status: "Done",
    assignee: "Nia James",
    due: "Aug 8",
    priority: "Low",
  },
];
const resources = [
  "Atlas program hub",
  "Vehicle architecture & CAD",
  "Validation evidence index",
  "Supplier readiness dashboard",
  "Battery supplier negotiations",
];
const tabs = [
  "Overview",
  "Tasks",
  "Timeline",
  "Forecasts",
  "Resources",
  "Risks",
  "Decisions",
  "Activity",
];
export default function ProjectDetail() {
  const { id = "atlas-ev" } = useParams();
  const project = seedProjects.find((p) => p.id === id) ?? seedProjects[0];
  const [tasks, setTasks] = useState(initialTasks);
  const [adding, setAdding] = useState(false);
  const [resourceDialog, setResourceDialog] = useState(false);
  const [projectResources, setProjectResources] = useState(resources);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [value, setValue] = useState("Overview");
  const openCount = tasks.filter((t) => t.status !== "Done").length;
  const toggle = (taskId: number) =>
    setTasks((x) =>
      x.map((t) =>
        t.id === taskId ? { ...t, status: t.status === "Done" ? "In progress" : "Done" } : t,
      ),
    );
  const addTask = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setTasks((x) => [
      {
        id: Date.now(),
        title: String(data.get("title")) || "New project task",
        status: "Backlog",
        assignee: String(data.get("assignee")) || project.owner,
        due: String(data.get("due")) || "Set date",
        priority: "Medium",
      },
      ...x,
    ]);
    setAdding(false);
    setToast("Task added to the project plan");
  };
  const linkResource = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setProjectResources((items) => [String(data.get("name")) || "New project resource", ...items]);
    setResourceDialog(false);
    setToast("Resource linked to this project");
  };
  return (
    <main className="mx-auto max-w-7xl px-5 py-7 pb-24 text-slate-900">
      <Link
        to="/projects"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-blue-700"
      >
        <ArrowLeft className="size-4" />
        All projects
      </Link>
      <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-blue-600 font-bold text-white">
            {project.initials}
          </span>
          <div>
            <p className="text-xs text-slate-500">
              {project.industry} · {project.phase}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${healthClasses[project.health]}`}
              >
                {project.health}
              </span>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span>Led by {project.owner}</span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3" />
                Target {project.target}
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard?.writeText(location.href);
              setToast("Project link copied to clipboard");
            }}
          >
            <Link2 className="size-4" />
            Share
          </Button>
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" />
            Add task
          </Button>
        </div>
      </header>
      <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["On-time delivery forecast", `${project.confidence}%`, Sparkles],
          ["Next milestone", project.nextMilestone, CalendarDays],
          ["Forecast coverage", `${project.forecasts} active questions`, Users],
          ["Work items", `${openCount} open · ${tasks.length - openCount} done`, ClipboardList],
        ].map(([l, v, I]) => {
          const Icon = I as typeof Sparkles;
          return (
            <Card key={String(l)}>
              <CardContent className="p-4">
                <Icon className="size-5 text-blue-600" />
                <p className="mt-2 text-xs text-slate-500">{String(l)}</p>
                <strong className="mt-1 block text-base">{String(v)}</strong>
              </CardContent>
            </Card>
          );
        })}
      </section>
      <Tabs value={value} onValueChange={setValue} className="mt-7">
        <TabsList
          variant="line"
          className="w-full justify-start overflow-x-auto rounded-none border-b pb-1"
        >
          {tabs.map((t) => (
            <TabsTrigger key={t} value={t} className="shrink-0 px-3">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="Overview" className="mt-6">
          <Overview
            project={project}
            tasks={tasks}
            onTasks={() => setValue("Tasks")}
            onTaskOpen={setSelectedTask}
            onEvidence={() => setEvidenceOpen(true)}
          />
        </TabsContent>
        <TabsContent value="Tasks" className="mt-6">
          <TaskBoard
            tasks={tasks}
            toggle={toggle}
            add={() => setAdding(true)}
            onOpen={setSelectedTask}
          />
        </TabsContent>
        <TabsContent value="Timeline" className="mt-6">
          <Timeline tasks={tasks} onOpen={setSelectedTask} />
        </TabsContent>
        <TabsContent value="Forecasts" className="mt-6">
          <Forecasts project={project} onOpenEvidence={() => setEvidenceOpen(true)} />
        </TabsContent>
        <TabsContent value="Resources" className="mt-6">
          <Resources
            items={projectResources}
            onLink={() => setResourceDialog(true)}
            onOpen={(name) => setToast(`Opened ${name}`)}
          />
        </TabsContent>
        <TabsContent value="Risks" className="mt-6">
          <Risks
            project={project}
            onReview={(risk) => {
              setEvidenceOpen(true);
              setToast(`Showing evidence for ${risk}`);
            }}
          />
        </TabsContent>
        <TabsContent value="Decisions" className="mt-6">
          <Decisions />
        </TabsContent>
        <TabsContent value="Activity" className="mt-6">
          <Activity />
        </TabsContent>
      </Tabs>
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <form onSubmit={addTask}>
            <DialogHeader>
              <DialogTitle>Add task</DialogTitle>
              <DialogDescription>
                Create a work item and tie it to project delivery.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-5">
              <Input name="title" required placeholder="Task title" />
              <div className="grid grid-cols-2 gap-3">
                <Input name="assignee" placeholder="Assignee" />
                <Input name="due" placeholder="Due date" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button>Add task</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={resourceDialog} onOpenChange={setResourceDialog}>
        <DialogContent>
          <form onSubmit={linkResource}>
            <DialogHeader>
              <DialogTitle>Link a resource</DialogTitle>
              <DialogDescription>
                Add a connected folder, document, or dashboard to the project.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-5">
              <Input required name="name" placeholder="Resource name" />
              <Input name="source" placeholder="Source (e.g. Google Drive)" />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setResourceDialog(false)}>
                Cancel
              </Button>
              <Button>Link resource</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <TaskDrawer
        task={selectedTask}
        project={project}
        onClose={() => setSelectedTask(null)}
        onToggle={toggle}
        onEvidence={() => {
          setSelectedTask(null);
          setEvidenceOpen(true);
        }}
      />
      <ForecastEvidenceDrawer
        open={evidenceOpen}
        project={project}
        onClose={() => setEvidenceOpen(false)}
      />
      {toast && (
        <div className="fixed right-5 bottom-5 z-50 flex items-center gap-3 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg">
          <CheckCircle2 className="size-4 text-emerald-400" />
          {toast}
          <button onClick={() => setToast(null)} aria-label="Dismiss notification">
            <X className="size-4" />
          </button>
        </div>
      )}
    </main>
  );
}
function Overview({
  project,
  tasks,
  onTasks,
  onTaskOpen,
  onEvidence,
}: {
  project: (typeof seedProjects)[number];
  tasks: Task[];
  onTasks: () => void;
  onTaskOpen: (task: Task) => void;
  onEvidence: () => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <Card className="border-blue-100 bg-blue-50">
          <CardContent className="p-5">
            <p className="text-xs font-semibold tracking-widest text-blue-700 uppercase">
              Forecast signal
            </p>
            <h2 className="mt-2 text-lg font-bold">{project.topForecast}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This key outcome is {project.topForecastProbability}% likely. Recent evidence changed
              delivery confidence by {Math.abs(project.change)} points; the next readiness review is
              the strongest opportunity to reduce uncertainty.
            </p>
            <Button variant="link" className="mt-2 px-0" onClick={onEvidence}>
              View forecast evidence <ChevronRight />
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">THIS WEEK</p>
                <h2 className="font-semibold">Sprint focus</h2>
              </div>
              <Button variant="link" onClick={onTasks}>
                View all tasks
              </Button>
            </div>
            <div className="mt-3 divide-y">
              {tasks
                .filter((t) => t.status !== "Done")
                .slice(0, 4)
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onTaskOpen(t)}
                    className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm hover:text-blue-700"
                  >
                    <span>
                      <b>{t.title}</b>
                      <small className="mt-1 block text-slate-500">
                        {t.assignee} · {t.status}
                      </small>
                    </span>
                    <span className="text-xs text-slate-500">Due {t.due}</span>
                  </button>
                ))}
            </div>
          </CardContent>
        </Card>
        <Activity compact />
      </div>
      <aside className="space-y-5">
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold">Milestones</h2>
            <div className="mt-4 space-y-4 border-l pl-4 text-sm">
              <p>
                <b>Design freeze</b>
                <small className="block text-emerald-600">Completed Aug 2</small>
              </p>
              <p>
                <b>{project.nextMilestone}</b>
                <small className="block text-blue-600">
                  {project.target} · {project.confidence}% likely on time
                </small>
              </p>
              <p>
                <b>Beta vehicle build</b>
                <small className="block text-slate-500">Planning</small>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold">Project resources</h2>
            {resources.slice(0, 3).map((x) => (
              <p className="mt-3 flex items-center gap-2 text-sm text-slate-600" key={x}>
                <FileText className="size-4 text-slate-400" />
                {x}
              </p>
            ))}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
function TaskBoard({
  tasks,
  toggle,
  add,
  onOpen,
}: {
  tasks: Task[];
  toggle: (id: number) => void;
  add: () => void;
  onOpen: (task: Task) => void;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <p className="text-xs text-slate-500">PROJECT PLAN</p>
            <h2 className="font-semibold">Tasks</h2>
          </div>
          <Button onClick={add}>
            <Plus />
            Add task
          </Button>
        </div>
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" aria-label="Complete" />
              <TableHead>Task</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((t) => (
              <TableRow key={t.id} className="cursor-pointer" onClick={() => onOpen(t)}>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggle(t.id);
                    }}
                    aria-label={t.status === "Done" ? "Reopen task" : "Mark task complete"}
                  >
                    <CheckCircle2
                      className={`size-5 ${t.status === "Done" ? "fill-emerald-500 text-emerald-500" : "text-slate-300"}`}
                    />
                  </Button>
                </TableCell>
                <TableCell
                  className={`max-w-[340px] whitespace-normal font-medium ${t.status === "Done" ? "text-slate-400 line-through" : ""}`}
                >
                  <button onClick={() => onOpen(t)} className="text-left hover:text-blue-700">
                    {t.title}
                  </button>
                </TableCell>
                <TableCell>{t.assignee}</TableCell>
                <TableCell className="text-slate-500">{t.due}</TableCell>
                <TableCell>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${t.priority === "Urgent" ? "bg-rose-50 text-rose-700" : t.priority === "High" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}
                  >
                    {t.priority}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${t.status === "Done" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                  >
                    {t.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
function Timeline({ tasks, onOpen }: { tasks: Task[]; onOpen: (task: Task) => void }) {
  const [showForecast, setShowForecast] = useState(true);
  const [selectedId, setSelectedId] = useState(1);
  const schedule = [
    { taskId: 5, lane: "Validation operations", start: 0, planned: 4, forecast: 2, confidence: 92 },
    { taskId: 3, lane: "Thermal validation", start: 5, planned: 7, forecast: 10, confidence: 68 },
    { taskId: 1, lane: "Battery enclosure", start: 12, planned: 8, forecast: 15, confidence: 58 },
    { taskId: 2, lane: "Supply & test build", start: 21, planned: 5, forecast: 11, confidence: 54 },
    { taskId: 4, lane: "Program management", start: 31, planned: 6, forecast: 10, confidence: 64 },
  ]
    .map((item) => ({ ...item, task: tasks.find((task) => task.id === item.taskId) }))
    .filter((item): item is typeof item & { task: Task } => Boolean(item.task));
  const selected = schedule.find((item) => item.taskId === selectedId) ?? schedule[0];
  const weeks = ["Aug 5", "Aug 12", "Aug 19", "Aug 26", "Sep 2", "Sep 9", "Sep 16", "Sep 23"];
  const totalDays = 56;
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div>
            <p className="text-xs text-slate-500">DELIVERY PLAN</p>
            <h2 className="text-lg font-semibold">Interactive schedule</h2>
            <p className="mt-1 text-sm text-slate-500">
              Planned work is solid; forecasted timing appears as a dotted extension or recovered
              time.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4 accent-blue-600"
              checked={showForecast}
              onChange={(event) => setShowForecast(event.target.checked)}
            />{" "}
            Show forecasted finish
          </label>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 border-y bg-slate-50 px-5 py-3 text-xs text-slate-600">
          <span className="inline-flex items-center gap-2">
            <i className="block h-2 w-5 rounded bg-blue-600" /> Planned duration
          </span>
          <span className="inline-flex items-center gap-2">
            <i className="block h-2 w-5 rounded border-2 border-dashed border-rose-500" />{" "}
            Forecasted extension
          </span>
          <span className="inline-flex items-center gap-2">
            <i className="block h-2 w-5 rounded border-2 border-dashed border-emerald-500" />{" "}
            Forecasted early finish
          </span>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[300px_1fr] border-b">
              <div className="p-4 text-xs font-medium text-slate-500">TASK / WORKSTREAM</div>
              <div className="grid grid-cols-8">
                {weeks.map((week, index) => (
                  <div
                    key={week}
                    className={`border-l p-3 text-center text-xs font-medium text-slate-500 ${index === 6 ? "bg-blue-50 text-blue-700" : ""}`}
                  >
                    {week}
                    {index === 6 && (
                      <span className="mt-1 block text-[10px]">Alpha crash test</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {schedule.map((item) => {
              const plannedRight = item.start + item.planned;
              const delta = item.forecast - item.planned;
              const left = `${(item.start / totalDays) * 100}%`;
              const plannedWidth = `${(item.planned / totalDays) * 100}%`;
              const forecastLeft = `${((delta > 0 ? plannedRight : item.start + item.forecast) / totalDays) * 100}%`;
              const forecastWidth = `${(Math.abs(delta) / totalDays) * 100}%`;
              const selectedRow = selected?.taskId === item.taskId;
              return (
                <div
                  key={item.taskId}
                  className={`grid grid-cols-[300px_1fr] border-b ${selectedRow ? "bg-blue-50/40" : ""}`}
                >
                  <button
                    className="p-4 text-left hover:bg-slate-50"
                    onClick={() => setSelectedId(item.taskId)}
                  >
                    <span className="block font-medium">{item.task.title}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {item.lane} · {item.confidence}% likely on time
                    </span>
                  </button>
                  <button
                    className="relative min-h-[72px] overflow-hidden border-l bg-[linear-gradient(to_right,transparent_calc(12.5%-1px),#e2e8f0_calc(12.5%-1px),#e2e8f0_12.5%,transparent_12.5%)] bg-[length:12.5%_100%]"
                    onClick={() => setSelectedId(item.taskId)}
                    aria-label={`Select ${item.task.title}`}
                  >
                    <span
                      className={`absolute top-6 h-5 rounded bg-blue-600 shadow-sm ${selectedRow ? "ring-2 ring-blue-300" : ""}`}
                      style={{ left, width: plannedWidth }}
                    >
                      <small className="absolute left-2 top-0.5 whitespace-nowrap text-[10px] font-semibold text-white">
                        {item.planned}d planned
                      </small>
                    </span>
                    {showForecast && delta !== 0 && (
                      <span
                        className={`absolute top-6 h-5 rounded border-2 border-dashed ${delta > 0 ? "border-rose-500 bg-rose-50/70" : "border-emerald-500 bg-emerald-50/70"}`}
                        style={{ left: forecastLeft, width: forecastWidth }}
                      >
                        <small
                          className={`absolute left-1 top-0.5 whitespace-nowrap text-[10px] font-semibold ${delta > 0 ? "text-rose-700" : "text-emerald-700"}`}
                        >
                          {delta > 0 ? `+${delta}d forecast` : `${delta}d early`}
                        </small>
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        {selected && (
          <div className="grid gap-4 border-t bg-slate-50 p-5 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <div>
              <p className="text-xs text-slate-500">SELECTED TASK</p>
              <b className="mt-1 block text-sm">{selected.task.title}</b>
            </div>
            <div>
              <p className="text-xs text-slate-500">PLANNED FINISH</p>
              <b className="mt-1 block text-sm">
                {selected.task.due} · {selected.planned} days
              </b>
            </div>
            <div>
              <p className="text-xs text-slate-500">FORECASTED FINISH</p>
              <b
                className={`mt-1 block text-sm ${selected.forecast > selected.planned ? "text-rose-700" : "text-emerald-700"}`}
              >
                {selected.forecast > selected.planned
                  ? `+${selected.forecast - selected.planned} days after plan`
                  : `${selected.planned - selected.forecast} days ahead of plan`}
              </b>
              <span className="text-xs text-slate-500">
                {selected.confidence}% likely by the planned date
              </span>
            </div>
            <Button className="self-center" variant="outline" onClick={() => onOpen(selected.task)}>
              Open task
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
function Forecasts({
  project,
  onOpenEvidence,
}: {
  project: (typeof seedProjects)[number];
  onOpenEvidence: () => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[
        { q: project.topForecast, p: project.topForecastProbability },
        { q: `${project.nextMilestone} completes on schedule`, p: project.confidence },
        { q: "Supplier allocation is confirmed this week", p: 58 },
      ].map((x) => (
        <Card key={x.q} className="transition hover:border-blue-200 hover:shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-blue-600">OPEN FORECAST</p>
            <h2 className="mt-2 font-semibold">{x.q}</h2>
            <p className="mt-4 text-3xl font-bold">{x.p}%</p>
            <div className="mt-2 h-2 rounded bg-slate-100">
              <div className="h-full rounded bg-blue-600" style={{ width: `${x.p}%` }} />
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Evidence updated today · {project.forecasters} forecasters contributing
            </p>
            <Button variant="link" className="mt-2 px-0" onClick={onOpenEvidence}>
              Inspect evidence <ChevronRight />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
function Resources({
  items,
  onLink,
  onOpen,
}: {
  items: string[];
  onLink: () => void;
  onOpen: (name: string) => void;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex justify-between border-b p-5">
          <div>
            <p className="text-xs text-slate-500">CONNECTED KNOWLEDGE</p>
            <h2 className="font-semibold">Resources</h2>
          </div>
          <Button variant="outline" onClick={onLink}>
            <Plus />
            Link resource
          </Button>
        </div>
        {items.map((r, i) => (
          <button
            key={r}
            onClick={() => onOpen(r)}
            className="flex w-full items-center gap-3 border-b p-4 text-left last:border-0 hover:bg-slate-50"
          >
            <span className="rounded bg-blue-50 p-2 text-blue-700">
              {i === 1 ? <Folder className="size-4" /> : <FileText className="size-4" />}
            </span>
            <div>
              <p className="font-medium">{r}</p>
              <p className="text-xs text-slate-500">Google Drive · Updated {i + 1}h ago</p>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
function Risks({
  project,
  onReview,
}: {
  project: (typeof seedProjects)[number];
  onReview: (risk: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {project.risks.map((r, i) => (
        <Card key={r}>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-rose-600">
              {i === 0 ? "HIGH" : "MEDIUM"} RISK
            </p>
            <h2 className="mt-2 font-semibold">{r}</h2>
            <p className="mt-2 text-sm text-slate-600">
              This dependency is affecting the on-time delivery forecast. Assign an owner and link
              the next evidence update.
            </p>
            <Button variant="link" className="mt-2 px-0" onClick={() => onReview(r)}>
              Review signals <ChevronRight />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
function Decisions() {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs text-slate-500">DECISION LOG</p>
        <h2 className="font-semibold">Pending decisions</h2>
        {[
          "Approve reinforcement design path",
          "Confirm supplier material allocation",
          "Set beta build contingency threshold",
        ].map((x, i) => (
          <div key={x} className="mt-4 border-l-2 border-amber-300 pl-3">
            <p className="font-medium">{x}</p>
            <p className="text-sm text-slate-500">
              Owner: {i === 0 ? "Maya Chen" : "Program leadership"} · Needed this week
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
function Activity({ compact = false }: { compact?: boolean }) {
  const x = [
    "Thermal model review added to forecast evidence",
    "Maya Chen assigned a readiness review task",
    "Supplier dashboard updated with a new allocation date",
    "Forecast confidence recalculated after evidence review",
  ];
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs text-slate-500">LATEST</p>
        <h2 className="font-semibold">Project activity</h2>
        {x.slice(0, compact ? 3 : 4).map((a, i) => (
          <div className="mt-4 flex gap-3 text-sm" key={a}>
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-500" />
            <p>
              {a}
              <small className="block text-slate-500">{i + 1} hours ago</small>
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TaskDrawer({
  task,
  project,
  onClose,
  onToggle,
  onEvidence,
}: {
  task: Task | null;
  project: (typeof seedProjects)[number];
  onClose: () => void;
  onToggle: (id: number) => void;
  onEvidence: () => void;
}) {
  if (!task) return null;
  const complete = task.status === "Done";
  return (
    <Drawer open={Boolean(task)} onOpenChange={(open) => !open && onClose()} swipeDirection="right">
      <DrawerContent className="w-full sm:[--drawer-content-width:44rem]">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <DrawerHeader className="flex-row items-start justify-between border-b p-6">
            <div>
              <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase">
                Task · {project.name}
              </p>
              <DrawerTitle className="mt-2 text-xl leading-7">{task.title}</DrawerTitle>
              <DrawerDescription className="mt-2">
                Track delivery, evidence, and forecast exposure in one place.
              </DrawerDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close task details">
              <X />
            </Button>
          </DrawerHeader>
          <div className="space-y-6 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium">
                {task.status}
              </span>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                {task.priority}
              </span>
              <span className="text-sm text-slate-500">
                Assigned to {task.assignee} · Due {task.due}
              </span>
            </div>
            <section>
              <h3 className="font-semibold">Forecast intelligence</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                This task feeds the {project.nextMilestone} delivery forecast. Current evidence
                indicates a {task.priority === "Urgent" ? "58%" : "74%"} likelihood of completion by
                the planned due date.
              </p>
              <div className="mt-4 rounded-lg border bg-blue-50 p-4">
                <p className="font-medium">Completion unblocks the next milestone</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: task.priority === "Urgent" ? "62%" : "74%" }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  Forecast updates whenever linked evidence changes.
                </p>
              </div>
              <Button variant="link" className="mt-2 px-0" onClick={onEvidence}>
                View forecast evidence <ChevronRight />
              </Button>
            </section>
            <section>
              <h3 className="font-semibold">Signals & evidence</h3>
              <div className="mt-3 divide-y rounded-lg border">
                <div className="p-4">
                  <p className="font-medium">Thermal model review · Aug 8</p>
                  <p className="mt-1 text-sm text-slate-600">
                    A reinforcement tradeoff lowered the task’s on-time forecast by 8 points.
                  </p>
                </div>
                <div className="p-4">
                  <p className="font-medium">Supplier readiness update</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Test-article material allocation remains pending confirmation.
                  </p>
                </div>
              </div>
            </section>
            <section>
              <h3 className="font-semibold">Subtasks</h3>
              <div className="mt-3 space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked /> Confirm reinforcement geometry
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" /> Align material release
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" /> Record review decision
                </label>
              </div>
            </section>
          </div>
          <DrawerFooter className="flex-row justify-end border-t bg-slate-50 p-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => onToggle(task.id)}>
              <CheckCircle2 />
              {complete ? "Reopen task" : "Mark complete"}
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function ForecastEvidenceDrawer({
  open,
  project,
  onClose,
}: {
  open: boolean;
  project: (typeof seedProjects)[number];
  onClose: () => void;
}) {
  const evidence = [
    {
      source: "Thermal model review",
      time: "Aug 8 · 10:42 AM",
      impact: "−8 pts",
      tone: "text-rose-700 bg-rose-50",
      detail:
        "The revised thermal model surfaced a reinforcement tradeoff that may compromise side-impact energy absorption.",
    },
    {
      source: "Supplier readiness update",
      time: "Aug 7 · 4:15 PM",
      impact: "−3 pts",
      tone: "text-rose-700 bg-rose-50",
      detail:
        "Material allocation remains unconfirmed, reducing the buffer before the alpha test build.",
    },
    {
      source: "Fixture calibration cleared",
      time: "Aug 7 · 9:18 AM",
      impact: "+2 pts",
      tone: "text-emerald-700 bg-emerald-50",
      detail: "The validation lab cleared fixture calibration, removing a readiness blocker.",
    },
  ];
  return (
    <Drawer open={open} onOpenChange={(next) => !next && onClose()} swipeDirection="right">
      <DrawerContent className="w-full sm:[--drawer-content-width:44rem]">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <DrawerHeader className="flex-row items-start justify-between border-b p-6">
            <div>
              <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase">
                Forecast evidence · {project.name}
              </p>
              <DrawerTitle className="mt-2 text-xl">
                Why is this forecast {project.topForecastProbability}%?
              </DrawerTitle>
              <DrawerDescription className="mt-2">
                The latest signals and their directional impact on the key project forecast.
              </DrawerDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close forecast evidence"
            >
              <X />
            </Button>
          </DrawerHeader>
          <div className="space-y-3 p-6">
            {evidence.map((item) => (
              <article key={item.source} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium">{item.source}</h3>
                    <p className="mt-1 text-xs text-slate-500">{item.time}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.tone}`}>
                    {item.impact}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.detail}</p>
                <p className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500">
                  <FileText className="size-3" /> Forecast-relevant evidence
                </p>
              </article>
            ))}
          </div>
          <DrawerFooter className="flex-row justify-end border-t bg-slate-50 p-4">
            <Button onClick={onClose}>Done</Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
