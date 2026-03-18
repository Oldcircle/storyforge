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

  return {
    id: uuid(),
    shotNumber:
      typeof rawShot.shotNumber === "number"
        ? rawShot.shotNumber
        : typeof rawShot.shot_number === "number"
          ? rawShot.shot_number
          : shotIndex + 1,
    type:
      typeof rawShot.type === "string" && VALID_TYPES.has(rawShot.type)
        ? (rawShot.type as Shot["type"])
        : "medium",
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

export function parseStoryboardResponse(
  rawResponse: string,
  params: { projectId: string; userPrompt: string },
): Storyboard {
  const normalizedText = normalizeJsonText(rawResponse);
  const parsed = JSON.parse(normalizedText) as Record<string, unknown>;
  const rawShots = Array.isArray(parsed.shots) ? parsed.shots : [];

  return {
    id: uuid(),
    projectId: params.projectId,
    sceneNumber:
      typeof parsed.sceneNumber === "number"
        ? parsed.sceneNumber
        : typeof parsed.scene_number === "number"
          ? parsed.scene_number
          : 1,
    sceneTitle:
      typeof parsed.sceneTitle === "string"
        ? parsed.sceneTitle
        : typeof parsed.scene_title === "string"
          ? parsed.scene_title
          : "未命名场景",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    userPrompt: params.userPrompt,
    shots: rawShots
      .filter((shot) => shot && typeof shot === "object")
      .map((shot, index) => normalizeShot(shot as Record<string, unknown>, index)),
    status: "draft"
  };
}
