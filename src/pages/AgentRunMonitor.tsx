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
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

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
    <g key={node.id}>
      <rect
        x={x}
        y={y}
        width={NODE_W}
        height={NODE_H}
        rx={10}
        fill={node.status === "dead_end" ? "#fef2f2" : node.status === "done" ? "#ecfdf5" : "#fff"}
        stroke={node.status === "dead_end" ? "#fca5a5" : "#d1d5db"}
      />
      <text x={x + 12} y={y + 22} fill="#111827" fontSize="12" fontWeight="600">
        {truncate(node.label, 27)}
      </text>
      <text x={x + 12} y={y + 40} fill="#6b7280" fontSize="10">
        {truncate(node.detail, 32)}
      </text>
      {node.status === "dead_end" && (
        <text x={x + NODE_W - 16} y={y + 22} fill="#dc2626" fontSize="14">
          ✕
        </text>
      )}
      {node.status === "done" && (
        <text x={x + NODE_W - 18} y={y + 22} fill="#059669" fontSize="14">
          ✓
        </text>
      )}
    </g>
  );

  return (
    <svg
      className="h-auto w-full"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Agent plan graph: goal, approach branches, and synthesis"
    >
      {branches.map((b, i) => (
        <path
          key={`e-in-${b.id}`}
          fill="none"
          stroke={b.status === "dead_end" ? "#fca5a5" : "#94a3b8"}
          strokeWidth="1.5"
          d={edge(colX[0] + NODE_W, centerY, colX[1], branchY(i) + NODE_H / 2)}
        />
      ))}
      {branches.map((b, i) => (
        <path
          key={`e-out-${b.id}`}
          fill="none"
          stroke={b.status === "dead_end" ? "#fca5a5" : "#94a3b8"}
          strokeWidth="1.5"
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
      <div className="mx-auto w-full max-w-[1240px] space-y-6 px-[22px] py-8">
        <Card className="mx-auto max-w-xl">
          <CardContent className="space-y-4 p-6 text-center">
            <h2 className="text-xl font-semibold">🔒 Not available</h2>
            <p className="text-sm text-muted-foreground">
              This agent run is outside your visibility level, or doesn't exist. Runs inherit the
              visibility of the question they improve.
            </p>
            <Link
              to="/"
              className="inline-flex rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              Back to overview
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const snap = snapshotRun(run, now);

  if (snap.phase === "planning") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center p-6">
        <Card className="w-full">
          <CardContent className="space-y-4 p-6 text-center">
            <div
              className="mx-auto size-8 animate-spin rounded-full border-4 border-muted border-t-primary"
              aria-hidden="true"
            />
            <h1 className="text-xl font-semibold">Planning approach</h1>
            <p className="text-sm text-muted-foreground">
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
            <Link
              to={`/q/${q.id}`}
              className="inline-flex text-sm font-medium text-primary hover:underline"
            >
              Back to question
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const blockedParts: string[] = [];
  if (snap.phase === "done") blockedParts.push("Run complete");
  if (snap.waitingOn.length > 0)
    blockedParts.push(
      `Waiting on ${snap.waitingOn.length} ${snap.waitingOn.length === 1 ? "person" : "people"}`,
    );
  if (snap.tasksTotal > 0 && snap.phase !== "done")
    blockedParts.push(`${snap.tasksDone}/${snap.tasksTotal} tasks done`);
  if (snap.dataPullsRunning > 0)
    blockedParts.push(
      `${snap.dataPullsRunning} data pull${snap.dataPullsRunning === 1 ? "" : "s"} running`,
    );
  if (snap.deadEnds > 0)
    blockedParts.push(`${snap.deadEnds} branch${snap.deadEnds === 1 ? "" : "es"} dead-ended`);
  if (blockedParts.length === 0) blockedParts.push("All branches progressing");

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div className="min-w-0">
          <nav
            className="mb-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground [&_a]:hover:text-foreground"
            aria-label="Run context"
          >
            <Link to={`/q/${q.id}`}>{q.title}</Link>
            <span className="text-muted-foreground" aria-hidden="true">
              ·
            </span>
            <span>Agent run</span>
          </nav>
          <h1 className="text-3xl font-bold tracking-tight">{run.title}</h1>
          <p className="mt-2 text-muted-foreground">{run.goal}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${snap.phase === "done" ? "bg-emerald-100 text-emerald-700" : snap.phase === "waiting" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}
        >
          {snap.phase === "done" ? "Done" : snap.phase === "waiting" ? "Waiting" : "Running"}
        </span>
      </div>

      <div
        className={`rounded-lg border p-4 ${snap.phase === "done" ? "bg-emerald-50" : "bg-amber-50"}`}
      >
        {snap.phase !== "done" && (
          <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
        )}
        {blockedParts.join(" · ")}
        <span className="mt-3 block h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <span
            className="block h-full rounded-full bg-primary"
            style={{ width: `${Math.round(snap.progress * 100)}%` }}
          />
        </span>
      </div>

      {snap.phase === "done" && snap.outcome && (
        <Card className="border bg-card border-primary/30 bg-primary/5">
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <h4>{snap.outcome.headline}</h4>
              {snap.outcome.effectLabel && (
                <span className="rounded-full bg-primary/15 px-2 py-1 text-xs font-medium text-primary">
                  {snap.outcome.effectLabel}
                </span>
              )}
            </div>
            <p>{snap.outcome.detail}</p>
            <Link to={`/q/${q.id}`} className="text-sm font-medium text-primary hover:underline">
              View question
            </Link>
          </CardContent>
        </Card>
      )}

      <Card className="border bg-card">
        <CardContent>
          <h4>Plan</h4>
          <p className="text-muted-foreground small">
            Directions the agent is pursuing — dead-ended branches stay visible.
          </p>
          <PlanGraph nodes={snap.nodes} />
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border bg-card">
          <CardContent>
            <h4>Outreach</h4>
            <p className="text-muted-foreground small">
              Who the agent is waiting on, and through which channel.
            </p>
            {snap.outreach.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This run contacts no one — automated pulls only.
              </p>
            ) : (
              <ul className="mt-4 divide-y rounded-lg border">
                {snap.outreach.map((o) => (
                  <li key={o.id} className="flex items-start gap-3 p-3">
                    <span
                      className="inline-flex size-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary"
                      aria-hidden="true"
                    >
                      {initials(o.person.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{o.person.name}</span>
                        <span className="text-muted-foreground small">{o.person.role}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ChannelIcon channel={o.person.channel} />
                          {o.person.target} · {CHANNEL_LABELS[o.person.channel]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{o.message}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs">
                      <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
                        {OUTREACH_LABELS[o.status]}
                      </span>
                      <span className="text-muted-foreground small">{waitLabel(o, now)}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled
                        title="Nudges are sent automatically when the wait budget is half spent"
                      >
                        Nudge
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border bg-card">
          <CardContent>
            <h4>Activity</h4>
            <p className="text-muted-foreground small">
              Everything the agent has done, newest first.
            </p>
            {snap.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="mt-4 divide-y rounded-lg border">
                {snap.events.map((ev) => (
                  <li key={ev.id} className="flex items-center gap-3 p-3 text-sm">
                    <span className="text-muted-foreground" aria-hidden="true">
                      {eventIcon(ev.kind)}
                    </span>
                    <span className="min-w-0 flex-1">{ev.text}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {new Date(ev.at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
