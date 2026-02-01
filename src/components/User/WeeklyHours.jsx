import { useMemo } from 'react';
import { format, addDays } from 'date-fns';
import { calculateDuration } from '../../utils/dateUtils';

export function WeeklyHours({ shifts, bookings, userId, minHours = 20, currentWeekStart }) {
  // Datum-Strings für die aktuelle Woche (Mo-Fr)
  const weekDates = useMemo(() => {
    if (!currentWeekStart) return [];
    return Array.from({ length: 5 }, (_, i) =>
      format(addDays(currentWeekStart, i), 'yyyy-MM-dd')
    );
  }, [currentWeekStart]);

  const weeklyHours = useMemo(() => {
    const userBookings = bookings.filter(
      (b) => b.userId === userId && b.status === 'active'
    );

    let totalHours = 0;
    for (const booking of userBookings) {
      const shift = shifts.find((s) => s.id === booking.shiftId);
      if (shift) {
        // Nur Schichten der aktuellen Woche zählen
        if (weekDates.length > 0 && !weekDates.includes(shift.date)) {
          continue;
        }

        const startTime = booking.customStartTime || shift.startTime;
        const endTime = booking.customEndTime || shift.endTime;
        let duration = calculateDuration(startTime, endTime);

        // Bei Langschichten 30 Min Pause abziehen (8,5h -> 8h Arbeitszeit)
        const isLongShift = shift.type === 'lang_frueh' || shift.type === 'lang_spaet';
        if (isLongShift) {
          duration -= 0.5;
        }

        totalHours += duration;
      }
    }

    return totalHours;
  }, [shifts, bookings, userId, weekDates]);

  const isLow = weeklyHours < minHours;
  const percentage = Math.min((weeklyHours / minHours) * 100, 100);

  return (
    <div className={`weekly-hours ${isLow ? 'warning' : 'ok'}`}>
      <div className="hours-info">
        <span className="hours-label">Wochenstunden:</span>
        <span className="hours-value">
          {weeklyHours.toFixed(1)}h / {minHours}h
        </span>
      </div>

      <div className="hours-bar">
        <div
          className="hours-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {isLow && (
        <div className="hours-warning">
          Es fehlen noch {(minHours - weeklyHours).toFixed(1)} Stunden
        </div>
      )}
    </div>
  );
}
