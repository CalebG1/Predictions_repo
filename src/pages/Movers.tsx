import { Link } from "react-router-dom";
import { useStore } from "../store";
import { pct } from "../components/ui";

interface MoverRow {
  qid: string;
  title: string;
  date: string;
  from: number;
  to: number;
  trigger: string;
  source: string;
}

export default function Movers() {
  const { questions, yesOutcome, historyFor } = useStore();

  const rows: MoverRow[] = [];
  for (const q of questions) {
    const yes = yesOutcome(q.id);
    if (!yes) continue;
    const h = historyFor(yes.id);
    for (let i = 1; i < h.length; i++) {
      rows.push({
        qid: q.id,
        title: q.title,
        date: h[i].timestamp,
        from: h[i - 1].probability,
        to: h[i].probability,
        trigger: h[i].updateTrigger,
        source: h[i].source,
      });
    }
  }
  rows.sort((a, b) => b.date.localeCompare(a.date) || Math.abs(b.to - b.from) - Math.abs(a.to - a.from));
  const top = rows.slice(0, 40);

  return (
    <div className="dash-page">
      <div className="dash-head">
        <h1>Movers Feed</h1>
        <p className="dash-sub">Every probability change across questions you can see, newest first, with the one-line trigger.</p>
      </div>

      <div className="feed">
        {top.map((r, i) => {
          const delta = r.to - r.from;
          const up = delta >= 0;
          return (
            <Link to={`/q/${r.qid}`} key={i} className="feed-row">
              <span className="feed-date">{r.date}</span>
              <span className={`feed-delta ${up ? "up" : "down"}`}>
                {up ? "▲" : "▼"} {pct(r.from)} → {pct(r.to)}
              </span>
              <span className="feed-title">{r.title}</span>
              <span className="feed-trigger">{r.trigger}</span>
              <span className="feed-source">{r.source}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
