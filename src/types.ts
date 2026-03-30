export type Category = "document_parsing" | "unknown";

// ── Request analysis ─────────────────────────────────────────────────────────

export type TaskType =
  | "common_infra"    // auth, payments, email, file storage, analytics
  | "ui_component"    // rich text editor, date picker, chart, table
  | "data_processing" // OCR, PDF parsing, CSV, image transforms
  | "config_change"   // style fix, spacing, rename, colour tweak
  | "business_logic"  // domain-specific custom work, clearly repo-internal
  | "unknown";

export type RequestAnalysis = {
  taskType: TaskType;
  intent: string;               // one-line summary of what was asked
  primarySignal: string;        // the keyword that drove the classification
  canonicalFeature: string | null; // stable feature name for synonym families (e.g. "auth")
  featureTerms: string[];       // content words extracted from primarySignal for relevance scoring
  likelySolvableByOss: boolean;
  confidence: "high" | "medium" | "low";
};

// ── Repo inspection ──────────────────────────────────────────────────────────

export type Framework =
  | "nextjs" | "remix" | "vite" | "express" | "fastify"
  | "vue" | "nuxt" | "svelte" | "none" | "unknown";

export type RepoContext = {
  inspected: boolean;          // false when no package.json was found
  language: "typescript" | "javascript" | "unknown";
  framework: Framework;
  uiStack: string[];           // e.g. ["react", "tailwind"]
  packageManager: "npm" | "pnpm" | "yarn" | "bun" | "unknown";
  authSignals: string[];       // existing auth-related deps
  dbSignals: string[];         // existing db-related deps
  majorDeps: string[];         // top-level non-dev deps (trimmed list)
};

// ── Decision ─────────────────────────────────────────────────────────────────

export type OssDecision = "search_oss" | "search_selective" | "skip_oss";

export type Decision = {
  action: OssDecision;
  rationale: string;
  alreadyHave?: string;   // name of existing dep that covers the request
};

export type ClassificationResult = {
  category: Category;
  shouldSearchOss: boolean;
  reason: string;
};

export type Candidate = {
  id: string;
  source: "github" | "npm";
  name: string;
  url: string;
  npmUrl?: string;         // populated on GitHub candidates merged with an npm match
  description?: string;
  language?: string;
  license?: string;
  stars?: number;
  downloads?: number;
  lastUpdated?: string;
  keywords?: string[];
  archived?: boolean;
  rawMetadata?: Record<string, unknown>;
};

export type ScoreBreakdown = {
  featureMatch: number;   // 0-30
  stackMatch: number;     // 0-20
  maintenance: number;    // 0-20
  licenseSafety: number;  // 0-15
  popularity: number;     // 0-15
};

export type ScoredCandidate = Candidate & {
  score: number;
  scoreBreakdown: ScoreBreakdown;
  explanation: string;
};

export type RepoScoutResult = {
  task: string;
  // Legacy category-based classification (still drives document_parsing queries)
  classification: ClassificationResult;
  // New repo-aware analysis
  requestAnalysis: RequestAnalysis;
  repoContext: RepoContext;
  decision: Decision;
  queries: string[];
  candidates: Candidate[];
  ranked: ScoredCandidate[];
  recommendation: ScoredCandidate | null;
  buildFromScratch: boolean;
  tradeoffSummary: string;
};
