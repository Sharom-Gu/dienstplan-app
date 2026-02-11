// Hamburger Feiertage Service
// Berechnet alle gesetzlichen Feiertage für Hamburg

// Berechne Ostersonntag nach der Gauss'schen Osterformel
const calculateEasterSunday = (year) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
};

// Hilfsfunktion: Tage zu einem Datum addieren
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Alle Hamburger Feiertage für ein Jahr berechnen
export const getHolidaysForYear = (year) => {
  const easter = calculateEasterSunday(year);

  const holidays = [
    // Feste Feiertage
    { date: new Date(year, 0, 1), name: 'Neujahr' },
    { date: new Date(year, 4, 1), name: 'Tag der Arbeit' },
    { date: new Date(year, 9, 3), name: 'Tag der Deutschen Einheit' },
    { date: new Date(year, 9, 31), name: 'Reformationstag' }, // Hamburg seit 2018
    { date: new Date(year, 11, 24), name: 'Betriebsurlaub' }, // Heiligabend
    { date: new Date(year, 11, 25), name: '1. Weihnachtstag' },
    { date: new Date(year, 11, 26), name: '2. Weihnachtstag' },
    { date: new Date(year, 11, 31), name: 'Betriebsurlaub' }, // Silvester

    // Bewegliche Feiertage (abhängig von Ostern)
    { date: addDays(easter, -2), name: 'Karfreitag' },
    { date: addDays(easter, 1), name: 'Ostermontag' },
    { date: addDays(easter, 39), name: 'Christi Himmelfahrt' },
    { date: addDays(easter, 50), name: 'Pfingstmontag' },
  ];

  return holidays.map(h => ({
    ...h,
    dateString: formatDateString(h.date)
  }));
};

// Datum als String formatieren (YYYY-MM-DD)
const formatDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Prüfen ob ein Datum ein Feiertag ist
export const isHoliday = (date) => {
  const year = date.getFullYear();
  const holidays = getHolidaysForYear(year);
  const dateString = formatDateString(date);

  return holidays.some(h => h.dateString === dateString);
};

// Feiertag-Info für ein Datum abrufen
export const getHolidayInfo = (date) => {
  const year = date.getFullYear();
  const holidays = getHolidaysForYear(year);
  const dateString = formatDateString(date);

  return holidays.find(h => h.dateString === dateString) || null;
};

// Alle Feiertage für einen Zeitraum abrufen
export const getHolidaysInRange = (startDate, endDate) => {
  const holidays = [];
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = getHolidaysForYear(year);
    holidays.push(...yearHolidays.filter(h => {
      return h.date >= startDate && h.date <= endDate;
    }));
  }

  return holidays;
};

// Prüfen ob ein Datum-String ein Feiertag ist
export const isHolidayString = (dateString) => {
  const date = new Date(dateString);
  return isHoliday(date);
};
