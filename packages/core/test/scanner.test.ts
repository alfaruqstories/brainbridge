import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { scanVault } from "../src/index.js";

const fixtureRoot = path.resolve("examples/fixtures");

test("scans a markdown-only vault and builds graph data", async () => {
  const report = await scanVault(path.join(fixtureRoot, "basic"), { now: new Date("2026-01-01T00:00:00.000Z") });
  assert.equal(report.summary.markdownFiles, 2);
  assert.equal(report.graph.edges.length, 2);
  assert.equal(report.summary.portabilityScore, 100);
  assert.deepEqual(report.properties[0]?.frontmatter, { tags: ["home"] });
});

test("detects plugin-heavy vault risks", async () => {
  const report = await scanVault(path.join(fixtureRoot, "plugin-heavy"), { now: new Date("2026-01-01T00:00:00.000Z") });
  assert.ok(report.plugins.some((plugin) => plugin.id === "dataview"));
  assert.ok(report.findings.some((finding) => finding.title === "Dataview block"));
  assert.ok(report.findings.some((finding) => finding.title === "Canvas file"));
  assert.ok(report.findings.some((finding) => finding.title === "Bases view"));
  assert.ok(report.findings.some((finding) => finding.title === "Broken wikilink"));
  assert.ok(report.findings.some((finding) => finding.title === "Plugin data store"));
  assert.ok(report.markdownFallbacks.some((fallback) => fallback.path === "Dashboard.md"));
  assert.ok(report.markdownFallbacks.some((fallback) => fallback.content.includes("Dataview query")));
  assert.ok(report.markdownFallbacks.some((fallback) => fallback.content.includes("Portable sketch label")));
  assert.ok(report.tasks.some((task) => task.text === "Write docs" && !task.completed));
  assert.ok(report.tasks.some((task) => task.text === "Pick name" && task.completed));
});
