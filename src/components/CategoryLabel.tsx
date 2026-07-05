import type { Category } from "../domain/types";

export default function CategoryLabel({ value }: { value: Category }) {
  return <span className="visibility-label">{value}</span>;
}
