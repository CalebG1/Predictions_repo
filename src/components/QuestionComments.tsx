import { useMemo, useState, type FormEvent } from "react";
import { useStore } from "../store";
import { IconTrash } from "./icons";
import type { ForecastQuestion, QuestionComment, User } from "../domain/types";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Card, CardContent } from "./ui/card";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
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
    <li
      className={`flex items-start gap-3 ${isReply ? "ml-10 border-l-2 border-border pl-3" : ""}`}
    >
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
        aria-hidden="true"
      >
        {initials(comment.authorName)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold">{comment.authorName}</span>
          <span className="text-xs text-muted-foreground">{comment.authorTeam}</span>
          <time className="text-xs text-muted-foreground" dateTime={comment.createdAt}>
            {formatWhen(comment.createdAt)}
          </time>
          {comment.editedAt && <span className="text-xs text-muted-foreground italic">edited</span>}
        </div>

        {isEditing ? (
          <form
            className="mt-2"
            onSubmit={(e) => {
              e.preventDefault();
              onSaveEdit(comment.id);
            }}
          >
            <Textarea
              className="min-h-14 w-full resize-y rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              rows={2}
              value={editDraft}
              onChange={(e) => onEditDraft(e.target.value)}
              autoFocus
              aria-label="Edit comment"
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onCancelEdit}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!editDraft.trim()}>
                Save
              </Button>
            </div>
          </form>
        ) : (
          <>
            <p className="text-sm leading-6 whitespace-pre-wrap">{comment.body}</p>
            <div className="mt-1.5 flex items-center gap-1">
              {canReply && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onStartReply(comment.id)}
                >
                  Reply
                </Button>
              )}
              {own && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onStartEdit(comment)}
                >
                  Edit
                </Button>
              )}
              {own && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(comment.id)}
                  title="Delete comment"
                  aria-label="Delete comment"
                >
                  <IconTrash />
                </Button>
              )}
            </div>
          </>
        )}

        {isReplying && (
          <form
            className="mt-3"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmitReply(comment.id);
            }}
          >
            <Textarea
              className="min-h-14 w-full resize-y rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              rows={2}
              placeholder={`Reply to ${comment.authorName.split(" ")[0]}…`}
              value={replyDraft}
              onChange={(e) => onReplyDraft(e.target.value)}
              autoFocus
              aria-label="Reply"
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onCancelReply}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!replyDraft.trim()}>
                Reply
              </Button>
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
    <Card>
      <CardContent className="p-5">
        <div className="mb-5 flex items-center justify-between text-base font-semibold">
          <span>Comments</span>
          <span className="text-muted-foreground">{comments.length}</span>
        </div>

        {comments.length === 0 ? (
          <p className="mb-4 text-sm text-muted-foreground">
            No comments yet — add context for the team.
          </p>
        ) : (
          <ul className="mb-4 flex list-none flex-col gap-4 p-0">
            {threads.map(({ comment, replies }) => (
              <li key={comment.id} className="list-none">
                <ul className="flex list-none flex-col gap-3 p-0">
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

        <form onSubmit={submit}>
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
              aria-hidden="true"
            >
              {initials(user.name)}
            </div>
            <Textarea
              className="min-h-14 min-w-0 flex-1 resize-y rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              rows={2}
              placeholder="Add a comment for the team…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Comment"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button type="submit" size="sm" disabled={!draft.trim()}>
              Post comment
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
