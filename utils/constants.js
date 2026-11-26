const LINKEDIN_FEED_SELECTOR =
  '.scaffold-finite-scroll__content[data-finite-scroll-hotkey-context="FEED"], [componentkey="container-update-list_mainFeed-lazy-container"], [componentkey*="FeedType_MAIN_FEED_RELEVANCE"], [data-testid="mainFeed"] [role="listitem"]';
const LINKEDIN_FEED_ENTRY =
  '.share-box-feed-entry__closed-share-box, [componentkey="container-update-list_mainFeed-lazy-container"] > div:first-child, [componentkey="container-update-list_mainFeed-lazy-container"] > div:nth-child(3)';
const LINKEDIN_FEED_DROPDOWN = ".artdeco-dropdown:has(.feed-index-sort-border)";

const LAYOUT_ASIDE = '.scaffold-layout__aside, aside[aria-label="Aside"]';
const LAYOUT_SIDEBAR = '.scaffold-layout__sidebar, aside[aria-label="Sidebar"]';
const POST_CLASS_NAME =
  '.scaffold-finite-scroll, [componentkey="container-update-list_mainFeed-lazy-container"], [componentkey="container-update-list_mainFeed-lazy-container"] [role="progressbar"], [componentkey*="FeedType_MAIN_FEED_RELEVANCE"], [data-testid="mainFeed"] [role="listitem"]';

const RELEASE_DATE = new Date("2025-08-01").getTime();
const DEFAULT_PUZZLE_RATING = 1500;
const DEBUG_MODE = false;

const DEFAULT_SETTINGS = {
  extensionDisabled: false,
  dailyPuzzlesDisabled: false,
  puzzleMode: 'adaptive', // 'adaptive', 'daily'
  soundVolume: 30,
  soundsDisabled: false,
  autoZenMode: false,
  hideFeedEntry: true,
  hideDropdown: true,
  hideLayoutAside: true,
  hideSidebar: true
};

const SOUND_PATHS = {
  Move: "static/sounds/Move.mp3",
  Capture: "static/sounds/Capture.mp3",
  Victory: "static/sounds/Victory.mp3",
  Error: "static/sounds/Error.mp3",
};

const TIER_THRESHOLDS = [
  { min: 0, max: 1199, icon: "🎯", color: "#94a3b8", name: "Beginner" },
  { min: 1200, max: 1399, icon: "🥉", color: "#cd7f32", name: "Novice" },
  { min: 1400, max: 1599, icon: "🥈", color: "#c0c0c0", name: "Intermediate" },
  { min: 1600, max: 1799, icon: "🥇", color: "#ffd700", name: "Advanced" },
  { min: 1800, max: 1999, icon: "💎", color: "#b91c1c", name: "Expert" },
  { min: 2000, max: 2199, icon: "⚔️", color: "#7c3aed", name: "Master" },
  { min: 2200, max: 2399, icon: "🏆", color: "#0891b2", name: "International Master" },
  { min: 2400, max: Infinity, icon: "👑", color: "#dc2626", name: "Grandmaster" },
];

const DIFFICULTY_ICONS = {
  Beginner: "🌱",
  Easy: "⚡",
  Medium: "🔥",
  Hard: "💪",
  Expert: "🚀",
  Master: "🏆",
};
