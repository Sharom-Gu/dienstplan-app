export function Navigation({ isAdmin, activeView, onViewChange }) {
  return (
    <nav className="app-nav">
      <button
        className={`nav-item ${activeView === 'calendar' ? 'active' : ''}`}
        onClick={() => onViewChange('calendar')}
      >
        Kalender
      </button>

      {isAdmin && (
        <button
          className={`nav-item ${activeView === 'admin' ? 'active' : ''}`}
          onClick={() => onViewChange('admin')}
        >
          Admin
        </button>
      )}
    </nav>
  );
}
