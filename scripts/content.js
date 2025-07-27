let board = null;
let game = null;
let puzzleMoves = null;
let currentMoveIndex = 0;
let statusText = "";

function checkSite() {
  return window.location.href.includes("linkedin.com/feed");
}

function highlightSquare(square) {
  const squareEl = document.querySelector(`#board .square-${square}`);
  if (!squareEl) return;

  const hasPiece = squareEl.querySelector(".piece-417db") !== null;
  squareEl.classList.add(hasPiece ? "move-dest" : "piece-capture");
}

function removeHighlights() {
  document.querySelectorAll("#board .square-55d63").forEach((square) => {
    square.classList.remove("move-dest", "piece-capture");
  });
}

function removeLastMoveHighlight() {
  document.querySelectorAll("#board .square-55d63").forEach((square) => {
    square.classList.remove("last-move");
  });
}

function removeCheckHighlight() {
  document.querySelectorAll("#board .square-55d63").forEach((square) => {
    square.classList.remove("check");
  });
}

function highlightCheck(square) {
  const squareEl = document.querySelector(`#board .square-${square}`);
  if (squareEl) squareEl.classList.add("check");
}

function highlightLastMove(from, to) {
  removeLastMoveHighlight();
  [from, to].forEach((square) => {
    const squareEl = document.querySelector(`#board .square-${square}`);
    if (squareEl) squareEl.classList.add("last-move");
  });
}

function handleCheckHighlights() {
  removeCheckHighlight();

  if (game.in_check()) {
    const kingSquare = getKingSquare(game.turn());
    if (kingSquare) {
      highlightCheck(kingSquare);
    }
  }
}

async function getDailyChess() {
  //TODO: figure out if loading in memory makes the most sense.

  let result = await chrome.storage.local.get(["PUZZLES", "TOTAL_PUZZLES"]);

  if (!result.PUZZLES || !result.TOTAL_PUZZLES) {
    console.log("Puzzles not in storage, retrying...");

    for (let i = 0; i < 3; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      result = await chrome.storage.local.get(["PUZZLES", "TOTAL_PUZZLES"]);
      if (result.PUZZLES && result.TOTAL_PUZZLES) break;
    }

    if (!result.PUZZLES || !result.TOTAL_PUZZLES) {
      console.log("Loading puzzles from CSV as fallback...");
      const response = await fetch(chrome.runtime.getURL("static/puzzles.csv"));
      const csvText = await response.text();
      const lines = csvText
        .split("\n")
        .slice(1)
        .filter((line) => line.trim());

      const puzzles = lines.map((line) => {
        const [id, fen, moves] = line.split(",");
        return { id, fen, moves };
      });

      await chrome.storage.local.set({
        PUZZLES: puzzles,
        TOTAL_PUZZLES: puzzles.length,
      });

      result = { PUZZLES: puzzles, TOTAL_PUZZLES: puzzles.length };
    }
  }

  const today = new Date().setHours(0, 0, 0, 0);
  const daysSinceRelease = Math.floor((today - RELEASE_DATE) / (1000 * 60 * 60 * 24));
  const puzzleIndex = daysSinceRelease % result.TOTAL_PUZZLES;
  return result.PUZZLES[puzzleIndex];
}

function initiatePuzzle() {
  if (!puzzleMoves || puzzleMoves.length === 0) return;

  currentMoveIndex = 0;
  isPuzzleMode = true;

  new Promise((resolve) => {
    setTimeout(() => {
      makeOpponentMove(puzzleMoves[0]);
      resolve();
    }, 700);
  }).then(() => {
    // Allow user to make their first move after opponent's first move
    const boardContainer = document.getElementById("chess-container");
    if (boardContainer) boardContainer.style.pointerEvents = "auto";
  });
}

function makeOpponentMove(moveString) {
  if (!moveString) return;

  // Moves in puzzle format are like "e2e4", so we need to extract from/to
  const from = moveString.slice(0, 2);
  const to = moveString.slice(2, 4);
  makeMove(from, to, { checkMove: false, animate: true });
  currentMoveIndex++;
}

function makeMove(from, to, options = {}) {
  const { checkMove = false, animate = true } = options;

  removeHighlights();
  const move = game.move({
    from: from,
    to: to,
    promotion: "q",
  });

  //DEBUG
  //? move = {"color":"w","from":"g5","to":"d8","flags":"c","piece":"q","captured":"r","san":"Qxd8"}

  if (move === null) return "snapback"; // Illegal move

  if (isPuzzleMode && checkMove) {
    const isCorrect = checkUserMove(move);
    if (!isCorrect) {
      game.undo(); // Revert the move
      return "snapback";
    }
  }

  if (animate) {
    board.position(game.fen(), { animate: true });
  }

  handleCheckHighlights();
  highlightLastMove(from, to);
  updateStatusText();
  return;
}

function checkUserMove(userMove) {
  const expectedMove = puzzleMoves[currentMoveIndex];
  const userMoveString = userMove.from + userMove.to;

  if (userMoveString === expectedMove) {
    console.log("Correct move!");
    //TODO: put green checkmark on the piece
    currentMoveIndex++;

    if (currentMoveIndex >= puzzleMoves.length) {
      console.log("Puzzle solved!");
      isPuzzleMode = false;
      // TODO: update status text
      //TODO: save the puzzle as correct
      return true;
    }

    if (currentMoveIndex < puzzleMoves.length) {
      setTimeout(() => {
        makeOpponentMove(puzzleMoves[currentMoveIndex]);
      }, 500);
    }

    return true;
  } else {
    console.log(`Wrong move! Expected: ${expectedMove}, got: ${userMoveString}`);
    // TODO: put red cross on the piece
    // TODO: play the move and snap back after a short delay
    // TODO: save the puzzle as incorrect
    return false;
  }
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

  if (isPuzzleMode) {
    // Locking board interaction until opponent move is made
    boardContainer.style.pointerEvents = "none";
  }

  mainFeed.appendChild(boardContainer);

  game = new ChessConstructor();
  game.load(fenCode);

  // Opponent moves first in puzzles, so orientation is opposite of player's turn
  const orientation = fenCode.includes(" w ") ? "black" : "white";

  const config = {
    draggable: true,
    position: game.fen(),
    onDragStart: onDragStart,
    onDrop: onDrop,
    snapbackSpeed: 0,
    onSnapEnd: onSnapEnd,
    orientation: orientation,
    pieceTheme: function (piece) {
      return chrome.runtime.getURL(`libs/img/chesspieces/${piece}.png`);
    },
  };

  board = window.Chessboard("board", config);

  document.getElementById("flipBtn").addEventListener("click", () => {
    // TODO: Keep highlighted squares styles
    board.flip();
  });

  document.getElementById("zenBtn").addEventListener("click", () => {
    toggleZenMode();
  });
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
      z-index: 9995;
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
    if (moves[i].to !== kingSquare || !isInCheck) {
      highlightSquare(moves[i].to);
    }
  }
}

function onDrop(from, to) {
  const result = makeMove(from, to, { checkMove: true, animate: false });
  return result === "snapback" ? "snapback" : undefined;
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

function getMoveColor() {
  return game.turn() === "w" ? "White" : "Black";
}

function updateStatusText() {
  const status = document.getElementById("status");
  const moveColor = getMoveColor();

  if (!isPuzzleMode) {
    if (game.in_checkmate()) {
      statusText = `Game over, ${moveColor} is in checkmate.`;
    } else if (game.in_draw()) {
      statusText = "Game over, drawn position";
    } else if (game.in_check()) {
      statusText = `${moveColor} is in check.`;
    }
  } else {
    statusText = `${game.in_check() ? `${moveColor} is in check.` : ""} Find the best move for ${moveColor}.`;
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
  if (isPuzzleMode) initiatePuzzle();

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

  const dailyChess = await getDailyChess();
  console.log("Daily Chess Puzzle:", dailyChess);
  puzzleMoves = dailyChess.moves ? dailyChess.moves.split(" ") : [];

  createChessboard(dailyChess.fen);
  applySettings(settings, mutationDetected);
}

main();
