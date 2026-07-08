import { useEffect, useMemo, useState } from "react";
import {
  allCategories,
  displayName,
  integrationsFor,
  roleLabel,
  userInitials,
} from "../../domain/profile";
import { userTeams } from "../../domain/teams";
import type { Category, UserPreferences, Visibility } from "../../domain/types";
import { useStore } from "../../store";
import { visibilityOrder } from "../../components/ui";

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="profile-toggle-row">
      <span className="profile-toggle-copy">
        <span className="profile-toggle-label">{label}</span>
        {description && <span className="profile-toggle-desc muted small">{description}</span>}
      </span>
      <span className="profile-toggle">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="profile-toggle-track" aria-hidden="true" />
      </span>
    </label>
  );
}

export default function Profile() {
  const {
    org,
    user,
    allUsers,
    updateUser,
    userPreferences,
    updateUserPreferences,
    questions,
    canView,
    orgTeams,
    teamJoinRequests,
    requestTeamJoin,
    approveTeamJoinRequest,
    rejectTeamJoinRequest,
  } = useStore();

  const [personalDraft, setPersonalDraft] = useState({
    name: user.name,
    email: user.email ?? "",
    title: user.title ?? "",
  });
  const [personalSaved, setPersonalSaved] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [requestedTeam, setRequestedTeam] = useState("");

  useEffect(() => {
    setPersonalDraft({
      name: user.name,
      email: user.email ?? "",
      title: user.title ?? "",
    });
    setPersonalSaved(false);
    setPrefsSaved(false);
    setRequestedTeam("");
  }, [user.id, user.name, user.email, user.title]);

  const memberships = useMemo(() => userTeams(user), [user]);
  const visibleQuestionCount = useMemo(() => questions.filter(canView).length, [questions, canView]);
  const integrations = useMemo(() => integrationsFor(user.role), [user.role]);

  const myPendingRequests = useMemo(
    () => teamJoinRequests.filter((r) => r.userId === user.id && r.status === "pending"),
    [teamJoinRequests, user.id]
  );

  const availableTeams = useMemo(() => {
    const blocked = new Set([
      ...memberships,
      ...myPendingRequests.map((r) => r.team),
    ]);
    return orgTeams.filter((team) => !blocked.has(team));
  }, [memberships, myPendingRequests, orgTeams]);

  const adminPendingRequests = useMemo(
    () => (user.role === "admin" ? teamJoinRequests.filter((r) => r.status === "pending") : []),
    [teamJoinRequests, user.role]
  );

  const userNameById = (id: string) => {
    const match = allUsers.find((u) => u.id === id);
    return match ? displayName(match) : id;
  };

  const handlePersonalSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({
      name: personalDraft.name.trim() || user.name,
      email: personalDraft.email.trim(),
      title: personalDraft.title.trim(),
    });
    setPersonalSaved(true);
    window.setTimeout(() => setPersonalSaved(false), 2500);
  };

  const handlePrefChange = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    updateUserPreferences({ [key]: value });
    setPrefsSaved(true);
    window.setTimeout(() => setPrefsSaved(false), 2000);
  };

  const toggleDomain = (domain: Category) => {
    const next = userPreferences.expertiseDomains.includes(domain)
      ? userPreferences.expertiseDomains.filter((d) => d !== domain)
      : [...userPreferences.expertiseDomains, domain];
    handlePrefChange("expertiseDomains", next);
  };

  const handleTeamRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestedTeam) return;
    requestTeamJoin(requestedTeam);
    setRequestedTeam("");
  };

  return (
    <>
      <div className="settings-section-head">
        <h2>Profile</h2>
        <p className="dash-sub">
          Manage your account, notifications, and forecasting defaults for {org.name}.
        </p>
      </div>

      <div className="profile-hero panel">
        <div className="profile-hero-main">
          <div className="profile-avatar" aria-hidden="true">
            {userInitials(user)}
          </div>
          <div>
            <h3 className="profile-hero-name">{displayName(user)}</h3>
            <p className="profile-hero-title">{user.title ?? roleLabel(user.role)}</p>
            <div className="profile-hero-meta">
              <span className="profile-role-badge">{roleLabel(user.role)}</span>
              {memberships.map((team) => (
                <span key={team} className="profile-team-badge">
                  {team}
                </span>
              ))}
              <span className="muted small">Member since {formatDate(user.joinedAt)}</span>
            </div>
          </div>
        </div>
        <div className="profile-hero-stats">
          <div className="profile-stat">
            <div className="profile-stat-num">{visibleQuestionCount}</div>
            <div className="profile-stat-lbl">Visible forecasts</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-num">{memberships.length}</div>
            <div className="profile-stat-lbl">Teams</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-num">{userPreferences.expertiseDomains.length}</div>
            <div className="profile-stat-lbl">Expertise domains</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span>Personal information</span>
          {personalSaved && <span className="profile-saved muted small">Saved</span>}
        </div>
        <form className="profile-form" onSubmit={handlePersonalSave}>
          <div className="profile-form-grid">
            <label className="profile-field">
              <span>Name</span>
              <input
                type="text"
                value={personalDraft.name}
                onChange={(e) => setPersonalDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </label>
            <label className="profile-field">
              <span>Email</span>
              <input
                type="email"
                value={personalDraft.email}
                onChange={(e) => setPersonalDraft((d) => ({ ...d, email: e.target.value }))}
              />
            </label>
            <label className="profile-field">
              <span>Department</span>
              <input
                type="text"
                value={user.department ?? user.team}
                readOnly
                className="readonly"
              />
            </label>
            <label className="profile-field">
              <span>Job title</span>
              <input
                type="text"
                value={personalDraft.title}
                onChange={(e) => setPersonalDraft((d) => ({ ...d, title: e.target.value }))}
              />
            </label>
          </div>
          <div className="profile-form-footer profile-form-footer-end">
            <button type="submit" className="btn btn-sm">
              Save changes
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span>Teams</span>
        </div>
        <div className="profile-teams-body">
          <div className="profile-teams-section">
            <span className="profile-teams-label">Your teams</span>
            <div className="profile-team-chip-row">
              {memberships.map((team) => (
                <span key={team} className="profile-team-chip">
                  {team}
                </span>
              ))}
            </div>
          </div>

          <form className="profile-team-request" onSubmit={handleTeamRequest}>
            <label className="profile-field profile-field-inline">
              <span>Request to join</span>
              <select
                value={requestedTeam}
                onChange={(e) => setRequestedTeam(e.target.value)}
                disabled={availableTeams.length === 0}
              >
                <option value="">
                  {availableTeams.length === 0 ? "No additional teams available" : "Select a team"}
                </option>
                {availableTeams.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn btn-sm" disabled={!requestedTeam}>
              Submit request
            </button>
          </form>

          {myPendingRequests.length > 0 && (
            <div className="profile-teams-section">
              <span className="profile-teams-label">Outstanding requests</span>
              <div className="profile-request-list">
                {myPendingRequests.map((request) => (
                  <div key={request.id} className="profile-request-row">
                    <div>
                      <div className="profile-request-team">{request.team}</div>
                      <div className="muted small">Requested {formatDate(request.requestedAt)}</div>
                    </div>
                    <span className="profile-request-status pending">Pending admin approval</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {user.role === "admin" && adminPendingRequests.length > 0 && (
          <div className="profile-admin-requests">
            <div className="profile-teams-label">Administrator review</div>
            <p className="muted small profile-panel-intro">
              Approve or reject team membership requests for your organization.
            </p>
            <div className="profile-request-list">
              {adminPendingRequests.map((request) => (
                <div key={request.id} className="profile-request-row">
                  <div>
                    <div className="profile-request-team">{request.team}</div>
                    <div className="muted small">
                      {userNameById(request.userId)} · Requested {formatDate(request.requestedAt)}
                    </div>
                  </div>
                  <div className="profile-admin-actions">
                    <button
                      type="button"
                      className="profile-secondary-btn"
                      onClick={() => approveTeamJoinRequest(request.id)}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="profile-link-btn"
                      onClick={() => rejectTeamJoinRequest(request.id)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <span>Notifications</span>
          {prefsSaved && <span className="profile-saved muted small">Updated</span>}
        </div>
        <div className="profile-pref-block">
          <label className="profile-field profile-field-inline">
            <span>Email digest</span>
            <select
              value={userPreferences.emailDigest}
              onChange={(e) => handlePrefChange("emailDigest", e.target.value as UserPreferences["emailDigest"])}
            >
              <option value="daily">Daily summary</option>
              <option value="weekly">Weekly rollup</option>
              <option value="none">Off</option>
            </select>
          </label>
        </div>
        <div className="profile-toggle-list">
          <Toggle
            checked={userPreferences.probabilityAlerts}
            onChange={(v) => handlePrefChange("probabilityAlerts", v)}
            label="Probability threshold alerts"
            description="Email when a watched forecast crosses your alert threshold"
          />
          <Toggle
            checked={userPreferences.commentMentions}
            onChange={(v) => handlePrefChange("commentMentions", v)}
            label="Comment mentions"
            description="Notify when someone @mentions you on a forecast thread"
          />
          <Toggle
            checked={userPreferences.contextApprovalRequests}
            onChange={(v) => handlePrefChange("contextApprovalRequests", v)}
            label="Context approval requests"
            description="Route restricted context submissions to your inbox"
          />
          <Toggle
            checked={userPreferences.weeklySummary}
            onChange={(v) => handlePrefChange("weeklySummary", v)}
            label="Executive weekly summary"
            description="Top movers, new risks, and calibration drift for your scope"
          />
          <Toggle
            checked={userPreferences.productUpdates}
            onChange={(v) => handlePrefChange("productUpdates", v)}
            label="Product updates"
            description="Release notes and methodology changes from Signal Ridge"
          />
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span>Forecasting defaults</span>
        </div>
        <p className="muted small profile-panel-intro">
          Pre-fill visibility and domain tags when you create forecasts or submit context.
        </p>
        <label className="profile-field profile-field-inline">
          <span>Default visibility</span>
          <select
            value={userPreferences.defaultVisibility}
            onChange={(e) => handlePrefChange("defaultVisibility", e.target.value as Visibility)}
          >
            {visibilityOrder.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <div className="profile-domains">
          <span className="profile-domains-label">Expertise domains</span>
          <div className="profile-domain-grid">
            {allCategories.map((cat) => {
              const active = userPreferences.expertiseDomains.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  className={`profile-domain-chip ${active ? "active" : ""}`}
                  onClick={() => toggleDomain(cat)}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span>Connected integrations</span>
        </div>
        <div className="profile-integrations">
          {integrations.map((integration) => (
            <div key={integration.id} className="profile-integration-row">
              <div>
                <div className="profile-integration-name">{integration.name}</div>
                <div className="muted small">{integration.description}</div>
                {integration.connectedAt && (
                  <div className="muted small">Connected {formatDate(integration.connectedAt)}</div>
                )}
              </div>
              <span className={`profile-integ-status ${integration.status}`}>
                {integration.status === "connected"
                  ? "Connected"
                  : integration.status === "pending"
                    ? "Pending IT"
                    : "Available"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel profile-danger-panel">
        <div className="panel-head">
          <span>Data &amp; account</span>
        </div>
        <p className="muted small profile-panel-intro">
          Export your forecast activity and comments for compliance requests. Account deactivation requires
          admin approval.
        </p>
        <div className="profile-danger-actions">
          <button type="button" className="profile-secondary-btn">
            Export my data
          </button>
          <button type="button" className="profile-danger-btn">
            Request deactivation
          </button>
        </div>
      </div>
    </>
  );
}
