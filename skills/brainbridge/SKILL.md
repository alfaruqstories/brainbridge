# BrainBridge Skill

Use this skill when a user wants to audit, bridge, export, or explain Obsidian vault interoperability with BrainBridge.

## Workflow

1. Locate the vault path the user wants to inspect.
2. Run `brainbridge audit <vault>` for a read-only report. If already inside the vault, `brainbridge audit` is enough.
3. If the user wants generated artifacts, run `brainbridge bridge <vault> --out <dir>`.
4. If the user wants only link data, run `brainbridge graph <vault> --out <dir>`.
5. If the user wants a portable bundle, run `brainbridge export <vault> --out <dir>`.
6. Summarize the highest-impact findings first:
   - plugin-dependent content
   - Obsidian-specific state
   - broken links
   - missing attachments
   - generated fallback files

## Meaning of Artifacts

Generated artifacts are sidecar compatibility files. They do not mutate the source vault or fully emulate Obsidian plugins; they provide static reports, indexes, graph data, and Markdown fallbacks that other editors, viewers, agents, and static-site tools can read.

## Safety

BrainBridge V1 is read-only against the source vault. Generated files should be written to an explicit output directory.
