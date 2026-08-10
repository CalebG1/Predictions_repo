export type ProjectHealth = "On track" | "Watch" | "At risk";

export type Project = {
  id: string;
  name: string;
  initials: string;
  description: string;
  industry: string;
  location: string;
  phase: string;
  health: ProjectHealth;
  confidence: number;
  change: number;
  progress: number;
  nextMilestone: string;
  target: string;
  owner: string;
  forecasts: number;
  forecasters: number;
  topForecast: string;
  topForecastProbability: number;
  risks: string[];
  watched?: boolean;
};

export const seedProjects: Project[] = [
  {
    id: "atlas-ev",
    name: "Atlas EV Platform",
    initials: "AE",
    description:
      "Design and validate a modular electric crossover platform for a 2028 model-year launch.",
    industry: "Automotive",
    location: "Detroit, MI",
    phase: "Prototype validation",
    health: "Watch",
    confidence: 64,
    change: -7,
    progress: 58,
    nextMilestone: "Alpha crash test",
    target: "Sep 18, 2026",
    owner: "Maya Chen",
    forecasts: 18,
    forecasters: 12,
    topForecast: "Battery enclosure passes side-impact test on first attempt",
    topForecastProbability: 61,
    risks: ["Cell supplier", "Thermal validation"],
    watched: true,
  },
  {
    id: "northstar",
    name: "Northstar Billing Migration",
    initials: "NB",
    description:
      "Move 42,000 enterprise accounts from the legacy ledger to a usage-based billing stack.",
    industry: "Software",
    location: "Remote · US",
    phase: "Limited rollout",
    health: "On track",
    confidence: 87,
    change: 5,
    progress: 71,
    nextMilestone: "10% account migration",
    target: "Aug 28, 2026",
    owner: "Eli Navarro",
    forecasts: 14,
    forecasters: 9,
    topForecast: "Reconciliation errors stay below 0.5% for the first cohort",
    topForecastProbability: 84,
    risks: ["Data quality"],
  },
  {
    id: "harborline",
    name: "Harborline Residences",
    initials: "HR",
    description: "Deliver a 186-unit mixed-use waterfront building with retail and public access.",
    industry: "Real estate",
    location: "Baltimore, MD",
    phase: "Structural construction",
    health: "At risk",
    confidence: 43,
    change: -12,
    progress: 39,
    nextMilestone: "Top out structure",
    target: "Nov 12, 2026",
    owner: "Leila Morgan",
    forecasts: 23,
    forecasters: 16,
    topForecast: "Curtain-wall package arrives before crane demobilization",
    topForecastProbability: 38,
    risks: ["Facade lead time", "Permit revision", "Weather"],
    watched: true,
  },
  {
    id: "tundra",
    name: "Tundra Carbon Capture Pilot",
    initials: "TC",
    description: "Install a 50,000-ton-per-year capture unit on an operating cement kiln.",
    industry: "Climate infrastructure",
    location: "Laramie, WY",
    phase: "Detailed engineering",
    health: "On track",
    confidence: 78,
    change: 3,
    progress: 46,
    nextMilestone: "HAZOP review complete",
    target: "Oct 2, 2026",
    owner: "Ravi Shah",
    forecasts: 16,
    forecasters: 11,
    topForecast: "Absorber design maintains 90% capture efficiency",
    topForecastProbability: 76,
    risks: ["Steam integration", "EPA review"],
  },
  {
    id: "iris",
    name: "Iris Oncology Assay",
    initials: "IO",
    description:
      "Develop and analytically validate a blood-based recurrence test for colorectal cancer.",
    industry: "Biotechnology",
    location: "Cambridge, MA",
    phase: "Clinical validation",
    health: "Watch",
    confidence: 67,
    change: 1,
    progress: 63,
    nextMilestone: "500th sample processed",
    target: "Sep 30, 2026",
    owner: "Dr. Nia Okafor",
    forecasts: 20,
    forecasters: 14,
    topForecast: "Prospective cohort reaches sensitivity threshold",
    topForecastProbability: 69,
    risks: ["Sample attrition", "Site enrollment"],
  },
  {
    id: "kestrel",
    name: "Kestrel Earth Observation-1",
    initials: "KE",
    description:
      "Build and launch a 12U hyperspectral satellite for agricultural and wildfire monitoring.",
    industry: "Aerospace",
    location: "Long Beach, CA",
    phase: "Integration & test",
    health: "At risk",
    confidence: 49,
    change: -9,
    progress: 76,
    nextMilestone: "Thermal-vacuum test",
    target: "Aug 24, 2026",
    owner: "Jon Bell",
    forecasts: 27,
    forecasters: 18,
    topForecast: "Payload clears thermal-vac without radiator redesign",
    topForecastProbability: 44,
    risks: ["Payload thermal", "Launch slot"],
    watched: true,
  },
  {
    id: "forge",
    name: "Forge Line 4 Automation",
    initials: "FL",
    description:
      "Retrofit a live precision-parts line with robotic inspection and closed-loop control.",
    industry: "Manufacturing",
    location: "Dayton, OH",
    phase: "Site acceptance testing",
    health: "On track",
    confidence: 82,
    change: 7,
    progress: 84,
    nextMilestone: "72-hour production run",
    target: "Aug 19, 2026",
    owner: "Samira Patel",
    forecasts: 11,
    forecasters: 8,
    topForecast: "Automated inspection sustains fewer than 150 false rejects per million",
    topForecastProbability: 79,
    risks: ["Controls tuning"],
  },
  {
    id: "solace",
    name: "Solace Rural Care Network",
    initials: "SC",
    description:
      "Open six hybrid-care clinics and a telehealth hub across three underserved counties.",
    industry: "Healthcare",
    location: "Appalachian Kentucky",
    phase: "Clinic rollout",
    health: "At risk",
    confidence: 54,
    change: -4,
    progress: 52,
    nextMilestone: "First two clinics open",
    target: "Sep 8, 2026",
    owner: "Ada Williams",
    forecasts: 18,
    forecasters: 13,
    topForecast: "At least 14 clinicians are credentialed by opening day",
    topForecastProbability: 52,
    risks: ["Credentialing", "Recruiting", "Fiber install"],
  },
];

export const healthClasses: Record<ProjectHealth, string> = {
  "On track": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Watch: "bg-amber-50 text-amber-700 ring-amber-200",
  "At risk": "bg-rose-50 text-rose-700 ring-rose-200",
};
