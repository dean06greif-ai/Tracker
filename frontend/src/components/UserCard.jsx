import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Fire } from "@phosphor-icons/react";
import ExerciseIcon from "./ExerciseIcon";
import infoIconUrl from "../assets/info-icon.png";
import {
  playWeekDoneSound,
  playWeekFailedSound,
  shouldPlayWeekFailedSound,
  markWeekFailedSoundPlayed,
} from "../utils/soundEffects";

function Bar({ value, goal, color, boosted }) {
  const pct = Math.min(100, goal > 0 ? (value / goal) * 100 : 0);
  return (
    <div className="h-2 bg-[#1A1A1A] w-full overflow-hidden border border-[#222] relative">
      <motion.div
        className="h-full"
        style={{ background: color, boxShadow: `0 0 10px ${color}80` }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      {boosted && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "repeating-linear-gradient(45deg, transparent 0 6px, rgba(255,136,0,0.12) 6px 12px)"
        }} />
      )}
    </div>
  );
}

function MetricRow({ exercise, value, canBoost, onBoost, onCancelBoost, isMe }) {
  const goal = exercise.goal;
  const pct = goal > 0 ? Math.round((value / goal) * 100) : 0;
  const done = pct >= 100;
  const boosted = exercise.boosted_this_week;
  const unit = exercise.unit ? ` ${exercise.unit}` : "";
  return (
    <div className={`space-y-2 ${boosted ? "px-3 -mx-3 py-2 -my-2 border border-[#FF8800]/30 bg-[#FF8800]/[0.04]" : ""}`} data-testid={`metric-${exercise.key}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <ExerciseIcon icon={exercise.icon} size={16} className="shrink-0" />
          <span className="text-xs uppercase tracking-[0.2em] text-[#8A8A8A] truncate" style={{ color: boosted ? "#FF8800" : undefined }}>
            {exercise.name}
          </span>
          {boosted && (
            isMe ? (
              <button
                onClick={() => onCancelBoost(exercise.key)}
                data-testid={`boost-cancel-${exercise.key}`}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#FF8800] text-black text-[9px] font-bold tracking-widest uppercase hover:bg-[#FFA033] transition-colors"
                title="Boost abbrechen"
              >
                <Flame size={10} weight="fill" /> BOOST
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#FF8800] text-black text-[9px] font-bold tracking-widest uppercase" data-testid={`boosted-badge-${exercise.key}`}>
                <Flame size={10} weight="fill" /> BOOST
              </span>
            )
          )}
        </div>
        <div className={`text-xs tracking-widest font-bold ${done ? "text-[#00FF66]" : "text-white"}`}>
          {pct}%{done && " ✓"}
        </div>
      </div>
      <Bar value={value} goal={goal} color={exercise.color} boosted={boosted} />
      <div className="flex items-baseline justify-between font-anton">
        <span className="text-3xl text-white">{Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}{unit}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#555] tracking-wider">/ {Math.round(goal * 100) / 100}{unit}</span>
          {canBoost && (
            <button
              onClick={() => onBoost(exercise.key)}
              data-testid={`boost-button-${exercise.key}`}
              className="ml-2 inline-flex items-center gap-1 px-2 py-1 border border-[#FF8800]/60 text-[#FF8800] hover:bg-[#FF8800] hover:text-black transition-colors text-[10px] uppercase tracking-widest"
              title="Diese Woche +25% statt +10% (1× pro Woche)"
            >
              <Flame size={11} weight="fill" /> Boost
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UserCard({ entry, isMe, flash, canBoost, onBoost, onCancelBoost, hasBoostedThisWeek, celebrating, failing, pendingCelebration, pendingFailing, onCelebrationShown, onFailingShown, isOnline, isActive }) {
  const { name, picture, week_number, exercises, values, updated_at, email, streak, all_time } = entry;
  const curStreak = streak?.current || 0;
  const [showInfo, setShowInfo] = useState(false);
  const infoWrapRef = useRef(null);
  const cardRef = useRef(null);

  const [showDone, setShowDone] = useState(false);
  const [showFail, setShowFail] = useState(false);
  const doneShownRef = useRef(false);
  const failShownRef = useRef(false);

  const soundPlayedFailRef = useRef(false);

  // IntersectionObserver: nur noch für die VISUELLE Animation zuständig
  useEffect(() => {
    if (!pendingCelebration && !pendingFailing) return;
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e || !e.isIntersecting) return;
        if (pendingCelebration && !doneShownRef.current) {
          doneShownRef.current = true;
          setShowDone(true);
          setTimeout(() => {
            setShowDone(false);
            onCelebrationShown && onCelebrationShown(entry.user_id);
          }, 2500);
        }
        if (pendingFailing && !failShownRef.current) {
          failShownRef.current = true;
          setShowFail(true);
          setTimeout(() => {
            setShowFail(false);
            onFailingShown && onFailingShown(entry.user_id);
          }, 2500);
        }
      },
      { threshold: 0.35 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [pendingCelebration, pendingFailing, entry.user_id, onCelebrationShown, onFailingShown]);

  const isCelebrating = celebrating || showDone;
  const isFailing = (failing || showFail) && !isCelebrating;

  useEffect(() => {
    if (!showInfo) return;
    const handler = (e) => {
      if (infoWrapRef.current && !infoWrapRef.current.contains(e.target)) {
        setShowInfo(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [showInfo]);

  // 🎵 STREAK SOUNDS – Done bei Anstieg, Failed bei Drop.
  // streakInitedRef verhindert, dass ein Sound auf dem ersten Render
  // feuert (AudioContext ist dann meist noch suspended, weil noch
  // keine User-Geste passiert ist). So funktioniert der Failed-Sound
  // jetzt genauso zuverlässig wie der Done-Sound.
  const [displayStreak, setDisplayStreak] = useState(curStreak);
  const [glowing, setGlowing] = useState(false);
  const prevStreakRef = useRef(curStreak);
  const streakInitedRef = useRef(false);

  useEffect(() => {
    const prev = prevStreakRef.current;

    if (curStreak > prev) {
      if (isMe && streakInitedRef.current) {
        playWeekDoneSound();
      }

      setGlowing(true);
      let n = prev;
      const interval = setInterval(() => {
        n += 1;
        setDisplayStreak(n);
        if (n >= curStreak) {
          clearInterval(interval);
          setTimeout(() => setGlowing(false), 1500);
        }
      }, 450);
      prevStreakRef.current = curStreak;
      streakInitedRef.current = true;
      return () => clearInterval(interval);
    }

    // 💀 STREAK-DOWN SOUND (Week Failed) – feuert beim echten Streak-Drop.
    if (curStreak < prev && prev > 0) {
      if (isMe && streakInitedRef.current && !soundPlayedFailRef.current) {
        if (shouldPlayWeekFailedSound(entry.user_id, week_number)) {
          playWeekFailedSound();
          markWeekFailedSoundPlayed(entry.user_id, week_number);
          soundPlayedFailRef.current = true;
        }
      }
    }

    setDisplayStreak(curStreak);
    prevStreakRef.current = curStreak;
    streakInitedRef.current = true;
  }, [curStreak, isMe, entry.user_id, week_number]);

  const baseBorder = isMe ? "border-[#CCFF00]" : "border-[#222]";
  const overlayBorder = isCelebrating
    ? "border-2 border-[#FFD600] shadow-[inset_0_0_0_2px_rgba(255,214,0,0.4)]"
    : isFailing
    ? "border-2 border-[#FF3B30] shadow-[inset_0_0_0_2px_rgba(255,59,48,0.35)]"
    : "";
  const borderClass = overlayBorder || `border ${baseBorder}`;

  return (
    <motion.div
      layout
      ref={cardRef}
      animate={{ scale: isActive ? 1.03 : 1, y: 0, zIndex: isActive ? 5 : 1 }}
      whileHover={{ y: -6, scale: isActive ? 1.04 : 1.015, zIndex: 30 }}
      transition={{
        layout: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
        scale: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
        y: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
        default: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
      }}
      style={{ willChange: "transform", isolation: "isolate" }}
      className={`relative ${borderClass} bg-[#121212] p-6 md:p-7 flex flex-col gap-6 ${flash ? "flash-update" : ""}`}
      data-testid={`user-card-${entry.user_id}`}
    >
      {isMe && (
        <div className="absolute top-2 left-2 md:-top-2 md:-left-2 bg-[#CCFF00] text-black text-[10px] font-bold tracking-widest uppercase px-2 py-1 z-10">YOU</div>
      )}

      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          {picture ? (
            <img src={picture} alt={name} className="w-12 h-12 object-cover border border-[#333]" />
          ) : (
            <div className="w-12 h-12 bg-[#1A1A1A] border border-[#333] flex items-center justify-center font-anton text-xl">
              {name?.[0]?.toUpperCase() || "?"}
            </div>
          )}
          <span
            data-testid={`presence-${entry.user_id}`}
            title={isOnline ? "Online" : "Offline"}
            aria-label={isOnline ? "Online" : "Offline"}
            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#121212] transition-colors ${
              isOnline
                ? "bg-[#22FF77] shadow-[0_0_4px_rgba(34,255,119,0.35)]"
                : "bg-[#FF3B30] shadow-[0_0_3px_rgba(255,59,48,0.25)]"
            }`}
          />
        </div>
        <div className="flex-1 min-w-0 self-center">
          <h3 className="font-anton text-2xl leading-none truncate">{name}</h3>
          <p className="text-xs text-[#555] truncate mt-1">{email}</p>
        </div>

        <div className="text-right shrink-0">
          <p className="text-[10px] uppercase tracking-widest text-[#555]">Week</p>
          <p className="font-anton text-3xl text-[#CCFF00] leading-none">{String(week_number).padStart(2, "0")}</p>
        </div>
      </div>

      <div ref={infoWrapRef} className="absolute top-1.5 right-1.5 z-20" data-testid={`user-info-wrap-${entry.user_id}`}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowInfo((v) => !v); }}
          data-testid={`user-info-button-${entry.user_id}`}
          title="Steigerungen"
          aria-label="Steigerungen"
          aria-expanded={showInfo}
          className={`group w-5 h-5 border bg-transparent flex items-center justify-center transition-all ${
            showInfo
              ? "border-[#555] bg-[#1A1A1A]"
              : "border-[#333] hover:border-[#555] hover:bg-[#0A0A0A]"
          }`}
        >
          <img
            src={infoIconUrl}
            alt="Info"
            aria-hidden="true"
            draggable={false}
            className={`w-5 h-4 object-contain pointer-events-none transition-all ${
              showInfo ? "opacity-70 brightness-90" : "opacity-50 group-hover:opacity-70"
            }`}
          />
        </button>

        <AnimatePresence>
          {showInfo && (
            <motion.div
              key="info-popup"
              initial={{ opacity: 0, y: -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute top-full right-0 mt-2 min-w-[180px] max-w-[240px] border border-[#444] bg-[#0A0A0A] shadow-[0_8px_24px_rgba(0,0,0,0.6)] z-30"
              data-testid={`user-info-popup-${entry.user_id}`}
            >
              <div className="absolute -top-1.5 right-2 w-2.5 h-2.5 bg-[#0A0A0A] border-l border-t border-[#444] rotate-45" />
              <ul className="relative divide-y divide-[#1A1A1A]" data-testid={`user-info-list-${entry.user_id}`}>
                {exercises.map((ex) => (
                  <li
                    key={ex.key}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                    data-testid={`user-info-row-${entry.user_id}-${ex.key}`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <ExerciseIcon icon={ex.icon} size={12} className="shrink-0" />
                      <span className="font-anton text-sm truncate" style={{ color: ex.color }}>{ex.name}</span>
                    </span>
                    <span className="font-anton tabular-nums text-sm whitespace-nowrap" style={{ color: ex.color }}>
                      +{Number.isFinite(Number(ex.progression_pct)) ? ex.progression_pct : 10}%
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3 -mt-2" data-testid={`streak-row-${entry.user_id}`}>
        <div className={`flex items-center gap-1.5 px-2 py-1 border transition-colors ${displayStreak > 0 ? "border-[#FF5722]/70 text-[#FF5722] bg-[#FF5722]/[0.06]" : "border-[#222] text-[#555]"}`}>
          <Fire size={14} weight={displayStreak > 0 ? "fill" : "regular"} />
          <motion.span
            key={`streak-${displayStreak}`}
            className="font-anton text-lg leading-none tabular-nums inline-block"
            initial={{ y: 0, scale: 1 }}
            animate={glowing
              ? { y: [0, -4, 0], scale: [1, 1.25, 1], filter: ["drop-shadow(0 0 0px #FF5722)", "drop-shadow(0 0 8px #FF5722)", "drop-shadow(0 0 0px #FF5722)"] }
              : { y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {displayStreak}
          </motion.span>
          <span className="text-[9px] uppercase tracking-widest">Streak</span>
        </div>
      </div>

      <div className="space-y-5">
        {exercises.map((ex) => (
          <MetricRow
            key={ex.key}
            exercise={ex}
            value={values[ex.key] || 0}
            canBoost={isMe && canBoost && !ex.boosted_this_week && !hasBoostedThisWeek}
            onBoost={onBoost}
            onCancelBoost={onCancelBoost}
            isMe={isMe}
          />
        ))}
      </div>

      {all_time && (
        <div className="border-t border-[#1A1A1A] pt-3" data-testid={`all-time-${entry.user_id}`}>
          <p className="text-[9px] uppercase tracking-[0.25em] text-[#555] mb-2">All-Time Total</p>
          <div
            className={`grid items-start ${exercises.length >= 5 ? "gap-1.5" : exercises.length === 4 ? "gap-2" : "gap-2"}`}
            style={{ gridTemplateColumns: `repeat(${exercises.length}, minmax(0, 1fr))` }}
          >
            {exercises.map((ex) => (
              <div key={ex.key} className="text-center min-w-0">
                <p
                  className={`font-anton leading-none ${exercises.length >= 5 ? "text-sm md:text-base" : exercises.length === 4 ? "text-base md:text-lg" : "text-lg"} truncate`}
                  style={{ color: ex.color }}
                  title={`${Math.round((all_time[ex.key] || 0) * 100) / 100}${ex.unit ? " " + ex.unit : ""}`}
                >
                  {Math.round((all_time[ex.key] || 0) * 100) / 100}
                </p>
                <p className="text-[9px] uppercase tracking-widest text-[#444] mt-0.5 truncate">{ex.unit || "reps"}</p>
              </div>
            ))}
          </div>
          {updated_at && (
            <p className="text-[10px] uppercase tracking-widest text-[#444] mt-3 pt-3 border-t border-[#1A1A1A]">
              LAST SYNC · {new Date(updated_at).toLocaleString()}
            </p>
          )}
        </div>
      )}

      <AnimatePresence>
        {isCelebrating && (
          <motion.div
            key="celebrate"
            className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 overflow-hidden"
            data-testid={`celebration-${entry.user_id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              className="absolute inset-0 bg-[#FFD600]/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.7, 0.2, 0.5, 0.15] }}
              transition={{ duration: 1.6, times: [0, 0.15, 0.4, 0.7, 1] }}
            />
            <motion.div
              className="relative font-anton text-5xl md:text-6xl text-[#FFD600] tracking-widest text-center"
              style={{ textShadow: "0 0 28px rgba(255,214,0,0.9), 0 0 10px rgba(255,214,0,1)" }}
              initial={{ scale: 0.5, opacity: 0, rotate: -3 }}
              animate={{ scale: [0.5, 1.15, 1, 1.05, 1], opacity: 1, rotate: 0 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            >
              WEEK DONE!
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFailing && (
          <motion.div
            key="fail"
            className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 overflow-hidden"
            data-testid={`week-failed-card-${entry.user_id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              className="absolute inset-0 bg-[#FF3B30]/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.7, 0.2, 0.5, 0.15] }}
              transition={{ duration: 1.6, times: [0, 0.15, 0.4, 0.7, 1] }}
            />
            <motion.div
              className="relative font-anton text-5xl md:text-6xl text-[#FF3B30] tracking-widest text-center"
              style={{ textShadow: "0 0 28px rgba(255,59,48,0.9), 0 0 10px rgba(255,59,48,1)" }}
              initial={{ scale: 0.5, opacity: 0, rotate: -3 }}
              animate={{ scale: [0.5, 1.15, 1, 1.05, 1], opacity: 1, rotate: 0 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            >
              WEEK FAILED
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}