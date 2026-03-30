import { Candidate } from "../types.js";

const GITHUB_BASE = "https://api.github.com/search/repositories";
const PER_QUERY = 5;

// ── Backend proxy path ────────────────────────────────────────────────────────
//
// When REPOSCOUT_BACKEND_URL is set, all GitHub search requests are routed
// through the backend endpoint. GitHub credentials never touch this module.
//
// When REPOSCOUT_BACKEND_URL is not set, the direct GitHub path is used as a
// dev/local fallback (GITHUB_TOKEN still works for personal rate-limit relief).

type BackendSearchResponse = {
  results: Candidate[];
  sourceStatus: "normal" | "cache_hit" | "degraded" | "unavailable";
  cacheHit: boolean;
  rateLimitRemaining?: number;
  degradedReason?: string;
};

async function searchViaBackend(query: string): Promise<Candidate[]> {
  const backendUrl = process.env.REPOSCOUT_BACKEND_URL!;
  const url = `${backendUrl}/search/repos?q=${encodeURIComponent(query)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "reposcout-cli/0.1" },
    });
  } catch (err) {
    console.error(`  [github] backend unreachable — skipping query: "${query}"`);
    return [];
  }

  if (!res.ok) {
    console.error(`  [github] backend error ${res.status} for query: "${query}"`);
    return [];
  }

  const data = (await res.json()) as BackendSearchResponse;

  if (data.sourceStatus === "degraded" || data.sourceStatus === "unavailable") {
    console.error(
      `  [github] ${data.sourceStatus}: ${data.degradedReason ?? "no details"} — query: "${query}"`,
    );
  } else if (data.cacheHit) {
    // Cache hit — silent, normal operation.
  }

  return data.results ?? [];
}

// ── Direct GitHub path (dev / fallback) ──────────────────────────────────────

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

async function searchDirect(query: string): Promise<Candidate[]> {
  const url = `${GITHUB_BASE}?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${PER_QUERY}`;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "reposcout-cli/0.1",
  };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(url, { headers });

  if (res.status === 403 || res.status === 429) {
    console.error(`  [github] rate-limited (${res.status}) — skipping query: "${query}"`);
    return [];
  }
  if (!res.ok) {
    console.error(`  [github] error ${res.status} for query: "${query}"`);
    return [];
  }

  const data = (await res.json()) as GitHubSearchResponse;
  return (data.items ?? []).map(repoToCandidate);
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

function searchOnce(query: string): Promise<Candidate[]> {
  return process.env.REPOSCOUT_BACKEND_URL
    ? searchViaBackend(query)
    : searchDirect(query);
}

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
