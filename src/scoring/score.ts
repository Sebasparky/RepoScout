import { Candidate, Category, ScoredCandidate, ScoreBreakdown } from "../types.js";
import { scoreLicense } from "./license.js";
import {
  getRulesForCategory,
  scoreFeatureMatch,
  scoreStackMatch,
  scoreMaintenance,
  scorePopularity,
} from "./categoryRules.js";
import { scoreRelevance } from "./relevance.js";

// Language-only stack score used when no category rules are available.
function fallbackStackScore(language: string | undefined): { score: number; reason: string } {
  const lang = (language ?? "").toLowerCase();
  if (lang === "typescript") return { score: 18, reason: "TypeScript" };
  if (lang === "javascript") return { score: 15, reason: "JavaScript (usable from TypeScript)" };
  return { score: 5, reason: "Unknown stack compatibility" };
}

// The short name is the repo/package's own identifier stripped of its owner prefix.
// It's a better proxy for primary purpose than the full text.
function shortName(candidate: Candidate): string {
  if (candidate.source === "github") {
    return candidate.name.split("/").pop() ?? candidate.name;
  }
  return candidate.name; // npm: package name is already the short identifier
}

export function scoreCandidate(
  candidate: Candidate,
  category: Category,
  featureTerms: string[] = []
): ScoredCandidate {
  const rules = getRulesForCategory(category);
  const name = shortName(candidate);
  const description = candidate.description ?? "";
  const keywords = candidate.keywords ?? [];

  // Feature match (0–30).
  // CategoryRule takes priority (precision booster for specialized categories).
  // Falls back to request-driven relevance scoring when no rule exists.
  const featureResult = rules
    ? scoreFeatureMatch(name, description, keywords, rules)
    : scoreRelevance(name, description, keywords, featureTerms);

  // Stack match (0–20)
  // When no category rules exist, fall back to language-only scoring so that
  // TypeScript/JavaScript repos still score well for non-document_parsing tasks.
  const stackResult = rules
    ? scoreStackMatch(candidate.language, keywords, rules)
    : fallbackStackScore(candidate.language);

  // Maintenance (0–20)
  const maintenanceResult = scoreMaintenance(
    candidate.lastUpdated,
    candidate.archived
  );

  // License safety (0–15)
  const licenseResult = scoreLicense(candidate.license);

  // Popularity (0–15)
  const popularityResult = scorePopularity(candidate.stars, candidate.downloads);

  const breakdown: ScoreBreakdown = {
    featureMatch: featureResult.score,
    stackMatch: stackResult.score,
    maintenance: maintenanceResult.score,
    licenseSafety: licenseResult.score,
    popularity: popularityResult.score,
  };

  const total =
    breakdown.featureMatch +
    breakdown.stackMatch +
    breakdown.maintenance +
    breakdown.licenseSafety +
    breakdown.popularity;

  const explanationParts: string[] = [];
  if (featureResult.antiPatternHit) {
    explanationParts.push("Anti-pattern: repo type penalized (not a reusable library)");
  }
  if (featureResult.matched.length) {
    explanationParts.push(`Matches: ${featureResult.matched.join(", ")}`);
  }
  explanationParts.push(stackResult.reason);
  explanationParts.push(maintenanceResult.reason);
  explanationParts.push(`License: ${licenseResult.label}`);
  explanationParts.push(popularityResult.reason);

  return {
    ...candidate,
    score: total,
    scoreBreakdown: breakdown,
    explanation: explanationParts.filter(Boolean).join(" · "),
  };
}

export function rankCandidates(
  candidates: Candidate[],
  category: Category,
  featureTerms: string[] = []
): ScoredCandidate[] {
  return candidates
    .map((c) => scoreCandidate(c, category, featureTerms))
    .sort((a, b) => b.score - a.score);
}

// Cross-source dedup: if the same project appears as both github and npm,
// keep the github entry (more metadata) and merge in npm download data.
export function deduplicateAcrossSources(candidates: Candidate[]): Candidate[] {
  // Index npm candidates by their package name (last segment of full_name for github)
  const npmByName = new Map<string, Candidate>();
  for (const c of candidates) {
    if (c.source === "npm") npmByName.set(c.name.toLowerCase(), c);
  }

  const result: Candidate[] = [];
  const consumedNpm = new Set<string>();

  for (const c of candidates) {
    if (c.source === "github") {
      const repoName = c.name.split("/").pop()?.toLowerCase() ?? "";
      const npmMatch = npmByName.get(repoName);
      if (npmMatch) {
        // Merge npm downloads into the github entry
        consumedNpm.add(npmMatch.name.toLowerCase());
        result.push({ ...c, downloads: npmMatch.downloads });
      } else {
        result.push(c);
      }
    }
  }

  for (const c of candidates) {
    if (c.source === "npm" && !consumedNpm.has(c.name.toLowerCase())) {
      result.push(c);
    }
  }

  return result;
}
