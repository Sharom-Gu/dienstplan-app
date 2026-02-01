import { useState } from 'react';
import { format } from 'date-fns';

export function RequestQueue({ requests, onApprove, onReject }) {
  const [processingId, setProcessingId] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [activeNoteId, setActiveNoteId] = useState(null);

  const handleApprove = async (requestId) => {
    setProcessingId(requestId);
    try {
      await onApprove(requestId, adminNote);
      setAdminNote('');
      setActiveNoteId(null);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId) => {
    setProcessingId(requestId);
    try {
      await onReject(requestId, adminNote);
      setAdminNote('');
      setActiveNoteId(null);
    } finally {
      setProcessingId(null);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'dd.MM.yyyy HH:mm');
  };

  const getRequestTypeLabel = (type) => {
    switch (type) {
      case 'cancel':
        return 'Storno';
      case 'swap':
        return 'Tausch';
      case 'booking':
        return 'Buchung';
      default:
        return type;
    }
  };

  if (requests.length === 0) {
    return (
      <div className="request-queue empty">
        <p>Keine ausstehenden Anfragen</p>
      </div>
    );
  }

  return (
    <div className="request-queue">
      <h3>Ausstehende Anfragen ({requests.length})</h3>

      <div className="request-list">
        {requests.map((request) => (
          <div key={request.id} className="request-card">
            <div className="request-header">
              <span className={`request-type ${request.type}`}>
                {getRequestTypeLabel(request.type)}
              </span>
              <span className="request-date">
                {formatTimestamp(request.createdAt)}
              </span>
            </div>

            <div className="request-details">
              <p>
                <strong>Mitarbeiter:</strong> {request.userName || request.requesterId?.slice(0, 8) + '...'}
              </p>
              {request.type === 'booking' && (
                <>
                  <p>
                    <strong>Schicht:</strong> {request.shiftDate} ({request.shiftType})
                  </p>
                  <p>
                    <strong>Zeit:</strong> {request.shiftTime}
                  </p>
                </>
              )}
              {request.type === 'cancel' && (
                <>
                  <p>
                    <strong>Schicht:</strong> {request.shiftDate} ({request.shiftType})
                  </p>
                  <p>
                    <strong>Zeit:</strong> {request.shiftTime}
                  </p>
                </>
              )}
              {request.type === 'swap' && (
                <>
                  <p>
                    <strong>Von Buchung:</strong>{' '}
                    {request.fromBookingId?.slice(0, 8)}...
                  </p>
                  <p>
                    <strong>Zu Schicht:</strong>{' '}
                    {request.toShiftId?.slice(0, 8)}...
                  </p>
                </>
              )}
            </div>

            {activeNoteId === request.id && (
              <div className="admin-note">
                <textarea
                  placeholder="Notiz (optional)"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={2}
                />
              </div>
            )}

            <div className="request-actions">
              {activeNoteId !== request.id ? (
                <button
                  className="btn btn-small btn-secondary"
                  onClick={() => setActiveNoteId(request.id)}
                >
                  Notiz hinzufügen
                </button>
              ) : (
                <button
                  className="btn btn-small btn-secondary"
                  onClick={() => {
                    setActiveNoteId(null);
                    setAdminNote('');
                  }}
                >
                  Notiz ausblenden
                </button>
              )}

              <button
                className="btn btn-small btn-success"
                onClick={() => handleApprove(request.id)}
                disabled={processingId === request.id}
              >
                Genehmigen
              </button>

              <button
                className="btn btn-small btn-danger"
                onClick={() => handleReject(request.id)}
                disabled={processingId === request.id}
              >
                Ablehnen
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
