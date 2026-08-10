import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../store";
import { Card, CardContent } from "../components/ui/card";

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
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center p-6">
      <Card className="w-full">
        <CardContent className="space-y-4 p-6 text-center">
          <div
            className="mx-auto size-8 animate-spin rounded-full border-4 border-muted border-t-primary"
            aria-hidden="true"
          />
          <h1 className="text-xl font-semibold">Loading</h1>
          <p className="text-sm text-muted-foreground">This takes approximately 10 minutes.</p>
          <Link to="/" className="inline-flex text-sm font-medium text-primary hover:underline">
            Back to questions
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
