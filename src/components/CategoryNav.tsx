import { Link, useLocation } from "react-router-dom";

const categories = [
  { label: "Trending", path: "/" },
  { label: "Elections", path: "/elections" },
  { label: "Politics", path: "/politics" },
  { label: "Sports", path: "/sports" },
  { label: "Culture", path: "/culture" },
  { label: "Crypto", path: "/crypto" },
  { label: "Commodities", path: "/commodities" },
  { label: "Climate", path: "/climate" },
  { label: "Economics", path: "/economics" },
  { label: "Mentions", path: "/mentions" },
  { label: "Finance", path: "/finance" },
  { label: "Tech & Science", path: "/tech" },
];

export default function CategoryNav() {
  const { pathname } = useLocation();
  return (
    <div className="cat-nav">
      <div className="cat-nav-inner">
        {categories.map((c, i) => {
          const active = c.path === pathname;
          return (
            <Link key={c.label} to={c.path} className={`cat-link${active ? " active" : ""}`}>
              {i === 0 && (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <line x1="7" y1="9" x2="17" y2="9" />
                  <line x1="7" y1="13" x2="17" y2="13" />
                </svg>
              )}
              {c.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
