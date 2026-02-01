import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { validateShiftData, validateTime } from '../../utils/validation';
import { getShiftTypes } from '../../services/shiftService';

export function ShiftEditor({ shift, currentWeekStart, onSave, onClose }) {
  const isEditing = !!shift;
  const shiftTypes = getShiftTypes();

  const [formData, setFormData] = useState({
    date: shift?.date || format(currentWeekStart, 'yyyy-MM-dd'),
    startTime: shift?.startTime || '09:00',
    endTime: shift?.endTime || '15:00',
    type: shift?.type || 'frueh',
    capacity: shift?.capacity || 2
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const date = addDays(currentWeekStart, i);
    return {
      value: format(date, 'yyyy-MM-dd'),
      label: format(date, 'EEEE, dd.MM.')
    };
  });

  const handleTypeChange = (type) => {
    const template = shiftTypes[type];
    if (template) {
      setFormData({
        ...formData,
        type,
        startTime: template.startTime,
        endTime: template.endTime,
        capacity: template.capacity
      });
    } else {
      setFormData({ ...formData, type });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const validation = validateShiftData(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);
    try {
      await onSave({
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        type: formData.type,
        capacity: parseInt(formData.capacity, 10)
      });
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditing ? 'Schicht bearbeiten' : 'Neue Schicht'}</h3>
          <button className="btn-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="date">Datum</label>
            <select
              id="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              disabled={isEditing}
            >
              {weekDays.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
            {errors.date && <span className="error">{errors.date}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="type">Schichttyp</label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => handleTypeChange(e.target.value)}
            >
              <option value="frueh">Frühschicht 6h (09:00-15:00)</option>
              <option value="spaet">Spätschicht 6h (13:00-19:00)</option>
              <option value="lang_frueh">Lange Schicht 8h (09:00-17:30)</option>
              <option value="lang_spaet">Lange Schicht 8h (10:30-19:00)</option>
              <option value="custom">Benutzerdefiniert</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startTime">Startzeit</label>
              <input
                type="time"
                id="startTime"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData({ ...formData, startTime: e.target.value, type: 'custom' })
                }
              />
              {errors.startTime && <span className="error">{errors.startTime}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="endTime">Endzeit</label>
              <input
                type="time"
                id="endTime"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData({ ...formData, endTime: e.target.value, type: 'custom' })
                }
              />
              {errors.endTime && <span className="error">{errors.endTime}</span>}
            </div>
          </div>
          {errors.timeRange && <span className="error">{errors.timeRange}</span>}

          <div className="form-group">
            <label htmlFor="capacity">Kapazität</label>
            <input
              type="number"
              id="capacity"
              min="1"
              max="10"
              value={formData.capacity}
              onChange={(e) =>
                setFormData({ ...formData, capacity: e.target.value })
              }
            />
            {errors.capacity && <span className="error">{errors.capacity}</span>}
          </div>

          {errors.submit && <div className="error-message">{errors.submit}</div>}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
