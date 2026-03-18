import { v4 as uuid } from "uuid";
import type { CharacterCard } from "../types/character";
import type { DirectorPreset } from "../types/preset";
import type { Project } from "../types/project";
import type { RenderPreset } from "../types/render-preset";
import type { SceneBook, SceneEntry } from "../types/scene";
import type { GlobalSettings } from "../types/settings";
import type { WorkflowTemplate } from "../types/workflow-template";

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
    usage: "shared",
    keywords: [],
    secondaryKeywords: [],
    useRegex: false,
    alwaysActive: false,
    content: {
      directorContext: "",
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
    defaultImageAdapter: "comfyui",
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
    workflowTemplateId: "builtin:comfyui-basic-txt2img",
    settings: {
      outputFormat: "image_sequence",
      aspectRatio: "16:9"
    }
  };
}

export function createDefaultRenderPreset(): RenderPreset {
  const timestamp = now();
  return {
    id: uuid(),
    name: "默认渲染预设",
    description: "Anime / 插画风格通用预设",
    createdAt: timestamp,
    updatedAt: timestamp,
    positivePrefix: ["masterpiece", "best quality", "very aesthetic"],
    positiveSuffix: ["detailed background", "depth of field"],
    negativePrompt: [
      "lowres", "bad anatomy", "bad hands", "text", "watermark",
      "worst quality", "low quality", "blurry"
    ],
    defaults: {
      checkpoint: "",
      sampler: "euler",
      steps: 30,
      cfgScale: 7,
      clipSkip: 2,
      width: 1024,
      height: 576
    },
    hires: {
      enabled: false,
      steps: 40,
      upscale: 1.5,
      denoise: 0.4
    },
    adetailer: {
      enabled: false
    }
  };
}

export function createBuiltinTxt2imgTemplate(): WorkflowTemplate {
  const timestamp = now();
  return {
    id: "builtin:comfyui-basic-txt2img",
    name: "ComfyUI Basic txt2img",
    description: "最小化 txt2img 工作流：Checkpoint → CLIP → KSampler → VAEDecode → SaveImage",
    adapter: "comfyui",
    createdAt: timestamp,
    updatedAt: timestamp,
    builtin: true,
    template: {},  // built at generation time by the adapter
    slots: {
      checkpoint: { nodeId: "1", inputKey: "ckpt_name" },
      positive: { nodeId: "3", inputKey: "text" },
      negative: { nodeId: "4", inputKey: "text" },
      seed: { nodeId: "6", inputKey: "seed" },
      steps: { nodeId: "6", inputKey: "steps" },
      cfgScale: { nodeId: "6", inputKey: "cfg" },
      sampler: { nodeId: "6", inputKey: "sampler_name" },
      width: { nodeId: "5", inputKey: "width" },
      height: { nodeId: "5", inputKey: "height" }
    }
  };
}
