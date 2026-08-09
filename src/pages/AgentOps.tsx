import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChannelIcon } from "../components/InterventionsPanel";
import {
  CHANNEL_LABELS,
  INTENT_LABELS,
  RUN_TOTAL_MS,
  snapshotRun,
  type AgentRun,
  type OutreachSnapshot,
  type RunSnapshot,
} from "../domain/interventions";
import { useStore } from "../store";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
}

function elapsedLabel(ms: number): string {
  const secs = Math.max(0, Math.floor(ms / 1000));
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

interface RunWithSnap {
  run: AgentRun;
  snap: RunSnapshot;
}

function PhaseChip({ snap }: { snap: RunSnapshot }) {
  let label: string;
  if (snap.phase === "planning") label = "Planning";
  else if (snap.phase === "done") label = "Done";
  else if (snap.waitingOn.length > 0) label = `Waiting on ${snap.waitingOn.length}`;
  else label = "Running";
  return (
    <span className={`arm-phase arm-phase-${snap.phase === "planning" ? "running" : snap.phase} ops-phase`}>
      {snap.phase !== "done" && <span className="int-run-chip-dot" aria-hidden="true" />}
      {label}
    </span>
  );
}

function RunCard({ run, snap, now, questionTitle }: RunWithSnap & { now: number; questionTitle: string }) {
  const nextStep =
    snap.phase === "done"
      ? snap.outcome?.headline ?? "Complete"
      : snap.waitingOn.length > 0
        ? `Waiting on ${snap.waitingOn.map((o) => o.person.name.split(" ")[0]).join(", ")}`
        : snap.dataPullsRunning > 0
          ? "Data pulls in flight"
          : snap.tasksTotal > snap.tasksDone
            ? "Executing tasks"
            : "Synthesizing";

  return (
    <Link to={`/q/${run.questionId}/run/${run.id}`} className={`ops-card ops-card-${snap.phase}`}>
      <div className="ops-card-top">
        <span className={`int-intent-badge int-intent-${run.intent}`}>{INTENT_LABELS[run.intent]}</span>
        <span className="ops-card-question">{questionTitle}</span>
        <PhaseChip snap={snap} />
      </div>
      <div className="ops-card-title">{run.title}</div>
      <div className="ops-card-goal">{run.goal}</div>

      <div className="ops-card-progress">
        <span className="arm-progress ops-progress">
          <span className="arm-progress-fill" style={{ width: `${Math.round(snap.progress * 100)}%` }} />
        </span>
        <span className="ops-card-elapsed">{elapsedLabel(now - run.launchedAt)}</span>
      </div>

      <div className="ops-card-foot">
        <div className="ops-card-people">
          {snap.outreach.map((o) => (
            <span
              key={o.id}
              className={`ops-avatar ops-avatar-${o.status}`}
              title={`${o.person.name} — ${o.status.replace("_", " ")} (${CHANNEL_LABELS[o.person.channel]})`}
            >
              {initials(o.person.name)}
            </span>
          ))}
          {snap.tasksTotal > 0 && (
            <span className="ops-card-tasks">
              {snap.tasksDone}/{snap.tasksTotal} tasks
            </span>
          )}
        </div>
        <span className="ops-card-next">{nextStep}</span>
      </div>
    </Link>
  );
}

export default function AgentOps() {
  const { agentRuns, questions } = useStore();

  const [now, setNow] = useState(() => Date.now());
  const anyLive = agentRuns.some((r) => Date.now() - r.launchedAt < RUN_TOTAL_MS + 2000);
  useEffect(() => {
    if (!anyLive) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [anyLive]);

  const titleFor = useMemo(() => {
    const map = new Map(questions.map((q) => [q.id, q.title]));
    return (id: string) => map.get(id) ?? id;
  }, [questions]);

  const withSnaps: RunWithSnap[] = useMemo(
    () =>
      agentRuns
        .map((run) => ({ run, snap: snapshotRun(run, now) }))
        .sort((a, b) => b.run.launchedAt - a.run.launchedAt),
    [agentRuns, now]
  );

  const activeRuns = withSnaps.filter((r) => r.snap.phase !== "done");
  const doneRuns = withSnaps.filter((r) => r.snap.phase === "done");

  const waitingEntries: { run: AgentRun; outreach: OutreachSnapshot }[] = [];
  for (const { run, snap } of activeRuns) {
    for (const o of snap.waitingOn) waitingEntries.push({ run, outreach: o });
  }
  waitingEntries.sort((a, b) => (a.outreach.sentAt ?? 0) - (b.outreach.sentAt ?? 0));

  const needsAttention = withSnaps.filter(
    ({ snap }) => snap.deadEnds > 0 && snap.phase !== "done"
  ).length;
  const totalWaiting = waitingEntries.length;
  const effectsApplied = doneRuns.filter(({ run }) => run.intent === "act" && run.completionApplied).length;

  return (
    <div className="dash-page ops-page">
      <div className="ops-head">
        <div>
          <h1 className="detail-title">Agents</h1>
          <p className="arm-goal">
            Every agent working your forecasts — what they're doing, who they're waiting on, and what they've
            delivered. Launch new ones from any question page.
          </p>
        </div>
      </div>

      <div className="ops-stats">
        <div className="ops-stat">
          <span className="ops-stat-value">{activeRuns.length}</span>
          <span className="ops-stat-label">Active runs</span>
        </div>
        <div className="ops-stat">
          <span className={`ops-stat-value${totalWaiting > 0 ? " ops-stat-waiting" : ""}`}>{totalWaiting}</span>
          <span className="ops-stat-label">People being waited on</span>
        </div>
        <div className="ops-stat">
          <span className={`ops-stat-value${needsAttention > 0 ? " ops-stat-attention" : ""}`}>
            {needsAttention}
          </span>
          <span className="ops-stat-label">Runs with dead-ended branches</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-value">{doneRuns.length}</span>
          <span className="ops-stat-label">Completed</span>
        </div>
        <div className="ops-stat">
          <span className="ops-stat-value ops-stat-effect">{effectsApplied}</span>
          <span className="ops-stat-label">Forecast effects applied</span>
        </div>
      </div>

      {agentRuns.length === 0 ? (
        <div className="panel ops-empty">
          <h4>No agents launched yet</h4>
          <p className="muted">
            Open any question and use the <b>Drive this outcome</b> panel to launch an action or research
            agent. Everything launched shows up here, live.
          </p>
          <Link to="/" className="ctx-primary-btn arm-finding-link">
            Browse questions
          </Link>
        </div>
      ) : (
        <>
          {totalWaiting > 0 && (
            <div className="panel ops-waiting-panel">
              <h4>Who we're waiting on</h4>
              <p className="muted small">Across every active run, oldest wait first.</p>
              <ul className="ops-waiting-list">
                {waitingEntries.map(({ run, outreach }) => (
                  <li key={`${run.id}-${outreach.id}`}>
                    <span className="pc-evc-avatar" aria-hidden="true">
                      {initials(outreach.person.name)}
                    </span>
                    <div className="ops-waiting-main">
                      <span className="ops-waiting-name">
                        {outreach.person.name}
                        <span className="muted small"> · {outreach.person.role}</span>
                      </span>
                      <span className="ops-waiting-context">
                        <ChannelIcon channel={outreach.person.channel} />
                        {outreach.person.target} — for “{run.title}”
                      </span>
                    </div>
                    <span className={`arm-outreach-chip st-${outreach.status}`}>
                      {outreach.status === "seen" ? "Seen, no reply" : "Sent"}
                    </span>
                    <span className="ops-waiting-elapsed">
                      {outreach.sentAt ? `${elapsedLabel(now - outreach.sentAt)} waiting` : "queued"}
                    </span>
                    <Link className="int-btn-ghost ops-waiting-link" to={`/q/${run.questionId}/run/${run.id}`}>
                      View run
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeRuns.length > 0 && (
            <section className="ops-section">
              <h3 className="ops-section-title">Active</h3>
              <div className="ops-grid">
                {activeRuns.map(({ run, snap }) => (
                  <RunCard key={run.id} run={run} snap={snap} now={now} questionTitle={titleFor(run.questionId)} />
                ))}
              </div>
            </section>
          )}

          {doneRuns.length > 0 && (
            <section className="ops-section">
              <h3 className="ops-section-title">Completed</h3>
              <ul className="ops-done-list">
                {doneRuns.map(({ run, snap }) => (
                  <li key={run.id}>
                    <Link to={`/q/${run.questionId}/run/${run.id}`} className="ops-done-row">
                      <span className={`int-intent-badge int-intent-${run.intent}`}>{INTENT_LABELS[run.intent]}</span>
                      <div className="ops-done-main">
                        <span className="ops-done-headline">{snap.outcome?.headline ?? run.title}</span>
                        <span className="muted small">
                          {titleFor(run.questionId)} · finished{" "}
                          {elapsedLabel(now - (run.launchedAt + RUN_TOTAL_MS))} ago
                        </span>
                      </div>
                      {snap.outcome?.effectLabel && (
                        <span className="arm-effect-chip">{snap.outcome.effectLabel}</span>
                      )}
                      {snap.deadEnds > 0 && (
                        <span className="ops-done-deadend">
                          {snap.deadEnds} no-response{snap.deadEnds === 1 ? "" : "s"}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
