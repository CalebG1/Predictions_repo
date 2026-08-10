import { useState } from "react";
import type { Connector } from "../../domain/connectors";
import type { Visibility } from "../../domain/types";
import { SourceMark } from "../brandIcons";
import { visibilityOrder } from "../ui";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";

export default function AddAppContextForm({
  connector,
  onSubmit,
  onCancel,
  submitLabel = "Save to library",
}: {
  connector: Connector;
  onSubmit: (data: {
    title: string;
    body: string;
    sourceRef: string;
    visibility: Visibility;
    tags: string[];
  }) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [sourceRef, setSourceRef] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("team");
  const [tags, setTags] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) return;
    onSubmit({
      title: trimmedTitle,
      body: trimmedBody,
      sourceRef: sourceRef.trim(),
      visibility,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
        <SourceMark
          kind={connector.kind ?? "custom"}
          mono={connector.mono}
          brandColor={connector.brandColor}
          size={28}
        />
        <div>
          <b>{connector.name}</b>
        </div>
        {onCancel && (
          <Button type="button" variant="link" className="ml-auto px-0" onClick={onCancel}>
            Change app
          </Button>
        )}
      </div>

      <label className="grid gap-1.5 text-sm font-medium">
        <span>Source reference (optional)</span>
        <Input
          type="text"
          value={sourceRef}
          onChange={(e) => setSourceRef(e.target.value)}
          placeholder="e.g. #incidents channel, Q2 workbook tab, meeting 2026-06-26"
        />
      </label>

      <label className="grid gap-1.5 text-sm font-medium">
        <span>Title</span>
        <Input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short label for this information"
          required
        />
      </label>

      <label className="grid gap-1.5 text-sm font-medium">
        <span>Information for the model</span>
        <Textarea
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Relevant content for the model..."
          required
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium">
          <span>Visibility</span>
          <Select value={visibility} onValueChange={(value) => setVisibility(value as Visibility)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {visibilityOrder.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          <span>Tags</span>
          <Input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="cyber, leadership"
          />
        </label>
      </div>

      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
