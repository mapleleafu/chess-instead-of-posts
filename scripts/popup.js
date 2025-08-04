function saveSettings() {
  const settings = {
    autoZenMode: document.getElementById("autoZenMode").checked,
    hideLayoutAside: document.getElementById("hideLayoutAside").checked,
    dailyPuzzlesDisabled: document.getElementById("dailyPuzzlesDisabled").checked,
    soundsDisabled: document.getElementById("soundsDisabled").checked,
    soundVolume: document.getElementById("soundVolume").value,
  };
  chrome.storage.local.set({ settings }, function () {
    console.log("Settings saved:", settings);
  });
}

document.addEventListener("DOMContentLoaded", function () {
  chrome.storage.local.get("settings", function (data) {
    if (data.settings) {
      document.getElementById("autoZenMode").checked = data.settings.autoZenMode;
      document.getElementById("hideLayoutAside").checked = data.settings.hideLayoutAside;
      document.getElementById("dailyPuzzlesDisabled").checked = data.settings.dailyPuzzlesDisabled;
      document.getElementById("soundsDisabled").checked = data.settings.soundsDisabled;
      document.getElementById("soundVolume").value = data.settings.soundVolume || 50;
    }

    document.getElementById("autoZenMode").addEventListener("change", saveSettings);
    document.getElementById("hideLayoutAside").addEventListener("change", saveSettings);
    document.getElementById("dailyPuzzlesDisabled").addEventListener("change", saveSettings);
    document.getElementById("soundsDisabled").addEventListener("change", saveSettings);
    document.getElementById("soundVolume").addEventListener("input", saveSettings);
  });
});
