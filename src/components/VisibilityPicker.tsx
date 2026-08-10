import type { MouseEvent } from "react";
import type { Visibility } from "../domain/types";
import VisibilityLabel from "./VisibilityLabel";
import { visibilityConfig, visibilityOrder } from "./ui";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./ui/select";

export default function VisibilityPicker({
  value,
  owningTeam,
  onChange,
}: {
  value: Visibility;
  owningTeam?: string;
  onChange: (v: Visibility) => void;
}) {
  const stopNav = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div onClick={stopNav} onMouseDown={stopNav}>
      <Select value={value} onValueChange={(next) => onChange(next as Visibility)}>
        <SelectTrigger
          size="sm"
          title={visibilityConfig[value].description}
          className="h-auto w-fit border-0 bg-transparent p-0 text-xs shadow-none hover:bg-transparent focus-visible:ring-0"
        >
          <VisibilityLabel value={value} owningTeam={owningTeam} />
        </SelectTrigger>
        <SelectContent align="end" className="min-w-45">
          {visibilityOrder.map((v) => (
            <SelectItem key={v} value={v} className="items-start py-2">
              <span className="flex flex-col items-start gap-0.5">
                <VisibilityLabel value={v} owningTeam={owningTeam} />
                <span className="text-xs text-muted-foreground">
                  {visibilityConfig[v].description}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
