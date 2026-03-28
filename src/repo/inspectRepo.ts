import fs from "fs";
import path from "path";
import { Framework, RepoContext } from "../types.js";

// ── Dep-name lookup tables ────────────────────────────────────────────────────

const FRAMEWORK_DEPS: Array<{ pkg: string; framework: Framework }> = [
  { pkg: "next",              framework: "nextjs"  },
  { pkg: "@remix-run/react",  framework: "remix"   },
  { pkg: "@remix-run/node",   framework: "remix"   },
  { pkg: "nuxt",              framework: "nuxt"    },
  { pkg: "vite",              framework: "vite"    },
  { pkg: "@vitejs/plugin-react", framework: "vite" },
  { pkg: "fastify",           framework: "fastify" },
  { pkg: "express",           framework: "express" },
  { pkg: "svelte",            framework: "svelte"  },
  { pkg: "vue",               framework: "vue"     },
];

const UI_DEPS = [
  "react", "vue", "svelte", "solid-js",
  "tailwindcss", "@tailwindcss/vite",
  "@mui/material", "@chakra-ui/react", "@radix-ui/react-dialog",
  "shadcn-ui", "@shadcn/ui",
  "styled-components", "@emotion/react",
  "bootstrap", "daisyui",
];

const AUTH_DEPS = [
  "next-auth", "@auth/core", "@auth/prisma-adapter",
  "clerk", "@clerk/nextjs", "@clerk/clerk-sdk-node",
  "firebase", "@firebase/auth",
  "@supabase/supabase-js",
  "passport", "passport-jwt", "passport-local",
  "lucia", "better-auth",
  "jose", "jsonwebtoken",
  "@auth0/nextjs-auth0",
];

const DB_DEPS = [
  "prisma", "@prisma/client",
  "drizzle-orm", "drizzle-kit",
  "mongoose", "@typegoose/typegoose",
  "pg", "@types/pg", "postgres",
  "mysql2", "better-sqlite3", "sqlite3",
  "@planetscale/database",
  "@supabase/supabase-js",
  "redis", "ioredis",
  "kysely", "knex", "sequelize",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function exists(filePath: string): boolean {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function readJson(filePath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function globFirst(dir: string, prefix: string): boolean {
  // Checks whether any file starting with `prefix` exists in `dir`.
  // Used for next.config.* and vite.config.* without reading directory recursively.
  const extensions = [".js", ".ts", ".mjs", ".cjs"];
  return extensions.some((ext) => exists(path.join(dir, prefix + ext)));
}

function pickDeps(allDeps: string[], matchList: string[]): string[] {
  return matchList.filter((m) => allDeps.includes(m));
}

function inferUiStack(allDeps: string[]): string[] {
  return UI_DEPS.filter((d) => allDeps.includes(d)).map((d) => {
    // Normalise display names
    if (d === "tailwindcss" || d === "@tailwindcss/vite") return "tailwind";
    if (d === "@mui/material") return "MUI";
    if (d === "@chakra-ui/react") return "Chakra";
    if (d.startsWith("@radix-ui/")) return "Radix";
    if (d === "styled-components") return "styled-components";
    if (d === "@emotion/react") return "Emotion";
    return d;
  });
}

// ── Main export ───────────────────────────────────────────────────────────────

export function inspectRepo(cwd: string = process.cwd()): RepoContext {
  const pkgPath = path.join(cwd, "package.json");

  if (!exists(pkgPath)) {
    return {
      inspected: false,
      language: "unknown",
      framework: "unknown",
      uiStack: [],
      packageManager: "unknown",
      authSignals: [],
      dbSignals: [],
      majorDeps: [],
    };
  }

  const pkg = readJson(pkgPath);
  if (!pkg) {
    return {
      inspected: false,
      language: "unknown",
      framework: "unknown",
      uiStack: [],
      packageManager: "unknown",
      authSignals: [],
      dbSignals: [],
      majorDeps: [],
    };
  }

  const deps = Object.keys((pkg.dependencies as Record<string, unknown>) ?? {});
  const devDeps = Object.keys((pkg.devDependencies as Record<string, unknown>) ?? {});
  const allDeps = [...deps, ...devDeps];

  // Language
  const hasTs = devDeps.includes("typescript") || exists(path.join(cwd, "tsconfig.json"));
  const language: RepoContext["language"] = hasTs ? "typescript" : allDeps.length > 0 ? "javascript" : "unknown";

  // Framework — check config file presence first (more reliable), then deps
  let framework: Framework = "unknown";
  if (exists(path.join(cwd, "next.config.js")) || globFirst(cwd, "next.config")) {
    framework = "nextjs";
  } else {
    const match = FRAMEWORK_DEPS.find((f) => allDeps.includes(f.pkg));
    if (match) framework = match.framework;
    else if (allDeps.length > 0) framework = "none";
  }

  // Package manager — lock file is the ground truth
  const packageManager: RepoContext["packageManager"] =
    exists(path.join(cwd, "pnpm-lock.yaml"))  ? "pnpm" :
    exists(path.join(cwd, "yarn.lock"))        ? "yarn" :
    exists(path.join(cwd, "bun.lockb"))        ? "bun"  :
    exists(path.join(cwd, "package-lock.json"))? "npm"  : "unknown";

  // Auth / DB signals (only direct deps, not transitive)
  const authSignals = pickDeps(allDeps, AUTH_DEPS);
  const dbSignals   = pickDeps(allDeps, DB_DEPS);

  // UI stack
  const uiStack = inferUiStack(allDeps);

  // Major deps — non-dev, first 15, alphabetical
  const majorDeps = deps.slice().sort().slice(0, 15);

  return {
    inspected: true,
    language,
    framework,
    uiStack,
    packageManager,
    authSignals,
    dbSignals,
    majorDeps,
  };
}
