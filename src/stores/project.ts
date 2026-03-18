import { create } from "zustand";
import { db } from "../db";
import { createProject } from "../data/defaults";
import type { Project } from "../types/project";
import type { PromptMode } from "../types/storyboard";

type ProjectStore = {
  projects: Project[];
  current?: Project;
  loading: boolean;
  error?: string;
  loadAll: () => Promise<void>;
  select: (id: string) => Promise<void>;
  create: (name: string, description?: string) => Promise<string>;
  update: (id: string, data: Partial<Project>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  addCharacter: (projectId: string, characterId: string) => Promise<void>;
  removeCharacter: (projectId: string, characterId: string) => Promise<void>;
  setSceneBook: (projectId: string, sceneBookId: string | undefined) => Promise<void>;
  setPreset: (projectId: string, presetId: string | undefined) => Promise<void>;
  setRenderPreset: (projectId: string, renderPresetId: string | undefined) => Promise<void>;
  setWorkflowTemplate: (projectId: string, workflowTemplateId: string | undefined) => Promise<void>;
  setPromptMode: (projectId: string, promptMode: PromptMode) => Promise<void>;
};

async function fetchProjects(): Promise<Project[]> {
  return db.projects.orderBy("updatedAt").reverse().toArray();
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  current: undefined,
  loading: false,
  error: undefined,
  loadAll: async () => {
    set({ loading: true, error: undefined });
    try {
      const projects = await fetchProjects();
      const currentId = get().current?.id;
      set({
        projects,
        current: currentId ? projects.find((item) => item.id === currentId) : undefined,
        loading: false
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), loading: false });
    }
  },
  select: async (id) => {
    const project = await db.projects.get(id);
    set({ current: project });
  },
  create: async (name, description) => {
    const project = createProject(name, description);
    await db.projects.add(project);
    const projects = await fetchProjects();
    set({ projects, current: project });
    return project.id;
  },
  update: async (id, data) => {
    await db.projects.update(id, { ...data, updatedAt: Date.now() });
    const projects = await fetchProjects();
    const current = projects.find((item) => item.id === id);
    set({ projects, current: current ?? get().current });
  },
  remove: async (id) => {
    await db.projects.delete(id);
    const projects = await fetchProjects();
    set({
      projects,
      current: get().current?.id === id ? undefined : get().current
    });
  },
  addCharacter: async (projectId, characterId) => {
    const project = await db.projects.get(projectId);
    if (!project || project.characterIds.includes(characterId)) {
      return;
    }
    await get().update(projectId, { characterIds: [...project.characterIds, characterId] });
  },
  removeCharacter: async (projectId, characterId) => {
    const project = await db.projects.get(projectId);
    if (!project) {
      return;
    }
    await get().update(projectId, {
      characterIds: project.characterIds.filter((id) => id !== characterId)
    });
  },
  setSceneBook: async (projectId, sceneBookId) => {
    await get().update(projectId, { sceneBookId });
  },
  setPreset: async (projectId, presetId) => {
    await get().update(projectId, { presetId });
  },
  setRenderPreset: async (projectId, renderPresetId) => {
    await get().update(projectId, { renderPresetId });
  },
  setWorkflowTemplate: async (projectId, workflowTemplateId) => {
    await get().update(projectId, { workflowTemplateId });
  },
  setPromptMode: async (projectId, promptMode) => {
    const project = await db.projects.get(projectId);
    if (!project) return;
    await get().update(projectId, {
      settings: { ...project.settings, promptMode }
    });
  }
}));
