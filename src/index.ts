#!/usr/bin/env node
/* eslint-disable no-console */

import * as fs from "node:fs";
import * as path from "node:path";
import { defaultConfig, type ReadingPlanConfig } from "./config.js";
import {
  parseDay,
  parseVersion,
  generateDailyReading,
  parseHtmlToMarkdown,
  ValidationError,
} from "./core.js";
import { validateLogFolder } from "./path-validation.js";
import { sanitizeForTerminal } from "./sanitize.js";

export class CliError extends Error {
  constructor(message: string, public readonly exitCode: number = 1) {
    super(message);
    this.name = "CliError";
  }
}

export const HELP_TEXT = `
bible-url-cli - Generate BibleGateway URLs for daily Bible reading

USAGE
  bibleurl <day> [options]

ARGUMENTS
  <day>                Day number of the reading plan (positive integer)

OPTIONS
  --version <VERSION>  Bible version code (default: NIV)
                       Examples: ESV, KJV, NKJV, NLT, NASB, MSG
  --markdown, -m       Fetch passage and output as Markdown
  --help, -h           Show this help message

EXAMPLES
  bibleurl 1           # Day 1 with NIV
  bibleurl 100 --version ESV
  bibleurl 365 --markdown  # Output as Markdown

READING PLAN
  Each day includes:
  • 3 chapters from the Old Testament
  • 1 chapter from the Gospels (Matthew–John)
  • 1 chapter from Acts–Revelation

  Each track cycles independently when completed.
`;

/** Maximum response size in bytes (5MB) to prevent memory exhaustion */
export const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;

/** Request timeout in milliseconds (30 seconds) */
export const REQUEST_TIMEOUT_MS = 30_000;

export interface Dependencies {
  fetch: typeof globalThis.fetch;
  writeFile: (filePath: string, content: string) => void;
  mkdirSync: (dirPath: string, options?: { recursive?: boolean }) => void;
  existsSync: (dirPath: string) => boolean;
  stdout: (message: string) => void;
  stderr: (message: string) => void;
}

const defaultDeps: Dependencies = {
  fetch: globalThis.fetch,
  writeFile: (filePath, content) => fs.writeFileSync(filePath, content, "utf-8"),
  mkdirSync: (dirPath, options) => fs.mkdirSync(dirPath, options),
  existsSync: (dirPath) => fs.existsSync(dirPath),
  stdout: (msg) => console.log(msg),
  stderr: (msg) => console.error(msg),
};

export const KNOWN_FLAGS = ["--version", "--markdown", "-m", "--help", "-h"];

export async function fetchPassageAsMarkdown(
  url: string,
  fetchFn: typeof globalThis.fetch
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchFn(url, { signal: controller.signal });
    if (!response.ok) {
      throw new CliError(`Failed to fetch passage: ${response.status} ${response.statusText}`);
    }

    // Check content-length if available
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
      throw new CliError(`Response too large: ${contentLength} bytes (max: ${MAX_RESPONSE_SIZE})`);
    }

    const html = await response.text();
    if (html.length > MAX_RESPONSE_SIZE) {
      throw new CliError(`Response too large: ${html.length} bytes (max: ${MAX_RESPONSE_SIZE})`);
    }

    return parseHtmlToMarkdown(html);
  } catch (err) {
    if (err instanceof CliError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new CliError(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function main(
  args: string[],
  config: ReadingPlanConfig = defaultConfig,
  deps: Dependencies = defaultDeps,
): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    deps.stdout(HELP_TEXT);
    return;
  }

  for (const a of args) {
    if (a.startsWith("-") && !KNOWN_FLAGS.includes(a)) {
      throw new CliError(`Unknown option: ${a}\nRun 'bibleurl --help' for usage information.`);
    }
  }

  const day = parseDay(args);
  const version = parseVersion(args, config);

  const outputMarkdown = args.includes("--markdown") || args.includes("-m");

  const reading = generateDailyReading(day, version, config);

  if (outputMarkdown) {
    const markdown = await fetchPassageAsMarkdown(reading.url, deps.fetch);

    const logDir = validateLogFolder(config.logFolder);

    if (!deps.existsSync(logDir)) {
      deps.mkdirSync(logDir, { recursive: true });
    }

    const date = new Date().toISOString().split("T")[0];
    const filename = `${date}-day-${day}.md`;
    const filePath = path.join(logDir, filename);

    deps.writeFile(filePath, markdown);
    deps.stdout(`Saved to ${filePath}`);
  } else {
    // Use OSC 8 hyperlink escape sequence for clickable terminal links
    // Sanitize URL to prevent terminal escape injection (S4)
    const safeUrl = sanitizeForTerminal(reading.url);
    const link = `\x1b]8;;${safeUrl}\x1b\\${safeUrl}\x1b]8;;\x1b\\`;
    deps.stdout(link);
  }
}

// Run when executed directly (not imported for testing)
const isDirectExecution = process.argv[1]?.endsWith("index.js") || process.argv[1]?.endsWith("index.ts");
if (isDirectExecution) {
  main(process.argv.slice(2)).catch((err: unknown) => {
    if (err instanceof CliError || err instanceof ValidationError) {
      console.error(err.message);
      process.exit(err instanceof CliError ? err.exitCode : 1);
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  });
}
