import { Candidate } from "../types.js";

const BASE = "https://api.github.com/search/repositories";
const PER_QUERY = 5;

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

async function searchOnce(query: string): Promise<Candidate[]> {
  const url = `${BASE}?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${PER_QUERY}`;
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
