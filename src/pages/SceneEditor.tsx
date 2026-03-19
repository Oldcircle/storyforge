import { useEffect, useMemo, useRef, useState } from "react";
import { Field } from "../components/common/Field";
import { ImageUpload } from "../components/common/ImageUpload";
import { Panel } from "../components/common/Panel";
import { useSceneStore } from "../stores/scene";
import type { SceneBook, SceneEntry, SceneEntryUsage } from "../types/scene";
import { downloadTextFile, exportSceneBook, importSceneBook } from "../utils/import-export";
import { importSceneBookFromSTWorld } from "../utils/import-st";

type DraftEntry = {
  id: string;
  name: string;
  usage: SceneEntryUsage;
  keywords: string;
  secondaryKeywords: string;
  directorContext: string;
  environmentPrompt: string;
  negativePrompt: string;
  lighting: string;
  atmosphere: string;
  weather: string;
  referenceImages: string[];
  insertionOrder: number;
  enabled: boolean;
  useRegex: boolean;
  alwaysActive: boolean;
};

type DraftBook = {
  name: string;
  description: string;
  entries: DraftEntry[];
};

function toDraft(book: SceneBook): DraftBook {
  const mergedEntries = [...book.constants, ...book.entries];
  return {
    name: book.name,
    description: book.description ?? "",
    entries: mergedEntries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      usage: entry.usage ?? "shared",
      keywords: entry.keywords.join(", "),
      secondaryKeywords: (entry.secondaryKeywords ?? []).join(", "),
      directorContext: entry.content.directorContext ?? "",
      environmentPrompt: entry.content.environmentPrompt,
      negativePrompt: entry.content.negativePrompt ?? "",
      lighting: entry.content.lighting ?? "",
      atmosphere: entry.content.atmosphere ?? "",
      weather: entry.content.weather ?? "",
      referenceImages: entry.referenceImages ?? [],
      insertionOrder: entry.insertionOrder,
      enabled: entry.enabled,
      useRegex: Boolean(entry.useRegex),
      alwaysActive: Boolean(entry.alwaysActive)
    }))
  };
}

function toEntry(entry: DraftEntry): SceneEntry {
  return {
    id: entry.id,
    name: entry.name,
    enabled: entry.enabled,
    usage: entry.usage,
    keywords: entry.keywords
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean),
    secondaryKeywords: entry.secondaryKeywords
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean),
    useRegex: entry.useRegex,
    alwaysActive: entry.alwaysActive,
    content: {
      directorContext: entry.directorContext,
      environmentPrompt: entry.environmentPrompt,
      negativePrompt: entry.negativePrompt,
      props: [],
      atmosphere: entry.atmosphere,
      lighting: entry.lighting,
      timeOfDay: "",
      weather: entry.weather
    },
    referenceImages: entry.referenceImages,
    insertionOrder: entry.insertionOrder
  };
}

function updateEntry(draft: DraftBook, entryId: string, updates: Partial<DraftEntry>): DraftBook {
  return {
    ...draft,
    entries: draft.entries.map((item) =>
      item.id === entryId ? { ...item, ...updates } : item,
    ),
  };
}

function swapEntryOrder(draft: DraftBook, entryId: string, direction: "up" | "down"): DraftBook {
  const sorted = [...draft.entries].sort((a, b) => a.insertionOrder - b.insertionOrder);
  const idx = sorted.findIndex((e) => e.id === entryId);
  if (idx < 0) return draft;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= sorted.length) return draft;

  const orderA = sorted[idx].insertionOrder;
  const orderB = sorted[swapIdx].insertionOrder;
  // If they have the same order, nudge by 1
  const newOrderA = orderA === orderB ? (direction === "up" ? orderB - 1 : orderB + 1) : orderB;
  const newOrderB = orderA === orderB ? orderA : orderA;

  return {
    ...draft,
    entries: draft.entries.map((item) => {
      if (item.id === sorted[idx].id) return { ...item, insertionOrder: newOrderA };
      if (item.id === sorted[swapIdx].id) return { ...item, insertionOrder: newOrderB };
      return item;
    }),
  };
}

export function SceneEditorPage() {
  const sceneBooks = useSceneStore((state) => state.sceneBooks);
  const selected = useSceneStore((state) => state.selected);
  const createBook = useSceneStore((state) => state.create);
  const selectBook = useSceneStore((state) => state.select);
  const updateBook = useSceneStore((state) => state.update);
  const addEntry = useSceneStore((state) => state.addEntry);
  const removeEntry = useSceneStore((state) => state.removeEntry);
  const removeBook = useSceneStore((state) => state.remove);
  const [draft, setDraft] = useState<DraftBook | null>(null);
  const [notice, setNotice] = useState<string>("");
  const importJsonRef = useRef<HTMLInputElement>(null);
  const importStRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(selected ? toDraft(selected) : null);
  }, [selected]);

  const sortedEntries = useMemo(() => {
    return [...(draft?.entries ?? [])].sort((left, right) => left.insertionOrder - right.insertionOrder);
  }, [draft]);

  const handleSave = async () => {
    if (!selected || !draft) {
      return;
    }
    await updateBook(selected.id, {
      name: draft.name,
      description: draft.description,
      constants: draft.entries.map(toEntry).filter((entry) => entry.alwaysActive),
      entries: draft.entries.map(toEntry).filter((entry) => !entry.alwaysActive)
    });
    setNotice("场景书已保存");
  };

  const handleImport = async (file: File, mode: "native" | "st-world") => {
    try {
      const text = await file.text();
      const sceneBook =
        mode === "native"
          ? importSceneBook(text)
          : importSceneBookFromSTWorld(text, file.name.replace(/\.json$/i, ""));
      const id = await createBook(sceneBook);
      await selectBook(id);
      setNotice(`已导入场景书：${sceneBook.name}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Panel
        title="场景书"
        subtitle="先锁住环境关键词和画面锚点，后面再接关键词匹配与 Prompt 注入。"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl border border-stroke/60 bg-bg-tertiary/30 px-4 py-2.5 text-sm text-text-secondary transition hover:border-stroke hover:bg-bg-tertiary hover:text-text-primary hover:shadow-sm"
              onClick={() => importJsonRef.current?.click()}
            >
              导入 JSON
            </button>
            <button
              className="rounded-xl border border-stroke/60 bg-bg-tertiary/30 px-4 py-2.5 text-sm text-text-secondary transition hover:border-stroke hover:bg-bg-tertiary hover:text-text-primary hover:shadow-sm"
              onClick={() => importStRef.current?.click()}
            >
              导入 ST 世界书
            </button>
            <button
              className="rounded-xl bg-accent-blue px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-accent-blue/20 transition hover:bg-accent-blue/90 disabled:opacity-50 disabled:shadow-none"
              onClick={() => void createBook().then(selectBook)}
            >
              新建场景书
            </button>
            <input
              ref={importJsonRef}
              accept=".json,application/json"
              className="hidden"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleImport(file, "native");
                }
                event.target.value = "";
              }}
            />
            <input
              ref={importStRef}
              accept=".json,application/json"
              className="hidden"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleImport(file, "st-world");
                }
                event.target.value = "";
              }}
            />
          </div>
        }
      >
        <div className="space-y-2">
          {sceneBooks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stroke/60 bg-bg-primary/30 p-6 text-sm text-text-muted">
              还没有场景书。先创建一个基础场景集，给后面的关键词匹配做输入。
            </div>
          ) : null}
          {notice ? (
            <div className="rounded-xl border border-accent-mint/30 bg-accent-mint/10 p-3 text-xs text-text-secondary">
              {notice}
            </div>
          ) : null}
          {sceneBooks.map((book) => (
            <button
              key={book.id}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                selected?.id === book.id
                  ? "border-accent-blue/50 bg-accent-blue/10"
                  : "border-stroke bg-bg-primary/60 hover:border-stroke-strong"
              }`}
              onClick={() => void selectBook(book.id)}
            >
              <div className="text-sm font-semibold text-text-primary">{book.name}</div>
              <div className="mt-1 text-xs text-text-muted">{book.entries.length} 个触发条目</div>
            </button>
          ))}
        </div>
      </Panel>

      <Panel
        title="场景编辑"
        subtitle="这一版先做最小可用字段，重点是关键词、环境描述和排序优先级。"
        actions={
          selected ? (
            <div className="flex gap-2">
              <button
                className="rounded-xl border border-stroke/60 bg-bg-tertiary/30 px-4 py-2.5 text-sm text-text-secondary transition hover:border-stroke hover:bg-bg-tertiary hover:text-text-primary hover:shadow-sm"
                onClick={() =>
                  downloadTextFile(
                    `${selected.name || "scene-book"}.storyforge.scene.json`,
                    exportSceneBook(selected),
                  )
                }
              >
                导出 JSON
              </button>
              <button
                className="rounded-xl border border-stroke/60 bg-bg-tertiary/30 px-4 py-2.5 text-sm text-text-secondary transition hover:border-stroke hover:bg-bg-tertiary hover:text-text-primary hover:shadow-sm"
                onClick={() => void removeBook(selected.id)}
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
            选择左侧场景书后开始编辑。
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="名称">
                <input
                  className="w-full rounded-xl border border-stroke/60 bg-bg-tertiary/50 px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </Field>
              <Field label="描述">
                <input
                  className="w-full rounded-xl border border-stroke/60 bg-bg-tertiary/50 px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                />
              </Field>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">触发条目</h3>
                  <p className="text-xs text-text-muted">后续导演引擎会按这些条目做匹配和注入。</p>
                </div>
                <button
                  className="rounded-xl border border-stroke/60 bg-bg-tertiary/30 px-4 py-2.5 text-sm text-text-secondary transition hover:border-stroke hover:bg-bg-tertiary hover:text-text-primary hover:shadow-sm"
                  onClick={() => {
                    if (!selected) {
                      return;
                    }
                    void addEntry(selected.id);
                  }}
                >
                  添加条目
                </button>
              </div>

              {sortedEntries.map((entry, sortedIndex) => (
                <div key={entry.id} className="rounded-xl border border-stroke/50 bg-bg-primary/50 p-4 shadow-inner">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-0.5">
                        <button
                          className="rounded px-1.5 py-0.5 text-xs text-text-muted transition hover:bg-bg-secondary hover:text-text-primary disabled:opacity-30"
                          disabled={sortedIndex === 0}
                          title="上移"
                          onClick={() => setDraft(swapEntryOrder(draft, entry.id, "up"))}
                        >▴</button>
                        <button
                          className="rounded px-1.5 py-0.5 text-xs text-text-muted transition hover:bg-bg-secondary hover:text-text-primary disabled:opacity-30"
                          disabled={sortedIndex === sortedEntries.length - 1}
                          title="下移"
                          onClick={() => setDraft(swapEntryOrder(draft, entry.id, "down"))}
                        >▾</button>
                      </div>
                      <label className="flex items-center gap-2">
                        <input
                          checked={entry.enabled}
                          className="h-4 w-4 rounded border-stroke accent-accent-blue"
                          type="checkbox"
                          onChange={(event) =>
                            setDraft(updateEntry(draft, entry.id, { enabled: event.target.checked }))
                          }
                        />
                      </label>
                    </div>
                    <div className="flex-1">
                      <input
                        className="w-full rounded-xl border border-stroke/60 bg-bg-tertiary/50 px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                        value={entry.name}
                        onChange={(event) =>
                          setDraft(updateEntry(draft, entry.id, { name: event.target.value }))
                        }
                      />
                    </div>
                    <button
                      className="rounded-full border border-stroke px-3 py-2 text-xs text-text-secondary transition hover:text-text-primary"
                      onClick={() => {
                        if (!selected) return;
                        void removeEntry(selected.id, entry.id);
                      }}
                    >
                      删除
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="关键词" hint="逗号分隔，任一匹配即触发">
                      <input
                        className="w-full rounded-xl border border-stroke/60 bg-bg-tertiary/50 px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                        value={entry.keywords}
                        onChange={(event) =>
                          setDraft(updateEntry(draft, entry.id, { keywords: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="次要关键词" hint="全部匹配才触发（AND）">
                      <input
                        className="w-full rounded-xl border border-stroke/60 bg-bg-tertiary/50 px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                        value={entry.secondaryKeywords}
                        onChange={(event) =>
                          setDraft(updateEntry(draft, entry.id, { secondaryKeywords: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="用途" hint="控制此条目注入到哪条管线">
                      <select
                        className="w-full rounded-xl border border-stroke/60 bg-bg-tertiary/50 px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                        value={entry.usage}
                        onChange={(event) =>
                          setDraft(updateEntry(draft, entry.id, { usage: event.target.value as SceneEntryUsage }))
                        }
                      >
                        <option value="shared">共享（导演+生图）</option>
                        <option value="director_only">仅导演（不进 CLIP）</option>
                        <option value="image_only">仅生图（不给 LLM）</option>
                      </select>
                    </Field>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-3 rounded-2xl border border-stroke bg-bg-secondary px-4 py-3 text-sm text-text-secondary">
                        <input
                          checked={entry.alwaysActive}
                          className="h-4 w-4 rounded border-stroke accent-accent-blue"
                          type="checkbox"
                          onChange={(event) =>
                            setDraft(updateEntry(draft, entry.id, { alwaysActive: event.target.checked }))
                          }
                        />
                        常驻
                      </label>
                      <label className="flex items-center gap-3 rounded-2xl border border-stroke bg-bg-secondary px-4 py-3 text-sm text-text-secondary">
                        <input
                          checked={entry.useRegex}
                          className="h-4 w-4 rounded border-stroke accent-accent-blue"
                          type="checkbox"
                          onChange={(event) =>
                            setDraft(updateEntry(draft, entry.id, { useRegex: event.target.checked }))
                          }
                        />
                        正则
                      </label>
                    </div>
                    {entry.usage !== "image_only" && (
                      <div className="md:col-span-2">
                        <Field label="导演上下文" hint="仅给导演 LLM 的叙事信息，不会进入 CLIP">
                          <textarea
                            className="min-h-16 w-full rounded-xl border border-stroke/60 bg-bg-tertiary/50 px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                            placeholder="例：这是适合旧情重逢、暧昧和压抑情绪爆发的封闭空间。"
                            value={entry.directorContext}
                            onChange={(event) =>
                              setDraft(updateEntry(draft, entry.id, { directorContext: event.target.value }))
                            }
                          />
                        </Field>
                      </div>
                    )}
                    {entry.usage !== "director_only" && (
                      <>
                        <div className="md:col-span-2">
                          <Field label="环境 Prompt" hint="CLIP 友好的视觉描述（英文关键词），直接注入生图 prompt">
                            <textarea
                              className="min-h-24 w-full rounded-xl border border-stroke/60 bg-bg-tertiary/50 px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                              placeholder="例：cozy coffee shop interior, warm yellow lighting, rain on windows"
                              value={entry.environmentPrompt}
                              onChange={(event) =>
                                setDraft(updateEntry(draft, entry.id, { environmentPrompt: event.target.value }))
                              }
                            />
                          </Field>
                        </div>
                        <div className="md:col-span-2">
                          <Field label="负面 Prompt" hint="场景级负面词，会追加到渲染预设的负面词后">
                            <input
                              className="w-full rounded-xl border border-stroke/60 bg-bg-tertiary/50 px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                              placeholder="例：bright daylight, outdoor"
                              value={entry.negativePrompt}
                              onChange={(event) =>
                                setDraft(updateEntry(draft, entry.id, { negativePrompt: event.target.value }))
                              }
                            />
                          </Field>
                        </div>
                      </>
                    )}
                    <Field label="光照">
                      <input
                        className="w-full rounded-xl border border-stroke/60 bg-bg-tertiary/50 px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                        value={entry.lighting}
                        onChange={(event) =>
                          setDraft(updateEntry(draft, entry.id, { lighting: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="氛围">
                      <input
                        className="w-full rounded-xl border border-stroke/60 bg-bg-tertiary/50 px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                        value={entry.atmosphere}
                        onChange={(event) =>
                          setDraft(updateEntry(draft, entry.id, { atmosphere: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="天气">
                      <input
                        className="w-full rounded-xl border border-stroke/60 bg-bg-tertiary/50 px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                        placeholder="例：heavy rain, overcast"
                        value={entry.weather}
                        onChange={(event) =>
                          setDraft(updateEntry(draft, entry.id, { weather: event.target.value }))
                        }
                      />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="场景参考图" hint="用于 IP-Adapter / ControlNet 的场景参考">
                        <ImageUpload
                          maxImages={4}
                          value={entry.referenceImages}
                          onChange={(images) =>
                            setDraft(updateEntry(draft, entry.id, { referenceImages: images }))
                          }
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
