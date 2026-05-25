import React, { useEffect, useState } from "react";
import { Lightning, GoogleLogo, Barbell } from "@phosphor-icons/react";
import { API } from "../lib/api";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function Login() {
  // Liest ?auth_error=... aus der URL (Backend redirected hierher bei Fehlern)
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("auth_error");
    if (err) {
      setAuthError(err);
      // URL aufraeumen, damit der Fehler beim Reload weg ist
      const cleaned = window.location.pathname;
      window.history.replaceState({}, "", cleaned);
    }
  }, []);

  const handleLogin = () => {
    // Vollstaendiger Seitenwechsel im SELBEN Tab — kein Popup, kein One-Tap.
    // Backend redirected zu accounts.google.com und nach erfolgreicher Auswahl
    // direkt zu /dashboard (mit gesetztem session_token Cookie).
    window.location.href = `${API}/auth/google/login?redirect=/dashboard`;
  };

  const heroBg = "https://static.prod-images.emergentagent.com/jobs/cab27bbf-b8ed-47b3-9c24-72819e38a03a/images/13c703faf7c4289b7773d3e5cac5d9ce07621f6f90e7bf17fbd16a361b0cd884.png";

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-[#0A0A0A] flex" data-testid="login-page">
      {/* Left side image */}
      <div
        className="hidden md:flex md:w-1/2 lg:w-3/5 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/30 to-[#0A0A0A]" />
        <div className="absolute top-8 left-8 flex items-center gap-3">
          <Lightning size={28} weight="fill" className="text-[#CCFF00]" />
          <span className="font-anton text-2xl tracking-widest">TRACKER</span>
        </div>
        <div className="absolute bottom-12 left-8 right-8 max-w-md">
          <p className="text-xs tracking-[0.3em] uppercase text-[#CCFF00] mb-4">WEEKLY PROGRESSION SYSTEM</p>
          <h2 className="font-anton text-5xl lg:text-6xl leading-none tracking-tight mb-4">
            PUSH HARDER.<br />EVERY. SINGLE. WEEK.
          </h2>
          <p className="text-[#8A8A8A] text-base leading-relaxed">
            10% mehr Laufen. 10% mehr Liegestütze. 10% mehr Klimmzüge. Jede Woche. Sieh deinen Crew dabei zu, wie sie liefert — oder einknickt.
          </p>
        </div>
      </div>

      {/* Right side login */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex items-center justify-center px-8 py-12 relative tactical-grid">
        <div className="w-full max-w-sm">
          <div className="md:hidden flex items-center gap-3 mb-12">
            <Lightning size={28} weight="fill" className="text-[#CCFF00]" />
            <span className="font-anton text-2xl tracking-widest">TRACKER</span>
          </div>

          <p className="text-xs tracking-[0.3em] uppercase text-[#8A8A8A] mb-3">/ ACCESS TERMINAL</p>
          <h1 className="font-anton text-5xl lg:text-6xl leading-none mb-3">SIGN IN</h1>
          <p className="text-[#8A8A8A] mb-12 text-sm leading-relaxed">
            Tritt deiner Trainings-Crew bei. Tracke wöchentliche Fitness-Ziele live mit deinen Buddies.
          </p>

          <button
            onClick={handleLogin}
            data-testid="google-login-button"
            className="w-full bg-[#CCFF00] hover:bg-[#D4FF33] text-black font-bold uppercase tracking-widest py-4 px-6 flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#CCFF00] focus:ring-offset-2 focus:ring-offset-[#0A0A0A] glow-lime"
          >
            <GoogleLogo size={20} weight="bold" />
            <span>Mit Google fortfahren</span>
          </button>

          {authError && (
            <p
              className="mt-4 text-xs tracking-widest uppercase text-[#FF3B30]"
              data-testid="login-error"
            >
              Login fehlgeschlagen: {authError}
            </p>
          )}

          <div className="mt-12 pt-8 border-t border-[#222]">
            <div className="flex items-center gap-3 text-[#8A8A8A] text-xs tracking-widest uppercase">
              <Barbell size={16} className="text-[#CCFF00]" />
              <span>Woche 1: 10KM · 500 PUSHUPS · 50 PULLUPS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
