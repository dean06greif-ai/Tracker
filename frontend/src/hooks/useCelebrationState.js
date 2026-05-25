import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Custom Hook für Celebration/Failing Animation Management
 * FIX: Dependencies korrigiert, verhindert Infinite Loops
 */

// In-memory Set für bereits gezeigte Week Failed Notifications
const shownFailedWeeks = new Set();

export function useCelebrationState() {
  const [celebratingUsers, setCelebratingUsers] = useState({});
  const [pendingCelebration, setPendingCelebration] = useState({});
  const [pendingFailing, setPendingFailing] = useState({});
  const initialScanRef = useRef(false);
  const celebratedThisSession = useRef(new Set());

  const handleCelebrationShown = useCallback((uid) => {
    setPendingCelebration((prev) => {
      const next = { ...prev };
      delete next[uid];
      return next;
    });
  }, []);

  const handleFailingShown = useCallback((uid) => {
    setPendingFailing((prev) => {
      const next = { ...prev };
      delete next[uid];
      return next;
    });
  }, []);

  // FIX: Stability - helpers als refs statt dependencies
  const checkWeekCompleted = useCallback((exercises, values) => {
    if (!exercises || exercises.length === 0) return false;

    return exercises.every((ex) => {
      const goal = Number(ex.goal) || 0;
      const val = Number(values[ex.key]) || 0;
      return goal > 0 && val + 1e-9 >= goal;
    });
  }, []);

  const checkWeekFailed = useCallback((exercises, weekNumber) => {
    if (weekNumber <= 1) return false;

    const prevWeek = weekNumber - 1;
    return exercises.some((ex) =>
      Array.isArray(ex.missed_weeks) && ex.missed_weeks.includes(prevWeek)
    );
  }, []);

  const checkCelebrations = useCallback((board, user) => {
    if (!board || !user || initialScanRef.current) return;
    initialScanRef.current = true;

    const newCelebrating = {};
    const newFailing = {};

    for (const u of board.users) {
      const wk = u.week_number || 1;
      const exercises = u.exercises || [];
      const values = u.values || {};

      // WEEK DONE Check
      const isCompleted = checkWeekCompleted(exercises, values);
      const doneKey = `${u.user_id}_${wk}`;

      if (isCompleted && !celebratedThisSession.current.has(doneKey)) {
        newCelebrating[u.user_id] = true;
        celebratedThisSession.current.add(doneKey);
      }

      // WEEK FAILED Check
      const hasFailed = checkWeekFailed(exercises, wk);
      const failKey = `${u.user_id}_${wk - 1}`;

      if (hasFailed && !shownFailedWeeks.has(failKey)) {
        newFailing[u.user_id] = true;
        shownFailedWeeks.add(failKey);
      }
    }

    if (Object.keys(newCelebrating).length > 0) {
      setPendingCelebration((prev) => ({ ...prev, ...newCelebrating }));
    }
    if (Object.keys(newFailing).length > 0) {
      setPendingFailing((prev) => ({ ...prev, ...newFailing }));
    }
  }, [checkWeekCompleted, checkWeekFailed]);

  const triggerCelebration = useCallback((userId, duration = 2500) => {
    setCelebratingUsers((prev) => ({ ...prev, [userId]: Date.now() }));

    const timer = setTimeout(() => {
      setCelebratingUsers((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const resetInitialScan = useCallback(() => {
    initialScanRef.current = false;
  }, []);

  return {
    celebratingUsers,
    pendingCelebration,
    pendingFailing,
    handleCelebrationShown,
    handleFailingShown,
    checkCelebrations,
    triggerCelebration,
    resetInitialScan,
  };
}