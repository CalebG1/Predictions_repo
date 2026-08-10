import { useEffect, useMemo, useState } from "react";
import type { Connector } from "../domain/connectors";
import type { ContextItem } from "../domain/types";
import AddAppContextForm from "./context/AddAppContextForm";
import DocumentsAndNotesPanel from "./context/DocumentsAndNotesPanel";
import OrgAppsPanel from "./context/OrgAppsPanel";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

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
    data: {
      title: string;
      body: string;
      sourceRef: string;
      visibility: import("../domain/types").Visibility;
      tags: string[];
    },
  ) => void;
  onImport: (fileNames: string[]) => void;
  onNotes: (data: {
    title: string;
    body: string;
    visibility: import("../domain/types").Visibility;
  }) => void;
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
    return libraryItems.filter((i) => i.status === "active" && !boundItemIds?.has(i.id));
  }, [libraryItems, boundItemIds]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto bg-card p-0 sm:max-w-3xl">
        <DialogHeader className="px-6 pt-6 pr-12">
          <DialogTitle>Add context</DialogTitle>
          <DialogDescription>
            Attach material from your library or an organization app.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)} className="px-6">
          <TabsList>
            <TabsTrigger value="library">From library</TabsTrigger>
            <TabsTrigger value="app">From org app</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="px-6 pb-6">
          {tab === "library" ? (
            <section className="space-y-4">
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
                <ul className="space-y-2">
                  {attachableLibrary.map((item) => (
                    <li key={item.id}>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-auto w-full justify-start gap-2 p-3 text-left"
                        onClick={() => {
                          onBindFromLibrary?.(item.id);
                          onClose();
                        }}
                      >
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          {item.type}
                        </span>
                        <span>{item.title}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {item.owningTeam}
                        </span>
                      </Button>
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
      </DialogContent>
    </Dialog>
  );
}
