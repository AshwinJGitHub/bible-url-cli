# Documentation

This folder contains architectural diagrams and documentation for the Bible URL CLI project.

## Diagrams

All diagrams are in [draw.io](https://app.diagrams.net/) format (`.drawio` files). You can:
- Open them directly in VS Code with the [Draw.io Integration](https://marketplace.visualstudio.com/items?itemName=hediet.vscode-drawio) extension
- Open them at [app.diagrams.net](https://app.diagrams.net/)
- Open them in the desktop Draw.io application

### SVG Exports (for GitHub viewing)

SVG versions of diagrams are available in the `svg/` folder for direct viewing on GitHub.

| Diagram | draw.io Source | SVG Preview |
|---------|----------------|-------------|
| Architecture Overview | [`architecture-overview.drawio`](./architecture-overview.drawio) | [`svg/architecture-overview.svg`](./svg/architecture-overview.svg) |
| Data Flow | [`data-flow.drawio`](./data-flow.drawio) | [`svg/data-flow.svg`](./svg/data-flow.svg) |
| Technical Choices | [`technical-choices.drawio`](./technical-choices.drawio) | [`svg/technical-choices.svg`](./svg/technical-choices.svg) |
| Roadmap | [`roadmap.drawio`](./roadmap.drawio) | [`svg/roadmap.svg`](./svg/roadmap.svg) |

### Exporting Diagrams

To regenerate SVG files from the draw.io sources:

```bash
npm run docs:export
```

**Prerequisites:** Requires the draw.io desktop application:
- macOS: `brew install --cask drawio`
- Linux: `snap install drawio`
- Windows: [Download from GitHub](https://github.com/jgraph/drawio-desktop/releases)

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
