import { create } from "zustand";
import { db } from "../db";
import { buildSceneBook, createSceneEntry } from "../data/defaults";
import type { SceneBook, SceneEntry } from "../types/scene";

type SceneStore = {
  sceneBooks: SceneBook[];
  selected?: SceneBook;
  loading: boolean;
  error?: string;
  loadAll: () => Promise<void>;
  select: (id: string) => Promise<void>;
  create: (initial?: Partial<SceneBook>) => Promise<string>;
  update: (id: string, data: Partial<SceneBook>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  addEntry: (bookId: string, entry?: SceneEntry) => Promise<void>;
  updateEntry: (bookId: string, entryId: string, data: Partial<SceneEntry>) => Promise<void>;
  removeEntry: (bookId: string, entryId: string) => Promise<void>;
};

async function fetchSceneBooks(): Promise<SceneBook[]> {
  return db.sceneBooks.orderBy("updatedAt").reverse().toArray();
}

export const useSceneStore = create<SceneStore>((set, get) => ({
  sceneBooks: [],
  selected: undefined,
  loading: false,
  error: undefined,
  loadAll: async () => {
    set({ loading: true, error: undefined });
    try {
      const sceneBooks = await fetchSceneBooks();
      const selectedId = get().selected?.id;
      set({
        sceneBooks,
        selected: selectedId ? sceneBooks.find((item) => item.id === selectedId) : undefined,
        loading: false
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), loading: false });
    }
  },
  select: async (id) => {
    const selected = await db.sceneBooks.get(id);
    set({ selected });
  },
  create: async (initial) => {
    const sceneBook = buildSceneBook(initial);
    await db.sceneBooks.add(sceneBook);
    const sceneBooks = await fetchSceneBooks();
    set({ sceneBooks, selected: sceneBook });
    return sceneBook.id;
  },
  update: async (id, data) => {
    await db.sceneBooks.update(id, { ...data, updatedAt: Date.now() });
    const sceneBooks = await fetchSceneBooks();
    const selected = sceneBooks.find((item) => item.id === id);
    set({ sceneBooks, selected: selected ?? get().selected });
  },
  remove: async (id) => {
    await db.sceneBooks.delete(id);
    const sceneBooks = await fetchSceneBooks();
    set({
      sceneBooks,
      selected: get().selected?.id === id ? undefined : get().selected
    });
  },
  addEntry: async (bookId, entry = createSceneEntry()) => {
    const book = await db.sceneBooks.get(bookId);
    if (!book) {
      return;
    }
    await get().update(bookId, { entries: [...book.entries, entry] });
  },
  updateEntry: async (bookId, entryId, data) => {
    const book = await db.sceneBooks.get(bookId);
    if (!book) {
      return;
    }
    await get().update(bookId, {
      entries: book.entries.map((entry) =>
        entry.id === entryId ? { ...entry, ...data } : entry,
      )
    });
  },
  removeEntry: async (bookId, entryId) => {
    const book = await db.sceneBooks.get(bookId);
    if (!book) {
      return;
    }
    await get().update(bookId, {
      entries: book.entries.filter((entry) => entry.id !== entryId)
    });
  }
}));
