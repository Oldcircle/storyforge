import { useEffect, useRef, useState } from "react";
import { Field } from "../components/common/Field";
import { Panel } from "../components/common/Panel";
import { usePresetStore } from "../stores/preset";
import type { DirectorPreset } from "../types/preset";
import { db } from "../db";
import { importDirectorPreset } from "../utils/import-export";

type DraftPreset = {
  name: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  defaultImageAdapter: string;
};

function toDraft(preset: DirectorPreset): DraftPreset {
  return {
    name: preset.name,
    model: preset.llm.model,
    temperature: preset.llm.temperature,
    maxTokens: preset.llm.maxTokens,
    systemPrompt: preset.systemPrompt,
    defaultImageAdapter: preset.defaultImageAdapter ?? preset.visualStyle?.defaultImageAdapter ?? "comfyui"
  };
}

export function PresetEditorPage() {
  const presets = usePresetStore((state) => state.presets);
  const selected = usePresetStore((state) => state.selected);
  const createPreset = usePresetStore((state) => state.create);
  const selectPreset = usePresetStore((state) => state.select);
  const updatePreset = usePresetStore((state) => state.update);
  const removePreset = usePresetStore((state) => state.remove);
  const loadAll = usePresetStore((state) => state.loadAll);
  const [draft, setDraft] = useState<DraftPreset | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const preset = importDirectorPreset(text);
      await db.presets.add(preset);
      await loadAll();
      void selectPreset(preset.id);
    } catch (error) {
      window.alert(`导入失败：${error instanceof Error ? error.message : String(error)}`);
    }
    if (importFileRef.current) importFileRef.current.value = "";
  };

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
      defaultImageAdapter: draft.defaultImageAdapter
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Panel
        title="导演预设"
        subtitle="控制导演 LLM 的行为：采样参数、系统提示词、分镜规则。生图参数请在渲染预设中配置。"
        actions={
          <div className="flex gap-2">
            <button
              className="rounded-xl border border-stroke/60 bg-bg-tertiary/30 px-4 py-2.5 text-sm text-text-secondary transition hover:border-stroke hover:bg-bg-tertiary hover:text-text-primary hover:shadow-sm"
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
              className="rounded-xl bg-accent-blue px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-accent-blue/20 transition hover:bg-accent-blue/90 disabled:opacity-50 disabled:shadow-none"
              onClick={() => void createPreset().then(selectPreset)}
            >
              新建预设
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
                  : "border-stroke bg-bg-primary/60 hover:border-stroke-strong"
              }`}
              onClick={() => void selectPreset(preset.id)}
            >
              <div className="text-sm font-semibold text-text-primary">{preset.name}</div>
              <div className="mt-1 text-xs text-text-muted">{preset.llm.model}</div>
            </button>
          ))}
          {presets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stroke/60 bg-bg-primary/30 p-6 text-sm text-text-muted">
              还没有导演预设，先创建一个默认预设。
            </div>
          ) : null}
        </div>
      </Panel>

      <Panel
        title="预设编辑"
        subtitle="导演预设管'怎么拍故事'— LLM 配置 + 系统提示词。生图参数（steps/cfg/sampler 等）请在渲染预设中设置。"
        actions={
          selected ? (
            <div className="flex gap-2">
              <button
                className="rounded-xl border border-stroke/60 bg-bg-tertiary/30 px-4 py-2.5 text-sm text-text-secondary transition hover:border-stroke hover:bg-bg-tertiary hover:text-text-primary hover:shadow-sm"
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
          <div className="rounded-2xl border border-dashed border-stroke/60 bg-bg-primary/30 p-8 text-sm text-text-muted">
            选择左侧预设后开始编辑。
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="名称">
              <input
                className="w-full rounded-xl border border-stroke/60 bg-bg-tertiary/50 px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </Field>
            <Field label="模型">
              <input
                className="w-full rounded-xl border border-stroke/60 bg-bg-tertiary/50 px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                value={draft.model}
                onChange={(event) => setDraft({ ...draft, model: event.target.value })}
              />
            </Field>
            <Field label="Temperature">
              <input
                className="w-full rounded-xl border border-stroke/60 bg-bg-tertiary/50 px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
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
                className="w-full rounded-xl border border-stroke/60 bg-bg-tertiary/50 px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                type="number"
                value={draft.maxTokens}
                onChange={(event) =>
                  setDraft({ ...draft, maxTokens: Number(event.target.value) || 0 })
                }
              />
            </Field>
            <Field label="默认生图适配器">
              <select
                className="w-full rounded-xl border border-stroke/60 bg-bg-tertiary/50 px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                value={draft.defaultImageAdapter}
                onChange={(event) =>
                  setDraft({ ...draft, defaultImageAdapter: event.target.value })
                }
              >
                <option value="comfyui">ComfyUI</option>
                <option value="sdwebui">SD WebUI</option>
              </select>
            </Field>
            <div /> {/* spacer for grid alignment */}
            <div className="md:col-span-2">
              <Field label="导演系统提示词" hint="使用 {{characters}} 和 {{scenes}} 占位符注入角色和场景信息">
                <textarea
                  className="min-h-[400px] font-mono w-full rounded-xl border border-stroke/60 bg-bg-tertiary/50 px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
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
