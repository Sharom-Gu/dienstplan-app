import { useState, useMemo } from 'react';
import { WeekView } from '../Calendar/WeekView';
import { ShiftEditor } from './ShiftEditor';
import { AuditLog } from './AuditLog';
import { AdminVacationView } from './AdminVacationView';
import { HourExceptionManager } from './HourExceptionManager';
import { calculateDuration } from '../../utils/dateUtils';
import { startOfWeek, endOfWeek, format, parseISO, differenceInCalendarDays } from 'date-fns';

// Hilfsfunktion: Wochenstunden eines Mitarbeiters berechnen (ohne Pausen)
function calculateWeeklyHours(userId, shifts, bookings) {
  const userBookings = bookings.filter(
    b => b.userId === userId && (b.status === 'active' || b.status === 'pending')
  );

  let totalHours = 0;
  for (const booking of userBookings) {
    const shift = shifts.find(s => s.id === booking.shiftId);
    if (shift) {
      const startTime = booking.customStartTime || shift.startTime;
      const endTime = booking.customEndTime || shift.endTime;
      let duration = calculateDuration(startTime, endTime);

      // Bei Langschichten 30 Min Pause abziehen
      const isLongShift = shift.type === 'lang_frueh' || shift.type === 'lang_spaet';
      if (isLongShift) {
        duration -= 0.5;
      }

      totalHours += duration;
    }
  }
  return totalHours;
}

// Hilfsfunktion: Arbeitszeit einer Schicht berechnen (ohne Pause)
function getShiftWorkingHours(shift) {
  const duration = calculateDuration(shift.startTime, shift.endTime);
  const isLongShift = shift.type === 'lang_frueh' || shift.type === 'lang_spaet';
  return isLongShift ? duration - 0.5 : duration;
}

// Inline-Komponente für Mitarbeiter-Zuweisung
function AssignEmployeeDialog({ shift, employees, shifts, bookings, onAssign, onClose }) {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [saving, setSaving] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningHours, setWarningHours] = useState(0);

  // Berechne Schichtdauer (Arbeitszeit ohne Pause)
  const shiftHours = getShiftWorkingHours(shift);

  const handleEmployeeChange = (employeeId) => {
    setSelectedEmployee(employeeId);
    if (employeeId) {
      const currentHours = calculateWeeklyHours(employeeId, shifts, bookings);
      const newTotalHours = currentHours + shiftHours;
      if (currentHours >= 20) {
        setShowWarning(true);
        setWarningHours(currentHours);
      } else {
        setShowWarning(false);
      }
    } else {
      setShowWarning(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    setSaving(true);
    try {
      const employee = employees.find(emp => emp.id === selectedEmployee);
      await onAssign(shift.id, selectedEmployee, employee?.name || 'Unbekannt');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // Mitarbeiter die diese Schicht noch nicht gebucht haben
  const availableEmployees = employees.filter(emp => {
    const hasBooking = bookings.some(
      b => b.shiftId === shift.id && b.userId === emp.id && (b.status === 'active' || b.status === 'pending')
    );
    return !hasBooking;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Mitarbeiter zuweisen</h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '1rem' }}>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>Schicht:</strong> {shift.type} ({shift.startTime} - {shift.endTime})
            </p>
            <p style={{ marginBottom: '1rem' }}>
              <strong>Dauer:</strong> {shiftHours} Stunden
            </p>

            <div className="form-group">
              <label htmlFor="employee">Mitarbeiter auswählen</label>
              <select
                id="employee"
                value={selectedEmployee}
                onChange={(e) => handleEmployeeChange(e.target.value)}
              >
                <option value="">-- Mitarbeiter wählen --</option>
                {availableEmployees.map(emp => {
                  const hours = calculateWeeklyHours(emp.id, shifts, bookings);
                  return (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({hours.toFixed(1)}h diese Woche)
                    </option>
                  );
                })}
              </select>
            </div>

            {showWarning && (
              <div className="warning-box" style={{
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '4px',
                padding: '0.75rem',
                marginBottom: '1rem'
              }}>
                <strong>Hinweis:</strong> Dieser Mitarbeiter hat bereits {warningHours.toFixed(1)} Stunden
                diese Woche. Mit dieser Schicht wären es {(warningHours + shiftHours).toFixed(1)} Stunden
                (über dem Minimum von 20h).
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || !selectedEmployee}
              >
                {saving ? 'Zuweisen...' : 'Zuweisen'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Inline-Komponente für Buchungszeit-Bearbeitung
function BookingTimeEditor({ booking, onSave, onClose }) {
  const [customStartTime, setCustomStartTime] = useState(
    booking.customStartTime || booking.shift?.startTime || '09:00'
  );
  const [customEndTime, setCustomEndTime] = useState(
    booking.customEndTime || booking.shift?.endTime || '15:00'
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(booking.id, customStartTime, customEndTime);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await onSave(booking.id, null, null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Arbeitszeit anpassen</h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '1rem' }}>
            <p style={{ marginBottom: '1rem' }}>
              <strong>Mitarbeiter:</strong> {booking.userName}
            </p>
            <p style={{ marginBottom: '1rem' }}>
              <strong>Standard-Schichtzeit:</strong>{' '}
              {booking.shift?.startTime} - {booking.shift?.endTime}
            </p>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="customStartTime">Individuelle Startzeit</label>
                <input
                  type="time"
                  id="customStartTime"
                  value={customStartTime}
                  onChange={(e) => setCustomStartTime(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="customEndTime">Individuelle Endzeit</label>
                <input
                  type="time"
                  id="customEndTime"
                  value={customEndTime}
                  onChange={(e) => setCustomEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleReset}
                disabled={saving}
              >
                Zurücksetzen
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Inline-Komponente für Benutzer-Verwaltung
function UserManagement({ pendingUsers, approvedUsers, invitations, onApproveUser, onRejectUser, onRevokeUser, onChangeUserRole, onCreateInvitation, onResetPassword }) {
  const [selectedRoles, setSelectedRoles] = useState({});
  const [selectedStartDates, setSelectedStartDates] = useState({});
  const [processing, setProcessing] = useState({});
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resetSent, setResetSent] = useState({});

  const handleCreateInvite = async () => {
    setCreatingInvite(true);
    try {
      const url = await onCreateInvitation();
      setInviteUrl(url);
      setShowInviteModal(true);
    } catch (err) {
      alert('Fehler beim Erstellen der Einladung');
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback für ältere Browser
      const textArea = document.createElement('textarea');
      textArea.value = inviteUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleResetPassword = async (userId, email) => {
    if (!confirm(`Passwort-Reset E-Mail an "${email}" senden?`)) return;
    setProcessing(prev => ({ ...prev, [userId]: true }));
    try {
      await onResetPassword(email);
      setResetSent(prev => ({ ...prev, [userId]: true }));
      setTimeout(() => setResetSent(prev => ({ ...prev, [userId]: false })), 3000);
    } catch (err) {
      alert('Fehler beim Senden der E-Mail: ' + err.message);
    } finally {
      setProcessing(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleApprove = async (userId) => {
    setProcessing(prev => ({ ...prev, [userId]: true }));
    try {
      const role = selectedRoles[userId] || 'mfa';
      const startDate = selectedStartDates[userId] || null;
      await onApproveUser(userId, role, startDate);
    } finally {
      setProcessing(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleReject = async (userId) => {
    if (!confirm('Benutzer wirklich ablehnen?')) return;
    setProcessing(prev => ({ ...prev, [userId]: true }));
    try {
      await onRejectUser(userId);
    } finally {
      setProcessing(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleRevoke = async (userId, userName) => {
    if (!confirm(`Zugang für "${userName}" wirklich entziehen? Der Benutzer kann sich nicht mehr anmelden.`)) return;
    setProcessing(prev => ({ ...prev, [userId]: true }));
    try {
      await onRevokeUser(userId);
    } finally {
      setProcessing(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setProcessing(prev => ({ ...prev, [userId]: true }));
    try {
      await onChangeUserRole(userId, newRole);
    } finally {
      setProcessing(prev => ({ ...prev, [userId]: false }));
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="role-badge role-admin">Admin</span>;
      case 'arzt':
        return <span className="role-badge role-arzt">Arzt</span>;
      case 'mfa':
        return <span className="role-badge role-mfa">MFA</span>;
      case 'werkstudent':
        return <span className="role-badge role-werkstudent">Werkstudent</span>;
      case 'minijobber':
        return <span className="role-badge role-minijobber">Minijobber</span>;
      default:
        return <span className="role-badge role-user">Benutzer</span>;
    }
  };

  return (
    <div className="user-management">
      {/* Einladung erstellen */}
      <div className="user-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Mitarbeiter einladen</h3>
          <button
            className="btn btn-primary"
            onClick={handleCreateInvite}
            disabled={creatingInvite}
          >
            {creatingInvite ? 'Wird erstellt...' : '+ Einladungslink erstellen'}
          </button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Erstellen Sie einen Einladungslink und teilen Sie ihn mit dem neuen Mitarbeiter.
          Der Link kann nur einmal verwendet werden.
        </p>
      </div>

      {/* Einladungs-Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Einladungslink erstellt</h3>
              <button className="btn-close" onClick={() => setShowInviteModal(false)}>&times;</button>
            </div>
            <div style={{ padding: '1rem' }}>
              <p style={{ marginBottom: '1rem' }}>
                Teilen Sie diesen Link mit dem neuen Mitarbeiter:
              </p>
              <div style={{
                background: 'var(--surface-bg)',
                padding: '0.75rem',
                borderRadius: '4px',
                wordBreak: 'break-all',
                marginBottom: '1rem',
                border: '1px solid var(--border-color)'
              }}>
                {inviteUrl}
              </div>
              <div className="modal-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleCopyLink}
                >
                  {copied ? 'Kopiert!' : 'Link kopieren'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowInviteModal(false)}
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ausstehende Registrierungen */}
      <div className="user-section">
        <h3>Ausstehende Registrierungen</h3>
        {pendingUsers.length === 0 ? (
          <p className="empty-text">Keine ausstehenden Registrierungen.</p>
        ) : (
          <div className="users-list">
            {pendingUsers.map(user => (
              <div key={user.id} className="user-card pending">
                <div className="user-info">
                  <strong>{user.displayName}</strong>
                  <span className="user-email">{user.email}</span>
                  {user.createdAt && (
                    <span className="user-date">
                      Registriert: {new Date(user.createdAt.seconds ? user.createdAt.seconds * 1000 : user.createdAt).toLocaleDateString('de-DE')}
                    </span>
                  )}
                </div>
                <div className="user-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                  <select
                    value={selectedRoles[user.id] || 'mfa'}
                    onChange={(e) => setSelectedRoles(prev => ({ ...prev, [user.id]: e.target.value }))}
                    disabled={processing[user.id]}
                  >
                    <option value="arzt">Arzt</option>
                    <option value="mfa">MFA</option>
                    <option value="werkstudent">Werkstudent</option>
                    <option value="minijobber">Minijobber</option>
                    <option value="admin">Admin</option>
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Eintritt:</label>
                    <input
                      type="date"
                      value={selectedStartDates[user.id] || ''}
                      onChange={(e) => setSelectedStartDates(prev => ({ ...prev, [user.id]: e.target.value }))}
                      disabled={processing[user.id]}
                      style={{ padding: '0.35rem', fontSize: '0.85rem' }}
                    />
                  </div>
                  <button
                    className="btn btn-success"
                    onClick={() => handleApprove(user.id)}
                    disabled={processing[user.id]}
                  >
                    {processing[user.id] ? '...' : 'Freigeben'}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleReject(user.id)}
                    disabled={processing[user.id]}
                  >
                    Ablehnen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Aktive Benutzer */}
      <div className="user-section">
        <h3>Aktive Benutzer</h3>
        {approvedUsers.length === 0 ? (
          <p className="empty-text">Keine aktiven Benutzer.</p>
        ) : (
          <div className="users-list">
            {approvedUsers.map(user => (
              <div key={user.id} className="user-card approved">
                <div className="user-info">
                  <div className="user-name-row">
                    <strong>{user.displayName}</strong>
                    {getRoleBadge(user.role)}
                  </div>
                  <span className="user-email">{user.email}</span>
                  {user.approvedAt && (
                    <span className="user-date">
                      Freigegeben: {new Date(user.approvedAt.seconds ? user.approvedAt.seconds * 1000 : user.approvedAt).toLocaleDateString('de-DE')}
                    </span>
                  )}
                  {user.employmentStartDate && (
                    <span className="user-date" style={{ color: 'var(--accent-cyan)' }}>
                      Eintritt: {new Date(user.employmentStartDate).toLocaleDateString('de-DE')}
                    </span>
                  )}
                </div>
                <div className="user-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                  <select
                    value={user.role || 'mfa'}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    disabled={processing[user.id]}
                  >
                    <option value="arzt">Arzt</option>
                    <option value="mfa">MFA</option>
                    <option value="werkstudent">Werkstudent</option>
                    <option value="minijobber">Minijobber</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleResetPassword(user.id, user.email)}
                    disabled={processing[user.id]}
                  >
                    {resetSent[user.id] ? 'Gesendet!' : 'Passwort zurücksetzen'}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleRevoke(user.id, user.displayName)}
                    disabled={processing[user.id]}
                  >
                    {processing[user.id] ? '...' : 'Zugang entziehen'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Widget: Wochen-Uebersicht (Krankmeldungen + Geburtstage)
function WeekOverviewWidgets({ vacations, approvedUsers }) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

  // Krankmeldungen diese Woche
  const sickThisWeek = useMemo(() => {
    return vacations.filter(v => {
      if (v.type !== 'sick') return false;
      if (v.status === 'rejected') return false;
      return v.startDate <= weekEndStr && v.endDate >= weekStartStr;
    });
  }, [vacations, weekStartStr, weekEndStr]);

  // Naechste Geburtstage
  const upcomingBirthdays = useMemo(() => {
    return approvedUsers
      .filter(u => u.birthDate)
      .map(u => {
        const birth = parseISO(u.birthDate);
        let nextBirthdayYear = today.getFullYear();
        let nextBirthday = new Date(nextBirthdayYear, birth.getMonth(), birth.getDate());
        if (nextBirthday < today && format(nextBirthday, 'yyyy-MM-dd') !== format(today, 'yyyy-MM-dd')) {
          nextBirthdayYear++;
          nextBirthday = new Date(nextBirthdayYear, birth.getMonth(), birth.getDate());
        }
        const daysUntil = differenceInCalendarDays(nextBirthday, today);
        return {
          ...u,
          nextBirthday,
          daysUntil,
          birthdayFormatted: format(nextBirthday, 'dd.MM.')
        };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 3);
  }, [approvedUsers, today]);

  const formatDateRange = (start, end) => {
    const s = parseISO(start);
    const e = parseISO(end);
    return `${format(s, 'dd.MM.')} – ${format(e, 'dd.MM.')}`;
  };

  const getDaysUntilLabel = (days) => {
    if (days === 0) return 'Heute!';
    if (days === 1) return 'Morgen';
    return `In ${days} Tagen`;
  };

  return (
    <div className="admin-widgets">
      {/* Krankmeldungen */}
      <div className="widget-card widget-sick">
        <div className="widget-header">
          <span className="widget-icon">🤒</span>
          <h3>Krankmeldungen diese Woche</h3>
        </div>
        <div className="widget-content">
          {sickThisWeek.length === 0 ? (
            <p className="widget-empty">Keine Krankmeldungen diese Woche</p>
          ) : (
            <ul className="widget-list">
              {sickThisWeek.map(v => (
                <li key={v.id} className="widget-list-item">
                  <span className="widget-name">{v.userName}</span>
                  <span className="widget-detail">{formatDateRange(v.startDate, v.endDate)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Geburtstage */}
      <div className="widget-card widget-birthday">
        <div className="widget-header">
          <span className="widget-icon">🎂</span>
          <h3>Naechste Geburtstage</h3>
        </div>
        <div className="widget-content">
          {upcomingBirthdays.length === 0 ? (
            <p className="widget-empty">Keine Geburtstage hinterlegt</p>
          ) : (
            <ul className="widget-list">
              {upcomingBirthdays.map(u => (
                <li key={u.id} className="widget-list-item">
                  <span className="widget-name">{u.displayName}</span>
                  <span className="widget-detail">
                    {u.birthdayFormatted}
                    <span className={`widget-badge ${u.daysUntil === 0 ? 'today' : ''}`}>
                      {getDaysUntilLabel(u.daysUntil)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard({
  userData,
  shifts,
  bookings,
  currentWeekStart,
  auditLogs,
  employees = [],
  pendingUsers = [],
  approvedUsers = [],
  invitations = [],
  vacations = [],
  currentYear,
  loading,
  onPrevWeek,
  onNextWeek,
  onCurrentWeek,
  onAddShift,
  onEditShift,
  onDeleteShift,
  onGenerateMultipleWeeks,
  onClearAllShifts,
  onEditBookingTime,
  onAssignEmployee,
  onApproveUser,
  onRejectUser,
  onRevokeUser,
  onChangeUserRole,
  onCreateInvitation,
  onResetPassword,
  onDeleteVacation,
  onApproveDeletion,
  onRejectDeletion,
  onApproveVacation,
  onRejectVacation,
  onUpdateEmployee,
  onAddSickDay,
  refreshAll
}) {
  const [activeTab, setActiveTab] = useState('calendar');
  const [editingShift, setEditingShift] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [assigningShift, setAssigningShift] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateWeeks, setGenerateWeeks] = useState(12);
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState(null);
  const [showHourExceptions, setShowHourExceptions] = useState(false);

  const handleEditShift = (shift) => {
    setEditingShift(shift);
    setShowEditor(true);
  };

  const handleNewShift = () => {
    setEditingShift(null);
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setEditingShift(null);
    setShowEditor(false);
  };

  const handleSaveShift = async (shiftData) => {
    if (editingShift) {
      await onEditShift(editingShift.id, shiftData);
    } else {
      await onAddShift(shiftData, userData?.id);
    }
    handleCloseEditor();
  };

  const handleDeleteShift = async (shiftId) => {
    if (confirm('Schicht wirklich löschen?')) {
      await onDeleteShift(shiftId);
    }
  };

  const handleOpenGenerateModal = () => {
    setGenerateResult(null);
    setShowGenerateModal(true);
  };

  const handleGenerateMultipleWeeks = async () => {
    setGenerating(true);
    try {
      const result = await onGenerateMultipleWeeks(generateWeeks, userData?.id);
      setGenerateResult(result);
      if (refreshAll) await refreshAll();
    } catch (err) {
      alert('Fehler beim Generieren: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleClearAllShifts = async () => {
    if (!confirm('ACHTUNG: Alle Schichten werden unwiderruflich gelöscht! Fortfahren?')) return;
    if (!confirm('Bist du sicher? Diese Aktion kann nicht rückgängig gemacht werden.')) return;

    setGenerating(true);
    try {
      const count = await onClearAllShifts();
      alert(`${count} Schichten wurden gelöscht.`);
      setShowGenerateModal(false);
      if (refreshAll) await refreshAll();
    } catch (err) {
      alert('Fehler beim Löschen: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleEditBookingTime = (booking) => {
    // Finde die zugehörige Schicht für Standardzeiten
    const shift = shifts.find(s => s.id === booking.shiftId);
    setEditingBooking({ ...booking, shift });
  };

  const handleSaveBookingTime = async (bookingId, customStartTime, customEndTime) => {
    if (onEditBookingTime) {
      await onEditBookingTime(bookingId, customStartTime, customEndTime);
    }
    setEditingBooking(null);
  };

  const handleAssignEmployee = (shift) => {
    setAssigningShift(shift);
  };

  const handleConfirmAssign = async (shiftId, employeeId, employeeName) => {
    if (onAssignEmployee) {
      await onAssignEmployee(shiftId, employeeId, employeeName);
    }
    setAssigningShift(null);
    if (refreshAll) {
      await refreshAll();
    }
  };

  return (
    <div className="admin-dashboard">
      <WeekOverviewWidgets vacations={vacations} approvedUsers={approvedUsers} />

      <div className="admin-tabs">
        <button
          className={`tab ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          Kalender
        </button>
        <button
          className={`tab ${activeTab === 'vacation' ? 'active' : ''}`}
          onClick={() => setActiveTab('vacation')}
        >
          Urlaub
          {vacations.filter(v => v.status === 'pending').length > 0 && (
            <span className="badge warning">{vacations.filter(v => v.status === 'pending').length}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Benutzer
          {pendingUsers.length > 0 && (
            <span className="badge">{pendingUsers.length}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          Audit-Log
        </button>
      </div>

      {activeTab === 'calendar' && (
        <div className="admin-calendar">
          <div className="admin-actions">
            <button className="btn btn-primary" onClick={handleNewShift}>
              + Neue Schicht
            </button>
            <button className="btn btn-secondary" onClick={handleOpenGenerateModal}>
              Schichten generieren
            </button>
            <button className="btn btn-secondary" onClick={() => setShowHourExceptions(true)}>
              Stundenausnahmen
            </button>
          </div>

          {/* Modal für Schichten generieren */}
          {showGenerateModal && (
            <div className="modal-overlay" onClick={() => setShowGenerateModal(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Schichten generieren</h3>
                  <button className="btn-close" onClick={() => setShowGenerateModal(false)}>&times;</button>
                </div>
                <div style={{ padding: '1rem' }}>
                  {!generateResult ? (
                    <>
                      <p style={{ marginBottom: '1rem' }}>
                        Generiert Standard-Schichten für die nächsten Wochen.
                        Wochen die bereits Schichten haben werden übersprungen.
                      </p>
                      <div className="form-group">
                        <label htmlFor="generateWeeks">Anzahl Wochen</label>
                        <select
                          id="generateWeeks"
                          value={generateWeeks}
                          onChange={(e) => setGenerateWeeks(Number(e.target.value))}
                          disabled={generating}
                        >
                          <option value={4}>4 Wochen (1 Monat)</option>
                          <option value={12}>12 Wochen (3 Monate)</option>
                          <option value={26}>26 Wochen (6 Monate)</option>
                          <option value={52}>52 Wochen (1 Jahr)</option>
                        </select>
                      </div>
                      <div className="modal-actions">
                        <button
                          className="btn btn-danger"
                          onClick={handleClearAllShifts}
                          disabled={generating}
                          style={{ marginRight: 'auto' }}
                        >
                          Alle löschen
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setShowGenerateModal(false)}
                          disabled={generating}
                        >
                          Abbrechen
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={handleGenerateMultipleWeeks}
                          disabled={generating}
                        >
                          {generating ? 'Wird generiert...' : 'Generieren'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ textAlign: 'center', padding: '1rem' }}>
                        <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Fertig!</p>
                        <p><strong>{generateResult.generated}</strong> Wochen generiert</p>
                        <p><strong>{generateResult.skipped}</strong> Wochen übersprungen (hatten bereits Schichten)</p>
                        <p><strong>{generateResult.totalShifts}</strong> Schichten insgesamt erstellt</p>
                      </div>
                      <div className="modal-actions">
                        <button
                          className="btn btn-primary"
                          onClick={() => setShowGenerateModal(false)}
                        >
                          Schließen
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <WeekView
            currentWeekStart={currentWeekStart}
            shifts={shifts}
            bookings={bookings}
            userId={userData?.id}
            userName={userData?.displayName}
            isAdmin={true}
            onPrevWeek={onPrevWeek}
            onNextWeek={onNextWeek}
            onCurrentWeek={onCurrentWeek}
            onEditShift={handleEditShift}
            onDeleteShift={handleDeleteShift}
            onEditBookingTime={handleEditBookingTime}
            onAssignEmployee={handleAssignEmployee}
            loading={loading}
          />

          {showEditor && (
            <ShiftEditor
              shift={editingShift}
              currentWeekStart={currentWeekStart}
              onSave={handleSaveShift}
              onClose={handleCloseEditor}
            />
          )}

          {editingBooking && (
            <BookingTimeEditor
              booking={editingBooking}
              onSave={handleSaveBookingTime}
              onClose={() => setEditingBooking(null)}
            />
          )}

          {assigningShift && (
            <AssignEmployeeDialog
              shift={assigningShift}
              employees={employees}
              shifts={shifts}
              bookings={bookings}
              onAssign={handleConfirmAssign}
              onClose={() => setAssigningShift(null)}
            />
          )}

          {showHourExceptions && (
            <HourExceptionManager
              currentWeekStart={currentWeekStart}
              employees={approvedUsers}
              adminUid={userData?.id}
              adminName={userData?.displayName}
              onClose={() => setShowHourExceptions(false)}
            />
          )}
        </div>
      )}

      {activeTab === 'vacation' && (
        <AdminVacationView
          vacations={vacations}
          employees={approvedUsers}
          currentYear={currentYear || new Date().getFullYear()}
          onDeleteVacation={async (vacationId) => {
            await onDeleteVacation(vacationId);
            if (refreshAll) await refreshAll();
          }}
          onApproveDeletion={async (vacationId) => {
            await onApproveDeletion(vacationId);
            if (refreshAll) await refreshAll();
          }}
          onRejectDeletion={async (vacationId) => {
            await onRejectDeletion(vacationId);
            if (refreshAll) await refreshAll();
          }}
          onApproveVacation={async (vacationId) => {
            await onApproveVacation(vacationId);
            if (refreshAll) await refreshAll();
          }}
          onRejectVacation={async (vacationId) => {
            await onRejectVacation(vacationId);
            if (refreshAll) await refreshAll();
          }}
          onUpdateEmployee={async (userId, data) => {
            await onUpdateEmployee(userId, data);
            if (refreshAll) await refreshAll();
          }}
          onAddSickDay={async (userId, userName, startDate, endDate, note) => {
            await onAddSickDay(userId, userName, startDate, endDate, note);
            if (refreshAll) await refreshAll();
          }}
          onRefresh={refreshAll}
        />
      )}

      {activeTab === 'users' && (
        <UserManagement
          pendingUsers={pendingUsers}
          approvedUsers={approvedUsers}
          invitations={invitations}
          onApproveUser={async (userId, role) => {
            await onApproveUser(userId, role);
            if (refreshAll) await refreshAll();
          }}
          onRejectUser={async (userId) => {
            await onRejectUser(userId);
            if (refreshAll) await refreshAll();
          }}
          onRevokeUser={async (userId) => {
            await onRevokeUser(userId);
            if (refreshAll) await refreshAll();
          }}
          onChangeUserRole={async (userId, newRole) => {
            await onChangeUserRole(userId, newRole);
            if (refreshAll) await refreshAll();
          }}
          onCreateInvitation={onCreateInvitation}
          onResetPassword={onResetPassword}
        />
      )}

      {activeTab === 'audit' && <AuditLog logs={auditLogs} />}
    </div>
  );
}
