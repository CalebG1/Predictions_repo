import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../store";

export default function ForecastProcessing() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { getForecastJob, finishForecastJob } = useStore();

  const job = jobId ? getForecastJob(jobId) : undefined;

  useEffect(() => {
    if (!jobId || !job) {
      navigate("/", { replace: true });
      return;
    }
    if (job.complete) {
      navigate(`/q/${job.questionId}`, { replace: true });
      return;
    }

    const check = () => {
      if (Date.now() - job.startedAt < job.durationMs) return;
      const question = finishForecastJob(job.id);
      if (question) navigate(`/q/${question.id}`, { replace: true });
    };

    check();
    const timer = window.setInterval(check, 2000);
    return () => window.clearInterval(timer);
  }, [job, jobId, navigate, finishForecastJob]);

  if (!job) return null;

  return (
    <div className="dash-page forecast-processing">
      <div className="fp-card fp-card-minimal">
        <div className="fp-spinner" aria-hidden="true" />
        <h1 className="fp-loading-title">Loading</h1>
        <p className="fp-loading-sub">This takes approximately 10 minutes.</p>
        <Link to="/" className="fp-back">
          Back to questions
        </Link>
      </div>
    </div>
  );
}
