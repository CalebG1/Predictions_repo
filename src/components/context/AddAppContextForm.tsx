import { useState } from "react";
import type { Connector } from "../../domain/connectors";
import type { Visibility } from "../../domain/types";
import { SourceMark } from "../brandIcons";
import { visibilityOrder } from "../ui";

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
    <form className="ctx-app-form" onSubmit={handleSubmit}>
      <div className="ctx-app-form-head">
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
          <button type="button" className="ctx-link-btn" onClick={onCancel}>
            Change app
          </button>
        )}
      </div>

      <label className="ctx-field">
        <span className="ctx-field-label">Source reference (optional)</span>
        <input
          type="text"
          value={sourceRef}
          onChange={(e) => setSourceRef(e.target.value)}
          placeholder="e.g. #incidents channel, Q2 workbook tab, meeting 2026-06-26"
        />
      </label>

      <label className="ctx-field">
        <span className="ctx-field-label">Title</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short label for this information"
          required
        />
      </label>

      <label className="ctx-field">
        <span className="ctx-field-label">Information for the model</span>
        <textarea
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Relevant content for the model..."
          required
        />
      </label>

      <div className="ctx-field-row">
        <label className="ctx-field">
          <span className="ctx-field-label">Visibility</span>
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
            {visibilityOrder.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="ctx-field">
          <span className="ctx-field-label">Tags</span>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="cyber, leadership"
          />
        </label>
      </div>

      <button type="submit" className="ctx-primary-btn">
        {submitLabel}
      </button>
    </form>
  );
}
