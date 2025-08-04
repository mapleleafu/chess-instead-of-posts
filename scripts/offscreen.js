let engine = null;

console.log("offscreen: Script loaded, checking for Stockfish");

setTimeout(() => {
  if (typeof Stockfish !== "undefined") {
    console.log("offscreen: Stockfish found, initializing");
    
    try {
      engine = Stockfish();
      console.log("offscreen: Engine created:", typeof engine);
      
      if (engine && typeof engine.postMessage === 'function') {
        console.log("offscreen: Sending UCI commands");
        engine.postMessage("uci");
        engine.postMessage("isready");
      }
    } catch (error) {
      console.log("offscreen: Error initializing engine:", error);
    }
  }
}, 2000);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "STOCKFISH_COMMAND" && engine) {
    console.log("offscreen: Sending command:", request.command);
    engine.postMessage(request.command);
  }
});