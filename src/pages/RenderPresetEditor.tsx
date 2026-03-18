import { useEffect, useState } from "react";
import { Field } from "../components/common/Field";
import { Panel } from "../components/common/Panel";
import { ComfyUIAdapter } from "../adapters/image/comfyui";
import { useRenderPresetStore } from "../stores/render-preset";
import { useSettingsStore } from "../stores/settings";
import type { RenderPreset } from "../types/render-preset";

type DraftPreset = {
  name: string;
  positivePrefix: string;
  positiveSuffix: string;
  negativePrompt: string;
  checkpoint: string;
  sampler: string;
  steps: number;
  cfgScale: number;
  clipSkip: number;
  width: number;
  height: number;
  hiresEnabled: boolean;
  hiresSteps: number;
  hiresUpscale: number;
  hiresDenoise: number;
};

function toDraft(preset: RenderPreset): DraftPreset {
  return {
    name: preset.name,
    positivePrefix: preset.positivePrefix.join(", "),
    positiveSuffix: preset.positiveSuffix.join(", "),
    negativePrompt: preset.negativePrompt.join(", "),
    checkpoint: preset.defaults.checkpoint || "",
    sampler: preset.defaults.sampler || "euler",
    steps: preset.defaults.steps,
    cfgScale: preset.defaults.cfgScale,
    clipSkip: preset.defaults.clipSkip ?? 2,
    width: preset.defaults.width,
    height: preset.defaults.height,
    hiresEnabled: preset.hires?.enabled ?? false,
    hiresSteps: preset.hires?.steps ?? 40,
    hiresUpscale: preset.hires?.upscale ?? 1.5,
    hiresDenoise: preset.hires?.denoise ?? 0.4
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
  const comfyuiUrl = useSettingsStore((s) => s.settings.comfyuiUrl);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    setDraft(selected ? toDraft(selected) : null);
  }, [selected]);

  useEffect(() => {
    const adapter = new ComfyUIAdapter(comfyuiUrl);
    void adapter.getCheckpoints().then(setCheckpoints);
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
        denoise: draft.hiresDenoise
      }
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Panel
        title="渲染预设"
        subtitle="控制「怎么炼图」：质量词包、负面词、默认参数。与导演预设（怎么拍故事）分离。"
        actions={
          <button
            className="rounded-full bg-accent-blue px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
            onClick={() => void createPreset().then(selectPreset)}
          >
            新建渲染预设
          </button>
        }
      >
        <div className="space-y-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                selected?.id === preset.id
                  ? "border-accent-blue/50 bg-accent-blue/10"
                  : "border-stroke bg-bg-primary/60 hover:border-stroke-strong"
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
            <div className="rounded-2xl border border-dashed border-stroke p-4 text-sm text-text-muted">
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
                className="rounded-full border border-stroke px-4 py-2 text-sm text-text-secondary transition hover:text-text-primary"
                onClick={() => void removePreset(selected.id)}
              >
                删除
              </button>
              <button
                className="rounded-full bg-accent-mint px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
                onClick={() => void handleSave()}
              >
                保存
              </button>
            </div>
          ) : null
        }
      >
        {!draft ? (
          <div className="rounded-2xl border border-dashed border-stroke p-6 text-sm text-text-muted">
            选择左侧渲染预设后开始编辑。
          </div>
        ) : (
          <div className="space-y-5">
            <Field label="名称">
              <input
                className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>

            <div className="rounded-3xl border border-stroke bg-bg-primary/40 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-text-primary">Prompt 词包</h3>
              <Field label="质量前缀" hint="逗号分隔，自动加在正面 prompt 开头">
                <textarea
                  className="min-h-16 w-full rounded-2xl border border-stroke bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                  placeholder="masterpiece, best quality, very aesthetic"
                  value={draft.positivePrefix}
                  onChange={(e) => setDraft({ ...draft, positivePrefix: e.target.value })}
                />
              </Field>
              <Field label="质量后缀" hint="逗号分隔，自动加在正面 prompt 末尾">
                <textarea
                  className="min-h-16 w-full rounded-2xl border border-stroke bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                  placeholder="detailed background, depth of field"
                  value={draft.positiveSuffix}
                  onChange={(e) => setDraft({ ...draft, positiveSuffix: e.target.value })}
                />
              </Field>
              <Field label="负面词" hint="逗号分隔，自动追加到负面 prompt">
                <textarea
                  className="min-h-16 w-full rounded-2xl border border-stroke bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                  placeholder="lowres, bad anatomy, bad hands, text, watermark"
                  value={draft.negativePrompt}
                  onChange={(e) => setDraft({ ...draft, negativePrompt: e.target.value })}
                />
              </Field>
            </div>

            <div className="rounded-3xl border border-stroke bg-bg-primary/40 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-text-primary">生成参数</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Checkpoint" hint="从 ComfyUI 获取可用模型">
                  {checkpoints.length > 0 ? (
                    <select
                      className="w-full rounded-2xl border border-stroke bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
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
                      className="w-full rounded-2xl border border-stroke bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                      value={draft.checkpoint}
                      placeholder="无法连接 ComfyUI，手动输入"
                      onChange={(e) => setDraft({ ...draft, checkpoint: e.target.value })}
                    />
                  )}
                </Field>
                <Field label="Sampler">
                  <input
                    className="w-full rounded-2xl border border-stroke bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                    value={draft.sampler}
                    onChange={(e) => setDraft({ ...draft, sampler: e.target.value })}
                  />
                </Field>
                <Field label="Steps">
                  <input
                    className="w-full rounded-2xl border border-stroke bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                    type="number"
                    value={draft.steps}
                    onChange={(e) => setDraft({ ...draft, steps: Number(e.target.value) || 0 })}
                  />
                </Field>
                <Field label="CFG Scale">
                  <input
                    className="w-full rounded-2xl border border-stroke bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                    type="number"
                    step="0.1"
                    value={draft.cfgScale}
                    onChange={(e) => setDraft({ ...draft, cfgScale: Number(e.target.value) || 0 })}
                  />
                </Field>
                <Field label="CLIP Skip">
                  <input
                    className="w-full rounded-2xl border border-stroke bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                    type="number"
                    value={draft.clipSkip}
                    onChange={(e) => setDraft({ ...draft, clipSkip: Number(e.target.value) || 0 })}
                  />
                </Field>
                <div>{/* spacer */}</div>
                <Field label="宽度">
                  <input
                    className="w-full rounded-2xl border border-stroke bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                    type="number"
                    value={draft.width}
                    onChange={(e) => setDraft({ ...draft, width: Number(e.target.value) || 0 })}
                  />
                </Field>
                <Field label="高度">
                  <input
                    className="w-full rounded-2xl border border-stroke bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                    type="number"
                    value={draft.height}
                    onChange={(e) => setDraft({ ...draft, height: Number(e.target.value) || 0 })}
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-3xl border border-stroke bg-bg-primary/40 p-4 space-y-4">
              <label className="flex items-center gap-3 text-sm font-semibold text-text-primary">
                <input
                  checked={draft.hiresEnabled}
                  className="h-4 w-4 accent-[#5ea4ff]"
                  type="checkbox"
                  onChange={(e) => setDraft({ ...draft, hiresEnabled: e.target.checked })}
                />
                Hi-Res Fix
              </label>
              {draft.hiresEnabled && (
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Steps">
                    <input
                      className="w-full rounded-2xl border border-stroke bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                      type="number"
                      value={draft.hiresSteps}
                      onChange={(e) => setDraft({ ...draft, hiresSteps: Number(e.target.value) || 0 })}
                    />
                  </Field>
                  <Field label="Upscale">
                    <input
                      className="w-full rounded-2xl border border-stroke bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                      type="number"
                      step="0.1"
                      value={draft.hiresUpscale}
                      onChange={(e) => setDraft({ ...draft, hiresUpscale: Number(e.target.value) || 0 })}
                    />
                  </Field>
                  <Field label="Denoise">
                    <input
                      className="w-full rounded-2xl border border-stroke bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                      type="number"
                      step="0.05"
                      value={draft.hiresDenoise}
                      onChange={(e) => setDraft({ ...draft, hiresDenoise: Number(e.target.value) || 0 })}
                    />
                  </Field>
                </div>
              )}
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
