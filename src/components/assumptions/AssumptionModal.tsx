import { useEffect, useState } from "react";
import { ASSUMPTION_CONFIDENCE_LABELS } from "../../domain/assumptions";
import type { AssumptionConfidence, QuestionAssumption } from "../../domain/types";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const CONFIDENCE_OPTIONS: AssumptionConfidence[] = ["low", "medium", "high"];

export default function AssumptionModal({
  open,
  assumption,
  onClose,
  onCreate,
  onSave,
}: {
  open: boolean;
  assumption: QuestionAssumption | null;
  onClose: () => void;
  onCreate?: (input: {
    statement: string;
    rationale?: string;
    confidence?: AssumptionConfidence;
  }) => void;
  onSave?: (patch: {
    statement: string;
    rationale?: string;
    confidence?: AssumptionConfidence;
  }) => void;
}) {
  const [statement, setStatement] = useState("");
  const [rationale, setRationale] = useState("");
  const [confidence, setConfidence] = useState<AssumptionConfidence | "">("");

  useEffect(() => {
    if (!open) return;
    setStatement(assumption?.statement ?? "");
    setRationale(assumption?.rationale ?? "");
    setConfidence(assumption?.confidence ?? "");
  }, [open, assumption]);

  const submit = () => {
    const trimmed = statement.trim();
    if (!trimmed) return;
    const patch = {
      statement: trimmed,
      rationale: rationale.trim() || undefined,
      confidence: confidence || undefined,
    };
    if (assumption) onSave?.(patch);
    else onCreate?.(patch);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="min-w-lg" showCloseButton>
        <DialogHeader className="px-6 pt-6 pr-12">
          <DialogTitle>{assumption ? "Edit assumption" : "Add local assumption"}</DialogTitle>
          <DialogDescription>
            Capture a belief that informs this forecast. You can add evidence and publish it for
            review afterward.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 px-6">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">Assumption</span>
            <Textarea
              rows={3}
              autoFocus
              placeholder="e.g. The vendor will complete its security remediation before the renewal deadline."
              value={statement}
              onChange={(event) => setStatement(event.target.value)}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">
              Rationale <span className="font-normal text-muted-foreground">(optional)</span>
            </span>
            <Textarea
              rows={3}
              placeholder="Why do you believe this?"
              value={rationale}
              onChange={(event) => setRationale(event.target.value)}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">
              Confidence <span className="font-normal text-muted-foreground">(optional)</span>
            </span>
            <Select
              value={confidence || null}
              onValueChange={(value) => setConfidence((value ?? "") as AssumptionConfidence | "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                {CONFIDENCE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {ASSUMPTION_CONFIDENCE_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!statement.trim()} onClick={submit}>
            {assumption ? "Save changes" : "Add assumption"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
