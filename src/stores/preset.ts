import { create } from "zustand";
import { db } from "../db";
import { createDefaultPreset } from "../data/defaults";
import type { DirectorPreset } from "../types/preset";

type PresetStore = {
  presets: DirectorPreset[];
  selected?: DirectorPreset;
  loading: boolean;
  error?: string;
  loadAll: () => Promise<void>;
  select: (id: string) => Promise<void>;
  create: () => Promise<string>;
  update: (id: string, data: Partial<DirectorPreset>) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

async function fetchPresets(): Promise<DirectorPreset[]> {
  return db.presets.orderBy("updatedAt").reverse().toArray();
}

export const usePresetStore = create<PresetStore>((set, get) => ({
  presets: [],
  selected: undefined,
  loading: false,
  error: undefined,
  loadAll: async () => {
    set({ loading: true, error: undefined });
    try {
      const presets = await fetchPresets();
      const selectedId = get().selected?.id;
      set({
        presets,
        selected: selectedId ? presets.find((item) => item.id === selectedId) : undefined,
        loading: false
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), loading: false });
    }
  },
  select: async (id) => {
    const selected = await db.presets.get(id);
    set({ selected });
  },
  create: async () => {
    const preset = createDefaultPreset();
    await db.presets.add(preset);
    const presets = await fetchPresets();
    set({ presets, selected: preset });
    return preset.id;
  },
  update: async (id, data) => {
    await db.presets.update(id, { ...data, updatedAt: Date.now() });
    const presets = await fetchPresets();
    const selected = presets.find((item) => item.id === id);
    set({ presets, selected: selected ?? get().selected });
  },
  remove: async (id) => {
    await db.presets.delete(id);
    const presets = await fetchPresets();
    set({
      presets,
      selected: get().selected?.id === id ? undefined : get().selected
    });
  }
}));
