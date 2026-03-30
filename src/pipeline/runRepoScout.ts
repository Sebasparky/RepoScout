import { Candidate, Decision, RepoContext, RequestAnalysis, RepoScoutResult, ScoredCandidate } from "../types.js";
import { classify } from "../classify.js";
import { analyzeRequest } from "../analyzeRequest.js";
import { inspectRepo } from "../repo/inspectRepo.js";
import { buildQueries } from "../queryBuilder.js";
import { searchGitHub } from "../search/github.js";
import { searchNpm } from "../search/npm.js";
import { rankCandidates, deduplicateAcrossSources } from "../scoring/score.js";

const RECOMMEND_THRESHOLD = 55;
const TOP_N = 10;
// Minimum feature relevance score for the top-ranked candidate before OSS
// results are surfaced. Prevents weak/noisy matches (score 0–7) from showing up.
const MIN_FEATURE_CONFIDENCE = 8;

// AUTH_KEYWORDS used to cross-reference "add auth" intent with repo.authSignals.
const AUTH_KEYWORDS = ["auth", "authentication", "login", "oauth", "jwt", "session", "sign in", "signup"];

function makeDecision(
  analysis: RequestAnalysis,
  repo: RepoContext,
): Decision {
  // 1. Skip immediately for config/style changes — no OSS search will help.
  if (analysis.taskType === "config_change") {
    return {
      action: "skip_oss",
      rationale: "Local styling or config change — OSS search would not help here.",
    };
  }

  // 2. Skip for custom business logic.
  if (analysis.taskType === "business_logic") {
    return {
      action: "skip_oss",
      rationale: "Task appears to be custom domain/business logic — better to implement directly.",
    };
  }

  // 3. If the user asks about auth and the repo already has an auth library,
  //    tell them to use what they have rather than adding another one.
  if (
    repo.inspected &&
    repo.authSignals.length > 0 &&
    AUTH_KEYWORDS.some((kw) => analysis.primarySignal.toLowerCase().includes(kw))
  ) {
    return {
      action: "skip_oss",
      rationale: "Your repo already has an auth library installed.",
      alreadyHave: repo.authSignals[0],
    };
  }

  // 4. OSS-solvable task types → search.
  if (analysis.likelySolvableByOss) {
    const frameworkNote = repo.inspected && repo.framework !== "unknown" && repo.framework !== "none"
      ? ` (queries tailored for ${repo.framework})`
      : "";
    return {
      action: "search_oss",
      rationale: `${TYPE_LABEL[analysis.taskType]} tasks are well-served by OSS libraries.${frameworkNote}`,
    };
  }

  // 5. Document_parsing category fallback (handled by classify.ts).
  return {
    action: "skip_oss",
    rationale: "Task does not match known OSS-solvable patterns.",
  };
}

const TYPE_LABEL: Record<string, string> = {
  common_infra:    "Infrastructure",
  ui_component:    "UI component",
  data_processing: "Data processing",
  config_change:   "Local config",
  business_logic:  "Custom business logic",
  unknown:         "General",
};

export async function runRepoScout(task: string): Promise<RepoScoutResult> {
  // ── Analysis layer (new) ──────────────────────────────────────────────────
  const requestAnalysis = analyzeRequest(task);
  const repoContext     = inspectRepo();       // reads process.cwd()
  const classification  = classify(task);      // still used for document_parsing queries

  // ── Decision ──────────────────────────────────────────────────────────────
  // Prefer the richer request analysis; fall back to legacy classify signal.
  let decision: Decision;
  if (requestAnalysis.taskType !== "unknown") {
    decision = makeDecision(requestAnalysis, repoContext);
  } else if (classification.shouldSearchOss) {
    decision = { action: "search_oss", rationale: classification.reason };
  } else {
    decision = { action: "skip_oss", rationale: classification.reason };
  }

  // ── OSS search (conditional) ──────────────────────────────────────────────
  let candidates: Candidate[] = [];
  let ranked: ScoredCandidate[] = [];
  let queries = { github: [] as string[], npm: [] as string[], all: [] as string[] };

  if (decision.action !== "skip_oss") {
    queries = buildQueries(task, classification.category, requestAnalysis, repoContext);

    const [githubResults, npmResults] = await Promise.all([
      searchGitHub(queries.github),
      searchNpm(queries.npm),
    ]);

    const merged = deduplicateAcrossSources([...githubResults, ...npmResults]);
    candidates = merged.slice(0, TOP_N);
    ranked = rankCandidates(candidates, classification.category, requestAnalysis.featureTerms);

    // Confidence gate: suppress results when no candidate has a meaningful
    // feature-relevance score. This prevents high-star but off-topic repos
    // (e.g. starter kits, full apps) from surfacing on weak keyword overlap.
    if (ranked.length > 0 && ranked[0].scoreBreakdown.featureMatch < MIN_FEATURE_CONFIDENCE) {
      ranked = [];
      candidates = [];
    }
  }

  // ── Recommendation ────────────────────────────────────────────────────────
  const top = ranked[0] ?? null;
  const recommend = top && top.score >= RECOMMEND_THRESHOLD ? top : null;
  const tradeoffSummary = buildTradeoffSummary(ranked.slice(0, 3), recommend !== null);

  return {
    task,
    classification,
    requestAnalysis,
    repoContext,
    decision,
    queries: queries.all,
    candidates,
    ranked,
    recommendation: recommend,
    buildFromScratch: recommend === null,
    tradeoffSummary,
  };
}

function buildTradeoffSummary(
  top3: ScoredCandidate[],
  hasRecommendation: boolean
): string {
  if (top3.length === 0) {
    return "No OSS candidates found. Building from scratch gives full control.";
  }

  const best = top3[0];
  const license = best.license ?? "unknown";
  const stars = best.stars !== undefined ? formatNum(best.stars) : "—";

  if (hasRecommendation) {
    return (
      `${best.name} is the strongest match (${best.score}/100). ` +
      `License: ${license}. Stars: ${stars}. ` +
      `Adds a dependency; API may require adaptation to your use case.`
    );
  }

  return (
    `Top candidate ${best.name} scored ${best.score}/100 — below the recommendation threshold. ` +
    `License: ${license}. Stars: ${stars}. ` +
    `Building from scratch gives full control over behavior and API surface.`
  );
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}
