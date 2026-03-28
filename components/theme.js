// FinBuddy Dark Theme — Charcoal + Warm Gold
// "Headspace meets your best friend who's good with money"

export const T = {
  // Backgrounds
  bg: "#1A1A2E",
  bgGrad: ["#1A1A2E", "#16213E"],
  card: "#242442",
  cardBorder: "rgba(255,255,255,0.06)",

  // Primary accent — Warm Gold
  gold: "#E8B86D",
  goldLight: "#F0D090",
  goldDim: "rgba(232,184,109,0.15)",
  goldGlow: "rgba(232,184,109,0.4)",

  // Secondary — Teal (avatar, healthy)
  teal: "#7ECEC1",
  tealLight: "#B8F0E8",

  // Semantic
  green: "#4ADE80",
  amber: "#FBBF24",
  red: "#F87171",

  // Text
  text: "#F1F1F1",
  textSec: "#A0A0B8",
  textOnAccent: "#1A1A2E",

  // Sizing
  radius: 20,
  radiusSm: 14,
  radiusFull: 999,
  padCard: 24,
};

// Score / health color helper
export const scoreColor = (s) => (s >= 70 ? T.green : s >= 40 ? T.amber : T.red);

// Format INR
export const fmtINR = (n) => {
  const v = Number(n) || 0;
  if (v >= 100000) return `\u20B9${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `\u20B9${Math.round(v / 1000)}K`;
  return `\u20B9${v}`;
};

export const fmtFull = (n) => `\u20B9${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
