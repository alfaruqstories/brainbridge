#!/usr/bin/env node
import path from "node:path";
import {
  renderReportMarkdown,
  scanVault,
  writeBridgeArtifacts,
  writeGraphArtifacts
} from "@brainbridge/core";

const VERSION = "0.1.0";

interface ParsedArgs {
  command?: string;
  vault?: string;
  outDir?: string;
  help: boolean;
  version: boolean;
}

async function main(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  if (args.version) {
    console.log(VERSION);
    return 0;
  }

  if (args.help || !args.command) {
    printHelp();
    return args.command ? 0 : 1;
  }

  if (!args.vault) {
    console.error("Missing vault path.");
    printHelp();
    return 1;
  }

  const vaultPath = path.resolve(args.vault);

  try {
    if (args.command === "audit") {
      const report = await scanVault(vaultPath);
      if (args.outDir) {
        const written = await writeBridgeArtifacts(report, { outDir: args.outDir });
        printSummary(report, written);
      } else {
        process.stdout.write(renderReportMarkdown(report));
      }
      return 0;
    }

    if (args.command === "bridge") {
      const outDir = requireOutDir(args);
      const report = await scanVault(vaultPath);
      const written = await writeBridgeArtifacts(report, { outDir });
      printSummary(report, written);
      return 0;
    }

    if (args.command === "graph") {
      const outDir = requireOutDir(args);
      const report = await scanVault(vaultPath);
      const written = await writeGraphArtifacts(report, outDir);
      printSummary(report, written);
      return 0;
    }

    if (args.command === "export") {
      const outDir = requireOutDir(args);
      const report = await scanVault(vaultPath);
      const written = await writeBridgeArtifacts(report, { outDir, includeVaultCopy: true });
      printSummary(report, written);
      return 0;
    }

    console.error(`Unknown command: ${args.command}`);
    printHelp();
    return 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv;
  let vault: string | undefined;
  let outDir: string | undefined;
  let help = false;
  let version = false;

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--help" || arg === "-h") help = true;
    else if (arg === "--version" || arg === "-v") version = true;
    else if (arg === "--out") {
      outDir = rest[index + 1];
      index += 1;
    } else if (!arg.startsWith("-") && !vault) {
      vault = arg;
    }
  }

  if (command === "--version" || command === "-v") version = true;
  if (command === "--help" || command === "-h") help = true;

  return { command, vault: vault ?? process.cwd(), outDir, help, version };
}

function requireOutDir(args: ParsedArgs): string {
  if (!args.outDir) {
    throw new Error(`${args.command} requires --out <dir>.`);
  }
  return args.outDir;
}

function printSummary(report: Awaited<ReturnType<typeof scanVault>>, written: string[]): void {
  console.log(`BrainBridge scanned ${report.summary.files} files.`);
  console.log(`Portability score: ${report.summary.portabilityScore}/100`);
  console.log(`Findings: ${report.summary.findings}`);
  console.log(`Wrote ${written.length} artifact(s).`);
}

function printHelp(): void {
  console.log(`BrainBridge

Make Obsidian vaults understandable everywhere else.

Usage:
  brainbridge audit [vault] [--out <dir>]
  brainbridge bridge [vault] --out <dir>
  brainbridge graph [vault] --out <dir>
  brainbridge export [vault] --out <dir>
  brainbridge --version

Commands:
  audit   Report what will and will not work outside Obsidian.
  bridge  Generate portable fallback artifacts without copying the vault.
  graph   Generate graph.json, graph.csv, and backlinks.md.
  export  Copy portable vault files and generated fallback artifacts.
`);
}

main(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
});
