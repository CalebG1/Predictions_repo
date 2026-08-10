import { useEffect, useRef, useState, type FormEvent } from "react";
import { useStore } from "../store";
import type { ForecastQuestion } from "../domain/types";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { CircleHelp, RefreshCw, X } from "lucide-react";

function IconQa() {
  return <CircleHelp size={18} />;
}

function IconClose() {
  return <X size={16} />;
}

function IconReset() {
  return <RefreshCw size={15} />;
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
      <Button
        type="button"
        className="fixed right-5 bottom-5 z-60 inline-flex rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground shadow-lg hover:bg-muted"
        onClick={() => setOpen(true)}
        aria-label="Open forecast Q&A"
      >
        <IconQa />
        <span>Q&amp;A</span>
        {messages.length > 0 && (
          <span
            className="inline-flex min-w-5 items-center justify-center rounded-full bg-muted px-1 text-xs font-bold text-muted-foreground"
            aria-hidden="true"
          >
            {messages.length}
          </span>
        )}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="fixed right-5 bottom-5 left-auto top-auto z-60 flex h-[min(520px,calc(100vh-120px))] w-[min(380px,calc(100vw-40px))] translate-x-0 translate-y-0 flex-col overflow-hidden p-0">
        <DialogTitle className="sr-only">Forecast Q&amp;A</DialogTitle>
        <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/50 px-4 py-3">
          <div className="text-sm font-semibold">Forecast Q&amp;A</div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              onClick={clearChat}
              disabled={messages.length === 0 || pending}
              title="Clear conversation"
              aria-label="Clear conversation"
            >
              <IconReset />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              onClick={() => setOpen(false)}
              aria-label="Close Q&A"
            >
              <IconClose />
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4" ref={listRef}>
          {messages.length === 0 && !pending && (
            <div>
              <p className="mb-3 text-sm leading-6 text-muted-foreground">
                Ask about the probability, drivers, resolution, or what would trigger an update.
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => submit(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[92%] ${m.role === "assistant" ? "self-start" : "self-end"}`}
            >
              <div className="mb-1 text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                {m.role === "user" ? "You" : "Assistant"}
              </div>
              <div
                className={
                  m.role === "assistant"
                    ? "rounded-xl rounded-bl-sm border border-border bg-muted px-3 py-2.5 text-sm leading-6 whitespace-pre-wrap"
                    : "rounded-xl rounded-br-sm bg-primary px-3 py-2.5 text-sm leading-6 whitespace-pre-wrap text-primary-foreground"
                }
              >
                {m.body}
              </div>
            </div>
          ))}
          {pending && (
            <div className="max-w-[92%] self-start">
              <div className="mb-1 text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                Assistant
              </div>
              <div className="rounded-xl rounded-bl-sm border border-border bg-muted px-3 py-2.5 text-sm text-muted-foreground italic">
                Thinking…
              </div>
            </div>
          )}
        </div>

        <form className="flex items-center gap-2 border-t border-border p-3" onSubmit={onSubmit}>
          <Textarea
            ref={inputRef}
            className="min-h-10 max-h-30 min-w-0 flex-1 resize-none rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
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
          <Button type="submit" disabled={!draft.trim() || pending}>
            Ask
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
