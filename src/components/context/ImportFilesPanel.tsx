import { useRef, useState, type DragEvent } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Upload } from "lucide-react";

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
    <section className="space-y-3">
      <div
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/60 hover:bg-muted/40"}`}
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
        <div className="mb-2 flex justify-center text-muted-foreground" aria-hidden>
          <Upload className="size-[30px]" strokeWidth={1.6} />
        </div>
        <div className="font-medium">Drag &amp; drop files</div>
        <div className="mt-1 text-sm text-muted-foreground">
          or <span className="text-primary underline">choose a file</span>
        </div>
        <Input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {files.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 rounded-full bg-muted py-1 pl-2 pr-1 text-sm"
            >
              <span>{name}</span>
              <Button
                type="button"
                aria-label={`Remove ${name}`}
                onClick={() => setFiles((prev) => prev.filter((f) => f !== name))}
                variant="ghost"
                size="icon"
                className="size-6 rounded-full"
              >
                ×
              </Button>
            </span>
          ))}
          <Button type="button" onClick={commitImport}>
            {submitLabel} {files.length} file{files.length > 1 ? "s" : ""}
          </Button>
        </div>
      )}
    </section>
  );
}
