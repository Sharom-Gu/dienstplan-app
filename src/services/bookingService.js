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
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from './firebase';
import { createAuditLog } from './requestService';
import { startOfWeek, endOfWeek, format, parseISO, addDays } from 'date-fns';

const bookingsCollection = collection(db, 'bookings');
const hourExceptionsCollection = collection(db, 'hourExceptions');
const vacationsCollection = collection(db, 'vacations');

// Berechnet Stunden basierend auf Urlaubs-/Krankheitstagen
// 1 Tag = 8h, 2 Tage = 14h, 3+ Tage = 20h
const calculateDaysToHours = (days) => {
  if (days <= 0) return 0;
  if (days === 1) return 8;
  if (days === 2) return 14;
  return 20; // 3+ Tage = volle 20h
};

// Holt Urlaubstage für einen User in einer Woche (nur Urlaub, nicht Krankheit)
// Krankheit wird über stornierte Buchungen berechnet, nicht hier
const getVacationDaysInWeek = async (userId, weekStart) => {
  const weekDates = Array.from({ length: 5 }, (_, i) =>
    format(addDays(weekStart, i), 'yyyy-MM-dd')
  );

  // Alle Urlaube des Users holen (nur type 'vacation', nicht 'sick')
  const q = query(vacationsCollection, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const vacations = snapshot.docs.map(d => d.data()).filter(v => v.type === 'vacation');

  let vacationDays = 0;

  for (const vac of vacations) {
    const vacStart = parseISO(vac.startDate);
    const vacEnd = parseISO(vac.endDate);

    // Zähle Tage die in diese Woche fallen
    for (const dateStr of weekDates) {
      const date = parseISO(dateStr);
      if (date >= vacStart && date <= vacEnd) {
        vacationDays++;
      }
    }
  }

  return vacationDays;
};

// Berechnet die Arbeitsstunden einer Schicht (ohne Pause)
const calculateShiftHours = (shift) => {
  const [startH, startM] = shift.startTime.split(':').map(Number);
  const [endH, endM] = shift.endTime.split(':').map(Number);
  const hours = (endH + endM / 60) - (startH + startM / 60);

  // Bei Langschichten 30 Min Pause abziehen
  const isLongShift = shift.type === 'lang_frueh' || shift.type === 'lang_spaet';
  return isLongShift ? hours - 0.5 : hours;
};

// Holt die maximalen Wochenstunden für einen User (Standard: 20, oder Ausnahme)
export const getMaxWeeklyHours = async (userId, weekStart) => {
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');

  // Prüfe ob eine Ausnahme existiert
  const q = query(
    hourExceptionsCollection,
    where('userId', '==', userId),
    where('weekStart', '==', weekStartStr)
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const exception = snapshot.docs[0].data();
    return exception.maxHours; // null = unbegrenzt
  }

  return 20; // Standard: 20 Stunden
};

// Setzt eine Stundenausnahme für einen User in einer bestimmten Woche
export const setHourException = async (userId, userName, weekStart, maxHours, setByUid, setByName) => {
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');

  // Prüfe ob bereits eine Ausnahme existiert
  const q = query(
    hourExceptionsCollection,
    where('userId', '==', userId),
    where('weekStart', '==', weekStartStr)
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    // Update existing
    const docRef = snapshot.docs[0].ref;
    await updateDoc(docRef, {
      maxHours,
      updatedAt: serverTimestamp(),
      updatedBy: setByUid,
      updatedByName: setByName
    });
    return snapshot.docs[0].id;
  } else {
    // Create new
    const docRef = await addDoc(hourExceptionsCollection, {
      userId,
      userName,
      weekStart: weekStartStr,
      maxHours,
      createdAt: serverTimestamp(),
      createdBy: setByUid,
      createdByName: setByName
    });
    return docRef.id;
  }
};

// Löscht eine Stundenausnahme
export const removeHourException = async (userId, weekStart) => {
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');

  const q = query(
    hourExceptionsCollection,
    where('userId', '==', userId),
    where('weekStart', '==', weekStartStr)
  );
  const snapshot = await getDocs(q);

  for (const doc of snapshot.docs) {
    await deleteDoc(doc.ref);
  }
};

// Holt alle Stundenausnahmen für eine Woche
export const getHourExceptionsForWeek = async (weekStart) => {
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');

  const q = query(
    hourExceptionsCollection,
    where('weekStart', '==', weekStartStr)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getBookingsForShift = async (shiftId) => {
  const q = query(bookingsCollection, where('shiftId', '==', shiftId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getBookingsForUser = async (userId) => {
  const q = query(bookingsCollection, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getBookingsForWeek = async (shiftIds) => {
  if (shiftIds.length === 0) return [];

  // Firestore 'in' queries limited to 30 items
  const chunks = [];
  for (let i = 0; i < shiftIds.length; i += 30) {
    chunks.push(shiftIds.slice(i, i + 30));
  }

  const allBookings = [];
  for (const chunk of chunks) {
    const q = query(bookingsCollection, where('shiftId', 'in', chunk));
    const snapshot = await getDocs(q);
    allBookings.push(...snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }

  return allBookings;
};

export const bookShift = async (shiftId, userId, userName) => {
  return runTransaction(db, async (transaction) => {
    const shiftRef = doc(db, 'shifts', shiftId);
    const shiftDoc = await transaction.get(shiftRef);

    if (!shiftDoc.exists()) {
      throw new Error('Schicht existiert nicht');
    }

    const shiftData = shiftDoc.data();
    const shiftDate = shiftData.date; // Format: 'yyyy-MM-dd'

    // Get current bookings for this shift
    const bookingsQuery = query(bookingsCollection, where('shiftId', '==', shiftId));
    const bookingsSnapshot = await getDocs(bookingsQuery);
    const activeBookings = bookingsSnapshot.docs.filter(
      doc => doc.data().status === 'active'
    );

    // Check capacity
    if (activeBookings.length >= shiftData.capacity) {
      throw new Error('Schicht ist bereits voll');
    }

    // Check if user already booked this shift
    const userBooking = bookingsSnapshot.docs.find(
      doc => doc.data().userId === userId && doc.data().status === 'active'
    );
    if (userBooking) {
      throw new Error('Du hast diese Schicht bereits gebucht');
    }

    // Check if user already has a booking on the same day
    // First, get all shifts for this date
    const shiftsQuery = query(collection(db, 'shifts'), where('date', '==', shiftDate));
    const shiftsSnapshot = await getDocs(shiftsQuery);
    const sameDayShiftIds = shiftsSnapshot.docs.map(doc => doc.id);

    // Then check if user has any active booking for any of those shifts
    const userBookingsQuery = query(bookingsCollection, where('userId', '==', userId));
    const userBookingsSnapshot = await getDocs(userBookingsQuery);
    const userHasBookingOnSameDay = userBookingsSnapshot.docs.some(bookingDoc => {
      const bookingData = bookingDoc.data();
      return bookingData.status === 'active' && sameDayShiftIds.includes(bookingData.shiftId);
    });

    if (userHasBookingOnSameDay) {
      throw new Error('Du hast bereits eine Schicht an diesem Tag gebucht');
    }

    // Check if user has vacation or sick day on this date
    const vacationsQuery = query(vacationsCollection, where('userId', '==', userId));
    const vacationsSnapshot = await getDocs(vacationsQuery);
    const shiftDateObj = parseISO(shiftDate);

    for (const vacDoc of vacationsSnapshot.docs) {
      const vacData = vacDoc.data();
      const vacStart = parseISO(vacData.startDate);
      const vacEnd = parseISO(vacData.endDate);

      if (shiftDateObj >= vacStart && shiftDateObj <= vacEnd) {
        if (vacData.type === 'sick') {
          throw new Error('Du hast an diesem Tag bereits einen Krankheitstag eingetragen');
        } else {
          throw new Error('Du hast an diesem Tag bereits Urlaub eingetragen');
        }
      }
    }

    // Check weekly hours limit
    const weekStart = startOfWeek(shiftDateObj, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(shiftDateObj, { weekStartsOn: 1 });
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

    // Get max hours for this user this week (might have exception)
    const maxHours = await getMaxWeeklyHours(userId, weekStart);

    // Only check if there's a limit (null = unlimited)
    if (maxHours !== null) {
      // Get all shifts for this week
      const weekShiftsQuery = query(
        collection(db, 'shifts'),
        where('date', '>=', weekStartStr),
        where('date', '<=', weekEndStr)
      );
      const weekShiftsSnapshot = await getDocs(weekShiftsQuery);
      const weekShifts = weekShiftsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const weekShiftIds = weekShifts.map(s => s.id);

      // Get user's active bookings for this week
      let currentWeekHours = 0;
      for (const bookingDoc of userBookingsSnapshot.docs) {
        const bookingData = bookingDoc.data();
        if (bookingData.status === 'active' && weekShiftIds.includes(bookingData.shiftId)) {
          const bookedShift = weekShifts.find(s => s.id === bookingData.shiftId);
          if (bookedShift) {
            currentWeekHours += calculateShiftHours(bookedShift);
          }
        }
      }

      // Get vacation hours for this week (Krankheit wird über stornierte Buchungen gezählt)
      const vacationDays = await getVacationDaysInWeek(userId, weekStart);
      const vacationHours = calculateDaysToHours(vacationDays);

      // Effektive Urlaubsstunden (auf maxHours begrenzt)
      const effectiveVacationHours = Math.min(vacationHours, Math.max(0, maxHours - currentWeekHours));
      const totalHoursWithVacation = currentWeekHours + effectiveVacationHours;

      // Calculate hours for the new shift
      const newShiftHours = calculateShiftHours(shiftData);

      if (totalHoursWithVacation + newShiftHours > maxHours) {
        let errorMsg = `Du hast bereits ${currentWeekHours}h diese Woche gebucht`;
        if (effectiveVacationHours > 0) errorMsg += ` + ${effectiveVacationHours}h Urlaub`;
        errorMsg += `. Diese Schicht (${newShiftHours}h) würde das Maximum von ${maxHours}h überschreiten.`;
        throw new Error(errorMsg);
      }
    }

    // Create booking
    const bookingRef = doc(collection(db, 'bookings'));
    transaction.set(bookingRef, {
      shiftId,
      userId,
      userName,
      status: 'active',
      createdAt: serverTimestamp()
    });

    return bookingRef.id;
  });
};

export const updateBookingStatus = async (bookingId, status) => {
  const bookingRef = doc(db, 'bookings', bookingId);
  await updateDoc(bookingRef, { status });
};

// Buchung stornieren (Status auf 'cancelled' setzen)
export const cancelBooking = async (bookingId) => {
  const bookingRef = doc(db, 'bookings', bookingId);
  await updateDoc(bookingRef, {
    status: 'cancelled',
    cancelledAt: serverTimestamp()
  });
};

export const deleteBooking = async (bookingId) => {
  await deleteDoc(doc(db, 'bookings', bookingId));
};

export const getBooking = async (bookingId) => {
  const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
  if (bookingDoc.exists()) {
    return { id: bookingDoc.id, ...bookingDoc.data() };
  }
  return null;
};
