import { useEffect, useState } from "react";
import { Field } from "../components/common/Field";
import { Panel } from "../components/common/Panel";
import { usePresetStore } from "../stores/preset";
import type { DirectorPreset } from "../types/preset";

type DraftPreset = {
  name: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  sampler: string;
  checkpoint: string;
  steps: number;
  cfgScale: number;
  width: number;
  height: number;
};

function toDraft(preset: DirectorPreset): DraftPreset {
  return {
    name: preset.name,
    model: preset.llm.model,
    temperature: preset.llm.temperature,
    maxTokens: preset.llm.maxTokens,
    systemPrompt: preset.systemPrompt,
    sampler: preset.visualStyle.sampler || "euler",
    checkpoint: preset.visualStyle.checkpoint || "sd_xl_base_1.0.safetensors",
    steps: preset.visualStyle.steps,
    cfgScale: preset.visualStyle.cfgScale,
    width: preset.visualStyle.width,
    height: preset.visualStyle.height
  };
}

export function PresetEditorPage() {
  const presets = usePresetStore((state) => state.presets);
  const selected = usePresetStore((state) => state.selected);
  const createPreset = usePresetStore((state) => state.create);
  const selectPreset = usePresetStore((state) => state.select);
  const updatePreset = usePresetStore((state) => state.update);
  const removePreset = usePresetStore((state) => state.remove);
  const [draft, setDraft] = useState<DraftPreset | null>(null);

  useEffect(() => {
    setDraft(selected ? toDraft(selected) : null);
  }, [selected]);

  const handleSave = async () => {
    if (!selected || !draft) {
      return;
    }
    await updatePreset(selected.id, {
      name: draft.name,
      llm: {
        ...selected.llm,
        model: draft.model,
        temperature: draft.temperature,
        maxTokens: draft.maxTokens
      },
      systemPrompt: draft.systemPrompt,
      visualStyle: {
        ...selected.visualStyle,
        sampler: draft.sampler,
        checkpoint: draft.checkpoint,
        steps: draft.steps,
        cfgScale: draft.cfgScale,
        width: draft.width,
        height: draft.height
      }
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Panel
        title="导演预设"
        subtitle="这一层对应 ST 的 preset 思路，用来控制导演模型的行为和默认视觉参数。"
        actions={
          <button
            className="rounded-full bg-accent-blue px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
            onClick={() => void createPreset().then(selectPreset)}
          >
            新建预设
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
              <div className="mt-1 text-xs text-text-muted">{preset.llm.model}</div>
            </button>
          ))}
          {presets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stroke p-4 text-sm text-text-muted">
              还没有导演预设，先创建一个默认预设。
            </div>
          ) : null}
        </div>
      </Panel>

      <Panel
        title="预设编辑"
        subtitle="这一步先把 system prompt 和默认视觉参数固定住，后面再扩展模板系统。"
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
            选择左侧预设后开始编辑。
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="名称">
              <input
                className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </Field>
            <Field label="模型">
              <input
                className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                value={draft.model}
                onChange={(event) => setDraft({ ...draft, model: event.target.value })}
              />
            </Field>
            <Field label="Temperature">
              <input
                className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                type="number"
                step="0.1"
                value={draft.temperature}
                onChange={(event) =>
                  setDraft({ ...draft, temperature: Number(event.target.value) || 0 })
                }
              />
            </Field>
            <Field label="Max Tokens">
              <input
                className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                type="number"
                value={draft.maxTokens}
                onChange={(event) =>
                  setDraft({ ...draft, maxTokens: Number(event.target.value) || 0 })
                }
              />
            </Field>
            <Field label="Steps">
              <input
                className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                type="number"
                value={draft.steps}
                onChange={(event) => setDraft({ ...draft, steps: Number(event.target.value) || 0 })}
              />
            </Field>
            <Field label="Sampler">
              <input
                className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                value={draft.sampler}
                onChange={(event) => setDraft({ ...draft, sampler: event.target.value })}
              />
            </Field>
            <Field label="CFG Scale">
              <input
                className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                type="number"
                step="0.1"
                value={draft.cfgScale}
                onChange={(event) =>
                  setDraft({ ...draft, cfgScale: Number(event.target.value) || 0 })
                }
              />
            </Field>
            <Field label="Checkpoint" hint="ComfyUI 中可用的模型文件名">
              <input
                className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                value={draft.checkpoint}
                onChange={(event) => setDraft({ ...draft, checkpoint: event.target.value })}
              />
            </Field>
            <Field label="宽度">
              <input
                className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                type="number"
                value={draft.width}
                onChange={(event) => setDraft({ ...draft, width: Number(event.target.value) || 0 })}
              />
            </Field>
            <Field label="高度">
              <input
                className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                type="number"
                value={draft.height}
                onChange={(event) => setDraft({ ...draft, height: Number(event.target.value) || 0 })}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="导演系统提示词">
                <textarea
                  className="min-h-80 w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                  value={draft.systemPrompt}
                  onChange={(event) => setDraft({ ...draft, systemPrompt: event.target.value })}
                />
              </Field>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
