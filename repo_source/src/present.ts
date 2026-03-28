import { Decision, RepoContext, RequestAnalysis, RepoScoutResult, ScoredCandidate, ScoreBreakdown } from "./types.js";

// ANSI color helpers — no external deps needed.
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  white: "\x1b[97m",
  gray: "\x1b[90m",
  bgBlue: "\x1b[44m",
};

const W = 60; // terminal width

function line(char = "─"): string {
  return char.repeat(W);
}

function header(title: string): string {
  const pad = Math.max(0, W - title.length - 4);
  const left = Math.floor(pad / 2);
  const right = pad - left;
  return (
    `${c.bold}${c.cyan}╔${"═".repeat(W - 2)}╗\n` +
    `║ ${" ".repeat(left)}${c.white}${title}${c.cyan}${" ".repeat(right)} ║\n` +
    `╚${"═".repeat(W - 2)}╝${c.reset}`
  );
}

function section(title: string): string {
  return `\n${c.bold}${c.yellow}  ${title}${c.reset}\n  ${c.dim}${line()}${c.reset}`;
}

function scoreBar(score: number, max: number): string {
  const filled = Math.round((score / max) * 10);
  const empty = 10 - filled;
  return `${c.green}${"█".repeat(filled)}${c.dim}${"░".repeat(empty)}${c.reset}`;
}

function formatScore(score: number): string {
  if (score >= 75) return `${c.green}${score}${c.reset}`;
  if (score >= 50) return `${c.yellow}${score}${c.reset}`;
  return `${c.red}${score}${c.reset}`;
}

function formatNum(n: number | undefined): string {
  if (n === undefined) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

function breakdownRow(
  label: string,
  score: number,
  max: number,
  reason: string
): string {
  const bar = scoreBar(score, max);
  return `      ${c.dim}${label.padEnd(18)}${c.reset}${score.toString().padStart(2)}/${max}  ${bar}  ${c.dim}${reason}${c.reset}`;
}

function candidateBlock(
  rank: number,
  c_: ScoredCandidate,
  bd: ScoreBreakdown
): string {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
  const nameDisplay = c_.name.length > 35 ? c_.name.slice(0, 34) + "…" : c_.name;
  const lines: string[] = [];

  lines.push(
    `\n  ${medal} ${c.bold}${c.white}${nameDisplay}${c.reset}` +
      `  ${c.dim}[${c_.source}]${c.reset}` +
      `  Score: ${formatScore(c_.score)}/100`
  );
  lines.push(`     ${c.dim}${c_.url}${c.reset}`);

  if (c_.description) {
    const desc =
      c_.description.length > 70
        ? c_.description.slice(0, 69) + "…"
        : c_.description;
    lines.push(`     ${c.dim}${desc}${c.reset}`);
  }

  const meta: string[] = [];
  if (c_.stars !== undefined) meta.push(`⭐ ${formatNum(c_.stars)} stars`);
  if (c_.downloads !== undefined) meta.push(`📦 ~${formatNum(c_.downloads)}/mo`);
  if (c_.license) meta.push(`📄 ${c_.license}`);
  if (c_.language) meta.push(`🔷 ${c_.language}`);
  if (meta.length) lines.push(`     ${c.dim}${meta.join("   ")}${c.reset}`);

  lines.push(`\n     ${c.dim}Score breakdown:${c.reset}`);
  lines.push(breakdownRow("Feature Match", bd.featureMatch, 30, "category keyword hits"));
  lines.push(breakdownRow("Stack Match", bd.stackMatch, 20, "JS/TS ecosystem fit"));
  lines.push(breakdownRow("Maintenance", bd.maintenance, 20, "last push recency"));
  lines.push(breakdownRow("License Safety", bd.licenseSafety, 15, c_.license ?? "unknown"));
  lines.push(breakdownRow("Popularity", bd.popularity, 15, "stars / downloads"));

  return lines.join("\n");
}

// ── New sections ─────────────────────────────────────────────────────────────

function presentRepoContext(repo: RepoContext): string[] {
  if (!repo.inspected) return [];
  const out: string[] = [];
  out.push(section("Repo Context"));

  const row = (label: string, value: string) =>
    `  ${c.dim}${label.padEnd(16)}${c.reset}${value}`;

  out.push(row("Language:", repo.language));
  out.push(row("Framework:", repo.framework));
  if (repo.uiStack.length) out.push(row("UI stack:", repo.uiStack.join(" · ")));
  out.push(row("Pkg manager:", repo.packageManager));
  if (repo.authSignals.length) {
    out.push(row("Auth (existing):", `${c.yellow}${repo.authSignals.join(", ")}${c.reset}`));
  }
  if (repo.dbSignals.length) {
    out.push(row("DB:", repo.dbSignals.join(", ")));
  }
  return out;
}

function presentDecision(analysis: RequestAnalysis, decision: Decision): string[] {
  const out: string[] = [];
  out.push(section("Decision"));

  const typeLabel = analysis.taskType !== "unknown"
    ? `${c.cyan}${analysis.taskType}${c.reset}`
    : `${c.dim}unknown${c.reset}`;
  const confLabel = analysis.confidence !== "low"
    ? `  ${c.dim}[${analysis.confidence} confidence]${c.reset}`
    : "";

  out.push(`  Task type:  ${typeLabel}${confLabel}`);
  if (analysis.primarySignal) {
    out.push(`  Signal:     ${c.dim}${analysis.primarySignal}${c.reset}`);
  }

  const actionStr = decision.action === "search_oss" || decision.action === "search_selective"
    ? `${c.green}OSS search triggered${c.reset}`
    : `${c.yellow}OSS search skipped${c.reset}`;
  out.push(`  Action:     ${actionStr}`);
  out.push(`  Rationale:  ${c.dim}${decision.rationale}${c.reset}`);

  if (decision.alreadyHave) {
    out.push(`  ${c.yellow}Already have:${c.reset} ${c.bold}${decision.alreadyHave}${c.reset}${c.dim} — check its capabilities before adding another library${c.reset}`);
  }
  return out;
}

// ── Main presenter ────────────────────────────────────────────────────────────

export function present(result: RepoScoutResult): void {
  const out: string[] = [];

  out.push("\n" + header("  RepoScout — Build vs Borrow Analysis  "));

  out.push(section("Task"));
  out.push(`  ${c.white}"${result.task}"${c.reset}`);

  // Repo context (only when a package.json was found)
  out.push(...presentRepoContext(result.repoContext));

  // Decision rationale (new — replaces the old Classification section for clarity)
  out.push(...presentDecision(result.requestAnalysis, result.decision));

  // For skip_oss: show the skip verdict and stop — no point showing empty results.
  if (result.decision.action === "skip_oss") {
    out.push(section("Recommendation"));
    out.push(`  ${c.yellow}${c.bold}⚠ BUILD / EDIT DIRECTLY${c.reset}`);
    out.push(`  ${c.dim}${result.tradeoffSummary}${c.reset}`);
    out.push(`\n  ${c.dim}${line()}${c.reset}\n`);
    console.log(out.join("\n"));
    return;
  }

  // Legacy classification row (compact, below decision)
  if (result.classification.category !== "unknown") {
    out.push(`\n  ${c.dim}Category:${c.reset} ${c.cyan}${result.classification.category}${c.reset}`);
  }

  out.push(section("Search Queries"));
  result.queries.forEach((q, i) => {
    out.push(`  ${c.dim}${i + 1}.${c.reset} ${q}`);
  });

  const top3 = result.ranked.slice(0, 3);

  out.push(section(`Top Candidates  (${result.candidates.length} retrieved, showing top 3)`));
  if (top3.length === 0) {
    out.push(`  ${c.dim}No candidates found.${c.reset}`);
  } else {
    top3.forEach((cand, i) => {
      out.push(candidateBlock(i + 1, cand, cand.scoreBreakdown));
    });
  }

  out.push(section("Recommendation"));

  if (result.recommendation) {
    const rec = result.recommendation;
    out.push(
      `  ${c.green}${c.bold}✓ USE OSS:${c.reset} ${c.white}${c.bold}${rec.name}${c.reset}  ${c.dim}(score ${rec.score}/100)${c.reset}`
    );
    out.push(`\n  ${c.bold}Why:${c.reset}`);
    const lines = rec.explanation.split(" · ");
    lines.forEach((l) => out.push(`   ${c.dim}•${c.reset} ${l}`));
  } else {
    out.push(
      `  ${c.yellow}${c.bold}⚠ BUILD FROM SCRATCH${c.reset}  ${c.dim}— no strong OSS candidate found${c.reset}`
    );
  }

  out.push(`\n  ${c.bold}Tradeoff summary:${c.reset}`);
  out.push(`  ${c.dim}${result.tradeoffSummary}${c.reset}`);

  const scratchVerdict = result.buildFromScratch
    ? `${c.yellow}Yes — worth considering${c.reset}`
    : `${c.green}No — OSS covers the core need${c.reset}`;
  out.push(`\n  ${c.bold}Build from scratch?${c.reset}  ${scratchVerdict}`);

  out.push(`\n  ${c.dim}${line()}${c.reset}\n`);

  console.log(out.join("\n"));
}
