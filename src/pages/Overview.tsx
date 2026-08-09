import { FormEvent, useMemo, useState } from "react";

type ProjectHealth = "On track" | "Watch" | "At risk";
type ProjectTrend = "up" | "down" | "flat";
type ViewMode = "cards" | "list";

type Project = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  industry: string;
  icon: string;
  color: string;
  location: string;
  phase: string;
  health: ProjectHealth;
  deliveryConfidence: number;
  change: number;
  trend: ProjectTrend;
  progress: number;
  nextMilestone: string;
  targetDate: string;
  owner: string;
  ownerInitials: string;
  forecastCount: number;
  forecasters: number;
  topForecast: string;
  topForecastProbability: number;
  risks: string[];
  sparkline: number[];
  watched?: boolean;
};

const seedProjects: Project[] = [
  {
    id: "atlas-ev",
    name: "Atlas EV Platform",
    shortName: "AE",
    description: "Design and validate a modular electric crossover platform for a 2028 model-year launch.",
    industry: "Automotive",
    icon: "car",
    color: "#5b65d8",
    location: "Detroit, MI",
    phase: "Prototype validation",
    health: "Watch",
    deliveryConfidence: 64,
    change: -7,
    trend: "down",
    progress: 58,
    nextMilestone: "Alpha crash test",
    targetDate: "Sep 18, 2026",
    owner: "Maya Chen",
    ownerInitials: "MC",
    forecastCount: 18,
    forecasters: 12,
    topForecast: "Battery enclosure passes side-impact test on first attempt",
    topForecastProbability: 61,
    risks: ["Cell supplier", "Thermal validation"],
    sparkline: [76, 74, 77, 73, 72, 68, 64],
    watched: true,
  },
  {
    id: "northstar",
    name: "Northstar Billing Migration",
    shortName: "NB",
    description: "Move 42,000 enterprise accounts from the legacy ledger to a usage-based billing stack.",
    industry: "Software",
    icon: "code",
    color: "#2478e5",
    location: "Remote · US",
    phase: "Limited rollout",
    health: "On track",
    deliveryConfidence: 87,
    change: 5,
    trend: "up",
    progress: 71,
    nextMilestone: "10% account migration",
    targetDate: "Aug 28, 2026",
    owner: "Eli Navarro",
    ownerInitials: "EN",
    forecastCount: 14,
    forecasters: 9,
    topForecast: "Reconciliation error rate stays below 0.5% for the first cohort",
    topForecastProbability: 84,
    risks: ["Data quality"],
    sparkline: [68, 72, 73, 78, 80, 82, 87],
  },
  {
    id: "harborline",
    name: "Harborline Residences",
    shortName: "HR",
    description: "Deliver a 186-unit mixed-use waterfront building with ground-floor retail and public access.",
    industry: "Real estate",
    icon: "building",
    color: "#b36a25",
    location: "Baltimore, MD",
    phase: "Structural construction",
    health: "At risk",
    deliveryConfidence: 43,
    change: -12,
    trend: "down",
    progress: 39,
    nextMilestone: "Top out structure",
    targetDate: "Nov 12, 2026",
    owner: "Leila Morgan",
    ownerInitials: "LM",
    forecastCount: 23,
    forecasters: 16,
    topForecast: "Curtain-wall package arrives before the tower crane demobilizes",
    topForecastProbability: 38,
    risks: ["Facade lead time", "Permit revision", "Weather"],
    sparkline: [71, 68, 63, 66, 59, 52, 43],
    watched: true,
  },
  {
    id: "tundra",
    name: "Tundra Carbon Capture Pilot",
    shortName: "TC",
    description: "Install a 50,000-ton-per-year capture unit on an operating cement kiln without disrupting output.",
    industry: "Climate infrastructure",
    icon: "leaf",
    color: "#178766",
    location: "Laramie, WY",
    phase: "Detailed engineering",
    health: "On track",
    deliveryConfidence: 78,
    change: 3,
    trend: "up",
    progress: 46,
    nextMilestone: "HAZOP review complete",
    targetDate: "Oct 2, 2026",
    owner: "Ravi Shah",
    ownerInitials: "RS",
    forecastCount: 16,
    forecasters: 11,
    topForecast: "Absorber design maintains at least 90% capture efficiency",
    topForecastProbability: 76,
    risks: ["Steam integration", "EPA review"],
    sparkline: [69, 70, 68, 72, 74, 75, 78],
  },
  {
    id: "iris",
    name: "Iris Oncology Assay",
    shortName: "IO",
    description: "Develop and analytically validate a blood-based recurrence test for stage II colorectal cancer.",
    industry: "Biotechnology",
    icon: "dna",
    color: "#a74991",
    location: "Cambridge, MA",
    phase: "Clinical validation",
    health: "Watch",
    deliveryConfidence: 67,
    change: 1,
    trend: "flat",
    progress: 63,
    nextMilestone: "500th sample processed",
    targetDate: "Sep 30, 2026",
    owner: "Dr. Nia Okafor",
    ownerInitials: "NO",
    forecastCount: 20,
    forecasters: 14,
    topForecast: "Prospective cohort reaches the pre-specified sensitivity threshold",
    topForecastProbability: 69,
    risks: ["Sample attrition", "Site enrollment"],
    sparkline: [61, 63, 64, 66, 65, 66, 67],
  },
  {
    id: "kestrel",
    name: "Kestrel Earth Observation-1",
    shortName: "KE",
    description: "Build and launch a 12U hyperspectral satellite for agricultural and wildfire monitoring.",
    industry: "Aerospace",
    icon: "satellite",
    color: "#465270",
    location: "Long Beach, CA",
    phase: "Integration & test",
    health: "At risk",
    deliveryConfidence: 49,
    change: -9,
    trend: "down",
    progress: 76,
    nextMilestone: "Thermal-vacuum test",
    targetDate: "Aug 24, 2026",
    owner: "Jon Bell",
    ownerInitials: "JB",
    forecastCount: 27,
    forecasters: 18,
    topForecast: "Payload clears thermal-vac without a redesign to the radiator",
    topForecastProbability: 44,
    risks: ["Payload thermal", "Launch slot"],
    sparkline: [70, 69, 64, 62, 60, 53, 49],
    watched: true,
  },
  {
    id: "forge",
    name: "Forge Line 4 Automation",
    shortName: "FL",
    description: "Retrofit a live precision-parts line with robotic inspection and closed-loop process control.",
    industry: "Manufacturing",
    icon: "factory",
    color: "#687067",
    location: "Dayton, OH",
    phase: "Site acceptance testing",
    health: "On track",
    deliveryConfidence: 82,
    change: 7,
    trend: "up",
    progress: 84,
    nextMilestone: "72-hour production run",
    targetDate: "Aug 19, 2026",
    owner: "Samira Patel",
    ownerInitials: "SP",
    forecastCount: 11,
    forecasters: 8,
    topForecast: "Automated inspection sustains fewer than 150 false rejects per million",
    topForecastProbability: 79,
    risks: ["Controls tuning"],
    sparkline: [65, 68, 72, 70, 76, 79, 82],
  },
  {
    id: "solace",
    name: "Solace Rural Care Network",
    shortName: "SC",
    description: "Open six hybrid-care clinics and a telehealth hub serving three medically underserved counties.",
    industry: "Healthcare",
    icon: "medical",
    color: "#cf4e5c",
    location: "Appalachian Kentucky",
    phase: "Clinic rollout",
    health: "At risk",
    deliveryConfidence: 54,
    change: -4,
    trend: "down",
    progress: 52,
    nextMilestone: "First two clinics open",
    targetDate: "Sep 8, 2026",
    owner: "Ada Williams",
    ownerInitials: "AW",
    forecastCount: 18,
    forecasters: 13,
    topForecast: "At least 14 primary-care clinicians are credentialed by opening day",
    topForecastProbability: 52,
    risks: ["Credentialing", "Recruiting", "Fiber install"],
    sparkline: [66, 63, 65, 61, 58, 58, 54],
  },
];

function ProjectIcon({ name }: { name: string }) {
  const paths: Record<string, JSX.Element> = {
    car: <><path d="M5 16h14l-1.3-5.2A2.4 2.4 0 0 0 15.4 9H8.6a2.4 2.4 0 0 0-2.3 1.8L5 16Z"/><path d="M3 16h18v3H3z"/><circle cx="7" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></>,
    code: <><path d="m8 9-4 3 4 3"/><path d="m16 9 4 3-4 3"/><path d="m14 5-4 14"/></>,
    building: <><path d="M4 21V6l8-3v18"/><path d="M12 9h8v12"/><path d="M7 8h2M7 12h2M7 16h2M15 12h2M15 16h2M2 21h20"/></>,
    leaf: <><path d="M20 4C11 4 5 8 5 15c0 3 2 5 5 5 7 0 10-8 10-16Z"/><path d="M4 21c3-6 7-9 13-13"/></>,
    dna: <><path d="M7 3c0 7 10 11 10 18M17 3C17 10 7 14 7 21M8 6h8M7 11h10M7 16h10M8 20h8"/></>,
    satellite: <><path d="m9 9 6 6M7 13l4 4 6-6-4-4-6 6ZM5 5l4 4M15 15l4 4M2 8l6-6 4 4-6 6-4-4ZM12 18l6-6 4 4-6 6-4-4Z"/></>,
    factory: <><path d="M3 21V9l6 3V9l6 3V5h4v16H3Z"/><path d="M7 17h2M12 17h2M17 17h2"/></>,
    medical: <><path d="M12 21s-8-4.6-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.4-8 11-8 11Z"/><path d="M8 13h2l1-3 2 6 1-3h2"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function Sparkline({ values, health }: { values: number[]; health: ProjectHealth }) {
  const width = 94;
  const height = 34;
  const min = Math.min(...values) - 3;
  const max = Math.max(...values) + 3;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / (max - min)) * height;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg className={`pm-spark pm-spark-${health.toLowerCase().replace(" ", "-")}`} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} />
    </svg>
  );
}

function Trend({ change, trend }: { change: number; trend: ProjectTrend }) {
  return (
    <span className={`pm-trend pm-trend-${trend}`}>
      {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {Math.abs(change)} pts
    </span>
  );
}

function ProjectCard({ project, onToggleWatch }: { project: Project; onToggleWatch: () => void }) {
  return (
    <article className="pm-project-card">
      <div className="pm-card-head">
        <div className="pm-project-mark" style={{ background: `${project.color}14`, color: project.color }}>
          <ProjectIcon name={project.icon} />
        </div>
        <div className="pm-card-title">
          <div className="pm-eyebrow">{project.industry} · {project.phase}</div>
          <h3>{project.name}</h3>
        </div>
        <div className="pm-card-actions">
          <span className={`pm-health pm-health-${project.health.toLowerCase().replace(" ", "-")}`}>{project.health}</span>
          <button className={`pm-watch${project.watched ? " active" : ""}`} onClick={onToggleWatch} title={project.watched ? "Remove from watchlist" : "Add to watchlist"} aria-label={project.watched ? "Remove from watchlist" : "Add to watchlist"}>
            <svg viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></svg>
          </button>
        </div>
      </div>

      <p className="pm-description">{project.description}</p>

      <div className="pm-card-meta">
        <span><svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>{project.location}</span>
        <span><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>{project.targetDate}</span>
      </div>

      <div className="pm-health-row">
        <div>
          <span className="pm-label">On-time delivery forecast</span>
          <div className="pm-probability"><strong>{project.deliveryConfidence}%</strong><Trend change={project.change} trend={project.trend} /></div>
        </div>
        <Sparkline values={project.sparkline} health={project.health} />
      </div>

      <div className="pm-progress-block">
        <div className="pm-progress-label"><span>{project.progress}% complete</span><span>Next: {project.nextMilestone}</span></div>
        <div className="pm-progress"><span style={{ width: `${project.progress}%`, background: project.color }} /></div>
      </div>

      <div className="pm-key-forecast">
        <div className="pm-key-forecast-top"><span>Key forecast</span><strong>{project.topForecastProbability}%</strong></div>
        <p>{project.topForecast}</p>
      </div>

      <div className="pm-risk-row">
        <span className="pm-risk-label">Risks</span>
        {project.risks.length ? project.risks.slice(0, 2).map((risk) => <span className="pm-risk-chip" key={risk}>{risk}</span>) : <span className="pm-no-risk">No active blockers</span>}
        {project.risks.length > 2 && <span className="pm-risk-more">+{project.risks.length - 2}</span>}
      </div>

      <div className="pm-card-foot">
        <div className="pm-owner"><span className="pm-avatar" style={{ background: project.color }}>{project.ownerInitials}</span><span><small>Project lead</small>{project.owner}</span></div>
        <div className="pm-forecast-meta"><strong>{project.forecastCount}</strong> questions · <strong>{project.forecasters}</strong> forecasters</div>
      </div>
    </article>
  );
}

function ProjectListRow({ project, onToggleWatch }: { project: Project; onToggleWatch: () => void }) {
  return (
    <article className="pm-list-row">
      <button className={`pm-watch${project.watched ? " active" : ""}`} onClick={onToggleWatch} aria-label="Toggle watchlist">
        <svg viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></svg>
      </button>
      <div className="pm-project-mark pm-project-mark-small" style={{ background: `${project.color}14`, color: project.color }}><ProjectIcon name={project.icon} /></div>
      <div className="pm-list-name"><strong>{project.name}</strong><span>{project.industry} · {project.phase}</span></div>
      <div className="pm-list-owner"><span className="pm-avatar" style={{ background: project.color }}>{project.ownerInitials}</span><span>{project.owner}</span></div>
      <div className="pm-list-progress"><span>{project.progress}% complete</span><div className="pm-progress"><span style={{ width: `${project.progress}%`, background: project.color }} /></div></div>
      <div className="pm-list-date"><span>{project.nextMilestone}</span><strong>{project.targetDate}</strong></div>
      <div className="pm-list-prob"><strong>{project.deliveryConfidence}%</strong><Trend change={project.change} trend={project.trend} /></div>
      <span className={`pm-health pm-health-${project.health.toLowerCase().replace(" ", "-")}`}>{project.health}</span>
    </article>
  );
}

export default function Overview() {
  const [projects, setProjects] = useState(seedProjects);
  const [search, setSearch] = useState("");
  const [health, setHealth] = useState<ProjectHealth | "All">("All");
  const [industry, setIndustry] = useState("All industries");
  const [sort, setSort] = useState("Needs attention");
  const [view, setView] = useState<ViewMode>("cards");
  const [createOpen, setCreateOpen] = useState(false);

  const industries = useMemo(() => ["All industries", ...Array.from(new Set(projects.map((project) => project.industry))).sort()], [projects]);
  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = projects.filter((project) => {
      const matchesQuery = !query || [project.name, project.description, project.industry, project.owner, project.location].some((value) => value.toLowerCase().includes(query));
      return matchesQuery && (health === "All" || project.health === health) && (industry === "All industries" || project.industry === industry);
    });
    return [...result].sort((a, b) => {
      if (sort === "Highest confidence") return b.deliveryConfidence - a.deliveryConfidence;
      if (sort === "Nearest milestone") return a.targetDate.localeCompare(b.targetDate);
      if (sort === "Recently changed") return Math.abs(b.change) - Math.abs(a.change);
      return a.deliveryConfidence - b.deliveryConfidence;
    });
  }, [projects, search, health, industry, sort]);

  const atRisk = projects.filter((project) => project.health === "At risk").length;
  const totalForecasts = projects.reduce((total, project) => total + project.forecastCount, 0);
  const portfolioConfidence = Math.round(projects.reduce((total, project) => total + project.deliveryConfidence, 0) / projects.length);
  const watching = projects.filter((project) => project.watched).length;

  const toggleWatch = (id: string) => setProjects((current) => current.map((project) => project.id === id ? { ...project, watched: !project.watched } : project));

  const addProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "Untitled project");
    const newProject: Project = {
      id: `${Date.now()}`,
      name,
      shortName: name.split(" ").map((word) => word[0]).slice(0, 2).join("").toUpperCase(),
      description: String(data.get("description") || "New project ready for scope and forecast questions."),
      industry: String(data.get("industry") || "Software"),
      icon: "code",
      color: "#2478e5",
      location: String(data.get("location") || "Location TBD"),
      phase: "Planning",
      health: "On track",
      deliveryConfidence: 72,
      change: 0,
      trend: "flat",
      progress: 8,
      nextMilestone: "Scope approved",
      targetDate: String(data.get("date") || "TBD"),
      owner: String(data.get("owner") || "Unassigned"),
      ownerInitials: String(data.get("owner") || "UA").split(" ").map((word) => word[0]).slice(0, 2).join("").toUpperCase(),
      forecastCount: 0,
      forecasters: 0,
      topForecast: "Will the initial scope be approved without material revisions?",
      topForecastProbability: 72,
      risks: [],
      sparkline: [72, 72, 72, 72, 72, 72, 72],
    };
    setProjects((current) => [newProject, ...current]);
    setCreateOpen(false);
  };

  return (
    <main className="dash-page pm-page">
      <header className="pm-page-head">
        <div>
          <div className="pm-kicker"><span className="pm-live-dot" /> Portfolio intelligence · Updated 8 minutes ago</div>
          <h1>Projects</h1>
          <p>See where delivery is headed, what is changing, and where your team should act next.</p>
        </div>
        <button className="pm-primary-btn" onClick={() => setCreateOpen(true)}><span>＋</span> New project</button>
      </header>

      <section className="pm-stats" aria-label="Portfolio summary">
        <div className="pm-stat pm-stat-primary">
          <div className="pm-stat-icon"><svg viewBox="0 0 24 24"><path d="M4 17l5-5 4 3 7-9"/><path d="M15 6h5v5"/></svg></div>
          <div><span>Portfolio confidence</span><strong>{portfolioConfidence}%</strong><small>+2 pts this month</small></div>
        </div>
        <div className="pm-stat">
          <div className="pm-stat-icon pm-stat-icon-red"><svg viewBox="0 0 24 24"><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5M12 17h.01"/></svg></div>
          <div><span>Needs attention</span><strong>{atRisk}</strong><small>2 changed this week</small></div>
        </div>
        <div className="pm-stat">
          <div className="pm-stat-icon pm-stat-icon-blue"><svg viewBox="0 0 24 24"><path d="M4 19V9M10 19V5M16 19v-7M22 19V3"/></svg></div>
          <div><span>Open forecasts</span><strong>{totalForecasts}</strong><small>37 updated today</small></div>
        </div>
        <div className="pm-stat">
          <div className="pm-stat-icon pm-stat-icon-amber"><svg viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg></div>
          <div><span>Your watchlist</span><strong>{watching}</strong><small>Across 3 industries</small></div>
        </div>
      </section>

      <section className="pm-briefing">
        <div className="pm-briefing-badge"><svg viewBox="0 0 24 24"><path d="M12 3v3M5.6 5.6l2.1 2.1M3 12h3M18 12h3M16.3 7.7l2.1-2.1"/><path d="M9 18h6M10 21h4"/><path d="M8 14a5 5 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2Z"/></svg></div>
        <div className="pm-briefing-copy"><span>Portfolio briefing</span><strong>Attention shifted to Harborline Residences</strong><p>On-time delivery fell 12 points after the facade supplier moved its committed ship date. Forecasters see a 38% chance the package arrives before crane demobilization.</p></div>
        <button onClick={() => { setHealth("At risk"); setSort("Needs attention"); }}>Review 3 at-risk projects <span>→</span></button>
      </section>

      <section className="pm-portfolio-section">
        <div className="pm-section-title">
          <div><h2>Portfolio</h2><span>{filteredProjects.length} of {projects.length} projects</span></div>
          <div className="pm-health-tabs" aria-label="Filter by health">
            {(["All", "On track", "Watch", "At risk"] as const).map((item) => <button key={item} className={health === item ? "active" : ""} onClick={() => setHealth(item)}>{item}{item !== "All" && <span>{projects.filter((project) => project.health === item).length}</span>}</button>)}
          </div>
        </div>

        <div className="pm-toolbar">
          <label className="pm-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects, owners, or locations…" /></label>
          <select value={industry} onChange={(event) => setIndustry(event.target.value)} aria-label="Industry filter">{industries.map((item) => <option key={item}>{item}</option>)}</select>
          <label className="pm-sort-label"><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option>Needs attention</option><option>Highest confidence</option><option>Nearest milestone</option><option>Recently changed</option></select></label>
          <div className="pm-view-toggle">
            <button className={view === "cards" ? "active" : ""} onClick={() => setView("cards")} title="Card view"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></button>
            <button className={view === "list" ? "active" : ""} onClick={() => setView("list")} title="List view"><svg viewBox="0 0 24 24"><path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg></button>
          </div>
        </div>

        {filteredProjects.length ? (
          view === "cards" ? <div className="pm-project-grid">{filteredProjects.map((project) => <ProjectCard key={project.id} project={project} onToggleWatch={() => toggleWatch(project.id)} />)}</div>
          : <div className="pm-list"><div className="pm-list-head"><span /><span>Project</span><span>Lead</span><span>Progress</span><span>Next milestone</span><span>On-time forecast</span><span>Health</span></div>{filteredProjects.map((project) => <ProjectListRow key={project.id} project={project} onToggleWatch={() => toggleWatch(project.id)} />)}</div>
        ) : <div className="pm-empty"><strong>No projects found</strong><p>Try a different search or clear one of your filters.</p><button onClick={() => { setSearch(""); setHealth("All"); setIndustry("All industries"); }}>Clear filters</button></div>}
      </section>

      {createOpen && <div className="pm-modal-backdrop" role="presentation" onMouseDown={() => setCreateOpen(false)}><div className="pm-modal" role="dialog" aria-modal="true" aria-labelledby="new-project-title" onMouseDown={(event) => event.stopPropagation()}><div className="pm-modal-head"><div><span>Portfolio setup</span><h2 id="new-project-title">Create a new project</h2></div><button onClick={() => setCreateOpen(false)} aria-label="Close">×</button></div><p className="pm-modal-intro">Add the essentials now. Forecast questions, milestones, and evidence sources can be configured next.</p><form onSubmit={addProject}><label><span>Project name</span><input name="name" required placeholder="e.g. Delta water treatment expansion" autoFocus /></label><label><span>Short description</span><textarea name="description" placeholder="What are you delivering, and for whom?" /></label><div className="pm-form-grid"><label><span>Industry</span><select name="industry"><option>Software</option><option>Automotive</option><option>Real estate</option><option>Biotechnology</option><option>Aerospace</option><option>Manufacturing</option><option>Healthcare</option><option>Climate infrastructure</option></select></label><label><span>Project lead</span><input name="owner" required placeholder="Full name" /></label><label><span>Location</span><input name="location" placeholder="City, state or region" /></label><label><span>Target date</span><input name="date" placeholder="e.g. Dec 15, 2026" /></label></div><div className="pm-modal-actions"><button type="button" className="pm-secondary-btn" onClick={() => setCreateOpen(false)}>Cancel</button><button className="pm-primary-btn" type="submit">Create project</button></div></form></div></div>}
    </main>
  );
}
