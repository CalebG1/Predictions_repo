import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { EVIDENCE_RELATIONSHIP_LABELS } from "../../domain/assumptions";
import type { AssumptionEvidenceRelationship, EvidenceSource, QuestionAssumption } from "../../domain/types";
import { useStore } from "../../store";
import { IconTrash } from "../icons";

const RELATIONSHIPS: AssumptionEvidenceRelationship[] = ["supports", "contradicts", "context"];

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
  const { assumptionEvidenceLinksFor, linkEvidenceToAssumption, unlinkAssumptionEvidence, addEvidenceAndLinkToAssumption } =
    useStore();

  const [pickId, setPickId] = useState("");
  const [pickRelationship, setPickRelationship] = useState<AssumptionEvidenceRelationship>("supports");
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newRelationship, setNewRelationship] = useState<AssumptionEvidenceRelationship>("supports");
  const [addingNew, setAddingNew] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPickId("");
    setPickRelationship("supports");
    setNewTitle("");
    setNewBody("");
    setNewRelationship("supports");
    setAddingNew(false);
  }, [open, assumption?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const links = assumption ? assumptionEvidenceLinksFor(assumption.id) : [];
  const linkedIds = useMemo(() => new Set(links.map((l) => l.evidenceId)), [links]);
  const linkable = evidence.filter((e) => !linkedIds.has(e.id));

  if (!open || !assumption) return null;

  return createPortal(
    <div className="asrc-overlay" onMouseDown={onClose}>
      <div
        className="asrc-modal assump-evidence-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Manage evidence"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="asrc-head">
          <h2 className="asrc-title">Evidence for this assumption</h2>
          <button type="button" className="asrc-close" aria-label="Close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </header>

        <div className="asrc-body assump-evidence-body">
          <p className="assump-statement-preview muted small">{assumption.statement}</p>

          <section>
            <h4 className="assump-evidence-section-head">Linked evidence</h4>
            {links.length === 0 ? (
              <p className="muted small">No evidence linked to this assumption yet.</p>
            ) : (
              <ul className="assump-evidence-linked-list">
                {links.map((l) => {
                  const source = evidence.find((e) => e.id === l.evidenceId);
                  return (
                    <li key={l.id} className="assump-evidence-linked-row">
                      <div>
                        <span className="assump-evidence-title">{source?.title ?? l.evidenceId}</span>
                        <span className={`assump-pill assump-relationship-${l.relationship}`}>
                          {EVIDENCE_RELATIONSHIP_LABELS[l.relationship]}
                        </span>
                        {l.note && <p className="muted small assump-evidence-note">{l.note}</p>}
                      </div>
                      <button
                        type="button"
                        className="evidence-delete-btn"
                        aria-label="Remove link"
                        title="Remove link"
                        onClick={() => unlinkAssumptionEvidence(l.id)}
                      >
                        <IconTrash />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {linkable.length > 0 && (
            <section>
              <h4 className="assump-evidence-section-head">Link existing evidence</h4>
              <div className="assump-evidence-picker">
                <select value={pickId} onChange={(e) => setPickId(e.target.value)} aria-label="Choose evidence">
                  <option value="">Choose a source…</option>
                  {linkable.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>
                <select
                  value={pickRelationship}
                  onChange={(e) => setPickRelationship(e.target.value as AssumptionEvidenceRelationship)}
                  aria-label="Relationship"
                >
                  {RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>
                      {EVIDENCE_RELATIONSHIP_LABELS[r]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={!pickId}
                  onClick={() => {
                    linkEvidenceToAssumption(assumption.id, pickId, pickRelationship);
                    setPickId("");
                  }}
                >
                  Link
                </button>
              </div>
            </section>
          )}

          <section>
            {addingNew ? (
              <>
                <h4 className="assump-evidence-section-head">Add new evidence</h4>
                <label className="assump-field">
                  <span className="assump-field-label">Title</span>
                  <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Source title" />
                </label>
                <label className="assump-field">
                  <span className="assump-field-label">Details</span>
                  <textarea
                    rows={2}
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    placeholder="What does this evidence show?"
                  />
                </label>
                <div className="assump-evidence-picker">
                  <select
                    value={newRelationship}
                    onChange={(e) => setNewRelationship(e.target.value as AssumptionEvidenceRelationship)}
                    aria-label="Relationship"
                  >
                    {RELATIONSHIPS.map((r) => (
                      <option key={r} value={r}>
                        {EVIDENCE_RELATIONSHIP_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="qcomment-action" onClick={() => setAddingNew(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={!newTitle.trim() || !newBody.trim()}
                    onClick={() => {
                      addEvidenceAndLinkToAssumption(
                        questionId,
                        assumption.id,
                        { title: newTitle, body: newBody },
                        newRelationship
                      );
                      setNewTitle("");
                      setNewBody("");
                      setAddingNew(false);
                    }}
                  >
                    Add & link
                  </button>
                </div>
              </>
            ) : (
              <button type="button" className="qcomment-action" onClick={() => setAddingNew(true)}>
                + Add new evidence source
              </button>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
}
