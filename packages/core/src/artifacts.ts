import fs from "node:fs/promises";
import path from "node:path";
import {
  renderAttachmentsIndex,
  renderBacklinks,
  renderBaseFallbacks,
  renderCanvasFallbacks,
  renderDegradationReport,
  renderGraphCsv,
  renderMarkdownFallbacks,
  renderPluginDependencies,
  renderPropertiesIndex,
  renderReportMarkdown,
  renderTasksIndex
} from "./render.js";
import type { VaultReport, WriteArtifactsOptions } from "./types.js";

type ShareSafeVaultReport = Omit<VaultReport, "vaultPath"> & { vaultPath: "." };

export async function writeBridgeArtifacts(report: VaultReport, options: WriteArtifactsOptions): Promise<string[]> {
  const outDir = path.resolve(options.outDir);
  await fs.mkdir(outDir, { recursive: true });

  const written: string[] = [];
  await write(outDir, "BrainBridge Report.md", renderReportMarkdown(report), written);
  await write(outDir, "brainbridge-report.json", renderReportJson(report), written);
  await write(outDir, "graph.json", `${JSON.stringify(report.graph, null, 2)}\n`, written);
  await write(outDir, "graph.csv", renderGraphCsv(report.graph.edges), written);
  await write(outDir, "backlinks.md", renderBacklinks(report), written);
  await write(outDir, "attachments-index.md", renderAttachmentsIndex(report), written);
  await write(outDir, "tasks-index.md", renderTasksIndex(report), written);
  await write(outDir, "properties-index.md", renderPropertiesIndex(report), written);
  await write(outDir, "plugin-dependencies.md", renderPluginDependencies(report), written);
  await write(outDir, "degrades-outside-obsidian.md", renderDegradationReport(report), written);

  for (const [relativePath, content] of renderMarkdownFallbacks(report)) {
    await write(outDir, path.join("markdown-fallbacks", relativePath), content, written);
  }

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

export function shareSafeReport(report: VaultReport): ShareSafeVaultReport {
  return {
    ...report,
    vaultPath: "."
  };
}

export function renderReportJson(report: VaultReport): string {
  return `${JSON.stringify(shareSafeReport(report), null, 2)}\n`;
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

  const markdownFallbacks = renderMarkdownFallbacks(report);
  const canvasFallbacks = renderCanvasFallbacks(report);
  const baseFallbacks = renderBaseFallbacks(report);

  for (const file of report.files) {
    if (!["markdown", "attachment"].includes(file.kind)) continue;
    if (file.kind === "markdown") {
      const source = path.join(report.vaultPath, file.path);
      const sourceContent = markdownFallbacks.get(file.path) ?? (await fs.readFile(source, "utf8"));
      await write(notesDir, file.path, rewritePortableLinks(file.path, sourceContent, report), written);
      continue;
    }

    const source = safeSourcePath(report.vaultPath, file.path);
    const target = path.join(notesDir, file.path);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target);
    written.push(target);
  }

  for (const [relativePath, content] of canvasFallbacks) {
    await write(notesDir, relativePath, rewritePortableLinks(relativePath, content, report), written);
  }

  for (const [relativePath, content] of baseFallbacks) {
    await write(notesDir, relativePath, content, written);
  }
}

function safeSourcePath(root: string, relativePath: string): string {
  const source = path.resolve(root, relativePath);
  const rootWithSep = path.resolve(root) + path.sep;
  if (source !== path.resolve(root) && !source.startsWith(rootWithSep)) {
    throw new Error(`Refusing to copy a file outside the vault: ${relativePath}`);
  }
  return source;
}

function rewritePortableLinks(sourcePath: string, content: string, report: VaultReport): string {
  const links = report.wikilinks.filter((link) => link.source === sourcePath && link.resolvedPath);
  if (links.length === 0) return content;

  let rewritten = content;
  for (const link of links) {
    const resolvedPath = link.resolvedPath;
    if (!resolvedPath) continue;
    rewritten = rewritten.split(link.raw).join(renderPortableLink(sourcePath, link.raw, resolvedPath, link.alias, link.heading, link.blockReference, link.embed));
  }
  return rewritten;
}

function renderPortableLink(
  sourcePath: string,
  raw: string,
  resolvedPath: string,
  alias: string | undefined,
  heading: string | undefined,
  blockReference: string | undefined,
  embed: boolean
): string {
  const sourceDir = path.posix.dirname(sourcePath);
  const relativeTarget = sourceDir === "." ? resolvedPath : path.posix.relative(sourceDir, resolvedPath);
  const target = encodeMarkdownTarget(relativeTarget, heading, blockReference);
  const label = alias ?? markdownLabel(raw) ?? path.posix.basename(resolvedPath).replace(/\.(md|markdown)$/i, "");
  if (embed && !/\.(md|markdown)$/i.test(resolvedPath)) return `![${label}](${target})`;
  if (embed) return `[${label}](${target})`;
  if (raw.startsWith("[")) return `[${label}](${target})`;
  return raw;
}

function markdownLabel(raw: string): string | undefined {
  const match = /^!?\[([^\]\n]*)\]\(/.exec(raw);
  const label = match?.[1]?.trim();
  return label || undefined;
}

function encodeMarkdownTarget(relativeTarget: string, heading: string | undefined, blockReference: string | undefined): string {
  const normalized = relativeTarget.startsWith(".") ? relativeTarget : `./${relativeTarget}`;
  const encoded = normalized
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const fragment = blockReference ? `#^${blockReference}` : heading ? `#${heading}` : "";
  return `${encoded}${fragment ? encodeURI(fragment) : ""}`;
}
