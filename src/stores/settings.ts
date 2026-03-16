import { create } from "zustand";
import { DEFAULT_SETTINGS } from "../data/defaults";
import type { GlobalSettings } from "../types/settings";

const STORAGE_KEY = "storyforge.settings";

function loadSettings(): GlobalSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return DEFAULT_SETTINGS;
  }

  try {
    return {
      ...DEFAULT_SETTINGS,
      ...(JSON.parse(raw) as Partial<GlobalSettings>)
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

type SettingsStore = {
  settings: GlobalSettings;
  setSettings: (settings: GlobalSettings) => void;
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: loadSettings(),
  setSettings: (settings) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
    set({ settings });
  }
}));
