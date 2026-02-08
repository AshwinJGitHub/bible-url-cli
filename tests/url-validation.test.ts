import { describe, it, expect } from "vitest";
import { validateUrl, validateBaseUrl, ALLOWED_HOSTS } from "../src/url-validation.js";

describe("validateUrl", () => {
  it("should accept valid BibleGateway URL", () => {
    expect(() => validateUrl("https://www.biblegateway.com/passage/?search=Gen+1&version=NIV")).not.toThrow();
  });

  it("should accept biblegateway.com without www", () => {
    expect(() => validateUrl("https://biblegateway.com/passage/?search=Gen+1&version=NIV")).not.toThrow();
  });

  it("should reject HTTP (non-HTTPS) URL", () => {
    expect(() => validateUrl("http://www.biblegateway.com/passage/?search=Gen+1")).toThrow("must use HTTPS");
  });

  it("should reject internal network (cloud metadata endpoint)", () => {
    expect(() => validateUrl("https://169.254.169.254/latest/meta-data/")).toThrow("not in the allowed list");
  });

  it("should reject localhost", () => {
    expect(() => validateUrl("https://localhost/evil")).toThrow("not in the allowed list");
  });

  it("should reject arbitrary external host", () => {
    expect(() => validateUrl("https://evil.com/steal-data")).toThrow("not in the allowed list");
  });

  it("should reject completely invalid URL", () => {
    expect(() => validateUrl("not-a-url")).toThrow("Invalid URL");
  });

  it("should reject ftp protocol", () => {
    expect(() => validateUrl("ftp://www.biblegateway.com/file")).toThrow("must use HTTPS");
  });

  it("should accept custom allowed hosts", () => {
    expect(() => validateUrl("https://custom.example.com/api", ["custom.example.com"])).not.toThrow();
  });

  it("should reject even biblegateway if not in custom allowlist", () => {
    expect(() => validateUrl("https://www.biblegateway.com/passage", ["other.com"])).toThrow("not in the allowed list");
  });
});

describe("validateBaseUrl", () => {
  it("should accept default BibleGateway base URL", () => {
    expect(() => validateBaseUrl("https://www.biblegateway.com/passage/?")).not.toThrow();
  });

  it("should reject HTTP base URL", () => {
    expect(() => validateBaseUrl("http://www.biblegateway.com/passage/?")).toThrow("must use HTTPS");
  });

  it("should reject non-BibleGateway base URL", () => {
    expect(() => validateBaseUrl("https://evil.com/passage/?")).toThrow("not in the allowed list");
  });

  it("should reject invalid base URL", () => {
    expect(() => validateBaseUrl("not-a-url")).toThrow("Invalid base URL");
  });

  it("should reject cloud metadata URL", () => {
    expect(() => validateBaseUrl("https://169.254.169.254/")).toThrow("not in the allowed list");
  });
});

describe("ALLOWED_HOSTS", () => {
  it("should contain www.biblegateway.com", () => {
    expect(ALLOWED_HOSTS).toContain("www.biblegateway.com");
  });

  it("should contain biblegateway.com", () => {
    expect(ALLOWED_HOSTS).toContain("biblegateway.com");
  });
});
