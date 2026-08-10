import { Link, useLocation } from "react-router-dom";
import NotificationPanel from "./NotificationPanel";
import { useStore } from "../store";
import { Button } from "./ui/button";
import { Settings } from "lucide-react";
import SignalRidgeLogo from "../assets/sigridge_full_alt_flattened.svg";
import { Badge } from "./ui/badge";

export default function Header() {
  const { org } = useStore();
  const { pathname } = useLocation();
  const tabs = [
    { label: "Overview", path: "/" },
    { label: "Projects", path: "/projects" },
    { label: "Analyst workspace", path: "/analyst" },
    { label: "Forecasts", path: "/movers" },
    { label: "Competitors", path: "/competitors" },
    { label: "Standards", path: "/standards" },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-13 max-w-7xl items-center gap-4 px-5">
        <Link to="/" className="flex shrink-0 items-center" aria-label="Signal Ridge home">
          <img src={SignalRidgeLogo} alt="Signal Ridge" className="h-7 w-auto" />
        </Link>
        <Badge>{org.name}</Badge>
        <nav className="ml-2 flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto self-stretch" aria-label="Primary navigation">
          {tabs.map((tab) => {
            const active = tab.path === "/" ? pathname === "/" : pathname.startsWith(tab.path);
            return <Link key={tab.path} to={tab.path} className={`flex shrink-0 items-center border-b-2 px-3 text-sm font-medium transition-colors ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{tab.label}</Link>;
          })}
        </nav>

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
