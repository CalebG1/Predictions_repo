import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { Category } from "../domain/types";
import CategoryLabel from "./CategoryLabel";
import { categoryOrder } from "./ui";

export default function CategoryPicker({
  value,
  onChange,
}: {
  value: Category;
  onChange: (category: Category) => void;
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
        className="vis-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <CategoryLabel value={value} />
      </button>
      {open && (
        <div className="vis-menu" role="listbox">
          {categoryOrder.map((c) => (
            <button
              key={c}
              type="button"
              role="option"
              aria-selected={c === value}
              className={`vis-menu-item${c === value ? " active" : ""}`}
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
            >
              <span className="vis-menu-label">
                <CategoryLabel value={c} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
