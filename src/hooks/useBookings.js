import { useState, useEffect, useCallback } from 'react';
import {
  getBookingsForWeek,
  getBookingsForUser,
  bookShift,
  getBooking
} from '../services/bookingService';
import { createAuditLog } from '../services/requestService';

export function useBookings(shifts = [], userId = null) {
  const [bookings, setBookings] = useState([]);
  const [userBookings, setUserBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBookings = useCallback(async () => {
    if (shifts.length === 0) {
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const shiftIds = shifts.map(s => s.id);
      const data = await getBookingsForWeek(shiftIds);
      setBookings(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  }, [shifts]);

  const fetchUserBookings = useCallback(async () => {
    if (!userId) {
      setUserBookings([]);
      return;
    }

    try {
      const data = await getBookingsForUser(userId);
      setUserBookings(data);
    } catch (err) {
      console.error('Error fetching user bookings:', err);
    }
  }, [userId]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    fetchUserBookings();
  }, [fetchUserBookings]);

  const book = useCallback(async (shiftId, userName) => {
    if (!userId) throw new Error('Nicht eingeloggt');

    try {
      const bookingId = await bookShift(shiftId, userId, userName);
      await createAuditLog(userId, 'shift_booked', { shiftId, bookingId });
      await fetchBookings();
      await fetchUserBookings();
      return bookingId;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [userId, fetchBookings, fetchUserBookings]);

  const getBookingsForShiftId = useCallback((shiftId) => {
    return bookings.filter(b => b.shiftId === shiftId && b.status === 'active');
  }, [bookings]);

  const getUserBookingForShift = useCallback((shiftId) => {
    return bookings.find(b => b.shiftId === shiftId && b.userId === userId);
  }, [bookings, userId]);

  const refresh = useCallback(async () => {
    await fetchBookings();
    await fetchUserBookings();
  }, [fetchBookings, fetchUserBookings]);

  return {
    bookings,
    userBookings,
    loading,
    error,
    book,
    getBookingsForShiftId,
    getUserBookingForShift,
    refresh
  };
}
