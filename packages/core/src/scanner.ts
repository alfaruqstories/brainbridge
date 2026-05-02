import fs from "node:fs/promises";
import path from "node:path";
import { parseFrontmatter, parseSimpleYaml } from "./frontmatter.js";
import { ATTACHMENT_EXTENSIONS, IGNORED_DIRS, MARKDOWN_EXTENSIONS, relativePosix, toPosix } from "./path-utils.js";
import {
  attachmentReferencesFromLinks,
  buildNoteIndex,
  extractMarkdownLinks,
  extractWikiLinks,
  graphFromLinks,
  resolveWikiLinks
} from "./links.js";
import type {
  BaseInfo,
  CanvasEdgeInfo,
  CanvasInfo,
  CanvasNodeInfo,
  Finding,
  MarkdownFallback,
  NoteProperties,
  PluginInfo,
  ScanOptions,
  TaskItem,
  VaultFile,
  VaultReport
} from "./types.js";

interface WalkedFile {
  absolutePath: string;
  relativePath: string;
}

export async function scanVault(vaultPath: string, options: ScanOptions = {}): Promise<VaultReport> {
  const root = path.resolve(vaultPath);
  const stat = await fs.stat(root).catch(() => undefined);
  if (!stat?.isDirectory()) {
    throw new Error(`Vault path is not a directory: ${vaultPath}`);
  }

  const walkedFiles = await walk(root);
  const files = classifyFiles(walkedFiles);
  const markdownFiles = files.filter((file) => file.kind === "markdown").map((file) => file.path);
  const resolvableFiles = files
    .filter((file) => file.kind === "markdown" || file.kind === "attachment")
    .map((file) => file.path);
  const noteIndex = buildNoteIndex(markdownFiles);
  const fileIndex = buildNoteIndex(resolvableFiles);
  const findings: Finding[] = [];
  const links = [];
  const canvases: CanvasInfo[] = [];
  const bases: BaseInfo[] = [];
  const markdownFallbacks: MarkdownFallback[] = [];
  const tasks: TaskItem[] = [];
  const properties: NoteProperties[] = [];

  for (const file of walkedFiles) {
    if (isMarkdown(file.relativePath)) {
      const content = await fs.readFile(file.absolutePath, "utf8");
      const rawLinks = [...extractWikiLinks(file.relativePath, content), ...extractMarkdownLinks(file.relativePath, content)];
      const extracted = rawLinks.map((link) => {
        const [resolved] = resolveWikiLinks([link], link.embed ? fileIndex : noteIndex);
        return resolved ?? link;
      });
      links.push(...extracted);
      findings.push(...contentFindings(file.relativePath, content));
      const fallback = buildMarkdownFallback(file.relativePath, content);
      if (fallback) markdownFallbacks.push(fallback);
      tasks.push(...extractTaskItems(file.relativePath, content));
      const parsed = parseFrontmatter(content);
      if (Object.keys(parsed.frontmatter).length > 0) {
        properties.push({ path: file.relativePath, frontmatter: parsed.frontmatter });
      }
    }

    if (file.relativePath.endsWith(".canvas")) {
      canvases.push(await inspectCanvas(file.absolutePath, file.relativePath, findings));
    }

    if (file.relativePath.endsWith(".base")) {
      bases.push(await inspectBase(file.absolutePath, file.relativePath, findings));
    }
  }

  const attachmentReferences = attachmentReferencesFromLinks(links);
  for (const link of links) {
    if (!link.resolvedPath) {
      const severity = link.embed ? "risk" : "warning";
      findings.push({
        classification: link.embed ? "portable" : "regenerable",
        severity,
        title: link.embed ? "Missing embedded attachment or note" : "Broken wikilink",
        path: link.source,
        detail: `${link.raw} could not be resolved.`
      });
    }
  }

  findings.push(...obsidianFindings(files));
  const plugins = await inspectPlugins(root, files, findings);
  const graph = graphFromLinks(markdownFiles, links);
  const generatedAt = (options.now ?? new Date()).toISOString();
  const portabilityScore = scorePortability(findings);

  return {
    vaultPath: root,
    generatedAt,
    summary: {
      files: files.length,
      markdownFiles: markdownFiles.length,
      attachments: files.filter((file) => file.kind === "attachment").length,
      findings: findings.length,
      portabilityScore
    },
    files,
    plugins,
    findings,
    wikilinks: links,
    attachmentReferences,
    graph,
    canvases,
    bases,
    markdownFallbacks,
    tasks,
    properties
  };
}

async function walk(root: string, current = root): Promise<WalkedFile[]> {
  const entries = await fs.readdir(current, { withFileTypes: true });
  const files: WalkedFile[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".obsidian") continue;
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;

    const absolutePath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(root, absolutePath)));
    } else if (entry.isFile()) {
      files.push({ absolutePath, relativePath: relativePosix(root, absolutePath) });
    }
  }

  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function classifyFiles(files: WalkedFile[]): VaultFile[] {
  return files.map((file) => {
    const rel = toPosix(file.relativePath);
    const ext = path.extname(rel).toLocaleLowerCase();
    let kind: VaultFile["kind"] = "other";
    if (isMarkdown(rel)) kind = "markdown";
    if (rel.endsWith(".canvas")) kind = "canvas";
    if (rel.endsWith(".base")) kind = "base";
    if (rel.startsWith(".obsidian/plugins/") && path.basename(rel) === "manifest.json") kind = "plugin_manifest";
    else if (rel.startsWith(".obsidian/")) kind = "obsidian_config";
    else if (ATTACHMENT_EXTENSIONS.has(ext) && !rel.startsWith(".obsidian/")) kind = "attachment";
    return { path: rel, kind };
  });
}

function isMarkdown(rel: string): boolean {
  return MARKDOWN_EXTENSIONS.has(path.extname(rel).toLocaleLowerCase());
}

function contentFindings(rel: string, content: string): Finding[] {
  const findings: Finding[] = [];
  const checks: Array<[RegExp, string, string]> = [
    [/```dataview\b/i, "Dataview block", "Dataview queries require Dataview or a compatible evaluator."],
    [/```tasks\b/i, "Tasks block", "Tasks queries require the Tasks plugin or a compatible evaluator."],
    [/<%[\s\S]*?%>/, "Templater syntax", "Templater expressions require plugin execution before other tools can understand their result."],
    [/obsidian:\/\//i, "Obsidian URI", "Obsidian URI links are app-specific deep links."],
    [/excalidraw/i, "Excalidraw reference", "Excalidraw content may depend on plugin-specific JSON or exports."]
  ];

  for (const [pattern, title, detail] of checks) {
    if (pattern.test(content)) {
      findings.push({
        classification: "plugin_dependent",
        severity: "warning",
        title,
        path: rel,
        detail
      });
    }
  }

  if (/kanban-plugin/i.test(content) || /^##\s+(Backlog|Doing|Done)\s*$/im.test(content)) {
    findings.push({
      classification: "plugin_dependent",
      severity: "info",
      title: "Kanban-like note",
      path: rel,
      detail: "This note may rely on board conventions that should be exported as plain Markdown lists."
    });
  }

  return findings;
}

async function inspectCanvas(absolutePath: string, rel: string, findings: Finding[]): Promise<CanvasInfo> {
  const content = await fs.readFile(absolutePath, "utf8");
  try {
    const data = JSON.parse(content) as {
      nodes?: Array<{
        id?: string;
        type?: string;
        file?: string;
        text?: string;
        label?: string;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
      }>;
      edges?: Array<{ id?: string; fromNode?: string; toNode?: string; label?: string }>;
    };
    const nodes = Array.isArray(data.nodes) ? data.nodes : [];
    const edges = Array.isArray(data.edges) ? data.edges : [];
    const fallbackNodes: CanvasNodeInfo[] = nodes.map((node, index) => {
      const type = typeof node.type === "string" ? node.type : "unknown";
      const file = typeof node.file === "string" ? node.file : undefined;
      const text = typeof node.text === "string" ? node.text : undefined;
      const label = file ?? text ?? (typeof node.label === "string" ? node.label : `${type} ${index + 1}`);
      return {
        id: typeof node.id === "string" ? node.id : `node-${index + 1}`,
        type,
        label,
        file,
        text,
        x: typeof node.x === "number" ? node.x : undefined,
        y: typeof node.y === "number" ? node.y : undefined,
        width: typeof node.width === "number" ? node.width : undefined,
        height: typeof node.height === "number" ? node.height : undefined
      };
    });
    const fallbackEdges: CanvasEdgeInfo[] = edges
      .filter((edge) => typeof edge.fromNode === "string" && typeof edge.toNode === "string")
      .map((edge, index) => ({
        id: typeof edge.id === "string" ? edge.id : `edge-${index + 1}`,
        fromNode: edge.fromNode as string,
        toNode: edge.toNode as string,
        label: typeof edge.label === "string" ? edge.label : undefined
      }));
    const fileNodes = nodes
      .filter((node) => node.type === "file" && typeof node.file === "string")
      .map((node) => node.file as string);
    const textNodeCount = nodes.filter((node) => node.type === "text").length;
    const edgeCount = fallbackEdges.length;
    findings.push({
      classification: "obsidian_specific",
      severity: "warning",
      title: "Canvas file",
      path: rel,
      detail: "Canvas is useful in Obsidian but needs a Markdown outline or diagram fallback elsewhere."
    });
    return { path: rel, nodes: fallbackNodes, edges: fallbackEdges, fileNodes, textNodeCount, edgeCount };
  } catch {
    findings.push({
      classification: "obsidian_specific",
      severity: "risk",
      title: "Invalid Canvas JSON",
      path: rel,
      detail: "This Canvas file could not be parsed as JSON."
    });
    return { path: rel, nodes: [], edges: [], fileNodes: [], textNodeCount: 0, edgeCount: 0 };
  }
}

async function inspectBase(absolutePath: string, rel: string, findings: Finding[]): Promise<BaseInfo> {
  const sourceText = await fs.readFile(absolutePath, "utf8");
  parseSimpleYaml(sourceText);
  findings.push({
    classification: "obsidian_specific",
    severity: "warning",
    title: "Bases view",
    path: rel,
    detail: "Bases are Obsidian views over notes and properties; export a static Markdown or CSV view for other tools."
  });
  return { path: rel, sourceText };
}

function obsidianFindings(files: VaultFile[]): Finding[] {
  const findings: Finding[] = [];
  const byPath = new Set(files.map((file) => file.path));

  if (files.some((file) => file.path.startsWith(".obsidian/"))) {
    findings.push({
      classification: "obsidian_specific",
      severity: "info",
      title: "Obsidian configuration",
      detail: ".obsidian contains useful app state, but other Markdown tools will ignore most of it."
    });
  }

  const specificConfigs: Array<[string, string]> = [
    [".obsidian/workspace.json", "Workspace state"],
    [".obsidian/hotkeys.json", "Hotkeys"],
    [".obsidian/graph.json", "Graph settings"],
    [".obsidian/appearance.json", "Appearance settings"],
    [".obsidian/daily-notes.json", "Daily Notes settings"],
    [".obsidian/templates.json", "Templates settings"]
  ];

  for (const [configPath, title] of specificConfigs) {
    if (byPath.has(configPath)) {
      findings.push({
        classification: "obsidian_specific",
        severity: "info",
        title,
        path: configPath,
        detail: `${title} are useful in Obsidian but need documentation or generated fallbacks elsewhere.`
      });
    }
  }

  if (files.some((file) => file.path.startsWith(".obsidian/snippets/"))) {
    findings.push({
      classification: "obsidian_specific",
      severity: "info",
      title: "CSS snippets",
      detail: "CSS snippets affect Obsidian rendering and may not apply elsewhere."
    });
  }

  const externalStateFiles: Array<[RegExp, string, string]> = [
    [/^\.obsidian\/sync\.json$/, "Obsidian Sync settings", "Obsidian Sync state is service-backed and cannot be reproduced by static Markdown export."],
    [/^\.obsidian\/plugins\/[^/]+\/data\.json$/, "Plugin data store", "Plugin data files may contain state that only the plugin knows how to interpret."],
    [/^\.obsidian\/plugins\/[^/]+\/main\.js$/, "Plugin runtime code", "Plugin JavaScript runs only inside Obsidian and is not portable to normal Markdown tools."],
    [/^\.obsidian\/plugins\/[^/]+\/styles\.css$/, "Plugin stylesheet", "Plugin styles may affect Obsidian rendering but will not automatically apply elsewhere."]
  ];

  for (const file of files) {
    for (const [pattern, title, detail] of externalStateFiles) {
      if (pattern.test(file.path)) {
        findings.push({
          classification: "external_state",
          severity: "warning",
          title,
          path: file.path,
          detail
        });
      }
    }
  }

  return findings;
}

async function inspectPlugins(root: string, files: VaultFile[], findings: Finding[]): Promise<PluginInfo[]> {
  const enabledPluginsPath = path.join(root, ".obsidian", "community-plugins.json");
  const enabled = new Set<string>();
  try {
    const parsed = JSON.parse(await fs.readFile(enabledPluginsPath, "utf8"));
    if (Array.isArray(parsed)) {
      for (const plugin of parsed) enabled.add(String(plugin));
    }
  } catch {
    // Missing or invalid plugin list is not fatal.
  }

  const plugins = new Map<string, PluginInfo>();
  for (const id of enabled) {
    plugins.set(id, { id, enabled: true });
  }

  for (const file of files.filter((item) => item.kind === "plugin_manifest")) {
    const manifestPath = path.join(root, file.path);
    try {
      const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as Record<string, unknown>;
      const id = String(manifest.id ?? path.basename(path.dirname(file.path)));
      plugins.set(id, {
        id,
        name: typeof manifest.name === "string" ? manifest.name : undefined,
        version: typeof manifest.version === "string" ? manifest.version : undefined,
        path: file.path,
        enabled: enabled.has(id)
      });
    } catch {
      findings.push({
        classification: "plugin_dependent",
        severity: "warning",
        title: "Invalid plugin manifest",
        path: file.path,
        detail: "Plugin manifest could not be parsed."
      });
    }
  }

  for (const plugin of plugins.values()) {
    findings.push({
      classification: "plugin_dependent",
      severity: plugin.enabled ? "warning" : "info",
      title: plugin.enabled ? "Enabled community plugin" : "Installed community plugin",
      path: plugin.path,
      detail: `${plugin.name ?? plugin.id} may provide behavior that other Markdown tools cannot reproduce.`
    });
  }

  return [...plugins.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function scorePortability(findings: Finding[]): number {
  let score = 100;
  for (const finding of findings) {
    if (finding.classification === "plugin_dependent") score -= finding.severity === "risk" ? 8 : 4;
    if (finding.classification === "obsidian_specific") score -= finding.severity === "risk" ? 6 : 2;
    if (finding.classification === "external_state") score -= finding.severity === "risk" ? 8 : 5;
    if (finding.severity === "risk") score -= 4;
  }
  return Math.max(0, Math.min(100, score));
}

function buildMarkdownFallback(rel: string, content: string): MarkdownFallback | undefined {
  const reasons = new Set<string>();
  let fallback = content;

  fallback = fallback.replace(/```dataview\b([\s\S]*?)```/gi, (_match, query: string) => {
    reasons.add("Dataview query converted to a static query note.");
    return [
      "> [!note] Dataview query",
      "> This query needs the Dataview plugin in Obsidian. BrainBridge preserved the query text for other Markdown tools.",
      ">",
      ...fenceForQuote(String(query).trim() || "(empty query)")
    ].join("\n");
  });

  fallback = fallback.replace(/```tasks\b([\s\S]*?)```/gi, (_match, query: string) => {
    reasons.add("Tasks query converted to a static query note.");
    return [
      "> [!note] Tasks query",
      "> This query needs the Tasks plugin in Obsidian. BrainBridge preserved the query text for other Markdown tools.",
      ">",
      ...fenceForQuote(String(query).trim() || "(empty query)")
    ].join("\n");
  });

  fallback = fallback.replace(/<%([\s\S]*?)%>/g, (_match, expression: string) => {
    reasons.add("Templater expression escaped as readable text.");
    return `\`Templater: ${String(expression).trim().replace(/\s+/g, " ")}\``;
  });

  fallback = fallback.replace(/obsidian:\/\/[^\s)]+/gi, (uri: string) => {
    reasons.add("Obsidian URI converted to inline code.");
    const trailing = /[.,;:!?]+$/.exec(uri)?.[0] ?? "";
    const cleanUri = trailing ? uri.slice(0, -trailing.length) : uri;
    return `\`${cleanUri}\`${trailing}`;
  });

  if (/excalidraw/i.test(content)) {
    reasons.add("Excalidraw content summarized for Markdown readers.");
    fallback += renderExcalidrawSummary(content);
  }

  if (reasons.size === 0 || fallback === content) return undefined;
  return {
    path: rel,
    reasons: [...reasons],
    content: [
      `# ${rel}`,
      "",
      "> [!info] BrainBridge fallback",
      ...[...reasons].map((reason) => `> - ${reason}`),
      "",
      fallback.trim(),
      ""
    ].join("\n")
  };
}

function extractTaskItems(rel: string, content: string): TaskItem[] {
  const tasks: TaskItem[] = [];
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    const match = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/.exec(line);
    if (!match) return;
    tasks.push({
      source: rel,
      line: index + 1,
      text: match[2]?.trim() ?? "",
      completed: (match[1] ?? "").toLowerCase() === "x"
    });
  });
  return tasks;
}

function fenceForQuote(value: string): string[] {
  const lines = ["```", ...value.split(/\r?\n/), "```"];
  return lines.map((line) => `> ${line}`);
}

function renderExcalidrawSummary(content: string): string {
  const textElements = extractExcalidrawTextElements(content);
  const lines = ["", "", "## Excalidraw Text Elements", ""];
  if (textElements.length === 0) {
    lines.push("- No text elements detected in the Markdown representation.");
  } else {
    for (const element of textElements) lines.push(`- ${element}`);
  }
  return lines.join("\n");
}

function extractExcalidrawTextElements(content: string): string[] {
  const jsonMatch = /"elements"\s*:\s*(\[[\s\S]*?\])\s*,\s*"appState"/.exec(content);
  if (jsonMatch) {
    try {
      const elements = JSON.parse(jsonMatch[1] ?? "[]") as Array<{ type?: string; text?: string }>;
      return elements
        .filter((element) => element.type === "text" && typeof element.text === "string")
        .map((element) => element.text?.trim() ?? "")
        .filter(Boolean);
    } catch {
      // Fall through to Markdown-style extraction.
    }
  }

  const textSection = /# Text Elements\s*([\s\S]*?)(?:\n# |\n%%|$)/i.exec(content)?.[1] ?? "";
  return textSection
    .split(/\r?\n/)
    .map((line) => line.replace(/\^[A-Za-z0-9_-]+$/, "").trim())
    .filter(Boolean);
}
