import { useStore } from "../../store";

export default function Profile() {
  const { user, setUser, allUsers } = useStore();

  return (
    <>
      <div className="settings-section-head">
        <h2>Profile</h2>
        <p className="dash-sub">Your demo session identity and role-based visibility.</p>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span>Viewing as</span>
        </div>
        <p className="muted small" style={{ marginBottom: 14 }}>
          Switch roles to preview which questions appear for Risk Manager, CFO, or Analyst access levels.
        </p>
        <label className="profile-field">
          <span>User</span>
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
        </label>
      </div>
    </>
  );
}
