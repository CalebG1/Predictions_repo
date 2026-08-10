import type { Visibility } from "../domain/types";
import VisibilityLabel from "./VisibilityLabel";

export default function VisibilityBadge({
  value,
  owningTeam,
}: {
  value: Visibility;
  owningTeam?: string;
}) {
  return (
    <span className="inline-flex rounded-full bg-muted px-2 py-1 text-xs">
      <VisibilityLabel value={value} owningTeam={owningTeam} />
    </span>
  );
}
