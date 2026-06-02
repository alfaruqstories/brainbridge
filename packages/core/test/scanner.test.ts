import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { renderReportJson, scanVault, writeBridgeArtifacts } from "../src/index.js";

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

test("renders share-safe JSON without absolute vault paths", async () => {
  const report = await scanVault(path.join(fixtureRoot, "basic"), { now: new Date("2026-01-01T00:00:00.000Z") });
  const parsed = JSON.parse(renderReportJson(report)) as { vaultPath: string };
  assert.equal(parsed.vaultPath, ".");
  assert.doesNotMatch(renderReportJson(report), /examples\/fixtures\/basic/);
});

test("exports a portable vault with markdown fallbacks instead of raw canvas and base files", async () => {
  const report = await scanVault(path.join(fixtureRoot, "plugin-heavy"), { now: new Date("2026-01-01T00:00:00.000Z") });
  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "brainbridge-core-"));
  await writeBridgeArtifacts(report, { outDir, includeVaultCopy: true });

  const exportedFiles = await listFiles(path.join(outDir, "vault"));
  assert.ok(exportedFiles.includes("Dashboard.md"));
  assert.ok(exportedFiles.includes(path.join("attachments", "kept.pdf")));
  assert.ok(exportedFiles.includes(path.join("boards", "Map.canvas.md")));
  assert.ok(exportedFiles.includes(path.join("bases", "Tasks.base.md")));
  assert.ok(!exportedFiles.includes(path.join("boards", "Map.canvas")));
  assert.ok(!exportedFiles.includes(path.join("bases", "Tasks.base")));

  const dashboard = await fs.readFile(path.join(outDir, "vault", "Dashboard.md"), "utf8");
  assert.match(dashboard, /\[!note\] Dataview query/);
});

test("rewrites resolved Obsidian links in exported markdown", async () => {
  const report = await scanVault(path.join(fixtureRoot, "basic"), { now: new Date("2026-01-01T00:00:00.000Z") });
  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "brainbridge-core-"));
  await writeBridgeArtifacts(report, { outDir, includeVaultCopy: true });

  const home = await fs.readFile(path.join(outDir, "vault", "Home.md"), "utf8");
  assert.match(home, /\[Project Alpha\]\(\.\/Project%20Alpha\.md\)/);
  assert.match(home, /!\[diagram\.png\]\(\.\/diagram\.png\)/);
});

async function listFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) {
      for (const child of await listFiles(absolute)) files.push(path.join(entry.name, child));
    } else {
      files.push(entry.name);
    }
  }
  return files.sort();
}
