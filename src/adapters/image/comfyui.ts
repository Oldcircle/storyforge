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

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

export function resolveComfyUIRequestBaseUrl(baseUrl: string): string {
  const normalized = normalizeBaseUrl(baseUrl);
  const localDevTargets = new Set(["http://127.0.0.1:8188", "http://localhost:8188"]);

  if (import.meta.env.DEV && localDevTargets.has(normalized)) {
    return "/comfyui-api";
  }

  return normalized;
}

async function readErrorDetail(response: Response): Promise<string> {
  const bodyText = (await response.text()).trim();
  if (!bodyText) {
    return `HTTP ${response.status} ${response.statusText}`.trim();
  }

  try {
    const parsed = JSON.parse(bodyText) as {
      error?: string | { message?: string; type?: string; details?: string };
      message?: string;
      node_errors?: unknown;
    };
    if (typeof parsed.error === "string") {
      return parsed.error;
    }
    if (parsed.error?.message) {
      return parsed.error.details
        ? `${parsed.error.message} (${parsed.error.details})`
        : parsed.error.message;
    }
    if (parsed.message) {
      return parsed.message;
    }
    if (parsed.node_errors) {
      return JSON.stringify(parsed.node_errors);
    }
  } catch {
    // Keep raw text if it is not JSON.
  }

  return bodyText;
}

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
      const response = await fetch(`${this.getEffectiveUrl()}/system_stats`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /** 查询 ComfyUI 可用的 checkpoint 列表 */
  async getCheckpoints(): Promise<string[]> {
    try {
      const res = await fetch(`${this.getEffectiveUrl()}/object_info/CheckpointLoaderSimple`);
      if (!res.ok) return [];
      const data = (await res.json()) as {
        CheckpointLoaderSimple?: {
          input?: { required?: { ckpt_name?: [string[]] } };
        };
      };
      return data.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] ?? [];
    } catch {
      return [];
    }
  }

  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const seed = request.seed ?? Math.floor(Math.random() * 2 ** 32);
    const checkpoint = await this.resolveCheckpoint(request.checkpoint);
    const workflow = this.buildWorkflow({ ...request, checkpoint, seed });

    const response = await fetch(`${this.getEffectiveUrl()}/prompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt: workflow })
    });

    if (!response.ok) {
      const detail = await readErrorDetail(response);
      throw new Error(`ComfyUI submit failed (${checkpoint}): ${detail}`);
    }

    const payload = (await response.json()) as { prompt_id?: string; error?: string };
    if (!payload.prompt_id) {
      throw new Error(payload.error || "ComfyUI 没有返回 prompt_id。");
    }

    return this.pollResult(payload.prompt_id, seed, request, workflow);
  }

  private getBaseUrl(): string {
    return normalizeBaseUrl(this.baseUrl);
  }

  private getEffectiveUrl(): string {
    return resolveComfyUIRequestBaseUrl(this.baseUrl);
  }

  private async resolveCheckpoint(checkpoint?: string): Promise<string> {
    const normalized = checkpoint?.trim();
    if (normalized) {
      return normalized;
    }

    const checkpoints = await this.getCheckpoints();
    if (checkpoints.length > 0) {
      return checkpoints[0];
    }

    throw new Error("ComfyUI 未返回任何可用 checkpoint，请先在 Preset 中选择模型或检查后端配置。");
  }

  private buildWorkflow(request: ImageGenerationRequest): Record<string, unknown> {
    const nodes: Record<string, unknown> = {};
    let nextId = 1;

    const checkpointId = String(nextId++);
    nodes[checkpointId] = {
      class_type: "CheckpointLoaderSimple",
      inputs: {
        ckpt_name: request.checkpoint
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
    workflow: Record<string, unknown>,
    maxAttempts = 90,
    intervalMs = 2000
  ): Promise<ImageGenerationResult> {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, intervalMs));

      const response = await fetch(`${this.getEffectiveUrl()}/history/${promptId}`);
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
            adapterId: this.id,
            adapterVersion: this.version,
            promptId,
            workflowTemplateId: "builtin:comfyui-basic-txt2img",
            workflowTemplateVersion: this.version,
            submittedWorkflow: workflow,
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

    return `${this.getEffectiveUrl()}/view?${params.toString()}`;
  }
}
