import { describe, expect, it } from "vitest";
import { extractErrorMessage, sanitizeErrorMessage } from "./error";

describe("sanitizeErrorMessage", () => {
  it("遮蔽已知 API Key", () => {
    const msg = "Request failed with key sk-abc123456789xyz";
    const result = sanitizeErrorMessage(msg, ["sk-abc123456789xyz"]);
    expect(result).not.toContain("sk-abc123456789xyz");
    expect(result).toContain("sk-a***");
  });

  it("短 secret（<= 8 字符）不遮蔽", () => {
    const msg = "key is short";
    const result = sanitizeErrorMessage(msg, ["short"]);
    expect(result).toBe(msg); // 不变
  });

  it("遮蔽 URL 中的 token 参数", () => {
    const msg = "Error at https://api.example.com?api_key=sk123456&foo=bar";
    const result = sanitizeErrorMessage(msg);
    expect(result).toContain("api_key=***");
    expect(result).toContain("foo=bar"); // 非敏感参数保留
  });

  it("遮蔽 URL 中的 key 参数", () => {
    const msg = "Error at https://api.example.com?key=mytoken123";
    const result = sanitizeErrorMessage(msg);
    expect(result).toContain("key=***");
  });

  it("无 secret 时返回原始消息", () => {
    const msg = "Something went wrong";
    expect(sanitizeErrorMessage(msg)).toBe(msg);
  });

  it("多个 secret 同时遮蔽", () => {
    const msg = "key1=sk-longkey123456 key2=sk-otherkey98765";
    const result = sanitizeErrorMessage(msg, [
      "sk-longkey123456",
      "sk-otherkey98765",
    ]);
    expect(result).not.toContain("sk-longkey123456");
    expect(result).not.toContain("sk-otherkey98765");
  });
});

describe("extractErrorMessage", () => {
  it("从 Error 实例提取 message", () => {
    expect(extractErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("字符串直接返回", () => {
    expect(extractErrorMessage("oops")).toBe("oops");
  });

  it("其他类型转为 string", () => {
    expect(extractErrorMessage(42)).toBe("42");
    expect(extractErrorMessage(null)).toBe("null");
  });
});
