import { Link } from "react-router-dom";
import { connectorById } from "../../domain/connectors";
import type { ContextItem, ContextRevision } from "../../domain/types";
import VisibilityBadge from "../VisibilityBadge";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { Card, CardContent } from "../ui/card";

function typeLabel(item: ContextItem): string {
  if (item.connectorId && item.type === "manual") return "App context";
  if (item.type === "manual" || item.type === "instruction") return "Notes";
  if (item.type === "analysis") return "Analysis";
  return item.type.charAt(0).toUpperCase() + item.type.slice(1);
}

function statusLabel(status: ContextItem["status"]): string {
  return status === "pending_approval"
    ? "Pending approval"
    : status.charAt(0).toUpperCase() + status.slice(1);
}

export default function ContextItemDetail({
  item,
  bindings,
  revisions,
  canEdit,
  onClose,
  onArchive,
  onApprove,
  onReject,
}: {
  item: ContextItem;
  bindings: { questionId: string; questionTitle: string }[];
  revisions: ContextRevision[];
  canEdit: boolean;
  onClose: () => void;
  onArchive: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const appConnector = item.connectorId ? connectorById(item.connectorId) : undefined;
  const isAppContext = item.type === "manual" && !!item.connectorId;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-y-auto p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">{item.title}</DialogTitle>
        <header className="flex items-start justify-between gap-4 border-b bg-muted/40 px-6 py-5">
          <div className="min-w-0 flex-1">
            <h3 className="mb-2.5 text-xl font-semibold leading-snug">{item.title}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-muted px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {typeLabel(item)}
              </span>
              <VisibilityBadge value={item.visibility} />
              <span
                className={
                  item.status === "active"
                    ? "text-sm font-medium capitalize text-emerald-700"
                    : item.status === "pending_approval"
                      ? "text-sm font-medium capitalize text-amber-700"
                      : item.status === "error"
                        ? "text-sm font-medium capitalize text-destructive"
                        : "text-sm font-medium capitalize text-muted-foreground"
                }
              >
                {statusLabel(item.status)}
              </span>
            </div>
            <p className="mt-2.5 text-sm text-muted-foreground">
              {item.owningTeam} · {item.updatedAt.slice(0, 10)}
              {isAppContext && appConnector ? ` · ${appConnector.name}` : ""}
            </p>
          </div>
          <Button type="button" variant="outline" size="icon" aria-label="Close" onClick={onClose}>
            ×
          </Button>
        </header>

        <div className="flex flex-1 flex-col gap-4 px-6 py-5">
          {item.notebookCells && item.notebookCells.length > 0 ? (
            <Card className="bg-muted/40">
              <CardContent>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Notebook
                </span>
                <div className="space-y-2.5">
                  {item.notebookCells.map((cell) => (
                    <div key={cell.id} className="space-y-1.5">
                      {cell.kind === "markdown" ? (
                        <p className="text-sm font-semibold">{cell.source}</p>
                      ) : (
                        <>
                          <pre className="whitespace-pre-wrap rounded-md border bg-background p-3 font-mono text-xs leading-5">
                            {cell.source}
                          </pre>
                          {(cell.output || cell.error) && (
                            <pre
                              className={`whitespace-pre-wrap rounded-md border p-3 font-mono text-xs leading-5 ${cell.error ? "border-destructive/30 bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}
                            >
                              {cell.error ?? cell.output}
                            </pre>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            item.body && (
              <Card className="bg-muted/40">
                <CardContent>
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Context
                  </span>
                  <pre className="whitespace-pre-wrap rounded-md border bg-background p-3 text-sm leading-6">
                    {item.body}
                  </pre>
                </CardContent>
              </Card>
            )
          )}

          {item.fileNames && item.fileNames.length > 0 && (
            <Card className="bg-muted/40">
              <CardContent>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Files
                </span>
                <ul className="space-y-1 text-sm">
                  {item.fileNames.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card className="bg-muted/40">
            <CardContent>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Bound forecasts · {bindings.length}
              </span>
              {bindings.length > 0 && (
                <ul className="divide-y text-sm">
                  {bindings.map((b) => (
                    <li key={b.questionId}>
                      <Link
                        className="block py-1.5 text-primary hover:underline"
                        to={`/q/${b.questionId}`}
                        onClick={onClose}
                      >
                        {b.questionTitle}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {revisions.length > 0 && (
            <Card className="bg-muted/40">
              <CardContent>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Revisions
                </span>
                <ul className="divide-y">
                  {revisions.map((r) => (
                    <li key={r.id} className="py-3 last:pb-0">
                      <div className="mb-1.5 flex items-baseline gap-2">
                        <b>v{r.version}</b>
                        <span className="text-muted-foreground small">
                          {r.changedAt.slice(0, 10)}
                        </span>
                      </div>
                      {r.body.length > 0 && (
                        <pre className="whitespace-pre-wrap rounded-md border bg-background p-3 text-sm leading-6">
                          {r.body.slice(0, 160)}
                          {r.body.length > 160 ? "…" : ""}
                        </pre>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <footer className="flex flex-wrap gap-2.5 border-t bg-muted/40 px-6 py-4">
          {item.status === "pending_approval" && onApprove && onReject && (
            <>
              <Button type="button" onClick={onApprove}>
                Approve
              </Button>
              <Button type="button" variant="outline" onClick={onReject}>
                Reject
              </Button>
            </>
          )}
          {canEdit && item.status !== "archived" && (
            <Button type="button" variant="outline" onClick={onArchive}>
              Archive
            </Button>
          )}
        </footer>
      </DialogContent>
    </Dialog>
  );
}
