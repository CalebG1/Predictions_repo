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
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Card, CardContent } from "../ui/card";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function statusClassName(status: AssumptionStatus): string {
  const base = "h-7 w-32 rounded-full border-0 px-2 text-xs font-bold";
  if (status === "active") return `${base} bg-emerald-100 text-emerald-700`;
  if (status === "pending_review" || status === "uncertain")
    return `${base} bg-amber-100 text-amber-700`;
  return `${base} bg-red-100 text-red-700`;
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
    <div className="relative" ref={ref}>
      <Button
        type="button"
        className="inline-flex min-h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {current?.name ?? "Select view"}
      </Button>
      {open && (
        <div
          className="absolute left-0 top-full z-20 mt-1 min-w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
          role="listbox"
        >
          {groups.map((group) => {
            const inGroup = options.filter((o) => o.group === group);
            if (inGroup.length === 0) return null;
            return (
              <div className="border-b border-slate-100 py-1 last:border-0" key={group}>
                <span className="block px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {group}
                </span>
                {inGroup.map((opt) => (
                  <Button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={opt.id === value}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-slate-50${opt.id === value ? " active" : ""}`}
                    onClick={() => {
                      onChange(opt.id);
                      setOpen(false);
                    }}
                  >
                    <span>{opt.name}</span>
                    <span className="text-muted-foreground small">{opt.count}</span>
                  </Button>
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
  const statusClass = statusClassName(value);
  if (!editable) {
    return (
      <span className={`inline-flex items-center ${statusClass}`}>
        {ASSUMPTION_STATUS_LABELS[value]}
      </span>
    );
  }
  const editableStatuses = (Object.keys(ASSUMPTION_STATUS_LABELS) as AssumptionStatus[]).filter(
    (s) => s !== "pending_review",
  );
  return (
    <Select value={value} onValueChange={(next) => next && onChange(next as AssumptionStatus)}>
      <SelectTrigger className={statusClass} aria-label="Assumption status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {editableStatuses.map((status) => (
          <SelectItem key={status} value={status}>
            {ASSUMPTION_STATUS_LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
    <div className="space-y-3">
      {notes.length === 0 ? (
        <p className="text-muted-foreground small text-sm text-slate-500">No discussion yet.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-md bg-slate-50 p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-800">{n.authorName}</span>
                {n.isChallenge && (
                  <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-rose-50 text-rose-700">
                    Challenge
                  </span>
                )}
                <time className="text-muted-foreground small">{fmtDate(n.createdAt)}</time>
              </div>
              <p className="mt-1 text-sm text-slate-700">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 space-y-2">
        <Textarea
          className="qcomments-input"
          rows={2}
          placeholder="Add a note or challenge this assumption…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Discussion note"
        />
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <Checkbox
              checked={markChallenge}
              onCheckedChange={(checked) => setMarkChallenge(checked === true)}
            />
            Mark as challenge
          </label>
          <Button type="button" className="" disabled={!draft.trim()} onClick={submit}>
            Post
          </Button>
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
    <div className="mt-2 space-y-2 rounded-md bg-slate-50 p-3">
      <Textarea
        className="qcomments-input"
        rows={2}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
        aria-label={placeholder}
      />
      <div className="mt-2 space-y-2 rounded-md bg-slate-50 p-3-actions">
        <Button type="button" className="qcomment-action" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" className="" onClick={() => onSubmit(text)}>
          {submitLabel}
        </Button>
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
          (a) =>
            a.originAssumptionId === assumption.id && perspectiveType(a.perspectiveId) === "person",
        )
      : undefined;

  const pendingArchiveProposal =
    kind === "shared"
      ? proposals.find(
          (p) =>
            p.changeType === "archive" &&
            p.targetAssumptionId === assumption.id &&
            p.status === "pending",
        )
      : undefined;

  const isPendingReview = assumption.status === "pending_review";

  const stop = (e: MouseEvent) => e.stopPropagation();
  const subtitleParts = [author?.name ?? "Unknown"];
  if (assumption.confidence)
    subtitleParts.push(ASSUMPTION_CONFIDENCE_LABELS[assumption.confidence]);
  if (assumption.rationale) subtitleParts.push(assumption.rationale);

  const expanded = discussionOpen || archiveProposeOpen;

  const openEdit = () => {
    if (editable) onEdit(assumption);
  };

  return (
    <Fragment>
      <TableRow
        className={
          editable
            ? "cursor-pointer hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-2px]"
            : undefined
        }
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
        <TableCell className="min-w-55 max-w-90">
          <div className="flex items-center gap-1.5">
            <span className="overflow-hidden text-ellipsis whitespace-nowrap font-semibold">
              {assumption.statement}
            </span>
            {pendingArchiveProposal && (
              <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700">
                Archive pending
              </span>
            )}
          </div>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {subtitleParts.join(" · ")} ·{" "}
            <Button
              type="button"
              className="text-xs font-medium text-blue-700 hover:text-blue-800"
              onClick={(e) => {
                e.stopPropagation();
                setDiscussionOpen((o) => !o);
              }}
            >
              {discussionOpen ? "Hide discussion" : "Discuss"}
            </Button>
          </span>
        </TableCell>

        <TableCell className="whitespace-nowrap" onClick={stop}>
          <StatusSelect
            value={assumption.status}
            editable={kind === "own-local" && !isPendingReview}
            onChange={(status) => updateAssumption(assumption.id, { status })}
          />
        </TableCell>

        <TableCell className="p-3 text-sm" onClick={stop}>
          <Button
            type="button"
            className="text-sm font-medium text-blue-700 hover:text-blue-800"
            onClick={() => onManageEvidence(assumption)}
          >
            {evidenceSignalSummary(links)}
          </Button>
        </TableCell>

        <TableCell className="p-3" onClick={stop}>
          {kind === "own-local" && (
            <div className="flex flex-wrap gap-2">
              {isPendingReview ? (
                <Button
                  type="button"
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  disabled
                  title="Awaiting review"
                >
                  Pending review
                </Button>
              ) : sharedCopy ? (
                <Button
                  type="button"
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 is-published"
                  title="Remove from your shared perspective"
                  onClick={() => unshareAssumption(assumption.id)}
                >
                  Unpublish
                </Button>
              ) : (
                <Button
                  type="button"
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  title="Submit this assumption for review"
                  onClick={() => onPublish(assumption)}
                >
                  Publish
                </Button>
              )}
            </div>
          )}
          {kind === "own-person" && assumption.originAssumptionId && (
            <Button
              type="button"
              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 is-published"
              title="Remove from your shared perspective"
              onClick={() => unshareAssumption(assumption.originAssumptionId!)}
            >
              Unpublish
            </Button>
          )}
          {kind === "shared" && (
            <div className="flex flex-wrap gap-2">
              {!pendingArchiveProposal && (
                <Button
                  type="button"
                  className="text-xs font-medium text-blue-700 hover:text-blue-800"
                  onClick={() => setArchiveProposeOpen(true)}
                >
                  Propose archive
                </Button>
              )}
              <Button
                type="button"
                className="text-xs font-medium text-blue-700 hover:text-blue-800"
                onClick={() => copyAssumptionToLocal(assumption.id)}
              >
                Copy to my view
              </Button>
            </div>
          )}
          {kind === "other-person" && (
            <Button
              type="button"
              className="text-xs font-medium text-blue-700 hover:text-blue-800"
              onClick={() => copyAssumptionToLocal(assumption.id)}
            >
              Copy to my view
            </Button>
          )}
        </TableCell>

        <TableCell className="whitespace-nowrap text-muted-foreground">
          {fmtDate(assumption.updatedAt)}
        </TableCell>

        <TableCell className="text-right" onClick={stop}>
          {kind === "own-local" && (
            <Button
              type="button"
              className="size-7 border bg-background p-1 text-muted-foreground hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => deleteAssumption(assumption.id)}
              aria-label={`Delete assumption: ${assumption.statement}`}
              title="Delete"
            >
              <IconTrash />
            </Button>
          )}
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow className="border-b bg-slate-50">
          <TableCell colSpan={6}>
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
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
}

function ProposalRow({
  proposal,
  question,
}: {
  proposal: AssumptionProposal;
  question: ForecastQuestion;
}) {
  const { user, allUsers, approveAssumptionProposal, rejectAssumptionProposal, assumptionsFor } =
    useStore();
  const [note, setNote] = useState("");
  const proposer = allUsers.find((u) => u.id === proposal.proposedBy);
  const canDecide = canApproveProposals(user, question);
  const target =
    proposal.changeType === "archive"
      ? assumptionsFor(question.id).find((a) => a.id === proposal.targetAssumptionId)
      : undefined;

  return (
    <li className="rounded-md border border-amber-100 bg-white p-3">
      <div className="flex items-start gap-2">
        <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700">
          {ASSUMPTION_CHANGE_LABELS[proposal.changeType]}
        </span>
        <p className="m-0 text-sm font-medium text-slate-800">
          {proposal.changeType === "add" ? proposal.proposedStatement : target?.statement}
        </p>
      </div>
      <p className="text-muted-foreground small">
        Proposed by {proposer?.name ?? "Unknown"} · {fmtDate(proposal.proposedAt)}
        {proposal.rationale ? ` — "${proposal.rationale}"` : ""}
      </p>
      {canDecide && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Input
            className="min-w-48 flex-1 rounded-md border border-slate-200 px-2 py-1 text-sm"
            placeholder="Optional decision note…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-label="Decision note"
          />
          <Button
            type="button"
            className=""
            onClick={() => approveAssumptionProposal(proposal.id, note)}
          >
            Approve
          </Button>
          <Button
            type="button"
            className="qcomment-action"
            onClick={() => rejectAssumptionProposal(proposal.id, note)}
          >
            Reject
          </Button>
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
  const [selectedPerspectiveId, setSelectedPerspectiveId] = useState(() =>
    localPerspectiveId(questionId, user.id),
  );
  const [modalTarget, setModalTarget] = useState<QuestionAssumption | "new" | null>(null);
  const [publishModalTarget, setPublishModalTarget] = useState<QuestionAssumption | null>(null);
  const [evidenceModalTarget, setEvidenceModalTarget] = useState<QuestionAssumption | null>(null);

  const options = useMemo(
    () => buildPerspectiveOptions(questionId, user, allUsers, allAssumptions),
    [questionId, user, allUsers, allAssumptions],
  );

  const kind: "own-local" | "shared" | "own-person" | "other-person" = useMemo(() => {
    const t = perspectiveType(selectedPerspectiveId);
    if (t === "local") return "own-local";
    if (t === "shared") return "shared";
    return selectedPerspectiveId === personPerspectiveId(questionId, user.id)
      ? "own-person"
      : "other-person";
  }, [selectedPerspectiveId, questionId, user.id]);

  const rows = useMemo(
    () =>
      allAssumptions
        .filter((a) => a.perspectiveId === selectedPerspectiveId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [allAssumptions, selectedPerspectiveId],
  );

  const proposals = assumptionProposalsFor(questionId);
  const pendingProposals = proposals.filter((p) => p.status === "pending");
  const canApprove = canApproveAssumptionProposals(question);
  const isSharedView = kind === "shared";

  return (
    <Card className="bg-card">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2.5">
          <h4>Assumptions</h4>
          <div className="flex flex-wrap items-center gap-2">
            <PerspectiveSelect
              options={options}
              value={selectedPerspectiveId}
              onChange={setSelectedPerspectiveId}
            />
            {kind === "own-local" && (
              <Button type="button" onClick={() => setModalTarget("new")}>
                <IconPlus />
                Add assumption
              </Button>
            )}
          </div>
        </div>

        {isSharedView && pendingProposals.length > 0 && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <h5>
              Pending proposals ({pendingProposals.length})
              {!canApprove && (
                <span className="text-muted-foreground small"> — awaiting review</span>
              )}
            </h5>
            <ul className="space-y-2">
              {pendingProposals.map((p) => (
                <ProposalRow key={p.id} proposal={p} question={question} />
              ))}
            </ul>
          </div>
        )}

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {kind === "own-local"
              ? "Make the beliefs behind your forecast explicit. Your local assumptions are private until you choose to share or propose them."
              : "This perspective does not have any assumptions yet."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Assumption</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Evidence</TableHead>
                  <TableHead>Publish</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead aria-label="Actions" />
                </TableRow>
              </TableHeader>
              <TableBody>
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
              </TableBody>
            </Table>
          </div>
        )}

        <AssumptionModal
          open={modalTarget !== null}
          assumption={modalTarget === "new" ? null : modalTarget}
          onClose={() => setModalTarget(null)}
          onCreate={(input) => {
            const created = addAssumption(
              questionId,
              localPerspectiveId(questionId, user.id),
              input,
            );
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
            if (publishModalTarget)
              requestAssumptionPublish(publishModalTarget.id, target, rationale);
          }}
        />

        <AssumptionEvidenceModal
          open={evidenceModalTarget !== null}
          assumption={evidenceModalTarget}
          questionId={questionId}
          evidence={evidence}
          onClose={() => setEvidenceModalTarget(null)}
        />
      </CardContent>
    </Card>
  );
}
