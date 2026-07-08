import type { EvidenceItem } from "../domain/evidenceItems";
import { BrandIcon } from "./brandIcons";
import { IconExternalLink } from "./icons";

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
    <div className="pc-evc-app">
      <div className="pc-evc-app-head">
        <span className={`pc-evc-app-logo pc-evc-app-logo-${app.app}`}>
          <BrandIcon kind={app.app} width={16} height={16} />
        </span>
        <div className="pc-evc-app-headtext">
          <span className="pc-evc-app-channel">{app.channel}</span>
          <span className="pc-evc-app-name">{app.app === "teams" ? "Microsoft Teams" : "Slack"}</span>
        </div>
      </div>
      <div className="pc-evc-message">
        <div className="pc-evc-message-author">
          <span className="pc-evc-avatar" aria-hidden="true">
            {app.author
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)}
          </span>
          <span className="pc-evc-author-name">{app.author}</span>
          <span className="pc-evc-author-role">{app.authorRole}</span>
        </div>
        <p className="pc-evc-message-text">{app.message}</p>
      </div>
    </div>
  );
}

function AnalysisBody({ item }: { item: EvidenceItem }) {
  const a = item.analysis!;
  return (
    <div className="pc-evc-analysis">
      <p className="pc-evc-analysis-narrative">{a.narrative}</p>
      <div className="pc-evc-code-block">
        <div className="pc-evc-code-head">
          <span>{a.language}</span>
        </div>
        <pre className="pc-evc-code">{a.code}</pre>
      </div>
      <div className="pc-evc-output-block">
        <span className="pc-evc-output-label">Output</span>
        <pre className="pc-evc-output">{a.output}</pre>
      </div>
    </div>
  );
}

function WebsiteBody({ item }: { item: EvidenceItem }) {
  const w = item.website!;
  return (
    <a className="pc-evc-website" href={w.url} target="_blank" rel="noopener noreferrer">
      <div className="pc-evc-website-head">
        <span className="pc-evc-favicon" aria-hidden="true">
          {w.publisher.slice(0, 1)}
        </span>
        <span className="pc-evc-domain">{w.domain}</span>
        <IconExternalLink />
      </div>
      <div className="pc-evc-website-headline">{w.headline}</div>
      <p className="pc-evc-website-snippet">{w.snippet}</p>
      <span className="pc-evc-website-source">{w.publisher}</span>
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
    <div className="pc-evc">
      <div className="pc-evc-nav">
        <button
          type="button"
          className="pc-evc-arrow"
          aria-label="Previous piece of evidence"
          onClick={() => go(-1)}
          disabled={items.length < 2}
        >
          ‹
        </button>
        <div className="pc-evc-nav-mid">
          <span className="pc-evc-kind-pill">{kindLabel(item)}</span>
          <span className="pc-evc-counter">
            {safeIndex + 1}/{items.length}
          </span>
        </div>
        <button
          type="button"
          className="pc-evc-arrow"
          aria-label="Next piece of evidence"
          onClick={() => go(1)}
          disabled={items.length < 2}
        >
          ›
        </button>
      </div>

      <div className="pc-evc-dots" role="tablist" aria-label="Evidence items">
        {items.map((it, i) => (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={i === safeIndex}
            className={`pc-evc-dot${i === safeIndex ? " active" : ""}`}
            onClick={() => onIndexChange(i)}
            aria-label={`Evidence ${i + 1} of ${items.length}`}
          />
        ))}
      </div>

      <div className="pc-evc-card">
        <div className="pc-evc-card-head">
          <span className="pc-evc-headline">{item.headline}</span>
          <span className="pc-evc-when">{fmtWhen(item.timestamp)}</span>
        </div>

        {item.kind === "app_message" && <AppMessageBody item={item} />}
        {item.kind === "analysis" && <AnalysisBody item={item} />}
        {item.kind === "website" && <WebsiteBody item={item} />}

        <div className="pc-evc-indicates">
          <span className="pc-evc-indicates-label">What this indicates</span>
          <p>{item.indicates}</p>
        </div>
      </div>
    </div>
  );
}
