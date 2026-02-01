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
            const userBooking = shiftBookings.find(
              (b) => b.userId === userId
            );

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
