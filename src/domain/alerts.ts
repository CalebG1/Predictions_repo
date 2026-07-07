// Security alerts as forecast evidence.
//
// This is the core of "forecasts first, alerts second": alerts from upstream
// security tools are treated as EVIDENCE that moves one or more forecast
// questions. Each alert can map to multiple questions via AlertForecastImpact,
// and materiality filtering separates raw noise from probability-moving signal.

import type { Confidence } from "./types";

export type AlertSource =
  | "CrowdStrike"
  | "Microsoft Defender"
  | "Okta"
  | "Microsoft Entra ID"
  | "Wiz"
  | "Tenable"
  | "Qualys"
  | "Proofpoint"
  | "ServiceNow"
  | "CISA KEV"
  | "Recorded Future"
  | "Abnormal";

export type AlertSeverity = "low" | "medium" | "high" | "critical";

export type AlertStatus =
  | "open"
  | "investigating"
  | "confirmed"
  | "false_positive"
  | "resolved";

/** A normalized event/finding from an upstream security tool. */
export interface SecurityAlert {
  id: string;
  source: AlertSource;
  sourceUrl?: string;
  timestamp: string; // ISO
  severity: AlertSeverity;
  title: string;
  description: string;
  affectedEntities: string[];
  affectedUser?: string;
  businessService?: string;
  mitreTechnique?: string;
  status: AlertStatus;
  owner: string;
  sla?: string;
  confidence: Confidence;
  /** True when the alert influences at least one forecast (Level 2 materiality). */
  forecastRelevant: boolean;
}

/** How much a specific alert moved a specific question, and why. */
export interface AlertForecastImpact {
  alertId: string;
  questionId: string;
  /** Signed probability delta, e.g. +0.032 = +3.2pp. */
  probabilityDelta: number;
  direction: "increase" | "decrease";
  confidence: Confidence;
  reason: string;
}

/**
 * Raw alert volume received per source (Level 1). The seed `alerts` below are
 * the forecast-relevant subset; these totals simulate the full firehose so the
 * alert-to-risk conversion module can show how much noise is filtered out.
 */
export const alertSourceVolume: Record<AlertSource, number> = {
  CrowdStrike: 142,
  "Microsoft Defender": 118,
  Okta: 86,
  "Microsoft Entra ID": 73,
  Wiz: 64,
  Tenable: 391,
  Qualys: 204,
  Proofpoint: 210,
  ServiceNow: 48,
  "CISA KEV": 12,
  "Recorded Future": 57,
  Abnormal: 96,
};

export const alerts: SecurityAlert[] = [
  {
    id: "a-vpn-cve",
    source: "Tenable",
    sourceUrl: "https://tenable.example.com/vulns/CVE-2026-3311",
    timestamp: "2026-06-21T18:14:00Z",
    severity: "critical",
    title: "Critical vulnerability on internet-facing VPN appliance",
    description:
      "CVE-2026-3311 (CVSS 9.8) detected on vpn-prod-03. Pre-auth remote code execution on the SSL-VPN portal used for employee remote access.",
    affectedEntities: ["vpn-prod-03", "Remote Access Service", "Identity Infrastructure"],
    businessService: "Remote Access",
    mitreTechnique: "T1190 Exploit Public-Facing Application",
    status: "open",
    owner: "Infrastructure Security",
    sla: "Overdue by 6 days",
    confidence: "high",
    forecastRelevant: true,
  },
  {
    id: "a-kev-exploit",
    source: "CISA KEV",
    sourceUrl: "https://www.cisa.gov/known-exploited-vulnerabilities",
    timestamp: "2026-06-19T09:02:00Z",
    severity: "high",
    title: "Exploit for VPN CVE observed in the wild",
    description:
      "CVE-2026-3311 added to the CISA Known Exploited Vulnerabilities catalog; active exploitation reported against the same appliance family.",
    affectedEntities: ["vpn-prod-03", "Remote Access Service"],
    businessService: "Remote Access",
    mitreTechnique: "T1190 Exploit Public-Facing Application",
    status: "confirmed",
    owner: "Threat Intelligence",
    confidence: "high",
    forecastRelevant: true,
  },
  {
    id: "a-patch-sla",
    source: "ServiceNow",
    sourceUrl: "https://servicenow.example.com/incident/INC0492831",
    timestamp: "2026-06-20T11:45:00Z",
    severity: "high",
    title: "Remediation SLA missed on critical VPN patch",
    description:
      "Patch ticket INC0492831 for vpn-prod-03 has exceeded its 5-day critical remediation SLA. No maintenance window scheduled.",
    affectedEntities: ["vpn-prod-03"],
    businessService: "Remote Access",
    status: "open",
    owner: "Infrastructure Security",
    sla: "Missed (5-day critical)",
    confidence: "high",
    forecastRelevant: true,
  },
  {
    id: "a-okta-impossible-travel",
    source: "Okta",
    sourceUrl: "https://okta.example.com/reports/system-log",
    timestamp: "2026-06-27T02:31:00Z",
    severity: "high",
    title: "Impossible-travel sign-in on privileged account",
    description:
      "Successful sign-in for a privileged operations account from two geographies 900km apart within 20 minutes. MFA satisfied via push — possible MFA fatigue.",
    affectedEntities: ["okta-user-privileged", "Identity Infrastructure"],
    affectedUser: "svc-ops-admin",
    businessService: "Identity",
    mitreTechnique: "T1078 Valid Accounts",
    status: "investigating",
    owner: "SecOps",
    confidence: "medium",
    forecastRelevant: true,
  },
  {
    id: "a-okta-mfa-fatigue",
    source: "Microsoft Entra ID",
    timestamp: "2026-06-26T22:10:00Z",
    severity: "medium",
    title: "Repeated MFA push denials then approval",
    description:
      "A burst of 14 MFA push notifications followed by an approval for a finance user — a common MFA-fatigue pattern.",
    affectedEntities: ["entra-user-finance"],
    affectedUser: "j.okafor",
    businessService: "Identity",
    mitreTechnique: "T1621 Multi-Factor Authentication Request Generation",
    status: "investigating",
    owner: "SecOps",
    confidence: "medium",
    forecastRelevant: true,
  },
  {
    id: "a-crowdstrike-precursor",
    source: "CrowdStrike",
    sourceUrl: "https://falcon.example.com/detections",
    timestamp: "2026-06-25T16:40:00Z",
    severity: "high",
    title: "Ransomware precursor behavior on admin endpoint",
    description:
      "Falcon flagged credential-dumping and shadow-copy deletion attempts on a host belonging to an infrastructure administrator.",
    affectedEntities: ["wks-infra-admin-07"],
    affectedUser: "m.reyes",
    businessService: "Endpoint",
    mitreTechnique: "T1490 Inhibit System Recovery",
    status: "confirmed",
    owner: "SecOps",
    confidence: "high",
    forecastRelevant: true,
  },
  {
    id: "a-crowdstrike-endpoint-spike",
    source: "CrowdStrike",
    timestamp: "2026-06-24T13:05:00Z",
    severity: "medium",
    title: "Elevated endpoint detections across finance OU",
    description:
      "A 38% week-over-week rise in medium+ severity detections concentrated in the finance organizational unit.",
    affectedEntities: ["finance-ou"],
    businessService: "Endpoint",
    status: "open",
    owner: "SecOps",
    confidence: "medium",
    forecastRelevant: true,
  },
  {
    id: "a-wiz-public-bucket",
    source: "Wiz",
    sourceUrl: "https://wiz.example.com/issues/PUB-S3-2211",
    timestamp: "2026-06-27T08:20:00Z",
    severity: "critical",
    title: "Publicly exposed storage bucket with sensitive data",
    description:
      "Wiz detected an S3 bucket with public read access containing files classified as internal/PII. Exposed for at least 72 hours.",
    affectedEntities: ["s3-analytics-exports", "Data Lake"],
    businessService: "Cloud",
    mitreTechnique: "T1530 Data from Cloud Storage",
    status: "open",
    owner: "Cloud Security",
    sla: "Overdue by 1 day",
    confidence: "high",
    forecastRelevant: true,
  },
  {
    id: "a-wiz-over-permission",
    source: "Wiz",
    timestamp: "2026-06-23T10:15:00Z",
    severity: "medium",
    title: "Over-permissioned cloud identity toxic combination",
    description:
      "A CI/CD role combines admin-equivalent IAM permissions with internet exposure and no session boundary — a lateral-movement toxic combination.",
    affectedEntities: ["role-cicd-deployer"],
    businessService: "Cloud",
    mitreTechnique: "T1078.004 Cloud Accounts",
    status: "open",
    owner: "Cloud Security",
    confidence: "medium",
    forecastRelevant: true,
  },
  {
    id: "a-proofpoint-campaign",
    source: "Proofpoint",
    sourceUrl: "https://proofpoint.example.com/campaigns/PP-8842",
    timestamp: "2026-06-26T15:00:00Z",
    severity: "high",
    title: "Targeted phishing campaign against finance users",
    description:
      "A credential-harvesting campaign impersonating the CFO targeted 42 finance users; 12 click-throughs recorded before URL rewrite blocked the page.",
    affectedEntities: ["finance-ou"],
    businessService: "Email",
    mitreTechnique: "T1566 Phishing",
    status: "investigating",
    owner: "SecOps",
    confidence: "high",
    forecastRelevant: true,
  },
  {
    id: "a-abnormal-bec",
    source: "Abnormal",
    timestamp: "2026-06-24T18:22:00Z",
    severity: "high",
    title: "Business email compromise attempt on AP team",
    description:
      "Abnormal quarantined a vendor-impersonation email requesting a bank-detail change on an open invoice > $500K.",
    affectedEntities: ["accounts-payable"],
    businessService: "Email",
    mitreTechnique: "T1566.002 Spearphishing Link",
    status: "confirmed",
    owner: "SecOps",
    confidence: "high",
    forecastRelevant: true,
  },
  {
    id: "a-vendor-disclosure",
    source: "Recorded Future",
    sourceUrl: "https://recordedfuture.example.com/intel/vendor-x",
    timestamp: "2026-06-27T07:05:00Z",
    severity: "high",
    title: "Tier-1 SaaS vendor discloses security incident",
    description:
      "A vendor with access to our customer records disclosed an incident under investigation. Scope of our data exposure is not yet confirmed.",
    affectedEntities: ["vendor-crm-saas"],
    businessService: "Vendor Risk",
    status: "investigating",
    owner: "Third-Party Risk",
    confidence: "medium",
    forecastRelevant: true,
  },
  {
    id: "a-vendor-darkweb",
    source: "Recorded Future",
    timestamp: "2026-06-22T12:40:00Z",
    severity: "medium",
    title: "Dark-web mention of vendor credentials for sale",
    description:
      "A listing referencing credentials for one of our Tier-1 vendors appeared on a monitored marketplace. Authenticity unverified.",
    affectedEntities: ["vendor-crm-saas"],
    businessService: "Vendor Risk",
    status: "open",
    owner: "Threat Intelligence",
    confidence: "low",
    forecastRelevant: true,
  },
  {
    id: "a-tenable-kev-count",
    source: "Tenable",
    timestamp: "2026-06-26T09:00:00Z",
    severity: "high",
    title: "12 known-exploited vulns past SLA, 3 internet-facing",
    description:
      "Vulnerability posture report: 12 KEV-listed vulnerabilities remain past remediation SLA; 3 are on internet-facing assets.",
    affectedEntities: ["internet-facing-assets"],
    businessService: "Application security",
    status: "open",
    owner: "Vulnerability Management",
    sla: "Multiple overdue",
    confidence: "high",
    forecastRelevant: true,
  },
  {
    id: "a-ddos-probe",
    source: "Microsoft Defender",
    timestamp: "2026-06-26T04:30:00Z",
    severity: "medium",
    title: "Volumetric traffic probe against edge",
    description:
      "A short volumetric burst against the customer-facing edge was absorbed by scrubbing. Consistent with pre-attack reconnaissance.",
    affectedEntities: ["edge-lb-01", "Customer Portal"],
    businessService: "Network",
    mitreTechnique: "T1498 Network Denial of Service",
    status: "resolved",
    owner: "SRE",
    confidence: "low",
    forecastRelevant: true,
  },
  {
    id: "a-soc2-control-gap",
    source: "ServiceNow",
    timestamp: "2026-06-27T10:30:00Z",
    severity: "medium",
    title: "SOC 2 control gaps overdue for remediation",
    description:
      "GRC tracker shows 3 open SOC 2 control gaps, 2 past their remediation date, ahead of the Type II audit window.",
    affectedEntities: ["control-CC6.1", "control-CC7.2"],
    businessService: "Compliance",
    status: "open",
    owner: "GRC",
    sla: "2 overdue",
    confidence: "medium",
    forecastRelevant: true,
  },
  {
    id: "a-ztna-milestone",
    source: "ServiceNow",
    timestamp: "2026-06-25T14:00:00Z",
    severity: "low",
    title: "Zero trust Phase 2 milestone slipped one sprint",
    description:
      "Device-trust enrollment for the last production workload group slipped by one sprint due to an agent-compatibility issue.",
    affectedEntities: ["ztna-program"],
    businessService: "Identity",
    status: "open",
    owner: "Security Engineering",
    confidence: "medium",
    forecastRelevant: true,
  },
];

/** Alert -> question impact edges. One alert can move multiple questions. */
export const alertImpacts: AlertForecastImpact[] = [
  { alertId: "a-vpn-cve", questionId: "q-cyber-breach", probabilityDelta: 0.032, direction: "increase", confidence: "high", reason: "Internet-facing asset supporting privileged remote access; a viable initial-access path to a material incident." },
  { alertId: "a-vpn-cve", questionId: "q-cyber-iam", probabilityDelta: 0.024, direction: "increase", confidence: "high", reason: "The appliance fronts authentication flows, raising credential-compromise exposure." },
  { alertId: "a-vpn-cve", questionId: "q-cyber-zero-day", probabilityDelta: 0.03, direction: "increase", confidence: "high", reason: "A critical CVE with an available patch remains unremediated in the environment." },
  { alertId: "a-kev-exploit", questionId: "q-cyber-breach", probabilityDelta: 0.014, direction: "increase", confidence: "high", reason: "Active in-the-wild exploitation materially raises the likelihood the exposure is used." },
  { alertId: "a-kev-exploit", questionId: "q-cyber-zero-day", probabilityDelta: 0.018, direction: "increase", confidence: "high", reason: "KEV listing confirms exploitation is practical, not theoretical." },
  { alertId: "a-patch-sla", questionId: "q-cyber-breach", probabilityDelta: 0.011, direction: "increase", confidence: "high", reason: "Overdue remediation extends the window of exposure on a critical asset." },
  { alertId: "a-patch-sla", questionId: "q-cyber-zero-day", probabilityDelta: 0.012, direction: "increase", confidence: "medium", reason: "Missed SLA is the direct condition this question forecasts." },
  { alertId: "a-okta-impossible-travel", questionId: "q-cyber-iam", probabilityDelta: 0.04, direction: "increase", confidence: "medium", reason: "Privileged account shows anomalous access consistent with credential compromise." },
  { alertId: "a-okta-impossible-travel", questionId: "q-cyber-breach", probabilityDelta: 0.01, direction: "increase", confidence: "medium", reason: "A privileged-account anomaly is a plausible precursor to a material incident." },
  { alertId: "a-okta-mfa-fatigue", questionId: "q-cyber-iam", probabilityDelta: 0.015, direction: "increase", confidence: "medium", reason: "MFA-fatigue pattern indicates active attempts to defeat identity controls." },
  { alertId: "a-okta-mfa-fatigue", questionId: "q-cyber-phishing", probabilityDelta: 0.008, direction: "increase", confidence: "low", reason: "Finance-user targeting aligns with the BEC threat model." },
  { alertId: "a-crowdstrike-precursor", questionId: "q-cyber-ransomware", probabilityDelta: 0.028, direction: "increase", confidence: "high", reason: "Shadow-copy deletion on a privileged admin host matches known ransomware precursor activity." },
  { alertId: "a-crowdstrike-precursor", questionId: "q-cyber-breach", probabilityDelta: 0.012, direction: "increase", confidence: "medium", reason: "Credential dumping on an admin endpoint expands the blast radius of any intrusion." },
  { alertId: "a-crowdstrike-endpoint-spike", questionId: "q-cyber-ransomware", probabilityDelta: 0.01, direction: "increase", confidence: "medium", reason: "A concentrated rise in endpoint detections is a leading indicator of intrusion attempts." },
  { alertId: "a-wiz-public-bucket", questionId: "q-cyber-cloud", probabilityDelta: 0.045, direction: "increase", confidence: "high", reason: "A publicly exposed bucket with sensitive data is the direct failure this question forecasts." },
  { alertId: "a-wiz-public-bucket", questionId: "q-cyber-breach", probabilityDelta: 0.015, direction: "increase", confidence: "high", reason: "Exposed PII creates a credible path to a disclosable material incident." },
  { alertId: "a-wiz-over-permission", questionId: "q-cyber-cloud", probabilityDelta: 0.012, direction: "increase", confidence: "medium", reason: "A toxic IAM combination increases the chance a misconfig becomes exploitable." },
  { alertId: "a-wiz-over-permission", questionId: "q-cyber-iam", probabilityDelta: 0.01, direction: "increase", confidence: "medium", reason: "Over-permissioned automation identity broadens privileged-access exposure." },
  { alertId: "a-proofpoint-campaign", questionId: "q-cyber-phishing", probabilityDelta: 0.03, direction: "increase", confidence: "high", reason: "An active credential-harvesting campaign with click-throughs directly raises BEC/wire-fraud risk." },
  { alertId: "a-proofpoint-campaign", questionId: "q-cyber-breach", probabilityDelta: 0.008, direction: "increase", confidence: "medium", reason: "Successful phishing is a common first stage of material incidents." },
  { alertId: "a-abnormal-bec", questionId: "q-cyber-phishing", probabilityDelta: 0.02, direction: "increase", confidence: "high", reason: "A confirmed vendor-impersonation attempt on an open >$500K invoice matches the resolution criteria." },
  { alertId: "a-vendor-disclosure", questionId: "q-cyber-vendor", probabilityDelta: 0.05, direction: "increase", confidence: "medium", reason: "A Tier-1 vendor with access to our data disclosed an incident under investigation." },
  { alertId: "a-vendor-disclosure", questionId: "q-cyber-breach", probabilityDelta: 0.009, direction: "increase", confidence: "low", reason: "Vendor exposure could cascade into a material incident for us." },
  { alertId: "a-vendor-darkweb", questionId: "q-cyber-vendor", probabilityDelta: 0.012, direction: "increase", confidence: "low", reason: "Unverified credential listing raises, but does not confirm, vendor-breach likelihood." },
  { alertId: "a-tenable-kev-count", questionId: "q-cyber-zero-day", probabilityDelta: 0.02, direction: "increase", confidence: "high", reason: "Multiple internet-facing KEV vulns past SLA raise the odds one is exploited before patching." },
  { alertId: "a-tenable-kev-count", questionId: "q-cyber-breach", probabilityDelta: 0.01, direction: "increase", confidence: "medium", reason: "A backlog of exploitable exposures broadens the overall attack surface." },
  { alertId: "a-ddos-probe", questionId: "q-cyber-ddos", probabilityDelta: 0.01, direction: "increase", confidence: "low", reason: "Reconnaissance-style probing sometimes precedes a sustained volumetric attack." },
  { alertId: "a-soc2-control-gap", questionId: "q-cyber-compliance", probabilityDelta: 0.02, direction: "increase", confidence: "medium", reason: "Overdue control gaps ahead of the audit window raise the chance of missing it." },
  { alertId: "a-ztna-milestone", questionId: "q-cyber-zero-trust", probabilityDelta: -0.03, direction: "decrease", confidence: "medium", reason: "A slipped milestone lowers the probability of an on-schedule completion." },
];

const MATERIAL_DELTA = 0.01;

/** Level 3 materiality: a meaningful probability move. */
export function isMaterialMover(impact: AlertForecastImpact): boolean {
  return Math.abs(impact.probabilityDelta) >= MATERIAL_DELTA;
}

const alertById = new Map(alerts.map((a) => [a.id, a]));

export function alertForId(alertId: string): SecurityAlert | undefined {
  return alertById.get(alertId);
}

/** Impacts affecting a given question, largest absolute move first. */
export function impactsForQuestion(questionId: string): AlertForecastImpact[] {
  return alertImpacts
    .filter((i) => i.questionId === questionId)
    .sort((a, b) => Math.abs(b.probabilityDelta) - Math.abs(a.probabilityDelta));
}

export interface AlertWithImpact {
  alert: SecurityAlert;
  impact: AlertForecastImpact;
}

/** Alerts associated with a question, joined with their impact, newest first. */
export function alertsForQuestion(questionId: string): AlertWithImpact[] {
  return impactsForQuestion(questionId)
    .map((impact) => {
      const alert = alertById.get(impact.alertId);
      return alert ? { alert, impact } : null;
    })
    .filter((x): x is AlertWithImpact => x !== null)
    .sort((a, b) => b.alert.timestamp.localeCompare(a.alert.timestamp));
}

/** Number of alerts associated with a question. */
export function relatedAlertCount(questionId: string): number {
  return alertImpacts.filter((i) => i.questionId === questionId).length;
}

export interface AlertImpactFeedItem {
  alert: SecurityAlert;
  impacts: (AlertForecastImpact & { questionTitle: string })[];
  topMagnitude: number;
}

/**
 * Alert impact feed: forecast-relevant alerts grouped with every question they
 * moved, ordered by recency then by the size of their largest move.
 */
export function alertImpactFeed(
  questionTitle: (questionId: string) => string | undefined,
  visibleQuestionIds: Set<string>
): AlertImpactFeedItem[] {
  const items: AlertImpactFeedItem[] = [];
  for (const alert of alerts) {
    if (!alert.forecastRelevant) continue;
    const impacts = alertImpacts
      .filter((i) => i.alertId === alert.id && visibleQuestionIds.has(i.questionId))
      .map((i) => ({ ...i, questionTitle: questionTitle(i.questionId) ?? i.questionId }))
      .sort((a, b) => Math.abs(b.probabilityDelta) - Math.abs(a.probabilityDelta));
    if (impacts.length === 0) continue;
    items.push({
      alert,
      impacts,
      topMagnitude: Math.max(...impacts.map((i) => Math.abs(i.probabilityDelta))),
    });
  }
  return items.sort(
    (a, b) => b.alert.timestamp.localeCompare(a.alert.timestamp) || b.topMagnitude - a.topMagnitude
  );
}

export interface AlertConversionRow {
  source: AlertSource;
  received: number;
  forecastRelevant: number;
  materialMovers: number;
}

/**
 * Alert-to-risk conversion: for each source, how many raw alerts were received,
 * how many were forecast-relevant, and how many were material movers. Only
 * counts impacts on questions the caller can see.
 */
export function alertConversionStats(visibleQuestionIds: Set<string>): AlertConversionRow[] {
  const relevantAlertIds = new Set<string>();
  const materialAlertIds = new Set<string>();
  for (const impact of alertImpacts) {
    if (!visibleQuestionIds.has(impact.questionId)) continue;
    relevantAlertIds.add(impact.alertId);
    if (isMaterialMover(impact)) materialAlertIds.add(impact.alertId);
  }

  const bySource = new Map<AlertSource, { relevant: number; material: number }>();
  for (const alert of alerts) {
    if (!relevantAlertIds.has(alert.id)) continue;
    const entry = bySource.get(alert.source) ?? { relevant: 0, material: 0 };
    entry.relevant += 1;
    if (materialAlertIds.has(alert.id)) entry.material += 1;
    bySource.set(alert.source, entry);
  }

  return Array.from(bySource.entries())
    .map(([source, counts]) => ({
      source,
      received: alertSourceVolume[source],
      forecastRelevant: counts.relevant,
      materialMovers: counts.material,
    }))
    .sort((a, b) => b.materialMovers - a.materialMovers || b.forecastRelevant - a.forecastRelevant);
}

export const SEVERITY_RANK: Record<AlertSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export const ALERT_STATUS_LABEL: Record<AlertStatus, string> = {
  open: "Open",
  investigating: "Investigating",
  confirmed: "Confirmed",
  false_positive: "False positive",
  resolved: "Resolved",
};
