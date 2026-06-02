export interface ParsedMarkdown {
  frontmatter: Record<string, unknown>;
  body: string;
}

export function parseFrontmatter(markdown: string): ParsedMarkdown {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(markdown);
  if (!match) {
    return { frontmatter: {}, body: markdown };
  }

  return {
    frontmatter: parseSimpleYaml(match[1] ?? ""),
    body: match[2] ?? ""
  };
}

export function parseSimpleYaml(source: string): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const lines = source.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(trimmed);
    if (!match) continue;

    const key = match[1] ?? "";
    const raw = match[2] ?? "";
    if (!raw) {
      const list: unknown[] = [];
      let cursor = index + 1;
      while (cursor < lines.length) {
        const itemMatch = /^\s+-\s+(.*)$/.exec(lines[cursor] ?? "");
        if (!itemMatch) break;
        list.push(parseScalar(itemMatch[1] ?? ""));
        cursor += 1;
      }
      if (list.length > 0) {
        data[key] = list;
        index = cursor - 1;
      } else {
        data[key] = "";
      }
    } else if (raw.startsWith("[") && raw.endsWith("]")) {
      data[key] = raw
        .slice(1, -1)
        .split(",")
        .map((part) => parseScalar(part))
        .filter((value) => value !== "");
    } else {
      data[key] = parseScalar(raw);
    }
  }
  return data;
}

function parseScalar(value: string): string | number | boolean | null {
  const cleaned = value.trim().replace(/^["']|["']$/g, "");
  if (cleaned === "true") return true;
  if (cleaned === "false") return false;
  if (cleaned === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(cleaned)) return Number(cleaned);
  return cleaned;
}
