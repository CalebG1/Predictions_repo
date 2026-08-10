import { Link } from "react-router-dom";
import { useStore } from "../store";
import { pct } from "../components/ui";
import { isStandardsQuestion } from "../domain/standards";

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
    // Standardized company commitments live on their own tab (/standards).
    if (isStandardsQuestion(q.id)) continue;
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
  rows.sort(
    (a, b) => b.date.localeCompare(a.date) || Math.abs(b.to - b.from) - Math.abs(a.to - a.from),
  );
  const top = rows.slice(0, 40);

  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-6 px-[22px] py-[26px]">
      <div>
        <h1 className="text-[26px] font-extrabold leading-tight">Movers Feed</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Every probability change across questions you can see, newest first, with the one-line
          trigger.
        </p>
      </div>

      <div className="divide-y rounded-lg border bg-card">
        {top.map((r, i) => {
          const delta = r.to - r.from;
          const up = delta >= 0;
          return (
            <Link
              to={`/q/${r.qid}`}
              key={i}
              className="grid gap-2 p-4 transition-colors hover:bg-muted/50 md:grid-cols-[7rem_9rem_minmax(12rem,1fr)_minmax(12rem,1fr)_8rem] md:items-center"
            >
              <span className="text-sm text-muted-foreground">
                {new Date(r.date).toLocaleString().split(",")[0]}
              </span>
              <span
                className={`text-sm font-medium tabular-nums ${up ? "text-emerald-600" : "text-red-600"}`}
              >
                {up ? "▲" : "▼"} {pct(r.from)} → {pct(r.to)}
              </span>
              <span className="font-medium">{r.title}</span>
              <span className="text-sm text-muted-foreground">{r.trigger}</span>
              <span className="text-sm text-muted-foreground">{r.source}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
