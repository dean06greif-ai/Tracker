import React, { useEffect, useMemo, useState } from "react";
import { Flame, Trophy, X } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../lib/api";

export default function BoostRanking({ open, onClose, allowedUserIds }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const { data } = await api.get("/boost/ranking");
        setData(data);
      } catch (e) { /* ignore */ }
    })();
  }, [open]);

  // Body-Scroll blockieren wenn Panel geöffnet ist (besonders wichtig auf Mobile)
  useEffect(() => {
    if (!open) return;
    
    // Speichere ursprüngliche Werte
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalWidth = document.body.style.width;
    const originalTop = document.body.style.top;
    
    // Blockiere Scroll
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    
    return () => {
      // Stelle ursprüngliche Werte wieder her
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      document.body.style.overflow = originalOverflow;
      
      // Scrolle zurück zur ursprünglichen Position
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  // Nur User aus der eigenen Crew anzeigen (Freunde + ich selbst).
  // allowedUserIds wird vom Dashboard übergeben. Falls undefined -> alle anzeigen (Fallback).
  const ranking = useMemo(() => {
    const raw = data?.ranking || [];
    if (!allowedUserIds) return raw;
    const allow = allowedUserIds instanceof Set ? allowedUserIds : new Set(allowedUserIds);
    return raw.filter((r) => allow.has(r.user_id));
  }, [data, allowedUserIds]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          data-testid="boost-ranking-overlay"
          style={{ touchAction: 'none' }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" style={{ touchAction: 'none' }} />
          <motion.aside
            className="relative w-full max-w-md h-full bg-[#0A0A0A] border-l border-[#222] flex flex-col"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 240 }}
            onClick={(e) => e.stopPropagation()}
            data-testid="boost-ranking-panel"
            style={{ touchAction: 'auto' }}
          >
            <header className="flex items-center justify-between p-6 border-b border-[#1A1A1A]">
              <div className="flex items-center gap-2">
                <Flame size={20} weight="fill" className="text-[#FF8800]" />
                <h2 className="font-anton text-2xl tracking-tight">BOOST RANKING</h2>
              </div>
              <button onClick={onClose} className="text-[#8A8A8A] hover:text-white" data-testid="close-ranking">
                <X size={18} />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {!data ? (
                <p className="text-[#555] text-sm uppercase tracking-widest">Loading...</p>
              ) : ranking.length === 0 ? (
                <p className="text-[#555] text-sm uppercase tracking-widest">Noch keine Boosts in deiner Crew.</p>
              ) : (
                ranking.map((r, idx) => (
                  <div key={r.user_id} className="border border-[#1A1A1A] bg-[#121212] p-4 flex items-center gap-4" data-testid={`ranking-row-${r.user_id}`}>
                    <div className={`font-anton text-3xl w-8 text-center ${idx === 0 ? "text-[#FF8800]" : idx === 1 ? "text-[#CCCCCC]" : idx === 2 ? "text-[#A06B3A]" : "text-[#444]"}`}>
                      {String(idx + 1).padStart(2, "0")}
                    </div>
                    {r.picture ? (
                      <img src={r.picture} alt={r.name} className="w-10 h-10 object-cover border border-[#333]" />
                    ) : (
                      <div className="w-10 h-10 bg-[#1A1A1A] border border-[#333] flex items-center justify-center font-anton">{r.name?.[0]?.toUpperCase()}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-anton text-lg truncate">{r.name}</p>
                      <p className="text-[10px] uppercase tracking-widest text-[#555] truncate">
                        {r.by_exercise.length === 0 ? "—" : r.by_exercise.map((e) => `${e.name} ×${e.count}`).join(" · ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#FF8800]">
                      <Flame size={18} weight="fill" />
                      <span className="font-anton text-2xl">{r.total_boosts}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <footer className="border-t border-[#1A1A1A] p-4 text-[10px] uppercase tracking-widest text-[#444] flex items-center gap-2">
              <Trophy size={12} /> +25% statt +10% bei geboosteten Wochen
            </footer>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}