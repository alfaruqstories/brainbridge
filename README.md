# BrainBridge

Make your second brain portable.

BrainBridge is a CLI for turning Markdown knowledge bases into portable context. It scans notes, identifies app-specific behavior, and generates reports, indexes, graph data, and static fallbacks that other Markdown editors, search tools, static sites, and AI agents can read.

[Landing page](https://alfaruqstories.github.io/brainbridge/) · [Agent prompt](./docs/agent-prompt.md)

## Why

Markdown notes mostly work everywhere. The trouble starts when a knowledge base depends on tool-specific behavior:

- wikilinks, embeds, backlinks, and graph views
- Canvas and Bases files
- Dataview, Tasks, Templater, Kanban, and Excalidraw conventions
- plugin configuration, sync state, and local plugin data

BrainBridge keeps the source vault read-only by default and creates a portable layer beside it.

It is built first for Obsidian vaults, but the goal is broader: make Markdown-based second brains easier to move between tools.

## Quickstart

```bash
pnpm install
pnpm build

cd /path/to/notes
brainbridge audit
brainbridge export --out ./brainbridge-export
```

If you are running from this repository during development:

```bash
node /path/to/BrainBridge/packages/cli/dist/src/index.js audit /path/to/vault
node /path/to/BrainBridge/packages/cli/dist/src/index.js export /path/to/vault --out ./brainbridge-export
```

## Commands

```bash
brainbridge audit [vault] [--out <dir>]
brainbridge bridge [vault] --out <dir>
brainbridge graph [vault] --out <dir>
brainbridge export [vault] --out <dir>
brainbridge --version
```

- `audit`: report what works and what degrades outside the source app.
- `bridge`: generate sidecar compatibility artifacts without copying the vault.
- `graph`: emit only graph and backlink artifacts.
- `export`: copy portable notes and attachments plus generated fallbacks into a bundle.

When `[vault]` is omitted, BrainBridge scans the current directory.

## Generated Artifacts

BrainBridge writes plain files:

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

## What Portable Means

BrainBridge does not execute app plugins or make every tool-specific feature native in every Markdown app. It preserves what can be represented as static files:

- Markdown note bodies
- YAML frontmatter properties
- normal Markdown links and Obsidian wikilinks
- task checkboxes
- graph and backlink relationships
- attachment references
- readable static fallbacks for plugin-heavy notes

It also reports what cannot be reproduced exactly, such as Dataview query execution, Tasks query execution, Templater execution, live Canvas layout behavior, Bases formulas, plugin runtimes, and sync-backed state.

## Classification Model

- `portable`: Markdown, YAML frontmatter, attachments, and normal links.
- `regenerable`: backlinks, graph views, property indexes, task indexes, and static plugin-query fallbacks.
- `obsidian_specific`: `.obsidian`, workspace state, Canvas, Bases, hotkeys, snippets, and themes.
- `plugin_dependent`: Dataview, Tasks, Kanban, Templater, Readwise, Web Clipper, and Excalidraw.
- `external_state`: sync metadata, OAuth-backed services, plugin databases, and local caches.

## Agent Prompt

Use this short prompt with an AI coding agent:

```text
Use BrainBridge from https://github.com/alfaruqstories/brainbridge to audit this Markdown knowledge base and generate a portable export.

Clone the repo or use the local checkout if it already exists. Install and build it with `pnpm install` and `pnpm build`.

Run the CLI from the built repo against the target notes folder:

`node packages/cli/dist/src/index.js audit /path/to/notes`
`node packages/cli/dist/src/index.js export /path/to/notes --out ./brainbridge-export`

Review the generated report, plugin dependencies, task/property indexes, graph files, and Markdown fallbacks.

Do not mutate the source vault unless explicitly asked.

Explain what still depends on app-specific behavior and recommend portable Markdown alternatives.
```

The longer version lives in [docs/agent-prompt.md](./docs/agent-prompt.md).

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm check:privacy
```

## Status

BrainBridge is early. It is useful for read-only audits and portable exports, but it is not a plugin runtime for Obsidian or any other notes app.

## License

MIT
