import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Connector } from "../../domain/connectors";
import type { Visibility } from "../../domain/types";
import AddAppContextForm from "./AddAppContextForm";
import DocumentsAndNotesPanel from "./DocumentsAndNotesPanel";
import OrgAppsPanel from "./OrgAppsPanel";

type AddMode = "content" | "app";

export default function AddContextModal({
  open,
  onClose,
  onAddAppContext,
  onImport,
  onNotes,
}: {
  open: boolean;
  onClose: () => void;
  onAddAppContext: (
    connector: Connector,
    data: { title: string; body: string; sourceRef: string; visibility: Visibility; tags: string[] }
  ) => void;
  onImport: (fileNames: string[]) => void;
  onNotes: (data: { title: string; body: string; visibility: Visibility }) => void;
}) {
  const [mode, setMode] = useState<AddMode>("content");
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
      setMode("content");
      setSelectedApp(null);
    }
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="asrc-overlay" onMouseDown={onClose}>
      <div
        className="asrc-modal ctx-add-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Add context"
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
            aria-selected={mode === "content"}
            className={`ctx-mode-tab${mode === "content" ? " active" : ""}`}
            onClick={() => {
              setMode("content");
              setSelectedApp(null);
            }}
          >
            Documents &amp; notes
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "app"}
            className={`ctx-mode-tab${mode === "app" ? " active" : ""}`}
            onClick={() => {
              setMode("app");
              setSelectedApp(null);
            }}
          >
            From org app
          </button>
        </div>

        <div className="asrc-body">
          {mode === "content" ? (
            <DocumentsAndNotesPanel
              onImport={(names) => {
                onImport(names);
                onClose();
              }}
              onNotes={(data) => {
                onNotes(data);
                onClose();
              }}
            />
          ) : selectedApp ? (
            <AddAppContextForm
              connector={selectedApp}
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
