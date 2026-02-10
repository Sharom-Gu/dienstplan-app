import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

const invitationsCollection = collection(db, 'invitations');

// Generiert einen zufälligen Token
const generateToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

// Neue Einladung erstellen (nur Admin)
export const createInvitation = async (createdByUid, createdByName) => {
  const token = generateToken();

  const docRef = await addDoc(invitationsCollection, {
    token,
    createdBy: createdByUid,
    createdByName,
    createdAt: serverTimestamp(),
    usedAt: null,
    usedBy: null,
    usedByName: null
  });

  return { id: docRef.id, token };
};

// Einladung per Token validieren
export const validateInvitation = async (token) => {
  const q = query(invitationsCollection, where('token', '==', token));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return { valid: false, error: 'Ungültiger Einladungslink' };
  }

  const inviteDoc = snapshot.docs[0];
  const invite = inviteDoc.data();

  if (invite.usedAt) {
    return { valid: false, error: 'Dieser Einladungslink wurde bereits verwendet' };
  }

  return { valid: true, inviteId: inviteDoc.id, invite };
};

// Einladung als verwendet markieren
export const markInvitationUsed = async (inviteId, userId, userName) => {
  const inviteRef = doc(db, 'invitations', inviteId);
  await updateDoc(inviteRef, {
    usedAt: serverTimestamp(),
    usedBy: userId,
    usedByName: userName
  });
};

// Alle Einladungen abrufen (für Admin-Übersicht)
export const getAllInvitations = async () => {
  const snapshot = await getDocs(invitationsCollection);
  const invitations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  // Client-seitige Sortierung (neueste zuerst)
  return invitations.sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return bTime - aTime;
  });
};
