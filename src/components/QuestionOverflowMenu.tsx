import { useState, type MouseEvent } from "react";
import type { ForecastQuestion } from "../domain/types";
import { questionUrl, shareMessage } from "../domain/share";
import { useStore } from "../store";
import CreateAlertModal from "./CreateAlertModal";
import DeleteQuestionModal from "./DeleteQuestionModal";
import { IconBell, IconDots, IconPin, IconRefresh, IconShare, IconTrash } from "./icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function QuestionOverflowMenu({
  q,
  probability,
  showPin = false,
}: {
  q: ForecastQuestion;
  probability: number;
  showPin?: boolean;
}) {
  const { refreshForecast, togglePin, isPinned } = useStore();
  const [open, setOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const pinned = isPinned(q.id);

  const stopNav = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const closeMenu = () => setOpen(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <div onClick={stopNav} onMouseDown={stopNav}>
        <DropdownMenuTrigger
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          title="More actions"
          aria-label="More actions"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <IconDots />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="min-w-0">
          {showPin && (
            <DropdownMenuItem
              className={pinned ? "text-amber-600" : undefined}
              aria-label={pinned ? "Unpin" : "Pin"}
              onClick={() => {
                togglePin(q.id);
                closeMenu();
              }}
            >
              <IconPin filled={pinned} /> {pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            aria-label="Set alert"
            onClick={() => {
              setAlertOpen(true);
              closeMenu();
            }}
          >
            <IconBell /> Set alert
          </DropdownMenuItem>
          <DropdownMenuItem
            aria-label="Share"
            onClick={async () => {
              await copyText(`${shareMessage(q, probability)}\n${questionUrl(q.id)}`);
              closeMenu();
            }}
          >
            <IconShare /> Share
          </DropdownMenuItem>
          <DropdownMenuItem
            aria-label="Refresh"
            onClick={() => {
              refreshForecast(q.id);
              closeMenu();
            }}
          >
            <IconRefresh /> Refresh
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            aria-label="Delete"
            onClick={() => {
              setDeleteOpen(true);
              closeMenu();
            }}
          >
            <IconTrash /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </div>

      <CreateAlertModal
        open={alertOpen}
        q={q}
        probability={probability}
        onClose={() => setAlertOpen(false)}
      />
      <DeleteQuestionModal open={deleteOpen} q={q} onClose={() => setDeleteOpen(false)} />
    </DropdownMenu>
  );
}
