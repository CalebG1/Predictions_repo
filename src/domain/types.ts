// Core domain model for the Organizational Risk & Opportunity Forecasting Dashboard.
// These types deliberately mirror a server-side schema so they can be lifted into
// a backend (with migrations) without reshaping.

export type Role = "risk_manager" | "executive" | "analyst" | "admin";

export type Category =
  | "Financial"
  | "Operational"
  | "Geopolitical"
  | "Regulatory"
  | "Talent"
  | "Security/Cyber"
  | "Supply Chain"
  | "Product"
  | "Reputational"
  | "Macro"
  | "Real Estate";

export type QuestionType = "binary" | "categorical" | "scalar";
export type RiskOrOpportunity = "risk" | "opportunity";
export type Visibility = "public" | "team" | "leadership" | "restricted";
export type QuestionStatus = "open" | "resolved" | "void";

export type ImpactLevel = "low" | "medium" | "high" | "critical";

/** Model confidence in a forecast or an alert's forecast impact (distinct from event probability). */
export type Confidence = "high" | "medium" | "low";

/**
 * Real-world data sources that can feed a forecast (interviews, apps, polls).
 * `upload` = files imported directly; `custom` = any connector from the gallery
 * that doesn't have a dedicated brand icon (rendered as a monogram chip).
 */
export type TouchpointKind =
  | "interview"
  | "teams"
  | "excel"
  | "slack"
  | "survey"
  | "upload"
  | "custom";

/** An active signal from a connected touchpoint with relevant information. */
export interface TouchpointSignal {
  kind: TouchpointKind;
  summary: string;
  updatedAt: string;
  /** For `custom` connectors: stable identity used for de-duplication. */
  sourceId?: string;
  /** Display label override (used by `custom` connectors and uploads). */
  label?: string;
  /** Brand color override for the monogram chip (used by `custom` connectors). */
  brandColor?: string;
}

export interface Organization {
  id: string;
  name: string;
}

export type SsoProvider = "okta" | "azure_ad" | "google";

export interface User {
  id: string;
  name: string;
  role: Role;
  team: string;
  teams?: string[];
  department?: string;
  email?: string;
  title?: string;
  phone?: string;
  location?: string;
  timezone?: string;
  locale?: string;
  joinedAt?: string;
  lastLoginAt?: string;
  mfaEnabled?: boolean;
  ssoProvider?: SsoProvider;
  managerId?: string;
}

export type EmailDigest = "daily" | "weekly" | "none";

export interface UserPreferences {
  emailDigest: EmailDigest;
  probabilityAlerts: boolean;
  commentMentions: boolean;
  contextApprovalRequests: boolean;
  weeklySummary: boolean;
  productUpdates: boolean;
  defaultVisibility: Visibility;
  expertiseDomains: Category[];
}

export interface ConnectedIntegration {
  id: string;
  name: string;
  description: string;
  status: "connected" | "available" | "pending";
  connectedAt?: string;
}

export type TeamJoinRequestStatus = "pending" | "approved" | "rejected";

export interface TeamJoinRequest {
  id: string;
  userId: string;
  team: string;
  status: TeamJoinRequestStatus;
  requestedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

/** A precisely-worded, resolvable risk or opportunity event. (was: Market) */
export interface ForecastQuestion {
  id: string;
  title: string;
  preciseDefinition: string;
  category: Category;
  type: QuestionType;
  riskOrOpportunity: RiskOrOpportunity;
  /** Operationalized magnitude if it resolves true. */
  impactEstimate: string;
  impactLevel: ImpactLevel;
  /** 0..1 normalized magnitude used for risk-weighting / heatmap. */
  impactScore: number;
  resolutionCriteria: string;
  resolutionSource: string;
  openDate: string; // ISO
  resolutionDate: string; // ISO
  status: QuestionStatus;
  visibility: Visibility;
  owningTeam: string;
  createdBy: string;
  /** For scalar questions: unit + quantile band. */
  scalarUnit?: string;
  /** Base rate / outside view anchor. */
  priorBaseRate: number;
}

/** Yes/No for binary; mutually-exclusive buckets for categorical. (was: Contract/Outcome) */
export interface Outcome {
  id: string;
  questionId: string;
  label: string;
  currentProbability: number; // 0..1
  isResolved: boolean;
  resolvedValue?: number; // 1 if occurred, 0 if not (binary) — observed outcome
}

/** Time series of the probability with timestamps + reason for each change. (was: Price history) */
export interface ProbabilityPoint {
  id: string;
  outcomeId: string;
  probability: number;
  timestamp: string; // ISO
  source: string; // agentId or userId
  updateTrigger: string;
  rationaleId?: string;
}

/** An agent or human moving the probability, with rationale + evidence. (was: Trade) */
export interface ForecastUpdate {
  id: string;
  outcomeId: string;
  priorProbability: number;
  newProbability: number;
  whatChanged: string;
  evidence: string[]; // evidence source ids / links
  agentOrUser: string;
  createdAt: string; // ISO
  /** Immutable once the question is locked for resolution. */
  locked?: boolean;
}

/** An AI agent profile or a human contributor with track record + calibration. (was: Trader) */
export interface Forecaster {
  id: string;
  name: string;
  kind: "agent" | "human";
  domainTags: Category[];
  brierScore: number; // lower is better
  /** predicted->observed pairs powering the reliability diagram. */
  calibrationCurve: CalibrationBin[];
  trackRecordSummary: string;
}

export type SourceClass =
  | "central_bank"
  | "gov_stats"
  | "market_data"
  | "nowcasting"
  | "corporate_demand"
  | "fast_feed"
  | "org_internal";

/** Manually-set read on how relevant a piece of evidence is to the question at hand. */
export type EvidenceRelevance = "low" | "medium" | "high";

/** How often a source should be automatically re-polled. "default" follows the org's inferred cadence for that source type. */
export type EvidenceRefreshFrequency = "default" | "hourly" | "daily" | "weekly" | "monthly";

/** Rich evidence row kinds shown in the question evidence table and detail drawer. */
export type EvidenceRowKind = "feed" | "app_message" | "analysis" | "website" | "prediction";

export interface EvidenceAppPayload {
  app: "teams" | "slack";
  channel: string;
  author: string;
  authorRole: string;
  message: string;
}

export interface EvidenceAnalysisPayload {
  narrative: string;
  language: string;
  code: string;
  output: string;
}

export interface EvidenceWebsitePayload {
  domain: string;
  url: string;
  publisher: string;
  headline: string;
  snippet: string;
}

export interface EvidencePredictionPayload {
  agent: string;
  probability: number;
  summary: string;
}

export interface EvidenceSource {
  id: string;
  title: string;
  url?: string;
  sourceClass: SourceClass;
  ideologyTag?: string;
  geographyTag?: string;
  methodTag?: string;
  credibilityScore: number; // 0..1
  retrievedAt: string; // ISO — when this source was first published/retrieved
  /** Whether this source was deliberately fetched to disconfirm the lead view. */
  disconfirming?: boolean;
  /** Manually-set relevance to the forecast; defaults to "medium" when unset. */
  relevance?: EvidenceRelevance;
  /** Automatic re-poll cadence; defaults to "default". */
  refreshFrequency?: EvidenceRefreshFrequency;
  /** Last time this row was refreshed (manually or on schedule), ISO timestamp. */
  lastRefreshedAt?: string;
  /** Rich row type; traditional catalog sources omit this (treated as "feed"). */
  kind?: EvidenceRowKind;
  /** Plain-language read on what this evidence indicates for the forecast. */
  indicates?: string;
  app?: EvidenceAppPayload;
  analysis?: EvidenceAnalysisPayload;
  website?: EvidenceWebsitePayload;
  prediction?: EvidencePredictionPayload;
}

export type ErrorType =
  | "bad_base_rate"
  | "missed_update"
  | "overreaction"
  | "underreaction"
  | "incoherent_probability"
  | "bias"
  | "unforeseeable_shock";

export interface Resolution {
  id: string;
  questionId: string;
  resolvedValue: number; // observed outcome for the "Yes"/primary outcome
  brierContribution: number;
  errorType?: ErrorType;
  lessonsLearned: string;
  resolvedAt: string; // ISO
}

/** Grants a user/role access to a private question's lines. */
export interface AccessGrant {
  questionId: string;
  // Grant by explicit user id OR by role.
  userId?: string;
  role?: Role;
}

// --- Forecasting engine artifacts ---

export type AgentRole =
  | "question-framer"
  | "triage"
  | "base-rate"
  | "inside-view"
  | "data-retrieval"
  | "source-diversity"
  | "market-crowd"
  | "red-team"
  | "scope-sensitivity"
  | "bayesian-updater"
  | "probability-coherence"
  | "calibration"
  | "synthesis"
  | "extremizer"
  | "postmortem"
  // Real-estate site selection roles:
  | "trade-area"
  | "demographics"
  | "competition"
  | "regulatory";

export interface AgentEstimate {
  agent: AgentRole;
  /** Independent estimate recorded BEFORE seeing peers (anti-anchoring). */
  estimate: number;
  rationale: string;
  rationaleRef?: string;
  /** Self-weight used in log-odds synthesis. */
  weight: number;
}

/** Standard forecast object emitted per question per run (Appendix A). */
export interface ForecastObject {
  questionId: string;
  question: string;
  resolutionCriteria: string;
  resolutionDate: string;
  resolutionSource: string;
  type: QuestionType;
  riskOrOpportunity: RiskOrOpportunity;
  impact: string;
  currentProbability: number;
  priorBaseRate: number;
  outsideView: string;
  insideView: string;
  driversUp: string[];
  driversDown: string[];
  keyUncertainties: string[];
  updateTriggers: string[];
  alternativeScenarios: string[];
  horizonSensitivity: Record<string, number>; // e.g. {"3m":0.41,...}
  confidenceInEstimateQuality: number; // 0..1 — distinct from event probability
  agentPanel: AgentEstimate[];
  nextReviewDate: string;
  scoringPlan: string;
}

// --- Eval artifacts ---

export interface CalibrationBin {
  bucket: number; // bucket midpoint, e.g. 0.05, 0.15, ...
  predictedMean: number;
  observedFrequency: number;
  count: number;
}

export interface BaselineComparison {
  noChange: number;
  baseRate: number;
  recentTrend: number;
  externalMarket?: number;
  model: number;
}

/** Team comment on a forecast question (discussion, not Q&A). */
export interface QuestionComment {
  id: string;
  questionId: string;
  authorId: string;
  authorName: string;
  authorTeam: string;
  body: string;
  createdAt: string; // ISO
  /** Set when this comment is a reply to a top-level comment. */
  parentId?: string;
  /** Set when the author edits the comment after posting. */
  editedAt?: string;
}

/** A message in the per-question Q&A assistant (user question or assistant reply). */
export interface QaMessage {
  id: string;
  questionId: string;
  role: "user" | "assistant";
  body: string;
  createdAt: string; // ISO
}

/** User-defined alert when a probability crosses a threshold (stock-style price alert). */
export interface ProbabilityAlert {
  id: string;
  questionId: string;
  outcomeId: string;
  direction: "above" | "below";
  /** 0..1 — alert fires when probability crosses this boundary. */
  threshold: number;
  createdAt: string;
  /** Set when the threshold is crossed; alert stays listed until deleted. */
  triggeredAt?: string;
  triggeredProbability?: number;
  read: boolean;
}

// --- Context registry (org-wide library + per-forecast bindings) ---

export type ContextItemType = "connector" | "document" | "manual" | "evidence" | "instruction" | "analysis";
export type ContextItemStatus = "active" | "pending_approval" | "archived" | "error";

/** A single cell in a hosted-notebook "Add analysis" context item. */
export interface NotebookCell {
  id: string;
  kind: "code" | "markdown";
  source: string;
  output?: string;
  error?: string;
  status: "idle" | "running" | "success" | "error";
  durationMs?: number;
}

export interface ContextItem {
  id: string;
  type: ContextItemType;
  title: string;
  description?: string;
  visibility: Visibility;
  owningTeam: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status: ContextItemStatus;
  tags?: string[];
  /** Refs CONNECTORS catalog id. */
  connectorId?: string;
  /** Mock sync metadata for connector items. */
  lastSyncAt?: string;
  syncSummary?: string;
  fileNames?: string[];
  body?: string;
  evidenceClass?: SourceClass;
  /** For evidence-type items: link to EvidenceSource fields. */
  evidenceUrl?: string;
  credibilityScore?: number;
  /** For analysis-type items: the notebook cells (code + rendered output) that produced the finding. */
  notebookCells?: NotebookCell[];
  /** For analysis-type items: label for the sandboxed runtime the notebook ran in. */
  runtime?: string;
}

export interface ContextBinding {
  id: string;
  questionId: string;
  contextItemId: string;
  attachedBy: string;
  attachedAt: string;
  notes?: string;
}

export interface ContextRevision {
  id: string;
  contextItemId: string;
  version: number;
  body: string;
  changedBy: string;
  changedAt: string;
  changeSummary: string;
}

export type ContextAuditAction =
  | "create"
  | "update"
  | "archive"
  | "bind"
  | "unbind"
  | "approve"
  | "reject";

export interface ContextAuditEntry {
  id: string;
  actorId: string;
  action: ContextAuditAction;
  resourceType: "context_item" | "binding" | "revision";
  resourceId: string;
  timestamp: string;
  detail: string;
}

/** Structured payload assembled for LLM injection. */
export interface ModelContextBundle {
  questionId: string;
  instructions: string[];
  documents: { title: string; summary: string }[];
  connectors: { name: string; lastSync: string; summary: string }[];
  evidence: EvidenceSource[];
  manualNotes: string[];
  assembledAt: string;
}

export interface CreateContextItemInput {
  type: ContextItemType;
  title: string;
  description?: string;
  visibility?: Visibility;
  owningTeam?: string;
  tags?: string[];
  connectorId?: string;
  fileNames?: string[];
  body?: string;
  evidenceClass?: SourceClass;
  evidenceUrl?: string;
  credibilityScore?: number;
  notebookCells?: NotebookCell[];
  runtime?: string;
}
