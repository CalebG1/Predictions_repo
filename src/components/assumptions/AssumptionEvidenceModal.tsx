import { useEffect, useMemo, useState } from "react";
import { EVIDENCE_RELATIONSHIP_LABELS } from "../../domain/assumptions";
import type {
  AssumptionEvidenceRelationship,
  EvidenceSource,
  QuestionAssumption,
} from "../../domain/types";
import { useStore } from "../../store";
import { IconTrash } from "../icons";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";

const RELATIONSHIPS: AssumptionEvidenceRelationship[] = ["supports", "contradicts", "context"];
function RelationshipSelect({
  value,
  onChange,
}: {
  value: AssumptionEvidenceRelationship;
  onChange: (value: AssumptionEvidenceRelationship) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as AssumptionEvidenceRelationship)}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RELATIONSHIPS.map((relationship) => (
          <SelectItem key={relationship} value={relationship}>
            {EVIDENCE_RELATIONSHIP_LABELS[relationship]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function AssumptionEvidenceModal({
  open,
  assumption,
  questionId,
  evidence,
  onClose,
}: {
  open: boolean;
  assumption: QuestionAssumption | null;
  questionId: string;
  evidence: EvidenceSource[];
  onClose: () => void;
}) {
  const {
    assumptionEvidenceLinksFor,
    linkEvidenceToAssumption,
    unlinkAssumptionEvidence,
    addEvidenceAndLinkToAssumption,
  } = useStore();
  const [pickId, setPickId] = useState("");
  const [pickRelationship, setPickRelationship] =
    useState<AssumptionEvidenceRelationship>("supports");
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newRelationship, setNewRelationship] =
    useState<AssumptionEvidenceRelationship>("supports");
  const [addingNew, setAddingNew] = useState(false);
  useEffect(() => {
    if (open) {
      setPickId("");
      setPickRelationship("supports");
      setNewTitle("");
      setNewBody("");
      setNewRelationship("supports");
      setAddingNew(false);
    }
  }, [open, assumption?.id]);
  const links = assumption ? assumptionEvidenceLinksFor(assumption.id) : [];
  const linkable = useMemo(
    () => evidence.filter((item) => !new Set(links.map((link) => link.evidenceId)).has(item.id)),
    [evidence, links],
  );
  if (!assumption) return null;
  const add = () => {
    addEvidenceAndLinkToAssumption(
      questionId,
      assumption.id,
      { title: newTitle, body: newBody },
      newRelationship,
    );
    setNewTitle("");
    setNewBody("");
    setAddingNew(false);
  };
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[85vh] gap-5 overflow-y-auto bg-card p-0 sm:max-w-2xl">
        <DialogHeader className="px-6 pt-6 pr-12">
          <DialogTitle>Evidence for this assumption</DialogTitle>
          <DialogDescription>Link existing sources or add a new evidence source.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 px-6">
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            {assumption.statement}
          </p>
          <section className="space-y-2">
            <h3 className="text-sm font-medium">Linked evidence</h3>
            {links.length === 0 ? (
              <p className="text-sm text-muted-foreground">No evidence linked yet.</p>
            ) : (
              <ul className="space-y-2">
                {links.map((link) => (
                  <li
                    key={link.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="grid gap-1">
                      <span className="font-medium">
                        {evidence.find((item) => item.id === link.evidenceId)?.title ??
                          link.evidenceId}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {EVIDENCE_RELATIONSHIP_LABELS[link.relationship]}
                      </span>
                      {link.note && (
                        <span className="text-xs text-muted-foreground">{link.note}</span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove link"
                      onClick={() => unlinkAssumptionEvidence(link.id)}
                    >
                      <IconTrash />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {linkable.length > 0 && (
            <section className="grid gap-2">
              <h3 className="text-sm font-medium">Link existing evidence</h3>
              <div className="flex flex-wrap gap-2">
                <Select value={pickId} onValueChange={(value) => setPickId(value ?? "")}>
                  <SelectTrigger className="min-w-56 flex-1">
                    <SelectValue placeholder="Choose a source" />
                  </SelectTrigger>
                  <SelectContent>
                    {linkable.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <RelationshipSelect value={pickRelationship} onChange={setPickRelationship} />
                <Button
                  type="button"
                  disabled={!pickId}
                  onClick={() => {
                    linkEvidenceToAssumption(assumption.id, pickId, pickRelationship);
                    setPickId("");
                  }}
                >
                  Link
                </Button>
              </div>
            </section>
          )}
          <section className="grid gap-3">
            {addingNew ? (
              <>
                <h3 className="text-sm font-medium">Add new evidence</h3>
                <Input
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  placeholder="Source title"
                />
                <Textarea
                  rows={3}
                  value={newBody}
                  onChange={(event) => setNewBody(event.target.value)}
                  placeholder="What does this evidence show?"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <RelationshipSelect value={newRelationship} onChange={setNewRelationship} />
                  <Button type="button" variant="outline" onClick={() => setAddingNew(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={!newTitle.trim() || !newBody.trim()}
                    onClick={add}
                  >
                    Add and link
                  </Button>
                </div>
              </>
            ) : (
              <Button type="button" variant="outline" onClick={() => setAddingNew(true)}>
                Add new evidence source
              </Button>
            )}
          </section>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
