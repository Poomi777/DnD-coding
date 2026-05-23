# DnD Coding — Project Context

Personal DnD tools workspace. All tools are standalone HTML files — no framework, no build step, open directly in a browser.

## Current Tools

- **initiative-tracker/** — Combat tracker: initiative order, HP, AC, conditions, turn state

## Planned Tools

- **map-creator/** — Encounter map builder
- **character-creator/** — Character sheet manager

## Tech Approach

- Pure HTML + CSS + vanilla JS in a single file per tool
- No external dependencies or CDN imports unless truly necessary
- Must work fully offline
- Designed to be used at the table on a laptop/tablet

## Code Style

- Single-file per tool (HTML + embedded `<style>` and `<script>`)
- CSS variables for theming (the tracker uses `--color-*` design tokens)
- Keep UI compact — these are used during play, not for reading
- Mobile-friendly is a nice-to-have; desktop-first is fine

## Folder Structure

```
initiative-tracker/index.html
map-creator/index.html          (future)
character-creator/index.html    (future)
shared/                         (future — shared CSS/JS utilities if tools grow)
```
