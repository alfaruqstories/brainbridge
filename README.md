# BrainBridge

BrainBridge makes Obsidian vaults understandable everywhere else.

It scans a vault, identifies Obsidian-specific behavior, and generates portable fallback artifacts for Markdown tools, agents, static sites, search systems, and editors that do not run Obsidian.

BrainBridge is not anti-Obsidian. It treats Obsidian as a powerful interface over files, then makes the file-backed knowledge easier to reuse outside that interface.

## Install

```bash
pnpm install
pnpm build
```

## Commands

```bash
brainbridge audit
brainbridge audit <vault>
brainbridge audit <vault> --out <dir>
brainbridge bridge <vault> --out <dir>
brainbridge graph <vault> --out <dir>
brainbridge export <vault> --out <dir>
```

When `<vault>` is omitted, BrainBridge scans the current directory. That makes the common workflow:

```bash
cd /path/to/obsidian-vault
brainbridge export --out ./brainbridge-export
```

`audit` reports what will and will not work outside Obsidian.

`bridge` generates fallback artifacts without copying the whole vault.

`graph` emits graph and backlink artifacts only.

`export` creates a portable bundle with notes, attachments, fallbacks, and a degradation report.

V1 never mutates the source vault.

## What Portable Artifacts Mean

BrainBridge does not turn every Obsidian-only feature into native behavior in every Markdown app. Instead, it generates readable fallback files and indexes that make the vault easier to inspect elsewhere:

- graph and backlink files for tools without Obsidian's live graph
- attachment indexes for embedded files
- task and property indexes generated from portable Markdown and YAML frontmatter
- plugin dependency and degradation reports for Dataview, Tasks, Templater, Kanban, Excalidraw, Canvas, and Bases
- Markdown fallbacks that preserve Dataview and Tasks queries as readable static notes
- Canvas and Bases fallback Markdown so non-Obsidian viewers have a static representation
- an optional export bundle that copies portable notes and attachments next to those generated fallbacks

Use `bridge` when you want sidecar compatibility artifacts. Use `export` when you want a portable bundle to open or ship elsewhere.

## Generated Artifacts

- `BrainBridge Report.md`
- `brainbridge-report.json`
- `graph.json`
- `graph.csv`
- `backlinks.md`
- `attachments-index.md`
- `tasks-index.md`
- `properties-index.md`
- `plugin-dependencies.md`
- `degrades-outside-obsidian.md`
- `markdown-fallbacks/**/*.md`
- `canvas-fallbacks/**/*.md`
- `base-fallbacks/**/*.md`

## Classification Model

- `portable`: Markdown, YAML frontmatter, attachments, normal links.
- `regenerable`: backlinks, graph views, tag indexes, property indexes, task indexes, static plugin-query fallbacks.
- `obsidian_specific`: `.obsidian`, workspace state, Canvas, Bases, hotkeys, snippets, themes.
- `plugin_dependent`: Dataview, Tasks, Kanban, Templater, Readwise, Web Clipper, Excalidraw.
- `external_state`: sync metadata, OAuth-backed services, plugin databases, local caches.

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm check:privacy
```

## License

MIT
