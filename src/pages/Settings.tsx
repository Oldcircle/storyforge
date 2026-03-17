import { useCallback, useEffect, useState } from "react";
import { Field } from "../components/common/Field";
import { Panel } from "../components/common/Panel";
import { getProvider, LLM_PROVIDERS } from "../data/providers";
import { resolveComfyUIRequestBaseUrl } from "../adapters/image/comfyui";
import { OpenAICompatibleAdapter } from "../adapters/llm/openai-compatible";
import { useSettingsStore } from "../stores/settings";
import type { GlobalSettings } from "../types/settings";

type ConnectionStatus = "idle" | "testing" | "success" | "error";

export function SettingsPage() {
  const settings = useSettingsStore((state) => state.settings);
  const setSettings = useSettingsStore((state) => state.setSettings);
  const [draft, setDraft] = useState<GlobalSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [llmStatus, setLlmStatus] = useState<ConnectionStatus>("idle");
  const [llmError, setLlmError] = useState("");
  const [comfyStatus, setComfyStatus] = useState<ConnectionStatus>("idle");
  const [comfyError, setComfyError] = useState("");

  const provider = getProvider(draft.llmProviderId);
  const isCustom = draft.llmProviderId === "custom";

  const patch = useCallback(
    (partial: Partial<GlobalSettings>) => setDraft((prev) => ({ ...prev, ...partial })),
    [],
  );

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const handleProviderChange = (providerId: string) => {
    const p = getProvider(providerId);
    const firstModel = p?.models[0]?.id ?? "";
    patch({
      llmProviderId: providerId,
      llmApiUrl: p?.defaultApiUrl ?? "",
      llmModel: firstModel,
      llmCustomModelId: "",
    });
    setLlmStatus("idle");
  };

  const handleModelChange = (modelId: string) => {
    patch({ llmModel: modelId });
  };

  const handleSave = () => {
    setSettings(draft);
    setSaved(true);
    setLlmStatus("idle");
    setComfyStatus("idle");
    window.setTimeout(() => setSaved(false), 1500);
  };

  const testLLM = async () => {
    setLlmStatus("testing");
    setLlmError("");
    try {
      const model = isCustom
        ? draft.llmCustomModelId || "test"
        : draft.llmModel;
      const adapter = new OpenAICompatibleAdapter({
        apiUrl: draft.llmApiUrl,
        apiKey: draft.llmApiKey,
        model,
      });
      const ok = await adapter.healthCheck();
      setLlmStatus(ok ? "success" : "error");
      if (!ok) setLlmError("API 返回了空响应");
    } catch (err) {
      setLlmStatus("error");
      setLlmError(err instanceof Error ? err.message : String(err));
    }
  };

  const testComfyUI = async () => {
    setComfyStatus("testing");
    setComfyError("");
    try {
      const url = resolveComfyUIRequestBaseUrl(draft.comfyuiUrl);
      const res = await fetch(`${url}/system_stats`);
      setComfyStatus(res.ok ? "success" : "error");
      if (!res.ok) setComfyError(`HTTP ${res.status} ${res.statusText}`.trim());
    } catch (err) {
      setComfyStatus("error");
      setComfyError(err instanceof Error ? err.message : String(err));
    }
  };

  const selectedModel = provider?.models.find((m) => m.id === draft.llmModel);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* LLM 设置 */}
      <Panel
        title="LLM 连接"
        subtitle="配置用于导演引擎的大语言模型 API。所有 Provider 均走 OpenAI 兼容协议。"
        actions={
          <button
            className="rounded-full bg-accent-blue px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
            onClick={handleSave}
          >
            {saved ? "已保存 ✓" : "保存设置"}
          </button>
        }
      >
        <div className="space-y-4">
          {/* Provider 选择 */}
          <Field label="Provider">
            <select
              className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
              value={draft.llmProviderId}
              onChange={(e) => handleProviderChange(e.target.value)}
            >
              {LLM_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {provider?.description && (
              <p className="mt-1 text-xs text-text-muted">{provider.description}</p>
            )}
          </Field>

          {/* Model 选择（非自定义 provider 时显示下拉）*/}
          {!isCustom && provider && provider.models.length > 0 && (
            <Field label="Model">
              <select
                className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                value={draft.llmModel}
                onChange={(e) => handleModelChange(e.target.value)}
              >
                {provider.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.id})
                  </option>
                ))}
              </select>
              {selectedModel && (
                <p className="mt-1 text-xs text-text-muted">
                  {selectedModel.contextWindow
                    ? `Context: ${(selectedModel.contextWindow / 1000).toFixed(0)}K`
                    : ""}
                  {selectedModel.supportsJsonMode ? " · JSON Mode ✓" : ""}
                </p>
              )}
            </Field>
          )}

          {/* 自定义 Model ID */}
          {isCustom && (
            <Field label="Model ID" hint="发送给 API 的模型标识符">
              <input
                className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                placeholder="例如: gpt-4o, claude-3-opus, qwen2.5:32b"
                value={draft.llmCustomModelId}
                onChange={(e) => patch({ llmCustomModelId: e.target.value })}
              />
            </Field>
          )}

          {/* API URL */}
          <Field label="API URL" hint="切换 Provider 时自动填充，也可手动修改（如用代理）">
            <input
              className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
              placeholder="https://api.example.com/v1"
              value={draft.llmApiUrl}
              onChange={(e) => patch({ llmApiUrl: e.target.value })}
            />
          </Field>

          {/* API Key（需要时才显示）*/}
          {(provider?.requiresApiKey ?? true) && (
            <Field label="API Key" hint="保存在浏览器 localStorage，不会发送到任何第三方">
              <input
                className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                type="password"
                placeholder={provider?.requiresApiKey ? "sk-..." : "可选"}
                value={draft.llmApiKey}
                onChange={(e) => patch({ llmApiKey: e.target.value })}
              />
            </Field>
          )}

          {/* 测试连接 */}
          <div className="flex items-center gap-3">
            <button
              className="rounded-full border border-stroke px-4 py-2 text-sm text-text-secondary transition hover:border-accent-blue hover:text-accent-blue disabled:opacity-50"
              onClick={() => void testLLM()}
              disabled={llmStatus === "testing" || !draft.llmApiUrl.trim()}
            >
              {llmStatus === "testing" ? "测试中..." : "测试连接"}
            </button>
            {llmStatus === "success" && (
              <span className="text-sm text-accent-green">连接成功 ✓</span>
            )}
            {llmStatus === "error" && (
              <span className="text-sm text-accent-red" title={llmError}>
                连接失败 — {llmError.length > 80 ? llmError.slice(0, 80) + "..." : llmError}
              </span>
            )}
          </div>
        </div>
      </Panel>

      {/* ComfyUI 设置 */}
      <Panel
        title="ComfyUI 连接"
        subtitle="本地生图后端，Phase 3 接入。"
      >
        <div className="space-y-4">
          <Field label="ComfyUI URL">
            <input
              className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
              placeholder="http://127.0.0.1:8188"
              value={draft.comfyuiUrl}
              onChange={(e) => patch({ comfyuiUrl: e.target.value })}
            />
          </Field>
          <div className="flex items-center gap-3">
            <button
              className="rounded-full border border-stroke px-4 py-2 text-sm text-text-secondary transition hover:border-accent-blue hover:text-accent-blue disabled:opacity-50"
              onClick={() => void testComfyUI()}
              disabled={comfyStatus === "testing" || !draft.comfyuiUrl.trim()}
            >
              {comfyStatus === "testing" ? "测试中..." : "测试连接"}
            </button>
            {comfyStatus === "success" && (
              <span className="text-sm text-accent-green">连接成功 ✓</span>
            )}
            {comfyStatus === "error" && (
              <span className="text-sm text-accent-red" title={comfyError}>
                连接失败 — {comfyError.length > 80 ? comfyError.slice(0, 80) + "..." : comfyError}
              </span>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
