import type { ChatMessage } from "../types/adapter";
import type { CharacterCard } from "../types/character";
import type { DirectorPreset } from "../types/preset";
import type { SceneBook, SceneEntry } from "../types/scene";
import type { Shot } from "../types/storyboard";
import { KeywordMatcher } from "./keyword-matcher";

const matcher = new KeywordMatcher();

function renderCharacterSection(characters: CharacterCard[]): string {
  if (characters.length === 0) {
    return "（当前项目没有关联角色卡）";
  }

  return characters
    .map(
      (character) => `### ${character.name} (id: "${character.id}")
性格: ${character.personality || "未填写"}
可用表情: ${Object.keys(character.expressions).join(", ") || "无"}
可用服装: ${Object.keys(character.outfits).join(", ") || "无"}
对话示例: ${character.dialogueExamples || "无"}`,
    )
    .join("\n\n");
}

export function getActivatedSceneEntries(
  sceneBook: SceneBook | undefined,
  userInput: string,
): SceneEntry[] {
  if (!sceneBook) {
    return [];
  }

  const allEntries = [...sceneBook.constants, ...sceneBook.entries];
  return matcher.match(userInput, allEntries).map((entry) => entry.entry);
}

function renderSceneSection(sceneBook: SceneBook | undefined, userInput: string): string {
  const activatedEntries = getActivatedSceneEntries(sceneBook, userInput);
  if (activatedEntries.length === 0) {
    return sceneBook ? "（场景书存在，但当前输入没有命中条目）" : "（当前项目没有关联场景书）";
  }

  return activatedEntries
    .map(
      (entry) => `### ${entry.name}
环境描述: ${entry.content.environmentPrompt || "未填写"}
氛围: ${entry.content.atmosphere || "未填写"}
光照: ${entry.content.lighting || "未填写"}
时间: ${entry.content.timeOfDay || "未填写"}`,
    )
    .join("\n\n");
}

export function assembleDirectorPrompt(
  preset: DirectorPreset,
  characters: CharacterCard[],
  sceneBook: SceneBook | undefined,
  userInput: string,
  previousSceneSummary?: string,
): ChatMessage[] {
  const characterSection = renderCharacterSection(characters);
  const sceneSection = renderSceneSection(sceneBook, userInput);

  const systemPrompt = preset.systemPrompt
    .replace("{{characters}}", characterSection)
    .replace("{{scenes}}", sceneSection);

  const messages: ChatMessage[] = [{ role: "system", content: systemPrompt }];

  if (previousSceneSummary?.trim()) {
    messages.push({
      role: "system",
      content: `前续场景摘要：\n${previousSceneSummary.trim()}`
    });
  }

  messages.push({ role: "user", content: userInput });
  return messages;
}

const SHOT_TYPE_PROMPTS: Record<string, string> = {
  establish: "establishing shot, wide angle, environmental",
  wide: "wide shot, full body",
  medium: "medium shot, waist up",
  close: "close-up shot, upper body, face detail",
  detail: "extreme close-up, macro detail"
};

const CAMERA_PROMPTS: Record<string, string> = {
  static: "",
  pan_left: "dynamic angle",
  pan_right: "dynamic angle",
  zoom_in: "depth of field, bokeh",
  zoom_out: "wide perspective",
  dolly: "cinematic movement",
  tilt_up: "low angle",
  tilt_down: "high angle, bird eye view"
};

export interface AssembledImagePrompt {
  positive: string;
  negative: string;
  loras: { name: string; weight: number; triggerWord?: string }[];
  referenceImages: string[];
  seed?: number;
  sampler: string;
  checkpoint: string;
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
}

export function assembleImagePrompt(
  shot: Shot,
  characters: CharacterCard[],
  activatedScenes: SceneEntry[],
  preset: DirectorPreset,
): AssembledImagePrompt {
  const positiveSegments: string[] = [];
  const negativeSegments: string[] = [];
  const loras: AssembledImagePrompt["loras"] = [];
  const referenceImages: string[] = [];

  positiveSegments.push(SHOT_TYPE_PROMPTS[shot.type] || "");
  if (CAMERA_PROMPTS[shot.cameraMovement]) {
    positiveSegments.push(CAMERA_PROMPTS[shot.cameraMovement]);
  }

  if (shot.characters.length === 2) {
    positiveSegments.push("two people");
  } else if (shot.characters.length >= 3) {
    positiveSegments.push(`${shot.characters.length} people, group`);
  }

  for (const shotCharacter of shot.characters) {
    const card = characters.find((character) => character.id === shotCharacter.characterId);
    if (!card) {
      continue;
    }

    positiveSegments.push(card.appearance.basePrompt);
    if (card.appearance.styleModifiers) {
      positiveSegments.push(card.appearance.styleModifiers);
    }

    const expression = card.expressions[shotCharacter.emotion];
    if (expression?.promptModifier) {
      positiveSegments.push(expression.promptModifier);
    }

    if (shotCharacter.outfit && card.outfits[shotCharacter.outfit]) {
      positiveSegments.push(card.outfits[shotCharacter.outfit]);
    }

    const positionLabel: Record<string, string> = {
      left: "on the left side",
      right: "on the right side",
      center: "in the center",
      background: "in the background"
    };

    if (positionLabel[shotCharacter.position]) {
      positiveSegments.push(positionLabel[shotCharacter.position]);
    }

    if (card.appearance.negativePrompt) {
      negativeSegments.push(card.appearance.negativePrompt);
    }

    if (card.consistency.lora) {
      loras.push(card.consistency.lora);
      if (card.consistency.lora.triggerWord) {
        positiveSegments.push(card.consistency.lora.triggerWord);
      }
    }

    referenceImages.push(...card.consistency.referenceImages);
    if (expression?.referenceImage) {
      referenceImages.push(expression.referenceImage);
    }
    if (shotCharacter.action) {
      positiveSegments.push(shotCharacter.action);
    }
  }

  for (const scene of activatedScenes) {
    positiveSegments.push(scene.content.environmentPrompt);
    if (scene.content.atmosphere) {
      positiveSegments.push(scene.content.atmosphere);
    }
    if (scene.content.lighting) {
      positiveSegments.push(scene.content.lighting);
    }
    if (scene.content.timeOfDay) {
      positiveSegments.push(scene.content.timeOfDay);
    }
    if (scene.content.weather) {
      positiveSegments.push(scene.content.weather);
    }
    if (scene.content.props?.length) {
      positiveSegments.push(scene.content.props.join(", "));
    }
    if (scene.content.colorPalette?.length) {
      positiveSegments.push(scene.content.colorPalette.join(", "));
    }
    if (scene.content.negativePrompt) {
      negativeSegments.push(scene.content.negativePrompt);
    }
  }

  positiveSegments.push(shot.description);

  return {
    positive: positiveSegments.filter(Boolean).join(", "),
    negative: negativeSegments.filter(Boolean).join(", "),
    loras,
    referenceImages,
    seed: shot.characters
      .map((shotCharacter) =>
        characters.find((character) => character.id === shotCharacter.characterId)?.consistency.seedBase,
      )
      .find((value) => typeof value === "number"),
    sampler: preset.visualStyle.sampler || "euler",
    checkpoint: preset.visualStyle.checkpoint || "sd_xl_base_1.0.safetensors",
    width: preset.visualStyle.width,
    height: preset.visualStyle.height,
    steps: preset.visualStyle.steps,
    cfgScale: preset.visualStyle.cfgScale
  };
}
