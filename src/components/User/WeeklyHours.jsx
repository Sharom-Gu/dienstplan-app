import { useMemo } from 'react';
import { format, addDays, parseISO, isWithinInterval } from 'date-fns';
import { calculateDuration } from '../../utils/dateUtils';

// Berechnet Stunden basierend auf Urlaubs-/Krankheitstagen
// 1 Tag = 8h, 2 Tage = 14h, 3+ Tage = 20h
export const calculateDaysToHours = (days) => {
  if (days <= 0) return 0;
  if (days === 1) return 8;
  if (days === 2) return 14;
  return 20; // 3+ Tage = volle 20h
};

export function WeeklyHours({ shifts, bookings, vacations = [], userId, minHours = 20, currentWeekStart }) {
  // Datum-Strings für die aktuelle Woche (Mo-Fr)
  const weekDates = useMemo(() => {
    if (!currentWeekStart) return [];
    return Array.from({ length: 5 }, (_, i) =>
      format(addDays(currentWeekStart, i), 'yyyy-MM-dd')
    );
  }, [currentWeekStart]);

  // Berechne Urlaubstage in dieser Woche
  const { vacationDays, sickDaysFromVacation } = useMemo(() => {
    if (!currentWeekStart || weekDates.length === 0) return { vacationDays: 0, sickDaysFromVacation: 0 };

    const weekStart = currentWeekStart;
    const weekEnd = addDays(currentWeekStart, 4); // Fr

    let vacDays = 0;
    let sickDays = 0;

    // Filtere Urlaube/Krankheit für diesen User
    const userVacations = vacations.filter(v => v.userId === userId);

    for (const vac of userVacations) {
      const vacStart = parseISO(vac.startDate);
      const vacEnd = parseISO(vac.endDate);

      // Zähle Tage die in diese Woche fallen
      for (const dateStr of weekDates) {
        const date = parseISO(dateStr);
        if (date >= vacStart && date <= vacEnd) {
          if (vac.type === 'sick') {
            sickDays++;
          } else {
            vacDays++;
          }
        }
      }
    }

    return { vacationDays: vacDays, sickDaysFromVacation: sickDays };
  }, [vacations, userId, currentWeekStart, weekDates]);

  // Berechne Arbeitsstunden und Krankheitsstunden aus Buchungen
  const { workedHours, sickHoursFromBookings } = useMemo(() => {
    // Aktive Buchungen (gearbeitet)
    const activeBookings = bookings.filter(
      (b) => b.userId === userId && b.status === 'active'
    );

    // Stornierte Buchungen wegen Krankheit (zählen trotzdem)
    const sickCancelledBookings = bookings.filter(
      (b) => b.userId === userId && b.status === 'cancelled' && b.cancelReason === 'sick_day'
    );

    const calculateHoursForBookings = (bookingList) => {
      let total = 0;
      for (const booking of bookingList) {
        const shift = shifts.find((s) => s.id === booking.shiftId);
        if (shift) {
          // Nur Schichten der aktuellen Woche zählen
          if (weekDates.length > 0 && !weekDates.includes(shift.date)) {
            continue;
          }

          const startTime = booking.customStartTime || shift.startTime;
          const endTime = booking.customEndTime || shift.endTime;
          let duration = calculateDuration(startTime, endTime);

          // Bei Langschichten 30 Min Pause abziehen
          const isLongShift = shift.type === 'lang_frueh' || shift.type === 'lang_spaet';
          if (isLongShift) {
            duration -= 0.5;
          }

          total += duration;
        }
      }
      return total;
    };

    return {
      workedHours: calculateHoursForBookings(activeBookings),
      sickHoursFromBookings: calculateHoursForBookings(sickCancelledBookings)
    };
  }, [shifts, bookings, userId, weekDates]);

  // Urlaubsstunden berechnen (1 Tag = 8h, 2 Tage = 14h, 3 Tage = 20h)
  const vacationHours = calculateDaysToHours(vacationDays);

  // Krankheitsstunden: aus stornierten Buchungen ODER aus Krankheitstagen (je nachdem was höher ist)
  const sickHoursFromDays = calculateDaysToHours(sickDaysFromVacation);
  const sickHours = Math.max(sickHoursFromBookings, sickHoursFromDays);

  // Effektive Stunden berechnen (auf minHours begrenzt)
  const effectiveVacationHours = Math.min(vacationHours, Math.max(0, minHours - workedHours));
  const effectiveSickHours = Math.min(sickHours, Math.max(0, minHours - workedHours - effectiveVacationHours));

  const totalHours = workedHours + effectiveVacationHours + effectiveSickHours;
  const isLow = totalHours < minHours;

  // Prozente für Balken
  const workedPercentage = Math.min((workedHours / minHours) * 100, 100);
  const vacationPercentage = Math.min((effectiveVacationHours / minHours) * 100, 100 - workedPercentage);
  const sickPercentage = Math.min((effectiveSickHours / minHours) * 100, 100 - workedPercentage - vacationPercentage);

  // Info-Text erstellen
  const infoTexts = [];
  if (effectiveVacationHours > 0) infoTexts.push(`${effectiveVacationHours.toFixed(0)}h Urlaub`);
  if (effectiveSickHours > 0) infoTexts.push(`${effectiveSickHours.toFixed(0)}h krank`);
  const infoText = infoTexts.length > 0 ? ` (${infoTexts.join(', ')})` : '';

  return (
    <div className={`weekly-hours ${isLow ? 'warning' : 'ok'}`}>
      <div className="hours-info">
        <span className="hours-label">Wochenstunden:</span>
        <span className="hours-value">
          {totalHours.toFixed(1)}h / {minHours}h
          {infoText && (
            <span className="vacation-sick-note">{infoText}</span>
          )}
        </span>
      </div>

      <div className="hours-bar">
        <div
          className="hours-fill"
          style={{ width: `${workedPercentage}%` }}
        />
        {effectiveVacationHours > 0 && (
          <div
            className="hours-fill vacation"
            style={{ width: `${vacationPercentage}%` }}
          />
        )}
        {effectiveSickHours > 0 && (
          <div
            className="hours-fill sick"
            style={{ width: `${sickPercentage}%` }}
          />
        )}
      </div>

      {isLow && (
        <div className="hours-warning">
          Es fehlen noch {(minHours - totalHours).toFixed(1)} Stunden
        </div>
      )}
    </div>
  );
}
