import type { ForecastQuestion } from "../domain/types";
import { useStore } from "../store";
import { Button } from "./ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

export default function DeleteQuestionModal({
  open,
  q,
  onClose,
}: {
  open: boolean;
  q: ForecastQuestion;
  onClose: () => void;
}) {
  const { hideQuestion, deleteQuestion } = useStore();
  const hide = () => {
    hideQuestion(q.id);
    onClose();
  };
  const remove = () => {
    deleteQuestion(q.id);
    onClose();
  };
  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <AlertDialogContent className="bg-card">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete question?</AlertDialogTitle>
          <AlertDialogDescription>
            Deleting removes this question for everyone in your organization. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="rounded-lg bg-muted p-3 text-sm font-medium">{q.title}</div>
        <AlertDialogFooter>
          <Button type="button" variant="outline" onClick={hide}>
            Hide for me
          </Button>
          <AlertDialogAction variant="destructive" onClick={remove}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
