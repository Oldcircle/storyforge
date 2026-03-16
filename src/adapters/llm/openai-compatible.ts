import type { ChatMessage, LLMAdapter, LLMOptions } from "../../types/adapter";

interface OpenAICompatibleConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
}

interface OpenAICompatibleResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
}

type OpenAICompatibleContent = string | Array<{ type?: string; text?: string }> | undefined;

function normalizeContent(content: OpenAICompatibleContent): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("\n")
      .trim();
  }

  return "";
}

export class OpenAICompatibleAdapter implements LLMAdapter {
  readonly id = "openai-compatible";
  readonly name = "OpenAI Compatible";
  readonly type = "llm" as const;
  readonly version = "0.1.0";
  readonly description = "OpenAI API 兼容的 LLM 适配器";

  capabilities = {
    supportsStreaming: true,
    supportsJsonMode: true,
    maxContextTokens: 128000,
    maxOutputTokens: 16384,
    supportsVision: false
  };

  constructor(private readonly config: OpenAICompatibleConfig) {}

  async chat(messages: ChatMessage[], options?: LLMOptions): Promise<string> {
    const apiUrl = this.config.apiUrl.replace(/\/$/, "");
    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map((message) => ({
          role: message.role,
          content: message.content
        })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096,
        response_format: options?.jsonMode ? { type: "json_object" } : undefined
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as OpenAICompatibleResponse;
    const content = normalizeContent(data.choices?.[0]?.message?.content);
    if (!content) {
      throw new Error("LLM API 返回了空响应");
    }
    return content;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.chat([{ role: "user", content: "ping" }], {
        maxTokens: 5
      });
      return true;
    } catch {
      return false;
    }
  }
}
