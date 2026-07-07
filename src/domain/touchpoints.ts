import type { Connector } from "./connectors";
import type { TouchpointKind, TouchpointSignal } from "./types";

export interface TouchpointMeta {
  kind: TouchpointKind;
  label: string;
  description: string;
  brandColor: string;
}

export const TOUCHPOINT_CATALOG: TouchpointMeta[] = [
  {
    kind: "interview",
    label: "Interviews",
    description: "Pull signals from stakeholder interviews and debrief notes",
    brandColor: "#7c3aed",
  },
  {
    kind: "teams",
    label: "Microsoft Teams",
    description: "Poll channels and meeting transcripts for leading indicators",
    brandColor: "#6264a7",
  },
  {
    kind: "excel",
    label: "Microsoft Excel",
    description: "Sync forecast drivers from shared workbooks and models",
    brandColor: "#217346",
  },
  {
    kind: "slack",
    label: "Slack",
    description: "Monitor workspace channels for operational updates",
    brandColor: "#4a154b",
  },
  {
    kind: "survey",
    label: "Surveys",
    description: "Ingest polled responses from internal or external surveys",
    brandColor: "#0ea5a4",
  },
  {
    kind: "upload",
    label: "Uploaded files",
    description: "Documents, spreadsheets, and exports imported directly",
    brandColor: "#5b6b66",
  },
];

/** Active touchpoint signals — icons only appear when relevant data exists. */
export const seedTouchpointSignals: Record<string, TouchpointSignal[]> = {
  "q-talent-hire": [
    {
      kind: "interview",
      summary: "2 hiring manager debriefs cite slow exec review",
      updatedAt: "2026-06-26",
    },
    {
      kind: "teams",
      summary: "#talent-hiring: 4 mentions of candidate drop-off",
      updatedAt: "2026-06-27",
    },
  ],
  "q-attrition": [
    {
      kind: "interview",
      summary: "Exit interviews flag comp band as top churn driver",
      updatedAt: "2026-06-24",
    },
    {
      kind: "survey",
      summary: "Pulse survey: engagement down 8pts in Eng org",
      updatedAt: "2026-06-22",
    },
  ],
  "q-supplier-default": [
    {
      kind: "excel",
      summary: "Supplier risk workbook: lead time +11 days vs plan",
      updatedAt: "2026-06-25",
    },
    {
      kind: "teams",
      summary: "Ops standup notes flag Tier-1 vendor payment dispute",
      updatedAt: "2026-06-27",
    },
  ],
  "q-cyber-breach": [
    {
      kind: "teams",
      summary: "SecOps channel: 2 unresolved critical alerts this week",
      updatedAt: "2026-06-27",
    },
    {
      kind: "slack",
      summary: "#incidents: phishing campaign targeting finance users",
      updatedAt: "2026-06-26",
    },
  ],
  "q-cyber-ransomware": [
    {
      kind: "slack",
      summary: "#secops: 3 endpoints flagged for suspicious encryption activity",
      updatedAt: "2026-06-27",
    },
    {
      kind: "teams",
      summary: "Backup drill results: RTO exceeds 8hr target on 2 systems",
      updatedAt: "2026-06-25",
    },
  ],
  "q-cyber-phishing": [
    {
      kind: "slack",
      summary: "#security-awareness: 12 users clicked simulated BEC link",
      updatedAt: "2026-06-26",
    },
    {
      kind: "teams",
      summary: "Finance desk: wire transfer approval process bypass attempt flagged",
      updatedAt: "2026-06-24",
    },
  ],
  "q-cyber-vendor": [
    {
      kind: "excel",
      summary: "Vendor risk scorecard: 2 Tier-1 vendors overdue on SOC 2",
      updatedAt: "2026-06-26",
    },
    {
      kind: "slack",
      summary: "#vendor-risk: SaaS provider disclosed security incident (under review)",
      updatedAt: "2026-06-27",
    },
  ],
  "q-cyber-iam": [
    {
      kind: "teams",
      summary: "IAM review: 4 dormant admin accounts still active",
      updatedAt: "2026-06-25",
    },
    {
      kind: "slack",
      summary: "#identity: impossible travel alert on service account",
      updatedAt: "2026-06-27",
    },
  ],
  "q-cyber-cloud": [
    {
      kind: "slack",
      summary: "#cloud-security: CSPM flagged 7 public S3 buckets",
      updatedAt: "2026-06-27",
    },
    {
      kind: "excel",
      summary: "Cloud posture workbook: IAM over-permission count up 14%",
      updatedAt: "2026-06-23",
    },
  ],
  "q-cyber-ddos": [
    {
      kind: "teams",
      summary: "SRE war room: DDoS mitigation vendor contract renewal pending",
      updatedAt: "2026-06-22",
    },
    {
      kind: "slack",
      summary: "#sre: traffic spike on edge — ruled benign, playbook updated",
      updatedAt: "2026-06-26",
    },
  ],
  "q-cyber-compliance": [
    {
      kind: "excel",
      summary: "SOC 2 tracker: 3 control gaps open, 2 overdue remediation",
      updatedAt: "2026-06-27",
    },
    {
      kind: "survey",
      summary: "GRC pulse: audit readiness self-assessment at 68%",
      updatedAt: "2026-06-24",
    },
  ],
  "q-cyber-zero-day": [
    {
      kind: "slack",
      summary: "#vuln-mgmt: CVE-2026-XXXX critical — patch available, 40% deployed",
      updatedAt: "2026-06-27",
    },
    {
      kind: "teams",
      summary: "Jira: 12 critical vulns past SLA, 3 internet-facing",
      updatedAt: "2026-06-26",
    },
  ],
  "q-cyber-zero-trust": [
    {
      kind: "survey",
      summary: "Program review: Phase 2 milestones 78% complete",
      updatedAt: "2026-06-25",
    },
    {
      kind: "teams",
      summary: "Architecture review: device trust rollout on track for Q3",
      updatedAt: "2026-06-27",
    },
  ],
  "q-fed-cut": [
    {
      kind: "excel",
      summary: "Rates model tab updated with softer CPI path",
      updatedAt: "2026-06-20",
    },
  ],
  "q-product-launch": [
    {
      kind: "survey",
      summary: "Beta NPS 41 — below 50 launch gate",
      updatedAt: "2026-06-23",
    },
    {
      kind: "slack",
      summary: "#product-launch: 3 blocker threads open",
      updatedAt: "2026-06-27",
    },
  ],
  "q-regulation": [
    {
      kind: "survey",
      summary: "Legal tracker: 62% of milestones on schedule",
      updatedAt: "2026-06-21",
    },
  ],
  "q-mna": [
    {
      kind: "interview",
      summary: "Corp dev lead: diligence timeline slipping 3 weeks",
      updatedAt: "2026-06-25",
    },
    {
      kind: "excel",
      summary: "Deal model sensitivity shows integration risk ↑",
      updatedAt: "2026-06-26",
    },
  ],
};

export function touchpointMeta(kind: TouchpointKind): TouchpointMeta | undefined {
  return TOUCHPOINT_CATALOG.find((t) => t.kind === kind);
}

const today = () => new Date().toISOString().slice(0, 10);

/** Demo summary shown when a user connects a source from the gallery. */
export function connectSignalFor(connector: Connector): TouchpointSignal {
  if (connector.kind) {
    const summaries: Partial<Record<TouchpointKind, string>> = {
      interview: "New stakeholder interview queued for ingestion",
      teams: "Teams channel linked — monitoring for updates",
      excel: "Workbook connected — awaiting next model refresh",
      slack: "Slack channel linked — watching for signals",
      survey: "Survey source connected — next poll cycle pending",
    };
    return {
      kind: connector.kind,
      summary: summaries[connector.kind] ?? `${connector.name} connected`,
      updatedAt: today(),
    };
  }
  return {
    kind: "custom",
    sourceId: connector.id,
    label: connector.name,
    brandColor: connector.brandColor,
    summary: `${connector.name} connected — awaiting first sync`,
    updatedAt: today(),
  };
}

/** Signal produced after importing one or more files. */
export function uploadSignalFor(fileNames: string[]): TouchpointSignal {
  const n = fileNames.length;
  const summary =
    n === 1 ? `Imported ${fileNames[0]}` : `${n} files imported — parsing for signals`;
  return { kind: "upload", label: "Uploaded files", summary, updatedAt: today() };
}
