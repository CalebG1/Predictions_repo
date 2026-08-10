import { Link } from "react-router-dom";
import NotificationPanel from "./NotificationPanel";
import { useStore } from "../store";
import { Button } from "./ui/button";
import { Settings } from "lucide-react";

export default function Header() {
  const { org } = useStore();
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-5">
        <Link to="/" className="text-xl font-bold tracking-tight text-primary">
          Signal Ridge
        </Link>
        <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {org.name}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className=""
            render={<Link to="/settings" />}
            title="Settings"
          >
            <Settings className="size-[18px]" />
          </Button>
          <NotificationPanel />
        </div>
      </div>
    </header>
  );
}
