import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

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
            o.id.toLowerCase().includes(q),
        )
      : options;
    return list.slice(0, 10);
  }, [options, value]);

  return (
    <div className="relative" ref={rootRef}>
      <Input
        type="text"
        className="w-full"
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
        <ul
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
          role="listbox"
        >
          {filtered.map((option) => (
            <li key={option.id}>
              <Button
                type="button"
                role="option"
                aria-selected={selectedId === option.id}
                variant="ghost"
                className={`h-auto w-full justify-between ${selectedId === option.id ? "bg-accent" : ""}`}
                disabled={option.disabled}
                onClick={() => {
                  if (option.disabled) return;
                  onSelect(option);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {option.meta && (
                  <span className="text-xs text-muted-foreground">{option.meta}</span>
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {open && value.trim() && filtered.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover p-3 text-sm text-muted-foreground shadow-md">
          No matches
        </div>
      )}
    </div>
  );
}
