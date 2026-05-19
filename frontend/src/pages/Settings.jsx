import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FloppyDisk, ArrowCounterClockwise, Lightning, Plus, Trash, X } from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import ExerciseIcon, { ICON_KEYS } from "../components/ExerciseIcon";
import { toast } from "sonner";

export default function Settings() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [exercises, setExercises] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [state, setState] = useState({}); // {ex_key: {missed_weeks, effective_boost_weeks, current_goal, progression: [...]}}
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [user, loading, navigate]);

  const loadGoals = useCallback(async () => {
    try {
      const { data } = await api.get("/goals/me");
      setExercises(data.exercises || []);
      setStartDate(data.start_date);
      setCurrentWeek(data.current_week || 1);
      setState(data.state || {});
    } catch (err) {
      console.error("Failed to load goals:", err);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadGoals();
  }, [user, loadGoals]);

  const updateExercise = (idx, patch) => {
    setExercises((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  };

  const addExercise = () => {
    if (exercises.length >= 5) { toast.error("Maximal 5 Übungen"); return; }
    const usedKeys = new Set(exercises.map((e) => e.key));
    let n = 1;
    while (usedKeys.has(`ex${n}`)) n++;
    const palette = ["#CCFF00", "#FF3B30", "#00F0FF", "#FF8800", "#A855F7"];
    setExercises((prev) => [...prev, {
      key: `ex${n}`,
      name: `Übung ${prev.length + 1}`,
      unit: "",
      icon: "squat",
      color: palette[prev.length % palette.length],
      base_value: 10,
    }]);
  };

  const removeExercise = (idx) => {
    if (exercises.length <= 3) { toast.error("Mindestens 3 Übungen erforderlich"); return; }
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/goals/me", { exercises });
      toast.success("Ziele aktualisiert");
      // Reload to refresh progression (goals may have changed values)
      await loadGoals();
    } catch (e) {
      toast.error("Update fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  const resetStart = async () => {
    try {
      const { data } = await api.post("/goals/me/reset-start");
      setStartDate(data.start_date);
      toast.success("Programm wurde zurück auf Woche 1 gesetzt");
      await loadGoals();
    } catch (e) {
      toast.error("Reset fehlgeschlagen");
    }
  };

  // Build unified rows for the progression table (week 1 .. currentWeek + 10)
  const rows = useMemo(() => {
    if (!exercises.length) return [];
    // Progression lists are per exercise; align by week number.
    const lastWeek = currentWeek + 10;
    const out = [];
    for (let w = 1; w <= lastWeek; w++) {
      const cells = exercises.map((ex) => {
        const p = (state[ex.key]?.progression || []).find((pp) => pp.week === w);
        return p || null;
      });
      out.push({ week: w, cells });
    }
    return out;
  }, [exercises, state, currentWeek]);

  // Auto-scroll the progression body so current week is near the top
  const tableScrollRef = useRef(null);
  const currentRowRef = useRef(null);
  useEffect(() => {
    if (!currentRowRef.current || !tableScrollRef.current) return;
    // Place the current week roughly 1 row from top
    const rowTop = currentRowRef.current.offsetTop;
    tableScrollRef.current.scrollTop = Math.max(0, rowTop - 40);
  }, [rows.length, currentWeek]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <header className="border-b border-[#1A1A1A] bg-[#0A0A0A]/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lightning size={26} weight="fill" className="text-[#CCFF00]" />
            <span className="font-anton text-2xl tracking-widest">TRACKER</span>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            data-testid="back-to-dashboard"
            className="border border-[#222] hover:border-[#CCFF00] hover:text-[#CCFF00] px-4 py-2 text-xs uppercase tracking-widest flex items-center gap-2 transition-colors"
          >
            <ArrowLeft size={16} /> Zurück
          </button>
        </div>
      </header>

      {/* Exercises */}
      <section className="max-w-5xl mx-auto px-6 py-10">
        <p className="text-xs uppercase tracking-[0.3em] text-[#CCFF00] mb-3">/ ÜBUNGEN & STARTWERTE</p>
        <h2 className="font-anton text-4xl md:text-5xl leading-none tracking-tight mb-3">DEINE ZIELE</h2>
        <p className="text-[#8A8A8A] max-w-xl leading-relaxed mb-10">
          Wähle Übungen und Woche-1-Startwerte. Jede Woche +10%. Mit BOOST → +25% für eine Übung (1×/Woche). Wird das Wochenziel nicht erreicht, pausiert die Steigerung für diese Übung — und Boosts für sie verfallen.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
          {exercises.map((ex, idx) => (
            <div key={ex.key} className="border border-[#222] bg-[#121212] p-5 space-y-4 relative" data-testid={`exercise-card-${ex.key}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest" style={{ color: ex.color }}>
                  <ExerciseIcon icon={ex.icon} size={14} /> ÜBUNG {idx + 1}
                </div>
                {exercises.length > 3 && (
                  <button onClick={() => removeExercise(idx)} data-testid={`remove-exercise-${ex.key}`} className="text-[#555] hover:text-[#FF3B30] transition-colors" title="Entfernen">
                    <Trash size={14} />
                  </button>
                )}
              </div>
              <input
                type="text"
                value={ex.name}
                onChange={(e) => updateExercise(idx, { name: e.target.value })}
                className="w-full bg-transparent border-b-2 border-[#333] focus:border-[#CCFF00] outline-none font-anton text-2xl text-white py-1 transition-colors"
                placeholder="Name"
                data-testid={`input-name-${ex.key}`}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#555] mb-1 block">Startwert</label>
                  <input
                    type="number"
                    value={Number(ex.base_value) === 0 ? "" : ex.base_value}
                    step={ex.unit === "km" ? 0.5 : ex.base_value > 100 ? 10 : 1}
                    placeholder="0"
                    onChange={(e) => updateExercise(idx, { base_value: Number(e.target.value) || 0 })}
                    className="w-full bg-[#0A0A0A] border border-[#222] focus:border-[#CCFF00] outline-none font-anton text-xl text-white px-2 py-1 placeholder:text-[#555] placeholder:font-anton"
                    data-testid={`input-base-${ex.key}`}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[#555] mb-1 block">Einheit</label>
                  <input
                    type="text"
                    value={ex.unit}
                    onChange={(e) => updateExercise(idx, { unit: e.target.value })}
                    placeholder="km, kg, ..."
                    className="w-full bg-[#0A0A0A] border border-[#222] focus:border-[#CCFF00] outline-none text-base text-white px-2 py-1.5"
                    data-testid={`input-unit-${ex.key}`}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#555] mb-2 block">Icon</label>
                <div className="grid grid-cols-4 gap-1">
                  {ICON_KEYS.map((k) => (
                    <button
                      key={k}
                      onClick={() => updateExercise(idx, { icon: k })}
                      className={`p-2 flex items-center justify-center border transition-colors ${ex.icon === k ? "border-[#CCFF00] text-[#CCFF00]" : "border-[#222] text-[#666] hover:border-[#444] hover:text-white"}`}
                      data-testid={`icon-${ex.key}-${k}`}
                      title={k}
                    >
                      <ExerciseIcon icon={k} size={18} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-8">
          {exercises.length < 5 && (
            <button
              onClick={addExercise}
              data-testid="add-exercise-button"
              className="border border-dashed border-[#333] hover:border-[#CCFF00] hover:text-[#CCFF00] text-[#888] px-4 py-3 text-xs uppercase tracking-widest flex items-center gap-2 transition-colors w-full md:w-auto"
            >
              <Plus size={14} weight="bold" /> Übung hinzufügen ({exercises.length}/5)
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mb-12">
          <button
            onClick={save}
            disabled={saving}
            data-testid="save-goals-button"
            className="bg-[#CCFF00] hover:bg-[#D4FF33] text-black font-bold uppercase tracking-widest py-3 px-6 flex items-center gap-2 transition-all hover:-translate-y-0.5 glow-lime disabled:opacity-60"
          >
            <FloppyDisk size={16} weight="bold" /> {saving ? "Speichern..." : "Ziele speichern"}
          </button>
          <button
            onClick={resetStart}
            data-testid="reset-start-button"
            className="border border-[#222] hover:border-[#FF3B30] hover:text-[#FF3B30] py-3 px-6 text-xs uppercase tracking-widest flex items-center gap-2 transition-colors"
          >
            <ArrowCounterClockwise size={14} /> Programm neu starten (Woche 1)
          </button>
        </div>

        {startDate && (
          <p className="text-xs uppercase tracking-widest text-[#555] mb-8">
            Programm gestartet · {new Date(startDate).toLocaleDateString()}
          </p>
        )}

        {/* Wochen-Progression: vertikal scrollbar, 10 sichtbare Wochen, Vergangenheit + Zukunft */}
        <div className="border border-[#1A1A1A] bg-[#121212] p-4 md:p-6">
          <h3 className="font-anton text-2xl tracking-tight mb-1">WOCHEN-PROGRESSION</h3>
          <p className="text-[10px] md:text-xs uppercase tracking-wider md:tracking-widest text-[#8A8A8A] mb-5">
            Aktuell Woche {currentWeek} · +10%/Woche · ★ Boost (+25%) · <X size={10} weight="bold" className="inline align-middle text-[#FF3B30]" /> verpasst → keine Steigerung
          </p>

          {/* Sticky header outside the scroll container */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm" data-testid="progression-table">
              <thead>
                <tr className="text-[9px] md:text-[10px] uppercase tracking-wider md:tracking-widest text-[#555] border-b border-[#1A1A1A]">
                  <th className="py-2 pr-1 md:pr-4 text-left w-16">Woche</th>
                  {exercises.map((ex) => (
                    <th key={ex.key} className="py-2 px-1 md:px-4 truncate text-center" style={{ color: ex.color }}>{ex.name}</th>
                  ))}
                </tr>
              </thead>
            </table>

            {/* Scrollable body: ~10 visible rows (each row ~36px) */}
            <div
              ref={tableScrollRef}
              className="max-h-[360px] overflow-y-auto"
              data-testid="progression-scroll"
            >
              <table className="w-full text-xs md:text-sm">
                <tbody className="font-anton">
                  {rows.map(({ week, cells }) => {
                    const isCurrent = week === currentWeek;
                    const isPast = week < currentWeek;
                    return (
                      <tr
                        key={week}
                        ref={isCurrent ? currentRowRef : null}
                        className={`border-b border-[#1A1A1A] hover:bg-[#0E0E0E] ${isCurrent ? "bg-[#CCFF00]/[0.06]" : ""} ${isPast ? "opacity-80" : ""}`}
                        data-testid={`progression-row-${week}`}
                      >
                        <td className={`py-2 pr-1 md:pr-4 text-left w-16 ${isCurrent ? "text-[#CCFF00]" : isPast ? "text-[#555]" : "text-[#8A8A8A]"}`}>
                          {String(week).padStart(2, "0")}
                        </td>
                        {cells.map((cell, ci) => {
                          const ex = exercises[ci];
                          if (!cell || !ex) {
                            return <td key={`empty-${ci}`} className="py-2 px-1 md:px-4 text-center text-[#333]">—</td>;
                          }
                          const isKm = (ex.unit || "").toLowerCase().includes("km");
                          const display = isKm ? Number(cell.goal).toFixed(1) : cell.goal;
                          const missed = cell.status === "missed";
                          const boosted = cell.boost && !cell.voided_boost;
                          const voided = cell.voided_boost;
                          return (
                            <td
                              key={ex.key}
                              className={`py-2 px-1 md:px-4 text-center whitespace-nowrap ${missed ? "text-[#FF3B30]" : "text-white"}`}
                              data-testid={`progression-cell-${week}-${ex.key}`}
                            >
                              <span className={missed ? "line-through" : ""}>
                                {display}
                                {ex.unit && <span className="text-[#555] text-[10px] md:text-xs ml-1">{ex.unit}</span>}
                              </span>
                              {boosted && <span className="text-[#FF8800] text-[10px] ml-1" title="Boost aktiv">★</span>}
                              {voided && <span className="text-[#555] text-[10px] ml-1" title="Boost verfallen">★</span>}
                              {missed && <X size={10} weight="bold" className="inline align-middle ml-1 text-[#FF3B30]" />}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
