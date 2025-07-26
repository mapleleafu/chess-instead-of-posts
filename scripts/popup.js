document.getElementById("settingsForm").addEventListener("submit", function (event) {
  event.preventDefault();
  const settings = {
    autoZenMode: document.getElementById("autoZenMode").checked,
    hideLayoutAside: document.getElementById("hideLayoutAside").checked,
    dailyPuzzlesDisabled: document.getElementById("dailyPuzzlesDisabled").checked,
  };
  chrome.storage.local.set({ settings }, function () {
    console.log("Settings saved:", settings);
  });
});

// Load existing settings
chrome.storage.local.get("settings", function (data) {
  if (data.settings) {
    document.getElementById("autoZenMode").checked = data.settings.autoZenMode;
    document.getElementById("hideLayoutAside").checked = data.settings.hideLayoutAside;
    document.getElementById("dailyPuzzlesDisabled").checked = data.settings.dailyPuzzlesDisabled;
  }
});