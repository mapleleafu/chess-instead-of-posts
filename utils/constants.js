const POST_CLASS_NAME = ".scaffold-finite-scroll";
const DROPDOWN_ID = "#ember36";
const LAYOUT_ASIDE = ".scaffold-layout__aside";
const LAYOUT_SIDEBAR = ".scaffold-layout__sidebar";
const RELEASE_DATE = new Date('2025-05-25').getTime();
const DEFAULT_PUZZLE_RATING = 1500;
const DEBUG_MODE = true;
const sounds = {
  Move: new Audio(chrome.runtime.getURL("static/sounds/Move.mp3")),
  Capture: new Audio(chrome.runtime.getURL("static/sounds/Capture.mp3")),
  Victory: new Audio(chrome.runtime.getURL("static/sounds/Victory.mp3")),
  Error: new Audio(chrome.runtime.getURL("static/sounds/Error.mp3")),
};
