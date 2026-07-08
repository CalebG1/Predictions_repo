import { useRef, useState, type DragEvent } from "react";

export default function ImportFilesPanel({
  onImport,
  submitLabel = "Import",
}: {
  onImport: (fileNames: string[]) => void;
  submitLabel?: string;
}) {
  const [files, setFiles] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
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
        <div className="asrc-drop-title">Drag &amp; drop files</div>
        <div className="asrc-drop-sub">
          or <span className="asrc-link">choose a file</span>
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
            {submitLabel} {files.length} file{files.length > 1 ? "s" : ""}
          </button>
        </div>
      )}
    </section>
  );
}
