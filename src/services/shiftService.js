import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { format, startOfWeek, addDays } from 'date-fns';
import { isHoliday } from './holidayService';

const shiftsCollection = collection(db, 'shifts');

export const getShiftsForWeek = async (weekStart) => {
  const weekEnd = addDays(weekStart, 4); // Mo-Fr
  const startStr = format(weekStart, 'yyyy-MM-dd');
  const endStr = format(weekEnd, 'yyyy-MM-dd');

  // Einfache Query ohne orderBy (Sortierung im Client)
  const q = query(
    shiftsCollection,
    where('date', '>=', startStr),
    where('date', '<=', endStr)
  );

  const snapshot = await getDocs(q);
  const shifts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Sortierung im Client: erst nach Datum, dann nach Startzeit
  return shifts.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.startTime.localeCompare(b.startTime);
  });
};

export const createShift = async (shiftData, createdBy) => {
  const docRef = await addDoc(shiftsCollection, {
    ...shiftData,
    createdBy,
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

export const updateShift = async (shiftId, updates) => {
  const shiftRef = doc(db, 'shifts', shiftId);
  await updateDoc(shiftRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

export const deleteShift = async (shiftId) => {
  await deleteDoc(doc(db, 'shifts', shiftId));
};

// Default shift templates
// Öffnungszeit: 09:00-19:00
// Jeder Mitarbeiter arbeitet 3 Tage: 2x 6 Stunden + 1x 8 Stunden = 20h/Woche
// Pro Tag: 1x Frühschicht, 1x Spätschicht, 1x Langschicht
const defaultShiftTypes = {
  frueh: { startTime: '09:00', endTime: '15:00', capacity: 2, hours: 6 },           // Frühschicht 6h (2 Plätze)
  spaet: { startTime: '13:00', endTime: '19:00', capacity: 2, hours: 6 },           // Spätschicht 6h (2 Plätze)
  lang_frueh: { startTime: '09:00', endTime: '17:30', capacity: 1, hours: 8 },      // Lange Schicht früh (8h + 30min Pause) - 1 Platz
  lang_spaet: { startTime: '10:30', endTime: '19:00', capacity: 1, hours: 8 }       // Lange Schicht spät (8h + 30min Pause) - 1 Platz
};

export const generateWeekShifts = async (weekStart, createdBy, shiftTypes = ['frueh', 'spaet']) => {
  const createdShifts = [];

  for (let i = 0; i < 5; i++) { // Mo-Fr
    const dayDate = addDays(weekStart, i);
    const date = format(dayDate, 'yyyy-MM-dd');

    // Keine Schichten an Feiertagen erstellen
    if (isHoliday(dayDate)) {
      continue;
    }

    for (const type of shiftTypes) {
      const template = defaultShiftTypes[type];
      if (template) {
        const shiftId = await createShift({
          date,
          startTime: template.startTime,
          endTime: template.endTime,
          type,
          capacity: template.capacity
        }, createdBy);
        createdShifts.push(shiftId);
      }
    }
  }

  return createdShifts;
};

// Prüft ob für eine Woche bereits Schichten existieren
export const weekHasShifts = async (weekStart) => {
  const weekEnd = addDays(weekStart, 4);
  const startStr = format(weekStart, 'yyyy-MM-dd');
  const endStr = format(weekEnd, 'yyyy-MM-dd');

  const q = query(
    shiftsCollection,
    where('date', '>=', startStr),
    where('date', '<=', endStr)
  );

  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

// Generiert Schichten für mehrere Wochen (überspringt Wochen die bereits Schichten haben)
// Beide Langschichten werden generiert (lang_frueh und lang_spaet)
export const generateMultipleWeeksShifts = async (startDate, numberOfWeeks, createdBy, shiftTypes = ['frueh', 'spaet', 'lang_frueh', 'lang_spaet']) => {
  const results = {
    generated: 0,
    skipped: 0,
    totalShifts: 0
  };

  let currentWeekStart = startOfWeek(startDate, { weekStartsOn: 1 });

  for (let week = 0; week < numberOfWeeks; week++) {
    const hasShifts = await weekHasShifts(currentWeekStart);

    if (!hasShifts) {
      const shifts = await generateWeekShifts(currentWeekStart, createdBy, shiftTypes);
      results.generated++;
      results.totalShifts += shifts.length;
    } else {
      results.skipped++;
    }

    currentWeekStart = addDays(currentWeekStart, 7);
  }

  return results;
};

export const getShiftTypes = () => defaultShiftTypes;

// Alle Schichten löschen
export const deleteAllShifts = async () => {
  const snapshot = await getDocs(shiftsCollection);
  const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
  return snapshot.docs.length;
};
