// Outcome-driving agents: suggested runs that go DO things in the world —
// chase owners on Slack/Teams/email, file tickets, secure dated commitments,
// pull data — to make the forecasted outcome BETTER, not just better-measured.
//
// Two intents:
//   - "act":   change the outcome itself (mitigate a risk driver, accelerate an
//              opportunity). On completion the run applies a small, explicit
//              probability effect to the question and records evidence.
//   - "learn": improve the estimate (verify a signal, solicit disconfirmation).
//              On completion the run records evidence only.
//
// Everything is a deterministic simulation, matching the rest of the app: a
// launched run's entire timeline is a pure function of (run id, elapsed time),
// so a periodic re-render is the only "engine" required.

import type { EvidenceSource, ForecastObject, ForecastQuestion } from "./types";

export type GainLevel = "high" | "medium" | "low";
export type OutreachChannel = "slack" | "teams" | "email";
export type RunIntent = "act" | "learn";

export interface InterventionPerson {
  name: string;
  role: string;
  channel: OutreachChannel;
  /** Where the message lands: a Slack channel, Teams channel, or email address. */
  target: string;
}

export interface InterventionResources {
  people: InterventionPerson[];
  channels: OutreachChannel[];
  /** Documents / context items the agent may read. */
  docs: string[];
  /** Automated data pulls the agent may execute. */
  dataPulls: string[];
  /** Concrete world-actions the agent may take (file ticket, book window…). */
  tasks: string[];
  /** Budget: cap on people contacted. */
  maxPeople: number;
  /** Budget: how long the agent waits on a reply before giving up. */
  maxWaitHours: number;
}

export interface InterventionSuggestion {
  id: string;
  questionId: string;
  intent: RunIntent;
  title: string;
  /** One-line description of what the agent will actually do. */
  approach: string;
  /** What will be true in the world if the run succeeds. */
  expectedOutcome: string;
  /** The forecast gap this run addresses (driver for act, uncertainty for learn). */
  targets: string;
  estimatedGain: GainLevel;
  /** Concrete, non-fabricated framing of the expected gain. */
  gainFraming: string;
  /**
   * Signed percentage-point effect applied to the question probability when an
   * "act" run completes (negative = risk mitigated, positive = opportunity
   * accelerated). Undefined for "learn" runs.
   */
  outcomeEffectPp?: number;
  defaultResources: InterventionResources;
  estimatedDurationLabel: string;
}

export type InterventionDecisionStatus = "accepted" | "rejected";

export interface InterventionDecision {
  suggestionId: string;
  questionId: string;
  status: InterventionDecisionStatus;
  /** Optional free-text reason captured on rejection. */
  rejectReason?: string;
  decidedAt: string; // ISO
  /** Set when accepted → launched. */
  runId?: string;
}

export interface AgentRun {
  id: string;
  questionId: string;
  suggestionId: string;
  intent: RunIntent;
  title: string;
  goal: string;
  targets: string;
  expectedOutcome: string;
  outcomeEffectPp?: number;
  questionTitle: string;
  launchedAt: number; // epoch ms
  resources: InterventionResources;
  /** Set once completion side effects (evidence + outcome effect) have run. */
  completionApplied?: boolean;
}

export type RunPhase = "planning" | "running" | "waiting" | "done";
export type PlanNodeStatus = "pending" | "active" | "done" | "dead_end";
export type OutreachStatus = "sent" | "seen" | "replied" | "no_response";

export interface PlanNode {
  id: string;
  label: string;
  detail: string;
  status: PlanNodeStatus;
  kind: "goal" | "outreach" | "data" | "doc" | "task" | "synthesis";
}

export interface OutreachSnapshot {
  id: string;
  person: InterventionPerson;
  message: string;
  status: OutreachStatus;
  /** Epoch ms the message went out (undefined if not yet sent). */
  sentAt?: number;
}

export interface RunEvent {
  id: string;
  at: number; // epoch ms
  text: string;
  kind: "plan" | "outreach" | "reply" | "data" | "task" | "finding";
}

export interface RunOutcome {
  headline: string;
  detail: string;
  /** Human label for the applied forecast effect, e.g. "−3pp applied". */
  effectLabel?: string;
}

export interface RunSnapshot {
  phase: RunPhase;
  progress: number; // 0..1
  nodes: PlanNode[];
  outreach: OutreachSnapshot[];
  events: RunEvent[];
  waitingOn: OutreachSnapshot[];
  dataPullsRunning: number;
  tasksDone: number;
  tasksTotal: number;
  deadEnds: number;
  outcome?: RunOutcome;
  totalMs: number;
}

/** A suggestion joined with the user's decision and (if launched) its run. */
export interface InterventionRow {
  suggestion: InterventionSuggestion;
  decision?: InterventionDecision;
  run?: AgentRun;
}

export const RUN_PLANNING_MS = 3200;
export const RUN_TOTAL_MS = 55000;

// --- deterministic rng (same pattern as questionEvidence.ts) ---

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

const ROSTER: InterventionPerson[] = [
  { name: "Priya Natarajan", role: "Competitive Intelligence", channel: "slack", target: "#competitive-intel" },
  { name: "Marcus Webb", role: "Data Science", channel: "email", target: "m.webb@northwind.com" },
  { name: "Elena Ruiz", role: "Corporate Strategy", channel: "teams", target: "Leadership Sync" },
  { name: "Sam O'Connor", role: "Platform Engineering", channel: "slack", target: "#eng-updates" },
  { name: "Dana Whitfield", role: "Research", channel: "email", target: "d.whitfield@northwind.com" },
  { name: "Wei Chen", role: "Product Analytics", channel: "teams", target: "Product Strategy" },
];

export const CHANNEL_LABELS: Record<OutreachChannel, string> = {
  slack: "Slack",
  teams: "Microsoft Teams",
  email: "Email",
};

export const INTENT_LABELS: Record<RunIntent, string> = {
  act: "Action",
  learn: "Research",
};

function rosterPick(rng: () => number, count: number, offset = 0): InterventionPerson[] {
  const start = Math.floor(rng() * ROSTER.length);
  const out: InterventionPerson[] = [];
  for (let i = 0; i < count; i++) {
    out.push(ROSTER[(start + offset + i) % ROSTER.length]);
  }
  return out;
}

export function resourcePreview(r: InterventionResources): string {
  const parts: string[] = [];
  const byChannel = new Map<OutreachChannel, number>();
  for (const p of r.people) byChannel.set(p.channel, (byChannel.get(p.channel) ?? 0) + 1);
  for (const [channel, n] of byChannel) {
    parts.push(`${CHANNEL_LABELS[channel]}: ${n} ${n === 1 ? "person" : "people"}`);
  }
  if (r.tasks.length > 0) parts.push(`${r.tasks.length} task${r.tasks.length === 1 ? "" : "s"}`);
  if (r.dataPulls.length > 0) parts.push(`${r.dataPulls.length} data pull${r.dataPulls.length === 1 ? "" : "s"}`);
  if (r.docs.length > 0) parts.push(`${r.docs.length} doc${r.docs.length === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

export function effectLabel(pp: number): string {
  return `${pp > 0 ? "+" : "−"}${Math.abs(pp)}pp`;
}

// --- suggestion generation ---

/**
 * Derives 4 candidate runs per question — action-first. Action suggestions
 * target the forecast's own drivers ("what would make this outcome better?");
 * research suggestions target named uncertainties. Gains are framed in the
 * panel's own diagnostics, and action effects are explicit and small.
 */
export function buildInterventionSuggestions(
  question: ForecastQuestion,
  forecast: ForecastObject
): InterventionSuggestion[] {
  const rng = seeded(`${question.id}::interventions`);
  const isRisk = question.riskOrOpportunity === "risk";
  // For a risk, "up" drivers push toward the bad outcome — those are what an
  // action agent attacks. For an opportunity, action accelerates the up drivers.
  const topDriver = forecast.driversUp[0] ?? "Recent leading indicators trending toward the event";
  const uncertainties = forecast.keyUncertainties;
  const uncertaintyCount = uncertainties.length;

  const estimating = forecast.agentPanel.filter((a) => a.agent !== "synthesis" && a.agent !== "extremizer");
  const estimates = estimating.map((a) => a.estimate);
  const spreadPp = Math.max(1, Math.round((Math.max(...estimates) - Math.min(...estimates)) * 100));
  const tightenedPp = Math.max(2, Math.round(spreadPp * 0.45));

  const mitigationEffect = isRisk ? -3 : 3;
  const commitmentEffect = isRisk ? -2 : 2;
  const sign = (pp: number) => effectLabel(pp);

  const workstreamPeople = rosterPick(rng, 2);
  const commitPeople = rosterPick(rng, 2, 2);
  const sourcePerson = rosterPick(rng, 1, 3);
  const redTeamPeople = rosterPick(rng, 2, 4);

  return [
    {
      id: `${question.id}-int-workstream`,
      questionId: question.id,
      intent: "act",
      title: isRisk ? `Neutralize the top driver: shut down "${topDriver.toLowerCase()}"` : `Accelerate the top driver: "${topDriver.toLowerCase()}"`,
      approach: `The agent files the change ticket, chases the responsible owners over Slack/Teams until someone commits, and books the work into a dated window.`,
      expectedOutcome: isRisk
        ? "The leading risk driver has an owner, a ticket, and a dated remediation window."
        : "The leading tailwind has an owner, a ticket, and a dated delivery window.",
      targets: topDriver,
      estimatedGain: "high",
      gainFraming: `Removes the top ${isRisk ? "risk" : "opportunity"} driver; applies ${sign(mitigationEffect)} to the forecast on completion`,
      outcomeEffectPp: mitigationEffect,
      defaultResources: {
        people: workstreamPeople,
        channels: Array.from(new Set(workstreamPeople.map((p) => p.channel))),
        docs: [],
        dataPulls: [`${question.owningTeam} status board pull`],
        tasks: ["File change ticket", "Secure owner commitment", "Book dated work window"],
        maxPeople: 3,
        maxWaitHours: 24,
      },
      estimatedDurationLabel: "≈ 1–2 days (waits on owners)",
    },
    {
      id: `${question.id}-int-commit`,
      questionId: question.id,
      intent: "act",
      title: `Get ${question.owningTeam} to a dated, written plan`,
      approach: `The agent pushes for a concrete plan with dates — not a status update — and posts the commitment where leadership can see it.`,
      expectedOutcome: `${question.owningTeam} has published a dated plan against this line, visible to leadership.`,
      targets: forecast.updateTriggers[2] ?? `Internal ${question.owningTeam} status change or incident`,
      estimatedGain: "medium",
      gainFraming: `Converts a soft intention into a tracked commitment; applies ${sign(commitmentEffect)} on completion`,
      outcomeEffectPp: commitmentEffect,
      defaultResources: {
        people: commitPeople,
        channels: Array.from(new Set(commitPeople.map((p) => p.channel))),
        docs: [],
        dataPulls: [],
        tasks: ["Draft plan skeleton", "Get dated sign-off", "Post plan to leadership channel"],
        maxPeople: 3,
        maxWaitHours: 48,
      },
      estimatedDurationLabel: "≈ 2 days (waits on sign-off)",
    },
    {
      id: `${question.id}-int-source`,
      questionId: question.id,
      intent: "learn",
      title: `Verify the ${forecast.resolutionSource} signal directly`,
      approach: `The agent pulls the underlying ${forecast.resolutionSource} records, cross-checks them against the feed the model consumes, and confirms discrepancies with the data owner.`,
      expectedOutcome: `The model's highest-weight input is independently verified (or corrected).`,
      targets: uncertainties[0] ?? `Reliability of the ${forecast.resolutionSource} signal`,
      estimatedGain: "high",
      gainFraming: `Resolves 1 of ${uncertaintyCount} open uncertainties; could tighten agent spread from ${spreadPp}pp to ~${tightenedPp}pp`,
      defaultResources: {
        people: sourcePerson,
        channels: Array.from(new Set(sourcePerson.map((p) => p.channel))),
        docs: [`${forecast.resolutionSource} extract`],
        dataPulls: [`${forecast.resolutionSource} records query`],
        tasks: [],
        maxPeople: 2,
        maxWaitHours: 12,
      },
      estimatedDurationLabel: "≈ 2–4 hours",
    },
    {
      id: `${question.id}-int-redteam`,
      questionId: question.id,
      intent: "learn",
      title: "Solicit a deliberately disconfirming view",
      approach: `The agent reaches out to two people outside ${question.owningTeam} for the strongest case against the lead view, to guard against one-sided evidence gathering.`,
      expectedOutcome: "The strongest counter-case is on the record before the next forecast lock.",
      targets: uncertainties[1] ?? "Possible regime change before resolution date",
      estimatedGain: "low",
      gainFraming: "Guards the red-team estimate against anchoring on internal consensus",
      defaultResources: {
        people: redTeamPeople,
        channels: Array.from(new Set(redTeamPeople.map((p) => p.channel))),
        docs: [],
        dataPulls: [],
        tasks: [],
        maxPeople: 3,
        maxWaitHours: 48,
      },
      estimatedDurationLabel: "≈ 1–2 days (waits on replies)",
    },
  ];
}

// --- run simulation ---

export function createAgentRun(
  suggestion: InterventionSuggestion,
  question: ForecastQuestion,
  resources: InterventionResources,
  launchedAt: number
): AgentRun {
  return {
    id: `run-${suggestion.id}-${launchedAt}`,
    questionId: question.id,
    suggestionId: suggestion.id,
    intent: suggestion.intent,
    title: suggestion.title,
    goal: suggestion.intent === "act" ? `Deliver: ${suggestion.expectedOutcome}` : `Narrow: ${suggestion.targets}`,
    targets: suggestion.targets,
    expectedOutcome: suggestion.expectedOutcome,
    outcomeEffectPp: suggestion.outcomeEffectPp,
    questionTitle: question.title,
    launchedAt,
    resources,
  };
}

function outreachMessage(run: AgentRun, person: InterventionPerson): string {
  const first = person.name.split(" ")[0];
  if (run.intent === "act") {
    return `Hi ${first} — I'm coordinating action on the forecast "${run.questionTitle}". We need: ${run.expectedOutcome} Can you own your part this week, or point me at who can? I'll handle the tickets and follow-ups. (Delivery agent, on behalf of the forecast owners.)`;
  }
  return `Hi ${first} — the forecast "${run.questionTitle}" is flagging "${run.targets}". Could you share your current read this week? I'll fold it into the next refresh. (Research agent, on behalf of the forecast owners.)`;
}

interface OutreachTimeline {
  person: InterventionPerson;
  message: string;
  sentAt: number; // offsets from launch, ms
  seenAt: number;
  repliedAt?: number;
  noResponseAt?: number;
}

interface TaskTimeline {
  label: string;
  /** Rendered label including any generated ticket reference. */
  display: string;
  startAt: number;
  doneAt: number;
}

interface DataPullTimeline {
  label: string;
  startAt: number;
  doneAt: number;
  rows: number;
}

interface RunTimeline {
  outreach: OutreachTimeline[];
  tasks: TaskTimeline[];
  dataPulls: DataPullTimeline[];
  docReads: { label: string; at: number }[];
  synthesisStart: number;
  synthesisDone: number;
  totalMs: number;
}

function buildTimeline(run: AgentRun): RunTimeline {
  const rng = seeded(`${run.id}::timeline`);
  const people = run.resources.people.slice(0, run.resources.maxPeople);

  const outreach: OutreachTimeline[] = people.map((person, i) => {
    const sentAt = RUN_PLANNING_MS + 800 + i * 2200;
    const seenAt = sentAt + 4000 + Math.floor(rng() * 9000);
    // With 2+ people, the last contact never replies — demonstrating the
    // "waiting on someone" → no-response → dead-end path of the monitor.
    const replies = people.length === 1 || i < people.length - 1;
    return {
      person,
      message: outreachMessage(run, person),
      sentAt,
      seenAt,
      repliedAt: replies ? Math.min(seenAt + 7000 + Math.floor(rng() * 14000), 38000) : undefined,
      noResponseAt: replies ? undefined : 45000,
    };
  });

  const tasks: TaskTimeline[] = run.resources.tasks.map((label, i) => {
    const startAt = RUN_PLANNING_MS + 5000 + i * 7000;
    const ticket = /ticket/i.test(label) ? ` (CHG-${1000 + Math.floor(rng() * 9000)})` : "";
    return {
      label,
      display: `${label}${ticket}`,
      startAt,
      doneAt: Math.min(startAt + 5000 + Math.floor(rng() * 5000), 43000),
    };
  });

  const dataPulls: DataPullTimeline[] = run.resources.dataPulls.map((label, j) => {
    const startAt = RUN_PLANNING_MS + 1500 + j * 1200;
    return {
      label,
      startAt,
      doneAt: startAt + 8000 + Math.floor(rng() * 6000),
      rows: 3 + Math.floor(rng() * 40),
    };
  });

  const docReads = run.resources.docs.map((label, k) => ({
    label,
    at: RUN_PLANNING_MS + 6000 + k * 3000,
  }));

  return {
    outreach,
    tasks,
    dataPulls,
    docReads,
    synthesisStart: 45000,
    synthesisDone: 53000,
    totalMs: RUN_TOTAL_MS,
  };
}

export function runOutcome(run: AgentRun): RunOutcome {
  const rng = seeded(`${run.id}::outcome`);
  const timeline = buildTimeline(run);
  const replied = timeline.outreach.filter((o) => o.repliedAt !== undefined).length;
  const tasksDone = timeline.tasks.length;
  const pulls = timeline.dataPulls.length;

  if (run.intent === "act") {
    const parts: string[] = [];
    if (tasksDone > 0) parts.push(`${tasksDone} task${tasksDone === 1 ? "" : "s"} executed`);
    if (replied > 0) parts.push(`${replied} commitment${replied === 1 ? "" : "s"} secured`);
    if (pulls > 0) parts.push(`${pulls} data pull${pulls === 1 ? "" : "s"} completed`);
    const label = run.outcomeEffectPp !== undefined ? effectLabel(run.outcomeEffectPp) : undefined;
    return {
      headline: `Delivered: ${run.expectedOutcome}`,
      detail: `${parts.join(", ")}. ${label ? `Forecast effect ${label} applied and recorded in the history.` : ""} Finding recorded as evidence.`,
      effectLabel: label ? `${label} applied` : undefined,
    };
  }

  const parts: string[] = [];
  if (replied > 0) parts.push(`${replied} first-hand read${replied === 1 ? "" : "s"} collected`);
  if (pulls > 0) parts.push(`${pulls} data pull${pulls === 1 ? "" : "s"} completed`);
  const lean = rng() < 0.5 ? "slightly stronger than" : "roughly consistent with";
  return {
    headline: `Uncertainty narrowed: ${run.targets}`,
    detail: `${parts.join(", ")}. The field read is ${lean} the model's inside view; finding recorded as evidence for the next refresh.`,
  };
}

/** Computes the full monitor state for a run as a pure function of wall-clock time. */
export function snapshotRun(run: AgentRun, nowMs: number): RunSnapshot {
  const t = buildTimeline(run);
  const elapsed = Math.max(0, nowMs - run.launchedAt);
  const events: RunEvent[] = [];
  const abs = (offset: number) => run.launchedAt + offset;

  const branchCount = t.outreach.length + t.tasks.length + t.dataPulls.length + t.docReads.length;

  if (elapsed >= RUN_PLANNING_MS) {
    events.push({
      id: "ev-plan",
      at: abs(RUN_PLANNING_MS),
      text:
        run.intent === "act"
          ? `Planned ${branchCount} workstreams toward: ${run.expectedOutcome}`
          : `Planned ${branchCount} approaches toward: ${run.targets}`,
      kind: "plan",
    });
  }

  const outreach: OutreachSnapshot[] = t.outreach.map((o, i) => {
    let status: OutreachStatus = "sent";
    if (o.repliedAt !== undefined && elapsed >= o.repliedAt) status = "replied";
    else if (o.noResponseAt !== undefined && elapsed >= o.noResponseAt) status = "no_response";
    else if (elapsed >= o.seenAt) status = "seen";
    const sent = elapsed >= o.sentAt;
    if (sent) {
      events.push({
        id: `ev-out-${i}`,
        at: abs(o.sentAt),
        text: `Sent ${CHANNEL_LABELS[o.person.channel]} message to ${o.person.name} (${o.person.target})`,
        kind: "outreach",
      });
    }
    if (o.repliedAt !== undefined && elapsed >= o.repliedAt) {
      events.push({
        id: `ev-rep-${i}`,
        at: abs(o.repliedAt),
        text:
          run.intent === "act"
            ? `${o.person.name} replied — commitment secured`
            : `${o.person.name} replied — folding into findings`,
        kind: "reply",
      });
    }
    if (o.noResponseAt !== undefined && elapsed >= o.noResponseAt) {
      events.push({
        id: `ev-nor-${i}`,
        at: abs(o.noResponseAt),
        text: `No response from ${o.person.name} within the wait budget — branch closed`,
        kind: "reply",
      });
    }
    return {
      id: `out-${i}`,
      person: o.person,
      message: o.message,
      status: sent ? status : "sent",
      sentAt: sent ? abs(o.sentAt) : undefined,
    };
  });

  for (const [i, task] of t.tasks.entries()) {
    if (elapsed >= task.startAt) {
      events.push({ id: `ev-tk-${i}`, at: abs(task.startAt), text: `Task started: ${task.display}`, kind: "task" });
    }
    if (elapsed >= task.doneAt) {
      events.push({ id: `ev-tkd-${i}`, at: abs(task.doneAt), text: `Task completed: ${task.display}`, kind: "task" });
    }
  }

  for (const [j, d] of t.dataPulls.entries()) {
    if (elapsed >= d.startAt) {
      events.push({ id: `ev-dp-${j}`, at: abs(d.startAt), text: `Started data pull: ${d.label}`, kind: "data" });
    }
    if (elapsed >= d.doneAt) {
      events.push({
        id: `ev-dpd-${j}`,
        at: abs(d.doneAt),
        text: `${d.label} returned ${d.rows} rows`,
        kind: "data",
      });
    }
  }

  for (const [k, doc] of t.docReads.entries()) {
    if (elapsed >= doc.at) {
      events.push({ id: `ev-doc-${k}`, at: abs(doc.at), text: `Reviewed document: ${doc.label}`, kind: "data" });
    }
  }

  const done = elapsed >= t.totalMs;
  const outcome = done || elapsed >= t.synthesisDone ? runOutcome(run) : undefined;
  if (elapsed >= t.synthesisStart) {
    events.push({
      id: "ev-syn",
      at: abs(t.synthesisStart),
      text: run.intent === "act" ? "Consolidating commitments and tickets" : "Synthesizing findings across branches",
      kind: "plan",
    });
  }
  if (outcome) {
    events.push({ id: "ev-fin", at: abs(t.synthesisDone), text: outcome.detail, kind: "finding" });
  }

  events.sort((a, b) => b.at - a.at);

  // --- plan graph nodes ---
  const nodes: PlanNode[] = [
    {
      id: "goal",
      label: run.goal,
      detail: run.title,
      kind: "goal",
      status: done ? "done" : elapsed >= RUN_PLANNING_MS ? "active" : "pending",
    },
  ];
  for (const [i, o] of t.outreach.entries()) {
    const first = o.person.name.split(" ")[0];
    let status: PlanNodeStatus = "pending";
    if (o.repliedAt !== undefined && elapsed >= o.repliedAt) status = "done";
    else if (o.noResponseAt !== undefined && elapsed >= o.noResponseAt) status = "dead_end";
    else if (elapsed >= o.sentAt) status = "active";
    nodes.push({
      id: `n-out-${i}`,
      label: run.intent === "act" ? `Chase ${first} via ${CHANNEL_LABELS[o.person.channel]}` : `Ask ${first} via ${CHANNEL_LABELS[o.person.channel]}`,
      detail: o.person.role,
      kind: "outreach",
      status,
    });
  }
  for (const [i, task] of t.tasks.entries()) {
    nodes.push({
      id: `n-tk-${i}`,
      label: task.label,
      detail: "Agent task",
      kind: "task",
      status: elapsed >= task.doneAt ? "done" : elapsed >= task.startAt ? "active" : "pending",
    });
  }
  for (const [j, d] of t.dataPulls.entries()) {
    nodes.push({
      id: `n-dp-${j}`,
      label: d.label,
      detail: "Automated data pull",
      kind: "data",
      status: elapsed >= d.doneAt ? "done" : elapsed >= d.startAt ? "active" : "pending",
    });
  }
  for (const [k, doc] of t.docReads.entries()) {
    nodes.push({
      id: `n-doc-${k}`,
      label: doc.label,
      detail: "Document review",
      kind: "doc",
      status: elapsed >= doc.at ? "done" : "pending",
    });
  }
  nodes.push({
    id: "n-syn",
    label: run.intent === "act" ? "Confirm delivery" : "Synthesize findings",
    detail: run.intent === "act" ? "Verify commitments landed" : "Pool branch results into a finding",
    kind: "synthesis",
    status: elapsed >= t.synthesisDone ? "done" : elapsed >= t.synthesisStart ? "active" : "pending",
  });

  const waitingOn = outreach.filter((o) => o.status === "sent" || o.status === "seen");
  const dataPullsRunning = t.dataPulls.filter((d) => elapsed >= d.startAt && elapsed < d.doneAt).length;
  const tasksDone = t.tasks.filter((task) => elapsed >= task.doneAt).length;
  const deadEnds = nodes.filter((n) => n.status === "dead_end").length;

  let phase: RunPhase;
  if (elapsed < RUN_PLANNING_MS) phase = "planning";
  else if (done) phase = "done";
  else if (waitingOn.length > 0 && dataPullsRunning === 0 && tasksDone === t.tasks.length && elapsed < t.synthesisStart)
    phase = "waiting";
  else phase = "running";

  return {
    phase,
    progress: Math.min(1, elapsed / t.totalMs),
    nodes,
    outreach,
    events,
    waitingOn,
    dataPullsRunning,
    tasksDone,
    tasksTotal: t.tasks.length,
    deadEnds,
    outcome,
    totalMs: t.totalMs,
  };
}

export function runIsComplete(run: AgentRun, nowMs: number): boolean {
  return nowMs - run.launchedAt >= RUN_TOTAL_MS;
}

/** Evidence row appended to the question once a run completes. */
export function runEvidenceRow(run: AgentRun): EvidenceSource {
  const outcome = runOutcome(run);
  const completedAt = new Date(run.launchedAt + RUN_TOTAL_MS).toISOString();
  return {
    id: `${run.questionId}-run-${run.id}`,
    kind: "feed",
    title: `Agent run: ${run.title}`,
    sourceClass: "org_internal",
    methodTag: "agent-run",
    credibilityScore: 0.82,
    retrievedAt: completedAt.slice(0, 10),
    lastRefreshedAt: completedAt,
    relevance: "high",
    refreshFrequency: "default",
    indicates: `${outcome.headline}. ${outcome.detail}`,
  };
}
