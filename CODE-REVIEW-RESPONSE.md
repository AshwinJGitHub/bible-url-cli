# CODE-REVIEW-RESPONSE.md — Phase 1 Remediation Log

**Date:** 2026-02-07
**Branch:** `claude/inspiring-raman`
**Baseline:** 78 tests passing, 1 test file, 3 source files

---

## Phase 1: Critical Security & Testability Foundation

### Iteration 1: Split `core.ts` God Module (Q1) — COMPLETE

**Goal:** Break the 506-line monolith into focused modules for independent testing.

**New files created:**
| File | Responsibility |
|------|---------------|
| `src/bible-data.ts` | `Book` type, `OT`, `GOSPELS`, `NT_REST` arrays |
| `src/chapter-math.ts` | `ChapterRef`, `totalChapters`, `flatIndexToRef`, `pickChapters`, `formatSegments` |
| `src/url-builder.ts` | `buildBibleGatewayUrl` |
| `src/html-parser.ts` | `decodeHtmlEntities`, `processPassageHtml`, `processFootnotesHtml`, `extractFootnotes`, `parseHtmlToMarkdown` |
| `src/cli-args.ts` | `ValidationError`, `parseDay`, `parseVersion` |
| `src/reading-plan.ts` | `DailyReading` interface, `generateDailyReading` |
| `src/core.ts` | Barrel re-export file for backward compatibility |

**New test files created:**
- `tests/bible-data.test.ts` (8 tests)
- `tests/chapter-math.test.ts` (8 tests)
- `tests/url-builder.test.ts` (3 tests)
- `tests/html-parser.test.ts` (10 tests)
- `tests/cli-args.test.ts` (8 tests)
- `tests/reading-plan.test.ts` (4 tests)

**Verification:** 119 tests passing (78 original via barrel + 41 new direct-import tests). All existing tests continue to work unchanged through the barrel re-exports.

---

### Iteration 2: Make `index.ts` Testable (Q2, Q3) — COMPLETE

**Goal:** Replace `die()` / `process.exit()` with thrown errors, introduce DI.

**Changes to `src/index.ts`:**
- Removed `die()` function — replaced all calls with thrown `CliError`
- Removed `showHelp()` with `process.exit(0)` — replaced with `return` after printing
- Extracted `Dependencies` interface: `{ fetch, writeFile, mkdirSync, existsSync, stdout, stderr }`
- Made `main()` accept `(args, config, deps)` parameters with production defaults
- Exported `CliError`, `HELP_TEXT`, `KNOWN_FLAGS`, `fetchPassageAsMarkdown`, `main` for testing
- Added conditional direct-execution guard for CLI entry point

**New test file:** `tests/cli.test.ts` (15 tests)
- Tests help output for `--help` and `-h`
- Tests unknown flag rejection (`CliError`)
- Tests validation error propagation (missing day, invalid day, missing version)
- Tests URL output mode (OSC 8 hyperlink generation)
- Tests markdown mode (fetch → parse → write pipeline with mocked deps)
- Tests `fetchPassageAsMarkdown` error handling (404, oversized, valid)

**Verification:** 134 tests passing, type-check clean.

---

### Iteration 3: Fix Path Traversal (S1) — COMPLETE

**Goal:** Prevent arbitrary file write via `logFolder` config.

**New file:** `src/path-validation.ts`
- `validateLogFolder(folder, baseDir?)` — resolves path and validates it stays within `baseDir` (defaults to `process.cwd()`)
- Rejects `../` traversal, absolute paths outside base, and prefix-match attacks (e.g., `/home/user/project-other`)

**Integration:** `index.ts` now calls `validateLogFolder(config.logFolder)` before any file write.

**New test file:** `tests/path-validation.test.ts` (12 tests)
- Valid relative paths, nested paths, base directory itself
- Rejects `../../../etc/cron.d`, `../sibling`, `/etc/cron.d`, `/`, prefix attacks
- Allows paths with `..` that stay within base (e.g., `subdir/../Log`)

**CLI integration tests added to `tests/cli.test.ts`:**
- Rejects `logFolder: "../../../etc/cron.d"` in markdown mode
- Rejects `logFolder: "/tmp/evil"` in markdown mode

**Verification:** 148 tests passing, type-check clean.

---

### Iteration 4: Fix ReDoS Risk (S3) — COMPLETE

**Goal:** Replace vulnerable `[\s\S]*?` patterns with bounded alternatives, add timeout guard.

**Changes to `src/html-parser.ts`:**

1. **Bounded-backtrack regex patterns:** Replaced all `[\s\S]*?` inner-content patterns with the idiom `[^<]*(?:<(?!/closingtag>)[^<]*)*` which is linear-time:
   - `SUP_CONTENT` — for content inside `<sup>...</sup>`
   - `A_CONTENT` — for content inside `<a>...</a>`
   - `DIV_CONTENT` — for content inside `<div>...</div>`

2. **Iterative string splitting:** Replaced the vulnerable passage-col extraction regex (`/<div[^>]*class="[^"]*passage-col[^"]*"[^>]*>([\s\S]*?)(?=...)/gi`) with `splitPassageColumns()` — an `indexOf`-based iterative function that finds column boundaries without regex.

3. **Footnotes extraction:** Replaced `extractFootnotes` regex lookahead pattern with `indexOf`-based boundary detection.

4. **Timeout guard:** Added `PARSE_TIMEOUT_MS = 5000` check at key loop points in `parseHtmlToMarkdown` to abort if parsing takes too long.

**New test file:** `tests/redos.test.ts` (6 tests)
- 500 nested divs — completes under 1 second
- 200 repeated passage-col divs
- Pathological footnote sup patterns
- Pathological cross-reference patterns
- Pathological footnotes extraction
- Large realistic BibleGateway HTML (200 verses)

**Verification:** 154 tests passing, type-check clean.

---

### Iteration 5: Fix Terminal Escape Injection (S4) & Control Character Filtering (S5) — COMPLETE

**Goal:** Sanitize OSC 8 URLs and filter control chars from entity decoding.

**New file:** `src/sanitize.ts`
- `stripControlChars(text)` — removes C0 control chars (except `\t`, `\n`, `\r`), DEL, and C1 range
- `sanitizeForTerminal(url)` — applies `stripControlChars` to URL before OSC 8 embedding

**S4 fix in `src/index.ts`:**
- URL is now passed through `sanitizeForTerminal()` before embedding in OSC 8 escape sequence

**S5 fix in `src/html-parser.ts`:**
- Added `safeFromCharCode(code)` — returns `\uFFFD` (replacement character) for control character codepoints
- `&#27;` (ESC), `&#0;` (NUL), `&#127;` (DEL) etc. now produce `\uFFFD` instead of raw control chars
- Preserves tab (9), newline (10), carriage return (13)

**New test file:** `tests/sanitize.test.ts` (16 tests)
- Normal text passthrough
- Preserves `\t`, `\n`, `\r`
- Strips NUL, ESC, BEL, DEL, C1 range
- URL sanitization with embedded escape sequences

**Tests added to `tests/html-parser.test.ts`:**
- `&#27;` → `\uFFFD`
- `&#0;` → `\uFFFD`
- `&#x1B;` → `\uFFFD`
- `&#x00;` → `\uFFFD`
- `&#9;` → `\t` (preserved)
- `&#10;` → `\n` (preserved)
- `&#65;` → `A` (normal)
- `&#127;` → `\uFFFD`

**Verification:** 178 tests passing, type-check clean.

---

## Summary

| Metric | Before | After |
|--------|--------|-------|
| Test files | 1 | 11 |
| Tests | 78 | 178 |
| Source modules | 3 (`core.ts`, `index.ts`, `config.ts`) | 9 (+ `bible-data`, `chapter-math`, `url-builder`, `html-parser`, `cli-args`, `reading-plan`, `path-validation`, `sanitize`) |
| Security issues fixed | 0 | 4 (S1, S3, S4, S5) |
| Quality issues fixed | 0 | 3 (Q1, Q2, Q3) |

### Issues Addressed in Phase 1

| ID | Issue | Status |
|----|-------|--------|
| **S1** | Path traversal in logFolder | **FIXED** — `validateLogFolder()` constrains to CWD |
| **S3** | ReDoS in HTML regexes | **FIXED** — bounded-backtrack patterns + iterative splitting + timeout |
| **S4** | Terminal escape injection via OSC 8 | **FIXED** — `sanitizeForTerminal()` strips control chars from URL |
| **S5** | Control char injection via entity decoding | **FIXED** — `safeFromCharCode()` rejects control codepoints |
| **Q1** | God module (core.ts 506 lines) | **FIXED** — split into 6 focused modules + barrel |
| **Q2** | Untestable index.ts | **FIXED** — DI via `Dependencies` interface |
| **Q3** | `die()` calls `process.exit()` | **FIXED** — replaced with thrown `CliError` |

### Remaining Phases

- **Phase 2:** S2 (SSRF), S6 (streaming size check), Q10/Q12 (config validation), Q4/Q5 (parse robustness), M4 (integration tests)
- **Phase 3:** P1 (single-pass entity decode), P5 (pre-compiled regex), Q8 (linting), M1 (CI/CD)
- **Phase 4:** Q6/Q7/Q11/Q14/Q16 (cleanup), M2/M3/M5/M6 (publishing)
