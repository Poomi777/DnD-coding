# DnD Coding

A personal collection of Dungeons & Dragons tools built as standalone web apps — no frameworks, no build step, just open the HTML file in a browser.

## Tools

| Tool | Status | Description |
|------|--------|-------------|
| [Initiative Tracker](initiative-tracker/) | ✅ Live | Track initiative order, HP, AC, conditions, and turn state during combat |
| [Homebrew Arsenal](weapons/) | ✅ Live | Browse homebrew weapon cards — shareable link for players |
| [Map Creator](map-creator/) | 🔜 Planned | Build and annotate encounter maps |
| [Character Creator](character-creator/) | 🔜 Planned | Build and manage character sheets |

## Usage

Each tool lives in its own folder as a self-contained `index.html`. Just open the file in any modern browser — no server needed.

```
initiative-tracker/index.html   ← open this to run the tracker
```

## Project Structure

```
DnD-coding/
├── initiative-tracker/     # Combat initiative & HP tracker
├── map-creator/            # (planned)
├── character-creator/      # (planned)
└── shared/                 # Shared assets and utilities (future)
```

## Goals

- Keep every tool self-contained and offline-capable
- No dependencies on external services
- Fast to open, easy to use at the table
