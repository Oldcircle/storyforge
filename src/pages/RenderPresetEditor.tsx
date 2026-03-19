import { useEffect, useRef, useState } from "react";
import { Field } from "../components/common/Field";
import { Panel } from "../components/common/Panel";
import { ComfyUIAdapter } from "../adapters/image/comfyui";
import { useRenderPresetStore } from "../stores/render-preset";
import { useSettingsStore } from "../stores/settings";
import type { RenderPreset } from "../types/render-preset";
import { DEFAULT_PROMPT_WRITER_PROMPT } from "../data/defaults";
import { db } from "../db";
import { importRenderPreset } from "../utils/import-export";

type DraftPreset = {
  name: string;
  positivePrefix: string;
  positiveSuffix: string;
  negativePrompt: string;
  checkpoint: string;
  sampler: string;
  scheduler: string;
  steps: number;
  cfgScale: number;
  clipSkip: number;
  width: number;
  height: number;
  hiresEnabled: boolean;
  hiresSteps: number;
  hiresUpscale: number;
  hiresDenoise: number;
  hiresUpscaler: string;
  hiresCfgScale: number;
  promptWriterPrompt: string;
};

function toDraft(preset: RenderPreset): DraftPreset {
  return {
    name: preset.name,
    positivePrefix: preset.positivePrefix.join(", "),
    positiveSuffix: preset.positiveSuffix.join(", "),
    negativePrompt: preset.negativePrompt.join(", "),
    checkpoint: preset.defaults.checkpoint || "",
    sampler: preset.defaults.sampler || "euler",
    scheduler: preset.defaults.scheduler || "exponential",
    steps: preset.defaults.steps,
    cfgScale: preset.defaults.cfgScale,
    clipSkip: preset.defaults.clipSkip ?? 2,
    width: preset.defaults.width,
    height: preset.defaults.height,
    hiresEnabled: preset.hires?.enabled ?? false,
    hiresSteps: preset.hires?.steps ?? 40,
    hiresUpscale: preset.hires?.upscale ?? 1.5,
    hiresDenoise: preset.hires?.denoise ?? 0.4,
    hiresUpscaler: preset.hires?.upscaler ?? "",
    hiresCfgScale: preset.hires?.cfgScale ?? preset.defaults.cfgScale,
    promptWriterPrompt: preset.promptWriterPrompt ?? DEFAULT_PROMPT_WRITER_PROMPT
  };
}

function splitTokens(value: string): string[] {
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export function RenderPresetEditorPage() {
  const presets = useRenderPresetStore((s) => s.renderPresets);
  const selected = useRenderPresetStore((s) => s.selected);
  const createPreset = useRenderPresetStore((s) => s.create);
  const selectPreset = useRenderPresetStore((s) => s.select);
  const updatePreset = useRenderPresetStore((s) => s.update);
  const removePreset = useRenderPresetStore((s) => s.remove);
  const loadAll = useRenderPresetStore((s) => s.loadAll);
  const [draft, setDraft] = useState<DraftPreset | null>(null);
  const [checkpoints, setCheckpoints] = useState<string[]>([]);
  const [schedulers, setSchedulers] = useState<string[]>([]);
  const [samplers, setSamplers] = useState<string[]>([]);
  const [upscaleModels, setUpscaleModels] = useState<string[]>([]);
  const comfyuiUrl = useSettingsStore((s) => s.settings.comfyuiUrl);
  const importFileRef = useRef<HTMLInputElement>(null);

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const preset = importRenderPreset(text);
      await db.renderPresets.put(preset);
      await loadAll();
      await selectPreset(preset.id);
    } catch (error) {
      console.error("渲染预设导入失败:", error);
      window.alert(`导入失败：${error instanceof Error ? error.message : String(error)}`);
    }
    if (importFileRef.current) importFileRef.current.value = "";
  };

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    setDraft(selected ? toDraft(selected) : null);
  }, [selected]);

  useEffect(() => {
    const adapter = new ComfyUIAdapter(comfyuiUrl);
    void adapter.getCheckpoints().then(setCheckpoints);
    void adapter.getSchedulers().then(setSchedulers);
    void adapter.getSamplers().then(setSamplers);
    void adapter.getUpscaleModels().then(setUpscaleModels);
  }, [comfyuiUrl]);

  const handleSave = async () => {
    if (!selected || !draft) return;
    await updatePreset(selected.id, {
      name: draft.name,
      positivePrefix: splitTokens(draft.positivePrefix),
      positiveSuffix: splitTokens(draft.positiveSuffix),
      negativePrompt: splitTokens(draft.negativePrompt),
      defaults: {
        checkpoint: draft.checkpoint,
        sampler: draft.sampler,
        scheduler: draft.scheduler,
        steps: draft.steps,
        cfgScale: draft.cfgScale,
        clipSkip: draft.clipSkip,
        width: draft.width,
        height: draft.height
      },
      hires: {
        enabled: draft.hiresEnabled,
        steps: draft.hiresSteps,
        upscale: draft.hiresUpscale,
        denoise: draft.hiresDenoise,
        upscaler: draft.hiresUpscaler,
        cfgScale: draft.hiresCfgScale
      },
      promptWriterPrompt: draft.promptWriterPrompt.trim() || undefined
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Panel
        title="渲染预设"
        subtitle="控制「怎么炼图」：质量词包、负面词、默认参数。与导演预设（怎么拍故事）分离。"
        actions={
          <div className="flex gap-2">
            <button
              className="rounded-xl border border-stroke bg-bg-tertiary px-4 py-2.5 text-sm text-text-secondary transition hover:border-stroke hover:bg-bg-tertiary hover:text-text-primary "
              onClick={() => importFileRef.current?.click()}
            >
              导入 JSON
            </button>
            <input
              ref={importFileRef}
              accept=".json"
              className="hidden"
              type="file"
              onChange={(e) => void handleImportJSON(e)}
            />
            <button
              className="rounded-xl bg-accent-blue px-4 py-2.5 text-sm font-medium text-white  transition hover:bg-accent-blue/90 disabled:opacity-50 disabled:shadow-none"
              onClick={() => void createPreset().then(selectPreset)}
            >
              新建渲染预设
            </button>
          </div>
        }
      >
        <div className="space-y-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                selected?.id === preset.id
                  ? "border-accent-blue/50 bg-accent-blue/10"
                  : "border-stroke bg-bg-primary hover:border-stroke-strong"
              }`}
              onClick={() => void selectPreset(preset.id)}
            >
              <div className="text-sm font-semibold text-text-primary">{preset.name}</div>
              <div className="mt-1 text-xs text-text-muted">
                {preset.defaults.checkpoint || "未设置 checkpoint"}
              </div>
            </button>
          ))}
          {presets.length === 0 && (
            <div className="rounded-2xl border border-dashed border-stroke bg-bg-primary p-6 text-sm text-text-muted">
              还没有渲染预设。创建一个来定义质量词和炼图默认参数。
            </div>
          )}
        </div>
      </Panel>

      <Panel
        title="渲染参数"
        subtitle="质量词会自动包裹在生图 prompt 前后，负面词自动追加。"
        actions={
          selected ? (
            <div className="flex gap-2">
              <button
                className="rounded-xl border border-stroke bg-bg-tertiary px-4 py-2.5 text-sm text-text-secondary transition hover:border-stroke hover:bg-bg-tertiary hover:text-text-primary "
                onClick={() => void removePreset(selected.id)}
              >
                删除
              </button>
              <button
                className="rounded-xl bg-accent-mint px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-accent-mint/20 transition hover:bg-accent-mint/90"
                onClick={() => void handleSave()}
              >
                保存
              </button>
            </div>
          ) : null
        }
      >
        {!draft ? (
          <div className="rounded-2xl border border-dashed border-stroke bg-bg-primary p-8 text-sm text-text-muted">
            选择左侧渲染预设后开始编辑。
          </div>
        ) : (
          <div className="space-y-5">
            <Field label="名称">
              <input
                className="w-full rounded-xl border border-stroke bg-bg-tertiary px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>

            <div className="rounded-xl border border-stroke bg-bg-primary p-4 space-y-4">
              <h3 className="text-sm font-semibold text-text-primary">Prompt 词包</h3>
              <Field label="质量前缀" hint="逗号分隔，自动加在正面 prompt 开头">
                <textarea
                  className="min-h-16 w-full rounded-xl border border-stroke bg-bg-tertiary px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                  placeholder="masterpiece, best quality, very aesthetic"
                  value={draft.positivePrefix}
                  onChange={(e) => setDraft({ ...draft, positivePrefix: e.target.value })}
                />
              </Field>
              <Field label="质量后缀" hint="逗号分隔，自动加在正面 prompt 末尾">
                <textarea
                  className="min-h-16 w-full rounded-xl border border-stroke bg-bg-tertiary px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                  placeholder="detailed background, depth of field"
                  value={draft.positiveSuffix}
                  onChange={(e) => setDraft({ ...draft, positiveSuffix: e.target.value })}
                />
              </Field>
              <Field label="负面词" hint="逗号分隔，自动追加到负面 prompt">
                <textarea
                  className="min-h-16 w-full rounded-xl border border-stroke bg-bg-tertiary px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                  placeholder="lowres, bad anatomy, bad hands, text, watermark"
                  value={draft.negativePrompt}
                  onChange={(e) => setDraft({ ...draft, negativePrompt: e.target.value })}
                />
              </Field>
            </div>

            <div className="rounded-xl border border-stroke bg-bg-primary p-4 space-y-4">
              <h3 className="text-sm font-semibold text-text-primary">生成参数</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Checkpoint" hint="从 ComfyUI 获取可用模型">
                  {checkpoints.length > 0 ? (
                    <select
                      className="w-full rounded-xl border border-stroke bg-bg-tertiary px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                      value={draft.checkpoint}
                      onChange={(e) => setDraft({ ...draft, checkpoint: e.target.value })}
                    >
                      <option value="">（未选择）</option>
                      {checkpoints.map((ckpt) => (
                        <option key={ckpt} value={ckpt}>{ckpt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="w-full rounded-xl border border-stroke bg-bg-tertiary px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                      value={draft.checkpoint}
                      placeholder="无法连接 ComfyUI，手动输入"
                      onChange={(e) => setDraft({ ...draft, checkpoint: e.target.value })}
                    />
                  )}
                </Field>
                <Field label="Sampler">
                  {samplers.length > 0 ? (
                    <select
                      className="w-full rounded-xl border border-stroke bg-bg-tertiary px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                      value={draft.sampler}
                      onChange={(e) => setDraft({ ...draft, sampler: e.target.value })}
                    >
                      {samplers.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="w-full rounded-xl border border-stroke bg-bg-tertiary px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                      value={draft.sampler}
                      placeholder="无法连接 ComfyUI，手动输入"
                      onChange={(e) => setDraft({ ...draft, sampler: e.target.value })}
                    />
                  )}
                </Field>
                <Field label="Scheduler">
                  {schedulers.length > 0 ? (
                    <select
                      className="w-full rounded-xl border border-stroke bg-bg-tertiary px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                      value={draft.scheduler}
                      onChange={(e) => setDraft({ ...draft, scheduler: e.target.value })}
                    >
                      {schedulers.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="w-full rounded-xl border border-stroke bg-bg-tertiary px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                      value={draft.scheduler}
                      placeholder="exponential"
                      onChange={(e) => setDraft({ ...draft, scheduler: e.target.value })}
                    />
                  )}
                </Field>
                <Field label="Steps">
                  <input
                    className="w-full rounded-xl border border-stroke bg-bg-tertiary px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                    type="number"
                    value={draft.steps}
                    onChange={(e) => setDraft({ ...draft, steps: Number(e.target.value) || 0 })}
                  />
                </Field>
                <Field label="CFG Scale">
                  <input
                    className="w-full rounded-xl border border-stroke bg-bg-tertiary px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                    type="number"
                    step="0.1"
                    value={draft.cfgScale}
                    onChange={(e) => setDraft({ ...draft, cfgScale: Number(e.target.value) || 0 })}
                  />
                </Field>
                <Field label="CLIP Skip">
                  <input
                    className="w-full rounded-xl border border-stroke bg-bg-tertiary px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                    type="number"
                    value={draft.clipSkip}
                    onChange={(e) => setDraft({ ...draft, clipSkip: Number(e.target.value) || 0 })}
                  />
                </Field>
                <div>{/* spacer */}</div>
                <Field label="宽度">
                  <input
                    className="w-full rounded-xl border border-stroke bg-bg-tertiary px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                    type="number"
                    value={draft.width}
                    onChange={(e) => setDraft({ ...draft, width: Number(e.target.value) || 0 })}
                  />
                </Field>
                <Field label="高度">
                  <input
                    className="w-full rounded-xl border border-stroke bg-bg-tertiary px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                    type="number"
                    value={draft.height}
                    onChange={(e) => setDraft({ ...draft, height: Number(e.target.value) || 0 })}
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-xl border border-stroke bg-bg-primary p-4 space-y-4">
              <label className="flex items-center gap-3 text-sm font-semibold text-text-primary cursor-pointer select-none">
                <input
                  checked={draft.hiresEnabled}
                  className="h-4 w-4 rounded border-stroke accent-accent-blue"
                  type="checkbox"
                  onChange={(e) => setDraft({ ...draft, hiresEnabled: e.target.checked })}
                />
                Hi-Res Fix
              </label>
              {draft.hiresEnabled && (
                <div className="space-y-4 pt-2">
                  <Field label="Upscaler 模型" hint="从 ComfyUI 获取可用上采样模型（如 4x-UltraSharp）">
                    {upscaleModels.length > 0 ? (
                      <select
                        className="w-full rounded-xl border border-stroke bg-bg-tertiary px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                        value={draft.hiresUpscaler}
                        onChange={(e) => setDraft({ ...draft, hiresUpscaler: e.target.value })}
                      >
                        <option value="">（未选择 — Hires Fix 不会生效）</option>
                        {upscaleModels.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="w-full rounded-xl border border-stroke bg-bg-tertiary px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                        value={draft.hiresUpscaler}
                        placeholder="无法连接 ComfyUI，手动输入（如 4x-UltraSharp.pth）"
                        onChange={(e) => setDraft({ ...draft, hiresUpscaler: e.target.value })}
                      />
                    )}
                  </Field>
                  <div className="grid gap-4 md:grid-cols-4">
                    <Field label="Steps">
                      <input
                        className="w-full rounded-xl border border-stroke bg-bg-tertiary px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                        type="number"
                        value={draft.hiresSteps}
                        onChange={(e) => setDraft({ ...draft, hiresSteps: Number(e.target.value) || 0 })}
                      />
                    </Field>
                    <Field label="Upscale 倍数">
                      <input
                        className="w-full rounded-xl border border-stroke bg-bg-tertiary px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                        type="number"
                        step="0.1"
                        value={draft.hiresUpscale}
                        onChange={(e) => setDraft({ ...draft, hiresUpscale: Number(e.target.value) || 0 })}
                      />
                    </Field>
                    <Field label="Denoise">
                      <input
                        className="w-full rounded-xl border border-stroke bg-bg-tertiary px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                        type="number"
                        step="0.05"
                        value={draft.hiresDenoise}
                        onChange={(e) => setDraft({ ...draft, hiresDenoise: Number(e.target.value) || 0 })}
                      />
                    </Field>
                    <Field label="CFG Scale">
                      <input
                        className="w-full rounded-xl border border-stroke bg-bg-tertiary px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                        type="number"
                        step="0.1"
                        value={draft.hiresCfgScale}
                        onChange={(e) => setDraft({ ...draft, hiresCfgScale: Number(e.target.value) || 0 })}
                      />
                    </Field>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-stroke bg-bg-primary p-4 space-y-4">
              <h3 className="text-sm font-semibold text-text-primary">LLM Prompt Writer 系统提示</h3>
              <p className="text-xs text-text-muted">
                当 Prompt 模式为「LLM 写手」时，此提示控制 LLM 如何将角色/场景素材写成聚焦的 SD prompt。
                留空则使用内置默认提示。不同画风需要不同的写法策略。
              </p>
              <Field label="系统提示" hint="英文。控制 LLM 输出的 prompt 风格、长度、角色描述策略">
                <textarea
                  className="min-h-64 w-full rounded-xl border border-stroke bg-bg-tertiary px-4 py-2.5 hover:border-stroke-strong font-mono text-xs text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                  placeholder={DEFAULT_PROMPT_WRITER_PROMPT}
                  value={draft.promptWriterPrompt}
                  onChange={(e) => setDraft({ ...draft, promptWriterPrompt: e.target.value })}
                />
              </Field>
              <button
                className="rounded-full border border-stroke px-3 py-1.5 text-xs text-text-secondary transition hover:text-text-primary"
                onClick={() => setDraft({ ...draft, promptWriterPrompt: DEFAULT_PROMPT_WRITER_PROMPT })}
              >
                恢复默认
              </button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
