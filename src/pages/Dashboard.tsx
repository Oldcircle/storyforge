import { useMemo, useState } from "react";
import { Panel } from "../components/common/Panel";
import type { Project } from "../types/project";

interface DashboardPageProps {
  projects: Project[];
  onCreate: (name: string, description: string) => Promise<void>;
  onOpenProject: (projectId: string) => void;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric"
  });
}

export function DashboardPage({ projects, onCreate, onOpenProject }: DashboardPageProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const projectSummary = useMemo(() => {
    return {
      totalProjects: projects.length,
      totalCharacters: projects.reduce((count, project) => count + project.characterIds.length, 0)
    };
  }, [projects]);

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }
    setSubmitting(true);
    try {
      await onCreate(trimmedName, description.trim());
      setName("");
      setDescription("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <Panel
          title="项目控制台"
          subtitle="先把工作区、资产和导演预设稳定下来，再进入模型与生成链路。"
        >
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-stroke bg-bg-primary/70 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Projects</div>
              <div className="mt-2 text-3xl font-semibold text-text-primary">
                {projectSummary.totalProjects}
              </div>
            </div>
            <div className="rounded-2xl border border-stroke bg-bg-primary/70 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Linked Roles</div>
              <div className="mt-2 text-3xl font-semibold text-text-primary">
                {projectSummary.totalCharacters}
              </div>
            </div>
            <div className="rounded-2xl border border-stroke bg-bg-primary/70 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Current Goal</div>
              <div className="mt-2 text-sm font-medium text-text-secondary">
                Phase 0 + thin Phase 1
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="新建项目" subtitle="先创建一个最小工作区，后面再挂角色卡和场景书。">
          <div className="space-y-3">
            <input
              className="w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
              placeholder="例如：都市爱情试验片"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <textarea
              className="min-h-28 w-full rounded-2xl border border-stroke bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-accent-blue"
              placeholder="记录项目目标、风格或验证假设"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <button
              className="rounded-2xl bg-accent-blue px-4 py-3 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
              disabled={submitting || !name.trim()}
              onClick={() => void handleCreate()}
            >
              {submitting ? "创建中..." : "创建项目"}
            </button>
          </div>
        </Panel>
      </div>

      <Panel title="项目列表" subtitle="点击任意项目进入工作区。">
        {projects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stroke p-8 text-center text-text-muted">
            还没有项目。先创建一个 MVP 工作区，我们再往里面接角色和场景。
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <button
                key={project.id}
                className="group rounded-[28px] border border-stroke bg-bg-primary/70 p-5 text-left transition hover:-translate-y-0.5 hover:border-stroke-strong"
                onClick={() => onOpenProject(project.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-text-muted">Project</div>
                    <h3 className="mt-2 text-lg font-semibold text-text-primary">{project.name}</h3>
                  </div>
                  <div className="rounded-full border border-stroke px-3 py-1 font-mono text-xs text-text-muted">
                    {project.settings.aspectRatio}
                  </div>
                </div>
                <p className="mt-3 line-clamp-3 min-h-14 text-sm text-text-secondary">
                  {project.description || "还没有项目描述。"}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-text-muted">
                  <span>{project.characterIds.length} 个角色</span>
                  <span>更新于 {formatDate(project.updatedAt)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
