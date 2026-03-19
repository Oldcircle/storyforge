import { describe, expect, it } from "vitest";
import {
  buildCharacterCard,
  buildSceneBook,
  createBuiltinTxt2imgTemplate,
  createDefaultPreset,
  createDefaultRenderPreset,
  createEmptyCharacter,
  createEmptySceneBook,
  createProject,
  createSceneEntry,
} from "./defaults";

describe("defaults 工厂函数", () => {
  // ── Character ────────────────────────────────────────────────────

  describe("createEmptyCharacter", () => {
    it("生成合法角色卡", () => {
      const char = createEmptyCharacter();
      expect(char.id).toBeTruthy();
      expect(char.name).toBe("未命名角色");
      expect(char.appearance.basePrompt).toBeDefined();
      expect(char.appearance.negativePrompt).toBeTruthy();
      expect(char.expressions).toHaveProperty("neutral");
      expect(char.outfits).toHaveProperty("default");
      expect(char.createdAt).toBeGreaterThan(0);
      expect(char.updatedAt).toBe(char.createdAt);
    });

    it("每次调用生成不同 id", () => {
      const a = createEmptyCharacter();
      const b = createEmptyCharacter();
      expect(a.id).not.toBe(b.id);
    });
  });

  describe("buildCharacterCard", () => {
    it("覆盖 name 保留其余默认值", () => {
      const char = buildCharacterCard({ name: "Kirito" });
      expect(char.name).toBe("Kirito");
      expect(char.appearance.negativePrompt).toBeTruthy(); // 保留默认
    });

    it("深层合并 appearance", () => {
      const char = buildCharacterCard({
        appearance: {
          basePrompt: "1boy, black hair",
          negativePrompt: "deformed",
          styleModifiers: "",
        },
      });
      expect(char.appearance.basePrompt).toBe("1boy, black hair");
      expect(char.appearance.negativePrompt).toBe("deformed");
    });
  });

  // ── SceneBook ────────────────────────────────────────────────────

  describe("createSceneEntry", () => {
    it("生成合法场景条目", () => {
      const entry = createSceneEntry("Test Entry");
      expect(entry.id).toBeTruthy();
      expect(entry.name).toBe("Test Entry");
      expect(entry.enabled).toBe(true);
      expect(entry.usage).toBe("shared");
      expect(entry.keywords).toEqual([]);
      expect(entry.insertionOrder).toBe(100);
    });
  });

  describe("createEmptySceneBook", () => {
    it("生成带一个默认条目的场景书", () => {
      const sb = createEmptySceneBook();
      expect(sb.id).toBeTruthy();
      expect(sb.name).toBe("未命名场景书");
      expect(sb.constants).toEqual([]);
      expect(sb.entries).toHaveLength(1);
    });
  });

  describe("buildSceneBook", () => {
    it("覆盖 name 保留默认 entries", () => {
      const sb = buildSceneBook({ name: "SAO Scenes" });
      expect(sb.name).toBe("SAO Scenes");
      expect(sb.entries).toHaveLength(1); // 默认条目
    });

    it("传入 entries 时覆盖默认", () => {
      const sb = buildSceneBook({ entries: [] });
      expect(sb.entries).toHaveLength(0);
    });
  });

  // ── DirectorPreset ───────────────────────────────────────────────

  describe("createDefaultPreset", () => {
    it("生成合法导演预设", () => {
      const preset = createDefaultPreset();
      expect(preset.id).toBeTruthy();
      expect(preset.name).toBeTruthy();
      expect(preset.systemPrompt).toContain("{{characters}}");
      expect(preset.systemPrompt).toContain("{{scenes}}");
      expect(preset.llm.temperature).toBeGreaterThan(0);
      expect(preset.llm.maxTokens).toBeGreaterThan(0);
      expect(preset.defaultImageAdapter).toBe("comfyui");
    });
  });

  // ── RenderPreset ─────────────────────────────────────────────────

  describe("createDefaultRenderPreset", () => {
    it("生成合法渲染预设", () => {
      const rp = createDefaultRenderPreset();
      expect(rp.id).toBeTruthy();
      expect(rp.positivePrefix.length).toBeGreaterThan(0);
      expect(rp.negativePrompt.length).toBeGreaterThan(0);
      expect(rp.defaults.steps).toBeGreaterThan(0);
      expect(rp.defaults.cfgScale).toBeGreaterThan(0);
      expect(rp.defaults.width).toBeGreaterThan(0);
      expect(rp.defaults.height).toBeGreaterThan(0);
      expect(rp.defaults.scheduler).toBe("exponential");
    });

    it("hires 默认关闭", () => {
      const rp = createDefaultRenderPreset();
      expect(rp.hires?.enabled).toBe(false);
    });

    it("包含 promptWriterPrompt", () => {
      const rp = createDefaultRenderPreset();
      expect(rp.promptWriterPrompt).toBeTruthy();
      expect(rp.promptWriterPrompt).toContain("Stable Diffusion");
    });
  });

  // ── Project ──────────────────────────────────────────────────────

  describe("createProject", () => {
    it("生成合法项目", () => {
      const proj = createProject("Test Project", "desc");
      expect(proj.id).toBeTruthy();
      expect(proj.name).toBe("Test Project");
      expect(proj.description).toBe("desc");
      expect(proj.characterIds).toEqual([]);
      expect(proj.storyboardIds).toEqual([]);
      expect(proj.settings.outputFormat).toBe("image_sequence");
    });

    it("默认绑定内置工作流模板", () => {
      const proj = createProject("Test");
      expect(proj.workflowTemplateId).toBe("builtin:comfyui-basic-txt2img");
    });
  });

  // ── WorkflowTemplate ────────────────────────────────────────────

  describe("createBuiltinTxt2imgTemplate", () => {
    it("生成内置工作流模板", () => {
      const wt = createBuiltinTxt2imgTemplate();
      expect(wt.id).toBe("builtin:comfyui-basic-txt2img");
      expect(wt.adapter).toBe("comfyui");
      expect(wt.builtin).toBe(true);
      expect(wt.slots).toHaveProperty("checkpoint");
      expect(wt.slots).toHaveProperty("positive");
      expect(wt.slots).toHaveProperty("negative");
      expect(wt.slots).toHaveProperty("seed");
    });
  });
});
