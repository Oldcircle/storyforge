import { useEffect, useMemo, useState } from "react";
import { Header } from "./components/layout/Header";
import { Sidebar, type SidebarItem } from "./components/layout/Sidebar";
import { CharacterEditorPage } from "./pages/CharacterEditor";
import { DashboardPage } from "./pages/Dashboard";
import { GenerationViewPage } from "./pages/GenerationView";
import { PresetEditorPage } from "./pages/PresetEditor";
import { RenderPresetEditorPage } from "./pages/RenderPresetEditor";
import { SceneEditorPage } from "./pages/SceneEditor";
import { SettingsPage } from "./pages/Settings";
import { StoryboardViewPage } from "./pages/StoryboardView";
import { WorkspaceHomePage } from "./pages/WorkspaceHome";
import { useCharacterStore } from "./stores/character";
import { usePresetStore } from "./stores/preset";
import { useProjectStore } from "./stores/project";
import { useRenderPresetStore } from "./stores/render-preset";
import { useSceneStore } from "./stores/scene";
import { useWorkflowTemplateStore } from "./stores/workflow-template";
import { importProjectBundle } from "./utils/import-export";

type Route =
  | { page: "dashboard" }
  | { page: "settings" }
  | { page: "presets" }
  | { page: "render-presets" }
  | { page: "project"; projectId: string; tab: "home" | "characters" | "scenes" | "storyboard" | "generation" };

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#/, "");
  if (hash === "settings") {
    return { page: "settings" };
  }
  if (hash === "presets") {
    return { page: "presets" };
  }
  if (hash === "render-presets") {
    return { page: "render-presets" };
  }
  if (hash.startsWith("project/")) {
    const [, projectId, tab] = hash.split("/");
    if (projectId) {
      const normalizedTab =
        tab === "characters" ||
        tab === "scenes" ||
        tab === "storyboard" ||
        tab === "generation"
          ? tab
          : "home";
      return { page: "project", projectId, tab: normalizedTab };
    }
  }
  return { page: "dashboard" };
}

function navigate(hash: string): void {
  window.location.hash = hash;
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseHash());
  const projects = useProjectStore((state) => state.projects);
  const currentProject = useProjectStore((state) => state.current);
  const loadProjects = useProjectStore((state) => state.loadAll);
  const selectProject = useProjectStore((state) => state.select);
  const createProject = useProjectStore((state) => state.create);
  const loadCharacters = useCharacterStore((state) => state.loadAll);
  const loadSceneBooks = useSceneStore((state) => state.loadAll);
  const loadPresets = usePresetStore((state) => state.loadAll);
  const loadRenderPresets = useRenderPresetStore((state) => state.loadAll);
  const loadWorkflowTemplates = useWorkflowTemplateStore((state) => state.loadAll);

  useEffect(() => {
    void Promise.all([
      loadProjects(),
      loadCharacters(),
      loadSceneBooks(),
      loadPresets(),
      loadRenderPresets(),
      loadWorkflowTemplates()
    ]);
  }, [loadCharacters, loadPresets, loadRenderPresets, loadProjects, loadSceneBooks, loadWorkflowTemplates]);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (route.page === "project") {
      void selectProject(route.projectId);
    }
  }, [route, selectProject]);

  const activeProject = useMemo(() => {
    if (route.page === "project") {
      return projects.find((project) => project.id === route.projectId) ?? currentProject;
    }

    return currentProject;
  }, [currentProject, projects, route]);

  const sidebarItems = useMemo<SidebarItem[]>(() => {
    const projectId = activeProject?.id;
    const inProject = Boolean(projectId);
    return [
      { key: "home", label: "项目总览", hash: projectId ? `project/${projectId}` : "" },
      {
        key: "characters",
        label: "角色卡",
        hash: projectId ? `project/${projectId}/characters` : "",
        disabled: !inProject
      },
      {
        key: "scenes",
        label: "场景书",
        hash: projectId ? `project/${projectId}/scenes` : "",
        disabled: !inProject
      },
      {
        key: "storyboard",
        label: "分镜",
        hash: projectId ? `project/${projectId}/storyboard` : "",
        disabled: !inProject
      },
      {
        key: "generation",
        label: "生成",
        hash: projectId ? `project/${projectId}/generation` : "",
        disabled: !inProject
      },
      { key: "presets", label: "导演预设", hash: "presets" },
      { key: "render-presets", label: "渲染预设", hash: "render-presets" },
      { key: "settings", label: "设置", hash: "settings" }
    ];
  }, [activeProject?.id]);

  const activeSidebarKey =
    route.page === "project"
      ? route.tab
      : route.page === "presets"
        ? "presets"
      : route.page === "render-presets"
        ? "render-presets"
      : route.page === "settings"
          ? "settings"
          : route.page === "dashboard" && activeProject
            ? "home"
            : "home";

  const content = (() => {
    if (route.page === "dashboard") {
      return (
        <DashboardPage
          projects={projects}
          onCreate={async (name, description) => {
            const projectId = await createProject(name, description);
            navigate(`project/${projectId}`);
          }}
          onOpenProject={(projectId) => navigate(`project/${projectId}`)}
          onImportProject={async (json) => {
            const bundle = importProjectBundle(json);
            // Save all assets
            for (const char of bundle.characters) {
              await useCharacterStore.getState().createFromData(char);
            }
            if (bundle.sceneBook) {
              await useSceneStore.getState().createFromData(bundle.sceneBook);
            }
            if (bundle.directorPreset) {
              await usePresetStore.getState().createFromData(bundle.directorPreset);
            }
            if (bundle.renderPreset) {
              await useRenderPresetStore.getState().createFromData(bundle.renderPreset);
            }
            await useProjectStore.getState().createFromData(bundle.project);
            navigate(`project/${bundle.project.id}`);
          }}
        />
      );
    }

    if (route.page === "settings") {
      return <SettingsPage />;
    }

    if (route.page === "presets") {
      return <PresetEditorPage />;
    }

    if (route.page === "render-presets") {
      return <RenderPresetEditorPage />;
    }

    if (route.page === "project") {
      switch (route.tab) {
        case "characters":
          return <CharacterEditorPage />;
        case "scenes":
          return <SceneEditorPage />;
        case "storyboard":
          return <StoryboardViewPage project={activeProject} />;
        case "generation":
          return <GenerationViewPage project={activeProject} />;
        case "home":
        default:
          return <WorkspaceHomePage project={activeProject} />;
      }
    }

    return null;
  })();

  return (
    <div className="min-h-screen text-text-primary">
      <Header
        projectName={activeProject?.name}
        onOpenDashboard={() => navigate(activeProject ? `project/${activeProject.id}` : "")}
        onOpenSettings={() => navigate("settings")}
      />
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1600px] flex-col md:flex-row">
        <Sidebar
          items={sidebarItems}
          activeKey={activeSidebarKey}
          onNavigate={(hash) => navigate(hash)}
        />
        <main className="flex-1 p-4 md:p-8 md:pt-6">{content}</main>
      </div>
    </div>
  );
}
