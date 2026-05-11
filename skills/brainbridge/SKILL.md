# BrainBridge Skill

Use this skill when a user wants to audit, bridge, export, or explain Markdown knowledge-base portability with BrainBridge.

BrainBridge is repo-first for now. Do not assume it is globally installed or published to npm. Use the cloned repository from https://github.com/alfaruqstories/brainbridge, then run `pnpm install` before invoking the CLI with `pnpm brainbridge`. The repo-local command builds before running.

## Workflow

1. Locate the notes or vault path the user wants to inspect.
2. From the BrainBridge repo, run `pnpm brainbridge audit <path>` for a read-only report.
3. If the user wants generated artifacts, run `pnpm brainbridge bridge <path> --out <dir>`.
4. If the user wants only link data, run `pnpm brainbridge graph <path> --out <dir>`.
5. If the user wants a portable bundle, run `pnpm brainbridge export <path> --out <dir>`.
6. Summarize the highest-impact findings first:
   - plugin-dependent content
   - Obsidian-specific state
   - broken links
   - missing attachments
   - task and property indexes
   - generated fallback files

## Meaning of Artifacts

Generated artifacts are sidecar compatibility files. They do not mutate the source notes or fully emulate app plugins; they provide static reports, indexes, graph data, task/property extracts, and Markdown fallbacks that other editors, viewers, agents, and static-site tools can read.

## Safety

BrainBridge V1 is read-only against the source notes. Generated files should be written to an explicit output directory.
