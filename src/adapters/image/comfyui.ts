import type { ImageAdapter, ImageGenerationRequest, ImageGenerationResult } from "../../types/adapter";

type ComfyHistoryImage = {
  filename: string;
  subfolder?: string;
  type?: string;
};

type ComfyHistoryEntry = {
  status?: {
    completed?: boolean;
    status_str?: string;
    messages?: unknown[];
  };
  outputs?: Record<string, { images?: ComfyHistoryImage[] }>;
};

export class ComfyUIAdapter implements ImageAdapter {
  readonly id = "comfyui";
  readonly name = "ComfyUI";
  readonly type = "image" as const;
  readonly version = "0.1.0";
  readonly description = "ComfyUI 本地生图后端";

  readonly capabilities = {
    supportsBatch: false,
    supportsControlNet: false,
    supportsIPAdapter: false,
    supportsLoRA: true,
    supportsImg2Img: false,
    supportsInpainting: false,
    maxResolution: [2048, 2048] as [number, number],
    supportedAspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4"]
  };

  constructor(private readonly baseUrl: string) {}

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/system_stats`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const seed = request.seed ?? Math.floor(Math.random() * 2 ** 32);
    const workflow = this.buildWorkflow({ ...request, seed });

    const response = await fetch(`${this.getBaseUrl()}/prompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt: workflow })
    });

    if (!response.ok) {
      throw new Error(`ComfyUI submit failed: ${await response.text()}`);
    }

    const payload = (await response.json()) as { prompt_id?: string; error?: string };
    if (!payload.prompt_id) {
      throw new Error(payload.error || "ComfyUI 没有返回 prompt_id。");
    }

    return this.pollResult(payload.prompt_id, seed, request);
  }

  private getBaseUrl(): string {
    return this.baseUrl.replace(/\/$/, "");
  }

  private buildWorkflow(request: ImageGenerationRequest): Record<string, unknown> {
    const nodes: Record<string, unknown> = {};
    let nextId = 1;

    const checkpointId = String(nextId++);
    nodes[checkpointId] = {
      class_type: "CheckpointLoaderSimple",
      inputs: {
        ckpt_name: request.checkpoint || "sd_xl_base_1.0.safetensors"
      }
    };

    let modelOutput: [string, number] = [checkpointId, 0];
    let clipOutput: [string, number] = [checkpointId, 1];
    const vaeOutput: [string, number] = [checkpointId, 2];

    for (const lora of request.loras ?? []) {
      const loraId = String(nextId++);
      nodes[loraId] = {
        class_type: "LoraLoader",
        inputs: {
          lora_name: lora.name,
          strength_model: lora.weight,
          strength_clip: lora.weight,
          model: modelOutput,
          clip: clipOutput
        }
      };
      modelOutput = [loraId, 0];
      clipOutput = [loraId, 1];
    }

    const positiveId = String(nextId++);
    nodes[positiveId] = {
      class_type: "CLIPTextEncode",
      inputs: {
        text: request.prompt,
        clip: clipOutput
      }
    };

    const negativeId = String(nextId++);
    nodes[negativeId] = {
      class_type: "CLIPTextEncode",
      inputs: {
        text: request.negativePrompt || "",
        clip: clipOutput
      }
    };

    const latentId = String(nextId++);
    nodes[latentId] = {
      class_type: "EmptyLatentImage",
      inputs: {
        width: request.width,
        height: request.height,
        batch_size: 1
      }
    };

    const samplerId = String(nextId++);
    nodes[samplerId] = {
      class_type: "KSampler",
      inputs: {
        model: modelOutput,
        positive: [positiveId, 0],
        negative: [negativeId, 0],
        latent_image: [latentId, 0],
        seed: request.seed,
        steps: request.steps || 30,
        cfg: request.cfgScale || 7,
        sampler_name: request.sampler || "euler",
        scheduler: "normal",
        denoise: 1
      }
    };

    const decodeId = String(nextId++);
    nodes[decodeId] = {
      class_type: "VAEDecode",
      inputs: {
        samples: [samplerId, 0],
        vae: vaeOutput
      }
    };

    const saveId = String(nextId++);
    nodes[saveId] = {
      class_type: "SaveImage",
      inputs: {
        images: [decodeId, 0],
        filename_prefix: "storyforge"
      }
    };

    return nodes;
  }

  private async pollResult(
    promptId: string,
    seed: number,
    request: ImageGenerationRequest,
    maxAttempts = 90,
    intervalMs = 2000
  ): Promise<ImageGenerationResult> {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, intervalMs));

      const response = await fetch(`${this.getBaseUrl()}/history/${promptId}`);
      if (!response.ok) {
        continue;
      }

      const history = (await response.json()) as Record<string, ComfyHistoryEntry | undefined>;
      const entry = history[promptId];
      if (!entry) {
        continue;
      }

      if (entry.status?.status_str === "error") {
        throw new Error(`ComfyUI 生成失败：${JSON.stringify(entry.status.messages ?? entry.status)}`);
      }

      if (!entry.status?.completed || !entry.outputs) {
        continue;
      }

      const images = Object.values(entry.outputs)
        .flatMap((output) => output.images ?? [])
        .map((image) => this.buildViewUrl(image));

      if (images.length > 0) {
        return {
          images,
          seed,
          metadata: {
            promptId,
            referenceImages: request.referenceImages ?? [],
            loras: request.loras ?? []
          }
        };
      }
    }

    throw new Error("ComfyUI 生成超时，请检查后端是否仍在运行。");
  }

  private buildViewUrl(image: ComfyHistoryImage): string {
    const params = new URLSearchParams({
      filename: image.filename,
      subfolder: image.subfolder || "",
      type: image.type || "output"
    });

    return `${this.getBaseUrl()}/view?${params.toString()}`;
  }
}
