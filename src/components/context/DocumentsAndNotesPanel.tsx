import ImportFilesPanel from "./ImportFilesPanel";
import NotesForm from "./NotesForm";
import type { Visibility } from "../../domain/types";

export default function DocumentsAndNotesPanel({
  onImport,
  onNotes,
  importLabel = "Add to library",
  notesLabel = "Save notes",
}: {
  onImport: (fileNames: string[]) => void;
  onNotes: (data: { title: string; body: string; visibility: Visibility }) => void;
  importLabel?: string;
  notesLabel?: string;
}) {
  return (
    <div className="space-y-6">
      <ImportFilesPanel submitLabel={importLabel} onImport={onImport} />
      <div className="border-t" />
      <NotesForm submitLabel={notesLabel} onSubmit={onNotes} />
    </div>
  );
}
