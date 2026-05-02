import { csvEscape } from "./path-utils.js";
import type { Finding, GraphEdge, VaultReport } from "./types.js";

export function renderReportMarkdown(report: VaultReport): string {
  const lines = [
    "# BrainBridge Report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Files scanned: ${report.summary.files}`,
    `- Markdown notes: ${report.summary.markdownFiles}`,
    `- Attachments: ${report.summary.attachments}`,
    `- Findings: ${report.summary.findings}`,
    `- Portability score: ${report.summary.portabilityScore}/100`,
    "",
    "## What Works Elsewhere",
    "",
    "- Markdown note bodies",
    "- YAML frontmatter and normal Markdown links",
    "- Attachments with resolvable file paths",
    "- Generated graph, backlinks, and indexes from BrainBridge",
    "",
    "## What Degrades Outside Obsidian",
    "",
    ...renderFindingList(report.findings.filter((finding) => finding.classification !== "portable")),
    "",
    "## Plugins",
    "",
    ...(report.plugins.length
      ? report.plugins.map((plugin) => `- ${plugin.id}${plugin.name ? ` (${plugin.name})` : ""}${plugin.enabled ? " - enabled" : " - installed"}`)
      : ["No community plugins detected."]),
    "",
    "## Broken Links And Missing Embeds",
    "",
    ...renderFindingList(
      report.findings.filter((finding) => finding.title === "Broken wikilink" || finding.title === "Missing embedded attachment or note")
    ),
    "",
    "## Generated Fallbacks",
    "",
    "- `brainbridge-report.json`",
    "- `graph.json`",
    "- `graph.csv`",
    "- `backlinks.md`",
    "- `attachments-index.md`",
    "- `plugin-dependencies.md`",
    "- `degrades-outside-obsidian.md`",
    ""
  ];

  return `${lines.join("\n").trim()}\n`;
}

export function renderGraphCsv(edges: GraphEdge[]): string {
  const lines = ["source,target,label,unresolved"];
  for (const edge of edges) {
    lines.push(
      [edge.source, edge.target, edge.label ?? "", edge.unresolved ? "true" : "false"].map(csvEscape).join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}

export function renderBacklinks(report: VaultReport): string {
  const backlinks = new Map<string, GraphEdge[]>();
  for (const edge of report.graph.edges.filter((item) => !item.unresolved)) {
    const list = backlinks.get(edge.target) ?? [];
    list.push(edge);
    backlinks.set(edge.target, list);
  }

  const lines = ["# Backlinks", ""];
  for (const node of report.graph.nodes) {
    const incoming = backlinks.get(node.id) ?? [];
    lines.push(`## ${node.title}`, "");
    if (incoming.length === 0) {
      lines.push("- No backlinks detected.", "");
    } else {
      for (const edge of incoming) {
        lines.push(`- [[${edge.source}]]`);
      }
      lines.push("");
    }
  }
  return `${lines.join("\n").trim()}\n`;
}

export function renderAttachmentsIndex(report: VaultReport): string {
  const lines = ["# Attachments Index", ""];
  const refs = report.attachmentReferences;
  if (refs.length === 0) {
    lines.push("No embedded attachment references detected.");
  } else {
    for (const ref of refs) {
      lines.push(`- ${ref.source} embeds ${ref.resolvedPath ?? `${ref.target} (unresolved)`}`);
    }
  }
  return `${lines.join("\n").trim()}\n`;
}

export function renderPluginDependencies(report: VaultReport): string {
  const lines = ["# Plugin Dependencies", ""];
  if (report.plugins.length === 0) {
    lines.push("No community plugins detected.");
  } else {
    for (const plugin of report.plugins) {
      lines.push(`- ${plugin.id}${plugin.name ? ` (${plugin.name})` : ""}${plugin.version ? ` ${plugin.version}` : ""}${plugin.enabled ? " - enabled" : " - installed"}`);
    }
  }
  return `${lines.join("\n").trim()}\n`;
}

export function renderDegradationReport(report: VaultReport): string {
  const lines = ["# Degrades Outside Obsidian", ""];
  const findings = report.findings.filter((finding) => finding.classification !== "portable");
  lines.push(...renderFindingList(findings));
  return `${lines.join("\n").trim()}\n`;
}

export function renderCanvasFallbacks(report: VaultReport): Map<string, string> {
  const outputs = new Map<string, string>();
  for (const canvas of report.canvases) {
    const lines = [`# ${canvas.path}`, "", "## Nodes", ""];
    if (canvas.nodes.length === 0) {
      lines.push("- No nodes detected.");
    } else {
      for (const node of canvas.nodes) {
        const suffix = node.file ? ` -> [[${node.file}]]` : node.text ? `: ${node.text.replace(/\s+/g, " ").trim()}` : "";
        lines.push(`- ${node.label} (${node.type})${suffix}`);
      }
    }

    lines.push("", "## File Nodes", "");
    if (canvas.fileNodes.length === 0) {
      lines.push("- No file nodes detected.");
    } else {
      for (const fileNode of canvas.fileNodes) lines.push(`- [[${fileNode}]]`);
    }

    lines.push("", "## Diagram", "", "```mermaid", "graph TD");
    if (canvas.nodes.length === 0) {
      lines.push('  empty["No nodes detected"]');
    }
    const nodeIds = new Map<string, string>();
    canvas.nodes.forEach((node, index) => {
      const mermaidId = `n${index}`;
      nodeIds.set(node.id, mermaidId);
      lines.push(`  ${mermaidId}["${node.label.replaceAll('"', '\\"')}"]`);
    });
    for (const edge of canvas.edges) {
      const from = nodeIds.get(edge.fromNode);
      const to = nodeIds.get(edge.toNode);
      if (!from || !to) continue;
      const label = edge.label ? `|${edge.label.replaceAll("|", "\\|")}|` : "";
      lines.push(`  ${from} -->${label} ${to}`);
    }
    lines.push("```", "");
    outputs.set(`${canvas.path}.md`, `${lines.join("\n").trim()}\n`);
  }
  return outputs;
}

export function renderBaseFallbacks(report: VaultReport): Map<string, string> {
  const outputs = new Map<string, string>();
  for (const base of report.bases) {
    const lines = [
      `# ${base.path}`,
      "",
      "This is a static fallback for an Obsidian Bases view. Other Markdown tools can read the source configuration below, but they will not evaluate it as a live view.",
      "",
      "```yaml",
      base.sourceText.trim(),
      "```",
      ""
    ];
    outputs.set(`${base.path}.md`, `${lines.join("\n").trim()}\n`);
  }
  return outputs;
}

function renderFindingList(findings: Finding[]): string[] {
  if (findings.length === 0) return ["No findings."];
  return findings.map((finding) => {
    const pathPart = finding.path ? ` (${finding.path})` : "";
    return `- [${finding.severity}] ${finding.title}${pathPart}: ${finding.detail}`;
  });
}
