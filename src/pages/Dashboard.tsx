import { useMemo, useRef, useState } from "react";
import { Panel } from "../components/common/Panel";
import type { Project } from "../types/project";

interface DashboardPageProps {
  projects: Project[];
  onCreate: (name: string, description: string) => Promise<void>;
  onOpenProject: (projectId: string) => void;
  onImportProject?: (json: string) => Promise<void>;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric"
  });
}

export function DashboardPage({ projects, onCreate, onOpenProject, onImportProject }: DashboardPageProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

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
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <Panel
          title="项目控制台"
          subtitle="管理工作区、资产和导演预设。"
        >
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-accent-blue/15 bg-accent-blue/5 p-4">
              <div className="text-xs font-medium uppercase tracking-wider text-accent-blue/70">Projects</div>
              <div className="mt-2 text-2xl font-bold text-text-primary">
                {projectSummary.totalProjects}
              </div>
            </div>
            <div className="rounded-xl border border-accent-mint/15 bg-accent-mint/5 p-4">
              <div className="text-xs font-medium uppercase tracking-wider text-accent-mint/70">Linked Roles</div>
              <div className="mt-2 text-2xl font-bold text-text-primary">
                {projectSummary.totalCharacters}
              </div>
            </div>
            <div className="rounded-xl border border-accent-indigo/15 bg-accent-indigo/5 p-4">
              <div className="text-xs font-medium uppercase tracking-wider text-accent-indigo/70">Phase</div>
              <div className="mt-2 text-sm font-semibold text-text-primary">
                3.6 — Hires Fix
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="新建项目" subtitle="创建工作区，挂接角色卡和场景书。">
          <div className="space-y-3">
            <input
              className="w-full rounded-xl border border-stroke bg-bg-tertiary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/15"
              placeholder="例如：都市爱情试验片"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <textarea
              className="min-h-24 w-full rounded-xl border border-stroke bg-bg-tertiary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/15"
              placeholder="记录项目目标、风格或验证假设"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-xl bg-accent-blue px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
                disabled={submitting || !name.trim()}
                onClick={() => void handleCreate()}
              >
                {submitting ? "创建中..." : "创建项目"}
              </button>
              {onImportProject && (
                <button
                  className="rounded-xl border border-stroke px-4 py-2.5 text-sm text-text-secondary transition hover:border-stroke-strong hover:text-text-primary"
                  onClick={() => importRef.current?.click()}
                >
                  导入项目
                </button>
              )}
              <input
                ref={importRef}
                accept=".json,application/json"
                className="hidden"
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file && onImportProject) {
                    void file.text().then((text) => {
                      void onImportProject(text).then(() => {
                        setNotice("项目导入成功");
                      }).catch((err: unknown) => {
                        setNotice(err instanceof Error ? err.message : String(err));
                      });
                    });
                  }
                  event.target.value = "";
                }}
              />
            </div>
            {notice && (
              <div className="rounded-xl border border-accent-mint/30 bg-accent-mint/10 p-3 text-xs text-text-secondary">
                {notice}
              </div>
            )}
          </div>
        </Panel>
      </div>

      <Panel title="项目列表" subtitle="点击进入工作区。">
        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stroke p-10 text-center text-sm text-text-muted">
            还没有项目。先创建一个 MVP 工作区，我们再往里面接角色和场景。
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <button
                key={project.id}
                className="group rounded-xl border border-stroke bg-bg-tertiary p-5 text-left transition hover:border-accent-blue/30 hover:bg-bg-tertiary"
                onClick={() => onOpenProject(project.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-text-primary group-hover:text-accent-blue transition">{project.name}</h3>
                  </div>
                  <div className="rounded-lg border border-stroke px-2 py-0.5 font-mono text-xs text-text-muted">
                    {project.settings.aspectRatio}
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-text-secondary">
                  {project.description || "还没有项目描述。"}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-text-muted">
                  <span>{project.characterIds.length} 个角色</span>
                  <span>{formatDate(project.updatedAt)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
