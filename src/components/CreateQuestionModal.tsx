import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Category, SourceClass, Visibility } from "../domain/types";
import { findSimilarQuestions, type EvidenceDraft } from "../domain/generateQuestion";
import { questions as seedQuestions } from "../domain/seed";
import { useStore } from "../store";
import CategoryPicker from "./CategoryPicker";
import VisibilityPicker from "./VisibilityPicker";
import { IconPlus } from "./icons";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";

const SOURCE_CLASSES: { value: SourceClass; label: string }[] = [
  { value: "org_internal", label: "Internal" },
  { value: "gov_stats", label: "Government stats" },
  { value: "central_bank", label: "Central bank" },
  { value: "market_data", label: "Market data" },
  { value: "nowcasting", label: "Nowcasting" },
  { value: "corporate_demand", label: "Corporate / primary" },
  { value: "fast_feed", label: "News / fast feed" },
];

const STEPS = [
  { title: "Question" },
  { title: "Classification" },
  { title: "Resolution & evidence" },
] as const;

const emptyEvidence = (): EvidenceDraft => ({
  title: "",
  url: "",
  sourceClass: "org_internal",
});

interface FormState {
  title: string;
  description: string;
  resolutionCriteria: string;
  resolutionSource: string;
  resolutionDate: string;
  impactEstimate: string;
  category: Category;
  visibility: Visibility;
  evidence: EvidenceDraft[];
}

const defaultForm = (category: Category = "Operational"): FormState => ({
  title: "",
  description: "",
  resolutionCriteria: "",
  resolutionSource: "",
  resolutionDate: "",
  impactEstimate: "",
  category,
  visibility: "public",
  evidence: [emptyEvidence()],
});

function IconArrow({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    >
      {direction === "left" ? (
        <>
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </>
      ) : (
        <>
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </>
      )}
    </svg>
  );
}

export default function CreateQuestionModal({
  open,
  onClose,
  defaultCategory,
}: {
  open: boolean;
  onClose: () => void;
  defaultCategory?: Category;
}) {
  const navigate = useNavigate();
  const { startForecastJob, user } = useStore();
  const [form, setForm] = useState<FormState>(() => defaultForm());
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [similarDismissed, setSimilarDismissed] = useState(false);

  const similar = useMemo(() => findSimilarQuestions(form.title, seedQuestions, 12), [form.title]);

  const showSimilar =
    step === 0 && form.title.trim().length >= 3 && !similarDismissed && similar.length > 0;

  useEffect(() => {
    if (!open) return;
    setForm(defaultForm(defaultCategory));
    setStep(0);
    setSubmitting(false);
    setSimilarDismissed(false);
  }, [open, defaultCategory]);

  useEffect(() => {
    setSimilarDismissed(false);
  }, [form.title]);

  useEffect(() => {
    if (!open) return;
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
  }, [open, onClose]);

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const step0Complete = form.title.trim().length >= 5 && form.description.trim().length > 0;
  const step1Complete = form.impactEstimate.trim().length > 0;
  const step2Complete =
    form.resolutionCriteria.trim().length > 0 &&
    form.resolutionSource.trim().length > 0 &&
    form.resolutionDate.trim().length > 0;
  const stepComplete = [step0Complete, step1Complete, step2Complete][step];
  const canSubmit = step0Complete && step1Complete && step2Complete && !submitting;
  const canGoNext = stepComplete;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateEvidence = (index: number, patch: Partial<EvidenceDraft>) => {
    setForm((prev) => ({
      ...prev,
      evidence: prev.evidence.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  };

  const addEvidenceRow = () => {
    setForm((prev) => ({ ...prev, evidence: [...prev.evidence, emptyEvidence()] }));
  };

  const removeEvidenceRow = (index: number) => {
    setForm((prev) => ({
      ...prev,
      evidence:
        prev.evidence.length <= 1 ? [emptyEvidence()] : prev.evidence.filter((_, i) => i !== index),
    }));
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));
  const goNext = () => {
    if (!canGoNext) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const job = startForecastJob({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      resolutionCriteria: form.resolutionCriteria.trim() || undefined,
      resolutionSource: form.resolutionSource.trim() || undefined,
      resolutionDate: form.resolutionDate.trim() || undefined,
      impactEstimate: form.impactEstimate.trim() || undefined,
      category: form.category,
      visibility: form.visibility,
      evidence: form.evidence.filter((e) => e.title.trim()),
    });
    onClose();
    navigate(`/forecast/${job.id}/processing`);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader className="px-2 pt-2 pr-10">
          <DialogTitle>Create a forecast</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 px-2" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span
              key={s.title}
              className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>

        <div className="space-y-5 px-2 py-3">
          {step === 0 && (
            <>
              <label className="grid gap-1.5 text-sm font-medium">
                <span>Question title</span>
                <Input
                  type="text"
                  placeholder="Will the Fed cut rates at the September meeting?"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  autoFocus
                />
              </label>

              {showSimilar && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">Similar existing questions</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label="Dismiss similar questions"
                      onClick={() => setSimilarDismissed(true)}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                      >
                        <line x1="6" y1="6" x2="18" y2="18" />
                        <line x1="18" y1="6" x2="6" y2="18" />
                      </svg>
                    </Button>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {similar.map((q) => (
                      <li key={q.id}>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-auto w-full justify-between whitespace-normal px-2 py-2 text-left"
                          onClick={() => navigate(`/q/${q.id}`)}
                        >
                          <span>{q.title}</span>
                          <span className="text-muted-foreground" aria-hidden="true">
                            ›
                          </span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <label className="grid gap-1.5 text-sm font-medium">
                <span>Description</span>
                <Textarea
                  placeholder="What exactly must happen, by when, and under what conditions?"
                  rows={4}
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                />
              </label>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-1.5 text-sm font-medium">
                  <span>Category</span>
                  <CategoryPicker value={form.category} onChange={(c) => update("category", c)} />
                </div>
                <div className="grid gap-1.5 text-sm font-medium">
                  <span>Visibility</span>
                  <VisibilityPicker
                    value={form.visibility}
                    owningTeam={user.team}
                    onChange={(v) => update("visibility", v)}
                  />
                </div>
              </div>

              <label className="grid gap-1.5 text-sm font-medium">
                <span>Impact if true</span>
                <Input
                  type="text"
                  placeholder="e.g. ~$30M revenue at risk"
                  value={form.impactEstimate}
                  onChange={(e) => update("impactEstimate", e.target.value)}
                  autoFocus
                />
              </label>
            </>
          )}

          {step === 2 && (
            <>
              <label className="grid gap-1.5 text-sm font-medium">
                <span>Resolution criteria</span>
                <Textarea
                  placeholder="How will this resolve YES or NO? Cite observable thresholds and authoritative sources."
                  rows={3}
                  value={form.resolutionCriteria}
                  onChange={(e) => update("resolutionCriteria", e.target.value)}
                  autoFocus
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium">
                  <span>Resolution source</span>
                  <Input
                    type="text"
                    placeholder="e.g. FOMC statement, SEC EDGAR"
                    value={form.resolutionSource}
                    onChange={(e) => update("resolutionSource", e.target.value)}
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  <span>Resolution date</span>
                  <Input
                    type="date"
                    value={form.resolutionDate}
                    onChange={(e) => update("resolutionDate", e.target.value)}
                  />
                </label>
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Evidence sources</span>
                  <Button type="button" variant="outline" size="sm" onClick={addEvidenceRow}>
                    Add source
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.evidence.map((row, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_10rem_auto]">
                      <Input
                        type="text"
                        placeholder="Source title"
                        value={row.title}
                        onChange={(e) => updateEvidence(index, { title: e.target.value })}
                      />
                      <Input
                        type="url"
                        placeholder="URL (optional)"
                        value={row.url ?? ""}
                        onChange={(e) => updateEvidence(index, { url: e.target.value })}
                      />
                      <Select
                        value={row.sourceClass ?? "org_internal"}
                        onValueChange={(value) =>
                          updateEvidence(index, { sourceClass: value as SourceClass })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SOURCE_CLASSES.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 text-destructive hover:text-destructive"
                        aria-label="Remove evidence source"
                        onClick={() => removeEvidenceRow(index)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        <DialogFooter className="flex items-center justify-between">
          {!isFirst ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Previous step"
              onClick={goBack}
            >
              <IconArrow direction="left" />
            </Button>
          ) : (
            <span aria-hidden="true" />
          )}

          {isLast ? (
            <Button type="button" className="min-w-36" disabled={!canSubmit} onClick={handleSubmit}>
              {submitting ? "Creating…" : "Create forecast"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Next step"
              disabled={!canGoNext}
              onClick={goNext}
            >
              <IconArrow direction="right" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AddQuestionButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" onClick={onClick}>
      <IconPlus />
      Add Question
    </Button>
  );
}
