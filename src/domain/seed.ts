// Seed data: ~15 realistic questions across categories (risks + opportunities,
// binary + scalar), forecasters, evidence, probability history, resolved
// questions, access grants, and a synthetic resolved set for calibration.

import {
  AccessGrant,
  CalibrationBin,
  EvidenceSource,
  ForecastQuestion,
  Forecaster,
  Outcome,
  ProbabilityPoint,
  Resolution,
  User,
  TeamJoinRequest,
} from "./types";
import { calibrationBins } from "./scoring";

export const organization = { id: "org-1", name: "Northwind Industries" };

export const users: User[] = [
  {
    id: "u-risk",
    name: "R. Mensah (Risk Manager)",
    role: "risk_manager",
    team: "Risk",
    teams: ["Risk"],
    department: "Enterprise Risk Management",
    email: "r.mensah@northwind.com",
    title: "Director, Enterprise Risk",
    phone: "+1 (312) 555-0142",
    location: "Chicago, IL",
    timezone: "America/Chicago",
    locale: "en-US",
    joinedAt: "2021-03-15",
    lastLoginAt: "2026-07-07T14:22:00Z",
    mfaEnabled: true,
    ssoProvider: "okta",
    managerId: "u-exec",
  },
  {
    id: "u-exec",
    name: "D. Alvarez (CFO)",
    role: "executive",
    team: "Executive",
    teams: ["Executive", "Finance"],
    department: "Finance",
    email: "d.alvarez@northwind.com",
    title: "Chief Financial Officer",
    phone: "+1 (312) 555-0101",
    location: "Chicago, IL",
    timezone: "America/Chicago",
    locale: "en-US",
    joinedAt: "2018-09-01",
    lastLoginAt: "2026-07-07T11:05:00Z",
    mfaEnabled: true,
    ssoProvider: "azure_ad",
  },
  {
    id: "u-analyst",
    name: "K. Sato (Analyst)",
    role: "analyst",
    team: "Strategy",
    teams: ["Strategy"],
    department: "Corporate Strategy",
    email: "k.sato@northwind.com",
    title: "Senior Strategy Analyst",
    phone: "+1 (312) 555-0198",
    location: "Chicago, IL",
    timezone: "America/Chicago",
    locale: "en-US",
    joinedAt: "2023-01-09",
    lastLoginAt: "2026-07-06T18:40:00Z",
    mfaEnabled: false,
    ssoProvider: "okta",
    managerId: "u-risk",
  },
  {
    id: "u-admin",
    name: "T. Chen (System Admin)",
    role: "admin",
    team: "IT",
    teams: ["IT"],
    department: "Information Technology",
    email: "t.chen@northwind.com",
    title: "Platform Administrator",
    joinedAt: "2020-06-01",
    lastLoginAt: "2026-07-07T08:15:00Z",
    mfaEnabled: true,
    ssoProvider: "okta",
  },
];

export const seedTeamJoinRequests: TeamJoinRequest[] = [
  {
    id: "tjr-1",
    userId: "u-analyst",
    team: "Risk",
    status: "pending",
    requestedAt: "2026-07-05T10:00:00Z",
  },
  {
    id: "tjr-2",
    userId: "u-risk",
    team: "Compliance",
    status: "pending",
    requestedAt: "2026-07-06T14:30:00Z",
  },
];

export const forecasters: Forecaster[] = [
  {
    id: "agent-ensemble",
    name: "Dragonfly Ensemble",
    kind: "agent",
    domainTags: ["Macro", "Financial", "Geopolitical"],
    brierScore: 0.118,
    calibrationCurve: [],
    trackRecordSummary: "Log-odds pool of 6 independent agents. Well-calibrated 0.3–0.8 band.",
  },
  {
    id: "agent-baserate",
    name: "Base-Rate Agent",
    kind: "agent",
    domainTags: ["Operational", "Supply Chain"],
    brierScore: 0.142,
    calibrationCurve: [],
    trackRecordSummary: "Conservative; anchors on comparison-class frequency.",
  },
  {
    id: "human-risk",
    name: "R. Mensah",
    kind: "human",
    domainTags: ["Security/Cyber", "Operational"],
    brierScore: 0.161,
    calibrationCurve: [],
    trackRecordSummary: "Domain expert; slightly overconfident on cyber tails.",
  },
];

export const evidenceSources: EvidenceSource[] = [
  { id: "ev-1", title: "Fed H.4.1 weekly release", url: "https://www.federalreserve.gov/releases/h41/", sourceClass: "central_bank", geographyTag: "US", methodTag: "official", credibilityScore: 0.95, retrievedAt: "2026-06-20", relevance: "high", refreshFrequency: "weekly" },
  { id: "ev-2", title: "BLS CPI report", url: "https://www.bls.gov/cpi/", sourceClass: "gov_stats", geographyTag: "US", methodTag: "official", credibilityScore: 0.93, retrievedAt: "2026-06-12", relevance: "high", refreshFrequency: "monthly" },
  { id: "ev-3", title: "SOFR futures curve", url: "https://www.cmegroup.com/markets/interest-rates/stirs/sofr.html", sourceClass: "market_data", methodTag: "market-implied", credibilityScore: 0.8, retrievedAt: "2026-06-26", relevance: "medium", refreshFrequency: "daily" },
  { id: "ev-4", title: "Drewry container index", url: "https://www.drewry.co.uk/supply-chain-advisors/supply-chain-expertise/world-container-index-assessed-by-drewry", sourceClass: "nowcasting", methodTag: "logistics", credibilityScore: 0.78, retrievedAt: "2026-06-24", relevance: "medium", refreshFrequency: "weekly" },
  { id: "ev-5", title: "Q2 earnings call transcript", url: "https://example.com/investor-relations/q2-transcript", sourceClass: "corporate_demand", methodTag: "primary", credibilityScore: 0.82, retrievedAt: "2026-06-22", relevance: "medium", refreshFrequency: "default" },
  { id: "ev-6", title: "GDELT geopolitical event stream", url: "https://www.gdeltproject.org/", sourceClass: "fast_feed", methodTag: "entity-extraction", credibilityScore: 0.62, retrievedAt: "2026-06-27", disconfirming: true, relevance: "low", refreshFrequency: "hourly" },
  { id: "ev-7", title: "Internal incident log (SecOps)", sourceClass: "org_internal", methodTag: "internal", credibilityScore: 0.88, retrievedAt: "2026-06-27", relevance: "high", refreshFrequency: "default" },
  { id: "ev-8", title: "Opposing think-tank brief", url: "https://example.com/research/opposing-view-brief", sourceClass: "fast_feed", ideologyTag: "contrarian", credibilityScore: 0.55, retrievedAt: "2026-06-25", disconfirming: true, relevance: "low", refreshFrequency: "default" },
];

type QSeed = Omit<ForecastQuestion, "id"> & { id: string; initial: number; options?: string[] };

const Q: QSeed[] = [
  {
    id: "q-cyber-breach",
    title: "Material security incident before Q4",
    preciseDefinition: "A SEV-1/SEV-2 incident with confirmed data exfiltration of customer PII, disclosed internally, before 2026-10-01.",
    category: "Security/Cyber", type: "binary", riskOrOpportunity: "risk",
    impactEstimate: "$8–20M remediation + disclosure", impactLevel: "critical", impactScore: 0.9,
    resolutionCriteria: "Resolves YES if SecOps confirms exfiltration of customer PII in a SEV-1/2 incident.",
    resolutionSource: "SecOps incident review board", openDate: "2026-04-01", resolutionDate: "2026-10-01",
    status: "open", visibility: "leadership", owningTeam: "Security", createdBy: "u-risk", priorBaseRate: 0.18, initial: 0.22,
  },
  {
    id: "q-cyber-ransomware",
    title: "Ransomware incident before Q3",
    preciseDefinition: "A ransomware attack causes production system encryption or material business disruption before 2026-09-30.",
    category: "Security/Cyber", type: "binary", riskOrOpportunity: "risk",
    impactEstimate: "$5–15M downtime + recovery", impactLevel: "critical", impactScore: 0.88,
    resolutionCriteria: "Resolves YES if SecOps confirms ransomware encryption of production systems.",
    resolutionSource: "SecOps incident review board", openDate: "2026-04-15", resolutionDate: "2026-09-30",
    status: "open", visibility: "leadership", owningTeam: "Security", createdBy: "u-risk", priorBaseRate: 0.15, initial: 0.19,
  },
  {
    id: "q-cyber-phishing",
    title: "Successful BEC wire fraud >$500K",
    preciseDefinition: "Business email compromise results in unauthorized wire transfer exceeding $500K before 2026-12-31.",
    category: "Security/Cyber", type: "binary", riskOrOpportunity: "risk",
    impactEstimate: "$500K–$2M direct loss", impactLevel: "high", impactScore: 0.72,
    resolutionCriteria: "Resolves YES if Treasury confirms unauthorized wire >$500K from BEC.",
    resolutionSource: "Treasury fraud report", openDate: "2026-03-01", resolutionDate: "2026-12-31",
    status: "open", visibility: "team", owningTeam: "Security", createdBy: "u-risk", priorBaseRate: 0.12, initial: 0.14,
  },
  {
    id: "q-cyber-vendor",
    title: "Tier-1 vendor breach affecting our data",
    preciseDefinition: "A top-10 vendor with access to our customer or employee data reports a breach affecting our data before 2026-12-31.",
    category: "Security/Cyber", type: "binary", riskOrOpportunity: "risk",
    impactEstimate: "$3–10M notification + legal", impactLevel: "high", impactScore: 0.82,
    resolutionCriteria: "Resolves YES on vendor breach notification confirming our data exposure.",
    resolutionSource: "Third-party risk register", openDate: "2026-02-01", resolutionDate: "2026-12-31",
    status: "open", visibility: "leadership", owningTeam: "Security", createdBy: "u-risk", priorBaseRate: 0.2, initial: 0.24,
  },
  {
    id: "q-cyber-iam",
    title: "Privileged account compromise this quarter",
    preciseDefinition: "Confirmed compromise of a domain admin or cloud root-equivalent account before 2026-09-30.",
    category: "Security/Cyber", type: "binary", riskOrOpportunity: "risk",
    impactEstimate: "Full environment takeover risk", impactLevel: "critical", impactScore: 0.86,
    resolutionCriteria: "Resolves YES if IAM team confirms privileged credential compromise.",
    resolutionSource: "IAM incident log", openDate: "2026-04-01", resolutionDate: "2026-09-30",
    status: "open", visibility: "team", owningTeam: "Security", createdBy: "u-analyst", priorBaseRate: 0.1, initial: 0.13,
  },
  {
    id: "q-cyber-cloud",
    title: "Critical cloud misconfig exploited",
    preciseDefinition: "A publicly exposed cloud resource (S3, storage account, or API) is exploited before 2026-12-31.",
    category: "Security/Cyber", type: "binary", riskOrOpportunity: "risk",
    impactEstimate: "$2–8M remediation + audit findings", impactLevel: "high", impactScore: 0.7,
    resolutionCriteria: "Resolves YES on confirmed exploitation of a critical cloud misconfiguration.",
    resolutionSource: "Cloud security posture dashboard", openDate: "2026-03-15", resolutionDate: "2026-12-31",
    status: "open", visibility: "team", owningTeam: "Security", createdBy: "u-analyst", priorBaseRate: 0.18, initial: 0.21,
  },
  {
    id: "q-cyber-ddos",
    title: "Customer-facing outage from DDoS >4hr",
    preciseDefinition: "A DDoS attack causes customer-facing service unavailability exceeding 4 consecutive hours before 2026-12-31.",
    category: "Security/Cyber", type: "binary", riskOrOpportunity: "risk",
    impactEstimate: "SLA credits + reputational damage", impactLevel: "medium", impactScore: 0.55,
    resolutionCriteria: "Resolves YES if SRE confirms >4hr customer-facing outage from DDoS.",
    resolutionSource: "SRE incident log", openDate: "2026-01-01", resolutionDate: "2026-12-31",
    status: "open", visibility: "public", owningTeam: "Security", createdBy: "u-analyst", priorBaseRate: 0.22, initial: 0.25,
  },
  {
    id: "q-cyber-compliance",
    title: "Miss SOC 2 Type II audit window",
    preciseDefinition: "Organization fails to complete SOC 2 Type II audit within the committed 2026-08-31 window.",
    category: "Security/Cyber", type: "binary", riskOrOpportunity: "risk",
    impactEstimate: "Enterprise deal delays + $1.5M pipeline risk", impactLevel: "high", impactScore: 0.65,
    resolutionCriteria: "Resolves YES if audit firm confirms window miss.",
    resolutionSource: "GRC audit tracker", openDate: "2026-02-01", resolutionDate: "2026-08-31",
    status: "open", visibility: "leadership", owningTeam: "Security", createdBy: "u-risk", priorBaseRate: 0.25, initial: 0.28,
  },
  {
    id: "q-cyber-zero-day",
    title: "Unpatched critical CVE exploited internally",
    preciseDefinition: "A CVSS ≥9.0 vulnerability with available patch is exploited in our environment before patch deployment.",
    category: "Security/Cyber", type: "binary", riskOrOpportunity: "risk",
    impactEstimate: "$1–5M incident response", impactLevel: "high", impactScore: 0.74,
    resolutionCriteria: "Resolves YES if SecOps confirms exploitation of an unpatched critical CVE.",
    resolutionSource: "Vulnerability management dashboard", openDate: "2026-04-01", resolutionDate: "2026-12-31",
    status: "open", visibility: "team", owningTeam: "Security", createdBy: "u-analyst", priorBaseRate: 0.14, initial: 0.17,
  },
  {
    id: "q-cyber-zero-trust",
    title: "Zero trust rollout completes on schedule",
    preciseDefinition: "Phase 2 zero trust architecture (identity-aware proxy + device trust) deployed to all production workloads by 2026-10-01.",
    category: "Security/Cyber", type: "binary", riskOrOpportunity: "opportunity",
    impactEstimate: "Reduces lateral movement risk; enables insurance renewal", impactLevel: "high", impactScore: 0.6,
    resolutionCriteria: "Resolves YES if CISO confirms Phase 2 deployment complete.",
    resolutionSource: "Security program tracker", openDate: "2026-01-15", resolutionDate: "2026-10-01",
    status: "open", visibility: "public", owningTeam: "Security", createdBy: "u-risk", priorBaseRate: 0.55, initial: 0.52,
  },
  {
    id: "q-supplier-default",
    title: "Tier-1 supplier disruption > 2 weeks",
    preciseDefinition: "A top-5 component supplier halts shipments for >14 consecutive days before 2026-12-31.",
    category: "Supply Chain", type: "binary", riskOrOpportunity: "risk",
    impactEstimate: "~$30M revenue at risk / line-down", impactLevel: "high", impactScore: 0.78,
    resolutionCriteria: "Resolves YES on a >14-day shipment halt confirmed by Procurement.",
    resolutionSource: "Procurement ops dashboard", openDate: "2026-03-15", resolutionDate: "2026-12-31",
    status: "open", visibility: "public", owningTeam: "Operations", createdBy: "u-analyst", priorBaseRate: 0.25, initial: 0.3,
  },
  {
    id: "q-fed-cut",
    title: "Fed cuts rates at September meeting",
    preciseDefinition: "FOMC lowers the target range at the Sept 2026 meeting.",
    category: "Macro", type: "binary", riskOrOpportunity: "opportunity",
    impactEstimate: "Lowers refinancing cost on $400M revolver", impactLevel: "high", impactScore: 0.6,
    resolutionCriteria: "Resolves YES if the upper bound is cut ≥25bps at the September meeting.",
    resolutionSource: "FOMC statement", openDate: "2026-05-01", resolutionDate: "2026-09-18",
    status: "open", visibility: "public", owningTeam: "Treasury", createdBy: "u-exec", priorBaseRate: 0.55, initial: 0.5,
  },
  {
    id: "q-product-launch",
    title: "Flagship product GA ships on schedule",
    preciseDefinition: "v3 platform reaches general availability on or before the committed 2026-11-15 date.",
    category: "Product", type: "binary", riskOrOpportunity: "opportunity",
    impactEstimate: "$45M ARR pipeline unlock", impactLevel: "high", impactScore: 0.72,
    resolutionCriteria: "Resolves YES if GA flag is enabled in prod by 2026-11-15.",
    resolutionSource: "Release management", openDate: "2026-04-10", resolutionDate: "2026-11-15",
    status: "open", visibility: "public", owningTeam: "Product", createdBy: "u-analyst", priorBaseRate: 0.6, initial: 0.58,
  },
  {
    id: "q-attrition",
    title: "Eng attrition exceeds 15% (annualized)",
    preciseDefinition: "Rolling 12-month voluntary engineering attrition crosses 15% before 2026-12-31.",
    category: "Talent", type: "binary", riskOrOpportunity: "risk",
    impactEstimate: "Roadmap slip + ~$6M backfill cost", impactLevel: "medium", impactScore: 0.5,
    resolutionCriteria: "Resolves YES if HRIS rolling attrition > 15%.",
    resolutionSource: "People analytics (HRIS)", openDate: "2026-02-01", resolutionDate: "2026-12-31",
    status: "open", visibility: "team", owningTeam: "People", createdBy: "u-exec", priorBaseRate: 0.3, initial: 0.28,
  },
  {
    id: "q-regulation",
    title: "New data-localization rule enacted in EU",
    preciseDefinition: "EU adopts binding data-localization requirements affecting our EU operations before 2027-03-31.",
    category: "Regulatory", type: "binary", riskOrOpportunity: "risk",
    impactEstimate: "€12M infra + compliance build", impactLevel: "high", impactScore: 0.68,
    resolutionCriteria: "Resolves YES on publication in the Official Journal of the EU.",
    resolutionSource: "EU Official Journal", openDate: "2026-01-15", resolutionDate: "2027-03-31",
    status: "open", visibility: "public", owningTeam: "Legal", createdBy: "u-risk", priorBaseRate: 0.35, initial: 0.4,
  },
  {
    id: "q-fx",
    title: "EUR/USD below 1.05 at year-end",
    preciseDefinition: "EUR/USD spot closes below 1.05 on 2026-12-31.",
    category: "Financial", type: "binary", riskOrOpportunity: "risk",
    impactEstimate: "FX translation drag on EU revenue", impactLevel: "medium", impactScore: 0.45,
    resolutionCriteria: "Resolves YES on ECB reference rate < 1.05 on the last business day.",
    resolutionSource: "ECB reference rate", openDate: "2026-05-20", resolutionDate: "2026-12-31",
    status: "open", visibility: "public", owningTeam: "Treasury", createdBy: "u-analyst", priorBaseRate: 0.4, initial: 0.42,
  },
  {
    id: "q-geo",
    title: "Shipping lane disruption persists into Q4",
    preciseDefinition: "A major lane (Red Sea / Hormuz / Panama) remains materially disrupted on 2026-10-01.",
    category: "Geopolitical", type: "binary", riskOrOpportunity: "risk",
    impactEstimate: "+18% freight + 2-week lead times", impactLevel: "high", impactScore: 0.66,
    resolutionCriteria: "Resolves YES if Drewry/IMF flags the lane as disrupted on 2026-10-01.",
    resolutionSource: "Drewry / IMF PortWatch", openDate: "2026-04-01", resolutionDate: "2026-10-01",
    status: "open", visibility: "public", owningTeam: "Operations", createdBy: "u-risk", priorBaseRate: 0.45, initial: 0.49,
  },
  {
    id: "q-reputation",
    title: "Negative viral event damages brand (NPS −10)",
    preciseDefinition: "A reputational event drives a ≥10pt NPS drop within 30 days before 2026-12-31.",
    category: "Reputational", type: "binary", riskOrOpportunity: "risk",
    impactEstimate: "Churn + CAC headwind", impactLevel: "medium", impactScore: 0.5,
    resolutionCriteria: "Resolves YES on a confirmed ≥10pt NPS drop attributable to a single event.",
    resolutionSource: "Brand tracker", openDate: "2026-03-01", resolutionDate: "2026-12-31",
    status: "open", visibility: "public", owningTeam: "Comms", createdBy: "u-analyst", priorBaseRate: 0.2, initial: 0.18,
  },
  {
    id: "q-opex",
    title: "Hit gross-margin target of 64% in Q3",
    preciseDefinition: "Reported Q3 gross margin ≥ 64.0%.",
    category: "Financial", type: "binary", riskOrOpportunity: "opportunity",
    impactEstimate: "Beats guidance; multiple re-rate", impactLevel: "medium", impactScore: 0.55,
    resolutionCriteria: "Resolves YES if reported Q3 GM ≥ 64.0%.",
    resolutionSource: "Q3 financial statements", openDate: "2026-05-01", resolutionDate: "2026-10-30",
    status: "open", visibility: "leadership", owningTeam: "Finance", createdBy: "u-exec", priorBaseRate: 0.5, initial: 0.52,
  },
  {
    id: "q-cloud",
    title: "Cloud cost overrun > 20% of budget",
    preciseDefinition: "FY cloud spend exceeds budget by >20% before 2026-12-31.",
    category: "Operational", type: "binary", riskOrOpportunity: "risk",
    impactEstimate: "~$9M unbudgeted opex", impactLevel: "medium", impactScore: 0.48,
    resolutionCriteria: "Resolves YES if FinOps reports >20% budget variance.",
    resolutionSource: "FinOps dashboard", openDate: "2026-02-15", resolutionDate: "2026-12-31",
    status: "open", visibility: "public", owningTeam: "Platform", createdBy: "u-analyst", priorBaseRate: 0.28, initial: 0.31,
  },
  {
    id: "q-mna",
    title: "Close target acquisition this fiscal year",
    preciseDefinition: "Definitive agreement signed and closed for the named target before 2026-12-31.",
    category: "Financial", type: "binary", riskOrOpportunity: "opportunity",
    impactEstimate: "+$120M revenue, integration risk", impactLevel: "critical", impactScore: 0.85,
    resolutionCriteria: "Resolves YES on deal close (8-K filed).",
    resolutionSource: "SEC EDGAR", openDate: "2026-04-20", resolutionDate: "2026-12-31",
    status: "open", visibility: "restricted", owningTeam: "Corp Dev", createdBy: "u-exec", priorBaseRate: 0.3, initial: 0.27,
  },
  {
    id: "q-cpi",
    title: "US core CPI YoY at next print (scalar)",
    preciseDefinition: "Core CPI year-over-year, % at the next BLS release.",
    category: "Macro", type: "scalar", scalarUnit: "% YoY", riskOrOpportunity: "risk",
    impactEstimate: "Rates path / discount rate", impactLevel: "medium", impactScore: 0.4,
    resolutionCriteria: "Resolves to the published core CPI YoY figure.",
    resolutionSource: "BLS", openDate: "2026-06-01", resolutionDate: "2026-07-11",
    status: "open", visibility: "public", owningTeam: "Treasury", createdBy: "u-analyst", priorBaseRate: 0.45, initial: 0.46,
  },
  {
    id: "q-uptime",
    title: "Annual platform uptime meets 99.95% SLA",
    preciseDefinition: "Trailing-12-month availability ≥ 99.95% measured at 2026-12-31.",
    category: "Operational", type: "binary", riskOrOpportunity: "opportunity",
    impactEstimate: "Avoids SLA credits + churn", impactLevel: "medium", impactScore: 0.5,
    resolutionCriteria: "Resolves YES if SRE availability ≥ 99.95%.",
    resolutionSource: "SRE availability report", openDate: "2026-01-01", resolutionDate: "2026-12-31",
    status: "open", visibility: "public", owningTeam: "SRE", createdBy: "u-analyst", priorBaseRate: 0.7, initial: 0.73,
  },
  {
    id: "q-talent-hire",
    title: "Fill VP of AI role before Q4",
    preciseDefinition: "Signed offer accepted for the VP of AI requisition before 2026-10-01.",
    category: "Talent", type: "binary", riskOrOpportunity: "opportunity",
    impactEstimate: "Unblocks AI roadmap", impactLevel: "medium", impactScore: 0.45,
    resolutionCriteria: "Resolves YES on accepted signed offer.",
    resolutionSource: "ATS", openDate: "2026-05-10", resolutionDate: "2026-10-01",
    status: "open", visibility: "public", owningTeam: "People", createdBy: "u-risk", priorBaseRate: 0.55, initial: 0.5,
  },
  {
    id: "q-best-ai-model",
    title: "Which AI model leads by end of 2026?",
    preciseDefinition:
      "Resolves to the provider whose flagship model holds #1 on the LMSYS Chatbot Arena leaderboard (by Elo) at 2026-12-31.",
    category: "Product",
    type: "categorical",
    riskOrOpportunity: "opportunity",
    impactEstimate: "Guides $12M annual AI vendor spend",
    impactLevel: "medium",
    impactScore: 0.55,
    resolutionCriteria:
      "Provider with the highest Chatbot Arena Elo at year-end; ties broken by public API availability.",
    resolutionSource: "LMSYS Chatbot Arena leaderboard",
    openDate: "2026-01-15",
    resolutionDate: "2026-12-31",
    status: "open",
    visibility: "public",
    owningTeam: "Platform",
    createdBy: "u-analyst",
    priorBaseRate: 0.45,
    initial: 0.45,
    options: ["OpenAI", "Google", "Anthropic", "Meta"],
  },
];

export const questions: ForecastQuestion[] = Q.map(({ initial, options, ...q }) => {
  void initial;
  void options;
  return q;
});

// --- Probability history generation (with annotated update reasons) ---

const SOFT_TRIGGERS = ["Scheduled weekly run", "Watched market signal moved"];
const HARD_TRIGGERS = [
  "New primary-source filing ingested",
  "Red-team challenge incorporated",
  "Internal status change",
];

function pickTrigger(rng: () => number): string {
  const r = rng();
  if (r < 0.62) return SOFT_TRIGGERS[Math.floor(rng() * SOFT_TRIGGERS.length)];
  if (r < 0.82) return HARD_TRIGGERS[Math.floor(rng() * HARD_TRIGGERS.length)];
  return "Base-rate refresh";
}

function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const outcomes: Outcome[] = [];
export const probabilityHistory: ProbabilityPoint[] = [];

const NOW = new Date("2026-06-28");

Q.forEach((q) => {
  const rng = seeded(q.id);
  const points = 40;
  const start = new Date(q.openDate);
  const totalMs = NOW.getTime() - start.getTime();

  if (q.type === "categorical" && q.options?.length) {
    let weights = q.options.map((_, i) => {
      const base = [0.46, 0.28, 0.18, 0.08];
      return base[i] ?? 0.25 / q.options!.length;
    });
    const sum0 = weights.reduce((a, b) => a + b, 0);
    weights = weights.map((w) => w / sum0);

    for (let i = 0; i < points; i++) {
      const t = new Date(start.getTime() + (totalMs * i) / (points - 1));
      weights = weights.map((w) => Math.max(0.02, w + (rng() - 0.48) * 0.055));
      const sum = weights.reduce((a, b) => a + b, 0);
      weights = weights.map((w) => w / sum);

      q.options!.forEach((_, idx) => {
        probabilityHistory.push({
          id: `${q.id}-ph-${idx}-${i}`,
          outcomeId: `${q.id}-opt-${idx}`,
          probability: Number(weights[idx].toFixed(3)),
          timestamp: t.toISOString(),
          source: idx === 0 && i % 3 === 0 ? "human-risk" : "agent-ensemble",
          updateTrigger: pickTrigger(rng),
          rationaleId: `${q.id}-r-${idx}-${i}`,
        });
      });
    }

    q.options!.forEach((label, idx) => {
      outcomes.push({
        id: `${q.id}-opt-${idx}`,
        questionId: q.id,
        label,
        currentProbability: Number(weights[idx].toFixed(3)),
        isResolved: false,
      });
    });
    return;
  }

  let p = q.initial;
  for (let i = 0; i < points; i++) {
    const t = new Date(start.getTime() + (totalMs * i) / (points - 1));
    const drift = (rng() - 0.48) * 0.07;
    p = Math.min(0.97, Math.max(0.03, p + drift));
    probabilityHistory.push({
      id: `${q.id}-ph-${i}`,
      outcomeId: `${q.id}-yes`,
      probability: Number(p.toFixed(3)),
      timestamp: t.toISOString(),
      source: i % 3 === 0 ? "human-risk" : "agent-ensemble",
      updateTrigger: pickTrigger(rng),
      rationaleId: `${q.id}-r-${i}`,
    });
  }
  outcomes.push({
    id: `${q.id}-yes`,
    questionId: q.id,
    label: q.type === "scalar" ? "Above consensus" : "Yes",
    currentProbability: Number(p.toFixed(3)),
    isResolved: false,
  });
  if (q.type === "binary") {
    outcomes.push({
      id: `${q.id}-no`,
      questionId: q.id,
      label: "No",
      currentProbability: Number((1 - p).toFixed(3)),
      isResolved: false,
    });
  }
});

// --- Access grants for private questions ---
export const accessGrants: AccessGrant[] = [
  { questionId: "q-cyber-breach", role: "risk_manager" },
  { questionId: "q-cyber-breach", role: "executive" },
  { questionId: "q-cyber-ransomware", role: "risk_manager" },
  { questionId: "q-cyber-ransomware", role: "executive" },
  { questionId: "q-cyber-vendor", role: "risk_manager" },
  { questionId: "q-cyber-vendor", role: "executive" },
  { questionId: "q-cyber-compliance", role: "risk_manager" },
  { questionId: "q-cyber-compliance", role: "executive" },
  { questionId: "q-attrition", role: "executive" },
  { questionId: "q-opex", role: "executive" },
  { questionId: "q-mna", role: "executive" },
  { questionId: "q-mna", role: "risk_manager" },
  // analyst gets one explicit grant to demo user-level access:
  { questionId: "q-attrition", userId: "u-analyst" },
];

// --- Resolved questions (a few) for the postmortem/resolution surface ---
export const resolutions: Resolution[] = [
  {
    id: "res-1", questionId: "q-past-audit", resolvedValue: 1, brierContribution: 0.04,
    errorType: "underreaction", lessonsLearned: "Underweighted regulator's prior enforcement pattern; raise base rate for repeat audits.",
    resolvedAt: "2026-05-30",
  },
  {
    id: "res-2", questionId: "q-past-outage", resolvedValue: 0, brierContribution: 0.09,
    errorType: "overreaction", lessonsLearned: "Overreacted to a single noisy incident signal; require 2 corroborating signals before sharp moves.",
    resolvedAt: "2026-06-10",
  },
];

// --- Synthetic resolved forecast set for calibration / reliability diagram ---
// (Public questions only — private lines never enter shared calibration.)
function buildCalibrationData(): { p: number; outcome: 0 | 1 }[] {
  const rng = seeded("calibration");
  const data: { p: number; outcome: 0 | 1 }[] = [];
  for (let i = 0; i < 240; i++) {
    const p = Number((0.02 + rng() * 0.96).toFixed(3));
    // Slightly overconfident model: true frequency pulled toward 0.5.
    const trueP = p * 0.88 + 0.06;
    const outcome: 0 | 1 = rng() < trueP ? 1 : 0;
    data.push({ p, outcome });
  }
  return data;
}

export const calibrationData = buildCalibrationData();
export const calibrationCurve: CalibrationBin[] = calibrationBins(calibrationData, 10);

// Brier-over-time series for the accuracy page.
export const brierOverTime = (() => {
  const rng = seeded("brier-time");
  const out: { date: string; brier: number }[] = [];
  let b = 0.21;
  for (let i = 0; i < 12; i++) {
    b = Math.max(0.08, b - 0.006 + (rng() - 0.5) * 0.02);
    const d = new Date("2025-07-01");
    d.setMonth(d.getMonth() + i);
    out.push({ date: d.toISOString().slice(0, 7), brier: Number(b.toFixed(3)) });
  }
  return out;
})();

/** Seed team comments shown on question detail pages. */
export const seedComments = [
  {
    id: "cmt-q-regulation-1",
    questionId: "q-regulation",
    authorId: "u-analyst",
    authorName: "K. Sato (Analyst)",
    authorTeam: "Strategy",
    body: "The latest trade-policy signals moved this up — worth watching the next Commerce Dept readout.",
    createdAt: "2026-06-28T14:22:00.000Z",
  },
  {
    id: "cmt-q-regulation-2",
    questionId: "q-regulation",
    authorId: "u-exec",
    authorName: "D. Alvarez (CFO)",
    authorTeam: "Executive",
    body: "If this crosses 60% we should revisit the hedging plan we discussed in Q1.",
    createdAt: "2026-07-01T09:15:00.000Z",
  },
  {
    id: "cmt-q-regulation-2-reply",
    questionId: "q-regulation",
    parentId: "cmt-q-regulation-2",
    authorId: "u-analyst",
    authorName: "K. Sato (Analyst)",
    authorTeam: "Strategy",
    body: "Agreed — I'll pull the latest vendor exposure numbers before our Tuesday staff meeting.",
    createdAt: "2026-07-01T11:02:00.000Z",
  },
  {
    id: "cmt-q-cyber-1",
    questionId: "q-cyber-breach",
    authorId: "u-risk",
    authorName: "R. Mensah (Risk Manager)",
    authorTeam: "Risk",
    body: "Red-team agent is pulling this down but our internal audit findings aren't reflected yet — expect a refresh after the pen test report lands.",
    createdAt: "2026-07-02T16:40:00.000Z",
  },
];
