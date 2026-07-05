import type { Category, ImpactLevel, RiskOrOpportunity, Visibility } from "../domain/types";

export const categoryOrder: Category[] = [
  "Financial",
  "Operational",
  "Geopolitical",
  "Regulatory",
  "Talent",
  "Security/Cyber",
  "Supply Chain",
  "Product",
  "Reputational",
  "Macro",
];

export const categoryColors: Record<Category, string> = {
  Financial: "#2f6df6",
  Operational: "#0ea5a4",
  Geopolitical: "#e5484d",
  Regulatory: "#8b5cf6",
  Talent: "#f0a500",
  "Security/Cyber": "#0e1a16",
  "Supply Chain": "#d97706",
  Product: "#00b888",
  Reputational: "#db2777",
  Macro: "#475569",
};

export function pct(p: number): string {
  return `${(p * 100).toFixed(0)}%`;
}

export function signedPct(d: number | null): string {
  if (d === null) return "–";
  const v = (d * 100).toFixed(0);
  return `${d >= 0 ? "+" : ""}${v}`;
}

export const impactRank: Record<ImpactLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export const impactLevelLabel: Record<ImpactLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const visibilityOrder: Visibility[] = ["public", "team", "leadership", "restricted"];

export const visibilityConfig: Record<Visibility, { label: string; description: string }> = {
  public: { label: "Everyone", description: "Visible to all org members" },
  team: { label: "Team", description: "Visible to the owning team only" },
  leadership: { label: "Leadership", description: "Executives and risk managers" },
  restricted: { label: "Private", description: "Explicit access grants only" },
};

export function visibilityLabel(visibility: Visibility, owningTeam?: string): string {
  switch (visibility) {
    case "public":
      return "Everyone";
    case "team":
      return owningTeam ?? "Team";
    case "leadership":
      return "Leadership";
    case "restricted":
      return "Private";
  }
}

export function isCategory(value: string): value is Category {
  return categoryOrder.includes(value as Category);
}

export function overviewHref(filters: {
  cat?: Category;
  owner?: string;
  type?: RiskOrOpportunity;
}): string {
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.cat) params.set("cat", filters.cat);
  if (filters.owner) params.set("owner", filters.owner);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
