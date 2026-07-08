import { useMemo, useState } from "react";
import { CONNECTOR_CATEGORIES, type ConnectorCategory } from "../../domain/connectors";
import { ORG_INTEGRATIONS, orgIntegrationConnector } from "../../domain/orgIntegrations";
import { SourceMark } from "../brandIcons";
import { IconSearch } from "../icons";

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
    <section className="ctx-org-apps">
      <div className="asrc-apps-head">
        <div className="asrc-search">
          <IconSearch />
          <input
            type="text"
            placeholder="Search org apps…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="asrc-cats" role="tablist" aria-label="Categories">
        {(["All", ...CONNECTOR_CATEGORIES] as CategoryFilter[]).map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={category === cat}
            className={`asrc-cat${category === cat ? " active" : ""}`}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="asrc-empty">No apps match "{query}".</div>
      ) : (
        <div className="ctx-org-apps-grid">
          {filtered.map(({ connector }) => (
            <button
              key={connector.id}
              type="button"
              className="ctx-org-app-tile"
              onClick={() => onSelectApp(connector)}
            >
              <span className="ctx-org-app-icon">
                <SourceMark
                  kind={connector.kind ?? "custom"}
                  mono={connector.mono}
                  brandColor={connector.brandColor}
                  size={32}
                />
              </span>
              <span className="ctx-org-app-text">
                <span className="ctx-org-app-name">{connector.name}</span>
              </span>
              <span className="ctx-org-app-action">Add info</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
