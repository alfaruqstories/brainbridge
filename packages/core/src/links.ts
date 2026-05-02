import path from "node:path";
import { stripMarkdownExtension, titleFromPath, toPosix } from "./path-utils.js";
import type { AttachmentReference, GraphEdge, GraphNode, WikiLink } from "./types.js";

export interface NoteIndex {
  byPath: Map<string, string>;
  byStem: Map<string, string>;
}

export function buildNoteIndex(markdownPaths: string[]): NoteIndex {
  const byPath = new Map<string, string>();
  const byStem = new Map<string, string>();

  for (const notePath of markdownPaths) {
    const normalized = toPosix(notePath);
    byPath.set(normalized.toLocaleLowerCase(), normalized);
    byPath.set(stripMarkdownExtension(normalized).toLocaleLowerCase(), normalized);
    byStem.set(titleFromPath(normalized).toLocaleLowerCase(), normalized);
  }

  return { byPath, byStem };
}

export function extractWikiLinks(sourcePath: string, content: string): WikiLink[] {
  const links: WikiLink[] = [];
  const pattern = /(!)?\[\[([^\]]+)\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content))) {
    const rawInner = match[2] ?? "";
    const [targetWithHeading, alias] = rawInner.split("|", 2);
    const [target, headingOrBlock] = (targetWithHeading ?? "").split("#", 2);
    const cleanTarget = target.trim();
    if (!cleanTarget) continue;
    const cleanHeadingOrBlock = headingOrBlock?.trim() || undefined;

    links.push({
      source: sourcePath,
      raw: match[0],
      target: cleanTarget,
      alias: alias?.trim() || undefined,
      heading: cleanHeadingOrBlock?.startsWith("^") ? undefined : cleanHeadingOrBlock,
      blockReference: cleanHeadingOrBlock?.startsWith("^") ? cleanHeadingOrBlock.slice(1) : undefined,
      embed: Boolean(match[1]),
      syntax: "wiki"
    });
  }

  return links;
}

export function extractMarkdownLinks(sourcePath: string, content: string): WikiLink[] {
  const links: WikiLink[] = [];
  const pattern = /(!)?\[[^\]\n]*\]\(([^)\s]+(?:\s+"[^"]*")?)\)/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content))) {
    const rawTarget = (match[2] ?? "").trim().replace(/\s+"[^"]*"$/, "");
    const target = decodeLinkTarget(rawTarget);
    if (!isLocalMarkdownTarget(target)) continue;
    const [targetWithoutFragment, fragment] = target.split("#", 2);
    if (!targetWithoutFragment) continue;

    links.push({
      source: sourcePath,
      raw: match[0],
      target: targetWithoutFragment,
      heading: fragment && !fragment.startsWith("^") ? fragment : undefined,
      blockReference: fragment?.startsWith("^") ? fragment.slice(1) : undefined,
      embed: Boolean(match[1]),
      syntax: "markdown"
    });
  }

  return links;
}

export function resolveWikiLinks(links: WikiLink[], noteIndex: NoteIndex): WikiLink[] {
  return links.map((link) => ({
    ...link,
    resolvedPath: resolveLinkTarget(link.target, noteIndex, link.source)
  }));
}

export function resolveLinkTarget(target: string, noteIndex: NoteIndex, sourcePath?: string): string | undefined {
  const normalized = toPosix(target).replace(/^\/+/, "");
  const sourceDir = sourcePath ? path.posix.dirname(toPosix(sourcePath)) : ".";
  const relative = sourcePath && !normalized.startsWith("/") ? path.posix.normalize(path.posix.join(sourceDir, normalized)) : normalized;
  const candidates = [
    normalized,
    relative,
    stripMarkdownExtension(normalized),
    stripMarkdownExtension(relative),
    `${normalized}.md`,
    `${relative}.md`,
    path.posix.basename(normalized),
    stripMarkdownExtension(path.posix.basename(normalized))
  ].filter((candidate) => candidate !== ".");

  for (const candidate of candidates) {
    const pathMatch = noteIndex.byPath.get(candidate.toLocaleLowerCase());
    if (pathMatch) return pathMatch;
    const stemMatch = noteIndex.byStem.get(candidate.toLocaleLowerCase());
    if (stemMatch) return stemMatch;
  }

  return undefined;
}

function decodeLinkTarget(target: string): string {
  try {
    return decodeURI(target);
  } catch {
    return target;
  }
}

function isLocalMarkdownTarget(target: string): boolean {
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return false;
  if (target.startsWith("#")) return false;
  return true;
}

export function attachmentReferencesFromLinks(links: WikiLink[]): AttachmentReference[] {
  return links
    .filter((link) => link.embed)
    .map((link) => ({
      source: link.source,
      target: link.target,
      resolvedPath: link.resolvedPath
    }));
}

export function graphFromLinks(markdownPaths: string[], links: WikiLink[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodeByPath = new Map<string, GraphNode>();

  for (const notePath of markdownPaths) {
    nodeByPath.set(notePath, {
      id: stripMarkdownExtension(notePath),
      title: titleFromPath(notePath),
      path: notePath
    });
  }

  const edges: GraphEdge[] = links
    .filter((link) => !link.embed)
    .map((link) => ({
      source: stripMarkdownExtension(link.source),
      target: link.resolvedPath ? stripMarkdownExtension(link.resolvedPath) : link.target,
      label: link.heading,
      unresolved: !link.resolvedPath
    }));

  return {
    nodes: [...nodeByPath.values()].sort((a, b) => a.id.localeCompare(b.id)),
    edges: edges.sort((a, b) => `${a.source}:${a.target}`.localeCompare(`${b.source}:${b.target}`))
  };
}
