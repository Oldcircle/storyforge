export type AdapterType = "llm" | "image";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface AdapterSettingField {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "password";
  required?: boolean;
  placeholder?: string;
}

export interface BaseAdapter {
  readonly id: string;
  readonly name: string;
  readonly type: AdapterType;
  readonly version: string;
  readonly description: string;
  initialize?(config: Record<string, unknown>): Promise<void>;
  destroy?(): Promise<void>;
  healthCheck(): Promise<boolean>;
  getSettingsSchema?(): AdapterSettingField[];
  getSettings?(): Record<string, unknown>;
  setSettings?(settings: Record<string, unknown>): void;
}

export interface LLMAdapter extends BaseAdapter {
  type: "llm";
  capabilities: {
    supportsStreaming: boolean;
    supportsJsonMode: boolean;
    maxContextTokens: number;
    maxOutputTokens: number;
    supportsVision: boolean;
  };
  chat(messages: ChatMessage[], options?: LLMOptions): Promise<string>;
}

export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  referenceImages?: string[];
  loras?: { name: string; weight: number; triggerWord?: string }[];
  seed?: number;
  width: number;
  height: number;
  steps?: number;
  cfgScale?: number;
  sampler?: string;
  checkpoint?: string;
}

export interface ImageGenerationResult {
  images: string[];
  seed?: number;
  metadata?: Record<string, unknown>;
}

export interface ImageAdapter extends BaseAdapter {
  type: "image";
  capabilities: {
    supportsBatch: boolean;
    supportsControlNet: boolean;
    supportsIPAdapter: boolean;
    supportsLoRA: boolean;
    supportsImg2Img: boolean;
    supportsInpainting: boolean;
    maxResolution: [number, number];
    supportedAspectRatios: string[];
  };
  generate(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
}
