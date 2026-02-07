import { describe, it, expect } from "vitest";
import { stripControlChars, sanitizeForTerminal } from "../src/sanitize.js";

describe("stripControlChars", () => {
  it("should pass through normal text unchanged", () => {
    expect(stripControlChars("Hello World")).toBe("Hello World");
  });

  it("should preserve tabs", () => {
    expect(stripControlChars("col1\tcol2")).toBe("col1\tcol2");
  });

  it("should preserve newlines", () => {
    expect(stripControlChars("line1\nline2")).toBe("line1\nline2");
  });

  it("should preserve carriage returns", () => {
    expect(stripControlChars("line1\r\nline2")).toBe("line1\r\nline2");
  });

  it("should strip NUL (0x00)", () => {
    expect(stripControlChars("a\x00b")).toBe("ab");
  });

  it("should strip ESC (0x1B)", () => {
    expect(stripControlChars("a\x1Bb")).toBe("ab");
  });

  it("should strip BEL (0x07)", () => {
    expect(stripControlChars("a\x07b")).toBe("ab");
  });

  it("should strip DEL (0x7F)", () => {
    expect(stripControlChars("a\x7Fb")).toBe("ab");
  });

  it("should strip C1 control characters (0x80-0x9F)", () => {
    expect(stripControlChars("a\x80b\x9Fc")).toBe("abc");
  });

  it("should strip all control chars while preserving allowed whitespace", () => {
    expect(stripControlChars("\x00\t\n\r\x1B\x07\x7F")).toBe("\t\n\r");
  });

  it("should handle empty string", () => {
    expect(stripControlChars("")).toBe("");
  });

  it("should handle string of only control chars", () => {
    expect(stripControlChars("\x00\x01\x02\x03")).toBe("");
  });
});

describe("sanitizeForTerminal", () => {
  it("should pass through normal URL", () => {
    const url = "https://www.biblegateway.com/passage/?search=Genesis%201&version=NIV";
    expect(sanitizeForTerminal(url)).toBe(url);
  });

  it("should strip ESC bytes from malicious URL", () => {
    const malicious = "https://example.com\x1b]8;;evil\x1b\\attack";
    const sanitized = sanitizeForTerminal(malicious);
    expect(sanitized).not.toContain("\x1b");
    expect(sanitized).toContain("https://example.com");
  });

  it("should strip NUL bytes from URL", () => {
    const malicious = "https://example.com\x00path";
    expect(sanitizeForTerminal(malicious)).toBe("https://example.compath");
  });

  it("should handle URL with multiple injection attempts", () => {
    const malicious = "\x1b[31mhttps://evil\x07.com\x1b\\";
    const sanitized = sanitizeForTerminal(malicious);
    expect(sanitized).not.toMatch(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/);
  });
});
