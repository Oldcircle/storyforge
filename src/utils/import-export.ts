import { v4 as uuid } from "uuid";
import { buildCharacterCard, buildSceneBook, createDefaultPreset, createDefaultRenderPreset } from "../data/defaults";
import type { CharacterCard } from "../types/character";
import type { DirectorPreset } from "../types/preset";
import type { RenderPreset } from "../types/render-preset";
import type { SceneBook } from "../types/scene";

function ensureObject(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(message);
  }
  return value as Record<string, unknown>;
}

export function exportCharacter(card: CharacterCard): string {
  return JSON.stringify(card, null, 2);
}

export function importCharacter(json: string): CharacterCard {
  const parsed = JSON.parse(json) as unknown;
  const data = ensureObject(parsed, "角色卡 JSON 格式不正确");
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name) {
    throw new Error("角色卡缺少 name");
  }

  return buildCharacterCard({
    ...(data as Partial<CharacterCard>),
    id: uuid(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
}

export function exportSceneBook(book: SceneBook): string {
  return JSON.stringify(book, null, 2);
}

export function importSceneBook(json: string): SceneBook {
  const parsed = JSON.parse(json) as unknown;
  const data = ensureObject(parsed, "场景书 JSON 格式不正确");
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name) {
    throw new Error("场景书缺少 name");
  }

  return buildSceneBook({
    ...(data as Partial<SceneBook>),
    id: uuid(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
}

// ---------------------------------------------------------------------------
// Director Preset import / export
// ---------------------------------------------------------------------------

export function exportDirectorPreset(preset: DirectorPreset): string {
  return JSON.stringify(preset, null, 2);
}

export function importDirectorPreset(json: string): DirectorPreset {
  const parsed = JSON.parse(json) as unknown;
  const data = ensureObject(parsed, "导演预设 JSON 格式不正确");
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name) {
    throw new Error("导演预设缺少 name");
  }

  const base = createDefaultPreset();
  return {
    ...base,
    ...(data as Partial<DirectorPreset>),
    id: uuid(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    llm: {
      ...base.llm,
      ...(data.llm as Partial<DirectorPreset["llm"]>),
    },
    promptTemplates: {
      ...base.promptTemplates,
      ...(data.promptTemplates as Partial<DirectorPreset["promptTemplates"]>),
    },
  };
}

// ---------------------------------------------------------------------------
// Render Preset import / export
// ---------------------------------------------------------------------------

export function exportRenderPreset(preset: RenderPreset): string {
  return JSON.stringify(preset, null, 2);
}

export function importRenderPreset(json: string): RenderPreset {
  const parsed = JSON.parse(json) as unknown;
  const data = ensureObject(parsed, "渲染预设 JSON 格式不正确");
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name) {
    throw new Error("渲染预设缺少 name");
  }

  const base = createDefaultRenderPreset();
  const dataHires = data.hires && typeof data.hires === "object" && !Array.isArray(data.hires)
    ? (data.hires as Partial<NonNullable<RenderPreset["hires"]>>)
    : {};

  return {
    ...base,
    ...(data as Partial<RenderPreset>),
    id: uuid(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    positivePrefix: Array.isArray(data.positivePrefix)
      ? (data.positivePrefix as string[])
      : base.positivePrefix,
    positiveSuffix: Array.isArray(data.positiveSuffix)
      ? (data.positiveSuffix as string[])
      : base.positiveSuffix,
    negativePrompt: Array.isArray(data.negativePrompt)
      ? (data.negativePrompt as string[])
      : base.negativePrompt,
    defaults: {
      ...base.defaults,
      ...(data.defaults as Partial<RenderPreset["defaults"]>),
    },
    hires: {
      enabled: base.hires?.enabled ?? false,
      ...base.hires,
      ...dataHires,
    },
  };
}

// ---------------------------------------------------------------------------
// Project bundle export / import
// ---------------------------------------------------------------------------

import type { Project } from "../types/project";

export interface ProjectBundle {
  version: 1;
  project: Project;
  characters: CharacterCard[];
  sceneBook?: SceneBook;
  directorPreset?: DirectorPreset;
  renderPreset?: RenderPreset;
}

export function exportProjectBundle(bundle: ProjectBundle): string {
  return JSON.stringify(bundle, null, 2);
}

export function importProjectBundle(json: string): ProjectBundle {
  const parsed = JSON.parse(json) as unknown;
  const data = ensureObject(parsed, "项目包 JSON 格式不正确");

  if (!data.project || typeof data.project !== "object") {
    throw new Error("项目包缺少 project 字段");
  }

  const proj = data.project as Record<string, unknown>;
  const name = typeof proj.name === "string" ? proj.name.trim() : "";
  if (!name) {
    throw new Error("项目缺少 name");
  }

  const now = Date.now();
  const newProjectId = uuid();

  // Re-map character IDs so imported assets don't collide
  const rawChars = Array.isArray(data.characters) ? (data.characters as Partial<CharacterCard>[]) : [];
  const charIdMap = new Map<string, string>();
  const characters = rawChars.map((raw) => {
    const newId = uuid();
    if (typeof raw.id === "string") charIdMap.set(raw.id, newId);
    return buildCharacterCard({
      ...raw,
      id: newId,
      createdAt: now,
      updatedAt: now,
    });
  });

  const sceneBook = data.sceneBook && typeof data.sceneBook === "object"
    ? buildSceneBook({
        ...(data.sceneBook as Partial<SceneBook>),
        id: uuid(),
        createdAt: now,
        updatedAt: now,
      })
    : undefined;

  const directorPreset = data.directorPreset && typeof data.directorPreset === "object"
    ? (() => {
        const base = createDefaultPreset();
        const dp = data.directorPreset as Partial<DirectorPreset>;
        return {
          ...base,
          ...dp,
          id: uuid(),
          createdAt: now,
          updatedAt: now,
          llm: { ...base.llm, ...dp.llm },
          promptTemplates: { ...base.promptTemplates, ...dp.promptTemplates },
        };
      })()
    : undefined;

  const renderPreset = data.renderPreset && typeof data.renderPreset === "object"
    ? (() => {
        const base = createDefaultRenderPreset();
        const rp = data.renderPreset as Partial<RenderPreset>;
        return {
          ...base,
          ...rp,
          id: uuid(),
          createdAt: now,
          updatedAt: now,
          positivePrefix: Array.isArray(rp.positivePrefix) ? rp.positivePrefix : base.positivePrefix,
          positiveSuffix: Array.isArray(rp.positiveSuffix) ? rp.positiveSuffix : base.positiveSuffix,
          negativePrompt: Array.isArray(rp.negativePrompt) ? rp.negativePrompt : base.negativePrompt,
          defaults: { ...base.defaults, ...rp.defaults },
          hires: { enabled: false, ...base.hires, ...rp.hires },
        };
      })()
    : undefined;

  const project: Project = {
    id: newProjectId,
    name,
    description: typeof proj.description === "string" ? proj.description : "",
    createdAt: now,
    updatedAt: now,
    characterIds: characters.map((c) => c.id),
    sceneBookId: sceneBook?.id,
    presetId: directorPreset?.id,
    renderPresetId: renderPreset?.id,
    workflowTemplateId: typeof proj.workflowTemplateId === "string"
      ? proj.workflowTemplateId
      : "builtin:comfyui-basic-txt2img",
    storyboardIds: [],
    settings: {
      outputFormat: "image_sequence",
      aspectRatio: typeof (proj.settings as Record<string, unknown>)?.aspectRatio === "string"
        ? (proj.settings as Record<string, unknown>).aspectRatio as string
        : "16:9",
    },
  };

  return {
    version: 1,
    project,
    characters,
    sceneBook,
    directorPreset,
    renderPreset,
  };
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
