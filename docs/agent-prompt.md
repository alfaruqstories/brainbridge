# BrainBridge Agent Prompt

Use this prompt with a coding agent when you want it to inspect or improve a Markdown knowledge base portability workflow with BrainBridge.

```text
You are helping me make a Markdown knowledge base portable across tools.

Use BrainBridge from https://github.com/alfaruqstories/brainbridge as a read-only compatibility tool:

1. Clone the repo, or use the local checkout if it already exists.
2. Install dependencies with `pnpm install`.
3. Run `pnpm brainbridge audit /path/to/notes` from the BrainBridge repo to identify what works across tools and what degrades. The repo-local command builds before running.
4. Run `pnpm brainbridge export /path/to/notes --out ./brainbridge-export` from the BrainBridge repo to create a portable bundle with Markdown notes, attachments, graph data, backlinks, task/property indexes, plugin reports, and static fallbacks.
5. Review the highest-impact files first:
   - `BrainBridge Report.md`
   - `degrades-outside-obsidian.md`
   - `plugin-dependencies.md`
   - `tasks-index.md`
   - `properties-index.md`
   - `markdown-fallbacks/`
   - `canvas-fallbacks/`
   - `base-fallbacks/`
6. Do not mutate the source notes unless I explicitly ask for an opt-in migration.
7. Explain which app-specific features cannot be reproduced exactly, and recommend portable Markdown alternatives.

Goal: make the notes understandable in Markdown editors, static sites, search systems, and AI agents that do not run the source app's plugins.
```
