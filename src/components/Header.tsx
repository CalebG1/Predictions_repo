import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo">
          Kalshi
        </Link>

        <nav className="main-nav">
          <a href="#">Markets</a>
          <a href="#">Perps</a>
          <a href="#">
            Live <span className="live-badge">47</span>
          </a>
          <a href="#">Social</a>
          <a href="#">More ▾</a>
        </nav>

        <div className="search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input placeholder="Trade on anything" />
        </div>

        <div className="header-right">
          <div className="balance">
            <div className="amt">$1.98</div>
            <div className="lbl">Cash</div>
          </div>
          <div className="balance portfolio">
            <div className="amt">$1.98</div>
            <div className="lbl">Portfolio</div>
          </div>
          <span className="icon-btn trophy" title="Rewards">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 3h12v2h3v3a4 4 0 0 1-4 4h-.3A6 6 0 0 1 13 15.9V18h3v3H8v-3h3v-2.1A6 6 0 0 1 7.3 12H7a4 4 0 0 1-4-4V5h3V3zm0 4H5v1a2 2 0 0 0 1 1.7V7zm12 0v2.7A2 2 0 0 0 19 8V7h-1z" />
            </svg>
          </span>
          <span className="icon-btn" title="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
          </span>
          <span className="icon-btn" title="Menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </span>
        </div>
      </div>
    </header>
  );
}
