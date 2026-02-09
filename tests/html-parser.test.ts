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

  it("should decode all basic HTML entities", () => {
    expect(decodeHtmlEntities("&amp;")).toBe("&");
    expect(decodeHtmlEntities("&lt;")).toBe("<");
    expect(decodeHtmlEntities("&gt;")).toBe(">");
    expect(decodeHtmlEntities("&quot;")).toBe('"');
    expect(decodeHtmlEntities("&#39;")).toBe("'");
    expect(decodeHtmlEntities("&apos;")).toBe("'");
  });

  it("should decode typographic entities", () => {
    // Smart quotes decode to ASCII equivalents (intentional design choice)
    expect(decodeHtmlEntities("&rsquo;")).toBe("'");
    expect(decodeHtmlEntities("&lsquo;")).toBe("'");
    expect(decodeHtmlEntities("&mdash;")).toBe("\u2014");
    expect(decodeHtmlEntities("&ndash;")).toBe("\u2013");
    expect(decodeHtmlEntities("&hellip;")).toBe("\u2026");
  });

  it("should decode symbol entities", () => {
    expect(decodeHtmlEntities("&copy;")).toBe("\u00A9");
    expect(decodeHtmlEntities("&reg;")).toBe("\u00AE");
    expect(decodeHtmlEntities("&trade;")).toBe("\u2122");
    expect(decodeHtmlEntities("&deg;")).toBe("\u00B0");
  });

  it("should decode fraction entities", () => {
    expect(decodeHtmlEntities("&frac12;")).toBe("\u00BD");
    expect(decodeHtmlEntities("&frac14;")).toBe("\u00BC");
    expect(decodeHtmlEntities("&frac34;")).toBe("\u00BE");
  });

  it("should decode extended entities added in P1", () => {
    expect(decodeHtmlEntities("&euro;")).toBe("\u20AC");
    expect(decodeHtmlEntities("&pound;")).toBe("\u00A3");
    expect(decodeHtmlEntities("&sect;")).toBe("\u00A7");
    expect(decodeHtmlEntities("&para;")).toBe("\u00B6");
    expect(decodeHtmlEntities("&laquo;")).toBe("\u00AB");
    expect(decodeHtmlEntities("&raquo;")).toBe("\u00BB");
  });

  it("should decode multiple entities in one string", () => {
    // Smart quotes → ASCII quotes; &mdash; → em-dash; &amp; → &
    expect(decodeHtmlEntities("&ldquo;Hello&rdquo; &mdash; World &amp; All")).toBe('"Hello" \u2014 World & All');
  });

  it("should leave unknown entities unchanged", () => {
    expect(decodeHtmlEntities("&unknownentity;")).toBe("&unknownentity;");
  });

  it("should handle strings with no entities", () => {
    expect(decodeHtmlEntities("plain text no entities")).toBe("plain text no entities");
  });

  it("should complete 1MB mixed-entity string in under 500ms (P1 benchmark)", () => {
    // Build a ~1MB string with many different entity types
    const segment =
      "He said &ldquo;hello&rdquo; &amp; &lsquo;world&rsquo; &#65; &#x42; &nbsp; &mdash; &copy; &euro; text ";
    const repetitions = Math.ceil(1_000_000 / segment.length);
    const bigInput = segment.repeat(repetitions);

    const start = performance.now();
    const result = decodeHtmlEntities(bigInput);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(500);
    expect(result).toContain("hello");
    expect(result).toContain("&");
    expect(result).toContain("A");
    expect(result).toContain("B");
    expect(result).not.toContain("&ldquo;");
    expect(result).not.toContain("&amp;");
    expect(result).not.toContain("&nbsp;");
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

  it("should extract footnote with letter and content (Q6 — pure markdown)", () => {
    const html = '<li id="fen-NIV-26a">Genesis 1:26 Some footnote text</li>';
    const result = processFootnotesHtml(html);
    expect(result).not.toBeNull();
    expect(result).toContain("**a.**");
    expect(result).toContain("Genesis 1:26 Some footnote text");
    // Q6: Should NOT contain raw HTML
    expect(result).not.toContain("<p ");
    expect(result).not.toContain("<sup>");
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

  it("should return fallback message for HTML with no passage-text divs (Q5)", () => {
    const html = '<html><body><div class="sidebar">Nav content</div></body></html>';
    const result = parseHtmlToMarkdown(html);
    expect(result).toContain("Could not extract passage text");
  });

  it("should return fallback message for completely unrecognized structure (Q5)", () => {
    const html = "<div><p>Some random content that is not a Bible passage</p></div>";
    const result = parseHtmlToMarkdown(html);
    expect(result).toContain("Could not extract passage text");
  });

  it("should return fallback for HTML with only whitespace after parsing (Q5)", () => {
    // HTML that has matching elements but they contain nothing useful
    const html = '<div class="passage-col"><div class="passage-text">   </div></div>';
    const result = parseHtmlToMarkdown(html);
    expect(result).toContain("Could not extract passage text");
  });

  it("should successfully parse valid passage HTML (Q4)", () => {
    const html = `
      <div class="passage-col">
        <div class="passage-text">
          <sup class="versenum">1</sup>In the beginning God created the heavens and the earth.
        </div>
      </div>
    `;
    const result = parseHtmlToMarkdown(html);
    expect(result).toContain("In the beginning");
    expect(result).not.toContain("Could not extract passage text");
  });

  it("should successfully parse passage with BCV heading (Q4)", () => {
    const html = `
      <div class="passage-col">
        <div class="bcv"><div class="dropdown-display-text">Genesis 1</div></div>
        <div class="passage-text">
          <sup class="versenum">1</sup>In the beginning God created the heavens and the earth.
        </div>
      </div>
    `;
    const result = parseHtmlToMarkdown(html);
    expect(result).toContain("# Genesis 1");
    expect(result).toContain("In the beginning");
  });

  it("should parse fallback passage-text without passage-col wrapper (Q4)", () => {
    const html = `
      <div class="passage-text">
        <sup class="versenum">1</sup>The proverbs of Solomon son of David
      </div>
    `;
    const result = parseHtmlToMarkdown(html);
    expect(result).toContain("proverbs of Solomon");
    expect(result).not.toContain("Could not extract passage text");
  });
});
