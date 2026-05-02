import path from "node:path";

export const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
  ".cache",
  ".trash",
  ".obsidian-cache"
]);

export const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown"]);

export const ATTACHMENT_EXTENSIONS = new Set([
  ".avif",
  ".bmp",
  ".csv",
  ".gif",
  ".jpeg",
  ".jpg",
  ".json",
  ".m4a",
  ".mov",
  ".mp3",
  ".mp4",
  ".ogg",
  ".pdf",
  ".png",
  ".svg",
  ".tiff",
  ".wav",
  ".webm",
  ".webp"
]);

export function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}

export function relativePosix(root: string, filePath: string): string {
  return toPosix(path.relative(root, filePath));
}

export function stripMarkdownExtension(value: string): string {
  return value.replace(/\.(md|markdown)$/i, "");
}

export function titleFromPath(value: string): string {
  return stripMarkdownExtension(path.posix.basename(toPosix(value)));
}

export function csvEscape(value: string): string {
  if (!/[",\n]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}
