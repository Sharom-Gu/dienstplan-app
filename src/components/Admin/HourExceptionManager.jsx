import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  getHourExceptionsForWeek,
  setHourException,
  removeHourException
} from '../../services/bookingService';

export function HourExceptionManager({
  currentWeekStart,
  employees,
  adminUid,
  adminName,
  onClose
}) {
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [maxHours, setMaxHours] = useState('');
  const [unlimited, setUnlimited] = useState(false);
  const [saving, setSaving] = useState(false);

  const weekLabel = format(currentWeekStart, "'KW' w - dd.MM.yyyy", { locale: de });

  const loadExceptions = async () => {
    setLoading(true);
    try {
      const data = await getHourExceptionsForWeek(currentWeekStart);
      setExceptions(data);
    } catch (err) {
      console.error('Error loading hour exceptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExceptions();
  }, [currentWeekStart]);

  const handleSave = async () => {
    if (!selectedUserId) return;

    setSaving(true);
    try {
      const employee = employees.find(e => e.id === selectedUserId);
      const hours = unlimited ? null : Number(maxHours);

      await setHourException(
        selectedUserId,
        employee?.displayName || employee?.name || 'Unbekannt',
        currentWeekStart,
        hours,
        adminUid,
        adminName
      );

      await loadExceptions();
      setSelectedUserId('');
      setMaxHours('');
      setUnlimited(false);
    } catch (err) {
      alert('Fehler beim Speichern: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (userId) => {
    if (!confirm('Ausnahme wirklich entfernen?')) return;

    try {
      await removeHourException(userId, currentWeekStart);
      await loadExceptions();
    } catch (err) {
      alert('Fehler beim Löschen: ' + err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h3>Stundenausnahmen</h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div style={{ padding: '1rem' }}>
          <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            <strong>{weekLabel}</strong><br />
            Hier können Sie für einzelne Mitarbeiter die Wochenstunden-Begrenzung (20h) aufheben oder ändern.
          </p>

          {/* Neue Ausnahme hinzufügen */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Mitarbeiter auswählen</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={saving}
            >
              <option value="">-- Mitarbeiter wählen --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.displayName || emp.name}
                </option>
              ))}
            </select>
          </div>

          {selectedUserId && (
            <>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={unlimited}
                    onChange={(e) => setUnlimited(e.target.checked)}
                    disabled={saving}
                  />
                  Unbegrenzte Stunden erlauben
                </label>
              </div>

              {!unlimited && (
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label>Maximale Wochenstunden</label>
                  <input
                    type="number"
                    value={maxHours}
                    onChange={(e) => setMaxHours(e.target.value)}
                    placeholder="z.B. 30"
                    min="1"
                    max="60"
                    disabled={saving}
                  />
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving || (!unlimited && !maxHours)}
                style={{ marginBottom: '1.5rem' }}
              >
                {saving ? 'Speichern...' : 'Ausnahme speichern'}
              </button>
            </>
          )}

          {/* Aktuelle Ausnahmen */}
          <h4 style={{ marginBottom: '0.5rem' }}>Aktuelle Ausnahmen für diese Woche</h4>
          {loading ? (
            <p>Laden...</p>
          ) : exceptions.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>Keine Ausnahmen vorhanden. Alle Mitarbeiter haben das Standard-Limit von 20h.</p>
          ) : (
            <div className="exception-list">
              {exceptions.map(exc => (
                <div
                  key={exc.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem',
                    background: 'var(--surface-bg)',
                    borderRadius: '4px',
                    marginBottom: '0.5rem'
                  }}
                >
                  <div>
                    <strong>{exc.userName}</strong>
                    <span style={{ marginLeft: '0.5rem', color: 'var(--accent)' }}>
                      {exc.maxHours === null ? 'Unbegrenzt' : `Max. ${exc.maxHours}h`}
                    </span>
                  </div>
                  <button
                    className="btn btn-danger btn-small"
                    onClick={() => handleRemove(exc.userId)}
                  >
                    Entfernen
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
