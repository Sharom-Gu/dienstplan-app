import { useState } from 'react';
import { formatTimeRange, isPast } from '../../utils/dateUtils';
import { getInitials } from '../../utils/validation';

export function ShiftCard({
  shift,
  bookings,
  userBooking,
  userId,
  userName,
  selectedUserId,
  showFreeShifts,
  isAdmin,
  isLongShiftBlocked = false,
  userAlreadyBookedToday = false,
  onBook,
  onCancelRequest,
  onSwapRequest,
  onEdit,
  onDelete,
  onEditBookingTime,
  onAssignEmployee
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeBookings = bookings.filter((b) => b.status === 'active');
  const pendingBookings = bookings.filter((b) => b.status === 'pending');
  // Pending UND active Buchungen belegen Plätze
  const occupiedSpots = activeBookings.length + pendingBookings.length;
  const spotsLeft = shift.capacity - occupiedSpots;
  const isFull = spotsLeft <= 0;
  const isBooked = !!userBooking;
  const userHasPendingBooking = userBooking?.status === 'pending';
  const isPendingCancel = userBooking?.status === 'pending_cancel' || userBooking?.status === 'pending_swap';
  const shiftPast = isPast(shift.date, shift.startTime);

  // Prüfe ob der ausgewählte Nutzer diese Schicht gebucht hat (active oder pending)
  const allUserBookings = [...activeBookings, ...pendingBookings];
  const isSelectedUserBooked = selectedUserId && allUserBookings.some(b => b.userId === selectedUserId);

  const typeLabels = {
    frueh: 'Früh (6h)',
    spaet: 'Spät (6h)',
    lang_frueh: 'Lang früh (8h)',
    lang_spaet: 'Lang spät (8h)',
    custom: 'Sonder'
  };

  const handleBook = async () => {
    setLoading(true);
    setError('');
    try {
      await onBook(shift.id, userName);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!userBooking) return;
    setLoading(true);
    setError('');
    try {
      await onCancelRequest(userBooking.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Freie Schicht = nicht voll und nicht in der Vergangenheit
  const isFreeShift = !isFull && !shiftPast;

  let cardClass = 'shift-card';
  if (isBooked && userBooking?.status === 'active') cardClass += ' booked';
  if (userHasPendingBooking) cardClass += ' pending-booking';
  if (isPendingCancel) cardClass += ' pending';
  if (isFull && !isBooked) cardClass += ' full';
  if (shiftPast) cardClass += ' past';
  if (isSelectedUserBooked) cardClass += ' highlighted';
  if (showFreeShifts && isFreeShift && !isLongShiftBlocked && !userAlreadyBookedToday) cardClass += ' free-highlight';
  if (isLongShiftBlocked || userAlreadyBookedToday) cardClass += ' blocked';

  return (
    <div className={cardClass}>
      <div className="shift-header">
        <span className="shift-type">{typeLabels[shift.type] || shift.type}</span>
        <span className="shift-time">{formatTimeRange(shift.startTime, shift.endTime)}</span>
      </div>

      <div className="shift-capacity">
        <span className={spotsLeft <= 0 ? 'spots-full' : spotsLeft === 1 ? 'spots-low' : ''}>
          {occupiedSpots}/{shift.capacity} Plätze
          {pendingBookings.length > 0 && (
            <span className="pending-count"> ({pendingBookings.length} ausstehend)</span>
          )}
        </span>
      </div>

      <div className="shift-bookings">
        {/* Bestätigte Buchungen */}
        {activeBookings.map((booking) => {
          let badgeClass = 'booking-badge';
          if (booking.userId === userId) badgeClass += ' own';
          if (selectedUserId && booking.userId === selectedUserId) badgeClass += ' selected';
          const hasCustomTime = booking.customStartTime || booking.customEndTime;
          const displayTime = hasCustomTime
            ? `${booking.customStartTime || shift.startTime} - ${booking.customEndTime || shift.endTime}`
            : null;
          return (
            <div key={booking.id} className="booking-item">
              <span
                className={badgeClass}
                title={`${booking.userName} (bestätigt)`}
              >
                {getInitials(booking.userName)}
              </span>
              {hasCustomTime && (
                <span className="custom-time">{displayTime}</span>
              )}
              {isAdmin && (
                <button
                  className="btn-edit-time"
                  onClick={() => onEditBookingTime && onEditBookingTime(booking)}
                  title="Zeit bearbeiten"
                >
                  ✎
                </button>
              )}
            </div>
          );
        })}
        {/* Ausstehende Buchungen */}
        {pendingBookings.map((booking) => {
          let badgeClass = 'booking-badge pending-badge';
          if (booking.userId === userId) badgeClass += ' own';
          if (selectedUserId && booking.userId === selectedUserId) badgeClass += ' selected';
          const hasCustomTime = booking.customStartTime || booking.customEndTime;
          const displayTime = hasCustomTime
            ? `${booking.customStartTime || shift.startTime} - ${booking.customEndTime || shift.endTime}`
            : null;
          return (
            <div key={booking.id} className="booking-item">
              <span
                className={badgeClass}
                title={`${booking.userName} (ausstehend)`}
              >
                {getInitials(booking.userName)}
              </span>
              {hasCustomTime && (
                <span className="custom-time">{displayTime}</span>
              )}
              {isAdmin && (
                <button
                  className="btn-edit-time"
                  onClick={() => onEditBookingTime && onEditBookingTime(booking)}
                  title="Zeit bearbeiten"
                >
                  ✎
                </button>
              )}
            </div>
          );
        })}
      </div>

      {error && <div className="shift-error">{error}</div>}

      <div className="shift-actions">
        {!shiftPast && !isAdmin && (
          <>
            {!isBooked && !isFull && !isLongShiftBlocked && !userAlreadyBookedToday && (
              <button
                className="btn btn-small btn-primary"
                onClick={handleBook}
                disabled={loading}
              >
                Buchen
              </button>
            )}

            {userAlreadyBookedToday && (
              <span className="blocked-label">Bereits gebucht heute</span>
            )}

            {isLongShiftBlocked && !userAlreadyBookedToday && (
              <span className="blocked-label">Andere Langschicht gebucht</span>
            )}

            {userHasPendingBooking && (
              <span className="pending-label">Buchung ausstehend</span>
            )}

            {isBooked && userBooking?.status === 'active' && !isPendingCancel && (
              <button
                className="btn btn-small btn-warning"
                onClick={handleCancelRequest}
                disabled={loading}
              >
                Storno
              </button>
            )}

            {isPendingCancel && (
              <span className="pending-label">Storno ausstehend</span>
            )}
          </>
        )}

        {isAdmin && (
          <>
            {!isFull && !shiftPast && !isLongShiftBlocked && (
              <button
                className="btn btn-small btn-success"
                onClick={() => onAssignEmployee && onAssignEmployee(shift)}
                disabled={loading}
              >
                + Zuweisen
              </button>
            )}
            {isLongShiftBlocked && (
              <span className="blocked-label">Gesperrt</span>
            )}
            <button
              className="btn btn-small btn-secondary"
              onClick={() => onEdit(shift)}
              disabled={loading}
            >
              Bearbeiten
            </button>
            <button
              className="btn btn-small btn-danger"
              onClick={() => onDelete(shift.id)}
              disabled={loading}
            >
              Löschen
            </button>
          </>
        )}
      </div>
    </div>
  );
}
