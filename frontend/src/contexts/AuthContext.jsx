import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, tokenStore } from "../lib/api";

const AuthContext = createContext(null);

// Beim Mount: Token aus URL-Fragment (#token=...) einlesen und in localStorage
// speichern. Wird vom Google-OAuth-Callback angehaengt, damit Auth auch dann
// funktioniert, wenn Cross-Site Cookies blockiert sind (Google-In-App-Browser,
// Safari Cross-Site-Tracking verhindern, etc.).
function consumeTokenFromUrl() {
  try {
    const hash = window.location.hash || "";
    if (!hash.startsWith("#")) return false;
    const params = new URLSearchParams(hash.slice(1));
    const token = params.get("token");
    if (!token) return false;
    tokenStore.set(token);
    // Token aus URL entfernen, ohne Reload — kein sichtbarer Token in der
    // Adresszeile, keine Referer-Leaks.
    const cleanUrl = window.location.pathname + window.location.search;
    window.history.replaceState({}, "", cleanUrl);
    return true;
  } catch {
    return false;
  }
}

// Heuristik: hat der Browser ein nicht-HttpOnly "session_hint" Cookie?
// Backend setzt das parallel zum echten httponly session_token. Wenn der
// Browser cross-site Cookies blockiert, ist auch dieses Hint-Cookie weg —
// dann macht ein /auth/me Call auch keinen Sinn (Cookie kaeme eh nicht mit).
function hasSessionHintCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith("session_hint="));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const justGotToken = consumeTokenFromUrl();
    const hasToken = !!tokenStore.get();
    const hint = hasSessionHintCookie();

    // Kurzschluss: Erstbesucher und ausgeloggte User. Kein /auth/me Roundtrip
    // noetig — User kommt direkt auf die Login-Seite. Spart bei Render
    // Cold Starts mehrere Sekunden "AUTHENTICATING..." Wartezeit.
    if (!hasToken && !hint && !justGotToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(null);
      tokenStore.clear();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (e) { /* ignore */ }
    tokenStore.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout, refresh: checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);