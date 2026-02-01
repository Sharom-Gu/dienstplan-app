import { useState, useMemo } from 'react';
import { WeekView } from '../Calendar/WeekView';
import { ShiftEditor } from './ShiftEditor';
import { AuditLog } from './AuditLog';
import { AdminVacationView } from './AdminVacationView';
import { calculateDuration } from '../../utils/dateUtils';

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
function UserManagement({ pendingUsers, approvedUsers, onApproveUser, onRejectUser, onRevokeUser, onChangeUserRole }) {
  const [selectedRoles, setSelectedRoles] = useState({});
  const [processing, setProcessing] = useState({});

  const handleApprove = async (userId) => {
    setProcessing(prev => ({ ...prev, [userId]: true }));
    try {
      const role = selectedRoles[userId] || 'user';
      await onApproveUser(userId, role);
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
    if (role === 'admin') {
      return <span className="role-badge role-admin">Admin</span>;
    }
    return <span className="role-badge role-user">Benutzer</span>;
  };

  return (
    <div className="user-management">
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
                <div className="user-actions">
                  <select
                    value={selectedRoles[user.id] || 'user'}
                    onChange={(e) => setSelectedRoles(prev => ({ ...prev, [user.id]: e.target.value }))}
                    disabled={processing[user.id]}
                  >
                    <option value="user">Benutzer</option>
                    <option value="admin">Admin</option>
                  </select>
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
                </div>
                <div className="user-actions">
                  <select
                    value={user.role || 'user'}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    disabled={processing[user.id]}
                  >
                    <option value="user">Benutzer</option>
                    <option value="admin">Admin</option>
                  </select>
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

export function AdminDashboard({
  userData,
  shifts,
  bookings,
  currentWeekStart,
  auditLogs,
  employees = [],
  pendingUsers = [],
  approvedUsers = [],
  vacations = [],
  currentYear,
  loading,
  onPrevWeek,
  onNextWeek,
  onCurrentWeek,
  onAddShift,
  onEditShift,
  onDeleteShift,
  onGenerateWeek,
  onEditBookingTime,
  onAssignEmployee,
  onApproveUser,
  onRejectUser,
  onRevokeUser,
  onChangeUserRole,
  onDeleteVacation,
  onUpdateEmployee,
  onAddSickDay,
  refreshAll
}) {
  const [activeTab, setActiveTab] = useState('calendar');
  const [editingShift, setEditingShift] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [assigningShift, setAssigningShift] = useState(null);

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

  const handleGenerateWeek = async () => {
    if (confirm('Standardschichten für diese Woche generieren?')) {
      await onGenerateWeek(userData?.id);
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
            <button className="btn btn-secondary" onClick={handleGenerateWeek}>
              Woche generieren
            </button>
          </div>

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
        />
      )}

      {activeTab === 'audit' && <AuditLog logs={auditLogs} />}
    </div>
  );
}
