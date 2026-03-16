import { create } from "zustand";
import { db } from "../db";
import { generateStoryboard, type GenerateStoryboardInput } from "../engine/director";
import type { ChatMessage } from "../types/adapter";
import type { Shot, Storyboard } from "../types/storyboard";

type StoryboardStore = {
  storyboards: Storyboard[];
  selected?: Storyboard;
  loading: boolean;
  error?: string;
  lastPromptMessages: ChatMessage[];
  lastRawResponse?: string;
  loadByProject: (projectId: string) => Promise<void>;
  select: (id: string) => Promise<void>;
  save: (storyboard: Storyboard) => Promise<void>;
  updateShot: (storyboardId: string, shotId: string, updater: (shot: Shot) => Shot) => Promise<Storyboard | undefined>;
  generate: (input: GenerateStoryboardInput) => Promise<Storyboard>;
};

async function fetchStoryboards(projectId: string): Promise<Storyboard[]> {
  const storyboards = await db.storyboards.where("projectId").equals(projectId).toArray();
  return storyboards.sort((left, right) => right.updatedAt - left.updatedAt);
}

export const useStoryboardStore = create<StoryboardStore>((set, get) => ({
  storyboards: [],
  selected: undefined,
  loading: false,
  error: undefined,
  lastPromptMessages: [],
  lastRawResponse: undefined,
  loadByProject: async (projectId) => {
    set({ loading: true, error: undefined });
    try {
      const storyboards = await fetchStoryboards(projectId);
      const selectedId = get().selected?.id;
      set({
        storyboards,
        selected: selectedId ? storyboards.find((item) => item.id === selectedId) : storyboards[0],
        loading: false
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
        loading: false
      });
    }
  },
  select: async (id) => {
    const selected = await db.storyboards.get(id);
    set({ selected });
  },
  save: async (storyboard) => {
    await db.storyboards.put(storyboard);
    const storyboards = await fetchStoryboards(storyboard.projectId);
    set({
      storyboards,
      selected: storyboard
    });
  },
  updateShot: async (storyboardId, shotId, updater) => {
    const storyboard = await db.storyboards.get(storyboardId);
    if (!storyboard) {
      return undefined;
    }

    const nextStoryboard: Storyboard = {
      ...storyboard,
      updatedAt: Date.now(),
      shots: storyboard.shots.map((shot) => (shot.id === shotId ? updater(shot) : shot))
    };

    await get().save(nextStoryboard);
    return nextStoryboard;
  },
  generate: async (input) => {
    set({ loading: true, error: undefined });
    try {
      const result = await generateStoryboard(input);
      await get().save(result.storyboard);
      set({
        loading: false,
        error: undefined,
        lastPromptMessages: result.messages,
        lastRawResponse: result.rawResponse,
        selected: result.storyboard
      });
      return result.storyboard;
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}));
