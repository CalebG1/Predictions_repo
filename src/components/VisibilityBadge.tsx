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
    <span className="visibility-badge">
      <VisibilityLabel value={value} owningTeam={owningTeam} />
    </span>
  );
}
