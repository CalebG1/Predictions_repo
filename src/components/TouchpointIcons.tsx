import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import type { TouchpointKind, TouchpointSignal } from "../domain/types";
import { TOUCHPOINT_CATALOG, touchpointMeta } from "../domain/touchpoints";

function TouchpointSvg({ kind }: { kind: TouchpointKind }) {
  const icons: Record<TouchpointKind, ReactNode> = {
    interview: (
      <>
        <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3z" />
        <path d="M19 11v1a7 7 0 0 1-14 0v-1" />
        <line x1="12" y1="19" x2="12" y2="22" />
        <line x1="8" y1="22" x2="16" y2="22" />
      </>
    ),
    teams: (
      <>
        <rect x="3" y="5" width="8" height="8" rx="1.5" />
        <rect x="13" y="5" width="8" height="8" rx="1.5" />
        <rect x="8" y="13" width="8" height="8" rx="1.5" />
      </>
    ),
    excel: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <line x1="8" y1="3" x2="8" y2="21" />
        <line x1="4" y1="9" x2="20" y2="9" />
        <line x1="4" y1="15" x2="20" y2="15" />
        <line x1="14" y1="9" x2="14" y2="21" />
      </>
    ),
    slack: (
      <>
        <path d="M8 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
        <path d="M10 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
        <path d="M16 10a2 2 0 1 1 4 0 2 2 0 0 1-4 0z" />
        <path d="M14 16a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
        <line x1="10" y1="8" x2="10" y2="12" />
        <line x1="12" y1="10" x2="16" y2="10" />
        <line x1="14" y1="12" x2="14" y2="16" />
        <line x1="12" y1="14" x2="8" y2="14" />
      </>
    ),
    survey: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <line x1="8" y1="8" x2="16" y2="8" />
        <line x1="8" y1="12" x2="16" y2="12" />
        <line x1="8" y1="16" x2="13" y2="16" />
        <polyline points="16 15 17.5 16.5 20 14" />
      </>
    ),
  };

  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[kind]}
    </svg>
  );
}

export default function TouchpointIcons({
  signals,
  onAdd,
}: {
  signals: TouchpointSignal[];
  onAdd: (kind: TouchpointKind) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeKinds = new Set(signals.map((s) => s.kind));
  const available = TOUCHPOINT_CATALOG.filter((tp) => !activeKinds.has(tp.kind));

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const stopNav = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="qc-touchpoints" ref={ref} onClick={stopNav} onMouseDown={stopNav}>
      {signals.map((signal) => {
        const meta = touchpointMeta(signal.kind);
        return (
          <span
            key={signal.kind}
            className={`qc-tp qc-tp-${signal.kind} connected`}
            style={{ "--tp-color": meta.brandColor } as CSSProperties}
            title={`${meta.label} · ${signal.summary} (${signal.updatedAt})`}
            aria-label={`${meta.label}: ${signal.summary}`}
          >
            <TouchpointSvg kind={signal.kind} />
          </span>
        );
      })}

      <div className="qc-tp-add">
        <button
          type="button"
          className="qc-tp qc-tp-add-btn"
          title="Add context source"
          aria-label="Add context source"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        {menuOpen && (
          <div className="qc-tp-menu" role="menu">
            {available.length === 0 ? (
              <div className="qc-tp-menu-empty">All sources connected</div>
            ) : (
              available.map((tp) => (
                <button
                  key={tp.kind}
                  type="button"
                  role="menuitem"
                  className={`qc-tp-menu-item qc-tp-${tp.kind}`}
                  style={{ "--tp-color": tp.brandColor } as CSSProperties}
                  onClick={() => {
                    onAdd(tp.kind);
                    setMenuOpen(false);
                  }}
                >
                  <span className="qc-tp-menu-icon">
                    <TouchpointSvg kind={tp.kind} />
                  </span>
                  <span className="qc-tp-menu-text">
                    <span className="qc-tp-menu-label">{tp.label}</span>
                    <span className="qc-tp-menu-desc">{tp.description}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
