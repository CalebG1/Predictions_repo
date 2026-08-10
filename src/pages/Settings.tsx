import { NavLink, Outlet } from "react-router-dom";

const tabs = [
  { label: "Methodology", path: "methodology" },
  { label: "Context", path: "context" },
  { label: "Profile", path: "profile" },
];

export default function Settings() {
  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-6 px-[22px] py-[26px]">
      <div>
        <h1 className="text-[26px] font-extrabold leading-tight">Settings</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-[12rem_minmax(0,1fr)]">
        <nav className="flex gap-1 overflow-x-auto rounded-lg border bg-muted/40 p-1 md:flex-col md:self-start">
          {tabs.map((t) => (
            <NavLink
              key={t.path}
              to={t.path}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/70 hover:text-foreground"}`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>

        <div className="min-w-0 space-y-5">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
