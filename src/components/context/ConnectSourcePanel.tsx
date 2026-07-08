import { useMemo, useState } from "react";
import {
  CONNECTOR_CATEGORIES,
  CONNECTORS,
  type Connector,
  type ConnectorCategory,
} from "../../domain/connectors";
import { SourceMark } from "../brandIcons";
import { IconSearch } from "../icons";

type CategoryFilter = "All" | ConnectorCategory;

export default function ConnectSourcePanel({
  connectedIds,
  onConnect,
  embedded = false,
}: {
  connectedIds: Set<string>;
  onConnect: (connector: Connector) => void;
  /** When true, omit the section title (parent panel already has one). */
  embedded?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CONNECTORS.filter((c) => {
      if (category !== "All" && c.category !== category) return false;
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, category]);

  return (
    <section className={`asrc-apps${embedded ? " ctx-embedded-apps" : ""}`}>
      <div className="asrc-apps-head">
        {!embedded && <h3 className="asrc-apps-title">Connect an app</h3>}
        <div className="asrc-search">
          <IconSearch />
          <input
            type="text"
            placeholder="Search for a connector"
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
        <div className="asrc-empty">No connectors match "{query}".</div>
      ) : (
        <div className="asrc-grid">
          {filtered.map((c) => {
            const connected = connectedIds.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className={`asrc-tile${connected ? " connected" : ""}`}
                disabled={connected}
                onClick={() => onConnect(c)}
                title={connected ? `${c.name} connected` : `Connect ${c.name}`}
              >
                <span className="asrc-tile-icon">
                  <SourceMark kind={c.kind ?? "custom"} mono={c.mono} brandColor={c.brandColor} size={30} />
                </span>
                <span className="asrc-tile-text">
                  <span className="asrc-tile-name">{c.name}</span>
                  <span className="asrc-tile-cat">{c.category}</span>
                </span>
                <span className={`asrc-tile-action${connected ? " done" : ""}`}>
                  {connected ? "Connected" : "Connect"}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <p className="muted small ctx-credential-note">
        Credentials are managed by your IT admin. No secrets are stored in the browser.
      </p>
    </section>
  );
}
