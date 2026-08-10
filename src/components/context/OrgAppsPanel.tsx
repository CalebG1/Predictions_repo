import { useMemo, useState } from "react";
import { CONNECTOR_CATEGORIES, type ConnectorCategory } from "../../domain/connectors";
import { ORG_INTEGRATIONS, orgIntegrationConnector } from "../../domain/orgIntegrations";
import { SourceMark } from "../brandIcons";
import { IconSearch } from "../icons";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

type CategoryFilter = "All" | ConnectorCategory;

export default function OrgAppsPanel({
  onSelectApp,
}: {
  onSelectApp: (connector: import("../../domain/connectors").Connector) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("All");

  const apps = useMemo(() => {
    return ORG_INTEGRATIONS.map((integration) => {
      const connector = orgIntegrationConnector(integration);
      return connector ? { integration, connector } : null;
    }).filter((x): x is NonNullable<typeof x> => x !== null);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps.filter(({ connector }) => {
      if (category !== "All" && connector.category !== category) return false;
      if (q && !connector.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [apps, query, category]);

  return (
    <section className="space-y-4">
      <div className="relative">
        <IconSearch />
        <Input
          className="pl-8"
          type="text"
          placeholder="Search org apps…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Categories">
        {(["All", ...CONNECTOR_CATEGORIES] as CategoryFilter[]).map((cat) => (
          <Button
            key={cat}
            type="button"
            role="tab"
            aria-selected={category === cat}
            variant={category === cat ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No apps match "{query}".
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {filtered.map(({ connector }) => (
            <Button
              key={connector.id}
              type="button"
              variant="outline"
              className="h-auto justify-start gap-3 p-3 text-left"
              onClick={() => onSelectApp(connector)}
            >
              <span className="shrink-0">
                <SourceMark
                  kind={connector.kind ?? "custom"}
                  mono={connector.mono}
                  brandColor={connector.brandColor}
                  size={32}
                />
              </span>
              <span className="min-w-0 flex-1 font-medium">
                <span>{connector.name}</span>
              </span>
              <span className="text-xs font-medium text-primary">Add info</span>
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}
