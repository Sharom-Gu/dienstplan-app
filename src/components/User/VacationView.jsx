import { useState, useMemo } from 'react';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isWeekend, isSameDay, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { calculateBusinessDays, calculateProratedVacationDays } from '../../services/vacationService';
import { getHolidayInfo } from '../../services/holidayService';

export function VacationView({
  userData,
  vacations,
  allVacations,
  currentYear,
  onPrevYear,
  onNextYear,
  onSubmitVacation,
  onSubmitSickDay,
  onSubmitBildungsurlaub,
  onRequestDeletion,
  onDeletePending,
  onUpdateBirthDate
}) {
  const [selectedStartDate, setSelectedStartDate] = useState('');
  const [selectedEndDate, setSelectedEndDate] = useState('');
  const [note, setNote] = useState('');
  const [entryType, setEntryType] = useState('vacation'); // 'vacation', 'sick', oder 'bildungsurlaub'
  const [submitting, setSubmitting] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [birthDate, setBirthDate] = useState(userData?.birthDate || '');
  const [savingBirthDate, setSavingBirthDate] = useState(false);

  // Rollen-spezifische Einstellungen
  const isArzt = userData?.role === 'arzt';
  const isMFA = userData?.role === 'mfa';
  const isArztOrMFA = isArzt || isMFA;

  // Standard-Urlaubstage basierend auf Rolle
  const getDefaultVacationDays = () => {
    if (isArztOrMFA) return 30;
    return 15; // Standard für andere Rollen
  };

  // Berechne anteilige Urlaubstage basierend auf Startdatum
  const getProratedDaysForYear = (fullYearDays, startDateStr, year) => {
    if (!startDateStr) return fullYearDays; // Kein Startdatum = volle Tage

    const startDate = new Date(startDateStr);
    const startYear = startDate.getFullYear();

    // Startdatum in der Vergangenheit = volle Tage
    if (startYear < year) return fullYearDays;

    // Startdatum in der Zukunft = 0 Tage
    if (startYear > year) return 0;

    // Startdatum im aktuellen Jahr = anteilige Berechnung (nutze Service-Funktion)
    return calculateProratedVacationDays(startDateStr, fullYearDays);
  };

  // Berechne verwendete und verbleibende Urlaubstage sowie Krankheitstage
  const vacationStats = useMemo(() => {
    const baseVacationDays = userData?.vacationDays || getDefaultVacationDays();
    const baseBildungsurlaub = isArzt ? 5 : 0;

    // Anteilige Berechnung basierend auf Startdatum
    const totalDays = getProratedDaysForYear(baseVacationDays, userData?.employmentStartDate, currentYear);
    const bildungsUrlaubTotal = getProratedDaysForYear(baseBildungsurlaub, userData?.employmentStartDate, currentYear);

    const yearVacations = vacations.filter(v => new Date(v.startDate).getFullYear() === currentYear);

    const usedVacationDays = yearVacations
      .filter(v => v.type === 'vacation' && v.status !== 'rejected')
      .reduce((sum, v) => sum + (v.days || 0), 0);

    const usedBildungsurlaub = yearVacations
      .filter(v => v.type === 'bildungsurlaub' && v.status !== 'rejected')
      .reduce((sum, v) => sum + (v.days || 0), 0);

    const sickDays = yearVacations
      .filter(v => v.type === 'sick')
      .reduce((sum, v) => sum + (v.days || 0), 0);

    const remainingDays = totalDays - usedVacationDays;
    const remainingBildungsurlaub = bildungsUrlaubTotal - usedBildungsurlaub;

    return {
      totalDays,
      baseVacationDays, // Volle Jahres-Urlaubstage (für Anzeige)
      usedDays: usedVacationDays,
      remainingDays,
      sickDays,
      bildungsUrlaubTotal,
      usedBildungsurlaub,
      remainingBildungsurlaub,
      isProratedYear: userData?.employmentStartDate && new Date(userData.employmentStartDate).getFullYear() === currentYear
    };
  }, [vacations, userData, currentYear, isArzt]);

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

    // Prüfe ob genügend Tage übrig sind
    if (entryType === 'vacation' && selectedDays > vacationStats.remainingDays) {
      alert(`Nicht genügend Urlaubstage! Sie haben noch ${vacationStats.remainingDays} Tage übrig.`);
      return;
    }

    if (entryType === 'bildungsurlaub' && selectedDays > vacationStats.remainingBildungsurlaub) {
      alert(`Nicht genügend Bildungsurlaub! Sie haben noch ${vacationStats.remainingBildungsurlaub} Tage übrig.`);
      return;
    }

    setSubmitting(true);
    try {
      if (entryType === 'sick') {
        const result = await onSubmitSickDay(selectedStartDate, selectedEndDate, note);
        if (result?.cancelledBookings > 0) {
          alert(`Krankheit eingetragen. ${result.cancelledBookings} Schicht(en) wurden automatisch storniert.`);
        }
      } else if (entryType === 'bildungsurlaub') {
        await onSubmitBildungsurlaub(selectedStartDate, selectedEndDate, note);
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

    // Finde die Urlaubsdaten für die Teams-Benachrichtigung
    const vacationData = vacations.find(v => v.id === vacationId);
    await onRequestDeletion(vacationId, vacationData);
  };

  const handleSaveBirthDate = async () => {
    if (!birthDate) return;
    setSavingBirthDate(true);
    try {
      await onUpdateBirthDate(birthDate);
    } finally {
      setSavingBirthDate(false);
    }
  };

  // Ausstehenden Antrag direkt löschen (ohne Admin-Genehmigung)
  const handleDeletePending = async (vacationId) => {
    if (!confirm('Antrag wirklich löschen?')) return;
    await onDeletePending(vacationId);
  };

  return (
    <div className="vacation-view">
      {/* Übersicht */}
      <div className="vacation-stats">
        <div className="stat-card">
          <span className="stat-label">Urlaubstage {currentYear}</span>
          <span className="stat-value">{vacationStats.totalDays}</span>
          {vacationStats.isProratedYear && (
            <span className="stat-note">anteilig (von {vacationStats.baseVacationDays})</span>
          )}
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
        {isArzt && (
          <div className="stat-card bildungsurlaub">
            <span className="stat-label">Bildungsurlaub</span>
            <span className="stat-value bildungsurlaub">
              {vacationStats.remainingBildungsurlaub} / {vacationStats.bildungsUrlaubTotal}
            </span>
          </div>
        )}
        <div className="stat-card birthday">
          <span className="stat-label">Mein Geburtstag</span>
          <div className="birthday-input-group">
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="birthday-input"
            />
            {birthDate !== (userData?.birthDate || '') && (
              <button
                className="btn btn-sm btn-primary"
                onClick={handleSaveBirthDate}
                disabled={savingBirthDate}
              >
                {savingBirthDate ? '...' : 'Speichern'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Urlaub/Krankheit einreichen */}
      <div className="vacation-form-card">
        <h3>
          {entryType === 'sick' ? 'Krankheit eintragen' :
           entryType === 'bildungsurlaub' ? 'Bildungsurlaub einreichen' :
           'Urlaub einreichen'}
        </h3>
        <form onSubmit={handleSubmit} className="vacation-form">
          <div className="entry-type-toggle">
            <button
              type="button"
              className={`toggle-btn ${entryType === 'vacation' ? 'active' : ''}`}
              onClick={() => setEntryType('vacation')}
            >
              Urlaub
            </button>
            {isArzt && (
              <button
                type="button"
                className={`toggle-btn bildungsurlaub ${entryType === 'bildungsurlaub' ? 'active' : ''}`}
                onClick={() => setEntryType('bildungsurlaub')}
              >
                Bildungsurlaub
              </button>
            )}
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
              const holidayInfo = getHolidayInfo(day);
              const isToday = isSameDay(day, new Date());
              const weekend = isWeekend(day);
              const hasVacation = dayVacations.length > 0;
              const isHoliday = holidayInfo !== null;

              return (
                <div
                  key={day.toISOString()}
                  className={`calendar-day ${weekend ? 'weekend' : ''} ${isToday ? 'today' : ''} ${hasVacation ? 'has-vacation' : ''} ${isHoliday ? 'holiday' : ''}`}
                >
                  <span className="day-number">{format(day, 'd')}</span>
                  {isHoliday && (
                    <div className="holiday-name" title={holidayInfo.name}>
                      {holidayInfo.name}
                    </div>
                  )}
                  {hasVacation && (
                    <div className="vacation-names">
                      {dayVacations.slice(0, 2).map(v => (
                        <span
                          key={v.id}
                          className={`vacation-name ${v.type === 'sick' ? 'sick' : `color-${userColorMap.get(v.userId) ?? 0}`}`}
                          title={`${v.userName}${v.type === 'sick' ? ' (Krank)' : v.type === 'bildungsurlaub' ? ' (Bildungsurlaub)' : ' (Urlaub)'}`}
                        >
                          {v.userName?.split(' ')[0]}{v.type === 'sick' ? ' 🤒' : v.type === 'bildungsurlaub' ? ' 🎓' : ' 🌴'}
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
                <div
                  key={vacation.id}
                  className={`vacation-item ${vacation.type === 'sick' ? 'sick' : vacation.type === 'bildungsurlaub' ? 'bildungsurlaub' : ''} ${vacation.status === 'pending' ? 'status-pending' : vacation.status === 'rejected' ? 'status-rejected' : ''}`}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}
                >
                  <div className="vacation-info" style={{ flex: 1 }}>
                    <div className="vacation-dates">
                      <span className={`entry-type-badge ${vacation.type}`}>
                        {vacation.type === 'sick' ? '🤒 Krank' : vacation.type === 'bildungsurlaub' ? '🎓 Bildungsurlaub' : '🌴 Urlaub'}
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
                  </div>
                  <div className="vacation-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <span className={`status-badge status-${vacation.status || 'approved'}`}>
                      {vacation.status === 'pending' ? '⏳ Ausstehend' :
                       vacation.status === 'rejected' ? '❌ Abgelehnt' : '✓ Genehmigt'}
                    </span>
                    {vacation.status === 'pending' && (
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', whiteSpace: 'nowrap', textTransform: 'none' }}
                        onClick={() => handleDeletePending(vacation.id)}
                      >
                        Löschen
                      </button>
                    )}
                    {vacation.status === 'approved' && (
                      <>
                        {vacation.deletionRequested ? (
                          <span className="deletion-pending-badge">Löschung beantragt</span>
                        ) : vacation.deletionRejectedAt ? (
                          <>
                            <span className="deletion-rejected-badge">Löschung abgelehnt</span>
                            <button
                              className="btn btn-warning btn-sm"
                              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', whiteSpace: 'nowrap', textTransform: 'none' }}
                              onClick={() => handleRequestDeletion(vacation.id, vacation.type)}
                            >
                              Erneut beantragen
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn btn-warning btn-sm"
                            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', whiteSpace: 'nowrap', textTransform: 'none' }}
                            onClick={() => handleRequestDeletion(vacation.id, vacation.type)}
                          >
                            Löschung beantragen
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
