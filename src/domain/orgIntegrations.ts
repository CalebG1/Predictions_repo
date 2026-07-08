import { CONNECTORS, type Connector } from "./connectors";

/** Org integrations provisioned by company administrators — not user-connectable. */
export interface OrgIntegration {
  connectorId: string;
  /** When IT admin enabled this integration. */
  provisionedAt: string;
  /** Optional scope note shown to users, e.g. workspace or tenant. */
  scope?: string;
}

export const ORG_INTEGRATIONS: OrgIntegration[] = [
  { connectorId: "slack", provisionedAt: "2026-01-15", scope: "Northwind workspace" },
  { connectorId: "teams", provisionedAt: "2026-01-15", scope: "Microsoft 365 tenant" },
  { connectorId: "excel", provisionedAt: "2026-02-01", scope: "SharePoint / OneDrive" },
  { connectorId: "google-forms", provisionedAt: "2026-02-10" },
  { connectorId: "google-meet", provisionedAt: "2026-03-01" },
  { connectorId: "sharepoint", provisionedAt: "2026-01-20" },
  { connectorId: "salesforce", provisionedAt: "2026-02-15" },
  { connectorId: "jira", provisionedAt: "2026-02-20" },
  { connectorId: "servicenow", provisionedAt: "2026-03-10" },
  { connectorId: "snowflake", provisionedAt: "2026-04-01" },
  { connectorId: "confluence", provisionedAt: "2026-03-15" },
  { connectorId: "notion", provisionedAt: "2026-04-10" },
];

export function orgIntegrationConnector(integration: OrgIntegration): Connector | undefined {
  return CONNECTORS.find((c) => c.id === integration.connectorId);
}

export function provisionedConnectors(): Connector[] {
  return ORG_INTEGRATIONS.map((i) => orgIntegrationConnector(i)).filter((c): c is Connector => c !== undefined);
}
