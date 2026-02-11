import { useState, useMemo } from 'react';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isSameDay, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { calculateProratedVacationDays, calculateBusinessDays } from '../../services/vacationService';
import { getHolidayInfo } from '../../services/holidayService';

export function AdminVacationView({
  vacations,
  employees,
  currentYear,
  onDeleteVacation,
  onApproveDeletion,
  onRejectDeletion,
  onApproveVacation,
  onRejectVacation,
  onUpdateEmployee,
  onAddSickDay,
  onRefresh
}) {
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editVacationDays, setEditVacationDays] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [saving, setSaving] = useState(false);

  // Krankheit eintragen Form
  const [sickEmployeeId, setSickEmployeeId] = useState('');
  const [sickStartDate, setSickStartDate] = useState('');
  const [sickEndDate, setSickEndDate] = useState('');
  const [sickNote, setSickNote] = useState('');
  const [addingSick, setAddingSick] = useState(false);

  // Aufgeklappte Monate
  const [expandedMonths, setExpandedMonths] = useState(new Set());

  // Jahr für Urlaubsliste (kann unabhängig navigiert werden)
  const [listYear, setListYear] = useState(currentYear || new Date().getFullYear());

  // Gefilterte Urlaube
  const displayVacations = useMemo(() => {
    if (selectedEmployee) {
      return vacations.filter(v => v.userId === selectedEmployee);
    }
    return vacations;
  }, [vacations, selectedEmployee]);

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

  // Prüfe ob ein Mitarbeiter an diesem Tag Geburtstag hat
  const getBirthdaysForDay = (day) => {
    const dayMonth = day.getMonth();
    const dayDate = day.getDate();

    return employees.filter(emp => {
      if (!emp.birthDate) return false;
      const birthDate = parseISO(emp.birthDate);
      return birthDate.getMonth() === dayMonth && birthDate.getDate() === dayDate;
    });
  };

  // Mapping von userId zu Farbindex
  const userColorMap = useMemo(() => {
    const map = new Map();
    employees.forEach((emp, index) => {
      map.set(emp.id, index % 10);
    });
    return map;
  }, [employees]);

  // Statistiken pro Mitarbeiter
  const employeeStats = useMemo(() => {
    return employees.map((emp, index) => {
      const empEntries = vacations.filter(
        v => v.userId === emp.id && new Date(v.startDate).getFullYear() === currentYear
      );
      const usedVacationDays = empEntries
        .filter(v => v.type !== 'sick')
        .reduce((sum, v) => sum + (v.days || 0), 0);
      const sickDays = empEntries
        .filter(v => v.type === 'sick')
        .reduce((sum, v) => sum + (v.days || 0), 0);
      const totalDays = emp.vacationDays || 15;
      const remainingDays = totalDays - usedVacationDays;

      return {
        ...emp,
        usedDays: usedVacationDays,
        sickDays,
        totalDays,
        remainingDays,
        colorIndex: index % 10
      };
    });
  }, [employees, vacations, currentYear]);

  // Gruppiere Einträge nach Monat (Einträge die über mehrere Monate gehen erscheinen in jedem Monat)
  const vacationsByMonth = useMemo(() => {
    const yearVacations = displayVacations.filter(
      v => new Date(v.startDate).getFullYear() === listYear || new Date(v.endDate).getFullYear() === listYear
    );

    const monthGroups = {};

    // Alle 12 Monate initialisieren
    for (let month = 0; month < 12; month++) {
      const monthKey = `${listYear}-${String(month + 1).padStart(2, '0')}`;
      monthGroups[monthKey] = [];
    }

    yearVacations.forEach(vacation => {
      const startDate = parseISO(vacation.startDate);
      const endDate = parseISO(vacation.endDate);

      // Finde alle Monate, die dieser Eintrag berührt
      let currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

      while (currentMonth <= lastMonth) {
        if (currentMonth.getFullYear() === listYear) {
          const monthKey = `${listYear}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
          if (monthGroups[monthKey] && !monthGroups[monthKey].find(v => v.id === vacation.id)) {
            monthGroups[monthKey].push(vacation);
          }
        }
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }
    });

    // Sortiere Einträge innerhalb jedes Monats nach Startdatum
    Object.keys(monthGroups).forEach(key => {
      monthGroups[key].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    });

    return monthGroups;
  }, [displayVacations, listYear]);

  // Monatsnamen für Anzeige
  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  const toggleMonth = (monthKey) => {
    setExpandedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(monthKey)) {
        newSet.delete(monthKey);
      } else {
        newSet.add(monthKey);
      }
      return newSet;
    });
  };

  const handleEditEmployee = (emp) => {
    setEditingEmployee(emp);
    setEditVacationDays(emp.vacationDays?.toString() || '15');
    setEditStartDate(emp.employmentStartDate || '');
  };

  const handleSaveEmployee = async () => {
    if (!editingEmployee) return;

    setSaving(true);
    try {
      await onUpdateEmployee(editingEmployee.id, {
        vacationDays: parseInt(editVacationDays) || 15,
        employmentStartDate: editStartDate || null
      });
      setEditingEmployee(null);
      if (onRefresh) await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVacation = async (vacationId, type) => {
    const message = type === 'sick' ? 'Krankheitstag wirklich löschen?' : 'Urlaub wirklich löschen?';
    if (!confirm(message)) return;
    await onDeleteVacation(vacationId);
  };

  const handleAddSickDay = async (e) => {
    e.preventDefault();
    if (!sickEmployeeId || !sickStartDate || !sickEndDate) return;

    const employee = employees.find(e => e.id === sickEmployeeId);
    if (!employee) return;

    setAddingSick(true);
    try {
      const result = await onAddSickDay(
        sickEmployeeId,
        employee.displayName || employee.name,
        sickStartDate,
        sickEndDate,
        sickNote
      );
      if (result?.cancelledBookings > 0) {
        alert(`Krankheit eingetragen. ${result.cancelledBookings} Schicht(en) wurden automatisch storniert.`);
      }
      setSickEmployeeId('');
      setSickStartDate('');
      setSickEndDate('');
      setSickNote('');
      if (onRefresh) await onRefresh();
    } finally {
      setAddingSick(false);
    }
  };

  const sickDaysCount = useMemo(() => {
    if (sickStartDate && sickEndDate) {
      return calculateBusinessDays(sickStartDate, sickEndDate);
    }
    return 0;
  }, [sickStartDate, sickEndDate]);

  // Löschungsanträge filtern
  const deletionRequests = useMemo(() => {
    return vacations.filter(v => v.deletionRequested === true);
  }, [vacations]);

  // Ausstehende Urlaubs-/Krankheitsanträge filtern
  const pendingRequests = useMemo(() => {
    return vacations.filter(v => v.status === 'pending');
  }, [vacations]);

  const handleApproveVacation = async (vacationId, type) => {
    const typeLabel = type === 'sick' ? 'Krankheitsmeldung' :
                      type === 'bildungsurlaub' ? 'Bildungsurlaub' : 'Urlaubsantrag';
    if (!confirm(`${typeLabel} genehmigen?`)) return;
    await onApproveVacation(vacationId);
  };

  const handleRejectVacation = async (vacationId, type) => {
    const typeLabel = type === 'sick' ? 'Krankheitsmeldung' :
                      type === 'bildungsurlaub' ? 'Bildungsurlaub' : 'Urlaubsantrag';
    if (!confirm(`${typeLabel} ablehnen?`)) return;
    await onRejectVacation(vacationId);
  };

  const handleApproveDeletion = async (vacationId, type) => {
    const message = type === 'sick'
      ? 'Löschung des Krankheitstags genehmigen?'
      : 'Löschung des Urlaubs genehmigen?';
    if (!confirm(message)) return;
    await onApproveDeletion(vacationId);
  };

  const handleRejectDeletion = async (vacationId) => {
    if (!confirm('Löschungsantrag ablehnen?')) return;
    await onRejectDeletion(vacationId);
  };

  const handleCalculateProrated = () => {
    if (editStartDate) {
      const prorated = calculateProratedVacationDays(editStartDate, 15);
      setEditVacationDays(prorated.toString());
    }
  };

  return (
    <div className="admin-vacation-view">
      {/* Mitarbeiter-Übersicht */}
      <div className="employee-vacation-stats">
        <h3>Urlaubsübersicht {currentYear}</h3>
        <div className="stats-table">
          <div className="stats-header">
            <span>Mitarbeiter</span>
            <span>Gesamt</span>
            <span>Genommen</span>
            <span>Rest</span>
            <span>Krank</span>
            <span>Aktionen</span>
          </div>
          {employeeStats.map(emp => (
            <div key={emp.id} className="stats-row">
              <span className="emp-name">{emp.displayName || emp.name}</span>
              <span className="emp-total">{emp.totalDays}</span>
              <span className="emp-used">{emp.usedDays}</span>
              <span className={`emp-remaining ${emp.remainingDays <= 3 ? 'warning' : ''}`}>
                {emp.remainingDays}
              </span>
              <span className="emp-sick">{emp.sickDays}</span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleEditEmployee(emp)}
              >
                Bearbeiten
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Krankheit eintragen */}
      <div className="vacation-form-card">
        <h3>Krankheit eintragen</h3>
        <form onSubmit={handleAddSickDay} className="vacation-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="sickEmployee">Mitarbeiter</label>
              <select
                id="sickEmployee"
                value={sickEmployeeId}
                onChange={(e) => setSickEmployeeId(e.target.value)}
                required
              >
                <option value="">-- Auswählen --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.displayName || emp.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="sickStart">Von</label>
              <input
                type="date"
                id="sickStart"
                value={sickStartDate}
                onChange={(e) => setSickStartDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="sickEnd">Bis</label>
              <input
                type="date"
                id="sickEnd"
                value={sickEndDate}
                onChange={(e) => setSickEndDate(e.target.value)}
                min={sickStartDate}
                required
              />
            </div>
            <div className="form-group">
              <label>Tage</label>
              <div className="days-preview sick">{sickDaysCount}</div>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="sickNote">Notiz (optional)</label>
            <input
              type="text"
              id="sickNote"
              value={sickNote}
              onChange={(e) => setSickNote(e.target.value)}
              placeholder="z.B. Erkältung"
            />
          </div>
          <button
            type="submit"
            className="btn btn-warning"
            disabled={addingSick || !sickEmployeeId || !sickStartDate || !sickEndDate || sickDaysCount === 0}
          >
            {addingSick ? 'Wird eingetragen...' : 'Krankheit eintragen'}
          </button>
        </form>
      </div>

      {/* Ausstehende Anträge */}
      <div className="pending-requests-section">
        <h3>Ausstehende Anträge ({pendingRequests.length})</h3>
        {pendingRequests.length === 0 ? (
          <p className="empty-text">Keine ausstehenden Anträge.</p>
        ) : (
          <div className="pending-requests-list">
            {pendingRequests.map(request => (
              <div key={request.id} className={`pending-request-item ${request.type}`}>
                <div className="request-info">
                  <span className={`entry-type-badge ${request.type === 'sick' ? 'sick' : request.type === 'bildungsurlaub' ? 'bildungsurlaub' : 'vacation'}`}>
                    {request.type === 'sick' ? '🤒 Krank' : request.type === 'bildungsurlaub' ? '🎓 Bildungsurlaub' : '🌴 Urlaub'}
                  </span>
                  <span className="request-employee">{request.userName}</span>
                  <span className="date-range">
                    {format(parseISO(request.startDate), 'dd.MM.yyyy', { locale: de })}
                    {request.startDate !== request.endDate && (
                      <> - {format(parseISO(request.endDate), 'dd.MM.yyyy', { locale: de })}</>
                    )}
                  </span>
                  <span className="days-count">{request.days} Tag{request.days !== 1 ? 'e' : ''}</span>
                </div>
                {request.note && (
                  <p className="request-note">Notiz: {request.note}</p>
                )}
                <div className="request-actions">
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleApproveVacation(request.id, request.type)}
                  >
                    Genehmigen
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRejectVacation(request.id, request.type)}
                  >
                    Ablehnen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Löschungsanträge */}
      {deletionRequests.length > 0 && (
        <div className="deletion-requests-section">
          <h3>Löschungsanträge ({deletionRequests.length})</h3>
          <div className="deletion-requests-list">
            {deletionRequests.map(request => (
              <div key={request.id} className={`deletion-request-item ${request.type === 'sick' ? 'sick' : ''}`}>
                <div className="request-info">
                  <span className={`entry-type-badge ${request.type === 'sick' ? 'sick' : request.type === 'bildungsurlaub' ? 'bildungsurlaub' : 'vacation'}`}>
                    {request.type === 'sick' ? '🤒 Krank' : request.type === 'bildungsurlaub' ? '🎓 Bildungsurlaub' : '🌴 Urlaub'}
                  </span>
                  <span className="request-employee">{request.userName}</span>
                  <span className="date-range">
                    {format(parseISO(request.startDate), 'dd.MM.yyyy', { locale: de })}
                    {request.startDate !== request.endDate && (
                      <> - {format(parseISO(request.endDate), 'dd.MM.yyyy', { locale: de })}</>
                    )}
                  </span>
                  <span className="days-count">{request.days} Tag{request.days !== 1 ? 'e' : ''}</span>
                </div>
                {request.deletionReason && (
                  <p className="deletion-reason">Grund: {request.deletionReason}</p>
                )}
                <div className="request-actions">
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleApproveDeletion(request.id, request.type)}
                  >
                    Genehmigen
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRejectDeletion(request.id)}
                  >
                    Ablehnen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bearbeiten-Dialog */}
      {editingEmployee && (
        <div className="modal-overlay" onClick={() => setEditingEmployee(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Urlaubstage bearbeiten</h3>
              <button className="btn-close" onClick={() => setEditingEmployee(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="edit-emp-name">
                <strong>{editingEmployee.displayName || editingEmployee.name}</strong>
              </p>

              <div className="form-group">
                <label htmlFor="employmentStart">Eintrittsdatum</label>
                <input
                  type="date"
                  id="employmentStart"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                />
                {editStartDate && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleCalculateProrated}
                    style={{ marginTop: '0.5rem' }}
                  >
                    Anteilig berechnen
                  </button>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="vacationDays">Urlaubstage {currentYear}</label>
                <input
                  type="number"
                  id="vacationDays"
                  value={editVacationDays}
                  onChange={(e) => setEditVacationDays(e.target.value)}
                  min="0"
                  max="50"
                />
              </div>

              <div className="modal-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setEditingEmployee(null)}
                  disabled={saving}
                >
                  Abbrechen
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveEmployee}
                  disabled={saving}
                >
                  {saving ? 'Speichern...' : 'Speichern'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kalender */}
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
                <option key={emp.id} value={emp.id}>
                  {emp.displayName || emp.name}
                </option>
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
            {Array.from({ length: (calendarDays[0]?.getDay() + 6) % 7 }).map((_, i) => (
              <div key={`empty-${i}`} className="calendar-day empty"></div>
            ))}

            {calendarDays.map(day => {
              const dayVacations = getVacationsForDay(day);
              const dayBirthdays = getBirthdaysForDay(day);
              const holidayInfo = getHolidayInfo(day);
              const isToday = isSameDay(day, new Date());
              const weekend = isWeekend(day);
              const hasVacation = dayVacations.length > 0;
              const hasBirthday = dayBirthdays.length > 0;
              const isHoliday = holidayInfo !== null;

              return (
                <div
                  key={day.toISOString()}
                  className={`calendar-day ${weekend ? 'weekend' : ''} ${isToday ? 'today' : ''} ${hasVacation ? 'has-vacation' : ''} ${hasBirthday ? 'has-birthday' : ''} ${isHoliday ? 'holiday' : ''}`}
                >
                  <span className="day-number">{format(day, 'd')}</span>
                  {isHoliday && (
                    <div className="holiday-name" title={holidayInfo.name}>
                      {holidayInfo.name}
                    </div>
                  )}
                  {hasBirthday && (
                    <div className="birthday-names">
                      {dayBirthdays.map(emp => (
                        <span
                          key={emp.id}
                          className="birthday-name"
                          title={`🎂 ${emp.displayName || emp.name} hat Geburtstag!`}
                        >
                          🎂 {(emp.displayName || emp.name)?.split(' ')[0]}
                        </span>
                      ))}
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
          {employeeStats.map(emp => (
            <div key={emp.id} className="legend-item">
              <span
                className={`vacation-name color-${emp.colorIndex}`}
                style={{ padding: '0.1rem 0.4rem' }}
              >
                {(emp.displayName || emp.name)?.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Urlaubsliste nach Monaten */}
      <div className="vacation-list-section">
        <div className="list-header">
          <h3>
            Eingetragene Urlaube & Krankheitstage
            {selectedEmployee && employees.find(e => e.id === selectedEmployee) && (
              <span> - {employees.find(e => e.id === selectedEmployee)?.displayName || employees.find(e => e.id === selectedEmployee)?.name}</span>
            )}
          </h3>
          <div className="year-nav">
            <button
              className="btn btn-secondary"
              onClick={() => setListYear(y => y - 1)}
            >
              &larr;
            </button>
            <span className="year-label">{listYear}</span>
            <button
              className="btn btn-secondary"
              onClick={() => setListYear(y => y + 1)}
            >
              &rarr;
            </button>
          </div>
        </div>

        <div className="month-accordion">
          {Object.entries(vacationsByMonth).map(([monthKey, monthVacations]) => {
            const monthIndex = parseInt(monthKey.split('-')[1]) - 1;
            const isExpanded = expandedMonths.has(monthKey);
            const vacationCount = monthVacations.filter(v => v.type !== 'sick').length;
            const sickCount = monthVacations.filter(v => v.type === 'sick').length;

            return (
              <div key={monthKey} className="month-group">
                <button
                  className={`month-header ${isExpanded ? 'expanded' : ''} ${monthVacations.length === 0 ? 'empty' : ''}`}
                  onClick={() => toggleMonth(monthKey)}
                  disabled={monthVacations.length === 0}
                >
                  <span className="month-name">{monthNames[monthIndex]}</span>
                  <div className="month-counts">
                    {vacationCount > 0 && (
                      <span className="count-badge vacation">{vacationCount} Urlaub{vacationCount !== 1 ? 'e' : ''}</span>
                    )}
                    {sickCount > 0 && (
                      <span className="count-badge sick">{sickCount} Krank</span>
                    )}
                    {monthVacations.length === 0 && (
                      <span className="count-badge empty">Keine Einträge</span>
                    )}
                  </div>
                  {monthVacations.length > 0 && (
                    <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                  )}
                </button>

                {isExpanded && monthVacations.length > 0 && (
                  <div className="month-entries">
                    {monthVacations.map(vacation => (
                      <div key={`${monthKey}-${vacation.id}`} className={`vacation-item ${vacation.type === 'sick' ? 'sick' : 'admin'} ${vacation.deletionRequested ? 'deletion-pending' : ''}`}>
                        <div className="vacation-info">
                          <span className={`entry-type-badge ${vacation.type === 'sick' ? 'sick' : vacation.type === 'bildungsurlaub' ? 'bildungsurlaub' : 'vacation'}`}>
                            {vacation.type === 'sick' ? '🤒 Krank' : vacation.type === 'bildungsurlaub' ? '🎓 Bildungsurlaub' : '🌴 Urlaub'}
                          </span>
                          {vacation.deletionRequested && (
                            <span className="deletion-pending-badge">Löschung beantragt</span>
                          )}
                          <span className="vacation-employee">{vacation.userName}</span>
                          <span className="date-range">
                            {format(parseISO(vacation.startDate), 'dd.MM.yyyy', { locale: de })}
                            {vacation.startDate !== vacation.endDate && (
                              <> - {format(parseISO(vacation.endDate), 'dd.MM.yyyy', { locale: de })}</>
                            )}
                          </span>
                          <span className="days-count">{vacation.days} Tag{vacation.days !== 1 ? 'e' : ''}</span>
                        </div>
                        {vacation.note && <p className="vacation-note">{vacation.note}</p>}
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteVacation(vacation.id, vacation.type)}
                        >
                          Löschen
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
