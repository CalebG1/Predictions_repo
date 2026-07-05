import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { ProbabilityAlert } from "../domain/types";
import { useStore } from "../store";
import { pct } from "./ui";

function alertLabel(a: ProbabilityAlert): string {
  return a.direction === "above" ? `Above ${pct(a.threshold)}` : `Below ${pct(a.threshold)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NotificationPanel() {
  const { alerts, questions, yesOutcome, removeAlert, markAlertRead, markAllAlertsRead, unreadAlertCount } =
    useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

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
    [alerts, questionMap]
  );

  const active = visibleAlerts.filter((a) => !a.triggeredAt);
  const triggered = visibleAlerts.filter((a) => a.triggeredAt);

  return (
    <div className="notif-picker" ref={ref}>
      <button
        type="button"
        className="icon-btn notif-trigger"
        title="Notifications"
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unreadAlertCount > 0 && (
          <span className="notif-badge" aria-label={`${unreadAlertCount} unread`}>
            {unreadAlertCount > 9 ? "9+" : unreadAlertCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <header className="notif-head">
            <h3 className="notif-title">Alerts</h3>
            {unreadAlertCount > 0 && (
              <button type="button" className="notif-mark-all" onClick={markAllAlertsRead}>
                Mark all read
              </button>
            )}
          </header>

          {visibleAlerts.length === 0 ? (
            <div className="notif-empty">
              <p>No alerts yet.</p>
            </div>
          ) : (
            <div className="notif-list">
              {triggered.length > 0 && (
                <section className="notif-section">
                  <h4 className="notif-section-label">Triggered</h4>
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
                <section className="notif-section">
                  <h4 className="notif-section-label">Watching</h4>
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
        </div>
      )}
    </div>
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
    <div className={`notif-row${unread ? " unread" : ""}`}>
      <Link
        to={`/q/${alert.questionId}`}
        className="notif-row-main"
        onClick={() => {
          if (unread && onRead) onRead();
        }}
      >
        <span className="notif-row-title">{questionTitle}</span>
        <span className={`notif-row-cond ${alert.direction}`}>
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
          <span className="notif-row-date">{formatDate(alert.triggeredAt)}</span>
        )}
      </Link>
      <button
        type="button"
        className="notif-row-delete"
        aria-label="Delete alert"
        title="Delete alert"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
      >
        ×
      </button>
    </div>
  );
}
