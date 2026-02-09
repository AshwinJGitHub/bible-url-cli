import { describe, it, expect } from "vitest";
import { defaultConfig, mergeConfig, validateConfig } from "../src/config.js";
import * as configModule from "../src/config.js";

describe("validateConfig (Q10)", () => {
  it("should accept default config", () => {
    expect(() => validateConfig(defaultConfig)).not.toThrow();
  });

  it("should reject otChaptersPerDay: 0", () => {
    expect(() => validateConfig({ ...defaultConfig, otChaptersPerDay: 0 })).toThrow("positive integer");
  });

  it("should reject otChaptersPerDay: -1", () => {
    expect(() => validateConfig({ ...defaultConfig, otChaptersPerDay: -1 })).toThrow("positive integer");
  });

  it("should reject otChaptersPerDay: 1.5", () => {
    expect(() => validateConfig({ ...defaultConfig, otChaptersPerDay: 1.5 })).toThrow("positive integer");
  });

  it("should reject gospelChaptersPerDay: 0", () => {
    expect(() => validateConfig({ ...defaultConfig, gospelChaptersPerDay: 0 })).toThrow("positive integer");
  });

  it("should reject ntChaptersPerDay: -3", () => {
    expect(() => validateConfig({ ...defaultConfig, ntChaptersPerDay: -3 })).toThrow("positive integer");
  });

  it("should reject bibleGatewayBaseUrl without https", () => {
    expect(() => validateConfig({ ...defaultConfig, bibleGatewayBaseUrl: "http://example.com/?" })).toThrow(
      "must use HTTPS",
    );
  });

  it("should reject invalid bibleGatewayBaseUrl", () => {
    expect(() => validateConfig({ ...defaultConfig, bibleGatewayBaseUrl: "not-a-url" })).toThrow(
      "Invalid bibleGatewayBaseUrl",
    );
  });

  it("should reject empty defaultVersion", () => {
    expect(() => validateConfig({ ...defaultConfig, defaultVersion: "" })).toThrow("non-empty string");
  });

  it("should reject empty logFolder", () => {
    expect(() => validateConfig({ ...defaultConfig, logFolder: "" })).toThrow("non-empty string");
  });

  it("should accept valid custom config", () => {
    expect(() =>
      validateConfig({
        ...defaultConfig,
        otChaptersPerDay: 5,
        gospelChaptersPerDay: 2,
        ntChaptersPerDay: 2,
      }),
    ).not.toThrow();
  });
});

describe("mergeConfig (Q12 — composable merge)", () => {
  it("should return default config when no overrides given", () => {
    const config = mergeConfig({});
    expect(config).toEqual(defaultConfig);
  });

  it("should override individual fields", () => {
    const config = mergeConfig({ otChaptersPerDay: 5 });
    expect(config.otChaptersPerDay).toBe(5);
    expect(config.gospelChaptersPerDay).toBe(defaultConfig.gospelChaptersPerDay);
  });

  it("should accept a custom base config (Q12)", () => {
    const customBase = { ...defaultConfig, otChaptersPerDay: 10 };
    const config = mergeConfig({ gospelChaptersPerDay: 3 }, customBase);
    expect(config.otChaptersPerDay).toBe(10);
    expect(config.gospelChaptersPerDay).toBe(3);
  });

  it("should validate the merged result", () => {
    expect(() => mergeConfig({ otChaptersPerDay: 0 })).toThrow("positive integer");
  });

  it("should accept valid HTTPS bibleGatewayBaseUrl", () => {
    expect(() => mergeConfig({ bibleGatewayBaseUrl: "https://www.biblegateway.com/api/?" })).not.toThrow();
  });

  it("should reject HTTP bibleGatewayBaseUrl (S2)", () => {
    expect(() => mergeConfig({ bibleGatewayBaseUrl: "http://www.biblegateway.com/passage/?" })).toThrow(
      "must use HTTPS",
    );
  });

  it("should reject invalid bibleGatewayBaseUrl", () => {
    expect(() => mergeConfig({ bibleGatewayBaseUrl: "not-a-url" })).toThrow("Invalid bibleGatewayBaseUrl");
  });
});

describe("Q11 — fetchConfig removal", () => {
  it("should not export fetchConfig (dead code removed)", () => {
    expect("fetchConfig" in configModule).toBe(false);
  });
});
