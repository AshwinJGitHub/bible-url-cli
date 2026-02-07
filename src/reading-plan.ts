/**
 * Reading plan generation — generateDailyReading and DailyReading type.
 */

import { type ReadingPlanConfig } from "./config.js";
import { OT, GOSPELS, NT_REST } from "./bible-data.js";
import { type ChapterRef, pickChapters, formatSegments } from "./chapter-math.js";
import { buildBibleGatewayUrl } from "./url-builder.js";

export interface DailyReading {
  readonly day: number;
  readonly version: string;
  readonly otRefs: readonly ChapterRef[];
  readonly gospelRefs: readonly ChapterRef[];
  readonly ntRefs: readonly ChapterRef[];
  readonly segments: readonly string[];
  readonly search: string;
  readonly url: string;
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
