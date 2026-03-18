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
      ...((data.llm as Partial<DirectorPreset["llm"]>) ?? {}),
    },
    promptTemplates: {
      ...base.promptTemplates,
      ...((data.promptTemplates as Partial<DirectorPreset["promptTemplates"]>) ?? {}),
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
      ...((data.defaults as Partial<RenderPreset["defaults"]>) ?? {}),
    },
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
