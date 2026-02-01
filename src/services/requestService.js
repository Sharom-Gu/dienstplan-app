import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from './firebase';

const requestsCollection = collection(db, 'requests');
const auditLogsCollection = collection(db, 'auditLogs');

// Audit Logs
export const createAuditLog = async (actorId, action, meta = {}) => {
  await addDoc(auditLogsCollection, {
    actorId,
    action,
    meta,
    createdAt: serverTimestamp()
  });
};

export const getAuditLogs = async (limit = 50) => {
  const q = query(auditLogsCollection, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.slice(0, limit).map(doc => ({ id: doc.id, ...doc.data() }));
};

// Requests
export const createCancelRequest = async (bookingId, requesterId) => {
  // Update booking status
  const bookingRef = doc(db, 'bookings', bookingId);
  await updateDoc(bookingRef, { status: 'pending_cancel' });

  // Create request
  const requestRef = await addDoc(requestsCollection, {
    type: 'cancel',
    status: 'pending',
    requesterId,
    bookingId,
    createdAt: serverTimestamp()
  });

  await createAuditLog(requesterId, 'cancel_request_created', { bookingId, requestId: requestRef.id });

  return requestRef.id;
};

export const createSwapRequest = async (fromBookingId, toShiftId, requesterId, targetUserId = null) => {
  // Update booking status
  const bookingRef = doc(db, 'bookings', fromBookingId);
  await updateDoc(bookingRef, { status: 'pending_swap' });

  // Create request
  const requestRef = await addDoc(requestsCollection, {
    type: 'swap',
    status: 'pending',
    requesterId,
    fromBookingId,
    toShiftId,
    targetUserId,
    createdAt: serverTimestamp()
  });

  await createAuditLog(requesterId, 'swap_request_created', {
    fromBookingId,
    toShiftId,
    targetUserId,
    requestId: requestRef.id
  });

  return requestRef.id;
};

export const getPendingRequests = async () => {
  const q = query(
    requestsCollection,
    where('status', '==', 'pending'),
    orderBy('createdAt', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getRequestsForUser = async (userId) => {
  const q = query(
    requestsCollection,
    where('requesterId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const approveRequest = async (requestId, adminId, adminNote = '') => {
  const requestRef = doc(db, 'requests', requestId);
  const requestDoc = await getDoc(requestRef);

  if (!requestDoc.exists()) {
    throw new Error('Anfrage nicht gefunden');
  }

  const request = requestDoc.data();

  if (request.type === 'cancel') {
    // Delete the booking
    const bookingRef = doc(db, 'bookings', request.bookingId);
    await runTransaction(db, async (transaction) => {
      transaction.delete(bookingRef);
      transaction.update(requestRef, {
        status: 'approved',
        adminNote,
        decidedAt: serverTimestamp(),
        decidedBy: adminId
      });
    });
  } else if (request.type === 'swap') {
    // Handle swap - move user to new shift
    const fromBookingRef = doc(db, 'bookings', request.fromBookingId);
    const fromBookingDoc = await getDoc(fromBookingRef);

    if (!fromBookingDoc.exists()) {
      throw new Error('Original-Buchung nicht gefunden');
    }

    const fromBooking = fromBookingDoc.data();

    await runTransaction(db, async (transaction) => {
      // Update old booking to new shift
      transaction.update(fromBookingRef, {
        shiftId: request.toShiftId,
        status: 'active'
      });

      transaction.update(requestRef, {
        status: 'approved',
        adminNote,
        decidedAt: serverTimestamp(),
        decidedBy: adminId
      });
    });
  }

  await createAuditLog(adminId, 'request_approved', { requestId, type: request.type });
};

export const rejectRequest = async (requestId, adminId, adminNote = '') => {
  const requestRef = doc(db, 'requests', requestId);
  const requestDoc = await getDoc(requestRef);

  if (!requestDoc.exists()) {
    throw new Error('Anfrage nicht gefunden');
  }

  const request = requestDoc.data();

  // Reset booking status
  const bookingId = request.type === 'cancel' ? request.bookingId : request.fromBookingId;
  const bookingRef = doc(db, 'bookings', bookingId);

  await runTransaction(db, async (transaction) => {
    transaction.update(bookingRef, { status: 'active' });
    transaction.update(requestRef, {
      status: 'rejected',
      adminNote,
      decidedAt: serverTimestamp(),
      decidedBy: adminId
    });
  });

  await createAuditLog(adminId, 'request_rejected', { requestId, type: request.type });
};
