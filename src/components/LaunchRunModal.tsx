import { useEffect, useMemo, useState } from "react";
import {
  CHANNEL_LABELS,
  resourcePreview,
  type InterventionResources,
  type InterventionSuggestion,
  type OutreachChannel,
} from "../domain/interventions";
import { useStore } from "../store";
import { ChannelIcon } from "./InterventionsPanel";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

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
    [boundContextFor, questionId],
  );
  const allDocs = useMemo(
    () => Array.from(new Set([...defaults.docs, ...boundDocs])),
    [defaults.docs, boundDocs],
  );

  const [channels, setChannels] = useState<Set<OutreachChannel>>(
    () => new Set(defaults.people.map((p) => p.channel)),
  );
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(
    () => new Set(defaults.people.map((p) => p.name)),
  );
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(() => new Set(allDocs));
  const [selectedPulls, setSelectedPulls] = useState<Set<string>>(
    () => new Set(defaults.dataPulls),
  );
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
    [
      defaults.people,
      defaults.dataPulls,
      defaults.tasks,
      selectedPeople,
      channels,
      allDocs,
      selectedDocs,
      selectedPulls,
      selectedTasks,
      maxPeople,
      maxWaitHours,
    ],
  );

  const nothingSelected =
    resources.people.length === 0 &&
    resources.dataPulls.length === 0 &&
    resources.docs.length === 0 &&
    resources.tasks.length === 0;

  return (
    <Dialog open onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-card p-0 sm:max-w-3xl">
        <DialogHeader className="px-6 pt-6 pr-12">
          <DialogTitle>Launch: {suggestion.title}</DialogTitle>
          <DialogDescription>
            {suggestion.intent === "act"
              ? `Delivers: ${suggestion.expectedOutcome}`
              : `Targets: ${suggestion.targets}.`}{" "}
            Choose what the agent may use — defaults are pre-selected.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6">
          <section>
            <h3 className="mb-2 text-sm font-semibold">Channels in scope</h3>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((channel) => (
                <label
                  key={channel}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${channels.has(channel) ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}
                >
                  <Checkbox
                    checked={channels.has(channel)}
                    onCheckedChange={() => toggleChannel(channel)}
                  />
                  <ChannelIcon channel={channel} />
                  {CHANNEL_LABELS[channel]}
                </label>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">People the agent may contact</h3>
            <ul className="divide-y rounded-lg border">
              {defaults.people.map((p) => {
                const channelOff = !channels.has(p.channel);
                return (
                  <li key={p.name}>
                    <label
                      className={`flex cursor-pointer items-center gap-2.5 p-3 transition-colors hover:bg-muted/60 ${channelOff ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <Checkbox
                        checked={selectedPeople.has(p.name) && !channelOff}
                        disabled={channelOff}
                        onCheckedChange={() => togglePerson(p.name)}
                      />
                      <span
                        className="inline-flex size-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary"
                        aria-hidden="true"
                      >
                        {initials(p.name)}
                      </span>
                      <span className="text-sm font-medium">{p.name}</span>
                      <span className="text-muted-foreground small">{p.role}</span>
                      <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
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
            <section>
              <h3 className="mb-2 text-sm font-semibold">Tasks the agent may execute</h3>
              <ul className="divide-y rounded-lg border">
                {defaults.tasks.map((task) => (
                  <li key={task}>
                    <label className="flex cursor-pointer items-center gap-2.5 p-3 text-sm transition-colors hover:bg-muted/60">
                      <Checkbox
                        checked={selectedTasks.has(task)}
                        onCheckedChange={() => toggleIn(selectedTasks, task, setSelectedTasks)}
                      />
                      <span className="rounded bg-muted px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        task
                      </span>
                      {task}
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(allDocs.length > 0 || defaults.dataPulls.length > 0) && (
            <section>
              <h3 className="mb-2 text-sm font-semibold">Documents & data pulls</h3>
              <ul className="divide-y rounded-lg border">
                {allDocs.map((doc) => (
                  <li key={doc}>
                    <label className="flex cursor-pointer items-center gap-2.5 p-3 text-sm transition-colors hover:bg-muted/60">
                      <Checkbox
                        checked={selectedDocs.has(doc)}
                        onCheckedChange={() => toggleIn(selectedDocs, doc, setSelectedDocs)}
                      />
                      <span className="rounded bg-muted px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        doc
                      </span>
                      {doc}
                    </label>
                  </li>
                ))}
                {defaults.dataPulls.map((pull) => (
                  <li key={pull}>
                    <label className="flex cursor-pointer items-center gap-2.5 p-3 text-sm transition-colors hover:bg-muted/60">
                      <Checkbox
                        checked={selectedPulls.has(pull)}
                        onCheckedChange={() => toggleIn(selectedPulls, pull, setSelectedPulls)}
                      />
                      <span className="rounded bg-muted px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        pull
                      </span>
                      {pull}
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-sm font-semibold">Budget</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                Max people contacted
                <Select
                  value={String(maxPeople)}
                  onValueChange={(value) => setMaxPeople(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Max wait per person
                <Select
                  value={String(maxWaitHours)}
                  onValueChange={(value) => setMaxWaitHours(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WAIT_OPTIONS.map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {h}h
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
          </section>
        </div>

        <DialogFooter>
          <span className="text-muted-foreground small">
            {nothingSelected ? "Select at least one resource" : resourcePreview(resources)}
          </span>
          <Button type="button" disabled={nothingSelected} onClick={() => onLaunch(resources)}>
            Launch agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
