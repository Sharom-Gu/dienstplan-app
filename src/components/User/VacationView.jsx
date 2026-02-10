import { useState, useMemo } from 'react';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isWeekend, isSameDay, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { calculateBusinessDays } from '../../services/vacationService';

export function VacationView({
  userData,
  vacations,
  allVacations,
  currentYear,
  onPrevYear,
  onNextYear,
  onSubmitVacation,
  onSubmitSickDay,
  onRequestDeletion
}) {
  const [selectedStartDate, setSelectedStartDate] = useState('');
  const [selectedEndDate, setSelectedEndDate] = useState('');
  const [note, setNote] = useState('');
  const [entryType, setEntryType] = useState('vacation'); // 'vacation' oder 'sick'
  const [submitting, setSubmitting] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState('');

  // Berechne verwendete und verbleibende Urlaubstage sowie Krankheitstage
  const vacationStats = useMemo(() => {
    const totalDays = userData?.vacationDays || 15;
    const yearVacations = vacations.filter(v => new Date(v.startDate).getFullYear() === currentYear);

    const usedVacationDays = yearVacations
      .filter(v => v.type !== 'sick')
      .reduce((sum, v) => sum + (v.days || 0), 0);

    const sickDays = yearVacations
      .filter(v => v.type === 'sick')
      .reduce((sum, v) => sum + (v.days || 0), 0);

    const remainingDays = totalDays - usedVacationDays;

    return { totalDays, usedDays: usedVacationDays, remainingDays, sickDays };
  }, [vacations, userData, currentYear]);

  // Alle Mitarbeiter aus den Urlaubsdaten mit Farbzuweisung
  const employees = useMemo(() => {
    const map = new Map();
    allVacations.forEach(v => {
      if (v.userId && v.userName) {
        map.set(v.userId, v.userName);
      }
    });
    return Array.from(map, ([id, name], index) => ({ id, name, colorIndex: index % 10 }));
  }, [allVacations]);

  // Mapping von userId zu Farbindex
  const userColorMap = useMemo(() => {
    const map = new Map();
    employees.forEach(emp => {
      map.set(emp.id, emp.colorIndex);
    });
    return map;
  }, [employees]);

  // Gefilterte Urlaube für Kalenderanzeige
  const displayVacations = useMemo(() => {
    if (selectedEmployee) {
      return allVacations.filter(v => v.userId === selectedEmployee);
    }
    return allVacations;
  }, [allVacations, selectedEmployee]);

  // Kalenderwochen generieren
  const calendarDays = useMemo(() => {
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  // Prüfe ob ein Tag im Urlaub liegt
  const getVacationsForDay = (day) => {
    return displayVacations.filter(v => {
      const start = parseISO(v.startDate);
      const end = parseISO(v.endDate);
      return day >= start && day <= end;
    });
  };

  // Prüfe ob Start- oder Enddatum auf Wochenende fällt
  const weekendError = useMemo(() => {
    if (selectedStartDate) {
      const startDate = parseISO(selectedStartDate);
      if (isWeekend(startDate)) {
        return 'Startdatum darf nicht auf ein Wochenende fallen.';
      }
    }
    if (selectedEndDate) {
      const endDate = parseISO(selectedEndDate);
      if (isWeekend(endDate)) {
        return 'Enddatum darf nicht auf ein Wochenende fallen.';
      }
    }
    return null;
  }, [selectedStartDate, selectedEndDate]);

  // Berechne Tage bei Auswahl
  const selectedDays = useMemo(() => {
    if (selectedStartDate && selectedEndDate && !weekendError) {
      return calculateBusinessDays(selectedStartDate, selectedEndDate);
    }
    return 0;
  }, [selectedStartDate, selectedEndDate, weekendError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStartDate || !selectedEndDate) return;

    if (weekendError) {
      alert(weekendError);
      return;
    }

    // Nur bei Urlaub prüfen ob genügend Tage übrig sind
    if (entryType === 'vacation' && selectedDays > vacationStats.remainingDays) {
      alert(`Nicht genügend Urlaubstage! Sie haben noch ${vacationStats.remainingDays} Tage übrig.`);
      return;
    }

    setSubmitting(true);
    try {
      if (entryType === 'sick') {
        const result = await onSubmitSickDay(selectedStartDate, selectedEndDate, note);
        if (result?.cancelledBookings > 0) {
          alert(`Krankheit eingetragen. ${result.cancelledBookings} Schicht(en) wurden automatisch storniert.`);
        }
      } else {
        await onSubmitVacation(selectedStartDate, selectedEndDate, note);
      }
      setSelectedStartDate('');
      setSelectedEndDate('');
      setNote('');
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestDeletion = async (vacationId, type) => {
    const message = type === 'sick'
      ? 'Löschung des Krankheitstags beim Admin beantragen?'
      : 'Löschung des Urlaubs beim Admin beantragen?';
    if (!confirm(message)) return;
    await onRequestDeletion(vacationId);
  };

  return (
    <div className="vacation-view">
      {/* Übersicht */}
      <div className="vacation-stats">
        <div className="stat-card">
          <span className="stat-label">Urlaubstage {currentYear}</span>
          <span className="stat-value">{vacationStats.totalDays}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Genommen</span>
          <span className="stat-value used">{vacationStats.usedDays}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Verbleibend</span>
          <span className={`stat-value ${vacationStats.remainingDays <= 3 ? 'warning' : 'remaining'}`}>
            {vacationStats.remainingDays}
          </span>
        </div>
        <div className="stat-card sick">
          <span className="stat-label">Krankheitstage</span>
          <span className="stat-value sick">{vacationStats.sickDays}</span>
        </div>
      </div>

      {/* Urlaub/Krankheit einreichen */}
      <div className="vacation-form-card">
        <h3>{entryType === 'sick' ? 'Krankheit eintragen' : 'Urlaub einreichen'}</h3>
        <form onSubmit={handleSubmit} className="vacation-form">
          <div className="entry-type-toggle">
            <button
              type="button"
              className={`toggle-btn ${entryType === 'vacation' ? 'active' : ''}`}
              onClick={() => setEntryType('vacation')}
            >
              Urlaub
            </button>
            <button
              type="button"
              className={`toggle-btn sick ${entryType === 'sick' ? 'active' : ''}`}
              onClick={() => setEntryType('sick')}
            >
              Krankheit
            </button>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate">Von</label>
              <input
                type="date"
                id="startDate"
                value={selectedStartDate}
                onChange={(e) => setSelectedStartDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="endDate">Bis</label>
              <input
                type="date"
                id="endDate"
                value={selectedEndDate}
                onChange={(e) => setSelectedEndDate(e.target.value)}
                min={selectedStartDate}
                required
              />
            </div>
            <div className="form-group">
              <label>Arbeitstage</label>
              <div className={`days-preview ${entryType === 'sick' ? 'sick' : ''}`}>{selectedDays}</div>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="note">Notiz (optional)</label>
            <input
              type="text"
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={entryType === 'sick' ? 'z.B. Erkältung' : 'z.B. Familienurlaub'}
            />
          </div>
          {weekendError && (
            <div className="form-error">{weekendError}</div>
          )}
          <button
            type="submit"
            className={`btn ${entryType === 'sick' ? 'btn-warning' : 'btn-primary'}`}
            disabled={submitting || !selectedStartDate || !selectedEndDate || selectedDays === 0 || weekendError}
          >
            {submitting ? 'Wird eingetragen...' : (entryType === 'sick' ? 'Krankheit eintragen' : 'Urlaub einreichen')}
          </button>
        </form>
      </div>

      {/* Kalenderansicht */}
      <div className="vacation-calendar-section">
        <div className="calendar-header">
          <h3>Urlaubskalender</h3>
          <div className="calendar-controls">
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="employee-filter"
            >
              <option value="">Alle Mitarbeiter</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
            <div className="month-nav">
              <button
                className="btn btn-secondary"
                onClick={() => setViewMonth(addMonths(viewMonth, -1))}
              >
                &larr;
              </button>
              <span className="month-label">
                {format(viewMonth, 'MMMM yyyy', { locale: de })}
              </span>
              <button
                className="btn btn-secondary"
                onClick={() => setViewMonth(addMonths(viewMonth, 1))}
              >
                &rarr;
              </button>
            </div>
          </div>
        </div>

        <div className="vacation-calendar">
          <div className="calendar-weekdays">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
              <div key={day} className="weekday">{day}</div>
            ))}
          </div>
          <div className="calendar-grid">
            {/* Leere Zellen für Offset */}
            {Array.from({ length: (calendarDays[0]?.getDay() + 6) % 7 }).map((_, i) => (
              <div key={`empty-${i}`} className="calendar-day empty"></div>
            ))}

            {calendarDays.map(day => {
              const dayVacations = getVacationsForDay(day);
              const isToday = isSameDay(day, new Date());
              const weekend = isWeekend(day);
              const hasVacation = dayVacations.length > 0;

              return (
                <div
                  key={day.toISOString()}
                  className={`calendar-day ${weekend ? 'weekend' : ''} ${isToday ? 'today' : ''} ${hasVacation ? 'has-vacation' : ''}`}
                >
                  <span className="day-number">{format(day, 'd')}</span>
                  {hasVacation && (
                    <div className="vacation-names">
                      {dayVacations.slice(0, 2).map(v => (
                        <span
                          key={v.id}
                          className={`vacation-name ${v.type === 'sick' ? 'sick' : `color-${userColorMap.get(v.userId) ?? 0}`}`}
                          title={`${v.userName}${v.type === 'sick' ? ' (Krank)' : ''}`}
                        >
                          {v.userName?.split(' ')[0]}{v.type === 'sick' ? ' 🤒' : ''}
                        </span>
                      ))}
                      {dayVacations.length > 2 && (
                        <span className="more-vacations">+{dayVacations.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="calendar-legend">
          {employees.map(emp => (
            <div key={emp.id} className="legend-item">
              <span
                className={`vacation-name color-${emp.colorIndex}`}
                style={{ padding: '0.1rem 0.4rem' }}
              >
                {emp.name?.split(' ')[0]}
              </span>
              {emp.id === userData?.id && <span>(Ich)</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Meine Urlaube & Krankheitstage */}
      <div className="my-vacations">
        <h3>Meine Einträge {currentYear}</h3>
        {vacations.filter(v => new Date(v.startDate).getFullYear() === currentYear).length === 0 ? (
          <p className="empty-text">Noch keine Einträge vorhanden.</p>
        ) : (
          <div className="vacation-list">
            {vacations
              .filter(v => new Date(v.startDate).getFullYear() === currentYear)
              .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
              .map(vacation => (
                <div key={vacation.id} className={`vacation-item ${vacation.type === 'sick' ? 'sick' : ''}`}>
                  <div className="vacation-dates">
                    <span className={`entry-type-badge ${vacation.type === 'sick' ? 'sick' : 'vacation'}`}>
                      {vacation.type === 'sick' ? 'Krank' : 'Urlaub'}
                    </span>
                    <span className="date-range">
                      {format(parseISO(vacation.startDate), 'dd.MM.yyyy', { locale: de })}
                      {vacation.startDate !== vacation.endDate && (
                        <> - {format(parseISO(vacation.endDate), 'dd.MM.yyyy', { locale: de })}</>
                      )}
                    </span>
                    <span className="days-count">{vacation.days} Tag{vacation.days !== 1 ? 'e' : ''}</span>
                  </div>
                  {vacation.note && <p className="vacation-note">{vacation.note}</p>}
                  {vacation.deletionRequested ? (
                    <span className="deletion-pending-badge">Löschung beantragt</span>
                  ) : vacation.deletionRejectedAt ? (
                    <div className="deletion-rejected-info">
                      <span className="deletion-rejected-badge">Löschung abgelehnt</span>
                      <button
                        className="btn btn-warning btn-sm"
                        onClick={() => handleRequestDeletion(vacation.id, vacation.type)}
                      >
                        Erneut beantragen
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-warning btn-sm"
                      onClick={() => handleRequestDeletion(vacation.id, vacation.type)}
                    >
                      Löschung beantragen
                    </button>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
