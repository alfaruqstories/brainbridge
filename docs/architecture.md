# Architecture

BrainBridge is CLI-first with a reusable core library.

## Packages

- `@brainbridge/core`: scans notes folders, resolves links, classifies findings, renders reports, and writes artifacts.
- `brainbridge`: CLI wrapper over the core package.

## Flow

1. Walk the notes folder read-only.
2. Classify files into Markdown, attachment, Canvas, Base, Obsidian config, plugin manifest, or other.
3. Parse Markdown for wikilinks, local Markdown links, embeds, block references, plugin blocks, and app-specific syntax.
4. Resolve internal links against notes and embedded files.
5. Index portable frontmatter properties and Markdown checkbox tasks.
6. Inventory Obsidian config, community plugins, and plugin state files.
7. Generate reports, graph artifacts, backlink indexes, attachment indexes, task/property indexes, Markdown fallbacks, Canvas fallbacks, Bases fallbacks, and fallback notes.

## Safety

BrainBridge does not write into the source notes in V1. All generated output goes to stdout or a caller-provided `--out` directory.
