import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FloppyDisk, Lightning, Camera, User } from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import { toast } from "sonner";

export default function Profile() {
  const { user, loading, setUser } = useAuth();
  const navigate = useNavigate();
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!loading && !user) navigate("/");
    if (user) {
      setProfileName(user.name || "");
      setProfilePic(user.picture || "");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await api.get("/auth/preferences");
        setRememberMe(!!data.remember_me);
      } catch (err) {
        console.error("Failed to load auth preferences:", err);
      }
    })();
  }, [user]);

  const toggleRememberMe = async (val) => {
    setSavingPrefs(true);
    const prev = rememberMe;
    setRememberMe(val);
    try {
      await api.put("/auth/preferences", { remember_me: val });
      toast.success(val ? "Du bleibst angemeldet" : "Automatische Anmeldung deaktiviert");
    } catch (e) {
      setRememberMe(prev);
      toast.error("Update fehlgeschlagen");
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 500_000) { toast.error("Bild zu groß (max 500KB)"); return; }
    const reader = new FileReader();
    reader.onload = () => setProfilePic(reader.result);
    reader.readAsDataURL(f);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const { data } = await api.put("/profile", { name: profileName, picture: profilePic });
      setUser({ ...user, name: data.name, picture: data.picture });
      toast.success("Profil aktualisiert");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Update fehlgeschlagen");
    } finally {
      setSavingProfile(false);
    }
  };

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

      {/* Profile section */}
      <section className="max-w-5xl mx-auto px-6 py-10">
        <p className="text-xs uppercase tracking-[0.3em] text-[#CCFF00] mb-3">/ PROFILE</p>
        <h1 className="font-anton text-4xl md:text-5xl leading-none tracking-tight mb-8">
          DEIN ACCOUNT
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-6 items-start">
          {/* Profilbild */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {profilePic ? (
                <img
                  src={profilePic}
                  alt="profile"
                  className="w-32 h-32 object-cover border border-[#333]"
                  data-testid="profile-pic-preview"
                />
              ) : (
                <div className="w-32 h-32 bg-[#121212] border border-[#333] flex items-center justify-center">
                  <User size={48} className="text-[#555]" />
                </div>
              )}

              <button
                onClick={() => fileRef.current?.click()}
                data-testid="upload-pic-button"
                className="absolute -bottom-2 -right-2 bg-[#CCFF00] text-black p-2 hover:bg-[#D4FF33] glow-lime"
              >
                <Camera size={16} weight="bold" />
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
                data-testid="upload-pic-input"
              />
            </div>

            <p className="text-[10px] uppercase tracking-widest text-[#555]">Max 500KB</p>
          </div>

          {/* Profilfelder */}
          <div className="space-y-4">
            {/* Anzeigename */}
            <div className="border border-[#222] bg-[#121212] p-5">
              <label className="text-[10px] uppercase tracking-widest text-[#8A8A8A] mb-2 block">
                Anzeigename
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full bg-transparent border-b-2 border-[#333] focus:border-[#CCFF00] outline-none font-anton text-3xl text-white py-2 transition-colors"
                data-testid="input-display-name"
                maxLength={80}
              />
            </div>

            {/* E-Mail */}
            <div className="border border-[#222] bg-[#121212] p-5">
              <label className="text-[10px] uppercase tracking-widest text-[#8A8A8A] mb-2 block">
                E-Mail (read-only)
              </label>
              <p className="font-anton text-xl text-[#555]">{user.email}</p>
            </div>

            {/* Profil speichern */}
            <button
              onClick={saveProfile}
              disabled={savingProfile}
              data-testid="save-profile-button"
              className="bg-[#CCFF00] hover:bg-[#D4FF33] text-black font-bold uppercase tracking-widest py-3 px-6 flex items-center gap-2 transition-all hover:-translate-y-0.5 glow-lime disabled:opacity-60"
            >
              <FloppyDisk size={16} weight="bold" />
              {savingProfile ? "Speichern..." : "Profil speichern"}
            </button>

            {/* Angemeldet bleiben Toggle */}
            <div
              className="flex items-center gap-5 border border-[#222] bg-[#121212] p-5 mb-10"
              data-testid="remember-me-row"
            >
              <button
                type="button"
                role="switch"
                aria-checked={rememberMe}
                onClick={() => toggleRememberMe(!rememberMe)}
                disabled={savingPrefs}
                data-testid="remember-me-toggle"
                className={`relative w-14 h-7 border transition-colors flex-shrink-0 ${
                  rememberMe
                    ? "bg-[#CCFF00] border-[#CCFF00]"
                    : "bg-[#0A0A0A] border-[#333] hover:border-[#555]"
                } disabled:opacity-60`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 transition-all ${
                    rememberMe ? "left-[30px] bg-black" : "left-0.5 bg-[#555]"
                  }`}
                />
              </button>

              <div className="flex-1">
                <p className="font-anton text-xl tracking-tight">Angemeldet bleiben</p>
                <p className="text-xs text-[#8A8A8A] mt-1 leading-relaxed">
                  {rememberMe
                    ? "Du wirst auf diesem Gerät 30 Tage lang automatisch angemeldet."
                    : "Du wirst beim Schließen des Browsers abgemeldet."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
