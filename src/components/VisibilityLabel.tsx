import type { Visibility } from "../domain/types";
import { IconLock } from "./icons";
import { visibilityConfig, visibilityLabel } from "./ui";

export default function VisibilityLabel({
  value,
  owningTeam,
}: {
  value: Visibility;
  owningTeam?: string;
}) {
  const showLock = value === "restricted";

  return (
    <span className="visibility-label" title={visibilityConfig[value].description}>
      {showLock && <IconLock />}
      {visibilityLabel(value, owningTeam)}
    </span>
  );
}
