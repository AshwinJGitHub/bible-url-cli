import { describe, it, expect } from "vitest";
import { buildBibleGatewayUrl } from "../src/url-builder.js";
import { defaultConfig } from "../src/config.js";

describe("buildBibleGatewayUrl (direct import)", () => {
  it("should build correct URL with default config", () => {
    const url = buildBibleGatewayUrl("Genesis 1", "NIV", defaultConfig);
    expect(url).toBe("https://www.biblegateway.com/passage/?search=Genesis%201&version=NIV&interface=print");
  });

  it("should encode special characters in search", () => {
    const url = buildBibleGatewayUrl("Genesis 1, Exodus 1", "NIV", defaultConfig);
    expect(url).toContain("Genesis%201%2C%20Exodus%201");
  });

  it("should use custom base URL from config", () => {
    const customConfig = { ...defaultConfig, bibleGatewayBaseUrl: "https://custom.url/?" };
    const url = buildBibleGatewayUrl("Genesis 1", "ESV", customConfig);
    expect(url.startsWith("https://custom.url/?")).toBe(true);
    expect(url).toContain("version=ESV");
  });
});
