import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

const vacationsCollection = collection(db, 'vacations');

// Urlaub oder Krankheit eintragen
export const requestVacation = async (userId, userName, startDate, endDate, note = '', type = 'vacation') => {
  const days = calculateBusinessDays(startDate, endDate);

  const docRef = await addDoc(vacationsCollection, {
    userId,
    userName,
    startDate,
    endDate,
    days,
    note,
    type, // 'vacation' oder 'sick'
    status: 'approved',
    createdAt: serverTimestamp()
  });

  return docRef.id;
};

// Krankheitstag eintragen (Admin)
export const addSickDay = async (userId, userName, startDate, endDate, note = '') => {
  return requestVacation(userId, userName, startDate, endDate, note, 'sick');
};

// Urlaub löschen
export const deleteVacation = async (vacationId) => {
  await deleteDoc(doc(db, 'vacations', vacationId));
};

// Urlaub bearbeiten (Admin)
export const updateVacation = async (vacationId, data) => {
  const vacationRef = doc(db, 'vacations', vacationId);
  await updateDoc(vacationRef, data);
};

// Alle Urlaube abrufen
export const getAllVacations = async () => {
  const q = query(vacationsCollection, orderBy('startDate', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Urlaube für einen Benutzer abrufen
export const getVacationsForUser = async (userId) => {
  const q = query(
    vacationsCollection,
    where('userId', '==', userId),
    orderBy('startDate', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Urlaube für ein Jahr abrufen
export const getVacationsForYear = async (year) => {
  const startOfYear = `${year}-01-01`;
  const endOfYear = `${year}-12-31`;

  const q = query(
    vacationsCollection,
    where('startDate', '>=', startOfYear),
    where('startDate', '<=', endOfYear),
    orderBy('startDate', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Urlaubstage für Benutzer im Jahr berechnen
export const getUsedVacationDays = async (userId, year) => {
  const vacations = await getVacationsForUser(userId);

  return vacations
    .filter(v => {
      const vacYear = new Date(v.startDate).getFullYear();
      return vacYear === year && v.status === 'approved';
    })
    .reduce((sum, v) => sum + (v.days || 0), 0);
};

// Berechne Arbeitstage zwischen zwei Daten (Mo-Fr)
export const calculateBusinessDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;

  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
};

// Berechne anteilige Urlaubstage basierend auf Startdatum
export const calculateProratedVacationDays = (startDate, annualDays = 15) => {
  const start = new Date(startDate);
  const year = start.getFullYear();
  const endOfYear = new Date(year, 11, 31);

  // Tage vom Start bis Jahresende
  const remainingDays = Math.ceil((endOfYear - start) / (1000 * 60 * 60 * 24)) + 1;
  const totalDaysInYear = 365 + (isLeapYear(year) ? 1 : 0);

  // Anteilige Urlaubstage (aufgerundet)
  const proratedDays = Math.ceil((remainingDays / totalDaysInYear) * annualDays);

  return proratedDays;
};

// Schaltjahr prüfen
const isLeapYear = (year) => {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
};

// Urlaubstage eines Benutzers aktualisieren (Admin)
export const updateUserVacationDays = async (userId, vacationDays) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { vacationDays });
};

// Startdatum eines Benutzers aktualisieren (Admin)
export const updateUserStartDate = async (userId, employmentStartDate) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { employmentStartDate });
};
