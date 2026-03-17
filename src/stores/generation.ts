import { create } from "zustand";
import { ComfyUIAdapter } from "../adapters/image/comfyui";
import { assembleImagePrompt, getActivatedSceneEntries } from "../engine/prompt-assembler";
import { useSettingsStore } from "./settings";
import { useStoryboardStore } from "./storyboard";
import type { CharacterCard } from "../types/character";
import type { DirectorPreset } from "../types/preset";
import type { SceneBook } from "../types/scene";
import type { Shot, ShotExecutionRequest, ShotExecutionSnapshot } from "../types/storyboard";

type ShotStatus = {
  status: "idle" | "generating" | "completed" | "error";
  error?: string;
  imageUrl?: string;
};

export type GenerateShotInput = {
  storyboardId: string;
  storyboardUserPrompt: string;
  shot: Shot;
  characters: CharacterCard[];
  sceneBook?: SceneBook;
  preset: DirectorPreset;
};

type GenerationStore = {
  shotStatus: Record<string, ShotStatus>;
  generatingAll: boolean;
  generateShot: (input: GenerateShotInput) => Promise<void>;
  generateAllShots: (inputs: GenerateShotInput[]) => Promise<void>;
  clearStatus: (shotId: string) => void;
};

function setShotState(
  state: Record<string, ShotStatus>,
  shotId: string,
  next: ShotStatus
): Record<string, ShotStatus> {
  return {
    ...state,
    [shotId]: next
  };
}

export const useGenerationStore = create<GenerationStore>((set, get) => ({
  shotStatus: {},
  generatingAll: false,
  generateShot: async ({ storyboardId, storyboardUserPrompt, shot, characters, sceneBook, preset }) => {
    const startedAt = Date.now();
    set((state) => ({
      shotStatus: setShotState(state.shotStatus, shot.id, {
        status: "generating",
        imageUrl: shot.generatedImage
      })
    }));

    await useStoryboardStore.getState().updateShot(storyboardId, shot.id, (currentShot) => ({
      ...currentShot,
      status: "generating",
      error: undefined
    }));

    try {
      const settings = useSettingsStore.getState().settings;
      const adapter = new ComfyUIAdapter(settings.comfyuiUrl);
      const activatedScenes = getActivatedSceneEntries(
        sceneBook,
        `${storyboardUserPrompt}\n${shot.description}`
      );
      const assembled = assembleImagePrompt(shot, characters, activatedScenes, preset);
      const executionRequest: ShotExecutionRequest = {
        positive: assembled.positive,
        negative: assembled.negative,
        width: assembled.width,
        height: assembled.height,
        steps: assembled.steps,
        cfgScale: assembled.cfgScale,
        sampler: assembled.sampler,
        checkpoint: assembled.checkpoint,
        seed: assembled.seed,
        workflowTemplateId: "builtin:comfyui-basic-txt2img",
        workflowTemplateVersion: adapter.version
      };
      const runningExecution: ShotExecutionSnapshot = {
        adapterId: adapter.id,
        status: "running",
        startedAt,
        request: executionRequest
      };

      await useStoryboardStore.getState().updateShot(storyboardId, shot.id, (currentShot) => ({
        ...currentShot,
        execution: runningExecution
      }));

      const result = await adapter.generate({
        prompt: assembled.positive,
        negativePrompt: assembled.negative,
        referenceImages: assembled.referenceImages,
        loras: assembled.loras,
        seed: assembled.seed,
        checkpoint: assembled.checkpoint,
        width: assembled.width,
        height: assembled.height,
        steps: assembled.steps,
        cfgScale: assembled.cfgScale,
        sampler: assembled.sampler
      });

      const generatedImage = result.images[0];
      const finishedAt = Date.now();
      await useStoryboardStore.getState().updateShot(storyboardId, shot.id, (currentShot) => ({
        ...currentShot,
        generatedImage,
        status: "completed",
        error: undefined,
        assembledPrompt: {
          positive: assembled.positive,
          negative: assembled.negative,
          parameters: {
            ...result.metadata,
            sampler: assembled.sampler,
            checkpoint: assembled.checkpoint,
            steps: assembled.steps,
            cfgScale: assembled.cfgScale,
            width: assembled.width,
            height: assembled.height,
            seed: result.seed ?? assembled.seed,
            workflowTemplateId: executionRequest.workflowTemplateId,
            workflowTemplateVersion: executionRequest.workflowTemplateVersion
          }
        },
        execution: {
          adapterId: adapter.id,
          status: "completed",
          startedAt,
          finishedAt,
          request: {
            ...executionRequest,
            seed: result.seed ?? executionRequest.seed
          },
          result: {
            imageUrls: result.images,
            metadata: result.metadata
          }
        },
      }));

      set((state) => ({
        shotStatus: setShotState(state.shotStatus, shot.id, {
          status: "completed",
          imageUrl: generatedImage
        })
      }));
    } catch (error) {
      const assembled = shot.assembledPrompt;
      const message = error instanceof Error ? error.message : String(error);
      const failedAt = Date.now();
      await useStoryboardStore.getState().updateShot(storyboardId, shot.id, (currentShot) => ({
        ...currentShot,
        status: "error",
        error: message,
        execution: {
          adapterId: "comfyui",
          status: "error",
          startedAt,
          finishedAt: failedAt,
          request: currentShot.execution?.request ?? {
            positive: assembled?.positive ?? "",
            negative: assembled?.negative ?? "",
            width: preset.visualStyle.width,
            height: preset.visualStyle.height,
            steps: preset.visualStyle.steps,
            cfgScale: preset.visualStyle.cfgScale,
            sampler: preset.visualStyle.sampler,
            checkpoint: preset.visualStyle.checkpoint
          },
          result: currentShot.execution?.result,
          error: message
        }
      }));
      set((state) => ({
        shotStatus: setShotState(state.shotStatus, shot.id, {
          status: "error",
          error: message,
          imageUrl: shot.generatedImage
        })
      }));
      throw error;
    }
  },
  generateAllShots: async (inputs) => {
    set({ generatingAll: true });
    try {
      for (const input of inputs) {
        try {
          await get().generateShot(input);
        } catch {
          continue;
        }
      }
    } finally {
      set({ generatingAll: false });
    }
  },
  clearStatus: (shotId) =>
    set((state) => {
      const nextStatus = { ...state.shotStatus };
      delete nextStatus[shotId];
      return { shotStatus: nextStatus };
    })
}));
