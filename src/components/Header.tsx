import { Link } from "react-router-dom";
import { useStore } from "../store";

export default function Header() {
  const { org, user, setUser, allUsers } = useStore();
  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo">
          Foresight
        </Link>
        <span className="org-chip">{org.name}</span>

        <div className="search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input placeholder="Search risks & opportunities" />
        </div>

        <div className="header-right">
          <div className="role-switch">
            <span className="rs-label">Viewing as</span>
            <select
              value={user.id}
              onChange={(e) => {
                const next = allUsers.find((u) => u.id === e.target.value);
                if (next) setUser(next);
              }}
            >
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <span className="icon-btn" title="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
          </span>
        </div>
      </div>
    </header>
  );
}
