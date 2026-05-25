import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lightning, SignOut, Gear, Plus, Minus, Pulse, Flame, Trophy, ChartBar, UserPlus, Trash, X, DotsSixVertical } from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";
import { api, wsUrl } from "../lib/api";
import UserCard from "../components/UserCard";
import ExerciseIcon from "../components/ExerciseIcon";
import BoostRanking from "../components/BoostRanking";
import Insights from "../components/Insights";
import { toast } from "sonner";

// ✅ NEUE HOOKS IMPORTIEREN
import { useBoardState } from "../hooks/useBoardState";
import { useWebSocket } from "../hooks/useWebSocket";
import { useCelebrationState } from "../hooks/useCelebrationState";

// Globaler Toast-Tweak: Container click-through machen, damit Buttons hinter Nachrichten
// trotzdem klickbar sind. Zusätzlich werden Toasts nach unten verschoben, damit sie nicht
// optisch über die Header-Buttons (insbesondere Logout) ziehen und dadurch beim
// "Durchfahren" mit der Maus deren Hover-Styling (rot) auslösen.
// Wird einmal pro Mount injiziert (id verhindert Dopplungen).
function useToastStyleFix() {
  useEffect(() => {
    const id = "tracker-toast-style-fix";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      [data-sonner-toaster], [data-sonner-toaster] * {
        pointer-events: none !important;
      }
      /* Toaster nicht direkt unter den Header-Buttons platzieren – sonst
         löst das "Durchfahren" der Maus über einem Toast das Hover-Rot
         des Logout-Buttons aus. */
      [data-sonner-toaster][data-y-position="top"] {
        top: 96px !important;
      }
    `;
    document.head.appendChild(style);
  }, []);
}

export default function Dashboard() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  // ✅ VERWENDE DIE NEUEN HOOKS
  const {
    board,
    onlineUserIds,
    flashing,
    fetchBoard,
    updateOnlineUsers,
    flashUser,
  } = useBoardState(user);

  const {
    celebratingUsers,
    pendingCelebration,
    pendingFailing,
    handleCelebrationShown,
    handleFailingShown,
    checkCelebrations,
    triggerCelebration,
  } = useCelebrationState();

  const [logging, setLogging] = useState(false);
  const [logMode, setLogMode] = useState("total");
  const [logForm, setLogForm] = useState({});
  const [logDays, setLogDays] = useState({});
  const [showRanking, setShowRanking] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(null); // exercise key being canceled

  // --- Friends panel ---
  const [showFriendPanel, setShowFriendPanel] = useState(false);
  const [friends, setFriends] = useState([]); // [{user_id, name, handle, picture}]
  const [friendName, setFriendName] = useState("");
  const [friendHandle, setFriendHandle] = useState("");
  const [addingFriend, setAddingFriend] = useState(false);
  const friendNameRef = useRef(null);
  const friendHandleRef = useRef(null);

  // Schließen des Friend-Panels: räumt Name + Hashtag-Eingaben auf
  const closeFriendPanel = () => {
    setShowFriendPanel(false);
    setFriendName("");
    setFriendHandle("");
  };

  // Paste-Handler: erkennt "Name#HASH" und verteilt automatisch auf beide Inputs.
  // Wird sowohl im Name- als auch im Handle-Input verwendet, damit der Nutzer
  // egal wo eingefügt das richtige Verhalten bekommt.
  const handleCombinedPaste = (e) => {
    const text = e.clipboardData?.getData("text");
    if (!text) return;
    if (text.includes("#")) {
      e.preventDefault();
      const idx = text.indexOf("#");
      const namePart = text.slice(0, idx).trim().slice(0, 80);
      const hashPart = text
        .slice(idx + 1)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 5);
      setFriendName(namePart);
      setFriendHandle(hashPart);
      // Fokus auf Handle, falls Hash unvollständig, sonst auf Name
      setTimeout(() => {
        if (hashPart.length < 5) friendHandleRef.current?.focus();
        else friendNameRef.current?.focus();
      }, 0);
    }
  };

  // FIX 2: Android "Vorschlagen" Paste - onChange Handler für Name-Input
  const handleNameChange = (e) => {
    const val = e.target.value;
    setFriendName(val);

    // Prüfe ob # im Namen vorhanden ist (Android paste via suggestions)
    if (val.includes("#")) {
      const idx = val.indexOf("#");
      const namePart = val.slice(0, idx).trim().slice(0, 80);
      const hashPart = val
        .slice(idx + 1)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 5);

      // Verteile auf beide Felder
      setFriendName(namePart);
      setFriendHandle(hashPart);

      // Fokus auf Handle falls unvollständig
      setTimeout(() => {
        if (hashPart.length < 5) friendHandleRef.current?.focus();
        else friendNameRef.current?.focus();
      }, 0);
    }
  };

  // Und für Hashtag-Input:
  const handleHashtagChange = (e) => {
    const val = e.target.value;

    // Wenn vollständiger String mit # eingefügt wurde
    if (val.includes("#")) {
      const idx = val.indexOf("#");
      const beforeHash = val.slice(0, idx).trim();
      const afterHash = val.slice(idx + 1).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);

      // Wenn Text vor dem # existiert, ist es wahrscheinlich "Name#Hash" Format
      if (beforeHash.length > 0) {
        setFriendName(beforeHash.slice(0, 80));
        setFriendHandle(afterHash);
        setTimeout(() => {
          if (afterHash.length < 5) friendHandleRef.current?.focus();
          else friendNameRef.current?.focus();
        }, 0);
        return;
      }
    }

    // Normales Hashtag-Input ohne #
    const cleaned = val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
    setFriendHandle(cleaned);
  };

  const dragSrcRef = useRef(null);
  // Touch-DnD State (mobile): aktiver Drag, Position des Fingers, aktuelles Ziel
  const [touchDrag, setTouchDrag] = useState(null); // { srcIdx, x, y, offsetX, offsetY, w, h }
  const [touchOverIdx, setTouchOverIdx] = useState(null);
  const touchHoldTimerRef = useRef(null);
  const touchStartPosRef = useRef(null);
  useToastStyleFix();

  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [user, loading, navigate]);

  // ✅ Board laden beim Mount
  useEffect(() => {
    if (user) {
      fetchBoard().then((data) => {
        const me = data?.users?.find((u) => u.user_id === user?.user_id);
        if (me) {
          setLogForm({ ...me.values });
          setLogDays(me.days || {});
        }
      });
    }
  }, [user, fetchBoard]);

  // ✅ Check Celebrations nach Board-Load
  useEffect(() => {
    if (board && user) {
      checkCelebrations(board, user);
    }
  }, [board, user, checkCelebrations]);

  // --- Friends API ---
  const fetchFriends = useCallback(async () => {
    try {
      const { data } = await api.get("/friends");
      setFriends(Array.isArray(data?.friends) ? data.friends : []);
    } catch (e) {
      console.error("Failed to fetch friends:", e);
    }
  }, []);

  useEffect(() => {
    if (user) fetchFriends();
  }, [user, fetchFriends]);

  const handleAddFriend = async (e) => {
    e?.preventDefault?.();
    if (addingFriend) return;
    const name = friendName.trim();
    const handle = friendHandle.trim().toUpperCase().replace(/^#/, "");
    if (!name || !handle) {
      toast.error("Name und Hashtag erforderlich", { duration: 2500 });
      return;
    }
    if (handle.length !== 5) {
      toast.error("Hashtag muss 5 Zeichen lang sein", { duration: 2500 });
      return;
    }
    setAddingFriend(true);
    try {
      await api.post("/friends/add", { name, handle });
      toast.success(`${name} zur Crew hinzugefügt`, { duration: 2500 });
      setFriendName("");
      setFriendHandle("");
      await fetchFriends();
      await fetchBoard();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Hinzufügen fehlgeschlagen", { duration: 2500 });
    } finally {
      setAddingFriend(false);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      await api.delete(`/friends/${friendId}`);
      setFriends((p) => p.filter((f) => f.user_id !== friendId));
      fetchBoard();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Entfernen fehlgeschlagen", { duration: 2500 });
    }
  };

  const persistFriendOrder = useCallback(async (order) => {
    try {
      await api.put("/friends/order", { order });
    } catch (err) {
      console.error("Failed to persist friend order:", err);
    }
  }, []);

  const reorderFriends = useCallback((srcIdx, targetIdx) => {
    if (srcIdx == null || targetIdx == null || srcIdx === targetIdx) return;
    setFriends((prev) => {
      if (srcIdx < 0 || srcIdx >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(srcIdx, 1);
      const clampedTarget = Math.max(0, Math.min(targetIdx, next.length));
      next.splice(clampedTarget, 0, moved);
      persistFriendOrder(next.map((f) => f.user_id));
      return next;
    });
  }, [persistFriendOrder]);

  // ----- HTML5 Drag & Drop (Desktop) -----
  const handleDragStart = (idx) => {
    dragSrcRef.current = idx;
  };
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  const handleDrop = (idx) => {
    const src = dragSrcRef.current;
    dragSrcRef.current = null;
    reorderFriends(src, idx);
  };

  // ----- Touch Drag & Drop (Mobile) -----
  const clearHoldTimer = () => {
    if (touchHoldTimerRef.current) {
      clearTimeout(touchHoldTimerRef.current);
      touchHoldTimerRef.current = null;
    }
  };

  const handleTouchStart = (idx) => (e) => {
    const touch = e.touches[0];
    if (!touch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    clearHoldTimer();
    touchHoldTimerRef.current = setTimeout(() => {
      // Haptic feedback (falls verfügbar)
      try {
        if (navigator.vibrate) navigator.vibrate(15);
      } catch (err) {
        console.debug("Vibration not available:", err);
      }
      setTouchDrag({
        srcIdx: idx,
        x: touch.clientX,
        y: touch.clientY,
        offsetX: touch.clientX - rect.left,
        offsetY: touch.clientY - rect.top,
        w: rect.width,
        h: rect.height,
      });
      setTouchOverIdx(idx);
    }, 250);
  };

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    if (!touch) return;

    // Drag noch nicht aktiv: wenn der Finger sich zu weit bewegt -> Long-Press abbrechen
    if (!touchDrag) {
      const start = touchStartPosRef.current;
      if (start) {
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        if (Math.hypot(dx, dy) > 8) clearHoldTimer();
      }
      return;
    }

    // Drag aktiv: Scrollen unterdrücken + Ghost mitbewegen
    e.preventDefault();
    setTouchDrag((d) => (d ? { ...d, x: touch.clientX, y: touch.clientY } : d));

    // Ziel-Tile via elementFromPoint ermitteln
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el) {
      setTouchOverIdx(null);
      return;
    }
    const tile = el.closest("[data-friend-idx]");
    if (!tile) {
      setTouchOverIdx(null);
      return;
    }
    const idx = Number(tile.getAttribute("data-friend-idx"));
    if (Number.isFinite(idx)) setTouchOverIdx(idx);
  };

  const handleTouchEnd = () => {
    clearHoldTimer();
    if (touchDrag) {
      reorderFriends(touchDrag.srcIdx, touchOverIdx);
    }
    setTouchDrag(null);
    setTouchOverIdx(null);
    touchStartPosRef.current = null;
  };

  // Wenn ein Touch-Drag aktiv ist: Page-Scroll global blockieren.
  useEffect(() => {
    if (!touchDrag) return;
    const block = (e) => {
      e.preventDefault();
    };
    document.addEventListener("touchmove", block, { passive: false });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("touchmove", block);
      document.body.style.overflow = prevOverflow;
    };
  }, [touchDrag]);

  // ✅ WebSocket mit Hook
  const handleWebSocketMessage = useCallback((msg) => {
    if (msg.type === "progress_updated" || msg.type === "boost_applied") {
      flashUser(msg.user_id);
      fetchBoard();
    } else if (msg.type === "boost_canceled") {
      if (msg.user_id !== user?.user_id) {
        toast(`${msg.user_name} hat den Boost abgebrochen`, { icon: "✖" });
      }
      fetchBoard();
    } else if (msg.type === "week_completed") {
      if (msg.user_id !== user?.user_id) {
        toast.success(`${msg.user_name} hat Woche ${msg.week_number} geschafft! 🔥 Streak: ${msg.streak}`, { duration: 3000 });
      } else {
        toast.success(`WOCHE GESCHAFFT! Streak ${msg.streak} 🔥`, { duration: 3000 });
      }
      triggerCelebration(msg.user_id);
      fetchBoard();
    } else if (msg.type === "streak_ended") {
      if (msg.user_id !== user?.user_id) {
        toast.error(`${msg.user_name}s Streak (${msg.previous_streak}) ist beendet 💀`, { duration: 3000 });
      } else {
        toast.error(`Deine Streak (${msg.previous_streak}) ist beendet 💀`, { duration: 3000 });
      }
      fetchBoard();
    } else if (msg.type === "goals_updated" || msg.type === "profile_updated") {
      fetchBoard();
      if (msg.type === "profile_updated") fetchFriends();
    } else if (msg.type === "presence_snapshot" || msg.type === "presence_changed") {
      if (Array.isArray(msg.online_user_ids)) {
        updateOnlineUsers(msg.online_user_ids);
      }
    }
  }, [flashUser, fetchBoard, triggerCelebration, updateOnlineUsers, user?.user_id, fetchFriends]);

  useWebSocket({
    user,
    onMessage: handleWebSocketMessage,
    enabled: !!user,
  });

  const me = board?.users.find((u) => u.user_id === user?.user_id);
  const hasBoostedThisWeek = me?.exercises.some((e) => e.boosted_this_week) || false;

  // Sort: own card first, then in friends order (matches the order in the friend panel).
  const sortedUsers = useMemo(() => {
    if (!board) return [];
    const friendOrderIndex = new Map();
    friends.forEach((f, i) => friendOrderIndex.set(f.user_id, i));
    return [...board.users].sort((a, b) => {
      if (a.user_id === user?.user_id) return -1;
      if (b.user_id === user?.user_id) return 1;
      const ai = friendOrderIndex.has(a.user_id) ? friendOrderIndex.get(a.user_id) : 9999;
      const bi = friendOrderIndex.has(b.user_id) ? friendOrderIndex.get(b.user_id) : 9999;
      return ai - bi;
    });
  }, [board, friends, user?.user_id]);

  // Set aller user_ids der eigenen Crew (ich selbst + alle Freunde). Wird ans
  // BoostRanking durchgereicht, damit dort nur Crew-Mitglieder erscheinen
  // (statt aller User der Plattform).
  const crewUserIds = useMemo(
    () => new Set([user?.user_id, ...friends.map((f) => f.user_id)].filter(Boolean)),
    [user?.user_id, friends]
  );

  // Track mobile carousel active index
  const carouselRef = useRef(null);
  const [carouselIdx, setCarouselIdx] = useState(0);
  // Mobile-Viewport-Detection: isActive-Scale soll NUR im Carousel (< lg) greifen.
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 1023px)").matches;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 1023px)");
    const onChange = (e) => setIsMobileViewport(e.matches);
    setIsMobileViewport(mql.matches);
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, []);
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const handler = () => {
      if (el.clientWidth === 0) return;
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      setCarouselIdx(idx);
    };
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, [sortedUsers.length]);

  // Heutiger Wochentag-Index: Mo=0, Di=1, ..., So=6
  const getTodayIdx = () => (new Date().getDay() + 6) % 7;

  const handleLogProgress = async () => {
    if (!me) return;
    try {
      const payload = { week_number: me.week_number };
      if (logMode === "days") {
        payload.days = logDays;
      } else {
        // GESAMT-Modus: Differenz zum bisherigen Stand dem HEUTIGEN Tag zuordnen,
        // damit der Wert im Mo–So Tab am richtigen Wochentag erscheint.
        const todayIdx = getTodayIdx();
        const newDays = { ...logDays };
        // Sicherstellen, dass das heutige Tagesobjekt existiert (auch wenn keine Änderung erfolgt)
        newDays[todayIdx] = { ...(logDays[todayIdx] || {}) };

        me.exercises.forEach((ex) => {
          const newTotal = Number(logForm[ex.key]) || 0;
          const prevSum = [0, 1, 2, 3, 4, 5, 6].reduce(
            (acc, di) => acc + (Number(logDays?.[di]?.[ex.key]) || 0),
            0
          );
          const delta = newTotal - prevSum;
          // Keine Änderung -> Tag nicht anfassen
          if (delta === 0) return;

          let updatedToday;
          if (prevSum === 0) {
            // Legacy / noch keine Tagesaufteilung vorhanden:
            // Den vollen Wert dem heutigen Tag zuschreiben.
            updatedToday = newTotal;
          } else {
            const currentToday = Number(logDays?.[todayIdx]?.[ex.key]) || 0;
            updatedToday = currentToday + delta;
          }
          // Nicht negativ werden lassen + auf 2 Nachkommastellen runden (km etc.)
          updatedToday = Math.max(0, Math.round(updatedToday * 100) / 100);
          newDays[todayIdx] = { ...newDays[todayIdx], [ex.key]: updatedToday };
        });

        payload.days = newDays;
        // Optimistisch State aktualisieren, damit der Mo–So Tab sofort den richtigen Tag zeigt
        setLogDays(newDays);
      }
      await api.put("/progress/me", payload);
      toast.success("Fortschritt gespeichert", { duration: 2500 });
      setLogging(false);
      fetchBoard();
    } catch (e) {
      toast.error("Speichern fehlgeschlagen", { duration: 2500 });
    }
  };

  const setDayValue = (dayIdx, exKey, v) => {
    setLogDays((p) => ({ ...p, [dayIdx]: { ...(p[dayIdx] || {}), [exKey]: Number(v) || 0 } }));
  };

  const syncTotalToDays = () => {
    if (!me) return;
    const todayIdx = getTodayIdx();
    const newDays = { ...logDays };
    newDays[todayIdx] = { ...(logDays[todayIdx] || {}) };
    me.exercises.forEach((ex) => {
      const newTotal = Number(logForm[ex.key]) || 0;
      const prevSum = [0, 1, 2, 3, 4, 5, 6].reduce(
        (acc, di) => acc + (Number(logDays?.[di]?.[ex.key]) || 0),
        0
      );
      const delta = newTotal - prevSum;
      if (delta === 0) return;
      let updatedToday;
      if (prevSum === 0) {
        updatedToday = newTotal;
      } else {
        const currentToday = Number(logDays?.[todayIdx]?.[ex.key]) || 0;
        updatedToday = currentToday + delta;
      }
      updatedToday = Math.max(0, Math.round(updatedToday * 100) / 100);
      newDays[todayIdx] = { ...newDays[todayIdx], [ex.key]: updatedToday };
    });
    setLogDays(newDays);
  };

  const handleBoost = async (exercise_key) => {
    try {
      await api.post("/boost", { exercise_key });
      toast.success("BOOST aktiviert! +25% Steigerung", { icon: "🔥", duration: 2500 });
      fetchBoard();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Boost fehlgeschlagen", { duration: 2500 });
    }
  };

  const handleCancelBoost = async () => {
    try {
      await api.delete("/boost");
      toast.success("Boost abgebrochen", { duration: 2500 });
      setCancelDialog(null);
      fetchBoard();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Abbrechen fehlgeschlagen", { duration: 2500 });
    }
  };

  if (loading || !user || !board) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <p className="text-[#CCFF00] font-anton text-3xl tracking-widest animate-pulse">LOADING...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <header className="border-b border-[#1A1A1A] bg-[#0A0A0A]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between" data-testid="dashboard-header">
          <div className="flex items-center gap-3">
            <Lightning size={26} weight="fill" className="text-[#CCFF00]" />
            <span className="font-anton text-2xl tracking-widest">TRACKER</span>
            <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[#00FF66] ml-4 border border-[#1A2A1A] px-2 py-1">
              <Pulse size={10} weight="fill" /> LIVE
            </span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setShowInsights(true)}
              data-testid="open-insights"
              className="border border-[#222] hover:border-[#CCFF00] hover:text-[#CCFF00] px-3 md:px-4 py-2 text-xs uppercase tracking-widest flex items-center gap-2 transition-colors"
            >
              <ChartBar size={14} weight="duotone" />
              <span className="hidden md:inline">Insights</span>
            </button>
            <button
              onClick={() => setShowRanking(true)}
              data-testid="open-boost-ranking"
              className="border border-[#222] hover:border-[#CCFF00] hover:text-[#CCFF00] px-3 md:px-4 py-2 text-xs uppercase tracking-widest flex items-center gap-2 transition-colors"
            >
              <Trophy size={14} weight="duotone" />
              <span className="hidden md:inline">Boost-Ranking</span>
            </button>
            <button
              onClick={() => navigate("/settings")}
              data-testid="settings-button"
              className="border border-[#222] hover:border-[#CCFF00] hover:text-[#CCFF00] px-3 md:px-4 py-2 text-xs uppercase tracking-widest flex items-center gap-2 transition-colors"
            >
              <Gear size={16} weight="duotone" />
              <span className="hidden md:inline">Settings</span>
            </button>
            <button
              onClick={logout}
              data-testid="logout-button"
              className="border border-[#222] [@media(hover:hover)]:hover:border-[#FF3B30] [@media(hover:hover)]:hover:text-[#FF3B30] px-3 md:px-4 py-2 text-xs uppercase tracking-widest flex items-center gap-2 transition-colors"
            >
              <SignOut size={16} weight="duotone" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <section className="border-b border-[#1A1A1A] tactical-grid">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div className="md:flex-1 md:min-w-0">
            <p className="text-xs uppercase tracking-[0.3em] text-[#CCFF00] mb-3">/ THE CREW DASHBOARD</p>
            <h1 className="font-anton text-5xl md:text-6xl leading-none tracking-tight mb-3">
              WEEK <span className="text-[#CCFF00] text-glow-lime">{String(me?.week_number || 1).padStart(2, "0")}</span> · GET TO WORK
            </h1>
            <p className="text-[#8A8A8A] max-w-xl leading-relaxed">
              Jede Woche bis zu +10% Steigerung. Boost 1 Übung pro Woche für +25% — der höhere Wert läuft permanent weiter.
            </p>
            {hasBoostedThisWeek && (
              <div className="mt-4 inline-flex items-center gap-2 border border-[#FF8800]/40 bg-[#FF8800]/10 text-[#FF8800] px-3 py-1.5 text-[10px] uppercase tracking-widest" data-testid="boost-used-banner">
                <Flame size={12} weight="fill" /> Boost diese Woche bereits eingesetzt
              </div>
            )}
          </div>
          {/* Mobile: grid-cols-3 -> erste 3 in voller Größe in Reihe 1, weitere wrappen darunter.
              PC (md+): flex-row, alle Ziele in einer einzigen Reihe rechts neben dem Text. */}
          <div
            className="grid grid-cols-3 gap-3 md:flex md:flex-row md:flex-nowrap md:gap-3 md:shrink-0"
            data-testid="hero-goals-strip"
          >
            {me?.exercises.map((ex) => (
              <div
                key={ex.key}
                className="border border-[#222] bg-[#121212] p-3 md:p-4 relative md:w-[120px]"
                data-testid={`hero-goal-${ex.key}`}
              >
                <p className="text-[9px] md:text-[10px] uppercase tracking-wider md:tracking-widest text-[#8A8A8A] mb-1 flex items-center gap-1 truncate pr-3 md:pr-0">
                  <ExerciseIcon icon={ex.icon} size={12} /> {ex.name}
                </p>
                <p className="font-anton text-3xl leading-none" style={{ color: ex.color }}>
                  {Math.round(ex.goal * 100) / 100}<span className="text-base text-[#555] ml-1">{ex.unit}</span>
                </p>
                {ex.boosted_this_week && (
                  <Flame size={14} weight="fill" className="absolute top-1 right-1 md:top-2 md:right-2 text-[#FF8800]" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[#1A1A1A] bg-[#0E0E0E]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {!logging ? (
            <button
              onClick={() => setLogging(true)}
              data-testid="open-log-progress"
              className="w-full md:w-auto bg-[#CCFF00] text-black font-bold uppercase tracking-widest py-4 px-8 flex items-center justify-center gap-2 hover:bg-[#D4FF33] glow-lime transition-all hover:-translate-y-0.5"
            >
              <Plus size={18} weight="bold" /> Fortschritt eintragen
            </button>
          ) : (
            <div className="border border-[#CCFF00] bg-[#0A0A0A] p-6 space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="font-anton text-2xl tracking-tight">LOG WEEK {me?.week_number} PROGRESS</h3>
                <div className="flex items-center gap-2">
                  <div className="flex border border-[#222]">
                    <button onClick={() => setLogMode("total")} data-testid="log-mode-total" className={`px-3 py-1.5 text-[10px] uppercase tracking-widest ${logMode === "total" ? "bg-[#CCFF00] text-black" : "text-[#888] hover:text-white"}`}>Gesamt</button>
                    <button onClick={() => { if (logMode === "total") syncTotalToDays(); setLogMode("days"); }} data-testid="log-mode-days" className={`px-3 py-1.5 text-[10px] uppercase tracking-widest ${logMode === "days" ? "bg-[#CCFF00] text-black" : "text-[#888] hover:text-white"}`}>Mo–So</button>
                  </div>
                  <button onClick={() => setLogging(false)} className="text-[#8A8A8A] hover:text-white text-xs uppercase tracking-widest" data-testid="close-log-progress">Abbrechen</button>
                </div>
              </div>
              {logMode === "total" ? (
                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-widest text-[#8A8A8A]" data-testid="gesamt-day-hint">
                    Neue Werte werden dem heutigen Tag (<span className="text-[#CCFF00]">{["Mo","Di","Mi","Do","Fr","Sa","So"][getTodayIdx()]}</span>) zugeordnet.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {me?.exercises.map((ex) => (
                      <NumInput
                        key={ex.key}
                        label={`${ex.name}${ex.unit ? ` (${ex.unit})` : ""}`}
                        value={logForm[ex.key] || 0}
                        step={ex.unit === "km" ? 0.1 : ex.goal > 100 ? 5 : 1}
                        onChange={(v) => setLogForm((f) => ({ ...f, [ex.key]: v }))}
                        testid={`input-${ex.key}`}
                        color={ex.color}
                        icon={ex.icon}
                        goal={ex.goal}
                        unit={ex.unit}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="w-full" data-testid="days-grid">
                  <table className="w-full text-xs md:text-sm border-collapse table-fixed">
                    <colgroup>
                      <col className="w-[28px] md:w-[110px]" />
                      <col className="w-auto" />
                      <col className="w-auto" />
                      <col className="w-auto" />
                      <col className="w-auto" />
                      <col className="w-auto" />
                      <col className="w-auto" />
                      <col className="w-auto" />
                      <col className="w-[56px] md:w-[120px]" />
                    </colgroup>
                    <thead>
                      <tr className="text-[9px] md:text-[10px] uppercase tracking-wider md:tracking-widest text-[#555]">
                        <th className="text-left py-2 pr-1 md:pr-3">
                          <span className="hidden md:inline">Übung</span>
                        </th>
                        {["Mo","Di","Mi","Do","Fr","Sa","So"].map((d, i) => (
                          <th key={i} className="px-0.5 md:px-2 text-center" data-testid={`day-header-${i}`}>{d}</th>
                        ))}
                        <th className="pl-1 md:px-2 text-right">Σ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {me?.exercises.map((ex) => {
                        const sum = [0,1,2,3,4,5,6].reduce((acc, di) => acc + (Number(logDays?.[di]?.[ex.key]) || 0), 0);
                        const formattedSum = sum.toLocaleString('de-DE', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2
                        });
                        const formattedGoal = ex.goal.toLocaleString('de-DE', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2
                        });

                        return (
                          <tr key={ex.key} className="border-t border-[#1A1A1A]">
                            <td className="py-2 pr-1 md:pr-3 align-middle">
                              <div className="flex items-center gap-1 md:gap-2" style={{ color: ex.color }}>
                                <ExerciseIcon icon={ex.icon} size={14} className="shrink-0" />
                                <span className="hidden md:inline text-[10px] uppercase tracking-wider leading-tight whitespace-nowrap">
                                  {ex.name}{ex.unit ? ` (${ex.unit})` : ""}
                                </span>
                              </div>
                            </td>
                            {[0,1,2,3,4,5,6].map((di) => {
                              const cellValue = logDays?.[di]?.[ex.key] ?? "";
                              const displayValue = Number(cellValue) === 0 ? "" : cellValue;

                              return (
                                <td key={di} className="px-0.5 md:px-2 py-1">
                                  <input
                                    type="number"
                                    step={ex.unit === "km" ? 0.1 : 1}
                                    value={displayValue}
                                    placeholder="0"
                                    onChange={(e) => setDayValue(di, ex.key, e.target.value)}
                                    style={{ fontSize: 'clamp(10px, 2.6vw, 16px)' }}
                                    className="w-full bg-[#0A0A0A] border border-[#222] focus:border-[#CCFF00] outline-none text-center text-white py-1.5 px-0.5 font-anton placeholder:text-[#555]"
                                  />
                                </td>
                              );
                            })}
                            <td className="pl-1 md:px-2 text-right font-anton align-middle" style={{ color: ex.color }} data-testid={`sum-${ex.key}`}>
                              <div className="flex flex-col leading-tight items-end">
                                <span className="text-sm md:text-base">{formattedSum}</span>
                                <span className="text-[8px] md:text-[9px] text-[#555] whitespace-nowrap">/ {formattedGoal}{ex.unit ? ` ${ex.unit}` : ""}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <button
                onClick={handleLogProgress}
                data-testid="save-progress-button"
                className="w-full bg-[#CCFF00] text-black font-bold uppercase tracking-widest py-4 hover:bg-[#D4FF33] glow-lime transition-all"
              >
                Speichern & Crew benachrichtigen
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <h2 className="font-anton text-3xl tracking-tight">THE CREW</h2>
            <button
              type="button"
              onClick={() => {
                if (showFriendPanel) closeFriendPanel();
                else setShowFriendPanel(true);
              }}
              data-testid="toggle-friend-panel"
              title="Freunde hinzufügen / verwalten"
              aria-label="Freunde hinzufügen"
              aria-expanded={showFriendPanel}
              className={`w-9 h-9 border flex items-center justify-center transition-colors ${showFriendPanel ? "border-[#CCFF00] text-black bg-[#CCFF00]" : "border-[#222] text-[#CCFF00] hover:border-[#CCFF00] hover:bg-[#CCFF00]/10"}`}
            >
              <UserPlus size={18} weight="bold" />
            </button>
          </div>
          <span className="text-xs uppercase tracking-widest text-[#8A8A8A]" data-testid="crew-count">{board.users.length} ATHLETES</span>
        </div>

        <AnimatePresence initial={false}>
          {showFriendPanel && (
            <motion.div
              key="friend-panel"
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 32 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: "hidden" }}
              data-testid="friend-panel-wrapper"
            >
              <div
                className="border border-[#CCFF00] bg-[#0A0A0A] p-5 md:p-6 space-y-5"
                data-testid="friend-panel"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-[#CCFF00]">/ FRIENDS</p>
                    <h3 className="font-anton text-2xl tracking-tight mt-1">CREW VERWALTEN</h3>
                  </div>
                  <button
                    onClick={closeFriendPanel}
                    data-testid="close-friend-panel"
                    className="text-[#8A8A8A] hover:text-white text-xs uppercase tracking-widest flex items-center gap-1"
                  >
                    <X size={14} /> Schließen
                  </button>
                </div>

                {/* Add friend form */}
                <form
                  onSubmit={handleAddFriend}
                  data-testid="friend-add-form"
                  className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-3 items-stretch"
                >
                  <div
                    className="flex items-center bg-[#121212] border border-[#222] focus-within:border-[#CCFF00] px-3 transition-colors cursor-text"
                    onClick={(e) => {
                      if (e.target === e.currentTarget) friendNameRef.current?.focus();
                    }}
                    data-testid="friend-add-combined"
                  >
                    <input
                      ref={friendNameRef}
                      type="text"
                      value={friendName}
                      onChange={handleNameChange}
                      onPaste={handleCombinedPaste}
                      placeholder="Name"
                      maxLength={80}
                      data-testid="friend-add-name"
                      className="bg-transparent outline-none text-white py-3 font-anton text-lg placeholder:text-[#555] min-w-0"
                    />
                    <span className="ml-3 md:ml-0 font-anton text-lg text-[#CCFF00] select-none">#</span>
                    <input
                      ref={friendHandleRef}
                      type="text"
                      value={friendHandle}
                      onChange={handleHashtagChange}
                      onPaste={handleCombinedPaste}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && friendHandle.length === 0) {
                          e.preventDefault();
                          friendNameRef.current?.focus();
                        }
                      }}
                      placeholder="ABC23"
                      maxLength={5}
                      data-testid="friend-add-handle"
                      className="bg-transparent outline-none text-white py-3 pl-1 md:pl-2 font-anton text-lg tracking-[0.3em] w-[7ch] placeholder:text-[#555]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={addingFriend}
                    data-testid="friend-add-submit"
                    className="bg-[#CCFF00] text-black font-bold uppercase tracking-widest px-5 py-3 flex items-center justify-center gap-2 hover:bg-[#D4FF33] transition-all disabled:opacity-60"
                  >
                    <Plus size={16} weight="bold" /> {addingFriend ? "..." : "Add"}
                  </button>
                </form>

                {/* Friend list */}
                {friends.length === 0 ? (
                  <div className="border border-dashed border-[#222] py-8 text-center text-[#555] uppercase tracking-widest text-xs" data-testid="friend-list-empty">
                    Noch keine Freunde · Füge jemanden über Name + Hashtag hinzu
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3" data-testid="friend-list">
                    {friends.map((f, idx) => (
                      <div
                        key={f.user_id}
                        data-friend-idx={idx}
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(idx)}
                        onTouchStart={handleTouchStart(idx)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onTouchCancel={handleTouchEnd}
                        draggable
                        className="group relative w-[160px] border border-[#222] hover:border-[#CCFF00] bg-[#121212] transition-colors p-3 select-none"
                      >
                        <button
                          type="button"
                          onClick={() => handleRemoveFriend(f.user_id)}
                          data-testid={`friend-remove-${f.user_id}`}
                          className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center text-[#555] hover:text-[#FF3B30] transition-colors z-10"
                        >
                          <Trash size={13} weight="bold" />
                        </button>
                        <div className="pt-5 pb-1 px-1 text-center">
                          <p className="font-anton text-sm leading-tight break-words">
                            <span className="text-white">{f.name}</span>
                            <span className="text-[#CCFF00] ml-1 whitespace-nowrap">#{f.handle || "—"}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {board.users.length === 0 ? (
          <div className="border border-dashed border-[#222] p-12 text-center text-[#555] uppercase tracking-widest text-sm">
            Noch keine Crew-Mitglieder
          </div>
        ) : (
          <>
            {/* Mobile portrait: horizontal swipe carousel (< md). Desktop: grid */}
            <div
              ref={carouselRef}
              className="flex lg:grid lg:grid-cols-2 xl:grid-cols-3 gap-12 lg:gap-5 overflow-x-auto lg:overflow-visible snap-x-mandatory lg:[scroll-snap-type:none] -mx-6 px-6 lg:mx-0 lg:px-0 pt-8 pb-8 lg:pt-4 lg:pb-4 scrollbar-hide"
              data-testid="crew-list"
            >
              {sortedUsers.map((u, idx) => (
                <div
                  key={u.user_id}
                  className="flex-none w-[85vw] lg:w-auto snap-item lg:[scroll-snap-align:none]"
                >
                  <UserCard
                    entry={u}
                    isMe={u.user_id === user.user_id}
                    flash={!!flashing[u.user_id]}
                    canBoost={true}
                    onBoost={handleBoost}
                    onCancelBoost={(exKey) => setCancelDialog(exKey)}
                    hasBoostedThisWeek={hasBoostedThisWeek}
                    celebrating={!!celebratingUsers[u.user_id]}
                    pendingCelebration={!!pendingCelebration[u.user_id]}
                    pendingFailing={!!pendingFailing[u.user_id]}
                    onCelebrationShown={handleCelebrationShown}
                    onFailingShown={handleFailingShown}
                    isOnline={onlineUserIds.has(u.user_id) || u.is_online}
                    isActive={isMobileViewport && idx === carouselIdx}
                  />
                </div>
              ))}
            </div>
            {/* Page dots indicator (mobile only) */}
            {sortedUsers.length > 1 && (
              <div className="lg:hidden flex justify-center gap-1.5 mt-4" data-testid="carousel-dots">
                {sortedUsers.map((u, idx) => (
                  <div
                    key={u.user_id}
                    className={`h-1 transition-all ${idx === carouselIdx ? "w-8 bg-[#CCFF00]" : "w-2 bg-[#333]"}`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <BoostRanking
        open={showRanking}
        onClose={() => setShowRanking(false)}
        allowedUserIds={crewUserIds}
      />
      <Insights open={showInsights} onClose={() => setShowInsights(false)} />

      {/* Cancel Boost Confirmation Dialog */}
      {cancelDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setCancelDialog(null)}
          data-testid="cancel-boost-overlay"
        >
          <div
            className="bg-[#121212] border border-[#FF8800] max-w-sm w-full p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
            data-testid="cancel-boost-dialog"
          >
            <div className="flex items-center gap-3">
              <Flame size={28} weight="fill" className="text-[#FF8800]" />
              <h3 className="font-anton text-2xl tracking-tight">BOOST ABBRECHEN?</h3>
            </div>
            <p className="text-sm text-[#8A8A8A] leading-relaxed">
              Dein +25% Boost für diese Woche wird entferzt. Die Crew wird darüber informiert.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelDialog(null)}
                data-testid="cancel-boost-no"
                className="flex-1 border border-[#222] hover:border-[#444] py-3 px-4 text-xs uppercase tracking-widest transition-colors"
              >
                Nein, behalten
              </button>
              <button
                onClick={handleCancelBoost}
                data-testid="cancel-boost-yes"
                className="flex-1 bg-[#FF3B30] hover:bg-[#FF5040] text-white font-bold uppercase tracking-widest py-3 px-4 transition-all"
              >
                Ja, abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-[#1A1A1A] py-8 text-center text-[10px] uppercase tracking-[0.3em] text-[#444]">
        TRACKER · WEEKLY +10% · BOOST +25% · STAY DANGEROUS
      </footer>
    </div>
  );
}

function NumInput({ label, value, onChange, step, testid, color, icon, goal, unit }) {
  // Round to step precision to avoid floating-point drift (e.g. 0.1+0.1+0.1=0.30000000000000004)
  const decimals = step < 1 ? 2 : 0;
  const round = (n) => Number(Number(n).toFixed(decimals));
  const dec = () => onChange(Math.max(0, round(Number(value) - step)));
  const inc = () => onChange(round(Number(value) + step));
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color }}>
        {icon && <ExerciseIcon icon={icon} size={12} />} {label}
      </label>
      <div className="flex items-stretch border border-[#222]">
        <button type="button" onClick={dec} className="px-3 bg-[#121212] hover:bg-[#1A1A1A] border-r border-[#222]" data-testid={`${testid}-dec`}>
          <Minus size={16} />
        </button>
        <input
          type="number"
          value={Number(value) === 0 ? "" : value}
          step={step}
          placeholder="0"
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          className="flex-1 bg-[#0A0A0A] text-white font-anton text-2xl text-center focus:outline-none focus:bg-[#121212] px-2 py-2 w-full min-w-0 placeholder:text-[#555] placeholder:font-anton"
          data-testid={testid}
        />
        <button type="button" onClick={inc} className="px-3 bg-[#121212] hover:bg-[#1A1A1A] border-l border-[#222]" data-testid={`${testid}-inc`}>
          <Plus size={16} />
        </button>
      </div>
      <p className="text-[10px] text-[#444] mt-1 uppercase tracking-widest">Goal: {Math.round(goal * 100) / 100}{unit ? ` ${unit}` : ""}</p>
    </div>
  );
}