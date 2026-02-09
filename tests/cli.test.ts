import { describe, it, expect, vi } from "vitest";
import {
  main,
  CliError,
  EXIT_CODES,
  HELP_TEXT,
  KNOWN_FLAGS,
  fetchPassageAsMarkdown,
  readResponseWithLimit,
  MAX_RESPONSE_SIZE,
  type Dependencies,
} from "../src/index.js";
import { defaultConfig } from "../src/config.js";
import { ValidationError } from "../src/cli-args.js";

function mockDeps(overrides: Partial<Dependencies> = {}): Dependencies {
  return {
    fetch: vi.fn(),
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn().mockResolvedValue({ isDirectory: () => true }),
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

  it("should warn to stderr when parsing produces fallback (Q5)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      text: () => Promise.resolve('<html><body><div class="sidebar">Nav</div></body></html>'),
    });

    const deps = mockDeps({ fetch: mockFetch });
    await main(["1", "--markdown"], defaultConfig, deps);

    expect(deps.stderr).toHaveBeenCalledTimes(1);
    const warning = (deps.stderr as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(warning).toContain("Could not extract passage text");
  });

  it("should create log directory if it doesn't exist (Q7 — async)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      text: () => Promise.resolve('<div class="passage-text">text</div>'),
    });

    const deps = mockDeps({
      fetch: mockFetch,
      stat: vi.fn().mockRejectedValue(new Error("ENOENT")),
    });

    await main(["1", "-m"], defaultConfig, deps);
    expect(deps.mkdir).toHaveBeenCalledTimes(1);
  });

  it("should not create directory if it already exists (Q7 — async)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      text: () => Promise.resolve('<div class="passage-text">text</div>'),
    });

    const deps = mockDeps({ fetch: mockFetch });
    await main(["1", "-m"], defaultConfig, deps);
    expect(deps.mkdir).not.toHaveBeenCalled();
  });
});

describe("fetchPassageAsMarkdown", () => {
  const validUrl = "https://www.biblegateway.com/passage/?search=Gen+1&version=NIV&interface=print";

  it("should throw CliError for non-OK response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      headers: new Headers(),
    });

    await expect(fetchPassageAsMarkdown(validUrl, mockFetch)).rejects.toThrow(CliError);
  });

  it("should throw CliError for oversized content-length", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-length": "999999999" }),
      text: () => Promise.resolve(""),
    });

    await expect(fetchPassageAsMarkdown(validUrl, mockFetch)).rejects.toThrow("too large");
  });

  it("should return parsed markdown for valid response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-length": "50" }),
      text: () => Promise.resolve('<div class="passage-text"><sup class="versenum">1</sup>In the beginning</div>'),
    });

    const result = await fetchPassageAsMarkdown(validUrl, mockFetch);
    expect(result).toContain("<sup>1</sup>");
    expect(result).toContain("In the beginning");
  });

  it("should reject non-HTTPS URLs (S2 — SSRF)", async () => {
    const mockFetch = vi.fn();
    await expect(fetchPassageAsMarkdown("http://example.com", mockFetch)).rejects.toThrow("must use HTTPS");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should reject non-BibleGateway URLs (S2 — SSRF)", async () => {
    const mockFetch = vi.fn();
    await expect(fetchPassageAsMarkdown("https://169.254.169.254/metadata", mockFetch)).rejects.toThrow(
      "not in the allowed list",
    );
    expect(mockFetch).not.toHaveBeenCalled();
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

    await expect(main(["1", "--markdown"], evilConfig, deps)).rejects.toThrow("outside the allowed base directory");
  });

  it("should reject absolute path outside cwd", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      text: () => Promise.resolve('<div class="passage-text">text</div>'),
    });

    const evilConfig = { ...defaultConfig, logFolder: "/tmp/evil" };
    const deps = mockDeps({ fetch: mockFetch });

    await expect(main(["1", "--markdown"], evilConfig, deps)).rejects.toThrow("outside the allowed base directory");
  });
});

describe("readResponseWithLimit (S6 — streaming size check)", () => {
  function makeStreamResponse(chunks: Uint8Array[]): Response {
    let index = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (index < chunks.length) {
          controller.enqueue(chunks[index]);
          index++;
        } else {
          controller.close();
        }
      },
    });
    return new Response(stream);
  }

  it("should read a normal-sized response successfully", async () => {
    const content = "Hello, World!";
    const chunks = [new TextEncoder().encode(content)];
    const response = makeStreamResponse(chunks);

    const result = await readResponseWithLimit(response, MAX_RESPONSE_SIZE);
    expect(result).toBe(content);
  });

  it("should abort when stream exceeds limit", async () => {
    // Create chunks that total > limit
    const limit = 100;
    const bigChunk = new Uint8Array(limit + 1).fill(65); // 'A' repeated
    const response = makeStreamResponse([bigChunk]);

    await expect(readResponseWithLimit(response, limit)).rejects.toThrow("exceeded");
  });

  it("should abort mid-stream across multiple chunks", async () => {
    const limit = 100;
    const chunk1 = new Uint8Array(60).fill(65);
    const chunk2 = new Uint8Array(60).fill(66); // Together 120 > 100
    const response = makeStreamResponse([chunk1, chunk2]);

    await expect(readResponseWithLimit(response, limit)).rejects.toThrow(CliError);
  });

  it("should accept response exactly at limit", async () => {
    const limit = 100;
    const chunk = new Uint8Array(limit).fill(65);
    const response = makeStreamResponse([chunk]);

    const result = await readResponseWithLimit(response, limit);
    expect(result.length).toBe(limit);
  });

  it("should fall back to .text() when body is null", async () => {
    // Simulate a response with no body stream (e.g., test mocks)
    const mockResponse = {
      body: null,
      text: () => Promise.resolve("small content"),
    } as unknown as Response;

    const result = await readResponseWithLimit(mockResponse, MAX_RESPONSE_SIZE);
    expect(result).toBe("small content");
  });

  it("should throw via fallback when .text() exceeds limit", async () => {
    const mockResponse = {
      body: null,
      text: () => Promise.resolve("x".repeat(200)),
    } as unknown as Response;

    await expect(readResponseWithLimit(mockResponse, 100)).rejects.toThrow("too large");
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

describe("EXIT_CODES (Q14 — structured exit codes)", () => {
  it("should define distinct exit codes", () => {
    expect(EXIT_CODES.VALIDATION).toBe(1);
    expect(EXIT_CODES.NETWORK).toBe(2);
    expect(EXIT_CODES.FILE_IO).toBe(3);
  });

  it("should use VALIDATION exit code for unknown flag errors", async () => {
    const deps = mockDeps();
    try {
      await main(["--bad-flag"], defaultConfig, deps);
    } catch (err) {
      expect(err).toBeInstanceOf(CliError);
      expect((err as CliError).exitCode).toBe(EXIT_CODES.VALIDATION);
    }
  });

  it("should use NETWORK exit code for fetch failures", async () => {
    const validUrl = "https://www.biblegateway.com/passage/?search=Gen+1&version=NIV&interface=print";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      headers: new Headers(),
    });

    try {
      await fetchPassageAsMarkdown(validUrl, mockFetch);
    } catch (err) {
      expect(err).toBeInstanceOf(CliError);
      expect((err as CliError).exitCode).toBe(EXIT_CODES.NETWORK);
    }
  });

  it("should use NETWORK exit code for oversized responses", async () => {
    const mockResponse = {
      body: null,
      text: () => Promise.resolve("x".repeat(200)),
    } as unknown as Response;

    try {
      await readResponseWithLimit(mockResponse, 100);
    } catch (err) {
      expect(err).toBeInstanceOf(CliError);
      expect((err as CliError).exitCode).toBe(EXIT_CODES.NETWORK);
    }
  });

  it("should default CliError to VALIDATION exit code", () => {
    const err = new CliError("test");
    expect(err.exitCode).toBe(EXIT_CODES.VALIDATION);
  });
});
