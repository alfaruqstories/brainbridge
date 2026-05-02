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
});

test("detects plugin-heavy vault risks", async () => {
  const report = await scanVault(path.join(fixtureRoot, "plugin-heavy"), { now: new Date("2026-01-01T00:00:00.000Z") });
  assert.ok(report.plugins.some((plugin) => plugin.id === "dataview"));
  assert.ok(report.findings.some((finding) => finding.title === "Dataview block"));
  assert.ok(report.findings.some((finding) => finding.title === "Canvas file"));
  assert.ok(report.findings.some((finding) => finding.title === "Bases view"));
  assert.ok(report.findings.some((finding) => finding.title === "Broken wikilink"));
});
