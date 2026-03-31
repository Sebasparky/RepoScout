#!/usr/bin/env node
/**
 * RepoScout initializer.
 *
 * Guides the user through local setup:
 *   1. Checks whether the build exists (dist/)
 *   2. Creates/updates .env from .env.example
 *   3. Asks whether to add GITHUB_TOKEN
 *   4. Installs the Claude skill to the current project if needed
 *   5. Prints final usage guidance
 *
 * Entry point: `reposcout init`
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";

// ---------------------------------------------------------------------------
// Pure helpers (exported for testing)
// ---------------------------------------------------------------------------

/** Returns true if `dir` looks like the reposcout repo root. */
export function isReposcoutRepo(dir: string): boolean {
  return (
    fs.existsSync(path.join(dir, "src", "skillEntry.ts")) ||
    (fs.existsSync(path.join(dir, "dist", "skillEntry.js")) &&
      fs.existsSync(path.join(dir, ".claude", "skills", "reposcout", "SKILL.md")))
  );
}

/**
 * Set or replace a single KEY=VALUE line in an .env file string.
 * If the key already exists (commented or not) it is replaced in-place.
 * Otherwise the assignment is appended.
 */
export function setEnvVar(content: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^#?\\s*${key}\\s*=.*$`, "m");
  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }
  const trimmed = content.trimEnd();
  return trimmed ? `${trimmed}\n${line}\n` : `${line}\n`;
}

/** Returns the absolute path of the directory that contains this file. */
export function packageRoot(): string {
  // __dirname is src/ in tsx dev mode or dist/ after tsc build.
  // Either way, one level up is the repo/package root.
  return path.resolve(__dirname, "..");
}

// ---------------------------------------------------------------------------
// Interactive helpers
// ---------------------------------------------------------------------------

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function askYesNo(rl: readline.Interface, question: string): Promise<boolean> {
  for (;;) {
    const raw = (await ask(rl, `${question} [y/n] `)).trim().toLowerCase();
    if (raw === "y" || raw === "yes") return true;
    if (raw === "n" || raw === "no") return false;
    console.log("  Please enter y or n.");
  }
}

// ---------------------------------------------------------------------------
// Setup steps
// ---------------------------------------------------------------------------

/** Step 1 — build check */
function checkBuild(repoDir: string): void {
  const skillEntry = path.join(repoDir, "dist", "skillEntry.js");
  if (!fs.existsSync(skillEntry)) {
    console.log(`
  Build not found. Run this first:

    npm install
    npm run build
`);
    console.log("  Re-run \`reposcout init\` once the build is ready.\n");
    process.exit(1);
  }
}

/** Step 2+3 — .env creation and optional GITHUB_TOKEN */
async function setupEnv(envDir: string, rl: readline.Interface): Promise<void> {
  const envPath = path.join(envDir, ".env");
  const examplePath = path.join(envDir, ".env.example");

  let envContent: string;

  if (fs.existsSync(envPath)) {
    console.log("  .env already exists — leaving existing values intact.");
    envContent = fs.readFileSync(envPath, "utf8");
  } else if (fs.existsSync(examplePath)) {
    envContent = fs.readFileSync(examplePath, "utf8");
    fs.writeFileSync(envPath, envContent, { mode: 0o600 });
    console.log("  Created .env from .env.example");
  } else {
    envContent = "# RepoScout local config\n# GITHUB_TOKEN=\n";
    fs.writeFileSync(envPath, envContent, { mode: 0o600 });
    console.log("  Created .env");
  }

  console.log(`
  GITHUB_TOKEN is optional.
  Without it: GitHub unauthenticated limit (60 req/hr) — RepoScout still works.
  With it:    authenticated access (5,000 req/hr) and more reliable results.
  No scopes are required for public repo search.
  Create one at: https://github.com/settings/tokens → Fine-grained tokens → New token
`);

  const wantToken = await askYesNo(rl, "  Add a GITHUB_TOKEN now?");

  if (!wantToken) {
    console.log("  Skipping token — RepoScout will use unauthenticated GitHub access.\n");
    return;
  }

  const token = (await ask(rl, "  Paste your GitHub personal access token: ")).trim();
  if (!token) {
    console.log("  No token entered — skipping. Add it to .env manually when ready.\n");
    return;
  }

  const updated = setEnvVar(envContent, "GITHUB_TOKEN", token);
  fs.writeFileSync(envPath, updated, { mode: 0o600 });
  console.log("  GITHUB_TOKEN written to .env\n");
}

// The run_reposcout.sh written when installing into an external project.
// Uses `npx reposcout-skill` so it always finds the installed package.
const SKILL_SCRIPT_EXTERNAL = `#!/usr/bin/env bash
set -euo pipefail
TASK="\${1:-}"
if [ -z "$TASK" ]; then
  echo '{"error":"missing task"}'
  exit 1
fi
exec npx reposcout-skill --task "$TASK"
`;

/** Step 4 — Claude skill installation */
function ensureSkill(cwd: string, pkgRoot: string): { installed: boolean; skillDir: string } {
  const skillDir = path.join(cwd, ".claude", "skills", "reposcout");
  const skillMdPath = path.join(skillDir, "SKILL.md");
  const scriptsDir = path.join(skillDir, "scripts");
  const scriptPath = path.join(scriptsDir, "run_reposcout.sh");

  // If skill is already in place, nothing to do.
  if (fs.existsSync(skillMdPath) && fs.existsSync(scriptPath)) {
    console.log("  Claude skill already installed at .claude/skills/reposcout/");
    return { installed: false, skillDir };
  }

  fs.mkdirSync(scriptsDir, { recursive: true });

  // Copy SKILL.md from the package root (present whether running from repo or npx cache).
  const sourceMd = path.join(pkgRoot, ".claude", "skills", "reposcout", "SKILL.md");
  if (fs.existsSync(sourceMd)) {
    fs.copyFileSync(sourceMd, skillMdPath);
  } else {
    // Embedded minimal fallback so init never hard-fails.
    fs.writeFileSync(
      skillMdPath,
      "# RepoScout — Build vs Borrow Preflight\n\nSee https://github.com/your-org/reposcout for full SKILL.md.\n"
    );
  }

  // For an external install the script uses npx; for the repo itself the
  // existing script (already at this path) already navigates back to dist/.
  fs.writeFileSync(scriptPath, SKILL_SCRIPT_EXTERNAL);
  fs.chmodSync(scriptPath, 0o755);

  console.log("  Claude skill installed at .claude/skills/reposcout/");
  return { installed: true, skillDir };
}

// ---------------------------------------------------------------------------
// Final guidance
// ---------------------------------------------------------------------------

function printGuidance(opts: {
  inRepo: boolean;
  repoDir: string;
  cwd: string;
  skillDir: string;
  envDir: string;
}): void {
  const { inRepo, repoDir, skillDir, envDir } = opts;

  console.log("─────────────────────────────────────────────────────");
  console.log("  RepoScout is ready.\n");

  console.log("  Use it in a Claude Code session:");
  console.log("    /reposcout Add a data grid with sorting and filtering\n");

  console.log("  Or run the skill directly:");
  if (inRepo) {
    console.log(`    node ${path.join(repoDir, "dist/skillEntry.js")} --task "Add auth"\n`);
  } else {
    console.log(`    npx reposcout "Add auth"\n`);
  }

  console.log("  Config written to:");
  console.log(`    ${path.join(envDir, ".env")}`);
  console.log(`    ${skillDir}\n`);

  console.log("  To add or update GITHUB_TOKEN later:");
  console.log(`    Edit ${path.join(envDir, ".env")} and set GITHUB_TOKEN=<token>`);
  console.log("  To remove GITHUB_TOKEN:");
  console.log(`    Delete or comment out the GITHUB_TOKEN line in .env\n`);

  console.log("─────────────────────────────────────────────────────");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function runInit(): Promise<void> {
  console.log(`
  RepoScout init — local skill setup
  ────────────────────────────────────
  This will:
    • check your build (dist/)
    • create/update .env (local only, never committed)
    • ask whether to add GITHUB_TOKEN
    • install the Claude skill to .claude/skills/reposcout/
`);

  const cwd = process.cwd();
  const pkgRoot = packageRoot();

  // Determine which directory is the reposcout source tree.
  // If the user ran `reposcout init` from within the repo, cwd IS the repo.
  // If they ran `npx reposcout init` from another project, pkgRoot is the package.
  const inRepo = isReposcoutRepo(cwd);
  const repoDir = inRepo ? cwd : pkgRoot;

  // For the env file: always write to cwd so the token is local to the user's project.
  const envDir = cwd;

  checkBuild(repoDir);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  try {
    await setupEnv(envDir, rl);
    const { skillDir } = ensureSkill(cwd, pkgRoot);
    printGuidance({ inRepo, repoDir, cwd, skillDir, envDir });
  } finally {
    rl.close();
  }
}
