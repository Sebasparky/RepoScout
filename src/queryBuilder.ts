import { Category, Framework, RequestAnalysis, RepoContext } from "./types.js";

type QuerySpec = {
  github: string[];
  npm: string[];
};

export type SearchQueries = {
  github: string[];
  npm: string[];
  all: string[];
};

// ── Category-based queries (existing document_parsing path) ──────────────────

const QUERIES_BY_CATEGORY: Record<Exclude<Category, "unknown">, QuerySpec> = {
  document_parsing: {
    github: [
      "tesseract javascript",         // finds naptha/tesseract.js (37k stars)
      "pdf parser javascript",        // finds pdf-parse, pdfjs-dist
      "pdf.js mozilla",               // finds Mozilla PDF.js
    ],
    npm: [
      "pdf parse text extract",
      "ocr typescript node",
      "document parsing nodejs",
    ],
  },
};

// ── Task-type query table ────────────────────────────────────────────────────
// Each entry covers a (primarySignal substring, optional framework) → QuerySpec.
// Checked in order; first match wins.

type TaskQueryEntry = {
  signal: string;          // substring match against analysis.primarySignal
  framework?: Framework;   // if set, only matches when repo.framework matches
  spec: QuerySpec;
};

const INFRA_QUERIES: TaskQueryEntry[] = [
  // Auth — framework-specific first, then generic fallback
  {
    signal: "auth",
    framework: "nextjs",
    spec: {
      github: ["next-auth nextjs typescript", "clerk nextjs authentication"],
      npm:    ["next-auth", "better-auth nextjs"],
    },
  },
  {
    signal: "auth",
    spec: {
      github: ["authentication library typescript node", "passport.js authentication"],
      npm:    ["jsonwebtoken typescript", "passport authentication nodejs"],
    },
  },
  {
    signal: "oauth",
    spec: {
      github: ["oauth library typescript node", "openid connect nodejs"],
      npm:    ["openid-client", "oauth4webapi"],
    },
  },
  // Payments
  {
    signal: "payment",
    spec: {
      github: ["stripe typescript integration", "payment processing node"],
      npm:    ["stripe", "lemon-squeezy typescript"],
    },
  },
  {
    signal: "stripe",
    spec: {
      github: ["stripe typescript integration"],
      npm:    ["stripe", "@stripe/stripe-js"],
    },
  },
  // Email
  {
    signal: "email",
    spec: {
      github: ["nodemailer typescript", "email sending node typescript"],
      npm:    ["nodemailer", "resend"],
    },
  },
  {
    signal: "smtp",
    spec: {
      github: ["nodemailer typescript smtp"],
      npm:    ["nodemailer", "resend"],
    },
  },
  // File / storage
  {
    signal: "file upload",
    spec: {
      github: ["file upload typescript node", "multipart upload nodejs"],
      npm:    ["multer typescript", "formidable typescript"],
    },
  },
  {
    signal: "s3",
    spec: {
      github: ["aws s3 typescript", "s3 upload nodejs"],
      npm:    ["@aws-sdk/client-s3", "aws-sdk typescript"],
    },
  },
];

const UI_QUERIES: TaskQueryEntry[] = [
  // Rich text / WYSIWYG — framework-specific first
  {
    signal: "rich text",
    framework: "vue",
    spec: {
      github: ["tiptap vue editor", "quill vue rich text"],
      npm:    ["@tiptap/vue-3", "quill"],
    },
  },
  {
    signal: "rich text",
    spec: {
      github: ["tiptap react editor typescript", "slate react wysiwyg"],
      npm:    ["@tiptap/react", "slate"],
    },
  },
  {
    signal: "text editor",
    spec: {
      github: ["tiptap react editor typescript", "slate.js react"],
      npm:    ["@tiptap/react", "slate"],
    },
  },
  {
    signal: "wysiwyg",
    spec: {
      github: ["wysiwyg editor react typescript", "tiptap prosemirror"],
      npm:    ["@tiptap/react", "quill"],
    },
  },
  // Date / calendar
  {
    signal: "date picker",
    spec: {
      github: ["react date picker typescript", "react calendar component"],
      npm:    ["react-day-picker", "date-fns"],
    },
  },
  {
    signal: "datepicker",
    spec: {
      github: ["react date picker typescript"],
      npm:    ["react-day-picker", "react-datepicker"],
    },
  },
  // Charts
  {
    signal: "chart",
    spec: {
      github: ["recharts react typescript", "chart.js typescript"],
      npm:    ["recharts", "chart.js"],
    },
  },
  // Data table
  {
    signal: "data table",
    spec: {
      github: ["tanstack table react typescript", "react data grid"],
      npm:    ["@tanstack/react-table", "ag-grid-react"],
    },
  },
  {
    signal: "data grid",
    spec: {
      github: ["ag grid react typescript", "tanstack table"],
      npm:    ["ag-grid-react", "@tanstack/react-table"],
    },
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

// When the user explicitly names a framework in their task ("my Next.js app"),
// use that rather than the inspected repo framework — it's more reliable for
// queries and avoids wrong results when the tool is run outside a project dir.
function taskFrameworkHint(task: string): Framework | null {
  const t = task.toLowerCase();
  if (t.includes("next.js") || t.includes("nextjs") || t.includes("next js")) return "nextjs";
  if (t.includes("remix"))   return "remix";
  if (t.includes("nuxt"))    return "nuxt";
  if (t.includes("svelte"))  return "svelte";
  if (t.includes("vue"))     return "vue";
  if (t.includes("vite"))    return "vite";
  if (t.includes("express")) return "express";
  return null;
}

function findSpec(
  entries: TaskQueryEntry[],
  primarySignal: string,
  framework: Framework
): QuerySpec | null {
  const lower = primarySignal.toLowerCase();
  for (const entry of entries) {
    if (!lower.includes(entry.signal)) continue;
    if (entry.framework && entry.framework !== framework) continue;
    return entry.spec;
  }
  return null;
}

function makeQueries(spec: QuerySpec): SearchQueries {
  return {
    github: spec.github,
    npm:    spec.npm,
    all:    [...new Set([...spec.github, ...spec.npm])],
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export function buildQueries(
  task: string,
  category: Category,
  analysis: RequestAnalysis,
  repo: RepoContext
): SearchQueries {
  // 1. Existing category path — document_parsing is fully handled here.
  if (category !== "unknown") {
    const spec = QUERIES_BY_CATEGORY[category];
    return makeQueries(spec);
  }

  // 2. Task-type based — framework-aware lookups.
  // Prefer an explicit framework mentioned in the task text (e.g. "my Next.js app")
  // over the inspected repo framework so queries stay correct even when the tool
  // is run outside a project directory.
  const fw = taskFrameworkHint(task) ?? repo.framework;

  if (analysis.taskType === "common_infra") {
    const spec = findSpec(INFRA_QUERIES, analysis.primarySignal, fw);
    if (spec) return makeQueries(spec);
  }

  if (analysis.taskType === "ui_component") {
    const spec = findSpec(UI_QUERIES, analysis.primarySignal, fw);
    if (spec) return makeQueries(spec);
  }

  // 3. Fallback — raw task text as a single broad query.
  const fallback = task.slice(0, 80);
  return { github: [fallback], npm: [fallback], all: [fallback] };
}
