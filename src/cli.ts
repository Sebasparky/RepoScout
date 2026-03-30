#!/usr/bin/env node

import { runRepoScout } from "./pipeline/runRepoScout.js";
import { present } from "./present.js";
import { runInit } from "./init.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args[0] === "init") {
    await runInit();
    return;
  }

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Usage: reposcout "<task description>"
       reposcout init

Commands:
  init                     Set up RepoScout as a local Claude skill

Examples:
  reposcout init
  reposcout "build a local document parser with OCR in TypeScript"
  reposcout "parse PDF invoices and extract line items"
  reposcout "add OCR support to process scanned receipts"
`);
    process.exit(args.length === 0 ? 1 : 0);
  }

  const task = args.join(" ");

  try {
    const result = await runRepoScout(task);
    present(result);
  } catch (err) {
    console.error("\n  [error]", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
