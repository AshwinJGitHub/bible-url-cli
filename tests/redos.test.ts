import { describe, it, expect } from "vitest";
import {
  processPassageHtml,
  parseHtmlToMarkdown,
  extractFootnotes,
} from "../src/html-parser.js";

describe("ReDoS resistance (S3)", () => {
  it("should handle deeply nested div structure without catastrophic backtracking", () => {
    // Create a string with 500 nested divs — would cause exponential backtracking
    // on vulnerable [\s\S]*? patterns
    const nested = "<div>".repeat(500) + "content" + "</div>".repeat(500);
    const html = `<div class="passage-col">${nested}</div>`;

    const start = performance.now();
    parseHtmlToMarkdown(html);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(1000); // Must complete within 1 second
  });

  it("should handle very long string of repeated div tags", () => {
    const repeated = '<div class="passage-col">text</div>'.repeat(200);

    const start = performance.now();
    parseHtmlToMarkdown(repeated);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(1000);
  });

  it("should handle pathological footnote sup pattern", () => {
    // Create input designed to trigger backtracking on the footnote sup regex
    const malicious = '<sup data-fn="#fn1" class="footnote">' +
      '<a href="#fn">'.repeat(50) + 'a' + '</a>'.repeat(50) +
      '</sup>';

    const start = performance.now();
    processPassageHtml(malicious);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(1000);
  });

  it("should handle pathological cross-reference patterns", () => {
    const malicious = '<sup class="crossreference crossref">' +
      '<a>'.repeat(100) + 'text' + '</a>'.repeat(100) +
      '</sup>';

    const start = performance.now();
    processPassageHtml(malicious);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(1000);
  });

  it("should handle pathological footnotes extraction", () => {
    // Create input that could cause backtracking in the footnotes regex
    const malicious = '<div class="footnotes">' +
      '<div class="something">'.repeat(100) + 'content' + '</div>'.repeat(100);

    const start = performance.now();
    extractFootnotes(malicious);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(1000);
  });

  it("should handle large but normal BibleGateway-style HTML", () => {
    // Simulate a realistic large passage with many verses
    let html = '<div class="passage-col"><div class="passage-text">';
    for (let i = 1; i <= 200; i++) {
      html += `<sup class="versenum">${i}</sup> This is verse ${i} of the passage with some text. `;
      if (i % 10 === 0) {
        html += `<h3 class="heading">Section ${i / 10}</h3>`;
      }
    }
    html += '</div></div>';

    const start = performance.now();
    const result = parseHtmlToMarkdown(html);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(1000);
    expect(result).toContain("<sup>1</sup>");
    expect(result).toContain("<sup>200</sup>");
  });
});
