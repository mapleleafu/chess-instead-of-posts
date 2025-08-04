chrome.runtime.onInstalled.addListener(() => {
  fetch(chrome.runtime.getURL("static/puzzles.csv"))
    .then(response => response.text())
    .then(csv => {
      const PUZZLES = parseCSV(csv);
      chrome.storage.local.set({ PUZZLES, TOTAL_PUZZLES: PUZZLES.length });
    });
});

function parseCSV(csv) {
  const lines = csv.split("\n");
  const puzzles = lines
    .slice(1)
    .filter(line => line.trim())
    .map(line => {
      const [id, fen, moves] = line.split(",");
      return { id, fen, moves };
    });
  return puzzles;
}

// Create offscreen document
chrome.runtime.onStartup.addListener(createOffscreen);
chrome.runtime.onInstalled.addListener(createOffscreen);

async function createOffscreen() {
  console.log("createOffscreen: Checking if offscreen document exists");
  if (await chrome.offscreen.hasDocument()) {
    console.log("createOffscreen: Offscreen document already exists");
    return;
  }

  console.log("createOffscreen: Creating new offscreen document");
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["WORKERS"],
    justification: "Run Stockfish chess engine",
  });
  console.log("createOffscreen: Offscreen document created successfully");
}

// Handle analysis requests
const analysisCallbacks = new Map();
let analysisTimeout = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("background: Received message:", request);

  if (request.type === "ANALYZE_POSITION") {
    console.log("background: Handling ANALYZE_POSITION request");

    const id = Date.now() + Math.random();
    analysisCallbacks.set(id, { callback: sendResponse, timestamp: Date.now() });

    // Clear any existing timeout
    if (analysisTimeout) {
      clearTimeout(analysisTimeout);
    }

    // Set a timeout for the analysis (30 seconds)
    analysisTimeout = setTimeout(() => {
      console.log("background: Analysis timed out");
      const callback = analysisCallbacks.get(id);
      if (callback) {
        callback.callback({ success: false, error: "Analysis timed out after 30 seconds" });
        analysisCallbacks.delete(id);
      }
    }, 30000);

    // Send commands to offscreen
    console.log("background: Sending position command to offscreen");
    chrome.runtime
      .sendMessage({
        type: "STOCKFISH_COMMAND",
        command: `position fen ${request.fen}`,
      })
      .catch(err => {
        console.log("background: Error sending position command:", err);
      });

    console.log("background: Sending go command to offscreen");
    chrome.runtime
      .sendMessage({
        type: "STOCKFISH_COMMAND",
        command: `go depth ${request.depth || 15}`,
      })
      .catch(err => {
        console.log("background: Error sending go command:", err);
      });

    return true; // Keep the message channel open for async response
  } else if (request.type === "STOCKFISH_MESSAGE") {
    console.log("background: Received STOCKFISH_MESSAGE:", request.message);
    handleStockfishMessage(request.message);
  }
});

function handleStockfishMessage(message) {
  console.log("background: Processing Stockfish message:", message);

  // Process analysis results and send back to content script
  if (message.startsWith("bestmove")) {
    console.log("background: Found bestmove in message");

    // Clear timeout
    if (analysisTimeout) {
      clearTimeout(analysisTimeout);
      analysisTimeout = null;
    }

    // Get the first callback (should only be one active at a time)
    const callbackEntry = Array.from(analysisCallbacks.values())[0];
    const callbackId = Array.from(analysisCallbacks.keys())[0];

    if (callbackEntry) {
      console.log("background: Found callback, sending response");

      const moveMatch = message.match(/bestmove (\w+)/);
      const bestMove = moveMatch ? moveMatch[1] : "";

      console.log("background: Extracted best move:", bestMove);

      const result = {
        success: true,
        result: {
          bestMove,
          evaluation: { centipawns: 0 }, // Default evaluation
          principalVariation: bestMove,
        },
      };

      console.log("background: Sending result to content script:", result);
      callbackEntry.callback(result);
      analysisCallbacks.delete(callbackId);
    } else {
      console.log("background: No callback found for bestmove");
    }
  } else if (message.includes("info")) {
    console.log("background: Received info message:", message);
    // Could extract evaluation info here if needed
  } else {
    console.log("background: Unhandled Stockfish message:", message);
  }
}
