import fs from "node:fs/promises";
import path from "node:path";
import {
  renderAttachmentsIndex,
  renderBacklinks,
  renderBaseFallbacks,
  renderCanvasFallbacks,
  renderDegradationReport,
  renderGraphCsv,
  renderPluginDependencies,
  renderReportMarkdown
} from "./render.js";
import type { VaultReport, WriteArtifactsOptions } from "./types.js";

export async function writeBridgeArtifacts(report: VaultReport, options: WriteArtifactsOptions): Promise<string[]> {
  const outDir = path.resolve(options.outDir);
  await fs.mkdir(outDir, { recursive: true });

  const written: string[] = [];
  await write(outDir, "BrainBridge Report.md", renderReportMarkdown(report), written);
  await write(outDir, "brainbridge-report.json", `${JSON.stringify(report, null, 2)}\n`, written);
  await write(outDir, "graph.json", `${JSON.stringify(report.graph, null, 2)}\n`, written);
  await write(outDir, "graph.csv", renderGraphCsv(report.graph.edges), written);
  await write(outDir, "backlinks.md", renderBacklinks(report), written);
  await write(outDir, "attachments-index.md", renderAttachmentsIndex(report), written);
  await write(outDir, "plugin-dependencies.md", renderPluginDependencies(report), written);
  await write(outDir, "degrades-outside-obsidian.md", renderDegradationReport(report), written);

  for (const [relativePath, content] of renderCanvasFallbacks(report)) {
    await write(outDir, path.join("canvas-fallbacks", relativePath), content, written);
  }

  for (const [relativePath, content] of renderBaseFallbacks(report)) {
    await write(outDir, path.join("base-fallbacks", relativePath), content, written);
  }

  if (options.includeVaultCopy) {
    await copyPortableVault(report, outDir, written);
  }

  return written;
}

export async function writeGraphArtifacts(report: VaultReport, outDir: string): Promise<string[]> {
  const target = path.resolve(outDir);
  await fs.mkdir(target, { recursive: true });
  const written: string[] = [];
  await write(target, "graph.json", `${JSON.stringify(report.graph, null, 2)}\n`, written);
  await write(target, "graph.csv", renderGraphCsv(report.graph.edges), written);
  await write(target, "backlinks.md", renderBacklinks(report), written);
  return written;
}

async function write(root: string, relativePath: string, content: string, written: string[]): Promise<void> {
  const absolutePath = path.join(root, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content, "utf8");
  written.push(absolutePath);
}

async function copyPortableVault(report: VaultReport, outDir: string, written: string[]): Promise<void> {
  const notesDir = path.join(outDir, "vault");
  await fs.mkdir(notesDir, { recursive: true });
  for (const file of report.files) {
    if (!["markdown", "attachment", "canvas", "base"].includes(file.kind)) continue;
    const source = path.join(report.vaultPath, file.path);
    const target = path.join(notesDir, file.path);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target);
    written.push(target);
  }
}
