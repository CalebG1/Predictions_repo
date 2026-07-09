import type { Category, ConnectedIntegration, Role, User, UserPreferences } from "./types";

export function roleLabel(role: Role): string {
  switch (role) {
    case "risk_manager":
      return "Risk Manager";
    case "executive":
      return "Executive";
    case "analyst":
      return "Analyst";
    case "admin":
      return "Administrator";
  }
}

export function displayName(user: User): string {
  const paren = user.name.indexOf(" (");
  return paren > 0 ? user.name.slice(0, paren) : user.name;
}

export function userInitials(user: User): string {
  const name = displayName(user);
  const parts = name.split(/[\s.]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export const defaultUserPreferences: UserPreferences = {
  emailDigest: "daily",
  probabilityAlerts: true,
  commentMentions: true,
  contextApprovalRequests: true,
  weeklySummary: true,
  productUpdates: false,
  defaultVisibility: "team",
  expertiseDomains: [],
};

export const seedUserPreferences: Record<string, UserPreferences> = {
  "u-risk": {
    ...defaultUserPreferences,
    expertiseDomains: ["Operational", "Security/Cyber", "Regulatory"],
    contextApprovalRequests: true,
  },
  "u-exec": {
    ...defaultUserPreferences,
    emailDigest: "weekly",
    expertiseDomains: ["Financial", "Macro", "Geopolitical"],
    defaultVisibility: "leadership",
  },
  "u-analyst": {
    ...defaultUserPreferences,
    expertiseDomains: ["Product", "Supply Chain", "Talent"],
    productUpdates: true,
  },
};

export function integrationsFor(role: Role): ConnectedIntegration[] {
  const slack: ConnectedIntegration = {
    id: "slack",
    name: "Slack",
    description: "Receive probability alerts and @mentions in #risk-forecasts",
    status: "connected",
    connectedAt: "2025-11-12",
  };
  const teams: ConnectedIntegration = {
    id: "teams",
    name: "Microsoft Teams",
    description: "Sync executive briefings and weekly digest to leadership channels",
    status: role === "executive" || role === "risk_manager" ? "connected" : "available",
    connectedAt: role === "executive" || role === "risk_manager" ? "2025-09-03" : undefined,
  };
  const jira: ConnectedIntegration = {
    id: "jira",
    name: "Jira",
    description: "Link resolved forecasts to risk register tickets",
    status: role === "risk_manager" || role === "admin" ? "connected" : "available",
    connectedAt: role === "risk_manager" || role === "admin" ? "2024-06-20" : undefined,
  };
  const snowflake: ConnectedIntegration = {
    id: "snowflake",
    name: "Snowflake",
    description: "Export calibration metrics to the enterprise data warehouse",
    status: role === "admin" ? "pending" : "available",
  };
  return [slack, teams, jira, snowflake];
}

export const allCategories: Category[] = [
  "Financial",
  "Operational",
  "Geopolitical",
  "Regulatory",
  "Talent",
  "Security/Cyber",
  "Supply Chain",
  "Product",
  "Reputational",
  "Macro",
  "Real Estate",
];
