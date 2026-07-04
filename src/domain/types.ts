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
  | "Macro";

export type QuestionType = "binary" | "categorical" | "scalar";
export type RiskOrOpportunity = "risk" | "opportunity";
export type Visibility = "public" | "team" | "leadership" | "restricted";
export type QuestionStatus = "open" | "resolved" | "void";

export type ImpactLevel = "low" | "medium" | "high" | "critical";

export interface Organization {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  team: string;
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

export interface EvidenceSource {
  id: string;
  title: string;
  url?: string;
  sourceClass: SourceClass;
  ideologyTag?: string;
  geographyTag?: string;
  methodTag?: string;
  credibilityScore: number; // 0..1
  retrievedAt: string; // ISO
  /** Whether this source was deliberately fetched to disconfirm the lead view. */
  disconfirming?: boolean;
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
  | "postmortem";

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
