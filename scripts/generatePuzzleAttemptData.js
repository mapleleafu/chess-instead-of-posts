function generateRealisticPuzzleData(index, totalPuzzles, currentRating, skillProgression, baseDate) {
  const fenPositions = [
    "2r5/pR5p/5p1k/4p3/4r3/B4nPP/PP3P2/1K2R3 w - - 0 27",
    "r4rk1/pp3ppp/2p2q2/8/2BP4/2P2Q2/PP3PPP/R5K1 b - - 0 15",
    "8/6pk/8/3P4/3K4/8/8/8 w - - 0 1",
    "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3",
    "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 10",
    "3r1rk1/p5pp/bpp1pp2/8/q1PP1P2/b3P3/P2NQRPP/1R2B1K1 b - - 6 22",
    "r1bq1rk1/4nppb/p1p4p/2p1p3/3pP3/3P2NP/PPP2PP1/RNBQ1R1K w - - 0 11",
    "3r3r/p1q2pk1/1p3np1/2p1p3/2P1P3/1P3NP1/P2Q1PK1/3R3R w - - 0 24",
  ];

  const daysAgo = Math.floor((index / totalPuzzles) * 180); // Spread over 6 months
  const hoursVariation = Math.random() * 24; // Random hour of day
  const timestamp = new Date(baseDate.getTime() - (daysAgo * 24 + hoursVariation) * 60 * 60 * 1000);

  // Realistic success rate based on skill progression (starts lower, improves over time)
  const progressFactor = index / totalPuzzles; // 0 to 1
  const baseSuccessRate = 0.45 + skillProgression * progressFactor * 0.3; // 45% to 75%
  const isSolved = Math.random() < baseSuccessRate;

  // Generate puzzle rating based on user's current rating with some variation
  const ratingVariation = -200 + Math.random() * 400; // ±200 rating points
  const puzzleRating = Math.max(800, Math.min(2400, currentRating + ratingVariation));

  // More realistic rating changes based on puzzle difficulty vs user rating
  const ratingDiff = puzzleRating - currentRating;
  let ratingChange;

  if (isSolved) {
    // Gain more points for solving harder puzzles
    const baseGain = ratingDiff > 0 ? 15 + Math.random() * 25 : 8 + Math.random() * 15;
    ratingChange = baseGain + ratingDiff * 0.05;
    ratingChange = Math.max(3, Math.min(45, ratingChange)); // Cap gains
  } else {
    // Lose more points for failing easier puzzles
    const baseLoss = ratingDiff < 0 ? 12 + Math.random() * 20 : 8 + Math.random() * 15;
    ratingChange = -baseLoss + Math.abs(ratingDiff) * 0.03;
    ratingChange = Math.max(-40, Math.min(-2, ratingChange)); // Cap losses
  }

  // Realistic solving times based on puzzle difficulty and success
  const difficultyFactor = Math.abs(ratingDiff) / 400; // 0 to 1+
  const baseSolveTime = isSolved ? 5 + difficultyFactor * 85 : 5 + Math.random() * 85;
  const timeSpentSeconds = Number((baseSolveTime + Math.random() * 5).toFixed(1));

  return {
    fen: fenPositions[Math.floor(Math.random() * fenPositions.length)],
    isFinished: true,
    isSolved,
    isUserRatingUpdated: !!ratingChange,
    puzzleId: "P0" + Math.random().toString(36).substr(2, 6).toUpperCase(),
    puzzleRating: puzzleRating,
    puzzleRatingDeviation: Math.floor(Math.random() * 100) + 50,
    ratingChange: ratingChange,
    userRatingAfter: currentRating + ratingChange,
    timeSpentSeconds: timeSpentSeconds,
    timestamp: timestamp.toISOString(),
  };
}

function generatePuzzleDataSet(totalCount = 200) {
  const puzzles = [];
  const baseDate = new Date(); // Current date
  let currentRating = DEFAULT_PUZZLE_RATING;

  // Simulate skill progression over time (0.2 = moderate improvement)
  const skillProgression = 0.4;

  // Generate puzzles in chronological order (oldest first)
  for (let i = totalCount - 1; i >= 0; i--) {
    const puzzle = generateRealisticPuzzleData(i, totalCount, currentRating, skillProgression, baseDate);

    // Update current rating for next puzzle generation
    if (puzzle.isUserRatingUpdated) {
      currentRating += puzzle.ratingChange;
      // Ensure rating stays within reasonable bounds
      currentRating = Math.max(800, Math.min(2800, currentRating));
    }

    puzzles.unshift(puzzle); // Add to beginning to maintain chronological order
  }

  // Sort by timestamp to ensure correct order
  puzzles.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Calculate statistics
  const ratingUpdates = puzzles.filter(p => p.isUserRatingUpdated);
  const totalRatingChange = ratingUpdates.reduce((sum, puzzle) => sum + puzzle.ratingChange, 0);
  const finalRating = DEFAULT_PUZZLE_RATING + totalRatingChange;
  const solved = puzzles.filter(p => p.isSolved).length;
  const solveRate = ((solved / puzzles.length) * 100).toFixed(1);

  // Create some interesting data patterns for different time periods
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

  // Add some daily streaks and patterns
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
