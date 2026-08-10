import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import NotificationPanel from "./NotificationPanel";
import { useStore } from "../store";
import { Button } from "./ui/button";
import {
  Boxes,
  ChartLine,
  FolderKanban,
  Grid2X2,
  LayoutDashboard,
  Network,
  Settings,
  ShieldCheck,
  Table2,
  UsersRound,
} from "lucide-react";
import SignalRidgeLogo from "../assets/sigridge_full_alt_flattened.svg";
import { Badge } from "./ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export default function Header() {
  const { org } = useStore();
  const { pathname } = useLocation();
  const [appsOpen, setAppsOpen] = useState(false);
  const primaryTabs = [
    { label: "Overview", path: "/", icon: LayoutDashboard },
    { label: "Projects", path: "/projects", icon: FolderKanban },
  ];
  const apps = [
    {
      label: "Analyst workspace",
      description: "Model assumptions and scenarios",
      path: "/analyst",
      icon: Table2,
    },
    {
      label: "Issue intelligence",
      description: "Distill thousands of signals",
      path: "/issue-intelligence",
      icon: Network,
    },
    {
      label: "Dependencies",
      description: "Monitor external exposure",
      path: "/dependencies",
      icon: Boxes,
    },
    {
      label: "Forecasts",
      description: "Review probability movement",
      path: "/movers",
      icon: ChartLine,
    },
    {
      label: "Competitors",
      description: "Track market signals",
      path: "/competitors",
      icon: UsersRound,
    },
    {
      label: "Standards",
      description: "Measure company commitments",
      path: "/standards",
      icon: ShieldCheck,
    },
  ];
  const isActive = (path: string) => (path === "/" ? pathname === "/" : pathname.startsWith(path));
  const appActive = apps.some((app) => isActive(app.path));
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-13 max-w-7xl items-center gap-4 px-5">
        <Link to="/" className="flex shrink-0 items-center" aria-label="Signal Ridge home">
          <img src={SignalRidgeLogo} alt="Signal Ridge" className="h-7 w-auto" />
        </Link>
        <Badge>{org.name}</Badge>
        <nav
          className="ml-2 flex flex-1 items-stretch gap-1 self-stretch"
          aria-label="Primary navigation"
        >
          {primaryTabs.map((tab) => (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex shrink-0 items-center border-b-2 px-3 text-sm font-medium transition-colors ${isActive(tab.path) ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {tab.label}
            </Link>
          ))}
          <Popover open={appsOpen} onOpenChange={setAppsOpen}>
            <PopoverTrigger
              className={`flex items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors ${appActive || appsOpen ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              aria-label="Open apps"
              title="Apps"
            >
              <Grid2X2 className="size-4" />
              Apps
            </PopoverTrigger>
            <PopoverContent
              className="w-[min(440px,calc(100vw-2rem))] gap-3 p-3"
              align="start"
              sideOffset={8}
            >
              <div>
                <p className="text-sm font-semibold">Apps</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Choose a workspace</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {apps.map((app) => {
                  const Icon = app.icon;
                  return (
                    <Link
                      key={app.path}
                      to={app.path}
                      onClick={() => setAppsOpen(false)}
                      className={`group rounded-lg border p-3 transition-colors ${isActive(app.path) ? "border-primary/40 bg-primary/5" : "hover:border-primary/35 hover:bg-muted/60"}`}
                    >
                      <Icon className="size-5 text-primary" />
                      <p className="mt-2 text-sm font-medium">{app.label}</p>
                      <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
                        {app.description}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
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
