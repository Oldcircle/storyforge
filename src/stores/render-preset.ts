import { create } from "zustand";
import { db } from "../db";
import { createDefaultRenderPreset } from "../data/defaults";
import type { RenderPreset } from "../types/render-preset";

type RenderPresetStore = {
  renderPresets: RenderPreset[];
  selected: RenderPreset | null;
  loadAll: () => Promise<void>;
  create: (overrides?: Partial<RenderPreset>) => Promise<string>;
  select: (id: string) => Promise<void>;
  update: (id: string, patch: Partial<RenderPreset>) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

export const useRenderPresetStore = create<RenderPresetStore>((set, get) => ({
  renderPresets: [],
  selected: null,

  loadAll: async () => {
    let all = await db.renderPresets.orderBy("updatedAt").reverse().toArray();
    if (all.length === 0) {
      const preset = createDefaultRenderPreset();
      await db.renderPresets.put(preset);
      all = [preset];
    }
    set({ renderPresets: all });
  },

  create: async (overrides) => {
    const preset = { ...createDefaultRenderPreset(), ...overrides };
    await db.renderPresets.put(preset);
    await get().loadAll();
    return preset.id;
  },

  select: async (id) => {
    const preset = await db.renderPresets.get(id);
    set({ selected: preset ?? null });
  },

  update: async (id, patch) => {
    const existing = await db.renderPresets.get(id);
    if (!existing) return;
    const updated = { ...existing, ...patch, updatedAt: Date.now() };
    await db.renderPresets.put(updated);
    await get().loadAll();
    if (get().selected?.id === id) {
      set({ selected: updated });
    }
  },

  remove: async (id) => {
    await db.renderPresets.delete(id);
    if (get().selected?.id === id) {
      set({ selected: null });
    }
    await get().loadAll();
  }
}));
