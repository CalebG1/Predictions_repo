import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Connector } from "../domain/connectors";
import type { ContextItem } from "../domain/types";
import AddAppContextForm from "./context/AddAppContextForm";
import DocumentsAndNotesPanel from "./context/DocumentsAndNotesPanel";
import OrgAppsPanel from "./context/OrgAppsPanel";

type Tab = "library" | "app";

export default function AddSourceModal({
  open,
  libraryItems,
  boundItemIds,
  onClose,
  onAddAppContext,
  onImport,
  onNotes,
  onBindFromLibrary,
}: {
  open: boolean;
  libraryItems?: ContextItem[];
  boundItemIds?: Set<string>;
  onClose: () => void;
  onAddAppContext: (
    connector: Connector,
    data: { title: string; body: string; sourceRef: string; visibility: import("../domain/types").Visibility; tags: string[] }
  ) => void;
  onImport: (fileNames: string[]) => void;
  onNotes: (data: { title: string; body: string; visibility: import("../domain/types").Visibility }) => void;
  onBindFromLibrary?: (itemId: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("library");
  const [selectedApp, setSelectedApp] = useState<Connector | null>(null);

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
      setTab("library");
      setSelectedApp(null);
    }
  }, [open]);

  const attachableLibrary = useMemo(() => {
    if (!libraryItems) return [];
    return libraryItems.filter(
      (i) => i.status === "active" && !boundItemIds?.has(i.id)
    );
  }, [libraryItems, boundItemIds]);

  if (!open) return null;

  return createPortal(
    <div className="asrc-overlay" onMouseDown={onClose}>
      <div
        className="asrc-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Add context to forecast"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="asrc-head">
          <h2 className="asrc-title">Add context</h2>
          <button type="button" className="asrc-close" aria-label="Close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </header>

        <div className="ctx-mode-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "library"}
            className={`ctx-mode-tab${tab === "library" ? " active" : ""}`}
            onClick={() => setTab("library")}
          >
            From library
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "app"}
            className={`ctx-mode-tab${tab === "app" ? " active" : ""}`}
            onClick={() => setTab("app")}
          >
            From org app
          </button>
        </div>

        <div className="asrc-body">
          {tab === "library" ? (
            <section className="ctx-library-pick">
              <DocumentsAndNotesPanel
                importLabel="Import & attach"
                notesLabel="Save & attach"
                onImport={(fileNames) => {
                  onImport(fileNames);
                  onClose();
                }}
                onNotes={(data) => {
                  onNotes(data);
                  onClose();
                }}
              />
              {attachableLibrary.length > 0 && (
                <ul className="ctx-library-pick-list">
                  {attachableLibrary.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="ctx-library-pick-btn"
                        onClick={() => {
                          onBindFromLibrary?.(item.id);
                          onClose();
                        }}
                      >
                        <span className="ctx-type-badge">{item.type}</span>
                        <span>{item.title}</span>
                        <span className="muted small">{item.owningTeam}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : selectedApp ? (
            <AddAppContextForm
              connector={selectedApp}
              submitLabel="Save & attach to forecast"
              onCancel={() => setSelectedApp(null)}
              onSubmit={(data) => {
                onAddAppContext(selectedApp, data);
                onClose();
              }}
            />
          ) : (
            <OrgAppsPanel onSelectApp={setSelectedApp} />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
