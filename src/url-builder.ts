/**
 * URL construction for BibleGateway.
 */

import { type ReadingPlanConfig } from "./config.js";

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
