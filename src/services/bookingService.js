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

const bookingsCollection = collection(db, 'bookings');

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
