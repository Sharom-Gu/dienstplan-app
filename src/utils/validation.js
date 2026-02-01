export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePassword = (password) => {
  return password && password.length >= 6;
};

export const validateTime = (timeStr) => {
  const re = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return re.test(timeStr);
};

export const validateTimeRange = (startTime, endTime) => {
  if (!validateTime(startTime) || !validateTime(endTime)) {
    return { valid: false, error: 'Ungültiges Zeitformat' };
  }

  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);

  const startTotal = startHours * 60 + startMinutes;
  const endTotal = endHours * 60 + endMinutes;

  if (endTotal <= startTotal) {
    return { valid: false, error: 'Endzeit muss nach Startzeit liegen' };
  }

  return { valid: true };
};

export const validateCapacity = (capacity) => {
  const num = parseInt(capacity, 10);
  return !isNaN(num) && num > 0 && num <= 10;
};

export const validateShiftData = (data) => {
  const errors = {};

  if (!data.date) {
    errors.date = 'Datum ist erforderlich';
  }

  if (!data.startTime) {
    errors.startTime = 'Startzeit ist erforderlich';
  } else if (!validateTime(data.startTime)) {
    errors.startTime = 'Ungültiges Zeitformat (HH:MM)';
  }

  if (!data.endTime) {
    errors.endTime = 'Endzeit ist erforderlich';
  } else if (!validateTime(data.endTime)) {
    errors.endTime = 'Ungültiges Zeitformat (HH:MM)';
  }

  if (data.startTime && data.endTime) {
    const rangeValidation = validateTimeRange(data.startTime, data.endTime);
    if (!rangeValidation.valid) {
      errors.timeRange = rangeValidation.error;
    }
  }

  if (!validateCapacity(data.capacity)) {
    errors.capacity = 'Kapazität muss zwischen 1 und 10 liegen';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

export const getInitials = (name) => {
  if (!name) return '??';
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};
