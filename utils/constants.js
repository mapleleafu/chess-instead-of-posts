const POST_CLASS_NAME = ".scaffold-finite-scroll";
const DROPDOWN_ID = "#ember36";
const LAYOUT_ASIDE = ".scaffold-layout__aside";
const LAYOUT_SIDEBAR = ".scaffold-layout__sidebar";
const RELEASE_DATE = new Date('2025-05-25').getTime();
const DEFAULT_PUZZLE_RATING = 1500;
const DEBUG_MODE = false;

const SOUND_PATHS = {
  Move: "static/sounds/Move.mp3",
  Capture: "static/sounds/Capture.mp3",
  Victory: "static/sounds/Victory.mp3",
  Error: "static/sounds/Error.mp3",
};

const TIER_THRESHOLDS = [
  { min: 0, max: 800, icon: "🎯", color: "#94a3b8", name: "Beginner" },
  { min: 800, max: 1200, icon: "🥉", color: "#cd7f32", name: "Bronze" },
  { min: 1200, max: 1600, icon: "🥈", color: "#c0c0c0", name: "Silver" },
  { min: 1600, max: 2000, icon: "🥇", color: "#ffd700", name: "Gold" },
  { min: 2000, max: 2400, icon: "💎", color: "#60a5fa", name: "Diamond" },
  { min: 2400, max: Infinity, icon: "👑", color: "#a855f7", name: "Master" },
];

const DIFFICULTY_ICONS = {
  Beginner: "🌱",
  Easy: "⚡",
  Medium: "🔥",
  Hard: "💪",
  Expert: "🚀",
  Master: "🏆",
};
