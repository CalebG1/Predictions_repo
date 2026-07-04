import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { Visibility } from "../domain/types";
import { visibilityConfig, visibilityOrder } from "./ui";

export default function VisibilityPicker({
  value,
  onChange,
}: {
  value: Visibility;
  onChange: (v: Visibility) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <div className="vis-picker" ref={ref} onClick={stopNav} onMouseDown={stopNav}>
      <button
        type="button"
        className={`tag tag-vis tag-vis-${value}`}
        title={visibilityConfig[value].description}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {visibilityConfig[value].label}
      </button>
      {open && (
        <div className="vis-menu" role="listbox">
          {visibilityOrder.map((v) => (
            <button
              key={v}
              type="button"
              role="option"
              aria-selected={v === value}
              className={`vis-menu-item tag-vis-${v}${v === value ? " active" : ""}`}
              onClick={() => {
                onChange(v);
                setOpen(false);
              }}
            >
              <span className="vis-menu-label">{visibilityConfig[v].label}</span>
              <span className="vis-menu-desc">{visibilityConfig[v].description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
