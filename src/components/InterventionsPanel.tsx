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
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Textarea } from "./ui/textarea";

const GAIN_LABELS: Record<GainLevel, string> = {
  high: "High impact",
  medium: "Medium",
  low: "Low",
};

function intentClassName(intent: InterventionSuggestion["intent"]): string {
  return intent === "act"
    ? "rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground"
    : "rounded bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground";
}

function gainClassName(gain: GainLevel): string {
  if (gain === "high") return "bg-emerald-100 text-emerald-700";
  if (gain === "medium") return "bg-amber-100 text-amber-700";
  return "bg-muted text-muted-foreground";
}

export function ChannelIcon({ channel, size = 14 }: { channel: OutreachChannel; size?: number }) {
  if (channel === "email") {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground"
        style={{ width: size + 4, height: size + 4 }}
        aria-hidden="true"
      >
        <IconMail />
      </span>
    );
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md border bg-muted"
      style={{ width: size + 4, height: size + 4 }}
      aria-hidden="true"
    >
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
      className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
    >
      {snap.phase !== "done" && (
        <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
      )}
      {label}
      <span className="text-sm leading-none" aria-hidden="true">
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
    <div className="flex max-w-xl flex-col gap-2">
      <label className="text-xs font-semibold" htmlFor="reject-reason">
        Why are you rejecting this? <span className="text-muted-foreground">(optional)</span>
      </label>
      <Textarea
        id="reject-reason"
        className="min-h-20 resize-y"
        rows={2}
        placeholder="e.g. Already covered by last week's review…"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" variant="destructive" size="sm" onClick={() => onConfirm(reason)}>
          Reject suggestion
        </Button>
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
      <div className="flex justify-end gap-1.5">
        <Button type="button" variant="secondary" onClick={() => setLaunching(row.suggestion)}>
          Run
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            setRejectingId(rejectingId === row.suggestion.id ? null : row.suggestion.id)
          }
        >
          Reject
        </Button>
      </div>
    );
  };

  return (
    <Card className="mt-5">
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h4 className="text-base">Drive this outcome</h4>
          <span className="text-sm leading-5 text-muted-foreground">
            Agents that get things done — chase owners, file tickets, secure commitments — plus
            research runs that sharpen the estimate. Monitor them all under the outcome panel.
          </span>
        </div>

        {active.length === 0 ? (
          <p className="mt-1.5 text-sm text-muted-foreground">
            No open suggestions for this question.
          </p>
        ) : (
          <div className="grid gap-3">
            {active.map((row) => {
              const s = row.suggestion;
              return (
                <Fragment key={s.id}>
                  <div className="grid gap-4 rounded-lg border bg-background p-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(10rem,0.8fr)_minmax(12rem,1fr)_auto] lg:items-start">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={intentClassName(s.intent)}>{INTENT_LABELS[s.intent]}</span>
                        <span className="text-sm font-semibold leading-5">{s.title}</span>
                      </div>
                      <p className="text-xs leading-5 text-muted-foreground">
                        {s.intent === "act"
                          ? `Delivers: ${s.expectedOutcome}`
                          : `Targets: ${s.targets}`}
                      </p>
                      <p className="text-xs leading-5 text-muted-foreground">{s.approach}</p>
                    </div>
                    <div className="min-w-0 space-y-2">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${gainClassName(s.estimatedGain)}`}
                      >
                        {GAIN_LABELS[s.estimatedGain]}
                      </span>
                      <p className="text-xs leading-5 text-muted-foreground">{s.gainFraming}</p>
                    </div>
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs leading-5">
                        {s.defaultResources.people.slice(0, 3).map((p) => (
                          <ChannelIcon key={p.name} channel={p.channel} />
                        ))}
                        <span>{resourcePreview(s.defaultResources)}</span>
                      </div>
                      <p className="text-xs leading-5 text-muted-foreground">
                        {s.estimatedDurationLabel}
                      </p>
                    </div>
                    <div className="flex min-w-max lg:justify-end">{renderActions(row)}</div>
                  </div>
                  {rejectingId === s.id && (
                    <div className="rounded-lg border bg-muted/40 p-4">
                      <RejectForm
                        onCancel={() => setRejectingId(null)}
                        onConfirm={(reason) => {
                          rejectIntervention(questionId, s.id, reason);
                          setRejectingId(null);
                        }}
                      />
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        )}

        {dismissed.length > 0 && (
          <div className="mt-4">
            <Button
              type="button"
              variant="ghost"
              className="text-sm font-medium"
              aria-expanded={dismissedOpen}
              onClick={() => setDismissedOpen((v) => !v)}
            >
              <span
                className={`text-muted-foreground transition-transform ${dismissedOpen ? "rotate-90" : ""}`}
                aria-hidden="true"
              >
                ›
              </span>
              Dismissed ({dismissed.length})
            </Button>
            {dismissedOpen && (
              <ul className="mt-2 divide-y rounded-lg border">
                {dismissed.map((row) => (
                  <li key={row.suggestion.id} className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{row.suggestion.title}</span>
                      {row.decision?.rejectReason && (
                        <span className="mt-1 block text-xs italic text-muted-foreground">
                          “{row.decision.rejectReason}”
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => restoreIntervention(row.suggestion.id)}
                    >
                      Restore
                    </Button>
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
      </CardContent>
    </Card>
  );
}
