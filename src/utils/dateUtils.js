import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  getISOWeek,
  getYear,
  differenceInMinutes,
  parse
} from 'date-fns';
import { de } from 'date-fns/locale';

export const formatDate = (date, formatStr = 'dd.MM.yyyy') => {
  return format(date, formatStr, { locale: de });
};

export const formatWeekday = (date) => {
  return format(date, 'EEEE', { locale: de });
};

export const formatShortWeekday = (date) => {
  return format(date, 'EEE', { locale: de });
};

export const getWeekNumber = (date) => {
  return getISOWeek(date);
};

export const getWeekYear = (date) => {
  return getYear(date);
};

export const getWeekLabel = (weekStart) => {
  const weekNum = getWeekNumber(weekStart);
  const year = getWeekYear(weekStart);
  return `KW ${weekNum} / ${year}`;
};

export const getWeekDays = (weekStart) => {
  return Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
};

export const parseTime = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
};

export const calculateDuration = (startTime, endTime) => {
  const start = parse(startTime, 'HH:mm', new Date());
  const end = parse(endTime, 'HH:mm', new Date());
  return differenceInMinutes(end, start) / 60;
};

export const formatTimeRange = (startTime, endTime) => {
  return `${startTime} - ${endTime}`;
};

export const isToday = (date) => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

export const isPast = (dateStr, timeStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  const shiftDate = new Date(year, month - 1, day, hours, minutes);
  return shiftDate < new Date();
};

export const groupShiftsByDate = (shifts) => {
  return shifts.reduce((acc, shift) => {
    if (!acc[shift.date]) {
      acc[shift.date] = [];
    }
    acc[shift.date].push(shift);
    return acc;
  }, {});
};
