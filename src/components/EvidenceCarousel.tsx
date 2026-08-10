import type { EvidenceItem } from "../domain/evidenceItems";
import { BrandIcon } from "./brandIcons";
import { IconExternalLink } from "./icons";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtWhen(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  const hour = d.getHours();
  const h12 = hour % 12 || 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${MONTHS[d.getMonth()]} ${d.getDate()} · ${h12} ${ampm}`;
}

function kindLabel(item: EvidenceItem): string {
  if (item.kind === "app_message") return item.app!.app === "teams" ? "Microsoft Teams" : "Slack";
  if (item.kind === "analysis") return "Analysis";
  return "Web article";
}

function AppMessageBody({ item }: { item: EvidenceItem }) {
  const app = item.app!;
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="inline-flex size-7 items-center justify-center rounded-md bg-muted">
          <BrandIcon kind={app.app} width={16} height={16} />
        </span>
        <div>
          <span className="block text-sm font-bold">{app.channel}</span>
          <span className="block text-xs text-muted-foreground">
            {app.app === "teams" ? "Microsoft Teams" : "Slack"}
          </span>
        </div>
      </div>
      <div className="rounded-lg bg-muted p-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold">
          <span
            className="inline-flex size-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary"
            aria-hidden="true"
          >
            {app.author
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)}
          </span>
          <span>{app.author}</span>
          <span className="text-muted-foreground">{app.authorRole}</span>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{app.message}</p>
      </div>
    </div>
  );
}

function AnalysisBody({ item }: { item: EvidenceItem }) {
  const a = item.analysis!;
  return (
    <div>
      <p className="mb-2.5 text-sm leading-6 text-muted-foreground">{a.narrative}</p>
      <div className="overflow-hidden rounded-lg border">
        <div className="border-b bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          <span>{a.language}</span>
        </div>
        <pre className="overflow-x-auto p-3 font-mono text-xs leading-5">{a.code}</pre>
      </div>
      <div className="mt-2.5 overflow-hidden rounded-lg border">
        <span className="block bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          Output
        </span>
        <pre className="overflow-x-auto bg-muted/40 p-3 font-mono text-xs leading-5">
          {a.output}
        </pre>
      </div>
    </div>
  );
}

function WebsiteBody({ item }: { item: EvidenceItem }) {
  const w = item.website!;
  return (
    <a
      className="block rounded-lg border p-3 text-foreground transition-colors hover:bg-muted/60"
      href={w.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span
          className="inline-flex size-5 items-center justify-center rounded bg-muted font-semibold"
          aria-hidden="true"
        >
          {w.publisher.slice(0, 1)}
        </span>
        <span className="font-medium">{w.domain}</span>
        <IconExternalLink />
      </div>
      <div className="mt-2 font-semibold">{w.headline}</div>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{w.snippet}</p>
      <span className="mt-2 block text-xs text-muted-foreground">{w.publisher}</span>
    </a>
  );
}

export default function EvidenceCarousel({
  items,
  index,
  onIndexChange,
}: {
  items: EvidenceItem[];
  index: number;
  onIndexChange: (index: number) => void;
}) {
  if (items.length === 0) return null;
  const safeIndex = Math.max(0, Math.min(items.length - 1, index));
  const item = items[safeIndex];

  const go = (dir: -1 | 1) => {
    onIndexChange((safeIndex + dir + items.length) % items.length);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Previous piece of evidence"
          onClick={() => go(-1)}
          disabled={items.length < 2}
        >
          ‹
        </Button>
        <div className="flex items-center gap-2">
          <span className="rounded bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
            {kindLabel(item)}
          </span>
          <span className="text-xs text-muted-foreground">
            {safeIndex + 1}/{items.length}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Next piece of evidence"
          onClick={() => go(1)}
          disabled={items.length < 2}
        >
          ›
        </Button>
      </div>

      <div className="flex justify-center gap-1.5" role="tablist" aria-label="Evidence items">
        {items.map((it, i) => (
          <Button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={i === safeIndex}
            className={`size-2 rounded-full p-0 ${i === safeIndex ? "bg-primary" : "bg-muted-foreground/30"}`}
            onClick={() => onIndexChange(i)}
            aria-label={`Evidence ${i + 1} of ${items.length}`}
          />
        ))}
      </div>

      <Card>
        <CardContent>
          <div className="mb-3 flex items-start justify-between gap-3">
            <span className="font-semibold">{item.headline}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {fmtWhen(item.timestamp)}
            </span>
          </div>

          {item.kind === "app_message" && <AppMessageBody item={item} />}
          {item.kind === "analysis" && <AnalysisBody item={item} />}
          {item.kind === "website" && <WebsiteBody item={item} />}

          <div className="mt-3 border-t border-dashed pt-3">
            <span className="text-xs font-semibold text-muted-foreground">What this indicates</span>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.indicates}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
