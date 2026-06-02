import fs from "node:fs";
import path from "node:path";

const root = path.resolve(".");
const forbidden = [
  ["Al", "manac"].join(""),
  ["al", "manac"].join(""),
  ["/Users", "/apple", "/Library", "/Mobile Documents"].join(""),
  ["Private", " repos"].join("")
];
const ignored = new Set([".git", "node_modules", "dist", "tmp"]);
const failures = [];

function walk(current) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) {
      walk(absolute);
      continue;
    }
    const content = fs.readFileSync(absolute, "utf8");
    for (const needle of forbidden) {
      if (content.includes(needle)) {
        failures.push(`${path.relative(root, absolute)} contains ${needle}`);
      }
    }
  }
}

walk(root);
if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
