import { describe, it, expect } from "vitest";
import {
  decodeHtmlEntities,
  processPassageHtml,
  processFootnotesHtml,
  extractFootnotes,
  parseHtmlToMarkdown,
} from "../src/html-parser.js";

describe("decodeHtmlEntities (direct import)", () => {
  it("should decode &nbsp; to space", () => {
    expect(decodeHtmlEntities("hello&nbsp;world")).toBe("hello world");
  });

  it("should decode numeric entities", () => {
    expect(decodeHtmlEntities("&#65;")).toBe("A");
  });

  it("should decode hex entities", () => {
    expect(decodeHtmlEntities("&#x41;")).toBe("A");
  });

  it("should decode smart quotes", () => {
    expect(decodeHtmlEntities("&ldquo;test&rdquo;")).toBe('"test"');
  });
});

describe("decodeHtmlEntities — control character filtering (S5)", () => {
  it("should replace &#27; (ESC) with replacement character", () => {
    expect(decodeHtmlEntities("&#27;")).toBe("\uFFFD");
  });

  it("should replace &#0; (NUL) with replacement character", () => {
    expect(decodeHtmlEntities("&#0;")).toBe("\uFFFD");
  });

  it("should replace &#x1B; (ESC hex) with replacement character", () => {
    expect(decodeHtmlEntities("&#x1B;")).toBe("\uFFFD");
  });

  it("should replace &#x00; (NUL hex) with replacement character", () => {
    expect(decodeHtmlEntities("&#x00;")).toBe("\uFFFD");
  });

  it("should preserve &#9; (tab)", () => {
    expect(decodeHtmlEntities("&#9;")).toBe("\t");
  });

  it("should preserve &#10; (newline)", () => {
    expect(decodeHtmlEntities("&#10;")).toBe("\n");
  });

  it("should allow normal printable characters through", () => {
    expect(decodeHtmlEntities("&#65;")).toBe("A");
    expect(decodeHtmlEntities("&#x41;")).toBe("A");
  });

  it("should replace DEL (&#127;) with replacement character", () => {
    expect(decodeHtmlEntities("&#127;")).toBe("\uFFFD");
  });
});

describe("processPassageHtml (direct import)", () => {
  it("should convert verse numbers to superscript", () => {
    const html = '<sup class="versenum">1</sup>In the beginning';
    expect(processPassageHtml(html)).toContain("<sup>1</sup>");
  });

  it("should remove cross-references", () => {
    const html = '<sup class="crossreference">(A)</sup>text';
    const result = processPassageHtml(html);
    expect(result).not.toContain("(A)");
    expect(result).toContain("text");
  });
});

describe("processFootnotesHtml (direct import)", () => {
  it("should return null for empty input", () => {
    expect(processFootnotesHtml("")).toBeNull();
  });

  it("should extract footnote with correct ID", () => {
    const html = '<li id="fen-NIV-26a">Genesis 1:26 Some footnote text</li>';
    const result = processFootnotesHtml(html);
    expect(result).not.toBeNull();
    expect(result).toContain('id="fen-NIV-26a"');
  });
});

describe("extractFootnotes (direct import)", () => {
  it("should return null when no footnotes present", () => {
    expect(extractFootnotes("<div>no footnotes</div>")).toBeNull();
  });
});

describe("parseHtmlToMarkdown (direct import)", () => {
  it("should return empty string for empty input", () => {
    expect(parseHtmlToMarkdown("")).toBe("");
  });
});
