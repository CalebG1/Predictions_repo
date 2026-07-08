import { useEffect, useMemo, useRef, useState } from "react";

export type ComboboxOption = {
  id: string;
  label: string;
  meta?: string;
  disabled?: boolean;
};

export default function InlineCombobox({
  placeholder,
  options,
  value,
  selectedId,
  onValueChange,
  onSelect,
}: {
  placeholder: string;
  options: ComboboxOption[];
  value: string;
  selectedId: string;
  onValueChange: (value: string) => void;
  onSelect: (option: ComboboxOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = q
      ? options.filter(
          (o) =>
            o.label.toLowerCase().includes(q) ||
            o.meta?.toLowerCase().includes(q) ||
            o.id.toLowerCase().includes(q)
        )
      : options;
    return list.slice(0, 10);
  }, [options, value]);

  return (
    <div className="ctx-inline-combo" ref={rootRef}>
      <input
        type="text"
        className="ctx-bind-inline-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="ctx-inline-combo-list" role="listbox">
          {filtered.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                role="option"
                aria-selected={selectedId === option.id}
                className={`ctx-inline-combo-option${selectedId === option.id ? " selected" : ""}${
                  option.disabled ? " disabled" : ""
                }`}
                disabled={option.disabled}
                onClick={() => {
                  if (option.disabled) return;
                  onSelect(option);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {option.meta && <span className="muted small">{option.meta}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && value.trim() && filtered.length === 0 && (
        <div className="ctx-inline-combo-empty muted small">No matches</div>
      )}
    </div>
  );
}
