import { useState, type FormEvent } from "react";
import { useStore } from "../store";
import type { ForecastQuestion } from "../domain/types";

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

export default function QuestionComments({ q }: { q: ForecastQuestion }) {
  const { user, commentsFor, addComment } = useStore();
  const comments = commentsFor(q.id);
  const [draft, setDraft] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    addComment(q.id, draft);
    setDraft("");
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
          {comments.map((c) => (
            <li key={c.id} className="qcomment">
              <div className="qcomment-avatar" aria-hidden="true">
                {initials(c.authorName)}
              </div>
              <div className="qcomment-body">
                <div className="qcomment-meta">
                  <span className="qcomment-author">{c.authorName}</span>
                  <span className="qcomment-team">{c.authorTeam}</span>
                  <time className="qcomment-time" dateTime={c.createdAt}>
                    {formatWhen(c.createdAt)}
                  </time>
                </div>
                <p className="qcomment-text">{c.body}</p>
              </div>
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
