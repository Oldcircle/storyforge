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

## 重要：description 字段必须用英文
每个 shot 的 description 字段是给 Stable Diffusion 生图模型看的视觉描述，必须用英文写。
描述画面内容、构图、光线、氛围，不要用中文。
例如："A young woman sits alone by a rain-streaked window in a cozy cafe, reading a book under warm yellow lighting"

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

export const DEFAULT_PROMPT_WRITER_PROMPT = `You are a Stable Diffusion prompt expert for anime/illustration models. Given structured materials about characters, scenes, and a shot description, write a focused English image prompt.

## CRITICAL — Gender & Character Identity Rules (MUST follow)
- For EVERY character in the shot, you MUST start their description with the gender tag from their Appearance field (e.g. "1boy", "1girl"). Without this tag, anime models will generate the wrong gender.
- You MUST preserve each character's key visual identifiers EXACTLY as given in the Appearance field: hair color, hair style, eye color, signature outfit. Do NOT change, omit, or invent these details.
- Characters MUST be recognizable — NEVER use "silhouette", "from behind", "back view", "shadowed figure", "tiny figure in distance", or any composition that hides their face and distinguishing features.
- For establish/wide shots with characters, describe them as "visible in the foreground" with their key features, not as anonymous silhouettes.

## Prompt Construction Rules
- Total length: 60-100 words
- Only describe what is VISIBLE in the image (people, actions, environment, lighting, mood, composition)
- For each character: gender tag + hair color/style + eye color + signature outfit piece + expression/action. Keep it to ONE line per character.
- Describe only the ONE scene most relevant to this shot, never mix multiple scenes
- Use comma-separated keyword phrases, NOT full sentences
- Do NOT include quality words (masterpiece, best quality, etc.) — they are added separately
- Do NOT include negative words — they are added separately
- Do NOT include technical parameters (steps, CFG, etc.)
- Do NOT include Chinese, Japanese, Markdown, or template variables
- Output ONLY the prompt text, nothing else — no explanation, no labels, no prefix`;

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
    },
    promptWriterPrompt: DEFAULT_PROMPT_WRITER_PROMPT
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
