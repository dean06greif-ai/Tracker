import React from "react";
import { PersonSimpleRun, PersonSimpleBike, PersonSimpleSwim, PersonSimpleHike, Barbell } from "@phosphor-icons/react";

// Stick-figure SVG icons (currentColor). Sized via parent w-/h-/text-color classes.
const Stroke = ({ children, size = 24 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const PushupSvg = ({ size = 24 }) => (
  <Stroke size={size}>
    {/* Head (now on right side - mirrored) */}
    <circle cx="27" cy="13" r="2" />
    {/* Body diagonal: head -> hips -> heels (mirrored) */}
    <line x1="25" y1="13" x2="12" y2="17" />
    <line x1="12" y1="17" x2="3" y2="20" />
    {/* Straight arm down to ground */}
    <line x1="23" y1="14" x2="21" y2="24" />
    {/* Second (further) arm */}
    <line x1="18" y1="15" x2="16" y2="24" />
    {/* Heel tick */}
    <line x1="3" y1="20" x2="3" y2="24" />
  </Stroke>
);

const PullupSvg = ({ size = 24 }) => (
  <Stroke size={size}>
    {/* Bar */}
    <line x1="3" y1="5" x2="29" y2="5" />
    {/* Hands gripping (small ticks) */}
    <line x1="11" y1="3" x2="11" y2="7" />
    <line x1="21" y1="3" x2="21" y2="7" />
    {/* Arms bent up */}
    <polyline points="11,5 13,11 16,14" />
    <polyline points="21,5 19,11 16,14" />
    {/* Body */}
    <line x1="16" y1="14" x2="16" y2="23" />
    {/* Head */}
    <circle cx="16" cy="11.5" r="1.8" />
    {/* Legs slightly bent */}
    <polyline points="16,23 13,28" />
    <polyline points="16,23 19,28" />
  </Stroke>
);

const DipSvg = ({ size = 24 }) => (
  <Stroke size={size}>
    {/* Head */}
    <circle cx="16" cy="5" r="2.5" />
    {/* Forward-leaning body: neck -> hips at bar */}
    <polyline points="15,7.5 13,12 10,18" />
    {/* Both arms bent BEHIND body - elbow points back-up-right (behind the lean) */}
    <polyline points="14,10 21,14 14,18" />
    <polyline points="13,11 20,15 13,18" />
    {/* Horizontal bar at hip level */}
    <line x1="3" y1="18" x2="23" y2="18" />
    {/* Legs hanging below bar, bent at knee */}
    <polyline points="10,18 13,24 10,29" />
  </Stroke>
);

const SquatSvg = ({ size = 24 }) => (
  <Stroke size={size}>
    {/* Head (side view, facing right) */}
    <circle cx="20" cy="6" r="2.5" />
    {/* Body leaning forward */}
    <line x1="19" y1="8.5" x2="14" y2="16" />
    {/* Arm extended forward for balance */}
    <line x1="17" y1="11" x2="28" y2="11" />
    {/* Thigh: hip -> knee (going forward/down) */}
    <line x1="14" y1="16" x2="22" y2="22" />
    {/* Shin: knee -> ankle (going back/down) */}
    <line x1="22" y1="22" x2="16" y2="28" />
    {/* Foot tick — startet jetzt exakt am Shin-Ende (x=16), nicht mehr 2px daneben */}
    <line x1="16" y1="28" x2="21" y2="28" />
  </Stroke>
);

const HandstandSvg = ({ size = 24 }) => (
  <Stroke size={size}>
    {/* Hand ticks (kleine Markierungen — keine Bodenlinie) */}
    <line x1="9" y1="27" x2="9" y2="29" />
    <line x1="23" y1="27" x2="23" y2="29" />
    {/* Straight arms from hands up to shoulders */}
    <line x1="9" y1="29" x2="14" y2="19" />
    <line x1="23" y1="29" x2="18" y2="19" />
    {/* Head — face pointing DOWN (between shoulders) */}
    <circle cx="16" cy="22" r="2.2" />
    {/* Body going straight UP from shoulders to hips */}
    <line x1="16" y1="19" x2="16" y2="9" />
    {/* Legs straight up, slightly spread */}
    <line x1="16" y1="9" x2="12" y2="3" />
    <line x1="16" y1="9" x2="20" y2="3" />
  </Stroke>
);

const BikeSvg = ({ size = 24 }) => (
  <PersonSimpleBike size={size} weight="bold" />
);

const SwimSvg = ({ size = 24 }) => (
  <PersonSimpleSwim size={size} weight="bold" />
);

const RunSvg = ({ size = 24 }) => (
  <PersonSimpleRun size={size} weight="bold" />
);

// ============ NEUE ICONS (Erweiterung) ============

const SitupSvg = ({ size = 24 }) => (
  <Stroke size={size}>
    {/* Bodenlinie - Person sitzt komplett auf dem Boden */}
    <line x1="3" y1="24" x2="29" y2="24" strokeDasharray="2,2" />
    {/* Kopf - leicht angehoben links oben */}
    <circle cx="7" cy="11" r="2.2" />
    {/* Arme hinter dem Kopf verschränkt */}
    <polyline points="6,10 4,12 6,13.5" />
    {/* Oberkörper - schräg vom Kopf runter zum Po (auf dem Boden) */}
    <line x1="8" y1="12.5" x2="16" y2="23" />
    {/* Po / Hüfte am Boden (auf einer Linie mit den Füßen) */}
    <circle cx="16" cy="23" r="1" fill="currentColor" />
    {/* Oberschenkel hoch zum gebeugten Knie */}
    <line x1="16" y1="23" x2="22" y2="14" />
    {/* Unterschenkel runter zum Boden */}
    <line x1="22" y1="14" x2="25" y2="23" />
    {/* Fuß am Boden (auf gleicher Ebene wie der Po) */}
    <line x1="25" y1="23" x2="28" y2="23" />
  </Stroke>
);


const BurpeeSvg = ({ size = 24 }) => (
  <Stroke size={size}>
    {/* Kopf */}
    <circle cx="16" cy="6" r="2.2" />
    {/* Oberkörper */}
    <line x1="16" y1="8.2" x2="16" y2="19" />
    {/* Arme - Ellbogen nach außen abgespreizt, Fäuste am Bauch (Diamant-Form) */}
    <polyline points="16,10 9,14 15,16" />
    <polyline points="16,10 23,14 17,16" />
    {/* Fäuste am Bauch */}
    <circle cx="15" cy="16" r="0.8" fill="currentColor" />
    <circle cx="17" cy="16" r="0.8" fill="currentColor" />
    {/* Beine - leicht gespreizt */}
    <line x1="16" y1="19" x2="12" y2="26" />
    <line x1="16" y1="19" x2="20" y2="26" />
  </Stroke>
);

const JumpSvg = ({ size = 24 }) => (
  <Stroke size={size}>
    {/* Head */}
    <circle cx="16" cy="5" r="2.2" />
    {/* Body leicht nach vorne */}
    <line x1="16" y1="7.2" x2="15" y2="15" />
    {/* Beide Arme nach hinten (Schwung) */}
    <polyline points="15,10 10,12 8,17" />
    <polyline points="16,10 21,12 23,17" />
    {/* Oberschenkel angezogen */}
    <line x1="15" y1="15" x2="20" y2="20" />
    {/* Unterschenkel zurück (Knie gebeugt) */}
    <line x1="20" y1="20" x2="14" y2="23" />
  </Stroke>
);
const WalkSvg = ({ size = 24 }) => (
  <PersonSimpleHike size={size} weight="bold" />
);

const JumpRopeSvg = ({ size = 24 }) => (
  <Stroke size={size}>
    {/* Volles Springseil - großer Bogen oben über dem Kopf */}
    <path d="M 6 16 Q 16 2 26 16" />
    {/* Springseil - unterer Bogen unter den Füßen (geschlossener Loop) */}
    <path d="M 6 16 Q 16 30 26 16" strokeDasharray="2,2" />
    {/* Griffe links und rechts (kleine Punkte) */}
    <circle cx="6" cy="16" r="1.2" fill="currentColor" />
    <circle cx="26" cy="16" r="1.2" fill="currentColor" />
    {/* Kopf */}
    <circle cx="16" cy="8" r="2" />
    {/* Körper */}
    <line x1="16" y1="10" x2="16" y2="19" />
    {/* Arme zu den Griffen */}
    <line x1="16" y1="13" x2="6" y2="16" />
    <line x1="16" y1="13" x2="26" y2="16" />
    {/* Beine - leicht angezogen (Sprungposition) */}
    <line x1="16" y1="19" x2="13" y2="24" />
    <line x1="16" y1="19" x2="19" y2="24" />
  </Stroke>
);
const WallSitSvg = ({ size = 24 }) => (
  <Stroke size={size}>
    {/* Wand links — vertikale Linie */}
    <line x1="4" y1="3" x2="4" y2="29" />
    {/* Head — Rücken gegen Wand */}
    <circle cx="7" cy="7" r="2" />
    {/* Rücken gegen die Wand (vertikal nach unten) */}
    <line x1="7" y1="9" x2="7" y2="18" />
    {/* Oberschenkel — kürzer, horizontal nach rechts (90°) */}
    <line x1="7" y1="18" x2="16" y2="18" />
    {/* Unterschenkel — vertikal nach unten (90°) */}
    <line x1="16" y1="18" x2="16" y2="26" />
    {/* Arm liegt entspannt auf Oberschenkel */}
    <line x1="9" y1="16" x2="14" y2="17" />
    {/* Fuß */}
    <line x1="16" y1="26" x2="20" y2="26" />
  </Stroke>
);

const PlankSvg = ({ size = 24 }) => (
  <Stroke size={size}>
    {/* Head links */}
    <circle cx="5" cy="13" r="2" />
    {/* Body — horizontal, leicht nach unten geneigt */}
    <line x1="7" y1="13" x2="27" y2="17" />
    {/* Unterarm 1 — vertikal vom Boden zur Schulter (Ellbogen am Boden) */}
    <line x1="8" y1="21" x2="9" y2="13.5" />
    {/* Unterarm-Tick (Ellbogen am Boden) */}
    <line x1="6" y1="21" x2="11" y2="21" />
    {/* Zweiter Unterarm */}
    <line x1="13" y1="21" x2="14" y2="14" />
    {/* Füße / Zehen */}
    <line x1="27" y1="17" x2="27" y2="21" />
  </Stroke>
);

const HollowHoldSvg = ({ size = 24 }) => (
  <Stroke size={size}>
    {/* Head - leicht angehoben */}
    <circle cx="8" cy="16" r="1.8" />
    {/* Arme gestreckt nach oben/hinter Kopf */}
    <line x1="8" y1="16" x2="4" y2="12" />
    {/* Oberkörper/Rumpf leicht angehoben, Hintern am Boden */}
    <path d="M 10 16 Q 16 20 22 18" />
    {/* Hintern am Boden (Punkt) */}
    <circle cx="16" cy="20" r="0.8" fill="currentColor" />
    {/* Beine gestreckt, leicht angehoben */}
    <line x1="22" y1="18" x2="28" y2="16" />
    {/* Füße */}
    <line x1="28" y1="15" x2="28" y2="17" />
  </Stroke>
);

// ============ Registry ============

const REGISTRY = {
  // Core / "Default" 8 icons
  run: RunSvg,
  handstand: HandstandSvg,
  pushup: PushupSvg,
  pullup: PullupSvg,
  dip: DipSvg,
  squat: SquatSvg,
  bike: BikeSvg,
  swim: SwimSvg,
  // Extended 8 icons (sichtbar nach Aufklappen)
  situp: SitupSvg,
  burpee: BurpeeSvg,
  jump: JumpSvg,
  walk: WalkSvg,
  legraise: JumpRopeSvg,
  jumprope: JumpRopeSvg,
  wallsit: WallSitSvg,
  plank: PlankSvg,
  hollow: HollowHoldSvg,
};

// Welche Icons gehören zu welcher Gruppe (Settings Icon-Picker nutzt das)
export const CORE_ICON_KEYS = [
  "run", "handstand", "pushup", "pullup", "dip", "squat", "bike", "swim",
];
export const EXTENDED_ICON_KEYS = [
  "situp", "burpee", "jump", "walk", "jumprope", "wallsit", "plank", "hollow",
];

// Backwards-compat: alte Daten mit icon "sprint" oder "hspu" werden auf "handstand" gemappt
const ALIASES = {
  sprint: "handstand",
  hspu: "handstand",
  legraise: "jumprope",
};

export const ICON_KEYS = Object.keys(REGISTRY);

export default function ExerciseIcon({ icon = "pushup", size = 20, className = "" }) {
  const resolved = ALIASES[icon] || icon;
  const Cmp = REGISTRY[resolved] || REGISTRY.pushup;
  return <span className={className}><Cmp size={size} /></span>;
  }