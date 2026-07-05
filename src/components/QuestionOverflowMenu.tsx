import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { ForecastQuestion } from "../domain/types";
import { questionUrl, shareMessage } from "../domain/share";
import { useStore } from "../store";
import { IconDots, IconPin, IconRefresh, IconShare } from "./icons";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function QuestionOverflowMenu({
  q,
  probability,
  showPin = false,
}: {
  q: ForecastQuestion;
  probability: number;
  showPin?: boolean;
}) {
  const { refreshForecast, togglePin, isPinned } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pinned = isPinned(q.id);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const stopNav = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const closeMenu = () => setOpen(false);

  return (
    <div className="overflow-picker" ref={ref} onClick={stopNav} onMouseDown={stopNav}>
      <button
        type="button"
        className="overflow-trigger"
        title="More actions"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <IconDots />
      </button>

      {open && (
        <div className="overflow-menu" role="menu">
          {showPin && (
            <button
              type="button"
              className={`overflow-icon${pinned ? " active" : ""}`}
              role="menuitem"
              title={pinned ? "Unpin" : "Pin"}
              aria-label={pinned ? "Unpin" : "Pin"}
              onClick={() => {
                togglePin(q.id);
                closeMenu();
              }}
            >
              <IconPin filled={pinned} />
            </button>
          )}
          <button
            type="button"
            className="overflow-icon"
            role="menuitem"
            title="Share"
            aria-label="Share"
            onClick={async () => {
              await copyText(`${shareMessage(q, probability)}\n${questionUrl(q.id)}`);
              closeMenu();
            }}
          >
            <IconShare />
          </button>
          <button
            type="button"
            className="overflow-icon"
            role="menuitem"
            title="Refresh"
            aria-label="Refresh"
            onClick={() => {
              refreshForecast(q.id);
              closeMenu();
            }}
          >
            <IconRefresh />
          </button>
        </div>
      )}
    </div>
  );
}
