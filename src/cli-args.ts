/**
 * CLI argument parsing and validation.
 */

import { type ReadingPlanConfig } from "./config.js";

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
