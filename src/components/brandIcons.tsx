import type { CSSProperties, HTMLAttributes } from "react";
import type { TouchpointKind } from "../domain/types";

const BRAND_ICON_CLASS: Partial<Record<TouchpointKind, string>> = {
  interview: "ci-google",
  teams: "ci-teams",
  excel: "ci-excel",
  slack: "ci-slack",
  survey: "ci-forms",
};

type BrandIconProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  kind: TouchpointKind;
  width?: number | string;
  height?: number | string;
};

export function hasBrandIcon(kind: TouchpointKind): boolean {
  return kind in BRAND_ICON_CLASS;
}

/**
 * Brand marks provided by the Coloured Icons CDN. `upload` and `custom` intentionally
 * fall back to a monogram because they are source types rather than external brands.
 */
export function BrandIcon({ kind, width, height, className, style, ...props }: BrandIconProps) {
  const iconClass = BRAND_ICON_CLASS[kind];
  if (!iconClass) return null;

  return (
    <i
      {...props}
      aria-hidden={props["aria-hidden"] ?? true}
      className={["ci", iconClass, className].filter(Boolean).join(" ")}
      style={{ ...style, width, height } as CSSProperties}
    />
  );
}

/** Renders a source mark, falling back to a colored monogram for non-brand sources. */
export function SourceMark({
  kind,
  mono,
  brandColor,
  size = 14,
}: {
  kind: TouchpointKind;
  mono?: string;
  brandColor?: string;
  size?: number;
}) {
  if (hasBrandIcon(kind)) {
    return <BrandIcon kind={kind} width={size} height={size} />;
  }
  const text = (mono ?? "?").slice(0, 2);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-sm font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: brandColor ?? "#5b6b66",
        fontSize: Math.round(size * (text.length > 1 ? 0.4 : 0.5)),
      }}
      aria-hidden
    >
      {text}
    </span>
  );
}
