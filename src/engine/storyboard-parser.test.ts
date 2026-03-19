import { describe, expect, it } from "vitest";
import { parseStoryboardResponse } from "./storyboard-parser";

const params = { projectId: "proj-1", userPrompt: "test prompt" };

describe("parseStoryboardResponse", () => {
  // ── Standard JSON ───────────────────────────────────────────────────

  describe("标准格式解析", () => {
    it("解析直接 { shots: [...] } 格式", () => {
      const input = JSON.stringify({
        sceneTitle: "Test Scene",
        shots: [
          { shotNumber: 1, type: "wide", description: "A wide shot" },
          { shotNumber: 2, type: "close", description: "Close up" },
        ],
      });
      const result = parseStoryboardResponse(input, params);
      expect(result.shots).toHaveLength(2);
      expect(result.shots[0].type).toBe("wide");
      expect(result.shots[0].shotNumber).toBe(1);
      expect(result.shots[1].type).toBe("close");
      expect(result.projectId).toBe("proj-1");
      expect(result.userPrompt).toBe("test prompt");
      expect(result.status).toBe("draft");
    });

    it("空 shots 数组产出空分镜", () => {
      const input = JSON.stringify({ shots: [] });
      const result = parseStoryboardResponse(input, params);
      expect(result.shots).toHaveLength(0);
    });
  });

  // ── Code fence extraction ──────────────────────────────────────────

  describe("Code fence 提取", () => {
    it("从 ```json fence 中提取", () => {
      const input =
        '```json\n{"shots":[{"type":"medium","description":"test"}]}\n```';
      const result = parseStoryboardResponse(input, params);
      expect(result.shots).toHaveLength(1);
      expect(result.shots[0].type).toBe("medium");
    });

    it("从无语言标记的 ``` fence 中提取", () => {
      const input =
        '```\n{"shots":[{"type":"wide","description":"test"}]}\n```';
      const result = parseStoryboardResponse(input, params);
      expect(result.shots).toHaveLength(1);
    });
  });

  // ── Field normalization ────────────────────────────────────────────

  describe("字段归一化", () => {
    it("接受 snake_case 的 shot_number", () => {
      const input = JSON.stringify({
        shots: [{ shot_number: 3, type: "wide", description: "test" }],
      });
      const result = parseStoryboardResponse(input, params);
      expect(result.shots[0].shotNumber).toBe(3);
    });

    it("从 shotId 提取数字", () => {
      const input = JSON.stringify({
        shots: [{ shotId: "shot_5", type: "wide", description: "test" }],
      });
      const result = parseStoryboardResponse(input, params);
      expect(result.shots[0].shotNumber).toBe(5);
    });

    it("无效 type 回退为 medium", () => {
      const input = JSON.stringify({
        shots: [{ type: "invalid_type", description: "test" }],
      });
      const result = parseStoryboardResponse(input, params);
      expect(result.shots[0].type).toBe("medium");
    });

    it("无效 cameraMovement 回退为 static", () => {
      const input = JSON.stringify({
        shots: [
          { type: "wide", cameraMovement: "fly_over", description: "test" },
        ],
      });
      const result = parseStoryboardResponse(input, params);
      expect(result.shots[0].cameraMovement).toBe("static");
    });

    it("接受 snake_case 的 camera_movement", () => {
      const input = JSON.stringify({
        shots: [
          { type: "wide", camera_movement: "pan_left", description: "test" },
        ],
      });
      const result = parseStoryboardResponse(input, params);
      expect(result.shots[0].cameraMovement).toBe("pan_left");
    });

    it("缺失 description 回退为空字符串", () => {
      const input = JSON.stringify({ shots: [{ type: "wide" }] });
      const result = parseStoryboardResponse(input, params);
      expect(result.shots[0].description).toBe("");
    });

    it("缺失 duration 回退为 3", () => {
      const input = JSON.stringify({
        shots: [{ type: "wide", description: "test" }],
      });
      const result = parseStoryboardResponse(input, params);
      expect(result.shots[0].duration).toBe(3);
    });

    it("无效 transition 回退为 cut", () => {
      const input = JSON.stringify({
        shots: [
          { type: "wide", transition: "slide", description: "test" },
        ],
      });
      const result = parseStoryboardResponse(input, params);
      expect(result.shots[0].transition).toBe("cut");
    });
  });

  // ── Nested LLM output formats ──────────────────────────────────────

  describe("多种 LLM 输出格式", () => {
    it("处理 { scenes: [{ shots: [...] }] } 格式", () => {
      const input = JSON.stringify({
        scenes: [
          {
            sceneTitle: "Scene 1",
            shots: [{ type: "wide", description: "test" }],
          },
        ],
      });
      const result = parseStoryboardResponse(input, params);
      expect(result.shots).toHaveLength(1);
      expect(result.sceneTitle).toBe("Scene 1");
    });

    it("处理 { scene: { shots: [...] } } 格式", () => {
      const input = JSON.stringify({
        scene: { shots: [{ type: "close", description: "test" }] },
      });
      const result = parseStoryboardResponse(input, params);
      expect(result.shots).toHaveLength(1);
    });

    it("处理 { storyboard: { shots: [...] } } 格式", () => {
      const input = JSON.stringify({
        storyboard: { shots: [{ type: "detail", description: "test" }] },
      });
      const result = parseStoryboardResponse(input, params);
      expect(result.shots).toHaveLength(1);
    });

    it("处理 { storyboard: { scenes: [{ shots }] } } 双层嵌套", () => {
      const input = JSON.stringify({
        storyboard: {
          scenes: [{ shots: [{ type: "wide", description: "test" }] }],
        },
      });
      const result = parseStoryboardResponse(input, params);
      expect(result.shots).toHaveLength(1);
    });

    it("无法识别的格式返回空 shots", () => {
      const input = JSON.stringify({ data: { frames: [] } });
      const result = parseStoryboardResponse(input, params);
      expect(result.shots).toHaveLength(0);
    });
  });

  // ── Scene metadata ─────────────────────────────────────────────────

  describe("场景元数据", () => {
    it("提取 sceneNumber 和 sceneTitle", () => {
      const input = JSON.stringify({
        sceneNumber: 3,
        sceneTitle: "Rainy Cafe",
        shots: [{ type: "wide", description: "test" }],
      });
      const result = parseStoryboardResponse(input, params);
      expect(result.sceneNumber).toBe(3);
      expect(result.sceneTitle).toBe("Rainy Cafe");
    });

    it("接受 snake_case 的 scene_number 和 scene_title", () => {
      const input = JSON.stringify({
        scene_number: 2,
        scene_title: "Night Market",
        shots: [{ type: "wide", description: "test" }],
      });
      const result = parseStoryboardResponse(input, params);
      expect(result.sceneNumber).toBe(2);
      expect(result.sceneTitle).toBe("Night Market");
    });

    it("缺失 sceneTitle 回退为默认值", () => {
      const input = JSON.stringify({
        shots: [{ type: "wide", description: "test" }],
      });
      const result = parseStoryboardResponse(input, params);
      expect(result.sceneTitle).toBe("未命名场景");
    });
  });

  // ── Characters in shots ────────────────────────────────────────────

  describe("镜头中的角色", () => {
    it("解析角色信息", () => {
      const input = JSON.stringify({
        shots: [
          {
            type: "medium",
            description: "test",
            characters: [
              {
                characterId: "char-1",
                emotion: "happy",
                action: "waving",
                position: "left",
              },
            ],
          },
        ],
      });
      const result = parseStoryboardResponse(input, params);
      expect(result.shots[0].characters).toHaveLength(1);
      expect(result.shots[0].characters[0].characterId).toBe("char-1");
      expect(result.shots[0].characters[0].emotion).toBe("happy");
      expect(result.shots[0].characters[0].position).toBe("left");
    });

    it("过滤掉没有 characterId 的角色", () => {
      const input = JSON.stringify({
        shots: [
          {
            type: "medium",
            description: "test",
            characters: [{ emotion: "happy" }],
          },
        ],
      });
      const result = parseStoryboardResponse(input, params);
      expect(result.shots[0].characters).toHaveLength(0);
    });

    it("接受 id 字段作为 characterId 的替代", () => {
      const input = JSON.stringify({
        shots: [
          {
            type: "medium",
            description: "test",
            characters: [{ id: "char-2", emotion: "sad" }],
          },
        ],
      });
      const result = parseStoryboardResponse(input, params);
      expect(result.shots[0].characters[0].characterId).toBe("char-2");
    });

    it("无效 position 回退为 center", () => {
      const input = JSON.stringify({
        shots: [
          {
            type: "medium",
            description: "test",
            characters: [
              { characterId: "c1", position: "top" },
            ],
          },
        ],
      });
      const result = parseStoryboardResponse(input, params);
      expect(result.shots[0].characters[0].position).toBe("center");
    });
  });

  // ── VisualIntent ───────────────────────────────────────────────────

  describe("visualIntent 解析", () => {
    it("解析 camelCase visualIntent", () => {
      const input = JSON.stringify({
        shots: [
          {
            type: "medium",
            description: "test",
            visualIntent: {
              subject: "a young woman",
              composition: "medium shot, centered",
              atmosphere: "warm",
              suggestedPositive: "warm lighting, bokeh",
              suggestedNegative: "dark, gloomy",
            },
          },
        ],
      });
      const result = parseStoryboardResponse(input, params);
      const vi = result.shots[0].visualIntent;
      expect(vi).toBeDefined();
      expect(vi!.subject).toBe("a young woman");
      expect(vi!.composition).toBe("medium shot, centered");
      expect(vi!.atmosphere).toBe("warm");
      expect(vi!.suggestedPositive).toBe("warm lighting, bokeh");
      expect(vi!.suggestedNegative).toBe("dark, gloomy");
    });

    it("解析 snake_case visual_intent", () => {
      const input = JSON.stringify({
        shots: [
          {
            type: "medium",
            description: "test",
            visual_intent: {
              subject: "a warrior",
              suggested_positive: "epic lighting",
              suggested_negative: "blurry",
            },
          },
        ],
      });
      const result = parseStoryboardResponse(input, params);
      const vi = result.shots[0].visualIntent;
      expect(vi).toBeDefined();
      expect(vi!.subject).toBe("a warrior");
      expect(vi!.suggestedPositive).toBe("epic lighting");
      expect(vi!.suggestedNegative).toBe("blurry");
    });

    it("空 visualIntent 对象不设置字段", () => {
      const input = JSON.stringify({
        shots: [
          {
            type: "medium",
            description: "test",
            visualIntent: {},
          },
        ],
      });
      const result = parseStoryboardResponse(input, params);
      expect(result.shots[0].visualIntent).toBeUndefined();
    });

    it("只有空白字符串的字段不生成 visualIntent", () => {
      const input = JSON.stringify({
        shots: [
          {
            type: "medium",
            description: "test",
            visualIntent: { subject: "  ", composition: "" },
          },
        ],
      });
      const result = parseStoryboardResponse(input, params);
      expect(result.shots[0].visualIntent).toBeUndefined();
    });
  });

  // ── Error cases ────────────────────────────────────────────────────

  describe("错误处理", () => {
    it("无效 JSON 抛出异常", () => {
      expect(() =>
        parseStoryboardResponse("not json at all", params),
      ).toThrow();
    });

    it("非对象 shot 被过滤", () => {
      const input = JSON.stringify({
        shots: [null, 42, "string", { type: "wide", description: "ok" }],
      });
      const result = parseStoryboardResponse(input, params);
      expect(result.shots).toHaveLength(1);
      expect(result.shots[0].type).toBe("wide");
    });
  });

  // ── Optional text fields ───────────────────────────────────────────

  describe("可选文本字段", () => {
    it("解析 dialogue / narration / sfx", () => {
      const input = JSON.stringify({
        shots: [
          {
            type: "close",
            description: "test",
            dialogue: "Hello!",
            narration: "She said hello.",
            sfx: "door_open",
          },
        ],
      });
      const result = parseStoryboardResponse(input, params);
      expect(result.shots[0].dialogue).toBe("Hello!");
      expect(result.shots[0].narration).toBe("She said hello.");
      expect(result.shots[0].sfx).toBe("door_open");
    });

    it("非字符串的可选字段不设置", () => {
      const input = JSON.stringify({
        shots: [
          { type: "close", description: "test", dialogue: 123 },
        ],
      });
      const result = parseStoryboardResponse(input, params);
      expect(result.shots[0].dialogue).toBeUndefined();
    });
  });
});
