import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  INTENT_LABELS,
  RUN_TOTAL_MS,
  snapshotRun,
  type AgentRun,
  type GainLevel,
  type InterventionRow,
  type InterventionSuggestion,
  type OutreachChannel,
  resourcePreview,
} from "../domain/interventions";
import { useStore } from "../store";
import { BrandIcon } from "./brandIcons";
import { IconMail } from "./icons";
import LaunchRunModal from "./LaunchRunModal";

const GAIN_LABELS: Record<GainLevel, string> = {
  high: "High impact",
  medium: "Medium",
  low: "Low",
};

export function ChannelIcon({ channel, size = 14 }: { channel: OutreachChannel; size?: number }) {
  if (channel === "email") {
    return (
      <span className="int-channel-icon int-channel-icon-email" aria-hidden="true">
        <IconMail />
      </span>
    );
  }
  return (
    <span className={`int-channel-icon int-channel-icon-${channel}`} aria-hidden="true">
      <BrandIcon kind={channel} width={size} height={size} />
    </span>
  );
}

/** Re-renders on a 1s tick while `active`, so run status chips stay live. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return now;
}

function RunStatusChip({
  run,
  now,
  questionId,
}: {
  run: AgentRun;
  now: number;
  questionId: string;
}) {
  const snap = snapshotRun(run, now);
  let label: string;
  if (snap.phase === "planning") label = "Planning…";
  else if (snap.phase === "done") label = "Done";
  else if (snap.waitingOn.length > 0)
    label = `Waiting on ${snap.waitingOn.length} ${snap.waitingOn.length === 1 ? "person" : "people"}`;
  else label = "Running";
  return (
    <Link
      to={`/q/${questionId}/run/${run.id}`}
      className={`int-run-chip int-run-chip-${snap.phase}`}
    >
      {snap.phase !== "done" && <span className="int-run-chip-dot" aria-hidden="true" />}
      {label}
      <span className="int-run-chip-arrow" aria-hidden="true">
        ›
      </span>
    </Link>
  );
}

function RejectForm({
  onConfirm,
  onCancel,
}: {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="int-reject-form">
      <label className="int-reject-label" htmlFor="int-reject-reason">
        Why are you rejecting this? <span className="muted">(optional)</span>
      </label>
      <textarea
        id="int-reject-reason"
        className="int-reject-textarea"
        rows={2}
        placeholder="e.g. Already covered by last week's review…"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="int-reject-actions">
        <button type="button" className="int-btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="int-btn-reject" onClick={() => onConfirm(reason)}>
          Reject suggestion
        </button>
      </div>
    </div>
  );
}

export default function InterventionsPanel({ questionId }: { questionId: string }) {
  const { interventionsFor, rejectIntervention, restoreIntervention, launchInterventionRun } =
    useStore();
  const navigate = useNavigate();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [launching, setLaunching] = useState<InterventionSuggestion | null>(null);
  const [dismissedOpen, setDismissedOpen] = useState(false);

  const rows = interventionsFor(questionId);
  const active = rows.filter((r) => r.decision?.status !== "rejected");
  const dismissed = rows.filter((r) => r.decision?.status === "rejected");

  const hasLiveRun = useMemo(
    () => active.some((r) => r.run && Date.now() - r.run.launchedAt < RUN_TOTAL_MS + 2000),
    [active],
  );
  const now = useNow(hasLiveRun);

  const renderActions = (row: InterventionRow) => {
    if (row.run) {
      return <RunStatusChip run={row.run} now={now} questionId={questionId} />;
    }
    return (
      <div className="int-row-actions">
        <button type="button" className="int-btn-run" onClick={() => setLaunching(row.suggestion)}>
          Run
        </button>
        <button
          type="button"
          className="int-btn-ghost"
          onClick={() =>
            setRejectingId(rejectingId === row.suggestion.id ? null : row.suggestion.id)
          }
        >
          Reject
        </button>
      </div>
    );
  };

  return (
    <div className="panel int-panel">
      <div className="int-panel-head">
        <h4>Drive this outcome</h4>
        <span className="muted small">
          Agents that get things done — chase owners, file tickets, secure commitments — plus
          research runs that sharpen the estimate. Monitor them all under{" "}
          <Link to="/agents">Agents</Link>.
        </span>
      </div>

      {active.length === 0 ? (
        <p className="muted int-empty">No open suggestions for this question.</p>
      ) : (
        <div className="evidence-table-wrap">
          <table className="evidence-table int-table">
            <thead>
              <tr>
                <th>Suggested agent</th>
                <th>Expected impact</th>
                <th>Resources</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {active.map((row) => {
                const s = row.suggestion;
                return (
                  <Fragment key={s.id}>
                    <tr className="int-row">
                      <td className="int-cell-main">
                        <span className="int-title">
                          <span className={`int-intent-badge int-intent-${s.intent}`}>
                            {INTENT_LABELS[s.intent]}
                          </span>
                          {s.title}
                        </span>
                        <span className="int-sub">
                          {s.intent === "act"
                            ? `Delivers: ${s.expectedOutcome}`
                            : `Targets: ${s.targets}`}
                        </span>
                        <span className="int-approach">{s.approach}</span>
                      </td>
                      <td className="int-cell-gain">
                        <span className={`int-gain-pill int-gain-${s.estimatedGain}`}>
                          {GAIN_LABELS[s.estimatedGain]}
                        </span>
                        <span className="int-gain-framing">{s.gainFraming}</span>
                      </td>
                      <td className="int-cell-resources">
                        <span className="int-resource-preview">
                          {s.defaultResources.people.slice(0, 3).map((p) => (
                            <ChannelIcon key={p.name} channel={p.channel} />
                          ))}
                          {resourcePreview(s.defaultResources)}
                        </span>
                        <span className="int-duration">{s.estimatedDurationLabel}</span>
                      </td>
                      <td className="int-cell-actions">{renderActions(row)}</td>
                    </tr>
                    {rejectingId === s.id && (
                      <tr className="int-reject-row">
                        <td colSpan={4}>
                          <RejectForm
                            onCancel={() => setRejectingId(null)}
                            onConfirm={(reason) => {
                              rejectIntervention(questionId, s.id, reason);
                              setRejectingId(null);
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {dismissed.length > 0 && (
        <div className="int-dismissed">
          <button
            type="button"
            className="int-dismissed-trigger"
            aria-expanded={dismissedOpen}
            onClick={() => setDismissedOpen((v) => !v)}
          >
            <span
              className={`panel-collapse-chevron${dismissedOpen ? " open" : ""}`}
              aria-hidden="true"
            />
            Dismissed ({dismissed.length})
          </button>
          {dismissedOpen && (
            <ul className="int-dismissed-list">
              {dismissed.map((row) => (
                <li key={row.suggestion.id}>
                  <div className="int-dismissed-main">
                    <span className="int-dismissed-title">{row.suggestion.title}</span>
                    {row.decision?.rejectReason && (
                      <span className="int-dismissed-reason">“{row.decision.rejectReason}”</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="int-btn-ghost"
                    onClick={() => restoreIntervention(row.suggestion.id)}
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {launching && (
        <LaunchRunModal
          suggestion={launching}
          questionId={questionId}
          onClose={() => setLaunching(null)}
          onLaunch={(resources) => {
            const run = launchInterventionRun(launching, resources);
            setLaunching(null);
            navigate(`/q/${questionId}/run/${run.id}`);
          }}
        />
      )}
    </div>
  );
}
