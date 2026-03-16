import { v4 as uuid } from "uuid";
import type { CharacterCard } from "../types/character";
import type { DirectorPreset } from "../types/preset";
import type { Project } from "../types/project";
import type { SceneBook, SceneEntry } from "../types/scene";
import type { GlobalSettings } from "../types/settings";

const now = () => Date.now();

export const DEFAULT_SETTINGS: GlobalSettings = {
  llmProviderId: "deepseek",
  llmApiUrl: "https://api.deepseek.com/v1",
  llmApiKey: "",
  llmModel: "deepseek-chat",
  llmCustomModelId: "",
  comfyuiUrl: "http://127.0.0.1:8188",
};

export const DEFAULT_DIRECTOR_SYSTEM_PROMPT = `你是一位经验丰富的短剧导演。你的任务是将用户的场景描述转化为结构化的分镜脚本。

## 可用角色
{{characters}}

## 可用场景
{{scenes}}

## 分镜规则
- 每个场景生成 3-8 个镜头（shot）
- 镜头类型必须是以下之一：establish、wide、medium、close、detail
- 遵循 180 度原则：同一场景内角色的左右位置保持一致
- 情感高潮使用 close 或 detail，过渡使用 establish 或 wide
- 每个镜头的 characters 数组中，characterId 必须引用上方可用角色中的 id
- 每个镜头的 emotion 必须引用该角色的 expressions 中定义的表情名
- 每个镜头的 outfit 可选，如果指定则必须引用该角色的 outfits 中定义的服装名

## 输出格式
严格输出 JSON，不要输出其他内容。`;

export function createEmptyCharacter(): CharacterCard {
  const timestamp = now();
  return {
    id: uuid(),
    name: "未命名角色",
    createdAt: timestamp,
    updatedAt: timestamp,
    appearance: {
      basePrompt: "",
      negativePrompt: "deformed, blurry, bad anatomy",
      styleModifiers: ""
    },
    consistency: {
      referenceImages: []
    },
    expressions: {
      neutral: {
        promptModifier: "neutral expression"
      }
    },
    outfits: {
      default: ""
    },
    personality: "",
    dialogueExamples: ""
  };
}

export function buildCharacterCard(overrides: Partial<CharacterCard> = {}): CharacterCard {
  const base = createEmptyCharacter();
  return {
    ...base,
    ...overrides,
    appearance: {
      ...base.appearance,
      ...overrides.appearance
    },
    consistency: {
      ...base.consistency,
      ...overrides.consistency,
      referenceImages: overrides.consistency?.referenceImages ?? base.consistency.referenceImages
    },
    expressions: overrides.expressions ?? base.expressions,
    outfits: overrides.outfits ?? base.outfits,
    tags: overrides.tags ?? base.tags
  };
}

export function createSceneEntry(name = "新条目"): SceneEntry {
  return {
    id: uuid(),
    name,
    enabled: true,
    keywords: [],
    secondaryKeywords: [],
    useRegex: false,
    alwaysActive: false,
    content: {
      environmentPrompt: "",
      negativePrompt: "",
      props: [],
      atmosphere: "",
      lighting: "",
      timeOfDay: "",
      weather: ""
    },
    referenceImages: [],
    insertionOrder: 100
  };
}

export function createEmptySceneBook(): SceneBook {
  const timestamp = now();
  return {
    id: uuid(),
    name: "未命名场景书",
    description: "",
    createdAt: timestamp,
    updatedAt: timestamp,
    constants: [],
    entries: [createSceneEntry("新场景条目")]
  };
}

export function buildSceneBook(overrides: Partial<SceneBook> = {}): SceneBook {
  const base = createEmptySceneBook();
  return {
    ...base,
    ...overrides,
    constants: overrides.constants ?? base.constants,
    entries: overrides.entries ?? base.entries
  };
}

export function createDefaultPreset(): DirectorPreset {
  const timestamp = now();
  return {
    id: uuid(),
    name: "默认导演预设",
    description: "适合 MVP 验证的一般叙事预设",
    createdAt: timestamp,
    updatedAt: timestamp,
    llm: {
      adapter: "openai-compatible",
      model: "gpt-4o-mini",
      temperature: 0.7,
      maxTokens: 4096
    },
    systemPrompt: DEFAULT_DIRECTOR_SYSTEM_PROMPT,
    storyboardSchema: JSON.stringify(
      {
        sceneNumber: 1,
        sceneTitle: "场景标题",
        shots: []
      },
      null,
      2,
    ),
    visualStyle: {
      defaultImageAdapter: "comfyui",
      steps: 30,
      cfgScale: 7,
      sampler: "euler",
      checkpoint: "sd_xl_base_1.0.safetensors",
      width: 1024,
      height: 576
    },
    promptTemplates: {
      characterTemplate: "{{character.appearance.basePrompt}}",
      sceneTemplate: "{{scene.content.environmentPrompt}}",
      finalTemplate: "{{shot.description}}, {{characters}}, {{scene}}"
    }
  };
}

export function createProject(name: string, description = ""): Project {
  const timestamp = now();
  return {
    id: uuid(),
    name,
    description,
    createdAt: timestamp,
    updatedAt: timestamp,
    characterIds: [],
    storyboardIds: [],
    settings: {
      outputFormat: "image_sequence",
      aspectRatio: "16:9"
    }
  };
}
