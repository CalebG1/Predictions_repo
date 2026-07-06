import { useEffect, useRef, useState, type FormEvent } from "react";
import { useStore } from "../store";
import type { ForecastQuestion } from "../domain/types";

function IconQa() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconReset() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

const SUGGESTIONS = [
  "What's the current probability?",
  "What would move this up?",
  "Key uncertainties?",
  "How does this resolve?",
];

export default function QuestionQaChat({ q }: { q: ForecastQuestion }) {
  const { qaMessagesFor, askQa, resetQa } = useStore();
  const messages = qaMessagesFor(q.id);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, messages, pending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setDraft("");
    askQa(q.id, trimmed);
    setPending(false);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(draft);
  };

  const clearChat = () => {
    if (messages.length === 0 || pending) return;
    resetQa(q.id);
    setDraft("");
  };

  if (!open) {
    return (
      <button
        type="button"
        className="qa-fab"
        onClick={() => setOpen(true)}
        aria-label="Open forecast Q&A"
      >
        <IconQa />
        <span>Q&amp;A</span>
        {messages.length > 0 && (
          <span className="qa-fab-badge" aria-hidden="true">
            {messages.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="qa-panel" role="dialog" aria-label="Forecast Q&A">
      <div className="qa-head">
        <div className="qa-title">Forecast Q&amp;A</div>
        <div className="qa-head-actions">
          <button
            type="button"
            className="qa-head-btn"
            onClick={clearChat}
            disabled={messages.length === 0 || pending}
            title="Clear conversation"
            aria-label="Clear conversation"
          >
            <IconReset />
          </button>
          <button type="button" className="qa-head-btn" onClick={() => setOpen(false)} aria-label="Close Q&A">
            <IconClose />
          </button>
        </div>
      </div>

      <div className="qa-messages" ref={listRef}>
        {messages.length === 0 && !pending && (
          <div className="qa-welcome">
            <p>Ask about the probability, drivers, resolution, or what would trigger an update.</p>
            <div className="qa-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="qa-suggestion" onClick={() => submit(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`qa-msg qa-msg-${m.role}`}>
            <div className="qa-msg-label">{m.role === "user" ? "You" : "Assistant"}</div>
            <div className="qa-msg-body">{m.body}</div>
          </div>
        ))}
        {pending && (
          <div className="qa-msg qa-msg-assistant">
            <div className="qa-msg-label">Assistant</div>
            <div className="qa-msg-body qa-msg-thinking">Thinking…</div>
          </div>
        )}
      </div>

      <form className="qa-form" onSubmit={onSubmit}>
        <textarea
          ref={inputRef}
          className="qa-input"
          rows={1}
          placeholder="Ask about this forecast…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(draft);
            }
          }}
          aria-label="Question"
        />
        <button type="submit" className="qa-send" disabled={!draft.trim() || pending}>
          Ask
        </button>
      </form>
    </div>
  );
}
