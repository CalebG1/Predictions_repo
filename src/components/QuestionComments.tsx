import { useMemo, useState, type FormEvent } from "react";
import { useStore } from "../store";
import { IconTrash } from "./icons";
import type { ForecastQuestion, QuestionComment, User } from "../domain/types";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function initials(name: string): string {
  const parts = name.replace(/[()]/g, " ").split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function buildThreads(comments: QuestionComment[]) {
  const byId = new Map(comments.map((c) => [c.id, c]));
  const repliesByParent = new Map<string, QuestionComment[]>();

  for (const c of comments) {
    if (!c.parentId) continue;
    const rootId = byId.has(c.parentId) ? c.parentId : null;
    if (!rootId) continue;
    const list = repliesByParent.get(rootId) ?? [];
    list.push(c);
    repliesByParent.set(rootId, list);
  }

  const tops = comments
    .filter((c) => !c.parentId || !byId.has(c.parentId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  for (const [, replies] of repliesByParent) {
    replies.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  return tops.map((comment) => ({
    comment,
    replies: repliesByParent.get(comment.id) ?? [],
  }));
}

function CommentRow({
  comment,
  user,
  isReply,
  canReply,
  editingId,
  editDraft,
  replyingToId,
  replyDraft,
  onStartEdit,
  onEditDraft,
  onCancelEdit,
  onSaveEdit,
  onStartReply,
  onReplyDraft,
  onCancelReply,
  onSubmitReply,
  onDelete,
}: {
  comment: QuestionComment;
  user: User;
  isReply?: boolean;
  canReply?: boolean;
  editingId: string | null;
  editDraft: string;
  replyingToId: string | null;
  replyDraft: string;
  onStartEdit: (comment: QuestionComment) => void;
  onEditDraft: (value: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (commentId: string) => void;
  onStartReply: (commentId: string) => void;
  onReplyDraft: (value: string) => void;
  onCancelReply: () => void;
  onSubmitReply: (parentId: string) => void;
  onDelete: (commentId: string) => void;
}) {
  const own = comment.authorId === user.id;
  const isEditing = editingId === comment.id;
  const isReplying = replyingToId === comment.id;

  return (
    <li className={`qcomment${isReply ? " qcomment-reply" : ""}`}>
      <div className="qcomment-avatar" aria-hidden="true">
        {initials(comment.authorName)}
      </div>
      <div className="qcomment-body">
        <div className="qcomment-meta">
          <span className="qcomment-author">{comment.authorName}</span>
          <span className="qcomment-team">{comment.authorTeam}</span>
          <time className="qcomment-time" dateTime={comment.createdAt}>
            {formatWhen(comment.createdAt)}
          </time>
          {comment.editedAt && <span className="qcomment-edited">edited</span>}
        </div>

        {isEditing ? (
          <form
            className="qcomment-inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              onSaveEdit(comment.id);
            }}
          >
            <textarea
              className="qcomments-input"
              rows={2}
              value={editDraft}
              onChange={(e) => onEditDraft(e.target.value)}
              autoFocus
              aria-label="Edit comment"
            />
            <div className="qcomment-inline-actions">
              <button type="button" className="qcomment-action" onClick={onCancelEdit}>
                Cancel
              </button>
              <button type="submit" className="btn btn-sm" disabled={!editDraft.trim()}>
                Save
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="qcomment-text">{comment.body}</p>
            <div className="qcomment-actions">
              {canReply && (
                <button type="button" className="qcomment-action" onClick={() => onStartReply(comment.id)}>
                  Reply
                </button>
              )}
              {own && (
                <button type="button" className="qcomment-action" onClick={() => onStartEdit(comment)}>
                  Edit
                </button>
              )}
              {own && (
                <button
                  type="button"
                  className="qcomment-delete"
                  onClick={() => onDelete(comment.id)}
                  title="Delete comment"
                  aria-label="Delete comment"
                >
                  <IconTrash />
                </button>
              )}
            </div>
          </>
        )}

        {isReplying && (
          <form
            className="qcomment-inline-form qcomment-reply-form"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmitReply(comment.id);
            }}
          >
            <textarea
              className="qcomments-input"
              rows={2}
              placeholder={`Reply to ${comment.authorName.split(" ")[0]}…`}
              value={replyDraft}
              onChange={(e) => onReplyDraft(e.target.value)}
              autoFocus
              aria-label="Reply"
            />
            <div className="qcomment-inline-actions">
              <button type="button" className="qcomment-action" onClick={onCancelReply}>
                Cancel
              </button>
              <button type="submit" className="btn btn-sm" disabled={!replyDraft.trim()}>
                Reply
              </button>
            </div>
          </form>
        )}
      </div>
    </li>
  );
}

export default function QuestionComments({ q }: { q: ForecastQuestion }) {
  const { user, commentsFor, addComment, editComment, deleteComment } = useStore();
  const comments = commentsFor(q.id);
  const threads = useMemo(() => buildThreads(comments), [comments]);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    addComment(q.id, draft);
    setDraft("");
  };

  const startEdit = (comment: QuestionComment) => {
    setReplyingToId(null);
    setReplyDraft("");
    setEditingId(comment.id);
    setEditDraft(comment.body);
  };

  const saveEdit = (commentId: string) => {
    if (!editDraft.trim()) return;
    editComment(commentId, editDraft);
    setEditingId(null);
    setEditDraft("");
  };

  const startReply = (commentId: string) => {
    setEditingId(null);
    setEditDraft("");
    setReplyingToId(commentId);
    setReplyDraft("");
  };

  const submitReply = (parentId: string) => {
    if (!replyDraft.trim()) return;
    addComment(q.id, replyDraft, parentId);
    setReplyingToId(null);
    setReplyDraft("");
  };

  return (
    <div className="panel qcomments">
      <div className="panel-head">
        <span>Comments</span>
        <span className="muted">{comments.length}</span>
      </div>

      {comments.length === 0 ? (
        <p className="muted small qcomments-empty">No comments yet — add context for the team.</p>
      ) : (
        <ul className="qcomments-list">
          {threads.map(({ comment, replies }) => (
            <li key={comment.id} className="qcomment-thread">
              <ul className="qcomment-thread-list">
                <CommentRow
                  comment={comment}
                  user={user}
                  canReply
                  editingId={editingId}
                  editDraft={editDraft}
                  replyingToId={replyingToId}
                  replyDraft={replyDraft}
                  onStartEdit={startEdit}
                  onEditDraft={setEditDraft}
                  onCancelEdit={() => {
                    setEditingId(null);
                    setEditDraft("");
                  }}
                  onSaveEdit={saveEdit}
                  onStartReply={startReply}
                  onReplyDraft={setReplyDraft}
                  onCancelReply={() => {
                    setReplyingToId(null);
                    setReplyDraft("");
                  }}
                  onSubmitReply={submitReply}
                  onDelete={deleteComment}
                />
                {replies.map((reply) => (
                  <CommentRow
                    key={reply.id}
                    comment={reply}
                    user={user}
                    isReply
                    editingId={editingId}
                    editDraft={editDraft}
                    replyingToId={replyingToId}
                    replyDraft={replyDraft}
                    onStartEdit={startEdit}
                    onEditDraft={setEditDraft}
                    onCancelEdit={() => {
                      setEditingId(null);
                      setEditDraft("");
                    }}
                    onSaveEdit={saveEdit}
                    onStartReply={startReply}
                    onReplyDraft={setReplyDraft}
                    onCancelReply={() => {
                      setReplyingToId(null);
                      setReplyDraft("");
                    }}
                    onSubmitReply={submitReply}
                    onDelete={deleteComment}
                  />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <form className="qcomments-form" onSubmit={submit}>
        <div className="qcomments-compose">
          <div className="qcomment-avatar qcomment-avatar-self" aria-hidden="true">
            {initials(user.name)}
          </div>
          <textarea
            className="qcomments-input"
            rows={2}
            placeholder="Add a comment for the team…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Comment"
          />
        </div>
        <div className="qcomments-actions">
          <button type="submit" className="btn btn-sm" disabled={!draft.trim()}>
            Post comment
          </button>
        </div>
      </form>
    </div>
  );
}
