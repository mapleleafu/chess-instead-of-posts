document.addEventListener("DOMContentLoaded", function () {
  const tabs = document.querySelectorAll(".tab");
  const tabContents = document.querySelectorAll(".tab-content");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tabContents.forEach(tc => tc.classList.remove("active"));

      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.add("active");

      if (tab.dataset.tab === "stats") {
        loadStatistics();
      }
    });
  });

  loadStatistics();
  initSettings();
  initInsightsToggle();

  document.getElementById("dateRange").addEventListener("change", function () {
    loadStatistics();
  });
});

function loadStatistics() {
  showLoadingState();

  chrome.storage.local.get("PUZZLE_ATTEMPTS", function (data) {
    try {
      const allAttempts = data.PUZZLE_ATTEMPTS || [];
      const filteredAttempts = filterAttemptsByDateRange(allAttempts);

      updateChartTitles();

      const stats = calculateStats(filteredAttempts);
      updateStatCards(stats);

      createPerformanceChart(filteredAttempts);
      createTimeDistributionChart(filteredAttempts);
      createTrendChart(filteredAttempts);

      hideLoadingState();
    } catch (error) {
      console.error("Error loading statistics:", error);
      showErrorState();
    }
  });
}

function showLoadingState() {
  document.querySelectorAll(".stat-value").forEach(el => {
    el.style.opacity = "0.5";
  });

  const insightsContainer = document.getElementById("insightsContainer");
  if (insightsContainer) {
    insightsContainer.innerHTML = '<div class="insight-item">• Loading insights...</div>';
  }
}

function hideLoadingState() {
  document.querySelectorAll(".stat-value").forEach(el => {
    el.style.opacity = "1";
  });
}

function showErrorState() {
  const insightsContainer = document.getElementById("insightsContainer");
  if (insightsContainer) {
    insightsContainer.innerHTML = '<div class="insight-item">⚠ Error loading data. Please try again.</div>';
  }
  hideLoadingState();
}

function updateChartTitles() {
  const dateRange = document.getElementById("dateRange").value;
  const titleSuffix = getTitleSuffix(dateRange);

  document.getElementById("performanceChartTitle").textContent = `Performance${titleSuffix}`;
  document.getElementById("timeChartTitle").textContent = `Time Distribution${titleSuffix}`;
  document.getElementById("trendChartTitle").textContent = `Solve Rate Trend${titleSuffix}`;
}

function getTitleSuffix(dateRange) {
  switch (dateRange) {
    case "7":
      return " - Last 7 Days";
    case "30":
      return " - Last 30 Days";
    case "90":
      return " - Last 90 Days";
    case "all":
      return " - All Time";
    default:
      return "";
  }
}

function filterAttemptsByDateRange(attempts) {
  const dateRange = document.getElementById("dateRange").value;

  if (dateRange === "all") {
    return attempts;
  }

  const days = parseInt(dateRange);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  cutoffDate.setHours(0, 0, 0, 0);

  return attempts.filter(attempt => {
    const attemptDate = new Date(attempt.timestamp);
    return attemptDate >= cutoffDate;
  });
}

function calculateStats(attempts) {
  const total = attempts.length;
  const solved = attempts.filter(a => a.isSolved).length;
  const solveRate = total > 0 ? Math.round((solved / total) * 100) : 0;

  const avgTime = attempts.length > 0 ? attempts.reduce((acc, a) => acc + a.timeSpentSeconds, 0) / attempts.length : 0;

  const streak = calculateStreak(attempts);
  const bestStreak = calculateBestStreak(attempts);
  const fastestSolve = calculateFastestSolve(attempts);

  const trends = calculateTrends(attempts);

  return {
    total,
    solved,
    solveRate,
    avgTime,
    streak,
    bestStreak,
    fastestSolve,
    trends,
  };
}

function calculateStreak(attempts) {
  if (attempts.length === 0) return 0;

  const sortedAttempts = [...attempts]
    .filter(a => a.isSolved)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (sortedAttempts.length === 0) return 0;

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  const lastSolveDate = new Date(sortedAttempts[0].timestamp);
  lastSolveDate.setHours(0, 0, 0, 0);

  const daysSinceLastSolve = Math.floor((currentDate - lastSolveDate) / (1000 * 60 * 60 * 24));
  if (daysSinceLastSolve > 1) return 0;

  const uniqueDays = new Set();
  sortedAttempts.forEach(attempt => {
    const date = new Date(attempt.timestamp);
    uniqueDays.add(date.toDateString());
  });

  const daysArray = Array.from(uniqueDays).sort((a, b) => new Date(b) - new Date(a));

  for (let i = 0; i < daysArray.length; i++) {
    const date = new Date(daysArray[i]);
    const expectedDate = new Date(currentDate);
    expectedDate.setDate(expectedDate.getDate() - i);

    if (date.toDateString() === expectedDate.toDateString()) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function calculateBestStreak(attempts) {
  if (attempts.length === 0) return 0;

  const sortedAttempts = [...attempts]
    .filter(a => a.isSolved)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  if (sortedAttempts.length === 0) return 0;

  let maxStreak = 0;
  let currentStreak = 0;
  let lastDate = null;

  const uniqueDays = new Set();
  sortedAttempts.forEach(attempt => {
    const date = new Date(attempt.timestamp);
    uniqueDays.add(date.toDateString());
  });

  const daysArray = Array.from(uniqueDays).sort((a, b) => new Date(a) - new Date(b));

  for (let i = 0; i < daysArray.length; i++) {
    const currentDate = new Date(daysArray[i]);

    if (lastDate === null) {
      currentStreak = 1;
    } else {
      const daysDiff = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));
      if (daysDiff === 1) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
    }

    maxStreak = Math.max(maxStreak, currentStreak);
    lastDate = currentDate;
  }

  return maxStreak;
}

function calculateFastestSolve(attempts) {
  const solvedAttempts = attempts.filter(a => a.isSolved && a.timeSpentSeconds > 0);
  if (solvedAttempts.length === 0) return null;

  return Math.min(...solvedAttempts.map(a => a.timeSpentSeconds));
}

function calculateTrends(attempts) {
  const dateRange = document.getElementById("dateRange").value;
  if (dateRange === "all") return { total: 0, solveRate: 0, avgTime: 0, streak: 0 };

  const days = parseInt(dateRange);
  const now = new Date();
  const currentPeriodStart = new Date(now);
  currentPeriodStart.setDate(currentPeriodStart.getDate() - days);

  const previousPeriodStart = new Date(currentPeriodStart);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - days);

  const currentPeriod = attempts.filter(a => new Date(a.timestamp) >= currentPeriodStart);
  const previousPeriod = attempts.filter(a => {
    const date = new Date(a.timestamp);
    return date >= previousPeriodStart && date < currentPeriodStart;
  });

  const currentStats = {
    total: currentPeriod.length,
    solveRate:
      currentPeriod.length > 0 ? (currentPeriod.filter(a => a.isSolved).length / currentPeriod.length) * 100 : 0,
    avgTime:
      currentPeriod.length > 0
        ? currentPeriod.reduce((acc, a) => acc + a.timeSpentSeconds, 0) / currentPeriod.length
        : 0,
  };

  const previousStats = {
    total: previousPeriod.length,
    solveRate:
      previousPeriod.length > 0 ? (previousPeriod.filter(a => a.isSolved).length / previousPeriod.length) * 100 : 0,
    avgTime:
      previousPeriod.length > 0
        ? previousPeriod.reduce((acc, a) => acc + a.timeSpentSeconds, 0) / previousPeriod.length
        : 0,
  };

  return {
    total: currentStats.total - previousStats.total,
    solveRate: currentStats.solveRate - previousStats.solveRate,
    avgTime: currentStats.avgTime - previousStats.avgTime,
  };
}

function updateStatCards(stats) {
  document.getElementById("totalPuzzles").textContent = stats.total;
  document.getElementById("solveRate").textContent = stats.solveRate + "%";
  document.getElementById("currentStreak").textContent = stats.streak;
  document.getElementById("avgTime").textContent = stats.avgTime.toFixed(1) + "s";

  document.getElementById("bestStreak").textContent = stats.bestStreak;
  document.getElementById("fastestSolve").textContent = stats.fastestSolve ? stats.fastestSolve.toFixed(1) + "s" : "--";

  updateTrendIndicators(stats.trends);

  const indicator = document.getElementById("streakIndicator");
  if (stats.streak > 0) {
    indicator.className = "streak-indicator";
  } else {
    indicator.className = "";
  }

  highlightBestStat(stats);
  generateInsights(stats);
}

function updateTrendIndicators(trends) {
  const trendElements = {
    totalTrend: trends.total,
    solveRateTrend: trends.solveRate,
    timeTrend: -trends.avgTime,
  };

  Object.entries(trendElements).forEach(([elementId, value]) => {
    const element = document.getElementById(elementId);
    if (element && Math.abs(value) > 0.1) {
      const isPositive = value > 0;
      const arrow = isPositive ? "↑" : "↓";
      const className = isPositive ? "trend-up" : "trend-down";

      let displayValue = Math.abs(value).toFixed(elementId === "totalTrend" ? 0 : 1);
      if (elementId === "timeTrend") displayValue += "s";
      if (elementId === "solveRateTrend") displayValue += "%";

      element.textContent = `${arrow} ${displayValue}`;
      element.className = `stat-trend ${className}`;
    } else if (element) {
      element.textContent = "";
      element.className = "stat-trend";
    }
  });
}

function highlightBestStat(stats) {
  document.querySelectorAll(".stat-card.highlight").forEach(card => {
    if (card.id !== "solveRateCard") {
      card.classList.remove("highlight");
    }
  });

  if (stats.streak >= 7) {
    document.querySelector("#currentStreak").closest(".stat-card").classList.add("highlight");
  }

  if (stats.solveRate >= 90) {
    document.getElementById("solveRateCard").classList.add("highlight");
  }
}

function generateInsights(stats) {
  const insights = [];
  const container = document.getElementById("insightsContainer");

  if (stats.solveRate >= 95) {
    insights.push("• Outstanding! You're in the top tier with 95%+ solve rate.");
  } else if (stats.solveRate >= 90) {
    insights.push("• Excellent! You're solving 90%+ of puzzles consistently.");
  } else if (stats.solveRate >= 80) {
    insights.push("• Great work! You're solving 80%+ puzzles. Push for 90%!");
  } else if (stats.solveRate >= 70) {
    insights.push("• Good performance! Focus on tactical patterns to reach 80%.");
  } else if (stats.solveRate >= 50) {
    insights.push("• Room for improvement. Study common tactical motifs.");
  } else if (stats.total > 0) {
    insights.push("• Focus on pattern recognition and take your time analyzing.");
  }

  if (stats.avgTime < 10) {
    insights.push("• Blazing speed! Your pattern recognition is exceptional.");
  } else if (stats.avgTime < 15) {
    insights.push("• Lightning fast! You're solving puzzles very quickly.");
  } else if (stats.avgTime < 30) {
    insights.push("• Good speed! Balance between accuracy and quick recognition.");
  } else if (stats.avgTime < 60) {
    insights.push("• Steady pace. Try to spot key pieces and threats faster.");
  } else if (stats.avgTime > 90) {
    insights.push("• Take time to analyze, but practice recognizing common patterns.");
  } else if (stats.avgTime > 60) {
    insights.push("• Consider studying tactical patterns to improve speed.");
  }

  if (stats.streak >= 30) {
    insights.push(`• Incredible ${stats.streak}-day streak! You're a puzzle master!`);
  } else if (stats.streak >= 14) {
    insights.push(`• Amazing ${stats.streak}-day streak! Keep the momentum going!`);
  } else if (stats.streak >= 7) {
    insights.push(`• Great ${stats.streak}-day streak! Consistency is paying off!`);
  } else if (stats.streak >= 3) {
    insights.push(`• Nice ${stats.streak}-day streak building up! Keep it going!`);
  } else if (stats.streak === 0 && stats.total > 0) {
    insights.push("• Start a new streak today! Daily practice builds chess vision.");
  }

  if (stats.bestStreak >= 30) {
    insights.push(`• Your best streak of ${stats.bestStreak} days shows incredible dedication!`);
  } else if (stats.bestStreak >= 14) {
    insights.push(`• Your best streak of ${stats.bestStreak} days is impressive! Can you beat it?`);
  } else if (stats.bestStreak >= 7) {
    insights.push(`• Your ${stats.bestStreak}-day best streak shows good consistency habits.`);
  }

  if (stats.fastestSolve && stats.fastestSolve < 5) {
    insights.push(`• Incredible! Your fastest solve in ${stats.fastestSolve.toFixed(1)}s is lightning speed!`);
  } else if (stats.fastestSolve && stats.fastestSolve < 10) {
    insights.push(`• Your fastest solve in ${stats.fastestSolve.toFixed(1)}s shows excellent pattern recognition!`);
  } else if (stats.fastestSolve && stats.fastestSolve < 20) {
    insights.push(`• Good quick recognition! Your fastest solve: ${stats.fastestSolve.toFixed(1)}s.`);
  }

  if (stats.total >= 500) {
    insights.push("• Wow! 500+ puzzles solved. You're building serious tactical strength!");
  } else if (stats.total >= 200) {
    insights.push("• Great dedication! 200+ puzzles will significantly improve your game.");
  } else if (stats.total >= 100) {
    insights.push("• Good progress! 100+ puzzles solved is building your pattern library.");
  } else if (stats.total >= 50) {
    insights.push("• Nice start! Keep solving to build your tactical foundation.");
  } else if (stats.total >= 20) {
    insights.push("• Getting started! Each puzzle strengthens your chess vision.");
  }

  if (stats.solveRate < 70 && stats.avgTime > 45) {
    insights.push("• Try studying basic tactical patterns: pins, forks, and skewers.");
  } else if (stats.solveRate >= 80 && stats.avgTime > 60) {
    insights.push("• Your accuracy is good! Now work on recognizing patterns faster.");
  } else if (stats.solveRate < 60 && stats.avgTime < 20) {
    insights.push("• Slow down and analyze more carefully before making your move.");
  }

  if (stats.total === 0) {
    insights.push("• Welcome! Start solving puzzles to track your chess improvement!");
    insights.push("• Daily puzzle practice is one of the fastest ways to improve at chess.");
  } else if (insights.length === 0) {
    insights.push("• Keep practicing! Every puzzle makes you a stronger player.");
  }

  if (stats.trends && stats.trends.solveRate > 10) {
    insights.push(`• Trending up! Your solve rate improved by ${stats.trends.solveRate.toFixed(1)}% recently.`);
  } else if (stats.trends && stats.trends.solveRate < -10) {
    insights.push("• Recent dip in performance. Take your time and focus on accuracy.");
  }

  if (stats.trends && stats.trends.avgTime < -10) {
    insights.push("• Getting faster! Your solving speed has improved recently.");
  } else if (stats.trends && stats.trends.avgTime > 15) {
    insights.push("• Taking more time lately. Ensure you maintain accuracy while speeding up.");
  }

  container.innerHTML = insights.map(insight => `<div class="insight-item">${insight}</div>`).join("");
}

function createPerformanceChart(attempts) {
  const ctx = document.getElementById("performanceChart").getContext("2d");

  if (window.performanceChart && typeof window.performanceChart.destroy === "function") {
    window.performanceChart.destroy();
  }

  const dateRange = document.getElementById("dateRange").value;
  const performanceData = getPerformanceData(attempts, dateRange);

  window.performanceChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: performanceData.labels,
      datasets: [
        {
          label: "Solved",
          data: performanceData.solved,
          backgroundColor: "rgba(72, 187, 120, 0.8)",
          borderColor: "#48bb78",
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: "Failed",
          data: performanceData.failed,
          backgroundColor: "rgba(245, 101, 101, 0.8)",
          borderColor: "#f56565",
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index",
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            font: { size: 10 },
            color: "#718096",
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(226, 232, 240, 0.5)",
          },
          ticks: {
            stepSize: 1,
            font: { size: 10 },
            color: "#718096",
          },
        },
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            font: { size: 11 },
            color: "#4a5568",
            usePointStyle: true,
            padding: 15,
          },
        },
        tooltip: {
          backgroundColor: "rgba(45, 55, 72, 0.9)",
          titleColor: "#fff",
          bodyColor: "#fff",
          borderColor: "#667eea",
          borderWidth: 1,
        },
      },
    },
  });
}

function getPerformanceData(attempts, dateRange) {
  if (dateRange === "all") {
    return getMonthlyData(attempts);
  } else {
    const days = parseInt(dateRange);
    return getDailyData(attempts, days);
  }
}

function getDailyData(attempts, dayCount) {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = dayCount - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    days.push({
      date: date,
      label: date.toLocaleDateString("en", { month: "short", day: "numeric" }),
      solved: 0,
      failed: 0,
    });
  }

  attempts.forEach(attempt => {
    const attemptDate = new Date(attempt.timestamp);
    attemptDate.setHours(0, 0, 0, 0);

    const dayIndex = days.findIndex(d => d.date.getTime() === attemptDate.getTime());
    if (dayIndex !== -1) {
      if (attempt.isSolved) {
        days[dayIndex].solved++;
      } else if (attempt.isFinished) {
        days[dayIndex].failed++;
      }
    }
  });

  return {
    labels: days.map(d => d.label),
    solved: days.map(d => d.solved),
    failed: days.map(d => d.failed),
  };
}

function getMonthlyData(attempts) {
  const monthMap = new Map();

  attempts.forEach(attempt => {
    const date = new Date(attempt.timestamp);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const monthLabel = date.toLocaleDateString("en", { year: "numeric", month: "short" });

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, { label: monthLabel, solved: 0, failed: 0, date: date });
    }

    const monthData = monthMap.get(monthKey);
    if (attempt.isSolved) {
      monthData.solved++;
    } else if (attempt.isFinished) {
      monthData.failed++;
    }
  });

  const sortedMonths = Array.from(monthMap.values()).sort((a, b) => a.date - b.date);

  return {
    labels: sortedMonths.map(m => m.label),
    solved: sortedMonths.map(m => m.solved),
    failed: sortedMonths.map(m => m.failed),
  };
}

function createTimeDistributionChart(attempts) {
  const ctx = document.getElementById("timeChart").getContext("2d");

  if (window.timeChart && typeof window.timeChart.destroy === "function") {
    window.timeChart.destroy();
  }

  const timeRanges = {
    "0-10s": 0,
    "10-30s": 0,
    "30-60s": 0,
    "60s+": 0,
  };

  attempts.forEach(attempt => {
    const time = attempt.timeSpentSeconds;
    if (time < 10) timeRanges["0-10s"]++;
    else if (time < 30) timeRanges["10-30s"]++;
    else if (time < 60) timeRanges["30-60s"]++;
    else timeRanges["60s+"]++;
  });

  const colors = [
    "rgba(102, 126, 234, 0.8)",
    "rgba(159, 122, 234, 0.8)",
    "rgba(237, 137, 54, 0.8)",
    "rgba(246, 173, 85, 0.8)",
  ];

  const borderColors = ["#667eea", "#9f7aea", "#ed8936", "#f6ad55"];

  window.timeChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(timeRanges),
      datasets: [
        {
          data: Object.values(timeRanges),
          backgroundColor: colors,
          borderColor: borderColors,
          borderWidth: 2,
          hoverBorderWidth: 3,
          hoverBorderColor: "#2d3748",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "60%",
      plugins: {
        legend: {
          position: "right",
          labels: {
            font: { size: 10 },
            color: "#4a5568",
            usePointStyle: true,
            padding: 12,
          },
        },
        tooltip: {
          backgroundColor: "rgba(45, 55, 72, 0.9)",
          titleColor: "#fff",
          bodyColor: "#fff",
          borderColor: "#667eea",
          borderWidth: 1,
          callbacks: {
            label: function (context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
              return `${context.label}: ${context.parsed} (${percentage}%)`;
            },
          },
        },
      },
    },
  });
}

function createTrendChart(attempts) {
  const ctx = document.getElementById("trendChart").getContext("2d");

  if (window.trendChart && typeof window.trendChart.destroy === "function") {
    window.trendChart.destroy();
  }

  const sortedAttempts = [...attempts].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const trendData = [];
  const windowSize = Math.min(5, Math.max(3, Math.floor(sortedAttempts.length / 4)));

  if (sortedAttempts.length < 2) {
    if (sortedAttempts.length === 1) {
      const rate = sortedAttempts[0].isSolved ? 100 : 0;
      trendData.push({ x: 1, y: rate, label: "1" });
    }
  } else {
    for (let i = windowSize - 1; i < sortedAttempts.length; i++) {
      const window = sortedAttempts.slice(i - windowSize + 1, i + 1);
      const solvedCount = window.filter(a => a.isSolved).length;
      const rate = (solvedCount / windowSize) * 100;

      trendData.push({
        x: i + 1,
        y: rate,
        label: `${i + 1}`,
      });
    }
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, "rgba(102, 126, 234, 0.3)");
  gradient.addColorStop(1, "rgba(102, 126, 234, 0.05)");

  window.trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: trendData.map(d => d.label),
      datasets: [
        {
          label: "Solve Rate %",
          data: trendData.map(d => d.y),
          borderColor: "#667eea",
          backgroundColor: gradient,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: "#667eea",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointHoverBackgroundColor: "#5a67d8",
          borderWidth: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index",
      },
      scales: {
        x: {
          display: trendData.length > 1,
          title: {
            display: trendData.length > 1,
            text: "Puzzle Number",
            font: { size: 11, weight: "bold" },
            color: "#4a5568",
          },
          grid: {
            color: "rgba(226, 232, 240, 0.5)",
          },
          ticks: {
            font: { size: 10 },
            color: "#718096",
          },
        },
        y: {
          beginAtZero: true,
          max: 100,
          grid: {
            color: "rgba(226, 232, 240, 0.5)",
          },
          ticks: {
            font: { size: 10 },
            color: "#718096",
            callback: function (value) {
              return value + "%";
            },
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(45, 55, 72, 0.9)",
          titleColor: "#fff",
          bodyColor: "#fff",
          borderColor: "#667eea",
          borderWidth: 1,
          callbacks: {
            label: function (context) {
              return `Solve Rate: ${context.parsed.y.toFixed(1)}% (Rolling avg of ${windowSize})`;
            },
          },
        },
      },
    },
  });
}

function initSettings() {
  const volumeSlider = document.getElementById("soundVolume");
  const volumeDisplay = document.getElementById("volumeDisplay");

  const updateVolumeDisplay = value => {
    volumeDisplay.textContent = value + "%";
  };

  updateVolumeDisplay(volumeSlider.value);

  volumeSlider.addEventListener("input", function () {
    updateVolumeDisplay(this.value);
    saveSettings();
  });

  document.getElementById("autoZenMode").addEventListener("change", saveSettings);
  document.getElementById("hideLayoutAside").addEventListener("change", saveSettings);
  document.getElementById("dailyPuzzlesDisabled").addEventListener("change", saveSettings);
  document.getElementById("soundsDisabled").addEventListener("change", saveSettings);

  chrome.storage.local.get("settings", function (data) {
    if (data.settings) {
      document.getElementById("autoZenMode").checked = data.settings.autoZenMode || false;
      document.getElementById("hideLayoutAside").checked = data.settings.hideLayoutAside || false;
      document.getElementById("dailyPuzzlesDisabled").checked = data.settings.dailyPuzzlesDisabled || false;
      document.getElementById("soundsDisabled").checked = data.settings.soundsDisabled || false;
      const volume = data.settings.soundVolume || 30;
      document.getElementById("soundVolume").value = volume;
      updateVolumeDisplay(volume);
    }
  });
}

function saveSettings() {
  const settings = {
    autoZenMode: document.getElementById("autoZenMode").checked,
    hideLayoutAside: document.getElementById("hideLayoutAside").checked,
    dailyPuzzlesDisabled: document.getElementById("dailyPuzzlesDisabled").checked,
    soundsDisabled: document.getElementById("soundsDisabled").checked,
    soundVolume: document.getElementById("soundVolume").value,
  };
  chrome.storage.local.set({ settings });
}

function initInsightsToggle() {
  chrome.storage.local.get("insightsVisible", function (data) {
    const isVisible = data.insightsVisible !== false;
    const container = document.getElementById("insightsContainer");
    const section = document.querySelector(".insights-section");

    if (container && section) {
      if (!isVisible) {
        container.style.maxHeight = "0";
        container.style.opacity = "0";
        container.style.marginBottom = "0";
      } else {
        container.style.maxHeight = "none";
        container.style.opacity = "1";
        container.style.marginBottom = "";
      }

      const title = document.querySelector(".insights-title");
      if (title) {
        const toggleBtn = document.createElement("button");
        toggleBtn.className = "insights-toggle";
        toggleBtn.innerHTML = isVisible ? "▼" : "▶";
        toggleBtn.style.cssText = `
          background: none;
          border: none;
          color: #667eea;
          cursor: pointer;
          font-size: 12px;
          margin-left: auto;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s;
          font-family: monospace;
          font-weight: bold;
        `;

        toggleBtn.addEventListener("click", function () {
          const isCurrentlyVisible = container.style.maxHeight !== "0px";
          const newVisibility = !isCurrentlyVisible;

          if (newVisibility) {
            container.style.maxHeight = "500px";
            container.style.opacity = "1";
            container.style.marginBottom = "";
            toggleBtn.innerHTML = "▼";
          } else {
            container.style.maxHeight = "0";
            container.style.opacity = "0";
            container.style.marginBottom = "0";
            toggleBtn.innerHTML = "▶";
          }

          chrome.storage.local.set({ insightsVisible: newVisibility });
        });

        toggleBtn.addEventListener("mouseenter", function () {
          this.style.backgroundColor = "rgba(102, 126, 234, 0.1)";
          this.style.transform = "scale(1.1)";
        });

        toggleBtn.addEventListener("mouseleave", function () {
          this.style.backgroundColor = "transparent";
          this.style.transform = "scale(1)";
        });

        title.appendChild(toggleBtn);
      }
    }
  });
}
