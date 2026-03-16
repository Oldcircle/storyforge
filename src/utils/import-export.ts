import { v4 as uuid } from "uuid";
import { buildCharacterCard, buildSceneBook } from "../data/defaults";
import type { CharacterCard } from "../types/character";
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

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
