import { Field } from "../components/common/Field";
import { Panel } from "../components/common/Panel";
import { useCharacterStore } from "../stores/character";
import { usePresetStore } from "../stores/preset";
import { useProjectStore } from "../stores/project";
import { useSceneStore } from "../stores/scene";
import type { Project } from "../types/project";

interface WorkspaceHomePageProps {
  project?: Project;
}

export function WorkspaceHomePage({ project }: WorkspaceHomePageProps) {
  const characters = useCharacterStore((state) => state.characters);
  const sceneBooks = useSceneStore((state) => state.sceneBooks);
  const presets = usePresetStore((state) => state.presets);
  const addCharacter = useProjectStore((state) => state.addCharacter);
  const removeCharacter = useProjectStore((state) => state.removeCharacter);
  const setSceneBook = useProjectStore((state) => state.setSceneBook);
  const setPreset = useProjectStore((state) => state.setPreset);

  if (!project) {
    return (
      <Panel title="未选择项目" subtitle="先从 Dashboard 打开一个项目工作区。">
        <div className="rounded-2xl border border-dashed border-stroke p-6 text-sm text-text-muted">
          当前还没有活动项目。创建并进入一个项目后，这里会显示资产绑定与工作区概览。
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <Panel
        title={project.name}
        subtitle="这里先承接项目级概览，后面再挂接分镜编辑器和生成任务面板。"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-stroke bg-bg-primary/70 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Aspect</div>
              <div className="mt-2 text-lg font-semibold text-text-primary">
                {project.settings.aspectRatio}
              </div>
            </div>
            <div className="rounded-2xl border border-stroke bg-bg-primary/70 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Output</div>
              <div className="mt-2 text-lg font-semibold text-text-primary">
                {project.settings.outputFormat}
              </div>
            </div>
            <div className="rounded-2xl border border-stroke bg-bg-primary/70 p-4">
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
                <div className="rounded-2xl border border-dashed border-stroke p-4 text-sm text-text-muted">
                  还没有角色卡，先去角色页创建 1-2 个主角色。
                </div>
              ) : null}
              {characters.map((character) => {
                const linked = project.characterIds.includes(character.id);
                return (
                  <label
                    key={character.id}
                    className="flex items-start gap-3 rounded-2xl border border-stroke bg-bg-primary/60 p-4"
                  >
                    <input
                      checked={linked}
                      className="mt-1 h-4 w-4 accent-[#5ea4ff]"
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
                className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
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
                className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
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

            <div className="rounded-3xl border border-stroke bg-bg-primary/70 p-4 text-sm text-text-secondary">
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
          <p>3. 在导演预设里固定导演 system prompt 和默认视觉参数。</p>
          <p>4. 这些资产稳定后，再接一句话到结构化分镜 JSON 的导演链路。</p>
        </div>
      </Panel>
    </div>
  );
}
