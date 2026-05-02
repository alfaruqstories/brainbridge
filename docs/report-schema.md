# Report Schema

`brainbridge-report.json` is intended to be stable enough for other tools to consume.

Top-level fields:

- `vaultPath`: absolute path scanned on the local machine.
- `generatedAt`: ISO timestamp.
- `summary`: counts and portability score.
- `files`: scanned files and their kind.
- `plugins`: detected community plugin metadata.
- `findings`: portability, plugin, and degradation findings.
- `wikilinks`: extracted wikilinks and resolution status.
- `attachmentReferences`: embedded attachment references.
- `graph`: nodes and edges generated from wikilinks.
- `canvases`: Canvas inventory.
- `bases`: Bases inventory.
- `markdownFallbacks`: static fallback notes generated from plugin-dependent Markdown.
- `tasks`: Markdown checkbox tasks with source path and line number.
- `properties`: YAML frontmatter properties by note.

`wikilinks` includes both Obsidian wikilinks and local Markdown links. The `syntax` field identifies the source syntax, and `blockReference` captures Obsidian-style `#^block-id` references when present.

Findings include:

- `classification`
- `severity`
- `title`
- `path`
- `detail`
