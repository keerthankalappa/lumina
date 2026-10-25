/** Colour fields for generative deck covers (keyed by the deck's `palette`). */
export const DECK_ART: Record<string, { sky: [string, string]; layers: string[]; sun?: string; motif: "hills" | "ribbons" | "sun" | "forest" | "lake" | "bloom" | "stones" }> = {
  "earth-dawn": { sky: ["#fbf3e6", "#f4e3cc"], layers: ["#d9a066", "#c27a4a", "#8fa58a", "#5f7f6e"], sun: "#f5b971", motif: "hills" },
  "sand-gold": { sky: ["#faf6ee", "#f3ead8"], layers: ["#d6a85b", "#b8894a", "#a9b8a0", "#e6c79a"], motif: "ribbons" },
  sunburst: { sky: ["#fff6ea", "#fde3c4"], layers: ["#f59e0b", "#fbbf77", "#fcd9a8", "#ffe9cf"], sun: "#ffb95f", motif: "sun" },
  forest: { sky: ["#dfe8d6", "#a7bd9a"], layers: ["#476b4f", "#2f513b", "#1f3b2a", "#f4e2b0"], sun: "#fbe8b5", motif: "forest" },
  "lake-dusk": { sky: ["#c9cdf0", "#8e95d6"], layers: ["#6f74c9", "#4c4f9e", "#2e3270", "#e1e0ff"], sun: "#f3f1ff", motif: "lake" },
  "peach-bloom": { sky: ["#fff4e8", "#fde0c8"], layers: ["#f6a96b", "#f3c19a", "#e98852", "#8fb08f"], motif: "bloom" },
  "stone-mist": { sky: ["#e9ece6", "#cfd6cf"], layers: ["#6d6a63", "#8a867c", "#a7a296", "#5b7563"], motif: "stones" },
};

export type StudioPalette = "dawn-amber" | "eucalyptus" | "twilight" | "solstice" | "midnight";
export type StudioAura = "luminous-glow" | "petal-waves" | "starlight" | "raw-parchment";
export type StudioTypography = "playfair" | "jakarta" | "classical";

/** Mantra card atmospheres for the Mindset Studio. */
export const STUDIO_PALETTES: Record<StudioPalette, { name: string; from: string; to: string; ink: string; accent: string; swatch: string }> = {
  "dawn-amber": { name: "Dawn Amber", from: "#fff3dc", to: "#fbd38d", ink: "#2a1700", accent: "#855300", swatch: "radial-gradient(circle at 35% 30%, #ffe3b5, #f59e0b)" },
  eucalyptus: { name: "Eucalyptus", from: "#e8fbf1", to: "#9fe6c4", ink: "#002114", accent: "#006c4a", swatch: "radial-gradient(circle at 35% 30%, #c8f8e0, #10b981)" },
  twilight: { name: "Twilight", from: "#eeeeff", to: "#b9baff", ink: "#07006c", accent: "#494bd6", swatch: "radial-gradient(circle at 35% 30%, #e1e0ff, #6366f1)" },
  solstice: { name: "Solstice", from: "#ffe9d6", to: "#f6a96b", ink: "#3b1d00", accent: "#b45309", swatch: "radial-gradient(circle at 35% 30%, #ffd2a8, #ea7a2b)" },
  midnight: { name: "Midnight", from: "#263143", to: "#0f172a", ink: "#f5f3ef", accent: "#ffb95f", swatch: "radial-gradient(circle at 35% 30%, #475569, #0f172a)" },
};

export const STUDIO_AURAS: Record<StudioAura, { name: string; icon: string }> = {
  "luminous-glow": { name: "Luminous Glow", icon: "flare" },
  "petal-waves": { name: "Petal Waves", icon: "waves" },
  starlight: { name: "Starlight", icon: "auto_awesome" },
  "raw-parchment": { name: "Raw Parchment", icon: "texture" },
};

export const STUDIO_TYPE: Record<StudioTypography, { name: string; family: string; italic: boolean; weight: number }> = {
  playfair: { name: "Playfair Poetic Serif", family: "Playfair Display", italic: false, weight: 500 },
  jakarta: { name: "Plus Jakarta Modern", family: "Plus Jakarta Sans", italic: false, weight: 600 },
  classical: { name: "Classical Contemplative", family: "Playfair Display", italic: true, weight: 400 },
};

export const MOODS = [
  { id: "grounded", label: "Grounded", emoji: "🌱", color: "#006c4a" },
  { id: "expansive", label: "Expansive", emoji: "☀️", color: "#f59e0b" },
  { id: "gentle", label: "Gentle", emoji: "🕊️", color: "#82f5c1" },
  { id: "reflective", label: "Reflective", emoji: "🌙", color: "#a7a9ff" },
  { id: "determined", label: "Determined", emoji: "⚡", color: "#855300" },
] as const;

export type MoodId = (typeof MOODS)[number]["id"];
