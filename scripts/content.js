const maxRetries = 5;
let tryCount = 0;
let board = null;
let game = null;

const whiteSquareGrey = "rgba(169, 169, 169, 1)";
const blackSquareGrey = "rgba(105, 105, 105, 1)";
const checkSquareRed =
  "radial-gradient(ellipse at center, rgb(255, 0, 0) 0%, rgb(231, 0, 0) 25%, rgba(169, 0, 0, 0) 89%, rgba(158, 0, 0, 0) 100%)";

function checkSite() {
  return window.location.href.includes("linkedin.com/feed");
}

function putGreySquare(square) {
  const squareEl = document.querySelector(`#board .square-${square}`);
  if (!squareEl) return;

  let background = whiteSquareGrey;
  if (squareEl.classList.contains("black-3c85d")) {
    background = blackSquareGrey;
  }

  squareEl.style.background = background;
}

function putRedSquare(square) {
  const squareEl = document.querySelector(`#board .square-${square}`);
  if (!squareEl) return;

  squareEl.style.background = checkSquareRed;
}

function removeGreySquares() {
  const squares = document.querySelectorAll("#board .square-55d63");
  squares.forEach((square) => {
    const bg = square.style.background;
    if (bg.includes("169, 169, 169") || bg.includes("105, 105, 105")) {
      square.style.background = "";
    }
  });
}

function removeRedSquares() {
  const squares = document.querySelectorAll("#board .square-55d63");
  squares.forEach((square) => {
    if (square.style.background.includes("255, 0, 0")) {
      square.style.background = "";
    }
  });
}

async function main() {
  if (!checkSite()) return;
  createChessboard();
}

function createChessboard() {
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
      z-index: 10000 !important;
    }
    .piece-417db.dragging-piece {
      z-index: 10001 !important;
    }
  `;
  document.head.appendChild(style);

  boardContainer.innerHTML = `
    <div id="board" style="width: 400px"></div>
    <div style="margin-top: 20px;">
      <button id="resetBtn" style="padding: 10px 20px; margin: 5px; cursor: pointer; background: white;">Reset</button>
      <button id="flipBtn" style="padding: 10px 20px; margin: 5px; cursor: pointer; background: white;">Flip Board</button>
      <button id="zenBtn" style="padding: 10px 20px; margin: 5px; cursor: pointer; background: white;">Zen Mode</button>
    </div>
    <div id="status" style="margin-top: 10px;"></div>
  `;

  mainFeed.appendChild(boardContainer);

  game = new ChessConstructor();
  game.load("1k6/1qn5/1ppp4/8/8/4PPP1/4RN2/5K2 b - - 0 1");

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

  document.getElementById("resetBtn").addEventListener("click", () => {
    game.reset();
    board.start();
    updateStatus();
  });

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
    
    zenContainer.addEventListener('click', (e) => {
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
  if (square !== kingSquare || !isInCheck) {
    putGreySquare(square);
  }

  for (let i = 0; i < moves.length; i++) {
    if (moves[i].to !== kingSquare || !isInCheck) {
      putGreySquare(moves[i].to);
    }
  }
}

function onDrop(square, target) {
  removeGreySquares();

  const move = game.move({
    from: square,
    to: target,
    promotion: "q",
  });

  if (move === null) return "snapback"; // Illegal move

  removeRedSquares();
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
        putRedSquare(kingSquare);
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
        (node?.matches(postClassName) || node?.matches(dropdownId) || node?.matches(sidebarClass))
      ) {
        console.log(`Detected mutation for ${node.tagName} with class ${node.className}`);
        main();
      }
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

main();
