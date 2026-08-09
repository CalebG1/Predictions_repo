import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChannelIcon } from "../components/InterventionsPanel";
import {
  CHANNEL_LABELS,
  RUN_TOTAL_MS,
  snapshotRun,
  type OutreachSnapshot,
  type PlanNode,
  type RunEvent,
} from "../domain/interventions";
import { useStore } from "../store";

const NODE_W = 200;
const NODE_H = 54;
const V_GAP = 16;
const COL_GAP = 72;
const PAD = 12;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function PlanGraph({ nodes }: { nodes: PlanNode[] }) {
  const goal = nodes.find((n) => n.kind === "goal");
  const synthesis = nodes.find((n) => n.kind === "synthesis");
  const branches = nodes.filter((n) => n.kind !== "goal" && n.kind !== "synthesis");
  if (!goal || !synthesis || branches.length === 0) return null;

  const height = Math.max(branches.length * (NODE_H + V_GAP) - V_GAP, NODE_H) + PAD * 2;
  const width = PAD * 2 + NODE_W * 3 + COL_GAP * 2;
  const centerY = height / 2;
  const colX = [PAD, PAD + NODE_W + COL_GAP, PAD + (NODE_W + COL_GAP) * 2];
  const branchY = (i: number) => PAD + i * (NODE_H + V_GAP);

  const edge = (x1: number, y1: number, x2: number, y2: number) => {
    const mx = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  };

  const renderNode = (node: PlanNode, x: number, y: number) => (
    <g key={node.id} className={`arm-node arm-node-${node.status}`}>
      <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={10} />
      <text x={x + 12} y={y + 22} className="arm-node-label">
        {truncate(node.label, 27)}
      </text>
      <text x={x + 12} y={y + 40} className="arm-node-detail">
        {truncate(node.detail, 32)}
      </text>
      {node.status === "dead_end" && (
        <text x={x + NODE_W - 16} y={y + 22} className="arm-node-flag">
          ✕
        </text>
      )}
      {node.status === "done" && (
        <text x={x + NODE_W - 18} y={y + 22} className="arm-node-flag">
          ✓
        </text>
      )}
    </g>
  );

  return (
    <svg
      className="arm-graph"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Agent plan graph: goal, approach branches, and synthesis"
    >
      {branches.map((b, i) => (
        <path
          key={`e-in-${b.id}`}
          className={`arm-edge arm-edge-${b.status}`}
          d={edge(colX[0] + NODE_W, centerY, colX[1], branchY(i) + NODE_H / 2)}
        />
      ))}
      {branches.map((b, i) => (
        <path
          key={`e-out-${b.id}`}
          className={`arm-edge arm-edge-${b.status === "dead_end" ? "dead_end" : synthesis.status}`}
          d={edge(colX[1] + NODE_W, branchY(i) + NODE_H / 2, colX[2], centerY)}
        />
      ))}
      {renderNode(goal, colX[0], centerY - NODE_H / 2)}
      {branches.map((b, i) => renderNode(b, colX[1], branchY(i)))}
      {renderNode(synthesis, colX[2], centerY - NODE_H / 2)}
    </svg>
  );
}

const OUTREACH_LABELS: Record<OutreachSnapshot["status"], string> = {
  sent: "Sent",
  seen: "Seen",
  replied: "Replied",
  no_response: "No response",
};

function waitLabel(o: OutreachSnapshot, now: number): string {
  if (!o.sentAt) return "queued";
  const secs = Math.max(0, Math.floor((now - o.sentAt) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const elapsed = m > 0 ? `${m}m ${s}s` : `${s}s`;
  if (o.status === "replied") return `replied after ${elapsed}`;
  if (o.status === "no_response") return "wait budget exhausted";
  return `waiting ${elapsed}`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
}

function eventIcon(kind: RunEvent["kind"]): string {
  switch (kind) {
    case "outreach":
      return "→";
    case "reply":
      return "←";
    case "data":
      return "⛁";
    case "finding":
      return "★";
    default:
      return "·";
  }
}

export default function AgentRunMonitor() {
  const { id, runId } = useParams();
  const { questions, getAgentRun } = useStore();

  const q = questions.find((x) => x.id === id);
  const run = runId ? getAgentRun(runId) : undefined;

  const [now, setNow] = useState(() => Date.now());
  const running = run !== undefined && Date.now() - run.launchedAt < RUN_TOTAL_MS + 1500;
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  if (!q || !run || run.questionId !== q.id) {
    return (
      <div className="dash-page">
        <div className="locked-card">
          <h2>🔒 Not available</h2>
          <p>
            This agent run is outside your visibility level, or doesn't exist. Runs inherit the visibility of
            the question they improve.
          </p>
          <Link to="/" className="btn">
            Back to overview
          </Link>
        </div>
      </div>
    );
  }

  const snap = snapshotRun(run, now);

  if (snap.phase === "planning") {
    return (
      <div className="dash-page forecast-processing">
        <div className="fp-card fp-card-minimal">
          <div className="fp-spinner" aria-hidden="true" />
          <h1 className="fp-loading-title">Planning approach</h1>
          <p className="fp-loading-sub">
            {run.intent === "act" ? (
              <>
                The agent is planning workstreams to deliver: <b>{run.expectedOutcome}</b>
              </>
            ) : (
              <>
                The agent is choosing directions for: <b>{run.targets}</b>
              </>
            )}
          </p>
          <Link to={`/q/${q.id}`} className="fp-back">
            Back to question
          </Link>
        </div>
      </div>
    );
  }

  const blockedParts: string[] = [];
  if (snap.phase === "done") blockedParts.push("Run complete");
  if (snap.waitingOn.length > 0)
    blockedParts.push(`Waiting on ${snap.waitingOn.length} ${snap.waitingOn.length === 1 ? "person" : "people"}`);
  if (snap.tasksTotal > 0 && snap.phase !== "done")
    blockedParts.push(`${snap.tasksDone}/${snap.tasksTotal} tasks done`);
  if (snap.dataPullsRunning > 0)
    blockedParts.push(`${snap.dataPullsRunning} data pull${snap.dataPullsRunning === 1 ? "" : "s"} running`);
  if (snap.deadEnds > 0) blockedParts.push(`${snap.deadEnds} branch${snap.deadEnds === 1 ? "" : "es"} dead-ended`);
  if (blockedParts.length === 0) blockedParts.push("All branches progressing");

  return (
    <div className="dash-page arm-page">
      <div className="arm-head">
        <div className="arm-head-main">
          <nav className="detail-breadcrumbs" aria-label="Run context">
            <Link to={`/q/${q.id}`}>{q.title}</Link>
            <span className="detail-crumb-sep" aria-hidden="true">
              ·
            </span>
            <span>Agent run</span>
          </nav>
          <h1 className="detail-title">{run.title}</h1>
          <p className="arm-goal">{run.goal}</p>
        </div>
        <span className={`arm-phase arm-phase-${snap.phase}`}>
          {snap.phase === "done" ? "Done" : snap.phase === "waiting" ? "Waiting" : "Running"}
        </span>
      </div>

      <div className={`arm-blocked-strip${snap.phase === "done" ? " done" : ""}`}>
        {snap.phase !== "done" && <span className="int-run-chip-dot" aria-hidden="true" />}
        {blockedParts.join(" · ")}
        <span className="arm-progress" aria-hidden="true">
          <span className="arm-progress-fill" style={{ width: `${Math.round(snap.progress * 100)}%` }} />
        </span>
      </div>

      {snap.phase === "done" && snap.outcome && (
        <div className="panel arm-finding">
          <div className="arm-finding-head">
            <h4>{snap.outcome.headline}</h4>
            {snap.outcome.effectLabel && <span className="arm-effect-chip">{snap.outcome.effectLabel}</span>}
          </div>
          <p>{snap.outcome.detail}</p>
          <Link to={`/q/${q.id}`} className="ctx-primary-btn arm-finding-link">
            View question
          </Link>
        </div>
      )}

      <div className="panel arm-graph-panel">
        <h4>Plan</h4>
        <p className="muted small">Directions the agent is pursuing — dead-ended branches stay visible.</p>
        <PlanGraph nodes={snap.nodes} />
      </div>

      <div className="arm-grid">
        <div className="panel arm-outreach-panel">
          <h4>Outreach</h4>
          <p className="muted small">Who the agent is waiting on, and through which channel.</p>
          {snap.outreach.length === 0 ? (
            <p className="muted arm-empty">This run contacts no one — automated pulls only.</p>
          ) : (
            <ul className="arm-outreach-list">
              {snap.outreach.map((o) => (
                <li key={o.id} className={`arm-outreach-row arm-outreach-${o.status}`}>
                  <span className="pc-evc-avatar" aria-hidden="true">
                    {initials(o.person.name)}
                  </span>
                  <div className="arm-outreach-main">
                    <div className="arm-outreach-who">
                      <span className="arm-outreach-name">{o.person.name}</span>
                      <span className="muted small">{o.person.role}</span>
                      <span className="arm-outreach-target">
                        <ChannelIcon channel={o.person.channel} />
                        {o.person.target} · {CHANNEL_LABELS[o.person.channel]}
                      </span>
                    </div>
                    <p className="arm-outreach-message">{o.message}</p>
                  </div>
                  <div className="arm-outreach-side">
                    <span className={`arm-outreach-chip st-${o.status}`}>{OUTREACH_LABELS[o.status]}</span>
                    <span className="muted small">{waitLabel(o, now)}</span>
                    <button
                      type="button"
                      className="int-btn-ghost arm-nudge"
                      disabled
                      title="Nudges are sent automatically when the wait budget is half spent"
                    >
                      Nudge
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel arm-feed-panel">
          <h4>Activity</h4>
          <p className="muted small">Everything the agent has done, newest first.</p>
          {snap.events.length === 0 ? (
            <p className="muted arm-empty">No activity yet.</p>
          ) : (
            <ul className="arm-feed">
              {snap.events.map((ev) => (
                <li key={ev.id} className={`arm-feed-item arm-feed-${ev.kind}`}>
                  <span className="arm-feed-icon" aria-hidden="true">
                    {eventIcon(ev.kind)}
                  </span>
                  <span className="arm-feed-text">{ev.text}</span>
                  <span className="arm-feed-time">
                    {new Date(ev.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
