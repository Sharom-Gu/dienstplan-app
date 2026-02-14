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
export const approveUser = async (userId, role = 'mfa') => {
  const userRef = doc(db, 'users', userId);
  const vacationDays = getVacationDaysByRole(role);
  const weeklyMinHours = getWeeklyHoursByRole(role);

  await updateDoc(userRef, {
    status: 'approved',
    role: role,
    vacationDays: vacationDays,
    weeklyMinHours: weeklyMinHours,
    approvedAt: new Date()
  });
};

// Benutzer ablehnen
export const rejectUser = async (userId) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    status: 'rejected',
    rejectedAt: new Date()
  });
};

// Zugang entziehen (Status auf 'revoked' setzen)
export const revokeUser = async (userId) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    status: 'revoked',
    revokedAt: new Date()
  });
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

// Benutzer löschen
export const deleteUser = async (userId) => {
  await deleteDoc(doc(db, 'users', userId));
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
