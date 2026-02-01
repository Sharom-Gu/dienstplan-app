import { useMemo } from 'react';
import { DayColumn } from './DayColumn';
import { getWeekLabel, getWeekDays, groupShiftsByDate, formatDate } from '../../utils/dateUtils';

export function WeekView({
  currentWeekStart,
  shifts,
  bookings,
  userId,
  userName,
  selectedUserId,
  showFreeShifts,
  isAdmin,
  onPrevWeek,
  onNextWeek,
  onCurrentWeek,
  onBook,
  onCancelRequest,
  onSwapRequest,
  onEditShift,
  onDeleteShift,
  onEditBookingTime,
  onAssignEmployee,
  loading
}) {
  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart]);
  const shiftsByDate = useMemo(() => groupShiftsByDate(shifts), [shifts]);

  const weekLabel = getWeekLabel(currentWeekStart);

  return (
    <div className="week-view">
      <div className="week-nav">
        <button className="btn btn-secondary" onClick={onPrevWeek}>
          &larr; Vorherige
        </button>
        <div className="week-label">
          <h2>{weekLabel}</h2>
          <button className="btn btn-link" onClick={onCurrentWeek}>
            Heute
          </button>
        </div>
        <button className="btn btn-secondary" onClick={onNextWeek}>
          Nächste &rarr;
        </button>
      </div>

      {loading ? (
        <div className="loading">Laden...</div>
      ) : (
        <div className="week-grid">
          {weekDays.map((day) => {
            const dateStr = formatDate(day, 'yyyy-MM-dd');
            const dayShifts = shiftsByDate[dateStr] || [];

            return (
              <DayColumn
                key={dateStr}
                date={day}
                shifts={dayShifts}
                bookings={bookings}
                userId={userId}
                userName={userName}
                selectedUserId={selectedUserId}
                showFreeShifts={showFreeShifts}
                isAdmin={isAdmin}
                onBook={onBook}
                onCancelRequest={onCancelRequest}
                onSwapRequest={onSwapRequest}
                onEditShift={onEditShift}
                onDeleteShift={onDeleteShift}
                onEditBookingTime={onEditBookingTime}
                onAssignEmployee={onAssignEmployee}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
