const gameState = {
  board: null,
  game: null,
  puzzleMoves: null,
  puzzleId: null,
  puzzleFen: null,
  currentMoveIndex: 0,
  isBoardLocked: false,
  isPuzzleMode: true,
  puzzleStartTime: null,
  hasIncorrectMoves: false,
};

const sounds = {
  Move: new Audio(chrome.runtime.getURL("static/sounds/Move.mp3")),
  Capture: new Audio(chrome.runtime.getURL("static/sounds/Capture.mp3")),
  Victory: new Audio(chrome.runtime.getURL("static/sounds/Victory.mp3")),
  Error: new Audio(chrome.runtime.getURL("static/sounds/Error.mp3")),
};

const checkSite = () => window.location.href.includes("linkedin.com/feed");

const getMoveColor = () => (gameState.game.turn() === "w" ? "White" : "Black");

const getKingSquare = color => {
  const board = gameState.game.board();
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece && piece.type === "k" && piece.color === color) {
        const files = "abcdefgh";
        const ranks = "87654321";
        return files[file] + ranks[rank];
      }
    }
  }
  return null;
};

const highlightSquare = square => {
  const squareEl = document.querySelector(`#board .square-${square}`);
  if (!squareEl) return;
  const hasPiece = squareEl.querySelector(".piece-417db") !== null;
  squareEl.classList.add(hasPiece ? "move-dest" : "piece-capture");
};

const removeHighlights = () => {
  document.querySelectorAll("#board .square-55d63").forEach(square => {
    square.classList.remove("move-dest", "piece-capture");
  });
};

const highlightLastMove = (from, to) => {
  removeLastMoveHighlight();
  [from, to].forEach(square => {
    const squareEl = document.querySelector(`#board .square-${square}`);
    if (squareEl) {
      squareEl.classList.add("last-move");
    }
  });
};

const removeLastMoveHighlight = () => {
  document.querySelectorAll("#board .square-55d63").forEach(square => {
    square.classList.remove("last-move");
  });
};

const handleCheckHighlights = () => {
  removeCheckHighlight();
  if (gameState.game.in_check()) {
    const kingSquare = getKingSquare(gameState.game.turn());
    kingSquare && highlightCheck(kingSquare);
  }
};

const highlightCheck = square => {
  const squareEl = document.querySelector(`#board .square-${square}`);
  if (squareEl) squareEl.classList.add("check");
};

const removeCheckHighlight = () => {
  document.querySelectorAll("#board .square-55d63").forEach(square => {
    square.classList.remove("check");
  });
};

const savePuzzleAttempt = options => {
  const { fen, puzzleId, isSolved = false, timeSpentSeconds = 0 } = options || {};

  if (!fen || !puzzleId) return;

  chrome.storage.local.get("PUZZLE_ATTEMPTS", result => {
    const attempts = result.PUZZLE_ATTEMPTS || [];
    const existingIndex = attempts.findIndex(attempt => attempt.puzzleId === puzzleId);

    const attempt = {
      fen,
      puzzleId,
      isSolved,
      timestamp: new Date().toISOString(),
      timeSpentSeconds,
    };

    // Only save if attempt doesn't already exist
    if (existingIndex === -1) attempts.push(attempt);

    chrome.storage.local.set({ PUZZLE_ATTEMPTS: attempts });
  });
};

const putMark = (square, correct = true, animate = true) => {
  const squareEl = document.querySelector(`#board .square-${square}`);
  if (!squareEl) return;

  const existingMark = squareEl.querySelector(".mark");
  if (existingMark) existingMark.remove();

  const mark = document.createElement("div");
  mark.className = "mark";
  mark.classList.add(correct ? "correct" : "incorrect");
  if (!animate) mark.classList.add("no-animation");
  mark.innerHTML = correct ? "✓" : "✗";

  squareEl.appendChild(mark);
};

const removeMarks = () => {
  document.querySelectorAll("#board .mark").forEach(mark => mark.remove());
};

const toggleLockBoard = (lockBoard = null) => {
  const chessPieces = document.querySelectorAll(".piece-417db");
  if (!chessPieces) return;

  gameState.isBoardLocked = lockBoard !== null ? lockBoard : !gameState.isBoardLocked;
  chessPieces.forEach(piece => {
    piece.style.pointerEvents = gameState.isBoardLocked ? "none" : "auto";
  });
};

const playSound = soundName => {
  chrome.storage.local.get("settings", result => {
    const settings = result.settings || {};
    const sound = sounds[soundName];

    if (!sound || settings.soundsDisabled) return;

    sound.volume = (settings.soundVolume || 100) / 100;
    sound.play().catch(err => console.error("Error playing sound:", err));
  });
};

const updateBoardPosition = (fen, animate = true) => {
  gameState.board.position(fen, animate ? { animate: true } : false);
};

const updateStatus = text => {
  const status = document.getElementById("status");
  if (status) status.textContent = text;
};

const updateStatusText = () => {
  if (gameState.isPuzzleMode) return;

  const moveColor = getMoveColor();

  if (gameState.game.in_checkmate()) {
    updateStatus(`Game over, ${moveColor} is in checkmate.`);
  } else if (gameState.game.in_draw()) {
    updateStatus("Game over, drawn position");
  } else if (gameState.game.in_check()) {
    updateStatus(`${moveColor} is in check.`);
  } else {
    updateStatus(`${moveColor} to move.`);
  }
};

const getDailyChess = async () => {
  let result = await chrome.storage.local.get(["PUZZLES", "TOTAL_PUZZLES"]);

  if (!result.PUZZLES || !result.TOTAL_PUZZLES) {
    console.log("Puzzles not in storage, retrying...");

    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
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
        .filter(line => line.trim());

      const puzzles = lines.map(line => {
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
};

const initiatePuzzle = () => {
  if (!gameState.puzzleMoves || gameState.puzzleMoves.length === 0) return;

  gameState.currentMoveIndex = 0;
  gameState.isPuzzleMode = true;
  gameState.puzzleStartTime = Date.now();
  gameState.hasIncorrectMoves = false;
  toggleLockBoard(true);

  const playerColor = gameState.game.turn() === "b" ? "White" : "Black";
  updateStatus(`Your turn. Find the best move for ${playerColor}.`);

  setTimeout(() => {
    makeOpponentMove(gameState.puzzleMoves[0]);
    toggleLockBoard(false);
  }, 700);
};

const makeOpponentMove = moveString => {
  if (!moveString) return;

  const from = moveString.slice(0, 2);
  const to = moveString.slice(2, 4);
  executeMove(from, to, true);
  gameState.currentMoveIndex++;
};

const validateUserMove = move => {
  const expectedMove = gameState.puzzleMoves[gameState.currentMoveIndex];
  const userMoveString = move.from + move.to;

  if (userMoveString === expectedMove) {
    putMark(move.to, true);
    gameState.currentMoveIndex++;

    if (gameState.currentMoveIndex >= gameState.puzzleMoves.length) {
      playSound("Victory");
      updateStatus("Success! Puzzle completed.");
      gameState.isPuzzleMode = false;
      toggleLockBoard(false);
      
      if (!gameState.hasIncorrectMoves) {
        savePuzzleAttempt({
          fen: gameState.puzzleFen,
          puzzleId: gameState.puzzleId,
          isSolved: true,
          timeSpentSeconds: (Date.now() - gameState.puzzleStartTime) / 1000,
        });
      }
      return true;
    }

    updateStatus("Best move! Keep going...");
    setTimeout(() => makeOpponentMove(gameState.puzzleMoves[gameState.currentMoveIndex]), 500);
    return true;
  } else {
    playSound("Error");
    putMark(move.to, false);
    updateStatus("That's not the move! Try something else.");
    
    if (!gameState.hasIncorrectMoves) {
      gameState.hasIncorrectMoves = true;
      savePuzzleAttempt({
        fen: gameState.puzzleFen,
        puzzleId: gameState.puzzleId,
        isSolved: false,
        timeSpentSeconds: (Date.now() - gameState.puzzleStartTime) / 1000,
      });
    }
    return false;
  }
};

const handleIncorrectMove = (move, originalHighlights) => {
  toggleLockBoard(true);
  highlightLastMove(move.from, move.to);

  setTimeout(() => {
    gameState.game.undo();
    updateBoardPosition(gameState.game.fen());
    removeMarks();
    removeHighlights();
    removeLastMoveHighlight();
    highlightLastMove(...originalHighlights);
    handleCheckHighlights();
    updateStatusText();
    toggleLockBoard(false);
  }, 1000);
};

const executeMove = (from, to, animate = true) => {
  removeHighlights();
  const move = gameState.game.move({ from, to, promotion: "q" });
  if (!move) return null;

  move.captured ? playSound("Capture") : playSound("Move");

  removeMarks();

  if (animate) {
    updateBoardPosition(gameState.game.fen(), true);
  }

  handleCheckHighlights();
  highlightLastMove(from, to);
  updateStatusText();

  return move;
};

const makeMove = (from, to, options = {}) => {
  if (!document.getElementById("chess-container")) return "snapback";
  const { isUserMove = false, animate = true } = options;

  const originalHighlights = getHighlightedSquares();
  const move = executeMove(from, to, animate);
  if (!move) return "snapback";

  if (gameState.isPuzzleMode && isUserMove) {
    toggleLockBoard(true);
    const isCorrect = validateUserMove(move);

    if (!isCorrect) {
      handleIncorrectMove(move, originalHighlights);
      return;
    }

    toggleLockBoard(false);
  }

  return;
};

const onDragStart = (square, piece) => {
  if (gameState.game.game_over() || gameState.isBoardLocked) return false;

  // Only pick up pieces for the side to move
  if (
    (gameState.game.turn() === "w" && piece.search(/^b/) !== -1) ||
    (gameState.game.turn() === "b" && piece.search(/^w/) !== -1)
  ) {
    return false;
  }

  const moves = gameState.game.moves({ square, verbose: true });
  if (!moves.length) return false;

  moves.forEach(move => highlightSquare(move.to));
  return true;
};

const onDrop = (from, to) => {
  if (gameState.game.game_over() || gameState.isBoardLocked) return "snapback";

  const result = makeMove(from, to, { isUserMove: true, animate: false });
  return result === "snapback" ? "snapback" : undefined;
};

const onSnapEnd = () => {
  updateBoardPosition(gameState.game.fen(), false);
};

const getHighlightedSquares = () => {
  const squares = [];
  document.querySelectorAll("#board .last-move").forEach(square => {
    const match = square.className.match(/square-([a-h][1-8])/);
    if (match) squares.push(match[1]);
  });
  return squares;
};

const getMarksOnSquares = () => {
  const marks = {};
  document.querySelectorAll("#board .mark").forEach(mark => {
    const match = mark.parentElement.className.match(/square-([a-h][1-8])/);
    if (match) {
      marks[match[1]] = mark.classList.contains("correct") ? "correct" : "incorrect";
    }
  });
  return marks;
};

const createChessboard = fenCode => {
  const mainFeed = document.querySelector("main");
  if (!mainFeed) return;

  removeExistingElements();

  const ChessConstructor = Chess || window.Chess;
  if (!ChessConstructor || typeof window.Chessboard === "undefined") {
    setTimeout(() => createChessboard(fenCode), 1000);
    return;
  }

  const container = createBoardContainer();
  injectStyles();
  mainFeed.appendChild(container);

  initializeGame(fenCode);
  setupBoard(fenCode);
  attachEventListeners();
};

const removeExistingElements = () => {
  const existing = document.getElementById("chess-container");
  if (existing) existing.remove();

  const existingScroll = document.querySelector(postClassName);
  if (existingScroll) existingScroll.remove();
};

const createBoardContainer = () => {
  const container = document.createElement("div");
  container.id = "chess-container";
  container.style.cssText = `
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

  container.innerHTML = `
    <div id="board" style="width: 400px;"></div>
    <div style="margin-top: 20px;">
      <button id="flipBtn" style="padding: 10px 20px; margin: 5px; cursor: pointer; background: white;">Flip Board</button>
      <button id="zenBtn" style="padding: 10px 20px; margin: 5px; cursor: pointer; background: white;">Zen Mode</button>
    </div>
    <div id="status" style="margin-top: 10px;"></div>
  `;

  return container;
};

const injectStyles = () => {
  const style = document.createElement("style");
  style.textContent = `
    .piece-417db {
      z-index: 9998 !important;
      cursor: pointer;
    }
    .piece-417db.dragging-piece {
      z-index: 9999 !important;
    }
    #board .square-55d63 {
      cursor: default;
    }
    .mark {
      position: absolute;
      top: 0%;
      left: 90%;
      transform: translate(-50%, -50%);
      width: 25px;
      height: 25px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 18px;
      z-index: 10000;
      animation: markPop 0.2s ease-out;
    }
    .mark.no-animation {
      animation: none !important;
    }
    .mark.correct {
      background: #22ac38;
    }
    .mark.incorrect {
      background: red;
    }
    @keyframes markPop {
      0% { transform: translate(-50%, -50%) scale(0); }
      100% { transform: translate(-50%, -50%) scale(1); }
    }
  `;
  document.head.appendChild(style);
};

const initializeGame = fenCode => {
  const ChessConstructor = Chess || window.Chess;
  gameState.game = new ChessConstructor();
  gameState.game.load(fenCode);
};

const setupBoard = fenCode => {
  const orientation = fenCode.includes(" w ") ? "black" : "white";

  const config = {
    draggable: true,
    position: gameState.game.fen(),
    onDragStart,
    onDrop,
    snapbackSpeed: 0,
    onSnapEnd,
    orientation,
    pieceTheme: piece => chrome.runtime.getURL(`libs/img/chesspieces/${piece}.png`),
  };

  gameState.board = window.Chessboard("board", config);
};

const attachEventListeners = () => {
  document.getElementById("flipBtn").addEventListener("click", flipBoard);
  document.getElementById("zenBtn").addEventListener("click", toggleZenMode);
};

const flipBoard = () => {
  const highlightedSquares = getHighlightedSquares();
  const marks = getMarksOnSquares();

  gameState.board.flip();

  if (highlightedSquares.length) {
    highlightLastMove(...highlightedSquares);
  }

  Object.entries(marks).forEach(([square, correct]) => {
    putMark(square, correct === "correct", false);
  });
};

const toggleZenMode = () => {
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

    zenContainer.addEventListener("click", e => {
      if (e.target === zenContainer) toggleZenMode();
    });
  }
};

const applySettings = (settings, mutationDetected = false) => {
  if (gameState.isPuzzleMode) initiatePuzzle();

  if (settings?.autoZenMode && !mutationDetected) {
    toggleZenMode();
  }

  if (settings?.hideLayoutAside) {
    const layoutRef = document.querySelector(layoutAside);
    if (layoutRef) layoutRef.remove();
  }
};

const main = async (mutationDetected = false) => {
  if (!checkSite()) return;

  const { settings } = await chrome.storage.local.get("settings");
  if (settings?.dailyPuzzlesDisabled) return;

  const dailyChess = await getDailyChess();
  console.log("Daily Chess Puzzle:", dailyChess);

  gameState.puzzleMoves = dailyChess.moves ? dailyChess.moves.split(" ") : [];
  gameState.puzzleId = dailyChess.id || null;
  gameState.puzzleFen = dailyChess.fen || null;

  createChessboard(dailyChess.fen);
  applySettings(settings, mutationDetected);
};

const observer = new MutationObserver(mutations => {
  if (!checkSite()) return;

  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof Element && node?.matches(postClassName)) {
        console.log(`Detected mutation for ${node.tagName} with class ${node.className}`);
        main(true);
      }
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

main();
