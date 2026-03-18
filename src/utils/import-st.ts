import extract from "png-chunks-extract";
import pngText from "png-chunk-text";
import { buildCharacterCard, buildSceneBook } from "../data/defaults";
import type { CharacterCard } from "../types/character";
import type { SceneBook, SceneEntry } from "../types/scene";
import { compressImage } from "./image";

interface STCharacterData {
  name?: string;
  description?: string;
  personality?: string;
  scenario?: string;
  mes_example?: string;
  creator_notes?: string;
  creator?: string;
  tags?: string[];
  character_book?: STWorldBook;
  extensions?: {
    world?: string;
    [key: string]: unknown;
  };
  data?: STCharacterData;
}

interface STWorldBook {
  name?: string;
  entries: Record<string, STWorldEntry> | STWorldEntry[];
}

interface STWorldEntry {
  uid?: number;
  key?: string[];
  keysecondary?: string[];
  comment?: string;
  content?: string;
  constant?: boolean;
  order?: number;
  disable?: boolean;
  use_regex?: boolean;
}

function decodeBase64Text(base64Text: string): string {
  const binary = window.atob(base64Text);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function parseTextChunk(buffer: Uint8Array): STCharacterData {
  const chunks = extract(buffer);
  const textChunks = chunks
    .filter((chunk) => chunk.name === "tEXt")
    .map((chunk) => pngText.decode(chunk.data));

  const ccv3 = textChunks.find((chunk) => chunk.keyword.toLowerCase() === "ccv3");
  if (ccv3) {
    return JSON.parse(decodeBase64Text(ccv3.text)) as STCharacterData;
  }

  const chara = textChunks.find((chunk) => chunk.keyword.toLowerCase() === "chara");
  if (chara) {
    return JSON.parse(decodeBase64Text(chara.text)) as STCharacterData;
  }

  throw new Error("PNG 中未找到 ST 角色卡元数据");
}

function normalizeSTCharacterData(payload: STCharacterData): STCharacterData {
  return payload.data ?? payload;
}

function mapWorldEntryToSceneEntry(entry: STWorldEntry, index: number): SceneEntry {
  return {
    id: `st-entry-${entry.uid ?? index}`,
    name: entry.comment?.trim() || entry.key?.[0] || `ST 条目 ${index + 1}`,
    enabled: !entry.disable,
    usage: "shared",
    keywords: entry.key ?? [],
    secondaryKeywords: entry.keysecondary ?? [],
    useRegex: Boolean(entry.use_regex),
    alwaysActive: Boolean(entry.constant),
    content: {
      directorContext: "",
      environmentPrompt: entry.content ?? "",
      negativePrompt: "",
      props: [],
      atmosphere: "",
      lighting: "",
      timeOfDay: "",
      weather: ""
    },
    referenceImages: [],
    insertionOrder: entry.order ?? 100
  };
}

export function importSceneBookFromSTWorld(json: string, fallbackName = "ST 世界书"): SceneBook {
  const parsed = JSON.parse(json) as { entries?: Record<string, STWorldEntry> | STWorldEntry[]; name?: string };
  const rawEntries = parsed.entries;
  if (!rawEntries) {
    throw new Error("ST 世界书缺少 entries");
  }

  const entries = Array.isArray(rawEntries)
    ? rawEntries
    : Object.values(rawEntries);

  const mapped = entries.map(mapWorldEntryToSceneEntry);
  return buildSceneBook({
    name: parsed.name?.trim() || fallbackName,
    entries: mapped,
    constants: []
  });
}

export async function importCharacterFromSTPNG(
  file: File,
): Promise<{ character: CharacterCard; sceneBook?: SceneBook }> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const rawData = parseTextChunk(buffer);
  const data = normalizeSTCharacterData(rawData);
  const personalityParts = [data.description, data.personality].filter(
    (value): value is string => Boolean(value?.trim()),
  );
  const worldName = data.extensions?.world?.trim();

  const sceneBook = data.character_book
    ? importSceneBookFromSTWorld(
        JSON.stringify(data.character_book),
        data.character_book.name?.trim() || `${data.name || "角色"} 场景书`,
      )
    : undefined;

  const character = buildCharacterCard({
    name: data.name?.trim() || file.name.replace(/\.png$/i, "") || "Imported Character",
    personality: personalityParts.join("\n\n"),
    dialogueExamples: data.mes_example ?? "",
    backstory: data.scenario ?? "",
    creator: data.creator,
    creatorNotes: [data.creator_notes, worldName ? `关联世界书: ${worldName}` : ""]
      .filter(Boolean)
      .join("\n\n"),
    tags: data.tags ?? [],
    appearance: {
      basePrompt: "",
      negativePrompt: "deformed, blurry, bad anatomy",
      styleModifiers: ""
    },
    avatar: await compressImage(file, 768)
  });

  return { character, sceneBook };
}
