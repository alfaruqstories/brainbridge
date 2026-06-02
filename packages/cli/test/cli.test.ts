import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const cliPath = path.resolve("packages/cli/dist/src/index.js");
const fixtureRoot = path.resolve("examples/fixtures");

test("audit prints a report without writing to the source vault", async () => {
  const before = await listFiles(path.join(fixtureRoot, "basic"));
  const { stdout } = await execFileAsync("node", [cliPath, "audit", path.join(fixtureRoot, "basic")]);
  const after = await listFiles(path.join(fixtureRoot, "basic"));
  assert.match(stdout, /BrainBridge Report/);
  assert.deepEqual(after, before);
});

test("audit defaults to the current directory as the vault", async () => {
  const { stdout } = await execFileAsync("node", [cliPath, "audit"], {
    cwd: path.join(fixtureRoot, "basic")
  });
  assert.match(stdout, /BrainBridge Report/);
  assert.match(stdout, /Portability score: 100\/100/);
});

test("audit --json prints a share-safe report without writing artifacts", async () => {
  const before = await listFiles(path.join(fixtureRoot, "basic"));
  const { stdout } = await execFileAsync("node", [cliPath, "audit", path.join(fixtureRoot, "basic"), "--json"]);
  const after = await listFiles(path.join(fixtureRoot, "basic"));
  const parsed = JSON.parse(stdout) as { vaultPath: string; summary: { portabilityScore: number } };
  assert.equal(parsed.vaultPath, ".");
  assert.equal(parsed.summary.portabilityScore, 100);
  assert.deepEqual(after, before);
});

test("prints the CLI version", async () => {
  const { stdout } = await execFileAsync("node", [cliPath, "--version"]);
  assert.equal(stdout.trim(), "0.1.0");
});

test("bridge writes fallback artifacts", async () => {
  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "brainbridge-"));
  await execFileAsync("node", [cliPath, "bridge", path.join(fixtureRoot, "plugin-heavy"), "--out", outDir]);
  const files = await listFiles(outDir);
  assert.ok(files.includes("BrainBridge Report.md"));
  assert.ok(files.includes("brainbridge-report.json"));
  assert.ok(files.includes("graph.json"));
  assert.ok(files.includes("backlinks.md"));
  assert.ok(files.includes("tasks-index.md"));
  assert.ok(files.includes("properties-index.md"));
  assert.ok(files.includes(path.join("markdown-fallbacks", "Dashboard.md")));
  assert.ok(files.includes(path.join("markdown-fallbacks", "Sketch.excalidraw.md")));
  assert.ok(files.includes(path.join("base-fallbacks", "bases", "Tasks.base.md")));
  assert.ok(files.includes(path.join("canvas-fallbacks", "boards", "Map.canvas.md")));
});

test("export writes a portable vault without raw canvas or base files", async () => {
  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "brainbridge-"));
  await execFileAsync("node", [cliPath, "export", path.join(fixtureRoot, "plugin-heavy"), "--out", outDir]);
  const files = await listFiles(outDir);
  assert.ok(files.includes(path.join("vault", "Dashboard.md")));
  assert.ok(files.includes(path.join("vault", "attachments", "kept.pdf")));
  assert.ok(files.includes(path.join("vault", "boards", "Map.canvas.md")));
  assert.ok(files.includes(path.join("vault", "bases", "Tasks.base.md")));
  assert.ok(!files.includes(path.join("vault", "boards", "Map.canvas")));
  assert.ok(!files.includes(path.join("vault", "bases", "Tasks.base")));
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
