#!/usr/bin/env node
/**
 * Skill-facing entrypoint for RepoScout.
 *
 * Calls the existing runRepoScout() engine and emits a single JSON object to
 * stdout. No human-readable output is produced — ANSI/present.ts is never
 * invoked from this path.
 *
 * Usage:
 *   npx tsx src/skillEntry.ts "<task description>"
 *   node dist/skillEntry.js "<task description>"
 */

import { runRepoScout } from "./pipeline/runRepoScout.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Support --task "..." as primary interface; fall back to positional args.
  let task: string;
  const taskFlagIndex = args.indexOf("--task");
  if (taskFlagIndex !== -1 && args[taskFlagIndex + 1]) {
    task = args[taskFlagIndex + 1];
  } else {
    const positional = args.filter((a) => !a.startsWith("--"));
    task = positional.join(" ");
  }

  if (!task) {
    process.stderr.write('Usage: reposcout-skill --task "<task description>"\n');
    process.exit(1);
  }

  try {
    const result = await runRepoScout(task);

    // Map internal OssDecision → skill-facing action
    let action: "surface_oss" | "continue_direct" | "skip_oss";
    if (result.decision.action === "skip_oss") {
      action = "skip_oss";
    } else if (result.recommendation) {
      action = "surface_oss";
    } else {
      action = "continue_direct";
    }

    // Normalise a ranked candidate into a stable output shape.
    // Fields are always present in the same order; missing values use null.
    const normalizeCandidate = (c: (typeof result.ranked)[number]) => ({
      name: c.name,
      githubUrl: c.source === "github" ? c.url : null,
      npmUrl: c.source === "npm" ? c.url : (c.npmUrl ?? null),
      score: c.score,
      license: c.license ?? null,
      stars: c.stars ?? null,
      why: c.explanation.split(" · ").slice(0, 3),
    });

    // Top candidates — only populated when surfacing a strong match
    const topCandidates =
      action === "surface_oss"
        ? result.ranked.slice(0, 3).map(normalizeCandidate)
        : [];

    const output = {
      task: result.task,
      requestAnalysis: {
        taskType: result.requestAnalysis.taskType,
        primarySignal: result.requestAnalysis.primarySignal,
        featureTerms: result.requestAnalysis.featureTerms,
        likelySolvableByOss: result.requestAnalysis.likelySolvableByOss,
      },
      // repoContext is always an object with the same fields.
      // When no package.json was found, all values are their "unknown"/empty defaults.
      repoContext: {
        language: result.repoContext.language,
        framework: result.repoContext.framework,
        packageManager: result.repoContext.packageManager,
        uiStack: result.repoContext.uiStack,
        authSignals: result.repoContext.authSignals,
      },
      decision: {
        action,
        reason: result.decision.rationale,
        alreadyHave: result.decision.alreadyHave ?? null,
        confidence: result.recommendation
          ? +(result.recommendation.score / 100).toFixed(2)
          : null,
      },
      topCandidates,
    };

    process.stdout.write(JSON.stringify(output, null, 2) + "\n");
  } catch (err) {
    process.stderr.write(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }) + "\n"
    );
    process.exit(1);
  }
}

main();
