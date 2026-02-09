/**
 * Reading plan configuration.
 * These parameters can be overridden in the future via a linked web service.
 */

export type ReadingPlanConfig = Readonly<{
  /** Number of Old Testament chapters to read per day */
  otChaptersPerDay: number;
  /** Number of Gospel chapters to read per day */
  gospelChaptersPerDay: number;
  /** Number of New Testament (non-Gospel) chapters to read per day */
  ntChaptersPerDay: number;
  /** Default Bible version if not specified */
  defaultVersion: string;
  /** Base URL for BibleGateway */
  bibleGatewayBaseUrl: string;
  /** Folder path for markdown output files */
  logFolder: string;
}>;

/**
 * Default configuration for the reading plan.
 * In the future, this could be fetched from a web service.
 */
export const defaultConfig: ReadingPlanConfig = {
  otChaptersPerDay: 3,
  gospelChaptersPerDay: 1,
  ntChaptersPerDay: 1,
  defaultVersion: "NIV",
  bibleGatewayBaseUrl: "https://www.biblegateway.com/passage/?",
  logFolder: "./Log",
};

/**
 * Validate a ReadingPlanConfig for correctness (Q10).
 * Chapter counts must be positive integers. Base URL must be HTTPS.
 * Version and logFolder must be non-empty strings.
 *
 * @throws Error if any field is invalid.
 */
export function validateConfig(config: ReadingPlanConfig): void {
  // Chapter count validation
  for (const field of ["otChaptersPerDay", "gospelChaptersPerDay", "ntChaptersPerDay"] as const) {
    const value = config[field];
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`Config "${field}" must be a positive integer. Got ${value}.`);
    }
  }

  // Version must be non-empty
  if (!config.defaultVersion || typeof config.defaultVersion !== "string") {
    throw new Error('Config "defaultVersion" must be a non-empty string.');
  }

  // logFolder must be non-empty
  if (!config.logFolder || typeof config.logFolder !== "string") {
    throw new Error('Config "logFolder" must be a non-empty string.');
  }

  // Base URL must be valid HTTPS
  let parsed: URL;
  try {
    parsed = new URL(config.bibleGatewayBaseUrl);
  } catch {
    throw new Error(`Invalid bibleGatewayBaseUrl: "${config.bibleGatewayBaseUrl}"`);
  }
  if (parsed.protocol !== "https:") {
    throw new Error(`bibleGatewayBaseUrl must use HTTPS. Got "${parsed.protocol}" in "${config.bibleGatewayBaseUrl}".`);
  }
}

/**
 * Merges partial config overrides with a base config (Q12 — composable merge).
 * Validates the resulting config.
 */
export function mergeConfig(
  overrides: Partial<ReadingPlanConfig>,
  base: ReadingPlanConfig = defaultConfig,
): ReadingPlanConfig {
  const merged = { ...base, ...overrides };
  validateConfig(merged);
  return merged;
}
