/**
 * HTML-to-markdown conversion for BibleGateway passage HTML.
 */

/** Maximum time in ms allowed for HTML parsing before aborting */
const PARSE_TIMEOUT_MS = 5_000;

/**
 * Convert a codepoint to a character, filtering out control characters (S5).
 * Allows tab (9), newline (10), and carriage return (13). All other C0/C1
 * control characters and DEL are replaced with the Unicode replacement char.
 */
function safeFromCharCode(code: number): string {
  if (code === 9 || code === 10 || code === 13) return String.fromCharCode(code);
  if (code < 32 || code === 0x7F || (code >= 0x80 && code <= 0x9F)) return "\uFFFD";
  return String.fromCharCode(code);
}

/**
 * Decode common HTML entities to their character equivalents.
 */
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/&copy;/g, "©")
    .replace(/&reg;/g, "®")
    .replace(/&trade;/g, "™")
    .replace(/&deg;/g, "°")
    .replace(/&frac12;/g, "½")
    .replace(/&frac14;/g, "¼")
    .replace(/&frac34;/g, "¾")
    .replace(/&#(\d+);/g, (_, code) => safeFromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => safeFromCharCode(parseInt(hex, 16)));
}

// ---------------------------------------------------------------------------
// Bounded-backtrack helpers
// ---------------------------------------------------------------------------
// These patterns match "any content inside a tag pair" without using the
// catastrophic-backtracking-prone [\s\S]*? with complex boundaries.
// Instead they use the "match-non-< then optionally match < that isn't the
// closing tag" idiom, which is linear-time.

/** Match content inside a <sup ...>...</sup>, non-greedy but bounded. */
const SUP_CONTENT = /[^<]*(?:<(?!\/sup>)[^<]*)*/;

/** Match content inside a <a ...>...</a>, bounded. */
const A_CONTENT = /[^<]*(?:<(?!\/a>)[^<]*)*/;

/** Match content inside a <div ...>, up to a nested closing sequence. */
const DIV_CONTENT = /[^<]*(?:<(?!\/div>)[^<]*)*/;

/**
 * Process passage HTML to markdown text.
 */
export function processPassageHtml(html: string): string {
  let text = html;

  // Remove cross-references — use bounded inner match to avoid backtracking
  text = text.replace(
    new RegExp(`<sup[^>]*class=['""][^'"]*crossref[^'"]*['""][^>]*>${SUP_CONTENT.source}<\\/sup>`, "gi"),
    ""
  );
  text = text.replace(
    new RegExp(`<a[^>]*class=['""][^'"]*crossref[^'"]*['""][^>]*>${A_CONTENT.source}<\\/a>`, "gi"),
    ""
  );

  // Extract the main passage heading — use bounded div content
  text = text.replace(
    new RegExp(
      `<div[^>]*class=['"]bcv['"][^>]*>${DIV_CONTENT.source}<div[^>]*class="dropdown-display-text"[^>]*>([^<]+)<\\/div>${DIV_CONTENT.source}<\\/div>\\s*<\\/div>`,
      "gi"
    ),
    "# $1\n\n"
  );

  // Extract version display — bounded
  text = text.replace(
    new RegExp(
      `<div[^>]*class=['"]translation['"][^>]*>${DIV_CONTENT.source}<div[^>]*class="dropdown-display-text"[^>]*>([^<]+)<\\/div>${DIV_CONTENT.source}<\\/div>\\s*<\\/div>`,
      "gi"
    ),
    "*$1*\n\n"
  );

  // Fallback h1 match
  text = text.replace(/<h1[^>]*class="[^"]*passage-display-bcv[^"]*"[^>]*>([^<]+)<\/h1>/gi, "# $1\n\n");

  // Extract chapter/book headings
  text = text.replace(/<h2[^>]*>([^<]+)<\/h2>/gi, "## $1\n\n");
  text = text.replace(/<h3[^>]*class="[^"]*heading[^"]*"[^>]*>([^<]+)<\/h3>/gi, "### $1\n\n");
  text = text.replace(/<h3[^>]*>([^<]+)<\/h3>/gi, "### $1\n\n");
  text = text.replace(/<h4[^>]*>([^<]+)<\/h4>/gi, "#### $1\n\n");

  // Handle span headings
  text = text.replace(/<span[^>]*class="[^"]*heading[^"]*"[^>]*>([^<]+)<\/span>/gi, "\n\n### $1\n\n");

  // Handle verse numbers
  text = text.replace(/<sup[^>]*class="[^"]*versenum[^"]*"[^>]*>\s*(\d+)\s*<\/sup>/gi, "<sup>$1</sup> ");

  // Handle chapter numbers
  text = text.replace(/<span[^>]*class="[^"]*chapternum[^"]*"[^>]*>\s*(\d+)\s*<\/span>/gi, "**$1** ");

  // Handle footnote references — bounded inner content
  text = text.replace(
    new RegExp(
      `<sup[^>]*data-fn=['"']#([^'"']+)['"'][^>]*>${SUP_CONTENT.source}<a[^>]*>([a-z]+)<\\/a>${SUP_CONTENT.source}<\\/sup>`,
      "gi"
    ),
    (_, fnId: string, letter: string) => `<sup><a href="#${fnId}">${letter}</a></sup>`
  );

  // Handle poetry/verse blocks (indent)
  text = text.replace(/<span[^>]*class="[^"]*indent-1[^"]*"[^>]*>/gi, "    ");
  text = text.replace(/<span[^>]*class="[^"]*indent-2[^"]*"[^>]*>/gi, "        ");
  text = text.replace(/<span[^>]*class="[^"]*poetry[^"]*"[^>]*>/gi, "> ");

  // Handle line breaks
  text = text.replace(/<br\s*\/?>/gi, "\n");

  // Handle paragraphs
  text = text.replace(/<p[^>]*>/gi, "\n\n");
  text = text.replace(/<\/p>/gi, "");

  // Handle small caps
  text = text.replace(/<span[^>]*class="[^"]*small-caps[^"]*"[^>]*>([^<]+)<\/span>/gi, "$1");

  // Remove remaining HTML tags except sup and a
  text = text.replace(/<(?!\/?sup(?:>|\s)|\/a>|a\s)[^>]+>/g, "");

  // Remove cross-reference markers
  text = text.replace(/\([A-Z]{1,3}\)/g, "");

  // Decode HTML entities
  text = decodeHtmlEntities(text);

  // Clean up whitespace
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n +/g, "\n");
  text = text.replace(/ +\n/g, "\n");

  return text.trim();
}

/**
 * Process footnotes HTML into markdown format.
 */
export function processFootnotesHtml(html: string): string | null {
  const lines: string[] = ["---", "", "#### Footnotes", ""];

  // Bounded: inner content of <li> uses [^<]*(?:<(?!/li>)[^<]*)* instead of [\s\S]*?
  const fnItems = html.matchAll(/<li[^>]*id="(fen-[^"]+)"[^>]*>([^<]*(?:<(?!\/li>)[^<]*)*)<\/li>/gi);
  for (const item of fnItems) {
    const fullId = item[1] ?? "";
    let content = item[2] ?? "";

    const letterMatch = fullId.match(/[a-z]+$/i);
    const letter = letterMatch?.[0] ?? "";

    content = content.replace(/<a[^>]*class="[^"]*bibleref[^"]*"[^>]*>([^<]+)<\/a>/gi, "$1");
    content = content.replace(/<[^>]+>/g, "");
    content = decodeHtmlEntities(content).trim();

    lines.push(`<p id="${fullId}"><sup>${letter}</sup> ${content}</p>`);
  }

  if (lines.length <= 4) return null;
  return lines.join("\n");
}

/**
 * Extract all footnotes sections from HTML using string splitting
 * instead of vulnerable [\s\S]*? lookahead patterns.
 */
export function extractFootnotes(html: string): string | null {
  const allFootnotesContent: string[] = [];

  // Strategy: find each <div class="footnotes"> and extract until a
  // known boundary. Use indexOf-based iteration instead of complex regex.
  let searchStart = 0;
  const fnDivMarker = '<div class="footnotes">';
  const boundaries = ['</div>\n</div>', '</div>  </div>', '</div></div>', '<div class="publisher', '<div class="crossrefs'];

  while (true) {
    const fnStart = html.indexOf(fnDivMarker, searchStart);
    if (fnStart === -1) break;

    const contentStart = fnStart + fnDivMarker.length;
    // Find the earliest boundary after contentStart
    let endPos = html.length;
    for (const boundary of boundaries) {
      const pos = html.indexOf(boundary, contentStart);
      if (pos !== -1 && pos < endPos) {
        endPos = pos;
      }
    }

    allFootnotesContent.push(html.slice(contentStart, endPos));
    searchStart = endPos;
  }

  // Also find <ol class="...footnotes...">...</ol> patterns
  const fnListMatches = html.matchAll(/<ol[^>]*class="[^"]*footnotes[^"]*"[^>]*>([^<]*(?:<(?!\/ol>)[^<]*)*)<\/ol>/gi);
  for (const match of fnListMatches) {
    if (match[1]) {
      allFootnotesContent.push(match[1]);
    }
  }

  if (allFootnotesContent.length === 0) return null;
  return processFootnotesHtml(allFootnotesContent.join("\n"));
}

/**
 * Split HTML into passage columns using string indexing instead of
 * a single vulnerable regex with [\s\S]*? lookahead.
 */
function splitPassageColumns(html: string): string[] {
  const columns: string[] = [];
  const marker = /class="[^"]*passage-col[^"]*"/gi;
  const divOpen = /<div[^>]*$/;

  // Find all positions where a passage-col div starts
  const positions: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = marker.exec(html)) !== null) {
    // Walk back to find the '<div' that contains this class attribute
    const before = html.slice(Math.max(0, m.index - 200), m.index);
    const divMatch = divOpen.exec(before);
    if (divMatch) {
      positions.push(m.index - (before.length - divMatch.index));
    } else {
      positions.push(m.index);
    }
  }

  // Boundaries that end a passage-col section
  const sectionBoundaries = ['<div class="crossrefs', '<div class="footnotes'];

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i]!;
    let end: number;

    if (i + 1 < positions.length) {
      end = positions[i + 1]!;
    } else {
      // Last column: find earliest section boundary or end of string
      end = html.length;
      for (const boundary of sectionBoundaries) {
        const pos = html.indexOf(boundary, start);
        if (pos !== -1 && pos < end) {
          end = pos;
        }
      }
    }

    columns.push(html.slice(start, end));
  }

  return columns;
}

/**
 * Parse full HTML page to markdown, with a timeout guard.
 * @throws Error if parsing exceeds PARSE_TIMEOUT_MS
 */
export function parseHtmlToMarkdown(html: string): string {
  const deadline = Date.now() + PARSE_TIMEOUT_MS;

  const lines: string[] = [];

  // Extract version using bounded match
  const versionMatch = html.match(
    new RegExp(
      `<div class=['"]translation['"][^>]*>${DIV_CONTENT.source}<div[^>]*class="dropdown-display-text"[^>]*>([^<]+)<\\/div>`,
      "i"
    )
  );

  // Use iterative string splitting instead of the vulnerable regex
  const columns = splitPassageColumns(html);

  let isFirst = true;
  for (const colHtml of columns) {
    if (Date.now() > deadline) {
      throw new Error("HTML parsing timed out");
    }

    const bcvMatch = colHtml.match(
      new RegExp(
        `<div class=['"]bcv['"][^>]*>${DIV_CONTENT.source}<div[^>]*class="dropdown-display-text"[^>]*>([^<]+)<\\/div>`,
        "i"
      )
    );

    if (bcvMatch?.[1]) {
      lines.push(`# ${bcvMatch[1].trim()}`);
      if (isFirst && versionMatch?.[1]) {
        lines.push(`*${versionMatch[1].trim()}*`);
      }
      lines.push("");
      isFirst = false;
    }

    const passageTextMatch = colHtml.match(/<div class="passage-text">([^<]*(?:<(?!\/div>\s*<\/div>)[^<]*)*)/i);
    if (passageTextMatch?.[1]) {
      lines.push(processPassageHtml(passageTextMatch[1]));
    }
  }

  if (lines.length === 0) {
    const bcvMatch = html.match(
      new RegExp(
        `<div class=['"]bcv['"][^>]*>${DIV_CONTENT.source}<div[^>]*class="dropdown-display-text"[^>]*>([^<]+)<\\/div>`,
        "i"
      )
    );
    if (bcvMatch?.[1]) {
      lines.push(`# ${bcvMatch[1].trim()}`);
    }
    if (versionMatch?.[1]) {
      lines.push(`*${versionMatch[1].trim()}*`);
    }
    if (bcvMatch || versionMatch) {
      lines.push("");
    }

    // Fallback: find passage-text divs using bounded match
    const passages = html.matchAll(/<div class="passage-text">([^<]*(?:<(?!div class="passage-text">|div class="publisher-info)[^<]*)*)/gi);
    for (const p of passages) {
      if (Date.now() > deadline) {
        throw new Error("HTML parsing timed out");
      }
      lines.push(processPassageHtml(p[1] ?? ""));
    }
  }

  const footnotesSection = extractFootnotes(html);
  if (footnotesSection) {
    lines.push(footnotesSection);
  }

  return lines.join("\n\n").trim();
}
