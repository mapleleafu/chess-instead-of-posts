async function generateRealisticPuzzleData(index, totalPuzzles, currentRating, skillProgression, baseDate, availablePuzzles) {
  const puzzleIndex = index % availablePuzzles.length;
  const selectedPuzzle = availablePuzzles[puzzleIndex];

  const daysAgo = Math.floor((index / totalPuzzles) * 180);
  const hoursVariation = Math.random() * 24;
  const timestamp = new Date(baseDate.getTime() - (daysAgo * 24 + hoursVariation) * 60 * 60 * 1000);

  const progressFactor = index / totalPuzzles;
  const baseSuccessRate = 0.45 + skillProgression * progressFactor * 0.3;
  const isSolved = Math.random() < baseSuccessRate;

  const puzzleRating = selectedPuzzle.rating || 800 + Math.random() * 1600;

  const ratingDiff = puzzleRating - currentRating;
  let ratingChange;

  if (isSolved) {
    const baseGain = ratingDiff > 0 ? 15 + Math.random() * 25 : 8 + Math.random() * 15;
    ratingChange = baseGain + ratingDiff * 0.05;
    ratingChange = Math.max(3, Math.min(45, ratingChange));
  } else {
    const baseLoss = ratingDiff < 0 ? 12 + Math.random() * 20 : 8 + Math.random() * 15;
    ratingChange = -baseLoss + Math.abs(ratingDiff) * 0.03;
    ratingChange = Math.max(-40, Math.min(-2, ratingChange));
  }

  const difficultyFactor = Math.abs(ratingDiff) / 400;
  const baseSolveTime = isSolved ? 5 + difficultyFactor * 85 : 5 + Math.random() * 85;
  const timeSpentSeconds = Number((baseSolveTime + Math.random() * 5).toFixed(1));

  return {
    puzzleMoves: selectedPuzzle.moves,
    puzzleFen: selectedPuzzle.fen,
    puzzleRating: puzzleRating,
    puzzleRatingDeviation: selectedPuzzle.ratingDeviation || Math.floor(Math.random() * 100) + 50,
    puzzleId: selectedPuzzle.id || "P0" + Math.random().toString(36).substr(2, 6).toUpperCase(),
    ratingChange: ratingChange,
    isFinished: true,
    isSolved,
    isUserRatingUpdated: !!ratingChange,
    userRatingAfter: currentRating + ratingChange,
    timeSpentSeconds: timeSpentSeconds,
    timestamp: timestamp.toISOString(),
  };
}

async function generatePuzzleDataSet(totalCount = 200) {
  const availablePuzzles = await ensurePuzzlesLoaded();

  if (!availablePuzzles || availablePuzzles.length === 0) {
    console.error("No puzzles found in localStorage");
    return { puzzles: [], finalRating: DEFAULT_PUZZLE_RATING };
  }

  console.log(`📦 Loaded ${availablePuzzles.length} puzzles from localStorage`);

  const puzzles = [];
  const baseDate = new Date();
  let currentRating = DEFAULT_PUZZLE_RATING;

  const skillProgression = 0.4;

  for (let i = totalCount - 1; i >= 0; i--) {
    const puzzle = await generateRealisticPuzzleData(i, totalCount, currentRating, skillProgression, baseDate, availablePuzzles);

    if (puzzle.isUserRatingUpdated) {
      currentRating += puzzle.ratingChange;

      currentRating = Math.max(800, Math.min(2800, currentRating));
    }

    puzzles.unshift(puzzle);
  }

  puzzles.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const ratingUpdates = puzzles.filter(p => p.isUserRatingUpdated);
  const totalRatingChange = ratingUpdates.reduce((sum, puzzle) => sum + puzzle.ratingChange, 0);
  const finalRating = DEFAULT_PUZZLE_RATING + totalRatingChange;
  const solved = puzzles.filter(p => p.isSolved).length;
  const solveRate = ((solved / puzzles.length) * 100).toFixed(1);

  const last7Days = puzzles.filter(p => {
    const puzzleDate = new Date(p.timestamp);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return puzzleDate >= sevenDaysAgo;
  });

  const last30Days = puzzles.filter(p => {
    const puzzleDate = new Date(p.timestamp);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return puzzleDate >= thirtyDaysAgo;
  });

  const dailyStats = {};
  puzzles.forEach(puzzle => {
    const date = new Date(puzzle.timestamp).toDateString();
    if (!dailyStats[date]) {
      dailyStats[date] = { solved: 0, total: 0 };
    }
    dailyStats[date].total++;
    if (puzzle.isSolved) dailyStats[date].solved++;
  });

  console.log(`✅ Generated realistic test data with ${puzzles.length} puzzles`);
  console.log(
    `📊 Timeline: ${new Date(puzzles[0].timestamp).toLocaleDateString()} to ${new Date(puzzles[puzzles.length - 1].timestamp).toLocaleDateString()}`
  );
  console.log(`📈 Rating: ${DEFAULT_PUZZLE_RATING} → ${finalRating} (${totalRatingChange > 0 ? "+" : ""}${totalRatingChange})`);
  console.log(`🎯 Success Rate: ${solveRate}%`);
  console.log(`⚡ Rating Updates: ${ratingUpdates.length}/${puzzles.length}`);
  console.log(`📅 Last 7 days: ${last7Days.length} puzzles`);
  console.log(`📅 Last 30 days: ${last30Days.length} puzzles`);
  console.log(`📊 Active days: ${Object.keys(dailyStats).length}`);

  console.log("\n📈 Sample Rating Progression:");
  let sampleRating = DEFAULT_PUZZLE_RATING;
  ratingUpdates.slice(0, 10).forEach((puzzle, i) => {
    sampleRating += puzzle.ratingChange;
    const date = new Date(puzzle.timestamp).toLocaleDateString("en", { month: "short", day: "numeric" });
    const change = puzzle.ratingChange > 0 ? `+${puzzle.ratingChange}` : `${puzzle.ratingChange}`;
    console.log(`${date}: ${Math.round(sampleRating)} (${change})`);
  });

  console.log("\n🎮 Perfect for testing all chart features!");
  return { puzzles, finalRating };
}
