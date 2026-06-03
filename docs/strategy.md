# Strategy

BrainBridge is repo-first and read-only.

## Positioning

BrainBridge makes Markdown knowledge bases portable across tools.

The core problem is not Markdown itself. The problem is tool-specific context layered on top of Markdown:

- backlinks
- graph views
- task state
- YAML/frontmatter properties
- embeds and attachments
- plugin syntax
- app-only views such as Canvas and Bases

BrainBridge turns that context into portable files that other editors, search systems, static sites, and agents can inspect.

## Current Usage Strategy

BrainBridge is not published to npm yet. Users and agents should run it from the GitHub repo:

```bash
git clone https://github.com/alfaruqstories/brainbridge.git
cd brainbridge
pnpm install
pnpm brainbridge audit /path/to/notes
pnpm brainbridge export /path/to/notes --out ./brainbridge-export
```

The repo-local `pnpm brainbridge` command builds before running.

## Non-Negotiables

- Do not mutate source notes by default.
- Do not claim to execute app plugins.
- Do not frame BrainBridge as only an Obsidian exporter.
- Do make Obsidian the first concrete compatibility target.
- Do generate plain files that can be inspected without BrainBridge.

## Known Loopholes And Fixes

| Loophole | Fix |
| --- | --- |
| Users may assume `brainbridge` is globally installed. | Docs and prompts use `pnpm brainbridge` from the cloned repo. |
| Agents may skip the build step. | `pnpm brainbridge` builds before invoking the CLI. |
| Copy may over-index on Obsidian. | Public copy says Markdown knowledge bases first, Obsidian as first target. |
| “Portable” may sound like full plugin emulation. | Docs state BrainBridge generates static files and does not execute plugins. |
| Strategy may be based only on fixtures. | Automated fixtures cover known classes; a real notes-folder test remains the next external validation gate. |
| Generated output may be technically correct but hard to inspect. | CI smoke-tests key generated artifacts for readable content and obvious rendering mistakes. |

## Validation Gates

The strategy is not fully proven until these pass:

1. Run against at least one real messy notes folder.
2. Confirm no source files are modified. Covered by fixture tests; still verify once on a real notes folder.
3. Confirm generated artifacts are understandable without Obsidian. Covered by artifact smoke tests; still verify once on real output.
4. Confirm an agent can follow the repo-first prompt without extra instructions. Prompt consistency is covered by tests; fresh-agent execution remains external validation.
5. Improve or remove any artifact that is noisy, misleading, or low-value.

Until then, confidence should be high in the implementation direction, not absolute in market fit.
