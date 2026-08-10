import { useEffect, useState } from "react";
import type { QuestionAssumption } from "../../domain/types";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";

type PublishTarget = "viewing" | "default";
const OPTIONS: { id: PublishTarget; title: string; description: string }[] = [
  {
    id: "viewing",
    title: "Publish for viewing",
    description: "Share on your personal perspective so others on this question can read it.",
  },
  {
    id: "default",
    title: "Request for default",
    description: "Propose this assumption for the team's shared working view.",
  },
];

export default function PublishAssumptionModal({
  open,
  assumption,
  onClose,
  onSubmit,
}: {
  open: boolean;
  assumption: QuestionAssumption | null;
  onClose: () => void;
  onSubmit: (target: PublishTarget, rationale?: string) => void;
}) {
  const [target, setTarget] = useState<PublishTarget>("viewing");
  const [rationale, setRationale] = useState("");
  useEffect(() => {
    if (open) {
      setTarget("viewing");
      setRationale("");
    }
  }, [open, assumption?.id]);
  if (!assumption) return null;
  const submit = () => {
    onSubmit(target, rationale.trim() || undefined);
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="gap-5 bg-card p-0 sm:max-w-xl">
        <DialogHeader className="px-6 pt-6 pr-12">
          <DialogTitle>Publish assumption</DialogTitle>
          <DialogDescription>
            Choose how this assumption should be shared for review.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6">
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            {assumption.statement}
          </p>
          <div className="space-y-2" role="radiogroup" aria-label="Publish destination">
            {OPTIONS.map((option) => (
              <Button
                key={option.id}
                type="button"
                variant="outline"
                className={`h-auto w-full justify-start p-3 text-left ${target === option.id ? "border-primary bg-primary/5" : ""}`}
                onClick={() => setTarget(option.id)}
              >
                <span className="grid gap-1">
                  <span>{option.title}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </Button>
            ))}
          </div>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">
              Note for reviewer{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </span>
            <Textarea
              rows={3}
              placeholder="Add context for the person reviewing this request…"
              value={rationale}
              onChange={(event) => setRationale(event.target.value)}
            />
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={submit}>
            Submit for review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
