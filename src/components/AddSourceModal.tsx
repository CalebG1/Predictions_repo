import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { createPortal } from "react-dom";
import {
  CONNECTOR_CATEGORIES,
  CONNECTORS,
  type Connector,
  type ConnectorCategory,
} from "../domain/connectors";
import type { TouchpointSignal } from "../domain/types";
import { SourceMark } from "./brandIcons";
import { IconSearch } from "./icons";

type CategoryFilter = "All" | ConnectorCategory;

function isConnected(signals: TouchpointSignal[], connector: Connector): boolean {
  return signals.some((s) =>
    connector.kind ? s.kind === connector.kind : s.sourceId === connector.id
  );
}

export default function AddSourceModal({
  open,
  signals,
  onClose,
  onConnect,
  onImport,
}: {
  open: boolean;
  signals: TouchpointSignal[];
  onClose: () => void;
  onConnect: (connector: Connector) => void;
  onImport: (fileNames: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [files, setFiles] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setCategory("All");
      setFiles([]);
      setDragOver(false);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CONNECTORS.filter((c) => {
      if (category !== "All" && c.category !== category) return false;
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, category]);

  if (!open) return null;

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const names = Array.from(list).map((f) => f.name);
    setFiles((prev) => Array.from(new Set([...prev, ...names])));
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const commitImport = () => {
    if (files.length === 0) return;
    onImport(files);
    setFiles([]);
  };

  return createPortal(
    <div className="asrc-overlay" onMouseDown={onClose}>
      <div
        className="asrc-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Add a source"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="asrc-head">
          <div>
            <h2 className="asrc-title">Add a source</h2>
            <p className="asrc-sub">
              Import files or connect an app to feed this forecast with signals.
            </p>
          </div>
          <button type="button" className="asrc-close" aria-label="Close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </header>

        <div className="asrc-body">
          <section className="asrc-import">
            <div
              className={`asrc-drop${dragOver ? " over" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
              }}
            >
              <div className="asrc-drop-icon" aria-hidden>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div className="asrc-drop-title">Drag &amp; drop files to import</div>
              <div className="asrc-drop-sub">
                PDF, CSV, XLSX, docs, or exports — or <span className="asrc-link">choose a file</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={(e) => addFiles(e.target.files)}
              />
            </div>

            {files.length > 0 && (
              <div className="asrc-filelist">
                {files.map((name) => (
                  <span key={name} className="asrc-file-chip">
                    <span className="asrc-file-name">{name}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${name}`}
                      onClick={() => setFiles((prev) => prev.filter((f) => f !== name))}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button type="button" className="asrc-import-btn" onClick={commitImport}>
                  Import {files.length} file{files.length > 1 ? "s" : ""}
                </button>
              </div>
            )}
          </section>

          <section className="asrc-apps">
            <div className="asrc-apps-head">
              <h3 className="asrc-apps-title">Connect an app</h3>
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
              <div className="asrc-empty">No connectors match “{query}”.</div>
            ) : (
              <div className="asrc-grid">
                {filtered.map((c) => {
                  const connected = isConnected(signals, c);
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
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
}
