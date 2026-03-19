import { Field } from "../components/common/Field";
import { Panel } from "../components/common/Panel";
import { useCharacterStore } from "../stores/character";
import { usePresetStore } from "../stores/preset";
import { useProjectStore } from "../stores/project";
import { useRenderPresetStore } from "../stores/render-preset";
import { useSceneStore } from "../stores/scene";
import { useWorkflowTemplateStore } from "../stores/workflow-template";
import type { Project } from "../types/project";
import { downloadTextFile, exportProjectBundle } from "../utils/import-export";
import type { ProjectBundle } from "../utils/import-export";

interface WorkspaceHomePageProps {
  project?: Project;
}

export function WorkspaceHomePage({ project }: WorkspaceHomePageProps) {
  const characters = useCharacterStore((state) => state.characters);
  const sceneBooks = useSceneStore((state) => state.sceneBooks);
  const presets = usePresetStore((state) => state.presets);
  const renderPresets = useRenderPresetStore((state) => state.renderPresets);
  const workflowTemplates = useWorkflowTemplateStore((state) => state.workflowTemplates);
  const addCharacter = useProjectStore((state) => state.addCharacter);
  const removeCharacter = useProjectStore((state) => state.removeCharacter);
  const setSceneBook = useProjectStore((state) => state.setSceneBook);
  const setPreset = useProjectStore((state) => state.setPreset);
  const setRenderPreset = useProjectStore((state) => state.setRenderPreset);
  const setWorkflowTemplate = useProjectStore((state) => state.setWorkflowTemplate);
  const setPromptMode = useProjectStore((state) => state.setPromptMode);

  if (!project) {
    return (
      <Panel title="未选择项目" subtitle="先从 Dashboard 打开一个项目工作区。">
        <div className="rounded-2xl border border-dashed border-stroke/60 bg-bg-primary/30 p-8 text-sm text-text-muted">
          当前还没有活动项目。创建并进入一个项目后，这里会显示资产绑定与工作区概览。
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <Panel
        title={project.name}
        subtitle="项目工作区概览与资产绑定。"
        actions={
          <button
            className="rounded-xl border border-stroke/60 bg-bg-tertiary/30 px-4 py-2.5 text-sm text-text-secondary transition hover:border-stroke hover:bg-bg-tertiary hover:text-text-primary hover:shadow-sm"
            onClick={() => {
              const linkedChars = characters.filter((c) => project.characterIds.includes(c.id));
              const linkedScene = sceneBooks.find((s) => s.id === project.sceneBookId);
              const linkedPreset = presets.find((p) => p.id === project.presetId);
              const linkedRP = renderPresets.find((r) => r.id === project.renderPresetId);
              const bundle: ProjectBundle = {
                version: 1,
                project,
                characters: linkedChars,
                sceneBook: linkedScene,
                directorPreset: linkedPreset,
                renderPreset: linkedRP,
              };
              downloadTextFile(
                `${project.name || "project"}.storyforge.json`,
                exportProjectBundle(bundle),
              );
            }}
          >
            导出项目
          </button>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-stroke/50 bg-bg-primary/50 p-4 shadow-inner">
              <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Aspect</div>
              <div className="mt-2 text-lg font-semibold text-text-primary">
                {project.settings.aspectRatio}
              </div>
            </div>
            <div className="rounded-xl border border-stroke/50 bg-bg-primary/50 p-4 shadow-inner">
              <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Output</div>
              <div className="mt-2 text-lg font-semibold text-text-primary">
                {project.settings.outputFormat}
              </div>
            </div>
            <div className="rounded-xl border border-stroke/50 bg-bg-primary/50 p-4 shadow-inner">
              <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Status</div>
            <div className="mt-2 text-lg font-semibold text-text-primary">Ready for assets</div>
          </div>
        </div>
      </Panel>

      <Panel
        title="项目资产绑定"
        subtitle="这一层把项目上下文收束好，后面导演引擎会基于这些绑定组织 prompt。"
      >
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">角色卡</h3>
              <p className="mt-1 text-xs text-text-muted">勾选当前项目会参与导演规划的角色。</p>
            </div>
            <div className="space-y-2">
              {characters.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stroke/60 bg-bg-primary/30 p-6 text-sm text-text-muted">
                  还没有角色卡，先去角色页创建 1-2 个主角色。
                </div>
              ) : null}
              {characters.map((character) => {
                const linked = project.characterIds.includes(character.id);
                return (
                  <label
                    key={character.id}
                    className="flex items-start gap-3 rounded-xl border border-stroke bg-bg-primary/60 p-4"
                  >
                    <input
                      checked={linked}
                      className="mt-1 h-4 w-4 rounded border-stroke accent-accent-blue"
                      type="checkbox"
                      onChange={(event) => {
                        if (event.target.checked) {
                          void addCharacter(project.id, character.id);
                          return;
                        }
                        void removeCharacter(project.id, character.id);
                      }}
                    />
                    <div>
                      <div className="text-sm font-semibold text-text-primary">{character.name}</div>
                      <div className="mt-1 text-xs text-text-muted">
                        {character.appearance.basePrompt || "尚未填写视觉 prompt"}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <Field label="场景书">
              <select
                className="w-full rounded-xl border border-stroke/60 bg-bg-tertiary/50 px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                value={project.sceneBookId ?? ""}
                onChange={(event) =>
                  void setSceneBook(project.id, event.target.value || undefined)
                }
              >
                <option value="">未选择</option>
                {sceneBooks.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="导演预设">
              <select
                className="w-full rounded-xl border border-stroke/60 bg-bg-tertiary/50 px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                value={project.presetId ?? ""}
                onChange={(event) => void setPreset(project.id, event.target.value || undefined)}
              >
                <option value="">未选择</option>
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="渲染预设">
              <select
                className="w-full rounded-xl border border-stroke/60 bg-bg-tertiary/50 px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                value={project.renderPresetId ?? ""}
                onChange={(event) =>
                  void setRenderPreset(project.id, event.target.value || undefined)
                }
              >
                <option value="">未选择（回退导演预设参数）</option>
                {renderPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="工作流模板">
              <select
                className="w-full rounded-xl border border-stroke/60 bg-bg-tertiary/50 px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                value={project.workflowTemplateId ?? ""}
                onChange={(event) =>
                  void setWorkflowTemplate(project.id, event.target.value || undefined)
                }
              >
                <option value="">内置基础模板</option>
                {workflowTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Prompt 模式">
              <select
                className="w-full rounded-xl border border-stroke/60 bg-bg-tertiary/50 px-4 py-2.5 hover:border-stroke-strong text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10"
                value={project.settings.promptMode ?? "rules"}
                onChange={(event) =>
                  void setPromptMode(project.id, event.target.value as "rules" | "llm-assisted" | "llm-writer")
                }
              >
                <option value="rules">规则模式 — 角色卡 + 场景书 + 渲染预设纯编译</option>
                <option value="llm-assisted">LLM 增强 — 导演 LLM 生成视觉草案，程序收口</option>
                <option value="llm-writer">LLM 写手 — LLM 直接撰写聚焦的 SD prompt（推荐）</option>
              </select>
              <p className="mt-1 text-xs text-text-muted">
                {(() => {
                  const mode = project.settings.promptMode ?? "rules";
                  if (mode === "llm-writer") return "每个镜头生图前，LLM 根据素材写一段 60-80 词的聚焦 prompt，质量词和负面词由渲染预设包装。出图质量最好，每镜头多一次 LLM 调用。";
                  if (mode === "llm-assisted") return "LLM 在生成分镜时额外输出 visualIntent，与资产层合并后生图。角色一致性词强制注入不受影响。";
                  return "Prompt 完全由资产层机械编译，完全可复现。";
                })()}
              </p>
            </Field>

            <div className="rounded-xl border border-stroke/50 bg-bg-primary/50 p-4 shadow-inner text-sm text-text-secondary">
              <div className="font-semibold text-text-primary">当前绑定摘要</div>
              <div className="mt-3 space-y-2">
                <p>角色数：{project.characterIds.length}</p>
                <p>
                  场景书：
                  {" "}
                  {sceneBooks.find((book) => book.id === project.sceneBookId)?.name ?? "未设置"}
                </p>
                <p>
                  预设：
                  {" "}
                  {presets.find((preset) => preset.id === project.presetId)?.name ?? "未设置"}
                </p>
                <p>
                  渲染预设：
                  {" "}
                  {renderPresets.find((preset) => preset.id === project.renderPresetId)?.name ?? "未设置"}
                </p>
                <p>
                  工作流：
                  {" "}
                  {workflowTemplates.find((template) => template.id === project.workflowTemplateId)?.name ?? "内置基础模板"}
                </p>
                <p>
                  Prompt 模式：
                  {" "}
                  {(() => {
                    const mode = project.settings.promptMode ?? "rules";
                    if (mode === "llm-writer") return "LLM 写手";
                    if (mode === "llm-assisted") return "LLM 增强";
                    return "规则";
                  })()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel
        title="下一步"
        subtitle="稳定路线是：先准备角色卡、场景书和导演预设，再进入一句话生成分镜。"
      >
        <div className="space-y-3 text-sm text-text-secondary">
          <p>1. 在左侧进入角色卡页面，先创建 1-2 个可以稳定复用的角色。</p>
          <p>2. 在场景书页面录入最常见的环境条目和触发关键词。</p>
          <p>3. 在导演预设里固定导演 system prompt，再用渲染预设锁定质量词和默认参数。</p>
          <p>4. 选择合适的工作流模板后，再进入一句话生成分镜和逐镜生图。</p>
        </div>
      </Panel>
    </div>
  );
}
