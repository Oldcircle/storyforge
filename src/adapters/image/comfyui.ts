import type { ImageAdapter, ImageGenerationRequest, ImageGenerationResult } from "../../types/adapter";
import type { WorkflowSlot, WorkflowTemplate } from "../../types/workflow-template";

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
      const data = (await res.json()) as Record<string, unknown>;
      const node = data.CheckpointLoaderSimple as { input?: { required?: { ckpt_name?: unknown } } } | undefined;
      return ComfyUIAdapter.extractOptions(node?.input?.required?.ckpt_name);
    } catch {
      return [];
    }
  }

  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const seed = request.seed ?? Math.floor(Math.random() * 2 ** 32);
    const checkpoint = await this.resolveCheckpoint(request.checkpoint);
    const workflow = this.buildWorkflow({ ...request, checkpoint, seed });
    const workflowTemplateId = request.workflowTemplate?.id ?? "builtin:comfyui-basic-txt2img";
    const workflowTemplateVersion = request.workflowTemplateVersion
      ?? (request.workflowTemplate ? String(request.workflowTemplate.updatedAt) : this.version);

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

    return this.pollResult(
      payload.prompt_id,
      seed,
      request,
      workflow,
      workflowTemplateId,
      workflowTemplateVersion
    );
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
    const template = request.workflowTemplate;
    if (template && !this.shouldUseBuiltinTemplate(template)) {
      return this.applyWorkflowTemplate(template, request);
    }

    return this.buildBuiltinWorkflow(request);
  }

  private shouldUseBuiltinTemplate(template: WorkflowTemplate): boolean {
    return template.builtin || template.id === "builtin:comfyui-basic-txt2img";
  }

  /**
   * Extract string[] from a ComfyUI object_info field.
   * ComfyUI has two formats depending on version:
   *   - Old: [string[]]
   *   - New (v0.17+): ["COMBO", { options: string[] }] or [string[], { tooltip }]
   */
  private static extractOptions(field: unknown): string[] {
    if (!Array.isArray(field) || field.length === 0) return [];
    const first = field[0];
    // New format: ["COMBO", { options: [...] }]
    if (first === "COMBO" && field[1] && typeof field[1] === "object") {
      const opts = (field[1] as { options?: unknown }).options;
      return Array.isArray(opts) ? (opts as string[]) : [];
    }
    // Old or alternate format: [string[], ...]
    if (Array.isArray(first)) return first as string[];
    return [];
  }

  /** 查询 ComfyUI 可用的上采样模型列表 */
  async getUpscaleModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.getEffectiveUrl()}/object_info/UpscaleModelLoader`);
      if (!res.ok) return [];
      const data = (await res.json()) as Record<string, unknown>;
      const node = data.UpscaleModelLoader as { input?: { required?: { model_name?: unknown } } } | undefined;
      return ComfyUIAdapter.extractOptions(node?.input?.required?.model_name);
    } catch {
      return [];
    }
  }

  /** 查询 ComfyUI 可用的 scheduler 列表 */
  async getSchedulers(): Promise<string[]> {
    try {
      const res = await fetch(`${this.getEffectiveUrl()}/object_info/KSampler`);
      if (!res.ok) return [];
      const data = (await res.json()) as Record<string, unknown>;
      const node = data.KSampler as { input?: { required?: { scheduler?: unknown } } } | undefined;
      return ComfyUIAdapter.extractOptions(node?.input?.required?.scheduler);
    } catch {
      return [];
    }
  }

  /** 查询 ComfyUI 可用的 sampler 列表 */
  async getSamplers(): Promise<string[]> {
    try {
      const res = await fetch(`${this.getEffectiveUrl()}/object_info/KSampler`);
      if (!res.ok) return [];
      const data = (await res.json()) as Record<string, unknown>;
      const node = data.KSampler as { input?: { required?: { sampler_name?: unknown } } } | undefined;
      return ComfyUIAdapter.extractOptions(node?.input?.required?.sampler_name);
    } catch {
      return [];
    }
  }

  private buildBuiltinWorkflow(request: ImageGenerationRequest): Record<string, unknown> {
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

    const clipSkip = request.clipSkip ?? 1;
    if (clipSkip > 1) {
      const clipSkipId = String(nextId++);
      nodes[clipSkipId] = {
        class_type: "CLIPSetLastLayer",
        inputs: {
          clip: clipOutput,
          stop_at_clip_layer: -Math.abs(clipSkip)
        }
      };
      clipOutput = [clipSkipId, 0];
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

    const scheduler = request.scheduler || "exponential";

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
        scheduler,
        denoise: 1
      }
    };

    // --- Hires Fix ---
    const hires = request.hires;
    if (hires?.enabled && hires.upscaler) {
      // First pass decode
      const firstDecodeId = String(nextId++);
      nodes[firstDecodeId] = {
        class_type: "VAEDecode",
        inputs: {
          samples: [samplerId, 0],
          vae: vaeOutput
        }
      };

      // Load upscale model
      const upscaleModelLoaderId = String(nextId++);
      nodes[upscaleModelLoaderId] = {
        class_type: "UpscaleModelLoader",
        inputs: {
          model_name: hires.upscaler
        }
      };

      // Upscale with model (e.g. 4x-UltraSharp)
      const upscaleWithModelId = String(nextId++);
      nodes[upscaleWithModelId] = {
        class_type: "ImageUpscaleWithModel",
        inputs: {
          upscale_model: [upscaleModelLoaderId, 0],
          image: [firstDecodeId, 0]
        }
      };

      // Scale back to target resolution (upscale model outputs at its native multiplier)
      const targetWidth = Math.round(request.width * (hires.upscale ?? 1.5));
      const targetHeight = Math.round(request.height * (hires.upscale ?? 1.5));
      const imageScaleId = String(nextId++);
      nodes[imageScaleId] = {
        class_type: "ImageScale",
        inputs: {
          image: [upscaleWithModelId, 0],
          upscale_method: "lanczos",
          width: targetWidth,
          height: targetHeight,
          crop: "disabled"
        }
      };

      // Encode back to latent for second pass
      const vaeEncodeId = String(nextId++);
      nodes[vaeEncodeId] = {
        class_type: "VAEEncode",
        inputs: {
          pixels: [imageScaleId, 0],
          vae: vaeOutput
        }
      };

      // Second pass KSampler (low denoise for refinement)
      const hiresSamplerId = String(nextId++);
      nodes[hiresSamplerId] = {
        class_type: "KSampler",
        inputs: {
          model: modelOutput,
          positive: [positiveId, 0],
          negative: [negativeId, 0],
          latent_image: [vaeEncodeId, 0],
          seed: request.seed,
          steps: hires.steps ?? 10,
          cfg: hires.cfgScale ?? request.cfgScale ?? 7,
          sampler_name: request.sampler || "euler",
          scheduler,
          denoise: hires.denoise ?? 0.3
        }
      };

      // Final decode
      const finalDecodeId = String(nextId++);
      nodes[finalDecodeId] = {
        class_type: "VAEDecode",
        inputs: {
          samples: [hiresSamplerId, 0],
          vae: vaeOutput
        }
      };

      // Save
      const saveId = String(nextId++);
      nodes[saveId] = {
        class_type: "SaveImage",
        inputs: {
          images: [finalDecodeId, 0],
          filename_prefix: "storyforge_hires"
        }
      };

      return nodes;
    }

    // --- No Hires Fix: simple decode + save ---
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

  private applyWorkflowTemplate(
    template: WorkflowTemplate,
    request: ImageGenerationRequest
  ): Record<string, unknown> {
    if (Object.keys(template.template).length === 0) {
      throw new Error(`工作流模板 ${template.name} 为空，无法提交到 ComfyUI。`);
    }

    const workflow = JSON.parse(JSON.stringify(template.template)) as Record<string, unknown>;
    const setSlot = (slot: WorkflowSlot | undefined, value: unknown) => {
      if (!slot || value === undefined) {
        return;
      }

      const node = workflow[slot.nodeId];
      if (!node || typeof node !== "object") {
        throw new Error(`工作流模板缺少节点 ${slot.nodeId}，无法填入 ${slot.inputKey}。`);
      }

      const inputs = (node as { inputs?: Record<string, unknown> }).inputs;
      if (!inputs || typeof inputs !== "object") {
        throw new Error(`工作流模板节点 ${slot.nodeId} 没有 inputs，无法填入 ${slot.inputKey}。`);
      }

      inputs[slot.inputKey] = value;
    };

    setSlot(template.slots.checkpoint, request.checkpoint);
    setSlot(template.slots.positive, request.prompt);
    setSlot(template.slots.negative, request.negativePrompt || "");
    setSlot(template.slots.seed, request.seed);
    setSlot(template.slots.steps, request.steps);
    setSlot(template.slots.cfgScale, request.cfgScale);
    setSlot(template.slots.sampler, request.sampler);
    setSlot(template.slots.width, request.width);
    setSlot(template.slots.height, request.height);
    if (request.clipSkip && request.clipSkip > 1) {
      setSlot(template.slots.clipSkip, -Math.abs(request.clipSkip));
    }

    return workflow;
  }

  private async pollResult(
    promptId: string,
    seed: number,
    request: ImageGenerationRequest,
    workflow: Record<string, unknown>,
    workflowTemplateId: string,
    workflowTemplateVersion: string,
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
            workflowTemplateId,
            workflowTemplateVersion,
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
