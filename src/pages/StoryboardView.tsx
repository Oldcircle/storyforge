import { useEffect, useMemo, useState } from "react";
import { Field } from "../components/common/Field";
import { Panel } from "../components/common/Panel";
import { useCharacterStore } from "../stores/character";
import { usePresetStore } from "../stores/preset";
import { useSceneStore } from "../stores/scene";
import { useSettingsStore } from "../stores/settings";
import { useStoryboardStore } from "../stores/storyboard";
import type { Project } from "../types/project";
import { getProvider } from "../data/providers";

interface StoryboardViewPageProps {
  project?: Project;
}

export function StoryboardViewPage({ project }: StoryboardViewPageProps) {
  const characters = useCharacterStore((state) => state.characters);
  const sceneBooks = useSceneStore((state) => state.sceneBooks);
  const presets = usePresetStore((state) => state.presets);
  const settings = useSettingsStore((state) => state.settings);
  const storyboards = useStoryboardStore((state) => state.storyboards);
  const selected = useStoryboardStore((state) => state.selected);
  const loading = useStoryboardStore((state) => state.loading);
  const error = useStoryboardStore((state) => state.error);
  const lastPromptMessages = useStoryboardStore((state) => state.lastPromptMessages);
  const lastRawResponse = useStoryboardStore((state) => state.lastRawResponse);
  const loadByProject = useStoryboardStore((state) => state.loadByProject);
  const selectStoryboard = useStoryboardStore((state) => state.select);
  const generateStoryboard = useStoryboardStore((state) => state.generate);
  const [userInput, setUserInput] = useState("");
  const provider = getProvider(settings.llmProviderId);
  const requiresApiKey = provider?.requiresApiKey ?? true;

  useEffect(() => {
    if (project) {
      void loadByProject(project.id);
    }
  }, [loadByProject, project]);

  const linkedCharacters = useMemo(() => {
    if (!project) {
      return [];
    }
    return characters.filter((character) => project.characterIds.includes(character.id));
  }, [characters, project]);

  const sceneBook = useMemo(() => {
    if (!project?.sceneBookId) {
      return undefined;
    }
    return sceneBooks.find((book) => book.id === project.sceneBookId);
  }, [project, sceneBooks]);

  const preset = useMemo(() => {
    if (!project?.presetId) {
      return undefined;
    }
    return presets.find((item) => item.id === project.presetId);
  }, [presets, project]);

  if (!project) {
    return (
      <Panel title="未选择项目" subtitle="先从 Dashboard 进入一个项目工作区。">
        <div className="rounded-2xl border border-dashed border-stroke bg-bg-primary p-8 text-sm text-text-muted">
          还没有活动项目，暂时无法生成分镜。
        </div>
      </Panel>
    );
  }

  const canGenerate =
    Boolean(preset) &&
    linkedCharacters.length > 0 &&
    Boolean(settings.llmApiUrl.trim()) &&
    (!requiresApiKey || Boolean(settings.llmApiKey.trim())) &&
    userInput.trim().length > 0;

  return (
    <div className="space-y-6">
      <Panel
        title="导演引擎"
        subtitle="一句话 -> 导演 prompt -> LLM JSON 输出 -> 结构化分镜落库。这是 Phase 2 的第一条主链。"
      >
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <Field label="用户输入" hint="一句话描述你想要的场景">
              <textarea
                className="min-h-36 w-full rounded-3xl border border-stroke bg-bg-primary px-4 py-4 text-sm text-text-primary outline-none transition focus:border-accent-blue"
                placeholder="例如：林小雨在雨中的咖啡馆遇到了多年未见的初恋，两人短暂对视后都愣住了。"
                value={userInput}
                onChange={(event) => setUserInput(event.target.value)}
              />
            </Field>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-stroke bg-bg-primary p-4 ">
                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">角色</div>
                <div className="mt-2 text-lg font-semibold text-text-primary">
                  {linkedCharacters.length}
                </div>
              </div>
              <div className="rounded-xl border border-stroke bg-bg-primary p-4 ">
                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">场景书</div>
                <div className="mt-2 text-sm font-semibold text-text-primary">
                  {sceneBook?.name ?? "未绑定"}
                </div>
              </div>
              <div className="rounded-xl border border-stroke bg-bg-primary p-4 ">
                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">预设</div>
                <div className="mt-2 text-sm font-semibold text-text-primary">
                  {preset?.name ?? "未绑定"}
                </div>
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-accent-rose/20 bg-accent-rose/5 p-4 text-sm text-text-secondary">
                {error}
              </div>
            ) : null}

            {!preset ? (
              <div className="rounded-xl border border-accent-amber/20 bg-accent-amber/5 p-4 text-sm text-text-secondary">
                当前项目没有绑定导演预设，先在项目总览里选一个预设。
              </div>
            ) : null}

            {linkedCharacters.length === 0 ? (
              <div className="rounded-xl border border-accent-amber/20 bg-accent-amber/5 p-4 text-sm text-text-secondary">
                当前项目没有关联角色卡，导演模型暂时不知道有哪些角色可用。
              </div>
            ) : null}

            {requiresApiKey && !settings.llmApiKey.trim() ? (
              <div className="rounded-xl border border-accent-amber/20 bg-accent-amber/5 p-4 text-sm text-text-secondary">
                还没有配置 LLM API Key，请先去 Settings 填写。
              </div>
            ) : null}

            <button
              className="rounded-xl bg-accent-blue px-4 py-2.5 text-sm font-medium text-white  transition hover:bg-accent-blue/90 disabled:opacity-50 disabled:shadow-none"
              disabled={!canGenerate || loading}
              onClick={() => {
                if (!preset) {
                  return;
                }
                void generateStoryboard({
                  project,
                  preset,
                  characters: linkedCharacters,
                  sceneBook,
                  settings,
                  userInput
                });
              }}
            >
              {loading ? "生成中..." : "生成分镜 JSON"}
            </button>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-stroke bg-bg-primary p-4">
              <div className="text-sm font-semibold text-text-primary">最近一次 Prompt 预览</div>
              <div className="mt-3 space-y-3">
                {lastPromptMessages.length === 0 ? (
                  <div className="text-sm text-text-muted">还没有生成记录。</div>
                ) : (
                  lastPromptMessages.map((message, index) => (
                    <div key={`${message.role}-${index}`} className="rounded-2xl border border-stroke bg-bg-secondary/60 p-3">
                      <div className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted">
                        {message.role}
                      </div>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-sans text-xs text-text-secondary">
                        {message.content}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Panel title="分镜记录" subtitle="当前项目下已保存的结构化分镜。">
          <div className="space-y-2">
            {storyboards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stroke bg-bg-primary p-6 text-sm text-text-muted">
                还没有分镜记录，先生成第一条。
              </div>
            ) : null}
            {storyboards.map((storyboard) => (
              <button
                key={storyboard.id}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  selected?.id === storyboard.id
                    ? "border-accent-blue/50 bg-accent-blue/10"
                    : "border-stroke bg-bg-primary hover:border-stroke-strong"
                }`}
                onClick={() => void selectStoryboard(storyboard.id)}
              >
                <div className="text-sm font-semibold text-text-primary">{storyboard.sceneTitle}</div>
                <div className="mt-1 text-xs text-text-muted">
                  Scene {storyboard.sceneNumber} · {storyboard.shots.length} 个镜头
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <Panel
          title={selected?.sceneTitle ?? "分镜详情"}
          subtitle={
            selected
              ? `Scene ${selected.sceneNumber} · 共 ${selected.shots.length} 个镜头`
              : "选择左侧记录后查看详情。"
          }
        >
          {!selected ? (
            <div className="rounded-2xl border border-dashed border-stroke bg-bg-primary p-8 text-sm text-text-muted">
              当前还没有选中的分镜。
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-stroke bg-bg-primary p-4 text-sm text-text-secondary">
                <div className="font-semibold text-text-primary">原始输入</div>
                <p className="mt-2">{selected.userPrompt}</p>
              </div>

              {selected.shots.map((shot) => (
                <div key={shot.id} className="rounded-xl border border-stroke bg-bg-primary p-4 ">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
                        Shot {shot.shotNumber}
                      </div>
                      <div className="mt-1 text-lg font-semibold text-text-primary">
                        {shot.type} · {shot.duration}s
                      </div>
                    </div>
                    <div className="rounded-full border border-stroke px-3 py-1 font-mono text-xs text-text-muted">
                      {shot.cameraMovement}
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-text-secondary">{shot.description}</p>

                  {shot.characters.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {shot.characters.map((character) => (
                        <div
                          key={`${shot.id}-${character.characterId}-${character.position}`}
                          className="rounded-full border border-stroke bg-bg-secondary/60 px-3 py-1 text-xs text-text-secondary"
                        >
                          {character.characterId} · {character.emotion} · {character.position}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {shot.dialogue ? (
                    <div className="mt-4 rounded-2xl border border-stroke bg-bg-secondary p-3 text-sm text-text-secondary">
                      <span className="font-semibold text-text-primary">台词：</span>
                      {shot.dialogue}
                    </div>
                  ) : null}

                  {shot.narration ? (
                    <div className="mt-3 rounded-2xl border border-stroke bg-bg-secondary p-3 text-sm text-text-secondary">
                      <span className="font-semibold text-text-primary">旁白：</span>
                      {shot.narration}
                    </div>
                  ) : null}
                </div>
              ))}

              {lastRawResponse ? (
                <div className="rounded-xl border border-stroke bg-bg-primary p-4">
                  <div className="text-sm font-semibold text-text-primary">最近一次原始模型输出</div>
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-text-secondary">
                    {lastRawResponse}
                  </pre>
                </div>
              ) : null}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
