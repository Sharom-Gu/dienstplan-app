import { useState } from 'react';

export function BookingActions({
  booking,
  shifts,
  onCancelRequest,
  onSwapRequest
}) {
  const [showSwap, setShowSwap] = useState(false);
  const [selectedShift, setSelectedShift] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCancel = async () => {
    setLoading(true);
    setError('');
    try {
      await onCancelRequest(booking.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!selectedShift) return;
    setLoading(true);
    setError('');
    try {
      await onSwapRequest(booking.id, selectedShift);
      setShowSwap(false);
      setSelectedShift('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const availableShifts = shifts.filter((s) => s.id !== booking.shiftId);

  return (
    <div className="booking-actions">
      {error && <div className="error-message">{error}</div>}

      {!showSwap ? (
        <div className="action-buttons">
          <button
            className="btn btn-small btn-warning"
            onClick={handleCancel}
            disabled={loading || booking.status !== 'active'}
          >
            Storno anfragen
          </button>
          <button
            className="btn btn-small btn-secondary"
            onClick={() => setShowSwap(true)}
            disabled={loading || booking.status !== 'active'}
          >
            Tausch anfragen
          </button>
        </div>
      ) : (
        <div className="swap-form">
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            disabled={loading}
          >
            <option value="">Schicht wählen...</option>
            {availableShifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.date} {shift.startTime}-{shift.endTime}
              </option>
            ))}
          </select>
          <div className="swap-actions">
            <button
              className="btn btn-small btn-primary"
              onClick={handleSwap}
              disabled={loading || !selectedShift}
            >
              Tausch senden
            </button>
            <button
              className="btn btn-small btn-secondary"
              onClick={() => {
                setShowSwap(false);
                setSelectedShift('');
              }}
              disabled={loading}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
