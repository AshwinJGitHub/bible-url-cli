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

function die(message: string, exitCode = 1): never {
  console.error(message);
  process.exit(exitCode);
}

function showHelp(): void {
  console.log(`
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
`);
  process.exit(0);
}

/** Maximum response size in bytes (5MB) to prevent memory exhaustion */
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;

/** Request timeout in milliseconds (30 seconds) */
const REQUEST_TIMEOUT_MS = 30_000;

async function fetchPassageAsMarkdown(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      die(`Failed to fetch passage: ${response.status} ${response.statusText}`);
    }
    
    // Check content-length if available
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
      die(`Response too large: ${contentLength} bytes (max: ${MAX_RESPONSE_SIZE})`);
    }
    
    const html = await response.text();
    if (html.length > MAX_RESPONSE_SIZE) {
      die(`Response too large: ${html.length} bytes (max: ${MAX_RESPONSE_SIZE})`);
    }
    
    return parseHtmlToMarkdown(html);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      die(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

const KNOWN_FLAGS = ["--version", "--markdown", "-m", "--help", "-h"];

async function main(config: ReadingPlanConfig = defaultConfig): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
  }

  for (const a of args) {
    if (a.startsWith("-") && !KNOWN_FLAGS.includes(a)) {
      die(`Unknown option: ${a}\nRun 'bibleurl --help' for usage information.`);
    }
  }

  let day: number;
  let version: string;
  
  try {
    day = parseDay(args);
    version = parseVersion(args, config);
  } catch (err) {
    if (err instanceof ValidationError) {
      die(err.message);
    }
    throw err;
  }

  const outputMarkdown = args.includes("--markdown") || args.includes("-m");

  const reading = generateDailyReading(day, version, config);

  if (outputMarkdown) {
    const markdown = await fetchPassageAsMarkdown(reading.url);
    
    // Ensure log folder exists and is within expected bounds
    const logDir = path.resolve(config.logFolder);
    
    try {
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      // Generate filename with date and day number
      const date = new Date().toISOString().split("T")[0];
      const filename = `${date}-day-${day}.md`;
      const filePath = path.join(logDir, filename);
      
      fs.writeFileSync(filePath, markdown, "utf-8");
      console.log(`Saved to ${filePath}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      die(`Failed to write file: ${message}`);
    }
  } else {
    // Use OSC 8 hyperlink escape sequence for clickable terminal links
    // Format: \e]8;;URL\e\\LABEL\e]8;;\e\\
    const link = `\x1b]8;;${reading.url}\x1b\\${reading.url}\x1b]8;;\x1b\\`;
    console.log(link);
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  die(`Error: ${message}`);
});
