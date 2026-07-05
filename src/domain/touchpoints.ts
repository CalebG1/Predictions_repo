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

export function touchpointMeta(kind: TouchpointKind): TouchpointMeta {
  return TOUCHPOINT_CATALOG.find((t) => t.kind === kind)!;
}

/** Demo summary shown when a user connects a new source. */
export function demoSignalFor(kind: TouchpointKind): TouchpointSignal {
  const meta = touchpointMeta(kind);
  const summaries: Record<TouchpointKind, string> = {
    interview: "New stakeholder interview queued for ingestion",
    teams: "Teams channel linked — monitoring for updates",
    excel: "Workbook connected — awaiting next model refresh",
    slack: "Slack channel linked — watching for signals",
    survey: "Survey source connected — next poll cycle pending",
  };
  return {
    kind,
    summary: summaries[kind] ?? `${meta.label} connected`,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}
