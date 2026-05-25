import { useState, useCallback } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";

/**
 * Custom Hook für Board State Management
 * Extrahiert aus Dashboard.jsx um Complexity zu reduzieren
 */

// Cache außerhalb des Hooks für Persistence über Navigation
let boardCache = null;

export function useBoardState(user) {
  const [board, setBoard] = useState(() => boardCache);
  const [onlineUserIds, setOnlineUserIds] = useState(() => new Set());
  const [flashing, setFlashing] = useState({});

  const fetchBoard = useCallback(async () => {
    if (!user?.user_id) return;

    try {
      const { data } = await api.get(`/board`);
      setBoard(data);
      boardCache = data;

      if (Array.isArray(data?.online_user_ids)) {
        setOnlineUserIds(new Set(data.online_user_ids));
      }

      return data;
    } catch (error) {
      console.error("Failed to fetch board:", error);
      toast.error("Board konnte nicht geladen werden", { duration: 2500 });
      throw error;
    }
  }, [user?.user_id]);

  const updateOnlineUsers = useCallback((userIds) => {
    if (Array.isArray(userIds)) {
      setOnlineUserIds(new Set(userIds));
    }
  }, []);

  const flashUser = useCallback((userId, duration = 2500) => {
    setFlashing((prev) => ({ ...prev, [userId]: Date.now() }));
    setTimeout(() => {
      setFlashing((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }, duration);
  }, []);

  return {
    board,
    setBoard,
    onlineUserIds,
    flashing,
    fetchBoard,
    updateOnlineUsers,
    flashUser,
  };
}