import { format } from 'date-fns';

export function AuditLog({ logs }) {
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'dd.MM.yyyy HH:mm:ss');
  };

  const getActionLabel = (action) => {
    const labels = {
      shift_booked: 'Schicht gebucht',
      cancel_request_created: 'Storno-Anfrage erstellt',
      swap_request_created: 'Tausch-Anfrage erstellt',
      request_approved: 'Anfrage genehmigt',
      request_rejected: 'Anfrage abgelehnt',
      shift_created: 'Schicht erstellt',
      shift_updated: 'Schicht bearbeitet',
      shift_deleted: 'Schicht gelöscht'
    };
    return labels[action] || action;
  };

  const getActionClass = (action) => {
    if (action.includes('approved') || action.includes('booked')) return 'success';
    if (action.includes('rejected') || action.includes('deleted')) return 'danger';
    if (action.includes('request')) return 'warning';
    return 'info';
  };

  if (logs.length === 0) {
    return (
      <div className="audit-log empty">
        <p>Keine Einträge im Audit-Log</p>
      </div>
    );
  }

  return (
    <div className="audit-log">
      <h3>Audit-Log</h3>

      <div className="log-list">
        {logs.map((log) => (
          <div key={log.id} className="log-entry">
            <div className="log-header">
              <span className={`log-action ${getActionClass(log.action)}`}>
                {getActionLabel(log.action)}
              </span>
              <span className="log-time">{formatTimestamp(log.createdAt)}</span>
            </div>

            <div className="log-details">
              <span className="log-actor">
                Benutzer: {log.actorId?.slice(0, 8)}...
              </span>

              {log.meta && Object.keys(log.meta).length > 0 && (
                <div className="log-meta">
                  {Object.entries(log.meta).map(([key, value]) => (
                    <span key={key} className="meta-item">
                      {key}: {typeof value === 'string' ? value.slice(0, 12) : value}
                      {typeof value === 'string' && value.length > 12 ? '...' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
