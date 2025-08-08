const boardState = {
  board: null,
  game: null,
  isBoardLocked: false,
};

const puzzleState = {
  moves: null,
  id: null,
  fen: null,
  currentMoveIndex: 0,
  isPuzzleMode: true,
  startTime: null,
  hasIncorrectMoves: false,
  rating: null,
  ratingDeviation: null,
};

const userState = {
  rating: null,
  glickoRanking: null,
  isRatingUpdated: false,
  ratingChange: null,
};

const templates = {};

const loadTemplate = async templateName => {
  if (templates[templateName]) {
    return templates[templateName];
  }

  try {
    const response = await fetch(chrome.runtime.getURL(`templates/${templateName}.html`));
    const html = await response.text();
    templates[templateName] = html;
    return html;
  } catch (error) {
    console.error(`Failed to load template ${templateName}:`, error);
    return "";
  }
};

const renderTemplate = (template, data) => {
  let rendered = template;

  Object.keys(data).forEach(key => {
    const regex = new RegExp(`\\{\\{${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\}\\}`, "g");
    const value = data[key];
    rendered = rendered.replace(regex, value || "");
  });

  return rendered;
};

const checkSite = () => window.location.href.includes("linkedin.com/feed");

const getMoveColor = () => (boardState.game.turn() === "w" ? "White" : "Black");

const initializeUserRating = async () => {
  userState.glickoRanking = new glicko2.Glicko2({
    tau: 0.5,
    rating: DEFAULT_PUZZLE_RATING,
    rd: 200,
    vol: 0.06,
  });

  const result = await chrome.storage.local.get("userRating");
  if (result.userRating) {
    const { rating, rd, volatility } = result.userRating;
    userState.rating = userState.glickoRanking.makePlayer(rating, rd, volatility);
  } else {
    userState.rating = userState.glickoRanking.makePlayer();
    await saveUserRating();
  }
};

const saveUserRating = async () => {
  if (!userState.rating) return;

  const ratingData = {
    rating: userState.rating.getRating(),
    rd: userState.rating.getRd(),
    volatility: userState.rating.getVol(),
    lastUpdated: new Date().toISOString(),
  };

  await chrome.storage.local.set({ userRating: ratingData });
  userState.isRatingUpdated = true;
};

const updateUserRating = async isSolved => {
  if (!userState.rating || !userState.glickoRanking) return;

  const oldRating = userState.rating.getRating();

  // Create puzzle as opponent
  const puzzle = userState.glickoRanking.makePlayer(puzzleState.rating, puzzleState.ratingDeviation, 0.06);

  // Update ratings based on result
  const matches = [[userState.rating, puzzle, isSolved ? 1 : 0]];
  userState.glickoRanking.updateRatings(matches);

  const newRating = userState.rating.getRating();
  const ratingChange = newRating - oldRating;
  userState.ratingChange = Math.round(ratingChange);

  await saveUserRating();
  updateRatingDisplay(ratingChange);
};

const updateRatingDisplay = async (ratingChange = null) => {
  if (!userState.rating) return;

  if (ratingChange) {
    userState.ratingChange = Math.round(ratingChange);
  }

  await updateRatingCards();
};

const updateRatingCards = async (hideRatingChange = false) => {
  let ratingSection = document.getElementById("rating-cards");

  if (!ratingSection) {
    const container = document.getElementById("chess-container");
    if (!container) return;

    ratingSection = document.createElement("div");
    ratingSection.id = "rating-cards";
    ratingSection.style.cssText = `
      position: relative;
      margin-top: 24px;
    `;

    const chessButtons = document.getElementById("chess-buttons");
    container.insertBefore(ratingSection, chessButtons);
  }

  const userRating = Math.round(userState.rating?.getRating() || 1500);
  const puzzleDiff = puzzleState.rating ? getPuzzleDifficulty(puzzleState.rating) : null;
  const userTier = getUserTier(userRating);

  const ratingDiff = puzzleState.rating ? puzzleState.rating - userRating : 0;
  const difficultyClass = ratingDiff > 200 ? "very-hard" : ratingDiff > 0 ? "harder" : ratingDiff > -200 ? "easier" : "very-easy";

  const ratingChangeHtml =
    userState.ratingChange && !hideRatingChange
      ? `<div class="rating-change ${userState.ratingChange > 0 ? "positive" : "negative"}">
         <span class="change-icon">${userState.ratingChange > 0 ? "📈" : "📉"}</span>
         <span class="change-value">${userState.ratingChange > 0 ? "+" : ""}${userState.ratingChange}</span>
         <span class="change-label">points</span>
       </div>`
      : "";

  const template = await loadTemplate("rating-battle-card");
  ratingSection.innerHTML = renderTemplate(template, {
    difficultyClass,
    userRating,
    userRatingRd: Math.round(userState.rating.getRd()),
    userTierColor: userTier.color,
    userTierIcon: userTier.icon,
    userTierName: userTier.name,
    ratingChangeHtml,
    puzzleRating: puzzleState.rating,
    puzzleDiffColor: puzzleDiff?.color || "",
    puzzleDiffLabel: puzzleDiff?.label || "",
    difficultyIcon: getDifficultyIcon(puzzleDiff?.label),
  });
};

const showPuzzleRating = async (hideRatingChange = false) => {
  await updateRatingCards(hideRatingChange);
};

const updateRatingsHeader = () => {
  let header = document.getElementById("ratings-header");

  if (!header) {
    const container = document.getElementById("chess-container");
    if (!container) return;

    header = document.createElement("div");
    header.id = "ratings-header";
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 400px;
      margin-bottom: 12px;
      padding: 0 4px;
    `;

    const board = document.getElementById("board");
    container.insertBefore(header, board);
  }

  const userRating = Math.round(userState.rating?.getRating() || 1500);
  const changeText = userState.ratingChange
    ? `<span style="color: ${userState.ratingChange > 0 ? "#16a34a" : "#dc2626"}; font-weight: 600;">
      ${userState.ratingChange > 0 ? "+" : ""}${userState.ratingChange}
    </span>`
    : "";

  const puzzleDiff = puzzleState.rating ? getPuzzleDifficulty(puzzleState.rating) : null;

  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: 6px; color: #374151; font-size: 13px;">
      <span style="font-weight: 600;">You:</span>
      <span>${userRating}</span>
      ${changeText}
    </div>
    ${
      puzzleDiff
        ? `
      <div style="display: flex; align-items: center; gap: 6px; color: #374151; font-size: 13px;">
        <span style="font-weight: 600;">Puzzle:</span>
        <span>${puzzleState.rating}</span>
        <span style="color: ${puzzleDiff.color}; font-weight: 600;">${puzzleDiff.label}</span>
      </div>
    `
        : ""
    }
  `;
};

const getPuzzleDifficulty = rating => {
  if (!rating) return { label: "Unrated", color: "#6b7280" };
  if (rating < 800) return { label: "Beginner", color: "#10b981" };
  if (rating < 1200) return { label: "Easy", color: "#22c55e" };
  if (rating < 1600) return { label: "Medium", color: "#f59e0b" };
  if (rating < 2000) return { label: "Hard", color: "#ef4444" };
  if (rating < 2400) return { label: "Expert", color: "#dc2626" };
  return { label: "Master", color: "#7c3aed" };
};

const getKingSquare = color => {
  const board = boardState.game.board();
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

const highlightSquare = (square, isHint = false) => {
  const squareEl = document.querySelector(`#board .square-${square}`);
  if (!squareEl) return;
  const hasPiece = squareEl.querySelector(".piece-417db") !== null;
  if (isHint) {
    highlightPossibleMoves(square);
    squareEl.classList.add("hint");
  } else {
    squareEl.classList.add(hasPiece ? "move-dest" : "piece-capture");
  }
};

const removeHighlights = () => {
  document.querySelectorAll("#board .square-55d63").forEach(square => {
    square.classList.remove("move-dest", "piece-capture", "hint");
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
  if (boardState.game.in_check()) {
    const kingSquare = getKingSquare(boardState.game.turn());
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

const savePuzzleAttempt = async options => {
  const { isSolved = false, isFinished = false } = options || {};

  if (!userState.isRatingUpdated) {
    await updateUserRating(isSolved);
  } else {
    await showPuzzleRating(true);
  }

  chrome.storage.local.get("puzzleAttempts", result => {
    const attempts = result.puzzleAttempts || [];
    const existingIndex = attempts.findIndex(attempt => attempt.puzzleId === puzzleState.id);

    const attempt = {
      fen: puzzleState.fen,
      puzzleId: puzzleState.id,
      timeSpentSeconds: (Date.now() - puzzleState.startTime) / 1000,
      puzzleRating: puzzleState.rating,
      puzzleRatingDeviation: puzzleState.ratingDeviation,
      isSolved,
      timestamp: new Date().toISOString(),
      isFinished: isSolved || isFinished,
      isUserRatingUpdated: userState.isRatingUpdated,
      ratingChange: userState.ratingChange,
    };

    if (existingIndex === -1) {
      attempts.push(attempt);
    } else if ((isSolved || isFinished) && !attempts[existingIndex].isFinished) {
      attempts[existingIndex] = { ...attempts[existingIndex], ...attempt };
    }

    chrome.storage.local.set({ puzzleAttempts: attempts });
  });
};

const checkPuzzleSolved = async (fen, puzzleId) => {
  if (!fen || !puzzleId) return false;

  return new Promise(resolve => {
    chrome.storage.local.get("puzzleAttempts", result => {
      const attempts = result.puzzleAttempts || [];
      resolve(attempts.find(attempt => attempt.puzzleId === puzzleId || attempt.fen === fen));
    });
  });
};

const checkIsLastMove = () => {
  return puzzleState.currentMoveIndex === puzzleState.moves.length - 1;
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

  boardState.isBoardLocked = lockBoard !== null ? lockBoard : !boardState.isBoardLocked;
  chessPieces.forEach(piece => {
    piece.style.pointerEvents = boardState.isBoardLocked ? "none" : "auto";
  });

  updateButtonStates();
};

const playSound = async soundName => {
  const result = await chrome.storage.local.get("settings");
  const settings = result.settings || {};
  await audioManager.playSound(soundName, settings);
};

const updateBoardPosition = (fen, animate = true) => {
  boardState.board.position(fen, animate ? { animate: true } : false);
};

const updateStatus = text => {
  const status = document.getElementById("status");
  if (!status) return;

  status.textContent = text;
};

const updateStatusText = () => {
  if (puzzleState.isPuzzleMode) return;

  const moveColor = getMoveColor();

  if (boardState.game.in_checkmate()) {
    updateStatus(`Game over, ${moveColor} is in checkmate.`);
  } else if (boardState.game.in_draw()) {
    updateStatus("Game over, drawn position");
  } else if (boardState.game.in_check()) {
    updateStatus(`${moveColor} is in check.`);
  } else {
    updateStatus(`${moveColor} to move.`);
  }
};

const loadPuzzlesFromCSV = async () => {
  const response = await fetch(chrome.runtime.getURL("static/puzzles.csv"));
  const csvText = await response.text();
  const lines = csvText
    .split("\n")
    .slice(1)
    .filter(line => line.trim());

  const puzzles = lines.map(line => {
    const [id, fen, moves, rating, ratingDeviation] = line.split(",");
    return {
      id,
      fen,
      moves,
      rating: parseInt(rating) || null,
      ratingDeviation: parseInt(ratingDeviation) || null,
    };
  });

  await chrome.storage.local.set({ puzzles, totalPuzzles: puzzles.length });

  return { puzzles, totalPuzzles: puzzles.length };
};

const getDailyChess = async () => {
  let result = await chrome.storage.local.get(["puzzles", "totalPuzzles"]);

  if (!result.puzzles || !result.totalPuzzles) {
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      result = await chrome.storage.local.get(["puzzles", "totalPuzzles"]);
      if (result.puzzles && result.totalPuzzles) break;
    }

    if (!result.puzzles || !result.totalPuzzles) {
      result = await loadPuzzlesFromCSV();
    }
  }

  const today = new Date().setHours(0, 0, 0, 0);
  const daysSinceRelease = Math.floor((today - RELEASE_DATE) / (1000 * 60 * 60 * 24));
  const puzzleIndex = daysSinceRelease % result.totalPuzzles;
  return result.puzzles[puzzleIndex];
};

const initiatePuzzle = () => {
  if (!puzzleState.moves || puzzleState.moves.length === 0) return;

  const playerColor = boardState.game.turn() === "b" ? "White" : "Black";
  toggleLockBoard(true);
  updateStatus(`Your turn. Find the best move for ${playerColor}.`);

  setTimeout(() => {
    makeOpponentMove(puzzleState.moves[0]);
    toggleLockBoard(false);
  }, 700);
};

const makeOpponentMove = moveString => {
  if (!moveString) return;

  const from = moveString.slice(0, 2);
  const to = moveString.slice(2, 4);
  executeMove(from, to, true);
  puzzleState.currentMoveIndex++;

  updateButtonStates();
};

const validateUserMove = move => {
  const expectedMove = puzzleState.moves[puzzleState.currentMoveIndex];
  const userMoveString = move.from + move.to;

  if (userMoveString === expectedMove) {
    putMark(move.to, true);
    puzzleState.currentMoveIndex++;
    updateButtonStates();

    if (puzzleState.currentMoveIndex >= puzzleState.moves.length) {
      playConfettiEffect();
      playSound("Victory");
      updateStatus("Success! Puzzle completed.");
      puzzleState.isPuzzleMode = false;
      toggleLockBoard(false);
      toggleZenModeManually(false);
      if (!puzzleState.hasIncorrectMoves) savePuzzleAttempt({ isSolved: true });
      return true;
    }

    updateStatus("Best move! Keep going...");
    setTimeout(() => makeOpponentMove(puzzleState.moves[puzzleState.currentMoveIndex]), 500);
    return true;
  } else {
    playSound("Error");
    putMark(move.to, false);
    updateStatus("That's not the move! Try something else.");

    if (!puzzleState.hasIncorrectMoves) {
      puzzleState.hasIncorrectMoves = true;
      savePuzzleAttempt({ isSolved: false });
    }
    return false;
  }
};

const handleIncorrectMove = (move, originalHighlights) => {
  toggleLockBoard(true);
  highlightLastMove(move.from, move.to);

  setTimeout(() => {
    boardState.game.undo();
    updateBoardPosition(boardState.game.fen());
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
  const move = boardState.game.move({ from, to, promotion: "q" });
  if (!move) return null;

  move.captured ? playSound("Capture") : playSound("Move");

  removeMarks();

  if (animate) {
    updateBoardPosition(boardState.game.fen(), true);
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

  if (puzzleState.isPuzzleMode && isUserMove) {
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
  if (boardState.game.game_over() || boardState.isBoardLocked) return false;

  // Only pick up pieces for the side to move
  if ((boardState.game.turn() === "w" && piece.search(/^b/) !== -1) || (boardState.game.turn() === "b" && piece.search(/^w/) !== -1)) {
    return false;
  }

  highlightPossibleMoves(square);
  return true;
};

const highlightPossibleMoves = square => {
  if (boardState.isBoardLocked || boardState.game.game_over()) return;

  removeHighlights();

  const moves = boardState.game.moves({ square, verbose: true });
  if (!moves.length) return;

  moves.forEach(move => highlightSquare(move.to));
};

const onDrop = (from, to) => {
  if (boardState.game.game_over() || boardState.isBoardLocked) return "snapback";

  const result = makeMove(from, to, { isUserMove: true, animate: false });
  return result === "snapback" ? "snapback" : undefined;
};

const onSnapEnd = () => {
  updateBoardPosition(boardState.game.fen(), false);
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

const formatPuzzleDuration = secs => {
  if (!secs && secs !== 0) return "—";
  const s = Math.max(0, Math.round(secs));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return `${r}s`;
  return `${m}m ${r.toString().padStart(2, "0")}s`;
};

const createCompletionMessage = async (dailyChess, mutationDetected, puzzleAttempt) => {
  const mainFeed = document.querySelector("main");
  if (!mainFeed) return;

  removeExistingElements();
  injectStyles();

  const container = document.createElement("div");
  container.id = "chess-container";
  applyContainerStyles(container);
  container.classList.add("completion-container");

  const difficulty = getPuzzleDifficulty(dailyChess.rating);
  const userRating = Math.round(userState.rating?.getRating() || 1500);
  const isSuccess = !!puzzleAttempt?.isSolved;
  const timeSpent = formatPuzzleDuration(puzzleAttempt?.timeSpentSeconds);
  const ratingDelta = puzzleAttempt?.ratingChange ? Math.round(puzzleAttempt.ratingChange) : null;
  const userTier = getUserTier(userRating);

  const statusIcon = isSuccess ? "🏆" : "🧩";
  const statusTitle = isSuccess ? "Puzzle Cracked" : "Puzzle Failed";
  const statusSubtitle = isSuccess ? "Brilliant! You found the best moves." : "Keep training—tomorrow brings a new challenge.";

  const ratingDeltaHtml =
    ratingDelta !== null
      ? `<div class="delta-chip ${ratingDelta >= 0 ? "delta-up" : "delta-down"}">
         ${ratingDelta >= 0 ? "📈 +" + ratingDelta : "📉 " + ratingDelta}
       </div>`
      : "";

  const template = await loadTemplate("completion-message");
  container.innerHTML = renderTemplate(template, {
    statusClass: isSuccess ? "success" : "failed",
    statusIcon,
    statusTitle,
    statusSubtitle,
    userRating,
    userTierColor: userTier.color,
    userTierIcon: userTier.icon,
    userTierName: userTier.name,
    ratingDeltaHtml,
    puzzleRating: dailyChess.rating || "—",
    difficultyColor: difficulty.color,
    difficultyLabel: difficulty.label,
    timeSpent,
  });

  mainFeed.appendChild(container);

  updateNextPuzzleCountdown();
  const interval = setInterval(updateNextPuzzleCountdown, 1000);

  function updateNextPuzzleCountdown() {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0);
    const diff = Math.max(0, Math.floor((tomorrow - now) / 1000));
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    const el = document.getElementById("nextInfo");
    if (el) {
      el.textContent = `New daily puzzle in ${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
    }
    if (diff === 0) clearInterval(interval);
  }

  const solveAgainBtn = container.querySelector("#solveAgainBtn");
  if (solveAgainBtn) {
    solveAgainBtn.addEventListener("click", async () => {
      const settings = await getSettings();
      await setupPuzzle(dailyChess, settings, mutationDetected, puzzleAttempt);
    });
  }
};

const playConfettiEffect = () => {
  const boardEl = document.getElementById("board");
  if (!boardEl) return;

  if (getComputedStyle(boardEl).position === "static") {
    boardEl.style.position = "relative";
  }

  let overlay = boardEl.querySelector("#confetti-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "confetti-overlay";
    overlay.style.position = "absolute";
    overlay.style.inset = "0";
    overlay.style.pointerEvents = "none";
    overlay.style.overflow = "visible";
    overlay.style.zIndex = "10000";
    boardEl.appendChild(overlay);
  }

  const COUNT = 42;
  for (let i = 0; i < COUNT; i++) {
    const piece = document.createElement("div");
    piece.className = "board-confetti";
    const hue = 180 + Math.floor(Math.random() * 160); // broader color range
    const size = 6 + Math.random() * 6;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * 1.4}px`;
    piece.style.left = Math.random() * 100 + "%";
    piece.style.top = "0%";
    piece.style.background = `hsl(${hue} 80% 55%)`;
    piece.style.opacity = (0.55 + Math.random() * 0.45).toString();
    piece.style.animationDelay = (Math.random() * 0.4).toFixed(2) + "s";
    piece.style.animationDuration = (2 + Math.random() * 1.6).toFixed(2) + "s";
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    overlay.appendChild(piece);
  }

  setTimeout(() => {
    overlay?.remove();
  }, 4000);
};

const applyContainerStyles = container => {
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.15);
    margin: 20px auto;
    max-width: 500px;
    text-align: center;
  `;
};

const createChessboard = async fenCode => {
  const mainFeed = document.querySelector("main");
  if (!mainFeed) return;

  removeExistingElements();

  const ChessConstructor = Chess || window.Chess;
  if (!ChessConstructor || typeof window.Chessboard === "undefined") {
    setTimeout(() => createChessboard(fenCode), 1000);
    return;
  }

  const container = createBoardContainer();
  if (DEBUG_MODE) await createDebugButtons(container);
  injectStyles();
  mainFeed.appendChild(container);

  initializeGame(fenCode);
  setupBoard(fenCode);
  attachEventListeners();
  updateButtonStates();
};

const createDebugButtons = async container => {
  const template = await loadTemplate("debug-buttons");
  const debugDiv = document.createElement("div");
  debugDiv.innerHTML = template;

  container.appendChild(debugDiv);

  const logStateBtn = debugDiv.querySelector("#logStateBtn");
  const resetAttemptsBtn = debugDiv.querySelector("#resetAttemptsBtn");
  const removeDebugBtn = debugDiv.querySelector("#removeDebugBtn");

  if (logStateBtn) {
    logStateBtn.addEventListener("click", () => {
      console.log("~ boardState: ", { ...boardState });
      console.log("~ puzzleState: ", { ...puzzleState });
      console.log("~ userState: ", { ...userState });
    });
  }

  if (resetAttemptsBtn) {
    resetAttemptsBtn.addEventListener("click", async () => {
      await chrome.storage.local.remove("puzzleAttempts");
      puzzleState.hasIncorrectMoves = false;
      userState.isRatingUpdated = false;
      console.log("~ Puzzle attempts deleted.");
    });
  }

  if (removeDebugBtn) {
    removeDebugBtn.addEventListener("click", async () => {
      debugDiv.remove();
    });
  }
};

const removeExistingElements = () => {
  const existing = document.getElementById("chess-container");
  if (existing) existing.remove();

  const existingScroll = document.querySelector(POST_CLASS_NAME);
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
    border-radius: 8px;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.15);
    margin: 20px auto;
    margin-top: 0px;
    max-width: 500px;
  `;

  container.innerHTML = `
    <div id="board" style="width: 400px;"></div>
      <div id="chess-buttons" style="
        margin-top: 24px; 
        display: flex; 
        flex-wrap: wrap; 
        gap: 12px; 
        justify-content: center;
        padding: 20px;
      ">
        <button id="flipBtn" class="chess-btn chess-btn-secondary" data-tooltip="Flip the board orientation">
          <span>🔄</span> <span>Flip Board</span>
        </button>
        <button id="hintBtn" class="chess-btn chess-btn-primary" data-tooltip="Get a hint for the next move">
          <span>💡</span> <span>Hint</span>
        </button>
        <button id="viewNextBtn" class="chess-btn chess-btn-primary" data-tooltip="Show the next move in the solution">
          <span>👁️</span> <span>Next Move</span>
        </button>
        <button id="zenBtn" class="chess-btn chess-btn-accent" data-tooltip="Enter distraction-free zen mode">
          <span>🧘</span> <span>Zen Mode</span>
        </button>
      </div>
    <div id="status" style="margin-top: 20px;"></div>
  `;

  return container;
};

const injectStyles = () => {
  if (document.getElementById("chess-dynamic-vars")) return;
  const style = document.createElement("style");
  style.id = "chess-dynamic-vars";
  style.textContent = `:root { --chess-green:#22c55e; --chess-red:#ef4444; }`;
  document.head.appendChild(style);
};

const initializeGame = fenCode => {
  const ChessConstructor = Chess || window.Chess;
  boardState.game = new ChessConstructor();
  boardState.game.load(fenCode);
};

const setupBoard = fenCode => {
  const orientation = fenCode.includes(" w ") ? "black" : "white";

  const config = {
    draggable: true,
    position: boardState.game.fen(),
    onDragStart,
    onDrop,
    snapbackSpeed: 0,
    onSnapEnd,
    orientation,
    pieceTheme: piece => chrome.runtime.getURL(`static/images/chessPieces/${piece}.png`),
  };

  boardState.board = window.Chessboard("board", config);
};

const attachEventListeners = () => {
  const addButtonFeedback = (buttonId, handler, options = {}) => {
    const { feedbackType = "pulse", showLoading = false } = options;

    const button = document.getElementById(buttonId);
    if (!button) return;

    button.addEventListener("click", async e => {
      if (button.classList.contains("loading") || button.classList.contains("disabled")) {
        return;
      }

      if (showLoading) {
        button.classList.add("loading");
        const originalText = button.innerHTML;

        button.classList.add(feedbackType);

        if (navigator.vibrate) {
          navigator.vibrate(10);
        }

        try {
          await handler(e);
        } catch (error) {
          button.classList.remove("loading", feedbackType);
          button.classList.add("error-shake");
          setTimeout(() => button.classList.remove("error-shake"), 500);
          throw error;
        } finally {
          button.classList.remove("loading", feedbackType);
          button.innerHTML = originalText;
        }
      } else {
        button.classList.add(feedbackType);

        if (navigator.vibrate) {
          navigator.vibrate(10);
        }

        try {
          await handler(e);
        } catch (error) {
          button.classList.remove(feedbackType);
          button.classList.add("error-shake");
          setTimeout(() => button.classList.remove("error-shake"), 500);
          throw error;
        }

        setTimeout(() => {
          button.classList.remove(feedbackType);
        }, 850);
      }
    });

    button.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        button.click();
      }
    });

    button.addEventListener("mousedown", e => {
      e.preventDefault();
    });
  };

  addButtonFeedback("flipBtn", flipBoard, {
    feedbackType: "pulse",
  });

  addButtonFeedback("zenBtn", toggleZenMode, {
    feedbackType: "pulse",
  });

  addButtonFeedback("hintBtn", hintMove, {
    feedbackType: "success-glow",
    showLoading: true,
  });

  addButtonFeedback("viewNextBtn", viewNextMove, {
    feedbackType: "success-glow",
    showLoading: true,
  });
};

const updateButtonStates = () => {
  const hintBtn = document.getElementById("hintBtn");
  const viewNextBtn = document.getElementById("viewNextBtn");
  const flipBtn = document.getElementById("flipBtn");
  const zenBtn = document.getElementById("zenBtn");

  if (!hintBtn || !viewNextBtn || !flipBtn || !zenBtn) return;

  const canShowHint = puzzleState.isPuzzleMode && puzzleState.currentMoveIndex < puzzleState.moves.length && !boardState.isBoardLocked;
  const canViewNext = puzzleState.isPuzzleMode && puzzleState.currentMoveIndex < puzzleState.moves.length && !boardState.isBoardLocked;

  if (canShowHint) {
    hintBtn.classList.remove("disabled");
    hintBtn.setAttribute("data-tooltip", "Get a hint for the next move");
  } else {
    hintBtn.classList.add("disabled");
    hintBtn.setAttribute("data-tooltip", boardState.isBoardLocked ? "Board is locked" : "No hints available for this position");
  }

  if (canViewNext) {
    viewNextBtn.classList.remove("disabled");
    viewNextBtn.setAttribute("data-tooltip", "Show the next move in the solution");
  } else {
    viewNextBtn.classList.add("disabled");
    viewNextBtn.setAttribute("data-tooltip", boardState.isBoardLocked ? "Board is locked" : "No more moves available");
  }

  zenBtn.classList.remove("disabled");
  zenBtn.setAttribute("data-tooltip", "Enter distraction-free zen mode");
};

const showButtonNotification = (buttonId, message, type = "success") => {
  const button = document.getElementById(buttonId);
  if (!button) return;

  const existingNotification = button.querySelector(".btn-notification");
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement("div");
  notification.className = `btn-notification btn-notification-${type}`;
  notification.textContent = message;

  const successColor = "#16a34a";
  const errorColor = "#dc2626";

  notification.style.cssText = `
    position: absolute;
    top: -32px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === "success" ? successColor : errorColor};
    color: white;
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    z-index: 1001;
    animation: notificationSlideIn 0.2s ease-out forwards;
    pointer-events: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  `;

  button.style.position = "relative";
  button.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = "notificationSlideOut 0.2s ease-in forwards";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 200);
    }
  }, 2000);
};

const showHelpWarningModal = async () => {
  return new Promise(async resolve => {
    const modal = document.createElement("div");
    modal.id = "help-warning-modal";
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 10002;
      display: flex;
      justify-content: center;
      align-items: center;
      animation: fadeIn 0.2s ease-out;
    `;

    const template = await loadTemplate("help-warning-modal");
    modal.innerHTML = template;
    document.body.appendChild(modal);

    const cancelBtn = modal.querySelector("#help-cancel");
    const confirmBtn = modal.querySelector("#help-confirm");

    if (cancelBtn && confirmBtn) {
      cancelBtn.onmouseenter = () => (cancelBtn.style.background = "#f5f5f5");
      cancelBtn.onmouseleave = () => (cancelBtn.style.background = "white");
      confirmBtn.onmouseenter = () => (confirmBtn.style.background = "#b91c1c");
      confirmBtn.onmouseleave = () => (confirmBtn.style.background = "#dc2626");

      cancelBtn.onclick = () => {
        modal.remove();
        resolve(false);
      };

      confirmBtn.onclick = async () => {
        await chrome.storage.local.set({ helpWarningShown: true });
        modal.remove();
        resolve(true);
      };
    }

    modal.onclick = e => {
      if (e.target === modal) {
        modal.remove();
        resolve(false);
      }
    };
  });
};

const addModalAnimations = () => {
  if (!document.getElementById("modal-animations")) {
    const style = document.createElement("style");
    style.id = "modal-animations";
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideIn {
        from { 
          opacity: 0;
          transform: translateY(-20px);
        }
        to { 
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }
};

const viewNextMove = async () => {
  if (!puzzleState.isPuzzleMode || puzzleState.currentMoveIndex >= puzzleState.moves.length || boardState.isBoardLocked) return;

  const { helpWarningShown } = await chrome.storage.local.get("helpWarningShown");

  if (!helpWarningShown && !userState.isRatingUpdated) {
    addModalAnimations();
    const proceed = await showHelpWarningModal();
    if (!proceed) return;
  }

  const nextMove = puzzleState.moves[puzzleState.currentMoveIndex];
  if (nextMove) {
    const from = nextMove.slice(0, 2);
    const to = nextMove.slice(2, 4);
    const isLastMove = checkIsLastMove();

    makeMove(from, to, { isUserMove: true, animate: true });

    puzzleState.hasIncorrectMoves = true;
    savePuzzleAttempt({ isSolved: false, isFinished: isLastMove });
  }
};

const hintMove = async () => {
  if (!puzzleState.isPuzzleMode || puzzleState.currentMoveIndex >= puzzleState.moves.length || boardState.isBoardLocked) return;

  const { helpWarningShown } = await chrome.storage.local.get("helpWarningShown");

  if (!helpWarningShown && !userState.isRatingUpdated) {
    addModalAnimations();
    const proceed = await showHelpWarningModal();
    if (!proceed) return;
  }

  const nextMove = puzzleState.moves[puzzleState.currentMoveIndex];
  if (nextMove) {
    const from = nextMove.slice(0, 2);
    highlightSquare(from, true);

    puzzleState.hasIncorrectMoves = true;
    savePuzzleAttempt({ isSolved: false });
  }
};

const flipBoard = () => {
  const highlightedSquares = getHighlightedSquares();
  const marks = getMarksOnSquares();

  boardState.board.flip();

  if (highlightedSquares.length) {
    highlightLastMove(...highlightedSquares);
  }

  Object.entries(marks).forEach(([square, correct]) => {
    putMark(square, correct === "correct", false);
  });
};

const toggleZenModeManually = shouldEnable => {
  const zenMode = document.getElementById("zenMode");
  const isZenModeActive = !!zenMode;

  if (shouldEnable && !isZenModeActive) {
    toggleZenMode();
  } else if (!shouldEnable && isZenModeActive) {
    toggleZenMode();
  }
};

const toggleZenControls = (eyeToggle, forceState = null) => {
  if (!document.getElementById("zenMode")) return;

  const buttonsDiv = document.getElementById("chess-buttons");
  const statusDiv = document.getElementById("status");
  const ratingCards = document.getElementById("rating-cards");

  const currentlyVisible = !buttonsDiv?.classList.contains("hidden");
  const shouldShow = forceState !== null ? forceState : !currentlyVisible;

  eyeToggle.innerHTML = shouldShow ? "👀" : "🫥";
  eyeToggle.setAttribute("data-tooltip", shouldShow ? "Hide controls" : "Show controls");

  if (buttonsDiv) {
    buttonsDiv.classList.toggle("hidden", !shouldShow);
  }
  if (statusDiv) {
    statusDiv.classList.toggle("hidden", !shouldShow);
  }
  if (ratingCards) {
    ratingCards.classList.toggle("hidden", !shouldShow);
  }

  return shouldShow;
};

const toggleZenMode = () => {
  const zenMode = document.getElementById("zenMode");
  const chessContainer = document.getElementById("chess-container");
  const statusDiv = document.getElementById("status");
  const buttonsDiv = document.getElementById("chess-buttons");
  const ratingCards = document.getElementById("rating-cards");

  if (zenMode) {
    const mainFeed = document.querySelector("main");
    mainFeed.appendChild(chessContainer);
    zenMode.remove();
    document.body.style.overflow = "auto";

    const eyeToggle = document.querySelector(".zen-toggle");
    if (eyeToggle) eyeToggle.remove();

    // Restore original text color and show controls
    if (statusDiv) statusDiv.style.color = "";

    if (buttonsDiv) {
      buttonsDiv.classList.remove("zen-controls", "hidden");
    }
    if (statusDiv) {
      statusDiv.classList.remove("zen-controls", "hidden");
    }
    if (ratingCards) {
      ratingCards.classList.remove("zen-controls", "hidden");
    }
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

    const eyeToggle = document.createElement("button");
    eyeToggle.className = "zen-toggle";
    eyeToggle.innerHTML = "🫥";
    eyeToggle.setAttribute("data-tooltip", "Show controls");

    eyeToggle.addEventListener("click", () => {
      toggleZenControls(eyeToggle);
    });

    if (statusDiv) {
      statusDiv.insertAdjacentElement("afterend", eyeToggle);
    }

    zenContainer.appendChild(chessContainer);
    document.body.appendChild(zenContainer);
    document.body.style.overflow = "hidden";

    // Force white text in zen mode and add zen-controls class
    if (statusDiv) {
      statusDiv.style.color = "white";
      statusDiv.classList.add("zen-controls");
    }

    if (buttonsDiv) buttonsDiv.classList.add("zen-controls");
    if (ratingCards) ratingCards.classList.add("zen-controls");

    toggleZenControls(eyeToggle, false);

    zenContainer.addEventListener("click", e => {
      if (e.target === zenContainer) {
        toggleZenControls(eyeToggle);
        toggleZenMode();
      }
    });
  }
};

const applyGeneralSettings = settings => {
  if (settings?.hideLayoutAside) {
    const layoutRef = document.querySelector(LAYOUT_ASIDE);
    if (layoutRef) layoutRef.remove();
  }

  if (settings?.hideSidebar) {
    const sidebarRef = document.querySelector(LAYOUT_SIDEBAR);
    if (sidebarRef) sidebarRef.remove();
  }
};

const applyPuzzleSettings = (settings, mutationDetected = false) => {
  if (settings?.autoZenMode && !mutationDetected) {
    toggleZenMode();
  }
};

const setupPuzzle = async (dailyChess, settings = {}, mutationDetected = false, puzzleAttempt = null) => {
  puzzleState.moves = dailyChess.moves ? dailyChess.moves.split(" ") : [];
  puzzleState.id = dailyChess.id || null;
  puzzleState.fen = dailyChess.fen || null;
  puzzleState.rating = dailyChess.rating || null;
  puzzleState.ratingDeviation = dailyChess.ratingDeviation || null;
  userState.isRatingUpdated = puzzleAttempt?.isUserRatingUpdated || false;
  userState.ratingChange = puzzleAttempt?.ratingChange || null;
  puzzleState.isPuzzleMode = true;
  puzzleState.startTime = Date.now();
  puzzleState.currentMoveIndex = 0;
  puzzleState.hasIncorrectMoves = false;

  await createChessboard(dailyChess.fen);
  initiatePuzzle();
  applyPuzzleSettings(settings, mutationDetected);
};

const getSettings = async () => {
  const { settings } = await chrome.storage.local.get("settings");
  return settings || {};
};

const main = async (mutationDetected = false) => {
  if (!checkSite()) return;

  await initializeUserRating();
  const settings = await getSettings();
  applyGeneralSettings(settings);
  if (settings?.dailyPuzzlesDisabled) return;

  const dailyChess = await getDailyChess();
  const puzzleAttempt = await checkPuzzleSolved(dailyChess.fen, dailyChess.id);

  if (puzzleAttempt?.isFinished) {
    createCompletionMessage(dailyChess, mutationDetected, puzzleAttempt);
    return;
  }

  await setupPuzzle(dailyChess, settings, mutationDetected, puzzleAttempt);
};

const observer = new MutationObserver(mutations => {
  if (!checkSite()) return;

  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof Element && node?.matches(POST_CLASS_NAME)) {
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
