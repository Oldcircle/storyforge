import { OpenAICompatibleAdapter } from "../adapters/llm/openai-compatible";
import { getProvider } from "../data/providers";
import type { CharacterCard } from "../types/character";
import type { DirectorPreset } from "../types/preset";
import type { Project } from "../types/project";
import type { SceneBook } from "../types/scene";
import type { GlobalSettings } from "../types/settings";
import type { PromptMode, Storyboard } from "../types/storyboard";
import { assembleDirectorPrompt } from "./prompt-assembler";
import { parseStoryboardResponse } from "./storyboard-parser";

export interface GenerateStoryboardInput {
  project: Project;
  preset: DirectorPreset;
  characters: CharacterCard[];
  sceneBook?: SceneBook;
  settings: GlobalSettings;
  userInput: string;
  previousSceneSummary?: string;
  promptMode?: PromptMode;
}

export interface GenerateStoryboardResult {
  storyboard: Storyboard;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  rawResponse: string;
}

export async function generateStoryboard(
  input: GenerateStoryboardInput,
): Promise<GenerateStoryboardResult> {
  if (!input.settings.llmApiUrl.trim()) {
    throw new Error("请先在设置中配置 LLM API URL");
  }

  const provider = getProvider(input.settings.llmProviderId);
  if (provider?.requiresApiKey && !input.settings.llmApiKey.trim()) {
    throw new Error("请先在设置中填写 API Key");
  }

  const model =
    input.settings.llmProviderId === "custom"
      ? input.settings.llmCustomModelId || input.preset.llm.model
      : input.settings.llmModel || input.preset.llm.model;

  const adapter = new OpenAICompatibleAdapter({
    apiUrl: input.settings.llmApiUrl,
    apiKey: input.settings.llmApiKey,
    model,
  });

  const messages = assembleDirectorPrompt(
    input.preset,
    input.characters,
    input.sceneBook,
    input.userInput,
    input.previousSceneSummary,
    input.promptMode ?? input.project.settings.promptMode ?? "rules",
  );

  const rawResponse = await adapter.chat(messages, {
    temperature: input.preset.llm.temperature,
    maxTokens: input.preset.llm.maxTokens,
    jsonMode: true
  });

  const storyboard = parseStoryboardResponse(rawResponse, {
    projectId: input.project.id,
    userPrompt: input.userInput
  });

  return {
    storyboard,
    messages,
    rawResponse
  };
}
