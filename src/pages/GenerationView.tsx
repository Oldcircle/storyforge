import { useEffect, useMemo } from "react";
import { Panel } from "../components/common/Panel";
import { useCharacterStore } from "../stores/character";
import { useGenerationStore } from "../stores/generation";
import { usePresetStore } from "../stores/preset";
import { useRenderPresetStore } from "../stores/render-preset";
import { useSceneStore } from "../stores/scene";
import { useSettingsStore } from "../stores/settings";
import { useStoryboardStore } from "../stores/storyboard";
import { useWorkflowTemplateStore } from "../stores/workflow-template";
import type { Project } from "../types/project";

interface GenerationViewPageProps {
  project?: Project;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-stroke bg-bg-primary/70 p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-text-muted">{label}</div>
      <div className="mt-2 text-lg font-semibold text-text-primary">{value}</div>
    </div>
  );
}

function formatTimestamp(timestamp?: number): string {
  if (!timestamp) {
    return "—";
  }

  return new Date(timestamp).toLocaleString("zh-CN", {
    hour12: false
  });
}

export function GenerationViewPage({ project }: GenerationViewPageProps) {
  const characters = useCharacterStore((state) => state.characters);
  const sceneBooks = useSceneStore((state) => state.sceneBooks);
  const presets = usePresetStore((state) => state.presets);
  const renderPresets = useRenderPresetStore((state) => state.renderPresets);
  const settings = useSettingsStore((state) => state.settings);
  const storyboards = useStoryboardStore((state) => state.storyboards);
  const selected = useStoryboardStore((state) => state.selected);
  const loading = useStoryboardStore((state) => state.loading);
  const error = useStoryboardStore((state) => state.error);
  const loadByProject = useStoryboardStore((state) => state.loadByProject);
  const selectStoryboard = useStoryboardStore((state) => state.select);
  const workflowTemplates = useWorkflowTemplateStore((state) => state.workflowTemplates);
  const shotStatus = useGenerationStore((state) => state.shotStatus);
  const generatingAll = useGenerationStore((state) => state.generatingAll);
  const generateShot = useGenerationStore((state) => state.generateShot);
  const generateAllShots = useGenerationStore((state) => state.generateAllShots);

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

  const renderPreset = useMemo(() => {
    if (!project?.renderPresetId) {
      return undefined;
    }
    return renderPresets.find((item) => item.id === project.renderPresetId);
  }, [project, renderPresets]);

  const workflowTemplate = useMemo(() => {
    if (!project?.workflowTemplateId) {
      return undefined;
    }
    return workflowTemplates.find((item) => item.id === project.workflowTemplateId);
  }, [project, workflowTemplates]);

  const promptMode = project?.settings.promptMode ?? "rules";
  const selectedShots = selected?.shots ?? [];
  const generateAllInputs = useMemo(
    () =>
      selected && preset
        ? selectedShots.map((shot) => ({
            storyboardId: selected.id,
            storyboardUserPrompt: selected.userPrompt,
            shot,
            characters: linkedCharacters,
            sceneBook,
            preset,
            renderPreset,
            workflowTemplate,
            promptMode
          }))
        : [],
    [linkedCharacters, preset, promptMode, renderPreset, sceneBook, selected, selectedShots, workflowTemplate],
  );
  const completedCount = selectedShots.filter((shot) => {
    const status = shotStatus[shot.id];
    return status?.status === "completed" || Boolean(shot.generatedImage);
  }).length;

  if (!project) {
    return (
      <Panel title="未选择项目" subtitle="先从 Dashboard 进入一个项目工作区。">
        <div className="rounded-2xl border border-dashed border-stroke p-6 text-sm text-text-muted">
          还没有活动项目，暂时无法发起生图任务。
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <Panel
        title="生图工作台"
        subtitle="对当前项目的结构化分镜逐镜生成图片，并把结果直接写回 storyboard。"
        actions={
          <button
            className="rounded-full bg-accent-blue px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={
              generatingAll ||
              loading ||
              !selected ||
              selectedShots.length === 0 ||
              !preset ||
              !settings.comfyuiUrl.trim()
            }
            onClick={() => void generateAllShots(generateAllInputs)}
          >
            {generatingAll ? "批量生成中..." : "全部生成"}
          </button>
        }
      >
        <div className="grid gap-3 md:grid-cols-4">
          <StatCard label="分镜记录" value={storyboards.length} />
          <StatCard label="当前镜头数" value={selectedShots.length} />
          <StatCard label="已生成" value={completedCount} />
          <StatCard label="ComfyUI" value={settings.comfyuiUrl || "未配置"} />
        </div>

        <div className="mt-4 space-y-3">
          {error ? (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-text-secondary">
              {error}
            </div>
          ) : null}

          {!preset ? (
            <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-text-secondary">
              当前项目还没有绑定导演预设，生图阶段需要先继承预设里的分辨率、采样器和步数设置。
            </div>
          ) : null}

          {!sceneBook ? (
            <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-text-secondary">
              当前项目没有绑定场景书，镜头仍然可以生成，但环境锚点会明显变弱。
            </div>
          ) : null}

          {!renderPreset ? (
            <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-text-secondary">
              当前项目没有绑定渲染预设，将回退到导演预设里的基础采样参数，质量词包和负面词包不会生效。
            </div>
          ) : null}

          {linkedCharacters.length === 0 ? (
            <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-text-secondary">
              当前项目没有关联角色卡，生成出的画面会缺少角色一致性锚点。
            </div>
          ) : null}

          {!settings.comfyuiUrl.trim() ? (
            <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-text-secondary">
              还没有配置 ComfyUI 地址，请先去 Settings 填写并测试连接。
            </div>
          ) : null}

          {!workflowTemplate ? (
            <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4 text-sm text-text-secondary">
              当前项目没有显式绑定工作流模板，将回退到内置基础 txt2img 模板。
            </div>
          ) : null}

          {storyboards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stroke p-4 text-sm text-text-muted">
              当前项目还没有分镜记录，先去“分镜”页生成一条 storyboard。
            </div>
          ) : null}

          <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4 text-sm text-text-secondary">
            MVP 阶段直接使用 ComfyUI 的 `/view` 图片地址。如果图片不显示，通常需要用
            `--enable-cors-header` 启动 ComfyUI。
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Panel title="可用分镜" subtitle="选择一个 storyboard 作为当前生图批次。">
          <div className="space-y-2">
            {storyboards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stroke p-4 text-sm text-text-muted">
                暂时没有可生成的分镜。
              </div>
            ) : null}

            {storyboards.map((storyboard) => (
              <button
                key={storyboard.id}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  selected?.id === storyboard.id
                    ? "border-accent-blue/50 bg-accent-blue/10"
                    : "border-stroke bg-bg-primary/60 hover:border-stroke-strong"
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
          title={selected?.sceneTitle ?? "镜头列表"}
          subtitle={
            selected
              ? `Scene ${selected.sceneNumber} · 已完成 ${completedCount}/${selectedShots.length}`
              : "选择左侧分镜后查看镜头和生成结果。"
          }
        >
          {!selected ? (
            <div className="rounded-2xl border border-dashed border-stroke p-6 text-sm text-text-muted">
              还没有选中的分镜记录。
            </div>
          ) : (
            <div className="space-y-4">
              {selectedShots.map((shot) => {
                const localStatus = shotStatus[shot.id];
                const effectiveStatus = localStatus?.status || (shot.generatedImage ? "completed" : "idle");
                const errorMessage = localStatus?.error || shot.error;
                const previewUrl = localStatus?.imageUrl || shot.generatedImage;
                const execution = shot.execution;

                return (
                  <div key={shot.id} className="rounded-3xl border border-stroke bg-bg-primary/70 p-4">
                    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
                      <div className="overflow-hidden rounded-3xl border border-stroke bg-bg-secondary/70">
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt={`Shot ${shot.shotNumber}`}
                            className="h-full min-h-56 w-full object-cover"
                          />
                        ) : (
                          <div className="flex min-h-56 items-center justify-center p-6 text-center text-sm text-text-muted">
                            这个镜头还没有生成图片。
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
                              Shot {shot.shotNumber}
                            </div>
                            <div className="mt-1 text-lg font-semibold text-text-primary">
                              {shot.type} · {shot.duration}s
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="rounded-full border border-stroke px-3 py-1 font-mono text-xs text-text-muted">
                              {shot.cameraMovement}
                            </div>
                            <div className="rounded-full border border-stroke px-3 py-1 text-xs text-text-secondary">
                              {effectiveStatus}
                            </div>
                          </div>
                        </div>

                        <p className="text-sm text-text-secondary">{shot.description}</p>

                        {shot.characters.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
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

                        {shot.assembledPrompt ? (
                          <div className="rounded-2xl border border-stroke bg-bg-secondary/50 p-3">
                            <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
                              Prompt Package
                            </div>
                            <div className="mt-2 text-sm text-text-secondary">
                              <span className="font-semibold text-text-primary">Positive:</span>{" "}
                              {shot.assembledPrompt.positive}
                            </div>
                            {shot.assembledPrompt.negative ? (
                              <div className="mt-2 text-sm text-text-secondary">
                                <span className="font-semibold text-text-primary">Negative:</span>{" "}
                                {shot.assembledPrompt.negative}
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {execution ? (
                          <div className="rounded-2xl border border-stroke bg-bg-secondary/50 p-3 text-sm text-text-secondary">
                            <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
                              最近一次执行快照
                            </div>
                            <div className="mt-2 grid gap-2 md:grid-cols-2">
                              <div>
                                <span className="font-semibold text-text-primary">Adapter:</span>{" "}
                                {execution.adapterId}
                              </div>
                              <div>
                                <span className="font-semibold text-text-primary">状态:</span>{" "}
                                {execution.status}
                              </div>
                              <div>
                                <span className="font-semibold text-text-primary">工作流:</span>{" "}
                                {execution.request.workflowTemplateId || "内置基础模板"}
                              </div>
                              <div>
                                <span className="font-semibold text-text-primary">参数:</span>{" "}
                                {execution.request.width}x{execution.request.height} · {execution.request.steps ?? "-"} steps · CFG{" "}
                                {execution.request.cfgScale ?? "-"}
                              </div>
                              <div>
                                <span className="font-semibold text-text-primary">采样器:</span>{" "}
                                {execution.request.sampler || "—"}
                              </div>
                              <div>
                                <span className="font-semibold text-text-primary">CLIP Skip:</span>{" "}
                                {execution.request.clipSkip ?? "—"}
                              </div>
                              <div>
                                <span className="font-semibold text-text-primary">Checkpoint:</span>{" "}
                                {execution.request.checkpoint || "—"}
                              </div>
                              <div>
                                <span className="font-semibold text-text-primary">Seed:</span>{" "}
                                {execution.request.seed ?? "—"}
                              </div>
                              <div>
                                <span className="font-semibold text-text-primary">开始:</span>{" "}
                                {formatTimestamp(execution.startedAt)}
                              </div>
                              <div className="md:col-span-2">
                                <span className="font-semibold text-text-primary">结束:</span>{" "}
                                {formatTimestamp(execution.finishedAt)}
                              </div>
                            </div>
                          </div>
                        ) : null}

                        {errorMessage ? (
                          <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-text-secondary">
                            {errorMessage}
                          </div>
                        ) : null}

                        <div className="flex flex-wrap gap-3">
                          <button
                            className="rounded-full bg-accent-blue px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={!preset || !settings.comfyuiUrl.trim() || effectiveStatus === "generating"}
                            onClick={() => {
                              if (!preset) {
                                return;
                              }
                              void generateShot({
                                storyboardId: selected.id,
                                storyboardUserPrompt: selected.userPrompt,
                                shot,
                                characters: linkedCharacters,
                                sceneBook,
                                preset,
                                renderPreset,
                                workflowTemplate,
                                promptMode
                              });
                            }}
                          >
                            {effectiveStatus === "generating"
                              ? "生成中..."
                              : previewUrl
                                ? "重新生成"
                                : "生成图片"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
