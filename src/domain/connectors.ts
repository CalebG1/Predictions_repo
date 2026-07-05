import type { TouchpointKind } from "./types";

export type ConnectorCategory =
  | "Communication"
  | "Productivity"
  | "Storage"
  | "CRM"
  | "Project Management"
  | "Engineering"
  | "Design"
  | "Data & Analytics";

export const CONNECTOR_CATEGORIES: ConnectorCategory[] = [
  "Communication",
  "Productivity",
  "Storage",
  "CRM",
  "Project Management",
  "Engineering",
  "Design",
  "Data & Analytics",
];

export interface Connector {
  id: string;
  name: string;
  category: ConnectorCategory;
  brandColor: string;
  /** Short monogram shown on the tile when there is no dedicated brand icon. */
  mono: string;
  /**
   * Built-in sources map to a first-class touchpoint kind (with a real brand
   * icon + seeded signals). Everything else connects as a `custom` source.
   */
  kind?: Exclude<TouchpointKind, "custom" | "upload">;
}

/**
 * The connectable app gallery. The five `kind`-bearing entries wire into the
 * live signal model; the rest are realistic catalog entries that connect as
 * generic sources so the picker feels like a full integrations directory.
 */
export const CONNECTORS: Connector[] = [
  // Communication
  { id: "slack", name: "Slack", category: "Communication", brandColor: "#4a154b", mono: "S", kind: "slack" },
  { id: "teams", name: "Microsoft Teams", category: "Communication", brandColor: "#6264a7", mono: "T", kind: "teams" },
  { id: "google-meet", name: "Google Meet", category: "Communication", brandColor: "#00832d", mono: "M", kind: "interview" },
  { id: "zoom", name: "Zoom", category: "Communication", brandColor: "#2d8cff", mono: "Z" },
  { id: "gmail", name: "Gmail", category: "Communication", brandColor: "#ea4335", mono: "G" },
  { id: "outlook", name: "Outlook", category: "Communication", brandColor: "#0a66c2", mono: "O" },

  // Productivity
  { id: "excel", name: "Microsoft Excel", category: "Productivity", brandColor: "#217346", mono: "X", kind: "excel" },
  { id: "google-forms", name: "Google Forms", category: "Productivity", brandColor: "#7248b9", mono: "F", kind: "survey" },
  { id: "notion", name: "Notion", category: "Productivity", brandColor: "#111111", mono: "N" },
  { id: "google-sheets", name: "Google Sheets", category: "Productivity", brandColor: "#0f9d58", mono: "S" },
  { id: "airtable", name: "Airtable", category: "Productivity", brandColor: "#f82b60", mono: "A" },
  { id: "confluence", name: "Confluence", category: "Productivity", brandColor: "#1868db", mono: "C" },

  // Storage
  { id: "google-drive", name: "Google Drive", category: "Storage", brandColor: "#1fa463", mono: "D" },
  { id: "dropbox", name: "Dropbox", category: "Storage", brandColor: "#0061ff", mono: "D" },
  { id: "box", name: "Box", category: "Storage", brandColor: "#0075c9", mono: "B" },
  { id: "onedrive", name: "OneDrive", category: "Storage", brandColor: "#0364b8", mono: "O" },
  { id: "sharepoint", name: "SharePoint", category: "Storage", brandColor: "#038387", mono: "SP" },

  // CRM
  { id: "salesforce", name: "Salesforce", category: "CRM", brandColor: "#00a1e0", mono: "SF" },
  { id: "hubspot", name: "HubSpot", category: "CRM", brandColor: "#ff7a59", mono: "H" },
  { id: "zendesk", name: "Zendesk", category: "CRM", brandColor: "#03363d", mono: "Z" },
  { id: "intercom", name: "Intercom", category: "CRM", brandColor: "#1f8ded", mono: "I" },

  // Project Management
  { id: "jira", name: "Jira", category: "Project Management", brandColor: "#1868db", mono: "J" },
  { id: "asana", name: "Asana", category: "Project Management", brandColor: "#f06a6a", mono: "A" },
  { id: "linear", name: "Linear", category: "Project Management", brandColor: "#5e6ad2", mono: "L" },
  { id: "trello", name: "Trello", category: "Project Management", brandColor: "#0079bf", mono: "Tr" },
  { id: "servicenow", name: "ServiceNow", category: "Project Management", brandColor: "#62d84e", mono: "SN" },

  // Engineering
  { id: "github", name: "GitHub", category: "Engineering", brandColor: "#111111", mono: "GH" },
  { id: "gitlab", name: "GitLab", category: "Engineering", brandColor: "#fc6d26", mono: "GL" },
  { id: "pagerduty", name: "PagerDuty", category: "Engineering", brandColor: "#06ac38", mono: "PD" },

  // Design
  { id: "figma", name: "Figma", category: "Design", brandColor: "#a259ff", mono: "Fi" },

  // Data & Analytics
  { id: "snowflake", name: "Snowflake", category: "Data & Analytics", brandColor: "#29b5e8", mono: "SF" },
  { id: "databricks", name: "Databricks", category: "Data & Analytics", brandColor: "#ff3621", mono: "Db" },
  { id: "tableau", name: "Tableau", category: "Data & Analytics", brandColor: "#e97627", mono: "Tb" },
  { id: "looker", name: "Looker", category: "Data & Analytics", brandColor: "#5f6368", mono: "Lk" },
  { id: "powerbi", name: "Power BI", category: "Data & Analytics", brandColor: "#f2c811", mono: "Pb" },
  { id: "ga", name: "Google Analytics", category: "Data & Analytics", brandColor: "#e8710a", mono: "GA" },
  { id: "amplitude", name: "Amplitude", category: "Data & Analytics", brandColor: "#1f6fff", mono: "Am" },
  { id: "segment", name: "Segment", category: "Data & Analytics", brandColor: "#52bd94", mono: "Sg" },
];

export function connectorById(id: string): Connector | undefined {
  return CONNECTORS.find((c) => c.id === id);
}
