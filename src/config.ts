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
  logFolder: "./Log"
};

/**
 * Placeholder for future web service integration.
 * @example
 * ```ts
 * const config = await fetchConfig("https://api.example.com/reading-plan/config");
 * ```
 */
export async function fetchConfig(_serviceUrl: string): Promise<ReadingPlanConfig> {
  // TODO: Implement web service fetch
  // For now, return the default config
  return defaultConfig;
}

/**
 * Merges partial config overrides with the default config.
 */
export function mergeConfig(
  overrides: Partial<ReadingPlanConfig>
): ReadingPlanConfig {
  return { ...defaultConfig, ...overrides };
}
