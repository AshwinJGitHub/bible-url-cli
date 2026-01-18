/**
 * Core logic for the Bible URL CLI.
 * This module contains all the pure functions that can be unit tested.
 */

import { type ReadingPlanConfig } from "./config.js";

// ============================================================================
// Types
// ============================================================================

export type Book = Readonly<{
  name: string;
  chapters: number;
}>;

export type ChapterRef = Readonly<{
  book: string;
  chapter: number;
}>;

// ============================================================================
// Bible Data
// ============================================================================

export const OT: readonly Book[] = [
  { name: "Genesis", chapters: 50 },
  { name: "Exodus", chapters: 40 },
  { name: "Leviticus", chapters: 27 },
  { name: "Numbers", chapters: 36 },
  { name: "Deuteronomy", chapters: 34 },
  { name: "Joshua", chapters: 24 },
  { name: "Judges", chapters: 21 },
  { name: "Ruth", chapters: 4 },
  { name: "1 Samuel", chapters: 31 },
  { name: "2 Samuel", chapters: 24 },
  { name: "1 Kings", chapters: 22 },
  { name: "2 Kings", chapters: 25 },
  { name: "1 Chronicles", chapters: 29 },
  { name: "2 Chronicles", chapters: 36 },
  { name: "Ezra", chapters: 10 },
  { name: "Nehemiah", chapters: 13 },
  { name: "Esther", chapters: 10 },
  { name: "Job", chapters: 42 },
  { name: "Psalms", chapters: 150 },
  { name: "Proverbs", chapters: 31 },
  { name: "Ecclesiastes", chapters: 12 },
  { name: "Song of Songs", chapters: 8 },
  { name: "Isaiah", chapters: 66 },
  { name: "Jeremiah", chapters: 52 },
  { name: "Lamentations", chapters: 5 },
  { name: "Ezekiel", chapters: 48 },
  { name: "Daniel", chapters: 12 },
  { name: "Hosea", chapters: 14 },
  { name: "Joel", chapters: 3 },
  { name: "Amos", chapters: 9 },
  { name: "Obadiah", chapters: 1 },
  { name: "Jonah", chapters: 4 },
  { name: "Micah", chapters: 7 },
  { name: "Nahum", chapters: 3 },
  { name: "Habakkuk", chapters: 3 },
  { name: "Zephaniah", chapters: 3 },
  { name: "Haggai", chapters: 2 },
  { name: "Zechariah", chapters: 14 },
  { name: "Malachi", chapters: 4 }
];

export const GOSPELS: readonly Book[] = [
  { name: "Matthew", chapters: 28 },
  { name: "Mark", chapters: 16 },
  { name: "Luke", chapters: 24 },
  { name: "John", chapters: 21 }
];

export const NT_REST: readonly Book[] = [
  { name: "Acts", chapters: 28 },
  { name: "Romans", chapters: 16 },
  { name: "1 Corinthians", chapters: 16 },
  { name: "2 Corinthians", chapters: 13 },
  { name: "Galatians", chapters: 6 },
  { name: "Ephesians", chapters: 6 },
  { name: "Philippians", chapters: 4 },
  { name: "Colossians", chapters: 4 },
  { name: "1 Thessalonians", chapters: 5 },
  { name: "2 Thessalonians", chapters: 3 },
  { name: "1 Timothy", chapters: 6 },
  { name: "2 Timothy", chapters: 4 },
  { name: "Titus", chapters: 3 },
  { name: "Philemon", chapters: 1 },
  { name: "Hebrews", chapters: 13 },
  { name: "James", chapters: 5 },
  { name: "1 Peter", chapters: 5 },
  { name: "2 Peter", chapters: 3 },
  { name: "1 John", chapters: 5 },
  { name: "2 John", chapters: 1 },
  { name: "3 John", chapters: 1 },
  { name: "Jude", chapters: 1 },
  { name: "Revelation", chapters: 22 }
];

// ============================================================================
// Chapter Calculation Functions
// ============================================================================

/**
 * Calculate the total number of chapters in a corpus.
 */
export function totalChapters(corpus: readonly Book[]): number {
  let sum = 0;
  for (const b of corpus) sum += b.chapters;
  return sum;
}

/**
 * Convert a flat index (0-based) to a book/chapter reference.
 * @throws Error if index is out of range
 */
export function flatIndexToRef(corpus: readonly Book[], flatIndexZeroBased: number): ChapterRef {
  let idx = flatIndexZeroBased;
  for (const b of corpus) {
    if (idx < b.chapters) {
      return { book: b.name, chapter: idx + 1 };
    }
    idx -= b.chapters;
  }
  throw new Error("Internal error: flatIndex out of range.");
}

/**
 * Pick a sequence of chapters from a corpus, wrapping around if necessary.
 */
export function pickChapters(
  corpus: readonly Book[],
  startFlatIndexZeroBased: number,
  count: number
): ChapterRef[] {
  if (count <= 0) return [];
  const total = totalChapters(corpus);
  if (total <= 0) throw new Error("Internal error: corpus has no chapters.");
  const refs: ChapterRef[] = [];
  for (let i = 0; i < count; i++) {
    const idx = (startFlatIndexZeroBased + i) % total;
    refs.push(flatIndexToRef(corpus, idx));
  }
  return refs;
}

/**
 * Format chapter references into human-readable segments (e.g., "Genesis 1-3").
 */
export function formatSegments(refs: readonly ChapterRef[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < refs.length) {
    const start = refs[i]!;
    let end = start;
    let j = i;
    while (j + 1 < refs.length) {
      const cur = refs[j]!;
      const nxt = refs[j + 1]!;
      if (nxt.book === cur.book && nxt.chapter === cur.chapter + 1) {
        end = nxt;
        j++;
      } else break;
    }
    if (start.book === end.book && start.chapter === end.chapter) {
      out.push(`${start.book} ${start.chapter}`);
    } else {
      out.push(`${start.book} ${start.chapter}-${end.chapter}`);
    }
    i = j + 1;
  }
  return out;
}

// ============================================================================
// URL Building
// ============================================================================

/**
 * Build a BibleGateway URL for the given search query.
 */
export function buildBibleGatewayUrl(
  search: string,
  version: string,
  config: ReadingPlanConfig
): string {
  const qs = `search=${encodeURIComponent(search)}&version=${encodeURIComponent(version)}&interface=print`;
  return config.bibleGatewayBaseUrl + qs;
}

// ============================================================================
// HTML to Markdown Conversion
// ============================================================================

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
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Process passage HTML to markdown text.
 */
export function processPassageHtml(html: string): string {
  let text = html;
  
  // Remove cross-references (sup tags with class "crossreference" or "crossref")
  text = text.replace(/<sup[^>]*class=['""][^'"]*crossref[^'"]*['""][^>]*>[\s\S]*?<\/sup>/gi, "");
  text = text.replace(/<a[^>]*class=['""][^'"]*crossref[^'"]*['""][^>]*>[\s\S]*?<\/a>/gi, "");
  
  // Extract the main passage heading
  text = text.replace(/<div[^>]*class=['"]bcv['"][^>]*>[\s\S]*?<div[^>]*class="dropdown-display-text"[^>]*>([^<]+)<\/div>[\s\S]*?<\/div>\s*<\/div>/gi, "# $1\n\n");
  
  // Extract version display
  text = text.replace(/<div[^>]*class=['"]translation['"][^>]*>[\s\S]*?<div[^>]*class="dropdown-display-text"[^>]*>([^<]+)<\/div>[\s\S]*?<\/div>\s*<\/div>/gi, "*$1*\n\n");
  
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
  
  // Handle footnote references
  text = text.replace(/<sup[^>]*data-fn=['"']#([^'"']+)['"'][^>]*>[\s\S]*?<a[^>]*>([a-z]+)<\/a>[\s\S]*?<\/sup>/gi, 
    (_, fnId: string, letter: string) => `<sup><a href="#${fnId}">${letter}</a></sup>`);
  
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
  
  const fnItems = html.matchAll(/<li[^>]*id="(fen-[^"]+)"[^>]*>([\s\S]*?)<\/li>/gi);
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
 * Extract all footnotes sections from HTML.
 */
export function extractFootnotes(html: string): string | null {
  const allFootnotesContent: string[] = [];
  
  const footnotesMatches = html.matchAll(/<div class="footnotes">([\s\S]*?)(?=<\/div>\s*<\/div>|<div class="publisher|<div class="crossrefs)/gi);
  for (const match of footnotesMatches) {
    if (match[1]) {
      allFootnotesContent.push(match[1]);
    }
  }
  
  const fnListMatches = html.matchAll(/<ol[^>]*class="[^"]*footnotes[^"]*"[^>]*>([\s\S]*?)<\/ol>/gi);
  for (const match of fnListMatches) {
    if (match[1]) {
      allFootnotesContent.push(match[1]);
    }
  }
  
  if (allFootnotesContent.length === 0) return null;
  return processFootnotesHtml(allFootnotesContent.join("\n"));
}

/**
 * Parse full HTML page to markdown.
 */
export function parseHtmlToMarkdown(html: string): string {
  const lines: string[] = [];
  
  const versionMatch = html.match(/<div class=['"]translation['"][^>]*>[\s\S]*?<div[^>]*class="dropdown-display-text"[^>]*>([^<]+)<\/div>/i);
  
  const passageCols = html.matchAll(/<div[^>]*class="[^"]*passage-col[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*passage-col[^"]*"|<div class="crossrefs|<div class="footnotes|$)/gi);
  
  let isFirst = true;
  for (const col of passageCols) {
    const colHtml = col[1] ?? "";
    
    const bcvMatch = colHtml.match(/<div class=['"]bcv['"][^>]*>[\s\S]*?<div[^>]*class="dropdown-display-text"[^>]*>([^<]+)<\/div>/i);
    
    if (bcvMatch?.[1]) {
      lines.push(`# ${bcvMatch[1].trim()}`);
      if (isFirst && versionMatch?.[1]) {
        lines.push(`*${versionMatch[1].trim()}*`);
      }
      lines.push("");
      isFirst = false;
    }
    
    const passageTextMatch = colHtml.match(/<div class="passage-text">([\s\S]*?)(?=<\/div>\s*<\/div>|$)/i);
    if (passageTextMatch?.[1]) {
      lines.push(processPassageHtml(passageTextMatch[1]));
    }
  }
  
  if (lines.length === 0) {
    const bcvMatch = html.match(/<div class=['"]bcv['"][^>]*>[\s\S]*?<div[^>]*class="dropdown-display-text"[^>]*>([^<]+)<\/div>/i);
    if (bcvMatch?.[1]) {
      lines.push(`# ${bcvMatch[1].trim()}`);
    }
    if (versionMatch?.[1]) {
      lines.push(`*${versionMatch[1].trim()}*`);
    }
    if (bcvMatch || versionMatch) {
      lines.push("");
    }
    
    const passages = html.matchAll(/<div class="passage-text">([\s\S]*?)(?=<div class="passage-text">|<div class="publisher-info|$)/g);
    for (const p of passages) {
      lines.push(processPassageHtml(p[1] ?? ""));
    }
  }
  
  const footnotesSection = extractFootnotes(html);
  if (footnotesSection) {
    lines.push(footnotesSection);
  }
  
  return lines.join("\n\n").trim();
}

// ============================================================================
// CLI Argument Parsing
// ============================================================================

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Parse the day argument from CLI args.
 * @throws ValidationError if day is missing or invalid
 */
export function parseDay(args: string[]): number {
  let dayStr: string | undefined;
  for (const a of args) {
    if (a.startsWith("-")) continue;
    dayStr = a;
    break;
  }
  if (!dayStr) {
    throw new ValidationError("Missing required argument: <day>\nRun 'bibleurl --help' for usage information.");
  }
  if (!/^\d+$/.test(dayStr)) {
    throw new ValidationError(`Invalid day "${dayStr}". Day must be a positive integer.`);
  }
  const day = Number(dayStr);
  if (!Number.isSafeInteger(day) || day <= 0) {
    throw new ValidationError("Day must be a positive, safe integer.");
  }
  return day;
}

/**
 * Parse the version argument from CLI args.
 * @throws ValidationError if version value is invalid
 */
export function parseVersion(args: string[], config: ReadingPlanConfig): string {
  const idx = args.indexOf("--version");
  if (idx === -1) return config.defaultVersion;
  const v = args[idx + 1];
  if (!v || v.startsWith("-")) {
    throw new ValidationError('Expected a value after "--version".');
  }
  if (!/^[A-Za-z0-9._-]+$/.test(v)) {
    throw new ValidationError(`Invalid version "${v}".`);
  }
  return v;
}

// ============================================================================
// Reading Plan Generation
// ============================================================================

export interface DailyReading {
  day: number;
  version: string;
  otRefs: ChapterRef[];
  gospelRefs: ChapterRef[];
  ntRefs: ChapterRef[];
  segments: string[];
  search: string;
  url: string;
}

/**
 * Generate the daily reading for a given day.
 */
export function generateDailyReading(
  day: number,
  version: string,
  config: ReadingPlanConfig
): DailyReading {
  const otStart = (day - 1) * config.otChaptersPerDay;
  const gospelStart = (day - 1) * config.gospelChaptersPerDay;
  const ntStart = (day - 1) * config.ntChaptersPerDay;

  const otRefs = pickChapters(OT, otStart, config.otChaptersPerDay);
  const gospelRefs = pickChapters(GOSPELS, gospelStart, config.gospelChaptersPerDay);
  const ntRefs = pickChapters(NT_REST, ntStart, config.ntChaptersPerDay);

  const segments = [
    ...formatSegments(otRefs),
    ...formatSegments(gospelRefs),
    ...formatSegments(ntRefs)
  ];

  const search = segments.join(", ");
  const url = buildBibleGatewayUrl(search, version, config);

  return {
    day,
    version,
    otRefs,
    gospelRefs,
    ntRefs,
    segments,
    search,
    url
  };
}
