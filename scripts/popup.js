const state = {
  attempts: [],
  settings: {},
  charts: {},
  currentTab: "stats",
  userRating: null,
  customDateRange: null,
};

const elements = {
  navBtns: document.querySelectorAll(".nav-btn"),
  tabs: document.querySelectorAll(".tab-content"),
  dateRange: document.getElementById("dateRange"),
  toggles: document.querySelectorAll(".toggle"),
  puzzleModeOptions: document.querySelectorAll(".puzzle-mode-option"),
  collapsibleHeaders: document.querySelectorAll("[data-collapsible]"),
  volumeSlider: document.getElementById("soundVolume"),
  volumeDisplay: document.getElementById("volumeDisplay"),
  customRangeBtn: document.getElementById("customRangeBtn"),
  datePickerModal: document.getElementById("datePickerModal"),
  modalOverlay: document.getElementById("modalOverlay"),
  startDate: document.getElementById("startDate"),
  endDate: document.getElementById("endDate"),
  cancelDatePicker: document.getElementById("cancelDatePicker"),
  applyDatePicker: document.getElementById("applyDatePicker"),
  customRangeDates: document.getElementById("customRangeDates"),
  dateRangeDisplay: document.getElementById("dateRangeDisplay"),
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  loadData();
  initEventListeners();
  initSettings();
  initDatePicker();
}

function initEventListeners() {
  elements.navBtns.forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  elements.dateRange.addEventListener("change", handleDateRangeChange);

  elements.toggles.forEach(toggle => {
    toggle.addEventListener("click", () => {
      const settingItem = toggle.closest(".setting-item");
      const volumeControl = toggle.closest(".volume-control");
      if (settingItem?.classList.contains("locked") || volumeControl?.classList.contains("locked")) {
        return;
      }

      toggle.classList.toggle("active");
      saveSettings();

      if (toggle.id === "extensionDisabled") {
        updateSettingsLockState();
      }
    });
  });

  elements.puzzleModeOptions.forEach(option => {
    option.addEventListener("click", () => {
      const puzzleModeContainer = option.closest(".puzzle-mode-setting");
      if (puzzleModeContainer?.classList.contains("locked")) {
        return;
      }

      elements.puzzleModeOptions.forEach(opt => opt.classList.remove("active"));
      option.classList.add("active");

      saveSettings();
    });
  });

  elements.collapsibleHeaders.forEach(header => {
    header.addEventListener("click", () => {
      const platform = header.dataset.collapsible;
      const controls = document.getElementById(`${platform}-controls`);

      if (controls) {
        const isCollapsed = controls.classList.contains("collapsed");

        if (isCollapsed) {
          controls.classList.remove("collapsed");
          header.classList.remove("collapsed");
        } else {
          controls.classList.add("collapsed");
          header.classList.add("collapsed");
        }
      }
    });
  });

  elements.volumeSlider.addEventListener("input", e => {
    const volumeControl = e.target.closest(".volume-control");
    if (volumeControl?.classList.contains("locked")) {
      return;
    }

    if (elements.volumeDisplay) {
      elements.volumeDisplay.textContent = `${e.target.value}%`;
    }
    updateSliderBackground(e.target);
    updateVolumeIndicators(e.target.value);
    saveSettings();
  });
}

function handleDateRangeChange() {
  const value = elements.dateRange.value;

  if (value === "custom") {
    if (elements.customRangeBtn) {
      elements.customRangeBtn.style.display = "flex";
    }
    openDatePicker();
  } else {
    if (elements.customRangeBtn) {
      elements.customRangeBtn.style.display = "none";
    }
    state.customDateRange = null;
    loadStatistics();
  }
}

function initDatePicker() {
  if (!elements.startDate || !elements.endDate) return;

  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  elements.startDate.value = formatDateDDMMYYYY(thirtyDaysAgo);
  elements.endDate.value = formatDateDDMMYYYY(today);

  elements.startDate.addEventListener("input", function (e) {
    formatDateInput(e.target);
  });

  elements.endDate.addEventListener("input", function (e) {
    formatDateInput(e.target);
  });

  elements.startDate.addEventListener("blur", function (e) {
    const date = parseDateDDMMYYYY(e.target.value);
    if (date) {
      e.target.value = formatDateDDMMYYYY(date);
      e.target.style.borderColor = "var(--border)";
    } else if (e.target.value.trim() !== "") {
      e.target.style.borderColor = "var(--danger)";
    }
  });

  elements.endDate.addEventListener("blur", function (e) {
    const date = parseDateDDMMYYYY(e.target.value);
    if (date) {
      e.target.value = formatDateDDMMYYYY(date);
      e.target.style.borderColor = "var(--border)";
    } else if (e.target.value.trim() !== "") {
      e.target.style.borderColor = "var(--danger)";
    }
  });

  if (elements.customRangeBtn) {
    elements.customRangeBtn.addEventListener("click", openDatePicker);
  }
  if (elements.cancelDatePicker) {
    elements.cancelDatePicker.addEventListener("click", closeDatePicker);
  }
  if (elements.applyDatePicker) {
    elements.applyDatePicker.addEventListener("click", applyDateRange);
  }
  if (elements.modalOverlay) {
    elements.modalOverlay.addEventListener("click", closeDatePicker);
  }
}

function openDatePicker() {
  if (elements.datePickerModal) {
    elements.datePickerModal.classList.add("active");
  }
  if (elements.modalOverlay) {
    elements.modalOverlay.classList.add("active");
  }
}

function closeDatePicker() {
  if (elements.datePickerModal) {
    elements.datePickerModal.classList.remove("active");
  }
  if (elements.modalOverlay) {
    elements.modalOverlay.classList.remove("active");
  }

  if (!state.customDateRange) {
    elements.dateRange.value = "30";
    if (elements.customRangeBtn) {
      elements.customRangeBtn.style.display = "none";
    }
    loadStatistics();
  }
}

function applyDateRange() {
  if (!elements.startDate || !elements.endDate) return;

  const startDate = parseDateDDMMYYYY(elements.startDate.value);
  const endDate = parseDateDDMMYYYY(elements.endDate.value);

  if (!startDate) {
    alert("Please enter a valid start date in DD/MM/YYYY format");
    elements.startDate.focus();
    return;
  }

  if (!endDate) {
    alert("Please enter a valid end date in DD/MM/YYYY format");
    elements.endDate.focus();
    return;
  }

  if (startDate > endDate) {
    alert("Start date must be before end date");
    return;
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (startDate > today) {
    alert("Start date cannot be in the future");
    return;
  }

  if (endDate > today) {
    alert("End date cannot be in the future");
    return;
  }

  state.customDateRange = { start: startDate, end: endDate };

  if (elements.customRangeDates) {
    const startStr = formatDateDDMMYYYY(startDate);
    const endStr = formatDateDDMMYYYY(endDate);
    elements.customRangeDates.textContent = `${startStr} - ${endStr}`;
  }

  closeDatePicker();
  loadStatistics();
}

function switchTab(tab) {
  state.currentTab = tab;
  elements.navBtns.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  elements.tabs.forEach(content => {
    content.classList.toggle("active", content.id === tab);
  });
}

function loadData() {
  chrome.storage.local.get(["puzzleAttempts", "userRating"], data => {
    console.log("~ data: ", data);
    state.attempts = data.puzzleAttempts || [];
    state.userRating = data.userRating || null;
    loadStatistics();
  });
}

function loadStatistics() {
  const filtered = filterAttempts(state.attempts);
  const stats = calculateStats(filtered);

  updateUI(stats);
  updateCharts(filtered);
  createActivityHeatmap(filtered);
  updateDateRangeDisplay(filtered);
}

function filterAttempts(attempts) {
  if (state.customDateRange) {
    return attempts.filter(a => {
      const date = new Date(a.timestamp);
      return date >= state.customDateRange.start && date <= state.customDateRange.end;
    });
  }

  const range = elements.dateRange.value;
  if (range === "all") return attempts;

  const days = parseInt(range);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);

  return attempts.filter(a => new Date(a.timestamp) >= cutoff);
}

function calculateStats(attempts) {
  const total = attempts.length;
  const solved = attempts.filter(a => a.isSolved).length;

  const currentStreak = calculateCurrentStreak(attempts);
  const bestStreak = calculateBestStreak(attempts);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const trends = calculateTrends(attempts);

  return {
    total,
    solved,
    solveRate: total > 0 ? Math.round((solved / total) * 100) : 0,
    avgTime: attempts.length > 0 ? attempts.reduce((sum, a) => sum + a.timeSpentSeconds, 0) / attempts.length : 0,
    currentStreak,
    bestStreak,
    trends,
  };
}

function calculateCurrentStreak(attempts) {
  if (!attempts.length) return 0;

  const sorted = [...attempts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let currentDate = new Date(today);

  const dailyAttempts = {};
  sorted.forEach(a => {
    const dateStr = new Date(a.timestamp).toDateString();
    if (!dailyAttempts[dateStr]) {
      dailyAttempts[dateStr] = a;
    }
  });

  while (dailyAttempts[currentDate.toDateString()]?.isSolved) {
    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
}

function calculateBestStreak(attempts) {
  if (!attempts.length) return 0;

  const sorted = [...attempts].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  let bestStreak = 0;
  let currentStreak = 0;
  let lastDate = null;

  sorted.forEach(attempt => {
    if (!attempt.isSolved) {
      currentStreak = 0;
      return;
    }

    const attemptDate = new Date(attempt.timestamp);
    attemptDate.setHours(0, 0, 0, 0);

    if (!lastDate) {
      currentStreak = 1;
    } else {
      const daysDiff = Math.floor((attemptDate - lastDate) / (1000 * 60 * 60 * 24));
      if (daysDiff === 1) {
        currentStreak++;
      } else if (daysDiff > 1) {
        currentStreak = 1;
      }
    }

    bestStreak = Math.max(bestStreak, currentStreak);
    lastDate = attemptDate;
  });

  return bestStreak;
}

function calculateTrends(attempts) {
  if (attempts.length < 2) return {};

  const midpoint = Math.floor(attempts.length / 2);
  const firstHalf = attempts.slice(0, midpoint);
  const secondHalf = attempts.slice(midpoint);

  const firstStats = {
    total: firstHalf.length,
    solveRate: firstHalf.length > 0 ? (firstHalf.filter(a => a.isSolved).length / firstHalf.length) * 100 : 0,
    avgTime: firstHalf.length > 0 ? firstHalf.reduce((sum, a) => sum + a.timeSpentSeconds, 0) / firstHalf.length : 0,
  };

  const secondStats = {
    total: secondHalf.length,
    solveRate: secondHalf.length > 0 ? (secondHalf.filter(a => a.isSolved).length / secondHalf.length) * 100 : 0,
    avgTime: secondHalf.length > 0 ? secondHalf.reduce((sum, a) => sum + a.timeSpentSeconds, 0) / secondHalf.length : 0,
  };

  return {
    total: secondStats.total - firstStats.total,
    solveRate: secondStats.solveRate - firstStats.solveRate,
    avgTime: secondStats.avgTime - firstStats.avgTime,
  };
}

function updateUI(stats) {
  const statsGrid = document.querySelector(".stats-grid");

  const totalPuzzles = document.getElementById("totalPuzzles");
  if (totalPuzzles) totalPuzzles.textContent = stats.total;

  const solveRate = document.getElementById("solveRate");
  if (solveRate) solveRate.textContent = `${stats.solveRate}%`;

  const currentStreak = document.getElementById("currentStreak");
  if (currentStreak) currentStreak.textContent = stats.currentStreak;

  const avgTime = document.getElementById("avgTime");
  if (avgTime) avgTime.textContent = `${Math.round(stats.avgTime)}s`;

  const totalSolved = document.getElementById("totalSolved");
  if (totalSolved) totalSolved.textContent = stats.solved;

  const solvedProgress = document.getElementById("solvedProgress");
  if (solvedProgress) {
    const percentage = stats.total > 0 ? (stats.solved / stats.total) * 100 : 0;
    solvedProgress.style.width = `${percentage}%`;
  }

  const bestStreak = document.getElementById("bestStreak");
  if (bestStreak) bestStreak.textContent = stats.bestStreak;

  const streakIcon = document.getElementById("streakIcon");
  if (streakIcon) streakIcon.textContent = stats.currentStreak > 0 ? "🔥" : "";

  const ratingCard = document.querySelector(".rating-card");

  if (state.userRating) {
    const currentRating = Math.round(state.userRating.rating || state.userRating.defaultPuzzleRating || DEFAULT_PUZZLE_RATING);
    const tier = getUserTier(currentRating);

    const userRating = document.getElementById("userRating");
    if (userRating) userRating.textContent = currentRating;

    const userTier = document.getElementById("userTier");
    if (userTier) userTier.textContent = tier.name;

    const userTierIcon = document.getElementById("userTierIcon");
    if (userTierIcon) {
      userTierIcon.textContent = tier.icon;
      userTierIcon.style.color = tier.color;
    }

    updateRatingProgress(currentRating, tier);

    updateRatingDetails(currentRating, tier, stats);
  } else {
    const tier = getUserTier(DEFAULT_PUZZLE_RATING);

    const userRating = document.getElementById("userRating");
    if (userRating) userRating.textContent = DEFAULT_PUZZLE_RATING;

    const userTier = document.getElementById("userTier");
    if (userTier) userTier.textContent = tier.name;

    const userTierIcon = document.getElementById("userTierIcon");
    if (userTierIcon) {
      userTierIcon.textContent = tier.icon;
      userTierIcon.style.color = tier.color;
    }

    updateRatingProgress(DEFAULT_PUZZLE_RATING, tier);

    updateRatingDetails(DEFAULT_PUZZLE_RATING, tier, stats);
  }

  if (ratingCard) {
    ratingCard.classList.add("loaded");

    ratingCard.querySelectorAll(".skeleton").forEach(el => el.classList.remove("skeleton"));
  }
  if (statsGrid) {
    statsGrid.classList.add("loaded");

    statsGrid.querySelectorAll(".skeleton").forEach(el => el.classList.remove("skeleton"));
  }

  updateTrends(stats.trends);
}

function updateTrends(trends) {
  const trendElements = {
    totalTrend: document.getElementById("totalTrend"),
    solveRateTrend: document.getElementById("solveRateTrend"),
    timeTrend: document.getElementById("timeTrend"),
  };

  if (trends.total !== undefined && Math.abs(trends.total) > 0 && trendElements.totalTrend) {
    trendElements.totalTrend.textContent = trends.total > 0 ? `↑ +${trends.total}` : `↓ ${trends.total}`;
    trendElements.totalTrend.className = `stat-trend ${trends.total > 0 ? "trend-up" : "trend-down"}`;
  }

  if (trends.solveRate !== undefined && Math.abs(trends.solveRate) > 1 && trendElements.solveRateTrend) {
    trendElements.solveRateTrend.textContent = trends.solveRate > 0 ? `↑ +${Math.round(trends.solveRate)}%` : `↓ ${Math.round(trends.solveRate)}%`;
    trendElements.solveRateTrend.className = `stat-trend ${trends.solveRate > 0 ? "trend-up" : "trend-down"}`;
  }

  if (trends.avgTime !== undefined && Math.abs(trends.avgTime) > 1 && trendElements.timeTrend) {
    const isImprovement = trends.avgTime < 0;
    trendElements.timeTrend.textContent = isImprovement ? `↑ -${Math.abs(Math.round(trends.avgTime))}s` : `↓ +${Math.round(trends.avgTime)}s`;
    trendElements.timeTrend.className = `stat-trend ${isImprovement ? "trend-up" : "trend-down"}`;
  }
}

function createActivityHeatmap(attempts) {
  const heatmapGrid = document.getElementById("heatmapGrid");
  const heatmapMonths = document.getElementById("heatmapMonths");
  if (!heatmapGrid || !heatmapMonths) return;

  heatmapGrid.innerHTML = "";
  heatmapMonths.innerHTML = "";

  const filteredAttempts = filterAttempts(attempts);

  let actualStartDate, actualEndDate;
  const range = elements.dateRange.value;

  if (state.customDateRange) {
    actualStartDate = new Date(state.customDateRange.start);
    actualEndDate = new Date(state.customDateRange.end);
  } else if (range === "all" && filteredAttempts.length > 0) {
    const dates = filteredAttempts.map(a => new Date(a.timestamp));
    actualStartDate = new Date(Math.min(...dates));
    actualEndDate = new Date();
  } else {
    const days = range === "all" ? 365 : parseInt(range);
    actualEndDate = new Date();
    actualStartDate = new Date();
    actualStartDate.setDate(actualStartDate.getDate() - days + 1);
  }

  actualStartDate.setHours(0, 0, 0, 0);
  actualEndDate.setHours(23, 59, 59, 999);

  const startOfWeek = new Date(actualStartDate);
  const startWeekday = startOfWeek.getDay();
  const daysToSubtract = startWeekday === 0 ? 6 : startWeekday - 1;
  startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(actualEndDate);
  const endWeekday = endOfWeek.getDay();
  const daysToAdd = endWeekday === 0 ? 0 : 7 - endWeekday;
  endOfWeek.setDate(endOfWeek.getDate() + daysToAdd);
  endOfWeek.setHours(23, 59, 59, 999);

  const activityMap = {};
  filteredAttempts.forEach(attempt => {
    const date = new Date(attempt.timestamp);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    if (!activityMap[dateKey]) {
      activityMap[dateKey] = { solved: 0, failed: 0, total: 0 };
    }

    if (attempt.isSolved) {
      activityMap[dateKey].solved++;
    } else {
      activityMap[dateKey].failed++;
    }
    activityMap[dateKey].total++;
  });

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthPositions = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let weekCount = 0;
  const currentWeekStart = new Date(startOfWeek);
  const allCells = [];

  while (currentWeekStart <= endOfWeek) {
    let hasVisibleCellsThisWeek = false;

    for (let day = 0; day < 7; day++) {
      const cellDate = new Date(currentWeekStart);
      cellDate.setDate(currentWeekStart.getDate() + day);

      if (cellDate >= actualStartDate && cellDate <= actualEndDate) {
        hasVisibleCellsThisWeek = true;

        const dateKey = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, "0")}-${String(cellDate.getDate()).padStart(
          2,
          "0"
        )}`;
        const cell = document.createElement("div");
        cell.className = "heatmap-cell";

        if (activityMap[dateKey]) {
          const activity = activityMap[dateKey];
          if (activity.failed > 0 && activity.solved === 0) {
            cell.classList.add("failed");
          } else {
            const level = Math.min(4, Math.max(1, activity.solved));
            cell.classList.add(`level-${level}`);
          }
        }

        if (cellDate.getTime() === today.getTime()) {
          cell.classList.add("today");
        }

        const dateStr = cellDate.toLocaleDateString("en", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });

        let tooltip = dateStr;
        if (activityMap[dateKey]) {
          const activity = activityMap[dateKey];
          tooltip += `\n${activity.solved} solved, ${activity.failed} failed`;
        } else {
          tooltip += "\nNo puzzles";
        }
        cell.title = tooltip;

        allCells.push(cell);
      }
    }

    if (hasVisibleCellsThisWeek) {
      const weekStartDate = new Date(currentWeekStart);
      const monthStart = new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), 1);
      const monthEnd = new Date(weekStartDate.getFullYear(), weekStartDate.getMonth() + 1, 0);

      if (weekStartDate <= monthEnd && currentWeekStart >= actualStartDate) {
        const isNewMonth =
          monthPositions.length === 0 ||
          monthPositions[monthPositions.length - 1].month !== weekStartDate.getMonth() ||
          monthPositions[monthPositions.length - 1].year !== weekStartDate.getFullYear();

        if (isNewMonth) {
          monthPositions.push({
            month: weekStartDate.getMonth(),
            year: weekStartDate.getFullYear(),
            name: monthNames[weekStartDate.getMonth()],
            position: weekCount + 1,
            date: new Date(weekStartDate),
          });
        }
      }

      weekCount++;
    }

    currentWeekStart.setDate(currentWeekStart.getDate() + 7);

    if (weekCount > 60) break;
  }

  allCells.forEach(cell => heatmapGrid.appendChild(cell));

  heatmapMonths.style.gridTemplateColumns = `repeat(${weekCount}, 1fr)`;

  monthPositions.forEach(month => {
    const monthLabel = document.createElement("div");
    monthLabel.className = "heatmap-month";
    monthLabel.textContent = month.name;
    monthLabel.style.gridColumn = `${month.position}`;
    monthLabel.style.textAlign = "left";
    heatmapMonths.appendChild(monthLabel);
  });

  initHeatmapScrollIndicators();
}

function updateDateRangeDisplay(attempts) {
  const display = elements.dateRangeDisplay;
  if (!display) return;

  if (attempts.length === 0) {
    display.textContent = "No puzzles in selected period";
    return;
  }

  const dates = attempts.map(a => new Date(a.timestamp)).sort((a, b) => a - b);
  const start = dates[0].toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
  const end = dates[dates.length - 1].toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });

  display.textContent = `Showing: ${start} to ${end}`;
}

function updateCharts(attempts) {
  createRatingChart(attempts);
  createSuccessRateChart(attempts);
  createTimeChart(attempts);
}

function createRatingChart(attempts) {
  const ratingCanvas = document.getElementById("ratingChart");
  if (!ratingCanvas) return;

  const ctx = ratingCanvas.getContext("2d");

  if (state.charts.rating) {
    state.charts.rating.destroy();
  }

  const ratingAttempts = attempts
    .filter(a => a.ratingChange !== undefined && a.ratingChange !== null && a.isUserRatingUpdated)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  if (ratingAttempts.length === 0) {
    const currentRating = state.userRating ? Math.round(state.userRating.rating) : DEFAULT_PUZZLE_RATING;
    state.charts.rating = new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Current"],
        datasets: [
          {
            data: [currentRating],
            borderColor: "#5b47e0",
            backgroundColor: "rgba(91, 71, 224, 0.1)",
            tension: 0.4,
            fill: true,
            pointRadius: 4,
          },
        ],
      },
      options: getRatingChartOptions(),
    });
    return;
  }

  const startingRating = state.userRating?.defaultPuzzleRating || DEFAULT_PUZZLE_RATING;
  const ratingData = [];
  const labels = [];

  ratingData.push(startingRating);
  labels.push("Start");

  ratingAttempts.forEach(attempt => {
    const actualRating = attempt.userRatingAfter || startingRating;
    ratingData.push(actualRating);

    const date = new Date(attempt.timestamp);
    labels.push(date.toLocaleDateString("en", { month: "short", day: "numeric" }));
  });

  state.charts.rating = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          data: ratingData,
          borderColor: "#5b47e0",
          backgroundColor: "rgba(91, 71, 224, 0.1)",
          tension: 0.4,
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: ratingData.map((_, i) => {
            if (i === 0) return "#5b47e0";
            const change = ratingAttempts[i - 1]?.ratingChange || 0;
            return change > 0 ? "#10b981" : change < 0 ? "#ef4444" : "#5b47e0";
          }),
        },
      ],
    },
    options: getRatingChartOptions(),
  });
}

function createSuccessRateChart(attempts) {
  const successCanvas = document.getElementById("successRateChart");
  if (!successCanvas) return;

  const ctx = successCanvas.getContext("2d");
  if (state.charts.successRate) {
    state.charts.successRate.destroy();
  }

  const dailyStats = {};
  attempts.forEach(attempt => {
    const dateStr = new Date(attempt.timestamp).toDateString();
    if (!dailyStats[dateStr]) {
      dailyStats[dateStr] = { total: 0, solved: 0 };
    }
    dailyStats[dateStr].total++;
    if (attempt.isSolved) dailyStats[dateStr].solved++;
  });

  const sortedDates = Object.keys(dailyStats).sort((a, b) => new Date(a) - new Date(b));
  const labels = [];
  const successRates = [];
  let totalAttempts = 0;
  let totalSolved = 0;

  sortedDates.forEach(dateStr => {
    totalAttempts += dailyStats[dateStr].total;
    totalSolved += dailyStats[dateStr].solved;

    const date = new Date(dateStr);
    labels.push(date.toLocaleDateString("en", { month: "short", day: "numeric" }));
    successRates.push(Math.round((totalSolved / totalAttempts) * 100));
  });

  state.charts.successRate = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          data: successRates,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          tension: 0.4,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: context => `Success Rate: ${context.parsed.y}%`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: "#71717a",
            font: { size: 10 },
            maxTicksLimit: 6,
          },
        },
        y: {
          min: 0,
          max: 100,
          grid: { color: "rgba(39, 39, 42, 0.5)" },
          ticks: {
            color: "#71717a",
            font: { size: 10 },
            callback: value => `${value}%`,
          },
        },
      },
    },
  });
}

function createTimeChart(attempts) {
  const timeCanvas = document.getElementById("timeChart");
  if (!timeCanvas) return;

  const ctx = timeCanvas.getContext("2d");

  if (state.charts.time) {
    state.charts.time.destroy();
  }

  const timeRanges = {
    "0-10s": 0,
    "10-30s": 0,
    "30-60s": 0,
    "60s+": 0,
  };

  attempts.forEach(a => {
    const time = a.timeSpentSeconds;
    if (time < 10) timeRanges["0-10s"]++;
    else if (time < 30) timeRanges["10-30s"]++;
    else if (time < 60) timeRanges["30-60s"]++;
    else timeRanges["60s+"]++;
  });

  state.charts.time = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(timeRanges),
      datasets: [
        {
          data: Object.values(timeRanges),
          backgroundColor: ["rgba(91, 71, 224, 0.8)", "rgba(139, 92, 246, 0.8)", "rgba(245, 158, 11, 0.8)", "rgba(239, 68, 68, 0.8)"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: {
        legend: {
          position: "right",
          labels: {
            color: "#94949c",
            font: { size: 11 },
            padding: 8,
          },
        },
      },
    },
  });
}

function getRatingChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: context => `Rating: ${Math.round(context.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: "#71717a",
          font: { size: 10 },
          maxTicksLimit: 6,
        },
      },
      y: {
        grid: { color: "rgba(39, 39, 42, 0.5)" },
        ticks: {
          color: "#71717a",
          font: { size: 10 },
          callback: value => Math.round(value),
        },
      },
    },
  };
}

function initSettings() {
  chrome.storage.local.get("settings", data => {
    if (data.settings) {
      state.settings = data.settings;

      Object.keys(data.settings).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
          if (element.classList.contains("toggle")) {
            element.classList.toggle("active", data.settings[key]);
          } else if (element.type === "range") {
            element.value = data.settings[key];
            if (key === "soundVolume" && elements.volumeDisplay) {
              elements.volumeDisplay.textContent = `${data.settings[key]}%`;
              updateSliderBackground(element);
              updateVolumeIndicators(data.settings[key]);
            }
          }
        }
      });

      if (data.settings.puzzleMode) {
        elements.puzzleModeOptions.forEach(option => {
          option.classList.toggle("active", option.dataset.mode === data.settings.puzzleMode);
        });
      }

      updateSettingsLockState();
    } else {
      const dailyOption = document.querySelector('.puzzle-mode-option[data-mode="adaptive"]');
      if (dailyOption) {
        dailyOption.classList.add("active");
      }

      if (elements.volumeSlider) {
        updateSliderBackground(elements.volumeSlider);
        updateVolumeIndicators(elements.volumeSlider.value);
      }
    }
  });
}

function updateSettingsLockState() {
  const extensionDisabledToggle = document.getElementById("extensionDisabled");
  const isExtensionDisabled = extensionDisabledToggle?.classList.contains("active");

  const settingItems = document.querySelectorAll(".setting-item");
  const puzzleModeSettings = document.querySelectorAll(".puzzle-mode-setting");
  const volumeControl = document.querySelector(".volume-control");
  const settingSections = document.querySelectorAll(".settings-section");

  settingItems.forEach(item => {
    const toggle = item.querySelector(".toggle");

    if (toggle && toggle.id !== "extensionDisabled") {
      if (isExtensionDisabled) {
        item.classList.add("locked");
      } else {
        item.classList.remove("locked");
      }
    }
  });

  puzzleModeSettings.forEach(setting => {
    if (isExtensionDisabled) {
      setting.classList.add("locked");
    } else {
      setting.classList.remove("locked");
    }
  });

  if (volumeControl) {
    if (isExtensionDisabled) {
      volumeControl.classList.add("locked");
    } else {
      volumeControl.classList.remove("locked");
    }
  }

  settingSections.forEach(section => {
    const sectionTitle = section.querySelector(".settings-title");
    if (sectionTitle && sectionTitle.textContent !== "Extension") {
      if (isExtensionDisabled) {
        section.classList.add("locked");
      } else {
        section.classList.remove("locked");
      }
    }
  });
}

function saveSettings() {
  const settings = {};

  elements.toggles.forEach(toggle => {
    settings[toggle.id] = toggle.classList.contains("active");
  });

  const activePuzzleMode = document.querySelector(".puzzle-mode-option.active");
  if (activePuzzleMode) {
    settings.puzzleMode = activePuzzleMode.dataset.mode;
  }

  if (elements.volumeSlider) {
    settings.soundVolume = elements.volumeSlider.value;
  }

  state.settings = settings;
  chrome.storage.local.set({ settings });
}

function updateSliderBackground(slider) {
  const value = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.background = `linear-gradient(to right, var(--primary) 0%, var(--primary) ${value}%, var(--border) ${value}%, var(--border) 100%)`;
}

function updateVolumeIndicators(volume) {
  const indicators = document.querySelectorAll(".volume-indicator");
  indicators.forEach(indicator => indicator.classList.remove("active"));

  const volumeLevel = parseInt(volume);
  if (volumeLevel === 0) {
    indicators[0]?.classList.add("active");
  } else if (volumeLevel <= 50) {
    indicators[1]?.classList.add("active");
  } else {
    indicators[2]?.classList.add("active");
  }
}

function formatDateDDMMYYYY(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function parseDateDDMMYYYY(dateStr) {
  const cleaned = dateStr.replace(/[^\d\/]/g, "");
  const parts = cleaned.split("/");

  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (day < 1 || day > 31) return null;
  if (month < 1 || month > 12) return null;
  if (year < 1900 || year > 2100) return null;

  const date = new Date(year, month - 1, day);

  if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
    return null;
  }

  return date;
}

function formatDateInput(input) {
  let value = input.value.replace(/\D/g, "");

  if (value.length >= 2) {
    value = value.substring(0, 2) + "/" + value.substring(2);
  }
  if (value.length >= 5) {
    value = value.substring(0, 5) + "/" + value.substring(5, 9);
  }

  input.value = value;
}

function initHeatmapScrollIndicators() {
  const heatmapWrapper = document.querySelector(".heatmap-wrapper");

  if (!heatmapWrapper) return;

  function updateScrollIndicators() {
    const { scrollLeft, scrollWidth, clientWidth } = heatmapWrapper;
    const canScrollLeft = scrollLeft > 5;
    const canScrollRight = scrollLeft < scrollWidth - clientWidth - 5;

    heatmapWrapper.classList.toggle("can-scroll-left", canScrollLeft);
    heatmapWrapper.classList.toggle("can-scroll-right", canScrollRight);
  }

  heatmapWrapper.addEventListener("scroll", updateScrollIndicators);

  setTimeout(updateScrollIndicators, 100);

  heatmapWrapper.addEventListener(
    "wheel",
    e => {
      if (e.shiftKey && e.deltaY !== 0) {
        e.preventDefault();
        heatmapWrapper.scrollLeft += e.deltaY;
      } else if (e.deltaX !== 0) {
        e.preventDefault();
        heatmapWrapper.scrollLeft += e.deltaX;
      }
    },
    { passive: false }
  );

  heatmapWrapper.addEventListener("keydown", e => {
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        heatmapWrapper.scrollBy({ left: -100, behavior: "smooth" });
        break;
      case "ArrowRight":
        e.preventDefault();
        heatmapWrapper.scrollBy({ left: 100, behavior: "smooth" });
        break;
      case "Home":
        e.preventDefault();
        heatmapWrapper.scrollTo({ left: 0, behavior: "smooth" });
        break;
      case "End":
        e.preventDefault();
        heatmapWrapper.scrollTo({ left: heatmapWrapper.scrollWidth, behavior: "smooth" });
        break;
    }
  });

  heatmapWrapper.setAttribute("tabindex", "0");
}

function isToday(date) {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function updateRatingProgress(currentRating, tier) {
  const progressFill = document.getElementById("ratingProgressFill");
  if (!progressFill) return;

  const currentTier = TIER_THRESHOLDS.find(t => currentRating >= t.min && currentRating <= t.max);
  if (!currentTier) return;

  let progressPercent = 0;
  if (currentTier.max === Infinity) {
    progressPercent = 100;
  } else {
    const tierRange = currentTier.max - currentTier.min;
    const progressInTier = currentRating - currentTier.min;
    progressPercent = Math.min(100, (progressInTier / tierRange) * 100);
  }

  progressFill.style.width = progressPercent + "%";
}

function updateRatingDetails(currentRating, tier, stats) {
  const ratingNextTier = document.getElementById("ratingNextTier");
  const ratingChange = document.getElementById("ratingChange");

  const currentTierIndex = TIER_THRESHOLDS.findIndex(t => currentRating >= t.min && currentRating <= t.max);
  const nextTier = currentTierIndex < TIER_THRESHOLDS.length - 1 ? TIER_THRESHOLDS[currentTierIndex + 1] : null;

  if (ratingNextTier) {
    if (nextTier) {
      ratingNextTier.innerHTML = `
        <span>Next:</span>
        <span id="nextTierName">${nextTier.name}</span>
        <span id="nextTierPoints">(+${nextTier.min - currentRating} pts)</span>
      `;
    } else {
      ratingNextTier.innerHTML = `
        <span>Next:</span>
        <span id="nextTierName">Max Tier</span>
        <span id="nextTierPoints"></span>
      `;
    }
  }

  if (ratingChange && stats.total > 0) {
    const recentChange = stats.solved > stats.total * 0.7 ? Math.floor(Math.random() * 20) + 5 : -(Math.floor(Math.random() * 15) + 5);

    ratingChange.innerHTML = `<span>${recentChange > 0 ? "+" : ""}${recentChange}</span>`;
    ratingChange.className = `rating-change ${recentChange > 0 ? "positive" : recentChange < 0 ? "negative" : "neutral"}`;
  } else if (ratingChange) {
    ratingChange.innerHTML = `<span>±0</span>`;
    ratingChange.className = "rating-change neutral";
  }
}
