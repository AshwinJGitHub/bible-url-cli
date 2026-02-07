import { describe, it, expect, vi } from "vitest";
import { main, CliError, HELP_TEXT, KNOWN_FLAGS, fetchPassageAsMarkdown, type Dependencies } from "../src/index.js";
import { defaultConfig } from "../src/config.js";
import { ValidationError } from "../src/cli-args.js";

function mockDeps(overrides: Partial<Dependencies> = {}): Dependencies {
  return {
    fetch: vi.fn(),
    writeFile: vi.fn(),
    mkdirSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(true),
    stdout: vi.fn(),
    stderr: vi.fn(),
    ...overrides,
  };
}

describe("main — help output", () => {
  it("should print help and return for --help", async () => {
    const deps = mockDeps();
    await main(["--help"], defaultConfig, deps);
    expect(deps.stdout).toHaveBeenCalledWith(HELP_TEXT);
  });

  it("should print help and return for -h", async () => {
    const deps = mockDeps();
    await main(["-h"], defaultConfig, deps);
    expect(deps.stdout).toHaveBeenCalledWith(HELP_TEXT);
  });
});

describe("main — unknown flag rejection", () => {
  it("should throw CliError for unknown flags", async () => {
    const deps = mockDeps();
    await expect(main(["--unknown"], defaultConfig, deps)).rejects.toThrow(CliError);
  });

  it("should include the unknown flag in error message", async () => {
    const deps = mockDeps();
    await expect(main(["--foo"], defaultConfig, deps)).rejects.toThrow("--foo");
  });
});

describe("main — validation error handling", () => {
  it("should propagate ValidationError for missing day", async () => {
    const deps = mockDeps();
    await expect(main([], defaultConfig, deps)).rejects.toThrow(ValidationError);
  });

  it("should propagate ValidationError for invalid day", async () => {
    const deps = mockDeps();
    await expect(main(["abc"], defaultConfig, deps)).rejects.toThrow(ValidationError);
  });

  it("should propagate ValidationError for missing version value", async () => {
    const deps = mockDeps();
    await expect(main(["1", "--version"], defaultConfig, deps)).rejects.toThrow(ValidationError);
  });
});

describe("main — URL output mode", () => {
  it("should output OSC 8 hyperlink for valid day", async () => {
    const deps = mockDeps();
    await main(["1"], defaultConfig, deps);
    expect(deps.stdout).toHaveBeenCalledTimes(1);
    const output = (deps.stdout as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(output).toContain("biblegateway.com");
    expect(output).toContain("\x1b]8;;");
  });

  it("should use specified version", async () => {
    const deps = mockDeps();
    await main(["1", "--version", "ESV"], defaultConfig, deps);
    const output = (deps.stdout as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(output).toContain("version=ESV");
  });
});

describe("main — markdown mode", () => {
  it("should fetch, parse, and save markdown", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-length": "100" }),
      text: () => Promise.resolve('<div class="passage-text"><sup class="versenum">1</sup>Test passage</div>'),
    });

    const deps = mockDeps({ fetch: mockFetch });
    await main(["1", "--markdown"], defaultConfig, deps);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(deps.writeFile).toHaveBeenCalledTimes(1);
    expect(deps.stdout).toHaveBeenCalledTimes(1);
    const savedMsg = (deps.stdout as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(savedMsg).toContain("Saved to");
  });

  it("should create log directory if it doesn't exist", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      text: () => Promise.resolve('<div class="passage-text">text</div>'),
    });

    const deps = mockDeps({
      fetch: mockFetch,
      existsSync: vi.fn().mockReturnValue(false),
    });

    await main(["1", "-m"], defaultConfig, deps);
    expect(deps.mkdirSync).toHaveBeenCalledTimes(1);
  });
});

describe("fetchPassageAsMarkdown", () => {
  it("should throw CliError for non-OK response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      headers: new Headers(),
    });

    await expect(fetchPassageAsMarkdown("http://example.com", mockFetch))
      .rejects.toThrow(CliError);
  });

  it("should throw CliError for oversized content-length", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-length": "999999999" }),
      text: () => Promise.resolve(""),
    });

    await expect(fetchPassageAsMarkdown("http://example.com", mockFetch))
      .rejects.toThrow("too large");
  });

  it("should return parsed markdown for valid response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-length": "50" }),
      text: () => Promise.resolve('<div class="passage-text"><sup class="versenum">1</sup>In the beginning</div>'),
    });

    const result = await fetchPassageAsMarkdown("http://example.com", mockFetch);
    expect(result).toContain("<sup>1</sup>");
    expect(result).toContain("In the beginning");
  });
});

describe("main — path traversal prevention (S1)", () => {
  it("should reject logFolder with path traversal", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      text: () => Promise.resolve('<div class="passage-text">text</div>'),
    });

    const evilConfig = { ...defaultConfig, logFolder: "../../../etc/cron.d" };
    const deps = mockDeps({ fetch: mockFetch });

    await expect(main(["1", "--markdown"], evilConfig, deps))
      .rejects.toThrow("outside the allowed base directory");
  });

  it("should reject absolute path outside cwd", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      text: () => Promise.resolve('<div class="passage-text">text</div>'),
    });

    const evilConfig = { ...defaultConfig, logFolder: "/tmp/evil" };
    const deps = mockDeps({ fetch: mockFetch });

    await expect(main(["1", "--markdown"], evilConfig, deps))
      .rejects.toThrow("outside the allowed base directory");
  });
});

describe("KNOWN_FLAGS", () => {
  it("should contain all expected flags", () => {
    expect(KNOWN_FLAGS).toContain("--version");
    expect(KNOWN_FLAGS).toContain("--markdown");
    expect(KNOWN_FLAGS).toContain("-m");
    expect(KNOWN_FLAGS).toContain("--help");
    expect(KNOWN_FLAGS).toContain("-h");
  });
});
