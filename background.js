chrome.runtime.onInstalled.addListener(() => {
  fetch(chrome.runtime.getURL("static/puzzles.csv"))
    .then((response) => response.text())
    .then((csv) => {
      const PUZZLES = parseCSV(csv);
      chrome.storage.local.set({ PUZZLES, TOTAL_PUZZLES: PUZZLES.length });
    });
});

function parseCSV(csv) {
  const lines = csv.split("\n");
  const puzzles = lines
    .slice(1) // skip header
    .filter((line) => line.trim())
    .map((line) => {
      const [id, fen, moves] = line.split(",");
      return { id, fen, moves };
    });
  return puzzles;
}
