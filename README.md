# bible-url-cli

This utility responds to the lack of a good dark mode on the Biblegateway site. It will render the print view in a highly compatible markdown file that can be viewed in your preferred viewer.

## Overview

This CLI tool generates a URL to read multiple Bible passages on [BibleGateway.com](https://www.biblegateway.com) based on a day number. The reading plan covers three tracks that cycle independently:

| Track | Chapters/Day | Total Chapters | Cycle Length |
|-------|--------------|----------------|--------------|
| Old Testament | 3 | 929 | ~310 days |
| Gospels | 1 | 89 | 89 days |
| NT (Acts–Revelation) | 1 | 171 | 171 days |

Each track loops back to the beginning when completed, so you can continue indefinitely.

## Installation

```bash
# Install globally
npm install -g bible-url-cli

# Or run directly with npx
npx bible-url-cli <day>
```

### From Source

```bash
git clone <repo-url>
cd bible-url-cli
npm install
npm run build
npm link  # Makes 'bibleurl' available globally
```

## Usage

```bash
bibleurl <day> [--version <VERSION>] [--markdown]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `<day>` | **Required.** The day number of your reading plan (positive integer). |
| `--version <VERSION>` | Optional. Bible version code (default: `NIV`). |
| `--markdown`, `-m` | Optional. Fetch and output passage text as Markdown. |

### Examples

```bash
# Day 1 of the reading plan (NIV) - outputs clickable URL
bibleurl 1
# Output: https://www.biblegateway.com/passage/?search=Genesis%201-3%2C%20Matthew%201%2C%20Acts%201&version=NIV&interface=print

# Day 100 with ESV translation
bibleurl 100 --version ESV

# Day 365 as Markdown (fetches and converts the passage)
bibleurl 365 --markdown

# Combine options
bibleurl 42 --version KJV -m
```

## Supported Bible Versions

Any version code supported by BibleGateway works. Common options:

- `NIV` - New International Version
- `ESV` - English Standard Version
- `KJV` - King James Version
- `NKJV` - New King James Version
- `NLT` - New Living Translation
- `NASB` - New American Standard Bible
- `MSG` - The Message
- `AMP` - Amplified Bible

See [BibleGateway Versions](https://www.biblegateway.com/versions/) for the full list.

## How It Works

For a given day `N`:

1. **Old Testament**: Reads 3 chapters starting at chapter `(N-1) * 3 + 1`
2. **Gospels**: Reads 1 chapter starting at chapter `N` (Matthew → Mark → Luke → John)
3. **NT Rest**: Reads 1 chapter starting at chapter `N` (Acts → Revelation)

When a track reaches the end, it wraps around to the beginning.

### Example: Day 1

- OT: Genesis 1–3
- Gospel: Matthew 1
- NT: Acts 1

### Example: Day 90

- OT: Numbers 14–16
- Gospel: Mark 1 (Gospels wrapped after day 89)
- NT: Acts 90

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev -- <day>

# Run built version
npm start <day>
```

## Configuration

The reading plan parameters are defined in `src/config.ts` and can be customized:

```typescript
{
  otChaptersPerDay: 3,      // OT chapters per day
  gospelChaptersPerDay: 1,  // Gospel chapters per day
  ntChaptersPerDay: 1,      // NT (non-Gospel) chapters per day
  defaultVersion: "NIV",    // Default Bible version
  bibleGatewayBaseUrl: "https://www.biblegateway.com/passage/?"
}
```

## License

MIT
