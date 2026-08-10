import type { Category } from "../domain/types";

export default function CategoryLabel({ value }: { value: Category }) {
  return <span className="text-xs text-muted-foreground">{value}</span>;
}
