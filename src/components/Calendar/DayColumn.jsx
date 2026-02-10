import { ShiftCard } from './ShiftCard';
import { formatDate, formatShortWeekday, isToday } from '../../utils/dateUtils';

export function DayColumn({
  date,
  shifts,
  bookings,
  userId,
  userName,
  selectedUserId,
  showFreeShifts,
  isAdmin,
  onBook,
  onCancelRequest,
  onSwapRequest,
  onEditShift,
  onDeleteShift,
  onEditBookingTime,
  onAssignEmployee
}) {
  const dayClass = isToday(date) ? 'day-column today' : 'day-column';

  // Prüfe ob eine Langschicht an diesem Tag gebucht ist
  const longShiftTypes = ['lang_frueh', 'lang_spaet'];
  const longShifts = shifts.filter(s => longShiftTypes.includes(s.type));

  // Finde heraus, ob eine Langschicht bereits eine aktive Buchung hat
  const bookedLongShiftType = longShifts.find(shift => {
    const shiftBookings = bookings.filter(b => b.shiftId === shift.id);
    const hasActiveBooking = shiftBookings.some(b => b.status === 'active' || b.status === 'pending');
    return hasActiveBooking;
  })?.type || null;

  // Finde die Schicht-ID, die der User heute gebucht hat (falls vorhanden)
  const userBookedShiftId = userId ? shifts.find(shift => {
    const shiftBookings = bookings.filter(b => b.shiftId === shift.id);
    return shiftBookings.some(b => b.userId === userId && (b.status === 'active' || b.status === 'pending'));
  })?.id : null;

  return (
    <div className={dayClass}>
      <div className="day-header">
        <span className="weekday">{formatShortWeekday(date)}</span>
        <span className="date">{formatDate(date, 'dd.MM.')}</span>
      </div>

      <div className="day-shifts">
        {shifts.length === 0 ? (
          <div className="no-shifts">Keine Schichten</div>
        ) : (
          shifts.map((shift) => {
            const shiftBookings = bookings.filter(
              (b) => b.shiftId === shift.id
            );
            // Nur aktive/pending Buchungen des Users zählen
            const userBooking = shiftBookings.find(
              (b) => b.userId === userId && (b.status === 'active' || b.status === 'pending')
            );

            // Langschicht ist blockiert wenn eine andere Langschicht am selben Tag gebucht ist
            const isLongShiftBlocked = longShiftTypes.includes(shift.type) &&
              bookedLongShiftType &&
              bookedLongShiftType !== shift.type;

            // User hat bereits eine andere Schicht an diesem Tag gebucht
            const userAlreadyBookedToday = userBookedShiftId && userBookedShiftId !== shift.id;

            return (
              <ShiftCard
                key={shift.id}
                shift={shift}
                bookings={shiftBookings}
                userBooking={userBooking}
                userId={userId}
                userName={userName}
                selectedUserId={selectedUserId}
                showFreeShifts={showFreeShifts}
                isAdmin={isAdmin}
                isLongShiftBlocked={isLongShiftBlocked}
                userAlreadyBookedToday={userAlreadyBookedToday}
                onBook={onBook}
                onCancelRequest={onCancelRequest}
                onSwapRequest={onSwapRequest}
                onEdit={onEditShift}
                onDelete={onDeleteShift}
                onEditBookingTime={onEditBookingTime}
                onAssignEmployee={onAssignEmployee}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
