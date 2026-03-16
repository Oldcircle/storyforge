// 内置 LLM Provider 和 Model 定义（数据驱动）
// 所有 provider 都走 OpenAI 兼容的 /chat/completions 端点

export interface LLMModel {
  id: string;
  name: string;
  contextWindow?: number;
  supportsJsonMode?: boolean;
}

export interface LLMProvider {
  id: string;
  name: string;
  defaultApiUrl: string;
  requiresApiKey: boolean;
  models: LLMModel[];
  description?: string;
}

export const LLM_PROVIDERS: LLMProvider[] = [
  {
    id: "deepseek",
    name: "DeepSeek",
    defaultApiUrl: "https://api.deepseek.com/v1",
    requiresApiKey: true,
    description: "性价比高，中文能力强",
    models: [
      { id: "deepseek-chat", name: "DeepSeek V3", contextWindow: 64000, supportsJsonMode: true },
      { id: "deepseek-reasoner", name: "DeepSeek R1", contextWindow: 64000, supportsJsonMode: false },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    defaultApiUrl: "https://api.openai.com/v1",
    requiresApiKey: true,
    models: [
      { id: "gpt-4.1", name: "GPT-4.1", contextWindow: 1000000, supportsJsonMode: true },
      { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", contextWindow: 1000000, supportsJsonMode: true },
      { id: "gpt-4.1-nano", name: "GPT-4.1 Nano", contextWindow: 1000000, supportsJsonMode: true },
      { id: "gpt-4o", name: "GPT-4o", contextWindow: 128000, supportsJsonMode: true },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", contextWindow: 128000, supportsJsonMode: true },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    defaultApiUrl: "https://openrouter.ai/api/v1",
    requiresApiKey: true,
    description: "聚合多家模型，支持 Claude / Gemini / Llama 等",
    models: [
      { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", contextWindow: 200000, supportsJsonMode: true },
      { id: "anthropic/claude-haiku-4", name: "Claude Haiku 4", contextWindow: 200000, supportsJsonMode: true },
      { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", contextWindow: 1000000, supportsJsonMode: true },
      { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", contextWindow: 1000000, supportsJsonMode: true },
      { id: "meta-llama/llama-4-maverick", name: "Llama 4 Maverick", contextWindow: 1000000, supportsJsonMode: true },
      { id: "deepseek/deepseek-chat-v3-0324", name: "DeepSeek V3 0324", contextWindow: 64000, supportsJsonMode: true },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    defaultApiUrl: "https://api.groq.com/openai/v1",
    requiresApiKey: true,
    description: "极速推理",
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", contextWindow: 128000, supportsJsonMode: true },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", contextWindow: 128000, supportsJsonMode: true },
      { id: "gemma2-9b-it", name: "Gemma 2 9B", contextWindow: 8192, supportsJsonMode: true },
    ],
  },
  {
    id: "siliconflow",
    name: "硅基流动",
    defaultApiUrl: "https://api.siliconflow.cn/v1",
    requiresApiKey: true,
    models: [
      { id: "Qwen/Qwen2.5-72B-Instruct", name: "Qwen 2.5 72B", contextWindow: 32000, supportsJsonMode: true },
      { id: "Qwen/Qwen2.5-32B-Instruct", name: "Qwen 2.5 32B", contextWindow: 32000, supportsJsonMode: true },
      { id: "deepseek-ai/DeepSeek-V3", name: "DeepSeek V3", contextWindow: 64000, supportsJsonMode: true },
    ],
  },
  {
    id: "ollama",
    name: "Ollama (本地)",
    defaultApiUrl: "http://localhost:11434/v1",
    requiresApiKey: false,
    description: "本地模型，无需 API Key",
    models: [
      { id: "qwen2.5:32b", name: "Qwen 2.5 32B" },
      { id: "qwen2.5:14b", name: "Qwen 2.5 14B" },
      { id: "llama3.1:8b", name: "Llama 3.1 8B" },
      { id: "gemma2:9b", name: "Gemma 2 9B" },
    ],
  },
  {
    id: "custom",
    name: "自定义 (OpenAI 兼容)",
    defaultApiUrl: "",
    requiresApiKey: false,
    description: "任何 OpenAI 兼容 API 端点",
    models: [],
  },
];

export function getProvider(id: string): LLMProvider | undefined {
  return LLM_PROVIDERS.find((p) => p.id === id);
}

export function getModel(providerId: string, modelId: string): LLMModel | undefined {
  const provider = getProvider(providerId);
  return provider?.models.find((m) => m.id === modelId);
}
