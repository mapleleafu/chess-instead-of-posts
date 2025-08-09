const getUserTier = rating => {
  const tier = TIER_THRESHOLDS.find(tier => rating >= tier.min && rating < tier.max);
  return tier || TIER_THRESHOLDS[TIER_THRESHOLDS.length - 1];
};

const getDifficultyIcon = difficulty => {
  return DIFFICULTY_ICONS[difficulty] || "❓";
};

class AudioManager {
  constructor() {
    this.sounds = new Map();
  }

  getSound(soundName) {
    if (!this.sounds.has(soundName)) {
      const soundPath = SOUND_PATHS[soundName];
      if (soundPath) {
        this.sounds.set(soundName, new Audio(chrome.runtime.getURL(soundPath)));
      }
    }
    return this.sounds.get(soundName);
  }

  async playSound(soundName, settings = {}) {
    if (settings.soundsDisabled) return;

    const sound = this.getSound(soundName);
    if (!sound) return;

    sound.volume = (settings.soundVolume || 100) / 100;
    try {
      await sound.play();
    } catch {} // Fail silently
  }

  preloadSounds() {
    Object.keys(SOUND_PATHS).forEach(soundName => {
      this.getSound(soundName);
    });
  }
}

const audioManager = new AudioManager();
