# Documentation

This folder contains architectural diagrams and documentation for the Bible URL CLI project.

## Diagrams

All diagrams are in [draw.io](https://app.diagrams.net/) format (`.drawio` files). You can:
- Open them directly in VS Code with the [Draw.io Integration](https://marketplace.visualstudio.com/items?itemName=hediet.vscode-drawio) extension
- Open them at [app.diagrams.net](https://app.diagrams.net/)
- Open them in the desktop Draw.io application

### Available Diagrams

| File | Description |
|------|-------------|
| `architecture-overview.drawio` | High-level system architecture showing CLI layer, application core, external services, and output layer |
| `data-flow.drawio` | Data flow through the application for both URL mode and Markdown mode, including key transformations |
| `technical-choices.drawio` | Technical decisions and rationale: language, architecture, security, testing, HTML parsing, terminal UX |
| `roadmap.drawio` | Areas of growth, future features, technical debt, and priority matrix |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Layer                            │
│  User → bibleurl <day> [--version X] [--markdown]           │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    Application Core                         │
│  ┌─────────────┐  ┌─────────────────────────────────────┐   │
│  │  index.ts   │  │            core.ts                  │   │
│  │  (Entry)    │──│  • Bible data (OT, Gospels, NT)     │   │
│  └─────────────┘  │  • Chapter picking & formatting     │   │
│  ┌─────────────┐  │  • URL building                     │   │
│  │  config.ts  │  │  • HTML → Markdown parsing          │   │
│  │  (Settings) │  │  • CLI argument parsing             │   │
│  └─────────────┘  └─────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌─────────────────────┐       ┌─────────────────────┐
│   Terminal Output   │       │    BibleGateway     │
│   (OSC 8 Link)      │       │    (fetch HTML)     │
└─────────────────────┘       └──────────┬──────────┘
                                         │
                              ┌──────────▼──────────┐
                              │   Log/ Folder       │
                              │   (Markdown Files,  │
                              │     gitignored)     │
                              └─────────────────────┘
```

## Key Technical Decisions

1. **Functional Core / Imperative Shell** - Pure functions in `core.ts` for testability, IO in `index.ts`
2. **Zero HTTP Dependencies** - Uses native `fetch()` (Node.js ≥18)
3. **Regex HTML Parsing** - No cheerio/jsdom; BibleGateway HTML is predictable
4. **OSC 8 Hyperlinks** - Clickable terminal links without external dependencies
5. **TypeScript Strict Mode** - Catches bugs at compile time

## Future Roadmap Highlights

### Quick Wins
- `--date` flag (calculate day from date)
- Response caching
- Poetry indentation

### Major Projects  
- Remote configuration
- Progress tracking
- Web UI

### Technical Debt
- HTML parsing brittleness (needs integration tests)
- No offline support
- Poetry formatting incomplete

See `roadmap.drawio` for the current priority matrix.
