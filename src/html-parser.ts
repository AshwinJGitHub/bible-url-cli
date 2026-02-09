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
  if (code < 32 || code === 0x7f || (code >= 0x80 && code <= 0x9f)) return "\uFFFD";
  return String.fromCharCode(code);
}

// ---------------------------------------------------------------------------
// Named HTML entity lookup map (P1 — single-pass decoding)
// ---------------------------------------------------------------------------
// Replaces the previous 22-pass sequential .replace() chain with a single
// regex + callback. Includes extended entities (Q13: &euro;, &pound;, etc.)
// that were previously only covered by numeric entity fallback.
const NAMED_ENTITIES: ReadonlyMap<string, string> = new Map([
  // Whitespace
  ["nbsp", " "],
  // Basic HTML
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["apos", "'"],
  // Smart quotes → ASCII equivalents (intentional normalization)
  ["rsquo", "'"],
  ["lsquo", "'"],
  ["rdquo", '"'],
  ["ldquo", '"'],
  // Dashes & punctuation
  ["mdash", "\u2014"],
  ["ndash", "\u2013"],
  ["hellip", "\u2026"],
  // Symbols
  ["copy", "\u00A9"],
  ["reg", "\u00AE"],
  ["trade", "\u2122"],
  ["deg", "\u00B0"],
  // Fractions
  ["frac12", "\u00BD"],
  ["frac14", "\u00BC"],
  ["frac34", "\u00BE"],
  // Extended entities (Q13 — previously uncovered named entities)
  ["euro", "\u20AC"],
  ["pound", "\u00A3"],
  ["yen", "\u00A5"],
  ["cent", "\u00A2"],
  ["sect", "\u00A7"],
  ["para", "\u00B6"],
  ["laquo", "\u00AB"],
  ["raquo", "\u00BB"],
  ["middot", "\u00B7"],
  ["bull", "\u2022"],
  ["dagger", "\u2020"],
  ["Dagger", "\u2021"],
  ["permil", "\u2030"],
  ["prime", "\u2032"],
  ["Prime", "\u2033"],
  ["times", "\u00D7"],
  ["divide", "\u00F7"],
  ["plusmn", "\u00B1"],
  ["micro", "\u00B5"],
  ["not", "\u00AC"],
  ["macr", "\u00AF"],
  ["acute", "\u00B4"],
  ["cedil", "\u00B8"],
  ["ordf", "\u00AA"],
  ["ordm", "\u00BA"],
  ["sup1", "\u00B9"],
  ["sup2", "\u00B2"],
  ["sup3", "\u00B3"],
  ["iquest", "\u00BF"],
  ["iexcl", "\u00A1"],
  ["shy", "\u00AD"],
  ["curren", "\u00A4"],
  ["brvbar", "\u00A6"],
]);

/**
 * Single regex matching all HTML entity forms:
 * - Named:   &name;
 * - Decimal: &#NNN;
 * - Hex:     &#xHHH;
 *
 * Pre-compiled at module level (P5).
 */
const ENTITY_REGEX = /&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]\w*);/g;

/**
 * Decode HTML entities to their character equivalents in a single pass (P1).
 * Uses a lookup map for named entities and safeFromCharCode for numeric/hex.
 * Unknown named entities are left unchanged.
 */
export function decodeHtmlEntities(text: string): string {
  return text.replace(ENTITY_REGEX, (match, ref: string) => {
    // Decimal numeric: &#NNN;
    if (ref.startsWith("#") && !ref.startsWith("#x")) {
      return safeFromCharCode(Number(ref.slice(1)));
    }
    // Hex numeric: &#xHHH;
    if (ref.startsWith("#x")) {
      return safeFromCharCode(parseInt(ref.slice(2), 16));
    }
    // Named entity lookup
    const decoded = NAMED_ENTITIES.get(ref);
    return decoded ?? match; // leave unknown entities unchanged
  });
}

// ---------------------------------------------------------------------------
// Bounded-backtrack helpers (P5 — pre-compiled at module level)
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

// ---------------------------------------------------------------------------
// Pre-compiled regex patterns for processPassageHtml (P5)
// ---------------------------------------------------------------------------
const RE_CROSSREF_SUP = new RegExp(
  `<sup[^>]*class=['""][^'"]*crossref[^'"]*['""][^>]*>${SUP_CONTENT.source}<\\/sup>`,
  "gi",
);
const RE_CROSSREF_A = new RegExp(`<a[^>]*class=['""][^'"]*crossref[^'"]*['""][^>]*>${A_CONTENT.source}<\\/a>`, "gi");
const RE_BCV_HEADING = new RegExp(
  `<div[^>]*class=['"]bcv['"][^>]*>${DIV_CONTENT.source}<div[^>]*class="dropdown-display-text"[^>]*>([^<]+)<\\/div>${DIV_CONTENT.source}<\\/div>\\s*<\\/div>`,
  "gi",
);
const RE_TRANSLATION_DISPLAY = new RegExp(
  `<div[^>]*class=['"]translation['"][^>]*>${DIV_CONTENT.source}<div[^>]*class="dropdown-display-text"[^>]*>([^<]+)<\\/div>${DIV_CONTENT.source}<\\/div>\\s*<\\/div>`,
  "gi",
);
const RE_H1_BCV = /<h1[^>]*class="[^"]*passage-display-bcv[^"]*"[^>]*>([^<]+)<\/h1>/gi;
const RE_H2 = /<h2[^>]*>([^<]+)<\/h2>/gi;
const RE_H3_HEADING = /<h3[^>]*class="[^"]*heading[^"]*"[^>]*>([^<]+)<\/h3>/gi;
const RE_H3 = /<h3[^>]*>([^<]+)<\/h3>/gi;
const RE_H4 = /<h4[^>]*>([^<]+)<\/h4>/gi;
const RE_SPAN_HEADING = /<span[^>]*class="[^"]*heading[^"]*"[^>]*>([^<]+)<\/span>/gi;
const RE_VERSENUM = /<sup[^>]*class="[^"]*versenum[^"]*"[^>]*>\s*(\d+)\s*<\/sup>/gi;
const RE_CHAPTERNUM = /<span[^>]*class="[^"]*chapternum[^"]*"[^>]*>\s*(\d+)\s*<\/span>/gi;
const RE_FOOTNOTE_REF = new RegExp(
  `<sup[^>]*data-fn=['"']#([^'"']+)['"'][^>]*>${SUP_CONTENT.source}<a[^>]*>([a-z]+)<\\/a>${SUP_CONTENT.source}<\\/sup>`,
  "gi",
);
const RE_INDENT1 = /<span[^>]*class="[^"]*indent-1[^"]*"[^>]*>/gi;
const RE_INDENT2 = /<span[^>]*class="[^"]*indent-2[^"]*"[^>]*>/gi;
const RE_POETRY = /<span[^>]*class="[^"]*poetry[^"]*"[^>]*>/gi;
const RE_BR = /<br\s*\/?>/gi;
const RE_P_OPEN = /<p[^>]*>/gi;
const RE_P_CLOSE = /<\/p>/gi;
const RE_SMALL_CAPS = /<span[^>]*class="[^"]*small-caps[^"]*"[^>]*>([^<]+)<\/span>/gi;
const RE_STRIP_TAGS = /<(?!\/?sup(?:>|\s)|\/a>|a\s)[^>]+>/g;
const RE_CROSSREF_MARKERS = /\([A-Z]{1,3}\)/g;
const RE_MULTI_NEWLINE = /\n{3,}/g;
const RE_MULTI_SPACE = /[ \t]+/g;
const RE_LEADING_SPACE = /\n +/g;
const RE_TRAILING_SPACE = / +\n/g;

// ---------------------------------------------------------------------------
// Pre-compiled regex patterns for processFootnotesHtml (P5)
// ---------------------------------------------------------------------------
const RE_FN_ITEM = /<li[^>]*id="(fen-[^"]+)"[^>]*>([^<]*(?:<(?!\/li>)[^<]*)*)<\/li>/gi;
const RE_FN_LETTER = /[a-z]+$/i;
const RE_BIBLEREF_LINK = /<a[^>]*class="[^"]*bibleref[^"]*"[^>]*>([^<]+)<\/a>/gi;
const RE_STRIP_ALL_TAGS = /<[^>]+>/g;

// ---------------------------------------------------------------------------
// Pre-compiled regex patterns for extractFootnotes (P5)
// ---------------------------------------------------------------------------
const RE_FN_OL = /<ol[^>]*class="[^"]*footnotes[^"]*"[^>]*>([^<]*(?:<(?!\/ol>)[^<]*)*)<\/ol>/gi;

// ---------------------------------------------------------------------------
// Pre-compiled regex patterns for splitPassageColumns (P5)
// ---------------------------------------------------------------------------
const RE_PASSAGE_COL_MARKER = /class="[^"]*passage-col[^"]*"/gi;
const RE_DIV_OPEN_SUFFIX = /<div[^>]*$/;

// ---------------------------------------------------------------------------
// Pre-compiled regex patterns for parseHtmlToMarkdown (P5)
// ---------------------------------------------------------------------------
const RE_VERSION_MATCH = new RegExp(
  `<div class=['"]translation['"][^>]*>${DIV_CONTENT.source}<div[^>]*class="dropdown-display-text"[^>]*>([^<]+)<\\/div>`,
  "i",
);
const RE_BCV_MATCH = new RegExp(
  `<div class=['"]bcv['"][^>]*>${DIV_CONTENT.source}<div[^>]*class="dropdown-display-text"[^>]*>([^<]+)<\\/div>`,
  "i",
);
const RE_PASSAGE_TEXT = /<div class="passage-text">([^<]*(?:<(?!\/div>\s*<\/div>)[^<]*)*)/i;
const RE_PASSAGE_TEXT_FALLBACK =
  /<div class="passage-text">([^<]*(?:<(?!div class="passage-text">|div class="publisher-info)[^<]*)*)/gi;

/**
 * Helper to reset a global regex's lastIndex before use.
 * Global regexes are stateful — they remember where the last match ended.
 * Resetting ensures each function call starts matching from position 0.
 */
function resetRegex(re: RegExp): RegExp {
  re.lastIndex = 0;
  return re;
}

/**
 * Process passage HTML to markdown text.
 */
export function processPassageHtml(html: string): string {
  let text = html;

  // Remove cross-references — use bounded inner match to avoid backtracking
  text = text.replace(resetRegex(RE_CROSSREF_SUP), "");
  text = text.replace(resetRegex(RE_CROSSREF_A), "");

  // Extract the main passage heading — use bounded div content
  text = text.replace(resetRegex(RE_BCV_HEADING), "# $1\n\n");

  // Extract version display — bounded
  text = text.replace(resetRegex(RE_TRANSLATION_DISPLAY), "*$1*\n\n");

  // Fallback h1 match
  text = text.replace(resetRegex(RE_H1_BCV), "# $1\n\n");

  // Extract chapter/book headings
  text = text.replace(resetRegex(RE_H2), "## $1\n\n");
  text = text.replace(resetRegex(RE_H3_HEADING), "### $1\n\n");
  text = text.replace(resetRegex(RE_H3), "### $1\n\n");
  text = text.replace(resetRegex(RE_H4), "#### $1\n\n");

  // Handle span headings
  text = text.replace(resetRegex(RE_SPAN_HEADING), "\n\n### $1\n\n");

  // Handle verse numbers
  text = text.replace(resetRegex(RE_VERSENUM), "<sup>$1</sup> ");

  // Handle chapter numbers
  text = text.replace(resetRegex(RE_CHAPTERNUM), "**$1** ");

  // Handle footnote references — bounded inner content
  text = text.replace(
    resetRegex(RE_FOOTNOTE_REF),
    (_, fnId: string, letter: string) => `<sup><a href="#${fnId}">${letter}</a></sup>`,
  );

  // Handle poetry/verse blocks (indent)
  text = text.replace(resetRegex(RE_INDENT1), "    ");
  text = text.replace(resetRegex(RE_INDENT2), "        ");
  text = text.replace(resetRegex(RE_POETRY), "> ");

  // Handle line breaks
  text = text.replace(resetRegex(RE_BR), "\n");

  // Handle paragraphs
  text = text.replace(resetRegex(RE_P_OPEN), "\n\n");
  text = text.replace(resetRegex(RE_P_CLOSE), "");

  // Handle small caps
  text = text.replace(resetRegex(RE_SMALL_CAPS), "$1");

  // Remove remaining HTML tags except sup and a
  text = text.replace(resetRegex(RE_STRIP_TAGS), "");

  // Remove cross-reference markers
  text = text.replace(resetRegex(RE_CROSSREF_MARKERS), "");

  // Decode HTML entities
  text = decodeHtmlEntities(text);

  // Clean up whitespace
  text = text.replace(resetRegex(RE_MULTI_NEWLINE), "\n\n");
  text = text.replace(resetRegex(RE_MULTI_SPACE), " ");
  text = text.replace(resetRegex(RE_LEADING_SPACE), "\n");
  text = text.replace(resetRegex(RE_TRAILING_SPACE), "\n");

  return text.trim();
}

/**
 * Process footnotes HTML into markdown format.
 */
export function processFootnotesHtml(html: string): string | null {
  const lines: string[] = ["---", "", "#### Footnotes", ""];

  // Bounded: inner content of <li> uses [^<]*(?:<(?!/li>)[^<]*)* instead of [\s\S]*?
  const fnItems = html.matchAll(resetRegex(RE_FN_ITEM));
  for (const item of fnItems) {
    const fullId = item[1] ?? "";
    let content = item[2] ?? "";

    const letterMatch = fullId.match(RE_FN_LETTER);
    const letter = letterMatch?.[0] ?? "";

    content = content.replace(resetRegex(RE_BIBLEREF_LINK), "$1");
    content = content.replace(resetRegex(RE_STRIP_ALL_TAGS), "");
    content = decodeHtmlEntities(content).trim();

    // Q6: Use pure markdown instead of raw HTML in footnote output
    lines.push(`**${letter}.** ${content}`);
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
  const boundaries = [
    "</div>\n</div>",
    "</div>  </div>",
    "</div></div>",
    '<div class="publisher',
    '<div class="crossrefs',
  ];

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
  const fnListMatches = html.matchAll(resetRegex(RE_FN_OL));
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
  const marker = resetRegex(RE_PASSAGE_COL_MARKER);

  // Find all positions where a passage-col div starts
  const positions: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = marker.exec(html)) !== null) {
    // Walk back to find the '<div' that contains this class attribute
    const before = html.slice(Math.max(0, m.index - 200), m.index);
    const divMatch = RE_DIV_OPEN_SUFFIX.exec(before);
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

/** Fallback message returned when HTML parsing produces no meaningful output (Q5) */
export const PARSE_FALLBACK_MESSAGE = "⚠ Could not extract passage text. The page structure may have changed.";

/**
 * Parse full HTML page to markdown, with a timeout guard.
 * Returns a fallback warning message if the HTML contains content but no
 * meaningful passage text could be extracted (Q4/Q5 — robustness).
 * Returns empty string only for genuinely empty input.
 * @throws Error if parsing exceeds PARSE_TIMEOUT_MS
 */
export function parseHtmlToMarkdown(html: string): string {
  // Empty input is a no-op (not an error)
  if (!html || !html.trim()) {
    return "";
  }

  const deadline = Date.now() + PARSE_TIMEOUT_MS;

  const lines: string[] = [];

  // Extract version using bounded match
  const versionMatch = html.match(RE_VERSION_MATCH);

  // Use iterative string splitting instead of the vulnerable regex
  const columns = splitPassageColumns(html);

  let isFirst = true;
  for (const colHtml of columns) {
    if (Date.now() > deadline) {
      throw new Error("HTML parsing timed out");
    }

    const bcvMatch = colHtml.match(RE_BCV_MATCH);

    if (bcvMatch?.[1]) {
      lines.push(`# ${bcvMatch[1].trim()}`);
      if (isFirst && versionMatch?.[1]) {
        lines.push(`*${versionMatch[1].trim()}*`);
      }
      lines.push("");
      isFirst = false;
    }

    const passageTextMatch = colHtml.match(RE_PASSAGE_TEXT);
    if (passageTextMatch?.[1]) {
      lines.push(processPassageHtml(passageTextMatch[1]));
    }
  }

  if (lines.length === 0) {
    const bcvMatch = html.match(RE_BCV_MATCH);
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
    const passages = html.matchAll(resetRegex(RE_PASSAGE_TEXT_FALLBACK));
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

  const result = lines.join("\n\n").trim();

  // Q5: If we had HTML input but extracted nothing meaningful, return a
  // descriptive fallback so the caller knows parsing failed gracefully
  // rather than producing silently empty output.
  if (!result) {
    return PARSE_FALLBACK_MESSAGE;
  }

  return result;
}
