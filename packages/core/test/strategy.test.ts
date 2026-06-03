import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(".");

test("public docs and prompts describe repo-first usage", async () => {
  const files = [
    "README.md",
    "docs/agent-prompt.md",
    "docs/index.html",
    "docs/strategy.md",
    "skills/brainbridge/SKILL.md"
  ];

  for (const file of files) {
    const content = await fs.readFile(path.join(repoRoot, file), "utf8");
    assert.match(content, /https:\/\/github\.com\/alfaruqstories\/brainbridge|repo-first|git clone/);
    assert.doesNotMatch(content, /\bnpx brainbridge\b/);
  }
});

test("strategy doc preserves the non-negotiables", async () => {
  const strategy = await fs.readFile(path.join(repoRoot, "docs/strategy.md"), "utf8");
  assert.match(strategy, /Do not mutate source notes by default/);
  assert.match(strategy, /Do not claim to execute app plugins/);
  assert.match(strategy, /Do not frame BrainBridge as only an Obsidian exporter/);
  assert.match(strategy, /Validation Gates/);
});
