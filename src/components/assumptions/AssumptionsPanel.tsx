import { Fragment, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  ASSUMPTION_CONFIDENCE_LABELS,
  ASSUMPTION_CHANGE_LABELS,
  ASSUMPTION_STATUS_LABELS,
  buildPerspectiveOptions,
  canApproveProposals,
  canEditAssumption,
  evidenceSignalSummary,
  localPerspectiveId,
  personPerspectiveId,
  perspectiveType,
  type AssumptionPerspectiveOption,
} from "../../domain/assumptions";
import type {
  AssumptionProposal,
  AssumptionStatus,
  EvidenceSource,
  ForecastQuestion,
  QuestionAssumption,
} from "../../domain/types";
import { useStore } from "../../store";
import { IconPlus, IconTrash } from "../icons";
import AssumptionModal from "./AssumptionModal";
import AssumptionEvidenceModal from "./AssumptionEvidenceModal";
import PublishAssumptionModal from "./PublishAssumptionModal";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function statusRelClass(status: AssumptionStatus): string {
  if (status === "active") return "rel-high";
  if (status === "pending_review") return "rel-medium";
  if (status === "uncertain") return "rel-medium";
  return "rel-low";
}

function PerspectiveSelect({
  options,
  value,
  onChange,
}: {
  options: AssumptionPerspectiveOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.id === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const groups: AssumptionPerspectiveOption["group"][] = ["Private", "Team", "People"];

  return (
    <div className="assump-perspective-picker" ref={ref}>
      <button
        type="button"
        className="ctx-secondary-btn evidence-add-btn assump-perspective-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {current?.name ?? "Select view"}
      </button>
      {open && (
        <div className="assump-perspective-menu" role="listbox">
          {groups.map((group) => {
            const inGroup = options.filter((o) => o.group === group);
            if (inGroup.length === 0) return null;
            return (
              <div className="assump-perspective-group" key={group}>
                <span className="assump-perspective-group-label">{group}</span>
                {inGroup.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={opt.id === value}
                    className={`assump-perspective-item${opt.id === value ? " active" : ""}`}
                    onClick={() => {
                      onChange(opt.id);
                      setOpen(false);
                    }}
                  >
                    <span>{opt.name}</span>
                    <span className="muted small">{opt.count}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusSelect({
  value,
  editable,
  onChange,
}: {
  value: AssumptionStatus;
  editable: boolean;
  onChange: (status: AssumptionStatus) => void;
}) {
  const rel = statusRelClass(value);
  if (!editable) {
    return <span className={`evidence-relevance-select ${rel}`}>{ASSUMPTION_STATUS_LABELS[value]}</span>;
  }
  const editableStatuses = (Object.keys(ASSUMPTION_STATUS_LABELS) as AssumptionStatus[]).filter(
    (s) => s !== "pending_review"
  );
  return (
    <select
      className={`evidence-relevance-select ${rel}`}
      value={value}
      aria-label="Assumption status"
      onChange={(e) => onChange(e.target.value as AssumptionStatus)}
    >
      {editableStatuses.map((s) => (
        <option key={s} value={s}>
          {ASSUMPTION_STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}

function DiscussionThread({ assumptionId }: { assumptionId: string }) {
  const { assumptionNotesFor, addAssumptionNote } = useStore();
  const notes = assumptionNotesFor(assumptionId);
  const [draft, setDraft] = useState("");
  const [markChallenge, setMarkChallenge] = useState(false);

  const submit = () => {
    if (!draft.trim()) return;
    addAssumptionNote(assumptionId, draft, markChallenge);
    setDraft("");
    setMarkChallenge(false);
  };

  return (
    <div className="assump-discussion">
      {notes.length === 0 ? (
        <p className="muted small assump-discussion-empty">No discussion yet.</p>
      ) : (
        <ul className="assump-discussion-list">
          {notes.map((n) => (
            <li key={n.id} className="assump-note">
              <div className="assump-note-meta">
                <span className="assump-note-author">{n.authorName}</span>
                {n.isChallenge && <span className="assump-tag assump-tag-challenged">Challenge</span>}
                <time className="muted small">{fmtDate(n.createdAt)}</time>
              </div>
              <p className="assump-note-body">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="assump-discussion-form">
        <textarea
          className="qcomments-input"
          rows={2}
          placeholder="Add a note or challenge this assumption…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Discussion note"
        />
        <div className="assump-discussion-actions">
          <label className="assump-checkbox-label">
            <input type="checkbox" checked={markChallenge} onChange={(e) => setMarkChallenge(e.target.checked)} />
            Mark as challenge
          </label>
          <button type="button" className="btn btn-sm" disabled={!draft.trim()} onClick={submit}>
            Post
          </button>
        </div>
      </div>
    </div>
  );
}

function InlineComposeRow({
  placeholder,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  submitLabel: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="assump-inline-compose">
      <textarea
        className="qcomments-input"
        rows={2}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
        aria-label={placeholder}
      />
      <div className="assump-inline-compose-actions">
        <button type="button" className="qcomment-action" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-sm" onClick={() => onSubmit(text)}>
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

function AssumptionRow({
  assumption,
  question,
  kind,
  allAssumptions,
  onEdit,
  onManageEvidence,
  onPublish,
}: {
  assumption: QuestionAssumption;
  question: ForecastQuestion;
  kind: "own-local" | "shared" | "own-person" | "other-person";
  allAssumptions: QuestionAssumption[];
  onEdit: (a: QuestionAssumption) => void;
  onManageEvidence: (a: QuestionAssumption) => void;
  onPublish: (a: QuestionAssumption) => void;
}) {
  const {
    user,
    allUsers,
    updateAssumption,
    deleteAssumption,
    unshareAssumption,
    copyAssumptionToLocal,
    proposeArchiveSharedAssumption,
    assumptionEvidenceLinksFor,
    assumptionProposalsFor,
  } = useStore();

  const [discussionOpen, setDiscussionOpen] = useState(false);
  const [archiveProposeOpen, setArchiveProposeOpen] = useState(false);

  const author = allUsers.find((u) => u.id === assumption.createdBy);
  const links = assumptionEvidenceLinksFor(assumption.id);
  const proposals = assumptionProposalsFor(question.id);
  const editable = kind === "own-local" && canEditAssumption(user, assumption);

  const sharedCopy =
    kind === "own-local"
      ? allAssumptions.find(
          (a) => a.originAssumptionId === assumption.id && perspectiveType(a.perspectiveId) === "person"
        )
      : undefined;

  const pendingArchiveProposal =
    kind === "shared"
      ? proposals.find(
          (p) => p.changeType === "archive" && p.targetAssumptionId === assumption.id && p.status === "pending"
        )
      : undefined;

  const isPendingReview = assumption.status === "pending_review";

  const stop = (e: MouseEvent) => e.stopPropagation();
  const subtitleParts = [author?.name ?? "Unknown"];
  if (assumption.confidence) subtitleParts.push(ASSUMPTION_CONFIDENCE_LABELS[assumption.confidence]);
  if (assumption.rationale) subtitleParts.push(assumption.rationale);

  const expanded = discussionOpen || archiveProposeOpen;

  const openEdit = () => {
    if (editable) onEdit(assumption);
  };

  return (
    <Fragment>
      <tr
        className={`assump-row${editable ? " evidence-row" : ""}`}
        tabIndex={editable ? 0 : undefined}
        role={editable ? "button" : undefined}
        aria-label={editable ? `Edit assumption: ${assumption.statement}` : undefined}
        onClick={editable ? openEdit : undefined}
        onKeyDown={
          editable
            ? (ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  openEdit();
                }
              }
            : undefined
        }
      >
        <td className="evidence-cell-source">
          <div className="evidence-source-main">
            <span className="evidence-source-title">{assumption.statement}</span>
            {pendingArchiveProposal && <span className="assump-tag assump-tag-pending">Archive pending</span>}
          </div>
          <span className="evidence-source-sub">
            {subtitleParts.join(" · ")} ·{" "}
            <button
              type="button"
              className="assump-inline-link"
              onClick={(e) => {
                e.stopPropagation();
                setDiscussionOpen((o) => !o);
              }}
            >
              {discussionOpen ? "Hide discussion" : "Discuss"}
            </button>
          </span>
        </td>

        <td className="evidence-cell-relevance" onClick={stop}>
          <StatusSelect
            value={assumption.status}
            editable={kind === "own-local" && !isPendingReview}
            onChange={(status) => updateAssumption(assumption.id, { status })}
          />
        </td>

        <td className="assump-cell-evidence" onClick={stop}>
          <button type="button" className="assump-evidence-link" onClick={() => onManageEvidence(assumption)}>
            {evidenceSignalSummary(links)}
          </button>
        </td>

        <td className="assump-cell-publish" onClick={stop}>
          {kind === "own-local" && (
            <div className="assump-publish-cell">
              {isPendingReview ? (
                <button type="button" className="assump-publish-btn" disabled title="Awaiting review">
                  Pending review
                </button>
              ) : sharedCopy ? (
                <button
                  type="button"
                  className="assump-publish-btn is-published"
                  title="Remove from your shared perspective"
                  onClick={() => unshareAssumption(assumption.id)}
                >
                  Unpublish
                </button>
              ) : (
                <button
                  type="button"
                  className="assump-publish-btn"
                  title="Submit this assumption for review"
                  onClick={() => onPublish(assumption)}
                >
                  Publish
                </button>
              )}
            </div>
          )}
          {kind === "own-person" && assumption.originAssumptionId && (
            <button
              type="button"
              className="assump-publish-btn is-published"
              title="Remove from your shared perspective"
              onClick={() => unshareAssumption(assumption.originAssumptionId!)}
            >
              Unpublish
            </button>
          )}
          {kind === "shared" && (
            <div className="assump-publish-cell">
              {!pendingArchiveProposal && (
                <button type="button" className="assump-inline-link" onClick={() => setArchiveProposeOpen(true)}>
                  Propose archive
                </button>
              )}
              <button type="button" className="assump-inline-link" onClick={() => copyAssumptionToLocal(assumption.id)}>
                Copy to my view
              </button>
            </div>
          )}
          {kind === "other-person" && (
            <button type="button" className="assump-inline-link" onClick={() => copyAssumptionToLocal(assumption.id)}>
              Copy to my view
            </button>
          )}
        </td>

        <td className="evidence-cell-date">{fmtDate(assumption.updatedAt)}</td>

        <td className="evidence-cell-actions" onClick={stop}>
          {kind === "own-local" && (
            <button
              type="button"
              className="evidence-delete-btn"
              onClick={() => deleteAssumption(assumption.id)}
              aria-label={`Delete assumption: ${assumption.statement}`}
              title="Delete"
            >
              <IconTrash />
            </button>
          )}
        </td>
      </tr>

      {expanded && (
        <tr className="assump-row-expanded">
          <td colSpan={6}>
            {archiveProposeOpen && (
              <InlineComposeRow
                placeholder="Why should this be archived?"
                submitLabel="Submit proposal"
                onCancel={() => setArchiveProposeOpen(false)}
                onSubmit={(text) => {
                  proposeArchiveSharedAssumption(assumption.id, text);
                  setArchiveProposeOpen(false);
                }}
              />
            )}
            {discussionOpen && <DiscussionThread assumptionId={assumption.id} />}
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function ProposalRow({ proposal, question }: { proposal: AssumptionProposal; question: ForecastQuestion }) {
  const { user, allUsers, approveAssumptionProposal, rejectAssumptionProposal, assumptionsFor } = useStore();
  const [note, setNote] = useState("");
  const proposer = allUsers.find((u) => u.id === proposal.proposedBy);
  const canDecide = canApproveProposals(user, question);
  const target =
    proposal.changeType === "archive"
      ? assumptionsFor(question.id).find((a) => a.id === proposal.targetAssumptionId)
      : undefined;

  return (
    <li className="assump-proposal-row">
      <div className="assump-proposal-main">
        <span className="assump-tag assump-tag-pending">{ASSUMPTION_CHANGE_LABELS[proposal.changeType]}</span>
        <p className="assump-proposal-statement">
          {proposal.changeType === "add" ? proposal.proposedStatement : target?.statement}
        </p>
      </div>
      <p className="muted small">
        Proposed by {proposer?.name ?? "Unknown"} · {fmtDate(proposal.proposedAt)}
        {proposal.rationale ? ` — "${proposal.rationale}"` : ""}
      </p>
      {canDecide && (
        <div className="assump-proposal-decide">
          <input
            className="assump-decision-note"
            placeholder="Optional decision note…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-label="Decision note"
          />
          <button type="button" className="btn btn-sm" onClick={() => approveAssumptionProposal(proposal.id, note)}>
            Approve
          </button>
          <button type="button" className="qcomment-action" onClick={() => rejectAssumptionProposal(proposal.id, note)}>
            Reject
          </button>
        </div>
      )}
    </li>
  );
}

export default function AssumptionsPanel({
  questionId,
  question,
  evidence,
}: {
  questionId: string;
  question: ForecastQuestion;
  evidence: EvidenceSource[];
}) {
  const {
    user,
    allUsers,
    assumptionsFor,
    addAssumption,
    updateAssumption,
    assumptionProposalsFor,
    canApproveAssumptionProposals,
    requestAssumptionPublish,
  } = useStore();

  const allAssumptions = assumptionsFor(questionId);
  const [selectedPerspectiveId, setSelectedPerspectiveId] = useState(() => localPerspectiveId(questionId, user.id));
  const [modalTarget, setModalTarget] = useState<QuestionAssumption | "new" | null>(null);
  const [publishModalTarget, setPublishModalTarget] = useState<QuestionAssumption | null>(null);
  const [evidenceModalTarget, setEvidenceModalTarget] = useState<QuestionAssumption | null>(null);

  const options = useMemo(
    () => buildPerspectiveOptions(questionId, user, allUsers, allAssumptions),
    [questionId, user, allUsers, allAssumptions]
  );

  const kind: "own-local" | "shared" | "own-person" | "other-person" = useMemo(() => {
    const t = perspectiveType(selectedPerspectiveId);
    if (t === "local") return "own-local";
    if (t === "shared") return "shared";
    return selectedPerspectiveId === personPerspectiveId(questionId, user.id) ? "own-person" : "other-person";
  }, [selectedPerspectiveId, questionId, user.id]);

  const rows = useMemo(
    () =>
      allAssumptions
        .filter((a) => a.perspectiveId === selectedPerspectiveId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [allAssumptions, selectedPerspectiveId]
  );

  const proposals = assumptionProposalsFor(questionId);
  const pendingProposals = proposals.filter((p) => p.status === "pending");
  const canApprove = canApproveAssumptionProposals(question);
  const isSharedView = kind === "shared";

  return (
    <div className="panel evidence-table-panel assump-panel">
      <div className="evidence-table-head">
        <h4>Assumptions</h4>
        <div className="assump-head-actions">
          <PerspectiveSelect options={options} value={selectedPerspectiveId} onChange={setSelectedPerspectiveId} />
          {kind === "own-local" && (
            <button type="button" className="ctx-primary-btn evidence-add-btn" onClick={() => setModalTarget("new")}>
              <IconPlus />
              Add assumption
            </button>
          )}
        </div>
      </div>

      {isSharedView && pendingProposals.length > 0 && (
        <div className="assump-proposals">
          <h5>
            Pending proposals ({pendingProposals.length})
            {!canApprove && <span className="muted small"> — awaiting review</span>}
          </h5>
          <ul className="assump-proposals-list">
            {pendingProposals.map((p) => (
              <ProposalRow key={p.id} proposal={p} question={question} />
            ))}
          </ul>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="muted evidence-table-empty">
          {kind === "own-local"
            ? "Make the beliefs behind your forecast explicit. Your local assumptions are private until you choose to share or propose them."
            : "This perspective does not have any assumptions yet."}
        </p>
      ) : (
        <div className="evidence-table-wrap">
          <table className="evidence-table assump-table">
            <thead>
              <tr>
                <th>Assumption</th>
                <th>Status</th>
                <th>Evidence</th>
                <th>Publish</th>
                <th>Updated</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <AssumptionRow
                  key={a.id}
                  assumption={a}
                  question={question}
                  kind={kind}
                  allAssumptions={allAssumptions}
                  onEdit={setModalTarget}
                  onManageEvidence={setEvidenceModalTarget}
                  onPublish={setPublishModalTarget}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AssumptionModal
        open={modalTarget !== null}
        assumption={modalTarget === "new" ? null : modalTarget}
        onClose={() => setModalTarget(null)}
        onCreate={(input) => {
          const created = addAssumption(questionId, localPerspectiveId(questionId, user.id), input);
          if (created) setSelectedPerspectiveId(localPerspectiveId(questionId, user.id));
        }}
        onSave={(patch) => {
          if (modalTarget && modalTarget !== "new") updateAssumption(modalTarget.id, patch);
        }}
      />

      <PublishAssumptionModal
        open={publishModalTarget !== null}
        assumption={publishModalTarget}
        onClose={() => setPublishModalTarget(null)}
        onSubmit={(target, rationale) => {
          if (publishModalTarget) requestAssumptionPublish(publishModalTarget.id, target, rationale);
        }}
      />

      <AssumptionEvidenceModal
        open={evidenceModalTarget !== null}
        assumption={evidenceModalTarget}
        questionId={questionId}
        evidence={evidence}
        onClose={() => setEvidenceModalTarget(null)}
      />
    </div>
  );
}
