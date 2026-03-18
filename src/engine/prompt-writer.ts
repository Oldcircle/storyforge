import { OpenAICompatibleAdapter } from "../adapters/llm/openai-compatible";
import { DEFAULT_PROMPT_WRITER_PROMPT } from "../data/defaults";
import type { CharacterCard } from "../types/character";
import type { SceneEntry } from "../types/scene";
import type { GlobalSettings } from "../types/settings";
import type { Shot } from "../types/storyboard";

// ---------------------------------------------------------------------------
// Prompt Writer — LLM rewrites scattered assets into a focused SD prompt
// ---------------------------------------------------------------------------

export interface PromptWriterInput {
  shot: Shot;
  characters: CharacterCard[];
  imageEntries: SceneEntry[];
  settings: GlobalSettings;
  /** Custom system prompt from RenderPreset. Falls back to DEFAULT_PROMPT_WRITER_PROMPT. */
  promptWriterPrompt?: string;
}

export interface PromptWriterResult {
  positive: string;
  rawLLMOutput: string;
}

function buildUserMessage(
  shot: Shot,
  characters: CharacterCard[],
  imageEntries: SceneEntry[],
): string {
  const parts: string[] = [];

  // Shot info
  parts.push(`## Shot`);
  parts.push(`Type: ${shot.type}`);
  parts.push(`Camera: ${shot.cameraMovement}`);
  parts.push(`Description: ${shot.description}`);
  if (shot.characters.length === 2) {
    parts.push(`Note: two people in frame`);
  } else if (shot.characters.length >= 3) {
    parts.push(`Note: ${shot.characters.length} people in frame`);
  }

  // Characters in this shot
  for (const sc of shot.characters) {
    const card = characters.find((c) => c.id === sc.characterId);
    if (!card) continue;

    parts.push(`\n## Character: ${card.name}`);
    parts.push(`Appearance (MUST preserve gender tag and key features): ${card.appearance.basePrompt}`);
    if (card.appearance.styleModifiers) {
      parts.push(`Style: ${card.appearance.styleModifiers}`);
    }
    const expr = card.expressions[sc.emotion];
    if (expr?.promptModifier) {
      parts.push(`Expression: ${expr.promptModifier}`);
    }
    if (sc.outfit && card.outfits[sc.outfit]) {
      parts.push(`Outfit: ${card.outfits[sc.outfit]}`);
    }
    parts.push(`Position: ${sc.position}`);
    if (sc.action) {
      parts.push(`Action: ${sc.action}`);
    }
  }

  // Scene entries
  if (imageEntries.length > 0) {
    parts.push(`\n## Scene Environment`);
    for (const entry of imageEntries) {
      if (entry.content.environmentPrompt) {
        parts.push(`- ${entry.name}: ${entry.content.environmentPrompt}`);
      }
      if (entry.content.atmosphere) {
        parts.push(`  Atmosphere: ${entry.content.atmosphere}`);
      }
      if (entry.content.lighting) {
        parts.push(`  Lighting: ${entry.content.lighting}`);
      }
    }
  }

  return parts.join("\n");
}

function sanitizeOutput(raw: string): string {
  return raw
    .replace(/^(prompt|positive|output|result)\s*:\s*/i, "")
    .replace(/^["']|["']$/g, "")
    .replace(/\n+/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function writeImagePrompt(
  input: PromptWriterInput,
): Promise<PromptWriterResult> {
  const { shot, characters, imageEntries, settings, promptWriterPrompt } = input;

  const systemPrompt = promptWriterPrompt?.trim() || DEFAULT_PROMPT_WRITER_PROMPT;

  const model = settings.llmProviderId === "custom"
    ? settings.llmCustomModelId || settings.llmModel
    : settings.llmModel;

  const adapter = new OpenAICompatibleAdapter({
    apiUrl: settings.llmApiUrl,
    apiKey: settings.llmApiKey,
    model,
  });

  const userMessage = buildUserMessage(shot, characters, imageEntries);

  const rawLLMOutput = await adapter.chat(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    {
      temperature: 0.4,
      maxTokens: 300,
    },
  );

  const positive = sanitizeOutput(rawLLMOutput);

  return { positive, rawLLMOutput };
}
