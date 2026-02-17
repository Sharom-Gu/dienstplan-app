import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, collection, query, where } from 'firebase/firestore';
import { auth, db } from './firebase';
import { notifyNewUserRegistration } from './teamsNotificationService';

export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);

  // Prüfe ob der Benutzer genehmigt wurde
  const userData = await getUserData(userCredential.user.uid);
  if (userData && userData.status === 'pending') {
    await signOut(auth);
    throw new Error('Ihr Konto wartet noch auf Freigabe durch den Administrator.');
  }
  if (userData && userData.status === 'rejected') {
    await signOut(auth);
    throw new Error('Ihre Registrierung wurde abgelehnt. Bitte kontaktieren Sie den Administrator.');
  }
  if (userData && userData.status === 'revoked') {
    await signOut(auth);
    throw new Error('Ihr Zugang wurde deaktiviert. Bitte kontaktieren Sie den Administrator.');
  }

  return userCredential.user;
};

export const registerUser = async (email, password, displayName, role = 'user') => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await updateProfile(user, { displayName });

  // Neue Benutzer bekommen Status 'pending' (außer erster Admin)
  await setDoc(doc(db, 'users', user.uid), {
    displayName,
    email,
    role: 'user', // Rolle wird immer auf 'user' gesetzt, Admin muss vom Admin vergeben werden
    status: 'pending', // Neuer Status: pending, approved, rejected
    weeklyMinHours: 20,
    createdAt: new Date()
  });

  // Teams-Benachrichtigung an Admin senden
  try {
    await notifyNewUserRegistration(displayName, email);
  } catch (err) {
    console.error('Teams Benachrichtigung fehlgeschlagen:', err);
  }

  // Nach Registrierung automatisch ausloggen (muss erst genehmigt werden)
  await signOut(auth);

  return user;
};

// Ausstehende Benutzer-Registrierungen abrufen
export const getPendingUsers = async () => {
  const q = query(collection(db, 'users'), where('status', '==', 'pending'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Alle genehmigten Benutzer abrufen
export const getApprovedUsers = async () => {
  const q = query(collection(db, 'users'), where('status', '==', 'approved'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Urlaubstage basierend auf Rolle ermitteln
const getVacationDaysByRole = (role) => {
  switch (role) {
    case 'arzt':
    case 'mfa':
      return 30;
    case 'werkstudent':
    case 'minijobber':
    default:
      return 15;
  }
};

// Wochenstunden basierend auf Rolle ermitteln
const getWeeklyHoursByRole = (role) => {
  switch (role) {
    case 'arzt':
    case 'mfa':
      return null; // Keine Schichtplanung
    case 'minijobber':
      return 10; // Minijobber max 10h
    case 'werkstudent':
    default:
      return 20;
  }
};

// Benutzer genehmigen (mit Rollen-spezifischen Einstellungen)
export const approveUser = async (userId, role = 'mfa', employmentStartDate = null) => {
  const userRef = doc(db, 'users', userId);
  const vacationDays = getVacationDaysByRole(role);
  const weeklyMinHours = getWeeklyHoursByRole(role);

  const updateData = {
    status: 'approved',
    role: role,
    vacationDays: vacationDays,
    weeklyMinHours: weeklyMinHours,
    approvedAt: new Date()
  };

  // Eintrittsdatum hinzufügen wenn angegeben
  if (employmentStartDate) {
    updateData.employmentStartDate = employmentStartDate;
  }

  await updateDoc(userRef, updateData);
};

// Benutzer ablehnen
export const rejectUser = async (userId) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    status: 'rejected',
    rejectedAt: new Date()
  });
};

// Zugang entziehen (Status auf 'revoked' setzen + zukünftige Buchungen löschen)
export const revokeUser = async (userId) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    status: 'revoked',
    revokedAt: new Date()
  });

  // Zukünftige Buchungen des Users löschen
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const bookingsQuery = query(collection(db, 'bookings'), where('userId', '==', userId));
  const bookingsSnapshot = await getDocs(bookingsQuery);

  let deletedCount = 0;
  for (const bookingDoc of bookingsSnapshot.docs) {
    const booking = bookingDoc.data();
    // Schicht laden um Datum zu prüfen
    const shiftDoc = await getDoc(doc(db, 'shifts', booking.shiftId));
    if (shiftDoc.exists()) {
      const shift = shiftDoc.data();
      if (shift.date >= today) {
        await deleteDoc(bookingDoc.ref);
        deletedCount++;
      }
    }
  }

  return { deletedBookings: deletedCount };
};

// Benutzerrolle ändern (inkl. Anpassung der Urlaubstage und Wochenstunden)
export const changeUserRole = async (userId, newRole) => {
  const userRef = doc(db, 'users', userId);
  const vacationDays = getVacationDaysByRole(newRole);
  const weeklyMinHours = getWeeklyHoursByRole(newRole);

  await updateDoc(userRef, {
    role: newRole,
    vacationDays: vacationDays,
    weeklyMinHours: weeklyMinHours
  });
};

// Benutzer löschen (nur users-Dokument)
export const deleteUser = async (userId) => {
  await deleteDoc(doc(db, 'users', userId));
};

// Alle revoked Users abrufen
export const getRevokedUsers = async () => {
  const q = query(collection(db, 'users'), where('status', '==', 'revoked'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

// User komplett löschen (alle Daten aus allen Collections)
// Hinweis: Firebase Auth Account muss manuell in der Firebase Console gelöscht werden
export const deleteUserCompletely = async (userId) => {
  // 1. Alle Buchungen löschen
  const bookingsQuery = query(collection(db, 'bookings'), where('userId', '==', userId));
  const bookingsSnapshot = await getDocs(bookingsQuery);
  for (const d of bookingsSnapshot.docs) {
    await deleteDoc(d.ref);
  }

  // 2. Alle Urlaubseinträge löschen
  const vacationsQuery = query(collection(db, 'vacations'), where('userId', '==', userId));
  const vacationsSnapshot = await getDocs(vacationsQuery);
  for (const d of vacationsSnapshot.docs) {
    await deleteDoc(d.ref);
  }

  // 3. Alle Stundenausnahmen löschen
  const exceptionsQuery = query(collection(db, 'hourExceptions'), where('userId', '==', userId));
  const exceptionsSnapshot = await getDocs(exceptionsQuery);
  for (const d of exceptionsSnapshot.docs) {
    await deleteDoc(d.ref);
  }

  // 4. User-Dokument löschen
  await deleteDoc(doc(db, 'users', userId));

  return {
    deletedBookings: bookingsSnapshot.size,
    deletedVacations: vacationsSnapshot.size,
    deletedExceptions: exceptionsSnapshot.size
  };
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const getUserData = async (uid) => {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() };
  }
  return null;
};

export const isAdmin = async (uid) => {
  const userData = await getUserData(uid);
  return userData?.role === 'admin';
};

// Passwort-Reset E-Mail senden
export const sendPasswordReset = async (email) => {
  await sendPasswordResetEmail(auth, email);
};

// Geburtsdatum eines Benutzers aktualisieren
export const updateUserBirthDate = async (userId, birthDate) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { birthDate });
};
