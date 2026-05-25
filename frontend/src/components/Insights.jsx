import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChartBar, X, Lightning, Trophy } from "@phosphor-icons/react";
import { api } from "../lib/api";
import ExerciseIcon from "./ExerciseIcon";

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const DAY_LABELS_FULL = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

export default function Insights({ open, onClose }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!open) return;
    setData(null);
    (async () => {
      try {
        const { data } = await api.get("/insights/me");
        setData(data);
      } catch (e) { /* ignore */ }
    })();
  }, [open]);

  // ✅ SCROLL BLOCKIEREN: Body overflow:hidden wenn Panel offen
  useEffect(() => {
    if (!open) return;
    
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    
    // Scrollbar-Breite ermitteln um Layout-Shift zu vermeiden
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          data-testid="insights-overlay"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.aside
            className="relative w-full sm:max-w-lg h-full bg-[#0A0A0A] border-l border-[#222] flex flex-col"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 240 }}
            onClick={(e) => e.stopPropagation()}
            data-testid="insights-panel"
          >
            <header className="flex items-center justify-between p-5 md:p-6 border-b border-[#1A1A1A] sticky top-0 bg-[#0A0A0A] z-10">
              <div className="flex items-center gap-2">
                <ChartBar size={22} weight="duotone" className="text-[#CCFF00]" />
                <h2 className="font-anton text-2xl tracking-tight">POWER INSIGHTS</h2>
              </div>
              <button onClick={onClose} className="text-[#8A8A8A] hover:text-white" data-testid="close-insights">
                <X size={20} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">
              {!data ? (
                <p className="text-[#555] text-sm uppercase tracking-widest">Loading...</p>
              ) : data.weeks_tracked === 0 ? (
                <div className="border border-dashed border-[#222] p-8 text-center">
                  <p className="text-[#555] text-sm uppercase tracking-widest mb-2">Noch keine Per-Tag-Daten</p>
                  <p className="text-[10px] uppercase tracking-widest text-[#444]">Logge Fortschritt im „Mo–So" Modus, um Insights zu erhalten</p>
                </div>
              ) : (
                <>
                  <div className="border border-[#1A1A1A] bg-[#121212] p-4 flex items-center gap-3">
                    <Lightning size={20} weight="fill" className="text-[#CCFF00]" />
                    <p className="text-[11px] uppercase tracking-widest text-[#8A8A8A]">
                      {data.weeks_tracked === 1 ? (
                        <>Insights basieren auf <span className="text-white font-anton text-base mx-1">1</span> protokollierter Woche</>
                      ) : (
                        <>Insights basieren auf <span className="text-white font-anton text-base mx-1">{data.weeks_tracked}</span> protokollierten Wochen</>
                      )}
                    </p>
                  </div>

                  {data.exercises.map((ex) => (
                    <ExerciseInsight key={ex.key} ex={ex} />
                  ))}
                </>
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ExerciseInsight({ ex }) {
  // Defensive: Sicherstellen dass by_weekday existiert und ein Array ist
  const byWeekday = Array.isArray(ex.by_weekday) ? ex.by_weekday : [0, 0, 0, 0, 0, 0, 0];
  const maxVal = Math.max(...byWeekday, 1);

  // Defensive: Sicherstellen dass share_per_day existiert
  const sharePerDay = Array.isArray(ex.share_per_day) ? ex.share_per_day : [0, 0, 0, 0, 0, 0, 0];

  // Defensive: Sicherstellen dass consistency existiert
  const consistency = Array.isArray(ex.consistency) ? ex.consistency : [0, 0, 0, 0, 0, 0, 0];

  const unitLower = (ex.unit || "").toLowerCase();
  const isDistance = unitLower.includes("km") || unitLower === "m" || unitLower.includes("mi");

  // Mindesthöhe = exakt so groß, dass die Total-Zahl bequem unten im Balken sitzt.
  // Darüber hinaus lineare Proportionalität: Tage mit höherem Wert wachsen deutlich.
  const MIN_FIT_PCT = 18; // ~32px bei h-44 (176px) – passt für 11px Zahl + Padding

  return (
    <div className="border border-[#1A1A1A] bg-[#121212] p-5 space-y-5" data-testid={`insight-${ex.key}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2" style={{ color: ex.color }}>
          <ExerciseIcon icon={ex.icon} size={18} />
          <h3 className="font-anton text-xl tracking-tight">{ex.name}</h3>
        </div>
        <div className="text-right">
          <p className="font-anton text-2xl" style={{ color: ex.color }}>
            {ex.avg_per_week}{ex.unit ? <span className="text-xs text-[#555] ml-1">{ex.unit}/Woche</span> : <span className="text-xs text-[#555] ml-1">avg/W</span>}
          </p>
        </div>
      </div>

      {/* Power Day callout */}
      {ex.power_day !== null && ex.power_day !== undefined && (
        <div className="flex items-stretch gap-2 text-[11px]">
          <div className="flex-1 border border-[#CCFF00]/40 bg-[#CCFF00]/[0.05] px-3 py-2" data-testid={`power-day-${ex.key}`}>
            <div className="flex items-center gap-1.5 text-[#CCFF00] uppercase tracking-widest text-[9px] mb-1">
              <Trophy size={11} weight="fill" /> Power-Day
            </div>
            <p className="font-anton text-base text-white leading-none">{DAY_LABELS_FULL[ex.power_day] || "—"}</p>
            <p className="text-[10px] text-[#888] mt-1">{sharePerDay[ex.power_day] || 0}% deiner Gesamtleistung</p>
          </div>
          {ex.weakest_day !== null && ex.weakest_day !== undefined && ex.weakest_day !== ex.power_day && (
            <div className="flex-1 border border-[#444] px-3 py-2" data-testid={`weak-day-${ex.key}`}>
              <div className="flex items-center gap-1.5 text-[#888] uppercase tracking-widest text-[9px] mb-1">
                Loser Day
              </div>
              <p className="font-anton text-base text-white leading-none">{DAY_LABELS_FULL[ex.weakest_day] || "—"}</p>
              <p className="text-[10px] text-[#666] mt-1">{sharePerDay[ex.weakest_day] || 0}% Anteil</p>
            </div>
          )}
        </div>
      )}

      {/* Bar chart Mo-So – Layout in zwei Reihen:
          1) Bar-Area mit FIXER Höhe (h-44). Balken sind direkte Flex-Kinder,
             damit height: pct% sauber gegen die Parent-Höhe rechnet.
          2) Label-Reihe (Mo–So) darunter – jede Spalte mit flex-1, exakt unter
             dem zugehörigen Balken. */}
      <div>
        <p className="text-[9px] uppercase tracking-[0.25em] text-[#555] mb-3">Verteilung (Total)</p>

        {/* Reihe 1: Balken */}
        <div className="flex items-end justify-between gap-1.5 h-44" data-testid={`distribution-${ex.key}`}>
          {DAY_LABELS.map((day, i) => {
            const v = byWeekday[i] || 0;
            const hasData = v > 0;
            const rawPct = maxVal > 0 ? (v / maxVal) * 100 : 0;
            const pct = hasData ? Math.max(MIN_FIT_PCT, rawPct) : 3;
            const isPower = i === ex.power_day;
            const label = hasData ? (isDistance ? Number(v).toFixed(1) : Math.round(v)) : "";
            return (
              <div
                key={day}
                className="flex-1 min-w-0 relative transition-all"
                style={{
                  height: `${pct}%`,
                  background: hasData ? (isPower ? ex.color : `${ex.color}AA`) : "#222",
                  boxShadow: isPower && hasData ? `0 0 12px ${ex.color}` : "none",
                }}
                title={`${day}: ${v}${ex.unit ? ` ${ex.unit}` : ""}`}
              >
                {hasData && (
                  <span
                    className="absolute left-0 right-0 bottom-1 text-center font-anton tabular-nums text-[10px] md:text-[11px] leading-none text-black px-0.5"
                    style={{ textShadow: "0 1px 0 rgba(255,255,255,0.25)" }}
                  >
                    {label}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Reihe 2: Labels Mo–So – exakt unter dem jeweiligen Balken */}
        <div className="flex justify-between gap-1.5 mt-2">
          {DAY_LABELS.map((day, i) => {
            const isPower = i === ex.power_day;
            const hasData = (byWeekday[i] || 0) > 0;
            return (
              <span
                key={day}
                className={`flex-1 min-w-0 text-center text-[9px] uppercase tracking-widest ${isPower && hasData ? "text-white" : "text-[#555]"}`}
              >
                {day}
              </span>
            );
          })}
        </div>
      </div>

      {/* Consistency – farbcodiert nach Prozent:
          ≥80% grün, ≥60% gelb, ≥40% orange, <40% rot, <20% rot mit reduzierter Opacity */}
      <div>
        <p className="text-[9px] uppercase tracking-[0.25em] text-[#555] mb-2">Trainings-Konsistenz</p>
        <div className="grid grid-cols-7 gap-1.5">
          {consistency.map((c, i) => {
            const color =
              c >= 80 ? "#00FF66" :
              c >= 60 ? "#FFD93D" :
              c >= 40 ? "#FF8C00" :
              "#FF3B30";
            const opacity = c >= 20 ? 1 : c > 0 ? 0.5 : 0.25;
            return (
              <div key={i} className="text-center">
                <div
                  className="h-2 mb-1"
                  style={{ background: color, opacity }}
                />
                <p className="text-[9px] text-[#666] uppercase tracking-widest leading-none">{DAY_LABELS[i]}</p>
                <p className="text-[10px] text-white font-anton mt-0.5">{c}%</p>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-[#555] mt-2">% der Wochen mit Aktivität an diesem Tag</p>
      </div>
    </div>
  );
}