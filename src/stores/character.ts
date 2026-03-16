import { create } from "zustand";
import { db } from "../db";
import { buildCharacterCard } from "../data/defaults";
import type { CharacterCard } from "../types/character";

type CharacterStore = {
  characters: CharacterCard[];
  selected?: CharacterCard;
  loading: boolean;
  error?: string;
  loadAll: () => Promise<void>;
  select: (id: string) => Promise<void>;
  create: (initial?: Partial<CharacterCard>) => Promise<string>;
  update: (id: string, data: Partial<CharacterCard>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearSelection: () => void;
};

async function fetchCharacters(): Promise<CharacterCard[]> {
  return db.characters.orderBy("updatedAt").reverse().toArray();
}

export const useCharacterStore = create<CharacterStore>((set, get) => ({
  characters: [],
  selected: undefined,
  loading: false,
  error: undefined,
  loadAll: async () => {
    set({ loading: true, error: undefined });
    try {
      const characters = await fetchCharacters();
      const selectedId = get().selected?.id;
      set({
        characters,
        selected: selectedId ? characters.find((item) => item.id === selectedId) : undefined,
        loading: false
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), loading: false });
    }
  },
  select: async (id) => {
    const selected = await db.characters.get(id);
    set({ selected });
  },
  create: async (initial) => {
    const character = buildCharacterCard(initial);
    await db.characters.add(character);
    const characters = await fetchCharacters();
    set({ characters, selected: character });
    return character.id;
  },
  update: async (id, data) => {
    await db.characters.update(id, { ...data, updatedAt: Date.now() });
    const characters = await fetchCharacters();
    const selected = characters.find((item) => item.id === id);
    set({ characters, selected: selected ?? get().selected });
  },
  remove: async (id) => {
    await db.characters.delete(id);
    const characters = await fetchCharacters();
    set({
      characters,
      selected: get().selected?.id === id ? undefined : get().selected
    });
  },
  clearSelection: () => set({ selected: undefined })
}));
