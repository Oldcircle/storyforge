import { describe, expect, it } from "vitest";
import type { SceneEntry } from "../types/scene";
import { KeywordMatcher } from "./keyword-matcher";

function makeEntry(overrides: Partial<SceneEntry> = {}): SceneEntry {
  return {
    id: "entry-1",
    name: "Test Entry",
    enabled: true,
    usage: "shared",
    keywords: [],
    alwaysActive: false,
    content: { environmentPrompt: "" },
    insertionOrder: 100,
    ...overrides,
  };
}

describe("KeywordMatcher", () => {
  const matcher = new KeywordMatcher();

  // ── Basic keyword matching ──────────────────────────────────────────

  describe("基础关键词匹配", () => {
    it("大小写不敏感匹配", () => {
      const entries = [makeEntry({ keywords: ["Rain"] })];
      const result = matcher.match("walking in the rain", entries);
      expect(result).toHaveLength(1);
      expect(result[0].reason).toBe("keyword_match");
      expect(result[0].matchedKeywords).toContain("Rain");
    });

    it("多关键词 OR 匹配（任一命中即可）", () => {
      const entries = [makeEntry({ keywords: ["rain", "snow"] })];
      expect(matcher.match("it's raining", entries)).toHaveLength(1);
      expect(matcher.match("it's snowing", entries)).toHaveLength(1);
    });

    it("无关键词命中时不激活", () => {
      const entries = [makeEntry({ keywords: ["rain"] })];
      expect(matcher.match("sunny day", entries)).toHaveLength(0);
    });

    it("disabled 条目跳过", () => {
      const entries = [makeEntry({ keywords: ["rain"], enabled: false })];
      expect(matcher.match("rain", entries)).toHaveLength(0);
    });

    it("空关键词列表不匹配", () => {
      const entries = [makeEntry({ keywords: [] })];
      expect(matcher.match("anything", entries)).toHaveLength(0);
    });

    it("空白关键词被过滤", () => {
      const entries = [makeEntry({ keywords: ["", "  ", "rain"] })];
      const result = matcher.match("rain", entries);
      expect(result).toHaveLength(1);
      expect(result[0].matchedKeywords).toEqual(["rain"]);
    });
  });

  // ── alwaysActive ────────────────────────────────────────────────────

  describe("alwaysActive 条目", () => {
    it("始终被激活", () => {
      const entries = [makeEntry({ alwaysActive: true })];
      const result = matcher.match("any text", entries);
      expect(result).toHaveLength(1);
      expect(result[0].reason).toBe("always_active");
      expect(result[0].matchedKeywords).toEqual([]);
    });

    it("disabled 的 alwaysActive 不激活", () => {
      const entries = [makeEntry({ alwaysActive: true, enabled: false })];
      expect(matcher.match("any text", entries)).toHaveLength(0);
    });
  });

  // ── Regex matching ──────────────────────────────────────────────────

  describe("正则匹配", () => {
    it("useRegex 模式下用正则匹配", () => {
      const entries = [
        makeEntry({ keywords: ["rain(y|ing)"], useRegex: true }),
      ];
      expect(matcher.match("rainy day", entries)).toHaveLength(1);
      expect(matcher.match("raining hard", entries)).toHaveLength(1);
    });

    it("正则大小写不敏感", () => {
      const entries = [makeEntry({ keywords: ["RAIN"], useRegex: true })];
      expect(matcher.match("rain", entries)).toHaveLength(1);
    });
  });

  // ── Secondary keywords (AND) ───────────────────────────────────────

  describe("次要关键词（AND 条件）", () => {
    it("主关键词匹配但次要关键词不满足时不激活", () => {
      const entries = [
        makeEntry({
          keywords: ["cafe"],
          secondaryKeywords: ["rain", "night"],
        }),
      ];
      expect(matcher.match("cafe in the sunshine", entries)).toHaveLength(0);
    });

    it("主关键词和所有次要关键词都满足时激活", () => {
      const entries = [
        makeEntry({
          keywords: ["cafe"],
          secondaryKeywords: ["rain", "night"],
        }),
      ];
      expect(matcher.match("rainy night at the cafe", entries)).toHaveLength(1);
    });

    it("次要关键词为空数组时不影响匹配", () => {
      const entries = [
        makeEntry({ keywords: ["cafe"], secondaryKeywords: [] }),
      ];
      expect(matcher.match("cafe", entries)).toHaveLength(1);
    });
  });

  // ── Ordering ────────────────────────────────────────────────────────

  describe("排序", () => {
    it("按 insertionOrder 升序排列", () => {
      const entries = [
        makeEntry({
          id: "b",
          keywords: ["rain"],
          insertionOrder: 200,
          name: "B",
        }),
        makeEntry({
          id: "a",
          keywords: ["rain"],
          insertionOrder: 50,
          name: "A",
        }),
      ];
      const result = matcher.match("rain", entries);
      expect(result).toHaveLength(2);
      expect(result[0].entry.name).toBe("A");
      expect(result[1].entry.name).toBe("B");
    });

    it("alwaysActive 条目也参与排序", () => {
      const entries = [
        makeEntry({
          id: "keyword",
          keywords: ["rain"],
          insertionOrder: 50,
          name: "Keyword",
        }),
        makeEntry({
          id: "always",
          alwaysActive: true,
          insertionOrder: 200,
          name: "Always",
        }),
      ];
      const result = matcher.match("rain", entries);
      expect(result).toHaveLength(2);
      expect(result[0].entry.name).toBe("Keyword");
      expect(result[1].entry.name).toBe("Always");
    });
  });
});
