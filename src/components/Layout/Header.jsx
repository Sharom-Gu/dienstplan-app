export function Header({ userData, onLogout }) {
  return (
    <header className="app-header">
      <div className="header-left">
        <h1>Dienstplan</h1>
      </div>

      {userData && (
        <div className="header-right">
          <span className="user-info">
            <span className="user-name">{userData.displayName}</span>
            {userData.role === 'admin' && (
              <span className="role-badge">Admin</span>
            )}
          </span>
          <button className="btn btn-secondary btn-small" onClick={onLogout}>
            Abmelden
          </button>
        </div>
      )}
    </header>
  );
}
