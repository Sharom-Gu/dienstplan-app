import { useMemo } from 'react';
import { format, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { calculateDuration } from '../../utils/dateUtils';

// Zeitslots für die Anzeige (9:00 - 19:00)
const TIME_SLOTS = [];
for (let hour = 9; hour <= 19; hour++) {
  TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:00`);
}

// Schichttyp-Labels
const SHIFT_TYPE_LABELS = {
  frueh: 'Frühschicht',
  spaet: 'Spätschicht',
  lang_frueh: 'Langschicht',
  lang_spaet: 'Langschicht'
};

// Schichttyp-Farben
const SHIFT_TYPE_COLORS = {
  frueh: 'var(--accent-cyan)',
  spaet: 'var(--accent)',
  lang_frueh: 'var(--accent-green)',
  lang_spaet: 'var(--accent-green)'
};

export function PersonalSchedule({
  currentWeekStart,
  shifts,
  bookings,
  userId,
  onPrevWeek,
  onNextWeek,
  onCurrentWeek
}) {
  // Wochentage generieren (Mo-Fr)
  const weekDays = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const date = addDays(currentWeekStart, i);
      return {
        date,
        dateStr: format(date, 'yyyy-MM-dd'),
        dayName: format(date, 'EEE', { locale: de }),
        dayNumber: format(date, 'd'),
        month: format(date, 'MMM', { locale: de })
      };
    });
  }, [currentWeekStart]);

  // Meine Buchungen für diese Woche
  const myBookings = useMemo(() => {
    return bookings.filter(b =>
      b.userId === userId &&
      (b.status === 'active' || b.status === 'pending')
    );
  }, [bookings, userId]);

  // Schichten mit meinen Buchungen verknüpfen
  const myShiftsWithDetails = useMemo(() => {
    return myBookings.map(booking => {
      const shift = shifts.find(s => s.id === booking.shiftId);
      if (!shift) return null;

      const startTime = booking.customStartTime || shift.startTime;
      const endTime = booking.customEndTime || shift.endTime;
      const duration = calculateDuration(startTime, endTime);

      // Bei Langschichten 30 Min Pause abziehen (8,5h -> 8h Arbeitszeit)
      const isLongShift = shift.type === 'lang_frueh' || shift.type === 'lang_spaet';
      const workingHours = isLongShift ? duration - 0.5 : duration;

      return {
        ...booking,
        shift,
        startTime,
        endTime,
        duration,        // Für Kalenderanzeige (inkl. Pause)
        workingHours,    // Für Stundenberechnung (ohne Pause)
        date: shift.date,
        type: shift.type
      };
    }).filter(Boolean);
  }, [myBookings, shifts]);

  // Berechne die Position und Höhe eines Zeitbalkens
  const getBarStyle = (startTime, endTime) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    // Position relativ zu 9:00 Uhr (Start des Zeitrasters)
    const startOffset = (startHour - 9) * 60 + startMin;
    const endOffset = (endHour - 9) * 60 + endMin;
    const duration = endOffset - startOffset;

    // Gesamte Höhe = 10 Stunden (9:00-19:00) = 600 Minuten
    const totalMinutes = 10 * 60;

    const top = (startOffset / totalMinutes) * 100;
    const height = (duration / totalMinutes) * 100;

    return {
      top: `${top}%`,
      height: `${height}%`
    };
  };

  // Wochentitel
  const weekTitle = useMemo(() => {
    const start = format(currentWeekStart, 'd. MMM', { locale: de });
    const end = format(addDays(currentWeekStart, 4), 'd. MMM yyyy', { locale: de });
    return `${start} - ${end}`;
  }, [currentWeekStart]);

  // Nur Schichten der aktuellen Woche
  const weekDates = useMemo(() => {
    return weekDays.map(d => d.dateStr);
  }, [weekDays]);

  const currentWeekShifts = useMemo(() => {
    return myShiftsWithDetails.filter(s => weekDates.includes(s.date));
  }, [myShiftsWithDetails, weekDates]);

  // Gesamtstunden berechnen (nur Arbeitszeit dieser Woche, ohne Pausen)
  const totalHours = useMemo(() => {
    return currentWeekShifts.reduce((sum, s) => sum + s.workingHours, 0);
  }, [currentWeekShifts]);

  return (
    <div className="personal-schedule">
      <div className="personal-schedule-header">
        <h2>Mein Dienstplan</h2>
        <div className="week-navigation">
          <button className="btn btn-secondary" onClick={onPrevWeek}>
            &larr;
          </button>
          <button className="btn btn-secondary" onClick={onCurrentWeek}>
            Heute
          </button>
          <span className="week-title">{weekTitle}</span>
          <button className="btn btn-secondary" onClick={onNextWeek}>
            &rarr;
          </button>
        </div>
      </div>

      <div className="personal-schedule-summary">
        <span className="hours-badge">
          {totalHours.toFixed(1)}h diese Woche
        </span>
        {totalHours < 20 && (
          <span className="hours-warning">
            (noch {(20 - totalHours).toFixed(1)}h bis Minimum)
          </span>
        )}
      </div>

      <div className="personal-schedule-grid">
        {/* Zeitspalte */}
        <div className="time-column">
          <div className="time-header"></div>
          {TIME_SLOTS.map(time => (
            <div key={time} className="time-slot">
              {time}
            </div>
          ))}
        </div>

        {/* Tagesspalten */}
        {weekDays.map(day => {
          const dayShifts = myShiftsWithDetails.filter(s => s.date === day.dateStr);

          return (
            <div key={day.dateStr} className="day-column">
              <div className="day-header">
                <span className="day-name">{day.dayName}</span>
                <span className="day-number">{day.dayNumber}</span>
              </div>
              <div className="day-body">
                {/* Zeitraster-Linien */}
                {TIME_SLOTS.map((time, idx) => (
                  <div
                    key={time}
                    className="time-grid-line"
                    style={{ top: `${(idx / 10) * 100}%` }}
                  />
                ))}

                {/* Schichtbalken */}
                {dayShifts.map(shift => {
                  const barStyle = getBarStyle(shift.startTime, shift.endTime);
                  const isPending = shift.status === 'pending';

                  return (
                    <div
                      key={shift.id}
                      className={`shift-bar ${isPending ? 'pending' : ''}`}
                      style={{
                        ...barStyle,
                        backgroundColor: isPending ? 'transparent' : SHIFT_TYPE_COLORS[shift.type],
                        borderColor: SHIFT_TYPE_COLORS[shift.type]
                      }}
                    >
                      <div className="shift-bar-content">
                        <span className="shift-bar-time">
                          {shift.startTime} - {shift.endTime}
                        </span>
                        <span className="shift-bar-type">
                          {SHIFT_TYPE_LABELS[shift.type]}
                          {(shift.type === 'lang_frueh' || shift.type === 'lang_spaet') && (
                            <span className="break-info"> (30 Min Pause)</span>
                          )}
                        </span>
                        <span className="shift-bar-hours">
                          {shift.workingHours}h
                        </span>
                      </div>
                      {isPending && (
                        <span className="shift-bar-pending">Ausstehend</span>
                      )}
                    </div>
                  );
                })}

                {/* Leerer Tag */}
                {dayShifts.length === 0 && (
                  <div className="day-empty">
                    <span>Frei</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legende */}
      <div className="personal-schedule-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: 'var(--accent-cyan)' }}></span>
          <span>Frühschicht (09:00-15:00)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: 'var(--accent)' }}></span>
          <span>Spätschicht (13:00-19:00)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: 'var(--accent-green)' }}></span>
          <span>Langschicht (8h)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color legend-pending"></span>
          <span>Ausstehend (wartet auf Bestätigung)</span>
        </div>
      </div>
    </div>
  );
}
