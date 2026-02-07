import { describe, it, expect } from "vitest";
import { parseDay, parseVersion, ValidationError } from "../src/cli-args.js";
import { defaultConfig } from "../src/config.js";

describe("ValidationError (direct import)", () => {
  it("should be an instance of Error", () => {
    const err = new ValidationError("test");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ValidationError");
  });
});

describe("parseDay (direct import)", () => {
  it("should parse valid day number", () => {
    expect(parseDay(["1"])).toBe(1);
    expect(parseDay(["365"])).toBe(365);
  });

  it("should skip flags", () => {
    expect(parseDay(["42", "--version", "ESV"])).toBe(42);
  });

  it("should throw for missing day", () => {
    expect(() => parseDay([])).toThrow(ValidationError);
  });

  it("should throw for non-numeric day", () => {
    expect(() => parseDay(["abc"])).toThrow(ValidationError);
  });
});

describe("parseVersion (direct import)", () => {
  it("should return default version when not specified", () => {
    expect(parseVersion([], defaultConfig)).toBe("NIV");
  });

  it("should parse --version flag", () => {
    expect(parseVersion(["--version", "ESV"], defaultConfig)).toBe("ESV");
  });

  it("should throw for missing version value", () => {
    expect(() => parseVersion(["--version"], defaultConfig)).toThrow(ValidationError);
  });
});
