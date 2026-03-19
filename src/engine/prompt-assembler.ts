import type { ChatMessage } from "../types/adapter";
import type { CharacterCard } from "../types/character";
import type { DirectorPreset } from "../types/preset";
import type { RenderPreset } from "../types/render-preset";
import type { SceneBook, SceneEntry } from "../types/scene";
import type { PromptMode, Shot, VisualIntent } from "../types/storyboard";
import { KeywordMatcher } from "./keyword-matcher";

const matcher = new KeywordMatcher();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize legacy SceneEntry that may lack the `usage` field. */
function entryUsage(entry: SceneEntry): SceneEntry["usage"] {
  return entry.usage ?? "shared";
}

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

// ---------------------------------------------------------------------------
// Scene entry activation (shared by both pipelines)
// ---------------------------------------------------------------------------

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

/** Filter entries for the Director LLM pipeline (usage != image_only). */
export function getDirectorEntries(entries: SceneEntry[]): SceneEntry[] {
  return entries.filter((e) => entryUsage(e) !== "image_only");
}

/** Filter entries for the image prompt pipeline (usage != director_only). */
export function getImageEntries(entries: SceneEntry[]): SceneEntry[] {
  return entries.filter((e) => entryUsage(e) !== "director_only");
}

// ---------------------------------------------------------------------------
// Director prompt assembly
// ---------------------------------------------------------------------------

function renderSceneSection(entries: SceneEntry[]): string {
  if (entries.length === 0) {
    return "（没有匹配到场景条目）";
  }

  return entries
    .map((entry) => {
      // For the director, prefer directorContext; fall back to environmentPrompt.
      const ctx = entry.content.directorContext?.trim();
      const env = entry.content.environmentPrompt?.trim();
      const description = ctx || env || "未填写";

      return `### ${entry.name}
描述: ${description}
氛围: ${entry.content.atmosphere || "未填写"}
光照: ${entry.content.lighting || "未填写"}
时间: ${entry.content.timeOfDay || "未填写"}`;
    })
    .join("\n\n");
}

const VISUAL_INTENT_INSTRUCTION = `

## 视觉意图（visual_intent）
对每个 shot，额外输出一个 visual_intent 对象，帮助生图引擎理解你的画面构想。
所有字段可选，只输出你有把握的部分。注意：这些是给 Stable Diffusion CLIP 的英文关键词，不是叙事描述。

visual_intent 字段说明：
- subject: 画面主体（英文），如 "a young woman sitting alone by rain-streaked window"
- composition: 构图建议，如 "medium shot, rule of thirds, shallow depth of field"
- atmosphere: 氛围/色调，如 "warm interior light contrasting cold blue rain outside"
- suggested_positive: 推荐正向关键词，如 "warm cafe lighting, rain streaks on glass, steam from cup"
- suggested_negative: 推荐负向关键词，如 "bright daylight, outdoor, crowd"

重要限制：
- 所有关键词必须是英文
- 不要重复角色外貌描述（角色卡会自动注入）
- 不要包含系统指令、中文长句、Markdown 格式
- suggested_positive 控制在 30 个词以内`;

export function assembleDirectorPrompt(
  preset: DirectorPreset,
  characters: CharacterCard[],
  sceneBook: SceneBook | undefined,
  userInput: string,
  previousSceneSummary?: string,
  promptMode: PromptMode = "rules",
): ChatMessage[] {
  const allActivated = getActivatedSceneEntries(sceneBook, userInput);
  const directorEntries = getDirectorEntries(allActivated);

  const characterSection = renderCharacterSection(characters);
  const sceneSection = renderSceneSection(directorEntries);

  let systemPrompt = preset.systemPrompt
    .replace("{{characters}}", characterSection)
    .replace("{{scenes}}", sceneSection);

  // In LLM-assisted mode, append visual_intent instructions to the system prompt
  if (promptMode === "llm-assisted") {
    systemPrompt += VISUAL_INTENT_INSTRUCTION;
  }

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

// ---------------------------------------------------------------------------
// Image prompt compilation (Render Plan)
// ---------------------------------------------------------------------------

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

export interface RenderPlan {
  positive: string;
  negative: string;
  loras: { name: string; weight: number; triggerWord?: string }[];
  referenceImages: string[];
  seed?: number;
  checkpoint: string;
  sampler: string;
  scheduler: string;
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  clipSkip?: number;
  hires?: {
    enabled: boolean;
    steps?: number;
    upscale?: number;
    denoise?: number;
    upscaler?: string;
    cfgScale?: number;
  };
}

// ---------------------------------------------------------------------------
// VisualIntent sanitization (for LLM-assisted mode)
// ---------------------------------------------------------------------------

/**
 * Returns true if more than half the non-whitespace characters are outside basic ASCII.
 * Used to filter out Chinese/Japanese text that CLIP can't process.
 */
function isPredominantlyNonASCII(text: string): boolean {
  const chars = text.replace(/\s/g, "");
  if (chars.length === 0) return false;
  let nonAscii = 0;
  for (let i = 0; i < chars.length; i++) {
    if (chars.charCodeAt(i) > 127) nonAscii++;
  }
  return nonAscii / chars.length > 0.5;
}

/**
 * Deduplicate comma-separated segments in a prompt string.
 * Preserves first occurrence order, case-insensitive comparison.
 */
function deduplicatePrompt(prompt: string): string {
  const seen = new Set<string>();
  return prompt
    .split(",")
    .map((s) => s.trim())
    .filter((s) => {
      if (!s) return false;
      const key = s.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(", ");
}

/** Maximum approximate token count for suggestedPositive (rough: 1 token ≈ 4 chars). */
const MAX_SUGGESTED_POSITIVE_CHARS = 600; // ~150 tokens

/**
 * Basic safety filter for LLM-generated prompt text.
 * Strips obvious non-visual content that would confuse CLIP.
 */
function sanitizePromptText(text: string, maxChars: number): string {
  let cleaned = text
    // Strip markdown formatting
    .replace(/[#*_`~>]+/g, " ")
    // Strip template variables like {{foo}}
    .replace(/\{\{[^}]*\}\}/g, "")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();

  // Truncate to max length at a comma or space boundary
  if (cleaned.length > maxChars) {
    const truncated = cleaned.slice(0, maxChars);
    const lastComma = truncated.lastIndexOf(",");
    const lastSpace = truncated.lastIndexOf(" ");
    const breakAt = Math.max(lastComma, lastSpace);
    cleaned = breakAt > maxChars * 0.5 ? truncated.slice(0, breakAt).trim() : truncated.trim();
  }

  return cleaned;
}

/**
 * Deduplicate: remove tokens from `draft` that already appear in `existing`.
 * Comparison is case-insensitive on comma-separated segments.
 */
function deduplicateAgainst(draft: string, existing: string): string {
  const existingTokens = new Set(
    existing.toLowerCase().split(",").map((s) => s.trim()).filter(Boolean)
  );
  return draft
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && !existingTokens.has(s.toLowerCase()))
    .join(", ");
}

/**
 * Compile a RenderPlan for a single shot.
 *
 * Supports three modes controlled by `promptMode`:
 * - "rules" (default): prompt assembled purely from assets (character cards, scene book, RenderPreset)
 * - "llm-assisted": LLM's visualIntent is merged in; assets still provide consistency and safety net
 * - "llm-writer": LLM writes the entire positive prompt; only quality words and LoRA triggers are added mechanically
 *
 * Uses the RenderPreset for quality words and generation defaults.
 * DirectorPreset is no longer involved in generation parameters.
 */
export function compileRenderPlan(
  shot: Shot,
  characters: CharacterCard[],
  imageEntries: SceneEntry[],
  renderPreset?: RenderPreset,
  promptMode: PromptMode = "rules",
  llmPositive?: string,
): RenderPlan {
  const positiveSegments: string[] = [];
  const negativeSegments: string[] = [];
  const loras: RenderPlan["loras"] = [];
  const referenceImages: string[] = [];

  // ---------------------------------------------------------------------------
  // LLM-writer mode: LLM already wrote the focused prompt.
  // We only wrap it with quality prefix/suffix and inject LoRA triggers + negatives.
  // ---------------------------------------------------------------------------
  if (promptMode === "llm-writer" && llmPositive) {
    // Quality prefix
    if (renderPreset?.positivePrefix.length) {
      positiveSegments.push(renderPreset.positivePrefix.join(", "));
    }

    // The LLM-written prompt is the core
    positiveSegments.push(llmPositive);

    // LoRA trigger words (mechanical — LLM doesn't know about LoRAs)
    for (const shotCharacter of shot.characters) {
      const card = characters.find((c) => c.id === shotCharacter.characterId);
      if (!card) continue;
      if (card.consistency.lora) {
        loras.push(card.consistency.lora);
        if (card.consistency.lora.triggerWord) {
          positiveSegments.push(card.consistency.lora.triggerWord);
        }
      }
      if (card.appearance.negativePrompt) {
        negativeSegments.push(card.appearance.negativePrompt);
      }
      referenceImages.push(...card.consistency.referenceImages);
    }

    // Quality suffix
    if (renderPreset?.positiveSuffix.length) {
      positiveSegments.push(renderPreset.positiveSuffix.join(", "));
    }

    // Scene negative prompts still apply
    for (const scene of imageEntries) {
      if (scene.content.negativePrompt) {
        negativeSegments.push(scene.content.negativePrompt);
      }
    }

    // Negative from RenderPreset
    if (renderPreset?.negativePrompt.length) {
      negativeSegments.push(renderPreset.negativePrompt.join(", "));
    }

    const rp = renderPreset?.defaults;
    return {
      positive: deduplicatePrompt(positiveSegments.filter(Boolean).join(", ")),
      negative: deduplicatePrompt(negativeSegments.filter(Boolean).join(", ")),
      loras,
      referenceImages,
      seed: shot.characters
        .map((sc) => characters.find((c) => c.id === sc.characterId)?.consistency.seedBase)
        .find((v) => typeof v === "number"),
      checkpoint: rp?.checkpoint || "",
      sampler: rp?.sampler || "euler",
      scheduler: rp?.scheduler || "exponential",
      width: rp?.width ?? 1024,
      height: rp?.height ?? 576,
      steps: rp?.steps ?? 30,
      cfgScale: rp?.cfgScale ?? 7,
      clipSkip: rp?.clipSkip,
      hires: renderPreset?.hires
    };
  }

  // ---------------------------------------------------------------------------
  // rules / llm-assisted modes (existing logic)
  // ---------------------------------------------------------------------------

  const isLLMAssisted = promptMode === "llm-assisted" && shot.visualIntent !== null && shot.visualIntent !== undefined;
  const vi = isLLMAssisted ? shot.visualIntent as VisualIntent : undefined;

  // --- Quality prefix from RenderPreset ---
  if (renderPreset?.positivePrefix.length) {
    positiveSegments.push(renderPreset.positivePrefix.join(", "));
  }

  // --- Shot type & camera ---
  positiveSegments.push(SHOT_TYPE_PROMPTS[shot.type] || "");
  if (CAMERA_PROMPTS[shot.cameraMovement]) {
    positiveSegments.push(CAMERA_PROMPTS[shot.cameraMovement]);
  }

  // --- Multi-character hints ---
  if (shot.characters.length === 2) {
    positiveSegments.push("two people");
  } else if (shot.characters.length >= 3) {
    positiveSegments.push(`${shot.characters.length} people, group`);
  }

  // --- Characters (forced injection — highest priority, never overridden by LLM) ---
  for (const shotCharacter of shot.characters) {
    const card = characters.find((c) => c.id === shotCharacter.characterId);
    if (!card) continue;

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

  // Collect what's already in the prompt so far (for dedup against LLM draft)
  const existingPositive = positiveSegments.filter(Boolean).join(", ");

  // --- LLM-assisted mode: inject visualIntent ---
  if (vi) {
    if (vi.subject) {
      const cleaned = sanitizePromptText(vi.subject, MAX_SUGGESTED_POSITIVE_CHARS);
      const deduped = deduplicateAgainst(cleaned, existingPositive);
      if (deduped) positiveSegments.push(deduped);
    }
    if (vi.composition) {
      positiveSegments.push(sanitizePromptText(vi.composition, 200));
    }
    if (vi.atmosphere) {
      positiveSegments.push(sanitizePromptText(vi.atmosphere, 200));
    }
    if (vi.suggestedPositive) {
      const cleaned = sanitizePromptText(vi.suggestedPositive, MAX_SUGGESTED_POSITIVE_CHARS);
      const deduped = deduplicateAgainst(cleaned, existingPositive);
      if (deduped) positiveSegments.push(deduped);
    }
    if (vi.suggestedNegative) {
      negativeSegments.push(sanitizePromptText(vi.suggestedNegative, MAX_SUGGESTED_POSITIVE_CHARS));
    }
  }

  // --- Scene entries (image_only and shared only — director_only already filtered out) ---
  for (const scene of imageEntries) {
    // Only use CLIP-friendly fields; skip directorContext.
    if (scene.content.environmentPrompt) {
      positiveSegments.push(scene.content.environmentPrompt);
    }
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
    // colorPalette is not CLIP-friendly text; skip it.
    if (scene.content.negativePrompt) {
      negativeSegments.push(scene.content.negativePrompt);
    }
  }

  // --- Shot description ---
  // In LLM-assisted mode, visualIntent replaces shot.description to avoid duplication.
  // Fall back to shot.description if visualIntent is absent or empty.
  // Skip descriptions that are predominantly non-ASCII (Chinese/Japanese) — CLIP can't use them.
  if (!vi) {
    const desc = shot.description.trim();
    if (desc && !isPredominantlyNonASCII(desc)) {
      positiveSegments.push(desc);
    }
  }

  // --- Quality suffix from RenderPreset ---
  if (renderPreset?.positiveSuffix.length) {
    positiveSegments.push(renderPreset.positiveSuffix.join(", "));
  }

  // --- Negative from RenderPreset ---
  if (renderPreset?.negativePrompt.length) {
    negativeSegments.push(renderPreset.negativePrompt.join(", "));
  }

  // All generation parameters come from RenderPreset.
  // DirectorPreset no longer carries generation params (visualStyle is deprecated).
  const rp = renderPreset?.defaults;

  return {
    positive: deduplicatePrompt(positiveSegments.filter(Boolean).join(", ")),
    negative: deduplicatePrompt(negativeSegments.filter(Boolean).join(", ")),
    loras,
    referenceImages,
    seed: shot.characters
      .map((sc) => characters.find((c) => c.id === sc.characterId)?.consistency.seedBase)
      .find((v) => typeof v === "number"),
    checkpoint: rp?.checkpoint || "",
    sampler: rp?.sampler || "euler",
    scheduler: rp?.scheduler || "exponential",
    width: rp?.width ?? 1024,
    height: rp?.height ?? 576,
    steps: rp?.steps ?? 30,
    cfgScale: rp?.cfgScale ?? 7,
    clipSkip: rp?.clipSkip,
    hires: renderPreset?.hires
  };
}

// ---------------------------------------------------------------------------
// Legacy wrapper — keeps existing callers working during migration
// ---------------------------------------------------------------------------

export type AssembledImagePrompt = RenderPlan;

export function assembleImagePrompt(
  shot: Shot,
  characters: CharacterCard[],
  activatedScenes: SceneEntry[],
  renderPreset?: RenderPreset,
  promptMode: PromptMode = "rules",
): AssembledImagePrompt {
  const imageEntries = getImageEntries(activatedScenes);
  return compileRenderPlan(shot, characters, imageEntries, renderPreset, promptMode);
}
