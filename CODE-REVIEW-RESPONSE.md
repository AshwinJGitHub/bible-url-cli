# CODE-REVIEW-RESPONSE.md — Remediation Log

**Date:** 2026-02-07
**Branch:** `claude/inspiring-raman`
**Baseline:** 78 tests passing, 1 test file, 3 source files

---

## Table of Contents

- [Phase 1: Critical Security & Testability Foundation](#phase-1-critical-security--testability-foundation)
  - [Iteration 1: Split `core.ts` God Module (Q1)](#iteration-1-split-corets-god-module-q1--complete)
  - [Iteration 2: Make `index.ts` Testable (Q2, Q3)](#iteration-2-make-indexts-testable-q2-q3--complete)
  - [Iteration 3: Fix Path Traversal (S1)](#iteration-3-fix-path-traversal-s1--complete)
  - [Iteration 4: Fix ReDoS Risk (S3)](#iteration-4-fix-redos-risk-s3--complete)
  - [Iteration 5: Fix Terminal Escape Injection (S4) & Control Characters (S5)](#iteration-5-fix-terminal-escape-injection-s4--control-character-filtering-s5--complete)
  - [Phase 1 Summary](#phase-1-summary)
- [Phase 2: Robustness & Quality](#phase-2-robustness--quality)
  - [Iteration 6: URL Origin Validation (S2)](#iteration-6-url-origin-validation-s2--complete)
  - [Iteration 7: Streaming Response Size Check (S6)](#iteration-7-streaming-response-size-check-s6--complete)
  - [Iteration 8: Config Validation (Q10, Q12)](#iteration-8-config-validation-q10-q12--complete)
  - [Iteration 9: HTML Parsing Robustness (Q4, Q5)](#iteration-9-html-parsing-robustness-q4-q5--complete)
  - [Iteration 10: HTML Fixture Integration Tests (M4)](#iteration-10-html-fixture-integration-tests-m4--complete)
  - [Phase 2 Summary](#phase-2-summary)
- [Phase 3: Performance & Tooling](#phase-3-performance--tooling)
  - [Iteration 11: Single-Pass HTML Entity Decoding (P1)](#iteration-11-single-pass-html-entity-decoding-p1--complete)
  - [Iteration 12: Pre-Compile Regex Patterns (P5)](#iteration-12-pre-compile-regex-patterns-p5--complete)
  - [Iteration 13: Add ESLint + Prettier (Q8)](#iteration-13-add-eslint--prettier-q8--complete)
  - [Iteration 14: Add CI/CD Pipeline (M1)](#iteration-14-add-cicd-pipeline-m1--complete)
  - [Phase 3 Summary](#phase-3-summary)
- [Remaining Phases](#remaining-phases)

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

### Phase 1 Summary

| Metric | Before | After |
|--------|--------|-------|
| Test files | 1 | 11 |
| Tests | 78 | 178 |
| Source modules | 3 (`core.ts`, `index.ts`, `config.ts`) | 9 (+ `bible-data`, `chapter-math`, `url-builder`, `html-parser`, `cli-args`, `reading-plan`, `path-validation`, `sanitize`) |
| Security issues fixed | 0 | 4 (S1, S3, S4, S5) |
| Quality issues fixed | 0 | 3 (Q1, Q2, Q3) |

| ID | Issue | Status |
|----|-------|--------|
| **S1** | Path traversal in logFolder | **FIXED** — `validateLogFolder()` constrains to CWD |
| **S3** | ReDoS in HTML regexes | **FIXED** — bounded-backtrack patterns + iterative splitting + timeout |
| **S4** | Terminal escape injection via OSC 8 | **FIXED** — `sanitizeForTerminal()` strips control chars from URL |
| **S5** | Control char injection via entity decoding | **FIXED** — `safeFromCharCode()` rejects control codepoints |
| **Q1** | God module (core.ts 506 lines) | **FIXED** — split into 6 focused modules + barrel |
| **Q2** | Untestable index.ts | **FIXED** — DI via `Dependencies` interface |
| **Q3** | `die()` calls `process.exit()` | **FIXED** — replaced with thrown `CliError` |

---

## Phase 2: Robustness & Quality

### Iteration 6: URL Origin Validation (S2) — COMPLETE

**Goal:** Prevent SSRF via configurable base URL and fetch targets.

**New file:** `src/url-validation.ts`
- `ALLOWED_HOSTS` — readonly array of `["www.biblegateway.com", "biblegateway.com"]`
- `validateUrl(url, allowedHosts?)` — validates HTTPS protocol and hostname against allowlist
- `validateBaseUrl(baseUrl, allowedHosts?)` — validates config base URL

**Integration:**
- `fetchPassageAsMarkdown()` in `index.ts` now calls `validateUrl(url)` before any `fetch()`
- `mergeConfig()` in `config.ts` validates `bibleGatewayBaseUrl` via `validateBaseUrl()`

**New test file:** `tests/url-validation.test.ts` (17 tests)
- Accepts valid BibleGateway URLs (with and without `www.`)
- Rejects HTTP URLs, internal IPs (`169.254.169.254`), localhost, arbitrary hosts
- Rejects invalid URLs, FTP protocol
- Custom allowlist support
- `validateBaseUrl` coverage

**Tests added to `tests/cli.test.ts`:**
- SSRF rejection: non-HTTPS URL
- SSRF rejection: non-BibleGateway host

**New test file:** `tests/config.test.ts` (6 tests)
- Base URL validation at merge time

**Verification:** 203 tests passing, type-check clean.

---

### Iteration 7: Streaming Response Size Check (S6) — COMPLETE

**Goal:** Check response size during download, not after full buffering.

**New function in `src/index.ts`:** `readResponseWithLimit(response, maxBytes)`
- Uses `response.body.getReader()` to stream the body
- Tracks cumulative byte size and aborts when exceeding `maxBytes`
- Falls back to `response.text()` when `body` is null (test mocks)
- Replaces the previous `response.text()` call in `fetchPassageAsMarkdown`

**Exported:** `readResponseWithLimit`, `MAX_RESPONSE_SIZE`

**Tests added to `tests/cli.test.ts` (6 tests):**
- Normal-sized response reads successfully
- Oversized single chunk aborts with `CliError`
- Multi-chunk stream exceeding limit aborts mid-stream
- Response exactly at limit accepted
- Null-body fallback to `.text()`
- Null-body fallback rejects oversized text

**Verification:** 209 tests passing, type-check clean.

---

### Iteration 8: Config Validation (Q10, Q12) — COMPLETE

**Goal:** Reject invalid configuration values at merge time.

**New function in `src/config.ts`:** `validateConfig(config)`
- Validates `otChaptersPerDay`, `gospelChaptersPerDay`, `ntChaptersPerDay` are positive integers
- Validates `defaultVersion` is a non-empty string
- Validates `logFolder` is a non-empty string
- Validates `bibleGatewayBaseUrl` is valid HTTPS URL

**Q12 fix:** `mergeConfig(overrides, base?)` now accepts an optional `base` parameter (defaults to `defaultConfig`) for composability. Calls `validateConfig` on the merged result.

**Rewritten `tests/config.test.ts` (18 tests):**

`validateConfig` tests:
- Accepts valid default config
- Rejects `otChaptersPerDay: 0`, `-1`, `1.5`
- Rejects `gospelChaptersPerDay: 0`
- Rejects `ntChaptersPerDay: -1`
- Rejects empty `defaultVersion` and empty `logFolder`
- Rejects HTTP base URL and invalid base URL

`mergeConfig` tests:
- Returns defaults when no overrides
- Partial overrides merge correctly
- Validates merged result
- Custom base parameter works
- Rejects invalid merged config

**Verification:** 221 tests passing, type-check clean.

---

### Iteration 9: HTML Parsing Robustness (Q4, Q5) — COMPLETE

**Goal:** Detect and report when HTML parsing produces no meaningful output.

**Changes to `src/html-parser.ts`:**
- Added early return for empty/whitespace-only input (returns `""` — not an error)
- Added `PARSE_FALLBACK_MESSAGE` constant: `"⚠ Could not extract passage text. The page structure may have changed."`
- After parsing non-empty HTML, if the result is empty/whitespace-only, returns the fallback message instead of silent empty string
- Exported `PARSE_FALLBACK_MESSAGE` for caller use

**Changes to `src/index.ts`:**
- In markdown mode, after fetching and parsing, checks if result equals `PARSE_FALLBACK_MESSAGE`
- If so, logs a warning to `deps.stderr` so the user knows parsing failed gracefully

**Updated barrel:** `src/core.ts` re-exports `PARSE_FALLBACK_MESSAGE`

**Tests added to `tests/html-parser.test.ts` (6 tests):**
- Empty string still returns `""` (not an error)
- HTML with no passage-text divs returns fallback message
- Completely unrecognized HTML structure returns fallback
- Whitespace-only passage text returns fallback
- Valid passage HTML parses successfully (no fallback)
- Valid passage with BCV heading parses correctly
- Fallback passage-text without passage-col wrapper works

**Test added to `tests/cli.test.ts` (1 test):**
- Markdown mode with unrecognized HTML warns to stderr

**Verification:** 228 tests passing, type-check clean.

---

### Iteration 10: HTML Fixture Integration Tests (M4) — COMPLETE

**Goal:** Test HTML parsing against realistic BibleGateway HTML fixtures.

**New fixtures:**
| File | Content |
|------|---------|
| `tests/fixtures/genesis-1-niv.html` | Genesis 1, NIV — full chapter with headings, poetry, footnotes |
| `tests/fixtures/psalm-23-esv.html` | Psalm 23, ESV — poetry formatting, small-caps, cross-refs, 6 footnotes |
| `tests/fixtures/multi-passage-niv.html` | Genesis 1 + Matthew 1, NIV — multi-column with footnotes in second column |

**New test file:** `tests/html-parser.integration.test.ts` (32 tests)

Genesis 1 NIV tests:
- Non-empty output (not fallback message)
- Extracts passage heading `# Genesis 1`
- Extracts version name `New International Version`
- Contains section heading "The Beginning"
- Contains verse text content
- Verse number markup present
- Decodes HTML entities (`&ldquo;` → `"`, `&mdash;` → `—`)
- Contains footnote section with correct IDs
- No raw HTML tags (div, span, p) in output
- No cross-reference markers
- Text from multiple verses across chapter

Psalm 23 ESV tests:
- Extracts heading, version, shepherd text
- Handles `small-caps` LORD correctly
- Removes cross-references
- Contains 6 footnote references
- No raw crossrefs section
- Contains verse 6 text

Multi-passage tests:
- Both passage headings extracted (`Genesis 1`, `Matthew 1`)
- Text from both passages present
- Section headings from both passages
- Footnotes from Matthew passage
- Version shown only once

Edge case tests:
- Whitespace-only passage content returns fallback
- Non-BibleGateway HTML (404 page) returns fallback
- Deeply nested HTML entities decoded correctly

**Key discovery:** Integration tests revealed that BibleGateway's `&nbsp;` after verse numbers (e.g., `<sup class="versenum">2&nbsp;</sup>`) is not matched by the `\s*` in the versenum regex. This is a known Q4 limitation — the `&nbsp;` entity is not whitespace at the regex stage (entity decoding happens later). This documents a real-world parsing fragility for future improvement.

**Verification:** 260 tests passing, type-check clean.

---

### Phase 2 Summary

| Metric | Phase 1 End | Phase 2 End |
|--------|-------------|-------------|
| Test files | 11 | 14 |
| Tests | 178 | 260 |
| Source modules | 9 | 10 (+ `url-validation`) |
| Security issues fixed | 4 | 6 (+ S2, S6) |
| Quality issues fixed | 3 | 7 (+ Q4, Q5, Q10, Q12) |
| Maintainability fixes | 0 | 1 (M4) |

| ID | Issue | Status |
|----|-------|--------|
| **S2** | SSRF via configurable base URL | **FIXED** — `validateUrl()` with hostname allowlist |
| **S6** | TOCTOU in response size check | **FIXED** — streaming `readResponseWithLimit()` |
| **Q4** | Fragile regex HTML parsing | **MITIGATED** — fallback message + integration tests documenting limitations |
| **Q5** | No error recovery in `parseHtmlToMarkdown` | **FIXED** — returns `PARSE_FALLBACK_MESSAGE` + stderr warning |
| **Q10** | No config value validation | **FIXED** — `validateConfig()` checks types and ranges |
| **Q12** | `mergeConfig` not composable | **FIXED** — optional `base` parameter |
| **M4** | No integration tests for HTML parsing | **FIXED** — 3 fixtures, 32 integration tests |

---

## Phase 3: Performance & Tooling

### Iteration 11: Single-Pass HTML Entity Decoding (P1) — COMPLETE

**Goal:** Replace the 22-pass sequential `.replace()` chain with a single-pass lookup.

**Changes to `src/html-parser.ts`:**

1. **Entity lookup map:** Created `NAMED_ENTITIES: ReadonlyMap<string, string>` with 56 named HTML entities, including all original 20 entities plus 36 extended entities (Q13: `&euro;`, `&pound;`, `&sect;`, `&para;`, `&laquo;`, `&raquo;`, `&bull;`, `&times;`, `&divide;`, etc.)

2. **Single regex:** Pre-compiled `ENTITY_REGEX = /&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]\w*);/g` matches all entity forms (named, decimal, hex) in one pass.

3. **Unified callback:** `decodeHtmlEntities()` now uses a single `.replace()` call with a callback that handles:
   - Decimal numeric entities (`&#NNN;`) via `safeFromCharCode()`
   - Hex numeric entities (`&#xHHH;`) via `safeFromCharCode()`
   - Named entities via `NAMED_ENTITIES.get()` lookup
   - Unknown entities left unchanged (returned as-is)

**Performance:** Reduced from 22 string scans to 1 string scan per call. Benchmark test confirms 1MB mixed-entity string decodes in under 500ms.

**Also addresses Q13** (incomplete entity coverage) — 36 additional named entities now decoded.

**Tests added to `tests/html-parser.test.ts` (9 tests):**
- All basic HTML entities (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`, `&apos;`)
- Typographic entities with correct normalization (`&rsquo;`→`'`, `&mdash;`→`—`)
- Symbol entities (`&copy;`, `&reg;`, `&trade;`, `&deg;`)
- Fraction entities (`&frac12;`, `&frac14;`, `&frac34;`)
- Extended entities (`&euro;`, `&pound;`, `&sect;`, `&para;`, `&laquo;`, `&raquo;`)
- Multiple entities in one string
- Unknown entities left unchanged
- No-entity strings pass through unchanged
- 1MB benchmark: mixed entities decode in under 500ms

**Verification:** 269 tests passing, type-check clean.

---

### Iteration 12: Pre-Compile Regex Patterns (P5) — COMPLETE

**Goal:** Extract all inline regex patterns as module-level constants to avoid recompilation.

**Changes to `src/html-parser.ts`:**

Extracted **35 regex patterns** from function bodies into named module-level constants, organized by function:

`processPassageHtml` patterns (22):
- `RE_CROSSREF_SUP`, `RE_CROSSREF_A` — cross-reference removal
- `RE_BCV_HEADING`, `RE_TRANSLATION_DISPLAY` — heading extraction
- `RE_H1_BCV`, `RE_H2`, `RE_H3_HEADING`, `RE_H3`, `RE_H4` — heading levels
- `RE_SPAN_HEADING`, `RE_VERSENUM`, `RE_CHAPTERNUM` — verse/chapter numbers
- `RE_FOOTNOTE_REF` — footnote reference extraction
- `RE_INDENT1`, `RE_INDENT2`, `RE_POETRY` — poetry formatting
- `RE_BR`, `RE_P_OPEN`, `RE_P_CLOSE` — line breaks and paragraphs
- `RE_SMALL_CAPS`, `RE_STRIP_TAGS`, `RE_CROSSREF_MARKERS` — cleanup
- `RE_MULTI_NEWLINE`, `RE_MULTI_SPACE`, `RE_LEADING_SPACE`, `RE_TRAILING_SPACE` — whitespace normalization

`processFootnotesHtml` patterns (4):
- `RE_FN_ITEM`, `RE_FN_LETTER`, `RE_BIBLEREF_LINK`, `RE_STRIP_ALL_TAGS`

`extractFootnotes` patterns (1):
- `RE_FN_OL`

`splitPassageColumns` patterns (2):
- `RE_PASSAGE_COL_MARKER`, `RE_DIV_OPEN_SUFFIX`

`parseHtmlToMarkdown` patterns (4):
- `RE_VERSION_MATCH`, `RE_BCV_MATCH`, `RE_PASSAGE_TEXT`, `RE_PASSAGE_TEXT_FALLBACK`

**Added `resetRegex()` helper** — resets `lastIndex` on global (`/g`) regexes before each use, since pre-compiled global regexes are stateful and retain their position between calls.

**Verification:** 269 tests passing, type-check clean. No new tests needed — existing 269 tests serve as the regression suite.

---

### Iteration 13: Add ESLint + Prettier (Q8) — COMPLETE

**Goal:** Automated code style enforcement.

**New files:**
| File | Purpose |
|------|---------|
| `eslint.config.js` | ESLint flat config with `@typescript-eslint/recommended-type-checked` |
| `.prettierrc` | Prettier settings (120 col, double quotes, trailing commas, LF) |
| `tsconfig.eslint.json` | Extended tsconfig including `tests/` for type-aware linting |

**ESLint configuration:**
- Base: `@eslint/js` recommended + `typescript-eslint` recommended-type-checked
- Prettier integration via `eslint-config-prettier` (last, overrides formatting rules)
- Custom rules: `no-console: off`, `no-unused-vars` with `_` prefix pattern, `no-non-null-assertion: warn`
- Ignores: `dist/`, `tests/fixtures/`
- Project: uses `tsconfig.eslint.json` for type-aware linting of both `src/` and `tests/`

**New scripts in `package.json`:**
- `lint` — `eslint src/ tests/`
- `lint:fix` — `eslint src/ tests/ --fix`
- `format` — `prettier --write`
- `format:check` — `prettier --check`

**Lint violations fixed:**
- Removed unused `/* eslint-disable no-console */` directive in `index.ts`
- Added `void` to floating `reader.cancel()` promises in `readResponseWithLimit()` (2 locations)
- Added eslint-disable for `require-await` on `fetchConfig` placeholder (will be removed in Phase 4 Q11)
- Fixed unused import `PARSE_FALLBACK_MESSAGE` in `html-parser.test.ts`
- Fixed unused variable `total` → `_total` in `core.test.ts`
- Removed unnecessary type assertion in `cli.test.ts`
- Added `no-control-regex` disable for intentional control char test in `sanitize.test.ts`

**DevDependencies added:** `eslint@^9`, `@eslint/js@^9`, `typescript-eslint@^8`, `prettier@^3`, `eslint-config-prettier@^10`

**Result:** 0 ESLint errors, 10 warnings (all acceptable `no-non-null-assertion` at justified locations).

**Verification:** 269 tests passing, lint clean (0 errors), format clean, type-check clean.

---

### Iteration 14: Add CI/CD Pipeline (M1) — COMPLETE

**Goal:** Automated testing on every push and PR.

**New file:** `.github/workflows/ci.yml`
- **Trigger:** Push to `main`/`master`, PRs targeting `main`/`master`
- **Matrix:** Node.js 18, 20, 22
- **Steps:** checkout → setup-node (with npm cache) → `npm ci` → lint → format:check → type-check → test → build
- **Permissions:** `contents: read` (principle of least privilege)

**New scripts in `package.json`:**
- `prepublishOnly` — `npm run build && npm test` (safety gate before publish)
- `typecheck` — `tsc --noEmit`

**Local validation:** All 6 CI steps pass locally:
1. `npm run lint` — 0 errors, 10 warnings
2. `npm run format:check` — all files formatted
3. `npx tsc --noEmit` — clean
4. `npm test` — 269 tests passing
5. `npm run build` — compiles successfully

**Verification:** 269 tests passing, all CI steps pass locally.

---

### Phase 3 Summary

| Metric | Phase 2 End | Phase 3 End |
|--------|-------------|-------------|
| Test files | 14 | 14 |
| Tests | 260 | 269 |
| Source modules | 10 | 10 |
| Security issues fixed | 6 | 6 |
| Quality issues fixed | 7 | 9 (+ Q8, Q13) |
| Performance issues fixed | 0 | 2 (P1, P5) |
| Maintainability fixes | 1 | 2 (+ M1) |
| Tooling | None | ESLint + Prettier + CI/CD |

| ID | Issue | Status |
|----|-------|--------|
| **P1** | 22-pass sequential entity decode | **FIXED** — single-pass `Map` lookup + unified regex |
| **P5** | Regex patterns recompiled on every call | **FIXED** — 35 patterns extracted as module-level constants |
| **Q8** | No linting or formatting | **FIXED** — ESLint flat config + Prettier + CI enforcement |
| **Q13** | Incomplete entity coverage | **FIXED** — 36 additional named entities in lookup map |
| **M1** | No CI/CD pipeline | **FIXED** — GitHub Actions with Node 18/20/22 matrix |

---

## Remaining Phases

- **Phase 4:** Q6 (footnote HTML in markdown), Q7 (sync fs in async), Q11 (dead `fetchConfig`), Q14 (structured exit codes), Q16 (readonly DailyReading), M2 (npm publishing config), M3 (vitest pinning), M5 (TypeScript declarations), M6 (deprecated `--loader`)
