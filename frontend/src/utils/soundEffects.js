// Sound Effects Manager – Week Done (Streak-Up) & Week Failed
// Mobile-optimiert: AudioContext wird LAZY beim ersten User-Gesture erzeugt
// (iOS Safari blockt AudioContext-Creation vor jeder Interaktion komplett).

class SoundEffects {
  constructor() {
    this.audioContext = null;
    this.unlocked = false;
    // ⚠️ KEIN initAudioContext() hier – iOS würde sonst blockieren.
    this.installUnlockListeners();
  }

  // Context wird beim ersten Klick/Touch erzeugt + entsperrt
  ensureContext() {
    if (this.audioContext) return this.audioContext;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      this.audioContext = new Ctx();
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
      return null;
    }
    return this.audioContext;
  }

  installUnlockListeners() {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      // 1) Context jetzt (innerhalb des Gesture-Callbacks) erzeugen
      const ctx = this.ensureContext();
      if (!ctx) return;

      // 2) iOS-Trick: KURZER, SYNCHRONER AudioBufferSourceNode mit
      //    leerem Buffer – das ist die zuverlässigste Methode, den
      //    Context auf iOS endgültig zu entsperren.
      try {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        if (typeof source.start === 'function') source.start(0);
        else if (typeof source.noteOn === 'function') source.noteOn(0);
      } catch (e) { /* ignore */ }

      // 3) Resume falls suspended
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        ctx.resume().catch(() => {});
      }

      if (this.unlocked) return;
      this.unlocked = true;

      // Listener cleanup
      window.removeEventListener('click', unlock, true);
      window.removeEventListener('touchstart', unlock, true);
      window.removeEventListener('touchend', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      window.removeEventListener('pointerdown', unlock, true);
    };

    // passive:false bei touchstart, damit es ggf. synchronen Audio-Trigger zulässt
    window.addEventListener('click', unlock, true);
    window.addEventListener('touchstart', unlock, { capture: true, passive: true });
    window.addEventListener('touchend', unlock, { capture: true, passive: true });
    window.addEventListener('keydown', unlock, true);
    window.addEventListener('pointerdown', unlock, true);

    // Bei Tab-Wechsel auf iOS wird der Context oft "interrupted" -
    // beim Zurückkommen direkt wieder aufwecken.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.audioContext &&
          this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
    });
  }

  ensureRunning() {
    const ctx = this.ensureContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      ctx.resume().catch(() => {});
    }
    return true;
  }

  // 🎮 MODERNER ACHIEVEMENT SOUND - Game Level-Up Style
  playWeekDoneSound() {
    if (!this.ensureRunning()) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    // 1. Bass-Punch
    const kick = ctx.createOscillator();
    const kickGain = ctx.createGain();
    kick.type = 'sine';
    kick.frequency.setValueAtTime(140, now);
    kick.frequency.exponentialRampToValueAtTime(45, now + 0.13);
    kickGain.gain.setValueAtTime(0.0, now);
    kickGain.gain.linearRampToValueAtTime(0.55, now + 0.005);
    kickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    kick.connect(kickGain).connect(master);
    kick.start(now);
    kick.stop(now + 0.2);

    // 2. Rising Sweep
    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    const sweepFilter = ctx.createBiquadFilter();
    sweep.type = 'sawtooth';
    sweep.frequency.setValueAtTime(180, now);
    sweep.frequency.exponentialRampToValueAtTime(1800, now + 0.22);
    sweepFilter.type = 'lowpass';
    sweepFilter.frequency.setValueAtTime(800, now);
    sweepFilter.frequency.exponentialRampToValueAtTime(4000, now + 0.22);
    sweepFilter.Q.value = 6;
    sweepGain.gain.setValueAtTime(0.0, now);
    sweepGain.gain.linearRampToValueAtTime(0.22, now + 0.05);
    sweepGain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
    sweep.connect(sweepFilter).connect(sweepGain).connect(master);
    sweep.start(now);
    sweep.stop(now + 0.3);

    // 3. Major Chord Stab (C5, E5, G5, C6) - Triumph
    const chordStart = now + 0.12;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t0 = chordStart + i * 0.018;
      g.gain.setValueAtTime(0.0, t0);
      g.gain.linearRampToValueAtTime(0.18, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
      osc.connect(g).connect(master);
      osc.start(t0);
      osc.stop(t0 + 0.6);

      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      const filt = ctx.createBiquadFilter();
      osc2.type = 'sawtooth';
      osc2.frequency.value = freq;
      filt.type = 'lowpass';
      filt.frequency.value = 2500;
      g2.gain.setValueAtTime(0.0, t0);
      g2.gain.linearRampToValueAtTime(0.06, t0 + 0.012);
      g2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);
      osc2.connect(filt).connect(g2).connect(master);
      osc2.start(t0);
      osc2.stop(t0 + 0.5);
    });

    // 4. Sparkle Top
    const sparkleStart = now + 0.25;
    [2093, 2637, 3136, 4186].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t0 = sparkleStart + i * 0.04;
      g.gain.setValueAtTime(0.0, t0);
      g.gain.linearRampToValueAtTime(0.09, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
      osc.connect(g).connect(master);
      osc.start(t0);
      osc.stop(t0 + 0.4);
    });

    // 5. Sub Tail
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(80, now + 0.12);
    sub.frequency.exponentialRampToValueAtTime(55, now + 0.6);
    subGain.gain.setValueAtTime(0.0, now + 0.12);
    subGain.gain.linearRampToValueAtTime(0.25, now + 0.14);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    sub.connect(subGain).connect(master);
    sub.start(now + 0.12);
    sub.stop(now + 0.7);
  }

  // 💀 DRAMATISCHER FAILED SOUND - "Game Over / Try Again" Style
  // Inverses Pendant zum Done-Sound:
  //  1. Crash-Impact (Distortion + Sub-Boom)   - t=0,    direkter Schlag
  //  2. Falling Sweep (Absturz)                - t=0,    Saw fällt
  //  3. Minor Chord Stab (C5, Eb5, G5)         - t=0.08, düster
  //  4. Dark Sub-Drone (Bedrohung)             - t=0,    tiefer Drone
  //  5. Distorted Buzzer Tail (Versagen)       - t=0.45, krachiger Schluss
  playWeekFailedSound() {
    if (!this.ensureRunning()) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(ctx.destination);

    // === 1. CRASH IMPACT (Sofortiger Schlag) ==========================
    // Noise-Burst gefiltert + Sub-Boom = "Crash"
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseData.length, 1.5);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseFilt = ctx.createBiquadFilter();
    noiseFilt.type = 'bandpass';
    noiseFilt.frequency.setValueAtTime(800, now);
    noiseFilt.frequency.exponentialRampToValueAtTime(150, now + 0.25);
    noiseFilt.Q.value = 0.8;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0, now);
    noiseGain.gain.linearRampToValueAtTime(0.35, now + 0.005);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    noise.connect(noiseFilt).connect(noiseGain).connect(master);
    noise.start(now);
    noise.stop(now + 0.3);

    // Sub-Boom (tiefer Aufprall)
    const boom = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(110, now);
    boom.frequency.exponentialRampToValueAtTime(35, now + 0.2);
    boomGain.gain.setValueAtTime(0.0, now);
    boomGain.gain.linearRampToValueAtTime(0.6, now + 0.005);
    boomGain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
    boom.connect(boomGain).connect(master);
    boom.start(now);
    boom.stop(now + 0.3);

    // === 2. FALLING SWEEP (Absturz, gespiegelt zum Done-Sweep) ========
    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    const sweepFilter = ctx.createBiquadFilter();
    sweep.type = 'sawtooth';
    sweep.frequency.setValueAtTime(1200, now);
    sweep.frequency.exponentialRampToValueAtTime(120, now + 0.5);
    sweepFilter.type = 'lowpass';
    sweepFilter.frequency.setValueAtTime(3500, now);
    sweepFilter.frequency.exponentialRampToValueAtTime(500, now + 0.5);
    sweepFilter.Q.value = 8;
    sweepGain.gain.setValueAtTime(0.0, now);
    sweepGain.gain.linearRampToValueAtTime(0.18, now + 0.02);
    sweepGain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
    sweep.connect(sweepFilter).connect(sweepGain).connect(master);
    sweep.start(now);
    sweep.stop(now + 0.6);

    // === 3. MINOR CHORD STAB (C5, Eb5, G5) - Düstere Harmonie =========
    const chordStart = now + 0.08;
    [523.25, 622.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      // Leichtes Detune nach unten = "krank" / "schief"
      osc.detune.value = -8;
      const t0 = chordStart + i * 0.025;
      g.gain.setValueAtTime(0.0, t0);
      g.gain.linearRampToValueAtTime(0.16, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.7);
      osc.connect(g).connect(master);
      osc.start(t0);
      osc.stop(t0 + 0.75);

      // Saw-Layer für mehr Aggression
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      const filt = ctx.createBiquadFilter();
      osc2.type = 'sawtooth';
      osc2.frequency.value = freq;
      osc2.detune.value = -8;
      filt.type = 'lowpass';
      filt.frequency.value = 1500;
      g2.gain.setValueAtTime(0.0, t0);
      g2.gain.linearRampToValueAtTime(0.07, t0 + 0.015);
      g2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
      osc2.connect(filt).connect(g2).connect(master);
      osc2.start(t0);
      osc2.stop(t0 + 0.6);
    });

    // === 4. DARK SUB-DRONE (Bedrohliche Wärme) ========================
    const drone = ctx.createOscillator();
    const droneGain = ctx.createGain();
    drone.type = 'sine';
    drone.frequency.setValueAtTime(65, now);
    drone.frequency.exponentialRampToValueAtTime(40, now + 0.9);
    droneGain.gain.setValueAtTime(0.0, now);
    droneGain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    droneGain.gain.linearRampToValueAtTime(0.18, now + 0.5);
    droneGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    drone.connect(droneGain).connect(master);
    drone.start(now);
    drone.stop(now + 1.05);

    // === 5. DISTORTED BUZZER TAIL (Krachiger Schluss) =================
    const buzzer = ctx.createOscillator();
    const buzzerGain = ctx.createGain();
    const buzzerFilt = ctx.createBiquadFilter();
    buzzer.type = 'square';
    buzzer.frequency.setValueAtTime(95, now + 0.45);
    buzzer.frequency.linearRampToValueAtTime(70, now + 0.95);
    buzzerFilt.type = 'lowpass';
    buzzerFilt.frequency.value = 1200;
    buzzerFilt.Q.value = 3;
    buzzerGain.gain.setValueAtTime(0.0, now + 0.45);
    buzzerGain.gain.linearRampToValueAtTime(0.22, now + 0.48);
    buzzerGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    buzzer.connect(buzzerFilt).connect(buzzerGain).connect(master);
    buzzer.start(now + 0.45);
    buzzer.stop(now + 1.05);
  }
}

// Singleton
const soundEffects = new SoundEffects();

// SESSION-Tracking für Failed (1× pro Woche)
const SOUND_STORAGE_KEY = 'tracker_sound_played_session';

function getSoundPlayedData() {
  try {
    const data = sessionStorage.getItem(SOUND_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.warn('Failed to read sound tracking data:', e);
    return {};
  }
}

function setSoundPlayedData(data) {
  try {
    sessionStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save sound tracking data:', e);
  }
}

export function shouldPlayWeekFailedSound(userId, weekNumber) {
  const key = `failed_${userId}_${weekNumber}`;
  const data = getSoundPlayedData();
  return !data[key];
}

export function markWeekFailedSoundPlayed(userId, weekNumber) {
  const key = `failed_${userId}_${weekNumber}`;
  const data = getSoundPlayedData();
  data[key] = Date.now();
  setSoundPlayedData(data);
}

export function playWeekDoneSound() {
  soundEffects.playWeekDoneSound();
}

export function playWeekFailedSound() {
  soundEffects.playWeekFailedSound();
}