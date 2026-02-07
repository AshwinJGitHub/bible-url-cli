/**
 * Core barrel file — re-exports all modules for backward compatibility.
 */

export { type Book, OT, GOSPELS, NT_REST } from "./bible-data.js";
export { type ChapterRef, totalChapters, flatIndexToRef, pickChapters, formatSegments } from "./chapter-math.js";
export { buildBibleGatewayUrl } from "./url-builder.js";
export { decodeHtmlEntities, processPassageHtml, processFootnotesHtml, extractFootnotes, parseHtmlToMarkdown } from "./html-parser.js";
export { ValidationError, parseDay, parseVersion } from "./cli-args.js";
export { type DailyReading, generateDailyReading } from "./reading-plan.js";
