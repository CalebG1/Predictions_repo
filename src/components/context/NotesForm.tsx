import { useState } from "react";
import type { Visibility } from "../../domain/types";
import { visibilityOrder } from "../ui";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";

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
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="grid gap-1.5 text-sm font-medium">
        <span>Title</span>
        <Input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Q3 supply chain assumptions"
          required
        />
      </label>

      <label className="grid gap-1.5 text-sm font-medium">
        <span>Context body</span>
        <Textarea
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Private knowledge, assumptions, constraints, or other context for the model..."
          required
        />
      </label>

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

      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
