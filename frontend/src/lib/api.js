import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Token wird zusaetzlich zum HttpOnly-Cookie in localStorage gehalten.
// Grund: Cross-Site Cookies (SameSite=None) werden in Google-In-App-Browsern,
// Safari mit "Cross-Site-Tracking verhindern" und vielen Webviews blockiert.
// Mit Token in localStorage + Authorization-Header funktioniert Auth ueberall.
const TOKEN_KEY = "tracker_session_token";

export const tokenStore = {
  get() {
    try { return localStorage.getItem(TOKEN_KEY) || null; } catch { return null; }
  },
  set(token) {
    try { localStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ }
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  },
};

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
  // Schutz gegen Render Cold Starts: keine endlos haengenden Requests.
  timeout: 15000,
});

// Bearer-Token automatisch an jeden Request anhaengen, falls vorhanden.
api.interceptors.request.use((config) => {
  const t = tokenStore.get();
  if (t) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

// 401 -> Token ist abgelaufen/ungueltig -> aufraeumen, damit der User nicht
// im Loop haengt.
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) tokenStore.clear();
    return Promise.reject(err);
  }
);

export const wsUrl = () => {
  const url = new URL(BACKEND_URL);
  const proto = url.protocol === "https:" ? "wss:" : "ws:";
  const t = tokenStore.get();
  // Token auch an den WebSocket weiterreichen (Backend liest ?token=...).
  // Wichtig fuer Browser/Webviews, die Cookies blockieren.
  const qs = t ? `?token=${encodeURIComponent(t)}` : "";
  return `${proto}//${url.host}/api/ws${qs}`;
};