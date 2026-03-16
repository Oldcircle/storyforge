import { useEffect, useMemo, useRef, useState } from "react";
import { Field } from "../components/common/Field";
import { Panel } from "../components/common/Panel";
import { useSceneStore } from "../stores/scene";
import type { SceneBook, SceneEntry } from "../types/scene";
import { downloadTextFile, exportSceneBook, importSceneBook } from "../utils/import-export";
import { importSceneBookFromSTWorld } from "../utils/import-st";

type DraftBook = {
  name: string;
  description: string;
  entries: Array<{
    id: string;
    name: string;
    keywords: string;
    secondaryKeywords: string;
    environmentPrompt: string;
    lighting: string;
    atmosphere: string;
    insertionOrder: number;
    enabled: boolean;
    useRegex: boolean;
    alwaysActive: boolean;
  }>;
};

function toDraft(book: SceneBook): DraftBook {
  const mergedEntries = [...book.constants, ...book.entries];
  return {
    name: book.name,
    description: book.description ?? "",
    entries: mergedEntries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      keywords: entry.keywords.join(", "),
      secondaryKeywords: (entry.secondaryKeywords ?? []).join(", "),
      environmentPrompt: entry.content.environmentPrompt,
      lighting: entry.content.lighting ?? "",
      atmosphere: entry.content.atmosphere ?? "",
      insertionOrder: entry.insertionOrder,
      enabled: entry.enabled,
      useRegex: Boolean(entry.useRegex),
      alwaysActive: Boolean(entry.alwaysActive)
    }))
  };
}

function toEntry(entry: DraftBook["entries"][number]): SceneEntry {
  return {
    id: entry.id,
    name: entry.name,
    enabled: entry.enabled,
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
      environmentPrompt: entry.environmentPrompt,
      negativePrompt: "",
      props: [],
      atmosphere: entry.atmosphere,
      lighting: entry.lighting,
      timeOfDay: "",
      weather: ""
    },
    referenceImages: [],
    insertionOrder: entry.insertionOrder
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
              className="rounded-full border border-stroke px-4 py-2 text-sm text-text-secondary transition hover:text-text-primary"
              onClick={() => importJsonRef.current?.click()}
            >
              导入 JSON
            </button>
            <button
              className="rounded-full border border-stroke px-4 py-2 text-sm text-text-secondary transition hover:text-text-primary"
              onClick={() => importStRef.current?.click()}
            >
              导入 ST 世界书
            </button>
            <button
              className="rounded-full bg-accent-blue px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
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
            <div className="rounded-2xl border border-dashed border-stroke p-4 text-sm text-text-muted">
              还没有场景书。先创建一个基础场景集，给后面的关键词匹配做输入。
            </div>
          ) : null}
          {notice ? (
            <div className="rounded-2xl border border-accent-mint/30 bg-accent-mint/10 p-3 text-xs text-text-secondary">
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
                className="rounded-full border border-stroke px-4 py-2 text-sm text-text-secondary transition hover:text-text-primary"
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
                className="rounded-full border border-stroke px-4 py-2 text-sm text-text-secondary transition hover:text-text-primary"
                onClick={() => void removeBook(selected.id)}
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
            选择左侧场景书后开始编辑。
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="名称">
                <input
                  className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </Field>
              <Field label="描述">
                <input
                  className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
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
                  className="rounded-full border border-stroke px-4 py-2 text-sm text-text-secondary transition hover:text-text-primary"
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

              {sortedEntries.map((entry) => (
                <div key={entry.id} className="rounded-3xl border border-stroke bg-bg-primary/70 p-4">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <input
                        className="w-full rounded-2xl border border-stroke bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                        value={entry.name}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            entries: draft.entries.map((item) =>
                              item.id === entry.id ? { ...item, name: event.target.value } : item,
                            )
                          })
                        }
                      />
                    </div>
                    <button
                      className="rounded-full border border-stroke px-3 py-2 text-xs text-text-secondary transition hover:text-text-primary"
                      onClick={() => {
                        if (!selected) {
                          return;
                        }
                        void removeEntry(selected.id, entry.id);
                      }}
                    >
                      删除
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="关键词">
                      <input
                        className="w-full rounded-2xl border border-stroke bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                        value={entry.keywords}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            entries: draft.entries.map((item) =>
                              item.id === entry.id ? { ...item, keywords: event.target.value } : item,
                            )
                          })
                        }
                      />
                    </Field>
                    <Field label="次要关键词">
                      <input
                        className="w-full rounded-2xl border border-stroke bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                        value={entry.secondaryKeywords}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            entries: draft.entries.map((item) =>
                              item.id === entry.id
                                ? { ...item, secondaryKeywords: event.target.value }
                                : item,
                            )
                          })
                        }
                      />
                    </Field>
                    <Field label="优先级">
                      <input
                        className="w-full rounded-2xl border border-stroke bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                        type="number"
                        value={entry.insertionOrder}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            entries: draft.entries.map((item) =>
                              item.id === entry.id
                                ? { ...item, insertionOrder: Number(event.target.value) || 0 }
                                : item,
                            )
                          })
                        }
                      />
                    </Field>
                    <label className="flex items-center gap-3 rounded-2xl border border-stroke bg-bg-secondary px-4 py-3 text-sm text-text-secondary">
                      <input
                        checked={entry.alwaysActive}
                        className="h-4 w-4 accent-[#5ea4ff]"
                        type="checkbox"
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            entries: draft.entries.map((item) =>
                              item.id === entry.id
                                ? { ...item, alwaysActive: event.target.checked }
                                : item,
                            )
                          })
                        }
                      />
                      常驻条目
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-stroke bg-bg-secondary px-4 py-3 text-sm text-text-secondary">
                      <input
                        checked={entry.useRegex}
                        className="h-4 w-4 accent-[#5ea4ff]"
                        type="checkbox"
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            entries: draft.entries.map((item) =>
                              item.id === entry.id
                                ? { ...item, useRegex: event.target.checked }
                                : item,
                            )
                          })
                        }
                      />
                      正则匹配
                    </label>
                    <div className="md:col-span-2">
                      <Field label="环境 Prompt">
                        <textarea
                          className="min-h-24 w-full rounded-2xl border border-stroke bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                          value={entry.environmentPrompt}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              entries: draft.entries.map((item) =>
                                item.id === entry.id
                                  ? { ...item, environmentPrompt: event.target.value }
                                  : item,
                              )
                            })
                          }
                        />
                      </Field>
                    </div>
                    <Field label="光照">
                      <input
                        className="w-full rounded-2xl border border-stroke bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                        value={entry.lighting}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            entries: draft.entries.map((item) =>
                              item.id === entry.id ? { ...item, lighting: event.target.value } : item,
                            )
                          })
                        }
                      />
                    </Field>
                    <Field label="氛围">
                      <input
                        className="w-full rounded-2xl border border-stroke bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                        value={entry.atmosphere}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            entries: draft.entries.map((item) =>
                              item.id === entry.id ? { ...item, atmosphere: event.target.value } : item,
                            )
                          })
                        }
                      />
                    </Field>
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
