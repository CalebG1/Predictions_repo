import { NavLink, Outlet } from "react-router-dom";

const tabs = [
  { label: "Methodology", path: "methodology" },
  { label: "Context", path: "context" },
];

export default function Settings() {
  return (
    <div className="dash-page settings-page">
      <div className="dash-head">
        <h1>Settings</h1>
      </div>

      <div className="settings-layout">
        <nav className="settings-nav">
          {tabs.map((t) => (
            <NavLink
              key={t.path}
              to={t.path}
              className={({ isActive }) => `settings-tab${isActive ? " active" : ""}`}
            >
              {t.label}
            </NavLink>
          ))}
        </nav>

        <div className="settings-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
