let board = null;
let game = null;

function checkSite() {
  return window.location.href.includes("linkedin.com/feed");
}

function highlightSquare(square) {
  const squareEl = document.querySelector(`#board .square-${square}`);
  if (!squareEl) return;

  const hasPiece = squareEl.querySelector(".piece-417db") !== null;
  if (hasPiece) {
    squareEl.style.backgroundImage = "radial-gradient(transparent 0%, transparent 79%, rgba(20, 85, 0, 0.3) 80%)";
  } else {
    squareEl.style.backgroundImage = "radial-gradient(rgba(20, 85, 30, 0.5) 19%, rgba(0, 0, 0, 0) 20%)";
  }
}

function removeHighlight() {
  const squares = document.querySelectorAll("#board .square-55d63");
  squares.forEach((square) => {
    if (
      square.style.backgroundImage &&
      (square.style.backgroundImage.includes("rgba(20, 85, 30, 0.5)") ||
        square.style.backgroundImage.includes("rgba(20, 85, 0, 0.3)"))
    ) {
      square.style.backgroundImage = "";
    }
  });
}

function highlightCheck(square) {
  const squareEl = document.querySelector(`#board .square-${square}`);
  if (!squareEl) return;

  squareEl.style.backgroundImage =
    "radial-gradient(ellipse at center, rgb(255, 0, 0) 0%, rgb(231, 0, 0) 25%, rgba(169, 0, 0, 0) 89%, rgba(158, 0, 0, 0) 100%)";
}

function removeCheckHighlight() {
  const squares = document.querySelectorAll("#board .square-55d63");
  squares.forEach((square) => {
    if (square.style.backgroundImage && square.style.backgroundImage.includes("255, 0, 0")) {
      square.style.backgroundImage = "";
    }
  });
}

async function getDailyFen() {
  const startTime = performance.now();
  const result = await chrome.storage.local.get(["PUZZLES", "TOTAL_PUZZLES"]);

  //TODO: Retry fetching result.PUZZLES from storage; if it fails, load puzzles into storage.

  const today = new Date().setHours(0, 0, 0, 0);
  const daysSinceRelease = Math.floor((today - RELEASE_DATE) / (1000 * 60 * 60 * 24));
  const puzzleIndex = daysSinceRelease % result.TOTAL_PUZZLES;

  const response = result.PUZZLES[puzzleIndex].fen;
  const endTime = performance.now();
  console.log(`getDailyFen took ${endTime - startTime} ms`);
  return response;
}

function createChessboard(fenCode) {
  const mainFeed = document.querySelector("main");
  if (!mainFeed) return;

  const existingScroll = document.querySelector(postClassName);
  if (existingScroll) {
    existingScroll.remove();
  }

  const ChessConstructor = Chess || window.Chess;

  if (!ChessConstructor || typeof window.Chessboard === "undefined") {
    setTimeout(createChessboard, 1000);
    return;
  }

  const existing = document.getElementById("chess-container");
  if (existing) existing.remove();

  const boardContainer = document.createElement("div");
  boardContainer.id = "chess-container";
  boardContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    background: gray;
    border-radius: 8px;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.15);
    margin: 20px auto;
    max-width: 500px;
  `;

  const style = document.createElement("style");
    // TODO: fix ".piece-417db.opponent-piece"
  style.textContent = `
    .piece-417db {
      z-index: 9998 !important;
    }
    .piece-417db.dragging-piece {
      z-index: 9999 !important;
    }
    /* Pointer cursor only on draggable pieces */
    .piece-417db {
      cursor: pointer;
    }
    /* Default cursor on empty squares */
    #board .square-55d63 {
      cursor: default;
    }
    /* Not-allowed cursor on opponent pieces */
    .piece-417db.opponent-piece {
      cursor: not-allowed;
    }
  `;
  document.head.appendChild(style);

  boardContainer.innerHTML = `
    <div id="board" style="width: 400px;"></div>
    <div style="margin-top: 20px;">
      <button id="flipBtn" style="padding: 10px 20px; margin: 5px; cursor: pointer; background: white;">Flip Board</button>
      <button id="zenBtn" style="padding: 10px 20px; margin: 5px; cursor: pointer; background: white;">Zen Mode</button>
    </div>
    <div id="status" style="margin-top: 10px;"></div>
  `;

  mainFeed.appendChild(boardContainer);

  game = new ChessConstructor();
  game.load(fenCode);

  const config = {
    draggable: true,
    position: game.fen(),
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    pieceTheme: function (piece) {
      return chrome.runtime.getURL(`libs/img/chesspieces/${piece}.png`);
    },
  };

  board = window.Chessboard("board", config);

  document.getElementById("flipBtn").addEventListener("click", () => {
    board.flip();
  });

  document.getElementById("zenBtn").addEventListener("click", () => {
    toggleZenMode();
  });

  updateStatus();
}

function toggleZenMode() {
  const zenMode = document.getElementById("zenMode");
  const chessContainer = document.getElementById("chess-container");

  if (zenMode) {
    const mainFeed = document.querySelector("main");
    mainFeed.appendChild(chessContainer);
    zenMode.remove();
    document.body.style.overflow = "auto";
  } else {
    const zenContainer = document.createElement("div");
    zenContainer.id = "zenMode";
    zenContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      z-index: 9999;
      display: flex;
      justify-content: center;
      align-items: center;
    `;

    zenContainer.appendChild(chessContainer);
    document.body.appendChild(zenContainer);
    document.body.style.overflow = "hidden";

    zenContainer.addEventListener("click", (e) => {
      if (e.target === zenContainer) {
        toggleZenMode();
      }
    });
  }
}

function onDragStart(square, piece, position, orientation) {
  if (game.game_over()) return false;

  // Only pick up pieces for the side to move
  if ((game.turn() === "w" && piece.search(/^b/) !== -1) || (game.turn() === "b" && piece.search(/^w/) !== -1)) {
    return false;
  }

  const moves = game.moves({
    square: square,
    verbose: true,
  });

  if (moves.length === 0) return;

  const isInCheck = game.in_check();
  const kingSquare = getKingSquare(game.turn());

  for (let i = 0; i < moves.length; i++) {
    if (moves[i].from !== square) continue;
    if (moves[i].to !== kingSquare || !isInCheck) {
      highlightSquare(moves[i].to);
    }
  }
}

function onDrop(square, target) {
  removeHighlight();

  const move = game.move({
    from: square,
    to: target,
    promotion: "q",
  });

  if (move === null) return "snapback"; // Illegal move

  removeCheckHighlight();
  updateStatus();
}

function onSnapEnd() {
  board.position(game.fen());
}

function getKingSquare(color) {
  const board = game.board();
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece && piece.type === "k" && piece.color === color) {
        // Convert rank/file to square notation (e.g., e1, e8)
        const files = "abcdefgh";
        const ranks = "87654321";
        return files[file] + ranks[rank];
      }
    }
  }
  return null;
}

function getSquareBackground(square) {
  const squareEl = document.querySelector(`#board .square-${square}`);
  if (!squareEl) return null;

  return squareEl.style.background || "";
}

function updateStatus() {
  const status = document.getElementById("status");

  let statusText = "";
  let moveColor = "White";

  if (game.turn() === "b") {
    moveColor = "Black";
  }

  if (game.in_checkmate()) {
    statusText = "Game over, " + moveColor + " is in checkmate.";
  } else if (game.in_draw()) {
    statusText = "Game over, drawn position";
  } else {
    statusText = moveColor + " to move";
    if (game.in_check()) {
      statusText += ", " + moveColor + " is in check";
      const kingSquare = getKingSquare(game.turn());
      if (kingSquare) {
        highlightCheck(kingSquare);
      }
    }
  }

  status.textContent = statusText;
}

const observer = new MutationObserver((mutations) => {
  if (!checkSite()) return;

  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (
        node instanceof Element &&
        (node?.matches(postClassName) || node?.matches(dropdownId) || node?.matches(layoutAside))
      ) {
        console.log(`Detected mutation for ${node.tagName} with class ${node.className}`);
        const mutationDetected = true;
        main(mutationDetected);
      }
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

function applySettings(settings, mutationDetected = false) {
  if (settings?.autoZenMode && !mutationDetected) {
    toggleZenMode();
  }

  if (settings?.hideLayoutAside) {
    const layoutRef = document.querySelector(layoutAside);
    if (layoutRef) layoutRef.remove();
  }
}

async function main(mutationDetected = false) {
  if (!checkSite()) return;
  const { settings } = await chrome.storage.local.get("settings");

  // TODO: add settings to either show or hide posts while having puzzles disabled
  if (settings?.dailyPuzzlesDisabled) return;

  createChessboard(await getDailyFen());
  applySettings(settings, mutationDetected);
}

main();
