import { Link, useLocation } from "react-router-dom";

const tabs = [
  { label: "Overview", path: "/" },
  { label: "Calibration & Accuracy", path: "/calibration" },
  { label: "Decision View", path: "/decision" },
  { label: "Movers", path: "/movers" },
];

export default function CategoryNav() {
  const { pathname } = useLocation();
  return (
    <div className="cat-nav">
      <div className="cat-nav-inner">
        {tabs.map((t) => {
          const active = t.path === "/" ? pathname === "/" : pathname.startsWith(t.path);
          return (
            <Link key={t.label} to={t.path} className={`cat-link${active ? " active" : ""}`}>
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
