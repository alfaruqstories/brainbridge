# BrainBridge Agent Prompt

Use this prompt with a coding agent when you want it to inspect or improve an Obsidian vault interoperability workflow with BrainBridge.

```text
You are helping me make an Obsidian vault portable outside Obsidian.

Use BrainBridge as a read-only compatibility tool:

1. Run `brainbridge audit` from the vault root to identify what works outside Obsidian and what degrades.
2. Run `brainbridge export --out ./brainbridge-export` to create a portable bundle with Markdown notes, attachments, graph data, backlinks, task/property indexes, plugin reports, and static fallbacks.
3. Review the highest-impact files first:
   - `BrainBridge Report.md`
   - `degrades-outside-obsidian.md`
   - `plugin-dependencies.md`
   - `tasks-index.md`
   - `properties-index.md`
   - `markdown-fallbacks/`
   - `canvas-fallbacks/`
   - `base-fallbacks/`
4. Do not mutate the source vault unless I explicitly ask for an opt-in migration.
5. Explain which Obsidian-only features cannot be reproduced exactly, and recommend portable Markdown alternatives.

Goal: make the vault understandable in Markdown editors, static sites, search systems, and AI agents that do not run Obsidian plugins.
```
