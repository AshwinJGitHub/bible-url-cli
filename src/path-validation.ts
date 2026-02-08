/**
 * Path validation to prevent path traversal attacks.
 */

import * as path from "node:path";

/**
 * Validate that a log folder path resolves to a location within
 * the given base directory (defaults to cwd). Rejects path traversal attempts.
 *
 * @returns The resolved absolute path.
 * @throws Error if the resolved path escapes the base directory.
 */
export function validateLogFolder(folder: string, baseDir: string = process.cwd()): string {
  const resolved = path.resolve(baseDir, folder);
  const normalizedBase = path.resolve(baseDir);

  if (!resolved.startsWith(normalizedBase + path.sep) && resolved !== normalizedBase) {
    throw new Error(
      `Log folder "${folder}" resolves to "${resolved}" which is outside the allowed base directory "${normalizedBase}".`,
    );
  }

  return resolved;
}
