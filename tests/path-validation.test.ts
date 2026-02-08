import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { validateLogFolder } from "../src/path-validation.js";

describe("validateLogFolder", () => {
  const baseDir = "/home/user/project";

  it("should accept a valid relative path", () => {
    const result = validateLogFolder("./Log", baseDir);
    expect(result).toBe(path.resolve(baseDir, "Log"));
  });

  it("should accept a simple folder name", () => {
    const result = validateLogFolder("Log", baseDir);
    expect(result).toBe(path.resolve(baseDir, "Log"));
  });

  it("should accept nested relative paths", () => {
    const result = validateLogFolder("output/logs", baseDir);
    expect(result).toBe(path.resolve(baseDir, "output/logs"));
  });

  it("should reject path with .. that escapes base", () => {
    expect(() => validateLogFolder("../../../etc/cron.d", baseDir)).toThrow("outside the allowed base directory");
  });

  it("should reject path with .. at start", () => {
    expect(() => validateLogFolder("../sibling", baseDir)).toThrow("outside the allowed base directory");
  });

  it("should reject absolute path outside base", () => {
    expect(() => validateLogFolder("/etc/cron.d", baseDir)).toThrow("outside the allowed base directory");
  });

  it("should reject absolute path to root", () => {
    expect(() => validateLogFolder("/", baseDir)).toThrow("outside the allowed base directory");
  });

  it("should accept absolute path within base", () => {
    const result = validateLogFolder(path.join(baseDir, "Log"), baseDir);
    expect(result).toBe(path.resolve(baseDir, "Log"));
  });

  it("should reject path that is a prefix but not a child", () => {
    // "/home/user/project-other" starts with "/home/user/project" but is not a child
    expect(() => validateLogFolder("/home/user/project-other", baseDir)).toThrow("outside the allowed base directory");
  });

  it("should accept the base directory itself", () => {
    const result = validateLogFolder(".", baseDir);
    expect(result).toBe(path.resolve(baseDir));
  });

  it("should handle path with .. that stays within base", () => {
    const result = validateLogFolder("subdir/../Log", baseDir);
    expect(result).toBe(path.resolve(baseDir, "Log"));
  });

  it("should reject sneaky traversal with ../ embedded", () => {
    expect(() => validateLogFolder("Log/../../..", baseDir)).toThrow("outside the allowed base directory");
  });
});
