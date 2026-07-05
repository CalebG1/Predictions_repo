import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import type { TouchpointKind, TouchpointSignal } from "../domain/types";
import { TOUCHPOINT_CATALOG, touchpointMeta } from "../domain/touchpoints";
import { IconPlus, TouchpointIcon } from "./icons";

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
            title={`${meta.label} · ${signal.summary}`}
            aria-label={`${meta.label}: ${signal.summary}`}
          >
            <TouchpointIcon kind={signal.kind} />
          </span>
        );
      })}

      {available.length > 0 && (
        <div className="qc-tp-add">
          <button
            type="button"
            className="qc-tp qc-tp-add-btn"
            title="Add source"
            aria-label="Add source"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <IconPlus />
          </button>
          {menuOpen && (
            <div className="qc-tp-menu" role="menu">
              {available.map((tp) => (
                <button
                  key={tp.kind}
                  type="button"
                  role="menuitem"
                  className={`qc-tp qc-tp-${tp.kind}`}
                  style={{ "--tp-color": tp.brandColor } as CSSProperties}
                  title={tp.label}
                  aria-label={tp.label}
                  onClick={() => {
                    onAdd(tp.kind);
                    setMenuOpen(false);
                  }}
                >
                  <TouchpointIcon kind={tp.kind} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
