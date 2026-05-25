import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH

function AuthGate({ children }) {
  // Globaler Auth-Gate: solange wir noch nicht wissen, ob ein User existiert,
  // zeigen wir einen einheitlichen "AUTHENTICATING..." Screen — auch auf der
  // Login-Route ("/"). Dadurch kann der Login-Screen niemals kurz aufblitzen,
  // waehrend wir vom OAuth-Callback zurueckkommen und das Cookie schon gesetzt ist.
  const { loading } = useAuth();
  if (loading) {
    return (
      <div
        className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"
        data-testid="auth-loading"
      >
        <div className="text-[#CCFF00] font-anton text-3xl tracking-widest animate-pulse">
          AUTHENTICATING...
        </div>
      </div>
    );
  }
  return children;
}

function PublicOnly({ children }) {
  // "/" Route: wenn User schon eingeloggt ist, direkt aufs Dashboard.
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function AppRouter() {
  return (
    <AuthGate>
      <Routes>
        <Route path="/" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthGate>
  );
}

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: {
                background: "#121212",
                border: "1px solid #222",
                borderRadius: 0,
                color: "#fff",
                fontFamily: "Manrope, sans-serif",
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}