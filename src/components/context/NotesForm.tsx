import { useState } from "react";
import type { Visibility } from "../../domain/types";
import { visibilityOrder } from "../ui";

/** Simple free-form notes — title and context body only. */
export default function NotesForm({
  onSubmit,
  submitLabel = "Save notes",
}: {
  onSubmit: (data: { title: string; body: string; visibility: Visibility }) => void;
  submitLabel?: string;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("team");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) return;
    onSubmit({ title: trimmedTitle, body: trimmedBody, visibility });
    setTitle("");
    setBody("");
  };

  return (
    <form className="ctx-manual-form" onSubmit={handleSubmit}>
      <label className="ctx-field">
        <span className="ctx-field-label">Title</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Q3 supply chain assumptions"
          required
        />
      </label>

      <label className="ctx-field">
        <span className="ctx-field-label">Context body</span>
        <textarea
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Private knowledge, assumptions, constraints, or other context for the model..."
          required
        />
      </label>

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

      <button type="submit" className="ctx-primary-btn">
        {submitLabel}
      </button>
    </form>
  );
}
