import { describe, expect, it } from "vitest";
import { importSceneBookFromSTWorld } from "./import-st";

// Helper: build a minimal ST world book JSON
function makeWorldBook(
  entries: Record<string, unknown>[] | Record<string, Record<string, unknown>>,
  name?: string,
): string {
  return JSON.stringify({ name, entries });
}

describe("importSceneBookFromSTWorld", () => {
  // ── Basic import ────────────────────────────────────────────────────

  describe("基础导入", () => {
    it("导入数组格式的 entries", () => {
      const json = makeWorldBook([
        { key: ["rain"], content: "rainy environment", comment: "Rain Scene" },
        { key: ["cafe"], content: "cozy cafe", comment: "Cafe" },
      ], "Test World");

      const sb = importSceneBookFromSTWorld(json);
      expect(sb.name).toBe("Test World");
      expect(sb.entries).toHaveLength(2);
      expect(sb.entries[0].name).toBe("Rain Scene");
      expect(sb.entries[0].keywords).toEqual(["rain"]);
      expect(sb.entries[0].content.environmentPrompt).toBe("rainy environment");
      expect(sb.entries[1].name).toBe("Cafe");
    });

    it("导入对象格式的 entries（Record<string, entry>）", () => {
      const json = makeWorldBook({
        "0": { key: ["forest"], content: "dense forest", comment: "Forest" },
        "1": { key: ["river"], content: "flowing river", comment: "River" },
      });

      const sb = importSceneBookFromSTWorld(json);
      expect(sb.entries).toHaveLength(2);
    });

    it("缺少 name 时使用 fallbackName", () => {
      const json = makeWorldBook([{ key: ["test"], content: "test" }]);
      const sb = importSceneBookFromSTWorld(json);
      expect(sb.name).toBe("ST 世界书");
    });

    it("自定义 fallbackName", () => {
      const json = makeWorldBook([{ key: ["test"], content: "test" }]);
      const sb = importSceneBookFromSTWorld(json, "My World");
      expect(sb.name).toBe("My World");
    });
  });

  // ── Field mapping ──────────────────────────────────────────────────

  describe("字段映射", () => {
    it("映射 key → keywords", () => {
      const json = makeWorldBook([{ key: ["rain", "storm"], content: "wet" }]);
      const sb = importSceneBookFromSTWorld(json);
      expect(sb.entries[0].keywords).toEqual(["rain", "storm"]);
    });

    it("映射 keysecondary → secondaryKeywords", () => {
      const json = makeWorldBook([
        { key: ["cafe"], keysecondary: ["night", "rain"], content: "test" },
      ]);
      const sb = importSceneBookFromSTWorld(json);
      expect(sb.entries[0].secondaryKeywords).toEqual(["night", "rain"]);
    });

    it("映射 content → environmentPrompt", () => {
      const json = makeWorldBook([
        { key: ["test"], content: "beautiful sunset over the ocean" },
      ]);
      const sb = importSceneBookFromSTWorld(json);
      expect(sb.entries[0].content.environmentPrompt).toBe(
        "beautiful sunset over the ocean",
      );
    });

    it("映射 comment → name（条目名）", () => {
      const json = makeWorldBook([
        { key: ["test"], content: "test", comment: "My Comment" },
      ]);
      const sb = importSceneBookFromSTWorld(json);
      expect(sb.entries[0].name).toBe("My Comment");
    });

    it("无 comment 时用第一个 key 作为 name", () => {
      const json = makeWorldBook([
        { key: ["forest", "woods"], content: "trees" },
      ]);
      const sb = importSceneBookFromSTWorld(json);
      expect(sb.entries[0].name).toBe("forest");
    });

    it("无 comment 无 key 时使用默认名", () => {
      const json = makeWorldBook([{ content: "something" }]);
      const sb = importSceneBookFromSTWorld(json);
      expect(sb.entries[0].name).toBe("ST 条目 1");
    });

    it("映射 constant → alwaysActive", () => {
      const json = makeWorldBook([
        { key: ["test"], content: "always on", constant: true },
      ]);
      const sb = importSceneBookFromSTWorld(json);
      expect(sb.entries[0].alwaysActive).toBe(true);
    });

    it("映射 disable → enabled（取反）", () => {
      const json = makeWorldBook([
        { key: ["test"], content: "disabled entry", disable: true },
      ]);
      const sb = importSceneBookFromSTWorld(json);
      expect(sb.entries[0].enabled).toBe(false);
    });

    it("映射 use_regex → useRegex", () => {
      const json = makeWorldBook([
        { key: ["rain.*"], content: "test", use_regex: true },
      ]);
      const sb = importSceneBookFromSTWorld(json);
      expect(sb.entries[0].useRegex).toBe(true);
    });

    it("映射 order → insertionOrder", () => {
      const json = makeWorldBook([
        { key: ["test"], content: "test", order: 42 },
      ]);
      const sb = importSceneBookFromSTWorld(json);
      expect(sb.entries[0].insertionOrder).toBe(42);
    });

    it("映射 uid → id 前缀", () => {
      const json = makeWorldBook([
        { key: ["test"], content: "test", uid: 7 },
      ]);
      const sb = importSceneBookFromSTWorld(json);
      expect(sb.entries[0].id).toBe("st-entry-7");
    });
  });

  // ── Defaults for missing fields ────────────────────────────────────

  describe("缺失字段的默认值", () => {
    it("缺失 key 默认空数组", () => {
      const json = makeWorldBook([{ content: "test" }]);
      const sb = importSceneBookFromSTWorld(json);
      expect(sb.entries[0].keywords).toEqual([]);
    });

    it("缺失 content 默认空字符串", () => {
      const json = makeWorldBook([{ key: ["test"] }]);
      const sb = importSceneBookFromSTWorld(json);
      expect(sb.entries[0].content.environmentPrompt).toBe("");
    });

    it("缺失 order 默认 100", () => {
      const json = makeWorldBook([{ key: ["test"], content: "test" }]);
      const sb = importSceneBookFromSTWorld(json);
      expect(sb.entries[0].insertionOrder).toBe(100);
    });

    it("usage 默认 shared", () => {
      const json = makeWorldBook([{ key: ["test"], content: "test" }]);
      const sb = importSceneBookFromSTWorld(json);
      expect(sb.entries[0].usage).toBe("shared");
    });

    it("directorContext 默认空字符串", () => {
      const json = makeWorldBook([{ key: ["test"], content: "test" }]);
      const sb = importSceneBookFromSTWorld(json);
      expect(sb.entries[0].content.directorContext).toBe("");
    });
  });

  // ── Error cases ────────────────────────────────────────────────────

  describe("错误处理", () => {
    it("无效 JSON 抛出异常", () => {
      expect(() => importSceneBookFromSTWorld("not json")).toThrow();
    });

    it("缺少 entries 抛出异常", () => {
      expect(() => importSceneBookFromSTWorld("{}")).toThrow("entries");
    });
  });

  // ── SceneBook structure ────────────────────────────────────────────

  describe("SceneBook 结构", () => {
    it("constants 默认为空", () => {
      const json = makeWorldBook([{ key: ["test"], content: "test" }]);
      const sb = importSceneBookFromSTWorld(json);
      expect(sb.constants).toEqual([]);
    });

    it("生成合法的 id 和时间戳", () => {
      const json = makeWorldBook([{ key: ["test"], content: "test" }]);
      const sb = importSceneBookFromSTWorld(json);
      expect(sb.id).toBeTruthy();
      expect(sb.createdAt).toBeGreaterThan(0);
      expect(sb.updatedAt).toBeGreaterThan(0);
    });
  });
});
