import { v4 as uuid } from "uuid";
import type { Shot, Storyboard, VisualIntent } from "../types/storyboard";

const VALID_TYPES = new Set(["establish", "wide", "medium", "close", "detail"]);
const VALID_CAMERA_MOVEMENTS = new Set([
  "static",
  "pan_left",
  "pan_right",
  "zoom_in",
  "zoom_out",
  "dolly",
  "tilt_up",
  "tilt_down"
]);
const VALID_TRANSITIONS = new Set(["cut", "fade", "dissolve", "wipe"]);
const VALID_POSITIONS = new Set(["left", "center", "right", "background"]);

function normalizeJsonText(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch?.[1]?.trim() ?? trimmed;
}

function normalizeShot(rawShot: Record<string, unknown>, shotIndex: number): Shot {
  const rawCharacters = Array.isArray(rawShot.characters) ? rawShot.characters : [];

  // Accept shotNumber / shot_number / shotId (extract trailing digits)
  const rawShotNum = rawShot.shotNumber ?? rawShot.shot_number;
  let shotNumber = shotIndex + 1;
  if (typeof rawShotNum === "number") {
    shotNumber = rawShotNum;
  } else if (typeof rawShot.shotId === "string") {
    const match = rawShot.shotId.match(/(\d+)/);
    if (match) shotNumber = Number(match[1]);
  }

  // Accept type / shotType / shot_type
  const rawType = rawShot.type ?? rawShot.shotType ?? rawShot.shot_type;
  const shotType = typeof rawType === "string" && VALID_TYPES.has(rawType)
    ? (rawType as Shot["type"])
    : "medium";

  return {
    id: uuid(),
    shotNumber,
    type: shotType,
    description: typeof rawShot.description === "string" ? rawShot.description : "",
    cameraMovement:
      typeof rawShot.cameraMovement === "string" && VALID_CAMERA_MOVEMENTS.has(rawShot.cameraMovement)
        ? (rawShot.cameraMovement as Shot["cameraMovement"])
        : typeof rawShot.camera_movement === "string" &&
            VALID_CAMERA_MOVEMENTS.has(rawShot.camera_movement)
          ? (rawShot.camera_movement as Shot["cameraMovement"])
          : "static",
    transition:
      typeof rawShot.transition === "string" && VALID_TRANSITIONS.has(rawShot.transition)
        ? (rawShot.transition as Shot["transition"])
        : "cut",
    duration: typeof rawShot.duration === "number" ? rawShot.duration : 3,
    characters: rawCharacters
      .filter((character) => character && typeof character === "object")
      .map((character) => {
        const data = character as Record<string, unknown>;
        const rawPosition = typeof data.position === "string" ? data.position : "center";
        return {
          characterId:
            typeof data.characterId === "string"
              ? data.characterId
              : typeof data.characterId !== "string" && typeof data.id === "string"
                ? data.id
                : "",
          emotion: typeof data.emotion === "string" ? data.emotion : "neutral",
          action: typeof data.action === "string" ? data.action : "",
          outfit: typeof data.outfit === "string" ? data.outfit : undefined,
          position: VALID_POSITIONS.has(rawPosition)
            ? (rawPosition as "left" | "center" | "right" | "background")
            : "center"
        };
      })
      .filter((character) => character.characterId),
    visualIntent: normalizeVisualIntent(rawShot),
    dialogue: typeof rawShot.dialogue === "string" ? rawShot.dialogue : undefined,
    narration: typeof rawShot.narration === "string" ? rawShot.narration : undefined,
    sfx: typeof rawShot.sfx === "string" ? rawShot.sfx : undefined,
    status: "pending"
  };
}

function normalizeVisualIntent(rawShot: Record<string, unknown>): VisualIntent | undefined {
  // Accept both camelCase and snake_case from LLM output
  const raw =
    (rawShot.visualIntent as Record<string, unknown> | undefined) ??
    (rawShot.visual_intent as Record<string, unknown> | undefined);

  if (!raw || typeof raw !== "object") return undefined;

  const intent: VisualIntent = {};
  if (typeof raw.subject === "string" && raw.subject.trim()) {
    intent.subject = raw.subject.trim();
  }
  if (typeof raw.composition === "string" && raw.composition.trim()) {
    intent.composition = raw.composition.trim();
  }
  if (typeof raw.atmosphere === "string" && raw.atmosphere.trim()) {
    intent.atmosphere = raw.atmosphere.trim();
  }
  const sugPos = raw.suggestedPositive ?? raw.suggested_positive;
  if (typeof sugPos === "string" && sugPos.trim()) {
    intent.suggestedPositive = sugPos.trim();
  }
  const sugNeg = raw.suggestedNegative ?? raw.suggested_negative;
  if (typeof sugNeg === "string" && sugNeg.trim()) {
    intent.suggestedNegative = sugNeg.trim();
  }

  // Only return if at least one field is populated
  return Object.keys(intent).length > 0 ? intent : undefined;
}

/**
 * Extract the shots array and scene-level metadata from a potentially nested LLM response.
 *
 * LLMs may return any of these shapes:
 *   { shots: [...] }                          — flat (expected)
 *   { scenes: [{ shots: [...] }] }            — wrapped in scenes array
 *   { scene: { shots: [...] } }               — single scene object
 *   { storyboard: { shots: [...] } }          — wrapped in storyboard
 *   { storyboard: { scenes: [{ shots }] } }   — double wrapped
 */
function extractShotsAndMeta(parsed: Record<string, unknown>): {
  shots: unknown[];
  sceneNumber: number;
  sceneTitle: string;
} {
  // Helper: pull scene-level metadata from an object
  const metaFrom = (obj: Record<string, unknown>) => ({
    sceneNumber:
      typeof obj.sceneNumber === "number" ? obj.sceneNumber
        : typeof obj.scene_number === "number" ? obj.scene_number
          : 1,
    sceneTitle:
      typeof obj.sceneTitle === "string" ? obj.sceneTitle
        : typeof obj.scene_title === "string" ? obj.scene_title
          : typeof obj.sceneDescription === "string" ? obj.sceneDescription
            : typeof obj.scene_description === "string" ? obj.scene_description
              : "未命名场景",
  });

  // Helper: try to get shots from an object
  const shotsFrom = (obj: unknown): unknown[] | null => {
    if (!obj || typeof obj !== "object") return null;
    const o = obj as Record<string, unknown>;
    if (Array.isArray(o.shots)) return o.shots;
    return null;
  };

  // 1. Direct: { shots: [...] }
  if (Array.isArray(parsed.shots)) {
    return { shots: parsed.shots, ...metaFrom(parsed) };
  }

  // 2. Wrapped: { scenes: [{ shots: [...] }] }
  if (Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
    const firstScene = parsed.scenes[0] as Record<string, unknown>;
    const shots = shotsFrom(firstScene);
    if (shots) return { shots, ...metaFrom(firstScene) };
  }

  // 3. Single scene: { scene: { shots: [...] } }
  if (parsed.scene && typeof parsed.scene === "object") {
    const scene = parsed.scene as Record<string, unknown>;
    const shots = shotsFrom(scene);
    if (shots) return { shots, ...metaFrom(scene) };
  }

  // 4. Storyboard wrapper: { storyboard: { shots | scenes } }
  if (parsed.storyboard && typeof parsed.storyboard === "object") {
    const sb = parsed.storyboard as Record<string, unknown>;
    const shots = shotsFrom(sb);
    if (shots) return { shots, ...metaFrom(sb) };
    if (Array.isArray(sb.scenes) && sb.scenes.length > 0) {
      const firstScene = sb.scenes[0] as Record<string, unknown>;
      const innerShots = shotsFrom(firstScene);
      if (innerShots) return { shots: innerShots, ...metaFrom(firstScene) };
    }
  }

  // Fallback: no shots found
  return { shots: [], sceneNumber: 1, sceneTitle: "未命名场景" };
}

export function parseStoryboardResponse(
  rawResponse: string,
  params: { projectId: string; userPrompt: string },
): Storyboard {
  const normalizedText = normalizeJsonText(rawResponse);
  const parsed = JSON.parse(normalizedText) as Record<string, unknown>;
  const { shots: rawShots, sceneNumber, sceneTitle } = extractShotsAndMeta(parsed);

  return {
    id: uuid(),
    projectId: params.projectId,
    sceneNumber,
    sceneTitle,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    userPrompt: params.userPrompt,
    shots: rawShots
      .filter((shot) => shot && typeof shot === "object")
      .map((shot, index) => normalizeShot(shot as Record<string, unknown>, index)),
    status: "draft"
  };
}
