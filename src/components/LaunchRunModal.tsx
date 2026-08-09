import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CHANNEL_LABELS,
  resourcePreview,
  type InterventionResources,
  type InterventionSuggestion,
  type OutreachChannel,
} from "../domain/interventions";
import { useStore } from "../store";
import { ChannelIcon } from "./InterventionsPanel";

const CHANNELS: OutreachChannel[] = ["slack", "teams", "email"];
const WAIT_OPTIONS = [4, 12, 24, 48];

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
}

export default function LaunchRunModal({
  suggestion,
  questionId,
  onClose,
  onLaunch,
}: {
  suggestion: InterventionSuggestion;
  questionId: string;
  onClose: () => void;
  onLaunch: (resources: InterventionResources) => void;
}) {
  const { boundContextFor } = useStore();
  const defaults = suggestion.defaultResources;

  const boundDocs = useMemo(
    () =>
      boundContextFor(questionId)
        .filter((i) => i.status === "active" && (i.type === "document" || i.type === "manual"))
        .map((i) => i.title),
    [boundContextFor, questionId]
  );
  const allDocs = useMemo(
    () => Array.from(new Set([...defaults.docs, ...boundDocs])),
    [defaults.docs, boundDocs]
  );

  const [channels, setChannels] = useState<Set<OutreachChannel>>(
    () => new Set(defaults.people.map((p) => p.channel))
  );
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(
    () => new Set(defaults.people.map((p) => p.name))
  );
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(() => new Set(allDocs));
  const [selectedPulls, setSelectedPulls] = useState<Set<string>>(() => new Set(defaults.dataPulls));
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(() => new Set(defaults.tasks));
  const [maxPeople, setMaxPeople] = useState(defaults.maxPeople);
  const [maxWaitHours, setMaxWaitHours] = useState(defaults.maxWaitHours);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const toggleChannel = (channel: OutreachChannel) => {
    setChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channel)) {
        next.delete(channel);
        // Unchecking a channel drops the people reached through it.
        setSelectedPeople((people) => {
          const nextPeople = new Set(people);
          for (const p of defaults.people) {
            if (p.channel === channel) nextPeople.delete(p.name);
          }
          return nextPeople;
        });
      } else {
        next.add(channel);
      }
      return next;
    });
  };

  const togglePerson = (name: string) => {
    setSelectedPeople((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleIn = (set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  };

  const resources: InterventionResources = useMemo(
    () => ({
      people: defaults.people.filter((p) => selectedPeople.has(p.name) && channels.has(p.channel)),
      channels: Array.from(channels),
      docs: allDocs.filter((d) => selectedDocs.has(d)),
      dataPulls: defaults.dataPulls.filter((d) => selectedPulls.has(d)),
      tasks: defaults.tasks.filter((t) => selectedTasks.has(t)),
      maxPeople,
      maxWaitHours,
    }),
    [defaults.people, defaults.dataPulls, defaults.tasks, selectedPeople, channels, allDocs, selectedDocs, selectedPulls, selectedTasks, maxPeople, maxWaitHours]
  );

  const nothingSelected =
    resources.people.length === 0 &&
    resources.dataPulls.length === 0 &&
    resources.docs.length === 0 &&
    resources.tasks.length === 0;

  return createPortal(
    <div className="asrc-overlay" onMouseDown={onClose}>
      <div
        className="asrc-modal int-launch-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Choose resources for this agent run"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="asrc-head int-launch-head">
          <div>
            <h2 className="asrc-title">Launch: {suggestion.title}</h2>
            <p className="int-launch-sub">
              {suggestion.intent === "act"
                ? `Delivers: ${suggestion.expectedOutcome}`
                : `Targets: ${suggestion.targets}.`}{" "}
              Choose what the agent may use — defaults are pre-selected.
            </p>
          </div>
          <button type="button" className="asrc-close" aria-label="Close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </header>

        <div className="asrc-body int-launch-body">
          <section className="int-launch-section">
            <h3>Channels in scope</h3>
            <div className="int-channel-toggles">
              {CHANNELS.map((channel) => (
                <label key={channel} className={`int-channel-toggle${channels.has(channel) ? " on" : ""}`}>
                  <input
                    type="checkbox"
                    checked={channels.has(channel)}
                    onChange={() => toggleChannel(channel)}
                  />
                  <ChannelIcon channel={channel} />
                  {CHANNEL_LABELS[channel]}
                </label>
              ))}
            </div>
          </section>

          <section className="int-launch-section">
            <h3>People the agent may contact</h3>
            <ul className="int-people-list">
              {defaults.people.map((p) => {
                const channelOff = !channels.has(p.channel);
                return (
                  <li key={p.name}>
                    <label className={`int-person-row${channelOff ? " disabled" : ""}`}>
                      <input
                        type="checkbox"
                        checked={selectedPeople.has(p.name) && !channelOff}
                        disabled={channelOff}
                        onChange={() => togglePerson(p.name)}
                      />
                      <span className="pc-evc-avatar" aria-hidden="true">
                        {initials(p.name)}
                      </span>
                      <span className="int-person-name">{p.name}</span>
                      <span className="muted small">{p.role}</span>
                      <span className="int-person-target">
                        <ChannelIcon channel={p.channel} />
                        {p.target}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>

          {defaults.tasks.length > 0 && (
            <section className="int-launch-section">
              <h3>Tasks the agent may execute</h3>
              <ul className="int-doc-list">
                {defaults.tasks.map((task) => (
                  <li key={task}>
                    <label className="int-doc-row">
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(task)}
                        onChange={() => toggleIn(selectedTasks, task, setSelectedTasks)}
                      />
                      <span className="ctx-type-badge">task</span>
                      {task}
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(allDocs.length > 0 || defaults.dataPulls.length > 0) && (
            <section className="int-launch-section">
              <h3>Documents & data pulls</h3>
              <ul className="int-doc-list">
                {allDocs.map((doc) => (
                  <li key={doc}>
                    <label className="int-doc-row">
                      <input
                        type="checkbox"
                        checked={selectedDocs.has(doc)}
                        onChange={() => toggleIn(selectedDocs, doc, setSelectedDocs)}
                      />
                      <span className="ctx-type-badge">doc</span>
                      {doc}
                    </label>
                  </li>
                ))}
                {defaults.dataPulls.map((pull) => (
                  <li key={pull}>
                    <label className="int-doc-row">
                      <input
                        type="checkbox"
                        checked={selectedPulls.has(pull)}
                        onChange={() => toggleIn(selectedPulls, pull, setSelectedPulls)}
                      />
                      <span className="ctx-type-badge">pull</span>
                      {pull}
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="int-launch-section">
            <h3>Budget</h3>
            <div className="int-budget-row">
              <label>
                Max people contacted
                <select value={maxPeople} onChange={(e) => setMaxPeople(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Max wait per person
                <select value={maxWaitHours} onChange={(e) => setMaxWaitHours(Number(e.target.value))}>
                  {WAIT_OPTIONS.map((h) => (
                    <option key={h} value={h}>
                      {h}h
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
        </div>

        <footer className="int-launch-foot">
          <span className="muted small">{nothingSelected ? "Select at least one resource" : resourcePreview(resources)}</span>
          <button
            type="button"
            className="ctx-primary-btn"
            disabled={nothingSelected}
            onClick={() => onLaunch(resources)}
          >
            Launch agent
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
