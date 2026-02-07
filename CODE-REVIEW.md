# bible-url-cli — Comprehensive Code Review & Remediation Plan

**Reviewer:** Claude (Opus 4.6)
**Date:** 2026-02-06
**Scope:** Full codebase — `src/`, `tests/`, configuration files, build tooling
**Priorities:** Security, Sustainability/Code Quality, Performance

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Part 1: Findings](#part-1-findings)
  - [1.1 Security (S1–S7)](#11-security-s1s7)
    - [S1: Path Traversal in `logFolder` Configuration — HIGH](#s1-path-traversal-in-logfolder-configuration--high)
    - [S2: SSRF Potential via Configurable Base URL — MEDIUM](#s2-ssrf-potential-via-configurable-base-url--medium)
    - [S3: ReDoS Risk in HTML Processing Regexes — HIGH](#s3-redos-risk-in-html-processing-regexes--high)
    - [S4: Terminal Escape Sequence Injection via OSC 8 — MEDIUM](#s4-terminal-escape-sequence-injection-via-osc-8--medium)
    - [S5: Uncontrolled HTML Entity Decoding to Control Characters — LOW](#s5-uncontrolled-html-entity-decoding-to-control-characters--low)
    - [S6: TOCTOU in Response Size Checking — MEDIUM](#s6-toctou-in-response-size-checking--medium)
    - [S7: `--version` Flag Value Used Without Allowlist — LOW](#s7---version-flag-value-used-without-allowlist--low)
  - [1.2 Code Quality (Q1–Q16)](#12-code-quality-q1q16)
    - [Q1: `core.ts` is a God Module — HIGH](#q1-corets-is-a-god-module-506-lines-6-responsibilities--high)
    - [Q2: `index.ts` is Completely Untestable — HIGH](#q2-indexts-is-completely-untestable--high)
    - [Q3: `die()` Calls `process.exit()` Directly — HIGH](#q3-die-calls-processexit-directly--high)
    - [Q4: Regex HTML Parsing is Inherently Fragile — MEDIUM](#q4-regex-html-parsing-is-inherently-fragile--medium)
    - [Q5: No Error Recovery in `parseHtmlToMarkdown` — MEDIUM](#q5-no-error-recovery-in-parsehtmltomarkdown--medium)
    - [Q6: `processFootnotesHtml` Outputs Raw HTML in Markdown — LOW](#q6-processfootnoteshtml-outputs-raw-html-in-markdown--low)
    - [Q7: Synchronous File Operations in Async Context — LOW](#q7-synchronous-file-operations-in-async-context--low)
    - [Q8: No Linting or Formatting Configuration — MEDIUM](#q8-no-linting-or-formatting-configuration--medium)
    - [Q9: `dist/` Listed in `.gitignore` but Present in Repo — LOW](#q9-dist-listed-in-gitignore-but-present-in-repo--low)
    - [Q10: No Config Value Validation — MEDIUM](#q10-no-config-value-validation--medium)
    - [Q11: `fetchConfig` is Dead Code — LOW](#q11-fetchconfig-is-dead-code--low)
    - [Q12: `mergeConfig` Always Merges Against `defaultConfig` — LOW](#q12-mergeconfig-always-merges-against-defaultconfig--low)
    - [Q13: `decodeHtmlEntities` Has Incomplete Entity Coverage — LOW](#q13-decodehtmlentities-has-incomplete-entity-coverage--low)
    - [Q14: No Structured Exit Codes — LOW](#q14-no-structured-exit-codes--low)
    - [Q15: `parseDay` and `parseVersion` Don't Coordinate — MEDIUM](#q15-parseday-and-parseversion-dont-coordinate-on-positional-arguments--medium)
    - [Q16: `DailyReading` Interface Not Readonly — LOW](#q16-dailyreading-interface-not-readonly--low)
  - [1.3 Performance (P1–P5)](#13-performance-p1p5)
    - [P1: Sequential Replace Chain in `decodeHtmlEntities` — MEDIUM](#p1-sequential-replace-chain-in-decodehtmlentities--22-passes--medium)
    - [P2: Sequential Replace Chain in `processPassageHtml` — HIGH](#p2-sequential-replace-chain-in-processpassagehtml--26-passes--high)
    - [P3: No Response Streaming — LOW](#p3-no-response-streaming--low)
    - [P4: `totalChapters()` Called Repeatedly Without Caching — LOW](#p4-totalchapters-called-repeatedly-without-caching--low)
    - [P5: Regex Patterns Recompiled on Every Call — LOW](#p5-regex-patterns-recompiled-on-every-call--low)
    - [P6: No Caching of `totalChapters` Results — LOW](#p6-no-caching-of-totalchapters-results--low)
  - [1.4 Sustainability & Maintainability (M1–M6)](#14-sustainability--maintainability-m1m6)
    - [M1: No CI/CD Pipeline — HIGH](#m1-no-cicd-pipeline--high)
    - [M2: No NPM Publishing Configuration — MEDIUM](#m2-no-npm-publishing-configuration--medium)
    - [M3: Vitest Version Pinning Too Loose — MEDIUM](#m3-vitest-version-pinning-too-loose--medium)
    - [M4: No Integration Tests for HTML Parsing — HIGH](#m4-no-integration-tests-for-html-parsing--high)
    - [M5: No TypeScript Declaration Output — LOW](#m5-no-typescript-declaration-output--low)
    - [M6: `node --loader ts-node/esm` is Deprecated — LOW](#m6-node---loader-ts-nodeesm-is-deprecated--low)
- [Part 2: Remediation Plan — Test-First Iterations](#part-2-remediation-plan--test-first-iterations)
  - [Phase 1: Critical Security & Testability Foundation](#phase-1-critical-security--testability-foundation)
    - [Iteration 1: Make `core.ts` Functions Safely Testable in Isolation](#iteration-1-make-corets-functions-safely-testable-in-isolation)
    - [Iteration 2: Make `index.ts` Testable](#iteration-2-make-indexts-testable)
    - [Iteration 3: Fix Path Traversal (S1)](#iteration-3-fix-path-traversal-s1)
    - [Iteration 4: Fix ReDoS Risk (S3)](#iteration-4-fix-redos-risk-s3)
    - [Iteration 5: Fix Terminal Escape Injection (S4) & Control Character Filtering (S5)](#iteration-5-fix-terminal-escape-injection-s4--control-character-filtering-s5)
  - [Phase 2: Robustness & Quality](#phase-2-robustness--quality)
    - [Iteration 6: Add URL Origin Validation (S2)](#iteration-6-add-url-origin-validation-s2)
    - [Iteration 7: Add Streaming Response Size Check (S6)](#iteration-7-add-streaming-response-size-check-s6)
    - [Iteration 8: Add Config Validation (Q10, Q12)](#iteration-8-add-config-validation-q10-q12)
    - [Iteration 9: Add HTML Parsing Robustness (Q4, Q5)](#iteration-9-add-html-parsing-robustness-q4-q5)
    - [Iteration 10: Add HTML Fixture Integration Tests (M4)](#iteration-10-add-html-fixture-integration-tests-m4)
  - [Phase 3: Performance & Tooling](#phase-3-performance--tooling)
    - [Iteration 11: Single-Pass HTML Entity Decoding (P1)](#iteration-11-single-pass-html-entity-decoding-p1)
    - [Iteration 12: Pre-Compile Regex Patterns (P5)](#iteration-12-pre-compile-regex-patterns-p5)
    - [Iteration 13: Add ESLint + Prettier (Q8)](#iteration-13-add-eslint--prettier-q8)
    - [Iteration 14: Add CI/CD Pipeline (M1)](#iteration-14-add-cicd-pipeline-m1)
  - [Phase 4: Cleanup](#phase-4-cleanup)
    - [Iteration 15: Remove Dead Code & Fix Minor Issues](#iteration-15-remove-dead-code--fix-minor-issues-q6-q7-q11-q14-q16)
    - [Iteration 16: Fix NPM Publishing Config & Dependency Pinning](#iteration-16-fix-npm-publishing-config-m2--dependency-pinning-m3)
- [Priority Matrix](#priority-matrix)
- [Appendix: Issue Cross-Reference](#appendix-issue-cross-reference)

---

## Executive Summary

The codebase demonstrates solid foundational practices: strict TypeScript, a functional-core/imperative-shell architecture, zero production dependencies, and reasonable test coverage (~75 tests). However, a deep review reveals **7 security vulnerabilities, 16 code quality issues, 5 performance concerns, and 6 sustainability gaps** that should be addressed systematically. The most critical findings are around regex-based HTML parsing susceptibility to ReDoS, path traversal risk in file output, the untestable CLI entry point, and the monolithic `core.ts` module.

---

## Part 1: Findings

### 1.1 Security (S1–S7)

#### S1: Path Traversal in `logFolder` Configuration — HIGH

**File:** `src/index.ts:126`
**Issue:** The `config.logFolder` value is resolved with `path.resolve()` but never validated against an allowlist or constrained to a safe parent directory. If the planned `fetchConfig()` remote configuration feature is ever implemented, a compromised config service could set `logFolder` to `../../etc/cron.d` or any writable path, and the CLI would write arbitrary files there.

```typescript
// Current code — no path boundary check
const logDir = path.resolve(config.logFolder);
fs.mkdirSync(logDir, { recursive: true });
fs.writeFileSync(filePath, markdown, "utf-8");
```

**Risk:** Arbitrary file write to any directory writable by the current user.

#### S2: SSRF Potential via Configurable Base URL — MEDIUM

**File:** `src/config.ts:30`, `src/core.ts:188`
**Issue:** `bibleGatewayBaseUrl` is a configurable string used directly in `buildBibleGatewayUrl()`. The resulting URL is fetched in `fetchPassageAsMarkdown()` without any origin validation. When `fetchConfig()` is implemented, a malicious config could redirect fetches to internal network endpoints (e.g., `http://169.254.169.254/` for cloud metadata).

**Risk:** Internal network scanning, cloud credential theft.

#### S3: ReDoS Risk in HTML Processing Regexes — HIGH

**File:** `src/core.ts:229–294`, `src/core.ts:325–344`, `src/core.ts:349–401`
**Issue:** Multiple regex patterns use `[\s\S]*?` with overlapping alternatives and complex boundaries. The HTML input comes from an external server (BibleGateway) and could be manipulated or unexpectedly structured. Key vulnerable patterns:

```typescript
// Passage column extraction — exponential backtracking possible on nested divs
/<div[^>]*class="[^"]*passage-col[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*passage-col[^"]*"|...)/gi

// Footnote sup extraction — nested [\s\S]*? groups
/<sup[^>]*data-fn=['"']#([^'"']+)['"'][^>]*>[\s\S]*?<a[^>]*>([a-z]+)<\/a>[\s\S]*?<\/sup>/gi

// BCV heading extraction — deeply nested lazy matches
/<div[^>]*class=['"]bcv['"][^>]*>[\s\S]*?<div[^>]*class="dropdown-display-text"[^>]*>([^<]+)<\/div>[\s\S]*?<\/div>\s*<\/div>/gi

// extractFootnotes — also uses complex lookahead (line 328)
/<div class="footnotes">([\s\S]*?)(?=<\/div>\s*<\/div>|<div class="publisher|<div class="crossrefs)/gi
```

**Risk:** CPU exhaustion / denial of service if HTML contains adversarial nesting. Even benign but unexpected HTML changes from BibleGateway could trigger catastrophic backtracking.

#### S4: Terminal Escape Sequence Injection via OSC 8 — MEDIUM

**File:** `src/index.ts:147`
**Issue:** The generated URL is embedded directly in an OSC 8 terminal escape sequence without sanitizing for embedded escape characters:

```typescript
const link = `\x1b]8;;${reading.url}\x1b\\${reading.url}\x1b]8;;\x1b\\`;
```

If the URL (via a compromised config) contains `\x1b` bytes, it could inject arbitrary terminal escape sequences.

**Risk:** Terminal manipulation, prompt spoofing.

#### S5: Uncontrolled HTML Entity Decoding to Control Characters — LOW

**File:** `src/core.ts:222–223`
**Issue:** The numeric/hex entity decoder converts any codepoint without filtering:

```typescript
.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
```

This could produce control characters (e.g., `&#27;` = ESC, `&#0;` = NUL) in the markdown output, which could affect terminal rendering or downstream processing.

**Risk:** Output corruption, terminal escape injection via markdown files.

#### S6: TOCTOU in Response Size Checking — MEDIUM

**File:** `src/index.ts:74–77`
**Issue:** The full response body is loaded into memory with `response.text()` *before* the size check. If the server sends a response larger than 5MB without a `Content-Length` header, the entire body is already in memory when the check fires.

```typescript
const html = await response.text();       // Full body in memory
if (html.length > MAX_RESPONSE_SIZE) {     // Check happens after
  die(`Response too large...`);
}
```

**Risk:** Memory exhaustion before the guard activates. Not all servers send `Content-Length`, and servers can lie about size. The full `response.text()` call loads everything into memory before any check fires.

#### S7: `--version` Flag Value Used Without Allowlist — LOW

**File:** `src/core.ts:449`
**Issue:** The version regex `^[A-Za-z0-9._-]+$` prevents injection characters, which is good. However, there's no validation that the version is an actual BibleGateway version code. An arbitrary version string will produce a valid URL that returns a BibleGateway error page, which the HTML parser will silently process into garbled output.

**Risk:** Silent data corruption in markdown output.

---

### 1.2 Code Quality (Q1–Q16)

#### Q1: `core.ts` is a God Module (506 lines, 6+ responsibilities) — HIGH

Six distinct concerns in one file: Bible data, chapter math, URL construction, HTML-to-markdown conversion, CLI argument parsing, and reading plan generation. This violates the Single Responsibility Principle and makes the file difficult to navigate, test in isolation, and extend.

#### Q2: `index.ts` is Completely Untestable — HIGH

The CLI entry point directly reads `process.argv`, calls `process.exit()` via `die()`, and performs I/O with no dependency injection. There are zero tests for the CLI layer, and the current architecture makes it impossible to add any without process-level mocking.

#### Q3: `die()` Calls `process.exit()` Directly — HIGH

`die()` terminates the process immediately, preventing cleanup, making error handling rigid, and making the calling code untestable. All functions that call `die()` become untestable side-effect machines.

#### Q4: Regex HTML Parsing is Inherently Fragile — MEDIUM

The entire HTML-to-markdown pipeline uses 20+ regex patterns against HTML from an external service. Any structural change to BibleGateway's markup will silently break parsing, producing garbled or empty output with no error indication.

#### Q5: No Error Recovery in `parseHtmlToMarkdown` — MEDIUM

If the HTML structure doesn't match any expected pattern (e.g., BibleGateway redesigns), the function returns an empty string silently. There's no "did we actually extract anything meaningful?" check, no fallback, and no warning to the user.

#### Q6: `processFootnotesHtml` Outputs Raw HTML in Markdown — LOW

The footnote output uses `<p id="..."><sup>...</sup>...</p>` — raw HTML embedded in markdown. While markdown supports inline HTML, this is inconsistent with the rest of the conversion which produces pure markdown syntax.

#### Q7: Synchronous File Operations in Async Context — LOW

`fs.existsSync`, `fs.mkdirSync`, and `fs.writeFileSync` block the event loop in a function that's already `async`. This is acceptable for a CLI tool but inconsistent and would cause problems if the code were ever used as a library.

#### Q8: No Linting or Formatting Configuration — MEDIUM

There's a `/* eslint-disable no-console */` pragma in `index.ts` but no ESLint config file, no Prettier config, and no lint scripts. Code style consistency depends entirely on manual discipline.

#### Q9: `dist/` Listed in `.gitignore` but Present in Repo — LOW

The compiled output exists in the repository despite being gitignored. This suggests it was committed before the gitignore rule was added, creating confusion about whether build artifacts should be tracked.

#### Q10: No Config Value Validation — MEDIUM

`ReadingPlanConfig` uses `number` for chapters-per-day values but nothing prevents zero, negative, or fractional values. `pickChapters` with `count: 0` returns `[]`, but the rest of the pipeline assumes non-empty results.

#### Q11: `fetchConfig` is Dead Code — LOW

The `fetchConfig` function returns `defaultConfig` and has been a placeholder since the initial commit. Dead code increases cognitive load and surface area.

#### Q12: `mergeConfig` Always Merges Against `defaultConfig` — LOW

`mergeConfig` doesn't accept a base config parameter, limiting composability. It always merges against the hardcoded default.

#### Q13: `decodeHtmlEntities` Has Incomplete Entity Coverage — LOW

Covers ~20 named entities but misses many common ones (`&euro;`, `&pound;`, `&sect;`, `&para;`, `&laquo;`, `&raquo;`, etc.). The numeric entity fallback catches these, but only for entities expressed as `&#NNN;` — named entities like `&euro;` would pass through unmodified.

#### Q14: No Structured Exit Codes — LOW

The CLI uses `process.exit(1)` for all error conditions. Different exit codes for different failure modes (validation error vs. network error vs. file write error) would help in scripting contexts.

#### Q15: `parseDay` and `parseVersion` Don't Coordinate on Positional Arguments — MEDIUM

`parseDay` skips any arg starting with `-` but doesn't skip the *value* that follows `--version`. If the user writes `bibleurl --version 42 ESV`, `parseDay` picks up `42` as the day number (but `42` is actually the version value). The two parsers operate independently on the same args array without consuming tokens, so numeric version codes like `NASB1995` could also cause confusion if a user misorders arguments.

#### Q16: `DailyReading` Interface Not Readonly — LOW

`DailyReading` uses mutable `ChapterRef[]` arrays rather than `readonly ChapterRef[]`, inconsistent with the `Readonly<>` pattern used elsewhere.

---

### 1.3 Performance (P1–P5)

#### P1: Sequential Replace Chain in `decodeHtmlEntities` — 22 passes — MEDIUM

Each `.replace()` scans the entire string. On a 5MB response, this means 22 full-string scans. A single-pass approach using a lookup map would reduce this to 1 pass.

#### P2: Sequential Replace Chain in `processPassageHtml` — 26 passes — HIGH

Similar issue: 26 sequential regex replacements (3 cross-ref removals, 4 heading conversions, 3 version extractions, 2 footnote patterns, 7 span/indent/poetry patterns, 1 line break, 2 paragraph, 1 small-caps, 1 general tag removal, 1 cross-ref marker, plus multiple whitespace cleanup passes), each scanning the full HTML. The combined cost is O(n * 26) where n could be up to 5MB.

#### P3: No Response Streaming — LOW

The entire HTTP response is buffered into a string before processing. For responses near the 5MB limit, this means up to ~10MB memory use (the response buffer + the resulting string). A streaming approach would allow size checking during download.

#### P4: `totalChapters()` Called Repeatedly Without Caching — LOW

`pickChapters` calls `totalChapters(corpus)` every invocation. While the Bible data arrays are static, the sum is recomputed each time. Trivial cost for a CLI, but indicates a missing optimization opportunity.

#### P5: Regex Patterns Recompiled on Every Call — LOW

All regex patterns in `processPassageHtml`, `extractFootnotes`, etc. are inline literals recompiled on each function invocation. Extracting them as module-level `const` patterns would avoid recompilation.

---

#### P6: No Caching of `totalChapters` Results — LOW

**Issue:** While P4 notes `totalChapters()` is called repeatedly, the broader concern is that `generateDailyReading` performs three calls to `pickChapters`, each internally calling `totalChapters`. For a CLI that runs once this is negligible, but it indicates a missing memoization pattern that would matter if the code were used as a library in a loop.

---

### 1.4 Sustainability & Maintainability (M1–M6)

#### M1: No CI/CD Pipeline — HIGH

No GitHub Actions workflow, no automated testing on push/PR. Tests only run if a developer remembers to run them locally.

#### M2: No NPM Publishing Configuration — MEDIUM

No `files` field in `package.json` (would publish everything including docs, tests, `.DS_Store`), no `prepublishOnly` script, no `.npmignore`.

#### M3: Vitest Version Pinning Too Loose — MEDIUM

`vitest: "^1.6.0"` allows any 1.x update. The `@rollup/rollup-linux-arm64-gnu` build failure on this machine demonstrates how transitive dependency drift causes breakage. Should pin to exact version or use a lockfile-based strategy.

#### M4: No Integration Tests for HTML Parsing — HIGH

All HTML parsing tests use tiny synthetic snippets (5-20 characters). There are no tests against realistic BibleGateway HTML. A single saved HTML fixture would catch regressions when BibleGateway changes their markup.

#### M5: No TypeScript Declaration Output — LOW

`tsconfig.json` doesn't enable `declaration: true`. If anyone wants to use `core.ts` functions as a library, they'd get no type information from the compiled output.

#### M6: `node --loader ts-node/esm` is Deprecated — LOW

The `dev` script uses the deprecated `--loader` flag. The current Node.js recommendation is `--import tsx` or `--experimental-strip-types` (Node 22+).

---

## Part 2: Remediation Plan — Test-First Iterations

Each iteration is a small, focused, independently shippable change. Tests are written *before* the implementation change in every iteration.

### Phase 1: Critical Security & Testability Foundation

#### Iteration 1: Make `core.ts` Functions Safely Testable in Isolation

**Goal:** Split the god module so each concern can be tested and secured independently.

1. **Write tests** that import from the new module paths (they will fail initially):
   - `tests/bible-data.test.ts` — Bible corpus integrity tests (moved from core.test.ts)
   - `tests/chapter-math.test.ts` — `totalChapters`, `flatIndexToRef`, `pickChapters`, `formatSegments`
   - `tests/url-builder.test.ts` — `buildBibleGatewayUrl`
   - `tests/html-parser.test.ts` — All HTML conversion functions
   - `tests/cli-args.test.ts` — `parseDay`, `parseVersion`, `ValidationError`
   - `tests/reading-plan.test.ts` — `generateDailyReading`

2. **Extract modules:**
   - `src/bible-data.ts` — OT, GOSPELS, NT_REST arrays and Book type
   - `src/chapter-math.ts` — Chapter calculation functions
   - `src/url-builder.ts` — URL construction
   - `src/html-parser.ts` — HTML-to-markdown conversion
   - `src/cli-args.ts` — Argument parsing and ValidationError
   - `src/reading-plan.ts` — `generateDailyReading` and `DailyReading` type
   - `src/core.ts` — Re-export barrel file for backward compatibility

3. **Verify** all existing tests still pass via the barrel re-exports.

#### Iteration 2: Make `index.ts` Testable

**Goal:** Introduce dependency injection so the CLI layer can be tested.

1. **Write tests** for `index.ts` behavior:
   - `tests/cli.test.ts` — Test `main()` with injected dependencies
   - Test help output, unknown flag rejection, validation error handling
   - Test markdown mode (with mocked fetch), URL output mode

2. **Refactor `index.ts`:**
   - Replace `die()` with thrown errors caught by `main()`
   - Extract a `Dependencies` interface: `{ fetch, fs, stdout, stderr, exit, argv }`
   - Make `main()` accept `Dependencies` parameter with production defaults
   - Tests inject mock implementations

3. **Verify** the CLI still works end-to-end manually.

#### Iteration 3: Fix Path Traversal (S1)

**Goal:** Constrain file output to a safe directory.

1. **Write tests:**
   - Test that `logFolder` containing `..` is rejected
   - Test that absolute paths outside CWD are rejected
   - Test that a valid relative path works
   - Test that the resolved path is within `process.cwd()`

2. **Implement:**
   - Add `validateLogFolder(folder: string): string` that resolves the path and checks it starts with `process.cwd()`
   - Call it before any `fs.mkdirSync` / `fs.writeFileSync`

3. **Verify** with the test suite.

#### Iteration 4: Fix ReDoS Risk (S3)

**Goal:** Replace vulnerable regex patterns with bounded alternatives.

1. **Write tests:**
   - Add a test with a deeply nested div structure (1000+ nesting levels)
   - Add a test with a very long string of repeated `<div>` tags
   - Assert that parsing completes within 1 second (timeout guard)

2. **Implement:**
   - Replace `[\s\S]*?` patterns with bounded alternatives where possible
   - For the passage-col extraction, switch to an iterative string-splitting approach instead of a single regex
   - Add a timeout guard around the entire `parseHtmlToMarkdown` function

3. **Verify** all HTML parsing tests still pass, plus the new ReDoS tests.

#### Iteration 5: Fix Terminal Escape Injection (S4) & Control Character Filtering (S5)

**Goal:** Sanitize URL in OSC 8 output; filter control chars from HTML entity decoding.

1. **Write tests:**
   - Test that a URL containing `\x1b` is sanitized before OSC 8 output
   - Test that `&#27;` (ESC) is stripped or replaced in `decodeHtmlEntities`
   - Test that `&#0;` (NUL) is stripped

2. **Implement:**
   - Add `sanitizeForTerminal(url: string): string` that strips bytes `< 0x20` except `\n` and `\t`
   - In `decodeHtmlEntities`, filter numeric entity output to reject control characters (codepoint < 32, except 9/10/13)

3. **Verify** with test suite.

---

### Phase 2: Robustness & Quality

#### Iteration 6: Add URL Origin Validation (S2)

**Goal:** Prevent SSRF when `fetchConfig` is implemented.

1. **Write tests:**
   - Test that `fetchPassageAsMarkdown` rejects URLs not matching `biblegateway.com`
   - Test that it accepts valid BibleGateway URLs
   - Test that custom base URLs in config are validated at config-merge time

2. **Implement:**
   - Add `validateUrl(url: string, allowedHosts: string[]): void` function
   - Call it in `fetchPassageAsMarkdown` before `fetch()`
   - Validate `bibleGatewayBaseUrl` in `mergeConfig`

#### Iteration 7: Add Streaming Response Size Check (S6)

**Goal:** Check response size during download, not after.

1. **Write tests:**
   - Test that a response exceeding MAX_RESPONSE_SIZE is aborted mid-stream
   - Test that a response within limits is processed normally

2. **Implement:**
   - Replace `response.text()` with `response.body` stream reading
   - Accumulate chunks and abort when cumulative size exceeds limit

#### Iteration 8: Add Config Validation (Q10, Q12)

**Goal:** Reject invalid configuration values at merge time.

1. **Write tests:**
   - Test that `otChaptersPerDay: 0` throws
   - Test that `otChaptersPerDay: -1` throws
   - Test that `otChaptersPerDay: 1.5` throws
   - Test that `bibleGatewayBaseUrl` without `https://` throws
   - Test valid configs pass

2. **Implement:**
   - Add `validateConfig(config: ReadingPlanConfig): void`
   - Call from `mergeConfig` and `main`
   - Validate: positive integers for chapter counts, HTTPS URL for base URL, non-empty strings

#### Iteration 9: Add HTML Parsing Robustness (Q4, Q5)

**Goal:** Detect and report when HTML parsing produces no meaningful output.

1. **Write tests:**
   - Test `parseHtmlToMarkdown` with an empty string returns a descriptive error/fallback
   - Test with HTML that has no passage-text divs returns a warning message
   - Test with a completely unrecognized HTML structure

2. **Implement:**
   - After parsing, check if output is empty or whitespace-only
   - If empty, return a fallback message: "Could not extract passage text. The page may have changed structure."
   - Log a warning to stderr

#### Iteration 10: Add HTML Fixture Integration Tests (M4)

**Goal:** Test HTML parsing against realistic BibleGateway HTML.

1. **Create fixtures:**
   - Save 2–3 real BibleGateway HTML responses as `tests/fixtures/*.html`
   - Save expected markdown output as `tests/fixtures/*.expected.md`

2. **Write tests:**
   - `tests/html-parser.integration.test.ts` — Load each fixture, parse, compare to expected output
   - Use snapshot testing for regression detection

3. **Verify** that current parsing produces acceptable output from real HTML.

---

### Phase 3: Performance & Tooling

#### Iteration 11: Single-Pass HTML Entity Decoding (P1)

**Goal:** Replace 22-pass replace chain with a single-pass lookup.

1. **Write benchmark test:**
   - Generate a 1MB string with mixed entities
   - Assert decoding completes within a time budget
   - Verify output matches the current implementation

2. **Implement:**
   - Create a `Map<string, string>` of named entities
   - Use a single `replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, ...)` with a lookup function
   - Handle numeric/hex entities in the same callback

3. **Verify** all `decodeHtmlEntities` tests pass; compare benchmark.

#### Iteration 12: Pre-Compile Regex Patterns (P5)

**Goal:** Extract all inline regex patterns as module-level constants.

1. **Write tests:**
   - No new tests needed — existing tests serve as regression suite.
   - Optionally add a micro-benchmark for `processPassageHtml` on a large input.

2. **Implement:**
   - Extract all regex literals from `processPassageHtml`, `processFootnotesHtml`, `extractFootnotes`, `parseHtmlToMarkdown` into named constants at the top of `html-parser.ts`.

3. **Verify** all tests pass.

#### Iteration 13: Add ESLint + Prettier (Q8)

**Goal:** Automated code style enforcement.

1. **Configure:**
   - Add `eslint.config.js` (flat config) with `@typescript-eslint/recommended-type-checked`
   - Add `.prettierrc` with consistent settings
   - Add `lint` and `format` scripts to `package.json`

2. **Fix** all linting violations.

3. **Verify** `npm run lint` passes.

#### Iteration 14: Add CI/CD Pipeline (M1)

**Goal:** Automated testing on every push and PR.

1. **Create** `.github/workflows/ci.yml`:
   - Matrix: Node 18, 20, 22
   - Steps: install, lint, type-check, test, build
   - Run on push to main and all PRs

2. **Add** `prepublishOnly` script that runs `npm run build && npm test`

3. **Verify** by pushing a branch and confirming the workflow runs.

---

### Phase 4: Cleanup

#### Iteration 15: Remove Dead Code & Fix Minor Issues (Q6, Q7, Q11, Q14, Q16)

**Goal:** Clean up accumulated minor issues.

1. **Write tests** for new exit code behavior (if implementing Q14).

2. **Implement:**
   - Remove `fetchConfig` placeholder (Q11) or implement it properly
   - Make `DailyReading` fields readonly (Q16)
   - Use markdown syntax instead of raw HTML in footnote output (Q6)
   - Replace synchronous fs calls with async equivalents (Q7)
   - Add structured exit codes: 1 = validation, 2 = network, 3 = file I/O (Q14)

3. **Verify** all tests pass.

#### Iteration 16: Fix NPM Publishing Config (M2) & Dependency Pinning (M3)

**Goal:** Prepare for clean `npm publish` and reproducible builds.

1. **Implement:**
   - Add `"files": ["dist/", "README.md", "LICENSE"]` to `package.json`
   - Add `"prepublishOnly": "npm run build && npm test"` script
   - Enable `"declaration": true` and `"declarationMap": true` in `tsconfig.json` (M5)
   - Pin vitest to exact version: `"vitest": "1.6.0"` (M3)
   - Replace deprecated `--loader ts-node/esm` with `--import tsx` in dev script (M6)
   - Remove committed `dist/` directory from git tracking (Q9)

2. **Verify** `npm pack --dry-run` shows only intended files.

---

## Priority Matrix

| Priority | Iteration | Issue(s) | Effort |
|----------|-----------|----------|--------|
| **Critical** | 1 | Q1 (God module) | Medium |
| **Critical** | 2 | Q2, Q3 (Untestable CLI) | Medium |
| **Critical** | 3 | S1 (Path traversal) | Small |
| **Critical** | 4 | S3 (ReDoS) | Large |
| **Critical** | 5 | S4, S5 (Terminal injection) | Small |
| **High** | 6 | S2 (SSRF + URL format validation) | Small |
| **High** | 7 | S6 (Response streaming) | Medium |
| **High** | 8 | Q10, Q12 (Config validation) | Small |
| **High** | 9 | Q4, Q5 (Parse robustness) | Medium |
| **High** | 10 | M4 (Integration tests) | Medium |
| **Medium** | 11 | P1, P2 (Entity decode + passage parse perf) | Medium |
| **Medium** | 12 | P5 (Regex compilation) | Small |
| **Medium** | 13 | Q8 (Linting) | Medium |
| **Medium** | 14 | M1 (CI/CD) | Medium |
| **Low** | 15 | Q6,7,11,14,15,16 (Cleanup + error types) | Medium |
| **Low** | 16 | M2,3,5,6 (Publishing) | Small |

> **Note on ordering:** Consider moving M4 (Integration tests, Iteration 10) earlier in the sequence — ideally right after Iteration 1 (module split). Realistic HTML fixtures will surface additional ReDoS patterns and parsing fragility before the structural refactoring in Iterations 4 and 9, providing better test coverage during those changes.

---

## Appendix: Issue Cross-Reference

| ID | Category | Severity | File(s) | Line(s) |
|----|----------|----------|---------|---------|
| S1 | Security | HIGH | index.ts | 126-138 |
| S2 | Security | MEDIUM | config.ts, core.ts | 30, 188 |
| S3 | Security | HIGH | core.ts | 229-401, 325-344 |
| S4 | Security | MEDIUM | index.ts | 147 |
| S5 | Security | LOW | core.ts | 222-223 |
| S6 | Security | MEDIUM | index.ts | 74-77 |
| S7 | Security | LOW | core.ts | 449 |
| Q1 | Quality | HIGH | core.ts | 1-506 |
| Q2 | Quality | HIGH | index.ts | 1-156 |
| Q3 | Quality | HIGH | index.ts | 15-18 |
| Q4 | Quality | MEDIUM | core.ts | 229-401 |
| Q5 | Quality | MEDIUM | core.ts | 349-401 |
| Q6 | Quality | LOW | core.ts | 315 |
| Q7 | Quality | LOW | index.ts | 129-138 |
| Q8 | Quality | MEDIUM | (missing) | — |
| Q9 | Quality | LOW | .gitignore, dist/ | — |
| Q10 | Quality | MEDIUM | config.ts | 6-19 |
| Q11 | Quality | LOW | config.ts | 41-45 |
| Q12 | Quality | LOW | config.ts | 50-54 |
| Q13 | Quality | LOW | core.ts | 199-224 |
| Q14 | Quality | LOW | index.ts | 15-18 |
| Q15 | Quality | MEDIUM | core.ts | 418-453 |
| Q16 | Quality | LOW | core.ts | 459-468 |
| P1 | Performance | MEDIUM | core.ts | 199-224 |
| P2 | Performance | HIGH | core.ts | 229-294 |
| P3 | Performance | LOW | index.ts | 74 |
| P4 | Performance | LOW | core.ts | 138 |
| P5 | Performance | LOW | core.ts | 229-401 |
| P6 | Performance | LOW | core.ts | 108, 138 |
| M1 | Sustainability | HIGH | (missing) | — |
| M2 | Sustainability | MEDIUM | package.json | — |
| M3 | Sustainability | MEDIUM | package.json | 24 |
| M4 | Sustainability | CRITICAL | tests/ | — |
| M5 | Sustainability | LOW | tsconfig.json | — |
| M6 | Sustainability | LOW | package.json | 13 |
