import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  Box,
  CheckCircle2,
  CircleAlert,
  Cloud,
  ExternalLink,
  Factory,
  GitCompareArrows,
  GitBranch,
  Radar,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useStore } from "../store";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";

type DependencyKind = "Software" | "Supply chain" | "Service" | "Open source";
type DependencyStatus = "Monitored" | "Attention" | "Critical";

type Dependency = {
  id: string;
  name: string;
  kind: DependencyKind;
  owner: string;
  score: number;
  status: DependencyStatus;
  spend: string;
  description: string;
  integrations?: string[];
  forecastId: string;
  risks: {
    title: string;
    severity: "High" | "Medium" | "Low";
    detail: string;
  }[];
  gaps: string[];
  mitigations: { action: string; owner: string; status: "Ready" | "In progress" | "Missing" }[];
  publicSignal: { summary: string; confidence: "High" | "Medium" | "Low"; peers: string[] };
};

type RiskForecast = {
  probability: number;
  horizon: string;
  movement: string;
  trigger: string;
};

type DependencyEvent = {
  date: string;
  source: string;
  title: string;
  implication: string;
  signal: "Raises risk" | "Reduces risk" | "Watch";
};

type Alternative = {
  name: string;
  fit: string;
  risk: number;
  switchingCost: "Low" | "Medium" | "High";
  knownRisk: string;
  recommendation?: string;
};

const riskForecasts: Record<string, RiskForecast> = {
  "Customer-data exposure": {
    probability: 31,
    horizon: "next 12 months",
    movement: "+6 pts since access review",
    trigger: "New unmanaged service account or material vendor incident",
  },
  "Pricing model change": {
    probability: 42,
    horizon: "next renewal",
    movement: "+4 pts this quarter",
    trigger: "Renewal quote exceeds the approved spend envelope",
  },
  "Build pipeline interruption": {
    probability: 24,
    horizon: "next 90 days",
    movement: "−3 pts after mirror test",
    trigger: "Availability incident exceeds 60 minutes during a release window",
  },
  "Third-party action exposure": {
    probability: 37,
    horizon: "next 12 months",
    movement: "+8 pts from unpinned action inventory",
    trigger: "Critical workflow uses an unverified action release",
  },
  "Shipment visibility gap": {
    probability: 57,
    horizon: "Atlas beta build",
    movement: "+11 pts this week",
    trigger: "Milestone status is more than 48 hours stale",
  },
  "Single-forwarder concentration": {
    probability: 63,
    horizon: "next 2 quarters",
    movement: "flat; no alternate lane contracted",
    trigger: "Primary lane misses its delivery SLA twice in a month",
  },
  "Capacity allocation risk": {
    probability: 68,
    horizon: "Atlas beta build",
    movement: "+9 pts after allocation slip",
    trigger: "Signed allocation commitment is not received by the next gate",
  },
  "Geographic concentration": {
    probability: 46,
    horizon: "next 12 months",
    movement: "flat; second source not qualified",
    trigger: "Regional disruption or export restriction impacts the source region",
  },
  "Regional service disruption": {
    probability: 19,
    horizon: "next 12 months",
    movement: "−2 pts after resilience review",
    trigger: "A regional incident breaches the customer recovery objective",
  },
  "Model availability and rate limits": {
    probability: 44,
    horizon: "next 6 months",
    movement: "+7 pts as usage concentration rises",
    trigger: "Rate-limit errors cross the agreed product-error budget",
  },
  "Vendor roadmap divergence": {
    probability: 34,
    horizon: "next 12 months",
    movement: "flat; contract flexibility is limited",
    trigger: "A material API or pricing deprecation is announced",
  },
  "Billing event delay": {
    probability: 17,
    horizon: "next 12 months",
    movement: "−1 pt after replay audit",
    trigger: "Billing webhooks are delayed beyond four hours",
  },
  "Maintainer concentration": {
    probability: 29,
    horizon: "next 12 months",
    movement: "+5 pts for unowned add-ons",
    trigger: "A critical package has no supported security fix within 14 days",
  },
};

const dependencyEvents: Record<string, DependencyEvent[]> = {
  salesforce: [
    {
      date: "Aug 7",
      source: "Internal access review",
      title: "Two unmanaged service accounts remain",
      implication:
        "Expands the blast radius of a customer-data incident until ownership is assigned.",
      signal: "Raises risk",
    },
    {
      date: "Jul 29",
      source: "Revenue ops",
      title: "Renewal discovery opened",
      implication:
        "Creates an early window to test pricing and continuity assumptions before the quote arrives.",
      signal: "Watch",
    },
  ],
  github: [
    {
      date: "Aug 8",
      source: "Platform telemetry",
      title: "Repository mirror restoration passed",
      implication: "Reduces recovery time for source access; CI fallback remains untested.",
      signal: "Reduces risk",
    },
    {
      date: "Aug 2",
      source: "Dependency scan",
      title: "Six critical workflows use floating action tags",
      implication: "Keeps the third-party action exposure forecast elevated.",
      signal: "Raises risk",
    },
  ],
  flexport: [
    {
      date: "Aug 9",
      source: "Shipment milestone feed",
      title: "Atlas component ETA moved by four days",
      implication: "Consumes contingency on the beta build and raises the visibility-gap forecast.",
      signal: "Raises risk",
    },
    {
      date: "Aug 1",
      source: "Logistics review",
      title: "Critical-lane alert configured",
      implication: "Improves time to intervene, but does not address forwarder concentration.",
      signal: "Reduces risk",
    },
  ],
  "cell-supplier": [
    {
      date: "Aug 8",
      source: "Supplier program review",
      title: "Allocation confirmation slipped to the next gate",
      implication: "Directly raises the likelihood of an Atlas beta schedule impact.",
      signal: "Raises risk",
    },
    {
      date: "Jul 31",
      source: "Industry capacity monitor",
      title: "Regional cell capacity remains constrained",
      implication:
        "Supports the geographic-concentration scenario; treat as an external corroborating signal.",
      signal: "Watch",
    },
  ],
  aws: [
    {
      date: "Aug 5",
      source: "SRE resilience review",
      title: "Failover runbook updated",
      implication:
        "Documentation improved; probability will not fall materially until a live exercise completes.",
      signal: "Watch",
    },
  ],
  "openai-api": [
    {
      date: "Aug 7",
      source: "AI platform telemetry",
      title: "Peak inference traffic concentrated in one provider",
      implication:
        "Raises impact of a rate-limit or availability event; fallback routing is still a gap.",
      signal: "Raises risk",
    },
  ],
  stripe: [
    {
      date: "Aug 4",
      source: "Finance systems",
      title: "Webhook replay audit completed",
      implication: "Lowers the chance that a transient event delay becomes a collection incident.",
      signal: "Reduces risk",
    },
  ],
  kubernetes: [
    {
      date: "Aug 6",
      source: "Security engineering",
      title: "Critical add-on inventory started",
      implication: "Creates the evidence needed to update maintainer-concentration estimates.",
      signal: "Watch",
    },
  ],
};

const alternativesByDependency: Record<string, Alternative[]> = {
  salesforce: [
    {
      name: "HubSpot Enterprise",
      fit: "CRM continuity / mid-market workflows",
      risk: 49,
      switchingCost: "High",
      knownRisk: "Migration effort and enterprise permission-model gaps.",
      recommendation: "Best continuity candidate; validate data-model coverage.",
    },
    {
      name: "Microsoft Dynamics 365",
      fit: "Microsoft-centric revenue stack",
      risk: 54,
      switchingCost: "High",
      knownRisk: "Implementation complexity and partner dependence.",
    },
  ],
  github: [
    {
      name: "GitLab",
      fit: "Source control + CI consolidation",
      risk: 52,
      switchingCost: "High",
      knownRisk: "Runner capacity and migration complexity.",
    },
    {
      name: "Bitbucket + Pipelines",
      fit: "Atlassian-native teams",
      risk: 56,
      switchingCost: "High",
      knownRisk: "Ecosystem lock-in and CI feature parity.",
    },
  ],
  flexport: [
    {
      name: "Kuehne+Nagel",
      fit: "Critical-lane forwarding",
      risk: 55,
      switchingCost: "Medium",
      knownRisk: "Lane availability and onboarding lead time.",
      recommendation: "Pre-qualify now as the second-lane option.",
    },
    {
      name: "Expeditors",
      fit: "Global freight forwarding",
      risk: 59,
      switchingCost: "Medium",
      knownRisk: "Less integrated shipment visibility.",
    },
  ],
  "cell-supplier": [
    {
      name: "Northstar Cells",
      fit: "Atlas beta second source",
      risk: 61,
      switchingCost: "High",
      knownRisk: "Validation timeline and lower initial allocation.",
      recommendation: "Fund validation; it lowers concentration even before full volume.",
    },
    {
      name: "Regional contract manufacturer",
      fit: "Bridge capacity",
      risk: 67,
      switchingCost: "High",
      knownRisk: "Quality variability and limited cell chemistry choice.",
    },
  ],
  aws: [
    {
      name: "Google Cloud",
      fit: "Regional resilience for selected services",
      risk: 48,
      switchingCost: "High",
      knownRisk: "Multi-cloud operational complexity.",
    },
    {
      name: "Azure",
      fit: "Enterprise workload failover",
      risk: 51,
      switchingCost: "High",
      knownRisk: "Identity and networking migration effort.",
    },
  ],
  "openai-api": [
    {
      name: "Anthropic API",
      fit: "Model routing fallback",
      risk: 47,
      switchingCost: "Medium",
      knownRisk: "Quality variance by task and provider concentration remains.",
      recommendation: "Benchmark for the two highest-volume workflows first.",
    },
    {
      name: "Self-hosted open model",
      fit: "Sensitive or predictable workloads",
      risk: 58,
      switchingCost: "High",
      knownRisk: "Capacity, evaluation, and model-operations burden.",
    },
  ],
  stripe: [
    {
      name: "Adyen",
      fit: "Enterprise payments redundancy",
      risk: 46,
      switchingCost: "High",
      knownRisk: "Regional coverage and migration of billing logic.",
    },
    {
      name: "Braintree",
      fit: "Secondary card processing",
      risk: 53,
      switchingCost: "Medium",
      knownRisk: "Feature parity and reconciliation overhead.",
    },
  ],
  kubernetes: [
    {
      name: "Managed Kubernetes distribution",
      fit: "Supportability for core clusters",
      risk: 43,
      switchingCost: "Medium",
      knownRisk: "Platform-specific APIs and support-cost increase.",
    },
    {
      name: "Container platform with vendor support",
      fit: "Critical workload isolation",
      risk: 50,
      switchingCost: "High",
      knownRisk: "Platform lock-in and operating-model change.",
    },
  ],
};

const dependencies: Dependency[] = [
  {
    id: "salesforce",
    name: "Salesforce",
    kind: "Software",
    owner: "Revenue systems",
    score: 71,
    status: "Attention",
    spend: "$420k / yr",
    description: "CRM system of record for pipeline, customer data, and renewal workflows.",
    integrations: ["Salesforce"],
    forecastId: "q-cyber-vendor",
    risks: [
      {
        title: "Customer-data exposure",
        severity: "High",
        detail: "Broad access and data-sync permissions increase the impact of a vendor incident.",
      },
      {
        title: "Pricing model change",
        severity: "Medium",
        detail: "Consumption pricing could materially change renewal economics.",
      },
    ],
    gaps: ["No tested CRM outage runbook", "Two service accounts lack named owners"],
    mitigations: [
      { action: "Run a quarterly access review", owner: "Security", status: "In progress" },
      { action: "Test read-only CRM continuity export", owner: "Revenue ops", status: "Missing" },
    ],
    publicSignal: {
      summary:
        "Public product documentation and partner pages show this is a common CRM dependency across the category.",
      confidence: "High",
      peers: ["Microsoft", "HubSpot", "Atlassian"],
    },
  },
  {
    id: "github",
    name: "GitHub",
    kind: "Software",
    owner: "Engineering",
    score: 58,
    status: "Attention",
    spend: "$180k / yr",
    description: "Source control, CI workflows, dependency scanning, and developer identity.",
    integrations: ["GitHub"],
    forecastId: "q-uptime",
    risks: [
      {
        title: "Build pipeline interruption",
        severity: "High",
        detail: "A prolonged platform disruption would block deploys and incident fixes.",
      },
      {
        title: "Third-party action exposure",
        severity: "Medium",
        detail: "Unpinned CI actions create a software supply-chain attack surface.",
      },
    ],
    gaps: ["No critical-workflow fallback inventory", "Dependency review SLA is not measured"],
    mitigations: [
      { action: "Pin and attest critical actions", owner: "Platform", status: "In progress" },
      {
        action: "Export break-glass repository mirror",
        owner: "Developer experience",
        status: "Ready",
      },
    ],
    publicSignal: {
      summary:
        "Engineering job posts and public repositories make GitHub dependence visible across most software peers.",
      confidence: "High",
      peers: ["Microsoft", "OpenAI", "Atlassian"],
    },
  },
  {
    id: "flexport",
    name: "Flexport",
    kind: "Service",
    owner: "Logistics",
    score: 76,
    status: "Critical",
    spend: "$1.2m / yr",
    description: "Freight forwarding and shipment visibility for Atlas program components.",
    integrations: ["Flexport"],
    forecastId: "q-atlas-supplier-delay",
    risks: [
      {
        title: "Shipment visibility gap",
        severity: "High",
        detail: "Late status updates compress the window to mitigate a supplier delay.",
      },
      {
        title: "Single-forwarder concentration",
        severity: "High",
        detail: "No pre-negotiated alternate lane for critical components.",
      },
    ],
    gaps: ["No alternative forwarder on file", "Escalation contact tree is stale"],
    mitigations: [
      { action: "Pre-qualify an alternate forwarder", owner: "Procurement", status: "In progress" },
      { action: "Set critical-lane delay alert", owner: "Program ops", status: "Ready" },
    ],
    publicSignal: {
      summary:
        "Public logistics case studies indicate freight-forwarder concentration is industry-wide; exact peer contracts are not verified.",
      confidence: "Medium",
      peers: ["Rivian", "Lucid", "Polestar"],
    },
  },
  {
    id: "cell-supplier",
    name: "Apex Cell Systems",
    kind: "Supply chain",
    owner: "Procurement",
    score: 84,
    status: "Critical",
    spend: "$8.6m / yr",
    description: "Tier-1 battery-cell supplier for the Atlas EV beta build.",
    forecastId: "q-atlas-supplier-delay",
    risks: [
      {
        title: "Capacity allocation risk",
        severity: "High",
        detail: "Allocation confirmation remains a gating event for the beta build.",
      },
      {
        title: "Geographic concentration",
        severity: "High",
        detail: "A single region supports the current cell program.",
      },
    ],
    gaps: ["No second-source qualification plan", "Supplier financial review is 90 days old"],
    mitigations: [
      {
        action: "Secure signed allocation commitment",
        owner: "Procurement",
        status: "In progress",
      },
      { action: "Fund second-source validation", owner: "Atlas program", status: "Missing" },
    ],
    publicSignal: {
      summary:
        "Public earnings calls and industry reporting indicate battery capacity remains a shared sector constraint.",
      confidence: "Medium",
      peers: ["Rivian", "Lucid", "Tesla"],
    },
  },
  {
    id: "aws",
    name: "AWS",
    kind: "Software",
    owner: "Infrastructure",
    score: 45,
    status: "Monitored",
    spend: "$940k / yr",
    description: "Primary cloud hosting, data storage, and managed compute platform.",
    forecastId: "q-cloud",
    risks: [
      {
        title: "Regional service disruption",
        severity: "Medium",
        detail: "The highest-traffic workflow remains single-region.",
      },
    ],
    gaps: ["Recovery objective is not validated against a live failover"],
    mitigations: [{ action: "Exercise regional failover", owner: "SRE", status: "In progress" }],
    publicSignal: {
      summary:
        "Cloud infrastructure concentration is visible across public architecture and hiring signals in the software sector.",
      confidence: "High",
      peers: ["OpenAI", "Atlassian", "Salesforce"],
    },
  },
  {
    id: "openai-api",
    name: "OpenAI API",
    kind: "Software",
    owner: "AI product",
    score: 62,
    status: "Attention",
    spend: "$620k / yr",
    description: "Model inference for assisted analysis and summarization features.",
    forecastId: "q-cloud",
    risks: [
      {
        title: "Model availability and rate limits",
        severity: "High",
        detail: "No tested degradation experience for core AI workflows.",
      },
      {
        title: "Vendor roadmap divergence",
        severity: "Medium",
        detail: "A product-surface shift could alter platform economics.",
      },
    ],
    gaps: ["No fallback-model routing policy", "Quality regression threshold is undefined"],
    mitigations: [
      { action: "Define model fallback tiers", owner: "AI platform", status: "In progress" },
      { action: "Benchmark alternate provider", owner: "Research", status: "Missing" },
    ],
    publicSignal: {
      summary:
        "Public product announcements show broad model-provider dependency, but do not establish peer contract terms.",
      confidence: "Medium",
      peers: ["Microsoft", "Salesforce", "Atlassian"],
    },
  },
  {
    id: "stripe",
    name: "Stripe",
    kind: "Service",
    owner: "Finance systems",
    score: 39,
    status: "Monitored",
    spend: "$290k / yr",
    description: "Payment processing, billing events, and subscription lifecycle.",
    forecastId: "q-opex",
    risks: [
      {
        title: "Billing event delay",
        severity: "Medium",
        detail: "A failure could delay cash collection and customer provisioning.",
      },
    ],
    gaps: ["No manual-payment continuity guide"],
    mitigations: [
      { action: "Document manual collection fallback", owner: "Finance ops", status: "Ready" },
    ],
    publicSignal: {
      summary:
        "Payment-provider usage is widely visible in public web and checkout implementations across SaaS peers.",
      confidence: "Medium",
      peers: ["HubSpot", "Atlassian", "Figma"],
    },
  },
  {
    id: "kubernetes",
    name: "Kubernetes ecosystem",
    kind: "Open source",
    owner: "Platform",
    score: 51,
    status: "Monitored",
    spend: "Internal support",
    description: "Core orchestration layer and collection of maintained open-source packages.",
    forecastId: "q-uptime",
    risks: [
      {
        title: "Maintainer concentration",
        severity: "Medium",
        detail: "Critical add-ons have limited maintainership and patch coverage.",
      },
    ],
    gaps: ["No package criticality tiering", "SBOM is not tied to production services"],
    mitigations: [
      {
        action: "Tier cluster add-ons by criticality",
        owner: "Security engineering",
        status: "In progress",
      },
    ],
    publicSignal: {
      summary:
        "Public repository activity makes ecosystem maturity measurable across the industry.",
      confidence: "High",
      peers: ["Google", "Microsoft", "Atlassian"],
    },
  },
];

const statusTone: Record<DependencyStatus, string> = {
  Monitored: "text-emerald-700 bg-emerald-500/10",
  Attention: "text-amber-700 bg-amber-500/10",
  Critical: "text-rose-700 bg-rose-500/10",
};

export default function Dependencies() {
  const { yesOutcome } = useStore();
  const [selectedId, setSelectedId] = useState(dependencies[0].id);
  const [dossierTab, setDossierTab] = useState<
    "Overview" | "Forecasts" | "Signals" | "Alternatives"
  >("Overview");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<DependencyKind | "All">("All");
  const [connected, setConnected] = useState<string[]>([]);
  const selected = dependencies.find((item) => item.id === selectedId) ?? dependencies[0];
  const visible = useMemo(
    () =>
      dependencies.filter(
        (item) =>
          (kind === "All" || item.kind === kind) &&
          `${item.name} ${item.owner}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [kind, search],
  );
  const riskScore = Math.round(
    dependencies.reduce((sum, item) => sum + item.score, 0) / dependencies.length,
  );
  const gaps = dependencies.reduce((sum, item) => sum + item.gaps.length, 0);
  const forecastProbability = yesOutcome(selected.forecastId)?.currentProbability;
  const selectedEvents = dependencyEvents[selected.id] ?? [];
  const alternatives = alternativesByDependency[selected.id] ?? [];

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-5 py-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Organization resilience</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Dependencies</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            A single registry for the vendors, suppliers, services, and packages your organization
            relies on—connected to risk, forecasts, and mitigation work.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            setConnected((items) => (items.includes(selected.id) ? items : [...items, selected.id]))
          }
        >
          <GitBranch className="size-4" /> Integrate {selected.name}
        </Button>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3">
            <span className="rounded-lg bg-rose-500/10 p-2 text-rose-700">
              <ShieldAlert className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold">{riskScore}</p>
              <p className="text-sm text-muted-foreground">overall dependency risk</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <span className="rounded-lg bg-amber-500/10 p-2 text-amber-700">
              <Box className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold">{dependencies.length}</p>
              <p className="text-sm text-muted-foreground">registered dependencies</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <Factory className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold">{gaps}</p>
              <p className="text-sm text-muted-foreground">unclosed control gaps</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-700">
              <CheckCircle2 className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold">{connected.length}</p>
              <p className="text-sm text-muted-foreground">deep integrations enabled</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(400px,440px)]">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search dependencies or owners"
              className="min-w-56 flex-1"
            />
            {(["All", "Software", "Supply chain", "Service", "Open source"] as const).map(
              (value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={kind === value ? "secondary" : "outline"}
                  onClick={() => setKind(value)}
                >
                  {value}
                </Button>
              ),
            )}
          </div>
          <div className="overflow-hidden rounded-xl border bg-card">
            {visible.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedId(item.id);
                  setDossierTab("Overview");
                }}
                className={`grid w-full gap-3 border-b p-4 text-left last:border-b-0 md:grid-cols-[minmax(0,1fr)_6rem_7rem] md:items-center ${selected.id === item.id ? "bg-primary/5" : "hover:bg-muted/50"}`}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{item.name}</span>
                    <Badge variant="outline">{item.kind}</Badge>
                    {connected.includes(item.id) && <Badge>Connected</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Owner: {item.owner} · {item.spend}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Risk score</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{item.score}</p>
                </div>
                <span
                  className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${statusTone[item.status]}`}
                >
                  {item.status}
                </span>
              </button>
            ))}
          </div>
        </div>

        <aside className="h-fit rounded-xl border bg-card p-5 xl:sticky xl:top-20">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-primary">Dependency dossier</p>
              <h2 className="mt-1 text-xl font-semibold">{selected.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {selected.owner} · {selected.kind}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone[selected.status]}`}
            >
              {selected.status}
            </span>
          </div>
          <div className="mt-5 grid grid-cols-4 rounded-lg bg-muted p-1">
            {(["Overview", "Forecasts", "Signals", "Alternatives"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setDossierTab(tab)}
                className={`rounded-md px-1.5 py-1.5 text-xs font-medium transition-colors ${dossierTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {tab}
              </button>
            ))}
          </div>
          {dossierTab === "Overview" && (
            <>
              <p className="mt-4 text-sm leading-5 text-muted-foreground">{selected.description}</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Risk score</p>
                  <p className="mt-1 text-2xl font-semibold">{selected.score}</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Linked forecast</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {forecastProbability === undefined
                      ? "—"
                      : `${Math.round(forecastProbability * 100)}%`}
                  </p>
                </div>
              </div>
              <div className="mt-5 border-t pt-4">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Risk and forecast gaps
                </p>
                <div className="mt-3 space-y-3">
                  {selected.risks.map((risk) => (
                    <div key={risk.title} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{risk.title}</p>
                        <Badge variant={risk.severity === "High" ? "destructive" : "outline"}>
                          {risk.severity}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs leading-4 text-muted-foreground">{risk.detail}</p>
                    </div>
                  ))}
                  {selected.gaps.map((gap) => (
                    <div key={gap} className="flex gap-2 text-sm">
                      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
                      {gap}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5 border-t pt-4">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Mitigation plan
                </p>
                <div className="mt-3 space-y-2">
                  {selected.mitigations.map((item) => (
                    <div key={item.action} className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{item.action}</p>
                        <p className="text-xs text-muted-foreground">{item.owner}</p>
                      </div>
                      <Badge variant={item.status === "Missing" ? "destructive" : "outline"}>
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5 rounded-lg border border-dashed bg-muted/30 p-3">
                <div className="flex gap-2">
                  <Users className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Public competitor context</p>
                    <p className="mt-1 text-xs leading-4 text-muted-foreground">
                      {selected.publicSignal.summary}
                    </p>
                    <p className="mt-2 text-xs font-medium">
                      Peer public footprint: {selected.publicSignal.peers.join(", ")} ·{" "}
                      {selected.publicSignal.confidence} confidence
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
          {dossierTab === "Forecasts" && (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center gap-2">
                  <Radar className="size-4 text-primary" />
                  <p className="text-sm font-semibold">Decision forecast</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  The linked outcome is currently{" "}
                  <span className="font-semibold text-foreground">
                    {forecastProbability === undefined
                      ? "not yet estimated"
                      : `${Math.round(forecastProbability * 100)}% likely`}
                  </span>
                  . Use the risk forecasts below to decide which mitigation to fund before that
                  outcome moves.
                </p>
              </div>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Calibrated risk forecasts
              </p>
              {selected.risks.map((risk) => {
                const estimate = riskForecasts[risk.title];
                return (
                  <div key={risk.title} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{risk.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {estimate?.horizon ?? "next 12 months"}
                        </p>
                      </div>
                      <p className="text-xl font-semibold tabular-nums">
                        {estimate?.probability ?? "—"}
                        {estimate ? "%" : ""}
                      </p>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${estimate?.probability ?? 0}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{estimate?.movement}</p>
                    <p className="mt-2 border-t pt-2 text-xs leading-4 text-muted-foreground">
                      <span className="font-medium text-foreground">Update when: </span>
                      {estimate?.trigger}
                    </p>
                  </div>
                );
              })}
              <p className="px-1 text-xs leading-4 text-muted-foreground">
                Estimates are operating priors, not vendor incident predictions. Update them from
                observable triggers and score them against what occurs.
              </p>
            </div>
          )}
          {dossierTab === "Signals" && (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <CalendarClock className="size-4 text-primary" />
                  <p className="text-sm font-semibold">Risk-relevant events</p>
                </div>
                <p className="mt-1 text-xs leading-4 text-muted-foreground">
                  Evidence is separated from interpretation so the forecast can be revised without
                  overreacting to a headline.
                </p>
              </div>
              {selectedEvents.map((event) => (
                <article key={`${event.date}-${event.title}`} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {event.date} · {event.source}
                    </p>
                    <Badge variant={event.signal === "Raises risk" ? "destructive" : "outline"}>
                      {event.signal}
                    </Badge>
                  </div>
                  <h3 className="mt-2 text-sm font-medium">{event.title}</h3>
                  <p className="mt-1 text-xs leading-4 text-muted-foreground">
                    {event.implication}
                  </p>
                </article>
              ))}
              <div className="flex gap-2 rounded-lg border border-dashed p-3 text-xs leading-4 text-muted-foreground">
                <CircleAlert className="size-4 shrink-0 text-amber-600" />
                Public signals describe observable market context; internal events are the primary
                evidence for this dependency’s risk estimate.
              </div>
            </div>
          )}
          {dossierTab === "Alternatives" && (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <GitCompareArrows className="size-4 text-primary" />
                  <p className="text-sm font-semibold">Continuity options</p>
                </div>
                <p className="mt-1 text-xs leading-4 text-muted-foreground">
                  Comparison risk includes switching and concentration risk—not just the
                  alternative’s product risk.
                </p>
              </div>
              {alternatives.map((alternative) => (
                <article key={alternative.name} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-medium">{alternative.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{alternative.fit}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold tabular-nums">{alternative.risk}</p>
                      <p className="text-[11px] text-muted-foreground">risk score</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded bg-muted px-2 py-1.5">
                      <span className="text-muted-foreground">Switching: </span>
                      {alternative.switchingCost}
                    </div>
                    <div className="rounded bg-muted px-2 py-1.5">
                      <span className="text-muted-foreground">Delta: </span>
                      {alternative.risk - selected.score > 0 ? "+" : ""}
                      {alternative.risk - selected.score} pts
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-4 text-muted-foreground">
                    <span className="font-medium text-foreground">Known risk: </span>
                    {alternative.knownRisk}
                  </p>
                  {alternative.recommendation && (
                    <p className="mt-2 text-xs leading-4 text-primary">
                      <span className="font-medium">Next move: </span>
                      {alternative.recommendation}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setConnected((items) =>
                  items.includes(selected.id) ? items : [...items, selected.id],
                )
              }
            >
              {connected.includes(selected.id) ? "Integration enabled" : "Connect source"}
              <ExternalLink className="size-4" />
            </Button>
            <Button render={<Link to={`/q/${selected.forecastId}`} />}>
              Open forecast <ArrowRight className="size-4" />
            </Button>
          </div>
        </aside>
      </section>

      <section className="rounded-xl border border-dashed bg-muted/30 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Operating workflow</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect a system, assign its dependency owner, close gaps, and use the linked forecast
              to decide when mitigation is warranted.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Cloud className="size-4" />
            <span>Connect</span>
            <ArrowRight className="size-4" />
            <span>Assess</span>
            <ArrowRight className="size-4" />
            <span>Mitigate</span>
            <ArrowRight className="size-4" />
            <span className="text-foreground">Monitor</span>
          </div>
        </div>
      </section>
    </main>
  );
}
