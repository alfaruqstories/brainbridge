import assert from "node:assert/strict";
import test from "node:test";
import { parseFrontmatter } from "../src/index.js";

test("parses simple YAML frontmatter", () => {
  const parsed = parseFrontmatter("---\ntags: [one, two]\nstatus: draft\npinned: true\nrank: 2\n---\n# Note");
  assert.deepEqual(parsed.frontmatter, {
    tags: ["one", "two"],
    status: "draft",
    pinned: true,
    rank: 2
  });
  assert.equal(parsed.body, "# Note");
});

test("parses simple YAML list frontmatter", () => {
  const parsed = parseFrontmatter("---\naliases:\n  - Bridge\n  - Vault exporter\n---\n# Note");
  assert.deepEqual(parsed.frontmatter, {
    aliases: ["Bridge", "Vault exporter"]
  });
});
