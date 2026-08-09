import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

declare global {
  interface String {
    replaceAll(searchValue: string | RegExp, replaceValue: string): string;
  }
}

type Tab =
  | "Overview"
  | "Tasks"
  | "Timeline"
  | "Forecasts"
  | "Resources"
  | "Risks"
  | "Decisions"
  | "Activity";
type ResourceType = "Drive" | "OneDrive" | "Folder" | "Document" | "Dashboard";

const PROJECT_TOAST_EVENT = "project-workspace-toast";

function projectToast(message: string) {
  window.dispatchEvent(new CustomEvent<string>(PROJECT_TOAST_EVENT, { detail: message }));
}

type Resource = {
  id: number;
  name: string;
  type: ResourceType;
  source: string;
  owner: string;
  updated: string;
  summary: string;
};
type Task = {
  id: number;
  title: string;
  status: "Backlog" | "In progress" | "In review" | "Done";
  assignee: string;
  initials: string;
  due: string;
  priority: "Urgent" | "High" | "Medium" | "Low";
};

const projectNames: Record<
  string,
  {
    name: string;
    industry: string;
    phase: string;
    confidence: number;
    health: string;
    color: string;
    owner: string;
    initials: string;
    target: string;
  }
> = {
  "atlas-ev": {
    name: "Atlas EV Platform",
    industry: "Automotive",
    phase: "Prototype validation",
    confidence: 64,
    health: "Watch",
    color: "#5b65d8",
    owner: "Maya Chen",
    initials: "MC",
    target: "Sep 18, 2026",
  },
  northstar: {
    name: "Northstar Billing Migration",
    industry: "Software",
    phase: "Limited rollout",
    confidence: 87,
    health: "On track",
    color: "#2478e5",
    owner: "Eli Navarro",
    initials: "EN",
    target: "Aug 28, 2026",
  },
  harborline: {
    name: "Harborline Residences",
    industry: "Real estate",
    phase: "Structural construction",
    confidence: 43,
    health: "At risk",
    color: "#b36a25",
    owner: "Leila Morgan",
    initials: "LM",
    target: "Nov 12, 2026",
  },
  tundra: {
    name: "Tundra Carbon Capture Pilot",
    industry: "Climate infrastructure",
    phase: "Detailed engineering",
    confidence: 78,
    health: "On track",
    color: "#178766",
    owner: "Ravi Shah",
    initials: "RS",
    target: "Oct 2, 2026",
  },
  iris: {
    name: "Iris Oncology Assay",
    industry: "Biotechnology",
    phase: "Clinical validation",
    confidence: 67,
    health: "Watch",
    color: "#a74991",
    owner: "Dr. Nia Okafor",
    initials: "NO",
    target: "Sep 30, 2026",
  },
  kestrel: {
    name: "Kestrel Earth Observation-1",
    industry: "Aerospace",
    phase: "Integration & test",
    confidence: 49,
    health: "At risk",
    color: "#465270",
    owner: "Jon Bell",
    initials: "JB",
    target: "Aug 24, 2026",
  },
  forge: {
    name: "Forge Line 4 Automation",
    industry: "Manufacturing",
    phase: "Site acceptance testing",
    confidence: 82,
    health: "On track",
    color: "#687067",
    owner: "Samira Patel",
    initials: "SP",
    target: "Aug 19, 2026",
  },
  solace: {
    name: "Solace Rural Care Network",
    industry: "Healthcare",
    phase: "Clinic rollout",
    confidence: 54,
    health: "At risk",
    color: "#cf4e5c",
    owner: "Ada Williams",
    initials: "AW",
    target: "Sep 8, 2026",
  },
};

const defaultProject = projectNames["atlas-ev"];

const initialResources: Resource[] = [
  {
    id: 1,
    name: "Atlas program hub",
    type: "Drive",
    source: "Google Drive",
    owner: "Maya Chen",
    updated: "8 min ago",
    summary: "Charter, current scope, supplier briefs, and weekly executive updates.",
  },
  {
    id: 2,
    name: "Vehicle architecture & CAD",
    type: "Folder",
    source: "PLM network folder",
    owner: "Avery Li",
    updated: "Today",
    summary: "Vehicle package, battery enclosure revisions, and interface-control documents.",
  },
  {
    id: 3,
    name: "Validation evidence index",
    type: "Document",
    source: "Google Drive",
    owner: "Priya Raman",
    updated: "Yesterday",
    summary: "Test plans, lab results, requirements traceability, and unresolved findings.",
  },
  {
    id: 4,
    name: "Supplier readiness dashboard",
    type: "Dashboard",
    source: "Power BI",
    owner: "Owen Brooks",
    updated: "Yesterday",
    summary: "Tooling, quality, PPAP, and capacity signals across the launch supply base.",
  },
  {
    id: 5,
    name: "Battery supplier negotiations",
    type: "OneDrive",
    source: "OneDrive",
    owner: "Maya Chen",
    updated: "Aug 6",
    summary: "Commercial scenarios, redlines, capacity assumptions, and meeting notes.",
  },
];

const initialTasks: Task[] = [
  {
    id: 1,
    title: "Close battery enclosure reinforcement design",
    status: "In progress",
    assignee: "Avery Li",
    initials: "AL",
    due: "Aug 13",
    priority: "Urgent",
  },
  {
    id: 2,
    title: "Confirm side-impact test article build schedule",
    status: "In progress",
    assignee: "Daria Cole",
    initials: "DC",
    due: "Aug 14",
    priority: "High",
  },
  {
    id: 3,
    title: "Review thermal model assumptions with cell supplier",
    status: "In review",
    assignee: "Owen Brooks",
    initials: "OB",
    due: "Aug 12",
    priority: "High",
  },
  {
    id: 4,
    title: "Publish alpha crash-test readiness review",
    status: "Backlog",
    assignee: "Maya Chen",
    initials: "MC",
    due: "Aug 19",
    priority: "Medium",
  },
  {
    id: 5,
    title: "Upload fixture calibration certificates",
    status: "Done",
    assignee: "Nia James",
    initials: "NJ",
    due: "Aug 8",
    priority: "Low",
  },
];

function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const shapes: Record<string, JSX.Element> = {
    chevron: <path d="m9 18 6-6-6-6" />,
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
        <path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6M8 13h8M8 17h6" />
      </>
    ),
    folder: (
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    ),
    drive: (
      <>
        <path d="m8 3 4 7-4 7-4-7 4-7ZM16 3l4 7-4 7-4-7 4-7Z" />
        <path d="M8 17h8" />
      </>
    ),
    chat: (
      <>
        <path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 9 9 0 0 1-3.8-.8L4 20l1.3-3.7A7 7 0 1 1 20 11.5Z" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4M17 3v4M3 10h18" />
      </>
    ),
    bolt: <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />,
    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    warning: (
      <>
        <path d="M12 3 2.5 20h19L12 3Z" />
        <path d="M12 9v5M12 17h.01" />
      </>
    ),
    trend: (
      <>
        <path d="m4 17 5-5 4 3 7-9" />
        <path d="M15 6h5v5" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4 20-7Z" />
        <path d="m11 13 4-4" />
      </>
    ),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {shapes[name]}
    </svg>
  );
}

function ResourceIcon({ type }: { type: ResourceType }) {
  const icon = type === "Folder" ? "folder" : type === "Drive" ? "drive" : "file";
  return (
    <span className={`project-resource-icon ${type.toLowerCase()}`}>
      <Icon name={icon} />
    </span>
  );
}

type CopilotRequest = { prompt: string; id: number };

function copilotAnswer(prompt: string) {
  const normalized = prompt.toLowerCase();
  if (normalized.includes("schedule") || normalized.includes("overrun") || normalized.includes("timeline")) return "The schedule risk is concentrated in a three-step chain: thermal review → reinforcement design → test-article build. Current forecasting implies the alpha crash-test path is likely to consume 6–11 days of buffer. I would protect the thermal review decision and confirm material allocation before the end of this week.";
  if (normalized.includes("forecast") || normalized.includes("probability") || normalized.includes("evidence")) return "The largest probability movement came from the thermal model review, which lowered first-pass side-impact success by 8 points. That signal is high-confidence because it changes a direct design constraint. Supplier allocation is the next most decision-relevant uncertainty.";
  if (normalized.includes("task") || normalized.includes("unblock") || normalized.includes("reinforcement")) return "The most valuable next action is to close the reinforcement design decision. It is linked to three open forecasts and blocks the crash-test article schedule. A focused design review with thermal and supplier owners should reduce uncertainty faster than adding more status meetings.";
  return "I see two material uncertainties: whether the enclosure can meet side-impact requirements without rework, and whether supplier allocation will hold. I recommend treating the reinforcement review as the immediate decision point, then reassessing the alpha crash-test forecast with the result.";
}

function Chatbot({ projectName, activeTab, request, onCreateTask }: { projectName: string; activeTab: Tab; request: CopilotRequest | null; onCreateTask: () => void }) {
  const [messages, setMessages] = useState([{ id: 1, from: "bot", text: `I’m tracking ${projectName} across plans, delivery signals, and 18 active forecasts. What would you like to understand?` }]);
  const [input, setInput] = useState("");
  const lastRequest = useRef<number | null>(null);
  const suggestions = activeTab === "Timeline" ? ["Which overruns threaten Alpha?", "Explain this dependency chain"] : activeTab === "Forecasts" ? ["Explain the largest probability move", "What forecast coverage is missing?"] : activeTab === "Tasks" ? ["Which task should I unblock?", "Draft a recovery plan"] : ["What needs attention?", "Summarize delivery risks"];
  const addConversation = (text: string) => setMessages((current) => [...current, { id: Date.now(), from: "user", text }, { id: Date.now() + 1, from: "bot", text: copilotAnswer(text) }]);
  useEffect(() => {
    if (!request || lastRequest.current === request.id) return;
    lastRequest.current = request.id;
    setInput("");
    addConversation(request.prompt);
  }, [request]);
  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    addConversation(text);
    setInput("");
  };
  return (
    <aside className="project-copilot">
      <div className="project-copilot-head">
        <div className="project-copilot-mark">
          <Icon name="bolt" />
        </div>
        <div>
          <strong>Project copilot</strong>
          <span>Watching {activeTab.toLowerCase()} · grounded in project context</span>
        </div>
        <button title="Clear copilot conversation" onClick={() => { setMessages([{ id: Date.now(), from: "bot", text: "Conversation cleared. I’m still monitoring the project context." }]); projectToast("Copilot conversation cleared"); }}>
          <Icon name="more" />
        </button>
      </div>
      <div className="project-chat-messages">
        {messages.map((message) => (
          <div className={`project-message ${message.from}`} key={message.id}>
            {message.from === "bot" && <span className="project-bot-avatar">S</span>}
            <p>{message.text}</p>
          </div>
        ))}
      </div>
      <div className="project-suggestions">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => setInput(suggestion)}>{suggestion}</button>)}</div>
      <button className="project-agent-action" onClick={() => { onCreateTask(); setMessages((current) => [...current, { id: Date.now(), from: "bot", text: "I added a High-priority follow-up to confirm the battery supplier’s material allocation. It is linked to the test-article readiness forecast." }]); }}><Icon name="plus" /> Create recommended follow-up</button>
      <form className="project-chat-input" onSubmit={send}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about this project…"
        />
        <button type="submit" aria-label="Send message">
          <Icon name="send" />
        </button>
      </form>
    </aside>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const project = projectNames[id ?? ""] ?? defaultProject;
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [resources, setResources] = useState(initialResources);
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [forecastEvidenceOpen, setForecastEvidenceOpen] = useState(false);
  const [copilotRequest, setCopilotRequest] = useState<CopilotRequest | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [resourceModal, setResourceModal] = useState(false);
  const [taskModal, setTaskModal] = useState(false);
  const tabs: Tab[] = [
    "Overview",
    "Tasks",
    "Timeline",
    "Forecasts",
    "Resources",
    "Risks",
    "Decisions",
    "Activity",
  ];
  useEffect(() => {
    const handleToast = (event: Event) => setToast((event as CustomEvent<string>).detail);
    window.addEventListener(PROJECT_TOAST_EVENT, handleToast);
    return () => window.removeEventListener(PROJECT_TOAST_EVENT, handleToast);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  const taskCounts = useMemo(
    () => ({
      open: tasks.filter((task) => task.status !== "Done").length,
      done: tasks.filter((task) => task.status === "Done").length,
    }),
    [tasks],
  );

  const addResource = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setResources((current) => [
      {
        id: Date.now(),
        name: String(data.get("name") || "Untitled resource"),
        type: data.get("type") as ResourceType,
        source: String(data.get("source") || "Connected folder"),
        owner: "You",
        updated: "Just now",
        summary: String(data.get("summary") || "Linked project resource."),
      },
      ...current,
    ]);
    setResourceModal(false);
  };
  const addTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setTasks((current) => [
      {
        id: Date.now(),
        title: String(data.get("title") || "Untitled task"),
        status: "Backlog",
        assignee: String(data.get("assignee") || "Unassigned"),
        initials: String(data.get("assignee") || "UA")
          .split(" ")
          .map((part) => part[0])
          .slice(0, 2)
          .join("")
          .toUpperCase(),
        due: String(data.get("due") || "No due date"),
        priority: data.get("priority") as Task["priority"],
      },
      ...current,
    ]);
    setTaskModal(false);
  };
  const completeTask = (taskId: number) =>
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? { ...task, status: task.status === "Done" ? "In progress" : "Done" }
          : task,
      ),
    );
  const askCopilot = (prompt: string) => setCopilotRequest({ prompt, id: Date.now() });
  const createRecommendedTask = () => setTasks((current) => [{ id: Date.now(), title: "Confirm battery supplier material allocation", status: "Backlog", assignee: "Owen Brooks", initials: "OB", due: "Aug 15", priority: "High" }, ...current]);

  return (
    <main className="project-page">
      <div className="project-breadcrumb">
        <Link to="/projects">Projects</Link>
        <Icon name="chevron" size={13} />
        <span>{project.name}</span>
      </div>
      <header className="project-head">
        <div className="project-title-row">
          <div
            className="project-logo"
            style={{ background: `${project.color}14`, color: project.color }}
          >
            {project.initials}
          </div>
          <div>
            <div className="project-meta">
              {project.industry} · {project.phase}
            </div>
            <h1>{project.name}</h1>
            <div className="project-head-details">
              <span className={`project-health ${project.health.toLowerCase().replace(" ", "-")}`}>
                {project.health}
              </span>
              <span>
                <Icon name="calendar" /> Target {project.target}
              </span>
              <span>
                <span className="project-avatar" style={{ background: project.color }}>
                  {project.initials}
                </span>
                {project.owner}
              </span>
            </div>
          </div>
        </div>
        <div className="project-head-actions">
          <button className="project-secondary" onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/projects/${id ?? "atlas-ev"}`).catch(() => undefined); projectToast("Project link copied to clipboard"); }}>
            <Icon name="link" /> Share
          </button>
          <button className="project-secondary" onClick={() => setProjectMenuOpen((open) => !open)} aria-label="Project actions">
            <Icon name="more" />
          </button>
          <button className="project-primary" onClick={() => setTaskModal(true)}>
            <Icon name="plus" /> Add task
          </button>
          {projectMenuOpen && <div className="project-action-menu"><button onClick={() => { setProjectMenuOpen(false); projectToast("Project settings opened in this mock workspace"); }}>Project settings</button><button onClick={() => { setProjectMenuOpen(false); projectToast("A duplicate project draft has been created"); }}>Duplicate project</button><button className="danger" onClick={() => { setProjectMenuOpen(false); projectToast("Project archived. You can restore it from the Projects list."); }}>Archive project</button></div>}
        </div>
      </header>
      <nav className="project-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? "active" : ""}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab === "Tasks" && <span>{taskCounts.open}</span>}
            {tab === "Resources" && <span>{resources.length}</span>}
          </button>
        ))}
      </nav>

      <div className="project-layout">
        <section className="project-content">
          {activeTab === "Overview" && (
            <OverviewTab
              project={project}
              tasks={tasks}
              onTaskClick={() => setActiveTab("Tasks")}
              onViewEvidence={() => setForecastEvidenceOpen(true)}
              onAskCopilot={askCopilot}
              onActivityClick={() => setActiveTab("Activity")}
            />
          )}
          {activeTab === "Tasks" && (
            <TasksTab
              tasks={tasks}
              onComplete={completeTask}
              onAdd={() => setTaskModal(true)}
              onOpen={setSelectedTask}
            />
          )}
          {activeTab === "Timeline" && <TimelineTab tasks={tasks} onOpen={setSelectedTask} />}
          {activeTab === "Forecasts" && <ForecastsTab />}
          {activeTab === "Resources" && (
            <ResourcesTab resources={resources} onAdd={() => setResourceModal(true)} />
          )}
          {activeTab === "Risks" && <RisksTab />}
          {activeTab === "Decisions" && <DecisionsTab />}
          {activeTab === "Activity" && <ActivityTab />}
        </section>
        <Chatbot projectName={project.name} activeTab={activeTab} request={copilotRequest} onCreateTask={createRecommendedTask} />
      </div>

      {resourceModal && (
        <Modal
          title="Link a project resource"
          eyebrow="Project resources"
          onClose={() => setResourceModal(false)}
        >
          <p className="project-modal-intro">
            Connect a folder, document, or dashboard so your team and copilot can find the current
            source of truth.
          </p>
          <form onSubmit={addResource} className="project-form">
            <label>
              <span>Resource name</span>
              <input name="name" required placeholder="e.g. Program shared drive" autoFocus />
            </label>
            <div className="project-form-grid">
              <label>
                <span>Resource type</span>
                <select name="type">
                  <option>Drive</option>
                  <option>OneDrive</option>
                  <option>Folder</option>
                  <option>Document</option>
                  <option>Dashboard</option>
                </select>
              </label>
              <label>
                <span>Provider / location</span>
                <input name="source" placeholder="Google Drive, OneDrive, network folder…" />
              </label>
            </div>
            <label>
              <span>What is in it?</span>
              <textarea
                name="summary"
                placeholder="A short description helps people find the right source."
              />
            </label>
            <div className="project-modal-actions">
              <button
                type="button"
                className="project-secondary"
                onClick={() => setResourceModal(false)}
              >
                Cancel
              </button>
              <button className="project-primary" type="submit">
                <Icon name="link" /> Link resource
              </button>
            </div>
          </form>
        </Modal>
      )}
      {taskModal && (
        <Modal title="Create task" eyebrow="Project planning" onClose={() => setTaskModal(false)}>
          <form onSubmit={addTask} className="project-form">
            <label>
              <span>Task title</span>
              <input name="title" required placeholder="What needs to happen?" autoFocus />
            </label>
            <div className="project-form-grid">
              <label>
                <span>Assignee</span>
                <input name="assignee" placeholder="Name" />
              </label>
              <label>
                <span>Due date</span>
                <input name="due" placeholder="e.g. Aug 22" />
              </label>
              <label>
                <span>Priority</span>
                <select name="priority">
                  <option>Medium</option>
                  <option>Urgent</option>
                  <option>High</option>
                  <option>Low</option>
                </select>
              </label>
            </div>
            <div className="project-modal-actions">
              <button
                type="button"
                className="project-secondary"
                onClick={() => setTaskModal(false)}
              >
                Cancel
              </button>
              <button className="project-primary" type="submit">
                <Icon name="plus" /> Create task
              </button>
            </div>
          </form>
        </Modal>
      )}
      {selectedTask && (
        <TaskDrawer task={selectedTask} project={project} onClose={() => setSelectedTask(null)} onAskCopilot={askCopilot} />
      )}
      {forecastEvidenceOpen && (
        <ForecastEvidenceDrawer project={project} onClose={() => setForecastEvidenceOpen(false)} />
      )}
      {toast && <div className="project-toast" role="status"><Icon name="check" /> {toast}<button onClick={() => setToast(null)} aria-label="Dismiss notification">×</button></div>}
    </main>
  );
}

function SectionHead({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="project-section-head">
      <div>
        {eyebrow && <span>{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function OverviewTab({
  project,
  tasks,
  onTaskClick,
  onViewEvidence,
  onAskCopilot,
  onActivityClick,
}: {
  project: typeof defaultProject;
  tasks: Task[];
  onTaskClick: () => void;
  onViewEvidence: () => void;
  onAskCopilot: (prompt: string) => void;
  onActivityClick: () => void;
}) {
  return (
    <>
      <div className="project-summary-grid">
        <div className="project-summary-card project-confidence">
          <span>On-time delivery forecast</span>
          <strong>{project.confidence}%</strong>
          <small>
            <Icon name="trend" /> Down 7 pts this week
          </small>
          <div className="project-confidence-bar">
            <span style={{ width: `${project.confidence}%` }} />
          </div>
        </div>
        <div className="project-summary-card">
          <span>Next milestone</span>
          <strong className="project-summary-text">Alpha crash test</strong>
          <small>
            <Icon name="clock" /> 40 days remaining
          </small>
        </div>
        <div className="project-summary-card">
          <span>Forecast coverage</span>
          <strong className="project-summary-text">18 active questions</strong>
          <small>12 forecasters · 46 evidence items</small>
        </div>
      </div>
      <section className="project-panel project-forecast-panel">
        <div className="project-panel-icon">
          <Icon name="bolt" />
        </div>
        <div>
          <span>Forecast signal</span>
          <h3>Battery enclosure passing side-impact on the first attempt is now 61% likely.</h3>
          <p>
            The probability fell 9 points after the latest thermal-model review surfaced a
            reinforcement tradeoff. The forecast resolves September 18.
          </p>
          <button onClick={onViewEvidence}>
            View forecast evidence <Icon name="chevron" />
          </button>
        </div>
      </section>
      <section className="project-agent-briefing">
        <div className="project-agent-briefing-head">
          <div className="project-agent-briefing-mark"><Icon name="bolt" /></div>
          <div><span>Copilot review · just updated</span><h3>Two actions are most likely to protect the alpha crash-test date.</h3></div>
          <button onClick={() => onAskCopilot("Give me the full reasoning behind the recommended recovery plan")}>Explain reasoning <Icon name="chevron" /></button>
        </div>
        <div className="project-agent-recommendations">
          <button onClick={() => onAskCopilot("Assess the supplier allocation risk and recommend a concrete next action")}> <span>1</span><div><strong>Secure a supplier allocation decision</strong><p>Would reduce uncertainty in the test-article readiness forecast, now at 58%.</p></div><em>Highest leverage</em></button>
          <button onClick={() => onAskCopilot("Draft a focused recovery plan for the reinforcement design review")}> <span>2</span><div><strong>Hold a cross-functional reinforcement review</strong><p>Resolves the most material technical assumption behind the 61% side-impact forecast.</p></div><em>Decision needed</em></button>
        </div>
      </section>
      <div className="project-two-col">
        <section className="project-panel">
          <SectionHead
            eyebrow="This week"
            title="Sprint focus"
            action={
              <button className="project-text-button" onClick={onTaskClick}>
                View all tasks <Icon name="chevron" />
              </button>
            }
          />
          <div className="project-mini-tasks">
            {tasks
              .filter((task) => task.status !== "Done")
              .slice(0, 4)
              .map((task) => (
                <div key={task.id}>
                  <span className={`project-priority ${task.priority.toLowerCase()}`}></span>
                  <p>{task.title}</p>
                  <span className="project-mini-due">{task.due}</span>
                </div>
              ))}
          </div>
        </section>
        <section className="project-panel">
          <SectionHead eyebrow="Upcoming" title="Milestones" />
          <div className="project-milestones">
            <div>
              <span className="done">
                <Icon name="check" />
              </span>
              <p>
                <strong>Design freeze</strong>
                <small>Completed Aug 2</small>
              </p>
            </div>
            <div>
              <span className="active"></span>
              <p>
                <strong>Alpha crash test</strong>
                <small>Sep 18 · 61% likely on time</small>
              </p>
            </div>
            <div>
              <span></span>
              <p>
                <strong>Beta vehicle build</strong>
                <small>Nov 6 · Planning</small>
              </p>
            </div>
          </div>
        </section>
      </div>
      <section className="project-panel">
        <SectionHead
          eyebrow="Latest"
          title="Project activity"
          action={
              <button className="project-text-button" onClick={onActivityClick}>
              Open activity <Icon name="chevron" />
            </button>
          }
        />
        <ActivityItems limit={3} />
      </section>
    </>
  );
}

function TasksTab({
  tasks,
  onComplete,
  onAdd,
  onOpen,
}: {
  tasks: Task[];
  onComplete: (id: number) => void;
  onAdd: () => void;
  onOpen: (task: Task) => void;
}) {
  const [filter, setFilter] = useState<"all" | "mine" | "open">("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const visibleTasks = tasks.filter(
    (task) =>
      (filter === "mine" ? task.assignee === "Maya Chen" : filter === "open" ? task.status !== "Done" : true) &&
      (!query || task.title.toLowerCase().includes(query.toLowerCase())),
  );
  return (
    <>
      <SectionHead
        eyebrow="Project plan"
        title="Tasks"
        action={
          <button className="project-primary" onClick={onAdd}>
            <Icon name="plus" /> Add task
          </button>
        }
      />
      <div className="project-task-toolbar">
        <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
          All tasks <span>{tasks.length}</span>
        </button>
        <button className={filter === "mine" ? "active" : ""} onClick={() => setFilter("mine")}>My tasks</button>
        <button className={filter === "open" ? "active" : ""} onClick={() => setFilter("open")}>Open</button>
        <div />
        {searchOpen && <input className="project-inline-search" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" />}
        <button className="project-secondary" onClick={() => setSearchOpen((open) => !open)}>
          <Icon name="search" /> Search
        </button>
      </div>
      <div className="project-task-list">
        {visibleTasks.map((task) => (
          <article
            key={task.id}
            className={`project-task ${task.status === "Done" ? "done" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(task)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onOpen(task);
            }}
          >
            <button
              className="project-checkbox"
              onClick={(event) => {
                event.stopPropagation();
                onComplete(task.id);
              }}
              aria-label="Mark task complete"
            >
              {task.status === "Done" && <Icon name="check" />}
            </button>
            <div className="project-task-copy">
              <strong>{task.title}</strong>
              <span>
                {task.status} · Due {task.due}
              </span>
            </div>
            <span className={`project-priority-label ${task.priority.toLowerCase()}`}>
              {task.priority}
            </span>
            <div className="project-task-person">
              <span className="project-avatar">{task.initials}</span>
              {task.assignee}
            </div>
            <button
              className="project-row-more"
              onClick={(event) => {
                event.stopPropagation();
                onOpen(task);
              }}
              aria-label="Open task details"
            >
              <Icon name="more" />
            </button>
          </article>
        ))}
      </div>
    </>
  );
}

function TaskDrawer({
  task,
  project,
  onClose,
  onAskCopilot,
}: {
  task: Task;
  project: typeof defaultProject;
  onClose: () => void;
  onAskCopilot: (prompt: string) => void;
}) {
  const predictionSet =
    task.status === "Done"
      ? [
          {
            label: "Task was completed by its due date",
            value: 88,
            change: "+4 pts",
            tone: "positive",
          },
          {
            label: "Completion unblocks the next milestone",
            value: 76,
            change: "+7 pts",
            tone: "positive",
          },
        ]
      : [
          {
            label: "Task completes by its due date",
            value: task.priority === "Urgent" ? 58 : 74,
            change: task.priority === "Urgent" ? "−8 pts" : "+3 pts",
            tone: task.priority === "Urgent" ? "negative" : "positive",
          },
          {
            label: "Task resolves without material rework",
            value: task.priority === "Urgent" ? 46 : 71,
            change: task.priority === "Urgent" ? "−5 pts" : "No change",
            tone: task.priority === "Urgent" ? "negative" : "neutral",
          },
          {
            label: "Completion improves project on-time delivery",
            value: task.priority === "Urgent" ? 62 : 68,
            change: "+2 pts",
            tone: "positive",
          },
        ];
  return (
    <div className="task-drawer-backdrop" onMouseDown={onClose}>
      <aside
        className="task-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Task details: ${task.title}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="task-drawer-head">
          <div>
            <span className="task-drawer-kicker">Task · {project.name}</span>
            <h2>{task.title}</h2>
          </div>
          <button onClick={onClose} aria-label="Close task details">
            ×
          </button>
        </header>
        <div className="task-drawer-status">
          <span className={`project-priority-label ${task.priority.toLowerCase()}`}>
            {task.priority}
          </span>
          <button onClick={() => projectToast("Status picker opened — choose a new task state in the full workflow") }>
            {task.status} <Icon name="chevron" />
          </button>
        </div>
        <section className="task-drawer-section">
          <h3>Details</h3>
          <p className="task-drawer-description">
            Coordinate the latest design, supplier, and validation inputs. Capture the outcome and
            link evidence before the next readiness review.
          </p>
          <dl className="task-detail-grid">
            <div>
              <dt>Assignee</dt>
              <dd>
                <span className="project-avatar">{task.initials}</span>
                {task.assignee}
              </dd>
            </div>
            <div>
              <dt>Due date</dt>
              <dd>
                <Icon name="calendar" /> {task.due}
              </dd>
            </div>
            <div>
              <dt>Project impact</dt>
              <dd>Alpha crash test</dd>
            </div>
            <div>
              <dt>Forecast questions</dt>
              <dd>3 linked</dd>
            </div>
          </dl>
        </section>
        <section className="task-drawer-section task-forecast-section">
          <div className="task-section-heading">
            <div>
              <span>Forecast intelligence</span>
              <h3>Predictions for this task</h3>
            </div>
            <Link className="task-forecast-link" to="/q/q-atlas-side-impact">
              Open forecast <Icon name="chevron" />
            </Link>
          </div>
          <p className="task-forecast-intro">
            These forecasts update as project evidence changes. They show both task-level
            uncertainty and the likely effect on delivery.
          </p>
          <div className="task-prediction-list">
            {predictionSet.map((prediction, index) => {
              const questionId =
                index === 0
                  ? "q-atlas-test-article"
                  : index === 1
                    ? "q-atlas-thermal-rework"
                    : "q-atlas-side-impact";
              return (
                <Link
                  className="task-prediction-link"
                  to={`/q/${questionId}`}
                  key={prediction.label}
                >
                  <article>
                    <div>
                      <span className={`task-prediction-dot ${prediction.tone}`}></span>
                      <p>{prediction.label}</p>
                    </div>
                    <div>
                      <strong>{prediction.value}%</strong>
                      <small className={prediction.tone}>{prediction.change}</small>
                    </div>
                    <div className="task-prediction-bar">
                      <span style={{ width: `${prediction.value}%` }} />
                    </div>
                    <span className="task-prediction-open">
                      View forecast <Icon name="chevron" />
                    </span>
                  </article>
                </Link>
              );
            })}
          </div>
        </section>
        <section className="task-drawer-section">
          <div className="task-section-heading">
            <h3>Signals & evidence</h3>
            <button onClick={() => projectToast("Evidence link form opened for this task") }>
              Link evidence <Icon name="plus" />
            </button>
          </div>
          <p className="task-evidence-intro">
            Each signal is attached to a forecast. Open the linked question to inspect its
            probability history, full evidence set, and reasoning.
          </p>
          <div className="task-evidence">
            <article>
              <span className="task-evidence-icon">
                <Icon name="file" />
              </span>
              <div>
                <strong>Thermal model review · Aug 8</strong>
                <p>
                  Added a reinforcement tradeoff that lowered the task’s on-time forecast by 8
                  points.
                </p>
                <small>Forecast-relevant · High confidence</small>
                <Link to="/q/q-atlas-thermal-rework" className="task-evidence-forecast">
                  <span>Linked forecast</span> Enclosure requires material rework <b>46%</b>
                  <Icon name="chevron" />
                </Link>
              </div>
            </article>
            <article>
              <span className="task-evidence-icon folder">
                <Icon name="folder" />
              </span>
              <div>
                <strong>Supplier readiness update</strong>
                <p>Test-article material allocation is still pending confirmation.</p>
                <small>Forecast-relevant · Medium confidence</small>
                <Link to="/q/q-atlas-test-article" className="task-evidence-forecast">
                  <span>Linked forecast</span> Test article ready by Sep 8 <b>58%</b>
                  <Icon name="chevron" />
                </Link>
              </div>
            </article>
            <article>
              <span className="task-evidence-icon signal">
                <Icon name="trend" />
              </span>
              <div>
                <strong>Lab fixture calibration cleared · Aug 7</strong>
                <p>Removes a readiness blocker and supports the planned validation sequence.</p>
                <small>Forecast-relevant · Medium confidence</small>
                <Link to="/q/q-atlas-side-impact" className="task-evidence-forecast">
                  <span>Linked forecast</span> Side-impact test passes first attempt <b>61%</b>
                  <Icon name="chevron" />
                </Link>
              </div>
            </article>
          </div>
        </section>
        <section className="task-drawer-section">
          <div className="task-section-heading">
            <h3>Subtasks</h3>
            <button onClick={() => projectToast("New subtask row added to this task") }>
              <Icon name="plus" /> Add
            </button>
          </div>
          <div className="task-subtasks">
            <label>
              <input type="checkbox" defaultChecked /> Confirm reinforcement geometry
            </label>
            <label>
              <input type="checkbox" /> Align test-article material release
            </label>
            <label>
              <input type="checkbox" /> Record review decision and update forecast
            </label>
          </div>
        </section>
        <footer className="task-drawer-footer">
          <button className="project-secondary" onClick={onClose}>
            Close
          </button>
          <button className="project-primary" onClick={() => { onAskCopilot(`Assess the task “${task.title}”: give me the key risk, the next action, and its likely impact on the project schedule.`); onClose(); }}>
            <Icon name="chat" /> Ask copilot about task
          </button>
        </footer>
      </aside>
    </div>
  );
}

function ForecastEvidenceDrawer({
  project,
  onClose,
}: {
  project: typeof defaultProject;
  onClose: () => void;
}) {
  const evidence = [
    {
      source: "Thermal model review",
      time: "Aug 8 · 10:42 AM",
      impact: "−8 pts",
      confidence: "High confidence",
      kind: "file",
      detail:
        "The revised thermal model indicates the current reinforcement path may compromise side-impact energy absorption. A design tradeoff is now under review.",
      linked: "Atlas validation evidence index",
    },
    {
      source: "Supplier readiness update",
      time: "Aug 7 · 4:15 PM",
      impact: "−3 pts",
      confidence: "Medium confidence",
      kind: "folder",
      detail:
        "Test-article material allocation remains unconfirmed, narrowing the buffer before the alpha crash-test build.",
      linked: "Supplier readiness dashboard",
    },
    {
      source: "Fixture calibration cleared",
      time: "Aug 7 · 9:18 AM",
      impact: "+2 pts",
      confidence: "Medium confidence",
      kind: "trend",
      detail:
        "The validation lab cleared fixture calibration, removing one readiness blocker from the planned test sequence.",
      linked: "Validation evidence index",
    },
    {
      source: "Prior crash-test reference class",
      time: "Aug 5 · 2:30 PM",
      impact: "−1 pt",
      confidence: "Low confidence",
      kind: "file",
      detail:
        "Comparable programs suggest a first-pass success rate below the original internal estimate when thermal and impact requirements change concurrently.",
      linked: "Atlas program hub",
    },
  ];
  return (
    <div className="task-drawer-backdrop" onMouseDown={onClose}>
      <aside
        className="task-drawer forecast-evidence-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Forecast evidence"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="task-drawer-head">
          <div>
            <span className="task-drawer-kicker">Forecast evidence · {project.name}</span>
            <h2>Why is this forecast 61%?</h2>
          </div>
          <button onClick={onClose} aria-label="Close forecast evidence">
            ×
          </button>
        </header>
        <section className="forecast-evidence-summary">
          <div>
            <span>Forecast question</span>
            <Link to="/q/q-atlas-side-impact">
              Battery enclosure passes alpha side-impact test on first attempt{" "}
              <Icon name="chevron" />
            </Link>
          </div>
          <div className="forecast-evidence-probability">
            <strong>61%</strong>
            <span>−9 pts this week</span>
          </div>
        </section>
        <section className="task-drawer-section">
          <div className="task-section-heading">
            <div>
              <span>Evidence ledger</span>
              <h3>Probability-changing signals</h3>
            </div>
            <Link to="/q/q-atlas-side-impact" className="task-forecast-link">
              Open full forecast <Icon name="chevron" />
            </Link>
          </div>
          <p className="task-evidence-intro">
            This is the audit trail behind the current probability. Each signal is assessed for its
            direct relevance and weighted into the forecast update.
          </p>
          <div className="forecast-evidence-list">
            {evidence.map((item) => (
              <article key={item.source}>
                <span
                  className={`task-evidence-icon ${item.kind === "folder" ? "folder" : item.kind === "trend" ? "signal" : ""}`}
                >
                  <Icon name={item.kind} />
                </span>
                <div className="forecast-evidence-copy">
                  <div>
                    <strong>{item.source}</strong>
                    <span className={item.impact.startsWith("−") ? "negative" : "positive"}>
                      {item.impact}
                    </span>
                  </div>
                  <time>
                    {item.time} · {item.confidence}
                  </time>
                  <p>{item.detail}</p>
                  <button onClick={() => projectToast(`Opened ${item.linked}`)}>
                    <Icon name="link" /> {item.linked}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="task-drawer-section forecast-evidence-next">
          <div className="task-section-heading">
            <h3>What would change the forecast?</h3>
          </div>
          <ul>
            <li>Confirmed material allocation for the crash-test article</li>
            <li>Successful correlation of the updated thermal model</li>
            <li>Completed reinforcement design review with no schedule impact</li>
          </ul>
        </section>
        <footer className="task-drawer-footer">
          <button className="project-secondary" onClick={onClose}>
            Close
          </button>
          <Link className="project-primary" to="/q/q-atlas-side-impact">
            Open full forecast <Icon name="chevron" />
          </Link>
        </footer>
      </aside>
    </div>
  );
}

function TimelineTab({ tasks, onOpen }: { tasks: Task[]; onOpen: (task: Task) => void }) {
  const [mode, setMode] = useState<"Schedule" | "Dependencies">("Schedule");
  const [showForecast, setShowForecast] = useState(true);
  const [selectedId, setSelectedId] = useState(1);
  const [range, setRange] = useState("Aug 5 – Sep 30");
  const schedule = [
    {
      taskId: 5,
      lane: "Validation operations",
      start: 0,
      planned: 4,
      predicted: 2,
      forecast: 92,
      dependency: "Foundation complete",
    },
    {
      taskId: 3,
      lane: "Thermal validation",
      start: 5,
      planned: 7,
      predicted: 10,
      forecast: 68,
      dependency: "Blocks reinforcement design",
    },
    {
      taskId: 1,
      lane: "Battery enclosure",
      start: 12,
      planned: 8,
      predicted: 15,
      forecast: 58,
      dependency: "Blocked by thermal review",
    },
    {
      taskId: 2,
      lane: "Supply & test build",
      start: 21,
      planned: 5,
      predicted: 11,
      forecast: 54,
      dependency: "Blocked by enclosure design",
    },
    {
      taskId: 4,
      lane: "Program management",
      start: 31,
      planned: 6,
      predicted: 10,
      forecast: 64,
      dependency: "Depends on all readiness signals",
    },
  ];
  const items = schedule
    .map((item) => ({ ...item, task: tasks.find((task) => task.id === item.taskId) }))
    .filter((item): item is typeof item & { task: Task } => Boolean(item.task));
  const selected = items.find((item) => item.taskId === selectedId) ?? items[0];
  const active =
    mode === "Dependencies"
      ? new Set([
          selected.taskId,
          ...(selected.taskId === 3
            ? [1, 2, 4]
            : selected.taskId === 1
              ? [3, 2, 4]
              : selected.taskId === 2
                ? [1, 3, 4]
                : selected.taskId === 4
                  ? [1, 2, 3]
                  : [3]),
        ])
      : new Set<number>();
  const weeks = ["Aug 5", "Aug 12", "Aug 19", "Aug 26", "Sep 2", "Sep 9", "Sep 16", "Sep 23"];
  return (
    <>
      <SectionHead
        eyebrow="Delivery plan"
        title="Interactive schedule"
        action={
          <button
            className="project-secondary"
            onClick={() => {
              const nextRange = range === "Aug 5 – Sep 30" ? "Sep 1 – Oct 27" : "Aug 5 – Sep 30";
              setRange(nextRange);
              projectToast(`Schedule range changed to ${nextRange}`);
            }}
          >
            <Icon name="calendar" /> {range}
          </button>
        }
      />
      <div className="schedule-toolbar">
        <div className="schedule-view-toggle">
          <button
            className={mode === "Schedule" ? "active" : ""}
            onClick={() => setMode("Schedule")}
          >
            Schedule
          </button>
          <button
            className={mode === "Dependencies" ? "active" : ""}
            onClick={() => setMode("Dependencies")}
          >
            Dependencies
          </button>
        </div>
        <label className="schedule-forecast-toggle">
          <input
            type="checkbox"
            checked={showForecast}
            onChange={(event) => setShowForecast(event.target.checked)}
          />
          <span></span> Show forecasted finish
        </label>
        <div className="schedule-legend">
          <span>
            <i className="planned" /> Planned
          </span>
          <span>
            <i className="forecast" /> Forecasted overrun
          </span>
          <span>
            <i className="early" /> Forecasted early finish
          </span>
        </div>
      </div>
      <div className="schedule-card">
        <div className="schedule-hint">
          <Icon name="bolt" />
          <span>
            {mode === "Dependencies"
              ? "Dependency view highlights the tasks that feed into your selected work item."
              : "Click a task to inspect the delivery forecast, assumptions, and downstream impact."}
          </span>
        </div>
        <div className="schedule-scroll">
          <div className="schedule-board">
            <div className="schedule-head-row">
              <div className="schedule-task-header">Task / workstream</div>
              <div className="schedule-week-header">
                {weeks.map((week, index) => (
                  <div key={week} className={index === 6 ? "milestone-week" : ""}>
                    {week}
                    {index === 6 && <span>Alpha crash test</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="schedule-rows">
              {items.map((item) => {
                const left = (item.start / 56) * 100;
                const planned = (item.planned / 56) * 100;
                const predicted = (item.predicted / 56) * 100;
                const isSelected = item.taskId === selected.taskId;
                const isRelated = active.has(item.taskId);
                return (
                  <div
                    className={`schedule-row${isSelected ? " selected" : ""}${isRelated ? " related" : ""}`}
                    key={item.taskId}
                  >
                    <button
                      className="schedule-task-label"
                      onClick={() => {
                        setSelectedId(item.taskId);
                        if (mode === "Schedule") onOpen(item.task);
                      }}
                    >
                      <span
                        className={`schedule-status ${item.task.status.toLowerCase().replaceAll(" ", "-")}`}
                      ></span>
                      <div>
                        <strong>{item.task.title}</strong>
                        <small>
                          {item.lane} · {item.forecast}% on time
                        </small>
                      </div>
                      {mode === "Dependencies" && <em>{item.dependency}</em>}
                    </button>
                    <div className="schedule-track">
                      <div className="schedule-gridline" />
                      <button
                        className={`schedule-bar ${item.task.priority.toLowerCase()}${isSelected ? " selected" : ""}`}
                        style={{ left: `${left}%`, width: `${planned}%` }}
                        onClick={() => {
                          setSelectedId(item.taskId);
                          if (mode === "Schedule") onOpen(item.task);
                        }}
                      >
                        <span>{item.task.due}</span>
                      </button>
                      {showForecast && item.predicted > item.planned && (
                        <div
                          className={`schedule-projection ${item.task.priority.toLowerCase()}`}
                          style={{ left: `${left + planned}%`, width: `${predicted - planned}%` }}
                        >
                          <span>+{item.predicted - item.planned}d</span>
                        </div>
                      )}
                      {showForecast && item.predicted < item.planned && (
                        <div
                          className="schedule-early-finish"
                          style={{ left: `${left + predicted}%`, width: `${planned - predicted}%` }}
                        >
                          <span>−{item.planned - item.predicted}d</span>
                        </div>
                      )}
                      {mode === "Dependencies" && isRelated && (
                        <div
                          className="schedule-dependency-arrow"
                          style={{ left: `${Math.min(left + predicted + 1, 92)}%` }}
                        >
                          ↳
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="schedule-summary">
          <div>
            <span>Selected task</span>
            <strong>{selected.task.title}</strong>
            <small>{selected.dependency}</small>
          </div>
          <div>
            <span>Planned finish</span>
            <strong>{selected.task.due}</strong>
            <small>{selected.planned} planned days</small>
          </div>
          <div
            className={
              selected.predicted > selected.planned
                ? "at-risk"
                : selected.predicted < selected.planned
                  ? "ahead"
                  : ""
            }
          >
            <span>Forecasted finish</span>
            <strong>
              {selected.predicted > selected.planned
                ? `+${selected.predicted - selected.planned}d variance`
                : selected.predicted < selected.planned
                  ? `−${selected.planned - selected.predicted}d ahead`
                  : "On plan"}
            </strong>
            <small>{selected.forecast}% likely by planned finish</small>
          </div>
          <button className="project-primary" onClick={() => onOpen(selected.task)}>
            Open task details <Icon name="chevron" />
          </button>
        </div>
      </div>
    </>
  );
}

function ForecastsTab() {
  const forecasts = [
    {
      id: "q-atlas-side-impact",
      title: "Battery enclosure passes alpha side-impact test on first attempt",
      probability: 61,
      movement: "−9 pts",
      direction: "down",
      type: "Milestone",
      coverage: "Alpha crash test",
      why: "This is the critical technical gate for releasing the beta enclosure. A miss would force a redesign and put the November build at risk.",
      resolves: "Sep 18",
    },
    {
      id: "q-atlas-test-article",
      title: "Alpha crash-test article is ready by September 8",
      probability: 58,
      movement: "−3 pts",
      direction: "down",
      type: "Task",
      coverage: "Supply & test build",
      why: "It is the lead indicator for the alpha crash-test date and gives the team time to react before the milestone is missed.",
      resolves: "Sep 8",
    },
    {
      id: "q-atlas-thermal-rework",
      title: "Battery enclosure requires material rework after thermal validation",
      probability: 46,
      movement: "+5 pts",
      direction: "up",
      type: "Risk",
      coverage: "Thermal validation",
      why: "Thermal rework is a distinct failure mode that could consume the schedule buffer even if the test article is built on time.",
      resolves: "Sep 10",
    },
    {
      id: "q-atlas-cell-allocation",
      title: "Cell supplier confirms Q4 capacity allocation by August 28",
      probability: 54,
      movement: "−4 pts",
      direction: "down",
      type: "Dependency",
      coverage: "Cell supplier",
      why: "A signed allocation is required to make the beta-build schedule credible; it is the key external dependency in the current plan.",
      resolves: "Aug 28",
    },
    {
      id: "q-atlas-beta-build",
      title: "Beta vehicle build begins by November 6",
      probability: 64,
      movement: "−2 pts",
      direction: "down",
      type: "Outcome",
      coverage: "Beta vehicle build",
      why: "This is the project-level outcome forecast. It aggregates the major technical, supply, and readiness paths into one decision-grade signal.",
      resolves: "Nov 6",
    },
    {
      id: "q-atlas-supplier-delay",
      title: "Battery supplier delivery delay exceeds 10 business days before beta build",
      probability: 33,
      movement: "+1 pt",
      direction: "up",
      type: "Risk",
      coverage: "Supplier logistics",
      why: "A material delivery miss has high downstream impact and may not be captured by the cell-allocation question alone.",
      resolves: "Nov 6",
    },
  ];
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const filterType = filter === "Dependencies" ? "Dependency" : filter === "All" ? "" : filter.slice(0, -1);
  const visibleForecasts = forecasts.filter((forecast) => (!filterType || forecast.type === filterType) && (!query || `${forecast.title} ${forecast.coverage}`.toLowerCase().includes(query.toLowerCase())));
  return (
    <>
      <SectionHead
        eyebrow="Forecast coverage"
        title="Tracked forecasts"
        action={
          <button className="project-primary" onClick={() => projectToast("Forecast draft created for this project. Use the Forecasts workspace to complete it.") }>
            <Icon name="plus" /> Add forecast
          </button>
        }
      />
      <section className="project-forecast-overview">
        <div>
          <span>Forecast coverage</span>
          <strong>6 active questions</strong>
          <p>
            Coverage spans the alpha milestone, beta-build outcome, 2 critical dependencies, and 2
            separate failure modes.
          </p>
        </div>
        <div className="project-forecast-overview-why">
          <Icon name="bolt" />
          <p>
            <strong>Why track forecasts?</strong> They turn assumptions that could change delivery
            into explicit, observable questions—so the team sees movement early enough to act.
          </p>
        </div>
      </section>
      <div className="project-forecast-filters">
        {[["All", "All 6"], ["Milestones", "Milestones 1"], ["Tasks", "Tasks 1"], ["Dependencies", "Dependencies 1"], ["Risks", "Risks 2"], ["Outcomes", "Outcomes 1"]].map(([value, label]) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>)}
        <span />
        <input className="project-inline-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search forecasts" />
        <button className="project-secondary" onClick={() => projectToast("Filter forecasts by title, tracked area, or question type") }>
          <Icon name="search" /> Search
        </button>
      </div>
      <div className="project-forecast-list">
        {visibleForecasts.map((forecast) => (
          <Link to={`/q/${forecast.id}`} className="project-forecast-row" key={forecast.id}>
            <div className="project-forecast-probability">
              <strong>{forecast.probability}%</strong>
              <span className={forecast.direction}>{forecast.movement}</span>
            </div>
            <div className="project-forecast-main">
              <div>
                <span className={`project-forecast-type ${forecast.type.toLowerCase()}`}>
                  {forecast.type}
                </span>
                <span className="project-forecast-coverage">Tracks {forecast.coverage}</span>
              </div>
              <h3>{forecast.title}</h3>
              <p>
                <strong>Why:</strong> {forecast.why}
              </p>
            </div>
            <div className="project-forecast-resolves">
              <span>Resolves</span>
              <strong>{forecast.resolves}</strong>
            </div>
            <span className="project-forecast-arrow">
              <Icon name="chevron" />
            </span>
          </Link>
        ))}
      </div>
      <section className="project-forecast-learning">
        <Icon name="trend" />
        <div>
          <strong>Coverage gap detected</strong>
          <p>
            Atlas has no active question tracking the timing of the reinforcement design review. Add
            one to make the most important near-term decision observable.
          </p>
        </div>
        <button className="project-secondary" onClick={() => projectToast("Forecast draft created for the reinforcement design-review timing gap") }>
          <Icon name="plus" /> Create forecast
        </button>
      </section>
    </>
  );
}

function ResourcesTab({ resources, onAdd }: { resources: Resource[]; onAdd: () => void }) {
  return (
    <>
      <SectionHead
        eyebrow="Project knowledge"
        title="Resources"
        action={
          <button className="project-primary" onClick={onAdd}>
            <Icon name="link" /> Link resource
          </button>
        }
      />
      <div className="project-resource-intro">
        <Icon name="folder" />
        <div>
          <strong>One place for the project’s source material</strong>
          <p>
            Link folders and systems your team already uses. The copilot uses connected resources to
            ground its answers.
          </p>
        </div>
      </div>
      <div className="project-resource-list">
        {resources.map((resource) => (
          <article key={resource.id} className="project-resource">
            <ResourceIcon type={resource.type} />
            <div className="project-resource-copy">
              <strong>{resource.name}</strong>
              <span>
                {resource.source} · Updated {resource.updated} by {resource.owner}
              </span>
              <p>{resource.summary}</p>
            </div>
            <button className="project-resource-open" onClick={() => projectToast(`Opened ${resource.name}`)}>
              Open <Icon name="chevron" />
            </button>
            <button className="project-row-more" onClick={() => projectToast(`Actions opened for ${resource.name}`)}>
              <Icon name="more" />
            </button>
          </article>
        ))}
      </div>
    </>
  );
}

function RisksTab() {
  const risks = [
    [
      "Battery enclosure validation",
      "High",
      "61%",
      "The reinforcement path may add 2–3 weeks before the crash-test article can be released.",
      "Avery Li",
    ],
    [
      "Cell supplier capacity allocation",
      "Medium",
      "43%",
      "The allocation decision is tied to contract redlines still under negotiation.",
      "Owen Brooks",
    ],
    [
      "Thermal model correlation",
      "Medium",
      "38%",
      "Lab correlation data needs another iteration before the model can be used for release decisions.",
      "Priya Raman",
    ],
  ];
  return (
    <>
      <SectionHead
        eyebrow="Active risk register"
        title="Risks"
        action={
          <button className="project-primary" onClick={() => projectToast("Risk form opened — add impact, owner, and linked forecast") }>
            <Icon name="plus" /> Add risk
          </button>
        }
      />
      <div className="project-risk-grid">
        {risks.map(([title, impact, probability, text, owner]) => (
          <article className="project-risk" key={title}>
            <div>
              <span className={`project-risk-impact ${impact.toLowerCase()}`}>{impact} impact</span>
              <button onClick={() => projectToast(`Risk actions opened for ${title}`)}>
                <Icon name="more" />
              </button>
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
            <footer>
              <span>
                <Icon name="warning" /> {probability} likelihood
              </span>
              <strong>{owner}</strong>
            </footer>
          </article>
        ))}
      </div>
    </>
  );
}

function DecisionsTab() {
  const decisions = [
    [
      "Jul 29",
      "Proceed with stepped reinforcement path",
      "Accepted",
      "The program team selected the stepped path to protect the side-impact target while preserving the current battery pack envelope.",
      "Maya Chen",
    ],
    [
      "Jul 17",
      "Hold the 2028 model-year launch target",
      "Accepted",
      "The team will absorb the prototype learning cycle rather than move the vehicle launch timing at this stage.",
      "Maya Chen",
    ],
    [
      "Jul 9",
      "Choose supplier B for thermal interface material",
      "Superseded",
      "Supplier A’s qualification lead time made the original choice no longer viable.",
      "Owen Brooks",
    ],
  ];
  return (
    <>
      <SectionHead
        eyebrow="Decision log"
        title="Decisions"
        action={
          <button className="project-primary" onClick={() => projectToast("Decision log form opened") }>
            <Icon name="plus" /> Log decision
          </button>
        }
      />
      <div className="project-decision-list">
        {decisions.map(([date, title, status, note, owner]) => (
          <article key={title}>
            <time>{date}</time>
            <div>
              <span className={`project-decision-status ${status.toLowerCase()}`}>{status}</span>
              <h3>{title}</h3>
              <p>{note}</p>
              <small>Decided by {owner}</small>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function ActivityItems({ limit }: { limit?: number }) {
  const activity = [
    [
      "Maya Chen",
      "updated the delivery forecast",
      "On-time likelihood moved from 71% to 64%",
      "8 min ago",
      "MC",
    ],
    ["Priya Raman", "linked a resource", "Validation evidence index", "2h ago", "PR"],
    ["Owen Brooks", "added a risk", "Cell supplier capacity allocation", "Yesterday", "OB"],
    [
      "Project copilot",
      "flagged an attention shift",
      "Thermal validation became the highest-risk workstream",
      "Yesterday",
      "S",
    ],
  ];
  return (
    <div className="project-activity-list">
      {activity.slice(0, limit).map(([person, action, subject, time, initials]) => (
        <article key={`${person}-${action}`}>
          <span className="project-avatar">{initials}</span>
          <div>
            <p>
              <strong>{person}</strong> {action}
            </p>
            <span>{subject}</span>
          </div>
          <time>{time}</time>
        </article>
      ))}
    </div>
  );
}
function ActivityTab() {
  return (
    <>
      <SectionHead eyebrow="Project history" title="Activity" />
      <section className="project-panel">
        <ActivityItems />
      </section>
    </>
  );
}

function Modal({
  title,
  eyebrow,
  children,
  onClose,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="project-modal-backdrop" onMouseDown={onClose}>
      <div
        className="project-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span>{eyebrow}</span>
            <h2>{title}</h2>
          </div>
          <button onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
