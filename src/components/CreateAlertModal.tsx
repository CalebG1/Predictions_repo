import { useEffect, useState } from "react";
import type { ForecastQuestion } from "../domain/types";
import { useStore } from "../store";
import { pct } from "./ui";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";

export default function CreateAlertModal({
  open,
  q,
  probability,
  onClose,
}: {
  open: boolean;
  q: ForecastQuestion;
  probability: number;
  onClose: () => void;
}) {
  const { yesOutcome, addAlert } = useStore();
  const yes = yesOutcome(q.id);
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [thresholdPct, setThresholdPct] = useState(Math.round(probability * 100));

  useEffect(() => {
    if (open) {
      setDirection("above");
      setThresholdPct(Math.round(probability * 100));
    }
  }, [open, probability]);
  if (!yes) return null;
  const threshold = Math.min(100, Math.max(1, thresholdPct)) / 100;
  const create = () => {
    addAlert({ questionId: q.id, outcomeId: yes.id, direction, threshold });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="gap-5 bg-card p-0 sm:max-w-md">
        <DialogHeader className="px-6 pt-6 pr-12">
          <DialogTitle>Set alert</DialogTitle>
          <DialogDescription>
            Get notified when this forecast crosses your chosen threshold.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 px-6">
          <div className="rounded-lg bg-muted p-3">
            <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Question
            </span>
            <span className="mt-1 block text-sm font-medium leading-6">{q.title}</span>
          </div>
          <div>
            <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Current probability
            </span>
            <strong className="mt-1 block text-2xl">{pct(probability)}</strong>
          </div>
          <div className="space-y-2">
            <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Notify me when probability
            </span>
            <Button
              type="button"
              variant="outline"
              className={
                direction === "above"
                  ? "w-full justify-start border-primary bg-primary/5"
                  : "w-full justify-start"
              }
              onClick={() => setDirection("above")}
            >
              ▲ Rises above
            </Button>
            <Button
              type="button"
              variant="outline"
              className={
                direction === "below"
                  ? "w-full justify-start border-primary bg-primary/5"
                  : "w-full justify-start"
              }
              onClick={() => setDirection("below")}
            >
              ▼ Falls below
            </Button>
          </div>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">Threshold (%)</span>
            <Input
              type="number"
              min={1}
              max={99}
              value={thresholdPct}
              onChange={(event) => setThresholdPct(Number(event.target.value))}
            />
            <span className="text-xs text-muted-foreground">
              Alert when probability{" "}
              {direction === "above" ? "rises to or above" : "falls to or below"} {pct(threshold)}.
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={create}>
            Create alert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
