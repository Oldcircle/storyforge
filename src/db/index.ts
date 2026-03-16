import Dexie, { type Table } from "dexie";
import type { CharacterCard } from "../types/character";
import type { DirectorPreset } from "../types/preset";
import type { Project } from "../types/project";
import type { SceneBook } from "../types/scene";
import type { Storyboard } from "../types/storyboard";

export class StoryForgeDB extends Dexie {
  characters!: Table<CharacterCard, string>;
  sceneBooks!: Table<SceneBook, string>;
  storyboards!: Table<Storyboard, string>;
  presets!: Table<DirectorPreset, string>;
  projects!: Table<Project, string>;

  constructor() {
    super("storyforge");
    this.version(1).stores({
      characters: "id, name, updatedAt",
      sceneBooks: "id, name, updatedAt",
      storyboards: "id, projectId, sceneNumber, updatedAt",
      presets: "id, name, updatedAt",
      projects: "id, name, updatedAt"
    });
  }
}

export const db = new StoryForgeDB();
