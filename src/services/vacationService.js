import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { format, eachDayOfInterval, parseISO, isWeekend } from 'date-fns';

const vacationsCollection = collection(db, 'vacations');
const bookingsCollection = collection(db, 'bookings');
const shiftsCollection = collection(db, 'shifts');

// Hilfsfunktion: Finde Buchungen des Users an bestimmten Tagen
const findUserBookingsOnDates = async (userId, dates) => {
  // Hole alle Schichten an diesen Tagen
  const dateStrings = dates.map(d => format(d, 'yyyy-MM-dd'));

  // Wir müssen alle Schichten holen und filtern (wegen Firestore-Limits)
  const shiftsSnapshot = await getDocs(shiftsCollection);
  const shiftsOnDates = shiftsSnapshot.docs
    .filter(doc => dateStrings.includes(doc.data().date))
    .map(doc => ({ id: doc.id, ...doc.data() }));

  if (shiftsOnDates.length === 0) return [];

  const shiftIds = shiftsOnDates.map(s => s.id);

  // Hole alle Buchungen des Users
  const bookingsQuery = query(bookingsCollection, where('userId', '==', userId));
  const bookingsSnapshot = await getDocs(bookingsQuery);

  // Finde aktive Buchungen für diese Schichten
  const userBookingsOnDates = bookingsSnapshot.docs
    .filter(doc => {
      const data = doc.data();
      return data.status === 'active' && shiftIds.includes(data.shiftId);
    })
    .map(doc => {
      const data = doc.data();
      const shift = shiftsOnDates.find(s => s.id === data.shiftId);
      return { id: doc.id, ...data, shiftDate: shift?.date };
    });

  return userBookingsOnDates;
};

// Buchung stornieren (intern)
const cancelBookingInternal = async (bookingId) => {
  const bookingRef = doc(db, 'bookings', bookingId);
  await updateDoc(bookingRef, {
    status: 'cancelled',
    cancelledAt: serverTimestamp(),
    cancelReason: 'sick_day'
  });
};

// Urlaub oder Krankheit eintragen
export const requestVacation = async (userId, userName, startDate, endDate, note = '', type = 'vacation') => {
  const days = calculateBusinessDays(startDate, endDate);

  // Berechne alle Arbeitstage im Zeitraum
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const allDays = eachDayOfInterval({ start, end });
  const businessDays = allDays.filter(d => !isWeekend(d));

  // Prüfe ob der User an diesen Tagen Buchungen hat
  const bookingsOnDates = await findUserBookingsOnDates(userId, businessDays);

  if (bookingsOnDates.length > 0) {
    if (type === 'vacation') {
      // Bei Urlaub: Fehler werfen
      const bookedDates = bookingsOnDates.map(b => b.shiftDate).join(', ');
      throw new Error(`Du hast an folgenden Tagen bereits Schichten gebucht: ${bookedDates}. Bitte storniere diese zuerst, bevor du Urlaub einreichst.`);
    } else {
      // Bei Krankheit: Buchungen automatisch stornieren
      for (const booking of bookingsOnDates) {
        await cancelBookingInternal(booking.id);
      }
    }
  }

  const docRef = await addDoc(vacationsCollection, {
    userId,
    userName,
    startDate,
    endDate,
    days,
    note,
    type, // 'vacation' oder 'sick'
    status: 'approved',
    createdAt: serverTimestamp(),
    // Bei Krankheit: speichere stornierte Buchungen
    ...(type === 'sick' && bookingsOnDates.length > 0 ? {
      cancelledBookings: bookingsOnDates.map(b => b.id)
    } : {})
  });

  return {
    id: docRef.id,
    cancelledBookings: type === 'sick' ? bookingsOnDates.length : 0
  };
};

// Krankheitstag eintragen (Admin)
export const addSickDay = async (userId, userName, startDate, endDate, note = '') => {
  return requestVacation(userId, userName, startDate, endDate, note, 'sick');
};

// Urlaub löschen (nur Admin)
export const deleteVacation = async (vacationId) => {
  await deleteDoc(doc(db, 'vacations', vacationId));
};

// Löschung beantragen (User)
export const requestVacationDeletion = async (vacationId, reason = '') => {
  const vacationRef = doc(db, 'vacations', vacationId);
  await updateDoc(vacationRef, {
    deletionRequested: true,
    deletionRequestedAt: serverTimestamp(),
    deletionReason: reason,
    deletionRejectedAt: null // Zurücksetzen bei erneutem Antrag
  });
};

// Löschungsantrag genehmigen (Admin) - löscht den Eintrag
export const approveDeletionRequest = async (vacationId) => {
  await deleteDoc(doc(db, 'vacations', vacationId));
};

// Löschungsantrag ablehnen (Admin)
export const rejectDeletionRequest = async (vacationId) => {
  const vacationRef = doc(db, 'vacations', vacationId);
  await updateDoc(vacationRef, {
    deletionRequested: false,
    deletionRequestedAt: null,
    deletionReason: null,
    deletionRejectedAt: serverTimestamp()
  });
};

// Alle Löschungsanträge abrufen (Admin)
export const getDeletionRequests = async () => {
  const q = query(vacationsCollection, where('deletionRequested', '==', true));
  const snapshot = await getDocs(q);
  const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return requests.sort((a, b) => {
    const aTime = a.deletionRequestedAt?.toDate?.() || new Date(0);
    const bTime = b.deletionRequestedAt?.toDate?.() || new Date(0);
    return bTime - aTime;
  });
};

// Urlaub bearbeiten (Admin)
export const updateVacation = async (vacationId, data) => {
  const vacationRef = doc(db, 'vacations', vacationId);
  await updateDoc(vacationRef, data);
};

// Alle Urlaube abrufen
export const getAllVacations = async () => {
  const snapshot = await getDocs(vacationsCollection);
  const vacations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  // Client-seitige Sortierung um Index-Probleme zu vermeiden
  return vacations.sort((a, b) => a.startDate.localeCompare(b.startDate));
};

// Urlaube für einen Benutzer abrufen
export const getVacationsForUser = async (userId) => {
  const q = query(
    vacationsCollection,
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  const vacations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  // Client-seitige Sortierung
  return vacations.sort((a, b) => a.startDate.localeCompare(b.startDate));
};

// Urlaube für ein Jahr abrufen
export const getVacationsForYear = async (year) => {
  const startOfYear = `${year}-01-01`;
  const endOfYear = `${year}-12-31`;

  const q = query(
    vacationsCollection,
    where('startDate', '>=', startOfYear),
    where('startDate', '<=', endOfYear)
  );
  const snapshot = await getDocs(q);
  const vacations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  // Client-seitige Sortierung
  return vacations.sort((a, b) => a.startDate.localeCompare(b.startDate));
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
