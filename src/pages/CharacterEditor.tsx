import { useEffect, useRef, useState } from "react";
import { Field } from "../components/common/Field";
import { ImageUpload } from "../components/common/ImageUpload";
import { KeyValueEditor } from "../components/common/KeyValueEditor";
import { Panel } from "../components/common/Panel";
import { useCharacterStore } from "../stores/character";
import { useSceneStore } from "../stores/scene";
import type { CharacterCard } from "../types/character";
import { downloadTextFile, exportCharacter, importCharacter } from "../utils/import-export";
import { importCharacterFromSTPNG } from "../utils/import-st";

type DraftCharacter = {
  name: string;
  avatar?: string;
  basePrompt: string;
  negativePrompt: string;
  styleModifiers: string;
  personality: string;
  dialogueExamples: string;
  backstory: string;
  creator: string;
  referenceImages: string[];
  loraName: string;
  loraWeight: number;
  loraTriggerWord: string;
  seedBase: string;
  expressions: Array<{ key: string; value: string }>;
  outfits: Array<{ key: string; value: string }>;
};

function toDraft(character: CharacterCard): DraftCharacter {
  return {
    name: character.name,
    avatar: character.avatar,
    basePrompt: character.appearance.basePrompt,
    negativePrompt: character.appearance.negativePrompt,
    styleModifiers: character.appearance.styleModifiers,
    personality: character.personality,
    dialogueExamples: character.dialogueExamples,
    backstory: character.backstory ?? "",
    creator: character.creator ?? "",
    referenceImages: character.consistency.referenceImages,
    loraName: character.consistency.lora?.name ?? "",
    loraWeight: character.consistency.lora?.weight ?? 0.7,
    loraTriggerWord: character.consistency.lora?.triggerWord ?? "",
    seedBase:
      typeof character.consistency.seedBase === "number"
        ? String(character.consistency.seedBase)
        : "",
    expressions: Object.entries(character.expressions).map(([key, value]) => ({
      key,
      value: value.promptModifier
    })),
    outfits: Object.entries(character.outfits).map(([key, value]) => ({ key, value }))
  };
}

export function CharacterEditorPage() {
  const characters = useCharacterStore((state) => state.characters);
  const selected = useCharacterStore((state) => state.selected);
  const createCharacter = useCharacterStore((state) => state.create);
  const selectCharacter = useCharacterStore((state) => state.select);
  const updateCharacter = useCharacterStore((state) => state.update);
  const removeCharacter = useCharacterStore((state) => state.remove);
  const createSceneBook = useSceneStore((state) => state.create);
  const [draft, setDraft] = useState<DraftCharacter | null>(null);
  const [notice, setNotice] = useState<string>("");
  const importJsonRef = useRef<HTMLInputElement>(null);
  const importStRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(selected ? toDraft(selected) : null);
  }, [selected]);

  const handleCreate = async () => {
    const id = await createCharacter();
    await selectCharacter(id);
  };

  const handleSave = async () => {
    if (!selected || !draft) {
      return;
    }
    await updateCharacter(selected.id, {
      name: draft.name,
      avatar: draft.avatar,
      appearance: {
        basePrompt: draft.basePrompt,
        negativePrompt: draft.negativePrompt,
        styleModifiers: draft.styleModifiers
      },
      consistency: {
        ...selected.consistency,
        referenceImages: draft.referenceImages,
        lora: draft.loraName.trim()
          ? {
              name: draft.loraName.trim(),
              weight: draft.loraWeight,
              triggerWord: draft.loraTriggerWord.trim() || undefined
            }
          : undefined,
        seedBase: draft.seedBase.trim() ? Number(draft.seedBase) : undefined
      },
      personality: draft.personality,
      dialogueExamples: draft.dialogueExamples,
      backstory: draft.backstory || undefined,
      creator: draft.creator || undefined,
      expressions: Object.fromEntries(
        draft.expressions
          .filter((row) => row.key.trim())
          .map((row) => [row.key.trim(), { promptModifier: row.value.trim() }]),
      ),
      outfits: Object.fromEntries(
        draft.outfits.filter((row) => row.key.trim()).map((row) => [row.key.trim(), row.value]),
      )
    });
    setNotice("角色卡已保存");
  };

  const handleNativeImport = async (file: File) => {
    try {
      const text = await file.text();
      const card = importCharacter(text);
      const id = await createCharacter(card);
      await selectCharacter(id);
      setNotice(`已导入角色卡：${card.name}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  const handleSTImport = async (file: File) => {
    try {
      const { character, sceneBook } = await importCharacterFromSTPNG(file);
      const id = await createCharacter(character);
      if (sceneBook) {
        await createSceneBook(sceneBook);
      }
      await selectCharacter(id);
      setNotice(
        sceneBook
          ? `已导入 ST 角色卡，并生成关联场景书：${character.name}`
          : `已导入 ST 角色卡：${character.name}`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Panel
        title="角色卡"
        subtitle="先把最关键的可控信息固定住：名字、外貌锚点、表情和服装。"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-full border border-stroke px-4 py-2 text-sm text-text-secondary transition hover:text-text-primary"
              onClick={() => importJsonRef.current?.click()}
            >
              导入 JSON
            </button>
            <button
              className="rounded-full border border-stroke px-4 py-2 text-sm text-text-secondary transition hover:text-text-primary"
              onClick={() => importStRef.current?.click()}
            >
              导入 ST PNG
            </button>
            <button
              className="rounded-full bg-accent-blue px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
              onClick={() => void handleCreate()}
            >
              新建角色
            </button>
            <input
              ref={importJsonRef}
              accept=".json,application/json"
              className="hidden"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleNativeImport(file);
                }
                event.target.value = "";
              }}
            />
            <input
              ref={importStRef}
              accept=".png,image/png"
              className="hidden"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleSTImport(file);
                }
                event.target.value = "";
              }}
            />
          </div>
        }
      >
        <div className="space-y-2">
          {characters.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stroke p-4 text-sm text-text-muted">
            还没有角色卡，先创建一个角色作为导演引擎的第一批测试资产。
          </div>
        ) : null}
          {notice ? (
            <div className="rounded-2xl border border-accent-mint/30 bg-accent-mint/10 p-3 text-xs text-text-secondary">
              {notice}
            </div>
          ) : null}
          {characters.map((character) => (
            <button
              key={character.id}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                selected?.id === character.id
                  ? "border-accent-blue/50 bg-accent-blue/10"
                  : "border-stroke bg-bg-primary/60 hover:border-stroke-strong"
              }`}
              onClick={() => void selectCharacter(character.id)}
            >
              <div className="text-sm font-semibold text-text-primary">{character.name}</div>
              <div className="mt-1 text-xs text-text-muted">
                {character.appearance.basePrompt || "尚未填写视觉 prompt"}
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <Panel
        title="角色编辑"
        subtitle="这版先提供最小可用字段，图片与 PNG 导入后续再补。"
        actions={
          selected ? (
            <div className="flex gap-2">
              <button
                className="rounded-full border border-stroke px-4 py-2 text-sm text-text-secondary transition hover:text-text-primary"
                onClick={() =>
                  downloadTextFile(
                    `${selected.name || "character"}.storyforge.character.json`,
                    exportCharacter(selected),
                  )
                }
              >
                导出 JSON
              </button>
              <button
                className="rounded-full border border-stroke px-4 py-2 text-sm text-text-secondary transition hover:text-text-primary"
                onClick={() => void removeCharacter(selected.id)}
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
            选择左侧角色后开始编辑。
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="头像">
                <ImageUpload
                  maxImages={1}
                  value={draft.avatar ? [draft.avatar] : []}
                  onChange={(images) => setDraft({ ...draft, avatar: images[0] })}
                />
              </Field>
            </div>
            <Field label="名称">
              <input
                className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </Field>
            <Field label="风格修饰">
              <input
                className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                value={draft.styleModifiers}
                onChange={(event) => setDraft({ ...draft, styleModifiers: event.target.value })}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="基础 Prompt">
                <textarea
                  className="min-h-28 w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                  value={draft.basePrompt}
                  onChange={(event) => setDraft({ ...draft, basePrompt: event.target.value })}
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="参考图">
                <ImageUpload
                  value={draft.referenceImages}
                  onChange={(images) => setDraft({ ...draft, referenceImages: images })}
                />
              </Field>
            </div>
            <Field label="LoRA 名称">
              <input
                className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                value={draft.loraName}
                onChange={(event) => setDraft({ ...draft, loraName: event.target.value })}
              />
            </Field>
            <Field label="LoRA 权重">
              <input
                className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                type="number"
                max="1"
                min="0"
                step="0.05"
                value={draft.loraWeight}
                onChange={(event) =>
                  setDraft({ ...draft, loraWeight: Number(event.target.value) || 0 })
                }
              />
            </Field>
            <Field label="触发词">
              <input
                className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                value={draft.loraTriggerWord}
                onChange={(event) =>
                  setDraft({ ...draft, loraTriggerWord: event.target.value })
                }
              />
            </Field>
            <Field label="基础 Seed">
              <input
                className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                type="number"
                value={draft.seedBase}
                onChange={(event) => setDraft({ ...draft, seedBase: event.target.value })}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="负面 Prompt">
                <textarea
                  className="min-h-24 w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                  value={draft.negativePrompt}
                  onChange={(event) => setDraft({ ...draft, negativePrompt: event.target.value })}
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="性格描述">
                <textarea
                  className="min-h-24 w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                  value={draft.personality}
                  onChange={(event) => setDraft({ ...draft, personality: event.target.value })}
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="对话示例">
                <textarea
                  className="min-h-24 w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                  value={draft.dialogueExamples}
                  onChange={(event) => setDraft({ ...draft, dialogueExamples: event.target.value })}
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="背景故事" hint="角色的背景设定（导演 LLM 用）">
                <textarea
                  className="min-h-20 w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                  value={draft.backstory}
                  onChange={(event) => setDraft({ ...draft, backstory: event.target.value })}
                />
              </Field>
            </div>
            <Field label="创作者">
              <input
                className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                placeholder="ST 导入时自动填入"
                value={draft.creator}
                onChange={(event) => setDraft({ ...draft, creator: event.target.value })}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="表情库">
                <KeyValueEditor
                  rows={draft.expressions}
                  addLabel="添加表情"
                  keyPlaceholder="表情名"
                  valuePlaceholder="prompt 修饰词"
                  onChange={(rows) => setDraft({ ...draft, expressions: rows })}
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="服装库">
                <KeyValueEditor
                  rows={draft.outfits}
                  addLabel="添加服装"
                  keyPlaceholder="服装名"
                  valuePlaceholder="prompt 片段"
                  onChange={(rows) => setDraft({ ...draft, outfits: rows })}
                />
              </Field>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
