import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ProbabilityAlert } from "../domain/types";
import { useStore } from "../store";
import { pct } from "./ui";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { Bell } from "lucide-react";

function alertLabel(a: ProbabilityAlert): string {
  return a.direction === "above" ? `Above ${pct(a.threshold)}` : `Below ${pct(a.threshold)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NotificationPanel() {
  const {
    alerts,
    questions,
    yesOutcome,
    removeAlert,
    markAlertRead,
    markAllAlertsRead,
    unreadAlertCount,
  } = useStore();
  const [open, setOpen] = useState(false);
  const questionMap = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);

  const visibleAlerts = useMemo(
    () =>
      alerts
        .filter((a) => questionMap.has(a.questionId))
        .sort((a, b) => {
          const aTime = a.triggeredAt ?? a.createdAt;
          const bTime = b.triggeredAt ?? b.createdAt;
          return bTime.localeCompare(aTime);
        }),
    [alerts, questionMap],
  );

  const active = visibleAlerts.filter((a) => !a.triggeredAt);
  const triggered = visibleAlerts.filter((a) => a.triggeredAt);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="relative inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        title="Notifications"
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="size-[18px]" />
        {unreadAlertCount > 0 && (
          <span
            className="absolute -top-1 -right-1 inline-flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-bold text-destructive-foreground"
            aria-label={`${unreadAlertCount} unread`}
          >
            {unreadAlertCount > 9 ? "9+" : unreadAlertCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        className="flex max-h-[70vh] w-[min(360px,90vw)] flex-col overflow-hidden p-0"
        align="end"
        sideOffset={8}
        aria-label="Notifications"
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Alerts</h3>
          {unreadAlertCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={markAllAlertsRead}
            >
              Mark all read
            </Button>
          )}
        </header>

        {visibleAlerts.length === 0 ? (
          <div className="p-6 text-center text-sm font-medium">
            <p>No alerts yet.</p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            {triggered.length > 0 && (
              <section>
                <h4 className="px-4 pt-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Triggered
                </h4>
                {triggered.map((a) => (
                  <AlertRow
                    key={a.id}
                    alert={a}
                    questionTitle={questionMap.get(a.questionId)?.title ?? "Unknown"}
                    currentProb={yesOutcome(a.questionId)?.currentProbability}
                    onRemove={() => removeAlert(a.id)}
                    onRead={() => markAlertRead(a.id)}
                  />
                ))}
              </section>
            )}

            {active.length > 0 && (
              <section>
                <h4 className="px-4 pt-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Watching
                </h4>
                {active.map((a) => (
                  <AlertRow
                    key={a.id}
                    alert={a}
                    questionTitle={questionMap.get(a.questionId)?.title ?? "Unknown"}
                    currentProb={yesOutcome(a.questionId)?.currentProbability}
                    onRemove={() => removeAlert(a.id)}
                  />
                ))}
              </section>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function AlertRow({
  alert,
  questionTitle,
  currentProb,
  onRemove,
  onRead,
}: {
  alert: ProbabilityAlert;
  questionTitle: string;
  currentProb?: number;
  onRemove: () => void;
  onRead?: () => void;
}) {
  const triggered = Boolean(alert.triggeredAt);
  const unread = triggered && !alert.read;

  return (
    <div className={`flex items-stretch border-b border-border/60 ${unread ? "bg-primary/5" : ""}`}>
      <Link
        to={`/q/${alert.questionId}`}
        className="flex min-w-0 flex-1 flex-col gap-0.5 px-4 py-3 hover:bg-muted/70"
        onClick={() => {
          if (unread && onRead) onRead();
        }}
      >
        <span className="truncate text-sm font-medium">{questionTitle}</span>
        <span
          className={
            alert.direction === "above" ? "text-xs text-primary" : "text-xs text-destructive"
          }
        >
          {triggered ? (
            <>
              Crossed {alertLabel(alert)}
              {alert.triggeredProbability !== undefined && (
                <> — now {pct(alert.triggeredProbability)}</>
              )}
            </>
          ) : (
            <>
              {alertLabel(alert)}
              {currentProb !== undefined && <> · now {pct(currentProb)}</>}
            </>
          )}
        </span>
        {triggered && alert.triggeredAt && (
          <span className="mt-0.5 text-xs text-muted-foreground">
            {formatDate(alert.triggeredAt)}
          </span>
        )}
      </Link>
      <Button
        type="button"
        className="size-9 self-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label="Delete alert"
        title="Delete alert"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
      >
        ×
      </Button>
    </div>
  );
}
