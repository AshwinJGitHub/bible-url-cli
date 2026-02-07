import { describe, it, expect } from "vitest";
import { generateDailyReading } from "../src/reading-plan.js";
import { defaultConfig } from "../src/config.js";

describe("generateDailyReading (direct import)", () => {
  it("should generate day 1 correctly", () => {
    const reading = generateDailyReading(1, "NIV", defaultConfig);

    expect(reading.day).toBe(1);
    expect(reading.version).toBe("NIV");
    expect(reading.otRefs.length).toBe(3);
    expect(reading.gospelRefs.length).toBe(1);
    expect(reading.ntRefs.length).toBe(1);
    expect(reading.otRefs[0]).toEqual({ book: "Genesis", chapter: 1 });
  });

  it("should build correct search string", () => {
    const reading = generateDailyReading(1, "NIV", defaultConfig);
    expect(reading.search).toBe("Genesis 1-3, Matthew 1, Acts 1");
  });

  it("should build correct URL", () => {
    const reading = generateDailyReading(1, "ESV", defaultConfig);
    expect(reading.url).toContain("biblegateway.com");
    expect(reading.url).toContain("version=ESV");
  });

  it("should have readonly DailyReading fields", () => {
    const reading = generateDailyReading(1, "NIV", defaultConfig);
    // TypeScript enforces readonly at compile time;
    // at runtime, verify the shape is correct
    expect(reading.day).toBe(1);
    expect(Array.isArray(reading.otRefs)).toBe(true);
    expect(Array.isArray(reading.segments)).toBe(true);
  });
});
