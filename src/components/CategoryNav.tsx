import { Link, useLocation } from "react-router-dom";

const tabs = [
  { label: "Overview", path: "/" },
  { label: "Projects", path: "/projects" },
  { label: "Analyst workspace", path: "/analyst" },
  { label: "Forecasts", path: "/movers" },
  { label: "Competitors", path: "/competitors" },
];

export default function CategoryNav() {
  const { pathname } = useLocation();
  return (
    <nav className="border-b border-border bg-card" aria-label="Primary navigation">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-5">
        {tabs.map((t) => {
          const active = t.path === "/" ? pathname === "/" : pathname.startsWith(t.path);
          return (
            <Link
              key={t.label}
              to={t.path}
              className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
