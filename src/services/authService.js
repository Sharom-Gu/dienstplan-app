import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, collection, query, where } from 'firebase/firestore';
import { auth, db } from './firebase';

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

// Benutzer genehmigen
export const approveUser = async (userId, role = 'user') => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    status: 'approved',
    role: role,
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

// Benutzerrolle ändern
export const changeUserRole = async (userId, newRole) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    role: newRole
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
