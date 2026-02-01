import { useState, useEffect, useCallback } from 'react';
import {
  getPendingRequests,
  getRequestsForUser,
  createCancelRequest,
  createSwapRequest,
  approveRequest,
  rejectRequest,
  getAuditLogs
} from '../services/requestService';

export function useRequests(userId = null, isAdmin = false) {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [userRequests, setUserRequests] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPendingRequests = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const data = await getPendingRequests();
      setPendingRequests(data);
    } catch (err) {
      console.error('Error fetching pending requests:', err);
    }
  }, [isAdmin]);

  const fetchUserRequests = useCallback(async () => {
    if (!userId) return;

    try {
      const data = await getRequestsForUser(userId);
      setUserRequests(data);
    } catch (err) {
      console.error('Error fetching user requests:', err);
    }
  }, [userId]);

  const fetchAuditLogs = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const data = await getAuditLogs();
      setAuditLogs(data);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  }, [isAdmin]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchPendingRequests(),
        fetchUserRequests(),
        fetchAuditLogs()
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchPendingRequests, fetchUserRequests, fetchAuditLogs]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const requestCancel = useCallback(async (bookingId) => {
    if (!userId) throw new Error('Nicht eingeloggt');

    try {
      const requestId = await createCancelRequest(bookingId, userId);
      await fetchUserRequests();
      return requestId;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [userId, fetchUserRequests]);

  const requestSwap = useCallback(async (fromBookingId, toShiftId, targetUserId = null) => {
    if (!userId) throw new Error('Nicht eingeloggt');

    try {
      const requestId = await createSwapRequest(fromBookingId, toShiftId, userId, targetUserId);
      await fetchUserRequests();
      return requestId;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [userId, fetchUserRequests]);

  const approve = useCallback(async (requestId, adminNote = '') => {
    if (!userId || !isAdmin) throw new Error('Keine Berechtigung');

    try {
      await approveRequest(requestId, userId, adminNote);
      await fetchAll();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [userId, isAdmin, fetchAll]);

  const reject = useCallback(async (requestId, adminNote = '') => {
    if (!userId || !isAdmin) throw new Error('Keine Berechtigung');

    try {
      await rejectRequest(requestId, userId, adminNote);
      await fetchAll();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [userId, isAdmin, fetchAll]);

  return {
    pendingRequests,
    userRequests,
    auditLogs,
    loading,
    error,
    requestCancel,
    requestSwap,
    approve,
    reject,
    refresh: fetchAll
  };
}
