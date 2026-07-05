import { Link, useParams } from "react-router-dom";
import { useStore } from "../store";
import { categoryColors, pct } from "../components/ui";

export default function QuestionEmbed() {
  const { id } = useParams();
  const { questions, yesOutcome } = useStore();
  const q = questions.find((x) => x.id === id);

  if (!q) {
    return (
      <div className="embed-card embed-unavailable">
        <p>Forecast unavailable</p>
      </div>
    );
  }

  const yes = yesOutcome(q.id);
  const p = yes?.currentProbability ?? q.priorBaseRate;

  return (
    <div className="embed-card">
      <div className="embed-top">
        <span className="embed-cat" style={{ color: categoryColors[q.category] }}>
          {q.category}
        </span>
        <span className="embed-prob">{pct(p)}</span>
      </div>
      <h2 className="embed-title">{q.title}</h2>
      <div className="embed-foot">
        <span>Resolves {q.resolutionDate}</span>
        <Link to={`/q/${q.id}`} target="_blank" rel="noopener noreferrer">
          Open →
        </Link>
      </div>
    </div>
  );
}
