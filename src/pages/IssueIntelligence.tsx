import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Layers3,
  Sparkles,
  Ticket,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../components/ui/drawer";
import {
  mockIssues,
  type IssueSignalSource,
  type MockIssue,
  type MockIssueTheme,
} from "../domain/mockIssueIntelligence";

type PriorityFilter = "All" | MockIssue["priority"];
type StatusFilter = "All" | MockIssue["status"];
type Scenario = "base" | "upside" | "downside";

type Theme = {
  id: MockIssueTheme;
  name: string;
  summary: string;
  momentum: string;
  momentumTone: string;
  owners: string;
  signal: "Emerging" | "Accelerating" | "Persistent";
  investability: string;
  question: string;
  probability: number;
  confidence: number;
  forecastId: string;
  evidence: string[];
};

const themes: Theme[] = [
  {
    id: "activation",
    name: "Enterprise activation friction",
    summary: "Admins repeatedly stall at provisioning, permissions, and first-value setup.",
    momentum: "+38% in 30d",
    momentumTone: "text-rose-600",
    owners: "Growth · Platform",
    signal: "Accelerating",
    investability: "High-leverage product bet",
    question:
      "Will reducing enterprise activation time below 1 day lift expansion conversion by 10% or more this quarter?",
    probability: 0.64,
    confidence: 0.71,
    forecastId: "q-product-launch",
    evidence: [
      "61% of tickets mention role mapping or SCIM provisioning.",
      "The issue is concentrated in accounts above 500 seats.",
      "Support escalation volume rose in three consecutive releases.",
    ],
  },
  {
    id: "reliability",
    name: "Workflow reliability at scale",
    summary: "Long-running workflows fail disproportionately for high-volume customers.",
    momentum: "+22% in 30d",
    momentumTone: "text-amber-600",
    owners: "Core product · Infrastructure",
    signal: "Persistent",
    investability: "Protect expansion revenue",
    question:
      "Will workflow reliability remain below the enterprise SLA through the next planning cycle?",
    probability: 0.57,
    confidence: 0.68,
    forecastId: "q-uptime",
    evidence: [
      "Failure reports cluster around bulk imports and retry behavior.",
      "18 strategic accounts account for 44% of related ticket volume.",
      "Ticket language has shifted from intermittent to blocking.",
    ],
  },
  {
    id: "intelligence",
    name: "Decision-ready reporting gap",
    summary: "Teams ask for clearer trend explanations, not simply more dashboards.",
    momentum: "+47% in 30d",
    momentumTone: "text-rose-600",
    owners: "Analytics · AI",
    signal: "Emerging",
    investability: "New product wedge",
    question:
      "Will an explainable insights workflow become a top-three expansion driver for enterprise accounts?",
    probability: 0.43,
    confidence: 0.54,
    forecastId: "q-cloud",
    evidence: [
      "Requests pair data export with a desire to understand why metrics moved.",
      "Director-level users authored 39% of the source issues.",
      "Similar language appears in renewal-call notes and product feedback.",
    ],
  },
  {
    id: "integrations",
    name: "Integration maintenance burden",
    summary: "API changes and connector breakage are absorbing support and engineering capacity.",
    momentum: "+14% in 30d",
    momentumTone: "text-amber-600",
    owners: "Ecosystem · Developer platform",
    signal: "Persistent",
    investability: "Efficiency and retention bet",
    question:
      "Will investing in integration reliability reduce enterprise support volume by at least 15%?",
    probability: 0.59,
    confidence: 0.62,
    forecastId: "q-opex",
    evidence: [
      "Six connectors generate over half of maintenance-related issues.",
      "The same failures recur after partner API version changes.",
      "Affected accounts have materially lower self-serve resolution rates.",
    ],
  },
  {
    id: "governance",
    name: "Governance and audit controls",
    summary:
      "Enterprise administrators need provable controls, traceability, and scoped retention.",
    momentum: "+31% in 30d",
    momentumTone: "text-rose-600",
    owners: "Security · Enterprise platform",
    signal: "Accelerating",
    investability: "Enterprise unlock",
    question:
      "Will closing the audit-control gap improve enterprise win rates in regulated segments this half?",
    probability: 0.68,
    confidence: 0.73,
    forecastId: "q-cyber-compliance",
    evidence: [
      "Auditability is named in procurement objections.",
      "Requests are concentrated in regulated enterprise accounts.",
      "Security reviews repeatedly flag retention controls.",
    ],
  },
  {
    id: "mobile",
    name: "Frontline mobile execution",
    summary: "Field teams need a reliable offline-first workflow for approvals and status changes.",
    momentum: "+26% in 30d",
    momentumTone: "text-amber-600",
    owners: "Mobile · Field operations",
    signal: "Emerging",
    investability: "New user segment",
    question:
      "Will improving mobile execution increase retained weekly frontline users by 15% or more?",
    probability: 0.52,
    confidence: 0.58,
    forecastId: "q-product-launch",
    evidence: [
      "Offline failures recur in operational handoffs.",
      "Mobile requests are concentrated in field-led accounts.",
      "Approval latency is cited as a reason for reverting to email.",
    ],
  },
  {
    id: "performance",
    name: "Large-workspace performance",
    summary:
      "Search, filtering, and saved views degrade precisely where account expansion is strongest.",
    momentum: "+35% in 30d",
    momentumTone: "text-rose-600",
    owners: "Search · Infrastructure",
    signal: "Accelerating",
    investability: "Retention defense",
    question:
      "Will search and view latency remain a material expansion blocker for large workspaces next quarter?",
    probability: 0.61,
    confidence: 0.69,
    forecastId: "q-uptime",
    evidence: [
      "Latency clusters around the largest workspaces.",
      "High-value accounts disproportionately generate related escalations.",
      "Issue language increasingly describes workarounds rather than annoyance.",
    ],
  },
  {
    id: "billing",
    name: "Usage and billing predictability",
    summary:
      "Customers need trustworthy usage explanations before cost volatility becomes a renewal risk.",
    momentum: "+19% in 30d",
    momentumTone: "text-amber-600",
    owners: "Billing · Customer operations",
    signal: "Persistent",
    investability: "Margin and trust bet",
    question:
      "Will explainable usage and billing reduce commercial escalations by at least 20% this half?",
    probability: 0.55,
    confidence: 0.64,
    forecastId: "q-opex",
    evidence: [
      "Invoice reconciliation repeats across account segments.",
      "Cost-center attribution is requested in expansion conversations.",
      "Commercial teams are manually explaining usage every month.",
    ],
  },
  {
    id: "collaboration",
    name: "Cross-team decision continuity",
    summary: "Critical decisions lose context as work moves between teams and approvals.",
    momentum: "+24% in 30d",
    momentumTone: "text-amber-600",
    owners: "Collaboration · Core product",
    signal: "Emerging",
    investability: "Adoption depth",
    question: "Will preserving cross-team decision context improve multi-team weekly retention?",
    probability: 0.49,
    confidence: 0.57,
    forecastId: "q-product-launch",
    evidence: [
      "Handoffs repeatedly restart the same investigation.",
      "Approval history is requested during postmortems.",
      "Multi-team workspaces generate the highest concentration.",
    ],
  },
  {
    id: "onboarding",
    name: "Use-case guided onboarding",
    summary: "New teams need an opinionated first workflow, not an empty workspace.",
    momentum: "+29% in 30d",
    momentumTone: "text-rose-600",
    owners: "Growth · Customer success",
    signal: "Accelerating",
    investability: "Activation lever",
    question:
      "Will guided onboarding improve week-four activation for new workspaces by 12% or more?",
    probability: 0.63,
    confidence: 0.67,
    forecastId: "q-product-launch",
    evidence: [
      "Requests cluster in the first two weeks of adoption.",
      "Templates are underused despite high setup effort.",
      "Customer-success teams repeat the same orientation call.",
    ],
  },
  {
    id: "dataQuality",
    name: "Trusted operational data",
    summary: "Teams cannot make decisions when exports, dashboards, and source records disagree.",
    momentum: "+33% in 30d",
    momentumTone: "text-rose-600",
    owners: "Data platform · Analytics",
    signal: "Accelerating",
    investability: "Decision trust",
    question:
      "Will data-quality improvements reduce executive reporting escalations by 25% this half?",
    probability: 0.58,
    confidence: 0.66,
    forecastId: "q-cloud",
    evidence: [
      "The same metric discrepancy appears in independent channels.",
      "Leaders cite trust rather than feature gaps.",
      "Manual reconciliation has become a recurring workflow.",
    ],
  },
  {
    id: "automation",
    name: "Workflow automation expressiveness",
    summary:
      "Teams hit the boundary between simple rules and the exceptions their operations require.",
    momentum: "+21% in 30d",
    momentumTone: "text-amber-600",
    owners: "Workflow automation · Platform",
    signal: "Persistent",
    investability: "Scale efficiency",
    question:
      "Will a more expressive automation layer drive meaningful expansion among power users?",
    probability: 0.54,
    confidence: 0.61,
    forecastId: "q-opex",
    evidence: [
      "Common exceptions are handled manually.",
      "Failure explanations are absent at the moment of need.",
      "Enterprise accounts maintain parallel processes outside the product.",
    ],
  },
  {
    id: "localization",
    name: "International readiness",
    summary: "Regional language, date, and policy requirements are blocking broader adoption.",
    momentum: "+17% in 30d",
    momentumTone: "text-amber-600",
    owners: "International · Product",
    signal: "Persistent",
    investability: "Geographic expansion",
    question:
      "Will targeted internationalization unlock measurable pipeline in priority regions this year?",
    probability: 0.46,
    confidence: 0.52,
    forecastId: "q-fx",
    evidence: [
      "Localization requests occur alongside procurement conversations.",
      "Regional workflows currently require manual workarounds.",
      "The signal spans interface, policy, and reporting needs.",
    ],
  },
  {
    id: "permissions",
    name: "Granular partner permissions",
    summary:
      "Organizations need to collaborate externally without exposing sensitive operational data.",
    momentum: "+28% in 30d",
    momentumTone: "text-rose-600",
    owners: "Identity · Platform",
    signal: "Accelerating",
    investability: "Enterprise collaboration",
    question:
      "Will granular permissions increase partner-workflow adoption in enterprise accounts?",
    probability: 0.62,
    confidence: 0.7,
    forecastId: "q-cyber-iam",
    evidence: [
      "Guest access concerns delay partner rollouts.",
      "Security teams request field-level controls.",
      "Permission propagation failures create operational risk.",
    ],
  },
  {
    id: "observability",
    name: "Integration observability",
    summary: "Developers need to trace failures before integrations become a support burden.",
    momentum: "+36% in 30d",
    momentumTone: "text-rose-600",
    owners: "Developer experience · Infrastructure",
    signal: "Accelerating",
    investability: "Platform retention",
    question:
      "Will customer-visible integration observability reduce support-assisted debugging by 20%?",
    probability: 0.6,
    confidence: 0.68,
    forecastId: "q-uptime",
    evidence: [
      "Teams cannot identify where delivery failed.",
      "Support investigations lack a shared trace.",
      "The issue grows with integration breadth.",
    ],
  },
  {
    id: "migration",
    name: "Safe enterprise migration",
    summary:
      "Large customers need confidence that historical data and relationships will survive cutover.",
    momentum: "+27% in 30d",
    momentumTone: "text-amber-600",
    owners: "Enterprise migrations · Platform",
    signal: "Emerging",
    investability: "Displacement motion",
    question: "Will safer migration tooling increase enterprise displacement wins this half?",
    probability: 0.56,
    confidence: 0.63,
    forecastId: "q-mna",
    evidence: [
      "Migration risk is raised before late-stage purchase decisions.",
      "Relationship mapping is the most repeated data-loss concern.",
      "Implementation teams request resumable cutover workflows.",
    ],
  },
];

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

type SankeyDatum = {
  id: string;
  label: string;
  color: string;
  kind: "source" | "theme" | "decision";
};
type SankeyConnection = { source: string; target: string; value: number };

export function ThemeSankey({
  theme,
  issues,
  onSourceSelect,
}: {
  theme: Theme;
  issues: MockIssue[];
  onSourceSelect: (source: IssueSignalSource | null) => void;
}) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const sourceLabels: IssueSignalSource[] = [
    "Support tickets",
    "Product feedback",
    "Account escalations",
    "Sales call notes",
    "Incident reports",
  ];
  const sourceColors: Record<IssueSignalSource, string> = {
    "Support tickets": "#34d399",
    "Product feedback": "#60a5fa",
    "Account escalations": "#fbbf24",
    "Sales call notes": "#fb7185",
    "Incident reports": "#a78bfa",
  };
  const counts = Object.fromEntries(
    sourceLabels.map((source) => [
      source,
      issues.filter((issue) => issue.source === source).length,
    ]),
  ) as Record<IssueSignalSource, number>;
  const activeSourceLabels = sourceLabels.filter((source) => counts[source] > 0);
  const invest = Math.round(issues.length * theme.probability);
  const validate = Math.round((issues.length - invest) * 0.24);
  const monitor = Math.round((issues.length - invest - validate) * 0.62);
  const deprioritize = issues.length - invest - validate - monitor;
  const graph = useMemo(
    () =>
      sankey<SankeyDatum, SankeyConnection>()
        .nodeId((node) => node.id)
        .nodeWidth(14)
        .nodePadding(12)
        .extent([
          [0, 0],
          [900, 260],
        ])({
        nodes: [
          ...activeSourceLabels.map((source) => ({
            id: source,
            label: source,
            color: sourceColors[source],
            kind: "source" as const,
          })),
          { id: theme.id, label: theme.name, color: "#8b5cf6", kind: "theme" as const },
          {
            id: "invest",
            label: "Invest / accelerate",
            color: "#34d399",
            kind: "decision" as const,
          },
          {
            id: "validate",
            label: "Run a scoped test",
            color: "#38bdf8",
            kind: "decision" as const,
          },
          { id: "monitor", label: "Monitor", color: "#fbbf24", kind: "decision" as const },
          {
            id: "deprioritize",
            label: "Deprioritize",
            color: "#94a3b8",
            kind: "decision" as const,
          },
        ],
        links: [
          ...activeSourceLabels.map((source) => ({
            source,
            target: theme.id,
            value: counts[source],
          })),
          { source: theme.id, target: "invest", value: invest },
          { source: theme.id, target: "validate", value: validate },
          { source: theme.id, target: "monitor", value: monitor },
          { source: theme.id, target: "deprioritize", value: deprioritize },
        ],
      }),
    [theme, counts, activeSourceLabels, invest, validate, monitor, deprioritize],
  );
  const path = sankeyLinkHorizontal<SankeyDatum, SankeyConnection>();

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox="-10 -28 960 320"
        className="min-w-180 w-full"
        role="img"
        aria-label={`Interactive issue evidence flowing into ${theme.name}, then into forecasted investment paths`}
      >
        <text
          x="0"
          y="-10"
          className="fill-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase"
        >
          Raw issue signals
        </text>
        <text
          x="422"
          y="-10"
          className="fill-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase"
        >
          Distilled theme
        </text>
        <text
          x="710"
          y="-10"
          className="fill-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase"
        >
          Decision paths
        </text>
        {graph.links.map((link, index) => {
          const sourceNode = link.source as SankeyDatum;
          const targetNode = link.target as SankeyDatum;
          return (
            <path
              key={`${index}-${sourceNode.id}-${targetNode.id}`}
              d={path(link) ?? ""}
              fill="none"
              stroke={sourceNode.color}
              strokeOpacity={
                hoveredNode && sourceNode.id !== hoveredNode && targetNode.id !== hoveredNode
                  ? 0.1
                  : 0.38
              }
              strokeWidth={Math.max(2, link.width ?? 0)}
            />
          );
        })}
        {graph.nodes.map((node) => {
          const active = !hoveredNode || node.id === hoveredNode;
          const label = node.label;
          const count = Math.round(node.value ?? 0);
          const labelX = (node.x0 ?? 0) + (node.kind === "decision" ? -10 : 20);
          const anchor = node.kind === "decision" ? "end" : "start";
          return (
            <g
              key={node.id}
              className="cursor-pointer"
              opacity={active ? 1 : 0.45}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => node.kind === "source" && onSourceSelect(node.id as IssueSignalSource)}
            >
              <rect
                x={node.x0 ?? 0}
                y={node.y0 ?? 0}
                width={(node.x1 ?? 0) - (node.x0 ?? 0)}
                height={(node.y1 ?? 0) - (node.y0 ?? 0)}
                rx="4"
                fill={node.color}
              />
              <text
                x={labelX}
                y={(node.y0 ?? 0) + 16}
                textAnchor={anchor}
                className="fill-foreground text-[13px] font-semibold"
              >
                {label}
              </text>
              <text
                x={labelX}
                y={(node.y0 ?? 0) + 33}
                textAnchor={anchor}
                className="fill-muted-foreground text-[11px]"
              >
                {count} issues
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        Hover a node to trace its flow. Click an issue-source node to filter the evidence sample
        below.
      </p>
    </div>
  );
}

function PortfolioSankey({
  issues,
  selectedThemeId,
  onThemeSelect,
  onSourceSelect,
}: {
  issues: MockIssue[];
  selectedThemeId: MockIssueTheme;
  onThemeSelect: (id: MockIssueTheme) => void;
  onSourceSelect: (source: IssueSignalSource | null) => void;
}) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const sourceLabels: IssueSignalSource[] = [
    "Support tickets",
    "Product feedback",
    "Account escalations",
    "Sales call notes",
    "Incident reports",
  ];
  const sourceColors: Record<IssueSignalSource, string> = {
    "Support tickets": "#34d399",
    "Product feedback": "#60a5fa",
    "Account escalations": "#fbbf24",
    "Sales call notes": "#fb7185",
    "Incident reports": "#a78bfa",
  };
  const themeCounts = Object.fromEntries(
    themes.map((theme) => [theme.id, issues.filter((issue) => issue.themeId === theme.id).length]),
  ) as Record<MockIssueTheme, number>;
  const activeThemes = themes.filter((theme) => themeCounts[theme.id] > 0);
  const activeSources = sourceLabels.filter((source) =>
    issues.some((issue) => issue.source === source),
  );
  const decisions = (theme: Theme) => {
    const total = themeCounts[theme.id];
    const invest = Math.round(total * theme.probability);
    const validate = Math.round((total - invest) * 0.24);
    const monitor = Math.round((total - invest - validate) * 0.62);
    return { invest, validate, monitor, deprioritize: total - invest - validate - monitor };
  };
  const graph = useMemo(
    () =>
      sankey<SankeyDatum, SankeyConnection>()
        .nodeId((node) => node.id)
        .nodeWidth(14)
        .nodePadding(10)
        .extent([
          [0, 0],
          [1120, 610],
        ])({
        nodes: [
          ...activeSources.map((source) => ({
            id: source,
            label: source,
            color: sourceColors[source],
            kind: "source" as const,
          })),
          ...activeThemes.map((theme) => ({
            id: theme.id,
            label: theme.name,
            color: theme.id === selectedThemeId ? "#7c3aed" : "#a78bfa",
            kind: "theme" as const,
          })),
          {
            id: "invest",
            label: "Invest / accelerate",
            color: "#34d399",
            kind: "decision" as const,
          },
          {
            id: "validate",
            label: "Run a scoped test",
            color: "#38bdf8",
            kind: "decision" as const,
          },
          { id: "monitor", label: "Monitor", color: "#fbbf24", kind: "decision" as const },
          {
            id: "deprioritize",
            label: "Deprioritize",
            color: "#94a3b8",
            kind: "decision" as const,
          },
        ],
        links: [
          ...activeSources.flatMap((source) =>
            activeThemes
              .map((theme) => ({
                source,
                target: theme.id,
                value: issues.filter(
                  (issue) => issue.source === source && issue.themeId === theme.id,
                ).length,
              }))
              .filter((link) => link.value > 0),
          ),
          ...activeThemes.flatMap((theme) => {
            const value = decisions(theme);
            return [
              { source: theme.id, target: "invest", value: value.invest },
              { source: theme.id, target: "validate", value: value.validate },
              { source: theme.id, target: "monitor", value: value.monitor },
              { source: theme.id, target: "deprioritize", value: value.deprioritize },
            ].filter((link) => link.value > 0);
          }),
        ],
      }),
    [issues, activeSources, activeThemes, selectedThemeId],
  );
  const path = sankeyLinkHorizontal<SankeyDatum, SankeyConnection>();

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox="-10 -28 1180 670"
        className="min-w-230 w-full"
        role="img"
        aria-label="Interactive portfolio Sankey showing all distilled themes and decision paths"
      >
        <text
          x="0"
          y="-10"
          className="fill-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase"
        >
          Raw issue signals
        </text>
        <text
          x="475"
          y="-10"
          className="fill-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase"
        >
          All distilled themes
        </text>
        <text
          x="930"
          y="-10"
          className="fill-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase"
        >
          Decision paths
        </text>
        {graph.links.map((link, index) => {
          const sourceNode = link.source as SankeyDatum;
          const targetNode = link.target as SankeyDatum;
          return (
            <path
              key={`${index}-${sourceNode.id}-${targetNode.id}`}
              d={path(link) ?? ""}
              fill="none"
              stroke={sourceNode.color}
              strokeOpacity={
                hoveredNode && sourceNode.id !== hoveredNode && targetNode.id !== hoveredNode
                  ? 0.06
                  : sourceNode.kind === "theme"
                    ? 0.28
                    : 0.18
              }
              strokeWidth={Math.max(1, link.width ?? 0)}
            />
          );
        })}
        {graph.nodes.map((node) => {
          const active = !hoveredNode || node.id === hoveredNode;
          const labelX = (node.x0 ?? 0) + (node.kind === "decision" ? -10 : 20);
          const anchor = node.kind === "decision" ? "end" : "start";
          const count = Math.round(node.value ?? 0);
          return (
            <g
              key={node.id}
              className="cursor-pointer"
              opacity={active ? 1 : 0.38}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => {
                if (node.kind === "theme") onThemeSelect(node.id as MockIssueTheme);
                if (node.kind === "source") onSourceSelect(node.id as IssueSignalSource);
              }}
            >
              <rect
                x={node.x0 ?? 0}
                y={node.y0 ?? 0}
                width={(node.x1 ?? 0) - (node.x0 ?? 0)}
                height={(node.y1 ?? 0) - (node.y0 ?? 0)}
                rx="4"
                fill={node.color}
              />
              <text
                x={labelX}
                y={(node.y0 ?? 0) + 14}
                textAnchor={anchor}
                className="fill-foreground text-[12px] font-semibold"
              >
                {node.label}
              </text>
              <text
                x={labelX}
                y={(node.y0 ?? 0) + 28}
                textAnchor={anchor}
                className="fill-muted-foreground text-[10px]"
              >
                {count} issues
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        Hover to trace a flow. Click a theme for its forecast drilldown, or click a source to filter
        the issue sample.
      </p>
    </div>
  );
}

export default function IssueIntelligence() {
  const [selectedThemeId, setSelectedThemeId] = useState(themes[0].id);
  const [selectedIssueSource, setSelectedIssueSource] = useState<IssueSignalSource | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [issueDrawerOpen, setIssueDrawerOpen] = useState(false);
  const [scenario, setScenario] = useState<Scenario>("base");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const selectedTheme = themes.find((theme) => theme.id === selectedThemeId) ?? themes[0];
  const sourceIssues = mockIssues.filter(
    (issue) =>
      (priorityFilter === "All" || issue.priority === priorityFilter) &&
      (statusFilter === "All" || issue.status === statusFilter),
  );
  const selectedThemeIssues = sourceIssues.filter((issue) => issue.themeId === selectedTheme.id);
  const displayedIssues = selectedIssueSource
    ? selectedThemeIssues.filter((issue) => issue.source === selectedIssueSource)
    : selectedThemeIssues;
  const selectedIssue =
    sourceIssues.find((issue) => issue.id === selectedIssueId) ??
    displayedIssues[0] ??
    selectedThemeIssues[0];
  const relatedIssues = selectedIssue
    ? sourceIssues
        .filter((issue) => issue.themeId === selectedIssue.themeId && issue.id !== selectedIssue.id)
        .slice(0, 4)
    : [];
  const issuesForTheme = (themeId: Theme["id"]) =>
    sourceIssues.filter((issue) => issue.themeId === themeId).length;
  const baseRate = Math.max(0.18, selectedTheme.probability - 0.14);
  const independentEstimates = [
    { label: "Base-rate analyst", value: baseRate },
    { label: "Customer-signal analyst", value: Math.min(0.9, selectedTheme.probability + 0.08) },
    { label: "Skeptical red team", value: Math.max(0.1, selectedTheme.probability - 0.17) },
    { label: "Portfolio lead", value: selectedTheme.probability },
  ];
  const scenarioProbability = Math.max(
    0.05,
    Math.min(
      0.95,
      selectedTheme.probability +
        (scenario === "upside" ? 0.12 : scenario === "downside" ? -0.14 : 0),
    ),
  );
  const executionProbability = Math.min(0.9, selectedTheme.confidence + 0.08);
  const outcomeConditionalProbability = Math.min(0.88, scenarioProbability + 0.11);
  const decisionRecommendation =
    scenarioProbability >= 0.6 && selectedTheme.confidence >= 0.65
      ? "Invest / accelerate"
      : scenarioProbability >= 0.45
        ? "Run a scoped test"
        : "Monitor";

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-5 py-8">
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="mb-3 gap-1.5">
            <Sparkles className="size-3" /> Intelligence beta
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight">Issue intelligence</h1>
          <p className="mt-2 text-base leading-6 text-muted-foreground">
            Distill thousands of product issues into investable themes, then use calibrated
            forecasts to decide where a bet is warranted.
          </p>
        </div>
        <Badge variant="outline">Integrated Jira + Linear intake</Badge>
      </header>

      <section className="flex flex-col gap-3 rounded-xl border bg-card p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Power filters</span>
          <span className="text-muted-foreground">
            Apply filters before clustering and forecasting.
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Priority
            <select
              className="h-8 rounded-md border bg-background px-2 text-sm text-foreground"
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}
            >
              {(["All", "High", "Medium", "Low"] as PriorityFilter[]).map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Status
            <select
              className="h-8 rounded-md border bg-background px-2 text-sm text-foreground"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            >
              {(["All", "Escalated", "In progress", "Backlog", "Closed"] as StatusFilter[]).map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
          </label>
          {(priorityFilter !== "All" || statusFilter !== "All") && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setPriorityFilter("All");
                setStatusFilter("All");
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3">
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <Ticket className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{sourceIssues.length}</p>
              <p className="text-sm text-muted-foreground">seeded issues across Jira + Linear</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <span className="rounded-lg bg-amber-500/10 p-2 text-amber-700">
              <Layers3 className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{themes.length}</p>
              <p className="text-sm text-muted-foreground">theme clusters in this fixture</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-700">
              <BarChart3 className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold tabular-nums">4</p>
              <p className="text-sm text-muted-foreground">decision paths per forecast</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Portfolio view</p>
            <h2 className="mt-1 text-xl font-semibold">All distilled themes</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Every cluster surfaced from the current issue slice. Select one to inspect its
              evidence flow and forecast protocol.
            </p>
          </div>
          <Badge variant="outline">{themes.length} clusters</Badge>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {themes.map((theme) => {
            const count = issuesForTheme(theme.id);
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => setSelectedThemeId(theme.id)}
                className={`rounded-lg border p-3 text-left transition-colors ${selectedTheme.id === theme.id ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "bg-background hover:bg-muted/50"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="line-clamp-2 text-sm font-semibold">{theme.name}</span>
                  <Badge variant="outline">{theme.signal}</Badge>
                </div>
                <div className="mt-3 flex items-end justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Linked issues</p>
                    <p className="text-lg font-semibold tabular-nums">{count}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Forecast</p>
                    <p className="text-sm font-semibold tabular-nums">
                      {percent(theme.probability)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: percent(theme.probability) }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Portfolio evidence flow</p>
            <h2 className="mt-1 text-xl font-semibold">
              All themes, from issue volume to investment decisions
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Trace every active cluster at once, then select a theme for its detailed forecast
              protocol.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Drill into
            <select
              className="h-8 max-w-64 rounded-md border bg-background px-2 text-sm font-medium text-foreground"
              value={selectedTheme.id}
              onChange={(event) => setSelectedThemeId(event.target.value as MockIssueTheme)}
            >
              {themes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
            <Badge variant="outline">{selectedThemeIssues.length} issues</Badge>
          </label>
        </div>
        <PortfolioSankey
          issues={sourceIssues}
          selectedThemeId={selectedTheme.id}
          onThemeSelect={setSelectedThemeId}
          onSourceSelect={setSelectedIssueSource}
        />
        <div className="mt-5 border-t pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                Issue sample{selectedIssueSource ? ` · ${selectedIssueSource}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Representative records from the local ingestion fixture.
              </p>
            </div>
            {selectedIssueSource && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIssueSource(null)}
              >
                Clear source filter
              </Button>
            )}
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {displayedIssues.slice(0, 6).map((issue) => (
              <button
                key={issue.id}
                type="button"
                onClick={() => setSelectedIssueId(issue.id)}
                className={`rounded-lg border p-3 text-left transition-colors ${selectedIssue?.id === issue.id ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "bg-muted/30 hover:bg-muted/60"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <code className="text-xs font-medium text-primary">{issue.id}</code>
                  <Badge variant="outline">{issue.priority}</Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-medium">{issue.title}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {issue.account} · {issue.status}
                </p>
              </button>
            ))}
          </div>
          {selectedIssue && (
            <Card className="mt-4 border-primary/25">
              <CardContent>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary">Issue inspector</p>
                    <h3 className="mt-1 text-base font-semibold">{selectedIssue.title}</h3>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {selectedIssue.id} · {selectedIssue.provider} · opened{" "}
                      {selectedIssue.createdAt}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{selectedIssue.status}</Badge>
                    <Badge variant="outline">{selectedIssue.priority}</Badge>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Owning team</p>
                    <p className="mt-1 text-sm font-medium">{selectedIssue.team}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Account</p>
                    <p className="mt-1 text-sm font-medium">{selectedIssue.account}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Cluster reason</p>
                    <p className="mt-1 text-sm font-medium">Shared language + workflow pattern</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Related issues in this theme
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {relatedIssues.map((issue) => (
                        <Button
                          key={issue.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedIssueId(issue.id)}
                        >
                          <code>{issue.id}</code>
                          <span className="max-w-42 truncate">{issue.title}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Button type="button" onClick={() => setIssueDrawerOpen(true)}>
                    Open {selectedIssue.provider} details <ArrowRight className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(400px,440px)]">
        <div className="space-y-4">
          <Card>
            <CardContent>
              <p className="text-sm font-medium text-primary">Decision brief</p>
              <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{selectedTheme.name}</h2>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    {selectedTheme.summary}
                  </p>
                </div>
                <Badge variant="outline">{selectedTheme.investability}</Badge>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Signal strength</p>
                  <p className={`mt-1 text-sm font-semibold ${selectedTheme.momentumTone}`}>
                    {selectedTheme.momentum}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Evidence volume</p>
                  <p className="mt-1 text-sm font-semibold">
                    {selectedThemeIssues.length} linked issues
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Owning team</p>
                  <p className="mt-1 text-sm font-semibold">{selectedTheme.owners}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-primary">Forecast decomposition</p>
                  <h3 className="mt-1 font-semibold">Turn the theme into testable claims</h3>
                </div>
                <Badge variant="outline">{decisionRecommendation}</Badge>
              </div>
              <div className="mt-4 grid gap-2">
                <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[minmax(0,1fr)_5rem_7rem]">
                  <div>
                    <p className="font-medium">1. Is this a material, recurring problem?</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Theme prevalence across the integrated intake.
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">Outside view</span>
                  <strong className="text-lg tabular-nums">{percent(baseRate)}</strong>
                </div>
                <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[minmax(0,1fr)_5rem_7rem]">
                  <div>
                    <p className="font-medium">2. Can we deliver the proposed intervention?</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Execution risk, capacity, and dependencies.
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">Conditional</span>
                  <strong className="text-lg tabular-nums">{percent(executionProbability)}</strong>
                </div>
                <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[minmax(0,1fr)_5rem_7rem]">
                  <div>
                    <p className="font-medium">
                      3. If delivered, will it create the target outcome?
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Customer response and measurable business impact.
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">Conditional</span>
                  <strong className="text-lg tabular-nums">
                    {percent(outcomeConditionalProbability)}
                  </strong>
                </div>
              </div>
              <p className="mt-3 text-xs leading-4 text-muted-foreground">
                Keep these claims separately forecastable. It exposes whether uncertainty comes from
                the problem, execution, or impact—and avoids hiding a weak link in one blended
                score.
              </p>
            </CardContent>
          </Card>
          <Card className="border-primary/25 bg-primary/3">
            <CardContent>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-primary">Superforecasting protocol</p>
                  <h3 className="mt-1 font-semibold">Make the investment case falsifiable</h3>
                </div>
                <Badge variant="outline">Next review in 7d</Badge>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Outside view
                  </p>
                  <p className="mt-1 text-lg font-semibold">{percent(baseRate)} base rate</p>
                  <p className="mt-1 text-xs leading-4 text-muted-foreground">
                    Comparable product bets that translated issue demand into a measurable business
                    result.
                  </p>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Update trigger
                  </p>
                  <p className="mt-1 text-sm font-semibold">New enterprise escalation pattern</p>
                  <p className="mt-1 text-xs leading-4 text-muted-foreground">
                    Re-estimate if two strategic accounts report the same failure mode.
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-dashed bg-background p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Disconfirming evidence to seek
                </p>
                <p className="mt-1 text-sm">
                  Evidence that the issue is isolated to configuration, a single account segment, or
                  a solved workflow—not a scalable product gap.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="h-fit rounded-xl border bg-card p-5 xl:sticky xl:top-20">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-primary">Forecast lens</p>
              <h2 className="mt-1 text-lg font-semibold">{selectedTheme.name}</h2>
            </div>
            <CircleAlert className="mt-1 size-5 shrink-0 text-amber-600" />
          </div>
          <p className="mt-3 text-sm leading-5 text-muted-foreground">{selectedTheme.question}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Scenario probability</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {percent(scenarioProbability)}
              </p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Process confidence</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {percent(selectedTheme.confidence)}
              </p>
            </div>
          </div>
          <div
            className="mt-3 flex rounded-lg bg-muted p-1"
            role="group"
            aria-label="Forecast scenario"
          >
            {(["base", "upside", "downside"] as Scenario[]).map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={scenario === value ? "secondary" : "ghost"}
                className="flex-1 capitalize"
                onClick={() => setScenario(value)}
              >
                {value}
              </Button>
            ))}
          </div>
          <p className="mt-2 text-xs leading-4 text-muted-foreground">
            Scenarios are sensitivity checks—not separate forecasts. Keep the base case calibrated
            to the evidence.
          </p>
          <div className="mt-5 border-t pt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Independent estimates
              </p>
              <span className="text-xs text-muted-foreground">before synthesis</span>
            </div>
            <div className="mt-3 space-y-2">
              {independentEstimates.map((estimate) => (
                <div key={estimate.label} className="flex items-center gap-2">
                  <span className="w-32 text-xs text-muted-foreground">{estimate.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: percent(estimate.value) }}
                    />
                  </div>
                  <span className="w-9 text-right text-xs font-semibold tabular-nums">
                    {percent(estimate.value)}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-4 text-muted-foreground">
              Estimate independently, then aggregate. The spread is a signal of uncertainty—not a
              reason to average away disagreement.
            </p>
          </div>
          <div className="mt-5 border-t pt-4">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Why this is surfacing
            </p>
            <ul className="mt-3 space-y-2">
              {selectedTheme.evidence.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-5">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-5 rounded-lg border border-dashed bg-muted/30 p-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Scoring and decision rule
            </p>
            <p className="mt-1 text-sm">
              Resolve this forecast against the stated business metric; score it with Brier. Invest
              only at ≥60% probability and ≥65% process confidence—otherwise{" "}
              {decisionRecommendation.toLowerCase()}.
            </p>
          </div>
          <Button className="mt-5 w-full" render={<Link to={`/q/${selectedTheme.forecastId}`} />}>
            Open forecast <ArrowRight className="size-4" />
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Forecasts separate the signal from the investment decision.
          </p>
        </aside>
      </section>

      <section className="rounded-xl border border-dashed bg-muted/30 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Decision workflow</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Scope the intake, compare the portfolio, interrogate one theme, then commit an
              explicit forecast-backed action.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted-foreground">
            <span>1. Scope</span>
            <ArrowRight className="size-4" />
            <span>2. Compare</span>
            <ArrowRight className="size-4" />
            <span>3. Forecast</span>
            <ArrowRight className="size-4" />
            <span className="text-foreground">4. Decide</span>
          </div>
        </div>
      </section>
      <Drawer open={issueDrawerOpen} onOpenChange={setIssueDrawerOpen} swipeDirection="right">
        <DrawerContent className="sm:[--drawer-content-width:36rem]">
          {selectedIssue && (
            <>
              <DrawerHeader className="border-b pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {selectedIssue.provider} source issue
                    </p>
                    <DrawerTitle className="mt-1">{selectedIssue.title}</DrawerTitle>
                    <DrawerDescription className="mt-1 font-mono text-xs">
                      {selectedIssue.id} · {selectedIssue.team}
                    </DrawerDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{selectedIssue.status}</Badge>
                    <Badge variant="outline">{selectedIssue.priority}</Badge>
                  </div>
                </div>
              </DrawerHeader>
              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
                <section>
                  <h3 className="text-sm font-semibold">Description</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {selectedIssue.description}
                  </p>
                </section>
                <section className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Assignee</p>
                    <p className="mt-1 text-sm font-medium">{selectedIssue.assignee}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Customer account</p>
                    <p className="mt-1 text-sm font-medium">{selectedIssue.account}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Intake signal</p>
                    <p className="mt-1 text-sm font-medium">{selectedIssue.source}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="mt-1 text-sm font-medium">{selectedIssue.createdAt}</p>
                  </div>
                </section>
                <section>
                  <h3 className="text-sm font-semibold">Comments</h3>
                  <div className="mt-3 space-y-3">
                    {selectedIssue.comments.map((comment) => (
                      <div
                        key={`${comment.author}-${comment.createdAt}`}
                        className="rounded-lg border p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">{comment.author}</p>
                          <span className="text-xs text-muted-foreground">{comment.createdAt}</span>
                        </div>
                        <p className="mt-2 text-sm leading-5 text-muted-foreground">
                          {comment.body}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <h3 className="text-sm font-semibold">Activity</h3>
                  <ol className="mt-3 space-y-3 border-l pl-4">
                    {selectedIssue.history.map((entry) => (
                      <li key={`${entry.event}-${entry.createdAt}`} className="relative">
                        <span className="absolute -left-5 top-1.5 size-2 rounded-full bg-primary" />
                        <p className="text-sm font-medium">{entry.event}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {entry.actor} · {entry.createdAt}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>
              <DrawerFooter className="border-t pt-4">
                <Button variant="outline" onClick={() => setIssueDrawerOpen(false)}>
                  Close
                </Button>
                <Button render={<Link to={`/q/${selectedTheme.forecastId}`} />}>
                  Open related forecast <ArrowRight className="size-4" />
                </Button>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </main>
  );
}
