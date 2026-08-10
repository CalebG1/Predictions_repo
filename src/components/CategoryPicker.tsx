import type { MouseEvent } from "react";
import type { Category } from "../domain/types";
import CategoryLabel from "./CategoryLabel";
import { categoryOrder } from "./ui";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./ui/select";

export default function CategoryPicker({
  value,
  onChange,
}: {
  value: Category;
  onChange: (category: Category) => void;
}) {
  const stopNav = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div onClick={stopNav} onMouseDown={stopNav}>
      <Select value={value} onValueChange={(next) => onChange(next as Category)}>
        <SelectTrigger
          size="sm"
          className="h-auto w-fit border-0 bg-transparent p-0 text-xs shadow-none hover:bg-transparent focus-visible:ring-0"
        >
          <CategoryLabel value={value} />
        </SelectTrigger>
        <SelectContent align="start">
          {categoryOrder.map((c) => (
            <SelectItem key={c} value={c}>
              <CategoryLabel value={c} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
