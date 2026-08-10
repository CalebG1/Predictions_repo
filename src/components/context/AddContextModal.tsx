import { useEffect, useState } from "react";
import type { Connector } from "../../domain/connectors";
import type { NotebookCell, Visibility } from "../../domain/types";
import AddAppContextForm from "./AddAppContextForm";
import AnalysisPanel from "./AnalysisPanel";
import DocumentsAndNotesPanel from "./DocumentsAndNotesPanel";
import OrgAppsPanel from "./OrgAppsPanel";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";

type AddMode = "content" | "app" | "analysis";

export default function AddContextModal({
  open,
  onClose,
  onAddAppContext,
  onImport,
  onNotes,
  onAddAnalysis,
}: {
  open: boolean;
  onClose: () => void;
  onAddAppContext: (
    connector: Connector,
    data: {
      title: string;
      body: string;
      sourceRef: string;
      visibility: Visibility;
      tags: string[];
    },
  ) => void;
  onImport: (fileNames: string[]) => void;
  onNotes: (data: { title: string; body: string; visibility: Visibility }) => void;
  onAddAnalysis: (data: {
    title: string;
    body: string;
    visibility: Visibility;
    notebookCells: NotebookCell[];
    runtime: string;
  }) => void;
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

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto bg-card p-0 sm:max-w-4xl">
        <DialogHeader className="px-6 pt-6 pr-12">
          <DialogTitle>Add context</DialogTitle>
          <DialogDescription>
            Add documents, app material, or analysis to your context library.
          </DialogDescription>
        </DialogHeader>
        <Tabs
          value={mode}
          onValueChange={(value) => {
            setMode(value as AddMode);
            setSelectedApp(null);
          }}
          className="px-6"
        >
          <TabsList>
            <TabsTrigger value="content">Documents &amp; notes</TabsTrigger>
            <TabsTrigger value="app">From org app</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="px-6 pb-6">
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
          ) : mode === "analysis" ? (
            <AnalysisPanel
              onSubmit={(data) => {
                onAddAnalysis(data);
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
      </DialogContent>
    </Dialog>
  );
}
