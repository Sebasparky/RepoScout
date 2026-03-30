import { Candidate } from "../types.js";
import { TtlCache } from "../server/cache.js";

const GITHUB_BASE = "https://api.github.com/search/repositories";
const PER_QUERY = 5;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Module-level in-process TTL cache — avoids redundant GitHub API calls
// within the same RepoScout invocation or across closely-spaced runs.
const cache = new TtlCache<Candidate[]>(CACHE_TTL_MS);

/**
 * Normalize a raw query string before cache lookup or upstream fetch.
 * Lowercase + trim + collapse whitespace — keeps cache keys stable.
 */
export function normalizeQuery(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s+/g, " ");
}

// ── GitHub search ─────────────────────────────────────────────────────────────

type GitHubRepo = {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  license: { spdx_id: string } | null;
  stargazers_count: number;
  pushed_at: string;
  topics: string[];
  archived: boolean;
};

type GitHubSearchResponse = {
  items: GitHubRepo[];
};

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "reposcout-cli/0.1",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  // GITHUB_TOKEN is optional. When present it raises the rate limit from
  // 60 req/hr (unauthenticated) to 5,000 req/hr (authenticated).
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function searchOnce(query: string): Promise<Candidate[]> {
  const normalized = normalizeQuery(query);

  const cached = cache.get(normalized);
  if (cached) return cached;

  const url =
    `${GITHUB_BASE}?q=${encodeURIComponent(normalized)}` +
    `&sort=stars&order=desc&per_page=${PER_QUERY}`;

  let res: Response;
  try {
    res = await fetch(url, { headers: buildHeaders() });
  } catch {
    console.error(`  [github] network error — skipping query: "${normalized}"`);
    return [];
  }

  if (res.status === 403 || res.status === 429) {
    console.error(`  [github] rate-limited (${res.status}) — skipping query: "${normalized}"`);
    return [];
  }
  if (!res.ok) {
    console.error(`  [github] error ${res.status} for query: "${normalized}"`);
    return [];
  }

  const data = (await res.json()) as GitHubSearchResponse;
  const results = (data.items ?? []).map(repoToCandidate);

  // Only cache successful responses — don't cache rate-limit hits or errors.
  cache.set(normalized, results);
  return results;
}

function repoToCandidate(repo: GitHubRepo): Candidate {
  return {
    id: `github:${repo.full_name}`,
    source: "github",
    name: repo.full_name,
    url: repo.html_url,
    description: repo.description ?? undefined,
    language: repo.language ?? undefined,
    license: repo.license?.spdx_id ?? undefined,
    stars: repo.stargazers_count,
    lastUpdated: repo.pushed_at,
    keywords: repo.topics,
    archived: repo.archived,
    rawMetadata: repo as unknown as Record<string, unknown>,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function searchGitHub(queries: string[]): Promise<Candidate[]> {
  const results = await Promise.all(queries.map(searchOnce));
  return dedup(results.flat());
}

function dedup(candidates: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  return candidates.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}
