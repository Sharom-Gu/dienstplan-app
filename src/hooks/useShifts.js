import { useState, useEffect, useCallback } from 'react';
import { startOfWeek, addWeeks } from 'date-fns';
import {
  getShiftsForWeek,
  createShift,
  updateShift,
  deleteShift,
  generateWeekShifts,
  generateMultipleWeeksShifts,
  deleteAllShifts
} from '../services/shiftService';

export function useShifts(initialDate = new Date()) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(initialDate, { weekStartsOn: 1 })
  );
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getShiftsForWeek(currentWeekStart);
      setShifts(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching shifts:', err);
    } finally {
      setLoading(false);
    }
  }, [currentWeekStart]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const goToNextWeek = useCallback(() => {
    setCurrentWeekStart(prev => addWeeks(prev, 1));
  }, []);

  const goToPrevWeek = useCallback(() => {
    setCurrentWeekStart(prev => addWeeks(prev, -1));
  }, []);

  const goToCurrentWeek = useCallback(() => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  }, []);

  const addShift = useCallback(async (shiftData, createdBy) => {
    try {
      await createShift(shiftData, createdBy);
      await fetchShifts();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchShifts]);

  const editShift = useCallback(async (shiftId, updates) => {
    try {
      await updateShift(shiftId, updates);
      await fetchShifts();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchShifts]);

  const removeShift = useCallback(async (shiftId) => {
    try {
      await deleteShift(shiftId);
      await fetchShifts();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchShifts]);

  const generateWeek = useCallback(async (createdBy, shiftTypes) => {
    try {
      await generateWeekShifts(currentWeekStart, createdBy, shiftTypes);
      await fetchShifts();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [currentWeekStart, fetchShifts]);

  const generateMultipleWeeks = useCallback(async (numberOfWeeks, createdBy, shiftTypes) => {
    try {
      const result = await generateMultipleWeeksShifts(new Date(), numberOfWeeks, createdBy, shiftTypes);
      await fetchShifts();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchShifts]);

  const clearAllShifts = useCallback(async () => {
    try {
      const count = await deleteAllShifts();
      await fetchShifts();
      return count;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchShifts]);

  return {
    shifts,
    loading,
    error,
    currentWeekStart,
    goToNextWeek,
    goToPrevWeek,
    goToCurrentWeek,
    addShift,
    editShift,
    removeShift,
    generateWeek,
    generateMultipleWeeks,
    clearAllShifts,
    refresh: fetchShifts
  };
}
