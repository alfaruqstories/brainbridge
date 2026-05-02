import assert from "node:assert/strict";
import test from "node:test";
import { buildNoteIndex, extractMarkdownLinks, extractWikiLinks, resolveWikiLinks } from "../src/index.js";

test("extracts wikilinks, aliases, headings, and embeds", () => {
  const links = extractWikiLinks("Home.md", "See [[Project Alpha#Plan|the plan]] and ![[diagram.png]].");
  assert.equal(links.length, 2);
  assert.deepEqual(links[0], {
    source: "Home.md",
    raw: "[[Project Alpha#Plan|the plan]]",
    target: "Project Alpha",
    alias: "the plan",
    heading: "Plan",
    blockReference: undefined,
    embed: false,
    syntax: "wiki"
  });
  assert.equal(links[1]?.embed, true);
});

test("resolves links by markdown basename", () => {
  const index = buildNoteIndex(["Project Alpha.md"]);
  const [resolved] = resolveWikiLinks(extractWikiLinks("Home.md", "[[Project Alpha]]"), index);
  assert.equal(resolved?.resolvedPath, "Project Alpha.md");
});

test("extracts and resolves local markdown links relative to the source note", () => {
  const index = buildNoteIndex(["Projects/Project Alpha.md", "attachments/diagram.png"]);
  const links = extractMarkdownLinks("Projects/Home.md", "See [the plan](./Project%20Alpha.md#Plan) and ![diagram](../attachments/diagram.png).");
  const resolved = resolveWikiLinks(links, index);
  assert.equal(resolved.length, 2);
  assert.equal(resolved[0]?.syntax, "markdown");
  assert.equal(resolved[0]?.resolvedPath, "Projects/Project Alpha.md");
  assert.equal(resolved[1]?.embed, true);
  assert.equal(resolved[1]?.resolvedPath, "attachments/diagram.png");
});

test("captures Obsidian block references", () => {
  const [link] = extractWikiLinks("Home.md", "See [[Project Alpha#^decision-1]].");
  assert.equal(link?.blockReference, "decision-1");
  assert.equal(link?.heading, undefined);
});
