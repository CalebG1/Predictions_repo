export type IssueProvider = "Linear" | "Jira";
export type IssueSignalSource =
  | "Support tickets"
  | "Product feedback"
  | "Account escalations"
  | "Sales call notes"
  | "Incident reports";
export type MockIssueTheme =
  | "activation"
  | "reliability"
  | "intelligence"
  | "integrations"
  | "governance"
  | "mobile"
  | "performance"
  | "billing"
  | "collaboration"
  | "onboarding"
  | "dataQuality"
  | "automation"
  | "localization"
  | "permissions"
  | "observability"
  | "migration";

export type MockIssue = {
  id: string;
  provider: IssueProvider;
  themeId: MockIssueTheme;
  source: IssueSignalSource;
  title: string;
  team: string;
  status: "Backlog" | "In progress" | "Escalated" | "Closed";
  priority: "High" | "Medium" | "Low";
  account: string;
  createdAt: string;
  description: string;
  assignee: string;
  comments: { author: string; body: string; createdAt: string }[];
  history: { event: string; actor: string; createdAt: string }[];
};

const themes = [
  {
    id: "activation" as const,
    team: "Growth · Platform",
    titles: [
      "SCIM provisioning stalls after role mapping",
      "Admins cannot complete first-value setup",
      "Permission templates fail for multi-team accounts",
    ],
  },
  {
    id: "collaboration" as const,
    team: "Collaboration · Core product",
    titles: [
      "Comment mentions do not notify the right owner",
      "Cross-team handoff loses decision context",
      "Approval thread is hard to reconstruct",
    ],
  },
  {
    id: "onboarding" as const,
    team: "Growth · Customer success",
    titles: [
      "Template gallery is difficult to discover",
      "New users do not know where to start",
      "Workspace setup does not match the use case",
    ],
  },
  {
    id: "dataQuality" as const,
    team: "Data platform · Analytics",
    titles: [
      "Metric differs between dashboard and export",
      "Source refresh status is unclear",
      "Duplicate records distort executive reporting",
    ],
  },
  {
    id: "automation" as const,
    team: "Workflow automation · Platform",
    titles: [
      "Rule builder cannot express a common exception",
      "Automation does not expose failure reason",
      "Scheduled workflow runs at the wrong time zone",
    ],
  },
  {
    id: "localization" as const,
    team: "International · Product",
    titles: [
      "Date formatting is inconsistent by locale",
      "Translated interface truncates action labels",
      "Regional policy needs local language support",
    ],
  },
  {
    id: "permissions" as const,
    team: "Identity · Platform",
    titles: [
      "Custom role cannot limit sensitive fields",
      "Guest access is too broad for partners",
      "Permission changes do not propagate immediately",
    ],
  },
  {
    id: "observability" as const,
    team: "Developer experience · Infrastructure",
    titles: [
      "Webhook delivery cannot be debugged",
      "API request lacks a trace identifier",
      "Integration health has no customer-facing status",
    ],
  },
  {
    id: "migration" as const,
    team: "Enterprise migrations · Platform",
    titles: [
      "Historical import loses relationship data",
      "Migration mapping needs validation before cutover",
      "Bulk migration cannot be resumed safely",
    ],
  },
  {
    id: "reliability" as const,
    team: "Core product · Infrastructure",
    titles: [
      "Bulk import retries fail at high volume",
      "Workflow execution times out after retry",
      "Background job is stuck in processing state",
    ],
  },
  {
    id: "intelligence" as const,
    team: "Analytics · AI",
    titles: [
      "Need explanation for weekly metric change",
      "Executive dashboard lacks root-cause context",
      "Export does not answer why a trend moved",
    ],
  },
  {
    id: "integrations" as const,
    team: "Ecosystem · Developer platform",
    titles: [
      "Connector broke after partner API update",
      "Webhook retry produces duplicate records",
      "OAuth refresh requires manual reconnect",
    ],
  },
  {
    id: "governance" as const,
    team: "Security · Enterprise platform",
    titles: [
      "Audit export omits approval history",
      "Admin needs policy exception trail",
      "Retention controls cannot be scoped by workspace",
    ],
  },
  {
    id: "mobile" as const,
    team: "Mobile · Field operations",
    titles: [
      "Offline workflow loses draft changes",
      "Mobile approval is too slow for frontline teams",
      "Push notification does not open the correct record",
    ],
  },
  {
    id: "performance" as const,
    team: "Search · Infrastructure",
    titles: [
      "Search results time out for large workspaces",
      "Saved view takes too long to load",
      "Filtering a large issue set freezes the browser",
    ],
  },
  {
    id: "billing" as const,
    team: "Billing · Customer operations",
    titles: [
      "Usage report differs from invoice estimate",
      "Customer cannot explain seat overage",
      "Billing export needs cost center attribution",
    ],
  },
];

const accounts = ["Northwind", "Atlas", "Orion", "Pioneer", "Helix", "Cedar", "Vertex", "Summit"];
const signalSources: IssueSignalSource[] = [
  "Support tickets",
  "Product feedback",
  "Account escalations",
  "Sales call notes",
  "Incident reports",
];
const priorities: MockIssue["priority"][] = ["High", "Medium", "Medium", "Low"];
const statuses: MockIssue["status"][] = ["Backlog", "In progress", "Escalated", "Closed"];
const assignees = [
  "Maya Chen",
  "Jordan Lee",
  "Priya Shah",
  "Elliot Brooks",
  "Sam Rivera",
  "Nora Williams",
];

/**
 * A deterministic local fixture representing a sampled Jira/Linear ingestion.
 * Keep the adapter boundary at this export: replacing this with API records should
 * not require changing the clustering or visualization layers.
 */
export const mockIssues: MockIssue[] = Array.from({ length: 1440 }, (_, index) => {
  const theme = themes[index % themes.length];
  // Provider alternates by theme-sized batches so every theme appears in both systems.
  const provider: IssueProvider = Math.floor(index / themes.length) % 2 === 0 ? "Linear" : "Jira";
  const issueNumber = String(index + 1001);
  return {
    id: `${provider === "Linear" ? "LIN" : "JRA"}-${issueNumber}`,
    provider,
    themeId: theme.id,
    source: signalSources[(index + Math.floor(index / themes.length)) % signalSources.length],
    title: theme.titles[Math.floor(index / themes.length) % theme.titles.length],
    team: theme.team,
    status: statuses[(index * 3 + Math.floor(index / 7)) % statuses.length],
    priority: priorities[(index + Math.floor(index / 5)) % priorities.length],
    account: accounts[(index * 3 + 1) % accounts.length],
    createdAt: `2026-07-${String((index % 28) + 1).padStart(2, "0")}`,
    description: `Reported by ${signalSources[(index + Math.floor(index / themes.length)) % signalSources.length].toLowerCase()} for ${accounts[(index * 3 + 1) % accounts.length]}. The customer describes a repeated workflow failure and requests a durable product-level resolution rather than a one-off workaround.`,
    assignee: assignees[(index * 5 + 2) % assignees.length],
    comments: [
      {
        author: "Avery Morgan",
        body: "Confirmed the pattern across a second workspace. Capturing examples and impact before prioritization.",
        createdAt: `2026-07-${String(((index + 2) % 28) + 1).padStart(2, "0")}`,
      },
      {
        author: "Casey Park",
        body: "This aligns with the broader theme cluster; keeping the source context attached for the next forecast update.",
        createdAt: `2026-07-${String(((index + 5) % 28) + 1).padStart(2, "0")}`,
      },
    ],
    history: [
      {
        event: "Issue created",
        actor: "Customer operations",
        createdAt: `2026-07-${String((index % 28) + 1).padStart(2, "0")}`,
      },
      {
        event: "Clustered into issue intelligence",
        actor: "Signal Ridge",
        createdAt: `2026-07-${String(((index + 1) % 28) + 1).padStart(2, "0")}`,
      },
      {
        event: `Status set to ${statuses[(index * 3 + Math.floor(index / 7)) % statuses.length]}`,
        actor: assignees[(index * 5 + 2) % assignees.length],
        createdAt: `2026-07-${String(((index + 3) % 28) + 1).padStart(2, "0")}`,
      },
    ],
  };
});
